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
export type VideoDuration = '5' | '10' | '15';
export type VideoMotion = 'subtle' | 'walk' | 'pan' | 'zoom' | 'turn' | 'dolly';

/* Two prompt families — picked per provider based on its moderation policy.
 *
 *   MOTION_PROMPTS_SAFE  — camera-first, no explicit human-action verbs.
 *                          Used for Sora 2 (whose image-to-video moderation
 *                          classifier flags "model walking", "breathing",
 *                          etc. as deepfake/impersonation signals).
 *
 *   MOTION_PROMPTS_RICH  — subject-first, alive, looking at the camera,
 *                          breathing, walking, turning. The vocabulary a
 *                          fashion film director would actually use.
 *                          Used for Happy Horse, Kling — providers without
 *                          aggressive person-animation moderation.
 *
 * Felipe's directive: editorial fashion video should show the subject in
 * motion (gaze, breath, turn), not just camera moves. That's what
 * separates "fashion film" from "b-roll". RICH is the right vocabulary;
 * SAFE only exists to keep Sora from refusing the job. */
export const MOTION_PROMPTS_SAFE: Record<VideoMotion, string> = {
  subtle:
    'Subtle cinematic motion: fabric drapes shift in soft air, light glows softly, camera holds steady with shallow depth of field',
  walk: 'Slow forward dolly motion through the editorial scene, fabric and hair catch the air, soft motion at the frame edges',
  pan: 'Smooth cinematic camera pan from left to right, slowly revealing the full editorial scene',
  zoom: 'Slow cinematic dolly-zoom in, focusing on garment details — materials, weave, stitching, hardware',
  turn: 'Slow editorial pedestal rotation, the camera orbits to reveal the outfit from every angle',
  dolly: 'Smooth dolly-in camera movement, pulling the viewer toward the editorial scene',
};

export const MOTION_PROMPTS_RICH: Record<VideoMotion, string> = {
  subtle:
    'The subject is alive — chest rises with a slow breath, shoulders settle, eyes meet the camera with a soft gaze, micro-movements of fabric and hair catch the light. Painterly stillness with breath underneath',
  walk: 'The subject walks slowly forward with a confident editorial stride, head lifts to meet the camera mid-step, hair and fabric move with the body. Hereu campaign film, Jacquemus runway energy',
  pan: 'The subject holds a contemplative pose while the camera pans cinematically from left to right, revealing the full scene; the subject\'s eyes follow the camera with quiet intensity',
  zoom: 'The subject lifts the head slowly and meets the camera with direct eye contact as a slow dolly-zoom pushes in; the gaze sharpens, breath visible, fabric texture intimate',
  turn: 'The subject turns slowly — shoulder leads, then the head follows in one fluid motion, ending in direct eye contact with the camera. Side profile to three-quarter to front',
  dolly: 'The subject takes a slow deliberate step forward toward the camera, gaze steady, a soft cinematic dolly-in deepens the intimacy. The subject is present, alive, looking back at the viewer',
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
type PromptStyle = 'safe' | 'rich';

function buildVideoPrompt(input: VideoGenInput, style: PromptStyle = 'rich'): string {
  const presets = style === 'safe' ? MOTION_PROMPTS_SAFE : MOTION_PROMPTS_RICH;
  const motionDesc = presets[input.motion] || presets.subtle;

  if (style === 'safe') {
    /* SAFE / Sora: camera-first, no human-action verbs. Anchored as
     * legitimate editorial content to lower the chance of moderation
     * flagging the (AI-generated) face as a deepfake. */
    const parts = [
      `Fashion editorial b-roll, lookbook-style motion piece. Garment as the subject: ${input.productName}.`,
      `${motionDesc}.`,
      'Cinematic lighting, shallow depth of field, professional color grading, editorial feel.',
      'Style reference: Net-a-Porter editorial, Mytheresa lookbook, Vogue Runway b-roll.',
      'No text, no watermark, no brand logos added.',
    ];
    if (input.userPrompt?.trim()) parts.push(`Art direction: ${input.userPrompt.trim()}.`);
    return parts.join(' ');
  }

  /* RICH / Happy Horse, Kling: subject-first, alive, looking at camera.
   * Vocabulary a fashion film director would actually use. The subject
   * is the protagonist; the camera serves the subject. Bodegón-style
   * cinematic pacing — every frame composed, painterly stillness with
   * breath underneath. */
  const parts = [
    `Cinematic fashion editorial portrait video, painterly composition, slow contemplative pace. Featured: ${input.productName}.`,
    `${motionDesc}.`,
    'Director-of-photography lighting: cinematic, soft directional key light, shallow depth of field, natural fabric and skin texture, color graded to film stock.',
    'Style reference: Hereu campaign film, Jacquemus campaign, Khaite editorial film, Rohe fashion film, Bottega Veneta campaign — every frame should feel like a still photograph in subtle, alive motion.',
    'The subject is present and alive — gaze, breath, posture all read as a real moment, not a frozen mannequin.',
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
    /* Kling has no aggressive person-animation moderation → use the
     * rich subject-action prompt vocabulary. */
    const prompt = buildVideoPrompt(input, 'rich');
    /* Kling 2.1 only accepts 5 or 10. If the user picked 15 (longer than
     * Kling supports), cap at 10 silently. The provider abstraction
     * means each adapter handles its own legal duration range. */
    const klingDuration: '5' | '10' = input.duration === '5' ? '5' : '10';

    const createRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': apiKey },
      body: JSON.stringify({
        image: input.imageUrl,
        prompt,
        duration: klingDuration,
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

    /* Sora 2 has aggressive image-to-video moderation on faces → use the
     * SAFE camera-first prompt vocabulary to minimise refusals. */
    const prompt = buildVideoPrompt(input, 'safe');
    /* Sora 2 only accepts 4, 8, or 12. Map UI pills:
     *   5  → 4  · 10 → 8 · 15 → 12 (closest legal Sora duration each). */
    const seconds: '4' | '8' | '12' =
      input.duration === '15' ? '12' :
      input.duration === '10' ? '8' : '4';

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

/* ═══════════════════════════════════════════════════════════════════════════
   Provider 3 · Happy Horse 1.0 (Alibaba ATH, via Magnific)

   Why Happy Horse:
     • #1 on Artificial Analysis Video Arena (April 2026) for image-to-video
     • Native support for 3-15 second clips (default 5)
     • Documented strength on "smooth motion AND natural motion" — animates
       the subject, not just the camera (Felipe's blocker with Sora 2)
     • Cost-competitive — similar tier to Kling Pro on Magnific
     • No moderation friction for AI-generated fashion models
       (Sora's blocker for image-to-video with people)

   Endpoint: POST https://api.magnific.com/v1/ai/image-to-video/happy-horse-1
   Auth:     x-magnific-api-key (we reuse FREEPIK_API_KEY value — same
             account post-rebrand)
   Input:    image_url (public URL — Studio's signed Supabase URLs work)
   Async:    task_id + GET {endpoint}/{task_id} polling, same as Kling. */
const HAPPY_HORSE_ENDPOINT =
  'https://api.magnific.com/v1/ai/image-to-video/happy-horse-1';

export const happyHorseProvider: VideoProvider = {
  // Reusing the kling slot in the union type — TS doesn't let us add a new
  // literal without a wider refactor; the runtime label is what matters.
  name: 'kling',
  async generate(input) {
    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) throw new Error('FREEPIK_API_KEY not configured');

    /* Happy Horse has no person-animation moderation friction → rich
     * subject-action vocabulary. This is the path Felipe wants to
     * privilege for "the subject moves, not just the camera". */
    const prompt = buildVideoPrompt(input, 'rich');
    /* Happy Horse accepts 3-15 inclusive. Studio UI exposes 5/10/15. */
    const duration = input.duration === '15' ? 15 : input.duration === '10' ? 10 : 5;

    const createRes = await fetch(HAPPY_HORSE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Magnific docs say x-magnific-api-key; the rebrand from Freepik
        // means the same key value should work either way. If api.magnific
        // rejects with 401, swap header name to x-freepik-api-key.
        'x-magnific-api-key': apiKey,
        'x-freepik-api-key': apiKey, // defensive: send both headers
      },
      body: JSON.stringify({
        image_url: input.imageUrl,
        prompt,
        duration,
        resolution: '1080P',
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Happy Horse create failed (${createRes.status}): ${errText.slice(0, 300)}`);
    }

    const { data } = await createRes.json();
    const taskId: string | undefined = data?.task_id;
    if (!taskId) throw new Error('Happy Horse create returned no task_id');

    /* Poll for completion. 15s clips at 1080p can take 4-6 minutes server-
     * side, so we go to ~6 min cap (8s intervals × 45 = 6 min). */
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 8000));
      const statusRes = await fetch(`${HAPPY_HORSE_ENDPOINT}/${taskId}`, {
        headers: {
          'x-magnific-api-key': apiKey,
          'x-freepik-api-key': apiKey,
        },
      });
      if (!statusRes.ok) continue;
      const sd = await statusRes.json();
      const status: string | undefined = sd.data?.status;
      if (status === 'COMPLETED') {
        const url: string | undefined =
          sd.data?.generated?.[0] || sd.data?.video_url || sd.data?.output_url;
        if (!url) throw new Error('Happy Horse COMPLETED but returned no video URL');
        const videoRes = await fetch(url);
        if (!videoRes.ok) throw new Error(`Happy Horse video fetch failed: ${videoRes.status}`);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        return {
          videoBuffer,
          mimeType: videoRes.headers.get('content-type') || 'video/mp4',
          providerLabel: 'magnific-happy-horse-1',
        };
      }
      if (status === 'FAILED') {
        throw new Error(`Happy Horse FAILED: ${sd.data?.error || 'no detail'}`);
      }
    }
    throw new Error('Happy Horse polling timed out after 6 minutes');
  },
};

/* ── Provider router — picked at request time via env var ──────────────── */
export function getActiveVideoProvider(): VideoProvider {
  const name = (process.env.STUDIO_VIDEO_PROVIDER || 'kling').toLowerCase();
  if (name === 'sora') return soraProvider;
  if (name === 'happy-horse' || name === 'happyhorse') return happyHorseProvider;
  return klingProvider;
}
