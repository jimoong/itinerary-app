# Excluded POIs Configuration Guide

This guide explains how to configure places that should be **excluded** from AI-generated itineraries.

## Overview

The excluded POIs feature allows you to maintain a list of places you want to avoid when generating itineraries. This is useful for:

- **Already visited places**: Don't suggest places you've been to before
- **Not interested**: Exclude attractions that don't appeal to you
- **Bad experiences**: Avoid places with poor reviews or past bad experiences
- **Overrated tourist traps**: Skip places you consider not worth visiting
- **Dietary restrictions**: Exclude restaurants that don't fit your needs
- **Age-inappropriate**: Avoid places not suitable for your family

## How to Configure

### 1. Open the Configuration File

Navigate to: `lib/excludedPOIs.ts`

### 2. Add Your Excluded Places

Find the `EXCLUDED_POIS` array and add your entries:

```typescript
export const EXCLUDED_POIS: ExcludedPOI[] = [
  {
    id: 'madame-tussauds',
    name: 'Madame Tussauds',
    city: 'London',
    reason: 'Already visited on previous trip',
    category: 'museum'
  },
  // Add more entries here...
];
```

### 3. Field Descriptions

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | ✅ Yes | string | Unique identifier (use lowercase with hyphens) |
| `name` | ✅ Yes | string | Exact name of the place to exclude |
| `city` | ✅ Yes | 'Lisbon' \| 'London' \| 'Any' | Which city to exclude from ('Any' = all cities) |
| `reason` | ❌ Optional | string | Why you're excluding it (for your reference) |
| `category` | ❌ Optional | string | Type of place (restaurant, museum, landmark, etc.) |

### 4. City Options

- **'Lisbon'**: Exclude only from Lisbon itineraries
- **'London'**: Exclude only from London itineraries
- **'Any'**: Exclude from all cities (useful for chain restaurants/stores)

## Examples

### Example 1: Already Visited

```typescript
{
  id: 'tower-of-london',
  name: 'Tower of London',
  city: 'London',
  reason: 'Visited in 2022',
  category: 'landmark'
}
```

### Example 2: Not Kid-Friendly

```typescript
{
  id: 'london-dungeon',
  name: 'The London Dungeon',
  city: 'London',
  reason: 'Too scary for young children',
  category: 'entertainment'
}
```

### Example 3: Overrated Tourist Trap

```typescript
{
  id: 'piccadilly-circus',
  name: 'Piccadilly Circus',
  city: 'London',
  reason: 'Just a busy intersection, not worth visiting',
  category: 'landmark'
}
```

### Example 4: Bad Food Experience

```typescript
{
  id: 'tourist-restaurant',
  name: 'Angus Steakhouse',
  city: 'London',
  reason: 'Tourist trap with mediocre food',
  category: 'restaurant'
}
```

### Example 5: Generic Chain (All Cities)

```typescript
{
  id: 'hard-rock-cafe',
  name: 'Hard Rock Cafe',
  city: 'Any',
  reason: 'Generic chain, prefer local restaurants',
  category: 'restaurant'
}
```

### Example 6: Dietary Restrictions

```typescript
{
  id: 'steakhouse-xyz',
  name: 'XYZ Steakhouse',
  city: 'Lisbon',
  reason: 'No vegetarian options for family member',
  category: 'restaurant'
}
```

## How It Works

1. **Configuration**: You add places to `lib/excludedPOIs.ts`
2. **AI Prompt**: The excluded places are automatically added to the AI prompt
3. **Generation**: The AI avoids suggesting any of these places
4. **Enforcement**: The system uses exact and partial name matching to catch variations

## Matching Logic

The system uses **case-insensitive partial matching**, so:

- Excluding "Madame Tussauds" will also catch "Madame Tussauds London"
- Excluding "Hard Rock" will catch "Hard Rock Cafe London" and "Hard Rock Cafe Lisbon"
- Be specific enough to avoid false positives

## Tips

### ✅ Do This

- **Be specific**: Use the full, official name of the place
- **Add reasons**: Helps you remember why you excluded it later
- **Use 'Any' wisely**: Great for chains you want to avoid everywhere
- **Review regularly**: Remove entries when preferences change

### ❌ Avoid This

- **Too generic**: Don't exclude "Museum" - be specific like "British Museum"
- **Misspellings**: Use correct spelling to ensure matching works
- **Overly broad**: Don't exclude entire categories, exclude specific places

## Testing Your Configuration

After adding excluded POIs:

1. **Hard refresh** your itinerary (use the refresh button)
2. **Check the console logs** - you'll see: `Excluded POIs: X in Lisbon, Y in London, Z in all cities`
3. **Verify** that excluded places don't appear in the generated itinerary

## Common Use Cases

### Family with Young Kids

```typescript
// Exclude scary or inappropriate attractions
{ id: 'london-dungeon', name: 'The London Dungeon', city: 'London', reason: 'Too scary for kids' },
{ id: 'madame-tussauds', name: 'Madame Tussauds', city: 'Any', reason: 'Kids not interested in wax figures' }
```

### Vegetarian Family

```typescript
// Exclude meat-focused restaurants
{ id: 'steakhouse-1', name: 'Hawksmoor', city: 'London', reason: 'Limited vegetarian options' },
{ id: 'churrascaria', name: 'Brazilian Steakhouse', city: 'Lisbon', reason: 'Meat-only focus' }
```

### Budget-Conscious Travelers

```typescript
// Exclude expensive attractions
{ id: 'shard', name: 'The Shard', city: 'London', reason: 'Too expensive (£35 per person)' },
{ id: 'london-eye', name: 'London Eye', city: 'London', reason: 'Overpriced for what it is' }
```

### Repeat Visitors

```typescript
// Exclude places you've already seen
{ id: 'british-museum', name: 'British Museum', city: 'London', reason: 'Visited in 2020' },
{ id: 'tower-bridge', name: 'Tower Bridge', city: 'London', reason: 'Seen multiple times' }
```

## Troubleshooting

### Problem: Excluded place still appears

**Solutions:**
1. Check spelling - must match exactly
2. Try adding variations of the name
3. Check if it's categorized differently (e.g., "restaurant" vs "cafe")
4. Hard refresh the itinerary after making changes

### Problem: Too many places excluded

**Solutions:**
1. Be more selective - only exclude places you really want to avoid
2. Remove outdated exclusions
3. Consider if you're being too restrictive

### Problem: Not enough variety in suggestions

**Solutions:**
1. Reduce the number of excluded places
2. Be more specific with exclusions (use exact names)
3. Consider removing generic exclusions

## Advanced: Programmatic Usage

If you're a developer, you can use these helper functions:

```typescript
import { 
  getExcludedPOIsForCity, 
  isPlaceExcluded,
  getExcludedPOIsSummary 
} from '@/lib/excludedPOIs';

// Get excluded POIs for a specific city
const lisbonExcluded = getExcludedPOIsForCity('Lisbon');

// Check if a place is excluded
const isExcluded = isPlaceExcluded('Madame Tussauds', 'London');

// Get summary for logging
const summary = getExcludedPOIsSummary();
console.log(summary); // "Excluded POIs: 3 in Lisbon, 5 in London, 2 in all cities"
```

## Integration with Fixed Schedules

Excluded POIs work alongside [Fixed Schedules](./FIXED_SCHEDULES_GUIDE.md):

- **Fixed Schedules**: Places you MUST visit (pre-booked)
- **Excluded POIs**: Places you MUST NOT visit (to avoid)

Both systems inform the AI to generate better, more personalized itineraries.

## Need Help?

If you have questions or issues:

1. Check the console logs for excluded POI counts
2. Review your configuration in `lib/excludedPOIs.ts`
3. Try a hard refresh after making changes
4. Check if the place name matches exactly

---

**Happy travels! 🌍✈️**

