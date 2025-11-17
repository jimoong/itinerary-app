# London & Prague Itinerary Explorer

An AI-powered itinerary planning application for a family trip to Prague and London.

## Features

- **AI-Generated Itineraries**: Automatically generates family-friendly daily schedules using OpenAI
- **Interactive Map**: Google Maps integration with numbered markers for each location
- **Visual Timeline**: Daily schedule with times, durations, and descriptions
- **Day Navigation**: Easy pagination through 7 days of travel
- **Editable**: Add, remove, and optimize places in your itinerary
- **Auto-Save**: All changes saved to browser localStorage
- **Responsive Design**: Clean, modern UI built with Tailwind CSS

## Trip Details

- **Dates**: November 21-25 (Prague), November 25-28 (London)
- **Travelers**: Family of 4 (Dad 46, Mom 39, Girl 9, Boy 6)
- **Hotels**: 
  - Prague: Andaz Prague
  - London: Hyatt Regency London Blackfriars

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Google Maps API key
- OpenAI API key

### Installation

1. Clone the repository:
```bash
cd Itinerary
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENAI_API_KEY=your_openai_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Viewing the Itinerary

- Use **Previous/Next** buttons to navigate between days
- Click on **numbered markers** on the map to highlight places
- View detailed information in the timeline panel

### Editing

- **Add Place**: Click the "Add Place" button to manually add a location
- **Remove Place**: Click the trash icon on any timeline item
- **Optimize Times**: Click "Optimize Times" to have AI adjust start times and durations
- **Regenerate Day**: Click "Regenerate Day" to get completely new suggestions
- **Reset All**: Start fresh with a new AI-generated itinerary for all days

## Project Structure

```
├── app/
│   ├── api/
│   │   └── generate-itinerary/
│   │       └── route.ts          # API endpoint for OpenAI integration
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main application page
│   └── globals.css               # Global styles
├── components/
│   ├── DayNavigation.tsx         # Day pagination controls
│   ├── EditPlace.tsx             # Add place modal
│   ├── MapView.tsx               # Google Maps component
│   └── Timeline.tsx              # Daily schedule timeline
├── lib/
│   ├── constants.ts              # Trip configuration
│   ├── openai.ts                 # OpenAI helper functions
│   ├── storage.ts                # localStorage utilities
│   └── types.ts                  # TypeScript type definitions
└── package.json
```

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Maps API** - Map and location services
- **OpenAI GPT-4** - AI itinerary generation
- **date-fns** - Date formatting
- **lucide-react** - Icon library

## API Keys Setup

### Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Maps JavaScript API
4. Create credentials (API key)
5. Add the key to `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API keys section
4. Create a new API key
5. Add the key to `.env.local` as `OPENAI_API_KEY`

## Notes

- Data is saved to browser localStorage
- First load generates all 7 days (may take 1-2 minutes)
- AI responses may vary each time you regenerate
- Coordinates must be entered manually when adding places

## License

MIT

