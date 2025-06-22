'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function WaqafSuccessContent() {
  const searchParams = useSearchParams();
  const [transactionDetails, setTransactionDetails] = useState({
    transactionId: '',
    amount: '',
    receiptId: '',
  });

  useEffect(() => {
    const id = searchParams.get('transactionId');
    const amt = searchParams.get('amount');
    const receiptId = searchParams.get('receiptId');
    if (id) {
      setTransactionDetails(prev => ({ ...prev, transactionId: id }));
    }
    if (amt) {
      setTransactionDetails(prev => ({ ...prev, amount: amt }));
    }
    if (receiptId) {
      setTransactionDetails(prev => ({ ...prev, receiptId: receiptId }));
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white shadow-xl rounded-lg p-8 text-center">
        <div>
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sumbangan Waqaf Berjaya!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Terima kasih atas sumbangan waqaf anda. Semoga Allah SWT memberkati usaha murni ini.
          </p>
        </div>

        {transactionDetails.transactionId && (
          <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Maklumat Transaksi:</h3>
            <p className="mt-1 text-sm text-gray-600">
              ID Transaksi: <span className="font-semibold">{transactionDetails.transactionId}</span>
            </p>
            {transactionDetails.amount && (
              <p className="mt-1 text-sm text-gray-600">
                Jumlah Disumbangkan: <span className="font-semibold">RM{parseFloat(transactionDetails.amount).toFixed(2)}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row sm:justify-center sm:space-x-4 space-y-4 sm:space-y-0">
          <Link
            href="/waqaf"
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Waqaf Lagi
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
          >
            Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WaqafSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WaqafSuccessContent />
    </Suspense>
  );
}