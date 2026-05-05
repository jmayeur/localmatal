# Pre-Launch Smoke Test Checklist

Run against **production** (`https://localmatal.com`) before soft-launch announcement.
Check each item, sign with initials and date.

---

## Public pages

- [ ] **Homepage loads** — place photo, name, sentence, contributor, map pin visible
- [ ] **Homepage OG tags** — paste URL in [opengraph.xyz](https://www.opengraph.xyz); image, title, description all correct
- [ ] **Homepage JS-disabled** — content readable without JavaScript (map island won't render — expected)
- [ ] **Place perma-link** — navigate to `/place/{id}`, photo and all text render
- [ ] **Place OG tags** — paste a place URL; `og:image` shows modal variant, not thumb
- [ ] **Tombstoned place** — manually tombstone a test place, visit its URL, confirm gap indicator shows
- [ ] **Prev/next navigation** — walk at least 3 entries; chain nav links work in both directions
- [ ] **Gallery page** — `/gallery` loads, thumbnails render, click opens modal, Escape closes it
- [ ] **Gallery modal focus trap** — Tab cycles only within modal while open; focus returns to trigger on close
- [ ] **Keyboard navigation** — Tab through homepage, place page, gallery without pointer — no stuck focus

---

## Submission flow

- [ ] **Submit form loads** — `/submit`, current sentence chain context visible
- [ ] **Photo step — mobile** — on iOS/Android, camera picker appears (verify `capture="environment"`)
- [ ] **Photo step — desktop** — file picker opens, JPEG/PNG/WebP accepted
- [ ] **Photo step — oversized file** — file > 20 MB shows inline error without page reload
- [ ] **Photo step — wrong type** — `.txt` file shows inline error
- [ ] **Happy path** — complete submission: photo → details → map → review → submit → success message
- [ ] **Concept-overlap nudge** — submit a clearly unrelated sentence (e.g., "The economy of shipping containers."); nudge state appears with previous sentence displayed
- [ ] **Bot trap — honeypot** — manually set `website` field via DevTools, submit; 400 returned
- [ ] **Turnstile visible** on review step
- [ ] **Rate limit** — submit 4 times from same IP in one day; 4th returns 429

---

## Admin queue

- [ ] **Unauthenticated `/admin`** — Cloudflare Access login page (not 403 with content)
- [ ] **Authenticated queue** — pending submission appears with thumbnail and scores
- [ ] **AI unavailable flag** — if a submission has `ai_flags_unavailable=1`, warning banner shows
- [ ] **Approve flow** — approve a submission; it disappears from queue; homepage shows new place immediately
- [ ] **Reject flow** — reject with reason; submission disappears from queue; R2 objects deleted
- [ ] **Edit flow** — edit place name; save; queue card shows updated value
- [ ] **Seed flow** — use admin seed form to add a test place; place appears on homepage
- [ ] **Reports page** — `/admin/reports` loads, unresolved reports listed
- [ ] **Dismiss report** — report disappears from list; place remains public
- [ ] **Tombstone via report** — resolve report as tombstoned; place perma-link shows gap indicator

---

## Feeds & discoverability

- [ ] **Sitemap** — `GET /sitemap.xml` returns valid XML with at least one `<url>` entry for a place
- [ ] **RSS feed** — `GET /feed.xml` returns valid RSS 2.0; paste in [W3C RSS validator](https://validator.w3.org/feed/)
- [ ] **robots.txt** — `GET /robots.txt` has `Disallow: /admin/`, `Disallow: /api/`, `Sitemap:` line

---

## Security

- [ ] **HTTPS only** — `http://localmatal.com` redirects to `https://` (Cloudflare handles)
- [ ] **Security headers** — `curl -I https://localmatal.com` shows `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`
- [ ] **CSP no violations** — open DevTools Console on homepage, gallery, submit; zero CSP violations
- [ ] **Admin API without auth** — `curl -X POST https://localmatal.com/api/v1/admin/queue` returns 401
- [ ] **Raw IP not in DB** — inspect a `submissions` row; `ip_hash` is a 64-char hex string, not an IP

---

## Accessibility spot-check

- [ ] **VoiceOver/NVDA on homepage** — headings read correctly, image alt text is contributor's sentence
- [ ] **VoiceOver on submission form** — field labels announced, error messages announced via live region
- [ ] **axe DevTools on homepage** — zero critical violations
- [ ] **axe DevTools on gallery** — zero critical violations
- [ ] **Focus indicators** — all links and buttons have visible focus ring (Tab through each page)

---

## Backup & recovery

- [ ] **Backup cron** — verify at least one backup exists in R2 under `backups/`
- [ ] **Restore test** — download latest backup, run `sqlite3 db.sqlite .tables`, confirm all 6 tables present

---

## Sign-off

| Item | Initials | Date |
|------|----------|------|
| All items checked | | |
| No blocking issues | | |
| Soft-launch approved | | |
