"""
City discovery via GeoNames for country-level itinerary requests.

Uses the GeoNames ``searchJSON`` endpoint to find a country's major populated
places, sorted by population, with client-side re-sort to work around known
GeoNames ordering quirks.
"""

import logging
from dataclasses import asdict, dataclass

import requests
from django.conf import settings

from .budget import record_outbound_call
from .cache import get_city_candidates, set_city_candidates

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 8
MIN_POPULATION = 50_000
MIN_CANDIDATES_BEFORE_FALLBACK = 3

# Duration (days) → max cities to select
CITY_COUNT_BY_DURATION = [
    (3, 1),  # up to 3 days  → 1 city
    (6, 2),  # up to 6 days  → up to 2 cities
    (10, 3),  # up to 10 days → up to 3 cities
    (14, 4),  # up to 14 days → up to 4 cities
]


@dataclass
class CityCandidate:
    name: str
    lat: float
    lng: float
    population: int


def max_cities_for_duration(days: int) -> int:
    """Returns the maximum number of cities appropriate for a trip of *days* days."""
    for threshold, count in CITY_COUNT_BY_DURATION:
        if days <= threshold:
            return count
    return CITY_COUNT_BY_DURATION[-1][1]


def discover_cities(country_code: str, limit: int = 20) -> list[CityCandidate]:
    """
    Discovers major cities for *country_code* via GeoNames, cached for 30 days.

    Applies a 50k-population floor by default. If fewer than 3 candidates pass
    that threshold (common for small countries like Iceland or Luxembourg),
    falls back to the top-5 by population regardless of absolute size.
    """
    cached = get_city_candidates(country_code)
    if cached is not None:
        return [CityCandidate(**c) for c in cached]

    username = getattr(settings, "GEONAMES_USERNAME", "")
    if not username:
        logger.warning("GEONAMES_USERNAME not configured. Returning empty city list.")
        return []

    try:
        resp = requests.get(
            "https://secure.geonames.org/searchJSON",
            params={
                "country": country_code.upper(),
                "featureClass": "P",  # populated places
                "orderby": "population",
                "maxRows": limit,
                "username": username,
            },
            timeout=TIMEOUT_SECONDS,
        )
        record_outbound_call("geonames", 1)

        if resp.status_code != 200:
            logger.error("GeoNames search error (HTTP %s): %s", resp.status_code, resp.text)
            return []

        raw = resp.json().get("geonames", [])
        candidates = [
            CityCandidate(
                name=r["name"],
                lat=float(r["lat"]),
                lng=float(r["lng"]),
                population=int(r.get("population", 0)),
            )
            for r in raw
        ]

        # Defensive re-sort — GeoNames' orderby=population has known quirks
        candidates.sort(key=lambda c: c.population, reverse=True)

        # Apply population floor with fallback for small countries
        filtered = [c for c in candidates if c.population >= MIN_POPULATION]
        if len(filtered) < MIN_CANDIDATES_BEFORE_FALLBACK:
            # Fall back to top-5 regardless of absolute population
            filtered = candidates[:5]

        # Cache as dicts for JSON serialization
        set_city_candidates(country_code, [asdict(c) for c in filtered])
        return filtered

    except Exception as exc:
        logger.exception("Failed to discover cities from GeoNames: %s", exc)
        return []
