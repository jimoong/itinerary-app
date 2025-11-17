'use client';

import { useState } from 'react';
import { Place } from '@/lib/types';
import { Clock, MapPin, Trash2, Coffee, Building2, TreePine, Landmark, ShoppingBag, Ticket, Navigation, Car, Train, TramFront, Heart, RefreshCw, Hotel, Image } from 'lucide-react';
import ImagePanel from './ImagePanel';

interface TimelineProps {
  places: Place[];
  onRemovePlace: (placeId: string) => void;
  onPlaceClick?: (placeId: string) => void;
  onRefreshPlace?: (placeIndex: number) => void;
  highlightedPlaceId?: string;
  refreshingPlaceIndex?: number;
  nextPlaceIndex?: number | null;
}

export default function Timeline({ places, onRemovePlace, onPlaceClick, onRefreshPlace, highlightedPlaceId, refreshingPlaceIndex, nextPlaceIndex }: TimelineProps) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isImagePanelOpen, setIsImagePanelOpen] = useState(false);

  const handleImageClick = (place: Place, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlace(place);
    setIsImagePanelOpen(true);
  };

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
        
        return (
          <div key={place.id} className="timeline__item">
            <div
              onClick={() => onPlaceClick?.(place.id)}
              className={`timeline__content ${isHighlighted ? 'timeline__item--highlighted' : ''}`}
            >
              {/* Timeline line */}
              {index < places.length - 1 && (
                <div className="timeline__line" />
              )}

              {/* Timeline dot with number or hotel icon */}
              <div className={`timeline__dot ${isHighlighted ? 'timeline__dot--highlighted' : ''} ${isHotel ? 'bg-red-500' : ''}`}>
                {isHotel ? '🏨' : index + 1}
              </div>

              {/* Content */}
              <div className="space-y-2">
                {/* Time and duration */}
                <div className="timeline__time">
                  {/* <Clock className="w-4 h-4" /> */}
                  {getCategoryIcon(place.category)}
                  <span>{place.startTime || 'TBD'}</span>
                  {place.duration > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{formatDuration(place.duration)}</span>
                    </>
                  )}

                  {/* Action buttons - hide for hotel items */}
                  {!isHotel && (
                    <div className="flex gap-1 absolute right-0">
                      {/* Image button */}
                      <button
                        onClick={(e) => handleImageClick(place, e)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="View images"
                      >
                        <Image className="w-4 h-4" />
                      </button>

                      {/* Refresh button */}
                      {onRefreshPlace && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefreshPlace(index);
                          }}
                          disabled={refreshingPlaceIndex === index}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Get AI suggestion for alternative place"
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshingPlaceIndex === index ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePlace(place.id);
                        }}
                        className="timeline__remove-button"
                        title="Remove place"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                <a
                  href={getDirectionsUrl(place, places[index + 1], place.transportToNext.mode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="timeline__transport transition-colors cursor-pointer"
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

