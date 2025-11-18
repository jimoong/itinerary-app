/**
 * Master POI List Generator
 * 
 * Phase 1 of the two-phase itinerary generation system.
 * Generates a comprehensive list of 40-60 POIs for the entire trip.
 */

import { Place, TripDetails } from './types';
import { callAI } from './aiProvider';
import { getMustVisitForCity, formatMustVisitForPrompt, getHighPriorityPOIs } from './mustVisitPOIs';
import { getExcludedPOIsForCityWithRuntime, formatExcludedPOIsForPrompt } from './excludedPOIs';
import { getVisitedPlaces } from './visitedPlaces';
import { cleanJsonResponse } from './openai';

export interface MasterPOI extends Omit<Place, 'id' | 'startTime' | 'transportToNext'> {
  city: 'Lisbon' | 'London';
  priority: 'high' | 'medium' | 'low';
  isMustVisit?: boolean;
}

interface MasterPOIListResponse {
  lisbon: MasterPOI[];
  london: MasterPOI[];
  totalCount: number;
}

/**
 * Generate master POI list for the entire trip
 */
export async function generateMasterPOIList(
  tripDetails: TripDetails,
  visitedPlaceNames: string[] = []
): Promise<MasterPOIListResponse> {
  console.log('\n🎯 [Phase 1] Generating Master POI List...');
  
  // Get visited places from localStorage
  const visitedPlaces = getVisitedPlaces();
  const allVisitedNames = [
    ...visitedPlaceNames,
    ...visitedPlaces.map(p => p.name)
  ];

  // Build the prompt
  const prompt = buildMasterPOIPrompt(tripDetails, allVisitedNames);
  
  try {
    console.log('[generateMasterPOIList] Calling AI for master POI list...');
    const response = await callAI(prompt);
    
    if (!response.success || !response.content) {
      throw new Error('AI response failed or empty');
    }

    console.log('[generateMasterPOIList] ✅ AI response received');
    
    // Clean and parse JSON
    const cleaned = cleanJsonResponse(response.content);
    const parsed = JSON.parse(cleaned);
    
    // Validate response structure
    if (!parsed.lisbon || !parsed.london || !Array.isArray(parsed.lisbon) || !Array.isArray(parsed.london)) {
      throw new Error('Invalid master POI list structure');
    }

    const result: MasterPOIListResponse = {
      lisbon: parsed.lisbon.map((poi: any, idx: number) => ({
        name: poi.name,
        address: poi.address,
        lat: poi.lat,
        lng: poi.lng,
        description: poi.description,
        duration: poi.duration || 90,
        category: poi.category || 'attraction',
        city: 'Lisbon' as const,
        priority: poi.priority || 'medium',
        isMustVisit: poi.isMustVisit || false,
        kidsRating: poi.kidsRating
      })),
      london: parsed.london.map((poi: any, idx: number) => ({
        name: poi.name,
        address: poi.address,
        lat: poi.lat,
        lng: poi.lng,
        description: poi.description,
        duration: poi.duration || 90,
        category: poi.category || 'attraction',
        city: 'London' as const,
        priority: poi.priority || 'medium',
        isMustVisit: poi.isMustVisit || false,
        kidsRating: poi.kidsRating
      })),
      totalCount: parsed.lisbon.length + parsed.london.length
    };

    console.log(`[generateMasterPOIList] ✅ Generated ${result.lisbon.length} Lisbon POIs and ${result.london.length} London POIs`);
    console.log(`[generateMasterPOIList] Total: ${result.totalCount} POIs`);
    
    // Log must-visit POIs
    const mustVisitCount = [...result.lisbon, ...result.london].filter(p => p.isMustVisit).length;
    console.log(`[generateMasterPOIList] Must-visit POIs included: ${mustVisitCount}`);

    return result;
    
  } catch (error) {
    console.error('[generateMasterPOIList] ❌ Error generating master POI list:', error);
    throw error;
  }
}

/**
 * Build the AI prompt for master POI list generation
 */
function buildMasterPOIPrompt(
  tripDetails: TripDetails,
  visitedPlaceNames: string[]
): string {
  const { travelers, lisbonDates, londonDates, lisbonHotel, londonHotel } = tripDetails;
  
  // Calculate days in each city
  const lisbonStart = new Date(lisbonDates.start);
  const lisbonEnd = new Date(lisbonDates.end);
  const londonStart = new Date(londonDates.start);
  const londonEnd = new Date(londonDates.end);
  
  const lisbonDays = Math.ceil((lisbonEnd.getTime() - lisbonStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const londonDays = Math.ceil((londonEnd.getTime() - londonStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Get must-visit POIs
  const lisbonMustVisit = formatMustVisitForPrompt('Lisbon');
  const londonMustVisit = formatMustVisitForPrompt('London');
  
  // Get excluded POIs
  const lisbonExcluded = formatExcludedPOIsForPrompt('Lisbon');
  const londonExcluded = formatExcludedPOIsForPrompt('London');

  // Format visited places
  let visitedInfo = '';
  if (visitedPlaceNames.length > 0) {
    visitedInfo = `\n🚫 ALREADY VISITED (DO NOT INCLUDE):\n${visitedPlaceNames.map(name => `- ${name}`).join('\n')}\n`;
  }

  const prompt = `You are a family travel expert creating a comprehensive master list of Points of Interest (POIs) for a ${lisbonDays + londonDays}-day trip to Lisbon and London.

👨‍👩‍👧‍👦 TRAVELERS:
${travelers.map(t => `- ${t.role} (${t.age} years old)`).join('\n')}

📍 TRIP OVERVIEW:
- Lisbon: ${lisbonDays} days (${lisbonDates.start} to ${lisbonDates.end})
- London: ${londonDays} days (${londonDates.start} to ${londonDates.end})

🏨 HOTELS:
- Lisbon: ${lisbonHotel.name}, ${lisbonHotel.address}
- London: ${londonHotel.name}, ${londonHotel.address}

${lisbonMustVisit}

${londonMustVisit}

${lisbonExcluded}

${londonExcluded}

${visitedInfo}

🎯 YOUR TASK:
Generate a comprehensive master list of 40-60 family-friendly POIs (Points of Interest) for the ENTIRE trip.

REQUIREMENTS:
1. **MUST-VISIT INCLUSION**: ALL high-priority must-visit locations MUST be included in your list
2. **VARIETY**: Include diverse categories: museums, landmarks, parks, restaurants, markets, activities, neighborhoods
3. **FAMILY-FRIENDLY**: All suggestions must be appropriate and engaging for children ages 6 and 9
4. **GEOGRAPHIC DISTRIBUTION**: Include POIs from different neighborhoods/areas in each city
5. **TIME CONSIDERATION**: Include both quick stops (30-60 min) and longer activities (2-3 hours)
6. **MEAL OPTIONS**: Include 8-10 restaurant/café options per city for variety
7. **AVOID DUPLICATES**: Do not include any places from the visited or excluded lists
8. **ACCURATE DETAILS**: Provide real addresses and approximate coordinates

DISTRIBUTION GUIDE:
- Lisbon: ~25-30 POIs (for ${lisbonDays} days)
- London: ~25-30 POIs (for ${londonDays} days)

PRIORITY LEVELS:
- **high**: Must-visit attractions (from must-visit list + iconic landmarks)
- **medium**: Highly recommended but flexible
- **low**: Nice-to-have if time permits

LISBON FOCUS AREAS:
- Belém (Tower, Monastery, Pastéis de Belém)
- Alfama (Castle, Tram 28, viewpoints)
- Baixa/Chiado (Elevador, Time Out Market)
- Parque das Nações (Oceanário)
- Family-friendly restaurants and cafés

LONDON FOCUS AREAS:
- Westminster (Big Ben, Parliament, Westminster Abbey)
- South Bank (London Eye, Borough Market)
- Tower/City (Tower of London, Tower Bridge)
- Museums (Natural History, British Museum, Science Museum)
- Covent Garden & West End
- Parks (Hyde Park, St. James's Park)
- Family-friendly restaurants and cafés

RESPONSE FORMAT:
Return a JSON object with this exact structure:

{
  "lisbon": [
    {
      "name": "Oceanário de Lisboa",
      "address": "Esplanada Dom Carlos I, 1990-005 Lisboa, Portugal",
      "lat": 38.7633,
      "lng": -9.0935,
      "description": "One of Europe's best aquariums with massive central tank and diverse marine life",
      "duration": 120,
      "category": "aquarium",
      "priority": "high",
      "isMustVisit": true,
      "kidsRating": "Perfect for ages 6-9, interactive exhibits"
    }
    // ... more Lisbon POIs
  ],
  "london": [
    {
      "name": "Natural History Museum",
      "address": "Cromwell Rd, South Kensington, London SW7 5BD, UK",
      "lat": 51.4967,
      "lng": -0.1764,
      "description": "World-famous museum with dinosaur skeletons, blue whale, and interactive galleries",
      "duration": 150,
      "category": "museum",
      "priority": "high",
      "isMustVisit": true,
      "kidsRating": "Excellent for kids, dinosaurs are the highlight"
    }
    // ... more London POIs
  ]
}

CRITICAL REMINDERS:
- Include ALL high-priority must-visit locations
- Mark must-visit locations with "isMustVisit": true
- Provide MORE POIs than needed (we'll distribute them intelligently in Phase 2)
- Focus on family-friendly, kid-tested attractions
- Include accurate addresses and coordinates
- Vary the duration (30 min to 3 hours)
- Include restaurants for different meal times

Generate the master POI list now:`;

  return prompt;
}

