/**
 * GPS and Geospatial Utilities for Smart Health Grid
 */

export const INDORE_DEFAULT_LAT = 22.7196;
export const INDORE_DEFAULT_LNG = 75.8577;

export const INDORE_LANDMARK_PRESETS = [
  { name: 'Indore Central (Rajwada)', lat: 22.7196, lng: 75.8577, area: 'Central Grid' },
  { name: 'MYH Hospital Campus', lat: 22.7150, lng: 75.8670, area: 'South-Central' },
  { name: 'Vijay Nagar Med-Square', lat: 22.7532, lng: 75.8937, area: 'North Indore' },
  { name: 'Old Palasia Junction', lat: 22.7244, lng: 75.8839, area: 'East Corridor' },
  { name: 'Bhanwarkuan Square', lat: 22.6890, lng: 75.8580, area: 'South Hub' },
  { name: 'Super Corridor / Airport', lat: 22.7280, lng: 75.8150, area: 'West Grid' },
];

/**
 * Request real-time device GPS coordinates via Browser Geolocation API
 */
export const getCurrentGPSCoordinates = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: parseFloat(pos.coords.latitude.toFixed(5)),
          longitude: parseFloat(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy || 10),
          altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
          timestamp: pos.timestamp || Date.now(),
          source: 'device_gps',
        });
      },
      (err) => {
        let msg = 'Unable to retrieve your location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'GPS permission denied. Please allow location access or select a city preset.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS location unavailable. Using network approximation or preset.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS acquisition timed out. Please try again or use a city preset.';
        }
        reject(new Error(msg));
      },
      geoOptions
    );
  });
};

/**
 * Calculate Great-Circle Distance (Haversine formula) in kilometers
 */
export const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // 1 decimal place
};

/**
 * Estimate driving ETA in minutes assuming 25-35 km/h urban city ambulance/traffic speeds
 */
export const getDrivingETA = (distanceKm) => {
  if (!distanceKm || distanceKm <= 0) return 2;
  const avgSpeedKmH = 30; // avg city transit speed
  const hours = distanceKm / avgSpeedKmH;
  return Math.max(3, Math.round(hours * 60));
};

/**
 * Build Google Maps Turn-by-Turn Driving Navigation Link
 */
export const getGoogleMapsNavUrl = (originLat, originLng, destLat, destLng) => {
  const origin = originLat && originLng ? `&origin=${originLat},${originLng}` : '';
  const dest = `${destLat},${destLng}`;
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${dest}&travelmode=driving`;
};
