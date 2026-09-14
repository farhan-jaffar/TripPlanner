import re

from django_countries import countries
from rest_framework import serializers

ALLOWED_INTERESTS = [
    "museums",
    "food",
    "walking",
    "history",
    "nature",
    "shopping",
    "culture",
    "nightlife",
    "relaxation",
    "art",
]

ALLOWED_PACES = ["relaxed", "moderate", "fast"]


COMMON_COUNTRY_ALIASES: dict[str, str] = {
    "usa": "US",
    "united states": "US",
    "united states of america": "US",
    "uk": "GB",
    "united kingdom": "GB",
    "great britain": "GB",
    "england": "GB",
    "scotland": "GB",
    "uae": "AE",
    "south korea": "KR",
    "korea": "KR",
    "russia": "RU",
    "czech republic": "CZ",
    "czechia": "CZ",
    "vatican": "VA",
    "vatican city": "VA",
}


def resolve_country_code(value: str) -> str | None:
    """Resolves an ISO alpha-2 code from either a 2-letter code or country name."""
    val = value.strip()
    if not val:
        return None
    if len(val) == 2 and val.upper() in countries:
        return val.upper()

    val_lower = val.lower()
    if val_lower in COMMON_COUNTRY_ALIASES:
        return COMMON_COUNTRY_ALIASES[val_lower]

    country_dict = dict(countries)
    for code, name in country_dict.items():
        if name.lower() == val_lower:
            return code

    for code, name in country_dict.items():
        name_clean = name.lower()
        if name_clean.startswith(val_lower) or val_lower.startswith(name_clean):
            return code

    return None


class ItineraryRequestSerializer(serializers.Serializer):
    """
    Validates input parameters for generating an AI itinerary.
    Includes flexible ISO country resolution (by code or name),
    optional city specification, 14-day date window cap,
    and prompt-injection resistant interest enums.
    """

    country = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    interests = serializers.ListField(
        child=serializers.ChoiceField(choices=ALLOWED_INTERESTS),
        max_length=5,
        required=False,
        default=list,
    )
    pace = serializers.ChoiceField(choices=ALLOWED_PACES, default="moderate")

    def validate_country(self, value: str) -> str:
        code = resolve_country_code(value)
        if not code:
            raise serializers.ValidationError(
                f"'{value}' could not be matched to a valid country. Please enter a "
                "recognized country name (e.g. France, Japan) or 2-letter code (e.g. FR, JP)."
            )
        return code

    def validate_city(self, value: str) -> str:
        if not value:
            return ""
        cleaned = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", value).strip()
        return cleaned

    def validate(self, attrs: dict) -> dict:
        city = attrs.get("city", "").strip()
        # Preserve empty city as meaningful — triggers country-level path
        attrs["city"] = city
        attrs["is_country_level"] = not bool(city)

        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date:
            if end_date < start_date:
                raise serializers.ValidationError(
                    {"end_date": "End date cannot be earlier than start date."}
                )
            duration = (end_date - start_date).days + 1
            if duration > 14:
                msg = f"Itinerary duration cannot exceed 14 days (requested {duration} days)."
                raise serializers.ValidationError({"end_date": msg})

        return attrs


class ItineraryAcceptStopSerializer(serializers.Serializer):
    """Validates individual stop payloads for atomic persistence."""

    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    order = serializers.IntegerField(default=0, min_value=0)
    arrival_date = serializers.DateField(required=False, allow_null=True)
    departure_date = serializers.DateField(required=False, allow_null=True)
    stop_type = serializers.ChoiceField(
        choices=[("visit", "Visit"), ("transfer", "Transfer")],
        default="visit",
        required=False,
    )
    duration_minutes = serializers.IntegerField(
        required=False, allow_null=True, default=None, min_value=0
    )


class ItineraryAcceptTripSerializer(serializers.Serializer):
    """Validates parent trip metadata for atomic persistence."""

    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be before start date."}
            )
        return attrs


class ItineraryAcceptSerializer(serializers.Serializer):
    """
    Validates complete atomic itinerary acceptance payload:
    trip details + all associated stops.
    """

    trip = ItineraryAcceptTripSerializer()
    stops = ItineraryAcceptStopSerializer(many=True, default=list)
