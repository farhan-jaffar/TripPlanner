"""
E2E Testing Settings for TripPlanner.
Uses an isolated SQLite database to ensure no interference with development data.
"""

from .settings import *  # noqa: F403

# Isolated SQLite database for Playwright test runs
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.e2e.sqlite3",  # noqa: F405
    }
}

# Ensure CORS and hosts allow test runners
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
CORS_ALLOW_ALL_ORIGINS = True
