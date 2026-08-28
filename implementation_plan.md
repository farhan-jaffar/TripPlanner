# Trip Planner Backend — Implementation Plan (Revised)

## Overview

Build a production-quality Django + DRF REST API backend for a Trip Planner application. The backend manages **Trips** and **Stops**, is API-versioned at `/api/v1/`, and is architected to support user authentication/authorization in a future phase without a major rewrite.

**Stack:** Python 3.12, Django 5.2 LTS, Django REST Framework 3.18, SQLite (dev), PostgreSQL-ready, Ruff, pytest-django, factory_boy.

**Trip scheduling mode: Strict** — a Stop's dates must fall within its parent Trip's date window. Violations are a `400` validation error, not a warning.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Django version | **5.2.17 LTS** | `drf-nested-routers` only declares support up to Django 5.2 in its classifiers. LTS also gives ~3-year support vs ~16 months for 6.x. |
| Project layout | `config/` project package + `trips/` app | Avoids the "project-inside-a-project with same name" confusion of `tripplanner/tripplanner/`. |
| Nested routing | `NestedDefaultRouter` for `/trips/{id}/stops/` | A stop cannot exist without a trip — the URL should say so, and it removes a whole class of "stop assigned to wrong trip" bugs. |
| Auth prep | **No nullable `owner` FK yet.** Isolation points pre-wired in `get_queryset` / `perform_create` as comments. | Additive later — avoids a dangling unused FK on every Trip row now. |
| Settings | **Single `config/settings.py`** driven by env vars | No split base/dev/prod. Simpler. Env-based config satisfies 12-factor without extra indirection. |
| API versioning | Hardcoded `/api/v1/` URL prefix | No need for DRF's versioning framework machinery at this scope. |
| Services layer | **None** | Validation → serializers (API rules). Constraints → models (data-integrity rules). Adding a services layer now is the unnecessary abstraction the spec warns against. |
| Viewsets | `ModelViewSet` + `NestedDefaultRouter` | DRY CRUD with nested `/trips/{id}/stops/` |
| Filtering | `django-filter` | Clean filter backend integration |
| Pagination | `PageNumberPagination` (`page_size=20`, `max_page_size=100`) | Stable, predictable |
| Linting | Ruff (check + format) | Modern, fast, single tool |
| Testing | `pytest-django` + `factory_boy` | `factory_boy` preferred over `model-bakery` for more explicit test data declarations |
| Env config | `django-environ` | Handles `DATABASE_URL` parsing + `.env` natively |
| CORS | `django-cors-headers` | Backend prerequisite for future React frontend calling cross-origin |
| Stop scheduling | **Strict** | Stop dates must fall within Trip's date window — `400` on violation |
| Date validation layer | Serializer `validate()` (primary) + `CheckConstraint` (DB-level) | DRF does not call `clean()` — serializer is the authoritative API guard; `CheckConstraint` provides defense-in-depth at the DB layer |
| `stop_count` | Viewset `annotate()` → serializer `IntegerField` | Avoids N+1 query per trip in list views |
| Model ordering | `class Meta: ordering` on both models | Guarantees stable pagination; no duplicate/skipped rows |
| Location strategy | Free-text `location` on Stop (255 chars) | Simpler than `django-countries` at this scope; filtering by country is not a stated requirement |
| `StopViewSet.trip` lookup | `@cached_property` | Memoizes the trip DB hit for the lifetime of one request — `get_queryset`, `get_serializer_context`, and `perform_create` share one query instead of three |
| OpenAPI docs | **Not included** | Not requested. DRF's built-in browsable API is sufficient for manual verification. |

---

## Project Structure

```
TripPlanner/
├── manage.py
├── .env
├── .env.example
├── .gitignore
├── README.md
├── prompts.md
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml               ← Ruff + pytest config
├── conftest.py                  ← pytest root config
├── config/                      ← Django project package
│   ├── __init__.py
│   ├── settings.py              ← single settings file, env-driven
│   ├── urls.py
│   ├── exceptions.py            ← custom DRF exception handler (JSON 500s)
│   ├── wsgi.py
│   └── asgi.py
└── trips/                       ← Core app
    ├── __init__.py
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── serializers.py
    ├── views.py
    ├── urls.py
    ├── filters.py
    ├── pagination.py
    ├── migrations/
    └── tests/
        ├── __init__.py
        ├── conftest.py
        ├── factories.py          ← factory_boy factories
        ├── test_models.py
        ├── test_serializers.py
        ├── test_trip_api.py
        └── test_stop_api.py
```

---

## Data Models

### Shared Base

```python
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

Both `Trip` and `Stop` inherit from `TimeStampedModel`.

### Trip

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `AutoField` (PK) | auto | |
| `title` | `CharField(max_length=200)` | **yes** | |
| `description` | `TextField(blank=True)` | no | |
| `start_date` | `DateField()` | **yes** | |
| `end_date` | `DateField()` | **yes** | must be ≥ `start_date` |
| `created_at` | `DateTimeField(auto_now_add=True)` | auto | via `TimeStampedModel` |
| `updated_at` | `DateTimeField(auto_now=True)` | auto | via `TimeStampedModel` |

**No `owner` FK for now.** The future auth integration points are pre-wired in `get_queryset` / `perform_create` as comments only — no nullable column sitting unused in the DB.

**`class Meta: ordering = ["-created_at"]`** — ensures stable queryset order for pagination.

**DB-level constraint (defense-in-depth):**
```python
constraints = [
    models.CheckConstraint(
        check=Q(end_date__gte=F("start_date")),
        name="trip_end_date_gte_start_date",
    ),
]
```

**Validation layer:**
- `TripSerializer.validate()` — primary; enforces `end_date >= start_date` on every API write, with correct PATCH fallback to instance values
- `CheckConstraint` — secondary DB-level guard (catches direct ORM writes that bypass the serializer)

### Stop

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `AutoField` (PK) | auto | |
| `trip` | `ForeignKey(Trip, related_name='stops', on_delete=CASCADE)` | set from URL | a stop cannot outlive its trip |
| `name` | `CharField(max_length=200)` | **yes** | place name (e.g. "Eiffel Tower") |
| `description` | `TextField(blank=True)` | no | |
| `location` | `CharField(max_length=255)` | **yes** | specific address / place name |
| `order` | `PositiveIntegerField(default=0)` | no | auto-assigned to append if omitted |
| `arrival_date` | `DateField(null=True, blank=True)` | no | if provided, departure ≥ arrival; both within trip window |
| `departure_date` | `DateField(null=True, blank=True)` | no | |
| `created_at` | `DateTimeField(auto_now_add=True)` | auto | |
| `updated_at` | `DateTimeField(auto_now=True)` | auto | |

**`class Meta: ordering = ["order", "id"]`** — stable order for pagination.

**DB-level constraint:**
```python
constraints = [
    models.CheckConstraint(
        check=(
            Q(arrival_date__isnull=True)
            | Q(departure_date__isnull=True)
            | Q(departure_date__gte=F("arrival_date"))
        ),
        name="stop_departure_date_gte_arrival_date",
    ),
]
```

**Validation (strict scheduling):**
- `StopSerializer.validate()` — primary; enforces:
  1. `departure_date >= arrival_date` (if both provided)
  2. `arrival_date` within `[trip.start_date, trip.end_date]`
  3. `departure_date` within `[trip.start_date, trip.end_date]`
  - Correctly handles PATCH by falling back to `self.instance` values for absent fields
- `CheckConstraint` — DB-level guard for departure ≥ arrival

> **Known limitation:** Changing a Trip's dates does not cascade-validate its existing Stops. A Stop that now falls outside the Trip's window will fail validation on its *next* update. This is an acceptable trade-off for strict mode, documented here rather than silently skipped. Adding retroactive cascade validation is a small future addition to `TripSerializer.validate()`.

> **Future geocoding hook:** Add `latitude = DecimalField(null=True)` and `longitude = DecimalField(null=True)` to Stop in a later migration. The `location` field remains unchanged; geocoding simply enriches it.

---

## API Endpoints

All endpoints prefixed with `/api/v1/`.

| Method | URL | Description | Status Codes |
|---|---|---|---|
| GET | `/api/v1/trips/` | List trips (paginated, filtered, ordered) | 200 |
| POST | `/api/v1/trips/` | Create a trip | 201, 400 |
| GET | `/api/v1/trips/{id}/` | Retrieve a trip | 200, 404 |
| PUT | `/api/v1/trips/{id}/` | Full update | 200, 400, 404 |
| PATCH | `/api/v1/trips/{id}/` | Partial update | 200, 400, 404 |
| DELETE | `/api/v1/trips/{id}/` | Delete (cascades to stops) | 204, 404 |
| GET | `/api/v1/trips/{trip_id}/stops/` | List stops for a trip | 200, 404 |
| POST | `/api/v1/trips/{trip_id}/stops/` | Create stop in trip | 201, 400, 404 |
| GET | `/api/v1/trips/{trip_id}/stops/{id}/` | Retrieve stop | 200, 404 |
| PUT | `/api/v1/trips/{trip_id}/stops/{id}/` | Full update | 200, 400, 404 |
| PATCH | `/api/v1/trips/{trip_id}/stops/{id}/` | Partial update | 200, 400, 404 |
| DELETE | `/api/v1/trips/{trip_id}/stops/{id}/` | Delete | 204, 404 |

404 for nonexistent resources. 400 with field-level messages for invalid input. These come from DRF defaults — no custom plumbing for happy paths, but every one gets an explicit test.

---

## Filtering / Searching / Ordering

**Trips:**
- Search: `title`, `description`
- Filter: `start_date_after` (`__gte`), `start_date_before` (`__lte`), `end_date_after` (`__gte`), `end_date_before` (`__lte`) — range filters; exact-date match on a trip date is rarely useful
- Order: `start_date`, `end_date`, `title`, `created_at` (default: `-created_at`)
- Example: `GET /api/v1/trips/?start_date_after=2026-01-01&end_date_before=2026-12-31`

**Stops:**
- Search: `name`, `description`, `location`
- Filter: `arrival_date_after/before`, `departure_date_after/before`
- Order: `order`, `arrival_date`, `departure_date` (default: `order, id`)
- Example: `GET /api/v1/trips/5/stops/?ordering=arrival_date`

---

## Serializers

| Serializer | Purpose | Key notes |
|---|---|---|
| `TripSerializer` | Full Trip CRUD (create/retrieve/update) | Explicit `fields` list (never `__all__`); `stop_count` as `IntegerField(read_only=True)` from `annotate()`; PATCH-safe `validate()` |
| `StopSerializer` | Full Stop CRUD | `trip` set from view context on create, from `self.instance` on update; `order` auto-assigned if omitted; PATCH-safe cross-model date validation |

**Explicit `fields` lists everywhere** — `__all__` is never used. This means a future `user` FK on Trip will never accidentally leak into the API response.

### `stop_count` — N+1 prevention

```python
# In TripViewSet:
def get_queryset(self):
    # Future auth: .filter(user=self.request.user)
    return Trip.objects.annotate(stop_count=Count("stops"))


# In TripSerializer:
stop_count = serializers.IntegerField(read_only=True)
```

Single `COUNT` aggregated in the DB — zero extra queries per trip in a list view.

### PATCH-safe validation pattern

```python
# TripSerializer
def validate(self, attrs):
    start = attrs.get("start_date", getattr(self.instance, "start_date", None))
    end = attrs.get("end_date", getattr(self.instance, "end_date", None))
    if start and end and end < start:
        raise serializers.ValidationError(
            {"end_date": "End date cannot be before the start date."}
        )
    return attrs
```

```python
# StopSerializer
def validate(self, attrs):
    instance = self.instance
    arrival = attrs.get("arrival_date", getattr(instance, "arrival_date", None))
    departure = attrs.get("departure_date", getattr(instance, "departure_date", None))
    trip = self.context.get("trip") or getattr(instance, "trip", None)

    if arrival and departure and departure < arrival:
        raise serializers.ValidationError({"departure_date": "Cannot be before the arrival date."})
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
```

`order` auto-assignment is in the serializer, not `Model.save()` — it's an API convenience, not a data-integrity rule.

---

## Validation Rules (complete)

| # | Rule | Layer | HTTP |
|---|---|---|---|
| 1 | `end_date >= start_date` on Trip | Serializer `validate()` + `CheckConstraint` | 400 / IntegrityError |
| 2 | `departure_date >= arrival_date` on Stop (if both provided) | Serializer `validate()` + `CheckConstraint` | 400 / IntegrityError |
| 3 | `arrival_date` within Trip's date range (strict scheduling) | Serializer `validate()` | 400 |
| 4 | `departure_date` within Trip's date range (strict scheduling) | Serializer `validate()` | 400 |
| 5 | Stop `trip` set from URL — never from request body | Serializer / view | (trip is not a writable serializer field) |
| 6 | Stop `order` is non-negative | Model field (`PositiveIntegerField`) | 400 |
| 7 | Stop `order` auto-assigns to append-end if omitted | Serializer `create()` | — |

---

## Views & Routing

```python
class TripViewSet(viewsets.ModelViewSet):
    serializer_class = TripSerializer
    filterset_class = TripFilter
    search_fields = ["title", "description"]
    ordering_fields = ["start_date", "end_date", "title", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Future auth: .filter(user=self.request.user)
        return Trip.objects.annotate(stop_count=Count("stops"))

    def perform_create(self, serializer):
        # Future auth: serializer.save(user=self.request.user)
        serializer.save()


class StopViewSet(viewsets.ModelViewSet):
    serializer_class = StopSerializer
    ordering_fields = ["order", "arrival_date", "departure_date"]
    ordering = ["order", "id"]
    search_fields = ["name", "description", "location"]

    @cached_property
    def trip(self) -> Trip:
        # 404s for a nonexistent trip on every action, not just create.
        # Future auth: get_object_or_404(Trip, pk=..., user=self.request.user)
        return get_object_or_404(Trip, pk=self.kwargs["trip_pk"])

    def get_queryset(self):
        return self.trip.stops.all()

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "trip": self.trip}

    def perform_create(self, serializer):
        serializer.save(trip=self.trip)
```

`@cached_property` memoizes the trip DB lookup for the lifetime of the request. A fresh `ViewSet` instance is created per-request in DRF, so this is safe — `get_queryset`, `get_serializer_context`, and `perform_create` share one DB hit instead of three.

`trips/urls.py`:
```python
router = DefaultRouter()
router.register("trips", TripViewSet, basename="trip")

trips_router = NestedDefaultRouter(router, "trips", lookup="trip")
trips_router.register("stops", StopViewSet, basename="trip-stops")

urlpatterns = router.urls + trips_router.urls
```

`config/urls.py` mounts this under `path("api/v1/", include("trips.urls"))`.

---

## Error Handling

DRF's defaults return clean, field-level 400s and 404s. The one gap: an unhandled exception with `DEBUG=False` falls through to Django's HTML 500 page — wrong for a JSON API.

```python
# config/exceptions.py
def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response
    logger.exception("Unhandled exception", exc_info=exc)
    if settings.DEBUG:
        return None  # let Django's debug page help locally
    return Response(
        {"detail": "An unexpected error occurred. Please try again later."},
        status=500,
    )
```

Registered via `"EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler"` in `REST_FRAMEWORK`.

---

## Dependencies

### `requirements.txt` (runtime)
```
Django==5.2.17
djangorestframework==3.18.0
django-filter==26.1
django-environ==0.14.0
drf-nested-routers==0.95.3
django-cors-headers==4.9.0
psycopg[binary]==3.3.4      # Postgres driver — unused with SQLite default, harmless
```

### `requirements-dev.txt` (development)
```
pytest==9.1.1
pytest-django==4.14.0
pytest-cov==7.1.0
factory-boy==3.3.3
ruff==0.16.3
```

Explicitly **not** included: `drf-spectacular` (not requested — browsable API is sufficient), `mypy/django-stubs` (real friction with Django ORM typing, not requested), `docker` (deployment concern, out of scope).

---

## Key Settings (`config/settings.py`)

```python
env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
DATABASES = {"default": env.db("DATABASE_URL", default="sqlite:///db.sqlite3")}
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

REST_FRAMEWORK = {
    # FUTURE AUTH: flip to IsAuthenticated when auth lands — one line change
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "trips.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
}
```

---

## Ruff Configuration

```toml
[tool.ruff]
target-version = "py312"
line-length = 99
extend-exclude = ["*/migrations/*"]

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "DJ", "N", "C4", "SIM"]

[tool.ruff.lint.isort]
known-first-party = ["config", "trips"]

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings"
python_files = ["test_*.py"]
```

Migrations are excluded from Ruff (auto-generated) but are still committed to git normally — migrations are never gitignored.

---

## Test Coverage Plan

| Test File | What it covers |
|---|---|
| `test_models.py` | `__str__`, default ordering, cascade delete, `CheckConstraint` rejects bad dates via direct `.save()` (bypasses serializer — proves DB defense-in-depth) |
| `test_serializers.py` | Valid/invalid inputs, all 7 validation rules, PATCH-only-one-field still validates correctly, `order` auto-assign, read-only fields |
| `test_trip_api.py` | Trip CRUD, `stop_count` annotation, date-range filters, search, ordering, pagination (page size, override, max cap) |
| `test_stop_api.py` | Stop CRUD, cross-trip isolation (stop via wrong trip URL → 404), date validation, `order` auto-assign, cascade delete, search |

> **Cross-trip isolation test is critical** — it's the test that actually proves the nested-routing design is correct, not just convenient. Easy to accidentally skip; must be explicit.

---

## Environment Variables

```env
DEBUG=True
SECRET_KEY=change-me-to-a-random-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# Defaults to local SQLite if unset. For Postgres:
# DATABASE_URL=postgres://user:password@localhost:5432/trip_planner
DATABASE_URL=sqlite:///db.sqlite3

# Comma-separated origins allowed to call this API (e.g. the React dev server)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Phased Build Order

Each phase ends with an explicit verification step — nothing is marked done without running it.

| Phase | Work | Verify |
|---|---|---|
| 0 | Scaffold: `config/` package, `pyproject.toml`, `requirements*.txt`, `.env.example`, `.gitignore` | `python manage.py check` |
| 1 | `Trip` model + `TimeStampedModel` base + admin + migration | `check`, `makemigrations --check`, shell: constraint rejects bad dates |
| 2 | `TripSerializer`, `TripFilter`, `StandardResultsSetPagination`, `TripViewSet`, router | Manual curl/browsable-API through all 6 operations + status codes |
| 3 | `factories.py`, `conftest.py`, Trip model/serializer/API tests | `pytest -v` green |
| 4 | `Stop` model + inline admin + migration | `check`, `makemigrations --check`, shell: cascade delete, order default |
| 5 | `StopSerializer` (cross-model validation, order auto-assign), `StopViewSet` (nested), router wiring | Manual: nested CRUD, 404 for bad trip id, 400s have clear messages |
| 6 | Stop tests including cross-trip isolation | `pytest -v` full suite green |
| 7 | `config/exceptions.py`, CORS/env finalized, README | Full command checklist — all pass |

---

## Future Integration Points

### Authentication

Exact, complete diff when auth lands — nothing is designed now, just isolated:

1. **Model:** Add `user = ForeignKey(settings.AUTH_USER_MODEL, on_delete=CASCADE, related_name="trips")` to `Trip` only. Stop does **not** need its own `user` — ownership is transitive through `trip__user`, no denormalized copy to keep in sync. One migration.
2. **Settings:** Change `DEFAULT_PERMISSION_CLASSES` from `AllowAny` to `IsAuthenticated`. One line.
3. **Views:** Uncomment the pre-wired lines in `get_queryset()` and `perform_create()`:
   ```python
   # TripViewSet.get_queryset:
   return Trip.objects.annotate(stop_count=Count("stops")).filter(user=self.request.user)
   # TripViewSet.perform_create:
   serializer.save(user=self.request.user)
   # StopViewSet.trip:
   return get_object_or_404(Trip, pk=self.kwargs["trip_pk"], user=self.request.user)
   ```
4. **Serializers:** Unaffected — `user` is deliberately never in any `fields` list.

~5 small, additive diffs across 3 files — not an architectural change.

### Geocoding (Phase 2)

```python
# Add to Stop model in a new migration — no existing fields change:
latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
```

The `location` field remains as-is; a geocoding service (Google Places, Mapbox, or Nominatim) can back-fill or enrich it without any schema redesign.

---

## Verification Plan (Definition of Done)

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
ruff check .
ruff format --check .
pytest --cov=trips --cov-report=term-missing
```
