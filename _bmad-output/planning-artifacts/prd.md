---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
releaseMode: phased
inputDocuments:
  - loveofplace-proposal.md
  - loveofplace-tech-stack.md
  - loveofplace-research.md
briefCount: 1
researchCount: 1
brainstormingCount: 0
projectDocsCount: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: consumer_web_creative_community
  complexity: medium
  projectContext: greenfield
  domain_localmatal: localmatal.com
---

# Product Requirements Document - localmatal

**Author:** Jeffmayeur
**Date:** 2026-05-03

## Executive Summary

LocalMatal is a slow-web experience built around a single shared chain of places people love. Each entry is a photo, a place name, a contributor name, and one sentence (≤ 250 characters) explaining why that place matters. The mechanic that holds the chain together: every new submission's sentence must share at least one concept — a feeling, image, or idea — with the sentence before it. There are no profiles, no feeds, no scores, no claims. The chain is the entire product.

**Target users:** People who want to put something quiet on the internet — contributors who post once or twice a year and don't want to be found; readers who follow a shared link and stay for three or four entries; and one maintainer who spends under 30 minutes a week moderating a queue.

**Problem solved:** The modern web structurally rewards loud, fast, performative content. LocalMatal is architecturally resistant to that pattern — the UX enforces slowness, the mechanic enforces reading, and the absence of social primitives (likes, follows, scores) makes virality structurally impossible.

**Why now:** Hosting, edge compute, and AI inference have reached a point where a solo developer can build and run this for near-zero cost indefinitely. The product can exist at small scale without needing to grow to survive.

**Domain:** `localmatal.com` (beta). One global chain to start; city-scoped instances (BikeTag-style) are a named future direction, explicitly out of scope for beta.

### What Makes This Special

The chain mechanic is the differentiator. Unlike BikeTag (geography-driven scavenger hunt) or any "share a place" app (discovery + social proof), LocalMatal is about *continuity of feeling* — a thread of resonance passed between strangers. The concept-overlap check enforces this structurally: you cannot post without first reading and connecting to what came before.

Two properties compound the effect:
- **No social primitives.** No way to claim an entry, follow a contributor, or score the best place. The chain belongs to whoever is reading it now, not to those who built it.
- **Mandatory slowness.** The submission form requires a photo of a publicly accessible place, a map pin, and a sentence that connects to the previous one. There is no fast path.

The core insight: most place-sharing apps are about *finding* things. LocalMatal is about *feeling* them — and passing that feeling forward.

## Project Classification

| Field | Value |
|---|---|
| **Project Type** | Web app — static-first (Astro + Cloudflare Pages), serverless edge functions |
| **Domain** | Consumer web / creative community — user-generated content |
| **Complexity** | Medium — novel chain mechanic, ML concept-overlap check, content moderation pipeline, location privacy, accessibility requirements |
| **Project Context** | Greenfield |
| **Build model** | Solo, nights-and-weekends; beta-first, iterate on real signals |

## Success Criteria

### User Success

- **Contributor:** Submits a place, sees it enter the moderation queue, and receives no confusing error or dead end. The concept-overlap nudge — when triggered — feels helpful, not punitive. The "aha" moment: their entry appears as the new "current" and the chain continues.
- **Reader:** Lands on the homepage, understands the mechanic without instruction, and reads at least 3 entries in one visit. Success is quiet — no prompt to sign up, no notification, no next action required.
- **Maintainer:** Clears the moderation queue in under 5 minutes. Never sees content that should have been caught automatically.

### Business Success

These are intentionally small and qualitative — this product is not optimized for growth.

| Metric | Beta target | Healthy range |
|---|---|---|
| Submissions per week | > 0 | 1–10 |
| Acceptance rate post-moderation | > 70% | Indicates rules copy is clear |
| Median submission → decision time | < 24 hours | Maintainer is not bottlenecked |
| Distinct approved places at 6 months | 50+ | Chain is alive |
| Reader return visits / month | Measurable | Light analytics only, no per-user tracking |
| Maintainer moderation time / week | < 30 minutes | Automation floor is working |

Success at beta is: **the chain is alive, the maintainer isn't burned out, and at least one stranger has connected their sentence to another stranger's.**

### Technical Success

- Zero surprise bills — all-in hosting cost stays under $5/month through beta.
- Moderation queue auto-rejects faces and NSFW content before a human sees it (floor automation working).
- Concept-overlap check has a calibrated threshold — acceptance rate isn't tanking due to false rejects.
- EXIF stripped on every upload, verified.
- All approved places have stable perma-link URLs from day one.
- Daily backup cron running and verified restorable.

### Measurable Outcomes

- Acceptance rate < 70% → rules copy or concept-check threshold needs work.
- Submissions stall → chain mechanic isn't landing; investigate prompt copy.
- Moderation time > 30 min/week → automate more of the floor.
- Hosting bill spikes → image storage or bandwidth event; check R2 usage.

## User Journeys

### Journey 1: The Contributor — First Submission (Happy Path)

*Maya doesn't post much online. She's been sitting on a photo of the old cement staircase near the waterfront for three weeks — the way the light hits the algae-covered railing on gray mornings. She found LocalMatal through a link a friend shared in a group chat. The current entry is about a fig tree at the edge of a gravel parking lot.*

**Opening scene:** Maya lands on the homepage. No sign-up prompt, no menu — just the current place: a fig tree, a name, a sentence: *"The way it holds its ground between two parking spots like it forgot to ask permission."* A soft prompt below: *"Add the next place. Your sentence has to share at least one feeling, image, or idea with this one."*

**Rising action:** She taps "Add a place." The form loads. She uploads her photo — the staircase — drops a pin on the map, types "Old Harbor Steps" as the place name, "M." as her contributor name. Then she writes her sentence: *"Rusted railing, green with time, holding on the same way."*

**Concept check:** The system scores her sentence against the fig tree entry. "Holding on" echoes "holds its ground." Score passes. No nudge shown.

**Submission:** She hits submit. Turnstile resolves invisibly. A confirmation screen: *"Your place is in the queue. If it's approved, it'll become the next entry in the chain."* No email, no account, no follow-up promise. She closes the tab.

**Resolution:** 18 hours later, the maintainer approves it. Maya doesn't know — she never will unless she visits again. The chain moved forward. That's the whole arc.

**Requirements revealed:** Turnstile, EXIF strip, face/NSFW checks, concept-overlap check, confirmation screen copy, moderation queue, current-pointer flip, perma-link generation.

---

### Journey 2: The Contributor — Concept Check Fail (Edge Case)

*Dario finds LocalMatal and wants to add his photo of a mountain pass. The current entry is about a tidal pool — "the small world that fills when the water pulls back." He writes: "Summit view, clouds below, the whole range spread out."*

**Concept check nudge:** The embedding score falls below threshold. The LLM tiebreaker also finds no connecting concept — his sentence is about height and scale; the previous is about intimacy and smallness. The nudge appears: *"Try focusing on a feeling or image from the previous one"* — the previous sentence is re-displayed.

**Recovery path:** Dario re-reads the tidal pool sentence. He rewrites: *"The way the ridge holds a small pool of sky between two peaks."* New score: passes. He submits. Enters the queue.

**Alternative failure:** Dario gives up after two attempts. The form lets him abandon gracefully — no account created, no error logged against him.

**Requirements revealed:** Concept-overlap nudge UX, re-display of previous sentence, retry without re-uploading photo, graceful abandonment (no dead ends).

---

### Journey 3: The Reader — Quiet Browse

*Priya gets a link to a specific place — `/place/01HXYZ...` — from her partner. She's never heard of LocalMatal.*

**Opening scene:** She lands on a single place page: a photo of a stone wall in a village, a name, a sentence, a tiny map pin. Below it: *← previous place* and *next place →* links. No nav bar, no ads, no sign-up prompt.

**Rising action:** She clicks "← previous place." And again. And again. Four entries deep, she notices the thread — each sentence picks up a word or feeling from the one before. She didn't expect to care. She stays for seven entries.

**Resolution:** She closes the tab. She doesn't sign up. She might share the link. She might come back. The product asked nothing of her. That's a success.

**Requirements revealed:** Perma-links, next/prev navigation, standalone place page (no chrome beyond the entry), OG share card (for when her partner sent the link, it previewed correctly).

---

### Journey 4: The Maintainer — Daily Queue (Ops Path)

*You (the maintainer) get an email notification: "1 new submission in the queue."*

**Opening scene:** You click the link in the email. It takes you to `/admin` — password prompt, you're in. One card in the queue: photo, place name, contributor name, sentence, map pin, AI scores (face count: 0, NSFW: 0.04, concept score: 0.71). Green across the board.

**Decision:** Photo looks fine — an empty bench in a park. Sentence checks out. You hit "Approve." The current pointer flips. You're done in 45 seconds.

**Edge case — rejection:** A second submission: photo shows a person's face clearly visible in the foreground. Face count: 1 (should have been caught — flag this as an AI miss). You reject with reason: "Photo contains a prominent face." The R2 objects are deleted. The audit log records it.

**Edge case — edit:** A submission has a typo in the place name ("Harboor Steps"). You edit the field inline, approve. The audit log records the edit.

**Resolution:** 4 minutes total. Queue clear. Email digest set to roll up if volume exceeds 5/day.

**Requirements revealed:** Email notification with direct queue link, admin password gate, AI score display in queue, approve/reject/edit actions, audit log, R2 cleanup on rejection, rollup digest threshold config.

---

### Journey Requirements Summary

| Capability | Revealed by |
|---|---|
| Turnstile + rate limiting | Journeys 1, 2 |
| EXIF strip + face/NSFW auto-check | Journeys 1, 4 |
| Concept-overlap check + nudge UX | Journeys 1, 2 |
| Confirmation screen (no account required) | Journey 1 |
| Graceful abandonment (no dead ends) | Journey 2 |
| Perma-links + OG share card | Journeys 3, 4 |
| Next/prev chain navigation | Journey 3 |
| Standalone place page (minimal chrome) | Journey 3 |
| Email notification → queue deep-link | Journey 4 |
| Admin queue: AI scores, approve/reject/edit | Journey 4 |
| Audit log | Journey 4 |
| R2 cleanup on rejection | Journey 4 |
| Rollup digest threshold | Journey 4 |

## Domain-Specific Requirements

### Privacy & Data Handling

- **EXIF stripping is mandatory** on every upload, before the file is written to long-term R2 storage. No exceptions. The optional UX enhancement: read EXIF GPS once in the browser to pre-fill the map pin, then discard before upload.
- **Location fuzzing:** Display coordinates fuzzed by ≥ 100m by default (`location_fuzz_m` column). Maintainer can override per-entry for genuinely public landmarks. Raw coordinates are stored but never exposed in public API or page source.
- **IP addresses are never stored raw.** Rate-limit counters and audit log entries store `sha256(ip + daily_salt)` only. Salt rotates daily so hashes are not permanently linkable.
- **GDPR/CCPA baseline:** No cookies beyond a session token (Turnstile). No third-party tracking scripts. Privacy policy must state: EXIF is stripped, location is fuzzed, contributor names may be invented, here's how to request removal. Cloudflare Web Analytics is cookie-free — no consent banner required.

### Content Moderation & Legal

- **Automated floor (pre-human):** Face count > 0 → hard reject. NSFW score > threshold → hard reject. File type not in allowlist → hard reject. These rejections never reach the maintainer queue.
- **Human moderation is mandatory for all passing submissions** — nothing auto-publishes.
- **Takedown flow:** Every approved place has a "Report this place" link. Reports write to a `reports` table. Maintainer sees report count in the admin queue. Fast response policy (target: < 48h) documented in ToS.
- **Right-to-be-forgotten:** A contributor can request removal. The response: photo deleted from R2, image fields nulled in D1, sentence replaced with `[removed by contributor]`, chain link (`prev_place_id`) preserved. The gap is visible but the chain topology survives. Audit log records the removal event.
- **ToS must explicitly grant:** operator's right to remove any content unilaterally; contributor's grant of license to display the photo and sentence; no warranty of permanent availability.

### Image Upload & Processing

| Concern | Decision |
|---|---|
| Accepted formats | JPEG, PNG, WebP, HEIC |
| Hard size cap | 10 MB (enforced at Worker before processing) |
| Client-side pre-scale | Yes — max 2048px long edge, ~85% JPEG, EXIF read-then-strip in browser |
| Server-side conversion | Yes — normalize to WebP, re-strip EXIF as safety backstop |
| Generated variants | 3 sizes: thumb (400px wide), modal (1200px wide), full (2048px max) |
| Storage path | `pending/[ulid]/` on upload → promoted to `approved/[ulid]/` on moderation approval |

**Client-side pre-scaling is required** (Canvas API or `browser-image-compression` library). A typical 8 MB iPhone HEIC must be reduced to ~400–800 KB before upload for mobile UX and Worker timeout safety. GPS EXIF is read in the browser to pre-fill the map pin before stripping — never sent to the server.

**Server-side normalization** in the Worker handles: HEIC → WebP conversion, re-strip EXIF (never trust client-side strip alone), generate 3 fixed variants, write to R2 `pending/` prefix. Originals are not retained after variant generation unless storage cost is negligible.

### Technical Constraints

- **No personal data in public responses.** API endpoints never return raw IP, session hash, or full coordinates. Only fuzzed lat/lng returned in public place objects.
- **Geohash column on `places`:** Store a `geohash6` column from day one for future bounding-box queries. No PostGIS needed at D1 scale — geohash prefix matching on an index is sufficient for regional filtering.
- Image URL stability and backup retention are formally specified in NFR15 and NFR16.

### Geo-fencing Decision

**Decision: No geo-fencing at beta.** The product is intentionally global — one shared chain, any publicly accessible place on Earth. Geo-fencing would undermine the "strangers handing each other the world" premise and adds implementation complexity with no beta-phase benefit.

The moderator's judgment is the practical geo-constraint: the content rules ("outdoor, publicly accessible places") implicitly exclude indoor or private spaces without a technical enforcement layer.

Future path: city-scoped instances (BikeTag-style) would each be their own chain with their own geo bounds — that's a Vision-phase feature, not a filter on the global chain.

### Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Moderator burnout from bad content | Medium | Automated floor catches worst content; submission volume is low by design; maintainer can pause submissions without taking site down |
| Bad-faith content surviving auto-filter | Low-medium | Two-layer check (face + NSFW); nothing auto-publishes |
| GDPR removal request | Low | Tombstone flow defined above; privacy policy sets expectations |
| Photo of private property triggering takedown | Low | Takedown contact in footer; fast response policy; ToS limits liability |
| Image URL lock-in if leaving Cloudflare | Low | Custom subdomain `images.localmatal.com` from day one |
| DB loss (no backups) | Low | Daily cron backup to R2 from day one |
| Large file upload timeout on mobile | Medium | Client-side pre-scaling to < 1 MB before upload |
| HEIC format rejection on iOS | High if unhandled | HEIC in format allowlist; server-side WebP conversion |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. The Concept-Overlap Chain Mechanic**

The linking constraint — each new submission's sentence must share at least one concept (feeling, image, or idea) with the previous one — has no direct precedent in the "share a place" category. BikeTag links entries by geography (find this spot). LocalMatal links entries by *semantic resonance*. The chain is held together by meaning, not location.

This requires a real technical solution: embedding-based similarity scoring with an LLM tiebreaker for borderline cases, all running at the edge at near-zero cost. The mechanic is only possible at a hobby-project price point because of where inference costs are in 2026.

**2. Structurally Anti-Viral UX**

Most products design *toward* virality — sharing, notifications, scores. LocalMatal is architecturally designed *against* it. No profiles, no feeds, no likes, no notifications to contributors, no claim system. The product can't go viral in the conventional sense because there's no social graph to propagate through.

This is an unusual product design choice — virality resistance as a feature, not a bug — and it shapes every UX decision: no "share your submission" prompt after posting, no contributor notification on approval, no leaderboard of "most loved places."

**3. Maintainer-as-Curator Model**

The single-maintainer moderation model is intentional and load-bearing. Unlike platforms that scale moderation with ML or community flagging, LocalMatal's quality bar is a single human's aesthetic judgment. That's not a limitation — it's the point. The chain has a voice because one person decides what belongs in it. This is closer to an edited journal than a platform.

### Market Context & Competitive Landscape

| Product | Mechanic | What LocalMatal does differently |
|---|---|---|
| BikeTag | Geography scavenger hunt | No hunt — resonance, not location |
| Are.na | Curated link/image boards | No curation UI, no collections, no accounts |
| Humans of New York | Photo + story, social | No profiles, no following, no virality surface |
| Atlas Obscura | Place discovery + editorial | No discovery angle — feeling, not finding |
| Letterboxd (for places) | Logging + social proof | No logging, no scores, no social graph |

No direct competitor exists. The closest analogy is a collaborative, constraint-based creative game — played slowly, by strangers, with real places.

### Validation Approach

The concept-overlap mechanic is the single biggest technical uncertainty. Validation plan:

1. **Threshold calibration before launch:** Build a hand-labeled test set of 50–100 sentence pairs (should-pass / should-fail) and tune the embedding cosine threshold against it. Target: < 10% false rejects on obvious matches, < 5% false accepts on clearly unrelated pairs.
2. **Soft-launch signal:** Acceptance rate after moderation > 70% is the proxy for "concept check isn't blocking good submissions." If it drops below 60%, the threshold is too strict or the nudge copy isn't helping.
3. **Maintainer override as escape valve:** Moderator can approve a submission that failed the concept check if their human judgment says it fits. This creates a correction signal over time.

### Risk Mitigation

| Innovation risk | Mitigation |
|---|---|
| Concept check feels arbitrary to contributors | Nudge copy re-shows the previous sentence and gives examples of valid connection types; LLM tiebreaker generates a human-readable reason |
| Embedding threshold kills good submissions | Generous default threshold; maintainer override; calibration against real sentence pairs before launch |
| Chain goes stale (no new submissions) | Maintainer can re-seed the chain with a new entry; submission pause/resume without taking site down |
| "Anti-viral" design means no organic growth | Intentional — success metric is chain health, not user count; growth via word-of-mouth only |

## Web App Specific Requirements

### Project-Type Overview

LocalMatal is a **multi-page, static-first web app** (Astro + Cloudflare Pages) with a small set of interactive islands (submission form, map picker, admin queue). Each approved place is a discrete, server-rendered page. No client-side routing, no SPA shell, no framework runtime on read-only pages.

### Browser Support Matrix

**Supported:** Latest 2 major versions of Chrome, Firefox, Safari, Edge.

| Browser | Min version target | Notes |
|---|---|---|
| Chrome | Current − 1 | Primary dev/test target |
| Firefox | Current − 1 | |
| Safari (macOS) | Current − 1 | |
| Safari (iOS) | Current − 1 | iOS 17+; `capture="environment"` and HEIC handling verified here |
| Edge | Current − 1 | Chromium-based; Chrome coverage applies |

**Not supported:** IE11, Opera Mini, any browser > 2 versions behind. No polyfills for legacy browsers.

**iOS Safari note:** Target iOS 17+ (Safari 17) for the camera flow — `<input type="file" accept="image/*" capture="environment">` behavior and HEIC mime-type handling is consistent from iOS 17 onwards. Older versions get the standard file picker (no capture attribute) — acceptable degradation.

### Responsive Design

- **Mobile-first layout** — submission form and place pages designed for 375px viewport upward.
- Breakpoints: 375px (mobile), 768px (tablet), 1280px (desktop). No wide-canvas layouts — the product is content-narrow by design.
- Map picker: full-width on mobile, constrained max-width on desktop.
- Touch targets: minimum 44×44px on all interactive elements (WCAG 2.5.5).

### SEO Strategy

| Page | Title | Meta description | OG image |
|---|---|---|---|
| Homepage (current place) | `[Place name] — LocalMatal` | The contributor's sentence | Place photo (cropped to OG ratio) |
| Place perma-link `/place/[ulid]` | `[Place name] — LocalMatal` | The contributor's sentence | Place photo |
| Gallery | `All places — LocalMatal` | Static description | Site default image |
| Submission form | `Add a place — LocalMatal` | Static description | Site default image |

- `robots.txt` allows all approved place pages and gallery; disallows `/admin/*` and `/pending/*`.
- Sitemap generated at build time (or on-demand via Worker) covering all approved place permalinks.
- No `noindex` on approved content.

### Performance Implementation Notes

LCP and layout-shift targets are specified in NFR1–NFR4. Implementation approach: Leaflet map loads deferred on read-only pages; Turnstile is the only third-party script and loads async; thumb variant (400px) in gallery, modal variant (1200px) loaded only on modal open; `width`/`height` set from stored dimensions on all `<img>` elements.

### Accessibility Implementation Notes

WCAG 2.1 AA targets are specified in NFR19–NFR23. Key implementation decisions:

- **Alt text:** Contributor's sentence is the `<img alt>` value. Required, not optional — set at approval time, not deferred.
- **Map picker supplement:** Leaflet's keyboard accessibility is insufficient out of the box. Augment with a text input for manual lat/lng entry, visible focus ring on the map container, and an `aria-live` announcement when a pin is placed.
- **Form patterns:** All inputs labeled (not placeholder-only). Errors associated via `aria-describedby`. Concept-overlap nudge announced via `aria-live="polite"`. Modal focus managed to trap and restore on open/close.

### Implementation Considerations

- **Static rendering default:** All public pages (homepage, place pages, gallery) are pre-rendered at build time or via Cloudflare Workers ISR-style revalidation on approval. No SSR runtime cost for readers.
- **Interactive islands:** Submission form (React or Svelte island), Leaflet map (lazy-loaded island), admin queue (React island behind password gate). Each island is independently hydrated — non-interactive pages ship zero JS.
- **Perma-link URL scheme:** `/place/[ulid]` — ULID is sortable by creation time, URL-safe, and collision-resistant without a database roundtrip. Slugs are not used (place names may be non-unique or contain special characters).
- **`/` canonical:** The homepage always renders the current place. Its canonical URL is `/` — the current place's perma-link (`/place/[ulid]`) is a separate, stable URL. Both are indexable.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the smallest version that is recognizably the product. The chain must be alive, submissions must work end-to-end, and the maintainer must be able to moderate sustainably. Nothing is cut that would make the experience feel broken or incomplete.

**Resource requirements:** Solo developer, nights and weekends. ~6 weeks of focused evening/weekend work to soft-launch. No external dependencies, no team coordination overhead.

**Guiding constraint:** Every feature decision is filtered through: *does the chain work without this?* If yes, it's post-MVP.

---

### Phase 0 — Foundation (Week 1)

*The chain doesn't exist yet. This phase makes it possible.*

- Register `localmatal.com`, configure Cloudflare Pages project
- R2 bucket created with `images.localmatal.com` custom subdomain
- D1 database created, schema applied (places, current_place, events, reports tables + geohash6 column)
- Resend domain verification (DKIM/SPF) for moderator email
- Hello-world Astro deploy to Cloudflare Pages
- Daily backup Cron Trigger Worker to R2 — **required before any real data**

**Exit criteria:** A URL resolves. Email sends. DB schema exists. Backups run.

---

### Phase 1 — MVP / Beta (Weeks 2–6)

*The chain is alive. Strangers can contribute. The maintainer can moderate.*

**Core journeys supported:** All four (contributor happy path, concept-check fail/recovery, reader browse, maintainer queue).

**Must-have capabilities:**

| Capability | Notes |
|---|---|
| Public homepage — current place | Photo, place name, sentence, contributor name, map pin |
| Submission form | Mobile-first; photo upload with client-side pre-scale; map picker with fallback text input; name fields; sentence field with live char count |
| Image pipeline | HEIC/PNG/WebP/JPEG accepted; client-side pre-scale to < 1 MB; server-side WebP conversion; 3 variants (thumb/modal/full); EXIF strip |
| Automated checks | Face detection, NSFW classification (Workers AI); hard reject on failure |
| Concept-overlap check | Embeddings (`@cf/baai/bge-small-en-v1.5`) + cosine threshold; LLM tiebreaker for borderline; nudge UX on fail |
| Moderation queue `/admin` | Password-gated; AI scores displayed; approve / reject with reason / edit fields; R2 cleanup on reject |
| Chain rotation | Approved → current pointer flips; previous joins history |
| Perma-links | `/place/[ulid]` for every approved place; OG tags with photo + sentence |
| Chain navigation | Next/prev links on every place page |
| Gallery | Thumbnail grid + modal detail view |
| Report-this-place | Every place page; writes to `reports` table |
| Anti-abuse | Turnstile, IP/session rate limits, honeypot, time-on-form |
| Email notifications | Moderator email on new submission; rollup digest above 5/day threshold |
| Chain seed | Maintainer seeds first entry directly via admin |
| WCAG 2.1 AA | Alt text, keyboard nav, focus management, contrast from day one |
| Legal pages | Privacy policy, Terms of Service, takedown contact |

**Exit criteria:** Maintainer seeds the chain. One external contributor submits and gets approved. The reader can walk the chain next/prev. Maintainer clears the queue in < 5 minutes.

---

### Phase 2 — Polish (Post soft-launch, gated on signals)

*What the soft-launch of 10–20 friends surfaces. Typical candidates:*

- Mobile camera flow improvement (`capture="environment"` + orientation correction)
- OG share-card image generation (Worker compositing photo + name + sentence)
- RSS/Atom feed
- Basic search by year or approximate region (geohash bounding box)
- Right-to-be-forgotten tombstone flow (photo deleted, sentence → `[removed by contributor]`)
- Accessibility audit pass beyond baseline
- Light analytics event review (submission, approval, rejection, report counts)

**Gate:** Only build what the soft-launch reveals is actually needed.

---

### Phase 3 — Only If Needed

*Explicitly post-beta. Gated on real signals, not assumptions.*

- Optional auth (Supabase or Clerk, Google only) — only if abuse becomes a real problem
- Multi-moderator support
- Public API
- City-scoped chains (BikeTag-style local instances)
- Multi-language support (requires concept-overlap mechanic redesign)
- Native mobile app

---

### Risk Mitigation Strategy

**Technical risks:**

| Risk | Mitigation |
|---|---|
| Concept-overlap threshold too strict → low acceptance rate | Calibrate on 50–100 hand-labeled sentence pairs before launch; maintainer override available |
| HEIC conversion fails on Workers AI / `sharp` | Test HEIC → WebP pipeline explicitly in Phase 0; fallback: reject HEIC with clear error if conversion unavailable |
| D1 limits hit unexpectedly | D1 free tier: 5 GB storage, 5M row reads/day — far beyond beta scale; monitor in Cloudflare dashboard |
| Workers AI model unavailable / changed | Pin model versions (`@cf/baai/bge-small-en-v1.5`); document fallback to keyword-matching if inference unavailable |

**Market risks:**

| Risk | Mitigation |
|---|---|
| No submissions after soft-launch | Maintainer seeds 5–10 entries before inviting anyone; strong opening chain lowers the bar for first contributors |
| Chain mechanic feels arbitrary | Nudge copy improvements; maintainer override creates a "good judgment" escape valve |
| Soft-launch friends don't share | Intentional — growth by word-of-mouth is the design; not a risk to mitigate |

**Resource risks:**

| Risk | Mitigation |
|---|---|
| Phase 1 takes longer than 6 weeks | Phase 0 + moderation path (Weeks 1–3) can soft-launch with a read-only chain; submission form can follow |
| Maintainer time exceeds 30 min/week | Automation floor reduces queue; pause submissions without taking site down |

## Functional Requirements

### Chain & Place Viewing

- **FR1:** A visitor can view the current place — photo, place name, contributor name, sentence, and approximate map location — on the homepage without signing in.
- **FR2:** A visitor can navigate to any approved place in the chain via a stable perma-link URL.
- **FR3:** A visitor can walk the chain sequentially using previous and next navigation from any place page.
- **FR4:** A visitor can browse all approved places in a thumbnail gallery view.
- **FR5:** A visitor can open a gallery thumbnail to view the full place detail (photo, name, sentence, contributor, map pin) in a modal.
- **FR6:** A visitor can see the approximate geographic location of a place on a map within any place detail view.
- **FR7:** A visitor can report any approved place for review via a report link present on every place page.

### Submission & Upload

- **FR8:** A contributor can submit a new place by providing a photo, a map pin location, a place name, a contributor name, and a sentence of ≤ 250 characters.
- **FR9:** A contributor can upload a photo in JPEG, PNG, WebP, or HEIC format up to 10 MB.
- **FR10:** A contributor's photo is automatically scaled and optimized client-side before upload to reduce file size.
- **FR11:** A contributor can use their device camera directly from the submission form on supported mobile browsers.
- **FR12:** A contributor can set a map pin via an interactive map or a manual coordinate/text input fallback.
- **FR13:** A contributor's photo EXIF GPS data can optionally pre-fill the map pin location before being discarded.
- **FR14:** A contributor receives a live character count while composing their sentence.
- **FR15:** A contributor's sentence is checked against the current place's sentence for concept overlap before submission.
- **FR16:** A contributor whose sentence fails the concept-overlap check sees the previous sentence re-displayed alongside a helpful nudge, and can revise their sentence without re-uploading their photo.
- **FR17:** A contributor can abandon the submission form at any point without creating an account or partial record.
- **FR18:** A contributor receives a confirmation that their submission has entered the moderation queue upon successful submission.

### Content Moderation

- **FR19:** The system automatically rejects any submitted photo that contains a prominent human face.
- **FR20:** The system automatically rejects any submitted photo that exceeds the configured NSFW classification threshold.
- **FR21:** The system automatically rejects any submission with a disallowed file type or file size exceeding the limit.
- **FR22:** The system strips all EXIF metadata from uploaded photos server-side before storing them.
- **FR23:** The maintainer can access a password-gated moderation queue listing all submissions awaiting review.
- **FR24:** The maintainer can view each queued submission's photo, place name, contributor name, sentence, map pin, and automated check scores.
- **FR25:** The maintainer can approve a queued submission, making it the new current place in the chain.
- **FR26:** The maintainer can reject a queued submission with a categorized reason, triggering deletion of associated image files.
- **FR27:** The maintainer can edit a submission's text fields (place name, contributor name, sentence) before approving.
- **FR28:** The maintainer can override a concept-overlap check failure and approve a submission on human judgment.
- **FR29:** The maintainer can seed the chain with a new entry directly, without going through the public submission form.
- **FR30:** The maintainer can view and resolve place reports submitted by visitors.

### Anti-Abuse & Privacy

- **FR31:** The submission form presents a bot-mitigation challenge that is invisible to human users under normal conditions.
- **FR32:** The system enforces per-IP and per-session submission rate limits, blocking excessive submissions before they reach processing.
- **FR33:** The system rejects submissions that exhibit automated form-filling patterns (honeypot field or below minimum time-on-form).
- **FR34:** All approved place coordinates are displayed with a minimum location fuzz of 100 meters; raw coordinates are never exposed publicly.
- **FR35:** IP addresses are never stored in plaintext; all audit and rate-limit records use a daily-salted hash.

### Notifications & Communication

- **FR36:** The maintainer receives an email notification for each new submission entering the moderation queue, with a direct link to the queue.
- **FR37:** The maintainer can configure a rollup digest threshold so that high-volume submission periods send a single digest rather than per-submission emails.
- **FR38:** A contributor whose submission is rejected receives a notification with the categorized rejection reason.

### Data Integrity & Persistence

- **FR39:** Every approved place has a permanent, stable URL that does not change after approval.
- **FR40:** The chain maintains a linked structure where each approved place references its predecessor, preserving traversal order.
- **FR41:** Removing or tombstoning an approved place preserves the chain link topology; the gap is visible but navigation continues across it.
- **FR42:** The system performs an automated daily database backup to durable object storage.
- **FR43:** All moderation actions (approve, reject, edit, seed, override) are recorded in an append-only audit log.
- **FR44:** Each approved place page exposes structured metadata (title, description, OG image) for social sharing and search indexing.
- **FR45:** The system generates a sitemap covering all approved place perma-links.

### Accessibility & Discoverability

- **FR46:** Every place image has a descriptive text alternative equivalent to the contributor's sentence.
- **FR47:** The submission form is fully operable by keyboard without requiring pointer interaction.
- **FR48:** The map picker is usable without a pointer device via a text-based coordinate or location input fallback.
- **FR49:** Dynamic feedback on the submission form (concept-overlap nudge, character count, error messages) is announced to screen readers without page reload.
- **FR50:** All interactive elements meet minimum touch target size requirements on mobile viewports.

## Non-Functional Requirements

### Performance

- **NFR1:** The homepage and any place perma-link page achieve a Largest Contentful Paint (LCP) of < 2.5 seconds on a simulated 4G mobile connection, measured from Cloudflare edge with no cold start (static pages).
- **NFR2:** The submission form's Turnstile challenge resolves without user interaction in < 3 seconds under normal conditions.
- **NFR3:** The concept-overlap check (embedding + optional LLM tiebreaker) completes within 5 seconds of form submission, before the confirmation screen is shown.
- **NFR4:** Gallery thumbnail images (400px variant) load without causing layout shift; `width` and `height` attributes are set from stored image dimensions on every `<img>` element.
- **NFR5:** No JavaScript is required to read any approved place page or walk the chain; JS enhances but does not gate core read paths.
- **NFR6:** The admin moderation queue loads and displays all pending submissions within 3 seconds for queues of up to 50 items.

### Security & Privacy

- **NFR7:** All data in transit is encrypted via TLS 1.2 or higher (enforced by Cloudflare).
- **NFR8:** The `/admin` route and all moderation API endpoints are inaccessible without valid authentication credentials; unauthenticated requests receive a 401 or redirect with no information leakage.
- **NFR9:** EXIF metadata is stripped server-side from every uploaded image before it is written to long-term storage. Client-side stripping is an enhancement only; server-side is the authoritative step.
- **NFR10:** Public API responses and page source never expose raw GPS coordinates; only fuzzed coordinates (≥ 100m offset) are returned.
- **NFR11:** IP addresses are never persisted in plaintext. Rate-limit counters and audit log entries store only `sha256(ip + daily_salt)`; the salt rotates daily.
- **NFR12:** The `reports` table and audit log are never accessible via any public endpoint or page.
- **NFR13:** The admin password is stored as a hashed secret in Cloudflare environment variables; it is never logged or included in error responses.
- **NFR14:** `robots.txt` disallows crawling of `/admin/*`, `/pending/*`, and any internal API routes.

### Reliability

- **NFR15:** The daily D1 backup Cron Trigger runs successfully every 24 hours and writes a verifiable snapshot to R2 `backups/` with 30-day retention. A failed backup triggers a maintainer alert.
- **NFR16:** Image objects in R2 are served from a custom subdomain (`images.localmatal.com`) so that storage provider migration does not break existing URLs.
- **NFR17:** The submission pipeline is designed so that a Workers AI service interruption causes graceful degradation: uploads are accepted into `pending/` with check scores marked as unavailable, and the maintainer queue flags them for manual review rather than auto-rejecting.
- **NFR18:** The maintainer can pause new public submissions (preventing the form from accepting uploads) without taking the read-only chain pages offline.

### Accessibility

- **NFR19:** All public pages and the submission form conform to WCAG 2.1 Level AA, verified against the criteria defined in the Web App Specific Requirements section.
- **NFR20:** All text content meets a minimum contrast ratio of 4.5:1 against its background (WCAG 1.4.3).
- **NFR21:** All interactive elements have a visible focus indicator meeting WCAG 2.4.7 (Focus Visible).
- **NFR22:** The submission form is operable using only a keyboard; no interaction requires a pointer device.
- **NFR23:** The map picker degrades gracefully for keyboard and screen reader users via a text-based coordinate input alternative; the map itself is not required to complete a submission.

### Integration

- **NFR24:** Cloudflare Workers AI model versions are pinned in configuration (`@cf/baai/bge-small-en-v1.5` for embeddings, LLM tiebreaker model TBD at calibration). Model changes require explicit version bumps, not silent drift.
- **NFR25:** Resend email delivery for moderation notifications has a target delivery time of < 60 seconds from submission event. If Resend is unreachable, the submission still completes and the notification is logged for retry; it does not block the upload pipeline.
- **NFR26:** Cloudflare Turnstile token validation occurs server-side in the Worker before any upload processing begins. A failed or missing token results in an immediate 400 rejection with no further processing.
- **NFR27:** All R2 image keys follow the pattern `[status]/[ulid]/[variant].[ext]` (e.g. `approved/01HXYZ.../thumb.webp`). This naming convention is stable and documented; any change requires a migration plan.
