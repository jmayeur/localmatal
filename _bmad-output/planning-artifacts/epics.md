---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-05-04'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# localmatal - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for localmatal, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: A visitor can view the current place — photo, place name, contributor name, sentence, and approximate map location — on the homepage without signing in.
FR2: A visitor can navigate to any approved place in the chain via a stable perma-link URL.
FR3: A visitor can walk the chain sequentially using previous and next navigation from any place page.
FR4: A visitor can browse all approved places in a thumbnail gallery view.
FR5: A visitor can open a gallery thumbnail to view the full place detail (photo, name, sentence, contributor, map pin) in a modal.
FR6: A visitor can see the approximate geographic location of a place on a map within any place detail view.
FR7: A visitor can report any approved place for review via a report link present on every place page.
FR8: A contributor can submit a new place by providing a photo, a map pin location, a place name, a contributor name, and a sentence of ≤ 250 characters.
FR9: A contributor can upload a photo in JPEG, PNG, WebP, or HEIC format up to 10 MB.
FR10: A contributor's photo is automatically scaled and optimized client-side before upload to reduce file size.
FR11: A contributor can use their device camera directly from the submission form on supported mobile browsers.
FR12: A contributor can set a map pin via an interactive map or a manual coordinate/text input fallback.
FR13: A contributor's photo EXIF GPS data can optionally pre-fill the map pin location before being discarded.
FR14: A contributor receives a live character count while composing their sentence.
FR15: A contributor's sentence is checked against the current place's sentence for concept overlap before submission.
FR16: A contributor whose sentence fails the concept-overlap check sees the previous sentence re-displayed alongside a helpful nudge, and can revise their sentence without re-uploading their photo.
FR17: A contributor can abandon the submission form at any point without creating an account or partial record.
FR18: A contributor receives a confirmation that their submission has entered the moderation queue upon successful submission.
FR19: The system automatically rejects any submitted photo that contains a prominent human face.
FR20: The system automatically rejects any submitted photo that exceeds the configured NSFW classification threshold.
FR21: The system automatically rejects any submission with a disallowed file type or file size exceeding the limit.
FR22: The system strips all EXIF metadata from uploaded photos server-side before storing them.
FR23: The maintainer can access a password-gated moderation queue listing all submissions awaiting review.
FR24: The maintainer can view each queued submission's photo, place name, contributor name, sentence, map pin, and automated check scores.
FR25: The maintainer can approve a queued submission, making it the new current place in the chain.
FR26: The maintainer can reject a queued submission with a categorized reason, triggering deletion of associated image files.
FR27: The maintainer can edit a submission's text fields (place name, contributor name, sentence) before approving.
FR28: The maintainer can override a concept-overlap check failure and approve a submission on human judgment.
FR29: The maintainer can seed the chain with a new entry directly, without going through the public submission form.
FR30: The maintainer can view and resolve place reports submitted by visitors.
FR31: The submission form presents a bot-mitigation challenge that is invisible to human users under normal conditions.
FR32: The system enforces per-IP and per-session submission rate limits, blocking excessive submissions before they reach processing.
FR33: The system rejects submissions that exhibit automated form-filling patterns (honeypot field or below minimum time-on-form).
FR34: All approved place coordinates are displayed with a minimum location fuzz of 100 meters; raw coordinates are never exposed publicly.
FR35: IP addresses are never stored in plaintext; all audit and rate-limit records use a daily-salted hash.
FR36: The maintainer receives an email notification for each new submission entering the moderation queue, with a direct link to the queue.
FR37: The maintainer can configure a rollup digest threshold so that high-volume submission periods send a single digest rather than per-submission emails.
FR38: A contributor whose submission is rejected receives a notification with the categorized rejection reason.
FR39: Every approved place has a permanent, stable URL that does not change after approval.
FR40: The chain maintains a linked structure where each approved place references its predecessor, preserving traversal order.
FR41: Removing or tombstoning an approved place preserves the chain link topology; the gap is visible but navigation continues across it.
FR42: The system performs an automated daily database backup to durable object storage.
FR43: All moderation actions (approve, reject, edit, seed, override) are recorded in an append-only audit log.
FR44: Each approved place page exposes structured metadata (title, description, OG image) for social sharing and search indexing.
FR45: The system generates a sitemap covering all approved place perma-links.
FR46: Every place image has a descriptive text alternative equivalent to the contributor's sentence.
FR47: The submission form is fully operable by keyboard without requiring pointer interaction.
FR48: The map picker is usable without a pointer device via a text-based coordinate or location input fallback.
FR49: Dynamic feedback on the submission form (concept-overlap nudge, character count, error messages) is announced to screen readers without page reload.
FR50: All interactive elements meet minimum touch target size requirements on mobile viewports.

### NonFunctional Requirements

NFR1: The homepage and any place perma-link page achieve LCP < 2.5s on simulated 4G mobile, measured from Cloudflare edge (static pages).
NFR2: The Turnstile challenge resolves without user interaction in < 3 seconds under normal conditions.
NFR3: The concept-overlap check (embedding + optional LLM tiebreaker) completes within 5 seconds of form submission; Workers AI calls wrapped with a 4500ms timeout, treating timeout as graceful degradation.
NFR4: Gallery thumbnail images load without layout shift; `width` and `height` attributes set from `thumb_width` / `thumb_height` stored in D1 on every `<img>` element.
NFR5: No JavaScript is required to read any approved place page or walk the chain; JS enhances but does not gate core read paths.
NFR6: The admin moderation queue loads all pending submissions within 3 seconds for queues up to 50 items.
NFR7: All data in transit encrypted via TLS 1.2+ (enforced by Cloudflare).
NFR8: `/admin` route and all moderation API endpoints inaccessible without valid Cloudflare Access credentials; unauthenticated requests receive 401 with no information leakage.
NFR9: EXIF metadata stripped server-side from every uploaded image before written to R2. Client-side stripping is enhancement only.
NFR10: Public API responses and page source never expose raw GPS coordinates; only fuzzed coordinates (≥ 100m offset) returned.
NFR11: IP addresses never persisted in plaintext; rate-limit and audit records store only `sha256(ip + daily_salt)`; salt rotates daily.
NFR12: `reports` table and audit log never accessible via any public endpoint or page.
NFR13: Admin authentication handled by Cloudflare Access (supersedes password-in-env-var approach from original PRD); no admin credentials stored in application code.
NFR14: `robots.txt` disallows `/admin/*`, `/pending/*`, and internal API routes; `_headers` file sets strict CSP and security headers.
NFR15: Daily D1 backup Cron Trigger runs every 24h, writes verifiable snapshot to R2 `backups/YYYY-MM-DD/db.sqlite` with 30-day lifecycle retention; failed backup triggers Cloudflare Worker error alert.
NFR16: Image objects served from `images.localmatal.com` (R2 custom domain); subdomain configured before first image stored — URL scheme is permanent.
NFR17: Workers AI service interruption causes graceful degradation: uploads accepted with scores marked NULL, flagged for manual review; pipeline never auto-rejects due to AI unavailability.
NFR18: `SUBMISSIONS_PAUSED` environment variable (default `"false"`) in `wrangler.toml` allows maintainer to pause submissions without taking read-only chain pages offline.
NFR19: All public pages and submission form conform to WCAG 2.1 Level AA.
NFR20: All text content meets minimum contrast ratio 4.5:1 (WCAG 1.4.3).
NFR21: All interactive elements have visible focus indicator meeting WCAG 2.4.7.
NFR22: Submission form operable by keyboard only; no interaction requires a pointer device.
NFR23: Map picker degrades gracefully via text-based coordinate input alternative; map not required to complete a submission.
NFR24: Workers AI model versions pinned in `wrangler.toml` env vars (`@cf/baai/bge-small-en-v1.5` for embeddings); changes require explicit version bumps.
NFR25: Resend email delivery target < 60s from submission event; if unreachable, submission completes and notification is logged; email never blocks the upload pipeline (fire-and-forget).
NFR26: Cloudflare Turnstile token validated server-side before any upload processing; failed/missing token → immediate 400, no further processing.
NFR27: All R2 image keys follow `[status]/[ulid]/[variant].[ext]`; naming convention stable; changes require migration plan.

### Additional Requirements

Architecture technical requirements that affect implementation:

- **Project initialization:** `npm create astro@latest localmatal -- --template minimal --typescript strict --no-install` → `npx astro add cloudflare` → `npm install hono zod @hono/zod-validator browser-image-compression` → `npm install --save-dev wrangler vitest @cloudflare/vitest-pool-workers`. Versions: Astro 6.2.1, @astrojs/cloudflare 13.3.0, Hono 4.x.
- **Rendering model:** `output: 'hybrid'` in `astro.config.mjs`; public place pages static by default; admin and API routes opt into SSR with `export const prerender = false`.
- **Hono router entry point:** `src/pages/api/v1/[...route].ts` — catch-all mounts route modules; no business logic in entry point.
- **Route modules:** `src/routes/submissions.ts`, `src/routes/places.ts`, `src/routes/reports.ts`, `src/routes/admin/queue.ts`, `src/routes/admin/places.ts`.
- **Middleware chain order (non-negotiable per NFR26):** `turnstile.ts` → `rateLimit.ts` → Zod validation → AI pipeline.
- **AppError pattern:** All handlers throw `AppError(code, message, httpStatus, field?)`; single Hono `onError` global handler formats the standard error envelope `{ error: { code, message, field } }`.
- **Error codes:** All constants defined in `src/lib/errors.ts`; never inline strings.
- **Zod schemas:** All in `src/lib/schemas.ts`; submission schema must include `honeypot: z.string().max(0)` and `timeOnForm: z.number().min(3000)` (anti-abuse, gap G3).
- **D1 migrations:** Wrangler native; sequential `.sql` files in `/migrations`; first migration includes `thumb_width` and `thumb_height` columns on `places` table (gap G4).
- **KV cache:** `CURRENT_PLACE_CACHE` namespace; key `current`; invalidated synchronously on every moderation approval before 200 response; TTL 24h safety net; homepage falls back to D1 on miss.
- **MapIsland component:** Single `src/components/MapIsland.tsx` with `mode: 'display' | 'picker'`; display mode read-only fuzzed marker; picker mode includes text coordinate fallback and `onChange` callback; `<input capture="environment">` for mobile camera (gap G1).
- **EXIF GPS pre-fill (gap G2):** Client-side: read GPS tags from raw file before `browser-image-compression`; populate map picker coords; discard before upload.
- **Workers AI timeout (gap G7):** Wrap all Workers AI calls with `Promise.race([aiCall, timeout(4500)])` in `src/lib/ai.ts`; treat timeout as graceful degrade (NFR17).
- **Privacy boundary:** All EXIF strip, IP hash, and location fuzz go through `src/lib/privacy.ts`; no raw IP or coordinates reach D1 writes or JSON responses.
- **Island state pattern:** All async islands use `'idle' | 'loading' | 'success' | 'error'` state machine; no boolean `isLoading` flags.
- **Structured logging:** All `console.log` / `console.error` use `{ event: string, ...context }` object form; no plain string logs.
- **CSP + security headers:** `src/pages/_headers` file with `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` — established in Epic 1 before first deploy.
- **R2 custom domain (gap G5):** `images.localmatal.com` configured before first image stored; Epic 1 deployment checklist item.
- **`SUBMISSIONS_PAUSED` env var (gap G6):** Default `"false"` in `wrangler.toml [vars]`; checked in `routes/submissions.ts` before processing; set `"true"` to pause without deploy.
- **CI pipeline:** GitHub Actions → `tsc --noEmit` → `eslint` → `vitest run` → `wrangler pages deploy`; feature branches deploy to `<branch>.localmatal.pages.dev`.
- **Backup Cron Worker:** `workers/backup.ts`; Cloudflare Worker error rate alert for failures; Resend success confirmation email.

### UX Design Requirements

No formal UX design document exists. UX guidance is embedded in the PRD (user journeys, Web App Specific Requirements, Accessibility Implementation Notes). Key UX decisions to implement as acceptance criteria in stories:

- UX-DR1: Concept-overlap nudge copy: *"Try focusing on a feeling or image from the previous one"* — previous sentence re-displayed below the nudge; nudge appears inline without page reload; announced via `aria-live="polite"`.
- UX-DR2: Submission confirmation copy: *"Your place is in the queue. If it's approved, it'll become the next entry in the chain."* — no email promise, no account prompt, no follow-up CTA.
- UX-DR3: Homepage prompt copy below current place: *"Add the next place. Your sentence has to share at least one feeling, image, or idea with this one."*
- UX-DR4: Mobile-first layout — 375px viewport baseline; breakpoints at 768px and 1280px; content-narrow design (no wide-canvas layouts).
- UX-DR5: Minimum 44×44px touch targets on all interactive elements (WCAG 2.5.5 / FR50).
- UX-DR6: Map picker full-width on mobile, constrained max-width on desktop; text coordinate input always visible (not hidden behind a toggle).
- UX-DR7: Gallery grid + modal: grid renders statically; modal island hydrates on interaction; focus trapped in modal, restored to trigger on close.
- UX-DR8: Submission form multi-step state: idle → photo selected → fields filled → sentence written → concept check in progress → result (pass/nudge) → submitted; each state has a distinct UI.
- UX-DR9: Admin queue card displays photo (thumb variant), place name, contributor name, sentence, map pin coordinates, and AI scores (face count, NSFW score, concept score) with color coding (green ≤ threshold, red > threshold).
- UX-DR10: No sign-up prompt, no notification to contributor on approval, no "share your submission" prompt — structurally anti-viral UX throughout.

### FR Coverage Map

| FR | Epic | Area |
|---|---|---|
| FR1 | Epic 2 | Homepage — current place display |
| FR2 | Epic 2 | Perma-link `/place/[ulid]` |
| FR3 | Epic 2 | Prev/next chain navigation |
| FR4 | Epic 2 | Gallery thumbnail view |
| FR5 | Epic 2 | Gallery detail modal |
| FR6 | Epic 2 | Map display on place pages |
| FR7 | Epic 2 | Report a place link |
| FR8 | Epic 3 | Submission form fields |
| FR9 | Epic 3 | File format + size validation |
| FR10 | Epic 3 | Client-side image pre-scaling |
| FR11 | Epic 3 | Mobile camera capture |
| FR12 | Epic 3 | Map picker + text input fallback |
| FR13 | Epic 3 | EXIF GPS pre-fill |
| FR14 | Epic 3 | Live character count |
| FR15 | Epic 3 | Concept-overlap check |
| FR16 | Epic 3 | Nudge UX + revise without re-upload |
| FR17 | Epic 3 | Graceful abandonment |
| FR18 | Epic 3 | Submission confirmation |
| FR19 | Epic 3 | Face detection auto-reject |
| FR20 | Epic 3 | NSFW auto-reject |
| FR21 | Epic 3 | File type/size hard reject |
| FR22 | Epic 3 | Server-side EXIF strip |
| FR23 | Epic 4 | Admin queue access (Cloudflare Access) |
| FR24 | Epic 4 | Queue submission detail view |
| FR25 | Epic 4 | Approve — current pointer flip + KV invalidate |
| FR26 | Epic 4 | Reject + R2 cleanup |
| FR27 | Epic 4 | Edit text fields before approve |
| FR28 | Epic 4 | Override concept-overlap failure |
| FR29 | Epic 4 | Chain seed from admin |
| FR30 | Epic 4 | View + resolve place reports |
| FR31 | Epic 3 | Turnstile challenge |
| FR32 | Epic 3 | Rate limiting |
| FR33 | Epic 3 | Honeypot + time-on-form |
| FR34 | Epic 3 | Location fuzz ≥ 100m |
| FR35 | Epic 3 | IP hash (daily-salted) |
| FR36 | Epic 3 | Maintainer email on new submission |
| FR37 | Epic 4 | Rollup digest threshold config |
| FR38 | Epic 4 | Contributor rejection notification |
| FR39 | Epic 2 | Stable perma-link URLs |
| FR40 | Epic 2 | Chain linked list (`prev_place_id`) |
| FR41 | Epic 4 | Tombstone — preserve chain topology |
| FR42 | Epic 1 | Daily D1 backup |
| FR43 | Epic 1 + 4 | Audit log schema (E1); log actions (E4) |
| FR44 | Epic 5 | OG metadata on place pages |
| FR45 | Epic 5 | Sitemap generation |
| FR46 | Epic 2 | Alt text = contributor's sentence |
| FR47 | Epic 3 | Keyboard-operable form |
| FR48 | Epic 3 | Map keyboard fallback |
| FR49 | Epic 3 | `aria-live` announcements |
| FR50 | Epic 2 + 3 | 44×44px touch targets (place pages + form) |

## Epic List

### Epic 1: Project Foundation
As the maintainer, I can initialize the project, deploy it to Cloudflare Pages, verify all infrastructure bindings (D1, R2, KV, Workers AI, Resend, Cloudflare Access), configure the daily backup, and confirm the system is ready to receive real data — with all privacy and security primitives in place from day one.
**FRs covered:** FR42, FR43 (schema)
**NFRs addressed:** NFR7, NFR14, NFR15, NFR16, NFR18, NFR24

### Epic 2: Public Chain & Place Viewing
As a visitor, I can browse the live chain — viewing the current place on the homepage, navigating to any place via a stable perma-link, walking prev/next, browsing the gallery with a detail modal, seeing the approximate map location, and reporting a place — all without JavaScript or signing in.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR39, FR40, FR46, FR50
**NFRs addressed:** NFR1, NFR4, NFR5, NFR19, NFR20, NFR21

### Epic 3: Submission & Content Pipeline
As a contributor, I can submit a place through the full end-to-end pipeline — uploading a photo (with client-side pre-scaling, mobile camera support, EXIF GPS pre-fill), setting a map pin with keyboard fallback, writing a sentence with live character count, passing the concept-overlap check (with helpful nudge if it fails), clearing anti-abuse gates (Turnstile, rate limits, honeypot, time-on-form), having safety checks run automatically (face, NSFW, EXIF strip), and receiving a confirmation my submission is in the queue. The maintainer can also verify the concept-overlap threshold is calibrated before enabling public submissions.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR31, FR32, FR33, FR34, FR35, FR36, FR47, FR48, FR49, FR50
**NFRs addressed:** NFR2, NFR3, NFR9, NFR10, NFR11, NFR17, NFR22, NFR23, NFR24, NFR25, NFR26, NFR27
**Architecture gaps:** G1, G2, G3, G7

### Epic 4: Moderation Queue & Admin
As the maintainer, I can access the moderation queue via Cloudflare Access, review each queued submission with AI scores, approve/reject/edit submissions, seed the chain directly, configure the email digest threshold, view and resolve place reports, and have all actions recorded in an append-only audit log — with the chain topology preserved through tombstoning and rejection notifications sent to contributors.
**FRs covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR37, FR38, FR41, FR43 (actions)
**NFRs addressed:** NFR6, NFR8, NFR12, NFR13
**Architecture gaps:** G4, G5, G6

### Epic 5: Pre-Launch Readiness
As the maintainer, I can soft-launch with confidence — the chain is discoverable by search engines (sitemap, OG metadata verified), the site is legally compliant (Privacy Policy, ToS, takedown contact), Cloudflare Web Analytics is capturing events without cookies, and all quality gates are verified (backup restore test, concept-overlap calibration confirmed, accessibility audit passed).
**FRs covered:** FR44, FR45, FR46 (audit), FR47 (audit), FR48 (audit), FR49 (audit), FR50 (audit)
**NFRs addressed:** NFR14 (sitemap in robots.txt), NFR19–NFR23 (WCAG audit)
**Unlisted Phase 1 requirements:** Privacy Policy, Terms of Service, takedown contact, Cloudflare Web Analytics, concept-overlap calibration (50–100 labeled pairs), backup restoration test

## Epic 1: Project Foundation

As the maintainer, I can initialize the project, deploy it to Cloudflare Pages, verify all infrastructure bindings (D1, R2, KV, Workers AI, Resend, Cloudflare Access), configure the daily backup, and confirm the system is ready to receive real data — with all privacy and security primitives in place from day one.

### Story 1.1: Project Initialization & CI Pipeline

As the maintainer,
I want a deployed Astro + Cloudflare Pages project with a working CI pipeline,
So that I have a live deployment URL and confirmed build chain before writing any product code.

**Acceptance Criteria:**

**Given** the init commands are run (`npm create astro@latest localmatal -- --template minimal --typescript strict`, `npx astro add cloudflare`, `npm install hono zod @hono/zod-validator browser-image-compression`, `npm install --save-dev wrangler vitest @cloudflare/vitest-pool-workers`)
**When** the project builds locally with `npm run build`
**Then** it succeeds with no TypeScript errors (strict mode) and no lint violations
**And** `astro.config.mjs` has `output: 'hybrid'` with the Cloudflare adapter
**And** Astro 6.2.1, @astrojs/cloudflare 13.3.0, Hono 4.x are pinned in `package.json`

**Given** the repo is pushed to GitHub with `.github/workflows/ci.yml`
**When** CI runs
**Then** it executes in order: `tsc --noEmit` → `eslint src/` → `vitest run` → `wrangler pages deploy`
**And** a feature branch deploys to `<branch>.localmatal.pages.dev`
**And** `main` deploys to `localmatal.com` once the domain is registered

**Given** `.dev.vars.example` is committed to the repo
**Then** it documents all required secrets: `RESEND_API_KEY`, `DAILY_SALT_SECRET`, `AI_MODEL_EMBEDDINGS`, `AI_MODEL_LLM_TIEBREAKER`, `CF_ACCESS_AUD`
**And** `.dev.vars` is gitignored

### Story 1.2: D1 Schema & Migration Tooling

As the maintainer,
I want the complete D1 database schema applied via Wrangler migrations to both local and production,
So that all required tables exist with correct columns before any data is written.

**Acceptance Criteria:**

**Given** `wrangler d1 migrations apply --local` runs on migration `0001_initial_schema.sql`
**When** the migration completes
**Then** these tables exist with correct columns:
- `places` (id TEXT PK, prev_place_id TEXT, place_name TEXT, contributor_name TEXT, sentence TEXT, lat REAL, lng REAL, location_fuzz_m INTEGER DEFAULT 100, geohash6 TEXT, thumb_url TEXT, modal_url TEXT, full_url TEXT, thumb_width INTEGER, thumb_height INTEGER, is_tombstoned INTEGER NOT NULL DEFAULT 0, created_at TEXT, approved_at TEXT)
- `submissions` (id TEXT PK, place_name TEXT, contributor_name TEXT, sentence TEXT, lat REAL, lng REAL, photo_pending_key TEXT, face_score REAL, nsfw_score REAL, concept_score REAL, ai_flags_unavailable INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', submitted_at TEXT, ip_hash TEXT)
- `current_place` (id TEXT PRIMARY KEY DEFAULT 'singleton', place_id TEXT)
- `audit_log` (id TEXT PK, action TEXT NOT NULL, actor TEXT, subject_id TEXT, details TEXT, created_at TEXT NOT NULL)
- `reports` (id TEXT PK, place_id TEXT NOT NULL, reason TEXT, ip_hash TEXT, created_at TEXT NOT NULL, resolved_at TEXT)
- `rate_limits` (ip_hash TEXT NOT NULL, window_key TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, last_seen TEXT, PRIMARY KEY (ip_hash, window_key))

**Given** the places table
**Then** an index exists on `prev_place_id` and a separate index on `geohash6`

**Given** `wrangler d1 migrations apply --remote`
**Then** the same migration applies to the production D1 database without error

### Story 1.3: R2 Bucket, Custom Domain & KV Namespace

As the maintainer,
I want images served from `images.localmatal.com` and a KV namespace for caching,
So that image URLs are permanent from day one and the current-place cache is ready to use.

**Acceptance Criteria:**

**Given** `wrangler.toml` has an `IMAGES` R2 binding and a `CURRENT_PLACE_CACHE` KV binding
**When** a test write and read are performed locally with `wrangler pages dev`
**Then** both succeed without errors

**Given** the Cloudflare dashboard has `images.localmatal.com` configured as R2 custom domain
**When** a test object is uploaded to R2 with key `test/hello.txt`
**Then** `https://images.localmatal.com/test/hello.txt` resolves and returns the object
**And** this is verified before any real image is stored (NFR16 — architecture gap G5)

**Given** `wrangler.toml` defines separate D1, R2, and KV bindings for `[env.preview]` and production
**Then** preview deployments use isolated preview databases and buckets

### Story 1.4: Security Headers & robots.txt

As a visitor,
I want security headers enforced from the first deploy,
So that XSS, clickjacking, and content-sniffing vectors are closed before any content is live.

**Acceptance Criteria:**

**Given** any page request to the deployed site
**When** the response headers are inspected
**Then** `Content-Security-Policy` is present with: `default-src 'self'; img-src 'self' images.localmatal.com data:; connect-src 'self' challenges.cloudflare.com; frame-src challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; script-src 'self'`
**And** `X-Frame-Options: DENY` is present
**And** `X-Content-Type-Options: nosniff` is present
**And** these are delivered via `src/pages/_headers` (zero Worker overhead)

**Given** a request to `/robots.txt`
**When** the response body is read
**Then** it contains `Disallow: /admin/`, `Disallow: /api/`, `Disallow: /pending/`
**And** `Allow: /` is present so all approved place pages and the gallery are crawlable

### Story 1.5: Foundation Library Modules

As a developer agent implementing subsequent stories,
I want shared utility modules in `src/lib/` with co-located tests,
So that all subsequent stories have consistent, tested building blocks with no duplicated logic.

**Acceptance Criteria:**

**Given** `src/lib/errors.ts`
**Then** it exports `AppError` class (code: string, message: string, httpStatus: number, field?: string) and error code constants: `TURNSTILE_FAILED`, `RATE_LIMITED`, `FILE_TOO_LARGE`, `FILE_TYPE_REJECTED`, `FACE_DETECTED`, `NSFW_DETECTED`, `CONCEPT_OVERLAP_FAILED`, `INTERNAL_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`

**Given** `src/lib/ulid.ts`
**Then** `generateUlid()` returns a valid ULID string using Web Crypto API only (no Node.js built-ins)
**And** two successive calls return different values

**Given** `src/lib/privacy.ts`
**Then** `hashIp(ip, dailySalt)` returns a hex string (sha256 of ip + dailySalt)
**And** `fuzzCoordinates(lat, lng, fuzzMeters)` returns coordinates offset by ≥ `fuzzMeters` in a random direction
**And** `fuzzCoordinates` with `fuzzMeters = 100` never returns the exact original coordinates

**Given** `src/lib/db.ts`
**Then** typed query helpers exist for all 6 tables
**And** any column declared as `INTEGER` for boolean (e.g., `is_tombstoned`) is coerced to `boolean` before being returned — no raw `0`/`1` values reach callers

**Given** `src/lib/r2.ts`
**Then** `buildR2Key(status, ulid, variant, ext)` returns `${status}/${ulid}/${variant}.${ext}`
**And** `getImageUrl(key)` returns `https://images.localmatal.com/${key}`

**Given** `src/lib/kv.ts`
**Then** `getCurrentPlace(kv)` returns the cached place JSON or `null` on cache miss
**And** `invalidateCurrentPlace(kv)` deletes the `current` key

**Given** all lib modules
**Then** each has a co-located `*.test.ts` file
**And** `vitest run` passes all tests under `@cloudflare/vitest-pool-workers`

### Story 1.6: Daily Backup Cron Worker

As the maintainer,
I want an automated daily D1 backup to R2 with failure alerting,
So that data can be recovered within 24 hours if infrastructure fails.

**Acceptance Criteria:**

**Given** `workers/backup.ts` is deployed with cron trigger `0 3 * * *` in `wrangler.toml`
**When** the cron fires
**Then** it exports the D1 database and writes to R2 at key `backups/YYYY-MM-DD/db.sqlite`
**And** on success a Resend confirmation email is sent fire-and-forget to the maintainer
**And** the Worker does not `await` the Resend call (non-blocking)

**Given** the backup Worker throws an unhandled error
**Then** Cloudflare's built-in Worker error rate alert fires to the maintainer email (configured in Cloudflare dashboard; zero application code required)

**Given** an R2 lifecycle rule on the `backups/` prefix
**Then** objects older than 30 days are automatically deleted

**Given** `wrangler.toml` `[vars]` section
**Then** `SUBMISSIONS_PAUSED = "false"` is declared
**And** when set to `"true"`, `routes/submissions.ts` returns a 503 without affecting any read-only pages (NFR18 / architecture gap G6)

### Story 1.7: Cloudflare Access Admin Protection

As the maintainer,
I want `/admin/*` and `/api/v1/admin/*` protected by Cloudflare Access before any admin UI exists,
So that the moderation surface is never publicly accessible even during development.

**Acceptance Criteria:**

**Given** a Cloudflare Access policy is configured for `/admin/*` and `/api/v1/admin/*` on `localmatal.com`
**When** an unauthenticated browser requests `/admin`
**Then** Cloudflare Access serves its authentication page; the Astro admin content is never reached

**Given** an authenticated maintainer with a valid `CF-Access-JWT-Assertion` cookie
**When** they visit `/admin`
**Then** the request passes through to the Astro page (placeholder at this stage is acceptable)

**Given** `src/middleware/adminAuth.ts`
**When** any request arrives at `/api/v1/admin/*`
**Then** the middleware validates the `CF-Access-Authenticated-User-Email` header
**And** a missing or invalid header throws `new AppError('UNAUTHORIZED', 'Not authenticated', 401)`

**Given** the Hono router mounted at `src/pages/api/v1/[...route].ts`
**Then** `export const prerender = false` is set
**And** the Hono global `onError` handler returns `{ error: { code, message, field: null } }` with the correct HTTP status for all `AppError` instances

## Epic 2: Public Chain & Place Viewing

As a visitor, I can browse the live chain — viewing the current place on the homepage, navigating to any place via a stable perma-link, walking prev/next, browsing the gallery with a detail modal, seeing the approximate map location, sharing a place that previews correctly on social media, and reporting a place — all without JavaScript or signing in.

### Story 2.1: MapIsland Shared Component

As a visitor and contributor,
I want a single map component that works in both read-only display mode and interactive picker mode,
So that place locations are consistently rendered across all pages without duplicating the Leaflet bundle.

**Acceptance Criteria:**

**Given** `src/components/MapIsland.tsx` with props `{ mode: 'display' | 'picker', lat: number, lng: number, fuzzed?: boolean, onChange?: (lat: number, lng: number) => void }`
**When** rendered in `mode='display'`
**Then** it shows a read-only Leaflet map with a marker at the provided (fuzzed) coordinates
**And** no drag, click, or tile interaction is possible
**And** the map container has an `aria-label` and a visible focus ring (NFR21)

**Given** `mode='picker'`
**When** a user drags the marker or clicks the map
**Then** `onChange` is called with the new coordinates

**Given** `mode='picker'` on any viewport
**Then** a visible text input pair (lat / lng) is present alongside the map as a keyboard-accessible fallback (FR48, NFR23)
**And** updating the text inputs moves the marker and calls `onChange`
**And** the text inputs are labeled and keyboard-focusable (NFR22)

**Given** Leaflet is loaded as a lazy island
**Then** it does not appear in the JS bundle of static place pages (NFR5)
**And** `MapIsland.test.tsx` passes under vitest

### Story 2.2: Homepage — Current Place Display

As a visitor,
I want to see the current place on the homepage without signing in or enabling JavaScript,
So that I immediately understand the product and can start walking the chain.

**Acceptance Criteria:**

**Given** `src/pages/index.astro` renders as a static page
**When** a visitor loads it
**Then** it displays: place photo (modal variant), place name, contributor name, sentence, and `MapIsland` in display mode with fuzzed coordinates (FR1, NFR10)
**And** the page reads the current place from KV cache with fallback to D1 on miss

**Given** the place photo `<img>`
**Then** `alt` is set to the contributor's sentence (FR46)
**And** `width` and `height` are set from `thumb_width` / `thumb_height` (NFR4)

**Given** a simulated 4G connection from Cloudflare edge
**Then** LCP is < 2.5s for the static page (NFR1)
**And** the page delivers zero JavaScript for map and content; MapIsland hydrates only on `client:visible` (NFR5)

**Given** the page body below the place entry
**Then** the prompt copy reads: *"Add the next place. Your sentence has to share at least one feeling, image, or idea with this one."* (UX-DR3)
**And** an "Add a place" link points to `/submit`
**And** there is no sign-up prompt, notification opt-in, or social sharing CTA (UX-DR10)

**Given** `Base.astro` layout wraps the page
**Then** `og:title` = `[Place name] — LocalMatal`, `og:description` = contributor's sentence, `og:image` = thumb variant URL (FR44)
**And** `<title>` = `[Place name] — LocalMatal`

### Story 2.3: Place Perma-link Page & Chain Navigation

As a visitor,
I want to navigate to any approved place via a stable URL and walk the chain with prev/next links,
So that I can share individual places and browse the full history sequentially.

**Acceptance Criteria:**

**Given** `src/pages/place/[id].astro` where `id` is a ULID
**When** the page renders for an approved place
**Then** it displays: photo (modal variant), place name, contributor name, sentence, `MapIsland` display mode with fuzzed coordinates
**And** `ChainNav.astro` shows "← previous place" (if `prev_place_id` exists) and "→ next place" (if a successor exists)
**And** OG tags match FR44 / SEO table

**Given** a tombstoned place (FR41)
**When** its perma-link is visited
**Then** a gap indicator is shown in place of photo/name/sentence
**And** prev/next navigation links still resolve correctly across the gap

**Given** a place's ULID URL
**Then** it never changes after approval (FR39)
**And** the page is pre-rendered at build time — no JS required to read it (NFR5)

**Given** `ChainNav.astro` links
**Then** they are standard `<a>` elements with minimum 44×44px touch targets (FR50)
**And** they have visible focus indicators when keyboard-focused (NFR21)

### Story 2.4: Gallery View & Detail Modal

As a visitor,
I want to browse all approved places in a thumbnail grid and open any place in a detail modal,
So that I can explore the full chain non-sequentially.

**Acceptance Criteria:**

**Given** `src/pages/gallery.astro` renders as a static page
**When** it renders
**Then** all approved, non-tombstoned places appear as a thumbnail grid using the 400px thumb variant
**And** each `<img>` has `width` and `height` from `thumb_width` / `thumb_height` (NFR4)
**And** each `<img>` has `alt` = contributor's sentence (FR46)
**And** each thumbnail links to its place perma-link as a no-JS fallback (NFR5)

**Given** `src/components/GalleryModal.tsx` island hydrates on interaction
**When** a visitor clicks a thumbnail
**Then** the modal opens with: modal-variant photo (1200px), place name, contributor name, sentence, `MapIsland` display mode, and a link to the perma-link (FR5)
**And** focus is trapped within the modal while open
**And** pressing Escape or clicking the backdrop closes the modal and returns focus to the trigger thumbnail
**And** the modal has `role="dialog"`, `aria-modal="true"`, and an accessible title (NFR19)

**Given** the gallery on a 375px mobile viewport
**Then** thumbnails meet minimum 44×44px touch targets (FR50)
**And** no horizontal scrolling is required

### Story 2.5: Report a Place

As a visitor,
I want a report link on every place page,
So that I can flag inappropriate content for maintainer review without needing an account.

**Acceptance Criteria:**

**Given** `src/components/ReportLink.astro` is present on every place page (homepage, perma-link, gallery modal)
**When** a visitor clicks "Report this place"
**Then** an inline form appears with an optional reason text input (no auth required)

**Given** the form is submitted
**When** `POST /api/v1/reports` is called with `{ placeId, reason }`
**Then** `src/routes/reports.ts` writes to the `reports` table: `{ id: generateUlid(), place_id, reason, ip_hash: hashIp(ip, dailySalt), created_at }`
**And** raw IP is never stored (FR35, NFR11)
**And** the endpoint returns 201 with `{ id }`
**And** the response never exposes existing report data (NFR12)

**Given** the report form includes a Turnstile token
**Then** `src/middleware/turnstile.ts` validates it server-side before any write occurs (NFR26)
**And** a failed token returns `AppError('TURNSTILE_FAILED', ...)` with status 400

---

## Epic 3: Submission & Content Pipeline

**Goal:** As a contributor, I can submit a photo and sentence through a form that validates my content, checks concept overlap, and notifies the maintainer — so my place enters the moderation queue ready for review.

**Covers:** FR8–FR22, FR31–FR35, FR38, NFR9, NFR10, NFR11, NFR17, NFR24, NFR25, NFR26, NFR27; Architecture gaps G1, G2, G3, G7; UX-DR1, UX-DR2

**Depends on:** Epic 1 (infrastructure, lib layer), Epic 2 (current place endpoint for concept-overlap seed sentence)

### Story 3.1: Anti-Abuse Middleware Stack

As the maintainer,
I want automated bot and abuse filtering applied before any submission is processed,
So that the pipeline never performs expensive operations on clearly bad-faith requests.

**Acceptance Criteria:**

**Given** `src/middleware/turnstile.ts` is applied to `POST /api/v1/submissions`
**Then** the Cloudflare Turnstile token is validated server-side before any upload processing begins (NFR26)
**And** a missing or invalid token returns `AppError('TURNSTILE_FAILED', 'Bot check failed', 400)` with no further processing

**Given** `src/middleware/rateLimit.ts` is applied after Turnstile
**Then** per-IP rate limiting is enforced using `rateLimit.ts` with KV-backed counters (FR32)
**And** the IP key is `rateLimit:${hashIp(ip, dailySalt)}` — never plaintext (NFR11)
**And** exceeding the limit returns `AppError('RATE_LIMITED', 'Too many submissions', 429)`

**Given** the submission Zod schema in `src/lib/schemas.ts`
**Then** it includes `honeypot: z.string().max(0)` — a field that must be empty (FR33)
**And** it includes `timeOnForm: z.number().min(3000)` — time in ms since form mount (FR33, Gap G3)
**And** a non-empty honeypot or below-minimum timeOnForm returns `AppError('BOT_DETECTED', 'Submission rejected', 400)`

**Given** the full middleware chain for `POST /api/v1/submissions`
**Then** execution order is: Turnstile → rateLimit → Zod parse → pipeline (NFR26)
**And** a request that fails at any stage never reaches the image pipeline

### Story 3.2: Image Upload & Server-Side Processing Pipeline

As the system,
I want to validate, process, and store uploaded images in R2 with three size variants,
So that place images are safe, optimized, and available at stable URLs.

**Acceptance Criteria:**

**Given** `POST /api/v1/submissions` receives a multipart request
**Then** `src/lib/r2.ts` validates file type (JPEG, PNG, WebP, HEIC only) and rejects others with `AppError('INVALID_FILE_TYPE', ...)` (FR21)
**And** files exceeding 10 MB are rejected with `AppError('FILE_TOO_LARGE', ...)` before any R2 write (FR21)

**Given** a valid file passes type and size checks
**Then** `sharp` (or equivalent) strips all EXIF metadata server-side before any R2 write (FR22, NFR9)
**And** the image is re-encoded to WebP for long-term storage

**Given** a clean WebP source image
**Then** three variants are generated and stored in R2:
  - `pending/{ulid}/thumb.webp` — 400px wide, quality 80 (FR9, NFR27)
  - `pending/{ulid}/modal.webp` — 1200px wide, quality 85 (NFR27)
  - `pending/{ulid}/full.webp` — 2048px wide, quality 90 (NFR27)
**And** `thumb_width` and `thumb_height` of the 400px variant are stored in D1 alongside the submission (FR4, NFR4, Gap G4)
**And** image URLs use `https://images.localmatal.com/` as the base (NFR16, Gap G5)

**Given** any R2 write fails mid-pipeline
**Then** all partial R2 objects for that ULID are deleted before returning an error (no orphaned objects)

### Story 3.3: Workers AI Safety Checks

As the maintainer,
I want automated face detection and NSFW scoring run on every uploaded photo,
So that I never have to review content that should have been caught automatically.

**Acceptance Criteria:**

**Given** `src/lib/ai.ts` runs after image variants are stored
**Then** the face-detection model is called with the full-size variant (FR19)
**And** the NSFW classification model is called with the full-size variant (FR20)
**And** both model IDs are read from Cloudflare env vars (not hardcoded) and version-pinned (NFR24)

**Given** either AI check returns a positive result above its configured threshold
**Then** all R2 objects for that ULID are deleted (FR19, FR20)
**And** no D1 record is written
**And** the contributor receives a generic `AppError('CONTENT_REJECTED', 'Photo could not be accepted', 400)` — no detail about which check failed

**Given** a Workers AI call exceeds 4500ms (Gap G7)
**Then** `Promise.race([aiCall, timeout(4500)])` resolves to a degraded result
**And** both scores are stored as `NULL` in D1 with `ai_flags_unavailable = 1` (NFR17)
**And** the submission proceeds to the queue flagged for manual review
**And** the maintainer queue UI displays a "⚠ AI unavailable — manual review required" indicator for that submission

**Given** the Workers AI service returns an error response (non-timeout)
**Then** the same degradation path applies — submission accepted with `ai_flags_unavailable = 1` (NFR17)

### Story 3.4: Concept-Overlap Engine

As the system,
I want to check that each new sentence shares at least one concept with the current place's sentence,
So that the chain mechanic is enforced before a submission enters the moderation queue.

**Acceptance Criteria:**

**Given** `src/lib/conceptOverlap.ts` is called with `{ newSentence, currentSentence }`
**Then** both sentences are encoded using `@cf/baai/bge-small-en-v1.5` via `src/lib/ai.ts` (PRD architecture)
**And** cosine similarity is computed: `dot(a, b) / (|a| * |b|)`
**And** similarity ≥ configured threshold (default: `0.65`, stored in env var `OVERLAP_THRESHOLD`) returns `{ passed: true }`
**And** similarity < threshold AND > `OVERLAP_LLM_THRESHOLD` (default: `0.50`) triggers LLM tiebreaker
**And** similarity < `OVERLAP_LLM_THRESHOLD` returns `{ passed: false }` without LLM call

**Given** the LLM tiebreaker is invoked
**Then** the prompt includes both sentences and asks the model to judge shared concept (feeling, image, or concrete noun)
**And** the LLM model ID is read from env var and version-pinned (NFR24)
**And** the result is `{ passed: boolean, method: 'llm' }`

**Given** the concept-overlap call exceeds 4500ms (Gap G7)
**Then** `Promise.race` resolves to `{ passed: true, degraded: true }` — generous default on timeout
**And** `overlap_score` is stored as `NULL` in D1 with `overlap_degraded = 1`

**Given** `{ passed: false }` is returned from the engine
**Then** no D1 record is written and no R2 objects are created
**And** the API returns `{ error: { code: 'CONCEPT_OVERLAP_FAILED' }, currentSentence }` (HTTP 422)
**And** the contributor can revise their sentence without re-uploading their photo (FR16)

**Given** this story is complete
**Then** the calibration task is performed: run the engine against ≥50 hand-labeled sentence pairs and confirm threshold produces ≥80% accuracy before launch (PRD pre-launch calibration requirement)

### Story 3.5: Submission Endpoint Assembly & Maintainer Notification

As a contributor,
I want my submission saved to the queue and the maintainer notified after all checks pass,
So that my place is ready for human review without any further action on my part.

**Acceptance Criteria:**

**Given** all middleware, safety checks, and concept-overlap checks pass
**Then** `src/routes/submissions.ts` inserts a row into `submissions` with: `id` (ULID), `place_name`, `contributor_name`, `sentence`, `lat_fuzzed`, `lng_fuzzed` (≥100m fuzz via `privacy.ts`), `geohash6`, `ip_hash` (daily-salted via `privacy.ts`), `r2_key_prefix`, `thumb_width`, `thumb_height`, `face_score`, `nsfw_score`, `overlap_score`, `ai_flags_unavailable`, `overlap_degraded`, `status = 'pending'` (FR8, FR34, FR35, NFR10, NFR11)
**And** raw IP and raw GPS coordinates are never written to D1 (FR34, FR35)

**Given** the `SUBMISSIONS_PAUSED` env var is set to `"true"` (Gap G6)
**Then** `POST /api/v1/submissions` returns `AppError('SUBMISSIONS_PAUSED', 'Submissions are temporarily paused', 503)` before any processing
**And** public place pages remain fully accessible (NFR18)

**Given** a D1 insert succeeds
**Then** `src/lib/email.ts` calls Resend fire-and-forget (non-blocking) to notify the maintainer with a direct link to the queue (FR36, NFR25)
**And** a Resend failure is logged via `console.error` but does not fail the request (NFR25)
**And** if the submission volume exceeds the `DIGEST_THRESHOLD` env var within 1 hour, only one digest email is sent rather than per-submission (FR37)

**Given** the D1 insert and email dispatch complete
**Then** the API returns HTTP 201 with `{ id, status: 'pending' }` (FR18)
**And** no additional contributor data (name, sentence, location) is echoed back

### Story 3.6: SubmissionForm Island — Photo Step

As a contributor on a mobile device,
I want to capture or upload a photo directly from the submission form,
So that I can submit without leaving the browser.

**Acceptance Criteria:**

**Given** `src/components/SubmissionForm.tsx` mounts as a Preact island
**Then** the photo input renders as `<input type="file" accept="image/*" capture="environment">` on the initial step (FR11, Gap G1)
**And** this presents the native camera on supported mobile browsers while falling back to file picker on desktop

**Given** a photo file is selected
**Then** `browser-image-compression` runs client-side and compresses the image to < 1MB before upload (FR10)
**And** the compressed file size and dimensions are displayed to the contributor

**Given** the selected file contains EXIF GPS data
**Then** `src/lib/privacy.ts` (client-side) extracts the GPS coordinates and pre-fills the map pin (FR13, Gap G2)
**And** the EXIF data is then discarded from the file object before upload — GPS is never sent to the server in the image binary (FR13, NFR9)
**And** the contributor can override the pre-filled pin before proceeding

**Given** the SubmissionForm island state machine
**Then** the photo step state is one of: `'idle' | 'compressing' | 'ready' | 'error'`
**And** transitions are: idle → compressing (file selected) → ready (compression done) → error (compression failed)
**And** the Next button is disabled until state is `'ready'`

**Given** the user selects a file that fails type or size validation client-side
**Then** an inline error is displayed without a page reload (FR49)
**And** the error is announced via `aria-live="polite"` region (FR49)

### Story 3.7: SubmissionForm Island — Details, Submission & Nudge UX

As a contributor,
I want to fill in my place details, submit, and receive clear feedback — including a gentle nudge if my sentence doesn't connect with the previous one,
So that I understand what's expected and can revise without starting over.

**Acceptance Criteria:**

**Given** the details step of `SubmissionForm.tsx`
**Then** the sentence field displays a live character count: `{count}/250` (FR14)
**And** the count updates on every keystroke via React state
**And** the counter announces remaining characters via `aria-live="polite"` when ≤ 50 characters remain (FR49)
**And** submission is disabled when character count exceeds 250

**Given** the map picker step
**Then** `MapIsland` is rendered in pick mode allowing the contributor to place a pin (FR12)
**And** a text input fallback accepts decimal lat/lng coordinates (FR12, FR48, NFR23)
**And** the map picker is keyboard-operable via the text fallback without pointer interaction (FR47, FR48)

**Given** the submission step of the form
**Then** a visually hidden honeypot field `name="website"` is present in the DOM (FR33, Gap G3)
**And** the form records `timeOnForm` as `Date.now() - mountTimestamp` on submit (FR33, Gap G3)
**And** both values are sent as part of the multipart form body

**Given** the form is submitted successfully
**Then** the island transitions to `'success'` state and displays: *"Your place is in the queue. Thank you."* (FR18, UX-DR2)
**And** no contributor data (name, sentence, location) is echoed back in the confirmation

**Given** the API returns `CONCEPT_OVERLAP_FAILED` (HTTP 422)
**Then** the island transitions to `'nudge'` state (not `'error'`)
**And** the current place's sentence is re-displayed above the sentence input (FR16)
**And** the nudge copy reads: *"Try focusing on a feeling or image from the previous one."* (UX-DR1)
**And** the photo and other fields retain their values — the contributor only needs to revise the sentence (FR16)
**And** the nudge message is announced via `aria-live="assertive"` (FR49)

**Given** any other API error
**Then** the island transitions to `'error'` state with an appropriate message
**And** the error is announced via `aria-live="assertive"` (FR49)

**Given** a contributor abandons the form at any point
**Then** no partial record exists in D1 or R2 (FR17)
**And** no account or session is created (FR17)

---

## Epic 4: Moderation Queue & Admin

**Goal:** As the maintainer, I can review the queue, approve or reject submissions, edit metadata, seed the chain, manage reports, and pause submissions — all behind Cloudflare Access with a full audit trail.

**Covers:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR37, FR38, FR41, FR43; NFR6, NFR8, NFR12, NFR13; Architecture gaps G4, G5, G6

**Depends on:** Epic 1 (auth, audit log schema), Epic 2 (chain structure), Epic 3 (submission pipeline, R2 keys)

### Story 4.1: Admin Queue List Page

As the maintainer,
I want a fast queue page listing all pending submissions with photo, scores, and key metadata,
So that I can triage at a glance without opening individual submissions.

**Acceptance Criteria:**

**Given** `GET /admin` is requested
**Then** Cloudflare Access enforces authentication before the page loads (FR23, NFR8)
**And** an unauthenticated request receives a 401/redirect — never a 403 with page content (NFR8)

**Given** the maintainer is authenticated
**Then** `GET /api/v1/admin/queue` returns up to 50 pending submissions ordered by `created_at ASC` (FR23, NFR6)
**And** the response includes per submission: `id`, `place_name`, `contributor_name`, `sentence`, `lat_fuzzed`, `lng_fuzzed`, `face_score`, `nsfw_score`, `overlap_score`, `ai_flags_unavailable`, `overlap_degraded`, `thumb_width`, `thumb_height`, R2 thumb URL (FR24, Gap G4)
**And** image URLs use `https://images.localmatal.com/pending/{ulid}/thumb.webp` (NFR16, Gap G5)
**And** the endpoint is never accessible without auth (NFR8, NFR12)
**And** the page loads in < 3s for queues up to 50 items (NFR6)

**Given** a submission has `ai_flags_unavailable = 1`
**Then** the queue card displays "⚠ AI unavailable — manual review required" prominently (NFR17)

**Given** the queue is empty
**Then** the page displays an empty state: *"Queue is clear."*

### Story 4.2: Approve Submission

As the maintainer,
I want to approve a queued submission and make it the new current place in the chain,
So that the contributor's place is published and the chain advances.

**Acceptance Criteria:**

**Given** `POST /api/v1/admin/submissions/{id}/approve` is called
**Then** `src/routes/admin/moderation.ts` opens a D1 transaction that:
  - Sets `submissions.status = 'approved'`
  - Moves R2 objects from `pending/{ulid}/*` to `approved/{ulid}/*` (NFR27)
  - Inserts a new row into `places`: `{ id, place_name, contributor_name, sentence, lat_fuzzed, lng_fuzzed, geohash6, r2_key_prefix, thumb_width, thumb_height, prev_place_id: current_place_id }`
  - Updates `current_place.place_id` to the new place id (FR25, FR40)
  - Writes an audit log entry: `{ action: 'approve', submission_id, admin_id: 'cf-access', timestamp }` (FR43)
  - Invalidates `CURRENT_PLACE_CACHE` KV key (architecture decision)
**And** the entire operation is atomic — partial state is impossible

**Given** the approval completes
**Then** the API returns HTTP 200 with `{ id, status: 'approved' }`
**And** the new place is immediately visible on the public homepage (KV cache invalidated)

**Given** the submission has `overlap_degraded = 1` or `ai_flags_unavailable = 1`
**Then** the approval proceeds normally — human judgment overrides degraded AI (FR28)
**And** the audit log entry records `override: true` for degraded cases (FR28, FR43)

### Story 4.3: Reject Submission

As the maintainer,
I want to reject a queued submission with a categorized reason,
So that all associated files are deleted and the contributor is notified why.

**Acceptance Criteria:**

**Given** `POST /api/v1/admin/submissions/{id}/reject` is called with `{ reason: string }`
**Then** `reason` must be one of the configured rejection categories: `'face_detected' | 'nsfw_content' | 'wrong_location_type' | 'sentence_rules' | 'name_rules' | 'other'`
**And** an invalid reason returns `AppError('INVALID_REASON', ...)` with status 400

**Given** a valid rejection
**Then** `submissions.status` is set to `'rejected'` with `rejection_reason`
**And** all R2 objects under `pending/{ulid}/*` are deleted (FR26)
**And** an audit log entry is written: `{ action: 'reject', submission_id, reason, timestamp }` (FR43)
**And** if the submission has a `contributor_email` (future: optional field), Resend sends a rejection notification with the categorized reason fire-and-forget (FR38, NFR25)
**And** the API returns HTTP 200 with `{ id, status: 'rejected' }`

### Story 4.4: Edit Submission Metadata

As the maintainer,
I want to edit a submission's text fields before approving,
So that I can fix obvious typos without rejecting and asking for resubmission.

**Acceptance Criteria:**

**Given** `PATCH /api/v1/admin/submissions/{id}` is called with `{ place_name?, contributor_name?, sentence? }`
**Then** only text fields are editable — `lat_fuzzed`, `lng_fuzzed`, `status`, and all AI scores are immutable via this endpoint (FR27)
**And** `sentence` edits enforce the ≤ 250 character limit (FR27)
**And** an audit log entry is written: `{ action: 'edit', submission_id, fields_changed: [...], timestamp }` (FR43)
**And** the updated submission is returned in the response

**Given** the maintainer approves after editing
**Then** the edit audit entry precedes the approve audit entry in the log (FR43)

### Story 4.5: Seed the Chain

As the maintainer,
I want to submit a new place directly from the admin UI without going through the public submission form,
So that I can bootstrap the chain or fill a gap when organic submissions are absent.

**Acceptance Criteria:**

**Given** `POST /api/v1/admin/seed` is called with `{ place_name, contributor_name, sentence, lat, lng, imageFile }`
**Then** the image goes through the same server-side pipeline as public submissions: EXIF strip, WebP normalization, 3 R2 variants (FR29)
**And** the face and NSFW AI checks are run (FR29)
**And** the submission bypasses: Turnstile, rate limiting, concept-overlap check (FR29 — maintainer explicitly seeding)
**And** the record is inserted directly into `places` as `status = 'approved'` (skipping `submissions` table)
**And** `current_place` and KV cache are updated
**And** an audit log entry is written: `{ action: 'seed', place_id, timestamp }` (FR43)

### Story 4.6: Tombstone an Approved Place

As the maintainer,
I want to remove or tombstone an approved place from the chain,
So that the chain link topology is preserved even when a node is removed.

**Acceptance Criteria:**

**Given** `DELETE /api/v1/admin/places/{id}` is called
**Then** `places.status` is set to `'tombstoned'` — the row is never hard-deleted (FR41)
**And** R2 images for the tombstoned place are deleted (FR26 pattern)
**And** `places.prev_place_id` links are preserved — the tombstoned place's predecessor and successor remain linked through it (FR41)
**And** public navigation (previous/next) skips tombstoned places but does not 404 (FR41)
**And** the tombstoned node is rendered as a gap placeholder: *"This place has been removed."* at its perma-link (FR41)
**And** an audit log entry is written: `{ action: 'tombstone', place_id, timestamp }` (FR43)

**Given** the tombstoned place was `current_place`
**Then** `current_place` is updated to the previous non-tombstoned place
**And** KV cache is invalidated

### Story 4.7: Reports Queue

As the maintainer,
I want to view and resolve visitor-submitted reports,
So that I can act on flagged content without missing anything.

**Acceptance Criteria:**

**Given** `GET /api/v1/admin/reports` is called
**Then** all unresolved reports are returned ordered by `created_at ASC` (FR30)
**And** each report includes: `id`, `place_id`, `place_name` (joined), `reason`, `created_at`
**And** the endpoint is never accessible without auth (NFR8, NFR12)
**And** `ip_hash` from the reports table is never included in the response (NFR12)

**Given** `POST /api/v1/admin/reports/{id}/resolve` is called with `{ action: 'dismissed' | 'tombstoned' }`
**Then** `reports.resolved_at` is set and `reports.resolution` is stored (FR30)
**And** if `action = 'tombstoned'`, the associated place is tombstoned via the same logic as Story 4.6
**And** an audit log entry is written: `{ action: 'resolve_report', report_id, resolution, timestamp }` (FR43)

### Story 4.8: Pause Submissions Toggle

As the maintainer,
I want to pause new submissions without taking read-only chain pages offline,
So that I can respond to abuse spikes without disrupting readers.

**Acceptance Criteria:**

**Given** the `SUBMISSIONS_PAUSED` env var is set to `"true"` (Gap G6)
**Then** `POST /api/v1/submissions` returns HTTP 503 with `AppError('SUBMISSIONS_PAUSED', 'Submissions are temporarily paused', 503)` (NFR18)
**And** all public place pages, the gallery, and chain navigation remain fully accessible (NFR18)
**And** the admin queue and moderation endpoints remain fully accessible

**Given** the admin UI
**Then** it displays the current pause state visibly (reading `SUBMISSIONS_PAUSED` from env)
**And** includes instructions for how to toggle the env var in Cloudflare Pages dashboard

*(Note: Toggle is via Cloudflare Pages env var, not a runtime API — no attack surface for toggling production state via an endpoint.)*

---

## Epic 5: Pre-Launch Readiness

**Goal:** As the maintainer, I can launch localmatal publicly with legal coverage, discoverability, social sharing, and accessibility verified — so the product is ready for real visitors and the chain has a stable foundation.

**Covers:** FR39, FR44, FR45, FR46, FR47, FR48, FR49, FR50; NFR14, NFR19–NFR23; UX-DR3–UX-DR10; OG metadata, RSS, sitemap, robots.txt, legal pages, concept-overlap calibration, smoke test

**Depends on:** Epics 1–4 (all features must be working before pre-launch verification)

### Story 5.1: OG / Social Share Metadata

As a visitor sharing a place link,
I want the link to unfurl with the place photo, name, and sentence in social previews,
So that the chain spreads naturally through shared links.

**Acceptance Criteria:**

**Given** any place perma-link (`/place/[id]`)
**Then** the Astro page emits in `<head>`:
  - `<title>{place_name} — localmatal</title>`
  - `<meta name="description" content="{sentence}">` (FR44)
  - `<meta property="og:title" content="{place_name}">` (FR44)
  - `<meta property="og:description" content="{sentence}">` (FR44)
  - `<meta property="og:image" content="https://images.localmatal.com/approved/{ulid}/modal.webp">` (FR44)
  - `<meta property="og:url" content="https://localmatal.com/place/{id}">` (FR44)
  - `<meta name="twitter:card" content="summary_large_image">` (FR44)

**Given** the homepage (`/`)
**Then** OG metadata reflects the current place (dynamic SSR, not cached static)

**Given** a tombstoned place perma-link
**Then** OG image tag is absent and description reads *"This place has been removed."*

### Story 5.2: Sitemap & robots.txt

As a search engine,
I want a sitemap covering all approved place perma-links and a robots.txt blocking admin routes,
So that the chain is indexable and internal tooling is never crawled.

**Acceptance Criteria:**

**Given** `GET /sitemap.xml`
**Then** the sitemap is generated at build time (static) for all approved, non-tombstoned places (FR45)
**And** each entry is `<loc>https://localmatal.com/place/{id}</loc>` with `<lastmod>{approved_at}</lastmod>`
**And** the homepage `https://localmatal.com/` is included

**Given** a new place is approved after a deploy
**Then** the sitemap does not update until the next deploy (static generation — acceptable for MVP cadence)

**Given** `GET /robots.txt`
**Then** the file disallows: `/admin/*`, `/api/*` (NFR14)
**And** `Sitemap: https://localmatal.com/sitemap.xml` is present

### Story 5.3: RSS Feed

As a reader who wants async updates,
I want an RSS/Atom feed of approved places,
So that I can follow the chain from my feed reader without visiting the site.

**Acceptance Criteria:**

**Given** `GET /feed.xml`
**Then** the feed is a valid RSS 2.0 document with channel metadata: title, link, description, language
**And** it contains the 50 most recent approved, non-tombstoned places ordered by `approved_at DESC`
**And** each item includes: `<title>{place_name}</title>`, `<description>{sentence}</description>`, `<link>https://localmatal.com/place/{id}</link>`, `<pubDate>{approved_at}</pubDate>`, `<enclosure url="...modal.webp" type="image/webp">`
**And** the feed is generated server-side (SSR) so it reflects current approved places without a deploy

**Given** a tombstoned place
**Then** it is excluded from the feed

### Story 5.4: Accessibility Audit & Fixes

As any visitor,
I want the site to be fully operable by keyboard and screen reader,
So that the chain is accessible to everyone.

**Acceptance Criteria:**

**Given** all public pages (homepage, perma-link, gallery) and the submission form
**Then** all text meets WCAG 1.4.3 minimum 4.5:1 contrast ratio (NFR20)
**And** all interactive elements have a visible focus indicator (NFR21)
**And** all images have descriptive `alt` text equal to the contributor's sentence (FR46)
**And** the submission form is fully operable by keyboard — no pointer required for any step (FR47, NFR22)
**And** all dynamic feedback (character count, nudge, errors, modal open/close) is announced via `aria-live` regions without page reload (FR49)
**And** all interactive elements meet 44×44px minimum touch target size on mobile (FR50)

**Given** the map picker step in `SubmissionForm.tsx`
**Then** a contributor without pointer access can enter coordinates via the text fallback and proceed (FR48, NFR23)
**And** `MapIsland` in display mode (place pages) has `aria-label` describing the location (FR48)

**Given** an automated accessibility scan (axe-core or equivalent) runs against all public pages
**Then** zero critical or serious violations are reported (NFR19, WCAG 2.1 AA)

### Story 5.5: Legal Pages

As a visitor,
I want to read the privacy policy and terms of service,
So that I understand how my content and data are handled before submitting.

**Acceptance Criteria:**

**Given** `GET /privacy`
**Then** the page renders a privacy policy covering: data collected (none requiring login), image handling, EXIF stripping, IP hashing (not storing), location fuzzing, right-to-be-forgotten / takedown contact (FR34, FR35)

**Given** `GET /terms`
**Then** the page renders terms of service covering: content rules (outdoor places, no faces, first-person sentence), the moderation process, and the takedown contact

**Given** the submission form
**Then** a visible link to both `/privacy` and `/terms` is present before the submit button

**Given** `/privacy` and `/terms`
**Then** both pages are statically rendered with no dynamic content (no JS required to read) (NFR5)

### Story 5.6: Security Headers & CSP Verification

As the maintainer,
I want security headers and Content Security Policy verified against the production deployment,
So that there are no regressions from the baseline established in Story 1.4.

**Acceptance Criteria:**

**Given** the production deployment at `localmatal.com`
**Then** `curl -I https://localmatal.com` returns all headers set in Story 1.4: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`

**Given** the CSP header
**Then** it permits: `images.localmatal.com` for `img-src`, Cloudflare Turnstile for `script-src` and `frame-src`, OpenStreetMap tiles for `img-src`, Resend for `connect-src`
**And** it blocks: inline scripts (`'unsafe-inline'` absent from `script-src`), all other external origins

**Given** `GET /robots.txt`
**Then** response is HTTP 200 and content is as specified in Story 5.2 (regression check)

### Story 5.7: Concept-Overlap Threshold Calibration

As the maintainer,
I want the concept-overlap engine calibrated against real sentence pairs before launch,
So that the threshold passes meaningful connections and blocks unrelated ones.

**Acceptance Criteria:**

**Given** a hand-labeled test set of ≥ 50 sentence pairs, each labeled `{ passed: boolean }`
**Then** the test set covers: clear overlaps (shared emotion, shared image, shared concrete noun), clear misses, and borderline cases
**And** the set is committed to the repo at `scripts/overlap-calibration/pairs.json`

**Given** `node scripts/overlap-calibration/run.ts` is executed
**Then** it runs `conceptOverlap` against each pair using the Workers AI binding
**And** it reports: accuracy %, false positive rate, false negative rate per threshold value (0.50–0.80 in 0.05 steps)
**And** it outputs the recommended threshold to stdout

**Given** the calibration results
**Then** `OVERLAP_THRESHOLD` env var is set to the recommended value before launch
**And** the calibration results are committed to `scripts/overlap-calibration/results-{date}.json`
**And** accuracy on the test set is ≥ 80% at the chosen threshold (PRD pre-launch requirement)

### Story 5.8: Pre-Launch Smoke Test Checklist

As the maintainer,
I want a documented smoke test checklist run against production before soft launch,
So that every critical path is verified end-to-end in the real environment.

**Acceptance Criteria:**

**Given** the smoke test checklist at `scripts/smoke-test.md`
**Then** it covers: homepage loads with current place, perma-link loads, gallery loads, next/prev navigation, submission form (happy path), concept-overlap nudge (failure path), moderation queue access, approve flow, reject flow, tombstone flow, report flow, RSS feed, sitemap, robots.txt, OG metadata on a place link, and all security headers

**Given** the checklist is run against production
**Then** every item is checked and signed off before the soft-launch announcement
**And** any failures are tracked as issues before launch proceeds
