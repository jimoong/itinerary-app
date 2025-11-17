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

    // Step 2: Get place details including photos
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos&key=${apiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (!detailsData.result || !detailsData.result.photos) {
      return NextResponse.json({ photos: [] });
    }

    // Step 3: Generate photo URLs (limit to 10 photos)
    const photos = detailsData.result.photos.slice(0, 10).map((photo: any) => {
      return {
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`,
        attribution: photo.html_attributions?.[0] || '',
      };
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

