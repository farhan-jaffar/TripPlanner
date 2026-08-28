import django_filters

from .models import Stop, Trip


class TripFilter(django_filters.FilterSet):
    """
    Filter set for Trip queries supporting date range filtering.
    """

    start_date_after = django_filters.DateFilter(field_name="start_date", lookup_expr="gte")
    start_date_before = django_filters.DateFilter(field_name="start_date", lookup_expr="lte")
    end_date_after = django_filters.DateFilter(field_name="end_date", lookup_expr="gte")
    end_date_before = django_filters.DateFilter(field_name="end_date", lookup_expr="lte")

    class Meta:
        model = Trip
        fields = (
            "start_date_after",
            "start_date_before",
            "end_date_after",
            "end_date_before",
        )


class StopFilter(django_filters.FilterSet):
    """
    Filter set for Stop queries supporting date range filtering.
    """

    arrival_date_after = django_filters.DateFilter(field_name="arrival_date", lookup_expr="gte")
    arrival_date_before = django_filters.DateFilter(field_name="arrival_date", lookup_expr="lte")
    departure_date_after = django_filters.DateFilter(
        field_name="departure_date", lookup_expr="gte"
    )
    departure_date_before = django_filters.DateFilter(
        field_name="departure_date", lookup_expr="lte"
    )

    class Meta:
        model = Stop
        fields = (
            "arrival_date_after",
            "arrival_date_before",
            "departure_date_after",
            "departure_date_before",
        )
