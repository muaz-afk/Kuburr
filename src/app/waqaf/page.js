'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// QR Payment Modal Component
function QRPaymentModal({ isOpen, onClose, waqafData, onReceiptSubmit, user }) {
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrImage, setQrImage] = useState('/images/default-qr.png'); // Default QR image
  const [error, setError] = useState('');
  const supabase = createClient();

  // Fetch QR image on modal open
  useEffect(() => {
    if (isOpen) {
      fetchQRImage();
    }
  }, [isOpen]);

  const fetchQRImage = async () => {
    try {
      const response = await fetch('/api/payment-settings/qr');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.qrImageUrl) {
          setQrImage(data.qrImageUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching QR image:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setError('Sila pilih fail imej (JPEG, PNG) atau PDF sahaja.');
        return;
      }

      if (file.size > maxSize) {
        setError('Saiz fail tidak boleh melebihi 5MB.');
        return;
      }

      setReceipt(file);
      setError('');
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receipt) {
      setError('Sila pilih resit pembayaran.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let receiptUrl = null;
      
      // Upload file to Supabase Storage - simple folder structure
      const timestamp = Date.now();
      const filePath = `waqaf_receipts/${timestamp}-${receipt.name}`;
      
      console.log(`Uploading waqaf receipt to bucket 'profiles', path: ${filePath}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, receipt, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error("Waqaf receipt upload error:", uploadError);
        throw new Error(`Gagal memuat naik resit: ${uploadError.message}`);
      }

      console.log("Waqaf receipt upload successful:", uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(uploadData.path);

      if (!urlData || !urlData.publicUrl) {
        console.warn("Could not get public URL for waqaf receipt:", uploadData.path);
        throw new Error("Gagal mendapatkan URL resit selepas muat naik.");
      }

      receiptUrl = urlData.publicUrl;
      console.log("Waqaf receipt public URL obtained:", receiptUrl);

      // Now call the API to save the waqaf record with the file URL
      const response = await fetch('/api/waqaf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...waqafData,
          amount: parseFloat(waqafData.amount),
          receipt_url: receiptUrl,
          receipt_filename: receipt.name,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onReceiptSubmit(result.data);
      } else {
        throw new Error(result.message || 'Ralat menghantar waqaf. Sila cuba lagi.');
      }
    } catch (error) {
      console.error('Error submitting waqaf receipt:', error);
      setError(error.message || 'Tidak dapat menghantar resit. Sila semak sambungan internet anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Pembayaran Waqaf</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
          </div>

          {/* Waqaf Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Maklumat Waqaf:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              {waqafData.donor_name && <p><strong>Nama:</strong> {waqafData.donor_name}</p>}
              {waqafData.donor_email && <p><strong>Emel:</strong> {waqafData.donor_email}</p>}
              <p><strong>Jumlah:</strong> RM{parseFloat(waqafData.amount).toFixed(2)}</p>
              {waqafData.message && <p><strong>Mesej:</strong> {waqafData.message}</p>}
              {user ? (
                <p className="text-xs text-blue-600"><strong>Status:</strong> Pengguna Berdaftar</p>
              ) : (
                <p className="text-xs text-gray-500"><strong>Status:</strong> Tetamu</p>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-6 text-center">
            <h3 className="font-semibold text-gray-800 mb-3">Imbas QR untuk Bayar:</h3>
            <div className="flex justify-center">
              <img
                src={qrImage}
                alt="QR Code untuk Pembayaran"
                className="w-48 h-48 border border-gray-300 rounded-lg"
                onError={(e) => {
                  e.target.src = '/images/default-qr.png';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Imbas kod QR di atas menggunakan aplikasi perbankan atau dompet digital anda.
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Muat Naik Resit Pembayaran <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format yang diterima: JPEG, PNG, PDF (Maksimum 5MB)
            </p>
            {receipt && (
              <p className="text-sm text-green-600 mt-2">
                Fail dipilih: {receipt.name}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmitReceipt}
              disabled={isSubmitting || !receipt}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Menghantar...' : 'Hantar Resit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaqafPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_email: '',
    amount: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const presetAmounts = [10, 20, 50, 100];

  // Check authentication and load user profile
  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      setIsLoadingAuth(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Fetch user profile for name
          const { data: profileData } = await supabase
            .from('User')
            .select('name, phone')
            .eq('id', session.user.id)
            .single();
          
          setUserProfile(profileData);
          
          // Auto-populate form data for authenticated users
          const userName = profileData?.name || session.user.user_metadata?.full_name || '';
          const userEmail = session.user.email || '';
          
          setFormData(prev => ({
            ...prev,
            donor_name: userName,
            donor_email: userEmail,
          }));
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkAuthAndLoadProfile();
  }, [supabase]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Sila masukkan jumlah yang sah.';
    }
    if (formData.donor_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.donor_email)) {
      newErrors.donor_email = 'Sila masukkan alamat emel yang sah.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePresetAmountClick = (amount) => {
    setFormData((prev) => ({ ...prev, amount: amount.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) {
      return;
    }

    // Show QR modal instead of direct submission
    setShowQRModal(true);
  };

  const handleReceiptSubmit = (result) => {
    setShowQRModal(false);
    router.push(`/waqaf/success?transactionId=${result.transactionId}&amount=${formData.amount}&receiptId=${result.receiptId}`);
  };

  const handleCloseModal = () => {
    setShowQRModal(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-primary hover:text-primary-dark mb-4 inline-block">
          &larr; Kembali ke Halaman Utama
        </Link>
        <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-center text-primary mb-6">Borang Waqaf</h1>

          {/* User Status Indicator */}
          {user ? (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selamat datang!</strong> Anda log masuk sebagai pengguna berdaftar. 
                Maklumat nama dan emel telah diisi secara automatik.
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                Anda boleh menyumbang sebagai tetamu. Nama dan emel adalah pilihan.
                <Link href="/auth/login" className="text-primary hover:text-primary-dark ml-1">
                  Log masuk
                </Link> untuk pengalaman yang lebih baik.
              </p>
            </div>
          )}

          {apiError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="donor_name" className="block text-sm font-medium text-gray-700">
                Nama Pewakaf {!user && '(Pilihan)'}
              </label>
              <input
                type="text"
                name="donor_name"
                id="donor_name"
                value={formData.donor_name}
                onChange={handleChange}
                disabled={user !== null}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black ${
                  user ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder={user ? 'Diisi secara automatik' : 'Masukkan nama anda'}
              />
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  Maklumat diambil dari profil anda
                </p>
              )}
            </div>

            <div>
              <label htmlFor="donor_email" className="block text-sm font-medium text-gray-700">
                Emel Pewakaf {!user && '(Pilihan)'}
              </label>
              <input
                type="email"
                name="donor_email"
                id="donor_email"
                value={formData.donor_email}
                onChange={handleChange}
                disabled={user !== null}
                className={`mt-1 block w-full px-3 py-2 border ${errors.donor_email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black ${
                  user ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder={user ? 'Diisi secara automatik' : 'Masukkan emel anda'}
              />
              {errors.donor_email && (
                <p className="mt-1 text-xs text-red-600">{errors.donor_email}</p>
              )}
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  Maklumat diambil dari akaun anda
                </p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Jumlah (RM) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                id="amount"
                value={formData.amount}
                onChange={handleChange}
                min="1"
                step="any"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.amount ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black`}
                placeholder="Contoh: 50"
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {presetAmounts.map((pa) => (
                  <button
                    key={pa}
                    type="button"
                    onClick={() => handlePresetAmountClick(pa)}
                    className={`px-3 py-1 border rounded-md text-sm font-medium transition-colors ${
                      parseFloat(formData.amount) === pa
                        ? 'bg-primary text-white border-primary-dark'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                    }`}
                  >
                    RM{pa}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Mesej (Pilihan)
              </label>
              <textarea
                name="message"
                id="message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-black"
                placeholder="Niat wakaf, doa, atau sebarang pesanan..."
              ></textarea>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isLoading ? 'Memproses...' : 'Teruskan Pembayaran'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* QR Payment Modal */}
      <QRPaymentModal
        isOpen={showQRModal}
        onClose={handleCloseModal}
        waqafData={formData}
        onReceiptSubmit={handleReceiptSubmit}
        user={user}
      />
    </div>
  );
}