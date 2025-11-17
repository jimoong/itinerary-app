import { Place } from './types';

/**
 * Returns mock current date and time for testing purposes
 * Uses current real date/time but you can override for testing
 */
export function getMockCurrentDateTime(): Date {
  // For testing, you can hardcode a specific date/time:
  // return new Date('2025-11-22T10:00:00');
  
  // Use actual current date/time
  return new Date();
}

/**
 * Returns mock current time for testing purposes (HH:mm format)
 * @deprecated Use getMockCurrentDateTime() instead for date+time aware logic
 */
export function getMockCurrentTime(): string {
  const now = getMockCurrentDateTime();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Converts a time string in HH:mm format to minutes since midnight
 * @param timeStr - Time string in format "HH:mm" (e.g., "10:30")
 * @returns Minutes since midnight (e.g., 630 for "10:30")
 */
export function parseTimeString(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Combines a date string and time string into a Date object
 * @param dateStr - Date string in format "YYYY-MM-DD"
 * @param timeStr - Time string in format "HH:mm"
 * @returns Date object
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

/**
 * Finds the index of the next upcoming place based on current date and time
 * @param places - Array of places in the itinerary
 * @param currentDate - Date of the itinerary day (YYYY-MM-DD format)
 * @returns Index of the next place, or -1 if all places have passed or day is in the past/future
 */
export function findNextPlace(places: Place[], currentDate: string): number {
  const now = getMockCurrentDateTime();
  
  // Parse the itinerary date
  const itineraryDate = new Date(currentDate);
  
  // Check if the itinerary day is today
  const isToday = 
    now.getFullYear() === itineraryDate.getFullYear() &&
    now.getMonth() === itineraryDate.getMonth() &&
    now.getDate() === itineraryDate.getDate();
  
  // If the day is in the past, no next place
  if (itineraryDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return -1;
  }
  
  // If the day is in the future, first place is next
  if (itineraryDate > new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return places.length > 0 ? 0 : -1;
  }
  
  // Day is today - find the next place based on current time
  if (isToday) {
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      
      // Skip places without a start time
      if (!place.startTime) {
        continue;
      }
      
      // Combine date and time to create a full datetime
      const placeDateTime = combineDateAndTime(currentDate, place.startTime);
      
      // Return the first place that hasn't started yet
      if (placeDateTime >= now) {
        return i;
      }
    }
  }
  
  // All places have passed
  return -1;
}

