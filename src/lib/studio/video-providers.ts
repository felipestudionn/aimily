/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · Video Provider Abstraction

   Two providers behind a single `VideoProvider` interface so the route is
   swappable via ENV without touching code:

     STUDIO_VIDEO_PROVIDER=kling   (default — Freepik Kling 2.1 Pro/Std)
     STUDIO_VIDEO_PROVIDER=sora    (OpenAI Sora 2 direct, "go direct" path)

   Why two:
     • Kling is what Aimily 360 already runs in production via /api/ai/
       freepik/video — validated quality for fashion editorial, ~2-4 min
       per clip, $0.50-1.50 per 5s clip via Freepik. Safe default.
     • Sora 2 is OpenAI's direct video API. Quality comparable to Kling
       for fashion stills-to-motion, consistent with the "directo a
       OpenAI" stance Felipe set for image generation. Best when the
       business wants to consolidate vendor surface area.

   The Kling adapter is a near-verbatim port of /api/ai/freepik/video/
   route.ts (just removes the CIS/collection-plan plumbing). The Sora
   adapter is implemented against OpenAI's documented Sora 2 API shape;
   any drift from current docs is a 5-line fix in soraProvider.

   Polling:
     • Kling: 6s interval, up to 40 iterations (~4 min cap).
     • Sora: 5s interval, up to 60 iterations (~5 min cap).
   ═══════════════════════════════════════════════════════════════════════════ */

export type VideoTier = 'pro' | 'std';
export type VideoDuration = '5' | '10';
export type VideoMotion = 'subtle' | 'walk' | 'pan' | 'zoom' | 'turn' | 'dolly';

export const MOTION_PROMPTS: Record<VideoMotion, string> = {
  subtle:
    'Subtle elegant movement: slight fabric sway, soft natural breathing, camera holds steady',
  walk: 'Model walking forward, confident stride, fashion show atmosphere',
  pan: 'Smooth cinematic camera pan from left to right, revealing the full outfit',
  zoom: 'Slow cinematic zoom in, focusing on details, materials, and stitching',
  turn: 'Model turning slowly, 180-degree rotation showing the product from multiple angles',
  dolly: 'Smooth dolly-in camera movement, pulling the viewer into the scene',
};

export interface VideoGenInput {
  imageUrl: string;
  productName: string;
  motion: VideoMotion;
  duration: VideoDuration;
  tier: VideoTier;
  userPrompt?: string;
}

export interface VideoGenResult {
  videoUrl: string;
  providerLabel: string;
}

export interface VideoProvider {
  name: 'kling' | 'sora';
  /** Returns the upstream-hosted video URL on success, throws on failure. */
  generate(input: VideoGenInput): Promise<VideoGenResult>;
}

/* ── Shared prompt builder ──────────────────────────────────────────────── */
function buildVideoPrompt(input: VideoGenInput): string {
  const motionDesc = MOTION_PROMPTS[input.motion] || MOTION_PROMPTS.subtle;
  const parts = [
    `High-end fashion editorial motion piece featuring ${input.productName}.`,
    `${motionDesc}.`,
    'Cinematic lighting, shallow depth of field, professional color grading, editorial feel.',
    'No text, no watermark, no brand logos added.',
  ];
  if (input.userPrompt?.trim()) parts.push(`Art direction: ${input.userPrompt.trim()}.`);
  return parts.join(' ');
}

/* ═══════════════════════════════════════════════════════════════════════════
   Provider 1 · Kling 2.1 via Freepik
   Endpoints:
     - pro → https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-pro
     - std → https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-std
   Same async pattern as the existing /api/ai/freepik/video route.
   ═══════════════════════════════════════════════════════════════════════════ */
const KLING_PRO_ENDPOINT = 'https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-pro';
const KLING_STD_ENDPOINT = 'https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-std';

export const klingProvider: VideoProvider = {
  name: 'kling',
  async generate(input) {
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) throw new Error('FREEPIK_API_KEY not configured');

    const endpoint = input.tier === 'std' ? KLING_STD_ENDPOINT : KLING_PRO_ENDPOINT;
    const prompt = buildVideoPrompt(input);

    const createRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': apiKey },
      body: JSON.stringify({
        image: input.imageUrl,
        prompt,
        duration: input.duration,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Kling create failed (${createRes.status}): ${errText.slice(0, 300)}`);
    }

    const { data } = await createRes.json();
    const taskId: string | undefined = data?.task_id;
    if (!taskId) throw new Error('Kling create returned no task_id');

    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      const statusRes = await fetch(`${endpoint}/${taskId}`, {
        headers: { 'x-freepik-api-key': apiKey },
      });
      if (!statusRes.ok) continue;
      const sd = await statusRes.json();
      const status: string | undefined = sd.data?.status;
      if (status === 'COMPLETED') {
        const url: string | undefined = sd.data?.generated?.[0] || sd.data?.video_url;
        if (!url) throw new Error('Kling COMPLETED but returned no video URL');
        return {
          videoUrl: url,
          providerLabel: input.tier === 'pro' ? 'freepik-kling-2.1-pro' : 'freepik-kling-2.1-std',
        };
      }
      if (status === 'FAILED') throw new Error('Kling FAILED');
    }
    throw new Error('Kling polling timed out after 4 minutes');
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Provider 2 · Sora 2 (OpenAI direct)

   Implemented against OpenAI's Sora 2 API as documented late 2025/early
   2026. The exact request shape may evolve — this adapter follows the
   patterns OpenAI uses for other async generation endpoints (jobs +
   polling + completion). If the production response shape differs,
   adjust the field paths inside the polling loop.

   Pricing (rough): $0.10-0.50 per second of generated video for high
   quality. A 5s clip ≈ $0.50-2.50.

   Endpoint family:
     POST  https://api.openai.com/v1/videos        (create job)
     GET   https://api.openai.com/v1/videos/{id}   (poll status)
   ═══════════════════════════════════════════════════════════════════════════ */
const SORA_CREATE_ENDPOINT = 'https://api.openai.com/v1/videos';

export const soraProvider: VideoProvider = {
  name: 'sora',
  async generate(input) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const prompt = buildVideoPrompt(input);
    const seconds = input.duration === '10' ? 10 : 5;

    /* Sora 2 accepts an input image via input_reference. The exact field
     * name may be `input_reference`, `image_reference`, or `image_url`
     * depending on the API version — current docs use input_reference.
     * If OpenAI returns a 400 with "unknown_parameter", swap the key. */
    const createRes = await fetch(SORA_CREATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sora-2',
        prompt,
        seconds,
        // size — Sora 2 default is 1280x720 (16:9). For fashion vertical
        // we'd want 720x1280. Picking based on whether the source image
        // is taller than wide would be ideal, but we don't have metadata
        // here — default to 720x1280 (portrait) since most Studio assets
        // are 1024x1536.
        size: '720x1280',
        input_reference: { image_url: input.imageUrl },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Sora create failed (${createRes.status}): ${errText.slice(0, 300)}`);
    }

    const created = await createRes.json();
    const jobId: string | undefined = created?.id;
    if (!jobId) throw new Error('Sora create returned no job id');

    // Initial status may already be `completed` for very short clips
    if (created.status === 'completed') {
      const url: string | undefined = created.video_url || created.output?.[0]?.url;
      if (!url) throw new Error('Sora returned completed without video URL');
      return { videoUrl: url, providerLabel: 'openai-sora-2' };
    }

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await fetch(`${SORA_CREATE_ENDPOINT}/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!statusRes.ok) continue;
      const sd = await statusRes.json();
      const status: string | undefined = sd?.status;
      if (status === 'completed' || status === 'succeeded') {
        const url: string | undefined = sd.video_url || sd.output?.[0]?.url;
        if (!url) throw new Error('Sora completed but returned no video URL');
        return { videoUrl: url, providerLabel: 'openai-sora-2' };
      }
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Sora ${status}: ${sd.error?.message || 'no detail'}`);
      }
    }
    throw new Error('Sora polling timed out after 5 minutes');
  },
};

/* ── Provider router — picked at request time via env var ──────────────── */
export function getActiveVideoProvider(): VideoProvider {
  const name = (process.env.STUDIO_VIDEO_PROVIDER || 'kling').toLowerCase();
  if (name === 'sora') return soraProvider;
  return klingProvider;
}
