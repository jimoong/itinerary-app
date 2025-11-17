'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ImageOff } from 'lucide-react';
import { Place } from '@/lib/types';

interface ImagePanelProps {
  place: Place;
  isOpen: boolean;
  onClose: () => void;
}

interface Photo {
  url: string;
  attribution: string;
}

export default function ImagePanel({ place, isOpen, onClose }: ImagePanelProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen && place) {
      fetchPhotos();
    }
  }, [isOpen, place]);

  const fetchPhotos = async () => {
    setLoading(true);
    setError(false);
    
    try {
      const response = await fetch(
        `/api/place-photos?name=${encodeURIComponent(place.name)}&address=${encodeURIComponent(place.address)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      
      const data = await response.json();
      setPhotos(data.photos || []);
      
      if (data.photos.length === 0) {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed z-50 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-300 ease-out
                      md:right-0 md:top-0 md:bottom-0 md:w-[500px]
                      bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl md:rounded-none">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {place.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {place.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-80px)] md:h-[calc(100%-80px)]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading images...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <ImageOff className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-center">
                No images found for this location
              </p>
            </div>
          )}

          {!loading && !error && photos.length > 0 && (
            <div className="p-4 space-y-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo.url}
                    alt={`${place.name} - Photo ${index + 1}`}
                    className="w-full h-auto rounded-lg shadow-md"
                    loading="lazy"
                  />
                  {photo.attribution && (
                    <div 
                      className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                      dangerouslySetInnerHTML={{ __html: photo.attribution }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

