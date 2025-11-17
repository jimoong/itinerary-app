import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeName = searchParams.get('name');
  const address = searchParams.get('address');

  if (!placeName) {
    return NextResponse.json({ error: 'Place name is required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    // Step 1: Find the place using Places API (New)
    const searchQuery = address ? `${placeName}, ${address}` : placeName;
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,name&key=${apiKey}`;
    
    const findPlaceResponse = await fetch(findPlaceUrl);
    const findPlaceData = await findPlaceResponse.json();

    if (!findPlaceData.candidates || findPlaceData.candidates.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    const placeId = findPlaceData.candidates[0].place_id;

    // Step 2: Get place details including photos, hours, phone, website
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos,opening_hours,formatted_phone_number,international_phone_number,website&key=${apiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (!detailsData.result) {
      return NextResponse.json({ photos: [], details: {} });
    }

    const result = detailsData.result;

    // Step 3: Generate photo URLs (limit to 10 photos)
    const photos = result.photos ? result.photos.slice(0, 10).map((photo: any) => {
      return {
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`,
        attribution: photo.html_attributions?.[0] || '',
      };
    }) : [];

    // Step 4: Extract place details
    const details = {
      openingHours: result.opening_hours?.weekday_text || null,
      isOpenNow: result.opening_hours?.open_now,
      phoneNumber: result.formatted_phone_number || result.international_phone_number || null,
      website: result.website || null,
    };

    return NextResponse.json({ photos, details });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

