const TIMEOUT_MS = 4500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const timer = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  return Promise.race([promise, timer]);
}

export interface SafetyScores {
  faceScore: number | null;
  nsfwScore: number | null;
  unavailable: boolean;
}

type ClassificationResult = { label: string; score: number }[];

// Run image classification and return the score for a matching label.
async function classifyImage(
  ai: Ai,
  modelId: string,
  imageBytes: Uint8Array,
  targetLabels: string[],
): Promise<number | null> {
  // Workers AI image classification expects an array of numbers
  const image = Array.from(imageBytes) as number[];
  const result = await withTimeout(
    ai.run(modelId as Parameters<Ai['run']>[0], { image } as never) as unknown as Promise<ClassificationResult>,
    TIMEOUT_MS,
  );
  if (!result) return null; // timeout treated as unavailable
  const items = Array.isArray(result) ? result : [];
  const match = items.find((r) =>
    targetLabels.some((label) => r.label.toLowerCase().includes(label.toLowerCase())),
  );
  return match?.score ?? 0;
}

export async function runSafetyChecks(
  ai: Ai,
  env: { FACE_DETECTION_MODEL?: string; NSFW_MODEL?: string },
  imageBytes: Uint8Array,
): Promise<SafetyScores> {
  const faceModel = env.FACE_DETECTION_MODEL ?? '@cf/microsoft/resnet-50';
  const nsfwModel = env.NSFW_MODEL ?? '@cf/microsoft/resnet-50';

  const [faceResult, nsfwResult] = await Promise.allSettled([
    classifyImage(ai, faceModel, imageBytes, ['person', 'face', 'human']),
    classifyImage(ai, nsfwModel, imageBytes, ['nsfw', 'nude', 'explicit', 'adult']),
  ]);

  const faceScore = faceResult.status === 'fulfilled' ? faceResult.value : null;
  const nsfwScore = nsfwResult.status === 'fulfilled' ? nsfwResult.value : null;

  return {
    faceScore,
    nsfwScore,
    unavailable: faceScore === null && nsfwScore === null,
  };
}

export interface EmbeddingResult {
  data: number[];
  degraded: boolean;
}

export async function embedText(ai: Ai, text: string): Promise<EmbeddingResult> {
  const result = await withTimeout(
    ai.run('@cf/baai/bge-small-en-v1.5' as Parameters<Ai['run']>[0], {
      text: [text],
    } as never) as Promise<{ data: number[][] }>,
    TIMEOUT_MS,
  );

  if (!result || !result.data?.[0]) {
    return { data: [], degraded: true };
  }
  return { data: result.data[0], degraded: false };
}

export async function runLlmOverlapCheck(
  ai: Ai,
  env: { OVERLAP_LLM_MODEL?: string },
  sentenceA: string,
  sentenceB: string,
): Promise<boolean | null> {
  const model = env.OVERLAP_LLM_MODEL ?? '@cf/meta/llama-3.1-8b-instruct';
  const prompt = `Do these two sentences share at least one concept — a feeling, image, or concrete noun?

Sentence A: "${sentenceA}"
Sentence B: "${sentenceB}"

Reply with only "yes" or "no".`;

  const result = await withTimeout(
    ai.run(model as Parameters<Ai['run']>[0], {
      prompt,
      max_tokens: 4,
    } as never) as Promise<{ response: string }>,
    TIMEOUT_MS,
  );

  if (!result) return null;
  return result.response?.trim().toLowerCase().startsWith('yes') ?? false;
}
