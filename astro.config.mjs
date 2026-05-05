import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';

export default defineConfig({
  output: 'static',
  integrations: [preact({ compat: true })],
  adapter: cloudflare({
    prerenderEnvironment: 'node',
    remoteBindings: false,
  }),
  vite: {
    optimizeDeps: {
      exclude: ['hono', '@hono/zod-validator', 'zod', 'browser-image-compression'],
    },
    ssr: {
      external: ['hono', '@hono/zod-validator', 'zod'],
    },
  },
});
