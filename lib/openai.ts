import { DayItinerary, Place, TripDetails } from './types';
import { callAI } from './aiProvider';
import { SFO_TO_PARIS_FLIGHT, PARIS_TO_LONDON_TRAIN, LONDON_TO_SFO_FLIGHT } from './constants';

// Helper function to clean JSON response from markdown code blocks
function cleanJsonResponse(content: string): string {
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
  
  // Handle date assignment for 9 days with overlap on Nov 25
  let date: string;
  let city: string;
  
  if (dayNumber <= 5) {
    // Paris days 1-5: Nov 21-25
    const parisStart = new Date(details.parisDates.start);
    parisStart.setDate(parisStart.getDate() + (dayNumber - 1));
    date = parisStart.toISOString().split('T')[0];
    city = 'Paris';
  } else {
    // London days 6-9: Nov 25-28
    const londonStart = new Date(details.londonDates.start);
    londonStart.setDate(londonStart.getDate() + (dayNumber - 6));
    date = londonStart.toISOString().split('T')[0];
    city = 'London';
  }
  
  const hotel = city === 'Paris' ? details.parisHotel : details.londonHotel;

  // Determine if this is arrival or departure day
  const isFirstDayInCity = (city === 'Paris' && dayNumber === 1) || (city === 'London' && dayNumber === 6);
  const isLastDayInCity = (city === 'Paris' && dayNumber === 5) || (city === 'London' && dayNumber === 9);
  
  // Adjust time windows
  let startTime = '09:00';
  let endTime = '20:00';
  let numActivities = '4-6';
  
  if (isFirstDayInCity) {
    startTime = '14:00'; // Assume afternoon arrival
    endTime = '20:00';
    numActivities = '2-3';
  } else if (isLastDayInCity) {
    startTime = '09:00';
    endTime = '14:00'; // Assume afternoon departure
    numActivities = '2-3';
  }

  const dayContext = isFirstDayInCity ? `This is the ARRIVAL day in ${city}.` : 
                     isLastDayInCity ? `This is the DEPARTURE day from ${city}.` :
                     `This is day ${dayNumber - (city === 'London' ? 5 : 0)} of ${city === 'Paris' ? 5 : 4} in ${city}.`;

  const avoidPlaces = previousPlaces && previousPlaces.length > 0 
    ? `\n\nIMPORTANT: DO NOT suggest these places as they were visited on previous days:\n${previousPlaces.join('\n')}`
    : '';

  // Special constraints for flight days
  let flightDayConstraints = '';
  
  if (dayNumber === 1) {
    // Day 1: Paris arrival afternoon
    flightDayConstraints = `

⚠️ PARIS ARRIVAL DAY CONSTRAINTS FOR DAY 1:
- Arrived on flight UA990 from San Francisco at 13:45 (1:45 PM)
- After customs, baggage, and RER/taxi to hotel: arrive at hotel around 15:30-16:00
- This is an ARRIVAL day but with afternoon/evening time available
- Suggest 2-3 light activities from 16:30 to 21:30
- Focus on: nearby walk to Eiffel Tower (close to hotel), dinner near hotel
- Keep activities relaxed after long-haul flight (jet lag)
- All activities must have start times AFTER 16:30
`;
  } else if (dayNumber === 5) {
    // Day 5: Paris departure ONLY (London arrival is Day 6)
    flightDayConstraints = `

⚠️ PARIS DEPARTURE DAY CONSTRAINTS FOR DAY 5:
- Eurostar train to London departs at 12:30 from Gare du Nord
- Must check out of hotel by 11:00 AM
- Must arrive at Gare du Nord by 11:30 (1 hour before departure for customs/security)
- Morning activities ONLY from 08:00 to 10:30
- Suggest ONLY 1 quick activity (early breakfast at hotel or nearby café)
- NO sightseeing - focus on breakfast and final packing
- This is a morning departure day with train travel
`;
  } else if (dayNumber === 6) {
    // Day 6: London arrival afternoon
    flightDayConstraints = `

⚠️ LONDON ARRIVAL DAY CONSTRAINTS FOR DAY 6:
- Arrived on Eurostar train from Paris at 13:57 (1:57 PM)
- After transport to hotel: arrive at hotel around 14:45-15:00
- This is an ARRIVAL day with afternoon/evening time available
- Suggest 2-3 activities from 15:30 to 21:30
- Focus on: nearby attractions, dinner near hotel, evening walk
- Keep first day relaxed after train journey
- All activities must have start times AFTER 15:30
`;
  } else if (dayNumber === 9) {
    // Day 9: London departure
    flightDayConstraints = `

⚠️ CRITICAL FLIGHT DAY CONSTRAINTS FOR DAY 9 (London Departure):
- Flight VS 19 departs London (LHR) at 11:30 to San Francisco (SFO)
- Must arrive at airport by 09:30 (2 hours before departure for international flight)
- Transportation from hotel to airport: ~45-60 minutes (leave hotel by 08:30)
- Hotel checkout time: 08:00
- ONLY suggest activities from 06:00 to 07:45 (very limited time)
- Activities MUST be within hotel or 5 minutes walking distance
- Suggest ONLY 1 quick activity (early breakfast at hotel or nearby cafe)
- NO sightseeing - focus on breakfast and final packing
- This is a very early departure day
`;
  }

  const prompt = `Generate a detailed day itinerary for a family trip to ${city}.

Trip Details:
- Date: ${date} (Day ${dayNumber} of ${totalDays})
- ${dayContext}
- City: ${city}
- Staying at: ${hotel.name}
- Family: Dad (46), Mom (39), Girl (9), Boy (6)
- Season: Late November (sunset around 17:00 in Paris, 16:00 in London)

Requirements:
- Suggest ${numActivities} DIFFERENT family-friendly activities/places suitable for children aged 6 and 9
- Start around ${startTime}, end by ${endTime}${isFirstDayInCity ? ' (arrival day - limited time)' : ''}${isLastDayInCity ? ' (departure day - limited time)' : ''}
- Include mix of activities: landmarks, museums, parks, restaurants

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

PARIS-SPECIFIC RECOMMENDATIONS (if applicable):
- Jardin du Luxembourg: BEST FOR AGES 6-9! Giant playground with zipline, climbing, trampolines (small fee). Add puppet theater and toy sailboats in pond
- Musée d'Orsay: MUST-VISIT! Shorter & manageable. Kids love giant clock + animal sculptures. Impressionist art in beautiful railway station
- Eiffel Tower: Go early! Kids love elevator ride and shaking walkways. Book skip-the-line tickets
- Seine River Cruise: Do at NIGHT for lights! Warm indoor seats (weather-proof). Surprisingly fun for kids
- Louvre Museum: 1.5-2 hours MAX! Focus on: Egyptian mummies, Greek sculptures, Winged Victory, Napoleon III apartments. Don't do full museum day
- Montmartre Funicular: Kids LOVE this mini cable-car! Quick reward: crêpes at the top. Visit Sacré-Cœur and artists' square
- Angelina Tea House: Over-the-top hot chocolate - kids think it's amazing!
- Paris Aquarium (Trocadéro): Perfect rainy-day activity, near Eiffel Tower
- Arc de Triomphe: Climb to top for panoramic views
- Musée Grévin: Wax museum (interactive for kids)
- Champs-Élysées: Christmas lights and decorations

PARIS CLUSTERING EXAMPLES:
- Cluster 1 (Eiffel/Trocadéro): Metro → Eiffel Tower (go early!) → Paris Aquarium → Seine night cruise (walkable)
- Cluster 2 (Louvre/Angelina): Metro → Louvre (1.5-2hrs: mummies, sculptures) → Angelina hot chocolate → Tuileries Garden (walkable)
- Cluster 3 (Orsay/Left Bank): Metro → Musée d'Orsay (giant clock!) → Seine walk → nearby café (walkable)
- Cluster 4 (Montmartre): Metro → Montmartre funicular (kids love it!) → Sacré-Cœur → crêpes at top (walkable)
- Cluster 5 (Luxembourg): Metro → Jardin du Luxembourg playground (BEST for kids 6-9: zipline, climbing!) → toy sailboats → puppet theater (walkable)
- Cluster 6 (Champs-Élysées): Metro → Arc de Triomphe → Champs-Élysées walk → Christmas lights (walkable)
- Use metro between clusters, walk within clusters

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
- BEST playground: Jardin du Luxembourg (zipline, trampolines, climbing - small fee worth it!)
- Museums: Keep visits SHORT (1.5-2 hours max). Focus on highlights kids enjoy
- Funicular rides: Kids LOVE the Montmartre cable-car - instant fun!
- Hot chocolate: Angelina Tea House is over-the-top amazing for kids
- Seine cruise: Do at NIGHT with indoor seats (weather-proof, lights are magical)
- Eiffel Tower: Go EARLY - kids love elevator and shaking walkways
- Rainy day backup: Paris Aquarium at Trocadéro
- Reward system: Crêpes after activities, toy sailboats at Luxembourg pond

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
      "category": "restaurant|museum|park|landmark|shopping|entertainment",
      "startTime": "HH:MM" (24-hour format),
      "kidsRating": "Specific reason why this is perfect for ages 6 and 9. Mention interactive elements, visual appeal, or hands-on experiences.",
      "transportToNext": {
        "mode": "walk|taxi|metro|tram",
        "duration": estimated travel time in minutes (number),
        "distance": "distance in km" (string, e.g. "0.8 km")
      }
    }
  ]
}`;

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
      
      // Add flight/train information for travel days
      if (dayNumber === 1) {
        itinerary.flight = SFO_TO_PARIS_FLIGHT;
      } else if (dayNumber === 5) {
        itinerary.train = PARIS_TO_LONDON_TRAIN;
      } else if (dayNumber === 9) {
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
  details: TripDetails
): Promise<Place> {
  console.log('regenerateSinglePlace called with:', { dayNumber, placeIndex, placesCount: currentPlaces.length });
  
  // Determine city based on day number
  const city = dayNumber <= 5 ? 'Paris' : 'London';
  let date: string;
  
  if (dayNumber <= 5) {
    const parisStart = new Date(details.parisDates.start);
    parisStart.setDate(parisStart.getDate() + (dayNumber - 1));
    date = parisStart.toISOString().split('T')[0];
  } else {
    const londonStart = new Date(details.londonDates.start);
    londonStart.setDate(londonStart.getDate() + (dayNumber - 6));
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
  const placesToAvoid = currentPlaces
    .filter((_, idx) => idx !== placeIndex)
    .map(p => p.name);

  // Determine time constraints
  const suggestedStartTime = previousPlace 
    ? calculateEndTime(previousPlace.startTime || '09:00', previousPlace.duration + (previousPlace.transportToNext?.duration || 0))
    : currentPlace.startTime || '09:00';
    
  const timeUntilNext = nextPlace && nextPlace.startTime
    ? calculateTimeDifference(suggestedStartTime, nextPlace.startTime)
    : 180; // Default 3 hours

  const prompt = `Generate a SINGLE alternative place for a family trip to ${city}.

CRITICAL: You MUST suggest a COMPLETELY DIFFERENT place than "${currentPlace.name}". The new place should be a fresh alternative, not the same location.

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

${city === 'Paris' ? `
PARIS ALTERNATIVES (choose ONE that's NOT in the avoid list):
- Museums: Musée d'Orsay (giant clock!), Louvre (1.5-2hrs: mummies, sculptures), Paris Aquarium (rainy day), Musée Grévin
- Activities: Jardin du Luxembourg playground (BEST for kids 6-9!), Eiffel Tower (go early!), Montmartre funicular (kids love!), Seine night cruise
- Food: Angelina hot chocolate (over-the-top!), crêperies, traditional bistros, Café de Flore
- Landmarks: Notre-Dame area, Sacré-Cœur, Arc de Triomphe, Champs-Élysées
- Parks: Luxembourg Gardens (zipline, toy sailboats), Tuileries Garden, Trocadéro Gardens
- Markets: Marché Bastille, Marché des Enfants Rouges
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
  const isFirstDayInCity = (city === 'Paris' && dayNumber === 1) || (city === 'London' && dayNumber === 6);
  const isLastDayInCity = (city === 'Paris' && dayNumber === 5) || (city === 'London' && dayNumber === 9);
  
  const parisActivitiesByDay: { [key: number]: Place[] } = {
    1: [ // Nov 21 - Arrival day - afternoon/evening only
      {
        id: `${dayNumber}-0`,
        name: 'Eiffel Tower',
        address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
        lat: 48.8584,
        lng: 2.2945,
        description: 'Iconic Paris landmark. Walk around Trocadéro Gardens for best photo spots and let kids run around.',
        duration: 90,
        category: 'landmark',
        startTime: '17:00',
        kidsRating: 'First sight of the Eiffel Tower is magical! Kids love watching it sparkle at night.',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.8 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Café de l\'Homme',
        address: '17 Place du Trocadéro, 75016 Paris, France',
        lat: 48.8622,
        lng: 2.2879,
        description: 'Restaurant with stunning Eiffel Tower views. Perfect for first dinner in Paris.',
        duration: 90,
        category: 'restaurant',
        startTime: '19:00',
        kidsRating: 'Kids can watch the Eiffel Tower light show while eating. Family-friendly menu available.'
      }
    ],
    2: [ // Nov 22 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Louvre Museum',
        address: 'Rue de Rivoli, 75001 Paris, France',
        lat: 48.8606,
        lng: 2.3376,
        description: 'World-famous museum. Focus on highlights: Mona Lisa, Egyptian mummies, and Venus de Milo. Kids love the mummy section!',
        duration: 180,
        category: 'museum',
        startTime: '09:00',
        kidsRating: 'Egyptian mummies fascinate kids! Get there early to avoid crowds at Mona Lisa.',
        transportToNext: {
          mode: 'walk',
          duration: 5,
          distance: '0.3 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Angelina Paris',
        address: '226 Rue de Rivoli, 75001 Paris, France',
        lat: 48.8651,
        lng: 2.3281,
        description: 'Famous tearoom known for hot chocolate and pastries. Perfect lunch break for families.',
        duration: 75,
        category: 'restaurant',
        startTime: '13:00',
        kidsRating: 'Kids love the thick hot chocolate and Mont Blanc dessert!',
        transportToNext: {
          mode: 'metro',
          duration: 15,
          distance: '2.1 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Arc de Triomphe',
        address: 'Place Charles de Gaulle, 75008 Paris, France',
        lat: 48.8738,
        lng: 2.2950,
        description: 'Iconic monument. Climb to top for panoramic Paris views. Kids enjoy counting the 12 avenues radiating from the roundabout!',
        duration: 90,
        category: 'landmark',
        startTime: '15:00',
        kidsRating: 'Climbing the 284 steps is an adventure! Amazing views of Eiffel Tower and Champs-Élysées.',
        transportToNext: {
          mode: 'walk',
          duration: 12,
          distance: '1.0 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Champs-Élysées Christmas Lights',
        address: 'Avenue des Champs-Élysées, 75008 Paris, France',
        lat: 48.8698,
        lng: 2.3078,
        description: 'Stroll down the famous avenue decorated with Christmas lights. Window shopping and festive atmosphere.',
        duration: 90,
        category: 'landmark',
        startTime: '17:00',
        kidsRating: 'Magical Christmas lights! Stop at Ladurée for colorful macarons that kids will love.'
      }
    ],
    3: [ // Nov 23 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Montmartre & Sacré-Cœur',
        address: 'Parvis du Sacré-Cœur, 75018 Paris, France',
        lat: 48.8867,
        lng: 2.3431,
        description: 'Charming hilltop neighborhood. Take funicular up to Sacré-Cœur basilica for stunning Paris views.',
        duration: 120,
        category: 'landmark',
        startTime: '09:00',
        kidsRating: 'Funicular ride is fun! Artists in Place du Tertre draw portraits. Amazing views from the dome.',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.4 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Le Consulat',
        address: '18 Rue Norvins, 75018 Paris, France',
        lat: 48.8866,
        lng: 2.3403,
        description: 'Historic Montmartre café with traditional French cuisine. Charming atmosphere.',
        duration: 90,
        category: 'restaurant',
        startTime: '12:00',
        kidsRating: 'Classic French bistro with crêpes and croques-monsieurs that kids enjoy.',
        transportToNext: {
          mode: 'metro',
          duration: 18,
          distance: '3.2 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Jardin du Luxembourg',
        address: '6th arrondissement, 75006 Paris, France',
        lat: 48.8462,
        lng: 2.3372,
        description: 'Beautiful gardens with playground, puppet theater, and toy sailboats to rent for the pond!',
        duration: 120,
        category: 'park',
        startTime: '14:30',
        kidsRating: 'Kids LOVE the toy sailboats! Playground, pony rides, and puppet shows available.',
        transportToNext: {
          mode: 'metro',
          duration: 12,
          distance: '1.8 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Seine River Cruise',
        address: 'Port de la Bourdonnais, 75007 Paris, France',
        lat: 48.8606,
        lng: 2.2978,
        description: 'Evening boat cruise passing illuminated landmarks. See Paris from the water!',
        duration: 75,
        category: 'entertainment',
        startTime: '17:30',
        kidsRating: 'Magical evening cruise! See Eiffel Tower, Notre-Dame, and Louvre lit up from the river.'
      }
    ],
    4: [ // Nov 24 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Musée Grévin',
        address: '10 Boulevard Montmartre, 75009 Paris, France',
        lat: 48.8718,
        lng: 2.3422,
        description: 'Wax museum with lifelike figures of celebrities, historical figures, and French icons. Interactive and fun for kids!',
        duration: 120,
        category: 'museum',
        startTime: '09:30',
        kidsRating: 'Kids love taking photos with wax figures! More engaging than traditional museums.',
        transportToNext: {
          mode: 'metro',
          duration: 15,
          distance: '2.3 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Café de Flore',
        address: '172 Boulevard Saint-Germain, 75006 Paris, France',
        lat: 48.8542,
        lng: 2.3320,
        description: 'Historic café in Saint-Germain-des-Prés. Classic Parisian atmosphere.',
        duration: 75,
        category: 'restaurant',
        startTime: '12:30',
        kidsRating: 'Try French onion soup and croque-madame. Hot chocolate for kids!',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.7 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Notre-Dame Area',
        address: 'Île de la Cité, 75004 Paris, France',
        lat: 48.8530,
        lng: 2.3499,
        description: 'Explore the island, see Notre-Dame exterior (under restoration), visit nearby shops.',
        duration: 90,
        category: 'landmark',
        startTime: '14:30',
        kidsRating: 'Walk along the Seine, feed birds, explore the charming island streets.',
        transportToNext: {
          mode: 'metro',
          duration: 12,
          distance: '1.5 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Eiffel Tower Evening',
        address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
        lat: 48.8584,
        lng: 2.2945,
        description: 'Final Paris evening at the Eiffel Tower. Watch the sparkling light show at night!',
        duration: 90,
        category: 'landmark',
        startTime: '17:30',
        kidsRating: 'Magical farewell! The tower sparkles for 5 minutes every hour after sunset. Unforgettable!'
      }
    ],
    5: [ // Nov 25 - Departure day - morning only
      {
        id: `${dayNumber}-0`,
        name: 'Café de la Paix',
        address: '5 Place de l\'Opéra, 75009 Paris, France',
        lat: 48.8708,
        lng: 2.3314,
        description: 'Historic grand café near Opéra Garnier. Perfect for farewell breakfast.',
        duration: 75,
        category: 'restaurant',
        startTime: '09:00',
        kidsRating: 'Elegant setting for final Parisian breakfast. Croissants and hot chocolate!',
        transportToNext: {
          mode: 'walk',
          duration: 5,
          distance: '0.2 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Opéra Garnier Exterior',
        address: 'Place de l\'Opéra, 75009 Paris, France',
        lat: 48.8720,
        lng: 2.3318,
        description: 'Quick photo stop at the stunning opera house before heading to train station.',
        duration: 20,
        category: 'landmark',
        startTime: '10:30',
        kidsRating: 'Beautiful architecture for final Paris photos before Eurostar!'
      }
    ]
  };

  const londonActivitiesByDay: { [key: number]: Place[] } = {
    6: [ // Nov 25 - Arrival day - afternoon/evening only
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
    7: [ // Nov 26 - Full day
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
    8: [ // Nov 27 - Full day
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
    9: [ // Nov 28 - Departure day - morning only
      {
        id: `${dayNumber}-0`,
        name: 'Covent Garden Market',
        address: 'Covent Garden, London WC2E 8RF, United Kingdom',
        lat: 51.5118,
        lng: -0.1226,
        description: 'Historic covered market with street performers, shops, and cafes. Perfect for final morning browsing.',
        duration: 90,
        category: 'shopping',
        startTime: '09:00',
        kidsRating: 'Street performers and buskers entertain while you shop. Apple Market has unique gifts. Fun farewell activity!',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.6 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Final London Meal',
        address: 'Covent Garden Area, London WC2, United Kingdom',
        lat: 51.5115,
        lng: -0.1220,
        description: 'Last meal in London before heading to airport. Many family-friendly options in Covent Garden.',
        duration: 75,
        category: 'restaurant',
        startTime: '11:00',
        kidsRating: 'Relaxed farewell meal. Reflect on the amazing trip while kids can watch street performers one last time!'
      }
    ]
  };

  const places = city === 'Paris' 
    ? parisActivitiesByDay[dayNumber] || []
    : londonActivitiesByDay[dayNumber] || [];

  const itinerary: DayItinerary = {
    date,
    dayNumber,
    city,
    hotel,
    places
  };
  
  // Add flight/train information for travel days
  if (dayNumber === 1) {
    itinerary.flight = SFO_TO_PARIS_FLIGHT;
  } else if (dayNumber === 5) {
    itinerary.train = PARIS_TO_LONDON_TRAIN;
  } else if (dayNumber === 9) {
    itinerary.flight = LONDON_TO_SFO_FLIGHT;
  }
  
  return itinerary;
}

