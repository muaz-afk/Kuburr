'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useBookingContext } from '@/context/BookingContext'; // Import context hook
import { createClient } from '@/lib/supabase/client'; // Import Supabase client
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser, faUserTie } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import Loading from '@/components/Loading';
import { v4 as uuidv4 } from 'uuid';


// Constants for plot status mapping
const PLOT_STATUS_MAP = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'occupied', // Treat RESERVED same as OCCUPIED visually for now
  SELECTED: 'selected', // Local state for UI selection
};

// Determine Grid Size (Example: Assume max row/col + 1 from fetched data, or use a fixed size)
const MAX_GRID_ROWS = 8; // Example based on seeding
const MAX_GRID_COLS = 8; // Example based on seeding

export default function BookingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { bookingData, updateBookingData, resetBookingData, updateStaffSelection } = useBookingContext();

  // --- State --- 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [packages, setPackages] = useState([]);
  const [plots, setPlots] = useState([]);
  const [grid, setGrid] = useState([]);
  const [availableStaff, setAvailableStaff] = useState({
    PENGALI_KUBUR: [],
    PEMANDI_JENAZAH: []
  });
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [kitInventory, setKitInventory] = useState([]);

  // Selections (Initialize from context)
  const [selectedPackages, setSelectedPackages] = useState(bookingData.selectedPackages || []);
  const [selectedDate, setSelectedDate] = useState(bookingData.selectedDate || new Date());
  const [selectedTime, setSelectedTime] = useState(bookingData.selectedTime || '11:00');
  const [selectedPlotData, setSelectedPlotData] = useState(bookingData.selectedPlotData || null);
  const [selectedFuneralKits, setSelectedFuneralKits] = useState(bookingData.selectedFuneralKits || []);
  const [totalPrice, setTotalPrice] = useState(bookingData.totalPrice || 0);


  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sila log masuk untuk membuat tempahan.');
        router.push('/auth/login');
        return;
      }
    };
    checkAuth();
  }, [supabase, router]);

  // Fetch available staff when date/time changes
  const fetchAvailableStaff = useCallback(async (bookingDateTime) => {
    if (!bookingDateTime) return;
    
    setIsLoadingStaff(true);
    try {
      const response = await fetch(`/api/staff/available?date=${bookingDateTime.toISOString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mendapatkan data kakitangan');
      }
      
      const data = await response.json();
      setAvailableStaff(data.staffByType || { PENGALI_KUBUR: [], PEMANDI_JENAZAH: [] });
      
      // Clear current selections if selected staff are no longer available
      const { selectedStaff } = bookingData;
      let needsUpdate = false;
      const newSelectedStaff = { ...selectedStaff };
      
      Object.keys(selectedStaff).forEach(staffType => {
        if (selectedStaff[staffType]) {
          const isStillAvailable = data.staffByType[staffType]?.some(s => s.id === selectedStaff[staffType].id);
          if (!isStillAvailable) {
            newSelectedStaff[staffType] = null;
            needsUpdate = true;
          }
        }
      });

      // Auto-select "Tidak Perlu" for PEMANDI_JENAZAH if no staff is currently selected
      if (!selectedStaff.PEMANDI_JENAZAH && data.staffByType.PEMANDI_JENAZAH) {
        const tidakPerluOption = data.staffByType.PEMANDI_JENAZAH.find(s => s.id === 'not-needed-pemandi');
        if (tidakPerluOption) {
          newSelectedStaff.PEMANDI_JENAZAH = tidakPerluOption;
          needsUpdate = true;
        }
      }

      // Auto-select "Tidak Perlu" for PENGALI_KUBUR if no staff is currently selected
      if (!selectedStaff.PENGALI_KUBUR && data.staffByType.PENGALI_KUBUR) {
        const tidakPerluOption = data.staffByType.PENGALI_KUBUR.find(s => s.id === 'not-needed-penggali');
        if (tidakPerluOption) {
          newSelectedStaff.PENGALI_KUBUR = tidakPerluOption;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        if (selectedStaff.PENGALI_KUBUR || selectedStaff.PEMANDI_JENAZAH) {
          toast.warning('Beberapa kakitangan yang dipilih tidak lagi tersedia untuk tarikh ini.');
        }
        updateBookingData({ selectedStaff: newSelectedStaff });
      }
      
    } catch (err) {
      console.error('Error fetching available staff:', err);
      toast.error(err.message || 'Gagal mendapatkan data kakitangan');
      setAvailableStaff({ PENGALI_KUBUR: [], PEMANDI_JENAZAH: [] });
    } finally {
      setIsLoadingStaff(false);
    }
  }, [bookingData, updateBookingData]);

  // Data Processing Functions
  const processPlotsIntoGrid = useCallback((fetchedPlots, currentSelection) => {
     // Initialize an empty grid based on max dimensions
    const newGrid = Array(MAX_GRID_ROWS).fill(null).map(() => 
        Array(MAX_GRID_COLS).fill(null) // Fill with null initially
    );

    // Populate the grid with fetched plot data
    fetchedPlots.forEach(plot => {
      if (plot.row >= 0 && plot.row < MAX_GRID_ROWS && plot.column >= 0 && plot.column < MAX_GRID_COLS) {
          newGrid[plot.row][plot.column] = { 
              ...plot, 
              // Map DB status to UI status
              uiStatus: PLOT_STATUS_MAP[plot.status] || PLOT_STATUS_MAP.OCCUPIED 
          };
      }
    });

    // If there's a current selection from context, mark it on the new grid
    if (currentSelection && currentSelection.id) {
        const selected = fetchedPlots.find(p => p.id === currentSelection.id);
        // Ensure the selected plot exists, is within bounds, and is available
        if (selected && 
            selected.row >= 0 && selected.row < MAX_GRID_ROWS && 
            selected.column >= 0 && selected.column < MAX_GRID_COLS && 
            selected.status === 'AVAILABLE') {
            newGrid[selected.row][selected.column].uiStatus = PLOT_STATUS_MAP.SELECTED;
        } else if (selected && selected.status !== 'AVAILABLE') {
            // If previously selected plot is no longer available, clear the selection
            setSelectedPlotData(null);
        }
    }

    setGrid(newGrid);
  }, []);

  const calculateAndUpdateTotal = useCallback((currentSelectedPackages, allPackages) => {
    const total = currentSelectedPackages.reduce((sum, packageId) => {
      const pkg = allPackages.find(p => p.id === packageId);
      return sum + (pkg ? pkg.price : 0);
    }, 0);
    setTotalPrice(total);
  }, []);

  // Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Check if we have the required data from previous step
        if (!bookingData.deceasedName || !bookingData.deceasedIC || !bookingData.deceasedGender) {
          router.push('/booking/register');
          return;
        }

        // Fetch data in parallel
        const [packageResponse, plotResponse, kitResponse] = await Promise.all([
          supabase
            .from('Package')
            .select('id, label, price, description')
            .order('price', { ascending: true }),
          supabase
            .from('Plot')
            .select('id, row, column, plotIdentifier, status')
            .order('row', { ascending: true })
            .order('column', { ascending: true }),
          fetch('/api/funeral-kits') // Fetch kit inventory
        ]);

        if (packageResponse.error) throw new Error(`Gagal memuatkan pakej: ${packageResponse.error.message}`);
        if (plotResponse.error) throw new Error(`Gagal memuatkan plot: ${plotResponse.error.message}`);
        
        const fetchedPackages = packageResponse.data || [];
        const fetchedPlots = plotResponse.data || [];
        
        console.log('[BookingPage] Packages fetched:', fetchedPackages);
        console.log('[BookingPage] Total packages count:', fetchedPackages.length);
        console.log('[BookingPage] Package labels:', fetchedPackages.map(p => ({ id: p.id, label: p.label })));
        
        setPackages(fetchedPackages);
        setPlots(fetchedPlots);

        // Process kit inventory
        if (!kitResponse.ok) {
          const kitErrorData = await kitResponse.json();
          console.warn(`Gagal memuatkan inventori kit: ${kitErrorData.error || kitResponse.statusText}`);
          console.error('[BookingPage] Kit API error:', kitErrorData);
          setKitInventory([]); // Set to empty array on error
        } else {
          const kitData = await kitResponse.json();
          console.log('[BookingPage] Kit API response:', kitData);
          console.log('[BookingPage] Kit inventory received:', kitData.kits);
          setKitInventory(kitData.kits || []);
        }

        // Process fetched data into grid structure
        processPlotsIntoGrid(fetchedPlots, bookingData.selectedPlotData);

        // Recalculate price initially
        calculateAndUpdateTotal(bookingData.selectedPackages || [], fetchedPackages);

      } catch (fetchError) {
        console.error('[BookingPage] Error fetching data:', fetchError);
        setError(fetchError.message);
        toast.error('Gagal memuatkan data. Sila cuba lagi.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, bookingData.deceasedName, bookingData.deceasedIC, bookingData.deceasedGender, router, processPlotsIntoGrid, calculateAndUpdateTotal]);

  // Fetch staff when date/time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const bookingDateTime = new Date(selectedDate);
      const [hour, minute] = selectedTime.split(':').map(Number);
      bookingDateTime.setHours(hour, minute, 0, 0);
      fetchAvailableStaff(bookingDateTime);
    }
  }, [selectedDate, selectedTime, fetchAvailableStaff]);

  // Update context when selections change
  useEffect(() => {
    if (!isLoading) {
      updateBookingData({
        selectedPackages,
        selectedPlotData,
        selectedDate,
        selectedTime,
        selectedFuneralKits,
        totalPrice
      });
    }
  }, [selectedPackages, selectedPlotData, selectedDate, selectedTime, selectedFuneralKits, totalPrice, isLoading]);

  // --- Handlers --- 
  const handlePlotSelect = (plotData) => {
    if (!plotData || plotData.status !== 'AVAILABLE') return;

    // Create a new grid reflecting the change
    const newGrid = grid.map((row, rIdx) => 
      row.map((cell, cIdx) => {
        if (!cell) return null; // Skip empty cells
        
        // Deselect previously selected plot
        if (selectedPlotData && cell.id === selectedPlotData.id) {
          return { ...cell, uiStatus: PLOT_STATUS_MAP.AVAILABLE };
        }
        
        // Select the new plot
        if (cell.id === plotData.id) {
          return { ...cell, uiStatus: PLOT_STATUS_MAP.SELECTED };
        }
        
        return cell;
      })
    );
    
    setGrid(newGrid);
    setSelectedPlotData(plotData);
  };
  
  const handlePackageToggle = (packageId, isKitPackage = false, kitType = null) => {
    const newSelectedPackages = selectedPackages.includes(packageId)
      ? selectedPackages.filter(id => id !== packageId)
      : [...selectedPackages, packageId];
    setSelectedPackages(newSelectedPackages);
    calculateAndUpdateTotal(newSelectedPackages, packages);

    if (isKitPackage && kitType) {
      let newSelectedKits = [...selectedFuneralKits];
      const kitIndex = newSelectedKits.findIndex(k => k.kitType === kitType);

      if (newSelectedPackages.includes(packageId)) { // Package was selected
        if (kitIndex === -1) {
          newSelectedKits.push({ kitType, quantity: 1 });
        } else {
          // Potentially allow multiple quantities in future, for now, it's 1 or 0
          newSelectedKits[kitIndex].quantity = 1;
        }
      } else { // Package was deselected
        if (kitIndex !== -1) {
          newSelectedKits.splice(kitIndex, 1);
        }
      }
      setSelectedFuneralKits(newSelectedKits);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleTimeChange = (e) => {
    setSelectedTime(e.target.value);
  };

  const handleStaffSelect = (staffType, staff) => {
    updateStaffSelection(staffType, staff);
  };

  const handleSubmitBooking = () => {
    setError('');

    // --- Validation --- 
    if (!selectedPlotData?.id) {
      setError("Sila pilih plot kubur yang sah.");
      toast.error("Sila pilih plot kubur yang sah.");
      return;
    }
    
    if (selectedPlotData.status !== 'AVAILABLE') {
      setError("Plot yang dipilih tidak lagi tersedia. Sila pilih plot lain.");
      toast.error("Plot yang dipilih tidak lagi tersedia. Sila pilih plot lain.");
      return;
    }
    
    if (!selectedDate || !selectedTime) {
      setError("Sila pilih tarikh dan masa pengebumian.");
      toast.error("Sila pilih tarikh dan masa pengebumian.");
      return;
    }

    // Validate mandatory staff selection
    if (!bookingData.selectedStaff.PENGALI_KUBUR) {
      setError("Sila pilih Pengali Kubur.");
      toast.error("Sila pilih Pengali Kubur.");
      return;
    }

    if (!bookingData.selectedStaff.PEMANDI_JENAZAH) {
      setError("Sila pilih Pemandi Jenazah.");
      toast.error("Sila pilih Pemandi Jenazah.");
      return;
    }
    
    if (!bookingData.deceasedName || !bookingData.deceasedIC || !bookingData.deceasedGender) {
      setError("Maklumat si mati tidak lengkap. Sila kembali ke langkah sebelumnya.");
      toast.error("Maklumat si mati tidak lengkap. Sila kembali ke langkah sebelumnya.");
      return;
    }

    // Submit booking directly (no payment modal)
    handleSubmitBookingOnly();
  };

  const handleSubmitBookingOnly = async () => {
    setError('');
    setIsSubmitting(true);

    // Initialize loading toast reference
    let loadingToast;

    // --- Database Operations --- 
    try {
      // Show loading toast
      loadingToast = toast.loading('Sedang memproses tempahan...');
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Pengguna tidak dikenalpasti. Sila log masuk semula.");
      }

      // ---- Upload Death Certificate (if available) ----
      let deathCertificateUrl = null;
      if (bookingData.deathCertificateFile) {
        try {
          const timestamp = Date.now();
          const filePath = `death_certificates/${user.id}/${timestamp}-${bookingData.deathCertificateFile.name}`;
          
          console.log(`Uploading death certificate to bucket 'profiles', path: ${filePath}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, bookingData.deathCertificateFile, {
              cacheControl: '3600',
              upsert: true, // Overwrite if necessary
            });

          if (uploadError) {
            console.error("Death certificate upload error:", uploadError);
            throw new Error(`Gagal memuat naik sijil kematian: ${uploadError.message}`);
          }

          console.log("Death certificate upload successful:", uploadData);

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('profiles')
            .getPublicUrl(uploadData.path);

          if (!urlData || !urlData.publicUrl) {
            console.warn("Could not get public URL for death certificate:", uploadData.path);
            throw new Error("Gagal mendapatkan URL sijil kematian selepas muat naik.");
          }

          deathCertificateUrl = urlData.publicUrl;
          console.log("Death certificate public URL obtained:", deathCertificateUrl);

          // Update context with the URL
          updateBookingData({ deathCertificateFileUrl: deathCertificateUrl });

        } catch (uploadCatchError) {
          console.error("Death certificate upload process error:", uploadCatchError);
          throw new Error(uploadCatchError.message || "Ralat semasa proses muat naik sijil kematian.");
        }
      }

      // ---- Upload Permit Perkuburan (if available) ----
      let permitUrl = null;
      if (bookingData.permitFile) {
        try {
          const timestamp = Date.now();
          const filePath = `burial_permits/${user.id}/${timestamp}-${bookingData.permitFile.name}`;
          
          console.log(`Uploading burial permit to bucket 'profiles', path: ${filePath}`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, bookingData.permitFile, {
              cacheControl: '3600',
              upsert: true, // Overwrite if necessary
            });

          if (uploadError) {
            console.error("Burial permit upload error:", uploadError);
            throw new Error(`Gagal memuat naik permit perkuburan: ${uploadError.message}`);
          }

          console.log("Burial permit upload successful:", uploadData);

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('profiles')
            .getPublicUrl(uploadData.path);

          if (!urlData || !urlData.publicUrl) {
            console.warn("Could not get public URL for burial permit:", uploadData.path);
            throw new Error("Gagal mendapatkan URL permit perkuburan selepas muat naik.");
          }

          permitUrl = urlData.publicUrl;
          console.log("Burial permit public URL obtained:", permitUrl);

          // Update context with the URL
          updateBookingData({ permitFileUrl: permitUrl });

        } catch (uploadCatchError) {
          console.error("Burial permit upload process error:", uploadCatchError);
          throw new Error(uploadCatchError.message || "Ralat semasa proses muat naik permit perkuburan.");
        }
      }
      
      // Use the selected plot ID
      const plotId = selectedPlotData.id;

      // Check plot status again before proceeding
      const { data: currentPlotStatusData, error: plotCheckError } = await supabase
        .from('Plot')
        .select('status')
        .eq('id', plotId)
        .single();

      if (plotCheckError) {
        throw new Error("Gagal mengesahkan status plot.");
      }
      
      if (!currentPlotStatusData || currentPlotStatusData.status !== 'AVAILABLE') {
        throw new Error("Plot ini telah ditempah semasa anda membuat pilihan. Sila pilih plot lain.");
      }
      
      // Begin transaction-like operations
      const now = new Date().toISOString();
      
      // ---- Create Deceased Record ----
      const { data: deceasedData, error: deceasedError } = await supabase
        .from('Deceased')
        .insert({
          name: bookingData.deceasedName,
          icNumber: bookingData.deceasedIC,
          gender: bookingData.deceasedGender,
          plotId: plotId,
          createdAt: now,
          updatedAt: now
        })
        .select('id') 
        .single();

      if (deceasedError) {
        if (deceasedError.code === '23505') { 
          throw new Error(`Gagal menyimpan maklumat si mati: No. K/P (${bookingData.deceasedIC}) telah wujud.`);
        } else {
          throw new Error(`Gagal menyimpan maklumat si mati: ${deceasedError.message}`);
        }
      }
      
      const deceasedId = deceasedData.id;

      // ---- Create Booking Record ----
      const bookingDateTime = new Date(selectedDate);
      const [hour, minute] = selectedTime.split(':').map(Number);
      bookingDateTime.setHours(hour, minute, 0, 0);
      
      const bookingId = uuidv4();
      const { data: bookingRecord, error: bookingError } = await supabase
        .from('Booking')
        .insert({
          id: bookingId,
          userId: user.id,
          plotId: plotId,
          deceasedId: deceasedId,
          bookingDate: bookingDateTime.toISOString(),
          totalPrice: totalPrice,
          status: 'PENDING',
          death_certificate_url: deathCertificateUrl,
          burial_permit_url: permitUrl,
          createdAt: now,
          updatedAt: now
        })
        .select('id')
        .single();
      
      if (bookingError) {
        throw new Error(`Gagal mencipta tempahan: ${bookingError.message}`);
      }

      // ---- Create BookingPackage Records ----
      if (selectedPackages.length > 0) {
        const bookingPackagesData = selectedPackages.map(packageId => ({ 
          bookingId: bookingId, 
          packageId: packageId 
        }));
        
        const { error: bpError } = await supabase
          .from('BookingPackage')
          .insert(bookingPackagesData);
          
        if (bpError) {
          console.warn(`Issue saving package links: ${bpError.message}`);
          toast.warning(`Amaran: Terdapat isu menyimpan maklumat pakej.`);
        }
      }

      // ---- Assign Staff to Booking ----
      if (bookingData.staffAssignments && bookingData.staffAssignments.length > 0) {
        try {
          const staffResponse = await fetch('/api/booking-staff', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingId: bookingId,
              staffAssignments: bookingData.staffAssignments
            }),
          });

          if (!staffResponse.ok) {
            const staffErrorData = await staffResponse.json();
            throw new Error(staffErrorData.error || 'Gagal menugaskan kakitangan');
          }

          console.log('Staff assignments created successfully');
        } catch (staffError) {
          console.error('Error assigning staff:', staffError);
          toast.warning(`Amaran: ${staffError.message || 'Gagal menugaskan kakitangan'}`);
        }
      }

      // ---- Reserve Funeral Kits ----
      if (selectedFuneralKits && selectedFuneralKits.length > 0) {
        try {
          const kitResponse = await fetch('/api/booking-kits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingId: bookingId,
              selectedKits: selectedFuneralKits
            }),
          });

          if (!kitResponse.ok) {
            const kitErrorData = await kitResponse.json();
            throw new Error(kitErrorData.error || 'Gagal menempah kit jenazah');
          }

          console.log('Funeral kits reserved successfully');
        } catch (kitError) {
          console.error('Error reserving funeral kits:', kitError);
          toast.warning(`Amaran: ${kitError.message || 'Gagal menempah kit jenazah'}`);
        }
      }
      
      // ---- Update Plot Status to RESERVED (not OCCUPIED until completed) ----
      const { error: plotUpdateError } = await supabase
        .from('Plot')
        .update({ 
          status: 'RESERVED',
          bookingId: bookingId
        })
        .eq('id', plotId)
        .eq('status', 'AVAILABLE');

      if (plotUpdateError) {
        console.error(`Failed to update plot status: ${plotUpdateError.message}`);
        toast.warning("Amaran: Gagal mengemaskini status plot. Sila hubungi pentadbir.");
      }
      
      // Reset context after successful submission
      resetBookingData(); 
      
      // Success notification
      toast.success('Tempahan berjaya dihantar! Sila tunggu kelulusan daripada admin sebelum membuat pembayaran.', { id: loadingToast });
      
      // Redirect to user booking history page to see status
      router.push('/profile/bookings'); 
      
    } catch (error) {
      console.error('[BookingPage] Submission error:', error);
      const errorMessage = error.message || 'Ralat tidak dijangka semasa memproses tempahan.';
      setError(errorMessage);
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlotStyle = (uiStatus) => {
    const baseStyle = 'w-8 h-8 sm:w-10 sm:h-10 text-xs font-medium rounded flex items-center justify-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary';

    if (uiStatus === null) {
      // Empty cell
      return `${baseStyle} bg-transparent cursor-default`;
    }

    switch (uiStatus) {
      case PLOT_STATUS_MAP.AVAILABLE:
        return `${baseStyle} bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 cursor-pointer`;
      case PLOT_STATUS_MAP.OCCUPIED:
        return `${baseStyle} bg-red-100 border border-red-300 text-red-800 cursor-not-allowed`;
      case PLOT_STATUS_MAP.SELECTED:
        return `${baseStyle} bg-green-600 border border-green-700 text-white cursor-pointer`;
      default:
        return `${baseStyle} bg-gray-200 border border-gray-400 text-gray-600 cursor-not-allowed`;
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */} 
            <div className="bg-primary text-white p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Buat Tempahan Kubur</h1>
              <p className="mt-1 text-primary-light text-sm sm:text-base">Sahkan maklumat dan pilih pakej serta plot.</p>
            </div>

            <div className="p-6 sm:p-8 space-y-8">

              {/* Display Context Data */}
               <section>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Ringkasan Maklumat</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-700">
                      <div>
                          <span className="font-medium text-gray-500 block">Pemohon / Waris:</span>
                          <span className="font-semibold text-gray-900">{bookingData.applicantName || '-'}</span>
                      </div>
                      <div>
                          <span className="font-medium text-gray-500 block">No. Telefon Pemohon:</span>
                          <span className="font-semibold text-gray-900">{bookingData.applicantPhone || '-'}</span>
                      </div>
                      <div>
                          <span className="font-medium text-gray-500 block">Nama Si Mati:</span>
                          <span className="font-semibold text-gray-900">{bookingData.deceasedName || '-'}</span>
                      </div>
                       <div>
                          <span className="font-medium text-gray-500 block">No. K/P Si Mati:</span>
                          <span className="font-semibold text-gray-900">{bookingData.deceasedIC || '-'}</span>
                      </div>
                       <div>
                          <span className="font-medium text-gray-500 block">Jantina Si Mati:</span>
                          <span className="font-semibold text-gray-900">{bookingData.deceasedGender || '-'}</span>
                      </div>
                       {bookingData.permitFileUrl && (
                             <div>
                                 <span className="font-medium text-gray-500 block">Fail Permit:</span>
                                 <a href={bookingData.permitFileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                                     Lihat Fail
                                 </a>
                             </div>
                        )}
                       {bookingData.deathCertificateFileUrl && (
                             <div>
                                 <span className="font-medium text-gray-500 block">Sijil Kematian:</span>
                                 <a href={bookingData.deathCertificateFileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                                     Lihat Fail
                                 </a>
                             </div>
                        )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push('/booking/register')}
                      className="text-primary hover:text-primary-dark text-sm font-medium hover:underline focus:outline-none"
                    >
                      Kemaskini Maklumat
                    </button>
                  </div>
               </section>

              {/* Package Selection */}
              <section>
                 <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilihan Pakej Pengurusan</h2>
                  {packages.length === 0 && !isLoading && (
                    <p className="text-sm text-gray-500">Tiada pakej tersedia buat masa ini.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {packages.map((pkg) => {
                      let isKitPackage = false;
                      let kitType = null;
                      let kitInfo = null;

                      if (pkg.label.toLowerCase().includes('kit jenazah lelaki')) {
                        isKitPackage = true;
                        kitType = 'LELAKI';
                        kitInfo = kitInventory.find(k => k.kitType === 'LELAKI');
                        console.log('[BookingPage] Male kit package found:', { pkg, kitInfo, kitInventory });
                      } else if (pkg.label.toLowerCase().includes('kit jenazah perempuan') || pkg.label.toLowerCase().includes('kit jenazah wanita')) {
                        isKitPackage = true;
                        kitType = 'PEREMPUAN';
                        kitInfo = kitInventory.find(k => k.kitType === 'PEREMPUAN');
                        console.log('[BookingPage] Female kit package found:', { pkg, kitInfo, kitInventory });
                      }

                      if (isKitPackage) {
                        console.log(`[BookingPage] Processing kit package:`, {
                          packageLabel: pkg.label,
                          kitType,
                          kitInfo,
                          kitInventoryLength: kitInventory.length
                        });
                      }

                      const isKitAvailable = kitInfo ? kitInfo.availableQuantity > 0 : !isKitPackage;
                      // Disable if submitting, or if it's a kit package that's out of stock AND not already selected
                      const isDisabled = isSubmitting || (isKitPackage && !isKitAvailable && !selectedPackages.includes(pkg.id));

                      return (
                        <label
                          key={pkg.id}
                          className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors duration-150 ${
                            isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'hover:bg-gray-50 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary'
                          } ${selectedPackages.includes(pkg.id) ? 'bg-primary/10 border-primary' : 'border-gray-300'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPackages.includes(pkg.id)}
                            onChange={() => handlePackageToggle(pkg.id, isKitPackage, kitType)}
                            disabled={isDisabled}
                            className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-800 block">{pkg.label}</span>
                            <span className="text-sm text-gray-500">RM {pkg.price.toFixed(2)}</span>
                            {pkg.description && <p className="text-xs text-gray-500 mt-1">{pkg.description}</p>}
                            {isKitPackage && kitInfo && (
                              <div className="mt-2 text-xs">
                                <span className={`font-semibold ${isKitAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                  Tersedia: {kitInfo.availableQuantity}
                                </span>
                                {!isKitAvailable && !selectedPackages.includes(pkg.id) && (
                                  <span className="ml-2 text-red-600">(Habis Stok)</span>
                                )}
                              </div>
                            )}
                             {isKitPackage && !kitInfo && kitInventory.length > 0 && ( // Show if kit info not found but inventory was fetched
                                <div className="mt-2 text-xs text-yellow-600">
                                  Maklumat stok kit tidak dijumpai.
                                </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
              </section>

              {/* Plot Selection */}
              <section>
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilihan Lot Kubur</h2>
                      {grid.length === 0 && !isLoading && (
                         <p className="text-sm text-gray-500">Tiada plot tersedia atau gagal dimuatkan.</p>
                      )}
                      <div className="border border-gray-200 p-4 rounded-lg overflow-x-auto relative">
                        {/* Cemetery Background Image */}
                        <img
                        src="/kubor.jpeg"
                        alt="Cemetery aerial view"
                        className="absolute inset-0 w-full h-full object-cover rounded-lg" 
                        />
                        <div className="grid grid-cols-8 gap-1 sm:gap-2 min-w-[320px] sm:min-w-[400px] md:min-w-[480px] relative z-10">
                        {grid.map((row, rowIndex) => (
                          row.map((plotCell, colIndex) => {
                        // Render a placeholder or the actual plot button
                        if (!plotCell) {
                          return <div key={`empty-${rowIndex}-${colIndex}`} className={getPlotStyle(null)}></div>;
                        }
                        
                        const isOccupied = plotCell.uiStatus === PLOT_STATUS_MAP.OCCUPIED;
                        const plotLabel = !isOccupied ? plotCell.plotIdentifier : 'X';
                        
                        return (
                          <button
                            key={plotCell.id}
                            className={getPlotStyle(plotCell.uiStatus)}
                            onClick={() => handlePlotSelect(plotCell)}
                            disabled={isOccupied || isSubmitting}
                            aria-label={`Plot ${plotCell.plotIdentifier} ${plotCell.status}`}
                          >
                            {plotLabel}
                          </button>
                        );
                      })
                    ))}
                  </div>
                  <div className="flex justify-center space-x-4 mt-4 text-xs text-gray-600">
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-white border border-gray-300 mr-1.5"></span>Tersedia</div>
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-1.5"></span>Ditempah</div>
                      <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-600 border border-green-700 mr-1.5"></span>Dipilih</div>
                  </div>
                </div>
                {selectedPlotData && (
                  <p className="mt-3 text-sm text-center text-gray-700">
                    Plot Dipilih: <span className="font-semibold text-primary">{selectedPlotData.plotIdentifier}</span>
                  </p>
                )}
              </section>

              {/* Date and Time Selection */}
              <section>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Tarikh dan Masa Pengkebumian</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label htmlFor="booking-date" className="block text-sm font-medium text-gray-600 mb-1">Tarikh</label>
                     <DatePicker
                       id="booking-date"
                       selected={selectedDate}
                       onChange={handleDateChange}
                       dateFormat="dd/MM/yyyy"
                       minDate={new Date()} // Prevent selecting past dates
                       disabled={isSubmitting}
                       className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800 shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                       wrapperClassName="w-full" 
                     />
                   </div>
                   <div>
                     <label htmlFor="booking-time" className="block text-sm font-medium text-gray-600 mb-1">Masa</label>
                     <select
                       id="booking-time"
                       value={selectedTime}
                       onChange={handleTimeChange}
                       disabled={isSubmitting}
                       className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800 shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                     >
                       <option value="09:00">09:00</option>
                       <option value="10:00">10:00</option>
                       <option value="11:00">11:00</option>
                       <option value="14:00">14:00</option>
                       <option value="15:00">15:00</option>
                       <option value="16:00">16:00</option>
                     </select>
                   </div>
                 </div>
              </section>

              {/* Staff Selection */}
              <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilihan Kakitangan <span className="text-red-500">*</span></h2>
                <p className="text-sm text-gray-600 mb-4">Sila pilih kakitangan untuk perkhidmatan pengebumian.</p>
                
                {isLoadingStaff ? (
                  <div className="flex items-center justify-center py-8">
                    <FontAwesomeIcon icon={faSpinner} spin className="h-6 w-6 text-primary mr-2" />
                    <span className="text-gray-600">Sedang memuatkan kakitangan tersedia...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pengali Kubur Selection */}
                    <div>
                      <div className="flex items-center mb-3">
                        <FontAwesomeIcon icon={faUserTie} className="h-5 w-5 text-primary mr-2" />
                        <h3 className="text-md font-medium text-gray-800">Pengali Kubur <span className="text-red-500">*</span></h3>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Pilih "Tidak Perlu" jika keluarga/masyarakat menguruskan penggalian kubur</p>
                      
                      {availableStaff.PENGALI_KUBUR.length === 0 ? (
                        <p className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-md">
                          Tiada pengali kubur tersedia untuk tarikh ini.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {availableStaff.PENGALI_KUBUR.map((staff) => (
                            <label 
                              key={staff.id} 
                              className={`flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${
                                staff.id === 'not-needed-penggali' 
                                  ? 'border-green-300 bg-green-50 has-[:checked]:bg-green-100 has-[:checked]:border-green-500' 
                                  : 'border-gray-300 has-[:checked]:bg-primary/10 has-[:checked]:border-primary'
                              }`}
                            >
                              <input
                                type="radio"
                                name="pengali_kubur"
                                value={staff.id}
                                checked={bookingData.selectedStaff.PENGALI_KUBUR?.id === staff.id}
                                onChange={() => handleStaffSelect('PENGALI_KUBUR', staff)}
                                disabled={isSubmitting}
                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary disabled:opacity-50"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 block">{staff.name}</span>
                                  {staff.id === 'not-needed-penggali' && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                      Lalai
                                    </span>
                                  )}
                                </div>
                                {staff.phone && (
                                  <span className="text-sm text-gray-500">{staff.phone}</span>
                                )}
                                {staff.id === 'not-needed-penggali' && (
                                  <span className="text-xs text-green-600 mt-1 block">
                                    Untuk penggalian yang diuruskan keluarga/masyarakat
                                  </span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pemandi Jenazah Selection */}
                    <div>
                      <div className="flex items-center mb-3">
                        <FontAwesomeIcon icon={faUser} className="h-5 w-5 text-primary mr-2" />
                        <h3 className="text-md font-medium text-gray-800">Pemandi Jenazah <span className="text-red-500">*</span></h3>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Pilih "Tidak Perlu" jika jenazah sudah dimandikan di hospital</p>
                      
                      {availableStaff.PEMANDI_JENAZAH.length === 0 ? (
                        <p className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-md">
                          Tiada pemandi jenazah tersedia untuk tarikh ini.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {availableStaff.PEMANDI_JENAZAH.map((staff) => (
                            <label 
                              key={staff.id} 
                              className={`flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${
                                staff.id === 'not-needed-pemandi' 
                                  ? 'border-blue-300 bg-blue-50 has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500' 
                                  : 'border-gray-300 has-[:checked]:bg-primary/10 has-[:checked]:border-primary'
                              }`}
                            >
                              <input
                                type="radio"
                                name="pemandi_jenazah"
                                value={staff.id}
                                checked={bookingData.selectedStaff.PEMANDI_JENAZAH?.id === staff.id}
                                onChange={() => handleStaffSelect('PEMANDI_JENAZAH', staff)}
                                disabled={isSubmitting}
                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary disabled:opacity-50"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 block">{staff.name}</span>
                                  {staff.id === 'not-needed-pemandi' && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      Lalai
                                    </span>
                                  )}
                                </div>
                                {staff.phone && (
                                  <span className="text-sm text-gray-500">{staff.phone}</span>
                                )}
                                {staff.id === 'not-needed-pemandi' && (
                                  <span className="text-xs text-blue-600 mt-1 block">
                                    Untuk jenazah yang sudah dimandikan
                                  </span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Staff Summary */}
                {(bookingData.selectedStaff.PENGALI_KUBUR || bookingData.selectedStaff.PEMANDI_JENAZAH) && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Kakitangan Dipilih:</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      {bookingData.selectedStaff.PENGALI_KUBUR && (
                        <div>
                          <strong>Pengali Kubur:</strong> {bookingData.selectedStaff.PENGALI_KUBUR.name}
                        </div>
                      )}
                      {bookingData.selectedStaff.PEMANDI_JENAZAH && (
                        <div>
                          <strong>Pemandi Jenazah:</strong> {bookingData.selectedStaff.PEMANDI_JENAZAH.name}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Summary and Submission */} 
               <section className="pt-6 border-t border-gray-200">
                   <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                       <div className="text-center sm:text-left">
                           <span className="text-sm text-gray-600">Anggaran Jumlah Bayaran:</span>
                           <p className="text-2xl font-bold text-primary">RM {totalPrice.toFixed(2)}</p>
                       </div>
                       <button
                           type="button" 
                           onClick={handleSubmitBooking}
                           disabled={isSubmitting || isLoading || !selectedPlotData || isLoadingStaff || 
                                    !bookingData.selectedStaff.PENGALI_KUBUR || !bookingData.selectedStaff.PEMANDI_JENAZAH}
                           className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-light transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                           {isSubmitting ? (
                               <FontAwesomeIcon icon={faSpinner} spin className="h-5 w-5"/>
                           ) : null}
                           Hantar Tempahan
                       </button>
                   </div>
                    {error && (
                       <p className="text-sm text-red-600 text-center mt-4">{error}</p>
                   )}
               </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
