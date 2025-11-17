# Quick Start Guide

## Setup Instructions

1. **Install Dependencies** (if not already done)
   ```bash
   npm install
   ```

2. **Configure API Keys**
   
   You need to set up two API keys. You can either:
   
   ### Option A: Environment Variables (Recommended)
   Set these environment variables directly in your terminal:
   ```bash
   export NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_key_here"
   export OPENAI_API_KEY="your_key_here"
   ```
   
   ### Option B: .env.local File
   Create a file named `.env.local` in the project root with:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Get Your API Keys**

   **Google Maps API:**
   - Visit: https://console.cloud.google.com/
   - Create/select a project
   - Enable "Maps JavaScript API"
   - Create an API key
   
   **OpenAI API:**
   - Visit: https://platform.openai.com/api-keys
   - Sign up/login
   - Create a new API key
   - Note: This will use GPT-4 and will incur costs

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Open the App**
   Navigate to: http://localhost:3000

## First Use

- The app will automatically generate a 7-day itinerary on first load
- This initial generation takes 1-2 minutes
- All data is saved to your browser's localStorage

## Features

- **Navigate Days**: Use Previous/Next buttons at the top
- **View on Map**: Left panel shows all locations with numbered markers
- **See Timeline**: Right panel shows schedule with times
- **Add Places**: Click "Add Place" button
- **Remove Places**: Click trash icon on any activity
- **Optimize**: Click "Optimize Times" to adjust schedule
- **Regenerate**: Click "Regenerate Day" for new suggestions
- **Reset**: Click "Reset All" to start fresh

## Troubleshooting

**Map not loading?**
- Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set correctly
- Verify the Maps JavaScript API is enabled in Google Cloud Console

**AI generation failing?**
- Check that OPENAI_API_KEY is set correctly
- Ensure you have credits in your OpenAI account
- The app will use fallback data if AI generation fails

**Changes not saving?**
- Check browser localStorage is not disabled
- Try a different browser

## Build for Production

```bash
npm run build
npm start
```

## Cost Estimates

- **Google Maps**: Free tier includes 28,000 map loads/month
- **OpenAI GPT-4**: Approximately $0.10-0.30 per full itinerary generation

