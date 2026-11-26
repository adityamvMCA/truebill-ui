/**
 * Logistics Geolocation & Routing Engine
 * - Robust address geocoding using Photon & OSM Nominatim with progressive address fallback
 * - Real road turn-by-turn route generation via Open Source Routing Machine (OSRM)
 */

/**
 * Geocode an address into { lat, lng }
 * @param {string} address - Full or partial address
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodeAddress(address) {
  if (!address || typeof address !== "string") return null;

  // 1. Clean string: normalize whitespace, remove confusing keywords like "OR"
  const clean = address
    .replace(/\bOR\b/gi, " ")
    .replace(/[#@*()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Extract 6-digit Indian PIN code if present
  const pinMatch = address.match(/\b([1-9][0-9]{5})\b/);
  const pin = pinMatch ? pinMatch[1] : "";

  const parts = clean.split(",").map((p) => p.trim()).filter(Boolean);

  // Progressive query candidates from specific to broad
  const candidates = [
    clean,
    parts.slice(-3).join(", "),
    parts.slice(-2).join(", "),
    pin && parts.length > 1 ? `${parts[parts.length - 2]} ${pin}` : null,
    parts.slice(-1)[0],
  ].filter(Boolean);

  // 1. Try Photon first (CORS enabled for browsers, fast, parses Indian addresses without 403 blocks)
  for (const q of candidates) {
    if (!q || q.length < 3) continue;
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0 && data.features[0].geometry?.coordinates) {
          const [lon, lat] = data.features[0].geometry.coordinates;
          if (lat && lon) {
            return { lat: Number(lat), lng: Number(lon) };
          }
        }
      }
    } catch {}
  }

  // 2. Fallback to Nominatim
  for (const q of candidates) {
    if (!q || q.length < 3) continue;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Fetch real street route coordinates between two points using OSRM
 * @param {[number, number]} origin - [lat, lng]
 * @param {[number, number]} destination - [lat, lng]
 * @returns {Promise<{ coordinates: Array<[number, number]>, distanceM: number, durationS: number }>}
 */
export async function fetchRoadRoute(origin, destination) {
  if (!origin || !destination) return { coordinates: [], distanceM: 0, durationS: 0 };
  const [origLat, origLng] = origin;
  const [destLat, destLng] = destination;

  if (!origLat || !origLng || !destLat || !destLng) {
    return { coordinates: [], distanceM: 0, durationS: 0 };
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes[0]) {
        const route = data.routes[0];
        // OSRM GeoJSON coordinates are [lng, lat], convert to Leaflet [lat, lng]
        const leafletCoords = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
        return {
          coordinates: leafletCoords.length > 0 ? leafletCoords : [[origLat, origLng], [destLat, destLng]],
          distanceM: Math.round(route.distance || 0),
          durationS: Math.round(route.duration || 0),
        };
      }
    }
  } catch (err) {
    console.warn("OSRM road routing fallback to direct line:", err?.message);
  }

  // Graceful fallback to direct connection
  return {
    coordinates: [[origLat, origLng], [destLat, destLng]],
    distanceM: 0,
    durationS: 0,
  };
}

export function formatDistance(meters) {
  if (!meters || meters <= 0) return "";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} hr ${remMins > 0 ? `${remMins}m` : ""}`;
}
