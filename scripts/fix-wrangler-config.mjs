// Post-processes dist/server/wrangler.json after astro build:
// - Deduplicates KV namespace bindings (adapter merges main+preview configs)
// - Removes placeholder bindings that have no id (e.g. SESSION added by adapter)
import { readFileSync, writeFileSync } from 'fs';

const path = 'dist/server/wrangler.json';
const config = JSON.parse(readFileSync(path, 'utf8'));

if (Array.isArray(config.kv_namespaces)) {
  const seen = new Set();
  config.kv_namespaces = config.kv_namespaces.filter((kv) => {
    if (!kv.id || seen.has(kv.binding)) return false;
    seen.add(kv.binding);
    return true;
  });
}

writeFileSync(path, JSON.stringify(config, null, 2));
console.log('✔ dist/server/wrangler.json cleaned up');
