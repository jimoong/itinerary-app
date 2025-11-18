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

// Flight information for travel days
export const FRANKFURT_TO_PRAGUE_FLIGHT: Flight = {
  flightNumber: "EN 8958",
  departure: {
    airport: "FRA",
    city: "Frankfurt",
    time: "17:00" // Frankfurt local time (CET)
  },
  arrival: {
    airport: "PRG",
    city: "Prague",
    time: "18:05" // Prague local time (CET) - same timezone
  }
};

export const PRAGUE_TO_LONDON_FLIGHT: Flight = {
  flightNumber: "BA0855",
  departure: {
    airport: "PRG",
    city: "Prague",
    time: "14:50" // Prague local time (CET)
  },
  arrival: {
    airport: "LHR",
    city: "London",
    time: "16:05" // London local time (GMT) - 1 hour behind Prague
  }
};

export const LONDON_TO_SFO_FLIGHT: Flight = {
  flightNumber: "VS 19",
  departure: {
    airport: "LHR",
    city: "London",
    time: "11:30" // London local time (GMT)
  },
  arrival: {
    airport: "SFO",
    city: "San Francisco",
    time: "14:30" // San Francisco local time (PST) - 8 hours behind London
  }
};

