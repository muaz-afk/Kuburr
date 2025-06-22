'use client';

import React, { useEffect, useRef } from 'react';

export default function LocationPage() {
  const mapRef = useRef(null);
  const apiKey = 'AIzaSyD2eLU1PlOfIa4TQm-EdDD5IXA7sBFQtdA'; // Storing API key in a variable

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
      script.async = true;
      script.defer = true;
      window.initMap = initMap; // Make initMap globally available
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (mapRef.current && window.google && window.google.maps) {
        const cemeteryLocation = { lat: 1.9578715, lng: 103.029074 };
        const map = new window.google.maps.Map(mapRef.current, {
          center: cemeteryLocation,
          zoom: 15, // Adjusted zoom level
        });
        new window.google.maps.Marker({
          position: cemeteryLocation,
          map: map,
          title: 'Lokasi Perkuburan', // Updated title
        });
      }
    };

    loadGoogleMapsScript();

    // Cleanup function to remove the script and callback if the component unmounts
    return () => {
      const scripts = document.head.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src.includes('maps.googleapis.com')) {
          scripts[i].remove();
        }
      }
      if (window.initMap) {
        delete window.initMap;
      }
    };
  }, [apiKey]); // Add apiKey to dependency array if it could change, though it's constant here

  return (
    <section className="min-h-screen bg-blue-200 relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8">
      {/* Graveyard Background Image covering the entire section */}
      <img
        src="/kuburrrr.jpeg"
        alt="Picture of the graveyards"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      {/* Overlay to ensure content readability */}
      <div className="absolute inset-0 bg-blue-200/70 z-10"></div>
      
      <div className="max-w-7xl mx-auto relative z-20">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8 text-center bg-white/90 p-4 rounded-lg">
          Lokasi
        </h1>
        <div ref={mapRef} className="w-full h-[500px] rounded-md shadow-md"></div>

        {/* Cemetery Details Section */}
        <div className="mt-12 bg-white/95 p-6 sm:p-8 rounded-lg shadow-lg backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-primary mb-6">Maklumat Perkuburan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">ALAMAT</h3>
              <p className="text-gray-600">LORONG 2, PEKAN PARIT YAANI, KAMPUNG PARIT BANYUMAS, 83700 YONG PENG, JOHOR DARUL TA'ZIM.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">KELUASAN</h3>
              <p className="text-gray-600">16 EKAR</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">TAHUN DIBUKA</h3>
              <p className="text-gray-600">1970</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">KEBENARAN PENGKEBUMIAN</h3>
              <p className="text-gray-600">SURAU NUR IMAN, PARIT SURATMAN</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">KARIAH MASJID / SURAU YANG DIBENARKAN UNTUK PENGKEBUMIAN</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>SURAU NUR IMAN, PARIT SURATMAN</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}