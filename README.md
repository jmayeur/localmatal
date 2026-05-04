# LocalMatal

A slow, kind corner of the internet where strangers hand each other a single beautiful thing about the world.

A contributor uploads a photo of a place they love — a tree, a coastline, a rusted bench — names it, and writes one sentence about why it moves them. To take the "current spot," a new submission's sentence must share at least one **concept** with the previous one — a thread of meaning carried forward, entry by entry.

No profiles. No feeds. No follows. No likes. The product is the chain itself.

---

## Tech stack

Built on a fully Cloudflare-native stack:

| Layer | Technology |
|---|---|
| Frontend | [Astro 6](https://astro.build) + [Preact](https://preactjs.com) islands |
| Routing / API | [Hono 4](https://hono.dev) mounted as an Astro API route |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) |
| Image storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) |
| Edge cache | [Cloudflare KV](https://developers.cloudflare.com/kv/) |
| AI checks | [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) |
| Bot protection | [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) |
| Admin auth | [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/) |
| Email | [Resend](https://resend.com) |
| Maps | [Leaflet](https://leafletjs.com) + OpenStreetMap |

---

## Quick start (local development)

### Prerequisites

- [Node.js](https://nodejs.org) 22+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed as a dev dependency)

### 1. Clone and install

```bash
git clone https://github.com/jmayeur/localmatal.git
cd localmatal
npm install
```

### 2. Configure local secrets

```bash
cp .dev.vars.example .dev.vars
```

Open `.dev.vars` and fill in your values. At minimum for local development you need:

- `TURNSTILE_SECRET_KEY` — use `1x0000000000000000000000000000000AA` (Cloudflare's always-pass test key)
- `TURNSTILE_SITE_KEY` — use `1x00000000000000000000AA` (Cloudflare's always-pass test site key)
- `IP_HASH_SALT` — any string, e.g. `local_dev_salt`
- `IMAGES_BASE_URL` — `http://localhost:8788` for local dev (or leave the default)

Everything else is optional for running read-only pages locally.

### 3. Set up the local database

```bash
npx wrangler d1 migrations apply localmatal --local
```

This creates a local SQLite database and applies the schema. You can seed a test place directly:

```bash
npx wrangler d1 execute localmatal --local --command "
INSERT INTO places (id, place_name, contributor_name, sentence, lat, lng, r2_key_prefix, is_tombstoned, created_at, approved_at)
VALUES ('01HWTEST000000000000000000', 'The Old Oak', 'A. Visitor', 'Light pours through its upper branches at dusk.', 51.5074, -0.1278, NULL, 0, datetime('now'), datetime('now'));

INSERT INTO current_place (id, place_id) VALUES ('singleton', '01HWTEST000000000000000000')
ON CONFLICT (id) DO UPDATE SET place_id = excluded.place_id;
"
```

### 4. Run the dev server

```bash
npm run dev
```

The site is available at `http://localhost:4321`.

> **Note:** The map component and gallery modal require JavaScript. The homepage and place pages render their content without JS.

### 5. Run tests

```bash
npm test
```

Tests run under `@cloudflare/vitest-pool-workers` against a local Workers runtime. The AI binding is excluded from the test environment (Workers AI requires a remote connection).

---

## Project structure

```
localmatal/
├── migrations/              # D1 schema migrations (wrangler d1)
├── public/
│   ├── _headers             # Cloudflare Pages security headers + CSP
│   ├── robots.txt
│   └── styles/global.css
├── src/
│   ├── components/          # Astro + Preact island components
│   │   ├── MapIsland.tsx    # Leaflet map (display + picker modes)
│   │   ├── GalleryModal.tsx # Focus-trapped gallery detail modal
│   │   ├── ChainNav.astro   # Prev/next chain navigation
│   │   └── ReportLink.astro # Inline report form
│   ├── layouts/Base.astro   # Shared HTML shell with OG meta
│   ├── lib/                 # Shared utilities (all tested)
│   │   ├── db.ts            # D1 typed query helpers
│   │   ├── errors.ts        # AppError + error codes
│   │   ├── kv.ts            # KV cache helpers
│   │   ├── privacy.ts       # IP hashing + coordinate fuzzing
│   │   ├── r2.ts            # R2 key builder + URL helper
│   │   └── ulid.ts          # ULID generator (Web Crypto only)
│   ├── middleware/          # Hono middleware
│   │   ├── adminAuth.ts     # Cloudflare Access header validation
│   │   └── turnstile.ts     # Turnstile token verification
│   ├── pages/
│   │   ├── index.astro      # Homepage (current place)
│   │   ├── gallery.astro    # Thumbnail gallery
│   │   ├── place/[id].astro # Place perma-link
│   │   └── api/v1/[...route].ts  # Hono entry point
│   └── routes/
│       └── reports.ts       # POST /api/v1/reports
├── workers/
│   └── backup.ts            # Daily D1 → R2 backup cron Worker
├── _bmad-output/            # Planning artifacts (PRD, architecture, epics)
├── wrangler.toml            # Cloudflare bindings + cron config
└── wrangler.test.toml       # Vitest-only config (no AI binding)
```

---

## Planning documents

The full planning artifacts for this project live in [`_bmad-output/planning-artifacts/`](./_bmad-output/planning-artifacts/):

- [`prd.md`](./_bmad-output/planning-artifacts/prd.md) — Product Requirements Document (50 FRs, 27 NFRs)
- [`architecture.md`](./_bmad-output/planning-artifacts/architecture.md) — Architecture decisions and implementation patterns
- [`epics.md`](./_bmad-output/planning-artifacts/epics.md) — Full epic and story breakdown (35 stories across 5 epics)

---

## Contributing / forking

This project was designed and built using [BMAD (Breakthrough Method of Agile AI-Driven Development)](https://github.com/bmadcode/BMAD-METHOD), a structured workflow for collaborating with AI agents on software projects — from PRD through architecture to implementation-ready stories.

If you want to extend this experience, fork it, or adapt the chain mechanic for your own project, installing BMAD is the fastest way to get up to speed with how the planning decisions were made:

```bash
# Install BMAD into your project
npx bmad-method install
```

The planning artifacts in `_bmad-output/` are the direct output of BMAD sessions and serve as living documentation for every design decision in this codebase.

---

## Deploying to Cloudflare Pages

1. Connect the repo to [Cloudflare Pages](https://pages.cloudflare.com)
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Create a D1 database, R2 bucket, and KV namespace in the Cloudflare dashboard and bind them (see `wrangler.toml` for binding names)
5. Add secrets via the Pages dashboard (mirror of `.dev.vars.example`)
6. Configure [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/) to gate `/admin/*`
7. Set `images.localmatal.com` as a custom domain on your R2 bucket

---

## License

MIT — see [LICENSE](./LICENSE).
