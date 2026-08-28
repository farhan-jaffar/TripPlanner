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
- **OpenAPI 3.0 Documentation**: Interactive schema generation via `drf-spectacular` with JWT Bearer security schemes.

### Frontend (React + Vite + Tailwind CSS)
- **Modern Earthy Aesthetic**: Styled with a curated palette featuring Burnt Sienna & Terracotta (`#C85A32`, `#D97757`), Soft Paper Beige (`#FAF8F5`, `#F4EFEA`), and Warm Sand (`#E8DFD3`, `#362C25`).
- **Secure Token Management**: In-memory access token storage (XSS protection) paired with `localStorage` refresh token persistence for silent session rehydration.
- **Automatic 401 Retry Interceptor**: Axios interceptor automatically catches expired tokens, requests a rotated token, and replays failed requests seamlessly.
- **Protected Routing**: React Router v6 guarded by `ProtectedRoute` components with session boot spinners.
- **Optimistic Server State**: TanStack React Query v5 with automatic cache invalidation on mutations and stale-while-revalidate caching.
- **Form & Date Validations**: Client-side schema validation via React Hook Form + Zod matching backend DRF constraints with server error mapping.
- **Interactive Chronological Timeline**: Visual stop cards with duration badges, day tags, and edit/delete actions.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | Python 3.12, Django 5.2 LTS, Django REST Framework 3.18 |
| **Authentication** | `djangorestframework-simplejwt` (JWT with Rotation & Blacklisting) |
| **Routing & Filters** | `drf-nested-routers`, `django-filter`, `django-cors-headers` |
| **API Docs & Config** | `drf-spectacular` (OpenAPI 3.0), `django-environ` (12-Factor config) |
| **Backend Testing** | `pytest`, `pytest-django`, `pytest-cov`, `factory_boy` |
| **Frontend Framework** | React 18, Vite 5, JavaScript (JSX) |
| **UI & Styling** | Tailwind CSS, Lucide React Icons |
| **State & Networking** | TanStack React Query v5, Axios, React Router v6 |
| **Forms & Validation** | React Hook Form, Zod |
| **Frontend Testing** | Vitest, React Testing Library, Mock Service Worker (MSW) |
| **Code Quality** | Ruff (Backend linter & formatter) |

---

## 📁 Project Structure

```
TripPlanner/
├── config/                      # Django project configuration
│   ├── settings.py              # Single env-driven configuration
│   ├── urls.py                  # Root URL routing & API docs endpoints
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
│   └── tests/                   # 61 Pytest test cases
│       ├── test_auth.py         # Registration, login, refresh, logout tests
│       ├── test_permissions.py  # Cross-user isolation & permission tests
│       ├── test_trip_api.py     # Trip CRUD & filter integration tests
│       ├── test_stop_api.py     # Stop CRUD & boundary validation tests
│       ├── test_models.py       # Model & signal unit tests
│       └── test_serializers.py  # Serializer validation tests
├── frontend/                    # React 18 + Vite Single Page Application
│   ├── src/
│   │   ├── api/                 # Axios client, auth interceptor, and API endpoints
│   │   ├── components/          # Layout (Navbar, Footer), UI kit, ProtectedRoute
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
├── manage.py
├── requirements.txt             # Production backend dependencies
├── requirements-dev.txt         # Dev backend dependencies (pytest, ruff)
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

---

### 2. Frontend Setup

1. **Navigate to the `frontend/` directory**:
   ```bash
   cd frontend
   ```

2. **Install npm dependencies**:
   ```bash
   npm install
   ```

3. **Configure Frontend Environment**:
   Copy `.env.example` to `.env` (optional, defaults to `http://localhost:8000/api/v1`):
   ```bash
   cp .env.example .env
   ```

4. **Start Vite Development Server**:
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

## 🧪 Testing & Verification

Both backend and frontend contain comprehensive test suites that run independently.

### Run Backend Tests (Pytest)
From the project root:
```bash
# Run all 61 backend test cases
pytest

# Run tests with coverage report
pytest --cov=trips --cov-report=term-missing
```

### Run Backend Linting & Formatting (Ruff)
```bash
ruff check .
ruff format --check .
```

### Run Frontend Tests (Vitest)
From the `frontend/` directory:
```bash
cd frontend
npm test
```

### Build Frontend Production Bundle
```bash
cd frontend
npm run build
```

---

## 📖 Architecture & Decision Log
For a chronological history of architectural decisions, schema evolutions, and prompt milestones, refer to [`prompts.md`](./prompts.md).
