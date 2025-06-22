'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password validation requirements
  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    // Check if user accessed this page via reset link
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Set the session with the tokens from the URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else {
      // If no tokens in URL, check if user has a session
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/forgot-password');
        }
      };
      checkSession();
    }
  }, [searchParams, supabase, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('Sila pastikan kata laluan memenuhi semua keperluan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      
      // Optional: Sign out the user so they need to log in with new password
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/auth/login?message=Kata laluan berjaya dikemaskini. Sila log masuk dengan kata laluan baharu.');
      }, 2000);

    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message || 'Ralat berlaku semasa menetapkan semula kata laluan');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <FontAwesomeIcon icon={faCheck} className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Kata Laluan Berjaya Dikemaskini
              </h2>
              <p className="text-gray-600 mb-6">
                Kata laluan anda telah berjaya dikemaskini. Anda akan dialihkan ke halaman log masuk.
              </p>
              <Link
                href="/auth/login"
                className="text-primary hover:text-primary/90 font-medium"
              >
                Pergi ke Halaman Log Masuk
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Tetapkan Semula Kata Laluan
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Masukkan kata laluan baharu anda
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Kata Laluan Baharu
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Sahkan Kata Laluan
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Keperluan Kata Laluan:</h4>
                <ul className="space-y-1 text-sm">
                  <li className={`flex items-center ${passwordRequirements.length ? 'text-green-600' : 'text-gray-500'}`}>
                    <FontAwesomeIcon 
                      icon={passwordRequirements.length ? faCheck : faTimes} 
                      className="h-3 w-3 mr-2" 
                    />
                    Sekurang-kurangnya 8 aksara
                  </li>
                  <li className={`flex items-center ${passwordRequirements.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <FontAwesomeIcon 
                      icon={passwordRequirements.uppercase ? faCheck : faTimes} 
                      className="h-3 w-3 mr-2" 
                    />
                    Mengandungi huruf besar
                  </li>
                  <li className={`flex items-center ${passwordRequirements.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <FontAwesomeIcon 
                      icon={passwordRequirements.lowercase ? faCheck : faTimes} 
                      className="h-3 w-3 mr-2" 
                    />
                    Mengandungi huruf kecil
                  </li>
                  <li className={`flex items-center ${passwordRequirements.number ? 'text-green-600' : 'text-gray-500'}`}>
                    <FontAwesomeIcon 
                      icon={passwordRequirements.number ? faCheck : faTimes} 
                      className="h-3 w-3 mr-2" 
                    />
                    Mengandungi nombor
                  </li>
                  {confirmPassword && (
                    <li className={`flex items-center ${passwordRequirements.match ? 'text-green-600' : 'text-red-500'}`}>
                      <FontAwesomeIcon 
                        icon={passwordRequirements.match ? faCheck : faTimes} 
                        className="h-3 w-3 mr-2" 
                      />
                      Kata laluan sepadan
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Mengemaskini...' : 'Kemaskini Kata Laluan'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:text-primary/90"
            >
              Kembali ke Log Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuatkan...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}