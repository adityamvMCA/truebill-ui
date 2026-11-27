/**
 * Logistics Geolocation & Routing Engine
 * - Robust address geocoding using Photon & OSM Nominatim with progressive address fallback
 * - Real road turn-by-turn route generation via Open Source Routing Machine (OSRM)
 * - Bearing calculation for Rapido / Uber style vehicle marker rotation
 * - Area search and reverse geocoding for draggable map pin adjustments
 * - Map tile layer providers (Streets & Satellite)
 */

export const MAP_LAYERS = {
  streets: {
    name: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxZoom: 19,
      attribution: "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    },
  },
};

/**
 * Geocode an address into { lat, lng }
 * @param {string} address - Full or partial address
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodeAddress(address) {
  if (!address || typeof address !== "string") return null;

  const clean = address
    .replace(/\bOR\b/gi, " ")
    .replace(/[#@*()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const pinMatch = address.match(/\b([1-9][0-9]{5})\b/);
  const pin = pinMatch ? pinMatch[1] : "";

  const parts = clean.split(",").map((p) => p.trim()).filter(Boolean);

  const candidates = [
    clean,
    parts.slice(-3).join(", "),
    parts.slice(-2).join(", "),
    pin && parts.length > 1 ? `${parts[parts.length - 2]} ${pin}` : null,
    parts.slice(-1)[0],
  ].filter(Boolean);

  // 1. Try Photon first
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
 * Autocomplete / search places and areas across India and globally
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array<{ label: string, lat: number, lng: number }>>}
 */
export async function searchAreas(query, limit = 5) {
  if (!query || query.trim().length < 2) return [];
  const clean = query.trim();

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features)) {
        return data.features
          .map((f) => {
            const p = f.properties || {};
            const coords = f.geometry?.coordinates;
            if (!coords || coords.length < 2) return null;
            const parts = [
              p.name,
              p.street,
              p.district,
              p.city,
              p.state,
              p.postcode,
              p.country,
            ].filter(Boolean);
            const label = parts.length > 0 ? parts.join(", ") : clean;
            return {
              label,
              lat: Number(coords[1]),
              lng: Number(coords[0]),
            };
          })
          .filter(Boolean);
      }
    }
  } catch {}

  // Nominatim fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item) => ({
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
      }
    }
  } catch {}

  return [];
}

/**
 * Reverse geocode coordinates to a human-readable street address
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return "";
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {}
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Calculates bearing (heading angle in degrees 0-360) between two coordinates
 */
export function calculateBearing(startLat, startLng, destLat, destLng) {
  if (!startLat || !startLng || !destLat || !destLng) return 0;
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Calculates haversine distance in kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
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
