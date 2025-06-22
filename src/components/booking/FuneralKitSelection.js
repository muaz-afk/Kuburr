'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faPlus, faMinus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';

export default function FuneralKitSelection({ 
  selectedFuneralKits = [], 
  onKitSelectionChange, 
  deceasedGender = null,
  disabled = false 
}) {
  const [kitInventory, setKitInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch kit inventory from API
  useEffect(() => {
    const fetchKitInventory = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const response = await fetch('/api/funeral-kits');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal memuat data kit jenazah');
        }
        
        const data = await response.json();
        console.log('[FuneralKitSelection] Raw API response:', data);
        console.log('[FuneralKitSelection] Kit inventory fetched:', data.kits);
        setKitInventory(data.kits || []);
      } catch (err) {
        console.error('Error fetching kit inventory:', err);
        setError(err.message);
        toast.error(`Gagal memuat data kit: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKitInventory();
  }, []);

  // Get kit by type
  const getKitByType = (kitType) => {
    return kitInventory.find(kit => kit.kitType === kitType);
  };

  // Get selected quantity for a kit type
  const getSelectedQuantity = (kitType) => {
    const selected = selectedFuneralKits.find(kit => kit.kitType === kitType);
    return selected ? selected.quantity : 0;
  };

  // Handle kit selection change
  const handleKitChange = (kitType, newQuantity) => {
    if (disabled) return;

    const kit = getKitByType(kitType);
    if (!kit) return;

    // Validate quantity
    if (newQuantity < 0) newQuantity = 0;
    if (newQuantity > kit.availableQuantity) {
      toast.warning(`Hanya ${kit.availableQuantity} kit ${kitType.toLowerCase()} tersedia`);
      newQuantity = kit.availableQuantity;
    }

    // Update selected kits
    let updatedKits = [...selectedFuneralKits];
    const existingIndex = updatedKits.findIndex(kit => kit.kitType === kitType);

    if (newQuantity === 0) {
      // Remove kit if quantity is 0
      if (existingIndex >= 0) {
        updatedKits.splice(existingIndex, 1);
      }
    } else {
      // Add or update kit
      const kitSelection = { kitType, quantity: newQuantity };
      if (existingIndex >= 0) {
        updatedKits[existingIndex] = kitSelection;
      } else {
        updatedKits.push(kitSelection);
      }
    }

    onKitSelectionChange(updatedKits);
  };

  // Get gender-appropriate kit suggestion
  const getSuggestedKitType = () => {
    if (deceasedGender === 'LELAKI') return 'LELAKI';
    if (deceasedGender === 'WANITA') return 'PEREMPUAN';
    return null;
  };

  const suggestedKitType = getSuggestedKitType();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <FontAwesomeIcon icon={faSpinner} spin className="h-6 w-6 text-primary mr-2" />
        <span className="text-gray-600">Sedang memuatkan data kit jenazah...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600 text-sm">Ralat: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-red-700 hover:text-red-900 text-sm underline"
        >
          Cuba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <FontAwesomeIcon icon={faBox} className="h-5 w-5 text-primary mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">Kit Jenazah</h3>
        <span className="ml-2 text-sm text-gray-500">(Pilihan)</span>
      </div>

      {suggestedKitType && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-blue-800 text-sm">
            <strong>Cadangan:</strong> Berdasarkan jantina si mati ({deceasedGender}), 
            kami mencadangkan Kit Jenazah {suggestedKitType === 'LELAKI' ? 'Lelaki' : 'Perempuan'}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(() => {
          console.log('[FuneralKitSelection] Rendering kits, kitInventory:', kitInventory);
          console.log('[FuneralKitSelection] kitInventory.length:', kitInventory.length);
          console.log('[FuneralKitSelection] suggestedKitType:', suggestedKitType);
          return null;
        })()}
        {kitInventory.map((kit) => {
          const selectedQuantity = getSelectedQuantity(kit.kitType);
          const isRecommended = kit.kitType === suggestedKitType;
          const isAvailable = kit.availableQuantity > 0;
          
          console.log(`[FuneralKitSelection] Rendering kit:`, {
            kitId: kit.id,
            kitType: kit.kitType, 
            availableQuantity: kit.availableQuantity,
            selectedQuantity,
            isRecommended,
            isAvailable
          });

          return (
            <div 
              key={kit.id}
              className={`border rounded-lg p-4 transition-colors ${
                isRecommended 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300 bg-white'
              } ${!isAvailable ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 flex items-center">
                    Kit Jenazah {kit.kitType === 'LELAKI' ? 'Lelaki' : 'Perempuan'}
                    {isRecommended && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Dicadangkan
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Tersedia: {kit.availableQuantity} unit
                  </p>
                  {!isAvailable && (
                    <p className="text-sm text-red-600 font-medium">Habis stok</p>
                  )}
                </div>
              </div>

              {isAvailable ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Kuantiti:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleKitChange(kit.kitType, selectedQuantity - 1)}
                      disabled={disabled || selectedQuantity <= 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
                    </button>
                    
                    <span className="w-8 text-center font-medium text-gray-900">
                      {selectedQuantity}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => handleKitChange(kit.kitType, selectedQuantity + 1)}
                      disabled={disabled || selectedQuantity >= kit.availableQuantity}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <span className="text-gray-500 text-sm">Tidak tersedia</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedFuneralKits.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-900 mb-2">Kit Jenazah Dipilih:</h4>
          <div className="space-y-1">
            {selectedFuneralKits.map((kit, index) => (
              <div key={index} className="text-sm text-green-800">
                • Kit Jenazah {kit.kitType === 'LELAKI' ? 'Lelaki' : 'Perempuan'}: {kit.quantity} unit
              </div>
            ))}
          </div>
        </div>
      )}

      {kitInventory.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FontAwesomeIcon icon={faBox} className="h-12 w-12 mb-3" />
          <p>Tiada data kit jenazah tersedia.</p>
        </div>
      )}
    </div>
  );
}