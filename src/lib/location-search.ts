import { USLocation, US_LOCATIONS_MVP } from "./us-locations";

/**
 * Searches for a location by city, state, or ZIP code.
 * MVP: Uses local array.
 * FUTURE: Will query `public.us_zip_codes` in Supabase.
 */
export const searchLocations = async (query: string): Promise<USLocation[]> => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return US_LOCATIONS_MVP.filter(loc => 
    loc.zip.includes(lowerQuery) || 
    loc.city.toLowerCase().includes(lowerQuery) ||
    loc.state.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
};

/**
 * Finds the nearest location to a specific lat/lng point.
 * MVP: Iterates local array.
 * FUTURE: PostGIS distance query in Supabase.
 */
export const findNearestLocation = async (lat: number, lng: number): Promise<USLocation | null> => {
  let nearest: USLocation | null = null;
  let minDistance = Infinity;

  for (const loc of US_LOCATIONS_MVP) {
    if (!loc.latitude || !loc.longitude) continue;
    
    // Simple euclidean distance approximation for MVP
    const dLat = loc.latitude - lat;
    const dLng = loc.longitude - lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  // Max distance roughly 0.5 degrees (~35 miles)
  if (minDistance > 0.5) return null;

  return nearest;
};
