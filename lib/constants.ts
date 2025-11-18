import { TripDetails, Flight } from './types';

export const TRIP_DETAILS: TripDetails = {
  travelers: [
    { role: "Dad", age: 46 },
    { role: "Mom", age: 39 },
    { role: "Girl", age: 9 },
    { role: "Boy", age: 6 }
  ],
  pragueDates: {
    start: "2025-11-21",
    end: "2025-11-25"  // 5 days in Prague: Nov 21 (arrival), 22, 23, 24, 25 (departure morning)
  },
  londonDates: {
    start: "2025-11-25",
    end: "2025-11-28"  // 4 days in London: Nov 25 (arrival afternoon), 26, 27, 28 (departure morning)
  },
  pragueHotel: {
    name: "Andaz Prague",
    address: "Senovážné náměstí 976/31, 110 00 Nové Město, Czech Republic",
    lat: 50.08548,
    lng: 14.43034
  },
  londonHotel: {
    name: "Hyatt Regency London Blackfriars",
    address: "1 Blackfriars, London SE1 8NZ, United Kingdom",
    lat: 51.51226,
    lng: -0.10464
  }
};

// Flight information for travel day
export const PRAGUE_TO_LONDON_FLIGHT: Flight = {
  flightNumber: "BA0855",
  departure: {
    airport: "PRG",
    city: "Prague",
    time: "13:50" // Prague local time (CET)
  },
  arrival: {
    airport: "LHR",
    city: "London",
    time: "16:05" // London local time (GMT) - 1 hour behind Prague
  }
};

