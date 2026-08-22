/**
 * Geolocation & Distance Calculation Utilities
 * Implements the Haversine formula to compute great-circle distances between points on Earth.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // 2 decimal places
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats a distance in kilometers into a clean, human-readable string.
 * e.g., "450 m away", "1.2 km away", "15 km away"
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return "";
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceKm)} km`;
}

/**
 * Parses GPS coordinates from various formats:
 * - "4.0511, 9.7042"
 * - { lat: 4.0511, lng: 9.7042 }
 * - numeric lat and lng columns
 */
export function parseCoordinates(
  lat?: number | string | null,
  lng?: number | string | null,
  gpsString?: string | null
): Coordinates | null {
  const numericLat = typeof lat === "number" ? lat : lat ? parseFloat(lat) : null;
  const numericLng = typeof lng === "number" ? lng : lng ? parseFloat(lng) : null;

  if (
    numericLat !== null &&
    !isNaN(numericLat) &&
    numericLng !== null &&
    !isNaN(numericLng) &&
    numericLat !== 0 &&
    numericLng !== 0
  ) {
    return { lat: numericLat, lng: numericLng };
  }

  if (gpsString && typeof gpsString === "string") {
    const parts = gpsString.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }

  return null;
}
