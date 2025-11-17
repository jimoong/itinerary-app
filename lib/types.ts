export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  duration: number; // in minutes
  category: string; // e.g., "restaurant", "museum", "park", "landmark"
  startTime?: string; // e.g., "09:00"
  transportToNext?: {
    mode: 'walk' | 'taxi' | 'metro' | 'tram';
    duration: number; // in minutes
    distance?: string; // e.g., "1.2 km"
  };
  kidsRating?: string; // e.g., "Perfect for ages 6-9", "Interactive for kids"
}

export interface Hotel {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface DayItinerary {
  date: string; // ISO date string
  dayNumber: number;
  city: string; // "Prague" or "London"
  hotel: Hotel;
  places: Place[];
}

export interface Traveler {
  role: string;
  age: number;
}

export interface Trip {
  travelers: Traveler[];
  days: DayItinerary[];
  startDate: string;
  endDate: string;
}

export interface TripDetails {
  travelers: Traveler[];
  pragueDates: {
    start: string;
    end: string;
  };
  londonDates: {
    start: string;
    end: string;
  };
  pragueHotel: Hotel;
  londonHotel: Hotel;
}

