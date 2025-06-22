'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Loading from '@/components/Loading';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBoxOpen, faCalendarAlt, faClipboardList, faDollarSign, faExclamationTriangle, faIdCard, faMapMarkerAlt, faSpinner, faTag, faUser, faUsersCog, faCreditCard, faExclamationCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import QRPaymentModal from '@/components/QRPaymentModal';

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
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED_PENDING_PAYMENT':
      return 'bg-blue-100 text-blue-800';
    case 'PAYMENT_CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
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

export default function UserBookingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  useEffect(() => {
    const fetchUserDataAndBookings = async () => {
      setIsLoading(true);
      setError('');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        toast.error('Sila log masuk untuk melihat tempahan anda.');
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }
      setUser(session.user);

      try {
        const response = await fetch('/api/user/bookings');
        
        if (!response.ok) {
          let errorMessage = `Gagal memuatkan tempahan: ${response.status} ${response.statusText}`; // Default error
          try {
            // Attempt to parse the error response body
            const errorData = await response.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error; // Use specific error message from API if available
            }
          } catch (jsonParseError) {
            // If the response body isn't JSON or is empty, stick with the default HTTP error message
            console.warn('Could not parse error response as JSON:', jsonParseError);
          }
          throw new Error(errorMessage);
        }

        const bookingsData = await response.json();

        // Check for an error property in the successfully parsed JSON data,
        // as some APIs might return 200 OK with an error object.
        if (bookingsData.error) {
            throw new Error(bookingsData.error);
        }
        
        setBookings(bookingsData || []); // Correctly set the bookings array
 
      } catch (error) {
        console.error('Error fetching user bookings:', error);
        setError(error.message);
        toast.error(`Gagal memuatkan data tempahan: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
 
    fetchUserDataAndBookings();
  }, [router, supabase]);

  const handlePayment = async (booking) => {
    // Check if booking is eligible for payment
    if (booking.status !== 'APPROVED_PENDING_PAYMENT') {
      toast.warning('Pembayaran hanya boleh dibuat untuk tempahan yang telah diluluskan.');
      return;
    }

    setSelectedBookingForPayment(booking);
    setShowPaymentModal(true);
  };


  const submitPayment = async ({ receipt, transactionId }) => {
    setIsSubmittingPayment(true);

    try {
      // Submit payment to API using FormData
      const formData = new FormData();
      formData.append('receipt', receipt);
      formData.append('transactionId', transactionId);
      formData.append('paymentNotes', 'Payment submitted via user portal');

      const response = await fetch(`/api/bookings/${selectedBookingForPayment.id}/payment`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses pembayaran');
      }

      // Refresh bookings to get updated data
      const updatedResponse = await fetch('/api/user/bookings');
      if (updatedResponse.ok) {
        const updatedBookings = await updatedResponse.json();
        setBookings(updatedBookings || []);
      }

      toast.success('Pembayaran berjaya dihantar! Menunggu pengesahan admin.');
      setShowPaymentModal(false);
      setSelectedBookingForPayment(null);

    } catch (error) {
      console.error('Error submitting payment:', error);
      throw error; // Re-throw to be handled by the modal
    } finally {
      setIsSubmittingPayment(false);
    }
  };
 
  if (isLoading) {
    return <Loading />;
  }
 
  return (
    <div className="py-10 md:py-16 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sejarah Tempahan Saya</h1>
            <p className="mt-1 text-gray-600 text-sm">Lihat semua tempahan yang telah anda buat.</p>
          </div>
          <Link href="/profile" className="text-primary hover:text-primary-dark transition-colors text-sm">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Kembali ke Profil
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <div className="flex">
              <div className="py-1"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-red-500" /></div>
              <div>
                <p className="font-bold">Ralat Memuatkan Data</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {bookings.length === 0 && !error && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faClipboardList} size="3x" className="text-gray-400 mb-4" />
            <p className="text-xl font-semibold text-gray-700">Tiada Tempahan Ditemui</p>
            <p className="text-gray-500 mt-2">Anda belum membuat sebarang tempahan lagi.</p>
            <Link href="/booking" className="mt-6 inline-block bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors">
              Buat Tempahan Baru
            </Link>
          </div>
        )}

        {bookings.length > 0 && (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className={`p-5 border-l-4 ${getStatusBorderColor(booking.status)}`}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        <FontAwesomeIcon icon={faIdCard} className="mr-2 text-primary" />
                        ID Tempahan: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{booking.id.substring(0, 8)}...</span>
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                        Dibuat pada: {formatDate(booking.createdAt)}
                      </p>
                    </div>
                    <span className={`mt-2 sm:mt-0 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-700 mt-4">
                    <div>
                      <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-500" />
                      <strong>Tarikh Tempahan:</strong> {formatDate(booking.bookingDate)}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-gray-500" />
                      <strong>Plot:</strong> {booking.Plot?.plotIdentifier || 'N/A'}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-500" />
                      <strong>Nama Si Mati:</strong> {booking.Deceased?.name || <span className="italic text-gray-500">Tiada</span>}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faDollarSign} className="mr-2 text-gray-500" />
                      <strong>Jumlah Harga:</strong> {formatCurrency(booking.totalPrice)}
                    </div>
                  </div>

                  {/* Packages */}
                  {booking.BookingPackages && booking.BookingPackages.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">
                        <FontAwesomeIcon icon={faTag} className="mr-2 text-primary" /> Pakej Dipilih:
                      </h4>
                      <ul className="list-disc list-inside pl-1 space-y-1">
                        {booking.BookingPackages.map(bp => (
                          <li key={bp.packageId} className="text-sm text-gray-700">
                            {bp.Package?.label || 'Pakej tidak diketahui'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Funeral Kit */}
                  {booking.BookingKits && booking.BookingKits.length > 0 && booking.BookingKits[0].FuneralKit && (
                     <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-600 mb-1">
                            <FontAwesomeIcon icon={faBoxOpen} className="mr-2 text-primary" /> Kit Pengurusan Jenazah:
                        </h4>
                        <p className="text-sm text-gray-700">{booking.BookingKits[0].FuneralKit.name} ({booking.BookingKits[0].FuneralKit.type})</p>
                     </div>
                  )}


                  {/* Assigned Staff */}
                  {booking.BookingStaff && booking.BookingStaff.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">
                        <FontAwesomeIcon icon={faUsersCog} className="mr-2 text-primary" /> Kakitangan Bertugas:
                      </h4>
                      <ul className="space-y-1">
                        {booking.BookingStaff.map(bs => (
                          <li key={bs.staffId} className="text-sm text-gray-700">
                            <span className={`font-medium ${
                              bs.Staff?.id === 'not-needed-pemandi' ? 'text-blue-600' : ''
                            }`}>
                              {bs.Staff?.name || 'Kakitangan tidak diketahui'}
                            </span> - <span className="capitalize text-xs bg-gray-100 px-1.5 py-0.5 rounded">{bs.staffType?.replace('_', ' ').toLowerCase() || 'Jenis tidak diketahui'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Status-specific Messages and Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    {booking.status === 'PENDING' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faExclamationCircle} className="text-yellow-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Menunggu Kelulusan Admin</p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Tempahan anda sedang disemak oleh admin. Anda akan dimaklumkan setelah kelulusan diterima.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {booking.status === 'APPROVED_PENDING_PAYMENT' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faCreditCard} className="text-blue-500 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-blue-800">Sila Buat Pembayaran</p>
                              <p className="text-xs text-blue-700 mt-1">
                                Tempahan anda telah diluluskan. Sila buat pembayaran untuk mengesahkan tempahan.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePayment(booking)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            Bayar Sekarang
                          </button>
                        </div>
                      </div>
                    )}

                    {(booking.status === 'PAYMENT_CONFIRMED' || booking.status === 'CONFIRMED') && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-green-800">Tempahan Disahkan</p>
                            <p className="text-xs text-green-700 mt-1">
                              Tempahan anda telah disahkan dan pembayaran telah diterima. Kami akan menghubungi anda untuk pengaturan seterusnya.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {booking.status === 'COMPLETED' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-emerald-800">Tempahan Selesai</p>
                            <p className="text-xs text-emerald-700 mt-1">
                              Perkhidmatan pengebumian telah selesai. Terima kasih atas kepercayaan anda.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(booking.status === 'REJECTED' || booking.status === 'CANCELLED') && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Tempahan Dibatalkan</p>
                            <p className="text-xs text-red-700 mt-1">
                              Tempahan ini telah dibatalkan. Sila hubungi kami untuk maklumat lanjut.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Payment Modal */}
      {showPaymentModal && selectedBookingForPayment && (
        <QRPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onReceiptSubmit={submitPayment}
          title="Pembayaran Tempahan"
          details={{
            "ID Tempahan": selectedBookingForPayment.id.substring(0, 8) + "...",
            "Nama Si Mati": selectedBookingForPayment.Deceased?.name || "N/A",
            "Plot": selectedBookingForPayment.Plot?.plotIdentifier || "N/A",
            "Jumlah": formatCurrency(selectedBookingForPayment.totalPrice)
          }}
          submitText="Hantar Resit"
        />
      )}
    </div>
  );
}

// Helper function for border color based on status
const getStatusBorderColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'border-yellow-400';
      case 'APPROVED_PENDING_PAYMENT':
        return 'border-blue-400';
      case 'PAYMENT_CONFIRMED':
        return 'border-green-400';
      case 'CONFIRMED':
        return 'border-green-400';
      case 'COMPLETED':
        return 'border-emerald-400';
      case 'REJECTED':
        return 'border-red-400';
      case 'CANCELLED':
        return 'border-red-400';
      default:
        return 'border-gray-300';
    }
};