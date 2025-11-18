import { TripDetails, Flight, Train } from './types';

export const TRIP_DETAILS: TripDetails = {
  travelers: [
    { role: "Dad", age: 46 },
    { role: "Mom", age: 39 },
    { role: "Girl", age: 9 },
    { role: "Boy", age: 6 }
  ],
  parisDates: {
    start: "2025-11-21",
    end: "2025-11-25"  // 5 days in Paris: Nov 21 (arrival), 22, 23, 24, 25 (departure midday)
  },
  londonDates: {
    start: "2025-11-25",
    end: "2025-11-28"  // 4 days in London: Nov 25 (arrival afternoon), 26, 27, 28 (departure morning)
  },
  parisHotel: {
    name: "Hyatt Regency Paris Étoile",
    address: "3 Place du Général Koenig, 75017 Paris, France",
    lat: 48.88012,
    lng: 2.28332
  },
  londonHotel: {
    name: "Hyatt Regency London Blackfriars",
    address: "1 Blackfriars, London SE1 8NZ, United Kingdom",
    lat: 51.51226,
    lng: -0.10464
  }
};

// Flight information for travel days
export const SFO_TO_PARIS_FLIGHT: Flight = {
  flightNumber: "UA990",
  departure: {
    airport: "SFO",
    city: "San Francisco",
    time: "18:30" // San Francisco local time (PST)
  },
  arrival: {
    airport: "CDG",
    city: "Paris",
    time: "13:45" // Paris local time (CET) next day - 9hr flight + 9hr timezone
  }
};

export const PARIS_TO_LONDON_TRAIN: Train = {
  trainNumber: "Eurostar",
  departure: {
    station: "Gare du Nord",
    city: "Paris",
    time: "12:30" // Paris local time (CET)
  },
  arrival: {
    station: "St Pancras International",
    city: "London",
    time: "13:57" // London local time (GMT) - 2h 27min journey
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

