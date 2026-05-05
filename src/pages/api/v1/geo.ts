export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ request }) => {
  // Cloudflare Workers extends Request with a `.cf` object (IncomingRequestCfProperties)
  // containing city-level IP geolocation. Never stored — used only to pre-center the map.
  const cf = (request as Request & { cf?: { latitude?: string; longitude?: string } }).cf;
  const lat = cf?.latitude ? parseFloat(cf.latitude) : null;
  const lng = cf?.longitude ? parseFloat(cf.longitude) : null;

  return Response.json(
    { lat, lng },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
