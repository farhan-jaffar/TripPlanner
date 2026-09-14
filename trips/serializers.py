from django.db.models import Max
from rest_framework import serializers

from .models import Stop, Trip


class TripSerializer(serializers.ModelSerializer):
    """
    Serializer for Trip model with stop_count annotation, owner information,
    and PATCH-safe date validation.
    """

    stop_count = serializers.IntegerField(read_only=True, default=0)
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True, default=None)

    class Meta:
        model = Trip
        fields = [
            "id",
            "owner",
            "owner_username",
            "title",
            "description",
            "start_date",
            "end_date",
            "stop_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "owner_username",
            "stop_count",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be before the start date."}
            )
        return attrs


class StopSerializer(serializers.ModelSerializer):
    """
    Serializer for Stop model with cross-model date validation and order auto-assignment.
    """

    trip = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Stop
        fields = [
            "id",
            "trip",
            "name",
            "description",
            "location",
            "order",
            "arrival_date",
            "departure_date",
            "stop_type",
            "duration_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "trip", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        arrival = attrs.get("arrival_date", getattr(instance, "arrival_date", None))
        departure = attrs.get("departure_date", getattr(instance, "departure_date", None))
        trip = self.context.get("trip") or getattr(instance, "trip", None)

        if arrival and departure and departure < arrival:
            raise serializers.ValidationError(
                {"departure_date": "Cannot be before the arrival date."}
            )
        if trip and arrival and not (trip.start_date <= arrival <= trip.end_date):
            raise serializers.ValidationError(
                {"arrival_date": "Must fall within the trip's date range."}
            )
        if trip and departure and not (trip.start_date <= departure <= trip.end_date):
            raise serializers.ValidationError(
                {"departure_date": "Must fall within the trip's date range."}
            )
        return attrs

    def create(self, validated_data):
        if "order" not in validated_data:
            last = Stop.objects.filter(trip=validated_data["trip"]).aggregate(Max("order"))[
                "order__max"
            ]
            validated_data["order"] = 0 if last is None else last + 1
        return super().create(validated_data)
