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

---

## Prompt 9 - Fullstack Multi-Tier Testing Strategy & CI Pipeline (2026-09-01)

**User Request & Goal:**
Implement a comprehensive, production-grade 4-layer testing strategy covering live API testing, OpenAPI 3.0 contract drift prevention, frontend component and MSW mock integration, isolated end-to-end browser user journeys with zero shared state, and a two-tier GitHub Actions CI pipeline.

**Assessment & Strategy Realignment:**
1. **Pyramid Shape**: Prioritize backend API integration tests as highest ROI, use Schemathesis to validate live WSGI compliance against the OpenAPI schema, keep MSW for fast frontend component feedback, and scope E2E to critical happy-path journeys.
2. **Database CheckConstraints**: Validated and enforced `trip_end_date_gte_start_date` and `stop_departure_date_gte_arrival_date` at both DB level (ORM constraints) and API serializer level.
3. **OpenAPI 3.0 Contract Testing**: Installed `drf-spectacular` and `schemathesis` to prevent field/type drift without manual mock maintenance.
4. **E2E Zero-Shared-State Architecture**: Configured Playwright with dynamic randomized user generation (`createTestUser` fixture) and a dedicated SQLite database (`db.e2e.sqlite3`) auto-migrated in `globalSetup`.

**Key Architectural Decisions & Implementation Details:**

| Layer / Component | Technology | Implementation Details |
|---|---|---|
| **Layer 1: Backend API Integration** | `pytest-django` + `APIClient` | 61 tests covering auth flows, SimpleJWT token rotation, permissions scoping, CheckConstraints, and full Trips & Stops CRUD. |
| **Layer 2: OpenAPI Contract Tests** | `drf-spectacular` + `schemathesis` | 4 tests validating live WSGI Django app endpoints against generated `/api/v1/schema/` OpenAPI specification with zero drift. |
| **Layer 3: Frontend Component & Mock** | `vitest` + `msw` + `@testing-library/react` | 12 tests verifying login/registration, token persistence, profile updates, trip creation, date boundary validations, and timeline stops. |
| **Layer 4: End-to-End User Journeys** | `@playwright/test` + Chromium | 3 isolated specs (`auth-flow.spec.js`, `trip-lifecycle.spec.js`, `stop-management.spec.js`) with multi-server web orchestration (Django + Vite). |
| **Frontend Token Refresh Mutex** | Axios Interceptors (`client.js`) | Added token refresh promise deduplication to prevent race conditions during concurrent 401s with token rotation. |
| **Modal Accessibility** | `Modal.jsx` | Added standard `role="dialog"` and `aria-modal="true"` attributes for accessibility and reliable test locators. |
| **CI / CD Pipeline** | GitHub Actions (`ci.yml`) | Tier 1 fast checks on push (`ruff`, `pytest`, `vitest`); Tier 2 full Playwright E2E gate on PRs to `main`. |

**Verification & Test Results:**
- **Backend & Contract Tests**: 65/65 tests passing (`python -m pytest`) in 66.8s.
- **Frontend Vitest Tests**: 12/12 tests passing (`npm run test` in `frontend/`) across 3 test files.
- **Playwright E2E Tests**: 3/3 specs passing (`npx playwright test -c e2e/playwright.config.js`) in 31.8s.

---

## Prompt 10 - AI Itinerary Generator Architecture & Single-City Generation (2026-09-04)

**User Request & Goal:**
Build a production-quality, grounded AI travel itinerary generator using Google Gemini 2.5 Flash, Geoapify (Places, Routing, Geocoding), and Open-Meteo Weather APIs. Deliver a full agent architecture with strict anti-hallucination guarantees, rate limiting/budget controls, atomic accept-and-save persistence to core `trips` models, and an interactive frontend UI.

**Key Architectural Decisions & Implementation Details:**

| Component | Technology / Pattern | Implementation Details |
|---|---|---|
| **App Architecture** | Django `agent` App | Modular architecture: `views.py`, `serializers.py`, `tools.py`, `gemini_client.py`, `grounding.py`, `budget.py`, `cache.py`, `schemas.py`. |
| **Orchestration & LLM** | Google Gemini 2.5 Flash (`google-genai` SDK) | System-prompted planner with structured JSON schema output (`GeneratedItinerary`) enforcing strict temporal sequencing and pacing. |
| **Place Discovery** | Geoapify Places API (`get_places`) | Queries real points of interest for destination city filtered by normalized user interest categories; extracts and indexes real `geoapify_place_id`s. |
| **Weather Forecasts** | Open-Meteo API (`get_weather`) | Free-tier daily weather forecasts (condition, temperature, precipitation) for the requested travel dates. |
| **Routing** | Geoapify Routing API (`get_route`) | Point-to-point transit/walking time and distance estimation between consecutive stops. |
| **Strict Anti-Hallucination** | Grounding Verification & Filter | `verify_and_filter_grounding` validates every generated stop against session's verified Geoapify places dict. Hallucinated venues are stripped. |
| **Bounded Retry** | Single Retargeted Retry | If $>30\%$ of stops fail grounding, triggers exactly one retry with an explicit list of valid Geoapify place IDs. |
| **Budget & Rate Limiting** | Leaky Bucket + Daily Quotas | Thread-safe in-memory leaky buckets for Geoapify RPS (5 req/s) and Gemini RPM (15 req/m); Redis/cache daily limits (`USER_DAILY_GENERATION_LIMIT`, `GEOAPIFY_DAILY_LIMIT`, `GEMINI_DAILY_LIMIT`). |
| **Concurrency Guard** | Cache-based Lock | Single-concurrency execution lock (`acquire_concurrency_lock` / `release_concurrency_lock`) rejecting overlapping generation spikes with HTTP 429. |
| **Atomic Persistence** | Transactional Accept (`POST /api/v1/itinerary/accept/`) | `transaction.atomic()` wraps `Trip` and nested `Stop` creations, ensuring complete rollback if any validation fails. |
| **Frontend UI** | `GenerateTripPage.jsx` & `ItineraryDisplay.jsx` | Country select with datalist, city input, 14-day date boundary check, interest chips (up to 5), pacing buttons, day-by-day timeline, weather badges, Open-Meteo CC BY 4.0 attribution link, and Save button. |

**Verification & Test Results:**
- 105 total backend tests passing (`python -m pytest`).
- 12 frontend Vitest component & flow tests passing.
- 0 Ruff lint errors.

---

## Prompt 11 - Country-Level Multi-City Trip Fix & Architecture Refactor (2026-09-07)

**User Request & Problem Statement:**
Fix the "no city selected" bug properly: stop collapsing an empty city into the country name in the serializer (`dict(countries).get(country_code, country_code)`), which caused invalid single-city geocoding. Establish two real generation paths: single-city and country-level (multi-city, duration-aware). Surface `get_route` for inter-city travel to build transfer stops, and implement concrete density validation.

**Key Architectural Decisions & Implementation Details:**

| Area / Feature | Decision / Mechanism | Implementation Details |
|---|---|---|
| **City-vs-Country Distinction** | Meaningful Empty City | Removed fallback in `agent/serializers.py`; preserved empty `city=""` and derived `is_country_level = not bool(city)` to branch generation. |
| **Macro City Discovery** | GeoNames Integration (`agent/city_discovery.py`) | Queries GeoNames `searchJSON` endpoint (country-filtered, `featureClass=P`, sorted by population) with defensive client-side re-sorting and a 50,000 population floor (fallback to top-5 for small countries). |
| **City-List Caching** | 30-day Cache TTL | Cached under `geonames:cities:{country_code}` — country major cities do not change frequently. |
| **Duration-Bounded Selection** | Duration Lookup Table | `max_cities_for_duration(days)` lookup table: 1–3 days $\to$ 1 city; 4–6 days $\to$ up to 2 cities; 7–10 days $\to$ up to 3 cities; 11–14 days $\to$ up to 4 cities. |
| **City Choice Authority** | Gemini `select_cities()` | Bounded Gemini call choosing strictly from GeoNames candidate list and allocating day counts according to duration and user interests. |
| **Country-Scoped Geocoding** | `geocode_city(city, country_code)` | Dedicated geocoding passing explicit `filter=countrycode:<cc>` to prevent cross-country collisions (e.g. Paris, TX). |
| **Inter-City Transfer Stops** | `build_transfer_stop()` via `get_route` | Surfaced Geoapify routing between consecutive cities, generating transfer stops with `stop_type="transfer"`, duration in minutes, and distance/mode summary. |
| **Trip/Stop Schema Evolution** | DB Model Migration | Added `stop_type` (`"visit"` / `"transfer"`) and `duration_minutes` (positive integer) to `Stop` model. Generated & applied migration `0004_stop_type_and_duration.py`. Exposed in serializers. |
| **Grounding Exemption** | Transfer Stop Bypass | In `verify_and_filter_grounding()`, transfer stops bypass `geoapify_place_id` verification while visit stops strictly maintain it. |
| **Density Validation** | `validate_density()` & `haversine_km()` | Enforces 2–6 visit stops per day; computes great-circle distance between same-day visit stops, flagging intra-day stops $> 15\text{ km}$ apart. |
| **Credit-Based Budgeting** | Multi-City Credit Scaling | User limit converted to credits (`PER_USER_DAILY_CREDITS = 6`); `generation_cost(cities)` clamps cost to 1–4 credits based on visited city count. Added `GEONAMES_DAILY_LIMIT` tracking. |
| **Frontend Enhancements** | City-Grouped Timeline & Transfer Cards | `ItineraryDisplay.jsx` groups days by city with headers (`groupDaysByCity`); renders distinct `TransferStopCard` with car icon and duration; `GenerateTripPage.jsx` sets `city: ""` default. |

**Verification & Test Results:**
- **Backend Tests**: 118/118 tests passing (100%) in 68.4s across `agent/tests/` (55 tests) and `trips/tests/` (63 tests).
  - `test_city_discovery.py` (10 tests)
  - `test_country_level_generation.py` (5 tests)
  - `test_density.py` (8 tests)
  - `test_grounding.py` (5 tests)
  - `test_budget.py` (12 tests)
  - `test_views.py` (13 tests)
  - Core `trips/` test suite (65 tests)
- **Frontend Vitest Tests**: 15/15 tests passing (100%) across 4 test files (`itinerary.test.jsx`, `auth.test.jsx`, `trips.test.jsx`, `stops.test.jsx`).
- **Migrations Check**: `python manage.py makemigrations --check` passed (`No changes detected`).
- **Code Quality**: `python -m ruff check agent/ trips/ config/` and `python -m ruff format --check agent/ trips/ config/` passed with 0 issues.

---

## Prompt 12 - MCP (Model Context Protocol) Server Implementation & Gemini Integration (2026-09-07)

**User Request & Goal:**
Implement a production-quality MCP (Model Context Protocol) server in `mcp_server/` using Python and `FastMCP` (stdio transport) that wraps the existing `/api/v1/` Django REST API. The server exposes:
1. **Resource (`tripplanner://trips`)**: Read-only, returning the authenticated user's trips with nested stops for LLM context.
2. **Tool (`add_stop`)**: Allows LLMs (specifically Google Gemini in Antigravity IDE) to add stops to an existing trip with strict date constraint validation and location fallback logic.

**Codebase Audit & Architecture Realignment:**
1. **Stop Schema Mismatch (`location` required; no `city`/`country` fields on model)**:
   - Initial plan sent `city`, `country`, and optional `name`, omitting `location`. In `trips/models.py`, `location` is a required `CharField(255)` and neither `city` nor `country` exist on the `Stop` model.
   - *Resolution*: Made `location` the primary parameter. Maintained defensive LLM compatibility by accepting optional `city` and `country` fallbacks, automatically constructing `location` as `location.strip() or f"{city}, {country}".strip(", ") or name`.
2. **Strict Date Constraints**:
   - `trips/serializers.py` enforces that `arrival_date` and `departure_date` fall strictly within `[trip.start_date, trip.end_date]` and `departure_date >= arrival_date`.
   - *Resolution*: Documented strict date constraints prominently in the tool's docstring and provided actionable error hints in `ValidationError` responses so the LLM can self-correct dates.
3. **Trip & Stop Resource Serialization**:
   - Mapped actual model fields (`id, title, description, start_date, end_date, stop_count` for trips; `id, name, location, order, dates, stop_type, duration_minutes` for stops) and omitted null/empty fields to optimize context window token usage.
4. **Cross-Version MCP Compatibility (MCP 1.x vs 2.x)**:
   - Handled `mcp` 2.x rename (`FastMCP` $\to$ `MCPServer`) with dynamic compatibility fallback (`try: from mcp.server.fastmcp import FastMCP except: from mcp.server.mcpserver import MCPServer as FastMCP`), ensuring seamless operation across both major releases.

**Key Architectural Decisions & Implementation Details:**

| Component | Technology / Pattern | Implementation Details |
|---|---|---|
| **Server Framework** | `FastMCP` / `MCPServer` (stdio transport) | `mcp_server/server.py` defines `mcp = FastMCP("TripPlanner")`, exposing `tripplanner://trips` resource and `add_stop` tool. |
| **Authentication Flow** | CLI Helper (`mcp_server/auth.py`) | Interactive or CLI login (`--username`, `--password`, `--save-env`) calling `POST /api/v1/auth/token/` to obtain a long-lived refresh token saved to `.env`. |
| **Resilient API Client** | `httpx.AsyncClient` (`mcp_server/api_client.py`) | Automatic JWT access token renewal via `POST /api/v1/auth/token/refresh/`; interceptor pattern catches `401 Unauthorized`, refreshes token, and retries once. |
| **Concurrent Querying** | `asyncio.gather` | `get_all_trips_with_stops()` fetches all user trips and simultaneously queries nested stops for each trip in parallel. |
| **Resource Serialization** | `mcp_server/formatting.py` | Serializes trips and nested stops into compact, token-efficient JSON, omitting null fields. |
| **Defensive Tool Interface** | `add_stop` Tool | Accepts `trip_id`, `name`, `location`, optional `arrival_date`, `departure_date`, `description`, `city`, `country`, `stop_type`, and `duration_minutes`. Resolves location fallbacks and returns clear structured JSON statuses. |
| **Gemini Integration Client** | `mcp_server/gemini_test_client.py` | Provides dual-mode testing: in-memory stdio execution and optional direct Google GenAI SDK tool calling with Gemini models when `GEMINI_API_KEY` is provided. |
| **Antigravity / Gemini Config** | `mcp_config.json` | Configured in both global (`~/.gemini/config/mcp_config.json`) and workspace (`.agents/mcp_config.json`) roots pointing to `server.py` with stdio transport and environment variables. |

**Verification & Test Results:**
- **Automated Unit Tests**: 12/12 tests passing (`python -m pytest mcp_server/tests/ -v`) in 3.46s with 100% mocked offline requests:
  - `test_resource.py` (6 tests): Stop formatting, null-field omission, nested trip formatting, resource success, auth error handling, API error handling.
  - `test_tool.py` (6 tests): Stop creation success, location fallback resolution, 400 date boundary validation, 404 trip not found, auth failure, and 401 token refresh retry interceptor.
- **Live End-to-End Verification Against Running Django Server**:
  - `python mcp_server/auth.py --username farhan --password farhan123 --save-env`: Successfully authenticated and saved JWT refresh token to `mcp_server/.env`.
  - `python mcp_server/gemini_test_client.py`: Successfully refreshed JWT access token, queried all trips (`GET /api/v1/trips/?page_size=100`), fetched nested stops concurrently, and executed `add_stop` creating "Musée d'Orsay" (ID 58) on Trip 4 (`201 Created`).
- **Server Stdio Ready**: Confirmed `python mcp_server/server.py` boots cleanly on stdio for IDE / LLM invocation.

---

## Prompt 13 - Add Stop with AI via Natural Language in Frontend (2026-09-07)

**User Request & Goal:**
Enable users to add itinerary stops directly from the frontend React UI using natural language (e.g. *"Visit Badshahi Mosque in Lahore on August 26th for 2 hours"* or *"Dinner at Le Jules Verne near Eiffel Tower on July 3rd evening"*), powered by Gemini AI and the `add_stop` MCP tool logic. The system interprets the user's request, resolves location details, clamps dates within the trip's start/end window, and immediately renders the new stop on the interactive timeline.

**Key Architectural Decisions & Implementation Details:**

| Component | Technology / Pattern | Implementation Details |
|---|---|---|
| **Backend Service** | `trips/ai_stop_service.py` | `process_ai_add_stop(trip, prompt)` invokes Gemini 2.5 Flash (`google.genai` SDK) configured with the `add_stop` function declaration. Includes heuristic fallback parser for offline/dev environments and strict date clamping to `[trip.start_date, trip.end_date]`. |
| **Request Serializer** | `trips/serializers.py` | `AIAddStopRequestSerializer` validating `prompt` input (min 3 chars, max 500 chars). |
| **API Endpoint** | `trips/views.py` & `trips/urls.py` | `POST /api/v1/trips/<int:trip_pk>/ai-add-stop/` (`AIAddStopView`) protected by `[IsAuthenticated, IsOwner]`. Validates trip ownership, invokes service, and returns `201 Created` with serialized stop data. |
| **Frontend API & Mutation Hook** | `api/stops.js` & `hooks/useStops.js` | Added `aiAddStop(tripId, prompt)` and `useAIAddStop(tripId)` TanStack Query mutation hook that automatically invalidates `["stops", tripId]` and `["trips", tripId]` caches on success. |
| **Interactive AI Modal** | `AIAddStopModal.jsx` | Styled in the warm terracotta & sand palette. Features prompt textarea, quick suggestion pills (*"Museum tour"*, *"Dinner reservation"*, *"Scenic viewpoint"*), trip date boundary guides, animated loading state, and defensive error alerts. |
| **Trip Detail Integration** | `TripDetailPage.jsx` | Added a dedicated **"Add with AI"** button (with `Sparkles` icon and terracotta accent) alongside the standard manual stop button, opening `AIAddStopModal` and displaying a celebratory toast upon stop creation. |
| **SimpleJWT Token Rotation Persistence** | `mcp_server/api_client.py` | Handled `ROTATE_REFRESH_TOKENS = True` and `BLACKLIST_AFTER_ROTATION = True` by persisting newly rotated refresh tokens into `.env` and `mcp_config.json`, plus caching short-lived access tokens to avoid blacklisted token rejections. |

**Verification & Test Results:**
- **Backend Automated Tests**: 5/5 pytest tests passing in `trips/tests/test_ai_add_stop.py` (401 unauth, 404 wrong user, prompt validation, mocked Gemini tool invocation, date clamping). Full `trips/` suite: 70/70 passing.
- **Frontend Vitest Tests**: 3/3 tests passing in `frontend/src/tests/aiAddStop.test.jsx` (modal trigger, quick suggestions, mocked API call, toast rendering). Full frontend suite: 18/18 passing.
- **Frontend Production Build**: `npm run build` succeeded with 0 errors.
- **Live End-to-End Verification**: Successfully issued `POST /api/v1/trips/4/ai-add-stop/` with prompt *"Visit Badshahi Mosque in Lahore on August 26th for 2 hours"*, returning `201 Created` with stop ID 62 and rendering seamlessly in the browser.

---

## Prompt 14 - AI Stop Function Calling Fix & Destination Grounding (2026-09-08)

**User Feedback & Problem Statement:**
When adding stops via natural language in the frontend, the stop name and location were simply mirroring the raw prompt (e.g., prompt *"the most famous art museum for 3 hours"* produced a stop with name *"the most famous art museum for 3 hours"*, and *"i wanna go to eifel tower"* produced name *"i wanna go to eifel tower"* with description *"Added via AI assistant: ..."*).

**Root Cause Analysis:**
1. **Google GenAI Automatic Function Calling (AFC)**: In the `google-genai` SDK, passing Python functions to `tools=[add_stop]` enables AFC by default in `Models.generate_content`. The SDK automatically executed the local dummy `add_stop` function, received `"OK"`, and made a second round-trip request to Gemini to generate text. Because AFC consumed the function call, `response.function_calls` was returned as `None`.
2. **Missing Function Calling Constraint**: Without `FunctionCallingConfigMode.ANY`, Gemini occasionally replied with conversational clarifying questions rather than calling the tool.
3. **Silent Heuristic Fallback**: Because `response.function_calls` was `None`, the backend silently fell through to `_fallback_parse_prompt`, which copied the raw conversational prompt text directly into the `name` and `location` fields.

**Key Architectural Decisions & Implementation Details:**

| Component | Decision / Mechanism | Implementation Details |
|---|---|---|
| **Disable AFC** | `AutomaticFunctionCallingConfig(disable=True)` | In `trips/ai_stop_service.py`, explicitly disabled AFC so `google-genai` returns the raw `response.function_calls` directly without eating arguments or making redundant secondary HTTP requests. |
| **Forced Tool Calling** | `mode=FunctionCallingConfigMode.ANY` | Enforced `allowed_function_names=["add_stop"]` in `types.FunctionCallingConfig` so Gemini is guaranteed to call `add_stop` and cannot return conversational text. |
| **Destination Grounding** | Contextual `system_instruction` | Injected trip metadata (existing stop locations, trip title, dates, and description). Added explicit rules instructing Gemini to resolve descriptive categories (e.g. *"most famous art museum"* $\to$ *"Louvre Museum"*), fix typos (*"eifel"* $\to$ *"Eiffel Tower"*), and provide real street addresses for `location`. |
| **Multi-Model Quota Fallback** | Candidate Model Cascade | Configured fallback order (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-flash-latest`) to protect against single-model rate limiting or quota exhaustion. |
| **Smart Heuristic Parser** | Upgraded `_fallback_parse_prompt` | Offline fallback parser now strips conversational prefixes (*"i wanna go to "*, *"visit "*, *"take me to "*), extracts duration expressions (*"for 3 hours"* $\to$ `180`), and title-cases the stop name. |

**Verification & Test Results:**
- **Automated Backend Tests**: 6/6 tests passing (`python -m pytest trips/tests/test_ai_add_stop.py -v`) including date boundary clamping and conversational prefix stripping.
- **Code Quality**: `python -m ruff check trips/ai_stop_service.py` and `python -m ruff format --check trips/ai_stop_service.py` passing with 0 errors.
- **Live API Verification**:
  - Prompt: `"the most famous art museum for 3 hours"` $\to$ Created stop **Louvre Museum** at `"Rue de Rivoli, 75001 Paris, France"` with duration `120` and description *"Home to countless works of art including the Mona Lisa and the Venus de Milo..."*.
  - Prompt: `"i wanna go to eifel tower"` $\to$ Created stop **Eiffel Tower** at `"Champ de Mars, 5 Av. Anatole France, 75007 Paris, France"` with duration `120` and description *"Iconic 19th-century iron lattice tower offering panoramic views of Paris..."*.

---

## Prompt 15 - Frontend AI Travel Copilot Drawer with Live MCP Integration (2026-09-08)

**User Request & Goal:**
Integrate an interactive, conversational AI Travel Copilot into the frontend React application that connects directly to the Trip Planner Model Context Protocol (MCP) server over SSE (Server-Sent Events). The Copilot acts as a context-aware travel assistant capable of recommending stops, answering itinerary questions, and directly adding stops to the active trip via live MCP tool execution.

**Key Architectural Decisions & Implementation Details:**

| Component | Technology / Pattern | Implementation Details |
|---|---|---|
| **MCP Client Service** | `@modelcontextprotocol/sdk/client` + `SSEClientTransport` | `frontend/src/services/mcpClient.js` creates a singleton client managing connection lifecycle, listing tools (`listTools()`), and executing tools (`callTool()`). |
| **Copilot State & Logic Hook** | `useCopilot.js` | Manages conversation state (`messages`), MCP connection status (`disconnected`, `connecting`, `connected`, `error`), Gemini tool calling loop with multi-model fallback, and TanStack Query cache invalidation (`trips`, `stops`) upon tool execution. |
| **Slide-Over Drawer UI** | `AICopilotDrawer.jsx` | Fixed slide-out drawer on desktop/mobile matching the warm sand/terracotta palette. Features connection badge, starter prompt pills, collapsible Gemini API key settings drawer, auto-scrolling chat history, and MCP tool execution cards. |
| **Interactive Tool Feedback** | Visual Action Badges | When `add_stop` executes successfully via MCP, renders an emerald badge card displaying stop name, location pin, formatted arrival date, and duration in minutes. |
| **Vite Proxy Configuration** | `frontend/vite.config.js` | Added `/mcp` and `/messages` proxy routes pointing to the MCP SSE server to avoid browser CORS issues. |
| **Automated Testing** | `copilot.test.jsx` | 3 Vitest tests verifying drawer open/close, starter prompts, message sending, mocked MCP tool execution card rendering, and API key settings toggling. |

**Verification & Test Results:**
- **Automated Frontend Tests**: 3/3 tests passing in `copilot.test.jsx`. Total frontend test suite: 21/21 passing.
- **UI Integration**: Verified in browser that the "AI Copilot (MCP)" button appears on the Trip Detail page and opens the slide-out drawer.

---

## Prompt 16 - Multi-User Token Auth Scoping in MCP Server & SSE Port Migration (2026-09-09)

**User Feedback & Problem Statement:**
1. When calling `add_stop` through the frontend AI Copilot drawer for Trip 11 (*"Cultural Exploration of Kyoto and Osaka"*), the server rejected the operation with: *"Trip with ID 11 was not found or is not owned by your account."*
2. Users reported having to sign in repeatedly to the MCP server or encountering authentication prompts even when already logged in on the frontend.
3. The MCP server displayed an offline state with SSE error: `SSE error: Non-200 status code (500)`.

**Root Cause Analysis:**
1. **Static User Token Mismatch**: The MCP server was running as an independent daemon that read a static JWT refresh token from `mcp_server/.env`, which belonged to user `farhan` (User ID 1). When the user was logged into the React frontend as user `test2` (User ID 4) and created Trip 11, the MCP server tried to add the stop using Farhan's token. Because Django's `StopViewSet` enforces strict owner scoping (`get_object_or_404(Trip, pk=trip_pk, owner=request.user)`), Django returned `404 Not Found`.
2. **Port 8080 Conflict**: The MCP server defaulted to port `8080`. On the host Windows system, the Oracle Database TNS Listener (`TNSLSNR.EXE`) was already listening on port `8080`, causing incoming SSE connections to fail with HTTP 500.

**Key Architectural Decisions & Implementation Details:**

| Component | Decision / Mechanism | Implementation Details |
|---|---|---|
| **Dynamic Auth Token Injection** | Tool Argument `auth_token` | Updated `add_stop` tool signature in `mcp_server/server.py` to accept an optional `auth_token: str | None = None`. Updated `api_client.py` to use caller-provided tokens for authenticated DRF requests. |
| **Frontend Client Auth Forwarding** | `useCopilot.js` | Updated the tool call handler in `useCopilot.js` to automatically extract the logged-in user's active access token (`getAccessToken()` or `localStorage.getItem('trip_planner_refresh_token')`) and inject it into the `auth_token` argument of any MCP tool call. |
| **SSE Port Migration** | Moved from 8080 to 8001 | Shifted MCP server SSE port to `8001` in `mcp_server/server.py` to eliminate conflicts with host system database daemons. |
| **Vite Proxy Alignment** | Updated `vite.config.js` | Pointed `/mcp` and `/messages` proxies to `http://127.0.0.1:8001`, enabling seamless SSE and message streaming between Vite dev server and the MCP server. |
| **Seamless Multi-User Support** | Zero Re-login Needed | MCP server now operates agnostically across multiple concurrent users without requiring restarts or manual `.env` edits. |

**Verification & Test Results:**
- **Live MCP Tool Execution**: Successfully invoked `add_stop` for Trip 11 under user `test2`, creating the stop in Kyoto and returning `201 Created` with live itinerary timeline updates.
- **Port Conflict Resolved**: MCP daemon running smoothly on port `8001` with zero 500 SSE connection drops.

---

## Prompt 17 - Rich Markdown Formatting for AI Copilot Chat Responses (2026-09-09)

**User Feedback & Problem Statement:**
In the AI Copilot chat drawer, any markdown bold text returned by Gemini or the travel assistant was rendered literally as raw text with asterisks (e.g. `**something**`), and lists/headings lacked rich visual styling: *"rn any response that contains bold letters is displayed as \*\*something\*\* , can we make it better"*.

**Root Cause Analysis:**
`AICopilotDrawer.jsx` rendered messages using `<div className="whitespace-pre-wrap">{msg.content}</div>`. Because content was inserted directly as raw text inside a pre-wrap container without a markdown parsing layer, all markdown syntax (`**bold**`, `*italic*`, `` `code` ``, `### header`, `- bullet`) was displayed literally with asterisks, backticks, and hash symbols.

**Key Architectural Decisions & Implementation Details:**

| Component | Technology / Pattern | Implementation Details |
|---|---|---|
| **Custom Markdown Component** | `FormattedMessage.jsx` | Built a lightweight, zero-dependency Markdown parser and renderer component (`frontend/src/components/ui/FormattedMessage.jsx`) specifically styled for TripPlanner's warm terracotta & sand palette. |
| **Inline Formatting Engine** | Tokenized Regex Parser | Parses bold (`**text**`), italics (`*text*`, `_text_`), bold-italics (`***text***`), inline code (`` `code` ``), and safe external links (`[label](url)` with `target="_blank"`). |
| **Block Structure Engine** | Structural Block Parser | Groups text into structured blocks: bulleted lists (`*`, `-`, `•`) $\to$ `<ul>`, numbered lists (`1.`) $\to$ `<ol>`, tiered headings (`#` to `####`) $\to$ `<h4>`/`<h5>`, blockquotes (`>`), fenced code blocks (```` ``` ````), tables (`\| cell \|`), and paragraphs. |
| **Role-Aware Design System** | Dynamic Tailwind Classes | Differentiates styling between message types: user messages render high-contrast bold white text and translucent code chips; assistant messages render terracotta bullet markers, sand-950 bold contrast, and warm borders; error messages render red-accented contrast. |
| **Drawer Integration** | `AICopilotDrawer.jsx` | Replaced `<div className="whitespace-pre-wrap">{msg.content}</div>` with `<FormattedMessage content={msg.content} isUser={msg.role === 'user'} isError={Boolean(msg.isError)} />`. |
| **Automated Testing** | `formattedMessage.test.jsx` | 9 new Vitest unit tests verifying bold/italic parsing without asterisks, code tags without backticks, nested bold in list items, ordered lists, headings, links, tables, and role-based color classes. |

**Verification & Test Results:**
- **Automated Frontend Tests**: 9/9 tests passing in `formattedMessage.test.jsx`. Full frontend suite: **30/30 tests passing (100%)** across all 7 test files (`formattedMessage`, `copilot`, `aiAddStop`, `stops`, `trips`, `itinerary`, `auth`).
- **Visual Verification**: Bold terms (e.g. `**Senso-ji Temple**`) render cleanly as bold text without asterisks; bullet lists render with terracotta accents; and links/code blocks display with proper theme styling.



