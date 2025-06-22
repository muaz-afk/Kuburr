'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExport, faCalendarAlt, faChartBar, faBookmark, faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons';
import Loading from '@/components/Loading';
import { toast } from 'sonner';

export default function AdminStatisticsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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
        .from('User')
        .select('role')
        .eq('id', String(user.id));

      if (profileError || !profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
        toast.error('Anda tidak mempunyai kebenaran untuk mengakses halaman ini.');
        router.push('/');
        return false;
      }

      setUser(user);
      return true;
    };

    const init = async () => {
      const isAdmin = await checkAdmin();
      if (isAdmin) {
        fetchStats();
      }
    };

    init();
  }, [supabase, router, year, month]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ year: year.toString() });
      if (month) params.append('month', month);

      const response = await fetch(`/api/statistics/admin?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuatkan statistik');
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Gagal memuatkan statistik: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!stats) return;

    try {
      setIsExporting(true);
      const response = await fetch('/api/statistics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin',
          year,
          month,
          data: stats
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengeksport PDF');
      }

      // Create and download PDF
      const blob = new Blob([result.htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename.replace('.pdf', '.html');
      a.click();
      window.URL.revokeObjectURL(url);

      // Open in new tab for PDF printing
      const newWindow = window.open('', '_blank');
      newWindow.document.write(result.htmlContent);
      newWindow.document.close();
      
      toast.success('PDF siap untuk dicetak! Gunakan Ctrl+P atau Cmd+P untuk mencetak.');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Gagal mengeksport PDF: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const getMonthlyChartData = (data) => {
    if (!data) return [];
    
    return Object.entries(data).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount,
      monthName: new Date(month + '-01').toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })
    })).sort((a, b) => a.month.localeCompare(b.month));
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-primary text-white p-6 sm:p-8 rounded-t-lg shadow">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistik Admin</h1>
          <p className="mt-1 text-primary-light text-sm sm:text-base">Ringkasan lengkap tempahan dan waqaf</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-b-lg shadow space-y-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bulan (Pilihan)</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Semua Bulan</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m.toString().padStart(2, '0')}>
                      {new Date(2000, m - 1).toLocaleDateString('ms-MY', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={exportToPDF}
              disabled={isExporting || !stats}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faFileExport} className="h-4 w-4" />
              {isExporting ? 'Mengeksport...' : 'Eksport PDF'}
            </button>
          </div>

          {stats && (
            <>
              {/* Overall Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-blue-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faBookmark} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-700">Jumlah Tempahan</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.bookings.totalBookings}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-green-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faChartBar} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-700">Pendapatan Tempahan</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.bookings.totalBookingAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-purple-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faHandHoldingHeart} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-700">Jumlah Waqaf</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.waqaf.totalWaqaf}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-yellow-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faHandHoldingHeart} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-yellow-700">Sumbangan Waqaf</p>
                      <p className="text-2xl font-bold text-yellow-900">{formatCurrency(stats.waqaf.totalWaqafAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Status Cards */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Tempahan</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <p className="text-2xl font-bold text-yellow-600">{stats.bookings.pendingBookings}</p>
                    <p className="text-sm text-gray-600">Menunggu</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.bookings.confirmedBookings}</p>
                    <p className="text-sm text-gray-600">Disahkan</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.bookings.completedBookings}</p>
                    <p className="text-sm text-gray-600">Selesai</p>
                  </div>
                </div>
              </div>

              {/* Monthly Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Booking Monthly Chart */}
                {getMonthlyChartData(stats.bookings.monthlyData).length > 0 && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Tempahan Bulanan</h3>
                    <div className="space-y-3">
                      {getMonthlyChartData(stats.bookings.monthlyData).map((item) => (
                        <div key={item.month} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm">
                          <div>
                            <p className="font-medium text-gray-800">{item.monthName}</p>
                            <p className="text-sm text-gray-600">{item.count} tempahan</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{formatCurrency(item.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Waqaf Monthly Chart */}
                {getMonthlyChartData(stats.waqaf.monthlyData).length > 0 && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Waqaf Bulanan</h3>
                    <div className="space-y-3">
                      {getMonthlyChartData(stats.waqaf.monthlyData).map((item) => (
                        <div key={item.month} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm">
                          <div>
                            <p className="font-medium text-gray-800">{item.monthName}</p>
                            <p className="text-sm text-gray-600">{item.count} sumbangan</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600">{formatCurrency(item.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bookings Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Senarai Tempahan</h3>
                {stats.bookings.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarikh
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pengguna
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Plot
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Si Mati
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumlah
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.bookings.data.slice(0, 10).map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(booking.bookingDate).toLocaleDateString('ms-MY')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {booking.userName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {booking.plotInfo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {booking.deceasedName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                booking.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : booking.status === 'CONFIRMED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(booking.totalPrice || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {stats.bookings.data.length > 10 && (
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        Menunjukkan 10 rekod pertama sahaja. {stats.bookings.data.length - 10} lagi dalam laporan PDF.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tiada tempahan ditemui untuk tempoh yang dipilih.
                  </div>
                )}
              </div>

              {/* Waqaf Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Senarai Waqaf</h3>
                {stats.waqaf.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarikh
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Penderma
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumlah
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mesej
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.waqaf.data.slice(0, 10).map((waqaf) => (
                          <tr key={waqaf.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(waqaf.created_at).toLocaleDateString('ms-MY')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {waqaf.donor_name || 'Tanpa Nama'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {waqaf.donor_email || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                waqaf.payment_status === 'SUCCESSFUL'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {waqaf.payment_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(parseFloat(waqaf.amount))}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {waqaf.message || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {stats.waqaf.data.length > 10 && (
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        Menunjukkan 10 rekod pertama sahaja. {stats.waqaf.data.length - 10} lagi dalam laporan PDF.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tiada waqaf ditemui untuk tempoh yang dipilih.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 