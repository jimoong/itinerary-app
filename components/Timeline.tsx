'use client';

import { useState, useRef, useEffect } from 'react';
import { Place, Flight } from '@/lib/types';
import { Clock, MapPin, Trash2, Coffee, Building2, TreePine, Landmark, ShoppingBag, Ticket, Navigation, Car, Train, TramFront, Heart, RefreshCw, Hotel, Info, MoreVertical, Check, EyeOff } from 'lucide-react';
import ImagePanel from './ImagePanel';

interface TimelineProps {
  places: Place[];
  flight?: Flight;
  onRemovePlace: (placeId: string) => void;
  onPlaceClick?: (placeId: string) => void;
  onRefreshPlace?: (placeIndex: number) => void;
  onMarkAsVisited?: (placeIndex: number) => void;
  onExcludePlace?: (placeIndex: number) => void;
  highlightedPlaceId?: string;
  refreshingPlaceIndex?: number;
  nextPlaceIndex?: number | null;
  visitedPlaceIds?: Set<string>;
}

export default function Timeline({ places, flight, onRemovePlace, onPlaceClick, onRefreshPlace, onMarkAsVisited, onExcludePlace, highlightedPlaceId, refreshingPlaceIndex, nextPlaceIndex, visitedPlaceIds }: TimelineProps) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isImagePanelOpen, setIsImagePanelOpen] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (place: Place, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlace(place);
    setIsImagePanelOpen(true);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuIndex(null);
      }
    };

    if (openMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuIndex]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'hotel':
        return <Hotel className="w-5 h-5" />;
      case 'restaurant':
        return <Coffee className="w-5 h-5" />;
      case 'museum':
        return <Building2 className="w-5 h-5" />;
      case 'park':
        return <TreePine className="w-5 h-5" />;
      case 'landmark':
        return <Landmark className="w-5 h-5" />;
      case 'shopping':
        return <ShoppingBag className="w-5 h-5" />;
      case 'entertainment':
        return <Ticket className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case 'walk':
        return <Navigation className="w-4 h-4" />;
      case 'taxi':
        return <Car className="w-4 h-4" />;
      case 'metro':
        return <Train className="w-4 h-4" />;
      case 'tram':
        return <TramFront className="w-4 h-4" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  // Generate Google Maps URL for a location
  const getGoogleMapsUrl = (place: Place) => {
    const query = encodeURIComponent(`${place.name}, ${place.address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${place.lat},${place.lng}`;
  };

  // Generate Google Maps directions URL between two places
  const getDirectionsUrl = (origin: Place, destination: Place, mode: string) => {
    const originCoords = `${origin.lat},${origin.lng}`;
    const destCoords = `${destination.lat},${destination.lng}`;
    
    // Map transport modes to Google Maps travel modes
    let travelMode = 'walking';
    switch (mode) {
      case 'walk':
        travelMode = 'walking';
        break;
      case 'taxi':
        travelMode = 'driving';
        break;
      case 'metro':
      case 'tram':
        travelMode = 'transit';
        break;
    }
    
    return `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destCoords}&travelmode=${travelMode}`;
  };

  // Generate Uber deep link with pickup and dropoff
  const getUberUrl = (origin: Place, destination: Place) => {
    // Uber deep link format: uber://?action=setPickup&pickup[latitude]=...&dropoff[latitude]=...
    const pickupLat = origin.lat;
    const pickupLng = origin.lng;
    const pickupName = encodeURIComponent(origin.name);
    const dropoffLat = destination.lat;
    const dropoffLng = destination.lng;
    const dropoffName = encodeURIComponent(destination.name);
    const dropoffAddress = encodeURIComponent(destination.address);
    
    // Try to open Uber app first, fallback to web
    return `uber://?action=setPickup&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}&pickup[nickname]=${pickupName}&dropoff[latitude]=${dropoffLat}&dropoff[longitude]=${dropoffLng}&dropoff[nickname]=${dropoffName}&dropoff[formatted_address]=${dropoffAddress}`;
  };

  if (places.length === 0) {
    return (
      <div className="timeline__empty-state">
        <MapPin className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg">No activities scheduled for this day</p>
        <p className="text-sm mt-2">Click "Add Place" to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="timeline">
        {places.map((place, index) => {
        const isHighlighted = highlightedPlaceId === place.id;
        const isHotel = place.category === 'hotel';
        const isAirport = place.category === 'airport';
        
        const isRefreshing = refreshingPlaceIndex === index;
        
        return (
          <div key={place.id} className="timeline__item relative">
            {/* Refreshing overlay */}
            {isRefreshing && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Getting new suggestion...
                  </span>
                </div>
              </div>
            )}
            
            <div
              onClick={() => onPlaceClick?.(place.id)}
              className={`timeline__content ${isHighlighted ? 'timeline__item--highlighted' : ''}`}
            >
              {/* Timeline line */}
              {index < places.length - 1 && (
                <div className="timeline__line" />
              )}

              {/* Timeline dot with number or hotel/airport icon */}
              <div className={`timeline__dot ${isHighlighted ? 'timeline__dot--highlighted' : ''} ${isHotel ? 'bg-red-500' : ''} ${isAirport ? 'bg-blue-500' : ''}`}>
                {isHotel ? '🏨' : isAirport ? '✈️' : index + 1}
              </div>

              {/* Content */}
              <div className="space-y-2">
                {/* Time and duration */}
                <div className="timeline__time">
                  {/* <Clock className="w-4 h-4" /> */}
                  {/* {getCategoryIcon(place.category)} */}
                  <span>{place.startTime || 'TBD'}</span>
                  {place.duration > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{formatDuration(place.duration)}</span>
                    </>
                  )}

                  {/* Action buttons - hide for hotel and airport items */}
                  {!isHotel && !isAirport && (
                    <div className="flex gap-1 absolute right-0">
                      {/* Info button */}
                      <button
                        onClick={(e) => handleImageClick(place, e)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="View place info"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      {/* More menu button */}
                      <div className="relative" ref={openMenuIndex === index ? menuRef : null}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuIndex(openMenuIndex === index ? null : index);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown menu */}
                        {openMenuIndex === index && (
                          <div className="absolute right-0 top-full mt-1 w-60 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                            {/* Refresh option */}
                            {onRefreshPlace && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuIndex(null);
                                  onRefreshPlace(index);
                                }}
                                disabled={refreshingPlaceIndex === index}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RefreshCw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${refreshingPlaceIndex === index ? 'animate-spin' : ''}`} />
                                <span className="text-base text-gray-700 dark:text-gray-300">Refresh suggestion</span>
                              </button>
                            )}
                            
                            {/* Mark as Visited option */}
                            {onMarkAsVisited && place.category !== 'hotel' && place.category !== 'airport' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuIndex(null);
                                  onMarkAsVisited(index);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-slate-700"
                              >
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <div className="flex-1">
                                  <div className="text-base text-gray-700 dark:text-gray-300">Visited</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Mark as visited & exclude from future</div>
                                </div>
                              </button>
                            )}
                            
                            {/* Do Not Show This option */}
                            {onExcludePlace && place.category !== 'hotel' && place.category !== 'airport' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuIndex(null);
                                  onExcludePlace(index);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-slate-700"
                              >
                                <EyeOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                <div className="flex-1">
                                  <div className="text-base text-gray-700 dark:text-gray-300">Do not show this</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Exclude from future suggestions</div>
                                </div>
                              </button>
                            )}
                            
                            {/* Remove option */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuIndex(null);
                                onRemovePlace(place.id);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="text-base text-red-600 dark:text-red-400">Remove place</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Place name and category */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {/* <div className="text-blue-600">
                        {getCategoryIcon(place.category)}
                      </div> */}
                      <h3 className="timeline__title">{place.name}</h3>
                      {/* Visited badge */}
                      {visitedPlaceIds?.has(place.id) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          <Check className="w-3 h-3 mr-1" />
                          Visited
                        </span>
                      )}
                      {/* Next badge */}
                      {nextPlaceIndex === index && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                          Next
                        </span>
                      )}
                    </div>
                    {/* Description - skip for hotels */}
                    {!isHotel && place.description && (
                      <p className="timeline__description">{place.description}</p>
                    )}
                    
                    {/* Kids rating */}
                    {place.kidsRating && (
                      <div className="timeline__kids-rating">
                        <span className="font-medium">{place.kidsRating}</span>
                      </div>
                    )}
                    
                    {/* Address - clickable link to Google Maps */}
                    <a
                      href={getGoogleMapsUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-start gap-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      title="Open in Google Maps"
                    >
                      {/* <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> */}
                      <span>{place.address}</span>
                    </a>
                  </div>
                </div>

                {/* Category badge */}
                {/* <div className="timeline__category-badge">
                  {place.category}
                </div> */}
              </div>
            </div>

            {/* Transport to next location */}
            {place.transportToNext && index < places.length - 1 && (
              <div className="timeline__transportation relative pb-4 pt-4">
                {/* <div className="timeline__line" /> */}
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={getDirectionsUrl(place, places[index + 1], place.transportToNext.mode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="timeline__transport transition-colors cursor-pointer flex-1"
                    title="Get directions in Google Maps"
                  >
                    {getTransportIcon(place.transportToNext.mode)}
                    <span className="capitalize">{place.transportToNext.mode}</span>
                    <span className="text-gray-400">•</span>
                    <span>{formatDuration(place.transportToNext.duration)}</span>
                    {place.transportToNext.distance && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>{place.transportToNext.distance}</span>
                      </>
                    )}
                    {/* <span className="text-blue-600 ml-auto">→</span> */}
                  </a>
                  
                  {/* Uber button - show for: walking > 15min, all public transport, all taxi */}
                  {((place.transportToNext.mode === 'walk' && place.transportToNext.duration > 15) ||
                    place.transportToNext.mode === 'metro' ||
                    place.transportToNext.mode === 'tram' ||
                    place.transportToNext.mode === 'taxi') && (
                    <a
                      href={getUberUrl(place, places[index + 1])}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors mt-4"
                      title="Book Uber"
                    >
                      <Car className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>

      {/* Image Panel */}
      {selectedPlace && (
        <ImagePanel
          place={selectedPlace}
          isOpen={isImagePanelOpen}
          onClose={() => setIsImagePanelOpen(false)}
        />
      )}
    </>
  );
}

