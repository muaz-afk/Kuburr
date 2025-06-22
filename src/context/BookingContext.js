'use client';

import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';

const BookingContext = createContext(undefined);

const initialState = {
  // Applicant Info (pre-filled, editable)
  applicantName: '',
  applicantPhone: '',
  // Deceased Info
  deceasedName: '',
  deceasedIC: '',
  deceasedGender: '', // 'LELAKI' or 'WANITA'
  // Files
  permitFile: null, // The File object
  permitFileUrl: null, // URL after upload
  deathCertificateFile: null, // The File object for death certificate
  deathCertificateFileUrl: null, // URL after upload
  // Booking Steps Data
  selectedPackages: [],
  selectedPlotData: null, // Full plot object with id, plotIdentifier, etc.
  selectedDate: new Date(),
  selectedTime: '11:00',
  totalPrice: 0,
  // Staff Assignment Data (NEW)
  selectedStaff: {
    PENGALI_KUBUR: null, // Staff object for grave digger
    PEMANDI_JENAZAH: null, // Staff object for body washer
  },
  staffAssignments: [], // Array of {staffId, staffType} for API submission
  // Funeral Kit Selection (NEW)
  selectedFuneralKits: [], // Array of {kitType: 'LELAKI'|'PEREMPUAN', quantity: 1}
};


export const BookingContextProvider = ({ children }) => {
  const [bookingData, setBookingData] = useState(initialState);

  const updateBookingData = (newData) => {
    setBookingData((prev) => ({ ...prev, ...newData }));
  };

  const resetBookingData = () => {
    setBookingData(initialState);
  };

  // Helper function to update staff selection
  const updateStaffSelection = (staffType, staffData) => {
    setBookingData((prev) => {
      const newSelectedStaff = { ...prev.selectedStaff };
      newSelectedStaff[staffType] = staffData;
      
      // Update staffAssignments array for API submission
      const newStaffAssignments = [];
      Object.keys(newSelectedStaff).forEach(type => {
        if (newSelectedStaff[type]) {
          newStaffAssignments.push({
            staffId: newSelectedStaff[type].id,
            staffType: type
          });
        }
      });
      
      return {
        ...prev,
        selectedStaff: newSelectedStaff,
        staffAssignments: newStaffAssignments
      };
    });
  };

  // Calculate total price whenever packages change
  useEffect(() => {
    const calculateTotal = () => {
      // Assuming PACKAGES structure is available or passed if needed
      // For simplicity, let's assume price calculation happens elsewhere or is passed
      // This is just an example placeholder if price logic were here
      return bookingData.selectedPackages.length * 100; // Placeholder
    };
    updateBookingData({ totalPrice: calculateTotal() }); // Example
  }, [bookingData.selectedPackages]);

  // useMemo to prevent unnecessary re-renders
  const value = useMemo(() => ({ 
    bookingData, 
    updateBookingData, 
    resetBookingData,
    updateStaffSelection
  }), [bookingData]);

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookingContext = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingContextProvider');
  }
  return context;
}; 