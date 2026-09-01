from functools import cached_property

from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .filters import StopFilter, TripFilter
from .models import Trip
from .permissions import IsOwner
from .serializers import StopSerializer, TripSerializer


class TripViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing, creating, updating, and deleting trips owned by the authenticated user.
    """

    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    filterset_class = TripFilter
    search_fields = ["title", "description"]
    ordering_fields = ["start_date", "end_date", "title", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Trip.objects.filter(owner=self.request.user).annotate(stop_count=Count("stops"))

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class StopViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing, creating, updating, and deleting stops nested within
    a trip owned by the user.
    """


    serializer_class = StopSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    filterset_class = StopFilter
    search_fields = ["name", "description", "location"]
    ordering_fields = ["order", "arrival_date", "departure_date"]
    ordering = ["order", "id"]

    @cached_property
    def trip(self) -> Trip:
        # 404s for a nonexistent trip or a trip owned by another user on every action.
        return get_object_or_404(Trip, pk=self.kwargs["trip_pk"], owner=self.request.user)

    def get_queryset(self):
        return self.trip.stops.all()

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "trip": self.trip}

    def perform_create(self, serializer):
        serializer.save(trip=self.trip)

