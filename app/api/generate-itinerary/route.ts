import { NextRequest, NextResponse } from 'next/server';
import { generateDayItinerary, regenerateDayWithChanges, regenerateSinglePlace } from '@/lib/openai';
import { TRIP_DETAILS } from '@/lib/constants';
import { Place } from '@/lib/types';

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
      // Generate all 9 days (5 Prague + 4 London)
      console.log('========================================');
      console.log('🚀 GENERATING ALL 9 DAYS OF ITINERARY');
      console.log('========================================');
      const allDays = [];
      const visitedPlaces: string[] = [];
      let aiGeneratedCount = 0;
      let fallbackCount = 0;
      
      for (let i = 1; i <= 9; i++) {
        console.log(`\n--- Day ${i}/9 ---`);
        const day = await generateDayItinerary(TRIP_DETAILS, i, 9, visitedPlaces);
        allDays.push(day);
        
        // Track if this was AI generated or fallback (check if it has the expected structure)
        // Fallback data typically has specific placeholder patterns
        const isLikelyFallback = day.places.some(p => 
          p.description?.includes('fallback') || 
          p.description?.includes('default')
        );
        
        if (isLikelyFallback) {
          fallbackCount++;
        } else {
          aiGeneratedCount++;
        }
        
        // Add this day's places to visited list
        day.places.forEach(place => {
          visitedPlaces.push(place.name);
        });
      }
      
      console.log('\n========================================');
      console.log('✅ ITINERARY GENERATION COMPLETE');
      console.log(`📊 Summary: ${aiGeneratedCount} days from AI, ${fallbackCount} days from fallback`);
      console.log('========================================\n');
      return NextResponse.json({ days: allDays });
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
      const currentDay = await generateDayItinerary(TRIP_DETAILS, dayNumber, 9);
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

