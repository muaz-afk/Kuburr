'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingContext } from '@/context/BookingContext';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import Loading from '@/components/Loading';

export default function BookingRegistrationPage() {
  const router = useRouter();
  const supabase = createClient();
  const { bookingData, updateBookingData } = useBookingContext();

  // Local state for form fields (Initialize from context if available)
  const [applicantName, setApplicantName] = useState(bookingData.applicantName || '');
  const [applicantPhone, setApplicantPhone] = useState(bookingData.applicantPhone || '');
  const [deceasedName, setDeceasedName] = useState(bookingData.deceasedName || '');
  const [deceasedIC, setDeceasedIC] = useState(bookingData.deceasedIC || '');
  const [deceasedGender, setDeceasedGender] = useState(bookingData.deceasedGender || '');
  const [deathCertificateFile, setDeathCertificateFile] = useState(bookingData.deathCertificateFile || null);
  const [deathCertificateFileName, setDeathCertificateFileName] = useState(
    bookingData.deathCertificateFile ? bookingData.deathCertificateFile.name : 'Tiada fail dipilih'
  );
  const [permitFile, setPermitFile] = useState(bookingData.permitFile || null);
  const [permitFileName, setPermitFileName] = useState(
    bookingData.permitFile ? bookingData.permitFile.name : 'Tiada fail dipilih'
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState('');

  // Check authentication and load user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Sila log masuk untuk membuat tempahan.');
          router.push('/auth/login');
          return;
        }
        
        // Pre-fill phone from user data if available and not already set
        if (session.user.user_metadata) {
          const { phone } = session.user.user_metadata;
          if (!applicantPhone && phone) setApplicantPhone(phone);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        toast.error('Ralat semasa menyemak status log masuk.');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [supabase, router, applicantName, applicantPhone]);

  // Form validation
  const validateForm = () => {
    // Reset error state
    setError(''); // Keep for general errors, toasts for specific validation
    
    // Basic validation for required fields
    if (!applicantName.trim()) {
      toast.error('Sila masukkan nama pemohon.');
      return false;
    }
    
    if (!applicantPhone.trim()) {
      toast.error('Sila masukkan nombor telefon pemohon.');
      return false;
    }
    
    // Phone number validation (basic Malaysian format)
    const phoneRegex = /^(01\d{8,9}|0\d{8,9})$/;
    const formattedPhone = applicantPhone.replace(/[^0-9]/g, '');
    if (!phoneRegex.test(formattedPhone)) {
      toast.error('Format nombor telefon tidak sah. Contoh: 0123456789');
      return false;
    }
    
    if (!deceasedName.trim()) {
      toast.error('Sila masukkan nama simati.');
      return false;
    }
    
    if (!deceasedIC.trim()) {
      toast.error('Sila masukkan nombor kad pengenalan simati.');
      return false;
    }
    
    // Malaysian IC validation (basic check)
    const icRegex = /^\d{6}-\d{2}-\d{4}$/;
    if (!icRegex.test(deceasedIC)) {
      toast.error('Format no. K/P tidak sah. Contoh: 850101-10-1234');
      return false;
    }
    
    if (!deceasedGender) {
      toast.error('Sila pilih jantina simati.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Show loading toast
      const loadingToast = toast.loading('Sedang memproses...');

      // Format phone number (remove any non-numeric characters)
      const formattedPhone = applicantPhone.replace(/[^0-9]/g, '');
      
      // Update context with form data
      updateBookingData({
        applicantName,
        applicantPhone: formattedPhone,
        deceasedName,
        deceasedIC,
        deceasedGender,
        deathCertificateFile,
        permitFile,
      });

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Maklumat berjaya disimpan.');

      // Set navigating state and redirect
      setIsNavigating(true);
      setTimeout(() => {
        router.push('/booking');
      }, 1000);

    } catch (error) {
      console.error('Form submission error:', error);
      setError(error.message);
      toast.error(error.message);
      setIsNavigating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Death certificate file handling
  const handleDeathCertificateFileChange = (e) => {
    setError(''); // Clear general error on new file selection
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // File size validation (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Saiz fail sijil kematian tidak boleh melebihi 5MB.');
        e.target.value = null;
        setDeathCertificateFile(null);
        setDeathCertificateFileName('Tiada fail dipilih');
        return;
      }
      
      // File type validation
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Sila pilih fail sijil kematian format PDF, JPG, PNG, atau WEBP.');
        e.target.value = null;
        setDeathCertificateFile(null);
        setDeathCertificateFileName('Tiada fail dipilih');
        return;
      }
      
      setDeathCertificateFile(file);
      setDeathCertificateFileName(file.name);
    }
  };

  // Permit file handling
  const handlePermitFileChange = (e) => {
    setError(''); // Clear general error on new file selection
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // File size validation (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Saiz fail permit perkuburan tidak boleh melebihi 5MB.');
        e.target.value = null;
        setPermitFile(null);
        setPermitFileName('Tiada fail dipilih');
        return;
      }
      
      // File type validation
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Sila pilih fail permit perkuburan format PDF, JPG, PNG, atau WEBP.');
        e.target.value = null;
        setPermitFile(null);
        setPermitFileName('Tiada fail dipilih');
        return;
      }
      
      setPermitFile(file);
      setPermitFileName(file.name);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isNavigating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary mb-4"/>
        <p className="text-gray-600">Mengalihkan ke halaman seterusnya...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-primary text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold">
            Pendaftaran Penempahan
          </h1>
           <p className="mt-2 text-primary-light">Langkah 1: Isi Maklumat Pemohon & Simati</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Applicant Information */}
            <fieldset className="space-y-4">
              <legend className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Maklumat Pemohon / Waris</legend>
              {/* Name - Pre-filled, Editable */}
              <div>
                <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Penuh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="applicantName"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black disabled:bg-gray-100"
                  placeholder="Masukkan Nama Penuh Pemohon/Waris"
                />
              </div>
              {/* Phone - Pre-filled, Editable */}
              <div>
                <label htmlFor="applicantPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  No. Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="applicantPhone"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black disabled:bg-gray-100"
                  placeholder="Contoh: 012-3456789"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Format: 01x-xxxxxxx atau 01xxxxxxxxx
                </p>
              </div>
            </fieldset>

            {/* Deceased Information */}
            <fieldset className="space-y-4">
              <legend className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Maklumat Simati</legend>
              {/* Deceased Name */}
              <div>
                <label htmlFor="deceasedName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Penuh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="deceasedName"
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black disabled:bg-gray-100"
                  placeholder="Masukkan Nama Penuh Simati"
                />
              </div>
              {/* Deceased IC */}
              <div>
                <label htmlFor="deceasedIC" className="block text-sm font-medium text-gray-700 mb-1">
                  No. Kad Pengenalan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="deceasedIC"
                  value={deceasedIC}
                  onChange={(e) => setDeceasedIC(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black disabled:bg-gray-100"
                  placeholder="Contoh: 850101-10-1234"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Format: xxxxxx-xx-xxxx
                </p>
              </div>
              {/* Deceased Gender */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Jantina <span className="text-red-500">*</span>
                 </label>
                 <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                        <input 
                            type="radio" 
                            name="deceasedGender" 
                            value="LELAKI" 
                            checked={deceasedGender === 'LELAKI'}
                            onChange={(e) => setDeceasedGender(e.target.value)}
                            required
                            disabled={isSubmitting}
                            className="text-primary focus:ring-primary"
                        />
                        <span>Lelaki</span>
                    </label>
                     <label className="flex items-center space-x-2">
                        <input 
                            type="radio" 
                            name="deceasedGender" 
                            value="WANITA" 
                            checked={deceasedGender === 'WANITA'}
                            onChange={(e) => setDeceasedGender(e.target.value)}
                            required
                            disabled={isSubmitting}
                            className="text-primary focus:ring-primary"
                         />
                        <span>Wanita</span>
                    </label>
                 </div>
              </div>
              {/* Death Certificate Upload */}
              <div>
                <label htmlFor="deathCertificateFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Sijil Kematian (Lampiran)
                </label>
                <input
                  type="file"
                  id="deathCertificateFile"
                  onChange={handleDeathCertificateFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={isSubmitting}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fail semasa: {deathCertificateFileName}. Had Saiz: 5MB (PDF, JPG, PNG, WEBP).
                </p>
              </div>
              {/* Permit Perkuburan Upload */}
              <div>
                <label htmlFor="permitFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Permit Perkuburan (Lampiran)
                </label>
                <input
                  type="file"
                  id="permitFile"
                  onChange={handlePermitFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={isSubmitting}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fail semasa: {permitFileName}. Had Saiz: 5MB (PDF, JPG, PNG, WEBP).
                </p>
              </div>
            </fieldset>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-white px-8 py-2.5 rounded-md hover:bg-primary-light transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="h-5 w-5"/>
                ) : null}
                Seterusnya
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
} 