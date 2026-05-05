import { embedText, runLlmOverlapCheck } from './ai';

export interface OverlapResult {
  passed: boolean;
  score: number | null;
  method: 'embedding' | 'llm' | 'degraded';
  degraded: boolean;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length !== a.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function checkConceptOverlap(
  ai: Ai,
  env: {
    OVERLAP_THRESHOLD?: string;
    OVERLAP_LLM_THRESHOLD?: string;
    OVERLAP_LLM_MODEL?: string;
  },
  newSentence: string,
  currentSentence: string,
): Promise<OverlapResult> {
  const threshold = parseFloat(env.OVERLAP_THRESHOLD ?? '0.65');
  const llmThreshold = parseFloat(env.OVERLAP_LLM_THRESHOLD ?? '0.50');

  const [embA, embB] = await Promise.all([
    embedText(ai, newSentence),
    embedText(ai, currentSentence),
  ]);

  // If embeddings failed, degrade gracefully (generous default: pass)
  if (embA.degraded || embB.degraded) {
    return { passed: true, score: null, method: 'degraded', degraded: true };
  }

  const score = cosineSimilarity(embA.data, embB.data);

  if (score >= threshold) {
    return { passed: true, score, method: 'embedding', degraded: false };
  }

  if (score < llmThreshold) {
    return { passed: false, score, method: 'embedding', degraded: false };
  }

  // Score in the grey zone: use LLM tiebreaker
  const llmResult = await runLlmOverlapCheck(ai, env, newSentence, currentSentence);

  if (llmResult === null) {
    // LLM timed out — degrade generously
    return { passed: true, score, method: 'degraded', degraded: true };
  }

  return { passed: llmResult, score, method: 'llm', degraded: false };
}
