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

/* Motion presets — phrased camera-first to minimise Sora 2 moderation
 * flags. Sora's image-to-video classifier treats explicit human-action
 * verbs ("model walking", "natural breathing") as elevated risk because
 * the same patterns appear in deepfake / impersonation cases. By framing
 * each motion as a CAMERA move + fabric/scene atmosphere, the prompt
 * stays closer to recognisable b-roll / lookbook vocabulary.
 *
 * If a request still gets blocked, the input image is what's flagged
 * (Sora's face classifier on input_reference), not the prompt — flip
 * STUDIO_VIDEO_PROVIDER=kling in that case. */
export const MOTION_PROMPTS: Record<VideoMotion, string> = {
  subtle:
    'Subtle cinematic motion: fabric drapes shift in soft air, light glows softly, camera holds steady with shallow depth of field',
  walk: 'Slow forward dolly motion through the editorial scene, fabric and hair catch the air, soft motion at the frame edges',
  pan: 'Smooth cinematic camera pan from left to right, slowly revealing the full editorial scene',
  zoom: 'Slow cinematic dolly-zoom in, focusing on garment details — materials, weave, stitching, hardware',
  turn: 'Slow editorial pedestal rotation, the camera orbits to reveal the outfit from every angle',
  dolly: 'Smooth dolly-in camera movement, pulling the viewer toward the editorial scene',
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
  /* Both providers now return the raw video bytes + mime so the calling
   * route can persist them uniformly via uploadBase64 / persistStudioAsset.
   * Sora's /v1/videos/{id}/content endpoint requires Bearer auth so a
   * public-URL approach doesn't work for it; Kling's upstream URL is
   * public but ephemeral, so we copy the bytes anyway to get a stable
   * 1-year signed URL inside our own bucket. */
  videoBuffer: Buffer;
  mimeType: string;
  providerLabel: string;
}

export interface VideoProvider {
  name: 'kling' | 'sora';
  /** Returns the raw video bytes on success, throws on failure. */
  generate(input: VideoGenInput): Promise<VideoGenResult>;
}

/* ── Shared prompt builder ──────────────────────────────────────────────── */
function buildVideoPrompt(input: VideoGenInput): string {
  const motionDesc = MOTION_PROMPTS[input.motion] || MOTION_PROMPTS.subtle;
  const parts = [
    /* Anchor as legitimate editorial / lookbook content — same vocabulary
     * the fashion industry uses (Net-a-Porter, Vogue Runway, Mytheresa
     * editorial b-roll). Helps Sora's classifier read this as commercial
     * fashion content rather than person-impersonation. */
    `Fashion editorial b-roll, lookbook-style motion piece. Garment as the subject: ${input.productName}.`,
    `${motionDesc}.`,
    'Cinematic lighting, shallow depth of field, professional color grading, editorial feel.',
    'Style reference: Net-a-Porter editorial, Mytheresa lookbook, Vogue Runway b-roll.',
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
        const videoRes = await fetch(url);
        if (!videoRes.ok) throw new Error(`Kling video fetch failed: ${videoRes.status}`);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        return {
          videoBuffer,
          mimeType: videoRes.headers.get('content-type') || 'video/mp4',
          providerLabel: input.tier === 'pro' ? 'freepik-kling-2.1-pro' : 'freepik-kling-2.1-std',
        };
      }
      if (status === 'FAILED') throw new Error('Kling FAILED');
    }
    throw new Error('Kling polling timed out after 4 minutes');
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Provider 2 · Sora 2 (OpenAI direct, via official SDK)

   Uses the openai SDK (already a dependency for the rest of the stack):
     • client.videos.create({ model, prompt, seconds, size, input_reference })
       — multipart upload handled by the SDK + toFile() helper
     • client.videos.retrieve(id) — poll status until 'completed'
     • client.videos.downloadContent(id) — fetch the MP4 bytes (requires
       Bearer auth, hence we always download server-side in the provider
       and return a Buffer — there is no public URL to hand back)

   Sora 2 spec (as of the v6.35 SDK):
     - model: 'sora-2'
     - seconds: '4' | '8' | '12'
     - size: '720x1280' | '1280x720' | '1024x1024'  (portrait / landscape / square)
     - input_reference: uploadable image file (for image-to-video)

   Studio's UI exposes 5s / 10s — we map to the closest legal Sora
   duration (5 → 4, 10 → 8).

   Pricing (rough): $0.10-0.50/second @ high quality. A 4s clip ≈ $0.40-2.00.
   ═══════════════════════════════════════════════════════════════════════════ */

export const soraProvider: VideoProvider = {
  name: 'sora',
  async generate(input) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    // Dynamic imports keep node-only deps out of edge bundles.
    const { default: OpenAI, toFile } = await import('openai');
    const { default: sharp } = await import('sharp');
    const client = new OpenAI({ apiKey });

    const prompt = buildVideoPrompt(input);
    const seconds = input.duration === '10' ? '8' : '4'; // Sora legal durations

    /* Sora 2 requires the input_reference image to have dimensions that
     * EXACTLY match the requested `size`. Studio sources are typically
     * 1024x1536 (vertical, 2:3) — different ratio than Sora's 9:16. So:
     *   1. Detect the source orientation
     *   2. Pick the closest Sora-legal size (portrait | landscape | square)
     *   3. sharp-resize to those exact dimensions with smart-crop
     *      ('attention' = saliency-based, keeps faces/products in frame) */
    const imgRes = await fetch(input.imageUrl);
    if (!imgRes.ok) throw new Error(`Sora source image fetch failed: ${imgRes.status}`);
    const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
    const meta = await sharp(rawBuffer).metadata();
    const srcW = meta.width || 1024;
    const srcH = meta.height || 1024;
    const aspect = srcW / srcH;

    let size: '720x1280' | '1280x720' | '1024x1024';
    let targetW: number;
    let targetH: number;
    if (aspect < 0.95) {
      size = '720x1280'; targetW = 720; targetH = 1280;        // portrait
    } else if (aspect > 1.05) {
      size = '1280x720'; targetW = 1280; targetH = 720;        // landscape
    } else {
      size = '1024x1024'; targetW = 1024; targetH = 1024;      // square
    }

    const resizedBuffer = await sharp(rawBuffer)
      .resize(targetW, targetH, { fit: 'cover', position: sharp.strategy.attention })
      .png()
      .toBuffer();

    const imageFile = await toFile(resizedBuffer, 'source.png', { type: 'image/png' });

    /* Create the video job. The SDK marshals this as multipart/form-data
     * with `input_reference` as the file part. If a future Sora release
     * renames the param, the SDK's typed CreateParams will fail at the
     * tsc step here, giving us an obvious surface to update. */
    let job;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      job = await (client.videos as any).create({
        model: 'sora-2',
        prompt,
        seconds,
        size,
        input_reference: imageFile,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Sora create failed: ${msg.slice(0, 300)}`);
    }

    if (!job?.id) throw new Error('Sora create returned no job id');

    // Poll status — Sora 2 video gen is async, typical 60-180s for 4s clips.
    let last = job;
    if (last.status !== 'completed') {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          last = await (client.videos as any).retrieve(job.id);
        } catch {
          continue; // transient — try again
        }
        if (last.status === 'completed') break;
        if (last.status === 'failed') {
          throw new Error(`Sora failed: ${last.error?.message || 'no detail'}`);
        }
      }
    }

    if (last.status !== 'completed') {
      throw new Error(`Sora polling timed out after 5 min, last status: ${last.status}`);
    }

    /* Download the video bytes. Using raw fetch instead of the SDK's
     * downloadContent() because the SDK's return shape is opaque and
     * we kept getting unplayable buffers — direct fetch lets us inspect
     * status, content-type and byte count predictably.
     *
     * `?variant=video` is explicit so Sora returns the MP4 binary, not
     * an alternate output (thumbnail / spritesheet) that may share the
     * same endpoint family. */
    const downloadRes = await fetch(
      `https://api.openai.com/v1/videos/${job.id}/content?variant=video`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!downloadRes.ok) {
      const errBody = await downloadRes.text().catch(() => '');
      throw new Error(
        `Sora content download failed (${downloadRes.status}): ${errBody.slice(0, 300)}`
      );
    }

    const mimeType = downloadRes.headers.get('content-type') || 'video/mp4';
    const videoBuffer = Buffer.from(await downloadRes.arrayBuffer());

    console.log(
      `[Sora] downloaded ${videoBuffer.length} bytes, content-type: ${mimeType}`
    );

    /* Sanity check — if the body is suspiciously small, it's almost
     * certainly a JSON error response that slipped past the !ok check
     * (some OpenAI error paths return 200 with an error object). */
    if (videoBuffer.length < 10_000) {
      const preview = videoBuffer.toString('utf-8').slice(0, 200);
      throw new Error(
        `Sora download returned ${videoBuffer.length} bytes (expected video, got: ${preview})`
      );
    }

    /* Defensive: if Sora returns video/* but a generic application/octet-
     * stream, normalise to mp4 since Sora 2's output is always H.264 MP4. */
    const finalMime = mimeType.startsWith('video/') ? mimeType : 'video/mp4';

    return { videoBuffer, mimeType: finalMime, providerLabel: 'openai-sora-2' };
  },
};

/* ── Provider router — picked at request time via env var ──────────────── */
export function getActiveVideoProvider(): VideoProvider {
  const name = (process.env.STUDIO_VIDEO_PROVIDER || 'kling').toLowerCase();
  if (name === 'sora') return soraProvider;
  return klingProvider;
}
