'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faUpload } from '@fortawesome/free-solid-svg-icons';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState(null); // State for the selected file
  const [previewImage, setPreviewImage] = useState(null); // State for image preview URL
  const [initialImageUrl, setInitialImageUrl] = useState(null); // State for initially loaded image URL
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      console.log("ProfilePage: Fetching user data...");
      setIsLoading(true);
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('ProfilePage: Error fetching auth user:', userError);
        setError('Gagal memuatkan data pengguna.');
        setIsLoading(false);
        return;
      }

      if (!currentUser) {
          console.log('ProfilePage: No authenticated user found, redirecting to login.');
          setError('Sila log masuk untuk melihat profil.'); 
          setIsLoading(false);
          router.push('/auth/login'); 
          return;
      }
      console.log("ProfilePage: Auth user found:", currentUser.id);
      setUser(currentUser);
      
      console.log("ProfilePage: Fetching profile data from 'User' table...");
      const { data: profileData, error: profileError } = await supabase
        .from('User')
        .select('name, phone, image')
        .eq('id', currentUser.id)
        .single();

      let loadedName = '';
      let loadedPhone = '';
      let loadedImageUrl = null;

      if (profileError && profileError.code !== 'PGRST116') { // Ignore error if row not found
          console.error('ProfilePage: Error fetching profile data from User table:', profileError);
          setError("Gagal memuatkan data profil dari pangkalan data.");
          // Fallback to auth metadata
          loadedName = currentUser.user_metadata?.full_name || '';
          loadedPhone = currentUser.phone || ''; 
          loadedImageUrl = currentUser.user_metadata?.avatar_url || null;
      } else if (profileData) {
          console.log("ProfilePage: Profile data found in User table:", profileData);
          loadedName = profileData.name || currentUser.user_metadata?.full_name || '';
          loadedPhone = profileData.phone || currentUser.phone || '';
          loadedImageUrl = profileData.image || currentUser.user_metadata?.avatar_url || null;
      } else {
          // Row not found (PGRST116) or profileData is null - likely first time user or sync issue
          console.warn('ProfilePage: Profile data not found in public User table for ID:', currentUser.id, " Falling back to auth metadata.");
          loadedName = currentUser.user_metadata?.full_name || ''; 
          loadedPhone = currentUser.phone || ''; 
          loadedImageUrl = currentUser.user_metadata?.avatar_url || null;
      }
      
      console.log(`ProfilePage: Populating state - Name: ${loadedName}, Phone: ${loadedPhone}, ImageURL: ${loadedImageUrl}`);
      setName(loadedName);
      setPhone(loadedPhone);
      setPreviewImage(loadedImageUrl); // Set preview to the stored image initially
      setInitialImageUrl(loadedImageUrl); // Store the initially loaded URL

      setIsLoading(false);
    };

    fetchUser();
  }, [supabase, router]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Add file size validation (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
          setError('Saiz fail tidak boleh melebihi 5MB.');
          return;
      }
      // Add file type validation
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          setError('Sila pilih fail imej jenis PNG, JPG, atau WEBP.');
          return;
      }
      setError(''); // Clear previous errors
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result); // Update preview with Base64
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChooseImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
        console.error("handleSubmit: Attempted submit without user object.");
        setError("Sesi pengguna tidak ditemui. Sila log masuk semula.");
        return;
    } 

    setError('');
    setSuccess('');
    setIsUpdating(true);
    console.log("handleSubmit: Initiating profile update...");

    // Start with the initial image URL loaded from DB/Auth
    let imageUrlToStore = initialImageUrl; 
    let imageUploadSkipped = true; // Flag to track if upload was attempted
    let imageUploadError = null;

    // --- 1. Upload new image if a file was selected --- 
    if (profileImage) {
        imageUploadSkipped = false; // We are attempting an upload
        console.log(`handleSubmit: New profile image selected (${profileImage.name}), attempting upload...`);
        try {
            const filePath = `public/${user.id}/${Date.now()}-${profileImage.name}`;
            console.log(`handleSubmit: Uploading to bucket 'profiles', path: ${filePath}`);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(filePath, profileImage, {
                    cacheControl: '3600',
                    upsert: true, // Overwrite if necessary
                });

            if (uploadError) {
                console.error("handleSubmit: Supabase storage upload error:", uploadError);
                throw new Error(`Gagal memuat naik fail gambar: ${uploadError.message}`);
            }

            console.log("handleSubmit: Upload successful:", uploadData);

            // --- Get public URL --- 
            console.log(`handleSubmit: Getting public URL for path: ${uploadData.path}`);
            const { data: urlData } = supabase.storage
                .from('profiles')
                .getPublicUrl(uploadData.path);

            if (!urlData || !urlData.publicUrl) {
                console.warn("handleSubmit: Could not get public URL after upload for path:", uploadData.path);
                // Failed to get URL after successful upload, keep original URL but warn user
                imageUploadError = "Gagal mendapatkan URL gambar baharu selepas muat naik."; 
                // imageUrlToStore remains initialImageUrl
            } else {
                console.log("handleSubmit: Obtained new public URL:", urlData.publicUrl);
                // *** Success: Update the URL to be stored ***
                imageUrlToStore = urlData.publicUrl;
            }

        } catch (uploadCatchError) {
            console.error("handleSubmit: Image upload process error:", uploadCatchError);
            imageUploadError = uploadCatchError.message || "Ralat semasa proses muat naik gambar.";
            // Keep the original URL if upload failed
            imageUrlToStore = initialImageUrl; 
        }
    } else {
        console.log("handleSubmit: No new profile image selected.");
        // imageUrlToStore already holds the initial value
    }

    // --- 2. Update profile data in public table and auth metadata --- 
    // Proceed even if there was a non-critical image upload error (like failed getPublicUrl)
    console.log(`handleSubmit: Attempting to update profile data with image URL: ${imageUrlToStore}`);
    try {
        const updates = {
            name: name,
            phone: phone,
            image: imageUrlToStore, // Use the final URL (original or newly uploaded)
            updatedAt: new Date(),
        };
        console.log("handleSubmit: Update payload for 'User' table:", updates);

        const { error: updateError } = await supabase
            .from('User')
            .update(updates)
            .eq('id', user.id);

        if (updateError) {
            console.error("handleSubmit: Supabase profile update error:", updateError);
            throw new Error(`Gagal mengemaskini data profil: ${updateError.message}`);
        }
        console.log("handleSubmit: Profile data updated successfully in 'User' table.");

        // --- 3. Optionally update Supabase Auth metadata --- 
        console.log("handleSubmit: Attempting to update auth metadata...");
        const { error: authUpdateError } = await supabase.auth.updateUser({
            data: { 
                full_name: name,
                avatar_url: imageUrlToStore // Use the same final URL
            }
        });

        if (authUpdateError) {
            // This is often non-critical, just log it
            console.warn("handleSubmit: Failed to update auth metadata:", authUpdateError);
        } else {
             console.log("handleSubmit: Auth metadata updated successfully.");
        }

        // --- Success --- 
        let finalMessage = 'Profil berjaya dikemaskini.';
        if (imageUploadError) { // Append warning if getPublicUrl failed earlier
            finalMessage += ` AMARAN: ${imageUploadError}`;
        }
        setSuccess(finalMessage);
        setProfileImage(null); // Clear selected file state only if upload was attempted
        setInitialImageUrl(imageUrlToStore); // Update the 'initial' state to the newly saved one

    } catch (updateCatchError) {
        console.error("handleSubmit: Profile update process error:", updateCatchError);
        // Prioritize showing the update error unless it was just an image URL retrieval warning
        setError(imageUploadError && !updateCatchError.message.includes('Gagal mengemaskini') ? imageUploadError : updateCatchError.message || 'Gagal mengemaskini profil.');
    } finally {
        setIsUpdating(false);
        console.log("handleSubmit: Profile update process finished.");
    }
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Memuatkan profil...</p> 
      </div>
    );
  }
  
  // Display error if user couldn't be fetched
  if (error && !user) {
     return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <p className="text-red-600">{error}</p>
       </div>
     );
  }
  
  // Should not render if user is null, but added safeguard
  if (!user) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
             <p>Pengguna tidak ditemui.</p>
           </div>
      );
  }

  // Derive display values after user is loaded
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Pengguna';
  const email = user.email || '-';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <Navigation /> */}

      <div className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Profil Pengguna</h1>
              <p className="text-sm text-gray-500 mb-8">Urus maklumat peribadi anda di sini.</p>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Column 1: Profile Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* Username (Display Only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Username
                    </label>
                    <p className="text-gray-800 font-medium p-2.5 bg-gray-100 rounded-md">{username}</p>
                  </div>
                  
                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nama
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800 shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100"
                      disabled={isUpdating}
                    />
                  </div>

                  {/* Email (Display Only) */}
                  <div>
                     <label className="block text-sm font-medium text-gray-500 mb-1">
                       Emel
                     </label>
                     <p className="text-gray-800 p-2.5 bg-gray-100 rounded-md break-words">{email}</p>
                   </div>

                  {/* Phone Input */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      No Telefon
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 012-3456789"
                      className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800 shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100"
                      disabled={isUpdating}
                    />
                  </div>

                  {/* Change Password Link */}
                  <div>
                     <Link 
                        href="/profile/change-password" 
                        className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                     >
                        Tukar Kata Laluan?
                     </Link>
                   </div>
                </div>

                {/* Column 2: Profile Picture */}
                <div className="md:col-span-1 space-y-4 flex flex-col items-center">
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                    Gambar Profil
                  </label>
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                    {previewImage ? (
                      <Image 
                        src={previewImage} 
                        alt="Profile Preview" 
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 640px) 8rem, 10rem"
                        key={previewImage} // Re-render if preview changes
                      />
                    ) : (
                      <FontAwesomeIcon icon={faUserCircle} className="text-gray-400 w-16 h-16" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/png, image/jpeg, image/webp" 
                    className="hidden" 
                  />
                  <button 
                    type="button"
                    onClick={handleChooseImageClick}
                    disabled={isUpdating}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faUpload} className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                    Pilih Gambar
                  </button>
                </div>

                {/* Form Actions */}
                <div className="md:col-span-3 border-t border-gray-200 pt-6 mt-4">
                  {error && (
                    <p className="text-sm text-red-600 text-center mb-4">{error}</p>
                  )}
                  {success && (
                    <p className="text-sm text-green-600 text-center mb-4">{success}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full md:w-auto flex justify-center items-center bg-primary text-white py-2.5 px-6 rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                  >
                    {isUpdating ? (
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