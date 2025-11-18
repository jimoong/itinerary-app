import { Trip } from './types';

const STORAGE_KEY = 'itinerary_trip_data';
const STORAGE_VERSION = '4'; // Version 4 for cleaned flight timeline (no end hotel)

export function saveTrip(trip: Trip): void {
  if (typeof window !== 'undefined') {
    const dataToSave = {
      version: STORAGE_VERSION,
      trip: trip
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }
}

export function loadTrip(): Trip | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        
        // Check if it's the new versioned format
        if (parsed.version === STORAGE_VERSION && parsed.trip) {
          const trip = parsed.trip;
          
          // Validate the trip data
          if (!trip.days || !Array.isArray(trip.days) || trip.days.length !== 9) {
            console.warn('Invalid trip data: wrong number of days. Clearing...');
            clearTrip();
            return null;
          }
          
          // Validate each day has required fields
          const isValid = trip.days.every((day: any) => 
            day && day.date && day.dayNumber && day.city && day.places
          );
          
          if (!isValid) {
            console.warn('Invalid trip data: missing required fields. Clearing...');
            clearTrip();
            return null;
          }
          
          return trip;
        } else {
          // Old format or wrong version - clear it
          console.warn('Old or incompatible data format. Clearing...');
          clearTrip();
          return null;
        }
      } catch (error) {
        console.error('Error parsing trip data:', error);
        clearTrip();
        return null;
      }
    }
  }
  return null;
}

export function clearTrip(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Trip data cleared from localStorage');
  }
}

