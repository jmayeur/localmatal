import { Hono } from 'hono';
import { z } from 'zod';
import { AppError, ErrorCode } from '../../lib/errors';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import {
  getSubmissionById,
  getPendingSubmissions,
  insertPlace,
  updateCurrentPlace,
  updateSubmissionStatus,
  updateSubmissionFields,
  tombstonePlace,
  getCurrentPlaceFromDb,
  getUnresolvedReports,
  resolveReport,
  insertAuditLog,
  getPlaceById,
} from '../../lib/db';
import { moveR2Prefix, getImageUrl } from '../../lib/r2';
import { deleteR2Prefix } from '../../lib/imageProcessor';
import { invalidateCurrentPlace } from '../../lib/kv';
import { encodeGeohash } from '../../lib/geohash';
import { generateUlid } from '../../lib/ulid';

export const adminRouter = new Hono<{ Bindings: Env }>();

adminRouter.use('*', adminAuthMiddleware);

// ─── GET /queue ───────────────────────────────────────────────────────────────

adminRouter.get('/queue', async (c) => {
  const subs = await getPendingSubmissions(c.env.DB);
  const items = subs.map((s) => ({
    id: s.id,
    place_name: s.place_name,
    contributor_name: s.contributor_name,
    sentence: s.sentence,
    lat: s.lat,
    lng: s.lng,
    face_score: s.face_score,
    nsfw_score: s.nsfw_score,
    overlap_score: s.overlap_score,
    ai_flags_unavailable: s.ai_flags_unavailable,
    overlap_degraded: s.overlap_degraded,
    thumb_width: s.thumb_width,
    thumb_height: s.thumb_height,
    submitted_at: s.submitted_at,
    thumb_url: s.r2_key_prefix ? getImageUrl(c.env, `${s.r2_key_prefix}/thumb.webp`) : null,
  }));
  return c.json({ submissions: items });
});

// ─── POST /submissions/:id/approve ────────────────────────────────────────────

adminRouter.post('/submissions/:id/approve', async (c) => {
  const id = c.req.param('id');
  const sub = await getSubmissionById(c.env.DB, id);
  if (!sub) throw new AppError(ErrorCode.NOT_FOUND, 'Submission not found', 404);
  if (sub.status !== 'pending') {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Submission is not pending', 400);
  }

  const actor = c.req.header('CF-Access-Authenticated-User-Email') ?? 'admin';
  const isDegraded = sub.ai_flags_unavailable || sub.overlap_degraded;
  const now = new Date().toISOString();

  // Get current place to set prev_place_id
  const currentPlace = await getCurrentPlaceFromDb(c.env.DB);
  const prevPlaceId = currentPlace?.id ?? null;

  // Move R2: pending/{id} → approved/{id}
  const approvedPrefix = `approved/${id}`;
  if (sub.r2_key_prefix) {
    await moveR2Prefix(c.env.MEDIA, sub.r2_key_prefix, approvedPrefix);
  }

  // Compute geohash from fuzzed coordinates
  const geohash6 = sub.lat && sub.lng ? encodeGeohash(sub.lat, sub.lng, 6) : null;

  // Insert place + update current_place + mark submission approved (sequential)
  const auditId = generateUlid();
  await insertPlace(c.env.DB, {
    id,
    prev_place_id: prevPlaceId,
    place_name: sub.place_name,
    contributor_name: sub.contributor_name,
    sentence: sub.sentence,
    lat: sub.lat ?? 0,
    lng: sub.lng ?? 0,
    location_fuzz_m: 100,
    geohash6,
    r2_key_prefix: approvedPrefix,
    thumb_width: sub.thumb_width,
    thumb_height: sub.thumb_height,
    created_at: sub.submitted_at,
    approved_at: now,
  });
  await updateCurrentPlace(c.env.DB, id);
  await updateSubmissionStatus(c.env.DB, id, 'approved');
  await insertAuditLog(c.env.DB, {
    id: auditId,
    action: 'approve',
    actor,
    subject_id: id,
    details: JSON.stringify({ override: isDegraded }),
    created_at: now,
  });

  // Invalidate KV cache so homepage shows new place immediately
  await invalidateCurrentPlace(c.env.CURRENT_PLACE_CACHE);

  return c.json({ id, status: 'approved' });
});

// ─── POST /submissions/:id/reject ─────────────────────────────────────────────

const REJECTION_REASONS = [
  'face_detected',
  'nsfw_content',
  'wrong_location_type',
  'sentence_rules',
  'name_rules',
  'other',
] as const;

adminRouter.post('/submissions/:id/reject', async (c) => {
  const id = c.req.param('id');
  const sub = await getSubmissionById(c.env.DB, id);
  if (!sub) throw new AppError(ErrorCode.NOT_FOUND, 'Submission not found', 404);
  if (sub.status !== 'pending') {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Submission is not pending', 400);
  }

  const body = await c.req.json<{ reason: string }>();
  if (!REJECTION_REASONS.includes(body.reason as (typeof REJECTION_REASONS)[number])) {
    throw new AppError(ErrorCode.INVALID_REASON, 'Invalid rejection reason', 400, 'reason');
  }

  const actor = c.req.header('CF-Access-Authenticated-User-Email') ?? 'admin';
  const now = new Date().toISOString();

  // Delete R2 objects
  if (sub.r2_key_prefix) {
    await deleteR2Prefix(c.env.MEDIA, sub.r2_key_prefix);
  }

  await updateSubmissionStatus(c.env.DB, id, 'rejected', body.reason);
  await insertAuditLog(c.env.DB, {
    id: generateUlid(),
    action: 'reject',
    actor,
    subject_id: id,
    details: JSON.stringify({ reason: body.reason }),
    created_at: now,
  });

  return c.json({ id, status: 'rejected' });
});

// ─── PATCH /submissions/:id ───────────────────────────────────────────────────

adminRouter.patch('/submissions/:id', async (c) => {
  const id = c.req.param('id');
  const sub = await getSubmissionById(c.env.DB, id);
  if (!sub) throw new AppError(ErrorCode.NOT_FOUND, 'Submission not found', 404);

  const schema = z.object({
    place_name: z.string().min(1).max(100).optional(),
    contributor_name: z.string().min(1).max(80).optional(),
    sentence: z.string().min(1).max(250).optional(),
  });
  const parsed = schema.safeParse(await c.req.json());
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new AppError(ErrorCode.INTERNAL_ERROR, first.message, 400, first.path[0] as string);
  }

  const fields = parsed.data;
  const changedKeys = Object.keys(fields);
  if (changedKeys.length === 0) return c.json({ id });

  const actor = c.req.header('CF-Access-Authenticated-User-Email') ?? 'admin';
  await updateSubmissionFields(c.env.DB, id, fields);
  await insertAuditLog(c.env.DB, {
    id: generateUlid(),
    action: 'edit',
    actor,
    subject_id: id,
    details: JSON.stringify({ fields_changed: changedKeys }),
    created_at: new Date().toISOString(),
  });

  const updated = await getSubmissionById(c.env.DB, id);
  return c.json({ submission: updated });
});

// ─── DELETE /places/:id (tombstone) ──────────────────────────────────────────

adminRouter.delete('/places/:id', async (c) => {
  const id = c.req.param('id');
  const place = await getPlaceById(c.env.DB, id);
  if (!place) throw new AppError(ErrorCode.NOT_FOUND, 'Place not found', 404);

  const actor = c.req.header('CF-Access-Authenticated-User-Email') ?? 'admin';
  const now = new Date().toISOString();

  // Delete R2 images
  if (place.r2_key_prefix) {
    await deleteR2Prefix(c.env.MEDIA, place.r2_key_prefix);
  }

  await tombstonePlace(c.env.DB, id);

  // If this was current_place, walk back to previous non-tombstoned place
  const current = await getCurrentPlaceFromDb(c.env.DB);
  if (!current || current.id === id) {
    // Find previous non-tombstoned place
    if (place.prev_place_id) {
      const prev = await getPlaceById(c.env.DB, place.prev_place_id);
      if (prev && !prev.is_tombstoned) {
        await updateCurrentPlace(c.env.DB, prev.id);
      } else {
        await c.env.DB.prepare(
          "UPDATE current_place SET place_id = NULL WHERE id = 'singleton'",
        ).run();
      }
    } else {
      await c.env.DB.prepare(
        "UPDATE current_place SET place_id = NULL WHERE id = 'singleton'",
      ).run();
    }
    await invalidateCurrentPlace(c.env.CURRENT_PLACE_CACHE);
  }

  await insertAuditLog(c.env.DB, {
    id: generateUlid(),
    action: 'tombstone',
    actor,
    subject_id: id,
    details: null,
    created_at: now,
  });

  return c.json({ id, status: 'tombstoned' });
});

// ─── GET /reports ─────────────────────────────────────────────────────────────

adminRouter.get('/reports', async (c) => {
  const rawReports = await getUnresolvedReports(c.env.DB);
  // Join place_name from places — do a second query to avoid raw SQL join complexity
  const reports = await Promise.all(
    rawReports.map(async (r) => {
      const place = await getPlaceById(c.env.DB, r.place_id);
      return {
        id: r.id,
        place_id: r.place_id,
        place_name: place?.place_name ?? '(unknown)',
        reason: r.reason,
        created_at: r.created_at,
        // ip_hash is intentionally omitted from admin response (NFR12)
      };
    }),
  );
  return c.json({ reports });
});

// ─── POST /reports/:id/resolve ────────────────────────────────────────────────

adminRouter.post('/reports/:id/resolve', async (c) => {
  const id = c.req.param('id');
  const schema = z.object({ action: z.enum(['dismissed', 'tombstoned']) });
  const parsed = schema.safeParse(await c.req.json());
  if (!parsed.success) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'action must be dismissed or tombstoned', 400);
  }

  const { action } = parsed.data;
  const actor = c.req.header('CF-Access-Authenticated-User-Email') ?? 'admin';

  // Get the report to find the place_id
  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
    .bind(id)
    .first<{ id: string; place_id: string; resolved_at: string | null }>();
  if (!report) throw new AppError(ErrorCode.NOT_FOUND, 'Report not found', 404);
  if (report.resolved_at)
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Report already resolved', 400);

  await resolveReport(c.env.DB, id, action);

  if (action === 'tombstoned') {
    // Reuse tombstone logic by calling the DB helper directly
    const place = await getPlaceById(c.env.DB, report.place_id);
    if (place && !place.is_tombstoned) {
      if (place.r2_key_prefix) {
        await deleteR2Prefix(c.env.MEDIA, place.r2_key_prefix);
      }
      await tombstonePlace(c.env.DB, report.place_id);
      const current = await getCurrentPlaceFromDb(c.env.DB);
      if (current?.id === report.place_id) {
        if (place.prev_place_id) {
          await updateCurrentPlace(c.env.DB, place.prev_place_id);
        } else {
          await c.env.DB.prepare(
            "UPDATE current_place SET place_id = NULL WHERE id = 'singleton'",
          ).run();
        }
        await invalidateCurrentPlace(c.env.CURRENT_PLACE_CACHE);
      }
    }
  }

  await insertAuditLog(c.env.DB, {
    id: generateUlid(),
    action: 'resolve_report',
    actor,
    subject_id: id,
    details: JSON.stringify({ action, place_id: report.place_id }),
    created_at: new Date().toISOString(),
  });

  return c.json({ id, resolution: action });
});
