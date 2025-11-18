/**
 * Visited Places Management
 * 
 * Tracks places the user has visited during their trip.
 * Visited places are:
 * 1. Excluded from future itinerary generation
 * 2. Marked with a checkmark icon in the timeline
 * 3. Shown with a blue dot on the map
 * 4. Saved in localStorage for persistence
 */

export interface VisitedPlace {
  id: string;
  name: string;
  address: string;
  city: 'Lisbon' | 'London';
  visitedDate: string; // ISO date when marked as visited
  lat: number;
  lng: number;
}

const VISITED_PLACES_KEY = 'itinerary_visited_places';

/**
 * Get all visited places from localStorage
 */
export function getVisitedPlaces(): VisitedPlace[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(VISITED_PLACES_KEY);
    if (data) {
      try {
        const places = JSON.parse(data);
        return Array.isArray(places) ? places : [];
      } catch (error) {
        console.error('Error parsing visited places:', error);
        return [];
      }
    }
  }
  return [];
}

/**
 * Mark a place as visited
 */
export function markPlaceAsVisited(
  name: string,
  address: string,
  city: 'Lisbon' | 'London',
  lat: number,
  lng: number
): void {
  if (typeof window !== 'undefined') {
    const visitedPlaces = getVisitedPlaces();
    
    // Check if already marked as visited
    const exists = visitedPlaces.some(p => 
      p.name.toLowerCase() === name.toLowerCase() && p.city === city
    );
    
    if (!exists) {
      const newVisitedPlace: VisitedPlace = {
        id: `visited-${Date.now()}`,
        name,
        address,
        city,
        visitedDate: new Date().toISOString(),
        lat,
        lng
      };
      
      visitedPlaces.push(newVisitedPlace);
      localStorage.setItem(VISITED_PLACES_KEY, JSON.stringify(visitedPlaces));
      console.log(`✅ Marked as visited: ${name}`);
    }
  }
}

/**
 * Remove a place from visited list
 */
export function unmarkPlaceAsVisited(name: string, city: 'Lisbon' | 'London'): void {
  if (typeof window !== 'undefined') {
    const visitedPlaces = getVisitedPlaces();
    const filtered = visitedPlaces.filter(p => 
      !(p.name.toLowerCase() === name.toLowerCase() && p.city === city)
    );
    
    localStorage.setItem(VISITED_PLACES_KEY, JSON.stringify(filtered));
    console.log(`❌ Unmarked as visited: ${name}`);
  }
}

/**
 * Check if a place has been visited
 */
export function isPlaceVisited(name: string, city: 'Lisbon' | 'London'): boolean {
  const visitedPlaces = getVisitedPlaces();
  return visitedPlaces.some(p => 
    p.name.toLowerCase() === name.toLowerCase() && p.city === city
  );
}

/**
 * Get visited places for a specific city
 */
export function getVisitedPlacesForCity(city: 'Lisbon' | 'London'): VisitedPlace[] {
  return getVisitedPlaces().filter(p => p.city === city);
}

/**
 * Clear all visited places
 */
export function clearVisitedPlaces(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(VISITED_PLACES_KEY);
    console.log('🗑️ Cleared all visited places');
  }
}

/**
 * Get visited place names as array (for excluding from generation)
 */
export function getVisitedPlaceNames(): string[] {
  return getVisitedPlaces().map(p => p.name);
}

