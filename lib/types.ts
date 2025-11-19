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

export interface Flight {
  flightNumber: string;
  departure: {
    airport: string;
    city: string;
    time: string; // e.g., "10:30"
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
  };
}

export interface Train {
  trainNumber: string;
  departure: {
    station: string;
    city: string;
    time: string; // e.g., "12:30"
  };
  arrival: {
    station: string;
    city: string;
    time: string;
  };
}

export interface DayItinerary {
  date: string; // ISO date string
  dayNumber: number;
  city: string; // "Lisbon" or "London"
  hotel: Hotel;
  places: Place[];
  flight?: Flight; // Optional flight information for travel days
  train?: Train; // Optional train information for travel days
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
  lisbonDates: {
    start: string;
    end: string;
  };
  londonDates: {
    start: string;
    end: string;
  };
  lisbonHotel: Hotel;
  londonHotel: Hotel;
  londonHotelAlternate?: Hotel; // For Nov 24-25 stay
}

