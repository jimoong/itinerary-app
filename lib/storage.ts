import { Trip } from './types';

const STORAGE_KEY = 'itinerary_trip_data';
const STORAGE_VERSION = '23'; // Version 23 for hotel transition logic (Day 5 to Day 6 hotel change)
const VERSIONS_KEY = 'itinerary_saved_versions';
const MAX_SAVED_VERSIONS = 5; // Keep last 5 versions

export interface SavedVersion {
  id: string;
  name: string;
  timestamp: number;
  trip: Trip;
  version: string;
}

export function saveTrip(trip: Trip): void {
  if (typeof window !== 'undefined') {
    const dataToSave = {
      version: STORAGE_VERSION,
      trip: trip
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }
}

// Save a named version of the current trip
export function saveVersion(trip: Trip, name?: string): string {
  if (typeof window !== 'undefined') {
    const versions = getSavedVersions();
    const timestamp = Date.now();
    const id = `version-${timestamp}`;
    const defaultName = `Itinerary ${new Date(timestamp).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;
    
    const newVersion: SavedVersion = {
      id,
      name: name || defaultName,
      timestamp,
      trip,
      version: STORAGE_VERSION
    };
    
    // Add new version at the beginning
    versions.unshift(newVersion);
    
    // Keep only MAX_SAVED_VERSIONS
    const trimmedVersions = versions.slice(0, MAX_SAVED_VERSIONS);
    
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(trimmedVersions));
    console.log(`✅ Saved version: "${newVersion.name}"`);
    
    return id;
  }
  return '';
}

// Get all saved versions
export function getSavedVersions(): SavedVersion[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(VERSIONS_KEY);
    if (data) {
      try {
        const versions = JSON.parse(data);
        return Array.isArray(versions) ? versions : [];
      } catch (error) {
        console.error('Error parsing saved versions:', error);
        return [];
      }
    }
  }
  return [];
}

// Load a specific version
export function loadVersion(versionId: string): Trip | null {
  const versions = getSavedVersions();
  const version = versions.find(v => v.id === versionId);
  
  if (version) {
    console.log(`📂 Loading version: "${version.name}"`);
    // Save it as the current trip
    saveTrip(version.trip);
    return version.trip;
  }
  
  console.warn(`Version ${versionId} not found`);
  return null;
}

// Delete a specific version
export function deleteVersion(versionId: string): boolean {
  if (typeof window !== 'undefined') {
    const versions = getSavedVersions();
    const filteredVersions = versions.filter(v => v.id !== versionId);
    
    if (filteredVersions.length < versions.length) {
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(filteredVersions));
      console.log(`🗑️ Deleted version: ${versionId}`);
      return true;
    }
  }
  return false;
}

// Rename a version
export function renameVersion(versionId: string, newName: string): boolean {
  if (typeof window !== 'undefined') {
    const versions = getSavedVersions();
    const version = versions.find(v => v.id === versionId);
    
    if (version) {
      version.name = newName;
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
      console.log(`✏️ Renamed version to: "${newName}"`);
      return true;
    }
  }
  return false;
}

export function loadTrip(): Trip | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        
        // Check if it's the new versioned format
        if (parsed.version === STORAGE_VERSION && parsed.trip) {
          const trip = parsed.trip;
          
          // Validate the trip data
          if (!trip.days || !Array.isArray(trip.days) || trip.days.length !== 10) {
            console.warn('Invalid trip data: wrong number of days. Clearing...');
            clearTrip();
            return null;
          }
          
          // Validate each day has required fields
          const isValid = trip.days.every((day: any) => 
            day && day.date && day.dayNumber && day.city && day.places
          );
          
          if (!isValid) {
            console.warn('Invalid trip data: missing required fields. Clearing...');
            clearTrip();
            return null;
          }
          
          return trip;
        } else {
          // Old format or wrong version - clear it
          console.warn('Old or incompatible data format. Clearing...');
          clearTrip();
          return null;
        }
      } catch (error) {
        console.error('Error parsing trip data:', error);
        clearTrip();
        return null;
      }
    }
  }
  return null;
}

export function clearTrip(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Trip data cleared from localStorage');
  }
}

