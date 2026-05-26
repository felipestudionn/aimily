/* ═══════════════════════════════════════════════════════════════
   Image generation defense layer

   The two real-world failure modes we see in production:

     A. OpenAI's image safety filter false-positive on fashion prompts
        (returns 400 moderation_blocked / safety_violations=[sexual]).
        Triggered by an interaction of: prompt language, user-supplied
        prompt body, the reference images themselves, and category.

     B. Freepik's perimeter blocks the Vercel egress IPs intermittently
        (returns 403 "Your IP has been blocked due to suspicious
        activity"). Hits every Freepik endpoint, kills the Nano Banana
        fallback that we used to rely on.

   Strategy: GPT Image 1.5 as primary, retried in 3 progressively
   safer tiers, then Nano Banana as a last resort with a short retry
   on 403. The hot path returns from Tier 1; Tier 2 / Tier 3 / Nano
   only run when the prior tier rejected. End users should never see
   a bare "generation failed" — every path either succeeds or returns
   a specific diagnostic the UI can act on.
   ═══════════════════════════════════════════════════════════════ */

import sharp from 'sharp';
import { uploadToStorage } from '@/lib/storage';

const OPENAI_IMAGE_EDIT_ENDPOINT = 'https://api.openai.com/v1/images/edits';
const NANO_BANANA_ENDPOINT =
  'https://api.freepik.com/v1/ai/gemini-2-5-flash-image-preview';

/** Words that empirically trigger OpenAI's image moderation on fashion
 *  prompts. Stripped from user-supplied direction before sending. */
const MODERATION_TRIGGERS =
  /\b(sexy|sensual|seductive|sultry|alluring|provocative|tempting|erotic|sensuous|raunchy|saucy|risqu[eé]|nude|naked|topless|bare|exposed|undress|undressed|stripped|intimate|passion|desire|lust|wet|shower|bathing|skin-?baring|cleavage|lingerie-?clad)\b/gi;

export function sanitizeUserPromptForGpt(input: string | undefined): string | undefined {
  if (!input) return input;
  const cleaned = input.replace(MODERATION_TRIGGERS, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export type GptImageInput = {
  buffer: Buffer;
  filename: string;
};

/** Attempt label — every attempt uses the SAME reference images. The
 *  only variation is the text prompt. We never drop the style image,
 *  the model headshot, or the product reference — the user paid for a
 *  reference-faithful editorial, and degrading by dropping references
 *  would silently downgrade the output. */
export type GptAttempt = 'primary' | 'defensive' | `parallel-${number}`;

export type GptImageResult = {
  url: string | null;
  /** null on success; specific code on failure for caller diagnostics */
  errorCode: 'moderation' | 'rate_limit' | 'auth' | 'transient' | 'other' | null;
  rawError?: string;
};

/** Fetch a URL and normalize to a 1024-edge PNG buffer suitable for
 *  passing to OpenAI images/edits as a Blob. */
export async function fetchAsPng(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchAsPng: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return await sharp(buf)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

/** Single GPT Image 1.5 edit call. Returns either the generated URL
 *  (uploaded to Storage if collectionPlanId provided, otherwise data:
 *  URL) or a null URL with a classified error code. Never throws on
 *  HTTP errors — those become errorCode results so the caller can
 *  decide whether to retry. */
async function runGptImageEditOnce(params: {
  images: GptImageInput[];
  prompt: string;
  collectionPlanId?: string;
  assetType: 'editorial' | 'still_life' | 'tryon';
  attempt: GptAttempt;
}): Promise<GptImageResult> {
  const { images, prompt, collectionPlanId, assetType, attempt } = params;

  if (!process.env.OPENAI_API_KEY) {
    return { url: null, errorCode: 'auth', rawError: 'OPENAI_API_KEY not set' };
  }

  // Model selection priority:
  // 1. ENV override (OPENAI_IMAGE_MODEL) — for A/B testing
  // 2. gpt-image-2 — current default per Codex consult (2026-05-26):
  //    "stronger image quality, improved editing, processes image
  //    inputs at high fidelity automatically (so omit input_fidelity)"
  // 3. Snapshot pin gpt-image-1.5-2025-12-16 — drift control fallback
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const isV2 = model.startsWith('gpt-image-2');

  const formData = new FormData();
  formData.append('model', model);
  for (const img of images) {
    formData.append(
      'image[]',
      new Blob([img.buffer], { type: 'image/png' }),
      img.filename,
    );
  }
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1536');
  formData.append('quality', 'high');
  // input_fidelity is gpt-image-1.5 specific. gpt-image-2 handles
  // input fidelity automatically per OpenAI docs — sending it on v2
  // is a no-op or a 400. Conditional.
  if (!isV2) {
    formData.append('input_fidelity', 'high');
  }
  // `moderation: 'low'` is the documented parameter for gpt-image-1.5
  // commercial-fashion / editorial use cases. The Python SDK does not
  // expose it on images.edit yet, but the REST endpoint accepts it
  // when sent via raw multipart (confirmed by OpenAI staff on the
  // developer forum). With `auto` the filter false-positives fashion
  // editorial routinely — models + style refs + brand campaigns get
  // flagged as sexual. `low` raises the threshold to the level that
  // OpenAI's own ad policy permits for "lingerie / underwear / swim-
  // wear in a standard fashion or retail context".
  formData.append('moderation', 'low');

  // Server-side ops log so we can verify what was actually sent.
  console.log(
    `[gpt-image attempt=${attempt}] model=${model} prompt.length=${prompt.length} images=${images.length} moderation=low`,
  );

  const res = await fetch(OPENAI_IMAGE_EDIT_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    const lower = errText.toLowerCase();
    let errorCode: NonNullable<GptImageResult['errorCode']> = 'other';
    if (lower.includes('moderation_blocked') || lower.includes('safety_violations')) {
      errorCode = 'moderation';
    } else if (res.status === 429) {
      errorCode = 'rate_limit';
    } else if (res.status === 401 || res.status === 403) {
      errorCode = 'auth';
    } else if (res.status >= 500) {
      errorCode = 'transient';
    }
    console.error(
      `[gpt-image attempt=${attempt}] ${res.status} ${errorCode}:`,
      errText.slice(0, 400),
    );
    return { url: null, errorCode, rawError: errText.slice(0, 400) };
  }

  const data = await res.json();
  let url: string | null = null;
  if (data.data?.[0]?.b64_json) {
    const imgBuffer = Buffer.from(data.data[0].b64_json, 'base64');
    if (collectionPlanId) {
      const upload = await uploadToStorage(
        collectionPlanId,
        assetType,
        `${assetType}-gpt-${attempt}-${Date.now()}.png`,
        imgBuffer,
        'image/png',
      );
      url = upload.publicUrl;
    } else {
      url = `data:image/png;base64,${data.data[0].b64_json}`;
    }
  } else if (data.data?.[0]?.url) {
    url = data.data[0].url;
  }
  return { url, errorCode: null };
}

/** Multi-candidate GPT Image edit — fires N parallel `n=1` requests in
 *  parallel, returns all successful candidate URLs. Designed to be paired
 *  with a vision evaluator (pickBestEditorialCandidate) that picks the
 *  best output.
 *
 *  Why parallel n=1 instead of single n=N: OpenAI's n=N request runs
 *  internally serial-ish and can exceed iOS Safari's tolerance for
 *  long-lived fetches. N parallel n=1 calls finish in roughly the time
 *  of a single call (~30-35s), at the cost of N× input billing.
 *
 *  Per Codex consult (2026-05-26): "Replace n=1 with n=4 plus automated
 *  visual selection/rejection. Candidate selection is the biggest jump
 *  toward production consistency because it accepts that generation is
 *  stochastic instead of pretending the prompt can remove sampling
 *  variance."
 */
export async function gptImageEditParallel(params: {
  images: GptImageInput[];
  prompt: string;
  collectionPlanId?: string;
  assetType: 'editorial' | 'still_life' | 'tryon';
  /** Number of parallel candidates. Default 4 per Codex. Set 1 to opt
   *  out of multi-candidate mode (legacy single-call behavior). */
  n?: number;
}): Promise<{
  urls: string[];
  error: GptImageResult | null;
}> {
  const n = Math.max(1, Math.min(8, params.n ?? 4));
  console.log(`[gpt-image-parallel] firing ${n} parallel candidate generations`);
  const start = Date.now();

  const results = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      runGptImageEditOnce({
        images: params.images,
        prompt: params.prompt,
        collectionPlanId: params.collectionPlanId,
        assetType: params.assetType,
        attempt: `parallel-${i + 1}` as GptAttempt,
      }),
    ),
  );

  const elapsed = Date.now() - start;
  const urls = results.filter((r) => r.url !== null).map((r) => r.url as string);
  const firstError = results.find((r) => r.errorCode !== null) ?? null;

  console.log(
    `[gpt-image-parallel] ${urls.length}/${n} succeeded in ${elapsed}ms`,
  );

  return {
    urls,
    error: urls.length === 0 ? (firstError as GptImageResult) : null,
  };
}

/** Single GPT Image 1.5 edit call with `moderation: 'low'`. Kept for
 *  callers that don't want multi-candidate mode (still-life, tryon).
 *  Editorial now uses gptImageEditParallel + pickBestEditorialCandidate. */
export async function gptImageEdit(params: {
  images: GptImageInput[];
  prompt: string;
  collectionPlanId?: string;
  assetType: 'editorial' | 'still_life' | 'tryon';
}): Promise<{
  url: string | null;
  error: GptImageResult | null;
}> {
  const result = await runGptImageEditOnce({
    images: params.images,
    prompt: params.prompt,
    collectionPlanId: params.collectionPlanId,
    assetType: params.assetType,
    attempt: 'primary',
  });
  if (result.url) return { url: result.url, error: null };
  return { url: null, error: result };
}

/** @deprecated Kept for back-compat — alias to gptImageEdit. The
 *  defensive second attempt no longer exists; `moderation: 'low'`
 *  removes the need. */
export async function gptImageEditDefensive(params: {
  images: GptImageInput[];
  prompt: string;
  defensivePrompt?: string;
  collectionPlanId?: string;
  assetType: 'editorial' | 'still_life' | 'tryon';
}): Promise<{
  url: string | null;
  attemptUsed: GptAttempt | null;
  lastError: GptImageResult | null;
}> {
  const r = await gptImageEdit({
    images: params.images,
    prompt: params.prompt,
    collectionPlanId: params.collectionPlanId,
    assetType: params.assetType,
  });
  return {
    url: r.url,
    attemptUsed: r.url ? 'primary' : null,
    lastError: r.error,
  };
}

export type NanoBananaResult = {
  url: string | null;
  errorCode: 'ip_block' | 'rate_limit' | 'failed' | 'timeout' | 'other' | null;
};

/** Nano Banana create-and-poll with a single retry-after-delay on 403
 *  IP block, since that error is usually transient throttling. */
export async function nanoBananaCreateAndPoll(
  prompt: string,
  referenceImages: string[],
  options: { maxPollIterations?: number; pollIntervalMs?: number } = {},
): Promise<NanoBananaResult> {
  const maxPoll = options.maxPollIterations ?? 20;
  const pollMs = options.pollIntervalMs ?? 3000;
  const apiKey = process.env.FREEPIK_API_KEY;
  if (!apiKey) return { url: null, errorCode: 'other' };

  const create = async (): Promise<{ taskId: string | null; errorCode: NanoBananaResult['errorCode'] }> => {
    const res = await fetch(NANO_BANANA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': apiKey },
      body: JSON.stringify({ prompt, reference_images: referenceImages }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[nano-banana] create error:', res.status, errText.slice(0, 300));
      if (res.status === 403 && /blocked/i.test(errText)) return { taskId: null, errorCode: 'ip_block' };
      if (res.status === 429) return { taskId: null, errorCode: 'rate_limit' };
      return { taskId: null, errorCode: 'other' };
    }
    const json = await res.json();
    const taskId = json?.data?.task_id ?? null;
    return { taskId, errorCode: taskId ? null : 'failed' };
  };

  let { taskId, errorCode } = await create();

  // One retry on 403 IP block after a short delay — sometimes a
  // single 5s wait clears the per-IP throttle Freepik applies to
  // Vercel egress.
  if (!taskId && errorCode === 'ip_block') {
    await new Promise((r) => setTimeout(r, 5000));
    const retry = await create();
    taskId = retry.taskId;
    errorCode = retry.errorCode;
  }

  if (!taskId) return { url: null, errorCode };

  for (let i = 0; i < maxPoll; i++) {
    await new Promise((r) => setTimeout(r, pollMs));
    const res = await fetch(`${NANO_BANANA_ENDPOINT}/${taskId}`, {
      headers: { 'x-freepik-api-key': apiKey },
    });
    if (!res.ok) continue;
    const sd = await res.json();
    const status: string | undefined = sd.data?.status;
    if (status === 'COMPLETED') {
      const url = sd.data?.generated?.[0] ?? null;
      return { url, errorCode: url ? null : 'failed' };
    }
    if (status === 'FAILED') return { url: null, errorCode: 'failed' };
  }
  return { url: null, errorCode: 'timeout' };
}
