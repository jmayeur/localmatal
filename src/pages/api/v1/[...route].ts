export const prerender = false;

import { Hono } from 'hono';
import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { reportsRouter } from '../../../routes/reports';
import { AppError } from '../../../lib/errors';

const app = new Hono<{ Bindings: Env }>().basePath('/api/v1');

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.code, message: err.message, field: err.field ?? null } },
      err.httpStatus as Parameters<typeof c.json>[1],
    );
  }
  console.error(err);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error', field: null } },
    500,
  );
});

app.route('/reports', reportsRouter);

export const ALL: APIRoute = ({ request }) => {
  return app.fetch(request, env);
};
