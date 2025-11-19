/**
 * Daily POI Distributor
 * 
 * Phase 2 of the two-phase itinerary generation system.
 * Distributes master POI list across days with intelligent clustering.
 */

import { DayItinerary, Place, TripDetails } from './types';
import { callAI } from './aiProvider';
import { cleanJsonResponse } from './openai';
import { MasterPOI } from './masterPOIGenerator';
import { getFixedSchedulesForDate, formatFixedScheduleForPrompt } from './fixedSchedules';
import { format, addDays } from 'date-fns';

interface DistributionContext {
  dayNumber: number;
  date: string;
  city: 'Lisbon' | 'London';
  hotel: { name: string; address: string; lat: number; lng: number };
  isArrivalDay: boolean;
  isDepartureDay: boolean;
  availableStartTime: string; // e.g., "09:00" or "15:00" for arrival days
  availableEndTime: string; // e.g., "22:00" or "11:00" for departure days
  fixedSchedules: any[];
}

/**
 * Distribute POIs across all days of the trip
 */
export async function distributePOIsAcrossDays(
  masterPOIs: { lisbon: MasterPOI[]; london: MasterPOI[] },
  tripDetails: TripDetails
): Promise<DayItinerary[]> {
  console.log('\n📅 [Phase 2] Distributing POIs across days...');
  
  const allDays: DayItinerary[] = [];
  const usedPOIs = new Set<string>(); // Track which POIs have been assigned
  
  // Generate context for each day
  const dayContexts = generateDayContexts(tripDetails);
  
  // Distribute POIs city by city for better clustering
  const lisbonDays = dayContexts.filter(ctx => ctx.city === 'Lisbon');
  const londonDays = dayContexts.filter(ctx => ctx.city === 'London');
  
  // Distribute Lisbon POIs
  console.log(`\n🇵🇹 Distributing ${masterPOIs.lisbon.length} Lisbon POIs across ${lisbonDays.length} days...`);
  const lisbonItineraries = await distributeCityPOIs(
    masterPOIs.lisbon,
    lisbonDays,
    usedPOIs
  );
  allDays.push(...lisbonItineraries);
  
  // Distribute London POIs
  console.log(`\n🇬🇧 Distributing ${masterPOIs.london.length} London POIs across ${londonDays.length} days...`);
  const londonItineraries = await distributeCityPOIs(
    masterPOIs.london,
    londonDays,
    usedPOIs
  );
  allDays.push(...londonItineraries);
  
  // Sort by day number
  allDays.sort((a, b) => a.dayNumber - b.dayNumber);
  
  console.log(`\n✅ [Phase 2] Distribution complete: ${allDays.length} days generated`);
  console.log(`📊 POIs used: ${usedPOIs.size} out of ${masterPOIs.lisbon.length + masterPOIs.london.length}`);
  
  return allDays;
}

/**
 * Distribute POIs for a specific city across its days
 */
async function distributeCityPOIs(
  cityPOIs: MasterPOI[],
  dayContexts: DistributionContext[],
  usedPOIs: Set<string>
): Promise<DayItinerary[]> {
  const city = dayContexts[0].city;
  
  // Separate must-visit and optional POIs
  const mustVisitPOIs = cityPOIs.filter(poi => poi.isMustVisit);
  const optionalPOIs = cityPOIs.filter(poi => !poi.isMustVisit);
  
  console.log(`  Must-visit: ${mustVisitPOIs.length}, Optional: ${optionalPOIs.length}`);
  
  // Build distribution prompt
  const prompt = buildDistributionPrompt(cityPOIs, dayContexts);
  
  try {
    console.log(`  Calling AI for ${city} distribution...`);
    const response = await callAI(prompt);
    
    if (!response.content) {
      throw new Error('AI response content is empty');
    }
    
    console.log(`  ✅ AI distribution response received for ${city}`);
    console.log(`  Response length: ${response.content.length} chars`);
    
    // Clean and parse JSON with error handling
    const cleaned = cleanJsonResponse(response.content);
    console.log(`  Cleaned response length: ${cleaned.length} chars`);
    
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error(`  ❌ JSON parse error:`, parseError);
      console.error(`  First 500 chars:`, cleaned.substring(0, 500));
      console.error(`  Last 500 chars:`, cleaned.substring(Math.max(0, cleaned.length - 500)));
      
      // Try to extract position from error message
      if (parseError instanceof Error && parseError.message.includes('position')) {
        const posMatch = parseError.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const contextStart = Math.max(0, pos - 200);
          const contextEnd = Math.min(cleaned.length, pos + 200);
          console.error(`  Context around position ${pos}:`);
          console.error(cleaned.substring(contextStart, contextEnd));
          console.error(' '.repeat(Math.min(200, pos - contextStart)) + '^--- Error here');
        }
      }
      
      throw parseError;
    }
    
    // Validate response
    if (!parsed.days || !Array.isArray(parsed.days)) {
      throw new Error('Invalid distribution response structure');
    }
    
    // Convert to DayItinerary format
    const itineraries: DayItinerary[] = parsed.days.map((day: any, idx: number) => {
      const context = dayContexts[idx];
      
      // Convert POIs to Place format with IDs
      const places: Place[] = (day.places || []).map((poi: any, placeIdx: number) => {
        const placeId = `${context.dayNumber}-${placeIdx}`;
        usedPOIs.add(poi.name); // Track usage
        
        return {
          id: placeId,
          name: poi.name,
          address: poi.address,
          lat: poi.lat,
          lng: poi.lng,
          description: poi.description,
          duration: poi.duration || 90,
          category: poi.category || 'attraction',
          startTime: poi.startTime,
          kidsRating: poi.kidsRating
        };
      });
      
      return {
        date: context.date,
        dayNumber: context.dayNumber,
        city: context.city,
        hotel: context.hotel,
        places: places
      };
    });
    
    // Log distribution summary
    itineraries.forEach(day => {
      console.log(`    Day ${day.dayNumber}: ${day.places.length} places`);
    });
    
    return itineraries;
    
  } catch (error) {
    console.error(`  ❌ Error distributing ${city} POIs:`, error);
    throw error;
  }
}

/**
 * Generate context information for each day
 */
function generateDayContexts(tripDetails: TripDetails): DistributionContext[] {
  const contexts: DistributionContext[] = [];
  
  // Lisbon days (Days 1-5)
  const lisbonStart = new Date(tripDetails.lisbonDates.start);
  const lisbonEnd = new Date(tripDetails.lisbonDates.end);
  const lisbonDayCount = Math.ceil((lisbonEnd.getTime() - lisbonStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  for (let i = 0; i < lisbonDayCount; i++) {
    const dayNumber = i + 1;
    const date = format(addDays(lisbonStart, i), 'yyyy-MM-dd');
    const isArrivalDay = i === 0;
    const isDepartureDay = i === lisbonDayCount - 1;
    const fixedSchedules = getFixedSchedulesForDate(date);
    
    contexts.push({
      dayNumber,
      date,
      city: 'Lisbon',
      hotel: tripDetails.lisbonHotel,
      isArrivalDay,
      isDepartureDay,
      availableStartTime: isArrivalDay ? '15:30' : '09:00', // After hotel check-in on arrival
      availableEndTime: isDepartureDay ? '09:00' : '22:00', // Before airport departure
      fixedSchedules
    });
  }
  
  // London days (Days 6-10)
  const londonStart = new Date(tripDetails.londonDates.start);
  const londonEnd = new Date(tripDetails.londonDates.end);
  const londonDayCount = Math.ceil((londonEnd.getTime() - londonStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  for (let i = 0; i < londonDayCount; i++) {
    const dayNumber = lisbonDayCount + i + 1;
    const date = format(addDays(londonStart, i), 'yyyy-MM-dd');
    const isArrivalDay = i === 0;
    const isDepartureDay = i === londonDayCount - 1;
    const fixedSchedules = getFixedSchedulesForDate(date);
    
    contexts.push({
      dayNumber,
      date,
      city: 'London',
      hotel: tripDetails.londonHotel,
      isArrivalDay,
      isDepartureDay,
      availableStartTime: isArrivalDay ? '16:00' : '09:00', // After hotel check-in on arrival
      availableEndTime: isDepartureDay ? '08:00' : '22:00', // Before airport departure
      fixedSchedules
    });
  }
  
  return contexts;
}

/**
 * Build AI prompt for distributing POIs across days
 */
function buildDistributionPrompt(
  cityPOIs: MasterPOI[],
  dayContexts: DistributionContext[]
): string {
  const city = dayContexts[0].city;
  const mustVisitPOIs = cityPOIs.filter(poi => poi.isMustVisit);
  const highPriorityPOIs = cityPOIs.filter(poi => poi.priority === 'high');
  
  // Format POI list
  const poiList = cityPOIs.map((poi, idx) => {
    let line = `${idx + 1}. ${poi.name}`;
    if (poi.isMustVisit) line += ' ⭐ MUST-VISIT';
    if (poi.priority === 'high') line += ' [HIGH]';
    line += ` (${poi.category}, ${poi.duration} min)`;
    line += `\n   ${poi.address}`;
    line += `\n   ${poi.description}`;
    if (poi.kidsRating) line += `\n   Kids: ${poi.kidsRating}`;
    return line;
  }).join('\n\n');
  
  // Format day contexts
  const dayInfo = dayContexts.map(ctx => {
    let info = `Day ${ctx.dayNumber} (${ctx.date})`;
    if (ctx.isArrivalDay) info += ' - ARRIVAL DAY';
    if (ctx.isDepartureDay) info += ' - DEPARTURE DAY';
    info += `\n  Available time: ${ctx.availableStartTime} - ${ctx.availableEndTime}`;
    info += `\n  Hotel: ${ctx.hotel.name}`;
    
    if (ctx.fixedSchedules.length > 0) {
      info += `\n  FIXED SCHEDULES:`;
      ctx.fixedSchedules.forEach(schedule => {
        info += `\n    - ${schedule.name} at ${schedule.startTime} (${schedule.duration} min)`;
        info += `\n      ${schedule.address}`;
      });
    }
    
    return info;
  }).join('\n\n');

  const prompt = `You are a travel planning expert specializing in geographic clustering and efficient itinerary design.

🎯 YOUR TASK:
Distribute the following ${cityPOIs.length} POIs across ${dayContexts.length} days in ${city}, optimizing for:
1. **Geographic clustering** - Group nearby POIs on the same day
2. **Walking distance** - Minimize walking between POIs (max 20 min walk between stops)
3. **Must-visit inclusion** - ALL ${mustVisitPOIs.length} must-visit POIs MUST be included
4. **Time constraints** - Respect arrival/departure times and fixed schedules
5. **Family pacing** - Don't overschedule, allow rest time

📍 AVAILABLE POIs:
${poiList}

📅 DAYS TO FILL:
${dayInfo}

🔑 DISTRIBUTION RULES:

1. **MUST-VISIT POIs**: ALL ${mustVisitPOIs.length} must-visit POIs (marked with ⭐) MUST be included
2. **Geographic Clustering**: 
   - Group POIs that are in the same neighborhood/area
   - Example: Belém area (Tower, Monastery, Pastéis de Belém) should be same day
   - Example: South Kensington museums should be same day
3. **Walking Distance**:
   - Keep walking between POIs under 20 minutes
   - If POIs are far apart, they should be on different days
4. **Daily Capacity**:
   - Arrival/departure days: 2-3 POIs max (limited time)
   - Full days: 4-6 POIs (including meals)
   - Include 1-2 restaurant/café stops per day
5. **Fixed Schedules**:
   - Plan activities AROUND fixed schedules (concerts, shows)
   - Leave buffer time before fixed events (30-60 min)
   - Consider travel time to fixed event locations
6. **Time of Day**:
   - Morning: Museums, major attractions (before crowds)
   - Afternoon: Parks, neighborhoods, lighter activities
   - Evening: Restaurants, shows, night views
7. **Meal Planning**:
   - Include lunch option (12:00-14:00)
   - Include dinner option (18:00-20:00)
   - Place restaurants near other activities

RESPONSE FORMAT:
Return a JSON object with this structure:

{
  "days": [
    {
      "dayNumber": 1,
      "places": [
        {
          "name": "Oceanário de Lisboa",
          "address": "Esplanada Dom Carlos I, 1990-005 Lisboa, Portugal",
          "lat": 38.7633,
          "lng": -9.0935,
          "description": "One of Europe's best aquariums",
          "duration": 120,
          "category": "aquarium",
          "startTime": "15:30",
          "kidsRating": "Perfect for ages 6-9"
        }
        // ... more places for day 1
      ]
    }
    // ... more days
  ]
}

CRITICAL REMINDERS:
- Include ALL must-visit POIs (⭐)
- Cluster geographically (same neighborhood = same day)
- Respect time constraints (arrival/departure/fixed schedules)
- Include restaurants for meals
- Don't overschedule - quality over quantity
- Assign realistic start times based on duration and travel

Generate the distribution now:`;

  return prompt;
}

