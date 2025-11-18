import { NextRequest } from 'next/server';
import { generateDayItinerary } from '@/lib/openai';
import { TRIP_DETAILS } from '@/lib/constants';
import { DayItinerary } from '@/lib/types';
import { getRegenerationScope, getRegenerationDescription, getPastDaysPlaceNames } from '@/lib/tripTimeUtils';
import { generateMasterPOIList } from '@/lib/masterPOIGenerator';
import { distributePOIsAcrossDays } from '@/lib/dailyDistributor';

// Configure for streaming on Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

// Helper function to check for duplicate locations across days
function checkForDuplicates(allDays: DayItinerary[]) {
  const locationMap = new Map<string, number[]>(); // location name -> array of day numbers
  
  allDays.forEach((day, dayIndex) => {
    day.places.forEach(place => {
      const placeName = place.name.toLowerCase();
      // Skip hotels and transportation
      if (placeName.includes('hotel') || placeName.includes('andaz') || placeName.includes('hyatt') || place.category === 'airport') {
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
  
  const { regenerateSinglePlace } = await import('@/lib/openai');
  const { TRIP_DETAILS } = await import('@/lib/constants');
  
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
  // Check if this is a smart regeneration (from current time onwards) or two-phase mode
  const body = await request.json();
  const { smartRegeneration, existingDays, useTwoPhase = true } = body; // Two-phase is now default
  
  console.log('========================================');
  console.log('🚀 STREAMING ITINERARY GENERATION');
  if (smartRegeneration) {
    console.log('⏰ SMART MODE: Generating from current time onwards');
  }
  if (useTwoPhase) {
    console.log('🎯 TWO-PHASE MODE: Master POI list → Daily distribution');
  }
  console.log('========================================');

  // Create a ReadableStream for Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const visitedPlaces: string[] = [];
        let allDays: DayItinerary[] = [];
        let aiGeneratedCount = 0;
        let fallbackCount = 0;
        
        // Determine regeneration scope
        let scope = { startDayNumber: 1, endDayNumber: 10, reason: 'Full generation' };
        if (smartRegeneration) {
          scope = getRegenerationScope();
          console.log(`\n📍 ${scope.reason}`);
          console.log(`📅 ${getRegenerationDescription(scope)}`);
          
          // If we have existing days, preserve the past ones
          if (existingDays && Array.isArray(existingDays)) {
            const pastDays = existingDays.filter((day: DayItinerary) => day.dayNumber < scope.startDayNumber);
            allDays = pastDays;
            
            // Add past places to visited list
            const pastPlaceNames = getPastDaysPlaceNames(existingDays, scope);
            visitedPlaces.push(...pastPlaceNames);
            
            console.log(`✅ Preserved ${pastDays.length} past days`);
            console.log(`📝 Avoiding ${visitedPlaces.length} places from past days`);
            
            // Send past days immediately
            for (const day of pastDays) {
              const data = JSON.stringify({ 
                type: 'day', 
                day,
                progress: { current: day.dayNumber, total: 10 },
                preserved: true
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
        }

        // TWO-PHASE GENERATION or FALLBACK TO OLD METHOD
        if (useTwoPhase && !smartRegeneration) {
          // ===== PHASE 1: Generate Master POI List =====
          console.log('\n🎯 [PHASE 1] Generating Master POI List...');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            message: 'Generating master POI list...',
            phase: 1,
            progress: { current: 0, total: 10 }
          })}\n\n`));
          
          try {
            const masterPOIs = await generateMasterPOIList(TRIP_DETAILS, visitedPlaces);
            console.log(`✅ Master POI list generated: ${masterPOIs.totalCount} POIs`);
            aiGeneratedCount++; // Count master list generation
            
            // ===== PHASE 2: Distribute POIs Across Days =====
            console.log('\n📅 [PHASE 2] Distributing POIs across days...');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              message: 'Distributing POIs across days...',
              phase: 2,
              progress: { current: 0, total: 10 }
            })}\n\n`));
            
            const distributedDays = await distributePOIsAcrossDays(masterPOIs, TRIP_DETAILS);
            console.log(`✅ Distribution complete: ${distributedDays.length} days`);
            aiGeneratedCount++; // Count distribution
            
            // Add distributed days to allDays
            allDays.push(...distributedDays);
            
            // Stream each day to client
            for (let i = 0; i < distributedDays.length; i++) {
              const day = distributedDays[i];
              const data = JSON.stringify({ 
                type: 'day', 
                day,
                progress: { current: i + 1, total: 10 }
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              console.log(`✅ Day ${day.dayNumber} sent to client`);
            }
            
          } catch (error) {
            console.error('❌ Two-phase generation failed, falling back to old method:', error);
            // Fall back to old method
            allDays = [];
            for (let i = scope.startDayNumber; i <= scope.endDayNumber; i++) {
              console.log(`\n--- Day ${i}/10 (FALLBACK) ---`);
              const day = await generateDayItinerary(TRIP_DETAILS, i, 10, visitedPlaces);
              allDays.push(day);
              fallbackCount++;
              
              day.places.forEach(place => {
                if (!place.name.toLowerCase().includes('hotel') && place.category !== 'airport') {
                  visitedPlaces.push(place.name);
                }
              });
              
              const data = JSON.stringify({ 
                type: 'day', 
                day,
                progress: { current: i, total: 10 }
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
        } else {
          // OLD METHOD: Day-by-day generation (for smart regeneration or when two-phase is disabled)
          for (let i = scope.startDayNumber; i <= scope.endDayNumber; i++) {
            console.log(`\n--- Day ${i}/10 ---`);
            
            // Generate the day
            const day = await generateDayItinerary(TRIP_DETAILS, i, 10, visitedPlaces);
            allDays.push(day);
            
            // Track AI vs fallback
            const isLikelyFallback = day.places.some(p => 
              p.description?.includes('fallback') || 
              p.description?.includes('default')
            );
            
            if (isLikelyFallback) {
              fallbackCount++;
            } else {
              aiGeneratedCount++;
            }
            
            // Add places to visited list (excluding hotels)
            day.places.forEach(place => {
              if (!place.name.toLowerCase().includes('hotel') && 
                  !place.name.toLowerCase().includes('andaz') && 
                  !place.name.toLowerCase().includes('hyatt')) {
                visitedPlaces.push(place.name);
              }
            });
            
            console.log(`📝 Visited places so far: ${visitedPlaces.length}`);
            
            // Send the day as a Server-Sent Event
            const data = JSON.stringify({ 
              type: 'day', 
              day,
              progress: { current: i, total: 10 }
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            
            console.log(`✅ Day ${i} sent to client`);
          }
        }
        
        // Check for duplicates (only for old method, two-phase shouldn't have duplicates)
        if (!useTwoPhase || smartRegeneration) {
          console.log('\n========================================');
          console.log('🔍 CHECKING FOR DUPLICATE LOCATIONS');
          console.log('========================================');
          let duplicates = checkForDuplicates(allDays);
          
          // Auto-replace duplicates if found
          if (duplicates.length > 0) {
            allDays = await replaceDuplicates(allDays, duplicates);
            
            // Re-check for any remaining duplicates
            console.log('\n========================================');
            console.log('🔍 RE-CHECKING FOR DUPLICATES');
            console.log('========================================');
            duplicates = checkForDuplicates(allDays);
            
            // Send updated days to client
            for (let i = 0; i < allDays.length; i++) {
              const data = JSON.stringify({ 
                type: 'day', 
                day: allDays[i],
                progress: { current: i + 1, total: 10 }
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
        } else {
          // For two-phase, just verify no duplicates (should be zero)
          console.log('\n========================================');
          console.log('🔍 VERIFYING NO DUPLICATES (Two-Phase)');
          console.log('========================================');
          checkForDuplicates(allDays);
        }
        
        // Send completion event
        console.log('\n========================================');
        console.log('✅ ITINERARY GENERATION COMPLETE');
        console.log(`📊 Summary: ${aiGeneratedCount} days from AI, ${fallbackCount} days from fallback`);
        if (duplicates.length > 0) {
          console.log(`⚠️ Warning: ${duplicates.length} duplicate location(s) still remain`);
        } else {
          console.log('✅ No duplicates - itinerary is clean!');
        }
        console.log('========================================\n');
        
        const completionData = JSON.stringify({ 
          type: 'complete',
          summary: { aiGeneratedCount, fallbackCount, duplicates }
        });
        controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
        
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        const errorData = JSON.stringify({ 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

