// Typed query helpers for all 6 D1 tables.
// INTEGER 0/1 columns that represent booleans are coerced here so callers
// never handle raw 0/1 values.

export interface Place {
  id: string;
  prev_place_id: string | null;
  place_name: string;
  contributor_name: string;
  sentence: string;
  lat: number;
  lng: number;
  location_fuzz_m: number;
  geohash6: string | null;
  r2_key_prefix: string | null;
  thumb_width: number | null;
  thumb_height: number | null;
  is_tombstoned: boolean;
  created_at: string;
  approved_at: string;
}

export interface Submission {
  id: string;
  place_name: string;
  contributor_name: string;
  sentence: string;
  lat: number | null;
  lng: number | null;
  r2_key_prefix: string | null;
  thumb_width: number | null;
  thumb_height: number | null;
  face_score: number | null;
  nsfw_score: number | null;
  overlap_score: number | null;
  ai_flags_unavailable: boolean;
  overlap_degraded: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  ip_hash: string | null;
}

export interface CurrentPlace {
  id: string;
  place_id: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string | null;
  subject_id: string | null;
  details: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  place_id: string;
  reason: string | null;
  ip_hash: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
}

export interface RateLimit {
  ip_hash: string;
  window_key: string;
  count: number;
  last_seen: string | null;
}

// ─── Coercion helpers ─────────────────────────────────────────────────────────

function coercePlace(row: Record<string, unknown>): Place {
  return { ...row, is_tombstoned: row.is_tombstoned === 1 } as Place;
}

function coerceSubmission(row: Record<string, unknown>): Submission {
  return {
    ...row,
    ai_flags_unavailable: row.ai_flags_unavailable === 1,
    overlap_degraded: row.overlap_degraded === 1,
  } as Submission;
}

// ─── Places ───────────────────────────────────────────────────────────────────

export async function getPlaceById(db: D1Database, id: string): Promise<Place | null> {
  const row = await db.prepare('SELECT * FROM places WHERE id = ?').bind(id).first();
  return row ? coercePlace(row) : null;
}

export async function getApprovedPlaces(db: D1Database): Promise<Place[]> {
  const { results } = await db
    .prepare('SELECT * FROM places WHERE is_tombstoned = 0 ORDER BY approved_at ASC')
    .all();
  return results.map(coercePlace);
}

export async function getCurrentPlaceFromDb(db: D1Database): Promise<Place | null> {
  const row = await db
    .prepare(
      `SELECT p.* FROM places p
       INNER JOIN current_place cp ON cp.place_id = p.id
       WHERE cp.id = 'singleton'`,
    )
    .first();
  return row ? coercePlace(row) : null;
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function getSubmissionById(
  db: D1Database,
  id: string,
): Promise<Submission | null> {
  const row = await db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
  return row ? coerceSubmission(row) : null;
}

export async function getPendingSubmissions(db: D1Database): Promise<Submission[]> {
  const { results } = await db
    .prepare("SELECT * FROM submissions WHERE status = 'pending' ORDER BY submitted_at ASC")
    .all();
  return results.map(coerceSubmission);
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function insertAuditLog(
  db: D1Database,
  entry: Omit<AuditLog, 'created_at'> & { created_at?: string },
): Promise<void> {
  const created_at = entry.created_at ?? new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO audit_log (id, action, actor, subject_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(entry.id, entry.action, entry.actor ?? null, entry.subject_id ?? null, entry.details ?? null, created_at)
    .run();
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getUnresolvedReports(db: D1Database): Promise<Report[]> {
  const { results } = await db
    .prepare('SELECT * FROM reports WHERE resolved_at IS NULL ORDER BY created_at ASC')
    .all();
  return results as unknown as Report[];
}

// ─── Rate limits ──────────────────────────────────────────────────────────────

export async function getRateLimit(
  db: D1Database,
  ipHash: string,
  windowKey: string,
): Promise<RateLimit | null> {
  const row = await db
    .prepare('SELECT * FROM rate_limits WHERE ip_hash = ? AND window_key = ?')
    .bind(ipHash, windowKey)
    .first();
  return row as RateLimit | null;
}

export async function upsertRateLimit(
  db: D1Database,
  ipHash: string,
  windowKey: string,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO rate_limits (ip_hash, window_key, count, last_seen)
       VALUES (?, ?, 1, ?)
       ON CONFLICT (ip_hash, window_key)
       DO UPDATE SET count = count + 1, last_seen = excluded.last_seen`,
    )
    .bind(ipHash, windowKey, new Date().toISOString())
    .run();
  const updated = await db
    .prepare('SELECT count FROM rate_limits WHERE ip_hash = ? AND window_key = ?')
    .bind(ipHash, windowKey)
    .first<{ count: number }>();
  return updated?.count ?? 1;
}
