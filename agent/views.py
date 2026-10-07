import logging

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from trips.models import Stop, Trip
from trips.serializers import TripSerializer

from .budget import (
    acquire_concurrency_lock,
    check_preflight_budget,
    generation_cost,
    record_user_generation,
    release_concurrency_lock,
)
from .cache import (
    compute_itinerary_signature,
    get_cached_itinerary,
    set_cached_itinerary,
)
from .gemini_client import generate_itinerary
from .grounding import GroundingError
from .serializers import (
    ItineraryAcceptSerializer,
    ItineraryRequestSerializer,
)

logger = logging.getLogger(__name__)

OPEN_METEO_ATTRIBUTION = {
    "weather": "Weather data by Open-Meteo.com (CC BY 4.0)",
    "weather_url": "https://open-meteo.com/",
    "places": "Places data provided by Geoapify",
    "places_url": "https://www.geoapify.com/",
    "cities": "City data provided by GeoNames",
    "cities_url": "https://www.geonames.org/",
}


class ItineraryGenerateView(APIView):
    """
    POST /api/v1/itinerary/generate/
    Generates a personalized, grounded day-by-day travel itinerary using Gemini,
    Geoapify, Open-Meteo, and optionally GeoNames for country-level requests.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = ItineraryRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        valid_data = serializer.validated_data
        country = valid_data["country"]
        city = valid_data["city"]
        start_date = str(valid_data["start_date"])
        end_date = str(valid_data["end_date"])
        interests = valid_data.get("interests", [])
        pace = valid_data.get("pace", "moderate")
        is_country_level = valid_data.get("is_country_level", False)

        # 1. Budget & Quota Check
        allowed, reason = check_preflight_budget(request.user)
        if not allowed:
            return Response({"detail": reason}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # 2. Cache Check (identical signature)
        signature = compute_itinerary_signature(
            country, city, start_date, end_date, interests, pace
        )
        cached_data = get_cached_itinerary(signature)
        if cached_data is not None:
            cached_data["cached"] = True
            return Response(cached_data, status=status.HTTP_200_OK)

        # 3. Concurrency Lock
        if not acquire_concurrency_lock():
            msg = "Agent is currently handling peak traffic. Please try again shortly."
            return Response({"detail": msg}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        try:
            # 4. Generate Itinerary via Gemini orchestrator
            itinerary = generate_itinerary(
                country=country,
                city=city,
                start_date=start_date,
                end_date=end_date,
                interests=interests,
                pace=pace,
                is_country_level=is_country_level,
            )

            # Compute and record credit cost based on city count
            cities_count = len(itinerary.cities) if itinerary.cities else 1
            cost = generation_cost(cities_count)
            record_user_generation(request.user, cost=cost)

            response_data = {
                "itinerary": itinerary.model_dump(),
                "attribution": OPEN_METEO_ATTRIBUTION,
                "cached": False,
            }

            # Cache the verified itinerary for 1 hour
            set_cached_itinerary(signature, response_data)
            return Response(response_data, status=status.HTTP_200_OK)

        except GroundingError as ge:
            logger.warning("Grounding validation failed: %s", ge)
            return Response(
                {"detail": str(ge)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except ValueError as ve:
            logger.error("Configuration or generation error: %s", ve)
            return Response(
                {"detail": str(ve)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.exception("Unexpected error in itinerary generation: %s", exc)
            return Response(
                {"detail": "Failed to generate itinerary. Please try again shortly."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            release_concurrency_lock()


class ItineraryAcceptView(APIView):
    """
    POST /api/v1/itinerary/accept/
    Atomically saves an accepted AI-generated itinerary as a Trip and nested Stops.
    Rolls back completely if any validation fails.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = ItineraryAcceptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        trip_data = data["trip"]
        stops_data = data.get("stops", [])

        try:
            with transaction.atomic():
                trip = Trip.objects.create(
                    owner=request.user,
                    title=trip_data["title"],
                    description=trip_data.get("description", ""),
                    start_date=trip_data["start_date"],
                    end_date=trip_data["end_date"],
                )

                created_stops = []
                for idx, stop_info in enumerate(stops_data):
                    # Strict validation: verify dates fall within trip range if provided
                    arr = stop_info.get("arrival_date")
                    dep = stop_info.get("departure_date")

                    stop_name = stop_info["name"]
                    if arr and not (trip.start_date <= arr <= trip.end_date):
                        msg = f"Stop '{stop_name}' arrival ({arr}) outside trip dates."
                        raise ValueError(msg)
                    if dep and not (trip.start_date <= dep <= trip.end_date):
                        msg = f"Stop '{stop_name}' departure ({dep}) outside trip dates."
                        raise ValueError(msg)
                    if arr and dep and dep < arr:
                        msg = f"Stop '{stop_name}' departure date cannot precede arrival."
                        raise ValueError(msg)

                    stop = Stop.objects.create(
                        trip=trip,
                        name=stop_info["name"],
                        description=stop_info.get("description", ""),
                        location=stop_info.get("location", ""),
                        order=stop_info.get("order", idx),
                        arrival_date=arr,
                        departure_date=dep,
                        stop_type=stop_info.get("stop_type", "visit"),
                        duration_minutes=stop_info.get("duration_minutes"),
                    )
                    created_stops.append(stop)

            return Response(
                {
                    "trip": TripSerializer(trip).data,
                    "stops_count": len(created_stops),
                    "message": "Itinerary accepted and saved successfully!",
                },
                status=status.HTTP_201_CREATED,
            )

        except ValueError as err:
            return Response({"detail": str(err)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Failed to accept itinerary atomically: %s", exc)
            return Response(
                {"detail": "Failed to persist itinerary. All changes rolled back."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
