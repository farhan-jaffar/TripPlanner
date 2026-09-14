import logging
from datetime import date, timedelta
from typing import Any

import requests
from django.conf import settings

from .budget import (
    check_and_record_geoapify_rps,
    record_outbound_call,
)
from .cache import (
    get_cached_places,
    get_cached_route,
    get_cached_weather,
    set_cached_places,
    set_cached_route,
    set_cached_weather,
)

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 8

# Mapping from frontend user interests to Geoapify categories
INTEREST_TO_GEOAPIFY_CATEGORIES: dict[str, list[str]] = {
    "museums": ["entertainment.museum"],
    "food": ["catering.restaurant", "catering.cafe"],
    "walking": ["tourism.sights", "tourism.attraction", "leisure.park"],
    "history": ["heritage", "tourism.sights"],
    "nature": ["natural", "leisure.park"],
    "shopping": ["commercial.shopping_mall", "commercial.marketplace"],
    "culture": ["entertainment.culture", "heritage", "tourism.sights"],
    "nightlife": ["catering.bar", "catering.pub"],
    "relaxation": ["leisure.spa", "leisure.park"],
    "art": ["entertainment.culture", "entertainment.museum"],
}

# General category normalizer mapping
CATEGORY_MAP: dict[str, str] = {
    "tourism": "tourism.sights,tourism.attraction",
    "food": "catering.restaurant,catering.cafe",
    "museum": "entertainment.museum",
    "museums": "entertainment.museum",
    "nature": "natural,leisure.park",
    "shopping": "commercial.shopping_mall,commercial.marketplace",
    "nightlife": "catering.bar,catering.pub",
    "culture": "entertainment.culture,heritage,tourism.sights",
    "relaxation": "leisure.spa,leisure.park",
    "history": "heritage,tourism.sights",
    "art": "entertainment.culture,entertainment.museum",
}

# WMO Weather interpretation codes
WMO_CODE_MAP: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
}


def normalize_geoapify_categories(category: str) -> str:
    """Normalizes category input to valid Geoapify comma-separated taxonomy string."""
    cat_lower = category.strip().lower()
    if cat_lower in CATEGORY_MAP:
        return CATEGORY_MAP[cat_lower]
    if cat_lower in INTEREST_TO_GEOAPIFY_CATEGORIES:
        return ",".join(INTEREST_TO_GEOAPIFY_CATEGORIES[cat_lower])
    # Fallback to general tourist attractions
    return "tourism.sights,tourism.attraction"


def get_places(
    city: str, country_code: str, category: str, limit: int = 10
) -> list[dict[str, Any]]:
    """
    Finds points of interest in a city matching a category using Geoapify Places API.
    Results are cached for 24 hours. Tracks Geoapify credit consumption.
    """
    country_code = country_code.upper()
    cached = get_cached_places(country_code, city, category)
    if cached is not None:
        return cached

    api_key = getattr(settings, "GEOAPIFY_API_KEY", "")
    if not api_key:
        logger.warning("GEOAPIFY_API_KEY not configured. Returning empty places list.")
        return []

    geo_categories = normalize_geoapify_categories(category)

    try:
        # Step 1: Geocode city to obtain coordinates
        check_and_record_geoapify_rps()
        geocode_url = "https://api.geoapify.com/v1/geocode/search"
        geo_params: dict[str, str] = {"apiKey": api_key}
        if city and city.strip():
            geo_params["city"] = city.strip()
            geo_params["countrycode"] = country_code.lower()
        else:
            geo_params["text"] = country_code.upper()
            geo_params["countrycode"] = country_code.lower()
        geo_resp = requests.get(geocode_url, params=geo_params, timeout=TIMEOUT_SECONDS)
        record_outbound_call("geoapify", 1)

        if geo_resp.status_code != 200:
            logger.error("Geoapify geocoding error: %s", geo_resp.text)
            return []

        geo_data = geo_resp.json()
        features = geo_data.get("features", [])
        if not features:
            return []

        coords = features[0]["geometry"]["coordinates"]
        lon, lat = coords[0], coords[1]

        # Step 2: Places API search around resolved coordinates
        check_and_record_geoapify_rps()
        places_url = "https://api.geoapify.com/v2/places"
        places_params = {
            "categories": geo_categories,
            "filter": f"circle:{lon},{lat},15000",
            "bias": f"proximity:{lon},{lat}",
            "limit": min(limit, 20),
            "apiKey": api_key,
        }
        places_resp = requests.get(places_url, params=places_params, timeout=TIMEOUT_SECONDS)
        record_outbound_call("geoapify", 1)

        if places_resp.status_code != 200:
            logger.error("Geoapify places error: %s", places_resp.text)
            return []

        places_data = places_resp.json()
        results: list[dict[str, Any]] = []

        for item in places_data.get("features", []):
            props = item.get("properties", {})
            place_id = props.get("place_id")
            name = props.get("name") or props.get("street") or props.get("formatted")
            if not place_id or not name:
                continue

            results.append(
                {
                    "geoapify_place_id": place_id,
                    "name": name,
                    "latitude": props.get("lat", lat),
                    "longitude": props.get("lon", lon),
                    "category": category,
                    "address": props.get("formatted", ""),
                }
            )

        set_cached_places(country_code, city, category, results)
        return results

    except Exception as exc:
        logger.exception("Failed to fetch places from Geoapify: %s", exc)
        return []


def get_weather(
    latitude: float, longitude: float, start_date: str, end_date: str
) -> dict[str, str]:
    """
    Gets daily weather forecast from Open-Meteo for the specified coordinates and date range.
    Degrades gracefully on timeout or date-range limitations.
    """
    cached = get_cached_weather(latitude, longitude, start_date, end_date)
    if cached is not None:
        return cached

    # Open-Meteo free forecast is capped at 16 days from today
    try:
        if date.fromisoformat(end_date) > (date.today() + timedelta(days=16)):
            return {}
    except ValueError:
        pass

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": f"{latitude:.4f}",
        "longitude": f"{longitude:.4f}",
        "daily": "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "start_date": start_date,
        "end_date": end_date,
        "timezone": "auto",
    }

    try:
        resp = requests.get(url, params=params, timeout=TIMEOUT_SECONDS)
        record_outbound_call("openmeteo", 1)

        if resp.status_code != 200:
            logger.warning(
                "Open-Meteo forecast returned status %s: %s", resp.status_code, resp.text
            )
            return {}

        data = resp.json()
        daily = data.get("daily", {})
        time_list = daily.get("time", [])
        wcodes = daily.get("weathercode", [])
        t_max = daily.get("temperature_2m_max", [])
        t_min = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_probability_max", [])

        weather_by_date: dict[str, str] = {}
        for idx, date_str in enumerate(time_list):
            code = wcodes[idx] if idx < len(wcodes) else 0
            desc = WMO_CODE_MAP.get(code, "Partly cloudy")
            max_c = round(t_max[idx]) if idx < len(t_max) and t_max[idx] is not None else None
            min_c = round(t_min[idx]) if idx < len(t_min) and t_min[idx] is not None else None
            p_prob = precip[idx] if idx < len(precip) and precip[idx] is not None else 0

            summary_parts = [desc]
            if min_c is not None and max_c is not None:
                summary_parts.append(f"{min_c}°C to {max_c}°C")
            if p_prob and p_prob > 20:
                summary_parts.append(f"{p_prob}% rain")

            weather_by_date[date_str] = ", ".join(summary_parts)

        set_cached_weather(latitude, longitude, start_date, end_date, weather_by_date)
        return weather_by_date

    except Exception as exc:
        logger.warning("Graceful degradation: Open-Meteo request failed: %s", exc)
        return {}


def get_route(waypoints: list[dict[str, float]], mode: str = "walk") -> dict[str, Any]:
    """
    Computes travel time and distance between ordered waypoints using Geoapify Routing API.
    Waypoints format: [{'latitude': 48.85, 'longitude': 2.35}, ...]
    """
    if len(waypoints) < 2:
        return {"distance_km": 0.0, "duration_mins": 0, "summary": "Single location"}

    wp_pairs = [
        f"{wp.get('latitude', wp.get('lat')):.5f},{wp.get('longitude', wp.get('lon')):.5f}"
        for wp in waypoints
    ]
    wp_str = "|".join(wp_pairs)

    cached = get_cached_route(wp_str, mode)
    if cached is not None:
        return cached

    api_key = getattr(settings, "GEOAPIFY_API_KEY", "")
    if not api_key:
        return {"distance_km": 0.0, "duration_mins": 0, "summary": "Routing unavailable"}

    route_mode = "walk" if mode in ["walk", "walking"] else "drive"
    url = "https://api.geoapify.com/v1/routing"
    params = {"waypoints": wp_str, "mode": route_mode, "apiKey": api_key}

    try:
        check_and_record_geoapify_rps()
        resp = requests.get(url, params=params, timeout=TIMEOUT_SECONDS)
        record_outbound_call("geoapify", 1)

        if resp.status_code != 200:
            logger.warning("Geoapify routing returned %s: %s", resp.status_code, resp.text)
            return {"distance_km": 0.0, "duration_mins": 0, "summary": ""}

        data = resp.json()
        features = data.get("features", [])
        if not features:
            return {"distance_km": 0.0, "duration_mins": 0, "summary": ""}

        props = features[0].get("properties", {})
        distance_m = props.get("distance", 0)
        time_s = props.get("time", 0)

        dist_km = round(distance_m / 1000.0, 1)
        dur_mins = round(time_s / 60.0)
        summary = f"{dur_mins} min {route_mode} ({dist_km} km)"

        result = {"distance_km": dist_km, "duration_mins": dur_mins, "summary": summary}
        set_cached_route(wp_str, mode, result)
        return result

    except Exception as exc:
        logger.warning("Routing call failed: %s", exc)
        return {"distance_km": 0.0, "duration_mins": 0, "summary": ""}


def geocode_city(city: str, country_code: str) -> tuple[float, float] | None:
    """
    Geocodes a city name within a specific country using Geoapify.
    Always passes an explicit country_code filter to prevent cross-country
    name collisions (e.g., Paris, TX vs. Paris, FR).

    Returns (latitude, longitude) or None if geocoding fails.
    """
    api_key = getattr(settings, "GEOAPIFY_API_KEY", "")
    if not api_key:
        logger.warning("GEOAPIFY_API_KEY not configured. Cannot geocode.")
        return None

    try:
        check_and_record_geoapify_rps()
        resp = requests.get(
            "https://api.geoapify.com/v1/geocode/search",
            params={
                "text": city,
                "filter": f"countrycode:{country_code.lower()}",
                "apiKey": api_key,
            },
            timeout=TIMEOUT_SECONDS,
        )
        record_outbound_call("geoapify", 1)

        if resp.status_code != 200:
            logger.error("Geoapify geocoding error for '%s': %s", city, resp.text)
            return None

        features = resp.json().get("features", [])
        if not features:
            logger.warning("No geocoding results for '%s' in %s", city, country_code)
            return None

        coords = features[0]["geometry"]["coordinates"]
        return (coords[1], coords[0])  # (lat, lon)

    except Exception as exc:
        logger.warning("Geocoding failed for '%s' in %s: %s", city, country_code, exc)
        return None


def build_transfer_stop(from_city: dict, to_city: dict, mode: str = "drive") -> dict[str, Any]:
    """
    Creates a transfer-stop dict between two cities using get_route.

    Each city dict must have keys: name, lat, lng.
    Returns a dict matching the ItineraryStop schema with stop_type='transfer'.
    """
    route = get_route(
        waypoints=[
            {"latitude": from_city["lat"], "longitude": from_city["lng"]},
            {"latitude": to_city["lat"], "longitude": to_city["lng"]},
        ],
        mode=mode,
    )
    return {
        "stop_type": "transfer",
        "name": f"{from_city['name']} → {to_city['name']}",
        "duration_minutes": route.get("duration_mins", 0),
        "note": f"Approx. {route.get('distance_km', 0)} km by {mode}",
        "geoapify_place_id": None,
        "latitude": None,
        "longitude": None,
        "category": None,
        "suggested_time": None,
    }
