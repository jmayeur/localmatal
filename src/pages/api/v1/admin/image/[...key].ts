export const prerender = false;

import { env as _env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

function checkAdminAuth(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Basic ')) return false;
  try {
    const decoded = atob(auth.slice(6));
    const password = decoded.split(':').slice(1).join(':');
    return password === env.ADMIN_SECRET;
  } catch {
    return false;
  }
}

export const GET: APIRoute = async ({ params, request }) => {
  const env = _env as unknown as Env;

  if (!checkAdminAuth(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="LocalMatal Admin"' },
    });
  }

  const key = params.key;
  if (!key) return new Response('Not found', { status: 404 });

  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=3600');

  return new Response(obj.body as ReadableStream, { headers });
};
