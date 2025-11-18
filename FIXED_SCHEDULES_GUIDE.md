# Fixed Schedules Configuration Guide

## Overview

The Fixed Schedules feature allows you to add pre-booked activities, concerts, restaurant reservations, or any fixed commitments to your itinerary. The AI will automatically generate the rest of your itinerary around these fixed times.

## How It Works

1. **Add your fixed schedules** to `lib/fixedSchedules.ts`
2. **Regenerate your itinerary** - the AI will plan around your bookings
3. **The AI will:**
   - Avoid scheduling anything during your fixed times
   - Plan activities before/after considering travel time
   - Include your fixed schedules in the timeline
   - Add buffer time if you need to arrive early

## Configuration File

Edit: `lib/fixedSchedules.ts`

### Example 1: Concert/Show Booking

```typescript
{
  id: 'fado-show',
  date: '2025-11-23',           // ISO format: YYYY-MM-DD
  startTime: '20:00',           // 24-hour format
  duration: 120,                // minutes
  name: 'Fado Show at Clube de Fado',
  address: 'R. São João da Praça 94, 1100-521 Lisboa, Portugal',
  lat: 38.7104,
  lng: -9.1307,
  description: 'Traditional Portuguese Fado music performance',
  category: 'concert',
  bookingReference: 'FADO-2025-1123',  // Optional
  requiresEarlyArrival: true,          // Optional: adds buffer time
  bufferMinutes: 30,                   // Optional: how early to arrive
  notes: 'Doors open at 19:30. Dinner included.'  // Optional
}
```

### Example 2: Restaurant Reservation

```typescript
{
  id: 'belcanto-dinner',
  date: '2025-11-24',
  startTime: '19:30',
  duration: 90,
  name: 'Belcanto Restaurant',
  address: 'Largo de São Carlos 10, 1200-410 Lisboa, Portugal',
  lat: 38.7112,
  lng: -9.1426,
  description: '2 Michelin star restaurant - tasting menu',
  category: 'restaurant',
  bookingReference: 'RES-20251124-789',
  requiresEarlyArrival: true,
  bufferMinutes: 15,
  notes: 'Smart casual dress code required'
}
```

### Example 3: Guided Tour

```typescript
{
  id: 'tower-tour',
  date: '2025-11-26',
  startTime: '14:00',
  duration: 180,
  name: 'Tower of London Guided Tour',
  address: 'Tower of London, London EC3N 4AB, United Kingdom',
  lat: 51.5081,
  lng: -0.0759,
  description: 'Private guided tour including Crown Jewels',
  category: 'tour',
  bookingReference: 'TOUR-TOL-456',
  requiresEarlyArrival: true,
  bufferMinutes: 20,
  notes: 'Meet guide at main entrance. Tickets pre-paid.'
}
```

## Field Descriptions

### Required Fields

- **`id`**: Unique identifier (e.g., 'concert-1', 'dinner-lisbon')
- **`date`**: Date in ISO format (YYYY-MM-DD)
- **`startTime`**: Start time in 24-hour format (HH:MM)
- **`duration`**: Duration in minutes
- **`name`**: Name of the activity/venue
- **`address`**: Full address
- **`lat`**: Latitude coordinate
- **`lng`**: Longitude coordinate
- **`description`**: Brief description
- **`category`**: Type of activity

### Optional Fields

- **`bookingReference`**: Your booking/ticket reference number
- **`requiresEarlyArrival`**: Set to `true` if you need to arrive early
- **`bufferMinutes`**: How many minutes early to arrive (default: 30)
- **`notes`**: Additional notes (dress code, meeting point, etc.)

## Categories

Choose from:
- `concert` - Music concerts, performances
- `restaurant` - Restaurant reservations
- `show` - Theater, musicals, shows
- `tour` - Guided tours, experiences
- `appointment` - Medical, business appointments
- `other` - Anything else

## How to Add Your Schedule

1. Open `lib/fixedSchedules.ts`
2. Find the `FIXED_SCHEDULES` array
3. Copy one of the examples
4. Modify the details for your booking
5. Save the file
6. Regenerate your itinerary (Hard Refresh button)

## Example: Adding a Fado Show

```typescript
export const FIXED_SCHEDULES: FixedSchedule[] = [
  {
    id: 'fado-1',
    date: '2025-11-23',
    startTime: '20:00',
    duration: 120,
    name: 'Fado Show at Clube de Fado',
    address: 'R. São João da Praça 94, 1100-521 Lisboa, Portugal',
    lat: 38.7104,
    lng: -9.1307,
    description: 'Traditional Portuguese Fado music performance',
    category: 'concert',
    bookingReference: 'FADO-2025-1123',
    requiresEarlyArrival: true,
    bufferMinutes: 30,
    notes: 'Doors open at 19:30. Dinner included.'
  },
  
  // Add more schedules here...
];
```

## What the AI Will Do

When you have a fixed schedule on a day:

✅ **The AI will:**
- Include your fixed schedule in the timeline at the exact time
- Plan activities BEFORE your fixed schedule
- Plan activities AFTER your fixed schedule
- Consider travel time to reach your fixed schedule location
- Add buffer time if `requiresEarlyArrival` is true
- Avoid scheduling anything during your fixed time

❌ **The AI will NOT:**
- Change your fixed schedule time
- Suggest activities during your fixed schedule
- Ignore your booking

## Example Timeline with Fixed Schedule

**Nov 23 - With Fado Show at 20:00**

```
09:00 - Castle of São Jorge (2 hours)
11:30 - Lunch at Alfama restaurant (1.5 hours)
13:30 - Tram 28 experience (1 hour)
15:00 - Pastéis de Belém (1 hour)
16:30 - Return to hotel, rest
19:00 - Travel to Fado venue (arrive by 19:30)
20:00 - 🔒 FADO SHOW (Fixed Schedule - 2 hours)
22:00 - Return to hotel
```

## Tips

1. **Get Coordinates**: Use Google Maps to find exact lat/lng
   - Right-click on location → Click coordinates to copy

2. **Buffer Time**: Add buffer for:
   - Concerts/shows: 20-30 minutes
   - Restaurants: 10-15 minutes
   - Tours: 15-20 minutes
   - Airports: 2-3 hours

3. **Duration**: Include:
   - Actual activity time
   - For restaurants: full dining experience
   - For shows: from doors open to end

4. **Multiple Schedules**: You can add multiple fixed schedules per day

## Troubleshooting

**Q: My fixed schedule isn't showing up**
- Check the date format is correct (YYYY-MM-DD)
- Ensure the date is within your trip dates
- Try regenerating the itinerary (Hard Refresh)

**Q: Activities are too close to my fixed schedule**
- Set `requiresEarlyArrival: true`
- Increase `bufferMinutes`

**Q: How do I remove a fixed schedule?**
- Delete or comment out the entry in `lib/fixedSchedules.ts`
- Regenerate the itinerary

## Support

For issues or questions, check the console logs when generating the itinerary. Fixed schedules will be logged with 🔒 markers.

