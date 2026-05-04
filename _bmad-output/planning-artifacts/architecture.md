---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-04'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - loveofplace-proposal.md
  - loveofplace-tech-stack.md
  - loveofplace-research.md
workflowType: 'architecture'
project_name: 'localmatal'
user_name: 'Jeffmayeur'
date: '2026-05-03'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

50 FRs across 8 capability areas. Architecturally, they cluster into four delivery surfaces:

1. **Read surface** (FR1–FR7, FR39–FR45): Static-rendered place pages, gallery, chain navigation, OG metadata, sitemap. No auth, no JS required (NFR5). Served from Cloudflare Pages CDN.

2. **Write surface** (FR8–FR18, FR31–FR35): Submission form → image pipeline → concept-overlap check → moderation queue entry. Stateful Workers/Hono API. Turnstile + rate limits + honeypot are required middleware.

3. **ML surface** (FR15–FR16, FR19–FR20): Concept-overlap check (embeddings + cosine + LLM tiebreaker) and automated safety checks (face detection, NSFW classification) via Workers AI, synchronous on submission.

4. **Admin surface** (FR23–FR30, FR36–FR38, FR43): Password-gated moderation queue, approve/reject/edit/seed, audit log, rejection notification via Resend. Server-rendered, never publicly indexed.

**Non-Functional Requirements:**

NFRs that will drive architectural decisions:

- **NFR5** (no JS for read): Astro MPA static rendering is the primary architecture pattern. Islands only for interactive form, map, gallery modal.
- **NFR9/10/11** (privacy invariants): EXIF strip and location fuzz must be enforced at the Worker layer before D1 writes; IP hashing must be enforced before any audit/rate-limit record is written.
- **NFR15** (daily D1 backup to R2): Requires a Cron Trigger Worker with alert on failure.
- **NFR16** (images.localmatal.com R2 custom domain): Must be configured before first image is stored — URL scheme is permanent.
- **NFR17** (Workers AI graceful degradation): Upload pipeline must succeed even if AI checks time out; scores stored as NULL, queue entry flagged for manual review.
- **NFR24** (model version pinning): Workers AI model IDs stored in config/env vars, not hardcoded.
- **NFR26** (Turnstile validated before upload processing): Middleware order is a hard constraint — Turnstile check → rate limit check → file validation → AI pipeline.

**Scale & Complexity:**

- Primary domain: Web app (Cloudflare-native full-stack, static-first MPA)
- Complexity level: Medium
- Estimated architectural components: 8 (Pages CDN, Submission Worker, Moderation Worker, AI Pipeline Worker, Backup Cron Worker, D1 database, R2 image store, Resend email)

### Technical Constraints & Dependencies

- **Cloudflare-only runtime**: No Node.js APIs; Workers runtime only. Affects image processing library choices (no Sharp — must use browser-compatible Canvas API client-side or Wasm-based server-side alternative).
- **D1 is SQLite at edge**: No stored procedures, no triggers, no full-text search. Linked-list traversal and chain queries must be handled in application logic.
- **Workers AI model availability**: `@cf/baai/bge-small-en-v1.5` for embeddings; face detection and NSFW models pinned per NFR24. Must verify model IDs against Cloudflare catalog before schema finalization.
- **R2 key naming is permanent**: NFR27 establishes `[status]/[ulid]/[variant].[ext]` as the stable key convention. Status transitions (pending → approved) require key copies + deletes, not renames.
- **Resend for transactional email**: Non-blocking send (NFR25); Worker must not await Resend delivery.
- **ULID primary keys**: Time-ordered, URL-safe, no collision risk at this scale. All place IDs, submission IDs, and audit log entries use ULID.

### Cross-Cutting Concerns Identified

1. **Privacy enforcement layer**: EXIF strip + IP hash + location fuzz must be applied consistently across submission Worker, audit log writes, and any public API response. A shared utility enforced at the boundary, not per-handler.

2. **Concept-overlap ML pipeline**: Spans the submission form (FR15/16), the Workers AI integration (embeddings + LLM tiebreaker), and the moderation queue (FR28, override capability). Error path (AI unavailable) must be handled consistently.

3. **Chain topology integrity**: `prev_place_id` linked list, tombstone behavior (FR41), `current_place` singleton, and seed operation (FR29) must be treated as a single transactional concern. Any operation that modifies chain structure must update the audit log atomically.

4. **WCAG 2.1 AA compliance**: Affects Leaflet map (keyboard supplement), submission form (aria-live for concept-overlap nudge + character count), gallery modal (focus trap), and all error/feedback states. Not a layer — a constraint woven into every interactive component.

5. **Anti-abuse middleware stack**: Turnstile → rate-limit (hashed IP) → honeypot/time-on-form → file validation → AI pipeline. Order is non-negotiable (NFR26). Implemented as Hono middleware chain.

6. **Audit log append-only invariant**: All moderation actions write to audit log before returning. Must be enforced at the service layer, not at the route level.

## Starter Template Evaluation

### Primary Technology Domain

Cloudflare-native full-stack MPA. Static pages dominate (90%+ of routes are read-only place pages, gallery, chain navigation). Interactive surfaces (submission form, map picker, gallery modal, admin queue) use Astro islands. API endpoints (submission pipeline, moderation actions) are Astro server endpoints compiled to Cloudflare Pages Functions, with Hono as the internal router/middleware layer.

### Starter Options Considered

| Option | Assessment |
|---|---|
| Standalone Astro + separate Hono Worker | Two deployment units, CORS surface, added operational complexity for a solo build |
| Next.js + Cloudflare adapter | SPA overhead; no static-first default; not the right fit for a chain-walk product where NFR5 (no JS to read) is a hard requirement |
| Astro minimal template + Cloudflare adapter | Single deployment, static-first default, islands for interactivity, Hono middleware within Pages Functions — matches all PRD NFRs |

### Selected Starter: Astro minimal + @astrojs/cloudflare

**Rationale:**
- Single `wrangler` + `pages` deployment — no cross-Worker CORS or service binding complexity at MVP scale
- Static output by default; `output: 'hybrid'` lets individual routes opt into SSR (admin queue, API endpoints) while keeping all place pages static
- `@astrojs/cloudflare` v13+ uses Cloudflare's `workerd` runtime in dev — D1, R2, and KV bindings available locally with no mocking required
- Hono mounted as a sub-router inside `/src/pages/api/[...route].ts` provides the middleware chain (Turnstile → rate limit → validation → AI pipeline) without a separate process

**Initialization Commands:**

```bash
# 1. Create Astro project (minimal template, TypeScript strict, no framework)
npm create astro@latest localmatal -- --template minimal --typescript strict --no-install

# 2. Add Cloudflare adapter
cd localmatal
npx astro add cloudflare

# 3. Add Hono (Workers-compatible build)
npm install hono

# 4. Install Wrangler for local D1/R2 dev
npm install --save-dev wrangler
```

**Versions at project initialization:**
- Astro: 6.2.1
- @astrojs/cloudflare: 13.3.0
- Hono: latest 4.x — pin in package.json at init
- Wrangler: latest 3.x

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript strict mode throughout. Cloudflare Workers runtime (not Node.js) — no `fs`, no `child_process`, no Node built-ins. Web APIs only.

**Rendering Model:**
`output: 'hybrid'` in `astro.config.mjs` — pages are static by default; API routes and admin pages opt into SSR with `export const prerender = false`. All public place pages, gallery, and chain walk pages are fully static.

**Styling Solution:**
Plain CSS modules (no runtime overhead, no Tailwind purge complexity). WCAG color tokens as CSS custom properties.

**Build Tooling:**
Vite (bundled with Astro 6) + `wrangler pages dev` for local Cloudflare runtime emulation. Single `wrangler.toml` at repo root declares D1 bindings, R2 bindings, and environment variables.

**Testing Framework:**
Not included in minimal template — added in Epic 1 (Foundation). Vitest with `@cloudflare/vitest-pool-workers` for Workers-runtime-accurate unit tests.

**Code Organization:**
```
localmatal/
├── src/
│   ├── pages/
│   │   ├── index.astro            # Homepage — current place (static)
│   │   ├── place/[id].astro       # Perma-link place pages (static)
│   │   ├── gallery.astro          # Gallery view (static)
│   │   ├── submit.astro           # Submission form (island)
│   │   ├── admin/                 # Admin queue (SSR, password-gated)
│   │   └── api/
│   │       └── [...route].ts      # Hono router entry point (SSR)
│   ├── components/
│   ├── layouts/
│   └── lib/
│       ├── db.ts                  # D1 query helpers
│       ├── r2.ts                  # R2 image helpers
│       ├── ai.ts                  # Workers AI wrappers
│       ├── privacy.ts             # EXIF strip, IP hash, location fuzz
│       └── chain.ts               # Chain topology operations
├── wrangler.toml
└── astro.config.mjs
```

**Development & Preview Deployments:**
- `wrangler pages dev` runs the full `workerd` runtime locally with real D1/R2 bindings
- Workers AI calls the real Cloudflare API in dev (requires `wrangler login`); stubbed via `env.ENVIRONMENT === 'dev'` guard
- Cloudflare Turnstile test site keys used in dev and preview environments
- Every git branch auto-deploys to `<branch>.localmatal.pages.dev` (Cloudflare Pages preview deployments)
- Production deploys from `main` to `localmatal.com`
- Feature flags via environment variables in `wrangler.toml` per environment (`[env.preview]` / `[env.production]`); Cloudflare Workers KV available for runtime-togglable flags in Phase 3 if needed

**Note:** Project initialization using the commands above is the first story in Epic 1 (Foundation & Infrastructure).

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- D1 migration strategy — must be established before first schema write (Epic 1)
- KV current_place cache — must be wired before homepage is live (Epic 2)
- Cloudflare Access admin auth — must be configured before admin route exists (Epic 6)
- API versioning prefix — must be set before any endpoint is built (Epic 3)
- CSP headers — must be in `_headers` before first public deploy (Epic 1)

**Important Decisions (Shape Architecture):**
- Zod validation at all API boundaries
- Standard error envelope across all endpoints
- Single `<MapIsland>` component shared across read/write surfaces
- `browser-image-compression` for client-side image pipeline

**Deferred Decisions (Post-MVP):**
- Sentry error tracking — revisit in Phase 2 if error volume warrants it
- KV-based runtime feature flags — available in Phase 3 if needed

---

### Data Architecture

**1a — Schema Migrations: Wrangler D1 native migrations**
- Tool: `wrangler d1 migrations create <name>` generates sequential `.sql` files in `/migrations`
- Runs locally: `wrangler d1 migrations apply --local`
- Runs in production: `wrangler d1 migrations apply --remote`
- No ORM dependency; raw SQL kept readable and diffable
- Affects: Epic 1 (Foundation) — migration tooling established as first story

**1b — Current Place Cache: Cloudflare KV**
- KV namespace `CURRENT_PLACE_CACHE` bound in `wrangler.toml`
- Cache key: `current` → JSON of current place row (id, photo URLs, name, sentence, fuzzed coords, contributor name)
- Cache invalidated synchronously on every moderation approval (before returning the 200 to the admin action)
- TTL: 24h as safety net; primary invalidation is event-driven
- Homepage and place pages read from KV first; fall back to D1 on cache miss
- Affects: Epic 2 (Public Chain & Place Viewing), Epic 6 (Moderation Queue)

**1c — Runtime Validation: Zod + @hono/zod-validator**
- All API request bodies validated with Zod schemas at the Hono route level
- Shared schema definitions in `src/lib/schemas.ts` — reused for both server validation and client-side TypeScript types
- Validation errors return the standard error envelope (see 3a) with `field` populated
- Affects: All API endpoints (Epics 3, 5, 6)

---

### Authentication & Security

**2a — Admin Authentication: Cloudflare Access (Zero Trust)**
- Cloudflare Access policy gates all `/admin/*` and `/api/v1/admin/*` routes at the edge before the Worker is invoked
- No session handling code in the application; Cloudflare issues a signed JWT cookie after authentication
- Free tier covers this use case (single-user, email OTP or one-time PIN)
- Worker validates the `CF-Access-Authenticated-User-Email` header on sensitive admin mutations as a defense-in-depth check
- Admin password from the original PRD design is superseded by this approach
- Affects: Epic 6 (Moderation Queue & Admin)

**2b — Content Security Policy: Strict CSP from day one**
- Delivered via Cloudflare Pages `_headers` file (zero Worker overhead)
- Policy:
  ```
  /*
    Content-Security-Policy: default-src 'self'; img-src 'self' images.localmatal.com data:; connect-src 'self' challenges.cloudflare.com; frame-src challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; script-src 'self'
  ```
  Note: `unsafe-inline` for styles required by Leaflet; `script-src` stays strict.
- `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` added in same `_headers` block
- Affects: Epic 1 (Foundation) — `_headers` file established at project init

---

### API & Communication Patterns

**3a — Error Response Format: Standard error envelope**
All API error responses use:
```typescript
{
  "error": {
    "code": string,        // machine-readable snake_case constant
    "message": string,     // human-readable description
    "field"?: string       // optional: form field name for validation errors
  }
}
```
Error code constants defined in `src/lib/errors.ts` and shared across all route handlers.
HTTP status codes follow REST conventions (400 validation, 401 auth, 413 file too large, 422 concept overlap, 429 rate limit, 500 server error).

**3b — API Versioning: `/api/v1/` prefix from day one**
- All API routes prefixed: `/api/v1/submit`, `/api/v1/admin/queue`, etc.
- Enforces good practice from the start; eliminates breaking-change risk if a public API is added in Phase 3
- Hono router mounted at `/api/v1` in `src/pages/api/v1/[...route].ts`
- Public place pages remain unversioned URLs (`/place/[id]`) — versioning applies to the JSON API only

---

### Frontend Architecture

**4a — Client-Side Image Pre-scaling: browser-image-compression**
- Package: `browser-image-compression` (handles HEIC via `heic2any`, canvas resize, WebP output)
- Applied in the submission form island before upload: max 1MB output, max 2048px longest dimension, WebP output format
- EXIF is stripped client-side as a UX enhancement only; server-side strip (NFR9) is the enforced privacy guarantee
- Affects: Epic 3 (Submission Form & Image Pipeline)

**4b — Map Component: Single `<MapIsland>` with mode prop**
- One Leaflet wrapper component: `src/components/MapIsland.tsx`
- Props: `mode: 'display' | 'picker'`, `lat`, `lng`, `fuzzed?: boolean`, `onChange?: (lat, lng) => void`
- Display mode: read-only marker at fuzzed coordinates; no tile interaction
- Picker mode: interactive marker drag + text coordinate input fallback (keyboard accessible per NFR23)
- Leaflet loaded once; no duplicate bundle across place pages and submission form
- Affects: Epics 2, 3

**4c — State Management: Component-local state only**
- No global state manager (no Zustand, Nanostores, Redux)
- Submission form: local island state (photo file, coordinates, fields, step in flow)
- Gallery modal: local open/closed + selected place state
- Admin queue: server-rendered; actions trigger full page reloads or fetch + partial update
- URL params used for shareable state (gallery filter, current place in chain walk)

---

### Infrastructure & Deployment

**5a — Error Tracking: Cloudflare Workers built-in logging**
- `console.error()` and `console.log()` in Workers write to Cloudflare's real-time logs (dashboard + `wrangler tail`)
- Structured log format: `{ event, placeId?, error?, timestamp }` for key events
- Phase 2 decision point: add Sentry if error volume or production debugging needs it
- Affects: All Workers/API handlers

**5b — Backup Failure Alerting: Cloudflare Worker alert + Resend confirmation**
- Cron Trigger Worker runs daily D1 → R2 backup (NFR15)
- On failure: Cloudflare's built-in Worker Error Rate alert (configured in dashboard, zero code) fires to maintainer email
- On success: Resend sends a brief confirmation email (reuses existing Resend integration)
- R2 backups path: `backups/YYYY-MM-DD/db.sqlite` with 30-day lifecycle rule
- Affects: Epic 1 (Foundation)

---

### Decision Impact Analysis

**Implementation Sequence (dependency order):**
1. `_headers` CSP + Cloudflare Access setup (Epic 1, before first deploy)
2. Wrangler D1 migration tooling + initial schema (Epic 1)
3. KV namespace + error constants + Zod schemas (Epic 1, before any API)
4. API versioning prefix established at `/api/v1/` (Epic 1, before first endpoint)
5. `<MapIsland>` component (Epic 2, shared dependency for Epics 2 & 3)
6. `browser-image-compression` integration (Epic 3)
7. Cloudflare Access policy applied to `/admin/*` (Epic 6)
8. Backup Cron Trigger + Cloudflare alert + Resend confirmation (Epic 1)

**Cross-Component Dependencies:**
- KV `CURRENT_PLACE_CACHE` invalidation lives in the moderation approval handler (Epic 6) but is consumed by the homepage and chain walk (Epic 2) — Epic 2 must handle cache miss gracefully before Epic 6 is built
- Zod schemas in `src/lib/schemas.ts` are shared between Epic 3 (submission validation) and Epic 5 (safety check pipeline) — define the submission schema in Epic 3, extend it in Epic 5
- `<MapIsland>` display mode (Epic 2) must be built before picker mode (Epic 3) — same component, progressive enhancement
- Error envelope constants (Epic 1) must be defined before any API endpoint is written (Epics 3, 5, 6)

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming Conventions — D1/SQLite:**
`snake_case` for all table names, column names, index names, and foreign keys.

```sql
-- Correct
CREATE TABLE places (
  id TEXT PRIMARY KEY,
  prev_place_id TEXT,
  place_name TEXT,
  contributor_name TEXT,
  is_tombstoned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_places_prev ON places(prev_place_id);

-- Wrong — never use
CREATE TABLE Places (Id TEXT, prevPlaceId TEXT, placeName TEXT);
```

**API JSON Field Naming:**
`camelCase` in all JSON request bodies and response objects. Zod schemas handle the snake_case→camelCase transform at the D1 boundary — application code and API consumers never see snake_case field names.

```typescript
// JSON response (camelCase)
{ "id": "01JT...", "placeName": "The Heron Tree", "prevPlaceId": "01JS..." }

// D1 row (snake_case) — stays inside db.ts
{ id: "01JT...", place_name: "The Heron Tree", prev_place_id: "01JS..." }
```

**API Route Naming:**
Plural nouns for collections, singular or descriptive for singletons and actions.

```
GET  /api/v1/places/:id             # single place
GET  /api/v1/places                 # collection (gallery)
POST /api/v1/submissions            # create submission
GET  /api/v1/admin/queue            # singleton view
POST /api/v1/admin/places/:id/approve
POST /api/v1/admin/places/:id/reject
POST /api/v1/admin/places/:id/edit
POST /api/v1/admin/places/seed      # seed a new chain entry
```

**Code File & Component Naming:**

| Artifact | Convention | Example |
|---|---|---|
| Astro components | `PascalCase.astro` | `PlaceCard.astro`, `GalleryModal.astro` |
| React/TSX islands | `PascalCase.tsx` | `MapIsland.tsx`, `SubmissionForm.tsx` |
| Utility/lib modules | `camelCase.ts` | `src/lib/chain.ts`, `src/lib/privacy.ts` |
| Hono route modules | `camelCase.ts` | `src/routes/submissions.ts` |
| D1 migrations | `NNNN_description.sql` | `0001_initial_schema.sql` |
| Test files | `*.test.ts` co-located | `src/lib/chain.test.ts` |
| Zod schema file | `schemas.ts` | `src/lib/schemas.ts` |
| Error constants file | `errors.ts` | `src/lib/errors.ts` |

---

### Structure Patterns

**Test File Location:**
Co-located `*.test.ts` alongside the module under test. No separate `__tests__/` directory.

```
src/lib/chain.ts
src/lib/chain.test.ts       ✅ co-located
src/__tests__/chain.test.ts ❌ never
```

**Hono Route Organization:**
One file per route group in `src/routes/`. The catch-all entry point mounts all route groups — it contains no handler logic itself.

```
src/routes/
├── submissions.ts      # POST /api/v1/submissions
├── places.ts           # GET  /api/v1/places, GET /api/v1/places/:id
└── admin/
    ├── queue.ts        # GET  /api/v1/admin/queue
    └── places.ts       # POST /api/v1/admin/places/:id/approve|reject|edit
                        # POST /api/v1/admin/places/seed
```

`src/pages/api/v1/[...route].ts` — entry point only, imports and mounts route groups, no business logic.

---

### Format Patterns

**API Response Shape:**

```typescript
// Single resource — return directly
GET /api/v1/places/:id
→ { id, placeName, sentence, contributorName, lat, lng, photoUrls, createdAt }

// Collection — items wrapper with optional cursor for pagination
GET /api/v1/places
→ { items: [...], cursor?: "01JT..." }

// Mutation success — return created/affected ID only
POST /api/v1/submissions
→ { id: "01JT..." }

// Admin action success — no body needed
POST /api/v1/admin/places/:id/approve
→ 204 No Content
```

**Date/Time Format:**
ISO 8601 strings in all JSON: `"2026-05-04T14:32:00Z"`. Stored as `TEXT` in D1. Zod validates format on input with `z.string().datetime()`.

**Boolean in D1:**
D1/SQLite stores booleans as `INTEGER` (0/1). All D1 query helpers in `src/lib/db.ts` coerce to `boolean` before returning to application code. Application code never checks `=== 0` or `=== 1`.

```typescript
// Correct — coerced in db.ts before it reaches a handler
if (place.isTombstoned) { ... }

// Wrong — never in handlers or routes
if (place.is_tombstoned === 1) { ... }
```

**Null Handling:**
Optional fields that have no value are `null` in JSON responses, never `undefined` or omitted. Zod schemas use `.nullable()` not `.optional()` for fields that may be absent in a response.

---

### Process Patterns

**Error Handling — Centralized AppError:**
All route handlers throw `AppError`. A single Hono global error handler formats into the standard envelope. Handlers never build error response objects directly.

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number,
    public field?: string
  ) { super(message) }
}

// In a route handler — throw, never respond
if (!turnstileValid) throw new AppError('TURNSTILE_FAILED', 'Challenge failed', 400)

// Global Hono error handler — one place
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message, field: err.field ?? null } }, err.httpStatus)
  }
  console.error({ event: 'unhandled_error', error: err.message })
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', field: null } }, 500)
})
```

**Island Loading States — 4-state machine:**
All Astro islands with async operations use a `status` state variable with four values. Never use a boolean `isLoading` flag.

```typescript
// Correct
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

// Wrong — never
const [isLoading, setIsLoading] = useState(false)
const [hasError, setHasError] = useState(false)
```

**Async Style:**
`async/await` throughout. No `.then()` chains, no callbacks. All async paths have explicit `try/catch` or are inside a Hono route (which catches automatically via `onError`).

**Structured Logging:**
All `console.log` and `console.error` calls use a structured object with an `event` key.

```typescript
// Correct
console.log({ event: 'submission_received', submissionId, ipHash })
console.error({ event: 'ai_pipeline_failed', submissionId, error: err.message })

// Wrong
console.log('Submission received:', submissionId)
console.error('AI pipeline failed', err)
```

---

### Enforcement Guidelines

**All agents implementing LocalMatal MUST:**
- Use `snake_case` for all D1 table/column names
- Use `camelCase` for all JSON field names in API responses and request bodies
- Use the `/api/v1/` prefix on all JSON API routes
- Throw `AppError` rather than building error response objects in handlers
- Use the 4-state `'idle' | 'loading' | 'success' | 'error'` pattern in islands
- Co-locate `*.test.ts` files with the module under test
- Coerce D1 boolean integers to `boolean` in `src/lib/db.ts` before returning to handlers
- Use ISO 8601 strings for all date/time values in JSON
- Use structured logging objects with an `event` key

**Anti-Patterns — Never do these:**
```typescript
// ❌ camelCase DB column
SELECT placeName FROM places

// ❌ snake_case in JSON response
{ "place_name": "The Heron Tree" }

// ❌ unversioned API route
POST /api/submit

// ❌ building error response in handler
return c.json({ message: 'failed' }, 400)

// ❌ boolean loading flag
const [isLoading, setIsLoading] = useState(false)

// ❌ checking D1 boolean as integer
if (row.is_tombstoned === 1)

// ❌ unstructured log
console.log('Approved place', id)
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
localmatal/
├── .github/
│   └── workflows/
│       └── ci.yml                  # lint + typecheck + test + wrangler pages deploy
├── migrations/                     # Wrangler D1 migration SQL files
│   ├── 0001_initial_schema.sql     # places, submissions, current_place, audit_log, reports, rate_limits
│   └── 0002_*.sql                  # future migrations appended here
├── public/
│   ├── robots.txt                  # NFR14: disallows /admin/*, /api/*, internal routes
│   ├── sitemap.xml                 # FR45: generated at build time (or by cron)
│   └── icons/                      # favicon, apple-touch-icon
├── src/
│   ├── pages/                      # Astro pages — static unless prerender=false
│   │   ├── index.astro             # FR1: homepage — current place display
│   │   ├── place/
│   │   │   └── [id].astro          # FR2: perma-link place page (static, builds at deploy)
│   │   ├── gallery.astro           # FR4: thumbnail gallery (static)
│   │   ├── submit.astro            # FR8-FR18: submission form page (static shell, island)
│   │   ├── admin/
│   │   │   ├── index.astro         # FR23: moderation queue (SSR, Cloudflare Access gated)
│   │   │   ├── place/
│   │   │   │   └── [id].astro      # FR24: single submission review (SSR)
│   │   │   └── seed.astro          # FR29: chain seed form (SSR)
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── [...route].ts   # Hono router entry point (SSR, prerender=false)
│   │   ├── 404.astro               # Custom 404 page
│   │   └── _headers                # NFR7,NFR14: CSP, X-Frame-Options, nosniff headers
│   │
│   ├── components/                 # Reusable Astro + TSX island components
│   │   ├── PlaceCard.astro         # FR1,FR4: place display (photo, name, sentence, contributor)
│   │   ├── ChainNav.astro          # FR3: previous/next navigation links
│   │   ├── GalleryGrid.astro       # FR4: thumbnail grid layout
│   │   ├── GalleryModal.tsx        # FR5: gallery detail modal (island — focus trap, keyboard)
│   │   ├── MapIsland.tsx           # FR6,FR12: shared map component (display + picker modes)
│   │   ├── SubmissionForm.tsx      # FR8-FR18: multi-step submission form (island)
│   │   ├── ReportLink.astro        # FR7: report a place link/form
│   │   └── AdminQueueCard.astro    # FR24: single queue item display in admin
│   │
│   ├── layouts/
│   │   ├── Base.astro              # FR44: OG meta tags, canonical URL, site chrome
│   │   └── Admin.astro             # Admin pages layout (no public nav)
│   │
│   ├── routes/                     # Hono route handler modules
│   │   ├── submissions.ts          # FR8-FR18,FR31-FR35: POST /api/v1/submissions
│   │   ├── places.ts               # FR1-FR6: GET /api/v1/places, GET /api/v1/places/:id
│   │   ├── reports.ts              # FR7: POST /api/v1/reports
│   │   └── admin/
│   │       ├── queue.ts            # FR23-FR24: GET /api/v1/admin/queue
│   │       └── places.ts           # FR25-FR29: approve/reject/edit/seed actions
│   │
│   ├── lib/                        # Shared utilities — pure functions, no Astro deps
│   │   ├── db.ts                   # D1 query helpers (all SQL lives here; boolean coercion)
│   │   ├── r2.ts                   # R2 read/write helpers; key builder [status]/[ulid]/[variant].[ext]
│   │   ├── kv.ts                   # KV cache helpers (current_place read/write/invalidate)
│   │   ├── ai.ts                   # Workers AI wrappers: embeddings, face detection, NSFW; graceful degradation
│   │   ├── chain.ts                # Chain topology: get current, advance, tombstone, seed, gap traversal
│   │   ├── privacy.ts              # EXIF strip (server), IP hash (daily salt), location fuzz (≥100m)
│   │   ├── email.ts                # Resend wrappers: queue notification, rejection, backup confirmation
│   │   ├── schemas.ts              # All Zod schemas (shared server + client)
│   │   ├── errors.ts               # AppError class + error code constants
│   │   ├── ulid.ts                 # ULID generation helper (Web Crypto compatible)
│   │   ├── turnstile.ts            # Turnstile server-side validation
│   │   ├── rateLimit.ts            # Per-IP rate limit check/increment using D1 rate_limits table
│   │   └── conceptOverlap.ts       # FR15-FR16: embedding cosine similarity + LLM tiebreaker logic
│   │
│   ├── middleware/                 # Hono middleware (mounted in [...route].ts)
│   │   ├── turnstile.ts            # NFR26: validate Turnstile token before any upload
│   │   ├── rateLimit.ts            # FR32: per-IP + per-session rate limiting
│   │   └── adminAuth.ts            # Defense-in-depth: verify CF-Access header on admin mutations
│   │
│   └── types/
│       ├── env.d.ts                # Cloudflare env bindings type declarations (D1, R2, KV, AI)
│       └── place.ts                # Shared Place, Submission, AuditLog TypeScript interfaces
│
├── workers/
│   └── backup.ts                   # NFR15: Cron Trigger Worker — daily D1 → R2 backup
│
├── wrangler.toml                   # D1, R2, KV, AI bindings; cron schedule; env vars
├── astro.config.mjs                # output: 'hybrid', cloudflare adapter, Vite config
├── tsconfig.json                   # strict mode, path aliases
├── vitest.config.ts                # @cloudflare/vitest-pool-workers config
├── .dev.vars                       # Local secrets (gitignored): RESEND_API_KEY, etc.
├── .dev.vars.example               # Committed template of required secrets
├── .gitignore
└── package.json
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Path | Auth | Notes |
|---|---|---|---|
| Public read API | `GET /api/v1/places/*` | None | Rate-limited by CF edge |
| Submission write | `POST /api/v1/submissions` | Turnstile + rate limit | Full middleware chain |
| Report submission | `POST /api/v1/reports` | Turnstile | Lightweight |
| Admin queue read | `GET /api/v1/admin/*` | Cloudflare Access | SSR, never cached |
| Admin mutations | `POST /api/v1/admin/*` | Cloudflare Access + header check | Writes audit log |

**Component Boundaries:**

- `SubmissionForm.tsx` is a self-contained island — it manages its own multi-step state, calls the submission API, and renders the concept-overlap nudge. It receives only the current place's sentence as a prop from the server-rendered page.
- `MapIsland.tsx` is stateless in display mode (props only), stateful in picker mode (internal coordinate state + `onChange` callback). No global state crosses the boundary.
- `GalleryModal.tsx` owns its own open/close state. The parent `gallery.astro` page renders the grid statically; the modal island hydrates on interaction.

**Data Boundaries:**

- All SQL queries go through `src/lib/db.ts` — no raw D1 calls in route handlers or components.
- All R2 operations go through `src/lib/r2.ts` — key building, signed URL generation, and status-transition copies are centralized here.
- All KV operations go through `src/lib/kv.ts` — cache read, write, and invalidation in one place.
- Privacy enforcement (`privacy.ts`) is called at the Worker boundary — no raw coordinates or IPs reach D1 writes or JSON responses.

### Requirements to Structure Mapping

**FR Category to Primary Files:**

| FR Category | Primary Files |
|---|---|
| Chain & Place Viewing (FR1–FR7) | `pages/index.astro`, `pages/place/[id].astro`, `pages/gallery.astro`, `components/PlaceCard.astro`, `components/ChainNav.astro`, `components/GalleryGrid.astro`, `components/GalleryModal.tsx`, `components/MapIsland.tsx` (display), `lib/chain.ts`, `lib/kv.ts` |
| Submission & Upload (FR8–FR18) | `pages/submit.astro`, `components/SubmissionForm.tsx`, `components/MapIsland.tsx` (picker), `routes/submissions.ts`, `lib/schemas.ts`, `lib/conceptOverlap.ts`, `lib/privacy.ts` |
| Content Moderation auto-checks (FR19–FR22) | `lib/ai.ts` (face + NSFW), `lib/privacy.ts` (EXIF strip), `routes/submissions.ts` (pipeline) |
| Admin Queue (FR23–FR30) | `pages/admin/`, `components/AdminQueueCard.astro`, `routes/admin/queue.ts`, `routes/admin/places.ts`, `lib/chain.ts` (tombstone, seed, approval) |
| Anti-Abuse & Privacy (FR31–FR35) | `middleware/turnstile.ts`, `middleware/rateLimit.ts`, `lib/rateLimit.ts`, `lib/privacy.ts`, `lib/turnstile.ts` |
| Notifications (FR36–FR38) | `lib/email.ts` — called from `routes/submissions.ts` (queue notify) and `routes/admin/places.ts` (rejection notify) |
| Data Integrity & Persistence (FR39–FR45) | `migrations/`, `lib/chain.ts`, `lib/db.ts`, `workers/backup.ts`, `public/robots.txt`, `public/sitemap.xml` |
| Accessibility (FR46–FR50) | Woven into every component: `MapIsland.tsx` keyboard supplement, `SubmissionForm.tsx` aria-live regions, `GalleryModal.tsx` focus trap |

### Integration Points

**Data Flow — Submission Pipeline:**
```
SubmissionForm.tsx (island)
  → client-side: browser-image-compression → pre-scaled WebP blob
  → POST /api/v1/submissions (multipart)
      → middleware: turnstile.ts → rateLimit.ts
      → routes/submissions.ts:
          → privacy.ts: strip EXIF server-side, hash IP
          → r2.ts: store pending/[ulid]/original.webp
          → ai.ts: face detection + NSFW check (graceful degrade on timeout)
          → ai.ts: generate embeddings for concept-overlap
          → conceptOverlap.ts: cosine similarity → LLM tiebreaker if borderline
          → db.ts: INSERT submission row (scores, status=pending)
          → r2.ts: generate 3 variants (thumb 400px, modal 1200px, full 2048px)
          → email.ts: fire-and-forget queue notification to maintainer
      → return { id } or AppError (FR16 nudge copy on concept-overlap fail)
```

**Data Flow — Moderation Approval:**
```
Admin clicks Approve in /admin/place/[id]
  → POST /api/v1/admin/places/:id/approve
      → middleware: adminAuth.ts (CF-Access header check)
      → routes/admin/places.ts:
          → chain.ts: advance current_place pointer, set prev_place_id
          → r2.ts: copy pending/[ulid]/* → approved/[ulid]/*; delete pending keys
          → db.ts: UPDATE submission status=approved, INSERT into places
          → kv.ts: invalidate CURRENT_PLACE_CACHE
          → db.ts: INSERT audit_log row (action=approve, actor email, timestamp)
      → 204 No Content
```

**External Service Integration Points:**

| Service | Integration File | Failure Mode |
|---|---|---|
| Cloudflare D1 | `src/lib/db.ts` | Propagate error; 500 to client |
| Cloudflare R2 | `src/lib/r2.ts` | Propagate error; submission fails cleanly |
| Cloudflare KV | `src/lib/kv.ts` | Cache miss → fall back to D1 read |
| Cloudflare Workers AI | `src/lib/ai.ts` | NFR17: scores=NULL, flagged=true; submission accepted |
| Cloudflare Turnstile | `src/lib/turnstile.ts` | 400 TURNSTILE_FAILED before any processing |
| Resend email | `src/lib/email.ts` | NFR25: fire-and-forget; never blocks response |

### Development Workflow Integration

**Local development commands:**
```bash
wrangler pages dev                          # full workerd runtime, real D1/R2/KV bindings
wrangler d1 migrations apply --local        # apply schema locally
wrangler d1 execute DB --local --file=migrations/0001_initial_schema.sql
wrangler tail                               # stream live logs from deployed worker
```

**CI pipeline (`ci.yml` steps in order):**
1. `npm ci`
2. `npx tsc --noEmit` — typecheck
3. `npx eslint src/` — lint
4. `npx vitest run` — unit tests (workerd pool)
5. `wrangler pages deploy` — deploy to preview or production

**Deployment targets:**
- Feature branches → `<branch-name>.localmatal.pages.dev` (preview D1/R2 bindings)
- `main` → `localmatal.com` (production D1/R2 bindings)

**`wrangler.toml` environment structure:**
```toml
name = "localmatal"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "localmatal-prod"
database_id = "..."

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "localmatal-images"

[[kv_namespaces]]
binding = "CURRENT_PLACE_CACHE"
id = "..."

[ai]
binding = "AI"

[crons]
triggers = ["0 3 * * *"]    # backup Worker, 3am UTC daily

[env.preview]
[[env.preview.d1_databases]]
database_name = "localmatal-preview"
database_id = "..."
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible. Astro 6.2.1 with `@astrojs/cloudflare` v13.3.0 is a supported pairing. Hono 4.x runs natively in the Workers runtime with no Node.js dependencies. Zod and `@hono/zod-validator` are both bundle-size safe for Workers. `browser-image-compression` runs in the browser (not the Worker) — no runtime conflict. Vitest with `@cloudflare/vitest-pool-workers` validates code under the actual Workers runtime.

**Pattern Consistency:**
Naming conventions are internally consistent: `snake_case` DB ↔ camelCase JSON transform happens once in `db.ts`; Zod schemas in `schemas.ts` serve as the bridge. The `AppError` → Hono `onError` pattern is consistent with Hono's documented error handling. The 4-state island pattern aligns with standard React state machine idiom.

**Structure Alignment:**
The Hono router mounted at `src/pages/api/v1/[...route].ts` and the route modules in `src/routes/` are cleanly separated — entry point vs. logic. The `src/lib/` boundary (no Astro deps, pure functions) is enforceable and testable. All privacy-sensitive operations route through `privacy.ts` before touching D1 or R2.

### Requirements Coverage Validation ✅

All 50 FRs and 27 NFRs validated against the architecture. Full coverage confirmed with 7 minor gaps documented below — none require architectural changes.

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions documented with verified versions. Implementation patterns comprehensive with concrete examples and anti-patterns.

**Structure Completeness:** All files and directories named and purpose-documented. Integration points specified with explicit data flow sequences. Component boundaries well-defined with prop contracts.

**Pattern Completeness:** All potential conflict points addressed across naming, structure, format, and process categories. Anti-patterns documented alongside correct patterns to prevent drift.

### Gap Analysis Results

No critical gaps. Seven minor gaps — all additive, no architectural rework required. Each gap becomes an explicit acceptance criterion when writing epic stories.

| # | Gap | Severity | Epic | Resolution |
|---|---|---|---|---|
| G1 | **FR11 (mobile camera)** — `<input capture="environment">` not specified in `SubmissionForm.tsx` | Minor | Epic 3 | Add `<input type="file" accept="image/*" capture="environment">` for camera-capable devices |
| G2 | **FR13 (EXIF GPS pre-fill)** — client-side EXIF read before strip not in `SubmissionForm.tsx` spec | Minor | Epic 3 | Read GPS tags from raw file before `browser-image-compression`; populate map picker; discard after |
| G3 | **FR33 (honeypot + time-on-form)** — not in Zod submission schema | Minor | Epic 5 | Add to `schemas.ts`: `honeypot: z.string().max(0)`, `timeOnForm: z.number().min(3000)` |
| G4 | **NFR4 (gallery no layout shift)** — stored image dimensions not in D1 schema spec | Minor | Epic 1 | Add `thumb_width` and `thumb_height` columns to `places` table in `0001_initial_schema.sql` |
| G5 | **NFR16 (images.localmatal.com)** — R2 custom domain not flagged as Day 1 deployment blocker | Minor | Epic 1 | Add to Epic 1 checklist: configure R2 custom domain before first image is stored |
| G6 | **NFR18 (pause submissions)** — `SUBMISSIONS_PAUSED` env var kill-switch not in `wrangler.toml` spec | Minor | Epic 1 | Add `SUBMISSIONS_PAUSED = "false"` to `[vars]`; check in `routes/submissions.ts` before processing |
| G7 | **NFR3 (concept-overlap <5s)** — timeout wrapper not specified in `ai.ts` | Minor | Epic 4 | Wrap Workers AI calls with `Promise.race([aiCall, timeout(4500)])`; treat timeout as graceful degrade (NFR17) |

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (medium, Cloudflare-native MPA)
- [x] Technical constraints identified (Workers runtime, D1 SQLite, R2 key permanence)
- [x] Cross-cutting concerns mapped (6 concerns, all addressed)

**Architectural Decisions**
- [x] Critical decisions documented with versions (Astro 6.2.1, @astrojs/cloudflare 13.3.0, Hono 4.x, Wrangler 3.x)
- [x] Technology stack fully specified
- [x] Integration patterns defined (Hono sub-router, middleware chain order, KV invalidation)
- [x] Performance considerations addressed (static pages, KV cache, Workers AI timeout)

**Implementation Patterns**
- [x] Naming conventions established (snake_case DB, camelCase JSON, PascalCase components)
- [x] Structure patterns defined (co-located tests, route modules, lib boundary)
- [x] Communication patterns specified (error envelope, response shapes, structured logging)
- [x] Process patterns documented (AppError, 4-state machine, async/await only)

**Project Structure**
- [x] Complete directory structure defined (all files named and purpose documented)
- [x] Component boundaries established (SubmissionForm, MapIsland, GalleryModal)
- [x] Integration points mapped (submission pipeline flow, approval flow, external services)
- [x] Requirements to structure mapping complete (all 8 FR categories mapped)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

All 16 checklist items confirmed. No critical gaps. Seven minor gaps documented above — all additive, all assigned to specific epics as acceptance criteria.

**Confidence Level: High**

**Key Strengths:**
- Privacy invariants enforced at a single boundary (`privacy.ts`) — the hardest class of bug to catch in code review is prevented structurally
- Cloudflare Access replaces all session management code — eliminates an entire security-sensitive subsystem
- KV cache + D1 fallback pattern makes the homepage resilient to KV unavailability with no code changes
- Single `<MapIsland>` component for both display and picker eliminates the most common source of map-related inconsistency between epics
- `AppError` + Hono global handler makes error format compliance impossible to violate accidentally

**Areas for Future Enhancement:**
- Sentry error tracking (Phase 2, if log volume warrants)
- KV runtime feature flags for ops toggles without deploys (Phase 3)
- OG share-card image generation Worker (Phase 2, deferred from MVP per PRD)
- RSS/Atom feed (Phase 2)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — particularly the middleware order (Turnstile → rate limit → validation → AI pipeline), the AppError throw pattern, and the privacy.ts boundary
- Use implementation patterns consistently: snake_case in SQL, camelCase in JSON, 4-state islands, structured logging
- Respect project structure: no SQL outside `db.ts`, no R2 calls outside `r2.ts`, no raw D1 boolean integers outside `db.ts`
- Address all 7 gaps (G1–G7) as acceptance criteria in the relevant epic stories before marking those stories complete
- Refer to this document for all architectural questions before making a local decision

**First Implementation Priority:**
Epic 1 — Foundation & Infrastructure:
```bash
npm create astro@latest localmatal -- --template minimal --typescript strict --no-install
cd localmatal && npx astro add cloudflare
npm install hono zod @hono/zod-validator browser-image-compression
npm install --save-dev wrangler vitest @cloudflare/vitest-pool-workers
```
Then in order: `_headers` CSP → `wrangler.toml` bindings → D1 initial schema migration (with G4 thumb dimensions) → KV namespace → error constants → `SUBMISSIONS_PAUSED` env var (G6) → R2 custom domain (G5) → backup Cron Worker.
