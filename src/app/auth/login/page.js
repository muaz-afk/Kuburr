'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faEye, faEyeSlash, faEnvelope, faLock, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Real-time email validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setFormTouched(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
            setError('Emel atau kata laluan tidak sah.');
        } else {
            setError(signInError.message || 'Ralat semasa log masuk.');
        }
        setIsLoading(false);
        return;
      }

      router.refresh();
      router.push('/'); 
      
    } catch (err) {
      console.error("Login unexpected error:", err);
      setError('Berlaku ralat yang tidak dijangka.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
      },
    });

    if (googleError) {
        setError(googleError.message || 'Gagal log masuk dengan Google.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getEmailInputClasses = () => {
    const baseClasses = "w-full pl-12 pr-4 py-3.5 border-2 rounded-xl text-gray-800 shadow-sm transition-all duration-200 ease-in-out focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed";
    
    if (formTouched && email) {
      if (emailValid) {
        return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100 bg-green-50/30`;
      } else {
        return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/30`;
      }
    }
    
    if (emailFocused) {
      return `${baseClasses} border-primary focus:border-primary-light focus:ring-4 focus:ring-primary/10 bg-primary/5`;
    }
    
    return `${baseClasses} border-gray-300 hover:border-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10`;
  };

  const getPasswordInputClasses = () => {
    const baseClasses = "w-full pl-12 pr-12 py-3.5 border-2 rounded-xl text-gray-800 shadow-sm transition-all duration-200 ease-in-out focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed";
    
    if (passwordFocused) {
      return `${baseClasses} border-primary focus:border-primary-light focus:ring-4 focus:ring-primary/10 bg-primary/5`;
    }
    
    return `${baseClasses} border-gray-300 hover:border-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-primary/5 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-6">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Selamat Kembali
          </h1>
          <p className="text-gray-600">
            Log masuk ke akaun anda untuk meneruskan
          </p>
        </div>

        {/* Main Form Container */}
        <div className="bg-white rounded-2xl shadow-xl shadow-primary/5 border border-gray-100 p-8 backdrop-blur-sm">
          {/* Google OAuth Section - Commented but styled */}
          {/*
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <FontAwesomeIcon 
              icon={faGoogle} 
              className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform duration-200" 
            />
            Log Masuk dengan Google
          </button>
          */}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Log masuk dengan emel</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fadeIn">
              <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Alamat Emel
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={faEnvelope} 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      emailFocused || email ? 'text-primary' : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className={getEmailInputClasses()}
                  placeholder="nama@contoh.com"
                  aria-describedby="email-validation"
                />
                {formTouched && email && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <FontAwesomeIcon 
                      icon={emailValid ? faCheckCircle : faExclamationTriangle} 
                      className={`h-5 w-5 ${emailValid ? 'text-green-500' : 'text-red-500'}`}
                    />
                  </div>
                )}
              </div>
              {formTouched && email && !emailValid && (
                <p id="email-validation" className="text-sm text-red-600 flex items-center gap-2 mt-1">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4" />
                  Sila masukkan alamat emel yang sah
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Kata Laluan
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={faLock} 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      passwordFocused || password ? 'text-primary' : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className={getPasswordInputClasses()}
                  placeholder="Masukkan kata laluan anda"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform duration-200 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan kata laluan' : 'Tunjukkan kata laluan'}
                >
                  <FontAwesomeIcon 
                    icon={showPassword ? faEyeSlash : faEye} 
                    className="h-5 w-5 text-gray-400 hover:text-primary transition-colors duration-200"
                  />
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md px-1 py-0.5"
              >
                Lupa kata laluan?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full flex justify-center items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sedang log masuk...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
                  Log Masuk
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Belum mempunyai akaun?{' '}
              <Link 
                href="/auth/register" 
                className="font-semibold text-primary hover:text-primary-light transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md px-1 py-0.5"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Dengan log masuk, anda bersetuju dengan syarat dan terma perkhidmatan kami
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
