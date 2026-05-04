# Love of Place — Hosting & Auth Research

*Last updated: May 2026. Pricing verified via vendor docs and recent industry pricing roundups; treat exact dollar figures as point-in-time.*

## TL;DR

For a moderation-gated, image-heavy site that serves "at most hundreds of visitors a day," you can almost certainly run **Love of Place for $0/month** for a long time, with a realistic ceiling of **~$5–15/month** once you factor in a domain, a small always-on database, and a buffer for image storage growth. The dominant cost driver is not traffic — it's **how you store and deliver user-uploaded images**. Authentication, if you add it, is also effectively free at this scale on every major provider.

The most important architectural decision is *not* the host. It's deciding early where images live, because moving them later is painful.

---

## 1. Hosting: what would this actually cost?

### The shape of the workload

It helps to be concrete about what Love of Place needs from a host:

- A static (or mostly static) frontend — gallery, map, submission form, admin tool.
- A small backend surface: image upload endpoint, EXIF/face/safety checks, the "concept overlap" check, moderator approval actions.
- Persistent storage for: tag metadata (~1 KB/tag), images (~500 KB–3 MB each after compression), and a small audit log.
- Email / push notification to the moderator (you).
- Rate limiting on the upload endpoint.

At "hundreds of visitors a day" with maybe a handful of submissions per day, the entire thing is comfortably inside the free tier of every serious vendor — for compute. The variable cost is image storage and image bandwidth.

### Comparing the obvious candidates

The table below assumes a year-1 footprint of roughly 300 approved tags, ~1 MB average original image, plus a handful of generated thumbnail/optimized variants per tag. That's well under 5 GB of stored images and probably 20–50 GB/month of image bandwidth at the high end.

| Platform | Free tier signal | Where you'd hit a wall first | Realistic monthly cost at LoP scale |
|---|---|---|---|
| **Netlify Free** | 100 GB bandwidth, 300 build minutes, 125K function invocations, 1M edge function invocations, 10 GB total storage (Blobs + other), 100 form submissions, 1 team member ([Netlify pricing](https://www.netlify.com/pricing/), [Netlify Free announcement](https://www.netlify.com/blog/introducing-netlify-free-plan/)) | Form submissions cap (100/mo) if you used Netlify Forms for moderation; team members cap if you ever add a co-moderator. The free plan is hard-capped — it pauses, it doesn't overage. | **$0** — likely to stay there for year 1. |
| **Vercel Hobby** | 100 GB Fast Data Transfer, 1M function invocations, 1 GB Blob storage, 5,000 image transformations/mo. Hobby is **non-commercial only**. ([Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel pricing](https://vercel.com/pricing)) | 1 GB Blob is tiny. The non-commercial restriction matters if you ever add donations / Patreon / merch. | **$0** but cap-vulnerable on storage; first paid tier (Pro) is **$20/mo**. |
| **Cloudflare Pages + Workers** | Unlimited bandwidth. 100K Workers/Pages function requests **per day** (~3M/mo). ([Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | Workers free tier doesn't include persistent state — you'd pair with R2 (object storage), D1 (SQLite), or KV. R2 has 10 GB free/mo and **zero egress fees** in the free + paid tiers. | **$0** for compute + bandwidth. ~$0–5/mo for R2 storage if you outgrow 10 GB. |
| **Render** | Static sites: 100 GB bandwidth, 500 build min/mo, free with managed TLS. Free web services spin down after 15 min idle. ([Render free docs](https://render.com/docs/free)) | If you need an always-on backend (Node API, Postgres) you start at **$7/mo** for the Starter web service. | **$0** if you can live with cold starts on the API; **$7+/mo** if you need always-on. |
| **Fly.io** | No real free tier for new accounts since 2024 — 2-hour or 7-day trial only. ([Fly.io pricing](https://fly.io/docs/about/pricing/)) | A minimal always-on VM is ~$2/mo, more like $7–10/mo with storage and a dedicated IP. | **~$5–10/mo minimum.** Probably overkill here. |

### Recommended baseline architecture (and why)

For LoP specifically, the cleanest, cheapest, most "set it and forget it" stack at this size is:

- **Frontend + serverless functions:** Cloudflare Pages, or Netlify if you prefer a friendlier dashboard and Decap CMS-style moderation tooling.
- **Image storage:** Cloudflare R2 (10 GB free, no egress fees) **or** Backblaze B2 fronted by Cloudflare CDN (B2's bandwidth alliance with Cloudflare gives you free egress; storage is **$6/TB/mo**, so 5 GB is ~$0.03/mo). ([Backblaze B2](https://www.backblaze.com/cloud-storage/pricing))
- **Image optimization:** Cloudflare Images if you want a managed transform pipeline (5K free transforms/mo, then $0.50/1K) ([Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)). For a smaller site, you can just pre-generate two or three sizes at upload time and skip a paid transform service entirely.
- **Database:** Either Supabase Free (Postgres + 500 MB + auth in one box) or Cloudflare D1. Supabase is friendlier for moderator UIs because Postgres + Row Level Security gets you halfway to an admin tool for free. ([Supabase pricing](https://supabase.com/pricing))

**Realistic monthly all-in cost for year 1:**

- Domain registration: ~$12/year ($1/mo amortized).
- Compute + bandwidth: $0.
- Storage: $0–2 (depending on which combo above).
- Email (moderator notifications via Resend/Postmark/SES): $0 on free tier (Resend gives 3K emails/mo free, AWS SES is $0.10/1K).
- **Total: $1–3/mo amortized.** You realistically won't pay much until traffic or storage 10x's.

### Watch-outs that bite small projects

A few traps that aren't obvious until they hurt:

- **Vercel Hobby's non-commercial clause.** Even if LoP never makes money, if you ever put a "buy me a coffee" link on it, Vercel's TOS technically bumps you to Pro. Cloudflare and Netlify don't have that constraint.
- **Egress fees on AWS S3.** S3 storage is cheap, but standard egress is $0.09/GB. A modestly viral image at 50 GB of bandwidth costs ~$4.50 on S3 vs. $0 on R2/B2+Cloudflare. Don't default to S3 for user-facing images unless you front it with a CDN that has an egress agreement.
- **Hard caps vs. overage.** Netlify Free hard-pauses at the cap. Cloudflare warns but degrades gracefully. Vercel has overage protection settings. Decide which behavior you want — for a hobby project that should *never* surprise-bill you, hard-cap behavior is a feature, not a bug.
- **The image storage decision is the real lock-in.** Switching hosts is easy. Migrating thousands of image URLs in your DB is annoying. Pick the image host with intent and pin URLs to a domain you control (e.g., `images.loveofplace.example`) so you can move providers without breaking history.

### My recommendation

If you want the lowest operational ceiling and the most generous free tier: **Cloudflare Pages + R2 + D1 (or Supabase)**. It's the only stack on the table where bandwidth is genuinely uncapped at $0 and where you'll basically never pay for a viral day.

If you want the friendliest DX and the smallest "I just want to ship it" friction: **Netlify + Supabase + Cloudflare R2 for images**. You give up the unlimited bandwidth headroom but gain a more polished moderation/admin path (Supabase Studio is a free, decent moderator UI you can hide behind your own admin login).

---

## 2. Auth: is it worth adding?

### What auth actually buys you for an anti-abuse use case

The reason to add auth here isn't to track users — you've explicitly decided not to manage accounts and to keep the UX anonymous-feeling. The reason is **friction**. Even the lightest social login (one click "Continue with Google") meaningfully reduces:

- Drive-by spam from bots that won't bother to OAuth.
- Repeat offenders, because you can soft-ban a `provider:sub` ID without storing personal data.
- Mass-submission griefing, because rate limiting per identity is cheaper and more accurate than rate limiting per IP (which is brutal in the era of mobile carrier NAT and shared corporate egress).

It does **not** buy you the ability to skip moderation. Even with auth, you still need the moderator approval flow because you're filtering for *content quality and appropriateness*, not just "is this a real person."

The cost question has two sides: dollars and complexity.

### Dollar cost at LoP scale

At "hundreds of visitors a day" with maybe ~30–100 monthly active submitters, every major auth provider is **$0/month**:

| Provider | Free tier | Notes |
|---|---|---|
| **Auth0** | 25,000 MAU, unlimited social connections, custom domain, passwordless ([Auth0 pricing](https://auth0.com/pricing)) | First paid tier is $35–240/mo. Generous on signups, but gets pricey if you ever cross the threshold. |
| **Clerk** | 10K MAU on the long-standing free tier; some 2026 sources cite a 50K MRU bump. Pro is $25/mo + $0.02/MAU above 10K. ([Clerk pricing](https://clerk.com/pricing)) | Best DX of the bunch; their drop-in UI components save real time. |
| **Supabase Auth** | 50,000 MAU, OAuth providers included, comes bundled if you're already using Supabase for the database. ([Supabase pricing](https://supabase.com/pricing)) | Clear winner if you're already on Supabase — one less vendor. |
| **Auth.js (NextAuth) self-hosted** | $0 software, MIT-licensed; you pay only for the database row(s) and any verification email costs. ([Auth.js](https://authjs.dev/)) | Most flexible and cheapest at scale; highest implementation effort. |
| **Netlify Identity** | Officially deprecated in favor of an Auth0 extension; still works for legacy users. ([Netlify deprecation post](https://www.netlify.com/blog/auth0-extension-identity-changes/)) | Don't start here in 2026. |

### Complexity cost

The honest accounting:

- **Lowest effort:** Supabase Auth (if you're already using Supabase), or Clerk's drop-in `<SignIn />` component. Both are roughly half a day of work to wire up Google + GitHub + Apple, including the redirect dance.
- **Medium effort:** Auth0. More configuration screens, but the long-term ergonomics are excellent.
- **Highest effort:** Auth.js self-hosted. You're managing OAuth app registrations across providers, session storage, CSRF, and email verification yourself. Worth it only if you have strong reasons to avoid managed auth or expect to scale past free tiers.

The non-obvious complexity tax of *any* auth, regardless of provider:

- You now have an OAuth app to register with **each provider you support** (Google, Apple, GitHub, Facebook). Apple in particular is annoying — it requires a paid Apple Developer account ($99/yr) and a fairly fiddly setup. Google, GitHub, and Facebook are free.
- You need a privacy policy and terms page. Lightweight but real.
- Apple's "Sign in with Apple" rules historically required offering it if you offered any other social login; this has loosened but is worth checking before you ship.
- You're now on the hook for handling account deletion / data export requests (GDPR/CCPA). Anonymous-feeling auth doesn't get you out of this.

### A middle path worth considering

You can get **most of the spam reduction benefit with none of the auth complexity** by combining:

1. **Cloudflare Turnstile** (free CAPTCHA replacement, no user friction in most cases) on the upload form.
2. **Per-IP and per-session rate limits** at the edge (Cloudflare Workers, Netlify Edge Functions).
3. A **honeypot field + minimum time-on-page** check.
4. **EXIF stripping + a light NSFW classifier** (e.g., `nsfwjs` or a managed model) running on upload to catch the obvious stuff before a human sees it.

This stack is what most BikeTag-style sites actually run on, and it gets you ~80% of the spam protection of full auth at ~5% of the implementation cost.

### Recommendation

For Love of Place specifically, I'd phase it:

- **MVP (no login):** Turnstile + rate limiting + light NSFW autoreject + manual moderation. Zero auth dependency. Matches the BikeTag spirit of low-friction posting.
- **If/when abuse becomes a real problem:** Add **Supabase Auth** (or Clerk if you're not on Supabase) with Google + GitHub as the only initial providers. Skip Apple until you actually have a paid developer account, and skip Facebook unless you have a specific reason for it. Treat the `provider:sub` as your spam-control identity; never display anything from the OAuth profile in public UI — keep the "made-up name" UX exactly as you described it.

This phasing gives you a real escape hatch without paying complexity tax up front.

---

## 3. Additional insights worth flagging

A few things you didn't ask about that'll matter when you turn this into a PRD:

**The "concept overlap" check is the most novel and the most technically uncertain piece.** It can be done cheaply (keyword + WordNet/synonym expansion), moderately (sentence embeddings, cosine similarity threshold), or expensively-but-best (LLM-as-judge per submission, ~$0.001/check with a small model). My instinct is that an embedding-based approach using a small open model gives you the best ratio of cost to "feels magical" — but this deserves its own design pass during BMAD.

**Image moderation is half the moderation work — automate the floor.** Manual review at hundreds of submissions/month is fine. But you should still pre-filter with a no-faces detector (e.g., face count > 0 → flag) and a basic NSFW classifier so the moderator sees a queue of *candidates*, not raw uploads. This also protects *you* psychologically — moderating photos sight-unseen is the part that burns hobby maintainers out.

**EXIF data is a privacy landmine.** Phone photos contain GPS coordinates of where the photo was taken — which, for "publicly accessible places," is fine — but they also contain device/serial info and sometimes a "home" location if the photo was edited at home. Strip EXIF on upload, always. Optionally let users opt in to *using* the EXIF GPS to pre-fill the map pin.

**Geographic search is its own thing.** A flat list of tags works at 300 entries; at 3,000 you'll want a real spatial index (PostGIS in Supabase, or `geohash` columns + bounding-box queries). Worth designing the data model for this from day one even if you don't query it that way at first.

**Legal posture.** "Publicly accessible places" still includes private property visible from public space, art on private buildings, etc. A clear takedown / report-this-tag flow is mandatory. So is a Terms of Service that gives you the right to remove content unilaterally.

**Accessibility.** Image-first sites tend to skip alt text. You can require the user's "why I love this" sentence to double as alt text — that's a small but elegant detail that makes the site work for screen readers without extra UX.

---

## 4. Follow-up research topics

Worth a dedicated pass before the PRD lock-in:

1. **Concept-matching design.** Compare embeddings (`text-embedding-3-small` or open alternatives via Replicate/Together) vs. LLM-as-judge vs. keyword/synonym expansion on a corpus of 50 hand-written sentences. Pick a default threshold and a "near-miss" UX (auto-reject vs. moderator-decides-edge-cases).
2. **NSFW + face detection options.** Compare client-side (`nsfwjs`, Mediapipe Face Detection) vs. managed (AWS Rekognition, Hive, Sightengine). Client-side is free but bypassable; managed is the right call for the trust/safety floor.
3. **Decap CMS / Sveltia CMS as the moderator UI.** Git-backed CMS with a visual approve/reject flow could remove the need to build a custom admin tool.
4. **Map provider choice.** Leaflet + OpenStreetMap tiles (free, but heavy users should self-host tiles or use a paid tile provider). MapLibre + Stadia/MapTiler free tiers (~100K tile loads/mo). At LoP scale, OSM raw tiles are fine; pick a paid provider only if you need vector tiles or styled basemaps.
5. **Static export vs. SSR.** A static-with-revalidation pattern (Astro, Next.js ISR) is cheaper to host than full SSR and works fine for a gallery. Confirm the architecture supports this before choosing a framework.
6. **Backup strategy.** Even free Supabase doesn't include backups. Decide on a nightly `pg_dump` to R2/B2 if losing the tag history is unacceptable.
7. **Email deliverability.** Resend/Postmark/SES — pick one early; moderator notifications are mission-critical to the moderation flow not stalling.

---

## Sources

- [Netlify pricing](https://www.netlify.com/pricing/)
- [Introducing Netlify's Free plan](https://www.netlify.com/blog/introducing-netlify-free-plan/)
- [Netlify credit-based pricing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify Blobs pricing thread](https://answers.netlify.com/t/blobs-pricing-and-limits/119907)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel pricing](https://vercel.com/pricing)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)
- [Render free docs](https://render.com/docs/free)
- [Render: platforms with a real free tier (2026)](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)
- [Fly.io pricing](https://fly.io/docs/about/pricing/)
- [Backblaze B2 pricing](https://www.backblaze.com/cloud-storage/pricing)
- [Auth0 pricing](https://auth0.com/pricing)
- [Clerk pricing](https://clerk.com/pricing)
- [Supabase pricing](https://supabase.com/pricing)
- [Auth.js (NextAuth)](https://authjs.dev/)
- [Netlify Identity deprecation / Auth0 extension](https://www.netlify.com/blog/auth0-extension-identity-changes/)
