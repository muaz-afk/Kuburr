'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExport, faCalendarAlt, faChartBar, faBookmark } from '@fortawesome/free-solid-svg-icons';
import Loading from '@/components/Loading';
import { toast } from 'sonner';

export default function UserStatisticsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast.error('Sila log masuk untuk melihat statistik.');
        router.push('/auth/login');
        return;
      }
      setUser(user);
      fetchStats();
    };

    checkUser();
  }, [supabase, router, year, month]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ year: year.toString() });
      if (month) params.append('month', month);

      const response = await fetch(`/api/statistics/user?${params}`);
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
          type: 'user',
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

  const getMonthlyChartData = () => {
    if (!stats?.monthlyData) return [];
    
    return Object.entries(stats.monthlyData).map(([month, data]) => ({
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistik Tempahan</h1>
          <p className="mt-1 text-primary-light text-sm sm:text-base">Lihat ringkasan tempahan kubur anda</p>
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
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-blue-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faBookmark} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-700">Jumlah Tempahan</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalBookings}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-green-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faChartBar} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-700">Jumlah Pembayaran</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-yellow-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-yellow-700">Menunggu</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.pendingBookings}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="bg-purple-500 text-white rounded-full p-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-700">Selesai</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.completedBookings}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Chart */}
              {getMonthlyChartData().length > 0 && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Tempahan Bulanan</h3>
                  <div className="space-y-3">
                    {getMonthlyChartData().map((item) => (
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

              {/* Bookings Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Senarai Tempahan</h3>
                {stats.bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarikh
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
                        {stats.bookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(booking.bookingDate).toLocaleDateString('ms-MY')}
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
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tiada tempahan ditemui untuk tempoh yang dipilih.
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