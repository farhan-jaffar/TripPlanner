from django.urls import path
from rest_framework_nested import routers

from .auth_views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    ProfileMeView,
    RegisterView,
)
from .views import StopViewSet, TripViewSet

router = routers.DefaultRouter()
router.register("trips", TripViewSet, basename="trip")

trips_router = routers.NestedDefaultRouter(router, "trips", lookup="trip")
trips_router.register("stops", StopViewSet, basename="trip-stops")

auth_patterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/token/", CustomTokenObtainPairView.as_view(), name="auth-token-obtain"),
    path("auth/token/refresh/", CustomTokenRefreshView.as_view(), name="auth-token-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/profile/me/", ProfileMeView.as_view(), name="auth-profile-me"),
]

urlpatterns = auth_patterns + router.urls + trips_router.urls
