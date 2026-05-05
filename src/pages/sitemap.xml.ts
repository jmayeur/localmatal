export const prerender = false;

import type { APIRoute } from 'astro';
import { env as _env } from 'cloudflare:workers';
import { getApprovedPlaces } from '../lib/db';
const env = _env as unknown as Env;

const SITE = 'https://localmatal.com';

export const GET: APIRoute = async () => {
  const places = await getApprovedPlaces(env.DB);

  const entries = places.map(
    (p) =>
      `  <url>\n    <loc>${SITE}/place/${p.id}</loc>\n    <lastmod>${p.approved_at.slice(0, 10)}</lastmod>\n  </url>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
  </url>
  <url>
    <loc>${SITE}/gallery</loc>
  </url>
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
