/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  CURRENT_PLACE_CACHE: KVNamespace;
  AI: Ai;

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
