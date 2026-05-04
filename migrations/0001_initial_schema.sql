-- localmatal initial schema
-- Note: lat/lng in places and submissions store fuzzed coordinates only.
-- Raw coordinates are never written to D1 (enforced in privacy.ts).
-- Note: r2_key_prefix replaces thumb_url/modal_url/full_url from Story 1.2 spec
-- to match architecture decision and later story requirements.

-- ─── places ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS places (
  id                TEXT    PRIMARY KEY,
  prev_place_id     TEXT,
  place_name        TEXT    NOT NULL,
  contributor_name  TEXT    NOT NULL,
  sentence          TEXT    NOT NULL,
  lat               REAL    NOT NULL,
  lng               REAL    NOT NULL,
  location_fuzz_m   INTEGER NOT NULL DEFAULT 100,
  geohash6          TEXT,
  r2_key_prefix     TEXT,
  thumb_width       INTEGER,
  thumb_height      INTEGER,
  is_tombstoned     INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL,
  approved_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_places_prev_place_id ON places (prev_place_id);
CREATE INDEX IF NOT EXISTS idx_places_geohash6      ON places (geohash6);

-- ─── submissions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id                   TEXT    PRIMARY KEY,
  place_name           TEXT    NOT NULL,
  contributor_name     TEXT    NOT NULL,
  sentence             TEXT    NOT NULL,
  lat                  REAL,
  lng                  REAL,
  r2_key_prefix        TEXT,
  thumb_width          INTEGER,
  thumb_height         INTEGER,
  face_score           REAL,
  nsfw_score           REAL,
  overlap_score        REAL,
  ai_flags_unavailable INTEGER NOT NULL DEFAULT 0,
  overlap_degraded     INTEGER NOT NULL DEFAULT 0,
  status               TEXT    NOT NULL DEFAULT 'pending',
  rejection_reason     TEXT,
  submitted_at         TEXT    NOT NULL,
  ip_hash              TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);

-- ─── current_place (singleton row) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS current_place (
  id       TEXT PRIMARY KEY DEFAULT 'singleton',
  place_id TEXT
);

INSERT OR IGNORE INTO current_place (id, place_id) VALUES ('singleton', NULL);

-- ─── audit_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  action     TEXT NOT NULL,
  actor      TEXT,
  subject_id TEXT,
  details    TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_subject_id ON audit_log (subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);

-- ─── reports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  place_id    TEXT NOT NULL,
  reason      TEXT,
  ip_hash     TEXT,
  created_at  TEXT NOT NULL,
  resolved_at TEXT,
  resolution  TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_place_id    ON reports (place_id);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_at ON reports (resolved_at);

-- ─── rate_limits ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash    TEXT    NOT NULL,
  window_key TEXT    NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  last_seen  TEXT,
  PRIMARY KEY (ip_hash, window_key)
);
