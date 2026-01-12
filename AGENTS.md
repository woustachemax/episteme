```markdown
# AGENTS.md

## Agent Metadata

- **name:** Episteme Search & Verification Agent
- **description:** An AI-assisted Next.js application that lets users search, analyze, and “fact-check” content. It provides a web UI (React) with authentication (NextAuth: Google + credentials), a search API route, lightweight content analysis / bias detection logic, and optional Python-backed analysis services bridged from the Node/Next runtime.
- **version:** 0.1.0 (inferred; no explicit version file provided)
- **author:** Episteme project contributors (primary repo owner: `woustachemax`, inferred from path)

---

## Capabilities

### Key Features
- **User authentication**
  - Google OAuth sign-in via NextAuth (`app/api/auth/[...nextauth]/options.ts`)
  - Credentials-based auth (bcrypt password verification) (`app/api/auth/[...nextauth]/options.ts`)
  - Signup endpoint for creating users (`app/api/auth/signup/route.ts`)
  - Session/JWT enrichment (adds `id`, `email`, `name`) (`app/api/auth/[...nextauth]/options.ts`)
- **Search + results UI**
  - Search box component with async submit + loading state (`app/components/SearchBoc.tsx`)
  - Search results rendering with score-based styling (`app/components/SearchResults.tsx`)
  - Main app orchestration (auth modal, search flow) (`app/components/EpistemeApp.tsx`)
- **Content analysis / fact-checking**
  - Server-side “fact check” heuristic (bias word detection) in the search API (`app/api/search/route.ts`)
  - Python HTTP handlers for analysis and fact-checking (`app/api/python/analyze.py`, `app/api/python/fact-check.py`)
  - Python service classes for analysis/fact checking (`python/services/content_analyzer.py`, `python/services/fact_checker.py`)
- **Rate limiting and utilities**
  - Rate limiting helper (`lib/rate-limit.ts`)
  - Shared utilities (`lib/utils.ts`)
- **Entity resolution + prompting**
  - Entity resolver module (`lib/entity-resolver.ts`)
  - Prompt templates / prompt helpers (`lib/prompts.ts`)
- **Python integration**
  - Bridge utilities to call Python from the app runtime (`lib/python-bridge.ts`)

### Available Operations (What the agent can do)
- Create users (signup) and authenticate users (credentials or Google)
- Accept a search query and return structured results (via `/api/search`)
- Perform lightweight bias/fact-check scoring based on keyword heuristics
- Optionally run deeper analysis via Python services (where configured)
- Render an interactive UI for search + results + auth

### API Endpoints (Next.js App Router)
- **`/api/auth/[...nextauth]`** (GET/POST)
  - NextAuth handler (`app/api/auth/[...nextauth]/route.ts`)
- **`/api/auth/signup`** (POST)
  - User registration (`app/api/auth/signup/route.ts`)
- **`/api/search`** (likely GET/POST depending on implementation)
  - Search + analysis endpoint (`app/api/search/route.ts`)
- **Python HTTP handlers (standalone/serverless-style)**
  - `app/api/python/analyze.py` (POST)
  - `app/api/python/fact-check.py` (POST/OPTIONS)

### Data Processing Capabilities
- Parse and validate auth payloads (email/password) and hash/compare passwords (bcrypt)
- Analyze text content for bias indicators (keyword list) (`app/api/search/route.ts`, `app/api/python/fact-check.py`)
- Compute and display confidence/quality scores (UI styling thresholds) (`app/components/SearchResults.tsx`)
- Bridge requests to Python analyzers (where enabled) (`lib/python-bridge.ts`)

---

## Technologies

### Languages
- **TypeScript** (Next.js app, API routes, libs)
- **JavaScript** (config files)
- **Python** (analysis/fact-check services)

### Frameworks & Libraries
- **Next.js (App Router)** (`app/` structure, route handlers)
- **React** (components in `app/components/`)
- **NextAuth** (auth providers + sessions) (`app/api/auth/[...nextauth]/`)
- **Prisma** (database client usage via `lib/db.ts`, inferred)
- **bcryptjs** (password hashing/verification) (`app/api/auth/[...nextauth]/options.ts`)
- **Tailwind CSS** (`tailwind.config.js`, UI styling)
- **Framer Motion** (animated header, inferred from `motion.header`) (`app/components/Header.tsx`)

### Database
- **Prisma-backed database** (exact provider not shown; configured via env + Prisma schema not included in provided file list)
  - Prisma client imported from `lib/db.ts`

### External Services / APIs
- **Google OAuth** (NextAuth Google provider; requires client id/secret)
- **OpenAI** (listed as dependency/tool; likely used in `lib/search-service.ts` / `lib/prompts.ts`, exact calls not shown in snippet)
- **Fetch API** (client-side calls to Next.js endpoints) (`app/components/EpistemeApp.tsx`)

---

## Configuration

### Environment Variables (expected)
> Some are explicitly referenced; others are typical for the stack and likely required.

#### Authentication (NextAuth)
- `GOOGLE_CLIENT_ID` (required for Google provider) (`app/api/auth/[...nextauth]/options.ts`)
- `GOOGLE_CLIENT_SECRET` (required for Google provider) (`app/api/auth/[...nextauth]/options.ts`)
- `NEXTAUTH_SECRET` (typical requirement for NextAuth; not shown but recommended)
- `NEXTAUTH_URL` (typical requirement in production)

#### Database (Prisma)
- `DATABASE_URL` (typical Prisma requirement; `lib/db.ts` suggests Prisma client usage)

#### OpenAI (if enabled)
- `OPENAI_API_KEY` (inferred from “OpenAI” dependency and `lib/prompts.ts` / `lib/search-service.ts` presence)

#### Python bridge (if enabled)
- A base URL / host/port for Python services (inferred from `lib/python-bridge.ts`; exact env var name not shown)

### Setup Requirements
- Node.js + package manager (npm/pnpm/yarn)
- Python 3.x if running Python services locally
- Database provisioned and Prisma migrations applied (if Prisma schema exists outside provided list)

---

## Usage Examples

### Run the web app (typical Next.js)
```bash
# install
npm install

# dev
npm run dev
```

### Sign up (client → API)
`app/components/EpistemeApp.tsx` posts to `/api/auth/signup`:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"strongpassword","name":"User"}'
```

### Sign in (NextAuth credentials)
Credentials sign-in is handled by NextAuth at `/api/auth/[...nextauth]`.
From the UI, `AuthModal.tsx` uses `signIn(...)`. A raw example:
```bash
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=user@example.com" \
  --data-urlencode "password=strongpassword"
```

### Google sign-in (UI-driven)
`app/components/AuthModal.tsx`:
- Calls `signIn('google', { callbackUrl: '/' })`
- Requires Google OAuth env vars configured.

### Search (client → API)
`SearchBoc.tsx` triggers `onSearch`, which typically calls `/api/search`:
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"What are the health effects of coffee?"}'
```

### Python fact-check service (standalone handler)
If deployed/run separately (depending on your infra), it accepts POST and supports CORS preflight:
```bash
curl -X POST http://localhost:8000/fact-check \
  -H "Content-Type: application/json" \
  -d '{"content":"This is the best and most incredible product ever."}'
```

---

## Context & Knowledge

### Domain Knowledge
- Web search + summarization/analysis workflow
- Basic “fact-checking” heuristics (bias word detection)
- Authentication flows (credentials + OAuth)
- UI patterns for search apps (query input, loading state, results list, score visualization)

### Project Structure Understanding
- **UI layer:** `app/components/*` (Header, SearchBox, Results, Welcome canvas effect, Auth modal)
- **App shell:** `app/layout.tsx`, `app/page.tsx`, `app/Providers.tsx`
- **API layer:** `app/api/*` (NextAuth routes, signup, search)
- **Core libs:** `lib/*` (db, search service, prompts, python bridge, rate limiting)
- **Python services:** `python/services/*` and `app/api/python/*` handlers

### Architectural Patterns
- **Next.js App Router** route handlers (`route.ts`) for server APIs
- **Async/await** for network + auth flows (`EpistemeApp.tsx`, API routes)
- **Separation of concerns**
  - UI components vs API routes vs library modules
- **OOP in Python services**
  - `ContentAnalyzer`, `FactChecker` classes (`python/services/*`)
- **Heuristic scoring**
  - Score thresholds drive UI color classes (`SearchResults.tsx`)

---

## Constraints & Limitations

### What this agent cannot do (by design / current code)
- Provide guaranteed factual verification: current “fact-check” logic includes heuristic bias-word detection and is not a true evidence-based verifier (`app/api/search/route.ts`, `app/api/python/fact-check.py`).
- Operate without required secrets:
  - Google OAuth requires `GOOGLE_CLIENT_ID/SECRET`
  - Any OpenAI features require an API key (if used)
- Ensure database correctness without Prisma schema/migrations (not included in provided context).

### Known Limitations
- Bias detection is keyword-based and may produce false positives/negatives.
- Python handlers appear to be simple HTTP server handlers; deployment/routing depends on your platform and may not be integrated automatically with Next.js.
- Rate limiting behavior depends on `lib/rate-limit.ts` implementation and backing store (not shown).

### Security Considerations
- Protect secrets (`NEXTAUTH_SECRET`, OAuth secrets, DB URL, OpenAI key).
- Ensure CORS settings are appropriate; Python fact-check handler allows `Access-Control-Allow-Origin: *` (`app/api/python/fact-check.py`), which may be too permissive for production.
- Validate and sanitize user input in auth and search endpoints.
- Use HTTPS and secure cookies in production (NextAuth best practices).

---

## Tools & Integrations

### External Tools
- **NextAuth** for authentication (`app/api/auth/[...nextauth]/`)
- **Prisma** for DB access (`lib/db.ts`)
- **OpenAI** (integration implied by repo context; likely in `lib/search-service.ts` / `lib/prompts.ts`)
- **Tailwind CSS** for styling
- **Framer Motion** for UI animations (`Header.tsx`)

### Integrations / Bridges
- **Python bridge** (`lib/python-bridge.ts`) to call Python analyzers/fact-checkers
- **Rate limiting** (`lib/rate-limit.ts`) to protect API endpoints

### Common CLI Commands (typical)
```bash
npm run dev        # start Next.js dev server
npm run build      # build for production
npm run start      # run production server
npm run lint       # lint (eslint.config.mjs)
```

---

## Agent Operating Guidelines (for AI assistants working in this repo)

- Prefer editing **API behavior** in `app/api/*` and **shared logic** in `lib/*`.
- Prefer editing **UI/UX** in `app/components/*`.
- Keep auth changes centralized in:
  - `app/api/auth/[...nextauth]/options.ts` (providers, callbacks)
  - `app/api/auth/[...nextauth]/route.ts` (handler export)
  - `app/api/auth/signup/route.ts` (registration)
- If modifying scoring/visualization, update both:
  - scoring logic (e.g., `app/api/search/route.ts`)
  - UI thresholds/colors (`app/components/SearchResults.tsx`)
- Treat Python services as optional/auxiliary unless `lib/python-bridge.ts` is wired into the main search flow.

```