import OpenAI from 'openai';
import { DayItinerary, Place, TripDetails } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateDayItinerary(
  details: TripDetails,
  dayNumber: number,
  totalDays: number,
  previousPlaces?: string[]
): Promise<DayItinerary> {
  // Handle date assignment for 9 days with overlap on Nov 25
  let date: string;
  let city: string;
  
  if (dayNumber <= 5) {
    // Prague days 1-5: Nov 21-25
    const pragueStart = new Date(details.pragueDates.start);
    pragueStart.setDate(pragueStart.getDate() + (dayNumber - 1));
    date = pragueStart.toISOString().split('T')[0];
    city = 'Prague';
  } else {
    // London days 6-9: Nov 25-28
    const londonStart = new Date(details.londonDates.start);
    londonStart.setDate(londonStart.getDate() + (dayNumber - 6));
    date = londonStart.toISOString().split('T')[0];
    city = 'London';
  }
  
  const hotel = city === 'Prague' ? details.pragueHotel : details.londonHotel;

  // Determine if this is arrival or departure day
  const isFirstDayInCity = (city === 'Prague' && dayNumber === 1) || (city === 'London' && dayNumber === 6);
  const isLastDayInCity = (city === 'Prague' && dayNumber === 5) || (city === 'London' && dayNumber === 9);
  
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
                     `This is day ${dayNumber - (city === 'London' ? 5 : 0)} of ${city === 'Prague' ? 5 : 4} in ${city}.`;

  const avoidPlaces = previousPlaces && previousPlaces.length > 0 
    ? `\n\nIMPORTANT: DO NOT suggest these places as they were visited on previous days:\n${previousPlaces.join('\n')}`
    : '';

  const prompt = `Generate a detailed day itinerary for a family trip to ${city}.

Trip Details:
- Date: ${date} (Day ${dayNumber} of ${totalDays})
- ${dayContext}
- City: ${city}
- Staying at: ${hotel.name}
- Family: Dad (46), Mom (39), Girl (9), Boy (6)
- Season: Late November (sunset around 16:30 in Prague, 16:00 in London)

Requirements:
- Suggest ${numActivities} DIFFERENT family-friendly activities/places suitable for children aged 6 and 9
- Start around ${startTime}, end by ${endTime}${isFirstDayInCity ? ' (arrival day - limited time)' : ''}${isLastDayInCity ? ' (departure day - limited time)' : ''}
- Include mix of activities: landmarks, museums, parks, restaurants
- Plan locations in a logical geographical route to minimize travel time
- Keep consecutive places close together when possible (walking distance preferred)

PRAGUE-SPECIFIC RECOMMENDATIONS (if applicable):
- Prague Castle area: Include Toy Museum for kids
- Old Town Square: Astronomical Clock (watch figurines move on the hour)
- Charles Bridge: Street performers and artists
- Black Light Theatre: Non-verbal visual performance (perfect for kids!)
- Traditional Czech puppet shows (marionettes)
- Petřín Hill: Take the funicular/cable car up (kids love it!)
- Trdelník (sweet pastry): Popular street snack kids enjoy
- Christmas markets (if open): Magical atmosphere in Old Town Square
- Evening activities: Night views from Charles Bridge looking at Prague Castle

LONDON-SPECIFIC RECOMMENDATIONS (if applicable):
- Natural History Museum or Science Museum: Interactive exhibits for kids
- Tower of London: Crown Jewels and history
- West End musicals: Lion King, Matilda, Frozen (book in advance!)
- Hyde Park Winter Wonderland: Ice skating, rides, Christmas market (check opening dates)
- London Eye: Evening ride for city views
- Buckingham Palace: Changing of the Guard (check schedule)
- Christmas lights: Oxford Street, Carnaby Street (spectacular in late November)
- Borough Market or Covent Garden: Street performers

Kid-Friendly Tips:
- Prioritize interactive experiences (cable cars, puppet shows, musicals, hands-on museums)
- Include fun snacks (Trdelník in Prague, fish & chips in London)
- Plan breaks with playgrounds or parks
- Consider non-verbal entertainment (puppet shows, Black Light Theatre, musicals)
- Include "magical" experiences (Christmas markets, castle night views, theatre)

Transport Guidelines:
- Walking: if distance is < 1km
- Tram/Metro: if distance is 1-3km (public transport is fun for kids!)
- Taxi: if distance is > 3km or when traveling with tired children

Consider meal times (lunch around 12-1 PM, dinner around 6-7 PM if time allows)
Include accurate coordinates for each location
Each day should explore DIFFERENT neighborhoods and attractions
If possible, mention seasonal activities for late November (Christmas preparations, winter atmosphere)${avoidPlaces}

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
    console.log(`Calling OpenAI for ${city} on ${date}...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a travel planning assistant. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log(`OpenAI response received for ${city}`);
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    const places: Place[] = parsed.places.map((p: any, idx: number) => ({
      id: `${dayNumber}-${idx}`,
      ...p
    }));

    return {
      date,
      dayNumber,
      city,
      hotel,
      places
    };
  } catch (error) {
    console.error('Error generating itinerary:', error);
    console.log('Using fallback itinerary');
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a travel planning assistant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    return parsed.map((p: any, idx: number) => ({
      id: places[idx]?.id || `${day.dayNumber}-${idx}`,
      ...p
    }));
  } catch (error) {
    console.error('Error regenerating day:', error);
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
  const city = dayNumber <= 5 ? 'Prague' : 'London';
  let date: string;
  
  if (dayNumber <= 5) {
    const pragueStart = new Date(details.pragueDates.start);
    pragueStart.setDate(pragueStart.getDate() + (dayNumber - 1));
    date = pragueStart.toISOString().split('T')[0];
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

${city === 'Prague' ? `
PRAGUE ALTERNATIVES (choose ONE that's NOT in the avoid list):
- Museums: National Museum, Toy Museum, Kafka Museum, Museum of Decorative Arts
- Activities: Petřín Tower (funicular ride), Puppet shows, Black Light Theatre, River cruise
- Food: Lokál (traditional Czech), Café Louvre, U Fleků (brewery)
- Landmarks: Vyšehrad, Dancing House, Powder Tower, National Theatre
- Parks: Letná Park, Kampa Island, Riegrovy Sady
- Markets: Havelská Market, Náplavka Farmers Market
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a travel planning assistant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9, // Higher temperature for more variety
      max_tokens: 800,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    // Validate that the new place is actually different
    if (parsed.name.toLowerCase() === currentPlace.name.toLowerCase()) {
      console.warn('AI returned the same place, retrying with more explicit prompt...');
      // Try one more time with even more emphasis
      const retryCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning assistant. You MUST provide a different alternative location. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: `URGENT: The previous suggestion "${parsed.name}" is the SAME as the current place. Please suggest a COMPLETELY DIFFERENT ${currentPlace.category} in ${city} for the same time slot (${suggestedStartTime}). Avoid these: ${placesToAvoid.join(', ')}`
          }
        ],
        temperature: 1.0,
        max_tokens: 800,
      });
      
      const retryContent = retryCompletion.choices[0].message.content;
      if (retryContent) {
        const retryParsed = JSON.parse(retryContent);
        return {
          id: currentPlace.id,
          ...retryParsed
        };
      }
    }
    
    return {
      id: currentPlace.id,
      ...parsed
    };
  } catch (error) {
    console.error('Error regenerating place:', error);
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
  const isFirstDayInCity = (city === 'Prague' && dayNumber === 1) || (city === 'London' && dayNumber === 6);
  const isLastDayInCity = (city === 'Prague' && dayNumber === 5) || (city === 'London' && dayNumber === 9);
  
  const pragueActivitiesByDay: { [key: number]: Place[] } = {
    1: [ // Nov 21 - Arrival day - afternoon/evening only
      {
        id: `${dayNumber}-0`,
        name: 'Old Town Square',
        address: 'Staroměstské nám., 110 00 Prague, Czech Republic',
        lat: 50.0875,
        lng: 14.4213,
        description: 'Fairy tale atmosphere with colorful buildings and Christmas market preparations. Watch the Astronomical Clock figurines move on the hour!',
        duration: 120,
        category: 'landmark',
        startTime: '14:30',
        kidsRating: 'Magical first impression! Kids will love the moving clock figurines and warm Trdelník pastries.',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.7 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Café Louvre',
        address: 'Národní 22, 110 00 Prague, Czech Republic',
        lat: 50.0817,
        lng: 14.4169,
        description: 'Historic café with family-friendly atmosphere and traditional Czech dishes.',
        duration: 90,
        category: 'restaurant',
        startTime: '17:00',
        kidsRating: 'Cozy indoor setting perfect for jet-lagged kids, with hot chocolate and pastries.'
      }
    ],
    2: [ // Nov 22 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Prague Castle & Toy Museum',
        address: 'Hradčany, 119 08 Prague 1, Czech Republic',
        lat: 50.0903,
        lng: 14.4004,
        description: 'Historic castle complex with stunning views. MUST visit the Toy Museum inside the castle - antique toys from centuries past!',
        duration: 210,
        category: 'museum',
        startTime: '09:00',
        kidsRating: 'The Toy Museum is a hidden gem! Kids ages 6-9 love seeing vintage toys and the castle guards.',
        transportToNext: {
          mode: 'walk',
          duration: 15,
          distance: '1.2 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'U Zlaté studně Restaurant',
        address: 'U Zlaté studně 166/4, 118 00 Prague, Czech Republic',
        lat: 50.0887,
        lng: 14.4026,
        description: 'Family-friendly restaurant with castle views and traditional Czech cuisine.',
        duration: 90,
        category: 'restaurant',
        startTime: '12:30',
        kidsRating: 'Kid-friendly menu with schnitzel and dumplings. Great views to keep everyone entertained.',
        transportToNext: {
          mode: 'tram',
          duration: 12,
          distance: '1.8 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Traditional Czech Marionette Theatre',
        address: 'Žatecká 1, 110 00 Prague, Czech Republic',
        lat: 50.0899,
        lng: 14.4189,
        description: 'Authentic puppet show experience. Czech Republic is the home of marionette theatre!',
        duration: 90,
        category: 'entertainment',
        startTime: '16:00',
        kidsRating: 'Perfect evening activity! Visual storytelling that 6 and 9 year olds can follow without language barriers.',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.6 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Old Town Square Evening',
        address: 'Staroměstské nám., 110 00 Prague, Czech Republic',
        lat: 50.0875,
        lng: 14.4213,
        description: 'Return for magical evening atmosphere with lights and possibly Christmas market opening.',
        duration: 60,
        category: 'landmark',
        startTime: '18:00',
        kidsRating: 'Evening lights transform the square into a winter wonderland. Try Trdelník (sweet pastry)!'
      }
    ],
    3: [ // Nov 23 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Astronomical Clock & Old Town',
        address: 'Staroměstské nám. 1, 110 00 Prague, Czech Republic',
        lat: 50.0870,
        lng: 14.4208,
        description: 'Watch the famous clock\'s figurines move at the top of the hour. Time your visit for the hourly show!',
        duration: 60,
        category: 'landmark',
        startTime: '10:00',
        kidsRating: 'Kids are mesmerized by the moving apostles and skeleton! Arrive 5 minutes early for best views.',
        transportToNext: {
          mode: 'walk',
          duration: 8,
          distance: '0.5 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Charles Bridge',
        address: 'Karlův most, 110 00 Prague, Czech Republic',
        lat: 50.0865,
        lng: 14.4114,
        description: 'Iconic medieval bridge with street performers, artists, and stunning views of Prague Castle.',
        duration: 90,
        category: 'landmark',
        startTime: '11:00',
        kidsRating: 'Street artists, musicians, and the statues\' legends captivate young imaginations!',
        transportToNext: {
          mode: 'walk',
          duration: 5,
          distance: '0.3 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Kampa Park Restaurant',
        address: 'Na Kampě 8b, 118 00 Prague, Czech Republic',
        lat: 50.0856,
        lng: 14.4090,
        description: 'Riverside dining with views of Charles Bridge. Family-friendly with outdoor seating in good weather.',
        duration: 90,
        category: 'restaurant',
        startTime: '13:00',
        kidsRating: 'Kids can watch swans and boats while eating. Pasta and pizza available for picky eaters.',
        transportToNext: {
          mode: 'metro',
          duration: 20,
          distance: '2.5 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Black Light Theatre',
        address: 'Národní 25, 110 00 Prague, Czech Republic',
        lat: 50.0818,
        lng: 14.4164,
        description: 'TOP RECOMMENDATION! Non-verbal visual theatre using UV light, fluorescent costumes, and black backgrounds. Stunning visual spectacle.',
        duration: 90,
        category: 'entertainment',
        startTime: '17:00',
        kidsRating: 'PERFECT for ages 6-9! No language needed - pure visual magic with glowing objects "floating" in darkness. Unforgettable!'
      }
    ],
    4: [ // Nov 24 - Full day
      {
        id: `${dayNumber}-0`,
        name: 'Petřín Hill & Lookout Tower',
        address: 'Petřínské sady, 118 00 Prague 1, Czech Republic',
        lat: 50.0838,
        lng: 14.3972,
        description: 'Take the funicular railway up! Mini Eiffel Tower with panoramic city views. Mirror maze is also great for kids.',
        duration: 180,
        category: 'entertainment',
        startTime: '09:00',
        kidsRating: 'The funicular ride itself is an adventure! Tower climb + mirror maze = double fun for kids.',
        transportToNext: {
          mode: 'tram',
          duration: 15,
          distance: '2.0 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Lokál Dlouhááá',
        address: 'Dlouhá 33, 110 00 Prague, Czech Republic',
        lat: 50.0899,
        lng: 14.4264,
        description: 'Traditional Czech pub with family atmosphere. Famous for fresh Pilsner and authentic Czech food.',
        duration: 90,
        category: 'restaurant',
        startTime: '12:30',
        kidsRating: 'Casual atmosphere where kids can be kids. Try Czech goulash and svíčková (beef in cream sauce).',
        transportToNext: {
          mode: 'walk',
          duration: 10,
          distance: '0.8 km'
        }
      },
      {
        id: `${dayNumber}-2`,
        name: 'Charles Bridge Evening Walk',
        address: 'Karlův most, 110 00 Prague, Czech Republic',
        lat: 50.0865,
        lng: 14.4114,
        description: 'Final Prague evening - walk the bridge at dusk to see Prague Castle illuminated. Bring warm drinks!',
        duration: 60,
        category: 'landmark',
        startTime: '16:00',
        kidsRating: 'Magical finale! The lit-up castle looks like a fairy tale. Perfect photo opportunity for the family.',
        transportToNext: {
          mode: 'walk',
          duration: 12,
          distance: '0.9 km'
        }
      },
      {
        id: `${dayNumber}-3`,
        name: 'Wenceslas Square',
        address: 'Václavské nám., 110 00 Prague, Czech Republic',
        lat: 50.0813,
        lng: 14.4266,
        description: 'Evening stroll through the main boulevard with shops and Christmas decorations.',
        duration: 60,
        category: 'landmark',
        startTime: '17:30',
        kidsRating: 'Bustling atmosphere with street performers and holiday lights.'
      }
    ],
    5: [ // Nov 25 - Departure day - morning only
      {
        id: `${dayNumber}-0`,
        name: 'Municipal House Café',
        address: 'nám. Republiky 5, 111 21 Prague, Czech Republic',
        lat: 50.0877,
        lng: 14.4277,
        description: 'Stunning Art Nouveau building for farewell brunch. Ornate interiors and excellent pastries.',
        duration: 90,
        category: 'restaurant',
        startTime: '09:00',
        kidsRating: 'Like dining in a palace! Kids will remember the beautiful ceilings and chandeliers.',
        transportToNext: {
          mode: 'walk',
          duration: 5,
          distance: '0.3 km'
        }
      },
      {
        id: `${dayNumber}-1`,
        name: 'Powder Tower',
        address: 'nám. Republiky 5, 110 00 Prague, Czech Republic',
        lat: 50.0872,
        lng: 14.4283,
        description: 'Quick visit to Gothic tower before departure. Brief but memorable.',
        duration: 45,
        category: 'landmark',
        startTime: '11:00',
        kidsRating: 'Short climb with great views - perfect last Prague moment before heading to airport.'
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

  const places = city === 'Prague' 
    ? pragueActivitiesByDay[dayNumber] || []
    : londonActivitiesByDay[dayNumber] || [];

  return {
    date,
    dayNumber,
    city,
    hotel,
    places
  };
}

