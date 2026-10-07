# Trip Planner — Full-Stack Travel Itinerary & Scheduling Application

A modern, production-grade full-stack travel planner application featuring a **Django & Django REST Framework (DRF)** backend and a responsive **React (Vite) + Tailwind CSS** Single Page Application (SPA).

---

## 🌟 Key Features

### Backend (Django REST Framework)
- **JWT Authentication & User Profiles**: Token rotation, blacklist logout, and automatic `Profile` provisioning via `post_save` signals.
- **User Scoped Ownership**: Multi-tenant data isolation where trips and stops are strictly scoped to the authenticated owner (`IsOwner` permission class). Unauthorized queries return clean 404s to prevent ID enumeration.
- **Nested REST Architecture**: Intuitive nested API endpoints under `/api/v1/trips/{trip_id}/stops/` powered by `drf-nested-routers`.
- **Strict Scheduling & Cross-Model Validation**: Enforces that Stop arrival/departure dates fall strictly within parent Trip date boundaries (`departure_date >= arrival_date` and `end_date >= start_date`).
- **Two-Layer Validation Defense**: Serializer-level `validate()` methods as primary API guards + database-level `CheckConstraint` rules for ORM data integrity.
- **N+1 Query Prevention**: Computes `stop_count` dynamically via database-level `annotate(stop_count=Count("stops"))`.
- **Filtering, Search & Ordering**: Built-in `django-filter` range filters, keyword search across titles and locations, and deterministic pagination (`StandardResultsSetPagination`).
- **OpenAPI 3.0 Documentation**: Interactive schema generation via `drf-spectacular` with JWT Bearer security schemes, Swagger UI (`/api/v1/docs/`), and Redoc (`/api/v1/redoc/`).

### Frontend (React + Vite + Tailwind CSS)
- **Modern Earthy Aesthetic**: Styled with a curated palette featuring Burnt Sienna & Terracotta (`#C85A32`, `#D97757`), Soft Paper Beige (`#FAF8F5`, `#F4EFEA`), and Warm Sand (`#E8DFD3`, `#362C25`).
- **Secure Token Management**: In-memory access token storage (XSS protection) paired with `localStorage` refresh token persistence for silent session rehydration.
- **Automatic 401 Retry Interceptor & Deduplication**: Axios interceptor automatically catches expired tokens, deduplicates concurrent refresh calls, and replays failed requests seamlessly.
- **Protected Routing**: React Router v6 guarded by `ProtectedRoute` components with session boot spinners.
- **Optimistic Server State**: TanStack React Query v5 with automatic cache invalidation on mutations and stale-while-revalidate caching.
- **Form & Date Validations**: Client-side schema validation via React Hook Form + Zod matching backend DRF constraints with server error mapping.
- **Interactive Chronological Timeline**: Visual stop cards with duration badges, day tags, and edit/delete modal actions.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | Python 3.12, Django 5.2 LTS, Django REST Framework 3.18 |
| **Authentication** | `djangorestframework-simplejwt` (JWT with Rotation & Blacklisting) |
| **Routing & Filters** | `drf-nested-routers`, `django-filter`, `django-cors-headers` |
| **API Docs & Contract** | `drf-spectacular` (OpenAPI 3.0), `schemathesis` (Schema contract tests) |
| **Backend Testing** | `pytest`, `pytest-django`, `pytest-cov`, `factory_boy`, `schemathesis` |
| **Frontend Framework** | React 18, Vite 5, JavaScript (JSX) |
| **UI & Styling** | Tailwind CSS, Lucide React Icons |
| **State & Networking** | TanStack React Query v5, Axios, React Router v6 |
| **Forms & Validation** | React Hook Form, Zod |
| **Frontend Testing** | Vitest, React Testing Library, Mock Service Worker (MSW) |
| **End-to-End Testing** | Playwright (Chromium, multi-server orchestration, isolated test users) |
| **CI / CD Pipeline** | GitHub Actions (Fast quality gate + Playwright PR gate) |
| **Code Quality** | Ruff (Backend linter & formatter) |

---

## 📁 Project Structure

```
TripPlanner/
├── .github/
│   └── workflows/ci.yml         # Two-tier GitHub Actions CI pipeline
├── config/                      # Django project configuration
│   ├── settings.py              # Single env-driven configuration
│   ├── settings_e2e.py          # Isolated E2E SQLite test configuration
│   ├── urls.py                  # Root URL routing & OpenAPI schema endpoints
│   ├── exceptions.py            # Custom DRF exception handler (JSON 500s)
│   ├── wsgi.py / asgi.py
├── trips/                       # Core Django application
│   ├── models.py                # Profile, Trip, Stop models with CheckConstraints
│   ├── views.py                 # TripViewSet and StopViewSet (ownership scoped)
│   ├── serializers.py           # ModelSerializers with strict date validation
│   ├── auth_views.py            # Register, Login, Refresh, Logout, Profile views
│   ├── auth_serializers.py     # Auth & Profile serializers
│   ├── permissions.py           # IsOwner object permission class
│   ├── signals.py               # Post-save user signal creating profiles
│   ├── urls.py                  # Nested router definitions & auth endpoints
│   ├── migrations/              # Schema & data migrations
│   └── tests/                   # 65 Pytest test cases (61 backend + 4 contract)
│       ├── test_auth.py         # Registration, login, refresh, logout tests
│       ├── test_permissions.py  # Cross-user isolation & permission tests
│       ├── test_trip_api.py     # Trip CRUD & filter integration tests
│       ├── test_stop_api.py     # Stop CRUD & boundary validation tests
│       ├── test_models.py       # Model & signal unit tests
│       ├── test_serializers.py  # Serializer validation tests
│       └── test_schema_contract.py # Schemathesis OpenAPI contract compliance tests
├── frontend/                    # React 18 + Vite Single Page Application
│   ├── src/
│   │   ├── api/                 # Axios client, auth interceptor, and API endpoints
│   │   ├── components/          # Layout (Navbar, Footer), UI kit, ProtectedRoute, Modal
│   │   ├── context/             # AuthContext (state, login, register, session boot)
│   │   ├── features/            # Modular feature components (Auth, Trips, Stops)
│   │   ├── hooks/               # React Query hooks (useTrips, useStops)
│   │   ├── pages/               # Route pages (Trips, Detail, Forms, Profile, Auth)
│   │   ├── schemas/             # Zod validation schemas
│   │   ├── tests/               # 12 Vitest + MSW test cases
│   │   ├── utils/               # Date formatters and DRF error parsers
│   │   ├── App.jsx / main.jsx
│   │   └── index.css            # Tailwind directives and custom tokens
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── e2e/                         # Playwright End-to-End testing suite
│   ├── fixtures/
│   │   └── test-user.js         # Dynamic randomized user generator for test isolation
│   ├── tests/
│   │   ├── auth-flow.spec.js    # Register -> profile update -> logout -> login
│   │   ├── trip-lifecycle.spec.js # Create -> edit -> view -> delete trip
│   │   └── stop-management.spec.js # Multi-stop timeline ordering, edit & delete
│   ├── global-setup.js          # SQLite DB reset & migration runner
│   └── playwright.config.js     # Multi-server boot orchestration
├── manage.py
├── requirements.txt             # Production backend dependencies
├── requirements-dev.txt         # Dev backend dependencies (pytest, schemathesis, ruff)
├── package.json                 # Workspace root scripts
├── pyproject.toml               # Ruff & Pytest configurations
├── prompts.md                   # Complete architectural decision log
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** & **npm**

---

### 1. Backend Setup

1. **Navigate to project root and create virtual environment**:
   ```bash
   cd TripPlanner
   python -m venv .venv
   
   # On Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt -r requirements-dev.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Default settings use SQLite and allow frontend connections on `http://localhost:5173`).*

4. **Run Migrations & Start Django Server**:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   The backend API will be live at `http://127.0.0.1:8000/`.  
   Interactive API docs are available at `http://127.0.0.1:8000/api/v1/docs/`.

---

### 2. Frontend Setup

1. **Navigate to the `frontend/` directory and install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Frontend Environment**:
   Copy `.env.example` to `.env` (optional, defaults to `http://localhost:8000/api/v1`):
   ```bash
   cp .env.example .env
   ```

3. **Start Vite Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

---

## 📡 REST API Overview

All API endpoints are prefixed with `/api/v1/`.

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/v1/auth/register/` | Register new account and receive tokens + profile | No |
| `POST` | `/api/v1/auth/token/` | Login with username/password to receive JWT pair | No |
| `POST` | `/api/v1/auth/token/refresh/` | Obtain a new access token using refresh token | No |
| `POST` | `/api/v1/auth/logout/` | Blacklist the refresh token (HTTP 205) | Yes |
| `GET` | `/api/v1/auth/profile/me/` | Retrieve authenticated user's profile | Yes |
| `PATCH` | `/api/v1/auth/profile/me/` | Update display name, bio, or avatar URL | Yes |

### Trips Endpoints (User Scoped)

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/v1/trips/` | List user's trips (searchable, filterable, paginated) | Yes |
| `POST` | `/api/v1/trips/` | Create a new trip (auto-assigns owner) | Yes |
| `GET` | `/api/v1/trips/{id}/` | Retrieve trip details + `stop_count` | Yes |
| `PUT` | `/api/v1/trips/{id}/` | Full update of a trip | Yes |
| `PATCH` | `/api/v1/trips/{id}/` | Partial update of a trip | Yes |
| `DELETE` | `/api/v1/trips/{id}/` | Delete a trip (cascades to stops) | Yes |

### Stops Endpoints (Nested under Trip)

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/v1/trips/{trip_id}/stops/` | List chronological stops for a trip | Yes |
| `POST` | `/api/v1/trips/{trip_id}/stops/` | Create stop (auto-assigns `order` if omitted) | Yes |
| `GET` | `/api/v1/trips/{trip_id}/stops/{id}/` | Retrieve a specific stop | Yes |
| `PUT` | `/api/v1/trips/{trip_id}/stops/{id}/` | Full update of a stop | Yes |
| `PATCH` | `/api/v1/trips/{trip_id}/stops/{id}/` | Partial update of a stop | Yes |
| `DELETE` | `/api/v1/trips/{trip_id}/stops/{id}/` | Delete a stop | Yes |

---

## 🧪 4-Layer Testing Strategy & Verification

The project implements a complete testing pyramid ensuring backend reliability, schema contract compliance, frontend UI correctness, and end-to-end user workflows.

```
       / \
      / E2E \       Layer 4: Playwright (Isolated user journeys)
     /-------\
    / Front-  \     Layer 3: Vitest + React Testing Library + MSW
   /   end     \
  /-------------\
 / Schema Contract\ Layer 2: Schemathesis (OpenAPI 3.0 compliance)
/-----------------\
|   Backend API   | Layer 1: pytest-django + APIClient + CheckConstraints
+-----------------+
```

### Layer 1 & 2: Backend API Integration & OpenAPI Contract Tests (Pytest + Schemathesis)
Runs all 65 backend integration, serializer, model `CheckConstraint`, and OpenAPI 3.0 contract drift tests:
```bash
# Run all backend & contract test cases
python -m pytest

# Run with test coverage report
pytest --cov=trips --cov-report=term-missing
```

### Layer 3: Frontend Component & Mock Tests (Vitest + MSW)
Runs 12 frontend component, hook, and form validation tests with Mock Service Worker:
```bash
# From the project root:
npm run test:frontend

# Or directly in frontend/:
cd frontend && npm test
```

### Layer 4: End-to-End User Journey Tests (Playwright)
Spins up both the Django backend (using isolated `db.e2e.sqlite3`) and Vite frontend, testing real browser interactions with randomized throwaway users:
```bash
# Run all 3 E2E test specs (headless Chromium)
npm run test:e2e

# Run E2E tests with Playwright interactive UI mode
npm run test:e2e:ui
```

### Code Formatting & Linting (Ruff)
```bash
ruff check .
ruff format --check .
```

### Frontend Production Build
```bash
cd frontend
npm run build
```

---

## 🔄 Continuous Integration (GitHub Actions)

A two-tier automated CI workflow is configured in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):
1. **Fast Quality Gate (on every push)**: Runs `ruff` linting, `pytest` (Layer 1 + Layer 2), and `vitest` (Layer 3).
2. **E2E Gate (on Pull Requests to `main`)**: Runs the full suite of Playwright browser tests across the integrated fullstack environment.

---

## 📖 Architecture & Decision Log
For a chronological history of architectural decisions, schema evolutions, and prompt milestones, refer to [`prompts.md`](./prompts.md).
