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
});
