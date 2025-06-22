'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner, faMapMarkerAlt, faCalendarAlt, faIdCard, faUser, faFilter, faEye, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Toaster, toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

// Helper function to format date (e.g., DD/MM/YYYY)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString; // Return original if formatting fails
  }
};

// Helper function to translate plot status
const translatePlotStatus = (status) => {
  switch (status) {
    case 'AVAILABLE':
      return 'Tersedia';
    case 'OCCUPIED':
      return 'Digunakan';
    case 'RESERVED':
      return 'Ditempah';
    default:
      return status || 'Tidak Diketahui';
  }
};

// Helper function to translate gender
const translateGender = (gender) => {
  switch (gender) {
    case 'LELAKI':
      return 'Lelaki';
    case 'WANITA':
      return 'Wanita';
    default:
      return gender || 'Tidak Diketahui';
  }
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'AVAILABLE':
      return 'text-green-600 bg-green-100';
    case 'OCCUPIED':
      return 'text-red-600 bg-red-100';
    case 'RESERVED':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Component that uses useSearchParams
function CarianPageContent() {
  const searchParams = useSearchParams();
  const [namaSiMati, setNamaSiMati] = useState('');
  const [noKP, setNoKP] = useState('');
  const [noPlot, setNoPlot] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedResult, setSelectedResult] = useState(null);

  // Initialize from URL params
  useEffect(() => {
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    
    if (q) {
      if (type === 'kodpusara') {
        setNoPlot(q);
        setSearchType('plot');
      } else {
        setNamaSiMati(q);
        setSearchType('simati');
      }
      // Auto-search when coming from homepage
      setTimeout(() => {
        handleSearch(null, true);
      }, 100);
    }
  }, [searchParams]);

  const handleSearch = async (e, skipPrevent = false) => {
    if (e && !skipPrevent) e.preventDefault();
    
    // Validation
    if (!namaSiMati.trim() && !noKP.trim() && !noPlot.trim()) {
      toast.error('Sila masukkan sekurang-kurangnya satu maklumat carian.');
      return;
    }

    setLoading(true);
    setResults([]);
    setHasSearched(true);
    setSelectedResult(null);

    const queryParams = new URLSearchParams();
    if (namaSiMati.trim()) queryParams.append('nama', namaSiMati.trim());
    if (noKP.trim()) queryParams.append('kp', noKP.trim());
    if (noPlot.trim()) queryParams.append('plot', noPlot.trim());
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (sortOrder) queryParams.append('sortOrder', sortOrder);

    try {
      const apiUrl = `/api/search-deceased?${queryParams.toString()}`; 
      console.log('[FRONTEND-DEBUG] Making request to:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('[FRONTEND-DEBUG] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Ralat semasa mendapatkan data carian.' }));
        console.log('[FRONTEND-DEBUG] Error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[FRONTEND-DEBUG] Response data received:', data);
      console.log('[FRONTEND-DEBUG] Data type:', typeof data, 'Is Array:', Array.isArray(data));
      console.log('[FRONTEND-DEBUG] Data length:', data?.length || 'no length property');
      
      if (data && data.length > 0) {
        console.log('[FRONTEND-DEBUG] First result sample:', data[0]);
        // Log what fields are actually present vs expected
        const expectedFields = ['nama', 'icNumber', 'gender'];
        const actualFields = Object.keys(data[0] || {});
        console.log('[FRONTEND-DEBUG] Expected fields:', expectedFields);
        console.log('[FRONTEND-DEBUG] Actual fields:', actualFields);
        console.log('[FRONTEND-DEBUG] Missing fields:', expectedFields.filter(f => !actualFields.includes(f)));
        console.log('[FRONTEND-DEBUG] Extra fields:', actualFields.filter(f => !expectedFields.includes(f)));
      }
      
      setResults(data);
      setTotalResults(data.length);
      
      if (data.length > 0) {
        toast.success(`Ditemui ${data.length} keputusan carian.`);
      } else {
        console.log('[FRONTEND-DEBUG] No results found');
      }
    } catch (err) {
      console.error('[FRONTEND-DEBUG] Search API error:', err);
      toast.error(err.message || 'Tidak dapat menyambung ke server. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setNamaSiMati('');
    setNoKP('');
    setNoPlot('');
    setResults([]);
    setHasSearched(false);
    setSelectedResult(null);
    setTotalResults(0);
  };

  const handleViewDetails = (result) => {
    setSelectedResult(result);
  };

  const handleCloseDetails = () => {
    setSelectedResult(null);
  };

  return (
    <section className="min-h-screen bg-blue-200 relative overflow-hidden py-16 px-4">
      <Toaster position="top-center" richColors />
      
      {/* Graveyard Background Image */}
      <img
        src="/kuburrrr.jpeg"
        alt="Picture of the graveyards"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-blue-200/70 z-10"></div>
      
      <div className="max-w-7xl mx-auto relative z-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4 bg-white/90 p-4 rounded-lg">
            Carian Maklumat Lot Kubur
          </h1>
          <p className="text-gray-700 bg-white/80 p-2 rounded-lg">
            Cari maklumat simati atau plot kubur dengan mudah
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Search Form */}
          <div className="lg:col-span-1 bg-white/95 p-6 rounded-lg shadow-lg backdrop-blur-sm h-fit">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-700">Cari Maklumat</h2>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-primary hover:text-primary-dark transition-colors"
              >
                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                {showAdvanced ? 'Mudah' : 'Lanjutan'}
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Search Type Selection */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-800">Jenis Carian</label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border text-sm text-gray-800">
                    <input
                      type="radio"
                      name="searchType"
                      value="simati"
                      checked={searchType === 'simati'}
                      onChange={() => setSearchType('simati')}
                      className="form-radio h-4 w-4 text-primary"
                    />
                    <FontAwesomeIcon icon={faUser} className="h-3 w-3 text-gray-600" />
                    Maklumat Simati
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border text-sm text-gray-800">
                    <input
                      type="radio"
                      name="searchType"
                      value="plot"
                      checked={searchType === 'plot'}
                      onChange={() => setSearchType('plot')}
                      className="form-radio h-4 w-4 text-primary"
                    />
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="h-3 w-3 text-gray-600" />
                    Kod Plot
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border text-sm text-gray-800">
                    <input
                      type="radio"
                      name="searchType"
                      value="all"
                      checked={searchType === 'all'}
                      onChange={() => setSearchType('all')}
                      className="form-radio h-4 w-4 text-primary"
                    />
                    Semua
                  </label>
                </div>
              </div>

              {/* Search Fields */}
              {(searchType === 'simati' || searchType === 'all') && (
                <>
                  <div>
                    <label htmlFor="namaSiMati" className="block text-sm font-medium text-gray-800 mb-1">
                      <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-600" />
                      Nama Si Mati
                    </label>
                    <input
                      type="text"
                      id="namaSiMati"
                      value={namaSiMati}
                      onChange={(e) => setNamaSiMati(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-black"
                      placeholder="Masukkan nama penuh"
                    />
                  </div>
                  <div>
                    <label htmlFor="noKP" className="block text-sm font-medium text-gray-800 mb-1">
                      <FontAwesomeIcon icon={faIdCard} className="mr-2 text-gray-600" />
                      No Kad Pengenalan
                    </label>
                    <input
                      type="text"
                      id="noKP"
                      value={noKP}
                      onChange={(e) => setNoKP(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-black"
                      placeholder="Contoh: 900101-10-1234"
                    />
                  </div>
                </>
              )}
              
              {(searchType === 'plot' || searchType === 'all') && (
                <div>
                  <label htmlFor="noPlot" className="block text-sm font-medium text-gray-800 mb-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-gray-600" />
                    Kod Plot
                  </label>
                  <input
                    type="text"
                    id="noPlot"
                    value={noPlot}
                    onChange={(e) => setNoPlot(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-black"
                    placeholder="Contoh: A1-5, B2-10"
                  />
                </div>
              )}

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  <h4 className="text-sm font-medium text-gray-800">Pilihan Susunan</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-black"
                    >
                      <option value="name">Nama</option>
                      <option value="dateOfDeath">Tarikh Meninggal</option>
                      <option value="plotIdentifier">Plot</option>
                    </select>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-black"
                    >
                      <option value="asc">A-Z / Lama-Baru</option>
                      <option value="desc">Z-A / Baru-Lama</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-light transition-colors flex items-center justify-center gap-2 font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faSearch} className="mr-2" />
                  )}
                  {loading ? 'Mencari...' : 'Cari'}
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
                >
                  Padam
                </button>
              </div>
            </form>
          </div>

          {/* Search Results */}
          <div className="lg:col-span-2 bg-white/95 p-6 rounded-lg shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-700">Hasil Carian</h2>
              {totalResults > 0 && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {totalResults} keputusan
                </span>
              )}
            </div>
            
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4" />
                <p className="text-lg">Mencari maklumat...</p>
              </div>
            )}
            
            {!loading && hasSearched && results.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FontAwesomeIcon icon={faSearch} size="3x" />
                </div>
                <p className="text-lg text-gray-600 mb-2">Tiada Maklumat Ditemui</p>
                <p className="text-gray-500">Sila cuba dengan maklumat carian yang berbeza.</p>
              </div>
            )}
            
            {!loading && !hasSearched && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FontAwesomeIcon icon={faSearch} size="3x" />
                </div>
                <p className="text-lg text-gray-600 mb-2">Sila Masukkan Maklumat Carian</p>
                <p className="text-gray-500">Gunakan borang di sebelah untuk mencari maklumat kubur.</p>
              </div>
            )}
            
            {!loading && results.length > 0 && (
              <div className="space-y-4">
                {results.map((result, index) => {
                  console.log(`[FRONTEND-DEBUG] Rendering result ${index + 1}:`, result);
                  console.log(`[FRONTEND-DEBUG] result.nama:`, result.nama);
                  console.log(`[FRONTEND-DEBUG] result.icNumber:`, result.icNumber);
                  console.log(`[FRONTEND-DEBUG] result.gender:`, result.gender);
                  
                  return (
                  <div key={result.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-primary mb-1">
                            <FontAwesomeIcon icon={faUser} className="mr-2" />
                            {result.nama || 'Tiada Nama'}
                          </h3>
                          {result.gender && (
                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {translateGender(result.gender)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleViewDetails(result)}
                          className="text-primary hover:text-primary-dark transition-colors"
                          title="Lihat Butiran"
                        >
                          <FontAwesomeIcon icon={faEye} size="lg" />
                        </button>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FontAwesomeIcon icon={faIdCard} className="mr-2 w-4" />
                          <span className="font-medium">No. K/P:</span>
                          <span className="ml-2">{result.icNumber || 'N/A'}</span>
                        </div>
                        {result.plotIdentifier && (
                          <div className="flex items-center text-sm text-gray-600">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 w-4" />
                            <span className="font-medium">No. Plot:</span>
                            <span className="ml-2 font-semibold text-primary">{result.plotIdentifier}</span>
                            {result.plotRow && result.plotColumn && (
                              <span className="ml-2 text-gray-500">
                                (Baris {result.plotRow}, Lajur {result.plotColumn})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-primary">Butiran Lengkap</h3>
                  <button
                    onClick={handleCloseDetails}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3">Maklumat Simati</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Nama Penuh</label>
                        <p className="text-gray-900">{selectedResult.nama || 'Tiada Nama'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">No. Kad Pengenalan</label>
                        <p className="text-gray-900">{selectedResult.icNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Jantina</label>
                        <p className="text-gray-900">{translateGender(selectedResult.gender)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedResult.plotIdentifier && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-3">Maklumat Plot Kubur</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">No. Plot</label>
                          <p className="text-gray-900 font-semibold text-primary">{selectedResult.plotIdentifier}</p>
                        </div>
                        {selectedResult.plotRow && selectedResult.plotColumn && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Baris</label>
                              <p className="text-gray-900">{selectedResult.plotRow}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Lajur</label>
                              <p className="text-gray-900">{selectedResult.plotColumn}</p>
                            </div>
                          </div>
                        )}
                        {selectedResult.plotStatus && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Status Plot</label>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedResult.plotStatus)}`}>
                              {translatePlotStatus(selectedResult.plotStatus)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Loading component for Suspense fallback
function CarianPageLoading() {
  return (
    <section className="min-h-screen bg-blue-200 relative overflow-hidden py-16 px-4">
      <img
        src="/kuburrrr.jpeg"
        alt="Picture of the graveyards"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="absolute inset-0 bg-blue-200/70 z-10"></div>
      
      <div className="max-w-7xl mx-auto relative z-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4 bg-white/90 p-4 rounded-lg inline-block">
            Carian Maklumat Lot Kubur
          </h1>
        </div>
        
        <div className="flex items-center justify-center py-20">
          <div className="bg-white/95 p-8 rounded-lg shadow-lg backdrop-blur-sm">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary mb-4" />
            <p className="text-lg text-gray-600">Memuatkan halaman carian...</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Main export with Suspense boundary
export default function CarianPage() {
  return (
    <Suspense fallback={<CarianPageLoading />}>
      <CarianPageContent />
    </Suspense>
  );
}