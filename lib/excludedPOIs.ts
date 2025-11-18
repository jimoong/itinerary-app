/**
 * Excluded POIs Configuration
 * 
 * This file allows you to maintain a list of places that should NOT be included
 * in the AI-generated itineraries. This is useful for:
 * - Places you've already visited
 * - Places you're not interested in
 * - Places with bad reviews or experiences
 * - Overrated tourist traps you want to avoid
 * 
 * The AI will receive this list and actively avoid suggesting these locations.
 */

export interface ExcludedPOI {
  id: string;
  name: string;
  city: 'Lisbon' | 'London' | 'Any'; // 'Any' means exclude from all cities
  reason?: string; // Optional: why you're excluding it
  category?: string; // Optional: restaurant, museum, landmark, etc.
}

// ============================================================================
// USER CONFIGURATION: Add your excluded places here
// ============================================================================

export const EXCLUDED_POIS: ExcludedPOI[] = [
  // Example: Already visited
  // {
  //   id: 'madame-tussauds',
  //   name: 'Madame Tussauds',
  //   city: 'London',
  //   reason: 'Already visited on previous trip',
  //   category: 'museum'
  // },

  // Example: Not interested
  // {
  //   id: 'london-dungeon',
  //   name: 'The London Dungeon',
  //   city: 'London',
  //   reason: 'Too scary for young kids',
  //   category: 'entertainment'
  // },

  // Example: Overrated
  // {
  //   id: 'piccadilly-circus',
  //   name: 'Piccadilly Circus',
  //   city: 'London',
  //   reason: 'Overrated, just a busy intersection',
  //   category: 'landmark'
  // },

  // Example: Bad experience
  // {
  //   id: 'tourist-trap-restaurant',
  //   name: 'Angus Steakhouse',
  //   city: 'London',
  //   reason: 'Tourist trap with mediocre food',
  //   category: 'restaurant'
  // },

  // Example: Exclude from all cities
  // {
  //   id: 'hard-rock-cafe',
  //   name: 'Hard Rock Cafe',
  //   city: 'Any',
  //   reason: 'Generic chain, prefer local restaurants',
  //   category: 'restaurant'
  // },

  // Add your excluded places below:
  // ============================================================================
  
];

// ============================================================================
// HELPER FUNCTIONS (Do not modify)
// ============================================================================

/**
 * Get excluded POIs for a specific city
 */
export function getExcludedPOIsForCity(city: 'Lisbon' | 'London'): ExcludedPOI[] {
  return EXCLUDED_POIS.filter(poi => poi.city === city || poi.city === 'Any');
}

/**
 * Format excluded POIs for AI prompt (includes runtime additions)
 */
export function formatExcludedPOIsForPrompt(city: 'Lisbon' | 'London'): string {
  const excluded = getExcludedPOIsForCityWithRuntime(city);
  
  if (excluded.length === 0) {
    return '';
  }

  const formattedList = excluded.map(poi => {
    const reasonText = poi.reason ? ` (${poi.reason})` : '';
    return `  - ${poi.name}${reasonText}`;
  }).join('\n');

  return `\n\n${'='.repeat(60)}\n🚫 EXCLUDED PLACES - DO NOT SUGGEST THESE\n${'='.repeat(60)}\n\nThe following places should NEVER be included in the itinerary:\n\n${formattedList}\n\n⚠️ CRITICAL: Do NOT suggest any of these places under any circumstances.\nIf a place is similar or related to these, avoid it as well.\n${'='.repeat(60)}\n`;
}

/**
 * Get a summary of excluded POIs (for logging/debugging)
 */
export function getExcludedPOIsSummary(): string {
  const byCity = {
    Lisbon: getExcludedPOIsForCity('Lisbon').length,
    London: getExcludedPOIsForCity('London').length,
    Any: EXCLUDED_POIS.filter(poi => poi.city === 'Any').length
  };

  return `Excluded POIs: ${byCity.Lisbon} in Lisbon, ${byCity.London} in London, ${byCity.Any} in all cities`;
}

/**
 * Check if a place name matches any excluded POI (case-insensitive partial match)
 */
export function isPlaceExcluded(placeName: string, city: 'Lisbon' | 'London'): boolean {
  const excluded = getExcludedPOIsForCity(city);
  const lowerPlaceName = placeName.toLowerCase();
  
  return excluded.some(poi => {
    const lowerExcludedName = poi.name.toLowerCase();
    // Check for exact match or if one contains the other
    return lowerPlaceName.includes(lowerExcludedName) || lowerExcludedName.includes(lowerPlaceName);
  });
}

/**
 * Add a place to the excluded list dynamically (runtime only, not persisted to file)
 */
const runtimeExcludedPOIs: ExcludedPOI[] = [];

export function addToExcludedList(
  name: string,
  city: 'Lisbon' | 'London',
  reason?: string
): void {
  // Check if already excluded
  const exists = runtimeExcludedPOIs.some(poi => 
    poi.name.toLowerCase() === name.toLowerCase() && poi.city === city
  );
  
  if (!exists) {
    const newExcluded: ExcludedPOI = {
      id: `runtime-${Date.now()}`,
      name,
      city,
      reason: reason || 'User excluded',
      category: 'other'
    };
    
    runtimeExcludedPOIs.push(newExcluded);
    console.log(`🚫 Added to excluded list: ${name} (${city})`);
  }
}

/**
 * Remove a place from the runtime excluded list
 */
export function removeFromExcludedList(name: string, city: 'Lisbon' | 'London'): void {
  const index = runtimeExcludedPOIs.findIndex(poi => 
    poi.name.toLowerCase() === name.toLowerCase() && poi.city === city
  );
  
  if (index !== -1) {
    runtimeExcludedPOIs.splice(index, 1);
    console.log(`✅ Removed from excluded list: ${name}`);
  }
}

/**
 * Get all excluded POIs including runtime additions
 */
export function getAllExcludedPOIs(): ExcludedPOI[] {
  return [...EXCLUDED_POIS, ...runtimeExcludedPOIs];
}

/**
 * Get excluded POIs for a city including runtime additions
 */
export function getExcludedPOIsForCityWithRuntime(city: 'Lisbon' | 'London'): ExcludedPOI[] {
  const allExcluded = getAllExcludedPOIs();
  return allExcluded.filter(poi => poi.city === city || poi.city === 'Any');
}

