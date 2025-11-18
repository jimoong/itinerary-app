/**
 * Fixed Schedules Configuration
 * 
 * Add pre-booked activities, concerts, reservations, or any fixed commitments here.
 * The AI will generate itineraries around these fixed schedules.
 * 
 * HOW TO USE:
 * 1. Add your fixed schedule to the FIXED_SCHEDULES array below
 * 2. Specify the date, time, duration, and details
 * 3. The AI will automatically avoid scheduling anything during these times
 * 4. The AI will plan activities before/after considering travel time
 */

export interface FixedSchedule {
  id: string;
  date: string; // ISO format: "2025-11-23"
  startTime: string; // "HH:MM" format: "19:30"
  duration: number; // in minutes
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  category: 'concert' | 'restaurant' | 'show' | 'tour' | 'appointment' | 'other';
  bookingReference?: string; // Optional booking/ticket reference
  notes?: string; // Optional additional notes
  requiresEarlyArrival?: boolean; // If true, AI will add buffer time before
  bufferMinutes?: number; // Extra time to arrive early (default: 30 min)
}

/**
 * FIXED SCHEDULES
 * 
 * Add your pre-booked activities below.
 * The AI will generate the rest of the itinerary around these fixed times.
 */
export const FIXED_SCHEDULES: FixedSchedule[] = [
  // EXAMPLE 1: Concert booking
  // {
  //   id: 'concert-1',
  //   date: '2025-11-23',
  //   startTime: '20:00',
  //   duration: 120, // 2 hours
  //   name: 'Fado Show at Clube de Fado',
  //   address: 'R. São João da Praça 94, 1100-521 Lisboa, Portugal',
  //   lat: 38.7104,
  //   lng: -9.1307,
  //   description: 'Traditional Portuguese Fado music performance',
  //   category: 'concert',
  //   bookingReference: 'FADO-2025-1123',
  //   requiresEarlyArrival: true,
  //   bufferMinutes: 30,
  //   notes: 'Doors open at 19:30. Dinner included.'
  // },

  // EXAMPLE 2: Restaurant reservation
  // {
  //   id: 'dinner-1',
  //   date: '2025-11-24',
  //   startTime: '19:30',
  //   duration: 90,
  //   name: 'Belcanto Restaurant',
  //   address: 'Largo de São Carlos 10, 1200-410 Lisboa, Portugal',
  //   lat: 38.7112,
  //   lng: -9.1426,
  //   description: '2 Michelin star restaurant - tasting menu',
  //   category: 'restaurant',
  //   bookingReference: 'RES-20251124-789',
  //   requiresEarlyArrival: true,
  //   bufferMinutes: 15,
  //   notes: 'Smart casual dress code required'
  // },

  // EXAMPLE 3: Guided tour
  // {
  //   id: 'tour-1',
  //   date: '2025-11-26',
  //   startTime: '14:00',
  //   duration: 180, // 3 hours
  //   name: 'Tower of London Guided Tour',
  //   address: 'Tower of London, London EC3N 4AB, United Kingdom',
  //   lat: 51.5081,
  //   lng: -0.0759,
  //   description: 'Private guided tour of Tower of London including Crown Jewels',
  //   category: 'tour',
  //   bookingReference: 'TOUR-TOL-456',
  //   requiresEarlyArrival: true,
  //   bufferMinutes: 20,
  //   notes: 'Meet guide at main entrance. Tickets pre-paid.'
  // },

  // ADD YOUR FIXED SCHEDULES HERE:
  // Copy one of the examples above and modify the details
  
];

/**
 * Get fixed schedules for a specific date
 */
export function getFixedSchedulesForDate(date: string): FixedSchedule[] {
  return FIXED_SCHEDULES.filter(schedule => schedule.date === date);
}

/**
 * Get all fixed schedules for a date range
 */
export function getFixedSchedulesForDateRange(startDate: string, endDate: string): FixedSchedule[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return FIXED_SCHEDULES.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    return scheduleDate >= start && scheduleDate <= end;
  });
}

/**
 * Check if there are any fixed schedules for the trip
 */
export function hasFixedSchedules(): boolean {
  return FIXED_SCHEDULES.length > 0;
}

/**
 * Get a summary of all fixed schedules (for logging/debugging)
 */
export function getFixedSchedulesSummary(): string {
  if (FIXED_SCHEDULES.length === 0) {
    return 'No fixed schedules configured';
  }
  
  return FIXED_SCHEDULES.map(schedule => 
    `${schedule.date} ${schedule.startTime} - ${schedule.name} (${schedule.duration}min)`
  ).join('\n');
}

/**
 * Format fixed schedule for AI prompt
 */
export function formatFixedScheduleForPrompt(schedule: FixedSchedule): string {
  const endTime = calculateEndTime(schedule.startTime, schedule.duration);
  const arrivalTime = schedule.requiresEarlyArrival 
    ? calculateEndTime(schedule.startTime, -(schedule.bufferMinutes || 30))
    : schedule.startTime;
  
  return `
🔒 FIXED SCHEDULE - CANNOT BE CHANGED:
   Name: ${schedule.name}
   Time: ${schedule.startTime} - ${endTime} (${schedule.duration} minutes)
   ${schedule.requiresEarlyArrival ? `⚠️ Must arrive by: ${arrivalTime} (${schedule.bufferMinutes || 30} min early)` : ''}
   Location: ${schedule.address}
   Category: ${schedule.category}
   ${schedule.bookingReference ? `Booking: ${schedule.bookingReference}` : ''}
   ${schedule.notes ? `Notes: ${schedule.notes}` : ''}
   
   ⚠️ DO NOT schedule any activities during ${arrivalTime} - ${endTime}
   ⚠️ Plan activities BEFORE this time or AFTER this time
   ⚠️ Consider travel time to reach this location
`;
}

/**
 * Helper to calculate end time
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

