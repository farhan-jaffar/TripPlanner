from django.urls import path

from .views import ItineraryAcceptView, ItineraryGenerateView

urlpatterns = [
    path("generate/", ItineraryGenerateView.as_view(), name="itinerary-generate"),
    path("accept/", ItineraryAcceptView.as_view(), name="itinerary-accept"),
]
