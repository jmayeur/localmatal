/**
 * Minimal Cloudflare Worker that exposes a POST /embed endpoint for the
 * concept-overlap calibration script (run.ts).
 *
 * Start with:
 *   cd scripts/overlap-calibration && npx wrangler dev worker.ts --local false
 *
 * Then in another terminal:
 *   npx tsx run.ts
 */

interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/embed') {
      return new Response('Not found', { status: 404 });
    }

    const { text } = await request.json<{ text: string }>();
    if (typeof text !== 'string' || !text.trim()) {
      return new Response('Missing text', { status: 400 });
    }

    const result = await env.AI.run('@cf/baai/bge-small-en-v1.5' as Parameters<Ai['run']>[0], {
      text: [text],
    } as never) as { data: number[][] };

    return Response.json({ embedding: result.data[0] });
  },
};
