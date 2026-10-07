"""
OpenAPI 3.0 Schema Contract and Drift Tests.
Uses Schemathesis and drf-spectacular to verify API endpoints, parameters,
security schemes, and response models against the active Django application.
"""

import pytest
import schemathesis
from rest_framework_simplejwt.tokens import RefreshToken

from config.wsgi import application
from trips.tests.factories import UserFactory

# Load schema directly from the Django WSGI application
schema = schemathesis.openapi.from_wsgi("/api/v1/schema/", application)


@pytest.mark.django_db
class TestOpenAPISchemaContract:
    """
    Validates OpenAPI 3.0 schema definitions and guards against contract drift.
    """

    def test_schema_loads_and_contains_all_paths(self):
        raw = schema.raw_schema
        assert raw is not None
        assert "paths" in raw

        expected_paths = [
            "/api/v1/auth/register/",
            "/api/v1/auth/token/",
            "/api/v1/auth/token/refresh/",
            "/api/v1/auth/logout/",
            "/api/v1/auth/profile/me/",
            "/api/v1/trips/",
            "/api/v1/trips/{id}/",
            "/api/v1/trips/{trip_pk}/stops/",
            "/api/v1/trips/{trip_pk}/stops/{id}/",
        ]

        for path in expected_paths:
            assert path in raw["paths"], f"Expected endpoint {path} not found in OpenAPI schema"

    def test_schema_security_schemes_configured(self):
        raw = schema.raw_schema
        components = raw.get("components", {})
        security_schemes = components.get("securitySchemes", {})

        assert "jwtAuth" in security_schemes
        jwt_scheme = security_schemes["jwtAuth"]
        assert jwt_scheme["type"] == "http"
        assert jwt_scheme["scheme"] == "bearer"
        assert jwt_scheme["bearerFormat"] == "JWT"

    def test_schema_model_components_defined(self):
        raw = schema.raw_schema
        schemas = raw.get("components", {}).get("schemas", {})

        expected_schemas = [
            "Trip",
            "PatchedTrip",
            "Stop",
            "PatchedStop",
            "Profile",
            "Register",
            "User",
            "TokenRefresh",
        ]

        for s in expected_schemas:
            assert s in schemas, f"Expected model schema {s} missing from OpenAPI components"

        # Verify Trip schema fields
        trip_schema = schemas["Trip"]
        trip_props = trip_schema["properties"]
        assert "id" in trip_props
        assert "title" in trip_props
        assert "start_date" in trip_props
        assert "end_date" in trip_props
        assert "stop_count" in trip_props
        assert "owner" in trip_props

        # Verify Stop schema fields
        stop_schema = schemas["Stop"]
        stop_props = stop_schema["properties"]
        assert "id" in stop_props
        assert "name" in stop_props
        assert "location" in stop_props
        assert "order" in stop_props
        assert "arrival_date" in stop_props
        assert "departure_date" in stop_props
        assert "trip" in stop_props

    def test_authenticated_endpoint_contract_conformance(self, client):
        """
        Verify that hitting endpoints with valid auth headers returns data conforming
        to the schema shapes without unhandled 500 errors.
        """
        user = UserFactory()
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}

        # 1. Profile Me
        profile_res = client.get("/api/v1/auth/profile/me/", **auth_headers)
        assert profile_res.status_code == 200
        data = profile_res.json()
        assert "username" in data
        assert "email" in data
        assert "display_name" in data

        # 2. Trip List
        trips_res = client.get("/api/v1/trips/", **auth_headers)
        assert trips_res.status_code == 200
        trips_data = trips_res.json()
        assert "count" in trips_data
        assert "results" in trips_data
