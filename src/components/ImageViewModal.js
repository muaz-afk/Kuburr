'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faDownload, 
  faZoomIn, 
  faZoomOut, 
  faRotateRight,
  faRotateLeft,
  faExpand,
  faCompress,
  faFileAlt,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

export default function ImageViewModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title = "Lihat Dokumen",
  filename = null 
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setImagePosition({ x: 0, y: 0 });
      setIsLoading(true);
      setError(null);
      setIsFullscreen(false);
    }
  }, [isOpen, imageUrl]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Gagal memuatkan imej. Sila cuba lagi.');
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleRotateRight = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation(prev => (prev - 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setImagePosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || 'document.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (scale > 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - imagePosition.x,
        y: touch.clientY - imagePosition.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setImagePosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Determine if the URL is a PDF
  const isPDF = imageUrl && (imageUrl.toLowerCase().includes('.pdf') || imageUrl.toLowerCase().includes('pdf'));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className={`relative w-full h-full flex flex-col ${isFullscreen ? '' : 'max-w-6xl max-h-[90vh] m-4'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={faFileAlt} className="text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {filename && (
                <p className="text-sm text-gray-300">{filename}</p>
              )}
            </div>
          </div>
          
          {/* Toolbar */}
          <div className="flex items-center space-x-2">
            {!isPDF && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <FontAwesomeIcon icon={faZoomOut} />
                </button>
                
                <span className="text-sm px-2 py-1 bg-gray-700 rounded">
                  {Math.round(scale * 100)}%
                </span>
                
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <FontAwesomeIcon icon={faZoomIn} />
                </button>
                
                <div className="w-px h-6 bg-gray-600"></div>
                
                <button
                  onClick={handleRotateLeft}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Putar Kiri"
                >
                  <FontAwesomeIcon icon={faRotateLeft} />
                </button>
                
                <button
                  onClick={handleRotateRight}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Putar Kanan"
                >
                  <FontAwesomeIcon icon={faRotateRight} />
                </button>
                
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  title="Reset"
                >
                  Reset
                </button>
                
                <div className="w-px h-6 bg-gray-600"></div>
              </>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </button>
            
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Muat Turun"
            >
              <FontAwesomeIcon icon={faDownload} />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-600 rounded-lg transition-colors"
              title="Tutup"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden rounded-b-lg">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-blue-500 mb-4" />
                <p className="text-gray-600">Memuatkan dokumen...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center p-8">
                <FontAwesomeIcon icon={faFileAlt} className="text-6xl text-gray-400 mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Cuba Lagi
                </button>
              </div>
            </div>
          )}

          {!error && imageUrl && (
            <div className="w-full h-full flex items-center justify-center p-4">
              {isPDF ? (
                <iframe
                  src={`${imageUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full border-0 rounded-lg shadow-lg"
                  title={title}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div
                  className="relative w-full h-full flex items-center justify-center cursor-move"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{ cursor: scale > 1 ? 'move' : 'default' }}
                >
                  <img
                    src={imageUrl}
                    alt={title}
                    className="max-w-none transition-transform duration-200 select-none shadow-2xl rounded-lg"
                    style={{
                      transform: `scale(${scale}) rotate(${rotation}deg) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                      cursor: scale > 1 ? 'move' : 'default'
                    }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    draggable={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {!isLoading && !error && (
          <div className="bg-gray-900 text-white p-2 text-center text-sm rounded-b-lg">
            {isPDF ? (
              <span className="text-gray-300">Dokumen PDF - Gunakan kawalan dalam PDF untuk navigasi</span>
            ) : (
              <span className="text-gray-300">
                Gunakan butang zoom atau scroll mouse untuk zum. Seret untuk menggerakkan imej yang dizum.
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Background overlay - click to close */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={onClose}
      />
    </div>
  );
}