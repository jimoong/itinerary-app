'use client';

import { useState, useEffect, useRef } from 'react';
import MapView from '@/components/MapView';
import Timeline from '@/components/Timeline';
import DayNavigation from '@/components/DayNavigation';
import EditPlace from '@/components/EditPlace';
import { Trip, Place, DayItinerary } from '@/lib/types';
import { loadTrip, saveTrip, clearTrip } from '@/lib/storage';
import { TRIP_DETAILS } from '@/lib/constants';
import { findNextPlace } from '@/lib/timeUtils';
import { RefreshCw, Plus, Loader2, RotateCcw } from 'lucide-react';

type TransportMode = 'walk' | 'taxi' | 'metro' | 'tram';

// Low-level helper to call Routes API
async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TransportMode
): Promise<{ duration: number; distance: string } | null> {
  try {
    let travelMode: string;
    switch (mode) {
      case 'walk':
        travelMode = 'WALK';
        break;
      case 'metro':
      case 'tram':
        travelMode = 'TRANSIT';
        break;
      case 'taxi':
        travelMode = 'DRIVE';
        break;
      default:
        travelMode = 'WALK';
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      return null;
    }

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: from.lat,
              longitude: from.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: to.lat,
              longitude: to.lng
            }
          }
        },
        travelMode: travelMode,
        computeAlternativeRoutes: false
      })
    });

    if (!response.ok) {
      throw new Error(`Routes API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const durationSeconds = parseInt(route.duration?.replace('s', '') || '0', 10);
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const distanceMeters = route.distanceMeters || 0;
      const distanceKm = (distanceMeters / 1000).toFixed(1);

      console.log(`[fetchRoute] ${mode} route: ${durationMinutes} min, ${distanceKm} km (raw: ${durationSeconds}s, ${distanceMeters}m)`);

      return {
        duration: durationMinutes,
        distance: `${distanceKm} km`
      };
    }

    console.log(`[fetchRoute] No routes found for ${mode}`);
    return null;
  } catch (error) {
    console.error('Error calculating route:', error);
    return null;
  }
}

// Smarter route calculator that prefers walking <= 20 min, otherwise transit
async function calculateSmartRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ duration: number; distance: string; mode: TransportMode } | null> {
  console.log(`[calculateSmartRoute] Calculating route from (${from.lat}, ${from.lng}) to (${to.lat}, ${to.lng})`);
  
  const walkRoute = await fetchRoute(from, to, 'walk');
  console.log(`[calculateSmartRoute] Walking route:`, walkRoute);

  if (walkRoute && walkRoute.duration <= 20) {
    console.log(`[calculateSmartRoute] ✅ Using WALK (${walkRoute.duration} min <= 20 min)`);
    return { ...walkRoute, mode: 'walk' };
  }

  console.log(`[calculateSmartRoute] Walking is ${walkRoute?.duration || 'N/A'} min (> 20 min), trying transit...`);
  const transitRoute = await fetchRoute(from, to, 'metro');
  console.log(`[calculateSmartRoute] Transit route:`, transitRoute);
  
  if (transitRoute) {
    console.log(`[calculateSmartRoute] ✅ Using METRO (${transitRoute.duration} min)`);
    return { ...transitRoute, mode: 'metro' };
  }

  // If transit fails and walking is > 20 min, use taxi as fallback
  if (walkRoute && walkRoute.duration > 20) {
    console.log(`[calculateSmartRoute] Transit unavailable, using TAXI as fallback`);
    const taxiRoute = await fetchRoute(from, to, 'taxi');
    if (taxiRoute) {
      console.log(`[calculateSmartRoute] ✅ Using TAXI (${taxiRoute.duration} min)`);
      return { ...taxiRoute, mode: 'taxi' };
    }
  }

  // Last resort: return walking route even if > 20 min
  console.log(`[calculateSmartRoute] ⚠️ Fallback to WALK (${walkRoute?.duration || 'N/A'} min)`);
  return walkRoute ? { ...walkRoute, mode: 'walk' } : null;
}

// Utility function to add hotel as first and last place in the itinerary
async function addHotelsToDay(day: DayItinerary): Promise<DayItinerary> {
  // Check if hotels are already properly added with transport
  if (day.places.length >= 2 && 
      day.places[0].category === 'hotel' && 
      day.places[day.places.length - 1].category === 'hotel' &&
      day.places[0].transportToNext && // Has transport from start hotel
      day.places[day.places.length - 2].transportToNext // Has transport to end hotel
    ) {
    return day; // Already has hotels with transport
  }

  // Remove existing hotels if present but incomplete
  let placesWithoutHotels = day.places.filter(p => p.category !== 'hotel');

  const hotelPlace: Place = {
    id: `hotel-${day.dayNumber}`,
    name: day.hotel.name,
    address: day.hotel.address,
    lat: day.hotel.lat,
    lng: day.hotel.lng,
    description: 'Your hotel',
    duration: 0,
    category: 'hotel',
  };

  // Calculate route from hotel to first place if there are places
  let hotelToFirstRoute = null;
  if (placesWithoutHotels.length > 0) {
    const firstPlace = placesWithoutHotels[0];
    hotelToFirstRoute = await calculateSmartRoute(
      { lat: day.hotel.lat, lng: day.hotel.lng },
      { lat: firstPlace.lat, lng: firstPlace.lng }
    );
  }

  // Add hotel at start (with start time and transport to first place)
  const startHotel: Place = { 
    ...hotelPlace, 
    id: `hotel-start-${day.dayNumber}`, 
    startTime: '08:00',
    transportToNext: hotelToFirstRoute ? {
      mode: hotelToFirstRoute.mode,
      duration: hotelToFirstRoute.duration,
      distance: hotelToFirstRoute.distance
    } : undefined
  };
  
  // Calculate route from last place back to hotel
  let lastToHotelRoute = null;
  if (placesWithoutHotels.length > 0) {
    const lastPlace = placesWithoutHotels[placesWithoutHotels.length - 1];
    lastToHotelRoute = await calculateSmartRoute(
      { lat: lastPlace.lat, lng: lastPlace.lng },
      { lat: day.hotel.lat, lng: day.hotel.lng }
    );
  }

  // Add transport back to hotel on the last place
  const updatedPlaces = placesWithoutHotels.length > 0 
    ? placesWithoutHotels.map((place, index) => {
        if (index === placesWithoutHotels.length - 1 && lastToHotelRoute) {
          // Last place - add transport back to hotel with calculated values
          return {
            ...place,
            transportToNext: {
              mode: lastToHotelRoute.mode,
              duration: lastToHotelRoute.duration,
              distance: lastToHotelRoute.distance
            }
          };
        }
        return place;
      })
    : [];
  
  const endHotel = { ...hotelPlace, id: `hotel-end-${day.dayNumber}` };

  // Insert hotel at beginning and end
  return {
    ...day,
    places: [startHotel, ...updatedPlaces, endHotel]
  };
}

export default function Home() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | undefined>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [refreshingPlaceIndex, setRefreshingPlaceIndex] = useState<number | undefined>();
  const [nextPlaceIndex, setNextPlaceIndex] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCurrentLocation, setShowCurrentLocation] = useState(false);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Request user's geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          console.log('User location detected:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('Could not get user location:', error.message);
        }
      );
    }
  }, []);

  // Load or generate trip on mount
  useEffect(() => {
    const initializeTrip = async () => {
      console.log('Initializing trip...');
      const savedTrip = loadTrip();
      
      console.log('Saved trip from storage:', savedTrip);
      
      if (savedTrip) {
        console.log('Using saved trip with', savedTrip.days.length, 'days');
        // Add hotels to each day if not already present (async)
        const daysWithHotels = await Promise.all(
          savedTrip.days.map(day => addHotelsToDay(day))
        );
        const tripWithHotels = {
          ...savedTrip,
          days: daysWithHotels
        };
        setTrip(tripWithHotels);
        setIsLoading(false);
      } else {
        // Generate new trip
        console.log('No valid saved trip, generating new one...');
        await generateAllDays();
      }
    };

    initializeTrip();
  }, []);

  // Save trip whenever it changes
  useEffect(() => {
    if (trip) {
      saveTrip(trip);
    }
  }, [trip]);

  // Safety check: if currentDayIndex is out of bounds, reset to first day
  useEffect(() => {
    if (trip && trip.days && currentDayIndex >= trip.days.length) {
      setCurrentDayIndex(0);
    }
  }, [trip, currentDayIndex]);

  // Scroll timeline to top when day changes
  useEffect(() => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = 0;
    }
  }, [currentDayIndex]);

  // Calculate next place and auto-highlight based on current date and time
  useEffect(() => {
    if (!trip || !trip.days || !trip.days[currentDayIndex]) {
      setNextPlaceIndex(null);
      setHighlightedPlaceId(undefined);
      return;
    }

    const currentDay = trip.days[currentDayIndex];
    
    // Pass the current day's date to findNextPlace for date+time comparison
    const nextIndex = findNextPlace(currentDay.places, currentDay.date);
    setNextPlaceIndex(nextIndex);
    
    // Auto-highlight the next place
    if (nextIndex !== -1 && currentDay.places[nextIndex]) {
      setHighlightedPlaceId(currentDay.places[nextIndex].id);
    } else {
      setHighlightedPlaceId(undefined);
    }
  }, [trip, currentDayIndex]);

  const generateAllDays = async () => {
    setIsLoading(true);
    
    // Try streaming first, fallback to non-streaming if it fails
    let useStreaming = true;
    
    try {
      console.log('🚀 Starting streaming itinerary generation...');
      const response = await fetch('/api/generate-itinerary-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        console.warn('⚠️ Streaming failed, falling back to non-streaming API');
        useStreaming = false;
      } else {
        useStreaming = true;
      }
      
      if (!useStreaming) {
        // Fallback to non-streaming API
        console.log('📡 Using non-streaming API...');
        const fallbackResponse = await fetch('/api/generate-itinerary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate-all' }),
        });
        
        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          console.error('API error:', errorText);
          throw new Error(`Failed to generate itinerary: ${fallbackResponse.status}`);
        }
        
        const data = await fallbackResponse.json();
        
        if (!data.days || data.days.length !== 9) {
          throw new Error(`Expected 9 days but got ${data.days?.length || 0}`);
        }
        
        // Add hotels to each day
        const daysWithHotels = await Promise.all(
          data.days.map((day: DayItinerary) => addHotelsToDay(day))
        );
        
        const newTrip: Trip = {
          travelers: [
            { role: "Dad", age: 46 },
            { role: "Mom", age: 39 },
            { role: "Girl", age: 9 },
            { role: "Boy", age: 6 }
          ],
          days: daysWithHotels,
          startDate: data.days[0].date,
          endDate: data.days[data.days.length - 1].date,
        };
        
        setTrip(newTrip);
        saveTrip(newTrip);
        console.log('✅ Non-streaming generation complete');
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const allDays: DayItinerary[] = [];
      let buffer = '';

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream complete');
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete messages (separated by \n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer
        
        for (const message of messages) {
          if (message.startsWith('data: ')) {
            const jsonStr = message.substring(6);
            try {
              const event = JSON.parse(jsonStr);
              
              if (event.type === 'day') {
                console.log(`📅 Received day ${event.progress.current}/${event.progress.total}`);
                
                // Add hotels to the day
                const dayWithHotels = await addHotelsToDay(event.day);
                allDays.push(dayWithHotels);
                
                // Update trip progressively
                const progressTrip: Trip = {
                  travelers: [
                    { role: "Dad", age: 46 },
                    { role: "Mom", age: 39 },
                    { role: "Girl", age: 9 },
                    { role: "Boy", age: 6 }
                  ],
                  days: [...allDays],
                  startDate: allDays[0].date,
                  endDate: allDays[allDays.length - 1].date,
                };
                
                setTrip(progressTrip);
                console.log(`✨ UI updated with ${allDays.length} days`);
              } else if (event.type === 'complete') {
                console.log('✅ Generation complete:', event.summary);
              } else if (event.type === 'error') {
                console.error('❌ Stream error:', event.error);
                throw new Error(event.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE message:', parseError);
            }
          }
        }
      }
      
      if (allDays.length !== 9) {
        console.error('Invalid number of days received:', allDays.length);
        alert(`Error: Expected 9 days but got ${allDays.length}. Check API configuration.`);
        setIsLoading(false);
        return;
      }
      
      const finalTrip: Trip = {
        travelers: [
          { role: "Dad", age: 46 },
          { role: "Mom", age: 39 },
          { role: "Girl", age: 9 },
          { role: "Boy", age: 6 }
        ],
        days: allDays,
        startDate: allDays[0].date,
        endDate: allDays[allDays.length - 1].date,
      };
      
      console.log('💾 Saving final trip to localStorage');
      saveTrip(finalTrip);
      console.log('🎉 Trip generation complete!');
    } catch (error) {
      console.error('Error generating trip:', error);
      alert('Failed to generate itinerary. Check console for details. Make sure API keys are set in .env.local');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateCurrentDay = async () => {
    if (!trip) return;

    setIsRegenerating(true);
    try {
      // Collect all place names from OTHER days to avoid duplicates
      const placesToAvoid: string[] = [];
      trip.days.forEach((day, idx) => {
        if (idx !== currentDayIndex) {
          day.places.forEach(place => {
            if (!place.name.toLowerCase().includes('hotel')) {
              placesToAvoid.push(place.name);
            }
          });
        }
      });

      console.log(`Regenerating day ${currentDayIndex + 1}, avoiding ${placesToAvoid.length} places from other days`);

      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate-day',
          dayNumber: currentDayIndex + 1,
          avoidPlaces: placesToAvoid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate day');
      }

      const data = await response.json();
      
      // Add hotels to the regenerated day
      const dayWithHotels = await addHotelsToDay(data.day);
      
      setTrip({
        ...trip,
        days: trip.days.map((d, i) => i === currentDayIndex ? dayWithHotels : d)
      });
      
      // Save to localStorage
      const updatedTrip = {
        ...trip,
        days: trip.days.map((d, i) => i === currentDayIndex ? dayWithHotels : d)
      };
      saveTrip(updatedTrip);
      
      console.log('✅ Day regenerated successfully');
    } catch (error) {
      console.error('Error regenerating day:', error);
      alert('Failed to regenerate day. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const optimizeCurrentDay = async () => {
    if (!trip) return;

    const currentDay = trip.days[currentDayIndex];
    setIsOptimizing(true);
    
    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize-day',
          dayNumber: currentDayIndex + 1,
          places: currentDay.places,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to optimize day');
      }

      const data = await response.json();
      
      setTrip({
        ...trip,
        days: trip.days.map((d, i) => 
          i === currentDayIndex ? { ...d, places: data.places } : d
        )
      });
    } catch (error) {
      console.error('Error optimizing day:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRemovePlace = (placeId: string) => {
    if (!trip) return;

    setTrip({
      ...trip,
      days: trip.days.map((day, i) => 
        i === currentDayIndex
          ? { ...day, places: day.places.filter(p => p.id !== placeId) }
          : day
      )
    });
  };

  const handleAddPlace = (place: Omit<Place, 'id'>) => {
    if (!trip) return;

    const newPlace: Place = {
      id: `${currentDayIndex + 1}-${Date.now()}`,
      ...place
    };

    setTrip({
      ...trip,
      days: trip.days.map((day, i) => 
        i === currentDayIndex
          ? { ...day, places: [...day.places, newPlace] }
          : day
      )
    });
  };

  const handleRefreshPlace = async (placeIndex: number) => {
    if (!trip) return;

    const currentDay = trip.days[currentDayIndex];
    setRefreshingPlaceIndex(placeIndex);
    
    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate-place',
          dayNumber: currentDayIndex + 1,
          places: currentDay.places,
          placeIndex: placeIndex,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate place');
      }

      const data = await response.json();
      
      // Replace the place at the specified index
      const updatedPlaces = [...currentDay.places];
      updatedPlaces[placeIndex] = data.place;
      
      setTrip({
        ...trip,
        days: trip.days.map((d, i) => 
          i === currentDayIndex ? { ...d, places: updatedPlaces } : d
        )
      });
    } catch (error) {
      console.error('Error regenerating place:', error);
      alert('Failed to generate alternative. Please try again.');
    } finally {
      setRefreshingPlaceIndex(undefined);
    }
  };

  const handleResetAll = async () => {
    if (confirm('Are you sure you want to reset and regenerate all days? This cannot be undone.')) {
      clearTrip();
      setCurrentDayIndex(0);
      await generateAllDays();
    }
  };

      // Show loading screen only if no trip data exists yet
      if (isLoading && !trip) {
        return (
          <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg text-gray-600 dark:text-gray-400">Generating your personalized itinerary...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Days will appear as they're generated...</p>
            </div>
          </div>
        );
      }

      if (!trip) {
        return (
          <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950">
            <div className="text-center">
              <p className="text-lg text-gray-600 dark:text-gray-400">Failed to load itinerary</p>
              <button
                onClick={generateAllDays}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        );
      }

  const currentDay = trip.days[currentDayIndex];

  // Pass user location to map only when toggle is on
  const currentLocationMarker = (showCurrentLocation && userLocation) ? userLocation : undefined;

  // Check if current day has invalid data
  const hasInvalidData = !currentDay || !currentDay.date || isNaN(new Date(currentDay.date).getTime());

  if (hasInvalidData) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center max-w-md">
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">Invalid or corrupted itinerary data detected.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">This usually happens when the app structure has changed. Please reset your itinerary to continue.</p>
          <button
            onClick={() => {
              clearTrip();
              window.location.reload();
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Clear & Regenerate Itinerary
          </button>
        </div>
      </div>
    );
  }

  if (!currentDay) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading day information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black pb-16">
      {/* Main content - responsive layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 md:pb-0">
        {/* Map panel - fixed height on mobile, flex on desktop */}
        <div className="flex-none md:flex-1 p-3 md:p-6 h-[45vh] md:h-auto min-h-0">
          <div className="h-full bg-white dark:bg-black rounded-lg overflow-hidden relative">
            <MapView
              places={currentDay.places}
              onMarkerClick={setHighlightedPlaceId}
              highlightedPlaceId={highlightedPlaceId}
              currentLocation={currentLocationMarker}
              nextPlaceIndex={nextPlaceIndex}
            />
            
            {/* Show/Hide current location toggle */}
            {userLocation && (
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  onClick={() => setShowCurrentLocation(!showCurrentLocation)}
                  className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${
                    showCurrentLocation 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                  title={showCurrentLocation ? 'Hide current location' : 'Show current location'}
                >
                  {showCurrentLocation ? '📍 Location ON' : '📍 Location OFF'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Timeline panel - flex to fill remaining space on mobile */}
        <div className="flex-1 p-3 pt-0 md:p-6 md:pl-3 flex flex-col min-h-0">
          <div className="flex-1 bg-white dark:bg-black rounded-lg overflow-hidden flex flex-col min-h-0">
            
            {/* Loading indicator while streaming */}
            {isLoading && trip && trip.days.length < 9 && (
              <div className="px-4 py-3 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-700 fixed z-50 bottom-20 left-1/2 w-80 -ml-40 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating itinerary...</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {trip.days.length}/9 days
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-500 ease-out"
                    style={{ width: `${(trip.days.length / 9) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Timeline header
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Daily Schedule</h2>
              <div className="text-xs md:text-sm text-gray-600">
                {currentDay.places.length} {currentDay.places.length === 1 ? 'place' : 'places'}
              </div>
            </div> */}

            {/* Timeline content */}
            <div ref={timelineScrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
              <Timeline
                places={currentDay.places}
                onRemovePlace={handleRemovePlace}
                onPlaceClick={setHighlightedPlaceId}
                onRefreshPlace={handleRefreshPlace}
                highlightedPlaceId={highlightedPlaceId}
                refreshingPlaceIndex={refreshingPlaceIndex}
                nextPlaceIndex={nextPlaceIndex}
              />
            </div>

            {/* Actions */}
            {/* <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 space-y-2 md:space-y-3">
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 bg-blue-600 text-white rounded-lg text-sm md:text-base font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Add Place</span>
                  <span className="sm:hidden">Add</span>
                </button>
                <button
                  onClick={optimizeCurrentDay}
                  disabled={isOptimizing || currentDay.places.length === 0}
                  className="flex-1 flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 bg-green-600 text-white rounded-lg text-sm md:text-base font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isOptimizing ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                  <span className="hidden sm:inline">Optimize Times</span>
                  <span className="sm:hidden">✓</span>
                </button>
              </div>
              
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={regenerateCurrentDay}
                  disabled={isRegenerating}
                  className="flex-1 flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 bg-orange-600 text-white rounded-lg text-sm md:text-base font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                  <span className="hidden sm:inline">Regenerate Day</span>
                  <span className="sm:hidden">↻</span>
                </button>
                <button
                  onClick={handleResetAll}
                  className="flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 bg-red-600 text-white rounded-lg text-sm md:text-base font-medium hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Reset All</span>
                  <span className="sm:hidden">Reset</span>
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <DayNavigation
        currentDay={currentDay}
        onPrevious={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
        onNext={() => setCurrentDayIndex(Math.min(trip.days.length - 1, currentDayIndex + 1))}
        canGoPrevious={currentDayIndex > 0}
        canGoNext={currentDayIndex < trip.days.length - 1}
        onHardRefresh={handleResetAll}
        onRegenerateCurrentDay={regenerateCurrentDay}
      />

      {/* Edit modal */}
      <EditPlace
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAddPlace={handleAddPlace}
        dayNumber={currentDayIndex + 1}
      />
    </div>
  );
}

