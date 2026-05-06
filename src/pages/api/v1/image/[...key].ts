export const prerender = false;

import { env as _env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const env = _env as unknown as Env;
  const key = params.key ?? '';

  // Only serve approved images publicly
  if (!key.startsWith('approved/')) {
    return new Response('Not found', { status: 404 });
  }

  // Try the requested key, then fall back to common extensions (stored ext may differ)
  const stem = key.replace(/\.[^./]+$/, '');
  const obj =
    (await env.MEDIA.get(key)) ??
    (await env.MEDIA.get(`${stem}.jpeg`)) ??
    (await env.MEDIA.get(`${stem}.png`)) ??
    (await env.MEDIA.get(`${stem}.webp`));
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(obj.body as ReadableStream, { headers });
};
