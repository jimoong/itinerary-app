'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Place } from '@/lib/types';

interface MapViewProps {
  places: Place[];
  onMarkerClick?: (placeId: string) => void;
  highlightedPlaceId?: string;
  currentLocation?: { lat: number; lng: number };
  nextPlaceIndex?: number | null;
}

export default function MapView({ places, onMarkerClick, highlightedPlaceId, currentLocation, nextPlaceIndex }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePathsRef = useRef<Map<string, google.maps.LatLng[]>>(new Map()); // Store route paths by route key
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key not found');
        return;
      }

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['geometry'], // Load geometry library for polyline decoding
      });

      try {
        await loader.load();
        
        if (mapRef.current && !googleMapRef.current) {
          // Detect dark mode preference
          const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          
          // Apply dark map theme if dark mode is enabled
          const mapOptions: google.maps.MapOptions = {
            zoom: 13,
            center: places.length > 0 
              ? { lat: places[0].lat, lng: places[0].lng }
              : { lat: 50.0875, lng: 14.4324 }, // Prague default
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          };
          
          if (isDarkMode) {
            mapOptions.styles = [
              { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
              {
                featureType: 'administrative.locality',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }],
              },
              {
                featureType: 'poi',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#d59563' }],
              },
              {
                featureType: 'poi.park',
                elementType: 'geometry',
                stylers: [{ color: '#263c3f' }],
              },
              {
                featureType: 'poi.park',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#6b9080' }],
              },
              {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#38414e' }],
              },
              {
                featureType: 'road',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#212a37' }],
              },
              {
                featureType: 'road',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#9ca5b3' }],
              },
              {
                featureType: 'road.highway',
                elementType: 'geometry',
                stylers: [{ color: '#746855' }],
              },
              {
                featureType: 'road.highway',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#1f2835' }],
              },
              {
                featureType: 'road.highway',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#f3751ff' }],
              },
              {
                featureType: 'transit',
                elementType: 'geometry',
                stylers: [{ color: '#38414e' }],
              },
              {
                featureType: 'transit.station',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#9ca5b3' }],
              },
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#17263c' }],
              },
              {
                featureType: 'water',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#515c6d' }],
              },
              {
                featureType: 'water',
                elementType: 'labels.text.stroke',
                stylers: [{ color: '#17263c' }],
              },
            ];
          }
          
          googleMapRef.current = new google.maps.Map(mapRef.current, mapOptions);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();
  }, []);

  // Update markers when places change
  useEffect(() => {
    if (!isLoaded || !googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear existing polylines and stored paths
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];
    routePathsRef.current.clear();

    // Clear existing direction renderers
    directionsRendererRef.current.forEach(renderer => renderer.setMap(null));
    directionsRendererRef.current = [];

    if (places.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    // Create new markers
    places.forEach((place, index) => {
      const isHighlighted = highlightedPlaceId === place.id;
      const isHotel = place.category === 'hotel';
      
      // Use different shapes for hotel, highlighted, and normal markers
      let markerIcon;
      let markerLabel;
      
      if (isHotel) {
        // Hotel marker - house/building icon
        markerIcon = {
          path: 'M 0,-12 L -8,-6 L -8,10 L -2,10 L -2,4 L 2,4 L 2,10 L 8,10 L 8,-6 Z M -1,0 L -1,-4 L 1,-4 L 1,0 Z', // House shape
          scale: 1.2,
          fillColor: '#FF6B6B', // Red color for hotel
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
          anchor: new google.maps.Point(0, 10),
        };
        markerLabel = {
          text: '🏨',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
        };
      } else if (isHighlighted) {
        // Rounded square shape for highlighted marker
        markerIcon = {
          path: 'M -10,-7 Q -10,-10 -7,-10 L 7,-10 Q 10,-10 10,-7 L 10,7 Q 10,10 7,10 L -7,10 Q -10,10 -10,7 Z',
          scale: 1.5,
          fillColor: '#00A4A7',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
          anchor: new google.maps.Point(0, 0),
        };
        markerLabel = {
          text: String(index + 1),
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        };
      } else {
        // Circle shape for normal markers
        markerIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: '#134686',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        };
        markerLabel = {
          text: String(index + 1),
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        };
      }
      
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: googleMapRef.current,
        title: place.name,
        label: markerLabel,
        icon: markerIcon,
        zIndex: isHighlighted ? 10000 : (isHotel ? 1500 : 1000), // Highlighted markers on top, hotels medium, regular low
      });

      marker.addListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(place.id);
        }
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: place.lat, lng: place.lng });
    });

    // Add "You are here" current location marker if provided
    if (currentLocation) {
      // Clear existing current location marker
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
      }

      const currentLocMarker = new google.maps.Marker({
        position: { lat: currentLocation.lat, lng: currentLocation.lng },
        map: googleMapRef.current,
        title: 'You are here',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4', // Google blue
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        },
        zIndex: 3000, // Appear on top of everything
      });

      currentLocationMarkerRef.current = currentLocMarker;
      bounds.extend({ lat: currentLocation.lat, lng: currentLocation.lng });
    } else {
      // Remove marker if currentLocation is null
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
      }
    }

    // Draw routes between consecutive places using Routes API (newer than Directions API)
    const drawRoute = async (startPlace: Place, endPlace: Place, transportMode: string, strokeColor: string, strokeWeight: number = 3, strokeOpacity: number = 0.8, zIndex: number = 100, routeKey?: string) => {
      try {
        // Map transport modes to Routes API travel modes
        let travelMode: string;
        switch (transportMode) {
          case 'walk':
            travelMode = 'WALK';
            break;
          case 'metro':
          case 'tram':
            travelMode = 'TRANSIT';
            break;
          case 'taxi':
            travelMode = 'DRIVE';
            break;
          default:
            travelMode = 'WALK';
        }

        // Use Routes API (v2) via fetch
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey || '',
            'X-Goog-FieldMask': 'routes.polyline.encodedPolyline'
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: startPlace.lat,
                  longitude: startPlace.lng
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: endPlace.lat,
                  longitude: endPlace.lng
                }
              }
            },
            travelMode: travelMode,
            computeAlternativeRoutes: false
          })
        });

        if (!response.ok) {
          throw new Error(`Routes API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0 && data.routes[0].polyline?.encodedPolyline) {
          // Decode the polyline
          const path = google.maps.geometry.encoding.decodePath(data.routes[0].polyline.encodedPolyline);
          
          // Store the path if routeKey is provided
          if (routeKey) {
            routePathsRef.current.set(routeKey, path);
          }
          
          const polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: strokeColor,
            strokeOpacity: strokeOpacity,
            strokeWeight: strokeWeight,
            zIndex: zIndex,
            map: googleMapRef.current,
          });

          polylinesRef.current.push(polyline);
        } else {
          throw new Error('No route found in response');
        }
      } catch (error) {
        // Fallback to straight line if Routes API fails
        console.warn(`Routes API failed, using straight line:`, error);
        const routePath = [
          new google.maps.LatLng(startPlace.lat, startPlace.lng),
          new google.maps.LatLng(endPlace.lat, endPlace.lng)
        ];

        // Store the path if routeKey is provided
        if (routeKey) {
          routePathsRef.current.set(routeKey, routePath);
        }

        const polyline = new google.maps.Polyline({
          path: routePath,
          geodesic: true,
          strokeColor: strokeColor,
          strokeOpacity: strokeOpacity,
          strokeWeight: strokeWeight,
          zIndex: zIndex,
          map: googleMapRef.current,
        });

        polylinesRef.current.push(polyline);
      }
    };
    
    // Draw all routes
    for (let i = 0; i < places.length - 1; i++) {
      const start = places[i];
      const end = places[i + 1];
      const transportMode = start.transportToNext?.mode || 'walk';
      
      // Determine if this route should be highlighted
      // Highlight the route leading TO the highlighted place
      const isHighlightedRoute = highlightedPlaceId === end.id;
      
      // Use brand blue for unselected routes, cyan for highlighted route (matching marker colors)
      const strokeColor = isHighlightedRoute ? '#00A4A7' : '#134686'; // Cyan or brand blue
      const strokeWeight = isHighlightedRoute ? 5 : 5;
      const strokeOpacity = isHighlightedRoute ? 1 : 1;
      const zIndex = isHighlightedRoute ? 1000 : 100; // Highlighted routes on top
      
      // Create a unique key for this route
      const routeKey = `${start.id}-${end.id}`;

      drawRoute(start, end, transportMode, strokeColor, strokeWeight, strokeOpacity, zIndex, routeKey);
    }

    // Fit map to show all markers or adjust zoom for highlighted location
    if (highlightedPlaceId && places.length > 0) {
      // Find the highlighted place and its previous place
      const highlightedIndex = places.findIndex(p => p.id === highlightedPlaceId);
      
      if (highlightedIndex !== -1) {
        const highlightedPlace = places[highlightedIndex];
        
        // If hotel is selected, show full day view
        if (highlightedPlace.category === 'hotel') {
          googleMapRef.current.fitBounds(bounds);
        } else {
          // Regular location - zoom to route including the actual path
          const previousPlace = highlightedIndex > 0 ? places[highlightedIndex - 1] : null;
          
          // Create bounds for the highlighted route
          const routeBounds = new google.maps.LatLngBounds();
          
          if (previousPlace) {
            // Get the stored route path
            const routeKey = `${previousPlace.id}-${highlightedPlace.id}`;
            const routePath = routePathsRef.current.get(routeKey);
            
            if (routePath && routePath.length > 0) {
              // Include all points in the actual route path
              routePath.forEach(point => {
                routeBounds.extend(point);
              });
            } else {
              // Fallback: just include start and end markers
              routeBounds.extend({ lat: previousPlace.lat, lng: previousPlace.lng });
              routeBounds.extend({ lat: highlightedPlace.lat, lng: highlightedPlace.lng });
            }
          } else {
            // No previous place, just show the highlighted place
            routeBounds.extend({ lat: highlightedPlace.lat, lng: highlightedPlace.lng });
          }
          
          // Fit to the route bounds with some padding
          googleMapRef.current.fitBounds(routeBounds, { top: 80, bottom: 80, left: 80, right: 80 });
          
          // Cap max zoom level to prevent zooming in too much (e.g., when from/to are same location)
          const listener = google.maps.event.addListenerOnce(googleMapRef.current, 'bounds_changed', () => {
            const currentZoom = googleMapRef.current?.getZoom();
            if (currentZoom && currentZoom > 16) {
              googleMapRef.current?.setZoom(16);
            }
          });
        }
      }
    } else if (places.length > 0 || currentLocation) {
      // No selection - show all markers
      googleMapRef.current.fitBounds(bounds);
      
      // Adjust zoom if there's only one marker
      if (places.length === 1 && !currentLocation) {
        const listener = google.maps.event.addListenerOnce(googleMapRef.current, 'bounds_changed', () => {
          const currentZoom = googleMapRef.current?.getZoom();
          if (currentZoom && currentZoom > 15) {
            googleMapRef.current?.setZoom(15);
          }
        });
      }
    }
  }, [places, isLoaded, highlightedPlaceId, onMarkerClick, currentLocation, nextPlaceIndex]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}
    </div>
  );
}

