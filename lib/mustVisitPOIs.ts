/**
 * Must-Visit POIs Configuration
 * 
 * This file allows you to maintain a list of places that MUST be included
 * in the AI-generated itineraries. This is useful for:
 * - High-priority attractions you don't want to miss
 * - Recommended places from friends/family
 * - Unique experiences specific to the destination
 * - Places with advance bookings or reservations
 * 
 * The AI will ensure these locations are included in the final itinerary.
 */

export interface MustVisitPOI {
  id: string;
  name: string;
  city: 'Lisbon' | 'London';
  priority: 'high' | 'medium' | 'low'; // High = must include, Medium = strongly prefer, Low = nice to have
  category?: string; // museum, restaurant, landmark, park, activity, etc.
  notes?: string; // Optional: why you want to visit, special considerations
  estimatedDuration?: number; // Optional: estimated visit duration in minutes
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any'; // Optional: best time to visit
}

// ============================================================================
// USER CONFIGURATION: Add your must-visit places here
// ============================================================================

export const MUST_VISIT_POIS: MustVisitPOI[] = [
  // LISBON - High Priority
  {
    id: 'oceanario-lisboa',
    name: 'Oceanário de Lisboa',
    city: 'Lisbon',
    priority: 'high',
    category: 'aquarium',
    notes: 'One of the best aquariums in Europe, perfect for kids',
    estimatedDuration: 120,
    preferredTimeOfDay: 'morning'
  },
  {
    id: 'belem-tower',
    name: 'Belém Tower',
    city: 'Lisbon',
    priority: 'high',
    category: 'landmark',
    notes: 'Iconic UNESCO World Heritage site',
    estimatedDuration: 60,
    preferredTimeOfDay: 'morning'
  },
  {
    id: 'jeronimos-monastery',
    name: 'Jerónimos Monastery',
    city: 'Lisbon',
    priority: 'high',
    category: 'landmark',
    notes: 'UNESCO World Heritage site, stunning architecture',
    estimatedDuration: 90,
    preferredTimeOfDay: 'morning'
  },
  {
    id: 'pasteis-de-belem',
    name: 'Pastéis de Belém',
    city: 'Lisbon',
    priority: 'high',
    category: 'restaurant',
    notes: 'Original pastel de nata since 1837, must-try!',
    estimatedDuration: 30,
    preferredTimeOfDay: 'any'
  },
  {
    id: 'castle-sao-jorge',
    name: 'Castle of São Jorge',
    city: 'Lisbon',
    priority: 'high',
    category: 'landmark',
    notes: 'Historic castle with panoramic city views',
    estimatedDuration: 120,
    preferredTimeOfDay: 'afternoon'
  },
  {
    id: 'tram-28',
    name: 'Tram 28 Experience',
    city: 'Lisbon',
    priority: 'high',
    category: 'activity',
    notes: 'Iconic yellow tram through historic neighborhoods, kids love it',
    estimatedDuration: 60,
    preferredTimeOfDay: 'any'
  },

  // LISBON - Medium Priority
  {
    id: 'time-out-market',
    name: 'Time Out Market Lisboa',
    city: 'Lisbon',
    priority: 'medium',
    category: 'restaurant',
    notes: 'Food hall with best local chefs, great for family dining',
    estimatedDuration: 90,
    preferredTimeOfDay: 'any'
  },
  {
    id: 'elevador-santa-justa',
    name: 'Elevador de Santa Justa',
    city: 'Lisbon',
    priority: 'medium',
    category: 'landmark',
    notes: 'Historic elevator with rooftop views',
    estimatedDuration: 45,
    preferredTimeOfDay: 'any'
  },
  {
    id: 'alfama-district',
    name: 'Alfama District',
    city: 'Lisbon',
    priority: 'medium',
    category: 'neighborhood',
    notes: 'Historic neighborhood, narrow streets, authentic Lisbon',
    estimatedDuration: 120,
    preferredTimeOfDay: 'afternoon'
  },
  {
    id: 'lisbon-zoo',
    name: 'Lisbon Zoo',
    city: 'Lisbon',
    priority: 'low',
    category: 'zoo',
    notes: 'Great for kids if time permits',
    estimatedDuration: 180,
    preferredTimeOfDay: 'morning'
  },

  // LONDON - High Priority
  {
    id: 'tower-of-london',
    name: 'Tower of London',
    city: 'London',
    priority: 'high',
    category: 'landmark',
    notes: 'Historic castle, Crown Jewels, Beefeaters - kids love it',
    estimatedDuration: 150,
    preferredTimeOfDay: 'morning'
  },
  {
    id: 'british-museum',
    name: 'British Museum',
    city: 'London',
    priority: 'high',
    category: 'museum',
    notes: 'World-class museum, free entry, Egyptian mummies fascinate kids',
    estimatedDuration: 120,
    preferredTimeOfDay: 'any'
  },
  {
    id: 'natural-history-museum',
    name: 'Natural History Museum',
    city: 'London',
    priority: 'high',
    category: 'museum',
    notes: 'Dinosaurs! Perfect for kids, free entry',
    estimatedDuration: 150,
    preferredTimeOfDay: 'morning'
  },
  {
    id: 'buckingham-palace',
    name: 'Buckingham Palace',
    city: 'London',
    priority: 'high',
    category: 'landmark',
    notes: 'Changing of the Guard ceremony (check schedule)',
    estimatedDuration: 90,
    preferredTimeOfDay: 'morning'
  },
  {
    id: 'borough-market',
    name: 'Borough Market',
    city: 'London',
    priority: 'high',
    category: 'market',
    notes: 'Historic food market, great for lunch',
    estimatedDuration: 90,
    preferredTimeOfDay: 'any'
  },

  // LONDON - Medium Priority
  {
    id: 'covent-garden',
    name: 'Covent Garden',
    city: 'London',
    priority: 'medium',
    category: 'neighborhood',
    notes: 'Street performers, shops, near theatres',
    estimatedDuration: 90,
    preferredTimeOfDay: 'afternoon'
  },
  {
    id: 'sky-garden',
    name: 'Sky Garden',
    city: 'London',
    priority: 'medium',
    category: 'landmark',
    notes: 'Free panoramic views (book in advance)',
    estimatedDuration: 60,
    preferredTimeOfDay: 'afternoon'
  },
  {
    id: 'hamleys',
    name: 'Hamleys Toy Store',
    city: 'London',
    priority: 'medium',
    category: 'shop',
    notes: 'World-famous toy store, kids will love it',
    estimatedDuration: 60,
    preferredTimeOfDay: 'any'
  },
  {
    id: 'science-museum',
    name: 'Science Museum',
    city: 'London',
    priority: 'low',
    category: 'museum',
    notes: 'Interactive exhibits, free entry',
    estimatedDuration: 120,
    preferredTimeOfDay: 'afternoon'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get must-visit POIs for a specific city
 */
export function getMustVisitForCity(city: 'Lisbon' | 'London'): MustVisitPOI[] {
  return MUST_VISIT_POIS.filter(poi => poi.city === city);
}

/**
 * Get must-visit POIs by priority level
 */
export function getMustVisitByPriority(
  city: 'Lisbon' | 'London',
  priority: 'high' | 'medium' | 'low'
): MustVisitPOI[] {
  return MUST_VISIT_POIS.filter(poi => poi.city === city && poi.priority === priority);
}

/**
 * Get all high-priority must-visit POIs for a city
 */
export function getHighPriorityPOIs(city: 'Lisbon' | 'London'): MustVisitPOI[] {
  return getMustVisitByPriority(city, 'high');
}

/**
 * Format must-visit POIs for AI prompt
 */
export function formatMustVisitForPrompt(city: 'Lisbon' | 'London'): string {
  const mustVisitPOIs = getMustVisitForCity(city);
  
  if (mustVisitPOIs.length === 0) {
    return 'No specific must-visit locations configured.';
  }

  const highPriority = mustVisitPOIs.filter(p => p.priority === 'high');
  const mediumPriority = mustVisitPOIs.filter(p => p.priority === 'medium');
  const lowPriority = mustVisitPOIs.filter(p => p.priority === 'low');

  let prompt = `\n🎯 MUST-VISIT LOCATIONS FOR ${city.toUpperCase()}:\n\n`;

  if (highPriority.length > 0) {
    prompt += `HIGH PRIORITY (MUST INCLUDE):\n`;
    highPriority.forEach(poi => {
      prompt += `- ${poi.name}`;
      if (poi.category) prompt += ` (${poi.category})`;
      if (poi.estimatedDuration) prompt += ` - ~${poi.estimatedDuration} min`;
      if (poi.preferredTimeOfDay && poi.preferredTimeOfDay !== 'any') {
        prompt += ` - Best: ${poi.preferredTimeOfDay}`;
      }
      if (poi.notes) prompt += `\n  → ${poi.notes}`;
      prompt += '\n';
    });
    prompt += '\n';
  }

  if (mediumPriority.length > 0) {
    prompt += `MEDIUM PRIORITY (STRONGLY PREFER):\n`;
    mediumPriority.forEach(poi => {
      prompt += `- ${poi.name}`;
      if (poi.category) prompt += ` (${poi.category})`;
      if (poi.notes) prompt += ` - ${poi.notes}`;
      prompt += '\n';
    });
    prompt += '\n';
  }

  if (lowPriority.length > 0) {
    prompt += `LOW PRIORITY (NICE TO HAVE):\n`;
    lowPriority.forEach(poi => {
      prompt += `- ${poi.name}`;
      if (poi.category) prompt += ` (${poi.category})`;
      prompt += '\n';
    });
  }

  return prompt;
}

/**
 * Get summary count of must-visit POIs
 */
export function getMustVisitSummary(city: 'Lisbon' | 'London'): string {
  const pois = getMustVisitForCity(city);
  const high = pois.filter(p => p.priority === 'high').length;
  const medium = pois.filter(p => p.priority === 'medium').length;
  const low = pois.filter(p => p.priority === 'low').length;
  
  return `${city}: ${high} high-priority, ${medium} medium-priority, ${low} low-priority`;
}

/**
 * Check if a POI name matches a must-visit location
 */
export function isMustVisitPOI(name: string, city: 'Lisbon' | 'London'): boolean {
  const mustVisitPOIs = getMustVisitForCity(city);
  const normalizedName = name.toLowerCase().trim();
  
  return mustVisitPOIs.some(poi => {
    const poiName = poi.name.toLowerCase().trim();
    // Check for exact match or if one contains the other
    return poiName === normalizedName || 
           poiName.includes(normalizedName) || 
           normalizedName.includes(poiName);
  });
}

