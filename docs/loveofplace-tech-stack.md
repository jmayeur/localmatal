# Love of Place — Technical Stack Proposal

*Companion to the product proposal. Captures the recommended stack, the anti-abuse architecture, and the open technical questions / cross-cutting concerns from the hosting research. Designed as input into a BMAD session, not as a final architecture.*

## 1. Stack at a glance

A single-vendor, all-Cloudflare stack with one optional outside vendor for transactional email. Free at this scale, no egress fees, and no fractured dashboards.

| Layer | Choice | Why |
|---|---|---|
| **Frontend framework** | Astro (with light React or Svelte islands) | Mostly-static site with a few interactive surfaces (map, upload form, admin). Astro's "ship HTML by default" model is the right fit. |
| **Hosting** | Cloudflare Pages | Free, unlimited bandwidth, native integration with Workers and R2. |
| **Backend** | Cloudflare Pages Functions / Workers (TypeScript, [Hono](https://hono.dev) router) | Same deployment as the frontend, edge-fast, pay-per-request with a generous free tier. |
| **Database** | Cloudflare D1 (SQLite at the edge) | Fits the "small relational dataset" profile exactly. Free tier covers far more than LoP will ever need. *Alternative: Supabase Postgres if you want Studio as a free moderator UI — see §10.* |
| **Object storage** | Cloudflare R2 | 10 GB free, **zero egress fees**, S3-compatible. Original images and generated variants both live here. |
| **Image transforms** | On-upload generation (sharp in a Worker, or pre-signed upload to a sidecar) — **not** Cloudflare Images | At MVP scale, paying $0.50/1K transforms is unnecessary. Generate 3 fixed sizes once, store, serve. Reconsider if dynamic transforms become valuable. |
| **Bot mitigation** | Cloudflare Turnstile | Drop-in, free, zero-friction CAPTCHA replacement. |
| **Rate limiting** | Cloudflare Rate Limiting Rules + Worker-level token bucket in KV | Edge layer for crude IP throttling, app layer for "X submissions per session per day." |
| **Image safety checks** | Cloudflare Workers AI (image classification + face detection models) | Keeps moderation inside the same vendor. Per-inference cost is trivial. |
| **Email** | Resend (or AWS SES) | Moderator queue notifications. Resend gives 3K emails/month free, plenty here. |
| **DNS + TLS** | Cloudflare | Already on the platform. |
| **Map** | Leaflet + raw OpenStreetMap tiles at MVP | Free. Switch to MapTiler/Stadia free tier if OSM tile usage policy becomes a concern. |
| **Auth (deferred)** | None at MVP. If needed: Supabase Auth or Clerk with Google + GitHub. | See §6 — auth is explicitly out of scope for v1. |

## 2. Why this shape

Three properties matter more than any individual technology choice:

**One vendor for the load-bearing pieces.** Hosting, DB, storage, AI inference, bot mitigation, DNS, and rate limiting all live in Cloudflare. That's one bill (likely $0), one dashboard, one outage surface, one set of credentials to rotate. Hobby projects die from operational tax; collapsing the surface area is the single biggest reduction.

**No egress fees, ever.** R2 is the differentiator vs. S3 here. A viral day on AWS could cost real money; on R2 it costs nothing. For a project that will not have a revenue model, predictable-zero is more important than peak-fast.

**Image URLs we own.** All images get served from a custom subdomain (e.g. `images.loveofplace.example`) routed to R2. If we ever leave Cloudflare, we move the bucket and re-point DNS — the URLs in the database don't break. This is the single architectural choice that buys the most future flexibility.

## 3. Architecture sketch

```
                                      ┌─────────────────────────────┐
                                      │   Cloudflare Pages (Astro)   │
                                      │   - Public site              │
                                      │   - Admin route (gated)      │
                                      └─────────────┬───────────────┘
                                                    │
                                                    ▼
                ┌────────────────────────────────────────────────────────┐
                │          Cloudflare Pages Functions / Workers          │
                │   (Hono routes: /api/submit, /api/moderate, /api/feed) │
                └─────┬───────────────┬──────────────┬───────────────────┘
                      │               │              │
                      ▼               ▼              ▼
               ┌────────────┐  ┌────────────┐  ┌────────────┐
               │     D1     │  │     R2     │  │ Workers AI │
               │ tag rows,  │  │  originals │  │ NSFW class,│
               │ audit log, │  │  + variants│  │ face count │
               │ rate-limit │  │            │  │            │
               │ counters   │  └────────────┘  └────────────┘
               └────────────┘
                      │
                      ▼
            ┌──────────────────┐         ┌────────────┐
            │ Resend (email)   │         │  Turnstile │
            │ moderator notify │         │  (form)    │
            └──────────────────┘         └────────────┘
```

The submission flow, end to end:

1. Browser loads the `/add` page, which mounts a Turnstile widget and a Leaflet map.
2. User picks photo, drops pin, fills name/sentence. Form submits to `POST /api/submit` with the Turnstile token.
3. Worker validates Turnstile, checks IP/session rate limits in D1, accepts the file into R2 under a temporary `pending/` prefix.
4. Worker runs sequential checks: file type & size → EXIF strip → face count via Workers AI → NSFW classification via Workers AI → concept-overlap check against current sentence (see §5).
5. If all checks pass, an audit row goes into D1 with status `awaiting_moderation`, three sized variants are generated and written to R2, and Resend sends the moderator a one-click approval email containing the queue URL.
6. Moderator clicks through, sees the queue UI, approves or rejects. On approve, the "current" pointer in D1 flips to the new tag and the previous current joins the chain history. On reject, the R2 objects are deleted and the audit row is updated with the reason.

## 4. Anti-abuse architecture (no auth)

The premise from the research doc: at LoP scale, layered friction beats account requirements. Five overlapping defenses, each cheap on its own:

**Cloudflare Turnstile** on the submission form. Invisible-to-visible challenge that filters most automated bots without the UX tax of reCAPTCHA. Validation happens server-side in the Worker before any other work runs.

**Edge rate limiting** via Cloudflare Rate Limiting Rules. Generous default — say, 5 submissions per IP per hour, 30 per day — set at the WAF layer so abusive traffic never reaches the Worker.

**Worker-layer token bucket** in D1 or KV. Per-session (cookie-derived) and per-IP counters with stricter limits than the edge. This is the layer that catches a single attacker rotating through residential proxies — IP rate limits help less, but session cookie fingerprints catch the common case.

**Honeypot field + minimum form fill time.** A hidden `<input>` named something a bot will autofill (`url`, `website`) plus a check that the form was on screen for at least a few seconds before submission. Eliminates the laziest bots for free.

**Content-floor automation.** Workers AI runs on every accepted upload before a human sees it: face count > 0 → reject; NSFW score > threshold → reject. The moderator's queue contains only submissions that already passed the floor, which is what makes manual moderation sustainable.

What this stack does **not** protect against: a determined human attacker willing to solve Turnstile, wait 10 seconds, and post one bad photo at a time. That's what the moderator queue is for. The stack's job is to ensure the queue is small enough that one person can clear it in 5 minutes a day.

If abuse becomes a real problem, the next step is **optional auth** (Supabase or Clerk) gated to "Sign in with Google" only — at that point the rate limit identity becomes `provider:sub` instead of cookie/IP, which is dramatically more accurate. Design the rate-limit interface with a swappable identity function from day one to make this a non-event.

## 5. The concept-overlap check

From the proposal: a submission's sentence must share at least one concept with the current sentence. Three implementation tracks, in order of recommended exploration:

**Track A — Embeddings + cosine threshold.** Use `@cf/baai/bge-small-en-v1.5` (or similar) on Workers AI to embed both sentences. Accept if cosine similarity ≥ a tuned threshold (likely 0.55–0.7). Cheap (~$0 at this volume), deterministic enough to debug, captures semantic similarity. Expected MVP choice.

**Track B — Keyword + WordNet expansion.** Tokenize, lemmatize, expand with WordNet synsets, accept on any overlap. Extremely cheap, fully explainable, but blind to metaphor — "the way the shore breathes" and "ocean rhythm" share no tokens. Useful as a fast-path *bypass* (auto-accept on obvious shared keywords) layered above embeddings.

**Track C — LLM-as-judge.** Send both sentences and a rubric to a small model (`@cf/meta/llama-3.1-8b-instruct` or similar on Workers AI). Most flexible, most expressive in error messages, $0.0001–0.001 per check. Best for *borderline* cases — when embeddings land between the auto-accept and auto-reject thresholds, kick to the LLM for a judgment call.

A tiered design fits well: keyword bypass → embedding score → LLM tiebreaker. All three are buildable on Workers AI with no third-party vendor.

The threshold tuning is empirical work, not architectural. Plan a calibration step where 50–100 hand-written sentence pairs (with hand-labeled "should pass / should fail") drive the threshold choice. This is a BMAD-stage decision.

## 6. Auth posture

Explicitly **deferred**. The MVP ships with no login of any kind, including for moderators (a hidden URL + a password kept in Cloudflare secrets is enough at launch). This matches the BikeTag spirit and removes a meaningful complexity tax.

The architectural commitment now is: write the rate-limit and "submitter identity" code against an interface, not against `request.ip`. When auth is added later, the swap is mechanical.

If auth becomes necessary, the recommendation is **Supabase Auth** — it brings 50K free MAU, OAuth providers built in, and a Postgres database that can replace D1 if you want consolidation. Clerk is the second choice if Supabase feels heavyweight. **Skip Apple and Facebook** for the first auth iteration; Google and GitHub cover ~95% of relevant submitters and have $0 setup cost (Apple requires a paid developer account; Facebook's app review has gotten tedious). Don't display anything from the OAuth profile in public UI — keep the made-up name UX exactly as designed.

## 7. Data model sketch

Just enough to anchor BMAD. SQLite/D1 syntax; types are illustrative.

```sql
-- A single submitted place. The moderation status flips through this row.
CREATE TABLE places (
  id              TEXT PRIMARY KEY,           -- ulid
  status          TEXT NOT NULL,              -- 'pending' | 'approved' | 'rejected'
  contributor     TEXT NOT NULL,              -- display name as given
  place_name      TEXT NOT NULL,
  sentence        TEXT NOT NULL,              -- ≤ 250 chars
  lat             REAL NOT NULL,
  lng             REAL NOT NULL,
  location_fuzz_m INTEGER DEFAULT 0,          -- privacy padding for display
  image_key       TEXT NOT NULL,              -- R2 key for the original
  variants        TEXT NOT NULL,              -- JSON: {thumb, modal, full}
  embedding       BLOB,                       -- sentence embedding for concept check
  created_at      INTEGER NOT NULL,
  approved_at     INTEGER,
  rejected_reason TEXT,
  prev_place_id   TEXT REFERENCES places(id)  -- chain link, set on approval
);

-- Singleton-ish "what's current" pointer; trivially queryable, easy to roll back.
CREATE TABLE current_place (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  place_id      TEXT NOT NULL REFERENCES places(id),
  set_at        INTEGER NOT NULL
);

-- Append-only audit / rate-limit / abuse-pattern log.
CREATE TABLE events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL,                -- 'submit' | 'approve' | 'reject' | 'report' | 'rate_block'
  place_id      TEXT,
  ip_hash       TEXT,                         -- never store raw IPs
  session_hash  TEXT,
  meta          TEXT,                         -- JSON
  created_at    INTEGER NOT NULL
);

-- Public takedown / report-this-place flow.
CREATE TABLE reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id      TEXT NOT NULL REFERENCES places(id),
  reason        TEXT NOT NULL,
  contact       TEXT,
  created_at    INTEGER NOT NULL,
  resolved_at   INTEGER
);
```

Two notes worth flagging into BMAD: storing the embedding in the `places` row (vs. recomputing on every check) trades 1.5 KB/row for a 200ms-per-submission saving. And `prev_place_id` is the chain — the gallery view is `ORDER BY approved_at DESC`, the next/prev walk is the linked list.

## 8. Moderation surface

Three options, in order of effort:

**a. Hidden admin route in the same Astro app.** A `/admin` page protected by a single shared password (Cloudflare secret), reading from D1 directly via the Worker. Smallest possible surface area, fully under our control. **Recommended for MVP.**

**b. Decap CMS or Sveltia CMS** as a git-backed moderation UI. Strong fit if we move tag metadata into a git-tracked content directory; less ideal for D1-stored data. Worth re-evaluating if the chain ever wants version history.

**c. Supabase Studio** as a free moderator UI, gated behind Supabase Auth. Only on the table if we replace D1 with Supabase Postgres. Tempting because it's basically free admin tooling out of the box.

The decision tree: start with (a), upgrade to (c) only if moderation volume or moderator-count grows past one person.

## 9. Cross-cutting concerns

The smaller-but-non-negotiable items from the research doc, captured here so they don't get lost:

**EXIF stripping is mandatory.** Every uploaded image has its EXIF removed before it ever lands in the long-lived R2 prefix. The optional UX upgrade: read EXIF GPS *once*, in the browser, to pre-fill the map pin, then strip before upload.

**Sentence-as-alt-text.** The "why I love this" sentence is exactly the right length and content for an `<img alt="">` value. Use it. Free accessibility win, no extra UX.

**Geographic search needs forethought.** At 300 tags, a flat list is fine. At 3,000, you'll want a spatial index. D1 doesn't have PostGIS, but a `geohash` column lets bounding-box queries run efficiently against an index. Decide the column now; backfill is annoying but possible.

**Location privacy.** A pin precise to 5 meters at a low-traffic location is a privacy concern. Default to 100m fuzz on display (`location_fuzz_m` column above), let the moderator override per-tag if the location is genuinely public.

**Backups.** Free-tier databases generally don't ship with backups. Schedule a daily Cron Trigger Worker that exports D1 to a `backups/` prefix in R2. Retain 30 days. Add an R2 → cold storage rotation later if it matters.

**Email deliverability.** Pick the email provider during Phase 0, not Phase 1. Resend is the path of least resistance; AWS SES is the cheapest at scale. Both require domain DNS records (DKIM, SPF) which are easier to do once than to retrofit.

**Light analytics, no personal tracking.** Cloudflare Web Analytics is free, privacy-respecting (no cookies, no fingerprinting), and gives page views and referrers. That's all the metrics LoP needs; skip Google Analytics entirely.

**Legal posture.** Clear takedown email address in the footer. ToS that gives the operator unilateral takedown rights. Privacy policy that says: we strip EXIF, we don't track readers, contributor names may be made up, here's how to request your tag removed. The `reports` table above is the technical hook for the takedown flow.

## 10. Open technical questions for BMAD

The decisions worth resolving explicitly before implementation locks in:

1. **D1 vs. Supabase Postgres.** Cleaner architecture (D1) vs. free moderator UI + future-proof for auth (Supabase). Trade-off depth probably one BMAD subtopic.
2. **Concept-check thresholds and tier ordering.** Section 5 outlines the design space; the calibration is empirical.
3. **NSFW + face detection model selection.** Workers AI has multiple candidate models; pick one and document its known failure modes (e.g., classical art, beach scenes).
4. **Image transformation strategy.** Pre-generate 3 sizes vs. integrate Cloudflare Images as the project grows. Easy to switch later.
5. **Map provider headroom.** OSM raw tiles are fine at LoP scale; document the migration path to MapTiler/Stadia if tile usage policy becomes a concern.
6. **Static export vs. ISR-style revalidation** for the gallery and the homepage. Revalidation gives a snappier "current" update; pure static gives the fastest page loads.
7. **Moderator UI floor.** Is option (a) above truly enough, or does the moderator want bulk-action features, queue filtering by AI score, etc.?
8. **Backup retention and recovery drill.** Daily backups are easy; a documented "what do I do if D1 drops" runbook is the harder thing.
9. **Analytics minimums.** Confirm Cloudflare Web Analytics is enough; resist any temptation to add per-user tracking.
10. **Domain & images subdomain decision.** Lock in `loveofplace.<tld>` and `images.<same>` early so the URL shape stays stable from day one.

## 11. Implementation order (suggested)

If we wanted to sequence the work for a solo nights-and-weekends build:

**Week 1 — foundation.** Domain, Cloudflare Pages + Workers project skeleton, R2 bucket with custom subdomain, D1 schema, Resend domain verification. Deploy a hello-world.

**Week 2 — submission path.** Astro form, Turnstile integration, R2 upload, EXIF strip, Workers AI face & NSFW checks, write to `pending/`. No moderation UI yet — submissions just land in D1.

**Week 3 — moderation path.** Hidden `/admin` with password gate, queue UI (list + detail + approve/reject), Resend notifications on new submissions, current-pointer flip on approval.

**Week 4 — public read paths.** Homepage (current place), chain walk (next/prev), gallery + modal. Map rendering. Sentence-as-alt-text.

**Week 5 — concept check + abuse layers.** Embeddings via Workers AI, threshold calibration on a hand-built test set, rate-limit counters in D1, honeypot field, time-on-form check.

**Week 6 — polish and soft launch.** ToS / privacy / takedown pages. Reports table + report flow. Daily backup cron. Cloudflare Web Analytics. Soft-share to 10–20 friends.

Phases beyond this — auth, public API, multi-moderator, etc. — are explicitly post-MVP and gated on real signals from the soft launch.

## 12. Sources

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Cloudflare reference: serverless image content management](https://developers.cloudflare.com/reference-architecture/diagrams/serverless/serverless-image-content-management/)
- [Hono framework](https://hono.dev/)
- [Astro](https://astro.build/)
- [Resend](https://resend.com/)
- [Supabase pricing](https://supabase.com/pricing)
