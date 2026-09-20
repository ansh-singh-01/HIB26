"""
Google Maps Service Integration.
Calculates real-world driving distance and duration via Google Maps Distance Matrix API
when GOOGLE_MAPS_API_KEY is configured in .env, with automatic fallback to Haversine math.
"""
from typing import Optional
import httpx

from app.core.config import settings
from app.services.facility_matcher import haversine_km


async def calculate_travel_distance(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> dict:
    """
    Returns dict with keys: 'distance_km', 'duration_mins', 'source'.
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        dist = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
        # Crude estimate: ~40 km/h city driving speed
        est_duration = round((dist / 40.0) * 60.0, 1)
        return {
            "distance_km": round(dist, 2),
            "duration_mins": est_duration,
            "source": "haversine_fallback",
        }

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": f"{origin_lat},{origin_lng}",
        "destinations": f"{dest_lat},{dest_lng}",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()

            if data.get("status") == "OK" and data["rows"][0]["elements"][0]["status"] == "OK":
                element = data["rows"][0]["elements"][0]
                dist_meters = element["distance"]["value"]
                duration_secs = element["duration"]["value"]
                return {
                    "distance_km": round(dist_meters / 1000.0, 2),
                    "duration_mins": round(duration_secs / 60.0, 1),
                    "source": "google_maps_api",
                }
    except Exception:
        pass

    # Fallback to haversine if call fails
    dist = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    return {
        "distance_km": round(dist, 2),
        "duration_mins": round((dist / 40.0) * 60.0, 1),
        "source": "haversine_fallback",
    }
