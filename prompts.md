# Trip Planner - Major Prompts & Decision Log

This file records significant prompts, decisions, and rationale made during the construction of the Trip Planner backend.

---

## Prompt 1 - Initial Project Setup (2026-08-17)

**User Request (summary):**
Build a production-quality backend REST API for a Trip Planner application using Python, Django, and Django REST Framework (DRF).

**Key Requirements:**
- Trip and Stop resources with full CRUD
- Nested REST API under /api/v1/
- No authentication now, but design for future User -> Trips -> Stops ownership
- Pagination, search/filtering, ordering
- Ruff for linting/formatting
- pytest/pytest-django for tests
- OpenAPI docs via drf-spectacular
- .env-based config via python-decouple
- Pass: python manage.py check, makemigrations --check, ruff check ., ruff format --check .
- Professional README.md

**Key Architectural Decisions Made:**

| Decision | Choice | Why |
|---|---|---|
| Router type | drf-nested-routers + SimpleRouter | Clean nested /trips/{id}/stops/ URLs |
| Viewset | ModelViewSet | Minimal boilerplate for full CRUD |
| Filtering | django-filter | Industry standard with DRF integration |
| Env config | python-decouple | Cleaner than os.environ.get everywhere |
| API docs | drf-spectacular | Modern OpenAPI 3.0, actively maintained |
| DB | SQLite (dev) with PostgreSQL-ready settings | Simplest dev setup |
| Auth prep | Nullable owner FK on Trip model | Easiest future migration path |
| Test tooling | pytest-django + model-bakery | Fast, clean fixtures |
| Python version | 3.12 | Latest stable |
| Django version | 5.x | Latest LTS-aligned stable |

---

## Prompt 2 - Model Field Constraints Update (2026-08-17)

**User Feedback:**
Reviewed the initial implementation plan and marked several "Optional" fields as "required".

**Fields Changed to Required:**

| Model | Field | Before | After |
|---|---|---|---|
| Trip | start_date | DateField(null=True, blank=True) - Optional | DateField() - Required |
| Trip | end_date | DateField(null=True, blank=True) - Optional | DateField() - Required |
| Stop | arrival_date | DateField(null=True, blank=True) - Optional | DateField() - Required |
| Stop | departure_date | DateField(null=True, blank=True) - Optional | DateField() - Required |

**Impact:**
- Date validation is now always enforced (not conditional on "both provided")
- end_date >= start_date always required on Trip
- departure_date >= arrival_date always required on Stop

---

## Prompt 3 - Critical Architecture Fixes + Strict Scheduling Decision (2026-08-17)

**User Feedback (6 identified gaps):**

1. **Model clean() validation won't fire via DRF API** - DRF ModelSerializer.is_valid() does not call model clean(). Date validation must live in Serializer.validate() as primary guard, with model clean() as secondary defense.

2. **No default ordering = unstable pagination** - PageNumberPagination without Meta.ordering can yield duplicate/skipped rows across pages in Postgres/SQLite.

3. **python-decouple + DATABASE_URL don't work together** - decouple reads strings, does not parse DATABASE_URL into DATABASES dict. Needs dj-database-url or a full switch.

4. **stops_count risks N+1 queries** - SerializerMethodField calling obj.stops.count() is one query per trip. Must use queryset annotate(stops_count=Count("stops")) instead.

5. **No cross-model date validation** - Nothing prevented a Stop from having dates outside its parent Trip's window.

6. **Missing production-quality settings** - No CORS, no explicit permission class comment, no explicit PAGE_SIZE / max_page_size.

**Decisions Made:**

| Issue | Resolution |
|---|---|
| Validation layer | Serializer validate() = primary; model clean() = secondary |
| Model ordering | Trip: ordering=["-created_at"]; Stop: ordering=["trip","order","arrival_date"] |
| Env config | Switched python-decouple -> django-environ (handles DATABASE_URL natively) |
| stops_count | annotate(stops_count=Count("stops")) in viewset; IntegerField(read_only=True) in serializer |
| Cross-model dates | STRICT MODE chosen - Stop dates must fall within parent Trip's date window; violation = 400 error |
| CORS | Added django-cors-headers to dependencies |
| Permissions | Explicit AllowAny with # FUTURE AUTH: comment marking exact flip point |
| Pagination | Explicit PAGE_SIZE=20, max_page_size=100 via StandardResultsSetPagination |

**New Validation Rules (complete set):**

| # | Rule | Layer |
|---|---|---|
| 1 | end_date >= start_date on Trip | Serializer validate() + model clean() |
| 2 | departure_date >= arrival_date on Stop | Serializer validate() + model clean() |
| 3 | arrival_date >= trip.start_date (strict) | Serializer validate() + model clean() |
| 4 | departure_date <= trip.end_date (strict) | Serializer validate() + model clean() |
| 5 | Stop trip set from URL - never from body | Serializer |
| 6 | Stop order is non-negative | Model PositiveIntegerField |

**Scheduling Philosophy:**
Trips are strict/bounded containers. A stop cannot start before the trip begins or end after the trip ends. If a trip's dates are later narrowed, existing stops that fall outside will fail validation on next update (acceptable trade-off for strict scheduling mode).

---

## Prompt 4 - Structured Location Fields: Option 2 (2026-08-17)

**Context:**
The original plan had no location field on Trip, and a single free-text location CharField on Stop. This created several real problems: no way to reliably filter "all trips to Japan", no structured country data, and Trip had no destination concept at all.

**Options Presented:**
1. Free-text only + add destination_country/city CharFields to Trip (cheap, no validation)
2. django-countries CountryField + free-text city (reliable filtering, no external API)
3. Geocoded (Google Places / Mapbox) - external API dependency, phase-2

**User Decision: Option 2 - Structured but static**

**Changes Made:**

Trip model additions:
| Field | Type | Required | Notes |
|---|---|---|---|
| destination_country | CountryField() | Yes | ISO 3166-1 alpha-2 via django-countries |
| destination_city | CharField(max_length=200, blank=True) | No | Free-text primary city |

Stop model additions/changes:
| Field | Type | Required | Notes |
|---|---|---|---|
| country | CountryField() | Yes | ISO country code for this stop |
| city | CharField(max_length=200, blank=True) | No | Free-text city |
| location | CharField(max_length=300, blank=True) | No | Specific address (kept from before) |

New dependency added: django-countries>=7.6

CountryField behaviour:
- Stored as 2-char ISO code in DB
- Serializes as {"code": "JP", "name": "Japan"} via CountryFieldMixin
- Accepts "JP" or "Japan" on write input
- Enables exact filtering: GET /api/v1/trips/?destination_country=JP

Filtering additions:
- Trips: filter by destination_country, search destination_city
- Stops: filter by country, search city

Future geocoding integration point documented:
- Add latitude/longitude DecimalFields to Stop in a later migration
- country/city/location fields remain unchanged
- No schema redesign required

**Rationale:**
Keeps this phase self-contained (no external API), gives reliable country filtering, and leaves a clean upgrade path to geocoding consistent with the "no major rewrite later" principle already applied to auth.

---

## Prompt 5 - Refactored Architecture & Phased Execution Plan (2026-08-18)

**User Feedback & Updated Plan:**
User provided a refined architectural plan simplifying dependencies, eliminating unused abstractions, and establishing a strict phased execution strategy.

**Key Architecture Updates:**

| Decision | Before | Updated Choice | Rationale |
|---|---|---|---|
| Project layout | `tripplanner/` package | `config/` package | Eliminates same-name nested package confusion (`tripplanner/tripplanner/`) |
| Django Version | `5.0+` | **Django 5.2.17 LTS** | Guaranteed compatibility with `drf-nested-routers` + ~3-year support window |
| Settings | Split settings | **Single `config/settings.py`** | 12-factor env-driven configuration without split indirection |
| Auth readiness | Nullable `owner` FK | **No `owner` FK column** | Pre-wired query isolation commented in viewsets; additive diff when auth lands |
| DB constraints | `model.clean()` | **`CheckConstraint`** | Enforced at DB level for direct ORM writes (`trip_end_date_gte_start_date`, `stop_departure_date_gte_arrival_date`) |
| Base model | None | `TimeStampedModel` | Abstract base providing `created_at` and `updated_at` timestamps |
| Location fields | `django-countries` | `location` CharField(255) | Streamlined location model; country filter unnecessary for scope |
| Test tooling | `model-bakery` | **`factory_boy` + `pytest-cov`** | Explicit factory builders and line-by-line coverage measurement |
| Error handling | DRF default | `config/exceptions.py` | Custom exception handler returning clean JSON 500 error responses |
| Serializer fields | `stops_count` | `stop_count` | Renamed for consistency; computed via `annotate(stop_count=Count("stops"))` |
| Stop ordering | Manual order requirement | **Auto-assign order** | Serializer `create()` automatically appends to end if `order` omitted |
| Admin UI | Basic list | **`StopInline` in `TripAdmin`** | Enables adding and managing stops directly within the Trip form in Django Admin UI |

**Execution & Verification Results:**
- 39 pytest test cases passing with **99% test coverage**.
- Critical cross-trip isolation test added to guarantee 404 for stops queried under wrong trip path.
- 0 Ruff lint issues across entire codebase.
- Initial codebase committed and pushed to GitHub: [https://github.com/farhan-jaffar/TripPlanner](https://github.com/farhan-jaffar/TripPlanner).

---

## Prompt 6 - Frontend Implementation (Warm Terracotta & Sandy Neutrals) (2026-08-23)

**User Request & Design Decision:**
Build a production-quality React + TypeScript Single Page Application (SPA) consuming the Django REST Framework backend at `/api/v1/`.
- **Aesthetic Direction**: Earthy mix of Burnt Sienna & Terracotta (`#C85A32`, `#D97757`), Soft Beige (`#FAF8F5`, `#F4EFEA`), and Sandy Neutrals (`#E8DFD3`, `#362C25`) reflecting natural landscapes. No glassmorphism.
- **Model Alignment**: Simplified location model with `Stop.location` as free-text, no country fields on `Trip`, and `stop_count` mapping.
- **Validation**: Strict client-side cross-field and date boundary validation mirroring DRF rules + automatic mapping of server 400 field errors.

**Architecture & Implementation Details:**

| Layer | Implementation | Notes |
|---|---|---|
| Framework & Language | React 18 + TypeScript (strict) | Vite 5 bundler |
| Server State | TanStack Query v5 | Stale-while-revalidate, automatic invalidation on mutation |
| Forms & Validation | React Hook Form + Zod | Schema validation + DRF server error integration |
| Design Tokens & UI | Tailwind CSS + Lucide Icons | Custom palette (terracotta, sand, sage), warm paper surfaces |
| API Client | Axios instance with auth interceptor hook | Base URL env configuration (`VITE_API_BASE_URL`) |
| Testing | Vitest + React Testing Library + MSW | Mock Service Worker network interceptor tests |

**Verification & Test Results:**
- 5 Vitest component and flow integration tests passing (100%).
- 39 Django backend pytest test cases passing (100%).
- TypeScript type-check passing with 0 errors (`tsc --noEmit`).
- Production build succeeded (`vite build`).

---

## Prompt 7 - TypeScript to JavaScript (JSX) Migration (2026-08-23)

**User Request:**
Convert the entire frontend codebase from TypeScript (`.ts`/`.tsx`) to pure JavaScript (`.js`/`.jsx`) while retaining identical styling, layout, components, and behavior.

**Actions Taken:**
- Migrated all components, hooks, schemas, and API utilities from TypeScript to standard JavaScript / JSX.
- Updated `vite.config.js`, `package.json`, and `index.html` entry points.
- Converted the MSW and Vitest test suite (`trips.test.jsx`, `stops.test.jsx`, `handlers.js`, `setup.js`).
- Removed `tsconfig.json`, `tsconfig.node.json`, and all `.ts`/`.tsx` files.

**Verification Results:**
- 5 Vitest tests passing (100%).
- Production build succeeded in 6.86s (`vite build`).
- UI styling and behavior remained 100% identical.

---

## Prompt 8 - JWT Authentication, User Profiles & Scoped Ownership (2026-08-27)

**User Request & Goal:**
Implement JWT authentication, user profiles, and per-user trip/stop ownership scoping across the Django REST Framework backend and React frontend with session restoration, protected routing, and user profile management.

**Key Architecture & Implementation Details:**

| Layer | Component | Implementation Details |
|---|---|---|
| **Backend Auth** | SimpleJWT | 15-minute access token, 7-day refresh token with rotation and blacklisting (`REST_FRAMEWORK` default permission set to `IsAuthenticated`). |
| **Backend Models** | `Trip.owner` & `Profile` | Added `owner` FK to `Trip`; created `Profile` (1:1 with `User`, `display_name`, `bio`, `avatar_url`) auto-created via `post_save` signals. |
| **Backend Scoping** | `IsOwner` & Query Scoping | `TripViewSet.get_queryset()` filtered by `owner=request.user`; `StopViewSet` scopes via `get_object_or_404(Trip, pk=..., owner=request.user)` returning 404 cleanly. |
| **Backend Migrations** | Schema & Data Migration | `0002_trip_owner_profile` schema migration + `0003_assign_orphan_trips` data migration assigning orphan dev trips to default user. |
| **Backend Endpoints** | `/api/v1/auth/*` | `register/` (201 + tokens), `token/` (login), `token/refresh/` (refresh), `logout/` (blacklist 205), `profile/me/` (GET / PATCH profile). |
| **Frontend Storage** | In-Memory + `localStorage` | In-memory `accessToken` state; `localStorage` refresh token for silent session boot and 401 retry interceptors with request replay. |
| **Frontend Auth Context** | `AuthContext` + `useAuth` | Manages `user`, `profile`, `accessToken`, `isAuthenticated`, `isLoading`, `login`, `register` (auto-login), `logout`, and `updateProfile`. |
| **Frontend Routing** | `ProtectedRoute` | Guards private routes (`/`, `/trips/*`, `/profile`), renders warm loading spinner during boot, redirects to `/login` if unauthenticated. |
| **Frontend UI** | Auth & Profile Pages | `LoginPage` + `LoginForm`, `RegisterPage` + `RegisterForm`, `ProfilePage` + `ProfileForm` with live avatar preview, and `Navbar` user dropdown. |

**Verification & Test Results:**
- **Backend Tests**: 61 pytest test cases passing (100%) across models, serializers, auth views, permissions, and trip/stop APIs.
- **Backend Linting**: 0 Ruff lint issues (`ruff check .`).
- **Frontend Tests**: 11 Vitest test cases passing (100%) across auth flows, protected routing, trip timelines, and stop validation.
- **Frontend Build**: Production bundle built successfully (`vite build`).


