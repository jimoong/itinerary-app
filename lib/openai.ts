import { DayItinerary, Place, TripDetails } from './types';
import { callAI } from './aiProvider';
import { SFO_TO_LISBON_FLIGHT, LISBON_TO_LONDON_FLIGHT, LONDON_TO_SFO_FLIGHT } from './constants';
import { getFixedSchedulesForDate, formatFixedScheduleForPrompt, type FixedSchedule } from './fixedSchedules';
import { formatExcludedPOIsForPrompt, getExcludedPOIsSummary } from './excludedPOIs';

// Helper function to clean JSON response from markdown code blocks
export function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.trim();
  
  // Remove ```json or ``` at the start
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  // Remove ``` at the end
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  // Try to fix common JSON issues
  try {
    // First attempt: parse as-is
    JSON.parse(cleaned);
    return cleaned;
  } catch (error) {
    console.warn('[cleanJsonResponse] Initial parse failed, attempting to fix JSON...');
    
    // Try to extract valid JSON if there's trailing content
    const jsonMatch = cleaned.match(/^(\{[\s\S]*\}|\[[\s\S]*\])(?:\s|$)/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[1]);
        console.log('[cleanJsonResponse] Successfully extracted valid JSON');
        return jsonMatch[1];
      } catch (e) {
        // Continue to more repair attempts
      }
    }
    
    // Try to repair truncated JSON
    let repaired = cleaned;
    
    // Count braces and brackets
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    
    console.log(`[cleanJsonResponse] Braces: ${openBraces}/${closeBraces}, Brackets: ${openBrackets}/${closeBrackets}`);
    
    // If JSON appears truncated, try to close it
    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      console.log('[cleanJsonResponse] Detected truncated JSON, attempting to close...');
      
      // Remove any incomplete last item (likely truncated)
      // Find the last complete object/value before truncation
      const lastCommaIndex = repaired.lastIndexOf(',');
      if (lastCommaIndex > 0) {
        repaired = repaired.substring(0, lastCommaIndex);
        console.log('[cleanJsonResponse] Removed incomplete trailing content');
      }
      
      // Close missing brackets and braces
      const newOpenBrackets = (repaired.match(/\[/g) || []).length;
      const newCloseBrackets = (repaired.match(/\]/g) || []).length;
      const newOpenBraces = (repaired.match(/{/g) || []).length;
      const newCloseBraces = (repaired.match(/}/g) || []).length;
      
      if (newOpenBrackets > newCloseBrackets) {
        repaired += ']'.repeat(newOpenBrackets - newCloseBrackets);
      }
      if (newOpenBraces > newCloseBraces) {
        repaired += '}'.repeat(newOpenBraces - newCloseBraces);
      }
      
      try {
        JSON.parse(repaired);
        console.log('[cleanJsonResponse] ✅ Successfully repaired truncated JSON');
        return repaired;
      } catch (e) {
        console.warn('[cleanJsonResponse] Repair attempt failed');
      }
    }
    
    console.warn('[cleanJsonResponse] Could not fix JSON, returning as-is');
    return cleaned;
  }
}

export async function generateDayItinerary(
  details: TripDetails,
  dayNumber: number,
  totalDays: number,
  previousPlaces?: string[]
): Promise<DayItinerary> {
  console.log(`[generateDayItinerary] Starting generation for day ${dayNumber}/${totalDays}`);
  console.log(`[generateDayItinerary] ${getExcludedPOIsSummary()}`);
  
  // Handle date assignment for 9 days
  // Lisbon: Days 1-3 (Nov 21-23)
  // Travel: Day 4 (Nov 24) - Lisbon departure + London arrival
  // London: Days 5-9 (Nov 25-29)
  let date: string;
  let city: string;
  
  if (dayNumber <= 3) {
    // Lisbon days 1-3: Nov 21-23
    const lisbonStart = new Date(details.lisbonDates.start);
    lisbonStart.setDate(lisbonStart.getDate() + (dayNumber - 1));
    date = lisbonStart.toISOString().split('T')[0];
    city = 'Lisbon';
  } else if (dayNumber === 4) {
    // Day 4: Travel day - Nov 24 (both Lisbon departure and London arrival)
    // For AI generation, we'll treat this as London to generate afternoon activities
    date = '2025-11-24';
    city = 'London'; // Generate London activities for afternoon
  } else {
    // London days 5-9: Nov 25-29
    const londonStart = new Date(details.londonDates.start);
    londonStart.setDate(londonStart.getDate() + (dayNumber - 4)); // 5-4=1 (Nov 25), 9-4=5 (Nov 29)
    date = londonStart.toISOString().split('T')[0];
    city = 'London';
  }
  
  const hotel = city === 'Lisbon' ? details.lisbonHotel : details.londonHotel;

  // Determine if this is arrival or departure day
  const isFirstDayInCity = (city === 'Lisbon' && dayNumber === 1) || (city === 'London' && dayNumber === 4);
  const isLastDayInCity = (city === 'Lisbon' && dayNumber === 4) || (city === 'London' && dayNumber === 9);
  
  // Special handling for Day 4: Departure from Lisbon (morning) + Arrival in London (afternoon)
  const isTravelDay = dayNumber === 4;
  
  // Adjust time windows
  let startTime = '09:00';
  let endTime = '20:00';
  let numActivities = '4-6';
  
  if (isFirstDayInCity) {
    startTime = city === 'Lisbon' ? '14:00' : '12:00'; // Lisbon: afternoon arrival, London: noon arrival
    endTime = '20:00';
    numActivities = '2-3';
  } else if (isLastDayInCity) {
    startTime = '09:00';
    endTime = city === 'Lisbon' ? '04:00' : '08:00'; // Lisbon: early morning departure, London: morning departure
    numActivities = '0'; // No activities on departure day - handled by flight logic
  } else if (isTravelDay && city === 'London') {
    // Day 4 London activities (after arrival)
    startTime = '12:00'; // After flight arrival and hotel check-in
    endTime = '20:00';
    numActivities = '2-3';
  }

  const dayContext = isFirstDayInCity ? `This is the ARRIVAL day in ${city}.` : 
                     isLastDayInCity ? `This is the DEPARTURE day from ${city}. DO NOT suggest any activities - just return empty places array.` :
                     isTravelDay && city === 'London' ? `This is the ARRIVAL day in ${city} (afternoon arrival from Lisbon at 10am).` :
                     `This is day ${dayNumber - (city === 'London' ? 4 : 0)} of ${city === 'Lisbon' ? 4 : 6} in ${city}.`;

  const avoidPlaces = previousPlaces && previousPlaces.length > 0 
    ? `\n\n🚫 CRITICAL - PLACES ALREADY VISITED (ABSOLUTELY DO NOT REPEAT ANY OF THESE):\n${previousPlaces.map(p => `  ❌ ${p}`).join('\n')}\n\n⚠️ YOU MUST SUGGEST COMPLETELY DIFFERENT PLACES NOT IN THIS LIST.\n⚠️ Suggesting any place from this list will result in REJECTION.\n⚠️ Focus on VARIETY - each day should explore different neighborhoods and attraction types.\n⚠️ If previous days visited museums, focus on outdoor activities, landmarks, or food experiences today.\n`
    : '';

  // Check for fixed schedules on this date
  const fixedSchedules = getFixedSchedulesForDate(date);
  const fixedSchedulesInfo = fixedSchedules.length > 0
    ? `\n\n${'='.repeat(60)}\n⚠️⚠️⚠️ FIXED SCHEDULES - PRE-BOOKED ACTIVITIES ⚠️⚠️⚠️\n${'='.repeat(60)}\n\nThe following activities are ALREADY BOOKED and CANNOT be changed:\n${fixedSchedules.map(schedule => formatFixedScheduleForPrompt(schedule)).join('\n')}\n${'='.repeat(60)}\n\n⚠️ CRITICAL INSTRUCTIONS FOR FIXED SCHEDULES:\n1. DO NOT suggest any activities during the fixed schedule times\n2. Plan activities BEFORE or AFTER the fixed schedules\n3. Consider travel time to reach fixed schedule locations\n4. If fixed schedule requires early arrival, ensure previous activity ends with enough time\n5. Include the fixed schedule as a place in your itinerary at the specified time\n6. Use the exact details provided (name, address, coordinates, duration)\n${'='.repeat(60)}\n`
    : '';

  // Get excluded POIs for this city
  const excludedPOIsInfo = formatExcludedPOIsForPrompt(city as 'Lisbon' | 'London');

  // Special constraints for flight days
  let flightDayConstraints = '';
  
  if (dayNumber === 1) {
    // Day 1: Lisbon arrival morning
    flightDayConstraints = `

⚠️ LISBON ARRIVAL DAY CONSTRAINTS FOR DAY 1:
- Arrived on flight from San Francisco at 08:10 (8:10 AM)
- After customs, baggage, and taxi to hotel: arrive at hotel around 10:00
- This is an ARRIVAL day with full day available
- Suggest 3-4 activities from 10:30 to 21:00
- Focus on: nearby Belém area (close to hotel), central Lisbon, dinner
- Keep activities relaxed after long-haul flight (jet lag)
- All activities must have start times AFTER 10:30
`;
  } else if (dayNumber === 4 && city === 'Lisbon') {
    // Day 4: Lisbon departure - NO ACTIVITIES
    flightDayConstraints = `

⚠️ LISBON DEPARTURE DAY CONSTRAINTS FOR DAY 4:
- This is a DEPARTURE day - DO NOT suggest any activities in Lisbon
- Leave hotel at 04:00 (4:00 AM) for early flight
- Flight departs at 07:00 (7:00 AM) to London
- Return EMPTY places array: { "places": [] }
`;
  } else if (dayNumber === 4 && city === 'London') {
    // Day 4: London arrival afternoon - IMPORTANT!
    flightDayConstraints = `

⚠️ LONDON ARRIVAL DAY CONSTRAINTS FOR DAY 4 (Nov 24):
- Flight arrives from Lisbon at 09:30 (9:30 AM)
- Hotel check-in at Hyatt Place City East by 11:00 (11:00 AM)
- Start London activities from 12:00 (noon) onwards
- Suggest 2-3 afternoon/evening activities in London
- Focus on areas near Hyatt Place City East or central London
- End day by 21:00 (9:00 PM)
- This is the FIRST day in London - suggest welcoming activities
`;
  } else if (dayNumber === 5) {
    // Day 5: London full day (hotel transition day)
    flightDayConstraints = `

⚠️ LONDON HOTEL TRANSITION DAY CONSTRAINTS FOR DAY 5 (Nov 25):
- Start from Hyatt Place City East in the morning
- Full day of London activities
- End day at Hyatt Regency Blackfriars (different hotel)
- Suggest 4-5 activities for full day from 09:00 to 21:00
- Plan route to end near Blackfriars area
`;
  } else if (dayNumber === 9) {
    // Day 9: London departure (Nov 29)
    flightDayConstraints = `

⚠️ CRITICAL FLIGHT DAY CONSTRAINTS FOR DAY 9 (London Departure - Nov 29):
- Flight departs London (LHR) at 11:00 to San Francisco (SFO)
- Must arrive at airport by 09:00 (2 hours before departure for international flight)
- Transportation from hotel to airport: ~45-60 minutes (leave hotel by 08:00)
- Hotel checkout time: 07:30
- ONLY suggest activities from 06:00 to 07:15 (very limited time)
- Activities MUST be within hotel or 5 minutes walking distance
- Suggest ONLY 1 quick activity (early breakfast at hotel or nearby cafe)
- NO sightseeing - focus on breakfast and final packing
- This is a very early departure day
`;
  }

  const prompt = `Generate a detailed day itinerary for a family trip to ${city}.
${fixedSchedulesInfo}${excludedPOIsInfo}
Trip Details:
- Date: ${date} (Day ${dayNumber} of ${totalDays})
- ${dayContext}
- City: ${city}
- Staying at: ${hotel.name}
- Family: Dad (46), Mom (39), Girl (9), Boy (6)
- Season: Late November (sunset around 17:30 in Lisbon, 16:00 in London)

Requirements:
- Suggest ${numActivities} DIFFERENT family-friendly activities/places suitable for children aged 6 and 9
- Start around ${startTime}, end by ${endTime}${isFirstDayInCity ? ' (arrival day - limited time)' : ''}${isLastDayInCity ? ' (departure day - limited time)' : ''}
- Include mix of activities: landmarks, museums, parks, restaurants
- **CRITICAL**: Each place must be UNIQUE - no repeats from previous days (see list above)
- **CRITICAL**: Ensure variety - if Day ${dayNumber - 1} focused on museums, focus on outdoor activities or landmarks today
- **CRITICAL**: Distribute major attractions across different days - don't cluster all top sights on one day

CRITICAL - MINIMIZE WALKING DISTANCE (CLUSTER STRATEGY):
- Group POIs by neighborhood/area to minimize total walking
- When visiting distant areas, cluster 2-3 nearby POIs together
- Use public transport to reach a neighborhood, then walk between nearby places
- Example: Take metro to Museum District → Visit 2-3 museums within walking distance → Take metro back
- Avoid zigzagging across the city - plan in geographical clusters
- Keep walking segments under 15 minutes between consecutive places
- If places are far apart (>1.5km), they should be in different clusters with transport between

CRITICAL - DO NOT SUGGEST TRANSPORTATION AS ACTIVITIES:
- Each place MUST be a specific Point of Interest (POI), attraction, restaurant, or venue
- DO NOT include activities like "Walk to hotel", "Stroll back", "Travel to", "Return to hotel"
- DO NOT include generic walking/transit activities as timeline items
- Transportation between places will be calculated automatically
- Focus ONLY on actual destinations and activities

LISBON-SPECIFIC RECOMMENDATIONS (if applicable):
- Oceanário de Lisboa: MUST-VISIT! One of world's best aquariums. Kids LOVE the giant central tank with sharks, rays, and ocean sunfish
- Tram 28: BEST FOR KIDS! Historic yellow tram through narrow streets - like an amusement park ride. Goes through Alfama, Graça, and Baixa
- Castle of São Jorge: Kids love exploring castle walls and peacocks roaming freely. Amazing views over Lisbon
- Belém Tower: Iconic fortress on the water. Quick visit, great for photos
- Jerónimos Monastery: UNESCO site with beautiful architecture. Keep visit short for kids
- Pastéis de Belém: MUST-TRY! Original custard tarts (pastel de nata). Kids think they're amazing!
- Elevador de Santa Justa: Historic elevator with viewing platform. Kids love the ride up
- Time Out Market: Food hall with variety of options. Great for picky eaters
- Parque das Nações: Modern waterfront area with cable car, riverside walk, and Oceanário
- Lisbon Zoo: Great backup activity. Cable car ride through zoo is a highlight
- Praça do Comércio: Grand waterfront square. Good for running around
- Alfama district: Charming old neighborhood with narrow streets and viewpoints

LISBON CLUSTERING EXAMPLES:
- Cluster 1 (Belém): Tram 15 → Jerónimos Monastery → Belém Tower → Pastéis de Belém (all walkable, 5-10min each)
- Cluster 2 (Alfama): Tram 28 ride → Castle of São Jorge → explore Alfama streets → viewpoints (walkable/tram)
- Cluster 3 (Parque das Nações): Metro → Oceanário de Lisboa → cable car ride → riverside walk (all walkable)
- Cluster 4 (Downtown): Metro → Elevador de Santa Justa → Rossio Square → Time Out Market (metro/walk combo)
- Cluster 5 (Chiado/Bairro Alto): Metro → Chiado shops → São Pedro de Alcântara viewpoint → nearby restaurants (walkable)
- Use metro/tram between clusters, walk within clusters

LONDON-SPECIFIC RECOMMENDATIONS (if applicable):
- Natural History Museum or Science Museum: Interactive exhibits for kids
- Tower of London: Crown Jewels and history
- West End musicals: Lion King, Matilda, Frozen (book in advance!)
- Hyde Park Winter Wonderland: Ice skating, rides, Christmas market (check opening dates)
- London Eye: Evening ride for city views
- Buckingham Palace: Changing of the Guard (check schedule)
- Christmas lights: Oxford Street, Carnaby Street (spectacular in late November)
- Borough Market or Covent Garden: Street performers

LONDON CLUSTERING EXAMPLES:
- Cluster 1 (South Kensington): Natural History Museum → Science Museum → lunch nearby (all walkable)
- Cluster 2 (Westminster): Take tube to Westminster → Big Ben → London Eye → nearby restaurant (walkable area)
- Cluster 3 (Tower/Bridge): Take tube to Tower Hill → Tower of London → Tower Bridge → Borough Market (walkable area)
- Cluster 4 (West End): Take tube to Leicester Square → Covent Garden → theatre district (walkable area)
- Use tube/bus between clusters, walk within clusters

Kid-Friendly Tips for Ages 6 & 9:
- BEST aquarium: Oceanário de Lisboa (one of world's best - kids are mesmerized!)
- Museums: Keep visits SHORT (1.5-2 hours max). Focus on highlights kids enjoy
- Tram rides: Kids LOVE Tram 28 - it's like an amusement park ride through the city!
- Custard tarts: Pastéis de Belém are a MUST-TRY - kids think they're amazing
- Castle: São Jorge has peacocks roaming free - kids love chasing them
- Elevators: Historic elevators and funiculars are instant fun for kids
- Rainy day backup: Lisbon Zoo with cable car ride through the zoo
- Reward system: Custard tarts after activities, gelato in Alfama

Transport Guidelines:
- Walking: if distance is < 1km
- Tram/Metro: if distance is 1-3km (public transport is fun for kids!)
- Taxi: if distance is > 3km or when traveling with tired children

MEAL REQUIREMENTS (CRITICAL):
- MUST include at least one restaurant for lunch (around 12-1 PM)
- MUST include at least one restaurant for dinner (around 6-7 PM) if time allows
- Restaurants should be family-friendly with options for kids
- Consider local cuisine experiences (Czech food in Prague, British classics in London)
- Include restaurants as separate timeline items with category: "restaurant"

Include accurate coordinates for each location
Each day should explore DIFFERENT neighborhoods and attractions
If possible, mention seasonal activities for late November (Christmas preparations, winter atmosphere)${avoidPlaces}${flightDayConstraints}

IMPORTANT: 
- For each activity, explain WHY it's great for kids ages 6 and 9
- Include booking tips where relevant (e.g., "Book musical tickets in advance", "Check opening hours")
- Mention atmospheric details (e.g., "fairy tale atmosphere", "warm drinks while walking")
- For evening activities, note the sunset time consideration

Return ONLY a valid JSON object with this exact structure:
{
  "places": [
    {
      "name": "Specific Place Name",
      "address": "Full address",
      "lat": latitude (number),
      "lng": longitude (number),
      "description": "Detailed description including why it's special and what kids will enjoy. Include booking tips if needed.",
      "duration": duration in minutes (number),
      "category": "restaurant|museum|park|landmark|shopping|entertainment|concert|show|tour",
      "startTime": "HH:MM" (24-hour format),
      "kidsRating": "Specific reason why this is perfect for ages 6 and 9. Mention interactive elements, visual appeal, or hands-on experiences.",
      "transportToNext": {
        "mode": "walk|taxi|metro|tram",
        "duration": estimated travel time in minutes (number),
        "distance": "distance in km" (string, e.g. "0.8 km")
      }
    }
  ]
}

${fixedSchedules.length > 0 ? `\n⚠️ REMINDER: Include the fixed schedule(s) as place(s) in your response at the exact time specified:\n${fixedSchedules.map(s => `- ${s.name} at ${s.startTime} (${s.duration} min)`).join('\n')}\n` : ''}`;

  try {
    console.log(`[generateDayItinerary] Calling AI for ${city} on ${date}...`);
    const response = await callAI(prompt);
    console.log(`[generateDayItinerary] ✅ AI GENERATED - Day ${dayNumber} (${city}) from AI API`);
    console.log(`[generateDayItinerary] Response length: ${response.content.length} characters`);
    
    const cleanedContent = cleanJsonResponse(response.content);
    
    try {
      const parsed = JSON.parse(cleanedContent);
      const places: Place[] = parsed.places.map((p: any, idx: number) => ({
        id: `${dayNumber}-${idx}`,
        ...p
      }));

      console.log(`[generateDayItinerary] ✅ Successfully parsed ${places.length} places for ${city}`);
      
      // Add flight information for day 5 (Prague to London travel day)
      const itinerary: DayItinerary = {
        date,
        dayNumber,
        city,
        hotel,
        places
      };
      
      // Add flight information for travel days
      if (dayNumber === 1) {
        itinerary.flight = SFO_TO_LISBON_FLIGHT;
      } else if (dayNumber === 5) {
        itinerary.flight = LISBON_TO_LONDON_FLIGHT;
      } else if (dayNumber === 10) {
        itinerary.flight = LONDON_TO_SFO_FLIGHT;
      }
      
      return itinerary;
    } catch (parseError) {
      console.error('[generateDayItinerary] ❌ JSON PARSE ERROR');
      console.error('Parse error:', parseError);
      console.error('First 500 chars of response:', response.content.substring(0, 500));
      console.error('Last 500 chars of response:', response.content.substring(Math.max(0, response.content.length - 500)));
      
      // If the error message contains a position, show context around that position
      if (parseError instanceof Error && parseError.message.includes('position')) {
        const posMatch = parseError.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const contextStart = Math.max(0, pos - 200);
          const contextEnd = Math.min(cleanedContent.length, pos + 200);
          console.error(`Context around position ${pos}:`);
          console.error(cleanedContent.substring(contextStart, contextEnd));
          console.error(' '.repeat(Math.min(200, pos - contextStart)) + '^--- Error here');
        }
      }
      
      throw parseError;
    }
  } catch (error) {
    console.error('[generateDayItinerary] ❌ AI API FAILED');
    console.error('Error generating itinerary:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.warn(`[generateDayItinerary] ⚠️ USING FALLBACK DATA - Day ${dayNumber} (${city})`);
    // Return fallback itinerary
    return generateFallbackItinerary(date, dayNumber, city, hotel);
  }
}

export async function regenerateDayWithChanges(
  day: DayItinerary,
  places: Place[]
): Promise<Place[]> {
  const prompt = `Re-optimize this day's itinerary with the given places.

Current Date: ${day.date}
City: ${day.city}
Places to include:
${places.map(p => `- ${p.name}: ${p.description}`).join('\n')}

Task: Adjust start times and durations to create a logical, efficient schedule.
Start around 9:00 AM. Include reasonable travel time between locations.

Return ONLY a valid JSON array with this structure:
[
  {
    "name": "Place Name",
    "address": "Full address",
    "lat": latitude,
    "lng": longitude,
    "description": "Description",
    "duration": duration in minutes,
    "category": "category",
    "startTime": "HH:MM"
  }
]`;

  try {
    console.log(`[regenerateDayWithChanges] Calling AI to re-optimize day ${day.dayNumber}...`);
    const response = await callAI(prompt);
    console.log(`[regenerateDayWithChanges] ✅ AI GENERATED - Day ${day.dayNumber} re-optimized from AI API`);
    const cleanedContent = cleanJsonResponse(response.content);
    const parsed = JSON.parse(cleanedContent);
    return parsed.map((p: any, idx: number) => ({
      id: places[idx]?.id || `${day.dayNumber}-${idx}`,
      ...p
    }));
  } catch (error) {
    console.error('[regenerateDayWithChanges] ❌ AI API FAILED');
    console.error('Error regenerating day:', error);
    console.warn(`[regenerateDayWithChanges] ⚠️ USING ORIGINAL PLACES - Day ${day.dayNumber}`);
    return places;
  }
}

export async function regenerateSinglePlace(
  dayNumber: number,
  placeIndex: number,
  currentPlaces: Place[],
  details: TripDetails,
  additionalAvoidPlaces?: string[]
): Promise<Place> {
  console.log('regenerateSinglePlace called with:', { dayNumber, placeIndex, placesCount: currentPlaces.length, additionalAvoidPlaces: additionalAvoidPlaces?.length || 0 });
  
  // Determine city based on day number (9 days total)
  const city = dayNumber <= 3 ? 'Lisbon' : 'London';
  let date: string;
  
  if (dayNumber <= 3) {
    const lisbonStart = new Date(details.lisbonDates.start);
    lisbonStart.setDate(lisbonStart.getDate() + (dayNumber - 1));
    date = lisbonStart.toISOString().split('T')[0];
  } else if (dayNumber === 4) {
    date = '2025-11-24';
  } else {
    const londonStart = new Date(details.londonDates.start);
    londonStart.setDate(londonStart.getDate() + (dayNumber - 4));
    date = londonStart.toISOString().split('T')[0];
  }

  const currentPlace = currentPlaces[placeIndex];
  if (!currentPlace) {
    console.error('Place not found at index:', placeIndex);
    throw new Error(`Place not found at index ${placeIndex}`);
  }
  
  const previousPlace = placeIndex > 0 ? currentPlaces[placeIndex - 1] : null;
  const nextPlace = placeIndex < currentPlaces.length - 1 ? currentPlaces[placeIndex + 1] : null;
  
  // Build list of places to avoid (all current places except the one we're replacing)
  const placesToAvoid = [
    ...currentPlaces
      .filter((_, idx) => idx !== placeIndex)
      .map(p => p.name),
    ...(additionalAvoidPlaces || [])
  ];

  // Determine time constraints
  const suggestedStartTime = previousPlace 
    ? calculateEndTime(previousPlace.startTime || '09:00', previousPlace.duration + (previousPlace.transportToNext?.duration || 0))
    : currentPlace.startTime || '09:00';
    
  const timeUntilNext = nextPlace && nextPlace.startTime
    ? calculateTimeDifference(suggestedStartTime, nextPlace.startTime)
    : 180; // Default 3 hours

  // Get excluded POIs for this city
  const excludedPOIsInfo = formatExcludedPOIsForPrompt(city as 'Lisbon' | 'London');

  const prompt = `Generate a SINGLE alternative place for a family trip to ${city}.

CRITICAL: You MUST suggest a COMPLETELY DIFFERENT place than "${currentPlace.name}". The new place should be a fresh alternative, not the same location.
${excludedPOIsInfo}
Context:
- Date: ${date} (Day ${dayNumber})
- City: ${city}
- Family: Dad (46), Mom (39), Girl (9), Boy (6)
- Current time slot: ${suggestedStartTime} (${timeUntilNext} minutes available)
- Location context: ${previousPlace ? `Coming from ${previousPlace.name}` : 'Starting the day'}
  ${nextPlace ? `Going to ${nextPlace.name} next` : 'Ending activities'}

PLACES TO AVOID (DO NOT SUGGEST ANY OF THESE):
${placesToAvoid.map(p => `  ❌ ${p}`).join('\n')}

Requirements:
- MUST be geographically different from "${currentPlace.name}"
- Should fit the time slot (${timeUntilNext} minutes including visit + travel)
- Should be geographically convenient (close to ${previousPlace?.name || nextPlace?.name || 'hotel'})
- Must be family-friendly for kids aged 6 and 9
- Similar category to original: ${currentPlace.category}
- Provide variety - suggest something the family hasn't seen yet

CRITICAL - MUST BE A SPECIFIC PLACE:
- Suggest a specific Point of Interest (POI), attraction, restaurant, or venue
- DO NOT suggest transportation activities like "Walk to", "Stroll", "Travel to"
- Must be an actual destination with a real address and coordinates

${city === 'Lisbon' ? `
LISBON ALTERNATIVES (choose ONE that's NOT in the avoid list):
- Museums: Oceanário de Lisboa (BEST for kids!), Museu da Marinha, Pavilhão do Conhecimento (science museum), Museu Nacional do Azulejo
- Activities: Tram 28 ride (kids LOVE it!), Castle of São Jorge (peacocks!), Elevador de Santa Justa, cable car in Parque das Nações
- Food: Pastéis de Belém (custard tarts!), Time Out Market, seafood restaurants, traditional Portuguese restaurants
- Landmarks: Belém Tower, Jerónimos Monastery, Praça do Comércio, Alfama district viewpoints
- Parks: Parque das Nações (waterfront), Jardim da Estrela, Parque Eduardo VII
- Markets: Time Out Market, Feira da Ladra (flea market)
` : `
LONDON ALTERNATIVES (choose ONE that's NOT in the avoid list):
- Museums: Natural History Museum, Science Museum, British Museum, V&A Museum
- Activities: West End musicals, London Eye, Tower of London, Thames River Cruise
- Food: Borough Market, Dishoom, The Ivy Market Grill, Sketch
- Landmarks: Buckingham Palace, Tower Bridge, Big Ben, St Paul's Cathedral, Sky Garden
- Parks: Hyde Park, Regent's Park, Greenwich Park, Primrose Hill
- Markets: Camden Market, Portobello Road, Columbia Road Flower Market
`}

Return ONLY a valid JSON object (NOT an array) with this structure:
{
  "name": "Specific Place Name (MUST be different from ${currentPlace.name})",
  "address": "Full address",
  "lat": latitude,
  "lng": longitude,
  "description": "Detailed description with kid-friendly highlights",
  "duration": duration in minutes (number),
  "category": "restaurant|museum|park|landmark|shopping|entertainment",
  "startTime": "${suggestedStartTime}",
  "kidsRating": "Why this is perfect for ages 6-9",
  "transportToNext": {
    "mode": "${nextPlace ? 'walk|taxi|metro|tram' : 'walk'}",
    "duration": estimated travel time in minutes,
    "distance": "distance in km"
  }
}`;

  try {
    console.log(`[regenerateSinglePlace] Calling AI to regenerate place at index ${placeIndex} on day ${dayNumber}...`);
    const response = await callAI(prompt);
    const cleanedContent = cleanJsonResponse(response.content);
    const parsed = JSON.parse(cleanedContent);
    
    // Validate that the new place is actually different
    if (parsed.name.toLowerCase() === currentPlace.name.toLowerCase()) {
      console.warn('[regenerateSinglePlace] AI returned the same place, retrying with more explicit prompt...');
      // Try one more time with even more emphasis
      const retryPrompt = `You are a travel planning assistant. You MUST provide a different alternative location. Always respond with valid JSON only.\n\nURGENT: The previous suggestion "${parsed.name}" is the SAME as the current place. Please suggest a COMPLETELY DIFFERENT ${currentPlace.category} in ${city} for the same time slot (${suggestedStartTime}). Avoid these: ${placesToAvoid.join(', ')}`;
      
      const retryResponse = await callAI(retryPrompt);
      const retryCleanedContent = cleanJsonResponse(retryResponse.content);
      const retryParsed = JSON.parse(retryCleanedContent);
      console.log(`[regenerateSinglePlace] ✅ AI GENERATED - Place regenerated (retry) from AI API: ${retryParsed.name}`);
      return {
        id: currentPlace.id,
        ...retryParsed
      };
    }
    
    console.log(`[regenerateSinglePlace] ✅ AI GENERATED - Place regenerated from AI API: ${parsed.name}`);
    return {
      id: currentPlace.id,
      ...parsed
    };
  } catch (error) {
    console.error('[regenerateSinglePlace] ❌ AI API FAILED');
    console.error('Error regenerating place:', error);
    console.warn(`[regenerateSinglePlace] ⚠️ KEEPING ORIGINAL PLACE - ${currentPlace.name}`);
    // Return original place if regeneration fails
    return currentPlace;
  }
}

// Helper function to calculate end time
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

// Helper function to calculate time difference in minutes
function calculateTimeDifference(start: string, end: string): number {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  return endTotal - startTotal;
}

function getDatesArray(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function generateFallbackItinerary(
  date: string,
  dayNumber: number,
  city: string,
  hotel: any
): DayItinerary {
  const isFirstDayInCity = (city === 'Lisbon' && dayNumber === 1) || (city === 'London' && dayNumber === 5);
  const isLastDayInCity = (city === 'Lisbon' && dayNumber === 4) || (city === 'London' && dayNumber === 10);
  
  const lisbonActivitiesByDay: { [key: number]: Place[] } = {
    1: [ // Nov 21 - Arrival day - afternoon/evening only
      {
        id: `${dayNumber}-0`,
        name: 'Alfama District Walk',
        address: 'Alfama, 1100 Lisbon, Portugal',
        lat: 38.7131,
        lng: -9.1288,
        description: 'Explore Lisbon\'s oldest neighborhood with narrow streets and colorful tiles. Perfect first evening activity.',
        duration: 90,
        category: 'landmark',
        startTime: '17:30',
        kidsRating: 'Kids love the winding streets and discovering hidden viewpoints!',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.6 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Chapitô à Mesa',
        address: 'Costa do Castelo 7, 1100-179 Lisbon, Portugal',
        lat: 38.7140,
        lng: -9.1327,
        description: 'Restaurant with stunning views over Lisbon. Perfect for first dinner with a view.',
        duration: 90,
        category: 'restaurant',
        startTime: '19:30',
        kidsRating: 'Amazing sunset views! Family-friendly menu with Portuguese classics.'
      }
    ],
    2: [ // Nov 22 - Full day - Belém area
      {
        id: `${dayNumber}-0`,
        name: 'Jerónimos Monastery',
        address: 'Praça do Império 1400-206, Lisbon, Portugal',
        lat: 38.6979,
        lng: -9.2061,
        description: 'UNESCO World Heritage site with stunning Manueline architecture. Keep visit short for kids.',
        duration: 90,
        category: 'landmark',
        startTime: '09:30',
        kidsRating: 'Beautiful cloisters! Kids enjoy the detailed stone carvings.',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.6 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Belém Tower',
        address: 'Av. Brasília, 1400-038 Lisbon, Portugal',
        lat: 38.6916,
        lng: -9.2160,
        description: 'Iconic 16th-century fortress on the Tagus River. Quick visit, great for photos.',
        duration: 60,
        category: 'landmark',
        startTime: '11:30',
        kidsRating: 'Kids love exploring the tower rooms and seeing cannons!',
        transportToNext: {
          mode: 'walk',
          duration: 5,
          distance: '0.4 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Pastéis de Belém',
        address: 'R. Belém 84-92, 1300-085 Lisbon, Portugal',
        lat: 38.6976,
        lng: -9.2033,
        description: 'Original custard tart bakery since 1837. MUST-TRY for the famous pastel de nata!',
        duration: 45,
        category: 'restaurant',
        startTime: '13:00',
        kidsRating: 'Kids LOVE these warm custard tarts! Get them fresh from the oven.',
        transportToNext: {
          mode: 'tram',
          duration: 20,
          distance: '5.2 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Time Out Market',
        address: 'Av. 24 de Julho 49, 1200-479 Lisbon, Portugal',
        lat: 38.7072,
        lng: -9.1458,
        description: 'Food hall with variety of Portuguese cuisine. Great for picky eaters!',
        duration: 90,
        category: 'restaurant',
        startTime: '15:30',
        kidsRating: 'Something for everyone! Kids can choose what they like.'
      }
    ],
    3: [ // Nov 23 - Full day - Oceanário & Parque das Nações
      {
        id: `${dayNumber}-0`,
        name: 'Oceanário de Lisboa',
        address: 'Esplanada Dom Carlos I s/nº, 1990-005 Lisbon, Portugal',
        lat: 38.7633,
        lng: -9.0935,
        description: 'One of the world\'s best aquariums! Giant central tank with sharks, rays, and ocean sunfish.',
        duration: 150,
        category: 'museum',
        startTime: '09:30',
        kidsRating: 'MUST-VISIT! Kids are mesmerized by the giant tank. One of the highlights of Lisbon!',
        transportToNext: {
          mode: 'walk',
          duration: 5,
          distance: '0.3 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Parque das Nações Cable Car',
        address: 'Passeio das Tágides, 1990-280 Lisbon, Portugal',
        lat: 38.7686,
        lng: -9.0943,
        description: 'Cable car ride over the Tagus River with panoramic views of modern Lisbon.',
        duration: 30,
        category: 'entertainment',
        startTime: '12:30',
        kidsRating: 'Kids LOVE the cable car ride! Great views of the river and Vasco da Gama Bridge.',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.7 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Vasco da Gama Shopping',
        address: 'Av. Dom João II 40, 1990-094 Lisbon, Portugal',
        lat: 38.7681,
        lng: -9.0958,
        description: 'Modern shopping center with food court. Great for lunch with variety of options.',
        duration: 90,
        category: 'restaurant',
        startTime: '13:30',
        kidsRating: 'Food court has something for everyone! Indoor play area available.',
        transportToNext: {
          mode: 'walk',
          duration: 15,
          distance: '1.2 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Parque das Nações Riverside Walk',
        address: 'Parque das Nações, Lisbon, Portugal',
        lat: 38.7686,
        lng: -9.0943,
        description: 'Scenic waterfront promenade with modern art installations and gardens.',
        duration: 90,
        category: 'park',
        startTime: '15:30',
        kidsRating: 'Nice walk along the river. Kids can run around in the open spaces!'
      }
    ],
    4: [ // Nov 24 - Full day - Castle & Tram 28
      {
        id: `${dayNumber}-0`,
        name: 'Castle of São Jorge',
        address: 'R. de Santa Cruz do Castelo, 1100-129 Lisbon, Portugal',
        lat: 38.7139,
        lng: -9.1334,
        description: 'Medieval castle with peacocks roaming freely. Amazing panoramic views of Lisbon!',
        duration: 120,
        category: 'landmark',
        startTime: '09:30',
        kidsRating: 'Kids LOVE chasing the peacocks! Exploring castle walls is an adventure.',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.7 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Tram 28 Ride',
        address: 'Largo Portas do Sol, 1100 Lisbon, Portugal',
        lat: 38.7121,
        lng: -9.1288,
        description: 'Historic yellow tram through narrow streets of Alfama, Graça, and Baixa.',
        duration: 60,
        category: 'entertainment',
        startTime: '12:00',
        kidsRating: 'BEST activity! Kids think it\'s like an amusement park ride through the city!',
        transportToNext: {
          mode: 'tram',
          duration: 15,
          distance: '2.1 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Elevador de Santa Justa',
        address: 'R. do Ouro, 1150-060 Lisbon, Portugal',
        lat: 38.7121,
        lng: -9.1394,
        description: 'Historic iron elevator with viewing platform at the top. Quick but fun experience!',
        duration: 45,
        category: 'landmark',
        startTime: '13:30',
        kidsRating: 'Kids love the elevator ride up! Great views from the platform.',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.5 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Praça do Comércio',
        address: 'Praça do Comércio, 1100-148 Lisbon, Portugal',
        lat: 38.7077,
        lng: -9.1365,
        description: 'Grand waterfront square with yellow arches. Perfect for sunset photos!',
        duration: 60,
        category: 'landmark',
        startTime: '15:00',
        kidsRating: 'Huge open square where kids can run around! Beautiful at sunset.'
      }
    ],
    5: [ // Nov 25 - Departure day - morning only
      {
        id: `${dayNumber}-0`,
        name: 'Miradouro de Santa Luzia',
        address: 'Largo Santa Luzia, 1100-487 Lisbon, Portugal',
        lat: 38.7118,
        lng: -9.1300,
        description: 'Beautiful viewpoint with azulejo tiles. Perfect for farewell photos of Lisbon!',
        duration: 45,
        category: 'landmark',
        startTime: '09:00',
        kidsRating: 'Great views! Kids can spot the river and red rooftops.',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.5 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Alfama Breakfast Café',
        address: 'Alfama, 1100 Lisbon, Portugal',
        lat: 38.7131,
        lng: -9.1288,
        description: 'Traditional Portuguese café for farewell breakfast. Try pastéis de nata one last time!',
        duration: 60,
        category: 'restaurant',
        startTime: '10:00',
        kidsRating: 'Final custard tarts! Kids will miss these when we leave.'
      }
    ]
  };

  const londonActivitiesByDay: { [key: number]: Place[] } = {
    4: [ // Nov 24 - Arrival day from Lisbon - afternoon/evening only
      {
        id: `${dayNumber}-0`,
        name: 'Borough Market',
        address: '8 Southwark St, London SE1 1TL, United Kingdom',
        lat: 51.5054,
        lng: -0.0910,
        description: 'Historic food market near London Bridge. Great for lunch with diverse international food stalls. Close to hotel area.',
        duration: 90,
        category: 'restaurant',
        startTime: '12:30',
        kidsRating: 'Kids love the variety! From fresh donuts to international street food. Vibrant atmosphere!',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.8 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Tower Bridge',
        address: 'Tower Bridge Rd, London SE1 2UP, United Kingdom',
        lat: 51.5055,
        lng: -0.0754,
        description: 'Iconic London landmark with glass floor walkway. Great first London experience and photo opportunity!',
        duration: 60,
        category: 'landmark',
        startTime: '14:30',
        kidsRating: 'Walking on the glass floor is thrilling! Amazing views of the Thames and city.',
        transportToNext: {
          mode: 'walk',
          duration: 15,
          distance: '1.2 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Dinner near hotel',
        address: 'Commercial Rd, London E1, United Kingdom',
        lat: 51.5155,
        lng: -0.0639,
        description: 'Casual dinner near Hyatt Place City East. Many family-friendly options in the area.',
        duration: 90,
        category: 'restaurant',
        startTime: '18:00',
        kidsRating: 'Relaxed first evening after travel. Easy walk back to hotel for rest.'
      }
    ],
    5: [ // Nov 25 - Hotel transition day - full day
      {
        id: `${dayNumber}-0`,
        name: 'Hyde Park Winter Wonderland',
        address: 'Hyde Park, London W2 2UH, United Kingdom',
        lat: 51.5073,
        lng: -0.1657,
        description: 'MUST-VISIT! Large outdoor Christmas festival with rides, ice skating rink, Christmas market, and food stalls. Check opening dates for late November.',
        duration: 180,
        category: 'entertainment',
        startTime: '15:00',
        kidsRating: 'TOP PRIORITY! Perfect for burning energy after travel. Ice skating, carnival rides, hot chocolate - kids paradise!',
        transportToNext: {
          mode: 'metro',
          duration: 15,
          distance: '2.1 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Dinner near Paddington',
        address: 'Paddington Station, London W2 1HQ, United Kingdom',
        lat: 51.5154,
        lng: -0.1755,
        description: 'Family-friendly dining options near the station. Many casual restaurants with varied menus.',
        duration: 90,
        category: 'restaurant',
        startTime: '18:30',
        kidsRating: 'Casual dining perfect for tired travelers. Fish & chips or pizza - kid favorites!'
      }
    ],
    6: [ // Nov 26 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Natural History Museum',
        address: 'Cromwell Rd, London SW7 5BD, United Kingdom',
        lat: 51.4967,
        lng: -0.1764,
        description: 'World-famous museum with dinosaur skeletons, interactive exhibits, and the massive blue whale. FREE admission! Allow 3+ hours.',
        duration: 210,
        category: 'museum',
        startTime: '09:30',
        kidsRating: 'KIDS LOVE THIS! Giant dinosaur skeletons, earthquake simulator, interactive zones. The T-Rex and blue whale are unforgettable!',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.7 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Science Museum Café',
        address: 'Exhibition Rd, South Kensington, London SW7 2DD, United Kingdom',
        lat: 51.4978,
        lng: -0.1746,
        description: 'Casual café with kid-friendly menu. Can also explore Science Museum briefly if time allows (also FREE).',
        duration: 90,
        category: 'restaurant',
        startTime: '13:00',
        kidsRating: 'Convenient and kid-friendly. If kids aren\'t museum-ed out, Science Museum has hands-on exhibits they\'ll enjoy!',
        transportToNext: {
          mode: 'metro',
          duration: 20,
          distance: '3.2 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'West End Musical - Lion King or Matilda',
        address: 'Lyceum Theatre or Cambridge Theatre, London WC2, United Kingdom',
        lat: 51.5118,
        lng: -0.1204,
        description: 'TOP EVENING RECOMMENDATION! Book tickets IN ADVANCE for Lion King (Lyceum) or Matilda (Cambridge). Family-friendly musicals perfect for ages 6-9.',
        duration: 180,
        category: 'entertainment',
        startTime: '17:30',
        kidsRating: 'ABSOLUTELY UNMISSABLE! These shows are spectacular and age-appropriate. Lion King puppetry or Matilda magic - both amazing. Book early!'
      }
    ],
    7: [ // Nov 27 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Tower of London',
        address: 'London EC3N 4AB, United Kingdom',
        lat: 51.5081,
        lng: -0.0759,
        description: 'Historic fortress with Crown Jewels, Beefeater tours, and medieval history. Book tickets online to skip lines!',
        duration: 180,
        category: 'landmark',
        startTime: '09:00',
        kidsRating: 'Real castle with actual crowns and jewels! The Beefeater guides tell engaging stories. Kids love the Tower Ravens!',
        transportToNext: {
          mode: 'walk',
          duration: 12,
          distance: '0.9 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'St. Katharine Docks',
        address: '50 St Katharine\'s Way, London E1W 1LA, United Kingdom',
        lat: 51.5067,
        lng: -0.0712,
        description: 'Picturesque marina with waterfront restaurants. Casual lunch with views of yachts.',
        duration: 90,
        category: 'restaurant',
        startTime: '12:30',
        kidsRating: 'Beautiful harbor setting. Kids can watch boats while eating. Relaxed atmosphere.',
        transportToNext: {
          mode: 'metro',
          duration: 18,
          distance: '2.8 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Christmas Lights Tour - Oxford Street & Carnaby Street',
        address: 'Oxford Street, London W1D, United Kingdom',
        lat: 51.5155,
        lng: -0.1417,
        description: 'Walk through London\'s most spectacular Christmas light displays. Oxford Street, Regent Street, and Carnaby Street are breathtaking in late November!',
        duration: 90,
        category: 'landmark',
        startTime: '16:00',
        kidsRating: 'MAGICAL! Millions of twinkling lights overhead. Kids are amazed by the elaborate displays. Perfect for photos!',
        transportToNext: {
          mode: 'walk',
          duration: 15,
          distance: '1.1 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'London Eye Night Ride',
        address: 'Riverside Building, County Hall, London SE1 7PB, United Kingdom',
        lat: 51.5033,
        lng: -0.1196,
        description: 'Giant observation wheel with panoramic city views. Evening ride shows London illuminated. Book tickets online in advance!',
        duration: 60,
        category: 'entertainment',
        startTime: '18:00',
        kidsRating: 'Spectacular night views! The 30-minute rotation shows the entire lit-up city. Safe capsules perfect for families.'
      }
    ],
    8: [ // Nov 28 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'British Museum',
        address: 'Great Russell St, London WC1B 3DG, United Kingdom',
        lat: 51.5194,
        lng: -0.1270,
        description: 'World-class museum with ancient artifacts including Egyptian mummies and Rosetta Stone. FREE admission!',
        duration: 180,
        category: 'museum',
        startTime: '10:00',
        kidsRating: 'Kids love the Egyptian mummies and ancient treasures! Interactive family trails available.',
        transportToNext: {
          mode: 'walk',
          duration: 12,
          distance: '0.9 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Dishoom Covent Garden',
        address: '12 Upper St Martin\'s Ln, London WC2H 9FB, United Kingdom',
        lat: 51.5126,
        lng: -0.1270,
        description: 'Popular Indian restaurant with family-friendly atmosphere and delicious food.',
        duration: 90,
        category: 'restaurant',
        startTime: '13:30',
        kidsRating: 'Kids menu available. Flavorful dishes that aren\'t too spicy!',
        transportToNext: {
          mode: 'walk',
          duration: 5,
          distance: '0.4 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Leicester Square & Piccadilly Circus',
        address: 'Leicester Square, London WC2H 7NA, United Kingdom',
        lat: 51.5103,
        lng: -0.1301,
        description: 'Vibrant entertainment district with street performers and iconic neon lights.',
        duration: 60,
        category: 'landmark',
        startTime: '15:30',
        kidsRating: 'Bustling atmosphere with street performers! Great for people-watching.',
        transportToNext: {
          mode: 'metro',
          duration: 15,
          distance: '2.5 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Dinner near hotel',
        address: 'Blackfriars, London SE1, United Kingdom',
        lat: 51.5123,
        lng: -0.1047,
        description: 'Relaxed dinner near Hyatt Regency Blackfriars.',
        duration: 90,
        category: 'restaurant',
        startTime: '18:00',
        kidsRating: 'Easy evening near hotel for packing and rest.'
      }
    ],
    9: [ // Nov 29 - Departure day - morning only
      {
        id: `${dayNumber}-0`,
        name: 'Hotel Breakfast',
        address: 'Hyatt Regency London Blackfriars, 1 Blackfriars, London SE1 8NZ',
        lat: 51.5123,
        lng: -0.1047,
        description: 'Quick breakfast at hotel before departure.',
        duration: 45,
        category: 'restaurant',
        startTime: '06:30',
        kidsRating: 'Final English breakfast! Early start for the flight home.'
      }
    ]
  };

  const places = city === 'Lisbon' 
    ? lisbonActivitiesByDay[dayNumber] || []
    : londonActivitiesByDay[dayNumber] || [];

  const itinerary: DayItinerary = {
    date,
    dayNumber,
    city,
    hotel,
    places
  };
  
  // Add flight information for travel days
  if (dayNumber === 1) {
    itinerary.flight = SFO_TO_LISBON_FLIGHT;
  } else if (dayNumber === 4) {
    itinerary.flight = LISBON_TO_LONDON_FLIGHT;
  } else if (dayNumber === 9) {
    itinerary.flight = LONDON_TO_SFO_FLIGHT;
  }
  
  return itinerary;
}

