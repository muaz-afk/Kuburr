'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Loading from '@/components/Loading';
import ImageViewModal from '@/components/ImageViewModal';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEye, faCheckCircle, faTimesCircle, faArrowLeft, faFileAlt, 
  faClipboardCheck, faBan, faFilter, faRefresh, faCalendarAlt,
  faUser, faMapMarkerAlt, faDollarSign, faUsersCog, faExclamationTriangle,
  faCheckDouble, faSpinner, faSearch
} from '@fortawesome/free-solid-svg-icons';

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('ms-MY', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (e) {
    return 'Tarikh Tidak Sah';
  }
};

// Helper to format currency
const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '-';
  return `RM ${amount.toFixed(2)}`;
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'APPROVED_PENDING_PAYMENT':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PAYMENT_CONFIRMED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'PENDING':
      return 'Menunggu Kelulusan';
    case 'APPROVED_PENDING_PAYMENT':
      return 'Menunggu Bayaran';
    case 'PAYMENT_CONFIRMED':
      return 'Disahkan';
    case 'CONFIRMED':
      return 'Disahkan';
    case 'COMPLETED':
      return 'Selesai';
    case 'REJECTED':
      return 'Ditolak';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return status;
  }
};

export default function AdminBookingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  
  // Modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState({
    url: '',
    title: '',
    filename: ''
  });

  useEffect(() => {
    const checkAdmin = async () => {
      console.log('[AdminBookings] Checking admin authentication...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('[AdminBookings] No authenticated user found');
        toast.error('Sila log masuk untuk mengakses halaman admin.');
        router.push('/auth/login');
        return false;
      }

      console.log('[AdminBookings] User found, checking role for user ID:', user.id);
      
      // Fetch user profile to check role
      const { data: profiles, error: profileError } = await supabase
        .from('User')
        .select('role')
        .eq('id', String(user.id));
        
      console.log('[AdminBookings] Profile fetch result:', { profiles, profileError });

      if (profileError) {
        console.error('[AdminBookings] Error fetching user profile:', profileError);
        toast.error(`Gagal mendapatkan maklumat pengguna: ${profileError.message}`);
        router.push('/');
        return false;
      }

      if (!profiles || profiles.length !== 1) {
        console.error('[AdminBookings] Invalid profile count:', profiles?.length);
        toast.error('Gagal mengesahkan maklumat pengguna.');
        router.push('/'); 
        return false;
      }

      const profile = profiles[0];
      console.log('[AdminBookings] User profile:', profile);

      if (!profile || profile.role !== 'ADMIN') {
        console.log('[AdminBookings] User is not admin, role:', profile?.role);
        toast.error('Anda tidak mempunyai kebenaran untuk mengakses halaman ini.');
        router.push('/');
        return false;
      }
      
      console.log('[AdminBookings] User verified as admin');
      return true;
    };

    const fetchBookings = async () => {
      console.log('[AdminBookings] Starting fetchBookings with filter:', filter);
      setIsLoading(true);
      setError('');
      
      try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) {
           console.log('[AdminBookings] User is not admin, aborting fetch');
           setIsLoading(false);
           return;
        }

        console.log('[AdminBookings] User verified as admin, fetching bookings...');
        
        const apiUrl = `/api/admin/bookings?status=${filter}&page=${pagination.page}&limit=${pagination.limit}`;
        console.log('[AdminBookings] API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('[AdminBookings] API Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[AdminBookings] API Error response:', errorData);
          throw new Error(errorData.error || 'Gagal memuatkan tempahan');
        }
        
        const responseData = await response.json();
        console.log('[AdminBookings] API Success response structure:', {
          bookingsCount: responseData.bookings?.length || 0,
          hasStatistics: !!responseData.statistics,
          hasPagination: !!responseData.pagination
        });
        console.log('[AdminBookings] Sample booking data:', responseData.bookings?.[0]);
        console.log('[AdminBookings] Statistics:', responseData.statistics);
        
        setBookings(responseData.bookings || []);
        setStatistics(responseData.statistics || {});
        setPagination(responseData.pagination || pagination);

      } catch (fetchError) {
        console.error('[AdminBookings] Error fetching bookings:', fetchError);
        console.error('[AdminBookings] Error stack:', fetchError.stack);
        setError(fetchError.message);
        toast.error(`Gagal memuatkan data: ${fetchError.message}`);
      } finally {
        console.log('[AdminBookings] Fetch completed, setting loading to false');
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [supabase, router, filter, pagination.page]);

  // Filter and search bookings (client-side search on current page)
  useEffect(() => {
    let filtered = bookings;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.id.toLowerCase().includes(term) ||
        booking.User?.name?.toLowerCase().includes(term) ||
        booking.User?.email?.toLowerCase().includes(term) ||
        booking.Deceased?.name?.toLowerCase().includes(term) ||
        booking.Deceased?.icNumber?.toLowerCase().includes(term) ||
        booking.Plot?.plotIdentifier?.toLowerCase().includes(term)
      );
    }
    
    setFilteredBookings(filtered);
  }, [bookings, searchTerm]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [filter]);

  const handlePageChange = (newPage) => {
    console.log('[AdminBookings] Changing to page:', newPage);
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    console.log('[AdminBookings] Changing limit to:', newLimit);
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const openImageModal = (url, title, filename = null) => {
    setSelectedImage({ url, title, filename });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage({ url: '', title: '', filename: '' });
  };

  const handleApproveBooking = (booking) => {
    console.log('[AdminBookings] Opening approval modal for booking:', booking.id);
    setSelectedBooking(booking);
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  const handleRejectBooking = (booking) => {
    console.log('[AdminBookings] Opening rejection modal for booking:', booking.id);
    setSelectedBooking(booking);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const submitApproval = async () => {
    if (!selectedBooking) {
      console.warn('[AdminBookings] submitApproval called without selectedBooking');
      return;
    }

    console.log('[AdminBookings] Starting approval for booking:', selectedBooking.id);
    setIsProcessing(true);
    const loadingToast = toast.loading('Sedang meluluskan tempahan...');

    try {
      const approvalData = { adminNotes: approvalNotes.trim() || null };
      console.log('[AdminBookings] Approval data:', approvalData);
      
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalData),
      });

      console.log('[AdminBookings] Approval response status:', response.status);
      const data = await response.json();
      console.log('[AdminBookings] Approval response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal meluluskan tempahan');
      }

      // Refresh bookings list
      console.log('[AdminBookings] Approval successful, refreshing bookings list');
      const refreshResponse = await fetch(`/api/admin/bookings?status=${filter}&page=${pagination.page}&limit=${pagination.limit}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setBookings(refreshData.bookings || []);
        setStatistics(refreshData.statistics || {});
        setPagination(refreshData.pagination || pagination);
      }

      toast.success('Tempahan berjaya diluluskan', { id: loadingToast });
      setShowApprovalModal(false);
      setSelectedBooking(null);

    } catch (error) {
      console.error('[AdminBookings] Error approving booking:', error);
      toast.error(error.message || 'Gagal meluluskan tempahan', { id: loadingToast });
    } finally {
      console.log('[AdminBookings] Approval process completed');
      setIsProcessing(false);
    }
  };

  const submitRejection = async () => {
    if (!selectedBooking || !rejectionReason.trim()) {
      console.warn('[AdminBookings] submitRejection called with invalid data');
      toast.error('Sila nyatakan sebab penolakan');
      return;
    }

    console.log('[AdminBookings] Starting rejection for booking:', selectedBooking.id);
    setIsProcessing(true);
    const loadingToast = toast.loading('Sedang menolak tempahan...');

    try {
      const rejectionData = {
        rejectionReason: rejectionReason.trim(),
        adminNotes: null,
      };
      console.log('[AdminBookings] Rejection data:', rejectionData);
      
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectionData),
      });

      console.log('[AdminBookings] Rejection response status:', response.status);
      const data = await response.json();
      console.log('[AdminBookings] Rejection response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menolak tempahan');
      }

      // Refresh bookings list
      console.log('[AdminBookings] Rejection successful, refreshing bookings list');
      const refreshResponse = await fetch(`/api/admin/bookings?status=${filter}&page=${pagination.page}&limit=${pagination.limit}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setBookings(refreshData.bookings || []);
        setStatistics(refreshData.statistics || {});
        setPagination(refreshData.pagination || pagination);
      }

      toast.success('Tempahan berjaya ditolak', { id: loadingToast });
      setShowRejectionModal(false);
      setSelectedBooking(null);

    } catch (error) {
      console.error('[AdminBookings] Error rejecting booking:', error);
      toast.error(error.message || 'Gagal menolak tempahan', { id: loadingToast });
    } finally {
      console.log('[AdminBookings] Rejection process completed');
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async (payment) => {
    console.log('[AdminBookings] Starting payment verification for:', payment.id);
    const loadingToast = toast.loading('Mengesahkan pembayaran...');
    
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified: true,
          adminNotes: 'Payment verified by admin'
        }),
      });

      console.log('[AdminBookings] Payment verification response status:', response.status);
      const data = await response.json();
      console.log('[AdminBookings] Payment verification response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengesahkan pembayaran');
      }

      // Refresh bookings list
      console.log('[AdminBookings] Payment verification successful, refreshing bookings list');
      const refreshResponse = await fetch(`/api/admin/bookings?status=${filter}&page=${pagination.page}&limit=${pagination.limit}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setBookings(refreshData.bookings || []);
        setStatistics(refreshData.statistics || {});
        setPagination(refreshData.pagination || pagination);
      }

      toast.success('Pembayaran berjaya disahkan', { id: loadingToast });
    } catch (error) {
      console.error('[AdminBookings] Error verifying payment:', error);
      toast.error(error.message || 'Gagal mengesahkan pembayaran', { id: loadingToast });
    }
  };

  const handleCompleteBooking = async (booking) => {
    console.log('[AdminBookings] Starting completion for booking:', booking.id);
    const loadingToast = toast.loading('Menandakan tempahan sebagai selesai...');
    
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: 'Booking completed by admin' }),
      });

      console.log('[AdminBookings] Completion response status:', response.status);
      const data = await response.json();
      console.log('[AdminBookings] Completion response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menandakan tempahan sebagai selesai');
      }

      // Refresh bookings list
      console.log('[AdminBookings] Completion successful, refreshing bookings list');
      const refreshResponse = await fetch(`/api/admin/bookings?status=${filter}&page=${pagination.page}&limit=${pagination.limit}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setBookings(refreshData.bookings || []);
        setStatistics(refreshData.statistics || {});
        setPagination(refreshData.pagination || pagination);
      }

      toast.success('Tempahan berjaya ditandakan sebagai selesai', { id: loadingToast });
    } catch (error) {
      console.error('[AdminBookings] Error completing booking:', error);
      toast.error(error.message || 'Gagal menandakan tempahan sebagai selesai', { id: loadingToast });
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Senarai Permohonan Tempahan</h1>
                <p className="mt-1 text-gray-600">Urus dan semak tempahan pengguna</p>
              </div>
              <Link href="/admin" className="text-primary hover:text-primary-dark transition-colors text-sm font-medium">
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Kembali ke Admin
              </Link>
            </div>

            {/* Statistics Cards */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(statistics).map(([status, count]) => (
                <div key={status} className="bg-white rounded-lg shadow p-4 border-l-4 border-primary">
                  <div className="text-sm font-medium text-gray-600">{getStatusLabel(status)}</div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3" />
                <div>
                  <p className="font-bold">Ralat</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faFilter} className="mr-2" />
                  Tapis Mengikut Status
                </label>
                <select 
                  id="statusFilter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PENDING">Menunggu Kelulusan</option>
                  <option value="APPROVED_PENDING_PAYMENT">Diluluskan - Menunggu Bayaran</option>
                  <option value="PAYMENT_CONFIRMED">Disahkan</option>
                  <option value="COMPLETED">Selesai</option>
                  <option value="REJECTED">Ditolak</option>
                </select>
              </div>

              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faSearch} className="mr-2" />
                  Cari Tempahan
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari ID, nama, email, IC..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="limitSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Per Halaman
                </label>
                <select 
                  id="limitSelect"
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                  className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                >
                  <option value={5}>5 per halaman</option>
                  <option value={10}>10 per halaman</option>
                  <option value={20}>20 per halaman</option>
                  <option value={50}>50 per halaman</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors font-medium"
                >
                  <FontAwesomeIcon icon={faRefresh} className="mr-2" />
                  Muat Semula
                </button>
              </div>
            </div>
          </div>

          {/* Bookings Cards */}
          <div className="space-y-6">
            {filteredBookings.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <FontAwesomeIcon icon={faSearch} size="3x" className="text-gray-400 mb-4" />
                <p className="text-xl font-semibold text-gray-700">Tiada Tempahan Ditemui</p>
                <p className="text-gray-500 mt-2">
                  {searchTerm ? 'Tiada hasil untuk carian ini.' : `Tiada tempahan dengan status ${getStatusLabel(filter)}.`}
                </p>
              </div>
            )}

            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                
                {/* Card Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        ID: {booking.id.substring(0, 8)}...
                      </h3>
                      <p className="text-sm text-gray-500">
                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                        Dibuat: {formatDate(booking.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeStyle(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                      {booking.status === 'APPROVED_PENDING_PAYMENT' && booking.paymentDeadline && (
                        <div className="text-xs text-gray-500">
                          Deadline: {formatDate(booking.paymentDeadline)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* User Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        <FontAwesomeIcon icon={faUser} className="mr-2 text-primary" />
                        Pemohon
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{booking.User?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{booking.User?.email || '-'}</p>
                        <p className="text-xs text-gray-500">{booking.User?.phone || '-'}</p>
                      </div>
                    </div>

                    {/* Deceased Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        <FontAwesomeIcon icon={faUser} className="mr-2 text-primary" />
                        Si Mati
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{booking.Deceased?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">IC: {booking.Deceased?.icNumber || '-'}</p>
                        <p className="text-xs text-gray-500">
                          Jantina: {booking.Deceased?.gender || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-primary" />
                        Butiran Tempahan
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Plot:</span> 
                          <span className="font-semibold text-primary ml-1">
                            {booking.Plot?.plotIdentifier || 'N/A'}
                          </span>
                          {booking.Plot?.row && booking.Plot?.column && (
                            <span className="text-gray-500 ml-2">
                              (Baris {booking.Plot.row}, Lajur {booking.Plot.column})
                            </span>
                          )}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Tarikh:</span> {formatDate(booking.bookingDate)}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-green-600">Jumlah:</span> 
                          <span className="font-bold text-green-600 ml-1">{formatCurrency(booking.totalPrice)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selected Packages */}
                  {booking.BookingPackage && booking.BookingPackage.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        <FontAwesomeIcon icon={faFileAlt} className="mr-2 text-primary" />
                        Pakej Dipilih
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {booking.BookingPackage.map((packageItem) => (
                          <div key={packageItem.Package.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900">
                              {packageItem.Package.label}
                            </div>
                            <div className="text-xs text-green-600 font-medium">
                              {formatCurrency(packageItem.Package.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff Assignments */}
                  {booking.BookingStaff && booking.BookingStaff.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        <FontAwesomeIcon icon={faUsersCog} className="mr-2 text-primary" />
                        Kakitangan Bertugas
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {booking.BookingStaff.map((assignment) => (
                          <div key={assignment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              {assignment.staffType === 'PENGALI_KUBUR' ? 'Pengali Kubur' : 'Pemandi Jenazah'}
                            </div>
                            <div className={`text-sm font-medium ${
                              assignment.Staff?.id?.includes('not-needed') 
                                ? 'text-blue-600' 
                                : 'text-gray-900'
                            }`}>
                              {assignment.Staff?.name || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {booking.status === 'REJECTED' && booking.rejectionReason && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-red-800 mb-2">Sebab Penolakan</h4>
                        <p className="text-sm text-red-700">{booking.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Files and Actions */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      
                      {/* File Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {booking.death_certificate_url && (
                          <button
                            onClick={() => openImageModal(
                              booking.death_certificate_url, 
                              'Sijil Kematian', 
                              `sijil-mati-${booking.id.substring(0,8)}.pdf`
                            )}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                          >
                            <FontAwesomeIcon icon={faFileAlt} className="mr-1" />
                            Sijil Mati
                          </button>
                        )}
                        
                        {booking.burial_permit_url && (
                          <button
                            onClick={() => openImageModal(
                              booking.burial_permit_url, 
                              'Permit Perkuburan', 
                              `permit-kubur-${booking.id.substring(0,8)}.pdf`
                            )}
                            className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                          >
                            <FontAwesomeIcon icon={faFileAlt} className="mr-1" />
                            Permit
                          </button>
                        )}

                        {booking.Payment && booking.Payment.length > 0 && booking.Payment[0].receiptUrl && (
                          <button
                            onClick={() => openImageModal(
                              booking.Payment[0].receiptUrl, 
                              'Resit Pembayaran', 
                              booking.Payment[0].receiptFilename || `resit-${booking.id.substring(0,8)}.jpg`
                            )}
                            className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                          >
                            <FontAwesomeIcon icon={faFileAlt} className="mr-1" />
                            Resit ({booking.Payment[0].paymentStatus})
                          </button>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {booking.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApproveBooking(booking)}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                              Luluskan
                            </button>
                            <button
                              onClick={() => handleRejectBooking(booking)}
                              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <FontAwesomeIcon icon={faBan} className="mr-2" />
                              Tolak
                            </button>
                          </>
                        )}

                        {booking.status === 'APPROVED_PENDING_PAYMENT' && 
                         booking.Payment && booking.Payment.length > 0 && 
                         booking.Payment[0].paymentStatus === 'SUBMITTED' && (
                          <button
                            onClick={() => handleVerifyPayment(booking.Payment[0])}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <FontAwesomeIcon icon={faCheckDouble} className="mr-2" />
                            Sahkan Bayaran
                          </button>
                        )}
                        
                        {booking.status === 'PAYMENT_CONFIRMED' && (
                          <button
                            onClick={() => handleCompleteBooking(booking)}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                            Tandakan Selesai
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                
                {/* Pagination Info */}
                <div className="text-sm text-gray-700">
                  Menunjukkan halaman <span className="font-medium">{pagination.page}</span> daripada{' '}
                  <span className="font-medium">{pagination.totalPages}</span> halaman
                  <span className="ml-2 text-gray-500">
                    ({pagination.totalCount} jumlah rekod)
                  </span>
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center gap-2">
                  
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPreviousPage || isLoading}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelum
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {/* First page */}
                    {pagination.page > 3 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          1
                        </button>
                        {pagination.page > 4 && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                      </>
                    )}

                    {/* Previous page */}
                    {pagination.page > 1 && (
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {pagination.page - 1}
                      </button>
                    )}

                    {/* Current page */}
                    <button
                      className="px-3 py-2 text-sm font-medium text-white bg-primary border border-primary rounded-md"
                      disabled
                    >
                      {pagination.page}
                    </button>

                    {/* Next page */}
                    {pagination.page < pagination.totalPages && (
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {pagination.page + 1}
                      </button>
                    )}

                    {/* Last page */}
                    {pagination.page < pagination.totalPages - 2 && (
                      <>
                        {pagination.page < pagination.totalPages - 3 && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(pagination.totalPages)}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          {pagination.totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage || isLoading}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Seterusnya
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <ImageViewModal
          isOpen={showImageModal}
          onClose={closeImageModal}
          imageUrl={selectedImage.url}
          title={selectedImage.title}
          filename={selectedImage.filename}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Luluskan Tempahan</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm"><strong>ID:</strong> {selectedBooking.id.substring(0, 8)}...</p>
                <p className="text-sm"><strong>Pemohon:</strong> {selectedBooking.User?.name}</p>
                <p className="text-sm"><strong>Si Mati:</strong> {selectedBooking.Deceased?.name}</p>
                <p className="text-sm"><strong>Jumlah:</strong> {formatCurrency(selectedBooking.totalPrice)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nota Admin (Pilihan)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Tambah nota untuk kelulusan ini..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={submitApproval}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                      Memproses...
                    </>
                  ) : (
                    'Luluskan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tolak Tempahan</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm"><strong>ID:</strong> {selectedBooking.id.substring(0, 8)}...</p>
                <p className="text-sm"><strong>Pemohon:</strong> {selectedBooking.User?.name}</p>
                <p className="text-sm"><strong>Si Mati:</strong> {selectedBooking.Deceased?.name}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sebab Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Nyatakan sebab penolakan tempahan ini..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={submitRejection}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                      Memproses...
                    </>
                  ) : (
                    'Tolak'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}