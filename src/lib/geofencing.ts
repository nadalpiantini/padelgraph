/**
 * Geofencing Utilities
 *
 * Server-side GPS validation and distance calculations.
 * Uses Haversine formula for accurate distance between coordinates.
 */

/**
 * Calculate distance between two geographic coordinates
 *
 * Uses the Haversine formula to calculate the great-circle distance
 * between two points on a sphere given their longitudes and latitudes.
 *
 * @param lat1 - Latitude of first point (degrees)
 * @param lng1 - Longitude of first point (degrees)
 * @param lat2 - Latitude of second point (degrees)
 * @param lng2 - Longitude of second point (degrees)
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters

  // Convert degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters

  return distance;
}

/**
 * Check if a point is within a geofence radius
 *
 * @param userLat - User's current latitude
 * @param userLng - User's current longitude
 * @param targetLat - Target location latitude
 * @param targetLng - Target location longitude
 * @param radiusMeters - Geofence radius in meters
 * @returns True if user is within geofence, false otherwise
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
  return distance <= radiusMeters;
}

/**
 * Get distance info with human-readable message
 *
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param targetLat - Target latitude
 * @param targetLng - Target longitude
 * @param radiusMeters - Geofence radius
 * @returns Object with distance and validation result
 */
export function validateGeofence(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): {
  valid: boolean;
  distance: number;
  message: string;
} {
  const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
  const valid = distance <= radiusMeters;

  return {
    valid,
    distance: Math.round(distance),
    message: valid
      ? `You are within ${radiusMeters}m of the venue (${Math.round(distance)}m away)`
      : `You must be within ${radiusMeters}m of the venue. You are currently ${Math.round(distance)}m away.`,
  };
}

/**
 * Validate GPS coordinates format
 *
 * @param lat - Latitude to validate
 * @param lng - Longitude to validate
 * @returns True if valid coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}

/**
 * Get bounding box for a geofence
 *
 * Returns the northeast and southwest corners of a bounding box
 * that contains a circular geofence. Useful for database queries.
 *
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param radiusMeters - Radius in meters
 * @returns Bounding box coordinates
 */
export function getGeofenceBoundingBox(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
} {
  // Earth's radius in meters
  const R = 6371e3;

  // Angular distance in radians
  const angularDistance = radiusMeters / R;

  // Convert center to radians
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  // Calculate latitude bounds
  const minLat = latRad - angularDistance;
  const maxLat = latRad + angularDistance;

  // Calculate longitude bounds (accounting for latitude)
  const Δlng = Math.asin(Math.sin(angularDistance) / Math.cos(latRad));
  const minLng = lngRad - Δlng;
  const maxLng = lngRad + Δlng;

  // Convert back to degrees
  return {
    ne: {
      lat: (maxLat * 180) / Math.PI,
      lng: (maxLng * 180) / Math.PI,
    },
    sw: {
      lat: (minLat * 180) / Math.PI,
      lng: (minLng * 180) / Math.PI,
    },
  };
}
