/**
 * Concept-overlap calibration script.
 *
 * Run against a real Workers AI binding via `wrangler dev`:
 *   npx wrangler dev scripts/overlap-calibration/worker.ts --local false
 *
 * Or execute directly with a remote binding:
 *   npx wrangler dev scripts/overlap-calibration/worker.ts
 *
 * Outputs accuracy per threshold step and writes results to:
 *   scripts/overlap-calibration/results-{date}.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Pair {
  a: string;
  b: string;
  passed: boolean;
  label: string;
}

interface ThresholdResult {
  threshold: number;
  accuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  correct: number;
  total: number;
}

// Minimal cosine similarity (mirrors conceptOverlap.ts)
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function fetchEmbedding(text: string, apiBaseUrl: string): Promise<number[]> {
  const res = await fetch(`${apiBaseUrl}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Embedding fetch failed: ${res.status}`);
  const json = await res.json<{ embedding: number[] }>();
  return json.embedding;
}

async function main() {
  const API_BASE = process.env.API_BASE ?? 'http://localhost:8787';
  const pairs: Pair[] = JSON.parse(
    readFileSync(join(import.meta.dirname, 'pairs.json'), 'utf-8'),
  );

  console.log(`Running calibration on ${pairs.length} pairs against ${API_BASE}…\n`);

  // Fetch embeddings for all unique sentences
  const sentences = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
  const embMap = new Map<string, number[]>();

  for (const s of sentences) {
    const emb = await fetchEmbedding(s, API_BASE);
    embMap.set(s, emb);
    process.stdout.write('.');
  }
  console.log('\n');

  // Compute similarities
  const similarities = pairs.map((p) => ({
    pair: p,
    similarity: cosineSimilarity(embMap.get(p.a)!, embMap.get(p.b)!),
  }));

  // Evaluate at each threshold step
  const thresholds = [];
  for (let t = 50; t <= 80; t += 5) thresholds.push(t / 100);

  const results: ThresholdResult[] = thresholds.map((threshold) => {
    let correct = 0, fp = 0, fn = 0;
    for (const { pair, similarity } of similarities) {
      const predicted = similarity >= threshold;
      if (predicted === pair.passed) correct++;
      else if (predicted && !pair.passed) fp++;
      else fn++;
    }
    const total = pairs.length;
    return {
      threshold,
      accuracy: correct / total,
      falsePositiveRate: fp / pairs.filter((p) => !p.passed).length,
      falseNegativeRate: fn / pairs.filter((p) => p.passed).length,
      correct,
      total,
    };
  });

  // Print table
  console.log('Threshold | Accuracy | FP rate | FN rate');
  console.log('----------|----------|---------|--------');
  for (const r of results) {
    console.log(
      `  ${r.threshold.toFixed(2)}    |  ${(r.accuracy * 100).toFixed(1)}%   | ${(r.falsePositiveRate * 100).toFixed(1)}%    | ${(r.falseNegativeRate * 100).toFixed(1)}%`,
    );
  }

  const best = results.reduce((a, b) => (a.accuracy >= b.accuracy ? a : b));
  console.log(`\nRecommended OVERLAP_THRESHOLD: ${best.threshold}`);
  console.log(`Accuracy at recommended threshold: ${(best.accuracy * 100).toFixed(1)}%`);

  const date = new Date().toISOString().slice(0, 10);
  const outPath = join(import.meta.dirname, `results-${date}.json`);
  writeFileSync(outPath, JSON.stringify({ runDate: date, results, recommended: best.threshold }, null, 2));
  console.log(`\nResults written to ${outPath}`);
}

main().catch(console.error);
