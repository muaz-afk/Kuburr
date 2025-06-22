'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExpand } from '@fortawesome/free-solid-svg-icons';

export default function QRPaymentModal({ 
  isOpen, 
  onClose, 
  onReceiptSubmit, 
  title = "Pembayaran",
  details = {},
  submitText = "Hantar Resit"
}) {
  const [receipt, setReceipt] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrImage, setQrImage] = useState('/images/default-qr.png');
  const [error, setError] = useState('');
  const [showFullQR, setShowFullQR] = useState(false);
  const supabase = createClient();

  // Fetch QR image on modal open
  useEffect(() => {
    if (isOpen) {
      fetchQRImage();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReceipt(null);
      setTransactionId('');
      setError('');
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
      // Call the provided submit handler with form data
      await onReceiptSubmit({
        receipt,
        transactionId: transactionId.trim() || `TXN-${Date.now()}`,
      });
    } catch (error) {
      console.error('Error submitting receipt:', error);
      setError(error.message || 'Tidak dapat menghantar resit. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFullQR = () => {
    setShowFullQR(true);
  };

  const closeFullQR = () => {
    setShowFullQR(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Payment Details */}
            {Object.keys(details).length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Maklumat Pembayaran:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {Object.entries(details).map(([key, value]) => (
                    <p key={key}><strong>{key}:</strong> {value}</p>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className="mb-6 text-center">
              <h3 className="font-semibold text-gray-800 mb-3">Imbas QR untuk Bayar:</h3>
              <div className="flex justify-center relative">
                <div className="relative">
                  <img
                    src={qrImage}
                    alt="QR Code untuk Pembayaran"
                    className="w-48 h-48 border border-gray-300 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={openFullQR}
                    onError={(e) => {
                      e.target.src = '/images/default-qr.png';
                    }}
                  />
                  <button
                    onClick={openFullQR}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                    title="Lihat saiz penuh"
                  >
                    <FontAwesomeIcon icon={faExpand} className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Imbas kod QR di atas menggunakan aplikasi perbankan atau dompet digital anda.
                <br />
                <span className="text-xs text-primary cursor-pointer hover:underline" onClick={openFullQR}>
                  Klik untuk saiz penuh
                </span>
              </p>
            </div>

            {/* Transaction ID (Optional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Transaksi (Pilihan)
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Masukkan ID transaksi jika ada"
                className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800 shadow-sm focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                ID transaksi dari aplikasi pembayaran anda (jika ada)
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
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitReceipt}
                disabled={isSubmitting || !receipt}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Menghantar...
                  </>
                ) : (
                  submitText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen QR Modal */}
      {showFullQR && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[9999] p-4">
          <div className="relative max-w-screen-sm max-h-screen flex flex-col items-center">
            <button
              onClick={closeFullQR}
              className="absolute -top-16 right-0 text-white text-3xl hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              style={{ zIndex: 10000 }}
            >
              &times;
            </button>
            <div className="bg-white p-4 rounded-lg shadow-2xl">
              <img
                src={qrImage}
                alt="QR Code untuk Pembayaran - Saiz Penuh"
                className="w-full h-auto max-w-sm max-h-96 object-contain"
                onError={(e) => {
                  e.target.src = '/images/default-qr.png';
                }}
              />
            </div>
            <p className="text-white text-center mt-6 text-base font-medium">
              Imbas kod QR menggunakan aplikasi perbankan atau dompet digital anda
            </p>
            <button
              onClick={closeFullQR}
              className="mt-4 px-6 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}