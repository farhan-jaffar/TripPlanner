import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from trips.models import Profile


@pytest.mark.django_db
class TestAuthAPI:
    def test_register_success(self, api_client):
        payload = {
            "username": "wanderlust",
            "email": "wanderlust@example.com",
            "password": "StrongPassword2026!",
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "user" in data
        assert data["user"]["username"] == "wanderlust"
        assert data["user"]["email"] == "wanderlust@example.com"
        assert "tokens" in data
        assert "access" in data["tokens"]
        assert "refresh" in data["tokens"]
        assert Profile.objects.filter(user__username="wanderlust").exists()

    def test_register_duplicate_username_fails(self, api_client, user):
        payload = {
            "username": user.username,
            "email": "another@example.com",
            "password": "StrongPassword2026!",
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "username" in response.json()

    def test_register_weak_password_fails(self, api_client):
        payload = {
            "username": "newtraveler",
            "email": "traveler@example.com",
            "password": "123",  # too short and common
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.json()

    def test_login_success(self, api_client, user):
        payload = {
            "username": user.username,
            "password": "StrongPass123!",
        }
        response = api_client.post("/api/v1/auth/token/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access" in data
        assert "refresh" in data
        assert "user" in data
        assert data["user"]["username"] == user.username
        assert "profile" in data["user"]

    def test_login_invalid_credentials_returns_401(self, api_client, user):
        payload = {
            "username": user.username,
            "password": "WrongPassword!",
        }
        response = api_client.post("/api/v1/auth/token/", payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh_flow(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        response = api_client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": str(refresh)},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access" in data

    def test_token_refresh_invalid_token_returns_401(self, api_client):
        response = api_client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": "invalid.jwt.token"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_blacklists_refresh_token(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        response = api_client.post(
            "/api/v1/auth/logout/",
            {"refresh": str(refresh)},
            format="json",
        )
        assert response.status_code == status.HTTP_205_RESET_CONTENT

        # Re-using the blacklisted token to refresh must now fail with 401
        refresh_response = api_client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": str(refresh)},
            format="json",
        )
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_profile_authenticated(self, auth_client, user):
        response = auth_client.get("/api/v1/auth/profile/me/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == user.username
        assert data["email"] == user.email
        assert "display_name" in data

    def test_get_profile_unauthenticated_returns_401(self, api_client):
        response = api_client.get("/api/v1/auth/profile/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patch_profile_updates_fields(self, auth_client, user):
        payload = {
            "display_name": "Globetrotter Alex",
            "bio": "Backpacking across Mediterranean villages.",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
        }
        response = auth_client.patch("/api/v1/auth/profile/me/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["display_name"] == "Globetrotter Alex"
        assert data["bio"] == "Backpacking across Mediterranean villages."
        assert data["avatar_url"] == "https://images.unsplash.com/photo-1534528741775-53994a69daeb"

        profile = Profile.objects.get(user=user)
        assert profile.display_name == "Globetrotter Alex"
