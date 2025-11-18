import { TripDetails, Flight, Train } from './types';

export const TRIP_DETAILS: TripDetails = {
  travelers: [
    { role: "Dad", age: 46 },
    { role: "Mom", age: 39 },
    { role: "Girl", age: 9 },
    { role: "Boy", age: 6 }
  ],
  lisbonDates: {
    start: "2025-11-21",
    end: "2025-11-25"  // 5 days in Lisbon: Nov 21 (arrival), 22, 23, 24, 25 (departure midday)
  },
  londonDates: {
    start: "2025-11-25",
    end: "2025-11-29"  // 5 days in London: Nov 25 (arrival afternoon), 26, 27, 28, 29 (departure morning)
  },
  lisbonHotel: {
    name: "Hyatt Regency Lisbon",
    address: "Rua da Junqueira, 65, 1300-343 Lisbon, Portugal",
    lat: 38.69751,
    lng: -9.19182
  },
  londonHotel: {
    name: "Hyatt Regency London Blackfriars",
    address: "1 Blackfriars, London SE1 8NZ, United Kingdom",
    lat: 51.51226,
    lng: -0.10464
  }
};

// Flight information for travel days
export const SFO_TO_LISBON_FLIGHT: Flight = {
  flightNumber: "TBD", // To be provided by user
  departure: {
    airport: "SFO",
    city: "San Francisco",
    time: "18:00" // Placeholder - San Francisco local time (PST)
  },
  arrival: {
    airport: "LIS",
    city: "Lisbon",
    time: "13:00" // Placeholder - Lisbon local time (WET) next day
  }
};

export const LISBON_TO_LONDON_FLIGHT: Flight = {
  flightNumber: "TBD", // To be provided by user
  departure: {
    airport: "LIS",
    city: "Lisbon",
    time: "12:00" // Placeholder - Lisbon local time (WET) midday
  },
  arrival: {
    airport: "LHR",
    city: "London",
    time: "14:30" // Placeholder - London local time (GMT) - ~2.5hr flight
  }
};

export const LONDON_TO_SFO_FLIGHT: Flight = {
  flightNumber: "TBD", // To be provided by user
  departure: {
    airport: "LHR",
    city: "London",
    time: "11:00" // London local time (GMT) - morning departure
  },
  arrival: {
    airport: "SFO",
    city: "San Francisco",
    time: "14:00" // San Francisco local time (PST) - 8 hours behind London
  }
};

