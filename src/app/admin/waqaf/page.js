'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ImageViewModal from '@/components/ImageViewModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faEye, 
  faQrcode,
  faDownload
} from '@fortawesome/free-solid-svg-icons';

export default function AdminWaqafPage() {
  const supabase = createClient();
  const [waqafRecords, setWaqafRecords] = useState([]);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [newQrImageUrl, setNewQrImageUrl] = useState('');
  const [newQrFile, setNewQrFile] = useState(null);
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'url'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [isUpdatingQR, setIsUpdatingQR] = useState(false);
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState({
    url: '',
    title: '',
    filename: ''
  });

  useEffect(() => {
    loadWaqafData();
  }, []);

  const loadWaqafData = async () => {
    try {
      const [waqafResponse, qrResponse] = await Promise.all([
        fetch('/api/admin/waqaf'),
        fetch('/api/payment-settings/qr')
      ]);

      if (waqafResponse.ok) {
        const waqafData = await waqafResponse.json();
        setWaqafRecords(waqafData.data || []);
      }

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        setQrImageUrl(qrData.qrImageUrl || '');
        setNewQrImageUrl(qrData.qrImageUrl || '');
      }
    } catch (err) {
      console.error('Error loading waqaf data:', err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setError('Sila pilih fail imej (JPEG, PNG) sahaja.');
        return;
      }

      if (file.size > maxSize) {
        setError('Saiz fail tidak boleh melebihi 5MB.');
        return;
      }

      setNewQrFile(file);
      setError('');
    }
  };

  const updateQRImage = async () => {
    if (uploadMethod === 'url' && !newQrImageUrl.trim()) {
      setError('Sila masukkan URL imej QR yang sah.');
      return;
    }

    if (uploadMethod === 'file' && !newQrFile) {
      setError('Sila pilih fail imej QR.');
      return;
    }

    setIsUpdatingQR(true);
    setError('');

    try {
      let finalQrImageUrl = newQrImageUrl;

      // If uploading file, upload to Supabase Storage first
      if (uploadMethod === 'file' && newQrFile) {
        const timestamp = Date.now();
        const fileName = `qr-payment-${timestamp}.${newQrFile.name.split('.').pop()}`;
        const filePath = `qr/${fileName}`;

        console.log(`Uploading QR image to bucket 'profiles', path: ${filePath}`);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, newQrFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error('QR image upload error:', uploadError);
          throw new Error(`Gagal memuat naik imej QR: ${uploadError.message}`);
        }

        console.log('QR image upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(uploadData.path);

        if (!urlData || !urlData.publicUrl) {
          console.warn('Could not get public URL for QR image:', uploadData.path);
          throw new Error('Gagal mendapatkan URL imej QR selepas muat naik.');
        }

        finalQrImageUrl = urlData.publicUrl;
        console.log('QR image public URL obtained:', finalQrImageUrl);
      }

      // Update QR image URL in database
      const response = await fetch('/api/payment-settings/qr', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrImageUrl: finalQrImageUrl }),
      });

      if (response.ok) {
        setQrImageUrl(finalQrImageUrl);
        setNewQrImageUrl('');
        setNewQrFile(null);
        setShowQRModal(false);
        setError('');
      } else {
        throw new Error('Gagal mengemaskini imej QR dalam pangkalan data.');
      }
    } catch (err) {
      console.error('Error updating QR image:', err);
      setError(err.message || 'Ralat mengemaskini imej QR');
    } finally {
      setIsUpdatingQR(false);
    }
  };

  const openImageModal = (url, title, filename = null) => {
    setSelectedImage({
      url,
      title,
      filename
    });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage({
      url: '',
      title: '',
      filename: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-primary text-white p-6 sm:p-8 rounded-t-lg shadow mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pengurusan Waqaf</h1>
            <p className="mt-1 text-primary-light text-sm sm:text-base">Lihat sumbangan waqaf dan urus tetapan QR</p>
          </div>
          <Link href="/admin" className="text-white hover:text-primary-light transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Kembali ke Dashboard
          </Link>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-b-lg shadow space-y-8">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p className="font-bold">Ralat</p>
              <p>{error}</p>
            </div>
          )}

          {/* QR Settings Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Tetapan QR Pembayaran</h2>
              <button
                onClick={() => setShowQRModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faQrcode} className="h-4 w-4" />
                Kemaskini QR
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">QR Code Semasa:</p>
              <img 
                src={qrImageUrl} 
                alt="Current QR Code" 
                className="w-32 h-32 border border-gray-300 rounded-lg"
                onError={(e) => {
                  e.target.src = '/images/default-qr.png';
                }}
              />
            </div>
          </section>

          {/* Waqaf Records Table */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Rekod Waqaf</h2>
            {waqafRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID Transaksi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pewakaf
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarikh
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mesej
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {waqafRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.transaction_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="font-medium">{record.donor_name || 'Tanpa Nama'}</div>
                            {record.donor_email && (
                              <div className="text-xs text-gray-400">{record.donor_email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          RM{parseFloat(record.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(record.created_at).toLocaleDateString('ms-MY', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          <div className="truncate" title={record.message}>
                            {record.message || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {record.receipt_url ? (
                            <button
                              onClick={() => openImageModal(
                                record.receipt_url, 
                                'Resit Waqaf', 
                                record.receipt_filename || `resit-waqaf-${record.transaction_id}.jpg`
                              )}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1 transition-colors"
                              title="Lihat Resit"
                            >
                              <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                              Lihat
                            </button>
                          ) : (
                            <span className="text-gray-400">Tiada resit</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Tiada rekod waqaf ditemui.</p>
              </div>
            )}
          </section>

          {/* Summary Stats */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Ringkasan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {waqafRecords.length}
                </div>
                <div className="text-sm text-blue-600">Jumlah Sumbangan</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  RM{waqafRecords.reduce((total, record) => total + parseFloat(record.amount), 0).toFixed(2)}
                </div>
                <div className="text-sm text-green-600">Jumlah Terkumpul</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {waqafRecords.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length}
                </div>
                <div className="text-sm text-purple-600">Bulan Ini</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* QR Update Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Kemaskini QR Code</h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                {/* Upload Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kaedah Kemaskini
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMethod"
                        value="file"
                        checked={uploadMethod === 'file'}
                        onChange={(e) => setUploadMethod(e.target.value)}
                        className="mr-2"
                      />
                      Muat Naik Fail
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="uploadMethod"
                        value="url"
                        checked={uploadMethod === 'url'}
                        onChange={(e) => setUploadMethod(e.target.value)}
                        className="mr-2"
                      />
                      Masukkan URL
                    </label>
                  </div>
                </div>

                {/* File Upload Method */}
                {uploadMethod === 'file' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih Fail Imej QR <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format yang diterima: JPEG, PNG (Maksimum 5MB)
                    </p>
                    {newQrFile && (
                      <p className="text-sm text-green-600 mt-2">
                        Fail dipilih: {newQrFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* URL Input Method */}
                {uploadMethod === 'url' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Imej QR <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={newQrImageUrl}
                      onChange={(e) => setNewQrImageUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="https://example.com/qr-code.png"
                    />
                  </div>
                )}

                {/* Preview */}
                {((uploadMethod === 'url' && newQrImageUrl) || (uploadMethod === 'file' && newQrFile)) && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Pratonton:</p>
                    {uploadMethod === 'url' ? (
                      <img 
                        src={newQrImageUrl} 
                        alt="QR Preview" 
                        className="w-32 h-32 border border-gray-300 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = '/images/default-qr.png';
                        }}
                      />
                    ) : (
                      <img 
                        src={URL.createObjectURL(newQrFile)} 
                        alt="QR Preview" 
                        className="w-32 h-32 border border-gray-300 rounded-lg object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-100 text-red-700 border border-red-400 rounded">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowQRModal(false);
                      setError('');
                      setNewQrImageUrl('');
                      setNewQrFile(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={updateQRImage}
                    disabled={isUpdatingQR || 
                      (uploadMethod === 'url' && !newQrImageUrl.trim()) || 
                      (uploadMethod === 'file' && !newQrFile)}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUpdatingQR ? 'Mengemas kini...' : 'Kemaskini QR'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      <ImageViewModal
        isOpen={showImageModal}
        onClose={closeImageModal}
        imageUrl={selectedImage.url}
        title={selectedImage.title}
        filename={selectedImage.filename}
      />
    </div>
  );
} 