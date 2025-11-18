/**
 * Trip Time Utilities
 * 
 * Helper functions to determine which days and times need to be generated
 * based on the current date/time and trip schedule.
 */

import { TRIP_DETAILS } from './constants';

export interface RegenerationScope {
  startDayNumber: number;
  endDayNumber: number;
  startTime?: string; // HH:MM format, only for the first day if partial
  reason: string;
}

/**
 * Determine which days need to be regenerated based on current time
 */
export function getRegenerationScope(currentDate: Date = new Date()): RegenerationScope {
  const tripStartDate = new Date(TRIP_DETAILS.lisbonDates.start);
  const tripEndDate = new Date(TRIP_DETAILS.londonDates.end);
  
  // If current date is before trip start, generate everything
  if (currentDate < tripStartDate) {
    return {
      startDayNumber: 1,
      endDayNumber: 10,
      reason: 'Trip has not started yet - generating full itinerary'
    };
  }
  
  // If current date is after trip end, still generate everything (for review/planning)
  if (currentDate > tripEndDate) {
    return {
      startDayNumber: 1,
      endDayNumber: 10,
      reason: 'Trip has ended - generating full itinerary for review'
    };
  }
  
  // Trip is in progress - determine which day we're on
  const dayNumber = getDayNumberFromDate(currentDate);
  
  if (dayNumber === null) {
    // Shouldn't happen, but fallback to full generation
    return {
      startDayNumber: 1,
      endDayNumber: 10,
      reason: 'Could not determine current day - generating full itinerary'
    };
  }
  
  // Get current time
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  const currentTime = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
  
  // If it's early in the day (before 8 AM), regenerate from current day
  if (currentHours < 8) {
    return {
      startDayNumber: dayNumber,
      endDayNumber: 10,
      reason: `Currently Day ${dayNumber}, early morning - regenerating from today onwards`
    };
  }
  
  // If it's late in the day (after 8 PM), start from next day
  if (currentHours >= 20) {
    const nextDay = dayNumber + 1;
    if (nextDay > 10) {
      return {
        startDayNumber: 10,
        endDayNumber: 10,
        reason: 'Last day of trip, late evening - regenerating final day only'
      };
    }
    return {
      startDayNumber: nextDay,
      endDayNumber: 10,
      reason: `Currently Day ${dayNumber}, late evening - regenerating from tomorrow onwards`
    };
  }
  
  // During the day - regenerate from current day, starting from current time
  return {
    startDayNumber: dayNumber,
    endDayNumber: 10,
    startTime: currentTime,
    reason: `Currently Day ${dayNumber} at ${currentTime} - regenerating remaining activities from now onwards`
  };
}

/**
 * Get day number (1-10) from a date
 */
export function getDayNumberFromDate(date: Date): number | null {
  const dateStr = date.toISOString().split('T')[0];
  
  // Lisbon days (1-5): Nov 21-25
  const lisbonStart = new Date(TRIP_DETAILS.lisbonDates.start);
  const lisbonEnd = new Date(TRIP_DETAILS.lisbonDates.end);
  
  if (date >= lisbonStart && date <= lisbonEnd) {
    const daysDiff = Math.floor((date.getTime() - lisbonStart.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff + 1; // Days 1-5
  }
  
  // London days (6-10): Nov 25-29
  const londonStart = new Date(TRIP_DETAILS.londonDates.start);
  const londonEnd = new Date(TRIP_DETAILS.londonDates.end);
  
  if (date >= londonStart && date <= londonEnd) {
    const daysDiff = Math.floor((date.getTime() - londonStart.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff + 6; // Days 6-10
  }
  
  return null;
}

/**
 * Check if we're currently on the trip
 */
export function isCurrentlyOnTrip(currentDate: Date = new Date()): boolean {
  const tripStartDate = new Date(TRIP_DETAILS.lisbonDates.start);
  const tripEndDate = new Date(TRIP_DETAILS.londonDates.end);
  
  return currentDate >= tripStartDate && currentDate <= tripEndDate;
}

/**
 * Get a human-readable description of the regeneration scope
 */
export function getRegenerationDescription(scope: RegenerationScope): string {
  if (scope.startDayNumber === 1 && scope.endDayNumber === 10) {
    return 'Regenerating entire trip (all 10 days)';
  }
  
  if (scope.startDayNumber === scope.endDayNumber) {
    if (scope.startTime) {
      return `Regenerating Day ${scope.startDayNumber} from ${scope.startTime} onwards`;
    }
    return `Regenerating Day ${scope.startDayNumber}`;
  }
  
  if (scope.startTime) {
    return `Regenerating Days ${scope.startDayNumber}-${scope.endDayNumber} (starting from ${scope.startTime} on Day ${scope.startDayNumber})`;
  }
  
  return `Regenerating Days ${scope.startDayNumber}-${scope.endDayNumber}`;
}

/**
 * Get visited places from past days (before regeneration scope)
 */
export function getPastDaysPlaceNames(allDays: any[], scope: RegenerationScope): string[] {
  const pastDays = allDays.filter(day => day.dayNumber < scope.startDayNumber);
  const placeNames: string[] = [];
  
  pastDays.forEach(day => {
    day.places?.forEach((place: any) => {
      if (place.category !== 'hotel' && place.category !== 'airport') {
        placeNames.push(place.name);
      }
    });
  });
  
  return placeNames;
}

