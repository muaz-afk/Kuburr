'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Loading from '@/components/Loading';
import Modal from '@/components/Modal';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBox, 
  faPlus, 
  faMinus, 
  faHistory, 
  faArrowLeft,
  faSpinner,
  faRefresh
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

export default function AdminKitsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [kits, setKits] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [error, setError] = useState('');
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedKitForHistory, setSelectedKitForHistory] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedKitForAdjust, setSelectedKitForAdjust] = useState(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      if (profileError || !profiles || profiles.length !== 1) {
        toast.error('Gagal mengesahkan maklumat pengguna.');
        router.push('/');
        return false;
      }

      if (profiles[0].role !== 'ADMIN') {
        toast.error('Anda tidak mempunyai kebenaran untuk mengakses halaman ini.');
        router.push('/');
        return false;
      }
      return true;
    };

    const fetchKits = async () => {
      setIsLoading(true);
      setError('');
      try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/funeral-kits');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal memuatkan data kit');
        }

        const data = await response.json();
        setKits(data.kits || []);

      } catch (fetchError) {
        console.error('Error fetching kits:', fetchError);
        setError(fetchError.message);
        toast.error(`Gagal memuatkan data: ${fetchError.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKits();
  }, [supabase, router]);

  const fetchUsageHistory = async (kitId) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/funeral-kits/usage?kitId=${kitId}&limit=20`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memuatkan sejarah penggunaan');
      }

      const data = await response.json();
      setUsageHistory(data.usage || []);
    } catch (error) {
      console.error('Error fetching usage history:', error);
      toast.error(`Gagal memuatkan sejarah: ${error.message}`);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleShowHistory = async (kit) => {
    setSelectedKitForHistory(kit);
    setIsHistoryModalOpen(true);
    await fetchUsageHistory(kit.id);
  };

  const handleShowAdjustment = (kit) => {
    setSelectedKitForAdjust(kit);
    setAdjustmentQuantity(0);
    setAdjustmentNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedKitForAdjust || adjustmentQuantity === 0) {
      toast.error('Sila masukkan kuantiti yang sah');
      return;
    }

    setIsSubmitting(true);
    try {
      const reason = adjustmentQuantity > 0 ? 'ADMIN_ADD' : 'ADMIN_REMOVE';
      const response = await fetch('/api/funeral-kits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kitId: selectedKitForAdjust.id,
          quantityChange: adjustmentQuantity,
          reason: reason,
          notes: adjustmentNotes.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengemaskini kit');
      }

      const data = await response.json();
      toast.success(data.message);

      // Update local kit data
      setKits(prevKits => 
        prevKits.map(kit => 
          kit.id === selectedKitForAdjust.id 
            ? { ...kit, ...data.kit }
            : kit
        )
      );

      setIsAdjustModalOpen(false);
      setSelectedKitForAdjust(null);

    } catch (error) {
      console.error('Error adjusting kit quantity:', error);
      toast.error(`Gagal mengemaskini: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshKits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/funeral-kits');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memuatkan data kit');
      }

      const data = await response.json();
      setKits(data.kits || []);
      toast.success('Data kit dikemaskini');
    } catch (error) {
      console.error('Error refreshing kits:', error);
      toast.error(`Gagal menyegarkan data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-primary text-white p-6 sm:p-8 rounded-t-lg shadow mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Urus Kit Jenazah</h1>
            <p className="mt-1 text-primary-light text-sm sm:text-base">Pantau dan urus inventori kit jenazah.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshKits}
              disabled={isLoading}
              className="text-white hover:text-primary-light transition-colors disabled:opacity-50"
              title="Segarkan Data"
            >
              <FontAwesomeIcon icon={faRefresh} className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/admin" className="text-white hover:text-primary-light transition-colors">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Kembali ke Dashboard
            </Link>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow space-y-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p className="font-bold">Ralat</p>
              <p>{error}</p>
            </div>
          )}

          {/* Kit Inventory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {kits.map((kit) => (
              <div key={kit.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faBox} className="h-8 w-8 text-primary mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Kit Jenazah {kit.kitType === 'LELAKI' ? 'Lelaki' : 'Perempuan'}
                      </h3>
                      <p className="text-sm text-gray-600">ID: {kit.id}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-green-600">{kit.availableQuantity}</div>
                    <div className="text-sm text-gray-600">Tersedia</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-blue-600">{kit.totalUsed}</div>
                    <div className="text-sm text-gray-600">Digunakan</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleShowAdjustment(kit)}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded hover:bg-primary-light transition-colors text-sm font-medium"
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Laras Kuantiti
                  </button>
                  <button
                    onClick={() => handleShowHistory(kit)}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    <FontAwesomeIcon icon={faHistory} className="mr-1" />
                    Sejarah
                  </button>
                </div>
              </div>
            ))}
          </div>

          {kits.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faBox} className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600">Tiada data kit jenazah ditemui.</p>
            </div>
          )}
        </div>

        {/* Kit Adjustment Modal */}
        <Modal 
          isOpen={isAdjustModalOpen} 
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Laras Kuantiti Kit ${selectedKitForAdjust?.kitType === 'LELAKI' ? 'Lelaki' : 'Perempuan'}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perubahan Kuantiti
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentQuantity(prev => prev - 1)}
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                  disabled={isSubmitting}
                  className="flex-1 text-center border border-gray-300 rounded px-3 py-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => setAdjustmentQuantity(prev => prev + 1)}
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Positif untuk tambah, negatif untuk tolak
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nota (Pilihan)
              </label>
              <textarea
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
                placeholder="Sebab perubahan kuantiti..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitAdjustment}
                disabled={isSubmitting || adjustmentQuantity === 0}
                className="flex-1 bg-primary text-white px-4 py-2 rounded hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                ) : null}
                Kemaskini
              </button>
            </div>
          </div>
        </Modal>

        {/* Usage History Modal */}
        <Modal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)}
          title={`Sejarah Kit ${selectedKitForHistory?.kitType === 'LELAKI' ? 'Lelaki' : 'Perempuan'}`}
        >
          <div className="space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} spin className="h-6 w-6 text-primary mr-2" />
                <span>Memuatkan sejarah...</span>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {usageHistory.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">Tiada sejarah penggunaan.</p>
                ) : (
                  <div className="space-y-3">
                    {usageHistory.map((usage) => (
                      <div key={usage.id} className="border border-gray-200 rounded p-3 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-medium ${
                            usage.quantityChange > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {usage.quantityChange > 0 ? '+' : ''}{usage.quantityChange} unit
                          </span>
                          <span className="text-gray-500 text-xs">
                            {formatDate(usage.createdAt)}
                          </span>
                        </div>
                        <div className="text-gray-700">
                          <strong>Sebab:</strong> {usage.reason}
                        </div>
                        {usage.notes && (
                          <div className="text-gray-600 mt-1">
                            <strong>Nota:</strong> {usage.notes}
                          </div>
                        )}
                        {usage.booking && (
                          <div className="text-gray-600 mt-1">
                            <strong>Tempahan:</strong> {usage.booking.deceased?.name || 'N/A'}
                          </div>
                        )}
                        <div className="text-gray-500 text-xs mt-1">
                          Oleh: {usage.changedByUser?.name || usage.changedByUser?.email || (usage.changedBy ? 'N/A' : 'System')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}