'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faCalendarCheck, faMapPin } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import Loading from '@/components/Loading';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingBookings: 0,
    availablePlots: 0,
    occupiedPlots: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Sila log masuk untuk mengakses halaman admin.');
        router.push('/auth/login');
        return false;
      }

      // Fetch user profile to check role
      const { data: profiles, error: profileError } = await supabase
        .from('User') // Assumes table name is 'User' as per DATABASE.md
        .select('role')
        .eq('id', String(user.id)); // Removed .single()
        
      // Log the raw result for debugging
      console.log('Profile fetch result (Admin Dashboard):', { profiles, profileError }); 

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Display the specific PostgREST error message if available
        const errorMsg = profileError.message || 'Ralat tidak diketahui semasa mendapatkan profil.';
        toast.error(`Gagal mendapatkan maklumat pengguna: ${errorMsg}`);
        router.push('/'); // Redirect non-admins or if error occurs
        return false;
      }

      // Check if exactly one profile was returned
      if (!profiles || profiles.length !== 1) {
          console.error('Error: Expected exactly one profile, found:', profiles ? profiles.length : 0);
          toast.error('Gagal mengesahkan maklumat pengguna (Profil tidak ditemui atau duplikasi).');
          router.push('/'); 
          return false;
      }

      // Now use the first profile in the array
      const profile = profiles[0]; 

      if (!profile || profile.role !== 'ADMIN') {
        toast.error('Anda tidak mempunyai kebenaran untuk mengakses halaman ini.');
        router.push('/'); // Redirect non-admins
        return false;
      }

      return true; // User is admin
    };

    const fetchStats = async () => {
      setIsLoading(true);
      setError('');
      try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) {
          setIsLoading(false); // Ensure loading stops if not admin
          return;
        }

        // Fetch actual stats using Supabase queries
        // IMPORTANT: Ensure RLS policies allow admins to perform these counts.
        const [
            userCountRes,
            pendingBookingCountRes,
            availablePlotCountRes,
            occupiedPlotCountRes
        ] = await Promise.all([
          supabase
            .from('User')
            .select('*', { count: 'exact', head: true }), // Count all users
          supabase
            .from('Booking')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING'), // Count pending bookings
          supabase
            .from('Plot')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'AVAILABLE'), // Count available plots
          supabase
            .from('Plot')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'OCCUPIED') // Count occupied plots
        ]);

        // Error handling for counts
        if (userCountRes.error) throw new Error(`Error counting users: ${userCountRes.error.message}`);
        if (pendingBookingCountRes.error) throw new Error(`Error counting pending bookings: ${pendingBookingCountRes.error.message}`);
        if (availablePlotCountRes.error) throw new Error(`Error counting available plots: ${availablePlotCountRes.error.message}`);
        if (occupiedPlotCountRes.error) throw new Error(`Error counting occupied plots: ${occupiedPlotCountRes.error.message}`);

        setStats({
          totalUsers: userCountRes.count ?? 0,
          pendingBookings: pendingBookingCountRes.count ?? 0,
          availablePlots: availablePlotCountRes.count ?? 0,
          occupiedPlots: occupiedPlotCountRes.count ?? 0,
        });

      } catch (fetchError) {
        console.error('Error fetching admin stats:', fetchError);
        setError(`Gagal memuatkan statistik admin: ${fetchError.message}`);
        toast.error(`Gagal memuatkan statistik admin: ${fetchError.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [supabase, router]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-primary text-white p-6 sm:p-8 rounded-t-lg shadow">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-primary-light text-sm sm:text-base">Ringkasan Sistem Pengurusan Kubur</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-b-lg shadow space-y-8">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p className="font-bold">Ralat</p>
              <p>{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Statistik Utama</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Users Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="bg-blue-500 text-white rounded-full p-3">
                    <FontAwesomeIcon icon={faUsers} className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-700">Jumlah Pengguna</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              {/* Pending Bookings Card */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 p-5 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="bg-yellow-500 text-white rounded-full p-3">
                    <FontAwesomeIcon icon={faCalendarCheck} className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-700">Tempahan Menunggu</p>
                    <p className="text-2xl font-bold text-yellow-900">{stats.pendingBookings}</p>
                  </div>
                </div>
              </div>

              {/* Available Plots Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-5 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="bg-green-500 text-white rounded-full p-3">
                    <FontAwesomeIcon icon={faMapPin} className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-700">Plot Tersedia</p>
                    <p className="text-2xl font-bold text-green-900">{stats.availablePlots}</p>
                  </div>
                </div>
              </div>

               {/* Occupied Plots Card */}
               <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-5 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="bg-red-500 text-white rounded-full p-3">
                    <FontAwesomeIcon icon={faMapPin} className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-700">Plot Diduduki</p>
                    <p className="text-2xl font-bold text-red-900">{stats.occupiedPlots}</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Quick Links / Actions */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Tindakan Pantas</h2>
            <div className="flex flex-wrap gap-4">
              <Link href="/admin/bookings">
                <button className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-light transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                  Lihat Senarai Tempahan
                </button>
              </Link>
              <Link href="/admin/staff">
                <button className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Urus Kakitangan
                </button>
              </Link>
              <Link href="/admin/waqaf">
                <button className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                  Urus Waqaf
                </button>
              </Link>
              {/* Add links to user management, plot management etc. when created */}
              {/* Example: <Link href="/admin/users"><button>...</button></Link> */}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
} 