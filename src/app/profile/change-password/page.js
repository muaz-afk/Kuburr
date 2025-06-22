'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import Navigation from '@/components/Navigation'; // Keep if Navigation is refactored
import { createClient } from '@/lib/supabase/client'; // Import Supabase client
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

// Password criteria constants
const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/; // Checks for non-alphanumeric

export default function ChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State for password strength
  const [strength, setStrength] = useState(0); // Score 0-5
  const [criteria, setCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Check password strength whenever newPassword changes
  useEffect(() => {
    checkPasswordStrength(newPassword);
  }, [newPassword]);

  const checkPasswordStrength = (password) => {
    const newCriteria = {
      length: password.length >= MIN_LENGTH,
      uppercase: HAS_UPPERCASE.test(password),
      lowercase: HAS_LOWERCASE.test(password),
      number: HAS_NUMBER.test(password),
      special: HAS_SPECIAL.test(password),
    };
    setCriteria(newCriteria);

    // Calculate strength score (0-5)
    const score = Object.values(newCriteria).filter(Boolean).length;
    setStrength(score);
  };
  
  const getStrengthColor = (score) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Add check for password strength before submitting
    if (strength < 4) { // Example: Require at least score 4
        setError('Kata laluan baru tidak cukup kuat. Sila penuhi lebih banyak kriteria.');
        return;
    }
    
    setIsLoading(true);

    try {
      // Call Supabase updateUser
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        // Handle specific errors if needed, e.g., weak password on server-side
        setError(updateError.message || 'Gagal menukar kata laluan.');
        setIsLoading(false);
        return;
      }
      
      setSuccess('Kata laluan berjaya ditukar.');
      setNewPassword(''); // Clear the input field
      // Optionally redirect after success
      // setTimeout(() => router.push('/profile'), 1500);

    } catch (err) {
      console.error("Change password unexpected error:", err);
      setError('Berlaku ralat yang tidak dijangka.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper component for criteria list items
  const CriteriaItem = ({ met, text }) => (
    <li className={`flex items-center transition-colors duration-300 ${met ? 'text-green-600' : 'text-gray-500'}`}>
      <FontAwesomeIcon 
        icon={met ? faCheck : faTimes} 
        className={`w-4 h-4 mr-2 ${met ? 'text-green-500' : 'text-red-500'}`} 
      />
      {text}
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Include Navigation if you want it on this page */}
      {/* <Navigation /> */}
      
      <div className="py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
                Tukar Kata Laluan
              </h1>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label 
                    htmlFor="newPassword" 
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Kata Laluan Baru
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800 shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100"
                    disabled={isLoading}
                    aria-describedby="password-strength-indicator"
                  />
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div id="password-strength-indicator" className="space-y-3 pt-2">
                    {/* Strength Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ease-out ${getStrengthColor(strength)}`}
                        style={{ width: `${(strength / 5) * 100}%` }}
                        role="progressbar"
                        aria-valuenow={strength}
                        aria-valuemin="0"
                        aria-valuemax="5"
                      ></div>
                    </div>
                    {/* Criteria List */}
                    <ul className="text-xs space-y-1">
                      <CriteriaItem met={criteria.length} text={`Sekurang-kurangnya ${MIN_LENGTH} aksara`} />
                      <CriteriaItem met={criteria.uppercase} text="Mengandungi huruf besar (A-Z)" />
                      <CriteriaItem met={criteria.lowercase} text="Mengandungi huruf kecil (a-z)" />
                      <CriteriaItem met={criteria.number} text="Mengandungi nombor (0-9)" />
                      <CriteriaItem met={criteria.special} text="Mengandungi simbol (!@#$...)" />
                    </ul>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}
                {success && (
                  <p className="text-sm text-green-600 text-center">{success}</p>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Simpan Perubahan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 