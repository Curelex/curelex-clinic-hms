// hms-backend/utils/geocode.js
// Free forward-geocoding via OpenStreetMap Nominatim.
// Usage policy: max ~1 request/sec, requires a descriptive User-Agent,
// no heavy/bulk automated use. This helper is only called on clinic
// create/update (one request per save) and from the one-time backfill
// script (which adds its own delay between calls).

export async function geocodeAddress({ address, city, state, pincode } = {}) {
  const parts = [address, city, state, pincode].filter(Boolean);
  if (!parts.length) return null;

  const query = parts.join(', ');

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CurelexHMS/1.0 (support@curelex.in)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const latitude = parseFloat(data[0].lat);
    const longitude = parseFloat(data[0].lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch (err) {
    console.error('Geocode error:', err.message);
    return null;
  }
}
