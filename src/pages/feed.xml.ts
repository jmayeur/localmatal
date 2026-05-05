export const prerender = false;

import type { APIRoute } from 'astro';
import { env as _env } from 'cloudflare:workers';
import { getApprovedPlaces } from '../lib/db';
import { getImageUrl } from '../lib/r2';
const env = _env as unknown as Env;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const all = await getApprovedPlaces(env.DB);
  // 50 most recent
  const places = all.slice(-50).reverse();

  const items = places.map((p) => {
    const modalUrl = p.r2_key_prefix
      ? getImageUrl(env, `${p.r2_key_prefix}/modal.webp`, origin)
      : null;
    return `  <item>
    <title>${escapeXml(p.place_name)}</title>
    <description>${escapeXml(p.sentence)}</description>
    <link>${origin}/place/${p.id}</link>
    <guid isPermaLink="true">${origin}/place/${p.id}</guid>
    <pubDate>${new Date(p.approved_at).toUTCString()}</pubDate>${
      modalUrl
        ? `\n    <enclosure url="${escapeXml(modalUrl)}" type="image/webp" length="0" />`
        : ''
    }
  </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LocalMatal</title>
    <link>${origin}</link>
    <description>A slow, kind corner of the internet where strangers hand each other a single beautiful thing about the world.</description>
    <language>en</language>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
};
