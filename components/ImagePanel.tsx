'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ImageOff, Clock, Phone, Globe, Star, User } from 'lucide-react';
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

interface PlaceDetails {
  openingHours: string[] | null;
  isOpenNow?: boolean;
  phoneNumber: string | null;
  website: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  editorialSummary: string | null;
}

interface Review {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
}

type MainTab = 'info' | 'reviews';

export default function ImagePanel({ place, isOpen, onClose }: ImagePanelProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Trigger animation after render
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      if (place) {
        fetchPhotos();
      }
    } else {
      // Start closing animation
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
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
        throw new Error('Failed to fetch place information');
      }
      
      const data = await response.json();
      
      // Flatten categorized photos into a single array
      let allPhotos: Photo[] = [];
      if (data.photos) {
        if (data.photos.food) allPhotos = [...allPhotos, ...data.photos.food];
        if (data.photos.interior) allPhotos = [...allPhotos, ...data.photos.interior];
        if (data.photos.exterior) allPhotos = [...allPhotos, ...data.photos.exterior];
      }
      
      setPhotos(allPhotos);
      setDetails(data.details || null);
      setReviews(data.reviews || []);
      
      if (allPhotos.length === 0 && !data.details && !data.reviews?.length) {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching place information:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`fixed z-50 bg-white dark:bg-slate-900 shadow-2xl flex flex-col
                      md:right-0 md:top-0 md:w-[45%] md:max-w-[600px] md:h-auto
                      bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl md:rounded-none
                      md:left-auto md:h-auto
                      transition-transform duration-300 ease-in-out
                      ${isAnimating 
                        ? 'translate-x-0 translate-y-0' 
                        : 'md:translate-x-full md:translate-y-0 translate-y-full'
                      }`}>
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
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
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading information...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <ImageOff className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-center">
                No information found for this location
              </p>
            </div>
          )}

          {!loading && !error && (details || reviews.length > 0 || photos.length > 0) && (
            <div className="flex flex-col h-full">
              {/* Main Tab Navigation */}
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700 px-6">
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveMainTab('info')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeMainTab === 'info'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Info
                  </button>
                  {reviews.length > 0 && (
                    <button
                      onClick={() => setActiveMainTab('reviews')}
                      className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeMainTab === 'reviews'
                          ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Reviews
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 pb-8">
                {activeMainTab === 'info' && (
                  <>
                    {/* Editorial Summary */}
                    {/* {details?.editorialSummary && (
                      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {details.editorialSummary}
                        </p>
                      </div>
                    )} */}

              {/* Place Details Section - only show if there's at least one detail */}
              {details && (details.openingHours?.length || details.phoneNumber || details.website) && (
                <div className="space-y-4 pb-4 mb-6 border-b border-gray-200 dark:border-slate-700">
                  {/* Opening Hours */}
                  {details.openingHours && details.openingHours.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Clock className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Hours</h3>
                        {details.isOpenNow !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            details.isOpenNow 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {details.isOpenNow ? 'Open now' : 'Closed'}
                          </span>
                        )}
                      </div>
                      <div className="ml-8 space-y-1">
                        {details.openingHours.map((hours, index) => (
                          <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                            {hours}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phone Number */}
                  {details.phoneNumber && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-4">
                        <Phone className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Phone</h3>
                      </div>
                      <a 
                        href={`tel:${details.phoneNumber}`}
                        className="ml-8 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {details.phoneNumber}
                      </a>
                    </div>
                  )}

                  {/* Website */}
                  {details.website && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-4">
                        <Globe className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Website</h3>
                      </div>
                      <a 
                        href={details.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-8 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {details.website}
                      </a>
                    </div>
                  )}
                </div>
              )}

                    {/* Photos Section */}
                    {photos.length > 0 && (
                      <div className="space-y-4">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative">
                            {/* Placeholder with aspect ratio to prevent layout shift */}
                            <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
                              <img
                                src={photo.url}
                                alt={`${place.name} - Photo ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md"
                                loading="lazy"
                              />
                            </div>
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
                  </>
                )}

                {/* Reviews Tab Content */}
                {activeMainTab === 'reviews' && (
                  <div className="space-y-6">
                    {/* Rating Summary */}
                    {details?.rating && (
                      <div className="dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                            <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                              {details.rating.toFixed(1)}
                            </span>
                          </div>
                          {details.userRatingsTotal && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({details.userRatingsTotal.toLocaleString()} reviews)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* User Reviews */}
                    <div className="space-y-4">
                      {reviews.map((review, index) => (
                        <div key={index} className="pb-4 border-b border-gray-200 dark:border-slate-700 last:border-0 last:pb-0">
                          <div className="flex items-start gap-3">

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">
                                  {review.authorName}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {review.relativeTimeDescription}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 mb-2">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${
                                      i < review.rating 
                                        ? 'text-yellow-500 fill-yellow-500' 
                                        : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {review.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

