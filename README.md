<p align="center">
  <img src="https://img.shields.io/badge/Django-5.2_LTS-092E20?style=for-the-badge&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Gemini_AI-Agent-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/MCP-Protocol-6366f1?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

# ✈️ TripPlanner — AI-Powered Travel Itinerary Platform

A **production-grade, full-stack** travel planning application featuring an **AI itinerary generation agent** powered by Google Gemini, a **Model Context Protocol (MCP)** server for tool-calling integrations, and a beautiful **React SPA** with an interactive AI Copilot drawer.

> **Plan a trip in seconds** — type a destination, pick your dates, and let the AI agent build a grounded, weather-aware, day-by-day itinerary using real places from Geoapify, real weather from Open-Meteo, and real city data from GeoNames.

---

## 🎬 Demo

https://github.com/user-attachments/assets/trip-planner-demo

> *See the [Trip_Planner.mp4](./Trip_Planner.mp4) file for a full walkthrough of the application.*

---

## 🌟 Key Features

### 🤖 AI Itinerary Agent (Gemini + Grounded Tool Use)
- **Gemini-Powered Generation** — Multi-phase itinerary orchestration using `google-genai` with schema-constrained JSON output
- **Grounded-Only Architecture** — Every stop in a generated itinerary must reference a verified Geoapify `place_id`; hallucinated places are stripped and retried
- **3 Real-Time Data Sources** — Geoapify (places & routing), Open-Meteo (weather forecasts), GeoNames (city discovery)
- **Country-Level Multi-City Planning** — For country-wide trips, Gemini selects optimal cities from GeoNames candidates, allocates days proportionally, and builds inter-city transfer stops with drive-time estimates
- **Pace Control** — Users choose relaxed (2–3 stops/day), moderate (3–4), or fast (4–5) pacing
- **Budget & Rate Limiting** — Per-user daily credit limits, Gemini RPM throttling, Geoapify RPS guards, and global concurrency locks
- **Intelligent Caching** — Signature-based itinerary cache (1hr), places cache (24hr), weather cache (6hr), route cache (12hr), and city candidate cache (30 days)
- **One-Click Accept** — Atomically saves a generated itinerary as a Trip + Stops inside a Django `transaction.atomic()` block

### 🔌 MCP Server (Model Context Protocol)
- **`tripplanner://trips` Resource** — Exposes all user trips with nested stops as a read-only MCP resource
- **`add_stop` Tool** — Allows AI agents (Claude, Antigravity, etc.) to add stops to trips via tool-calling
- **Dual Transport** — Runs over stdio (for direct agent integration) or SSE on port 8001 (for browser/network clients)
- **JWT Auth Bridge** — Authenticates against the Django backend using refresh token rotation

### 💬 AI Travel Copilot (Frontend Drawer)
- **In-App Chat Interface** — Slide-out drawer with conversational AI powered by Gemini + MCP tool execution
- **Live MCP SSE Connection** — Real-time connection status indicator with auto-reconnect
- **Tool Action Cards** — When the copilot adds a stop via MCP, a rich card shows the stop name, location, dates, and duration
- **Starter Prompts** — Contextual suggestions like *"Add a 2-hour visit to the most famous museum on the second day"*
- **Browser-Stored API Key** — Users configure their own Gemini API key (stored in localStorage)

### 🖥️ Backend (Django REST Framework)
- **JWT Authentication & User Profiles** — Token rotation, blacklist logout, automatic `Profile` provisioning via `post_save` signals
- **User-Scoped Ownership** — Multi-tenant data isolation; trips and stops are strictly scoped to the authenticated owner (`IsOwner` permission). Unauthorized queries return clean 404s to prevent ID enumeration
- **Nested REST Architecture** — Intuitive nested API endpoints: `/api/v1/trips/{trip_id}/stops/` via `drf-nested-routers`
- **Two-Layer Validation Defense** — Serializer-level `validate()` methods + database-level `CheckConstraint` rules
- **N+1 Query Prevention** — `stop_count` computed via database-level `annotate(stop_count=Count("stops"))`
- **Filtering, Search & Ordering** — `django-filter` range filters, keyword search, and deterministic pagination
- **OpenAPI 3.0 Documentation** — Interactive Swagger UI (`/api/v1/docs/`) and ReDoc (`/api/v1/redoc/`) via `drf-spectacular`

### 🎨 Frontend (React + Vite + Tailwind CSS)
- **Modern Earthy Design System** — Curated palette: Burnt Sienna & Terracotta (`#C85A32`, `#D97757`), Soft Paper Beige (`#FAF8F5`), and Warm Sand (`#E8DFD3`)
- **Secure Token Management** — In-memory access tokens (XSS protection) + `localStorage` refresh tokens for silent session rehydration
- **Automatic 401 Retry & Deduplication** — Axios interceptor catches expired tokens, deduplicates concurrent refresh calls, and replays failed requests
- **Optimistic Server State** — TanStack React Query v5 with automatic cache invalidation and stale-while-revalidate
- **Schema-Driven Forms** — React Hook Form + Zod validation mirroring backend DRF constraints, with server error mapping
- **Interactive Chronological Timeline** — Visual stop cards with duration badges, day tags, and edit/delete modal actions
- **AI Generation Page** — Dedicated `/trips/generate` route with country selector, interest tags, pace picker, and real-time generation status

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                        │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │ Trip CRUD │  │ AI Generation │  │  AI Copilot Drawer   │  │
│  │  Pages    │  │    Page       │  │  (MCP SSE Client)    │  │
│  └────┬─────┘  └──────┬────────┘  └──────────┬───────────┘  │
│       │               │                      │              │
│       ▼               ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          Axios Client + JWT Interceptor              │    │
│  └───────────────────────┬─────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │  Django REST Framework  │
              │    /api/v1/...          │
              ├─────────────────────────┤
              │ Trips & Stops CRUD      │
              │ Auth (JWT + Profiles)   │
              │ AI Itinerary Agent ─────┼──► Gemini API
              │                         │──► Geoapify (Places, Routes)
              │                         │──► Open-Meteo (Weather)
              │                         │──► GeoNames (City Discovery)
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │     MCP Server          │
              │  (stdio / SSE:8001)     │
              │  Resource: trips        │
              │  Tool: add_stop         │
              └─────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.12, Django 5.2 LTS, Django REST Framework 3.18 |
| **AI Agent** | Google Gemini (`google-genai`), Geoapify, Open-Meteo, GeoNames |
| **MCP Server** | `mcp` SDK, FastMCP, SSE + stdio transports |
| **Authentication** | `djangorestframework-simplejwt` (JWT with Rotation & Blacklisting) |
| **API Infrastructure** | `drf-nested-routers`, `django-filter`, `django-cors-headers`, `drf-spectacular` |
| **Frontend** | React 18, Vite 5, JavaScript (JSX) |
| **UI & Styling** | Tailwind CSS 3.4, Lucide React Icons |
| **State & Networking** | TanStack React Query v5, Axios, React Router v6 |
| **Forms & Validation** | React Hook Form, Zod, `@hookform/resolvers` |
| **MCP Client** | `@modelcontextprotocol/sdk` (browser SSE client) |
| **Backend Testing** | pytest, pytest-django, pytest-cov, factory_boy, schemathesis, pytest-asyncio |
| **Frontend Testing** | Vitest, React Testing Library, Mock Service Worker (MSW) |
| **End-to-End Testing** | Playwright (Chromium, multi-server orchestration, isolated test users) |
| **CI/CD** | GitHub Actions (two-tier pipeline) |
| **Code Quality** | Ruff (linter & formatter) |

---

## 📁 Project Structure

```
TripPlanner/
├── .github/workflows/
│   └── ci.yml                    # Two-tier GitHub Actions CI pipeline
├── agent/                        # 🤖 AI Itinerary Generation Agent
│   ├── gemini_client.py          # Multi-phase Gemini orchestrator
│   ├── tools.py                  # Geoapify Places/Routes, Open-Meteo Weather
│   ├── grounding.py              # Place-ID verification & hallucination filtering
│   ├── city_discovery.py         # GeoNames city discovery for country-level trips
│   ├── budget.py                 # Rate limiting, quotas, concurrency locks
│   ├── cache.py                  # Multi-layer caching (places, weather, routes, cities)
│   ├── schemas.py                # Pydantic schemas (GeneratedItinerary)
│   ├── serializers.py            # DRF serializers for generate/accept endpoints
│   ├── views.py                  # ItineraryGenerateView & ItineraryAcceptView
│   └── tests/                    # Budget, grounding, density, e2e agent tests
├── config/                       # Django project configuration
│   ├── settings.py               # Single env-driven configuration
│   ├── settings_e2e.py           # Isolated E2E SQLite test configuration
│   ├── urls.py                   # Root URL routing & OpenAPI schema endpoints
│   └── exceptions.py             # Custom DRF exception handler (JSON 500s)
├── trips/                        # Core Django application
│   ├── models.py                 # Profile, Trip, Stop models with CheckConstraints
│   ├── views.py                  # TripViewSet & StopViewSet (ownership scoped)
│   ├── serializers.py            # ModelSerializers with strict date validation
│   ├── auth_views.py             # Register, Login, Refresh, Logout, Profile views
│   ├── auth_serializers.py       # Auth & Profile serializers
│   ├── permissions.py            # IsOwner object permission class
│   ├── signals.py                # Post-save user signal creating profiles
│   ├── ai/                       # Shared AI tool specs (stop_tool_spec.py)
│   ├── urls.py                   # Nested router definitions & auth endpoints
│   └── tests/                    # Backend API & contract test suite
├── mcp_server/                   # 🔌 Model Context Protocol Server
│   ├── server.py                 # FastMCP server (trips resource + add_stop tool)
│   ├── api_client.py             # Async HTTP client for Django REST API
│   ├── auth.py                   # JWT token management & refresh
│   ├── formatting.py             # JSON response formatters
│   └── tests/                    # MCP resource & tool tests
├── frontend/                     # 🎨 React 18 + Vite SPA
│   └── src/
│       ├── api/                  # Axios client, auth interceptor, API endpoints
│       ├── components/           # Layout, UI kit, ProtectedRoute, FormattedMessage
│       ├── context/              # AuthContext (state, login, register, session boot)
│       ├── features/
│       │   ├── auth/             # Login/Register form components
│       │   ├── trips/            # Trip cards, lists, forms
│       │   ├── stops/            # Stop timeline, cards, forms
│       │   ├── itinerary/        # AI generation UI components
│       │   └── copilot/          # AI Copilot Drawer (MCP SSE chat)
│       ├── hooks/                # React Query hooks + useCopilot
│       ├── pages/                # Route pages (Trips, Detail, Generate, Profile)
│       ├── schemas/              # Zod validation schemas
│       ├── services/             # MCP client service layer
│       └── tests/                # Vitest + MSW component tests
├── e2e/                          # 🎭 Playwright E2E test suite
│   ├── tests/                    # Auth, trip lifecycle, stop management specs
│   ├── fixtures/                 # Dynamic randomized test user generator
│   ├── global-setup.js           # SQLite DB reset & migration runner
│   └── playwright.config.js      # Multi-server boot orchestration
├── requirements.txt              # Production Python dependencies
├── requirements-dev.txt          # Dev dependencies (pytest, ruff, schemathesis)
├── package.json                  # Workspace root scripts
└── pyproject.toml                # Ruff & Pytest configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** & **npm**

### 1. Clone & Backend Setup

```bash
git clone https://github.com/farhan-jaffar/TripPlanner.git
cd TripPlanner

# Create and activate virtual environment
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

| Variable | Required | Description |
|---|:---:|---|
| `SECRET_KEY` | ✅ | Django secret key |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key ([Get one free](https://aistudio.google.com/apikey)) |
| `GEOAPIFY_API_KEY` | ✅ | Geoapify API key ([Get one free](https://www.geoapify.com/)) |
| `GEONAMES_USERNAME` | For country trips | GeoNames username ([Register free](https://www.geonames.org/login)) |
| `DEBUG` | — | `True` for development |
| `DATABASE_URL` | — | Defaults to SQLite |

### 3. Run Migrations & Start Backend

```bash
python manage.py migrate
python manage.py runserver
```

The API will be live at `http://127.0.0.1:8000/`
Interactive docs at `http://127.0.0.1:8000/api/v1/docs/`

### 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173/` in your browser.

> **Tip:** `npm run dev` in the frontend directory automatically starts both the Vite dev server and the MCP SSE server (port 8001) via `concurrently`.

---

## 📡 REST API Reference

All endpoints are prefixed with `/api/v1/`.

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/auth/register/` | Register & receive JWT tokens + profile | ❌ |
| `POST` | `/auth/token/` | Login with username/password | ❌ |
| `POST` | `/auth/token/refresh/` | Refresh access token | ❌ |
| `POST` | `/auth/logout/` | Blacklist refresh token (205) | ✅ |
| `GET/PATCH` | `/auth/profile/me/` | Get or update user profile | ✅ |

### Trips (User-Scoped)

| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `GET` | `/trips/` | List trips (search, filter, paginate) | ✅ |
| `POST` | `/trips/` | Create a trip | ✅ |
| `GET` | `/trips/{id}/` | Trip details + `stop_count` | ✅ |
| `PUT/PATCH` | `/trips/{id}/` | Update a trip | ✅ |
| `DELETE` | `/trips/{id}/` | Delete trip (cascades stops) | ✅ |

### Stops (Nested Under Trip)

| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `GET` | `/trips/{trip_id}/stops/` | List chronological stops | ✅ |
| `POST` | `/trips/{trip_id}/stops/` | Add stop (auto-assigns `order`) | ✅ |
| `GET` | `/trips/{trip_id}/stops/{id}/` | Stop details | ✅ |
| `PUT/PATCH` | `/trips/{trip_id}/stops/{id}/` | Update a stop | ✅ |
| `DELETE` | `/trips/{trip_id}/stops/{id}/` | Delete a stop | ✅ |

### AI Itinerary Agent

| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `POST` | `/itinerary/generate/` | Generate AI itinerary (city or country) | ✅ |
| `POST` | `/itinerary/accept/` | Save generated itinerary as Trip + Stops | ✅ |

---

## 🧪 Testing Strategy

The project implements a **5-layer testing pyramid**:

```
           /\
          / E2E \          Layer 5: Playwright browser journeys
         /------\
        / MCP    \         Layer 4: MCP resource & tool tests
       /----------\
      / Front-end  \       Layer 3: Vitest + RTL + MSW
     /--------------\
    / Schema Contract\     Layer 2: Schemathesis OpenAPI compliance
   /------------------\
  |   Backend + Agent  |   Layer 1: pytest (API, models, grounding, budget)
  +--------------------+
```

### Run All Tests

```bash
# Layer 1 + 2: Backend API, Agent, and Contract tests
python -m pytest

# With coverage
pytest --cov=trips --cov=agent --cov-report=term-missing

# Layer 3: Frontend component tests
npm run test:frontend    # from project root
cd frontend && npm test  # or directly

# Layer 4: MCP server tests
pytest mcp_server/tests/

# Layer 5: End-to-End (spins up both Django + Vite)
npm run test:e2e         # headless Chromium
npm run test:e2e:ui      # interactive Playwright UI
```

### Code Quality

```bash
ruff check .             # Lint
ruff format --check .    # Format check
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

A two-tier automated workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Gate | Trigger | What Runs |
|---|---|---|
| **Fast Quality Gate** | Every push | Ruff lint → pytest (backend + agent + contract) → Vitest (frontend) |
| **E2E Gate** | PRs to `main` | Full Playwright browser test suite across integrated fullstack |

---

## 🤖 AI Agent Deep Dive

### Generation Pipeline

```
User Request
    │
    ▼
┌─────────────────────────┐
│ Budget & Quota Check    │  Per-user credits, Gemini RPM, concurrency lock
├─────────────────────────┤
│ Cache Lookup            │  Signature-based (country+city+dates+interests+pace)
├─────────────────────────┤
│ Country-Level?          │─── Yes ──► GeoNames City Discovery
│                         │           ► Gemini City Selection
│                         │           ► Per-city data gathering
│                         │           ► Inter-city transfer stops
├─────────────────────────┤
│ Single-City Path        │──► Geoapify Places + Open-Meteo Weather
├─────────────────────────┤
│ Gemini Synthesis        │  Schema-constrained JSON (GeneratedItinerary)
├─────────────────────────┤
│ Grounding Validation    │  Verify every place_id exists in session data
│                         │  Strip hallucinated stops
│                         │  Bounded single retry if >30% ungrounded
├─────────────────────────┤
│ Density Check           │  ≥1 verified stop per day required
├─────────────────────────┤
│ Cache & Return          │  Store verified itinerary, return to user
└─────────────────────────┘
```

### External API Usage

| Service | Purpose | Free Tier |
|---|---|---|
| **Google Gemini** | Itinerary synthesis, city selection | 1,500 RPD (flash-lite) |
| **Geoapify** | Places search, geocoding, routing | 3,000 credits/day |
| **Open-Meteo** | Weather forecasts | Unlimited (CC BY 4.0) |
| **GeoNames** | City discovery by country | 20,000 credits/day |

---

## 📖 Additional Documentation

- **[`prompts.md`](./prompts.md)** — Complete architectural decision log and prompt history
- **[`implementation_plan.md`](./implementation_plan.md)** — Feature implementation plan
- **[`mcp_server/README.md`](./mcp_server/README.md)** — MCP server setup and configuration guide

---

## 📜 License

This project is for educational and portfolio purposes.

---

<p align="center">
  <sub>Built with ❤️ using Django, React, Google Gemini, and the Model Context Protocol</sub>
</p>
