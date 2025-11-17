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

    // Step 2: Get place details including photos, hours, phone, website, reviews, editorial summary
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos,opening_hours,formatted_phone_number,international_phone_number,website,reviews,rating,user_ratings_total,editorial_summary&key=${apiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (!detailsData.result) {
      return NextResponse.json({ photos: [], details: {}, reviews: [] });
    }

    const result = detailsData.result;

    // Step 3: Categorize and generate photo URLs
    const categorizedPhotos = {
      food: [] as any[],
      interior: [] as any[],
      exterior: [] as any[],
    };

    if (result.photos && result.photos.length > 0) {
      // Limit to 20 photos total for better performance
      const allPhotos = result.photos.slice(0, 20);
      
      allPhotos.forEach((photo: any, index: number) => {
        const photoData = {
          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`,
          attribution: photo.html_attributions?.[0] || '',
        };

        // Categorize based on photo attributions (heuristic)
        // Google doesn't provide explicit categories, so we use a simple heuristic:
        // - First 60% likely to be food/highlights
        // - Next 20% likely interior
        // - Last 20% likely exterior
        const position = index / allPhotos.length;
        
        if (position < 0.6) {
          categorizedPhotos.food.push(photoData);
        } else if (position < 0.8) {
          categorizedPhotos.interior.push(photoData);
        } else {
          categorizedPhotos.exterior.push(photoData);
        }
      });
    }

    // Step 4: Extract place details
    const details = {
      openingHours: result.opening_hours?.weekday_text || null,
      isOpenNow: result.opening_hours?.open_now,
      phoneNumber: result.formatted_phone_number || result.international_phone_number || null,
      website: result.website || null,
      rating: result.rating || null,
      userRatingsTotal: result.user_ratings_total || null,
      editorialSummary: result.editorial_summary?.overview || null,
    };

    // Step 5: Extract top reviews (limit to 5)
    const reviews = result.reviews ? result.reviews.slice(0, 5).map((review: any) => ({
      authorName: review.author_name,
      rating: review.rating,
      text: review.text,
      relativeTimeDescription: review.relative_time_description,
      profilePhotoUrl: review.profile_photo_url,
    })) : [];

    return NextResponse.json({ photos: categorizedPhotos, details, reviews });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

