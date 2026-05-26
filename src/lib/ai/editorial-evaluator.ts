/* ═══════════════════════════════════════════════════════════════
   Editorial candidate evaluator

   Vision-based scorer for picking the best of N candidate editorial
   outputs from gpt-image-2. Takes:
     - N candidate image URLs (the gpt-image-2 outputs)
     - The reference images that were sent to gpt-image-2 (product,
       headshot, composited style ref)
     - Brand context (optional, for casting taste calibration)

   Returns:
     - winnerIndex: which candidate is the best
     - scores: per-candidate breakdown
     - reasoning: one-line summary of why the winner won

   Uses Claude Haiku 4.5 with vision (cheap, fast). One call evaluates
   all N candidates against all references in a single multi-image
   prompt.

   Per Codex consult (2026-05-26): "Use n=3 or n=4, then run a vision
   evaluator against explicit criteria: identity, product material,
   product angle, pose/gaze, crop, anatomy, background. Pick best or
   regenerate if none pass. Candidate selection is the biggest jump
   toward production consistency."
   ═══════════════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export interface CandidateScore {
  index: number;
  url: string;
  identity: number;      // 0-10: face/hair/complexion match to headshot
  pose: number;          // 0-10: pose/gaze/body language match to style ref
  product: number;       // 0-10: product accuracy from Image 1
  anatomy: number;       // 0-10: hands, feet, limb count, no fusions
  refinement: number;    // 0-10: clavicle/cheekbones/hair styling/editorial caliber
  scene: number;         // 0-10: background, lighting, scene fidelity to style ref
  total: number;         // sum of all six
  flag: string | null;   // critical defect ("two left feet", "wrong model", etc.) or null
}

export interface EvaluationResult {
  winnerIndex: number;
  winnerUrl: string;
  scores: CandidateScore[];
  reasoning: string;
}

async function fetchAsBase64(url: string): Promise<{ base64: string; mediaType: 'image/png' | 'image/jpeg' }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sig = buf.slice(0, 4).toString('hex');
  const isPng = sig.startsWith('89504e47');
  return {
    base64: buf.toString('base64'),
    mediaType: isPng ? 'image/png' : 'image/jpeg',
  };
}

/**
 * Pick the best candidate from N editorial generation outputs using
 * Claude Haiku vision. Returns the index, the URL, per-candidate
 * scores, and a one-line reasoning.
 *
 * If the API call fails or returns malformed JSON, falls back to
 * winnerIndex=0 (return the first candidate). Never throws.
 */
export async function pickBestEditorialCandidate(params: {
  candidates: string[];          // URLs of the N gpt-image-2 outputs
  productUrl?: string;           // Image 1 (product reference)
  headshotUrl?: string;          // Image 2 (model headshot)
  styleRefUrl?: string;          // Image 3 (composited style ref, what GPT actually saw)
  productName?: string;
  category?: 'CALZADO' | 'ROPA' | 'ACCESORIO';
}): Promise<EvaluationResult> {
  const fallback = (reason: string): EvaluationResult => ({
    winnerIndex: 0,
    winnerUrl: params.candidates[0] || '',
    scores: params.candidates.map((url, i) => ({
      index: i,
      url,
      identity: 0,
      pose: 0,
      product: 0,
      anatomy: 0,
      refinement: 0,
      scene: 0,
      total: 0,
      flag: i === 0 ? null : 'not-evaluated',
    })),
    reasoning: `Evaluator unavailable (${reason}). Returning first candidate.`,
  });

  if (!ANTHROPIC_API_KEY) return fallback('no-api-key');
  if (params.candidates.length === 0) return fallback('no-candidates');
  if (params.candidates.length === 1) {
    return {
      winnerIndex: 0,
      winnerUrl: params.candidates[0],
      scores: [
        {
          index: 0,
          url: params.candidates[0],
          identity: 0, pose: 0, product: 0, anatomy: 0, refinement: 0, scene: 0,
          total: 0,
          flag: null,
        },
      ],
      reasoning: 'Single candidate, no selection needed.',
    };
  }

  try {
    // Build the multi-image content: refs first, then candidates.
    type ImagePart = {
      type: 'image';
      source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg'; data: string };
    };
    const contentParts: (ImagePart | { type: 'text'; text: string })[] = [];

    const refLabels: string[] = [];

    if (params.productUrl) {
      try {
        const { base64, mediaType } = await fetchAsBase64(params.productUrl);
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
        refLabels.push(`REFERENCE A: product (${params.productName || 'the product'})`);
      } catch { /* skip */ }
    }
    if (params.headshotUrl) {
      try {
        const { base64, mediaType } = await fetchAsBase64(params.headshotUrl);
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
        refLabels.push(`REFERENCE B: casting model headshot (face/hair/complexion truth)`);
      } catch { /* skip */ }
    }
    if (params.styleRefUrl) {
      try {
        const { base64, mediaType } = await fetchAsBase64(params.styleRefUrl);
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
        refLabels.push(`REFERENCE C: style/pose/scene reference (pose, gaze, lighting, scene truth)`);
      } catch { /* skip */ }
    }

    // Add each candidate.
    const candidateLabels: string[] = [];
    for (let i = 0; i < params.candidates.length; i++) {
      try {
        const { base64, mediaType } = await fetchAsBase64(params.candidates[i]);
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
        candidateLabels.push(`CANDIDATE ${i + 1}`);
      } catch {
        // If a candidate can't be fetched, exclude it from evaluation.
      }
    }

    if (candidateLabels.length === 0) return fallback('no-fetchable-candidates');

    const categoryRubric =
      params.category === 'CALZADO'
        ? 'Product is footwear: must be worn on both feet, visible from a flattering editorial angle (front or three-quarter side), outsole not dominant.'
        : params.category === 'ROPA'
          ? 'Product is a garment: must be worn correctly, drape natural, fabric weight visible.'
          : 'Product is an accessory: must be held/worn/carried prominently and identifiably.';

    const evalPrompt = `You are evaluating ${candidateLabels.length} candidate editorial fashion photographs against three reference images.

REFERENCES PROVIDED (in order):
${refLabels.map((l, i) => `${i + 1}. ${l}`).join('\n')}

CANDIDATES PROVIDED (in order, after the references):
${candidateLabels.join('\n')}

Score each CANDIDATE on six criteria, 0-10 each (10 = perfect, 0 = wrong):

1. IDENTITY: does the model's face, hair, complexion, skin tone match REFERENCE B (headshot)? Same person?
2. POSE: does the pose, body language, head tilt, gaze direction, facial expression match REFERENCE C? Same scene behavior?
3. PRODUCT: does the product accurately reproduce REFERENCE A — same shape, color, material, hardware, details? ${categoryRubric}
4. ANATOMY: 2 arms, 2 legs, 2 feet (mirrored — left points left, right points right), 10 fingers (each hand has 5 distinguishable fingers, no fusions). No extra/missing limbs.
5. REFINEMENT: editorial casting quality — slender neck, visible clavicle, sculpted cheekbones, defined jawline, hair styled with at least one side tucked behind the ear (when length permits), runway-caliber bone structure.
6. SCENE: background, lighting, atmosphere, camera angle, framing match REFERENCE C. Any reflective surface in the scene is physically coherent. No text/captions/brand names visible.

For each candidate, also note any CRITICAL DEFECT in a "flag" field — things like "two left feet", "wrong model face", "product wrong color", "fingers fused into product". null if none.

Return ONLY a JSON object, no other text:

{
  "scores": [
    {"candidate": 1, "identity": N, "pose": N, "product": N, "anatomy": N, "refinement": N, "scene": N, "flag": "..." or null},
    ...one per candidate
  ],
  "winner": N,         // 1-indexed candidate number
  "reasoning": "one sentence: why this candidate beat the others"
}

Be strict. Editorial quality means runway-caliber. A 7 is "decent commercial catalog". Reserve 9-10 for truly editorial.`;

    contentParts.push({ type: 'text', text: evalPrompt });

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: contentParts as never }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback('no-json-in-response');

    const parsed = JSON.parse(jsonMatch[0]);
    const winnerIdx1Based = Number(parsed.winner);
    if (!winnerIdx1Based || winnerIdx1Based < 1 || winnerIdx1Based > candidateLabels.length) {
      return fallback('invalid-winner-index');
    }
    const winnerIndex = winnerIdx1Based - 1;

    const scores: CandidateScore[] = (parsed.scores || []).map(
      (s: { candidate?: number; identity?: number; pose?: number; product?: number; anatomy?: number; refinement?: number; scene?: number; flag?: string | null }, i: number) => {
        const idx = (s.candidate || i + 1) - 1;
        const identity = Number(s.identity || 0);
        const pose = Number(s.pose || 0);
        const product = Number(s.product || 0);
        const anatomy = Number(s.anatomy || 0);
        const refinement = Number(s.refinement || 0);
        const scene = Number(s.scene || 0);
        return {
          index: idx,
          url: params.candidates[idx] || '',
          identity, pose, product, anatomy, refinement, scene,
          total: identity + pose + product + anatomy + refinement + scene,
          flag: s.flag || null,
        };
      },
    );

    return {
      winnerIndex,
      winnerUrl: params.candidates[winnerIndex],
      scores,
      reasoning: String(parsed.reasoning || 'Evaluator picked candidate ' + winnerIdx1Based),
    };
  } catch (err) {
    console.error('[editorial-evaluator] failed:', err);
    return fallback(err instanceof Error ? err.message.slice(0, 50) : 'unknown-error');
  }
}
