'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Loading from '@/components/Loading';

// Component that uses searchParams
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('pending'); // pending, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      verifyEmail(token);
    } else {
      // Handle case where token is missing but page is accessed directly (shouldn't happen via link)
      setStatus('error');
      setMessage('Pautan pengesahan tidak sah atau hilang.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Dependency array is correct

  const verifyEmail = async (token) => {
    setStatus('pending'); // Ensure pending state while verifying
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ralat berlaku semasa pengesahan.');
      }

      setStatus('success');
      setMessage('Email anda telah disahkan. Anda akan dialihkan ke halaman log masuk.');

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      // Use a more specific error message if available
      setMessage(error.message || 'Pengesahan gagal. Sila cuba lagi atau hubungi sokongan.');
    }
  };

  // Note: The initial display if no token is present is handled inside useEffect now,
  // setting status to 'error'. Display logic below handles all states.

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'pending' && (
              <>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Mengesahkan Email
                </h2>
                <p className="text-gray-600">
                  Sila tunggu sebentar...
                </p>
                {/* Optional: Add a spinner here */}
              </>
            )}

            {status === 'success' && (
              <>
                <h2 className="text-2xl font-semibold text-green-600 mb-4">
                  Email Disahkan!
                </h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-sm text-gray-500">
                  Mengalihkan ke halaman log masuk...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <h2 className="text-2xl font-semibold text-red-600 mb-4">
                  Pengesahan Gagal
                </h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <Link
                  href="/auth/login"
                  className="text-primary hover:text-primary/90 font-medium"
                >
                  Kembali ke Log Masuk
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export wraps the main content in Suspense
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loading />}> {/* Use Suspense */}
      <VerifyEmailContent />
    </Suspense>
  );
}
