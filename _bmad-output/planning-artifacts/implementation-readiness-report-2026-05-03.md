---
stepsCompleted: ['step-01-document-discovery', 'step-02-prd-analysis', 'step-03-epic-coverage', 'step-04-ux-alignment', 'step-05-epic-quality', 'step-06-final-assessment']
documents:
  prd: _bmad-output/planning-artifacts/prd.md
  architecture: null
  epics: null
  ux: null
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-03
**Project:** localmatal

## PRD Analysis

### Functional Requirements (50 total)

**Chain & Place Viewing**
- FR1: A visitor can view the current place — photo, place name, contributor name, sentence, and approximate map location — on the homepage without signing in.
- FR2: A visitor can navigate to any approved place in the chain via a stable perma-link URL.
- FR3: A visitor can walk the chain sequentially using previous and next navigation from any place page.
- FR4: A visitor can browse all approved places in a thumbnail gallery view.
- FR5: A visitor can open a gallery thumbnail to view the full place detail (photo, name, sentence, contributor, map pin) in a modal.
- FR6: A visitor can see the approximate geographic location of a place on a map within any place detail view.
- FR7: A visitor can report any approved place for review via a report link present on every place page.

**Submission & Upload**
- FR8: A contributor can submit a new place by providing a photo, a map pin location, a place name, a contributor name, and a sentence of ≤ 250 characters.
- FR9: A contributor can upload a photo in JPEG, PNG, WebP, or HEIC format up to 10 MB.
- FR10: A contributor's photo is automatically scaled and optimized client-side before upload to reduce file size.
- FR11: A contributor can use their device camera directly from the submission form on supported mobile browsers.
- FR12: A contributor can set a map pin via an interactive map or a manual coordinate/text input fallback.
- FR13: A contributor's photo EXIF GPS data can optionally pre-fill the map pin location before being discarded.
- FR14: A contributor receives a live character count while composing their sentence.
- FR15: A contributor's sentence is checked against the current place's sentence for concept overlap before submission.
- FR16: A contributor whose sentence fails the concept-overlap check sees the previous sentence re-displayed alongside a helpful nudge, and can revise their sentence without re-uploading their photo.
- FR17: A contributor can abandon the submission form at any point without creating an account or partial record.
- FR18: A contributor receives a confirmation that their submission has entered the moderation queue upon successful submission.

**Content Moderation**
- FR19: The system automatically rejects any submitted photo that contains a prominent human face.
- FR20: The system automatically rejects any submitted photo that exceeds the configured NSFW classification threshold.
- FR21: The system automatically rejects any submission with a disallowed file type or file size exceeding the limit.
- FR22: The system strips all EXIF metadata from uploaded photos server-side before storing them.
- FR23: The maintainer can access a password-gated moderation queue listing all submissions awaiting review.
- FR24: The maintainer can view each queued submission's photo, place name, contributor name, sentence, map pin, and automated check scores.
- FR25: The maintainer can approve a queued submission, making it the new current place in the chain.
- FR26: The maintainer can reject a queued submission with a categorized reason, triggering deletion of associated image files.
- FR27: The maintainer can edit a submission's text fields (place name, contributor name, sentence) before approving.
- FR28: The maintainer can override a concept-overlap check failure and approve a submission on human judgment.
- FR29: The maintainer can seed the chain with a new entry directly, without going through the public submission form.
- FR30: The maintainer can view and resolve place reports submitted by visitors.

**Anti-Abuse & Privacy**
- FR31: The submission form presents a bot-mitigation challenge that is invisible to human users under normal conditions.
- FR32: The system enforces per-IP and per-session submission rate limits, blocking excessive submissions before they reach processing.
- FR33: The system rejects submissions that exhibit automated form-filling patterns (honeypot field or below minimum time-on-form).
- FR34: All approved place coordinates are displayed with a minimum location fuzz of 100 meters; raw coordinates are never exposed publicly.
- FR35: IP addresses are never stored in plaintext; all audit and rate-limit records use a daily-salted hash.

**Notifications & Communication**
- FR36: The maintainer receives an email notification for each new submission entering the moderation queue, with a direct link to the queue.
- FR37: The maintainer can configure a rollup digest threshold so that high-volume submission periods send a single digest rather than per-submission emails.
- FR38: A contributor whose submission is rejected receives a notification with the categorized rejection reason.

**Data Integrity & Persistence**
- FR39: Every approved place has a permanent, stable URL that does not change after approval.
- FR40: The chain maintains a linked structure where each approved place references its predecessor, preserving traversal order.
- FR41: Removing or tombstoning an approved place preserves the chain link topology; the gap is visible but navigation continues across it.
- FR42: The system performs an automated daily database backup to durable object storage.
- FR43: All moderation actions (approve, reject, edit, seed, override) are recorded in an append-only audit log.
- FR44: Each approved place page exposes structured metadata (title, description, OG image) for social sharing and search indexing.
- FR45: The system generates a sitemap covering all approved place perma-links.

**Accessibility & Discoverability**
- FR46: Every place image has a descriptive text alternative equivalent to the contributor's sentence.
- FR47: The submission form is fully operable by keyboard without requiring pointer interaction.
- FR48: The map picker is usable without a pointer device via a text-based coordinate or location input fallback.
- FR49: Dynamic feedback on the submission form (concept-overlap nudge, character count, error messages) is announced to screen readers without page reload.
- FR50: All interactive elements meet minimum touch target size requirements on mobile viewports.

### Non-Functional Requirements (27 total)

**Performance**
- NFR1: LCP < 2.5s on simulated 4G mobile, Cloudflare edge, static pages.
- NFR2: Turnstile challenge resolves < 3s under normal conditions.
- NFR3: Concept-overlap check completes < 5s of form submission.
- NFR4: Gallery thumbnails load without layout shift; width/height set from stored dimensions.
- NFR5: No JS required to read any place page or walk the chain.
- NFR6: Admin queue loads < 3s for queues up to 50 items.

**Security & Privacy**
- NFR7: All data in transit encrypted via TLS 1.2+.
- NFR8: /admin and moderation endpoints inaccessible without auth; 401 on unauthenticated requests.
- NFR9: EXIF stripped server-side before long-term storage; client-side strip is enhancement only.
- NFR10: Public responses never expose raw GPS; only fuzzed coordinates (≥ 100m).
- NFR11: IPs never persisted in plaintext; sha256(ip + daily_salt) only; salt rotates daily.
- NFR12: reports table and audit log never accessible via public endpoint.
- NFR13: Admin password stored as hashed secret in Cloudflare env vars; never logged.
- NFR14: robots.txt disallows /admin/*, /pending/*, internal API routes.

**Reliability**
- NFR15: Daily D1 backup Cron Trigger every 24h; R2 backups/ with 30-day retention; failed backup triggers alert.
- NFR16: Images served from images.localmatal.com (R2 custom domain) for provider-migration URL stability.
- NFR17: Workers AI interruption causes graceful degradation; uploads accepted with scores marked unavailable; maintainer queue flags for manual review.
- NFR18: Maintainer can pause submissions without taking read-only chain pages offline.

**Accessibility**
- NFR19: All public pages and submission form conform to WCAG 2.1 Level AA.
- NFR20: All text ≥ 4.5:1 contrast ratio (WCAG 1.4.3).
- NFR21: All interactive elements have visible focus indicator (WCAG 2.4.7).
- NFR22: Submission form operable by keyboard only.
- NFR23: Map picker degrades gracefully via text-based coordinate input alternative.

**Integration**
- NFR24: Workers AI model versions pinned in config; changes require explicit version bumps.
- NFR25: Resend delivery < 60s from submission event; non-blocking if unreachable.
- NFR26: Turnstile token validated server-side before any upload processing; failed token → 400.
- NFR27: R2 image keys follow pattern [status]/[ulid]/[variant].[ext]; naming convention stable.

### Additional Requirements & Constraints

- **Tech stack:** Astro + Cloudflare Pages + Workers/Hono + D1 + R2 + Workers AI + Turnstile + Resend
- **Image pipeline:** HEIC/JPEG/PNG/WebP accepted; client-side pre-scale to < 1MB; server-side WebP normalization; 3 variants (thumb 400px, modal 1200px, full 2048px)
- **Concept-overlap implementation:** Embeddings (`@cf/baai/bge-small-en-v1.5`) + cosine threshold; LLM tiebreaker for borderline cases; requires pre-launch calibration on 50–100 hand-labeled sentence pairs
- **Data model key decisions:** ULID primary keys; geohash6 column for future geo queries; prev_place_id linked list; current_place singleton table; daily-salted IP hashing
- **Geo-fencing:** Explicitly none at beta — global chain, moderator judgment is the geo-constraint
- **Domain:** localmatal.com (not yet registered); images.localmatal.com for R2 custom subdomain
- **Phased delivery:** Phase 0 (foundation), Phase 1 (MVP/beta, 6 weeks), Phase 2 (polish, signal-gated), Phase 3 (only if needed)
- **No auth at MVP:** Password-gated /admin only; optional auth (Supabase/Clerk, Google only) deferred to Phase 3 if abuse warrants it

## Epic Coverage Validation

### Coverage Matrix

No epics document exists. This is the expected state immediately after PRD completion — epics have not yet been created.

| Metric | Value |
|---|---|
| Total PRD FRs | 50 |
| FRs covered in epics | 0 |
| Coverage percentage | 0% (no epics yet) |
| Total PRD NFRs | 27 |

### Missing Requirements

All 50 FRs and 27 NFRs are unassigned. Epic breakdown is the required next step before implementation can begin.

### Suggested Epic Groupings (for epic creation)

Based on the FR capability areas in the PRD, the natural epic boundaries are:

| Suggested Epic | FRs covered |
|---|---|
| Epic 1: Foundation & Infrastructure | FR39, FR42, FR43, FR44, FR45 + NFR15–NFR16 |
| Epic 2: Public Chain & Place Viewing | FR1–FR7, FR40–FR41 |
| Epic 3: Submission Form & Image Pipeline | FR8–FR14, FR17–FR18, FR46–FR50 |
| Epic 4: Concept-Overlap Check | FR15–FR16 |
| Epic 5: Automated Safety Checks | FR19–FR22, FR31–FR35 |
| Epic 6: Moderation Queue & Admin | FR23–FR30, FR36–FR38 |
| Epic 7: Legal, SEO & Analytics | FR44–FR45 + ToS/Privacy/robots/sitemap |

## UX Alignment Assessment

### UX Document Status

**Not found.** No UX design document exists. This is expected at this stage.

### UX Implied Assessment

This is a fully user-facing web application. UX is strongly implied:

- Public homepage, place pages, gallery, modal, next/prev navigation (FR1–FR7)
- Submission form with live character count, concept-overlap nudge, map picker, camera capture (FR8–FR18)
- Admin moderation queue (FR23–FR30)
- Accessibility requirements (WCAG 2.1 AA) present throughout

### PRD UX Coverage

The PRD provides significant UX guidance in lieu of a formal UX document:

- **User journeys** (4 narrative journeys with emotional arc, copy examples, and interaction detail)
- **Web App Specific Requirements** (browser matrix, responsive breakpoints, mobile-first layout, touch targets)
- **Accessibility implementation notes** (Leaflet keyboard supplement, aria patterns, focus management)
- **Visual identity principle** captured: *"type-driven, minimal chrome, the chain is the only chrome the product has"*

### Warnings

⚠️ **UX document not yet created.** Before epic breakdown, the following UX decisions should be formalized or confirmed in a brief UX spec or wireframe:

1. **Concept-overlap nudge copy** — the exact wording shown to contributors when their sentence fails; this is the highest-stakes copy in the product and should be tested before implementation.
2. **Homepage layout** — how much of the place entry is visible above the fold on mobile; the "Add a place" CTA placement.
3. **Gallery grid vs. chain walk** — whether these are separate routes or tabs; mobile vs. desktop layout.
4. **Admin queue card design** — AI score display format; approve/reject button placement and confirmation patterns.
5. **Submission confirmation screen** — copy and what (if anything) is shown beyond the confirmation message.

These can be resolved through lightweight wireframes or documented copy decisions in a UX spec — a full design system is not required for a solo build.

## Epic Quality Review

No epics document exists. This step validated the **suggested epic groupings** proposed in the coverage section against best practices to ensure they are structured correctly before formal epic creation.

### Best Practices Pre-Validation of Suggested Epics

#### 🟢 Strengths in Proposed Structure

- All 7 suggested epics are user-value oriented (not technical milestones): "Public Chain & Place Viewing", "Submission Form", "Moderation Queue" — each delivers something a user can interact with.
- Dependency order is correct: Epic 1 (Foundation) → Epic 2 (Public viewing) → Epic 3 (Submission) → Epic 4 (Concept check) → Epic 5 (Safety checks) → Epic 6 (Moderation) → Epic 7 (Legal/SEO). Each depends only on prior epics.
- Greenfield project: Epic 1 correctly includes project setup, schema, and infrastructure as a foundation epic (acceptable for greenfield when clearly scoped to "the chain doesn't exist yet").

#### 🔴 Critical Issue to Resolve Before Epic Creation

**Epic 1 ("Foundation & Infrastructure") risks becoming a technical milestone.** The proposed exit criteria ("A URL resolves. Email sends. DB schema exists. Backups run.") is infrastructure-only with no user-facing value. Before formal epic creation, this epic needs a user story framing: *"As the maintainer, I can deploy a working skeleton and verify all infrastructure dependencies before building user-facing features."* The user here is the maintainer/developer — acceptable for a solo build if explicitly stated.

#### 🟠 Major Issues to Address at Epic Creation Time

1. **FR15/FR16 (Concept-overlap check) cannot be independently completed without FR8–FR14 (Submission form).** Epic 4 depends on Epic 3 being complete. This is a valid dependency — document it explicitly in the epic, don't silently assume it.

2. **FR38 (contributor rejection notification) appears in Epic 6 (Moderation)** but requires an email path. If Resend setup (Epic 1) is done but the submission form's confirmation path (Epic 3) is also involved, the notification flow spans epics. Clarify the notification architecture before writing stories for FR36–FR38.

3. **FR41 (tombstone flow) and FR29 (chain seed) are in scope for MVP** per the Phase 1 capability table, but they are edge-case admin operations. Ensure they land in Epic 6 stories, not deferred silently to Phase 2.

#### 🟡 Minor Concerns

- FR44 (OG metadata) and FR45 (sitemap) appear in both Epic 2 (place pages need OG tags) and Epic 7 (SEO). Assign FR44 to Epic 2 (must be in place page HTML from the start) and FR45 to Epic 7 to avoid duplication.
- The concept-overlap LLM tiebreaker (NFR24) requires model version pinning. Add a story in Epic 4 specifically for threshold calibration (the 50–100 sentence pair test set) — this is pre-launch work that has no code artifact but is a launch gate.

## Summary and Recommendations

### Overall Readiness Status

**READY FOR NEXT PHASE** — with 3 action items to address before or during epic creation.

The PRD is comprehensive, well-structured, and ready to feed into architecture and epic breakdown. No blocking issues exist. The items below are process gaps, not content gaps — the PRD itself is complete.

### Issues Summary

| Severity | Count | Category |
|---|---|---|
| 🔴 Critical | 0 | None |
| 🟠 Major | 3 | Epic structure / notification flow / tombstone placement |
| 🟡 Minor | 2 | FR44 epic assignment; calibration story |
| ⚠️ Warnings | 5 | UX decisions to confirm before implementation |

### Recommended Next Steps

**1. Create a lightweight UX spec (optional but recommended)**
Before epic breakdown, document the 5 UX decision points flagged above — particularly the concept-overlap nudge copy. A single markdown file with copy decisions and rough layout sketches is sufficient. Not blocking, but worth 1–2 hours before writing stories that depend on the exact UX.

**2. Run `/bmad-create-architecture`**
Define the Cloudflare-native architecture document: D1 schema, Worker route map, R2 key structure, Workers AI integration pattern, Hono router structure. This feeds directly into story acceptance criteria. The PRD's tech stack decisions are already made — the architecture doc formalizes them for implementation.

**3. Run `/bmad-create-epics-and-stories`**
Use the 7 suggested epic groupings as the starting structure. Apply these clarifications at creation time:
- Frame Epic 1 with a maintainer user story, not just infrastructure tasks.
- Explicitly document the Epic 3 → Epic 4 dependency (submission form must precede concept-overlap check).
- Resolve the FR36–FR38 notification flow across epics before writing stories for rejection notifications.
- Assign FR44 (OG metadata) to Epic 2, FR45 (sitemap) to Epic 7.
- Add a threshold calibration story to Epic 4 as a launch-gate task.

### PRD Quality Assessment

The PRD is production-quality for a BMAD workflow:
- **50 FRs** covering all capability areas — complete and traceable to user journeys
- **27 NFRs** with specific, measurable criteria — no vague quality statements
- **4 narrative user journeys** with clear requirements revealed
- **Phased delivery** clearly defined with exit criteria per phase
- **Domain decisions made explicitly** (geo-fencing: none; right-to-be-forgotten: tombstone; chain integrity: preserved; image pipeline: HEIC→WebP)
- **Innovation analysis** validates the concept-overlap mechanic and documents the validation plan

The PRD is ready to hand to an architect and an epic writer without clarification.

### Final Note

This assessment identified **5 action items** across 2 categories (3 epic-structure, 2 assignment). Zero blocking issues. The PRD is complete. Proceed to architecture and epic breakdown with confidence.
