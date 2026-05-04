# Love of Place — Initial Product Proposal

*A lean brief intended as input into a BMAD session, not a substitute for it. Open questions are flagged and intentionally not over-specified.*

## 1. The pitch

**Love of Place** is a tiny, slow, kind corner of the internet where strangers hand each other a single beautiful thing about the world.

A visitor uploads a photo of a place they love — a tree, a coastline, a rusted bench — names it (real or invented), and writes one sentence about why it moves them. To take the "current spot" from the previous contributor, a new submission's sentence must share at least one **concept** with the previous one — a thread of meaning carried forward, post by post. There are no profiles, no feeds, no follows, no likes, no scores. The product is the chain itself, plus a browsable history of every place anyone has loved out loud.

The closest precedent is [BikeTag](https://www.biketag.org/), which works as a low-stakes city-scale scavenger hunt. Love of Place inverts the find-it mechanic: there's no hunt. The chain is held together by *resonance between feelings*, not geography.

## 2. Why this exists

The web in 2026 rewards loud, fast, performative content. The premise of Love of Place is that there's still appetite for a place to put down something quiet — to say "I love how the sunset breaks through the upper branches" without it becoming about the poster, the algorithm, or the engagement number. The chain mechanic forces the next person to *read* and *connect*, not merely post. Even at a small scale, that's a different shape of internet from anywhere else.

## 3. Core experience (happy path)

**A first-time visitor lands on the homepage.** They see the current photo, the name the contributor gave it, the one-sentence reason, and a soft prompt: *"Add the next place. Your sentence has to share at least one feeling, image, or idea with this one."*

**They tap "Add a place."** A form asks for:

- A photo (publicly accessible places only, no prominent faces).
- A pin on a map.
- A name (theirs or the place's — invented is fine).
- A "you" name to credit (made up is fine).
- One sentence, ≤ 250 characters, about why they love it.

**They submit.** The system runs automatic safety checks (face detection, NSFW screen, EXIF strip) and a concept-overlap check against the current sentence. If the concept check passes, the submission enters the moderation queue. If it fails, the user sees a gentle nudge — *"Try focusing on a feeling or image from the previous one"* — with the previous sentence re-shown.

**A moderator (the maintainer) sees the queue.** They approve, reject with reason, or edit metadata. Approved submissions become the new "current," and the previous current moves into the gallery.

**A casual reader can browse the chain.** Two views: a linked-list "next/previous" walk through every approved place in order, or a thumbnail gallery that opens a modal with the photo, name, sentence, contributor name, and approximate location.

That's the whole product.

## 4. Personas

A small number of real people will do most of the work:

**The Contributor.** Anonymous-feeling, posts maybe once or twice a year. They'll never make an account. They want their submission to feel meaningful and to land in front of someone, but they don't want to claim it or be findable.

**The Reader.** Visits because someone shared a link, reads three or four entries, leaves quietly. May come back when reminded. Will never log in.

**The Moderator (the maintainer, you).** Cares enough about the project to spend ~5 minutes a day. Needs a fast queue, clear approve/reject paths, and protection from seeing things they shouldn't have to see.

## 5. MVP scope

The smallest thing that's recognizably the product:

- Public homepage: current place + name + sentence + contributor name + map pin.
- Submission form with photo upload, map picker, name fields, sentence field with live character count.
- Automatic checks on upload: EXIF strip, face count check (reject if any face is large/prominent), NSFW score, file size/type validation, basic image dimension normalization.
- Concept-overlap check against the current sentence (initial implementation: simplest viable, see §10).
- Moderator queue at a hidden URL, gated by a single password or admin login. Approve / reject with reason / edit fields.
- Approved submissions: rotate "current" pointer; add to history.
- Two history views: chronological linked list (next/prev arrows) and a thumbnail gallery with modal detail.
- A clear "report this place" link on every entry.
- Privacy policy, terms of service, takedown contact.

Everything else is out of scope for MVP, including: user accounts, comments, reactions, search, tags/categories, multi-language, mobile apps, push notifications, social sharing UI beyond `<meta>` tags, exports/RSS, and analytics beyond simple page-view counts.

## 6. Explicit non-goals (initial release and probably forever)

These are not features that got cut for time — they are things the product *should not be*:

- A social network. No follows, no profiles, no feeds.
- A scoreboard. No likes, points, or "best of" rankings.
- A claim system. The previous contributor doesn't lose anything when the next one posts.
- A scavenger hunt (this is the explicit divergence from BikeTag).
- A travel guide. Locations are real but the product is about the *feeling*, not finding the spot.
- A platform for self-portraits or selfies.

## 7. Content rules

In the user-facing copy and the moderator rubric:

- Photos must be of outdoor, publicly accessible places.
- No prominent faces. Distant figures are fine; portraits are not.
- Nothing the moderator wouldn't comfortably show a child.
- Sentences must be in first person about the place, ≤ 250 characters.
- Names (place name and contributor name) must not contain slurs, links, or product names.

These are also the moderator's rejection-reason categories, surfaced verbatim in the rejection email/message so contributors learn what's expected.

## 8. The "concept overlap" mechanic

The novel idea. Two design questions to resolve in BMAD:

**What counts as overlap?** A shared concrete noun ("tree," "water"), a shared sensory mode ("light," "warmth," "sound"), a shared emotion ("calm," "longing"), or all of the above? The proposal is: *any of the three*, with examples shown to users.

**How is it enforced?** Three candidate approaches, in increasing order of magic and cost:

- **Keyword + synonym expansion.** Tokenize both sentences, lemmatize, expand with WordNet, check for any overlap. Cheap, deterministic, but blind to metaphor.
- **Sentence embeddings + threshold.** Encode both sentences with a small model, compute cosine similarity, accept above a tuned threshold. Captures semantic similarity well, may struggle with the difference between *thematic* and *referential* overlap.
- **LLM-as-judge.** Send both sentences to a small model with a rubric. Most flexible and most expensive (~$0.001/check). Easiest to explain to users.

Recommendation for MVP: start with embeddings + a generous threshold; add an LLM-as-judge fallback for borderline cases. This deserves its own design pass.

## 9. Moderation flow

Every submission goes through three layers in this order:

1. **Hard automated rejects** (face detected, NSFW score over threshold, file too large, EXIF missing required fields after stripping). The user sees a generic "couldn't accept this" message.
2. **Concept-overlap gate** (see §8). Failure shows a helpful nudge and lets the user revise without re-uploading the photo.
3. **Human moderator review.** Queue UI shows photo, sentence, name, location pin, automated check scores, and a one-click approve / reject-with-reason. Moderator can edit text fields for typos but cannot rewrite content.

Approved submissions immediately become the new "current." The transition is intentionally not animated, ceremonial, or notified — it's just the next visitor's homepage.

## 10. Technical sketch (deliberately thin — for BMAD to flesh out)

Just enough to anchor the conversation:

- **Frontend:** Static-ish JS/TS app (Astro or Next.js with mostly static rendering). Leaflet + OpenStreetMap for the map.
- **Backend:** Serverless functions for uploads, concept check, moderation actions. Edge-deployed if possible for rate-limit cheapness.
- **Storage:** Object storage for images (Cloudflare R2 or Backblaze B2 + CDN), a small relational DB for tag metadata + audit log, separate moderator-only table for rejected submissions retention (for abuse pattern detection).
- **Image pipeline:** On upload, strip EXIF, run face/NSFW checks, generate 2–3 sized variants (thumbnail, modal, full), store originals with shorter retention than variants if storage cost matters.
- **Notifications:** Email to moderator on every queued item; rollup digest if volume gets noisy.
- **Anti-abuse:** Cloudflare Turnstile on the form, IP + session rate limit at the edge, honeypot field, minimum time-on-form.
- **Admin UI:** Cheapest viable. Could be a hidden route in the same app, or Supabase Studio behind an admin login, or a simple Decap-style git-backed CMS. To be decided.

See the companion research doc for vendor-specific recommendations and cost analysis.

## 11. Success metrics

Deliberately small and qualitative for a project that will not be optimized for growth:

- Submissions per week (target: > 0; healthy range likely 1–10).
- Acceptance rate after moderation (target: > 70%; lower means the rules aren't clear).
- Median time from submission to approve/reject (target: < 24h).
- Number of distinct places loved by year 1 (target: 100+).
- Reader return visits per month (light analytics; no per-user tracking).
- Maintainer time spent moderating (target: < 30 minutes/week).

If acceptance rate is low, the rules copy needs work. If submissions stall, the chain mechanic isn't landing. If moderation time balloons, automation needs investment.

## 12. Phasing

**Phase 0 — Pre-launch (1–2 weekends).** Domain, hosting account, image bucket, DB schema, hello-world deploy, takedown process, ToS, privacy policy.

**Phase 1 — MVP (target: 4–6 weekends of focused work).** Everything in §5. Soft-launch to a private group of 10–20 friends. Iterate on rules copy and concept-check threshold.

**Phase 2 — Polish.** Whatever the soft launch surfaces. Likely candidates: better mobile camera flow, share-card images for social meta tags, RSS of approved places, basic search by year/region, accessibility pass, light analytics.

**Phase 3 — Only if needed.** Optional auth (Google + GitHub via Supabase or Clerk) if abuse becomes meaningful. Public API if community asks. Multi-moderator support.

## 13. Open questions for BMAD

These are the decisions the PRD needs to make explicit. The proposal above takes loose positions on each but nothing is locked:

1. **Concept-overlap implementation and threshold tuning** (§8). The single biggest design uncertainty.
2. **Map / location precision.** Exact pin vs. fuzzed-by-100m for privacy of low-traffic places. Tension between "find this real place" and "don't help a stalker."
3. **What happens at "edge of the chain" failure modes** — e.g., contributor's sentence passes the concept gate but moderator rejects the photo; does the chain rewind to the previous sentence, or does the next contributor have to overlap the *rejected* one?
4. **Edit-after-publish?** If a moderator notices a typo a week later, can they fix it? What's the audit story?
5. **Right-to-be-forgotten.** A contributor returns and asks for their entry to be removed. Does removing a node break the chain semantics, or do we just tombstone the photo and keep the sentence?
6. **Reuse of places.** Is the same physical location allowed to appear twice from different contributors? Recommendation: yes, the sentence is the unit, not the place.
7. **Visual identity.** Type-driven, photo-led, very minimal. To be designed, but the principle is *the chain is the only chrome the product has*.
8. **Does the contributor see what the next contributor wrote?** Recommendation: no notification, no email, no push. The chain belongs to whoever is reading it now, not to those who built it.
9. **Localization.** English-only at MVP. Concept-overlap mechanic interacts oddly with multi-language; defer.
10. **Domain / branding.** "Love of Place" is the working title; check `.com` / `.place` / `.world` availability before committing.

## 14. Risks

In rough order of how likely they are to actually hurt the project:

- **Moderator burnout.** The single point of failure. Mitigations: low submission volume by design, automation floor for the worst content, ability to pause submissions without taking the site down.
- **The concept mechanic doesn't feel magical.** If the gate is too strict it's frustrating; too loose and it's pointless. This is iteration territory.
- **Bad-faith content survives the auto-filter and reaches the moderator.** Real psychological cost. Mitigations: aggressive defaults, two-stage review for borderline content, never auto-publish.
- **Legal takedown for a photo of a private space.** Low likelihood, real cost. Mitigations: clear takedown contact, fast response policy, no claims of authoritativeness.
- **Domain / vendor lock-in via image URLs.** Use a custom subdomain for image hosting from day one to keep the door open.
- **Loss of data.** Free-tier databases often skip backups. Nightly DB dump to a separate bucket from day one.
