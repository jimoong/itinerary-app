import { NextRequest } from 'next/server';
import { generateDayItinerary } from '@/lib/openai';
import { TRIP_DETAILS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  console.log('========================================');
  console.log('🚀 STREAMING ITINERARY GENERATION');
  console.log('========================================');

  // Create a ReadableStream for Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const visitedPlaces: string[] = [];
        let aiGeneratedCount = 0;
        let fallbackCount = 0;

        for (let i = 1; i <= 9; i++) {
          console.log(`\n--- Day ${i}/9 ---`);
          
          // Generate the day
          const day = await generateDayItinerary(TRIP_DETAILS, i, 9, visitedPlaces);
          
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
          
          // Add places to visited list
          day.places.forEach(place => {
            visitedPlaces.push(place.name);
          });
          
          // Send the day as a Server-Sent Event
          const data = JSON.stringify({ 
            type: 'day', 
            day,
            progress: { current: i, total: 9 }
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          
          console.log(`✅ Day ${i} sent to client`);
        }
        
        // Send completion event
        console.log('\n========================================');
        console.log('✅ ITINERARY GENERATION COMPLETE');
        console.log(`📊 Summary: ${aiGeneratedCount} days from AI, ${fallbackCount} days from fallback`);
        console.log('========================================\n');
        
        const completionData = JSON.stringify({ 
          type: 'complete',
          summary: { aiGeneratedCount, fallbackCount }
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

