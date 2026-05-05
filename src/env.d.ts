/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

declare module '*.css' {
  const content: string;
  export default content;
}

// In @astrojs/cloudflare v13 / Astro v6, bindings are accessed via
// `import { env } from 'cloudflare:workers'` — not Astro.locals.runtime.env.
// Astro.locals.cfContext provides the ExecutionContext.

declare namespace App {
  interface Locals {
    cfContext: ExecutionContext;
  }
}

// Global env shape used by cloudflare:workers and Hono
interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  CURRENT_PLACE_CACHE: KVNamespace;
  AI: Ai;
  ASSETS: Fetcher;

  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
  RESEND_API_KEY: string;
  MAINTAINER_EMAIL: string;

  FACE_DETECTION_MODEL: string;
  NSFW_MODEL: string;
  OVERLAP_EMBEDDING_MODEL: string;
  OVERLAP_LLM_MODEL: string;

  OVERLAP_THRESHOLD: string;
  OVERLAP_LLM_THRESHOLD: string;
  SUBMISSIONS_PAUSED: string;
  DIGEST_THRESHOLD: string;
  IMAGES_BASE_URL: string;
  IP_HASH_SALT: string;
}
