'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { 
  faEye, 
  faEyeSlash, 
  faEnvelope, 
  faLock, 
  faUser,
  faExclamationTriangle, 
  faCheckCircle,
  faUserPlus,
  faCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldFocused, setFieldFocused] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [fieldValid, setFieldValid] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [formTouched, setFormTouched] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    checks: {
      length: false,
      lowercase: false,
      uppercase: false,
      number: false,
      special: false
    }
  });
  
  const router = useRouter();
  const supabase = createClient();

  // Real-time validation effects
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setFieldValid(prev => ({
      ...prev,
      name: formData.name.trim().length >= 2,
      email: emailRegex.test(formData.email),
      password: passwordRegex.test(formData.password),
      confirmPassword: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
    }));
  }, [formData]);

  // Password strength calculation
  useEffect(() => {
    const password = formData.password;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    setPasswordStrength({ score, checks });
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFocus = (field) => {
    setFieldFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setFieldFocused(prev => ({ ...prev, [field]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    setFormTouched(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Kata laluan tidak sepadan.');
      setIsLoading(false);
      return;
    }

    if (!passwordRegex.test(formData.password)) {
      setError('Kata laluan mestilah mengandungi sekurang-kurangnya 8 aksara, termasuk huruf besar, huruf kecil, nombor, dan simbol khas.');
      setIsLoading(false);
      return;
    }

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message || 'Ralat semasa pendaftaran.');
        setIsLoading(false);
        return;
      }

      if (signUpData.user && signUpData.user.identities?.length === 0) {
         setSuccess('Pendaftaran berjaya. Sila semak emel anda untuk pengesahan (jika diperlukan).');
      } else if (signUpData.user) {
         setSuccess('Pendaftaran berjaya! Anda akan dialihkan ke halaman log masuk.');
         setTimeout(() => router.push('/auth/login'), 2000);
      } else {
         setError('Sesuatu yang tidak dijangka berlaku semasa pendaftaran.');
      }
      
    } catch (err) {
      console.error("Registration unexpected error:", err);
      setError('Berlaku ralat yang tidak dijangka.');
    } finally {
      setIsLoading(false);
    }
  };

  // const handleGoogleSignIn = async () => {
  //   setError('');
  //   const { error: googleError } = await supabase.auth.signInWithOAuth({
  //     provider: 'google',
  //     options: {
  //     },
  //   });
  //   if (googleError) {
  //       setError(googleError.message || 'Gagal mendaftar dengan Google.');
  //   }
  // };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const getInputClasses = (fieldName) => {
    const baseClasses = "w-full pl-12 pr-4 py-3.5 border-2 rounded-xl text-gray-800 shadow-sm transition-all duration-200 ease-in-out focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed";
    
    if (formTouched && formData[fieldName]) {
      if (fieldValid[fieldName]) {
        return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100 bg-green-50/30`;
      } else {
        return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/30`;
      }
    }
    
    if (fieldFocused[fieldName]) {
      return `${baseClasses} border-primary focus:border-primary-light focus:ring-4 focus:ring-primary/10 bg-primary/5`;
    }
    
    return `${baseClasses} border-gray-300 hover:border-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10`;
  };

  const getPasswordInputClasses = (fieldName) => {
    const baseClasses = "w-full pl-12 pr-12 py-3.5 border-2 rounded-xl text-gray-800 shadow-sm transition-all duration-200 ease-in-out focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed";
    
    if (formTouched && formData[fieldName]) {
      if (fieldValid[fieldName]) {
        return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100 bg-green-50/30`;
      } else {
        return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/30`;
      }
    }
    
    if (fieldFocused[fieldName]) {
      return `${baseClasses} border-primary focus:border-primary-light focus:ring-4 focus:ring-primary/10 bg-primary/5`;
    }
    
    return `${baseClasses} border-gray-300 hover:border-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10`;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 2) return 'Lemah';
    if (passwordStrength.score <= 4) return 'Sederhana';
    return 'Kuat';
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
            Cipta Akaun Baru
          </h1>
          <p className="text-gray-600">
            Daftar untuk memulakan perkhidmatan kami
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
            Daftar dengan Google
          </button>
          */}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Daftar dengan emel</span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fadeIn">
              <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fadeIn">
              <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                Nama Penuh
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={faUser} 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      fieldFocused.name || formData.name ? 'text-primary' : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="given-name"
                  required
                  disabled={isLoading || !!success}
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => handleFocus('name')}
                  onBlur={() => handleBlur('name')}
                  className={getInputClasses('name')}
                  placeholder="Masukkan nama penuh anda"
                  aria-describedby="name-validation"
                />
                {formTouched && formData.name && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <FontAwesomeIcon 
                      icon={fieldValid.name ? faCheckCircle : faExclamationTriangle} 
                      className={`h-5 w-5 ${fieldValid.name ? 'text-green-500' : 'text-red-500'}`}
                    />
                  </div>
                )}
              </div>
              {formTouched && formData.name && !fieldValid.name && (
                <p id="name-validation" className="text-sm text-red-600 flex items-center gap-2 mt-1">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4" />
                  Nama mestilah sekurang-kurangnya 2 aksara
                </p>
              )}
            </div>

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
                      fieldFocused.email || formData.email ? 'text-primary' : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading || !!success}
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => handleFocus('email')}
                  onBlur={() => handleBlur('email')}
                  className={getInputClasses('email')}
                  placeholder="nama@contoh.com"
                  aria-describedby="email-validation"
                />
                {formTouched && formData.email && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <FontAwesomeIcon 
                      icon={fieldValid.email ? faCheckCircle : faExclamationTriangle} 
                      className={`h-5 w-5 ${fieldValid.email ? 'text-green-500' : 'text-red-500'}`}
                    />
                  </div>
                )}
              </div>
              {formTouched && formData.email && !fieldValid.email && (
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
                      fieldFocused.password || formData.password ? 'text-primary' : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isLoading || !!success}
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => handleFocus('password')}
                  onBlur={() => handleBlur('password')}
                  className={getPasswordInputClasses('password')}
                  placeholder="Cipta kata laluan yang kuat"
                  aria-describedby="password-requirements"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('password')}
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

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${
                      passwordStrength.score <= 2 ? 'text-red-600' : 
                      passwordStrength.score <= 4 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className={`flex items-center gap-2 transition-colors duration-200 ${
                      passwordStrength.checks.length ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <FontAwesomeIcon icon={passwordStrength.checks.length ? faCheck : faTimes} className="h-3 w-3" />
                      <span>Sekurang-kurangnya 8 aksara</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors duration-200 ${
                      passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <FontAwesomeIcon icon={passwordStrength.checks.lowercase ? faCheck : faTimes} className="h-3 w-3" />
                      <span>Huruf kecil (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors duration-200 ${
                      passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <FontAwesomeIcon icon={passwordStrength.checks.uppercase ? faCheck : faTimes} className="h-3 w-3" />
                      <span>Huruf besar (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors duration-200 ${
                      passwordStrength.checks.number ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <FontAwesomeIcon icon={passwordStrength.checks.number ? faCheck : faTimes} className="h-3 w-3" />
                      <span>Nombor (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors duration-200 ${
                      passwordStrength.checks.special ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <FontAwesomeIcon icon={passwordStrength.checks.special ? faCheck : faTimes} className="h-3 w-3" />
                      <span>Simbol khas (@$!%*?&)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                Sahkan Kata Laluan
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={faLock} 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      fieldFocused.confirmPassword || formData.confirmPassword ? 'text-primary' : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isLoading || !!success}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => handleFocus('confirmPassword')}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={getPasswordInputClasses('confirmPassword')}
                  placeholder="Sahkan kata laluan anda"
                  aria-describedby="confirm-password-validation"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform duration-200 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Sembunyikan kata laluan' : 'Tunjukkan kata laluan'}
                >
                  <FontAwesomeIcon 
                    icon={showConfirmPassword ? faEyeSlash : faEye} 
                    className="h-5 w-5 text-gray-400 hover:text-primary transition-colors duration-200"
                  />
                </button>
              </div>
              {formTouched && formData.confirmPassword && !fieldValid.confirmPassword && (
                <p id="confirm-password-validation" className="text-sm text-red-600 flex items-center gap-2 mt-1">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4" />
                  Kata laluan tidak sepadan
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !!success || !formData.name || !formData.email || !formData.password || !formData.confirmPassword}
              className="w-full flex justify-center items-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sedang mendaftar...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
                  Daftar Akaun
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Sudah mempunyai akaun?{' '}
              <Link 
                href="/auth/login" 
                className="font-semibold text-primary hover:text-primary-light transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md px-1 py-0.5"
              >
                Log masuk di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Dengan mendaftar, anda bersetuju dengan syarat dan terma perkhidmatan kami
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
