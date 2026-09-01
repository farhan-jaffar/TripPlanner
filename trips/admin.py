from django.contrib import admin

from .models import Stop, Trip


class StopInline(admin.TabularInline):
    """
    Inline stop editor allowing stops to be added/edited directly inside
    the Trip form in Django Admin UI.
    """

    model = Stop
    extra = 1
    fields = [
        "name",
        "description",
        "location",
        "order",
        "arrival_date",
        "departure_date",
    ]


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    """
    Admin configuration for Trip model.
    """

    list_display = ["title", "start_date", "end_date", "created_at"]
    list_filter = ["start_date", "end_date", "created_at"]
    search_fields = ["title", "description"]
    inlines = [StopInline]


@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    """
    Admin configuration for Stop model.
    """

    list_display = [
        "name",
        "trip",
        "location",
        "order",
        "arrival_date",
        "departure_date",
    ]
    list_filter = ["arrival_date", "departure_date", "trip"]
    search_fields = ["name", "description", "location", "trip__title"]
