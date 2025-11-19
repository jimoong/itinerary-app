import { NextRequest, NextResponse } from 'next/server';
import { generateDayItinerary, regenerateDayWithChanges, regenerateSinglePlace } from '@/lib/openai';
import { TRIP_DETAILS } from '@/lib/constants';
import { Place, DayItinerary } from '@/lib/types';

// Helper function to check for duplicate locations across days
function checkForDuplicates(allDays: DayItinerary[]) {
  const locationMap = new Map<string, number[]>(); // location name -> array of day numbers
  
  allDays.forEach((day, dayIndex) => {
    day.places.forEach(place => {
      const placeName = place.name.toLowerCase();
      // Skip hotels, transportation, and fixed schedules (shows, concerts, etc. that are pre-booked)
      if (placeName.includes('hotel') || placeName.includes('andaz') || placeName.includes('hyatt') || 
          place.category === 'airport' || place.category === 'show' || place.category === 'concert') {
        return;
      }
      
      if (!locationMap.has(placeName)) {
        locationMap.set(placeName, []);
      }
      locationMap.get(placeName)!.push(dayIndex + 1);
    });
  });
  
  // Find duplicates
  const duplicates: Array<{ location: string; days: number[] }> = [];
  locationMap.forEach((days, location) => {
    if (days.length > 1) {
      duplicates.push({ location, days });
    }
  });
  
  if (duplicates.length > 0) {
    console.warn('⚠️ DUPLICATE LOCATIONS DETECTED:');
    duplicates.forEach(({ location, days }) => {
      console.warn(`   - "${location}" appears on days: ${days.join(', ')}`);
    });
    return duplicates;
  } else {
    console.log('✅ No duplicate locations found across days');
    return [];
  }
}

// Helper function to auto-replace duplicate locations
async function replaceDuplicates(allDays: DayItinerary[], duplicates: Array<{ location: string; days: number[] }>) {
  console.log('\n========================================');
  console.log('🔧 AUTO-REPLACING DUPLICATE LOCATIONS');
  console.log('========================================');
  
  for (const duplicate of duplicates) {
    const { location, days } = duplicate;
    
    // Keep first occurrence, replace subsequent ones
    const daysToReplace = days.slice(1); // Skip first day
    
    for (const dayNumber of daysToReplace) {
      const dayIndex = dayNumber - 1;
      const day = allDays[dayIndex];
      
      // Find the duplicate place in this day
      const placeIndex = day.places.findIndex(p => p.name.toLowerCase() === location);
      if (placeIndex === -1) continue;
      
      console.log(`🔄 Replacing "${location}" on Day ${dayNumber}...`);
      
      // Collect all place names to avoid (including this duplicate)
      const placesToAvoid: string[] = [];
      allDays.forEach(d => {
        d.places.forEach(p => {
          if (!p.name.toLowerCase().includes('hotel') && p.category !== 'airport') {
            placesToAvoid.push(p.name);
          }
        });
      });
      
      try {
        // Regenerate this specific place
        const newPlace = await regenerateSinglePlace(
          dayNumber,
          placeIndex,
          day.places,
          TRIP_DETAILS,
          placesToAvoid
        );
        
        // Replace the duplicate
        day.places[placeIndex] = newPlace;
        console.log(`✅ Replaced with: "${newPlace.name}"`);
      } catch (error) {
        console.error(`❌ Failed to replace duplicate on Day ${dayNumber}:`, error);
      }
    }
  }
  
  console.log('========================================\n');
  return allDays;
}

export async function POST(request: NextRequest) {
  try {
    console.log('API route called');
    const body = await request.json();
    const { action, dayNumber, places, placeIndex, avoidPlaces } = body;
    
    console.log('Action:', action);

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    if (action === 'generate-all') {
      // Generate all 10 days (5 Lisbon + 5 London)
      console.log('========================================');
      console.log('🚀 GENERATING ALL 10 DAYS OF ITINERARY');
      console.log('========================================');
      const allDays = [];
      const visitedPlaces: string[] = [];
      let aiGeneratedCount = 0;
      
      for (let i = 1; i <= 9; i++) {
        console.log(`\n--- Day ${i}/9 ---`);
        const day = await generateDayItinerary(TRIP_DETAILS, i, 9, visitedPlaces);
        allDays.push(day);
        aiGeneratedCount++;
        
        // Add this day's places to visited list (excluding hotels)
        day.places.forEach(place => {
          if (!place.name.toLowerCase().includes('hotel') && 
              !place.name.toLowerCase().includes('andaz') && 
              !place.name.toLowerCase().includes('hyatt')) {
            visitedPlaces.push(place.name);
          }
        });
        
        console.log(`📝 Visited places so far: ${visitedPlaces.length}`);
      }
      
      // Check for duplicates
      console.log('\n========================================');
      console.log('🔍 CHECKING FOR DUPLICATE LOCATIONS');
      console.log('========================================');
      let duplicates = checkForDuplicates(allDays);
      
      // Auto-replace duplicates if found
      if (duplicates.length > 0) {
        await replaceDuplicates(allDays, duplicates);
        
        // Re-check for any remaining duplicates
        console.log('\n========================================');
        console.log('🔍 RE-CHECKING FOR DUPLICATES');
        console.log('========================================');
        duplicates = checkForDuplicates(allDays);
      }
      
      console.log('\n========================================');
      console.log('✅ ITINERARY GENERATION COMPLETE');
      console.log(`📊 Summary: ${aiGeneratedCount} days generated successfully`);
      if (duplicates.length > 0) {
        console.log(`⚠️ Warning: ${duplicates.length} duplicate location(s) still remain`);
      } else {
        console.log('✅ No duplicates - itinerary is clean!');
      }
      console.log('========================================\n');
      return NextResponse.json({ days: allDays, duplicates });
    }

    if (action === 'regenerate-day' && dayNumber) {
      // Regenerate a specific day
      console.log(`Regenerating day ${dayNumber}...`);
      if (avoidPlaces && avoidPlaces.length > 0) {
        console.log(`Avoiding ${avoidPlaces.length} places from other days`);
      }
      const day = await generateDayItinerary(TRIP_DETAILS, dayNumber, 9, avoidPlaces || []);
      return NextResponse.json({ day });
    }

    if (action === 'optimize-day' && dayNumber && places) {
      // Optimize times for existing places
      console.log(`Optimizing day ${dayNumber}...`);
      const currentDay = await generateDayItinerary(TRIP_DETAILS, dayNumber, 10);
      const optimizedPlaces = await regenerateDayWithChanges(currentDay, places as Place[]);
      return NextResponse.json({ places: optimizedPlaces });
    }

    if (action === 'regenerate-place' && dayNumber && places && placeIndex !== undefined) {
      // Regenerate a single place
      console.log(`Regenerating place ${placeIndex} on day ${dayNumber}...`);
      console.log('Places array length:', places.length);
      console.log('PlaceIndex:', placeIndex);
      
      try {
        const newPlace = await regenerateSinglePlace(dayNumber, placeIndex, places as Place[], TRIP_DETAILS);
        console.log('Successfully regenerated place:', newPlace.name);
        return NextResponse.json({ place: newPlace });
      } catch (error) {
        console.error('Error in regenerateSinglePlace:', error);
        throw error;
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Returning error response:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to generate itinerary', details: errorMessage },
      { status: 500 }
    );
  }
}

