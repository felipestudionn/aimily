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

/* ── Legacy motion presets (kept for backwards compat in old assets) ── */
export type VideoMotion = 'subtle' | 'walk' | 'pan' | 'zoom' | 'turn' | 'dolly';

/* ── Canonical 10 fashion video styles ─────────────────────────────────
 * Replaces the previous 6 generic motion presets. Each style maps to a
 * specific channel + brand archetype + intent + pace combination that
 * fashion industry actually uses. Names stay English (brand vocabulary).
 *
 *   PRESERVE MODE — subject stays in pose, only micro-motion. The input
 *                   image IS the result, just with breath, gaze, light.
 *                   Use when you want the photo to come subtly alive.
 *
 *   ANIMATED MODE — subject can change position (walk, turn) but face,
 *                   garment, scene type all stay identical. Use when
 *                   you want a real motion piece.
 *
 * Either way, the input image is the absolute visual baseline. The
 * STYLE_PREAMBLE clamps identity, garment, scene, and lighting across
 * every frame. */
export type VideoStyle =
  | 'editorial-stillness'   // preserve · painterly tableau alive
  | 'direct-address'        // preserve · eye contact + slow turn
  | 'wind-light'            // preserve · environmental motion
  | 'avant-garde'           // preserve · sculptural tension
  | 'product-macro'         // preserve · craft detail focus
  | 'campaign-hero'         // animated · cinematic narrative beat
  | 'runway-reveal'         // animated · rotation showcase
  | 'playful-bounce'        // animated · joy/social energy
  | 'street-kinetic'        // animated · urban documentary
  | 'slow-reveal';          // animated · luxury patience build-up

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

/* ════════════════════════════════════════════════════════════════════════
   IMAGE-PRESERVATION PREAMBLES — clamped before every style motion.

   The input image is the absolute visual baseline. The AI must not drift
   the face, the garment, the scene type, the lighting, or the color
   palette across the clip. The style-specific motion is ADDITIVE on top
   of this baseline.

   Two preambles for the two modes:
     - PRESERVE: stricter — subject stays in pose, only micro-motion
     - ANIMATED: less strict on pose, but identity / garment / scene
                 stay identical
   ════════════════════════════════════════════════════════════════════════ */

const PRESERVE_PREAMBLE =
  'ABSOLUTE FRAME PRESERVATION: every frame of this video must match the input image exactly in composition, pose, framing, lighting, color, and visual elements. The subject does NOT change position. The camera does NOT move significantly. The garment is identical pixel by pixel — same colorway, same silhouette, same materials, same construction. The face and hair are identical to the input. Only micro-motion is added on top: breath, gaze direction, fabric drift in soft air, hair drift, light shifts. This is a still image brought subtly to life, not a new motion piece. Every frame should look like a slight time-shift of the input photo, never a different photo.';

const ANIMATED_PREAMBLE =
  'ABSOLUTE IDENTITY + GARMENT + STYLE PRESERVATION: the input image is the first frame and the visual baseline for every frame after. Preserve identically across the entire clip: the subject\'s face / facial features / hair color and style / skin tone (this is the identity, non-negotiable). The exact garment — same colorway, same silhouette, same materials, same construction. The lighting quality and direction. The color palette and grade. The location type and atmosphere. Only the motion described below is allowed to differ from the input. Every frame must still read as the same person, wearing the same outfit, in the same world.';

/* ════════════════════════════════════════════════════════════════════════
   The 10 canonical fashion video styles. Each entry maps to:
     mode    — preserve vs animated (drives which preamble is used)
     motion  — the specific motion vocabulary for THIS style
     styleRef — brand references that anchor the look
   The final prompt is: preamble + motion + styleRef + wrapper.
   ════════════════════════════════════════════════════════════════════════ */

interface VideoStyleDefinition {
  mode: 'preserve' | 'animated';
  motion: string;
  styleRef: string;
}

export const VIDEO_STYLE_PROMPTS: Record<VideoStyle, VideoStyleDefinition> = {
  'editorial-stillness': {
    mode: 'preserve',
    motion: 'The subject stays exactly in pose, fully still. The only motion is: chest rises softly with a slow breath, fabric drapes shift in soft air, hair catches the light with micro-drift, light glows gently. Painterly tableau, every frame composed like a still photograph in subtle motion.',
    styleRef: 'Bottega Veneta campaign film, Khaite editorial film, Lemaire film, The Row film',
  },
  'direct-address': {
    mode: 'preserve',
    motion: 'The subject holds the pose from the input image exactly. The eyes meet the camera with quiet, sustained eye contact. A single slow breath visible. Optionally, a slight head turn within the same plane — no body change. The gaze carries the entire clip.',
    styleRef: 'Calvin Klein campaign portrait, Acne Studios portrait film, Carhartt portrait, Lemaire portrait',
  },
  'wind-light': {
    mode: 'preserve',
    motion: 'The subject is still in the input pose, fully composed. Around the subject: wind moves through fabric and hair in gentle waves, sunlight shifts softly across the scene, dust particles or atmosphere catch in the light. The subject\'s gaze drifts softly. Loop-friendly, dream-like.',
    styleRef: 'Self-Portrait campaign film, Zimmermann editorial film, Cecilie Bahnsen film',
  },
  'avant-garde': {
    mode: 'preserve',
    motion: 'The subject holds the input pose with monumental, sculptural presence — almost statuesque. Only the slightest breath visible. Slow, unsettling pacing. Deep shadows preserved from the input. The composition stays brutalist and intentional, identical to the input image throughout.',
    styleRef: 'Rick Owens runway film, Comme des Garçons campaign, Yohji Yamamoto film',
  },
  'product-macro': {
    mode: 'preserve',
    motion: 'The subject is still and serves as context. Focus on the product / garment surface — fabric weave, stitching, hardware, texture all visible and intimate. Fabric moves subtly in soft air, light plays across the material. The composition stays anchored to the input image.',
    styleRef: 'Hermès craft film, Loewe leather film, ARC\'TERYX product story, The Row craft film',
  },
  'campaign-hero': {
    mode: 'animated',
    motion: 'Cinematic fashion campaign film. The first frame matches the input image. The subject becomes alive — a slow cinematic dolly-in toward them, the head lifts to meet the camera, eyes connect with the viewer, hair and fabric move with the body. The garment and identity stay pixel-perfect.',
    styleRef: 'Hereu campaign film, Loewe campaign, Jacquemus campaign, Lemaire campaign',
  },
  'runway-reveal': {
    mode: 'animated',
    motion: 'Editorial runway-style rotation. The first frame matches the input image. A smooth orbital camera arc reveals the outfit from front to side and back, while the subject holds a confident pose throughout the rotation. Subtle micro-movements of fabric and hair as the camera moves.',
    styleRef: 'Net-a-Porter runway b-roll, fashion show entry, editorial lookbook spin',
  },
  'playful-bounce': {
    mode: 'animated',
    motion: 'Joyful fashion campaign film, social-native energy. First frame matches the input. The subject moves with playful confidence — a sudden smile, a quick head turn, hair flips, gaze sparkles at the camera. Light leaks catch the lens, film grain, slight handheld bounce. The garment and identity stay identical.',
    styleRef: 'Jacquemus campaign, Loewe campaign, Diesel film, JW Anderson campaign',
  },
  'street-kinetic': {
    mode: 'animated',
    motion: 'Urban street-style fashion film, documentary aesthetic. First frame matches the input. Handheld camera follows the subject moving through the scene with confident street pace, slight motion blur at the frame edges. Occasionally glances at the camera. The garment stays pixel-perfect.',
    styleRef: 'Off-White lookbook film, Carhartt WIP campaign, Heaven by Marc Jacobs',
  },
  'slow-reveal': {
    mode: 'animated',
    motion: 'Luxury fashion film with patient reveal. First frame matches the input image as the wide composition. A slow cinematic crane-down OR a gradual dolly-back from a macro detail builds tension toward the final wide shot. Every transition deliberate. The subject is present, alive with quiet breath. Garment and scene stay identical.',
    styleRef: 'Cartier high-jewelry campaign film, Hermès short film, The Row campaign film',
  },
};

export interface VideoGenInput {
  imageUrl: string;
  productName: string;
  /* Either a canonical style (preferred) OR a legacy motion preset.
   * If style is set, motion is ignored. */
  style?: VideoStyle;
  motion?: VideoMotion;
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
type PromptVariant = 'safe' | 'rich';

/* Map legacy motion presets to a default style if no style is provided.
 * Keeps existing callsites working during the transition window. */
const LEGACY_MOTION_TO_STYLE: Record<VideoMotion, VideoStyle> = {
  subtle: 'editorial-stillness',
  walk: 'street-kinetic',
  pan: 'editorial-stillness',
  zoom: 'product-macro',
  turn: 'runway-reveal',
  dolly: 'campaign-hero',
};

function buildVideoPrompt(input: VideoGenInput, variant: PromptVariant = 'rich'): string {
  /* Sora's classifier is too aggressive for the rich subject-action
   * vocabulary — keep the legacy SAFE prompt path for it. */
  if (variant === 'safe') {
    const presets = MOTION_PROMPTS_SAFE;
    const motionKey: VideoMotion = input.motion || 'subtle';
    const motionDesc = presets[motionKey] || presets.subtle;
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

  /* RICH path — Happy Horse, Kling. Uses the new 10-style canonical
   * system with image-preservation preambles. The input image is the
   * absolute visual baseline; style-specific motion is additive. */

  // Determine the style — explicit param, or legacy motion fallback.
  const resolvedStyle: VideoStyle =
    input.style || LEGACY_MOTION_TO_STYLE[input.motion || 'subtle'] || 'editorial-stillness';
  const styleDef = VIDEO_STYLE_PROMPTS[resolvedStyle];
  const preamble = styleDef.mode === 'preserve' ? PRESERVE_PREAMBLE : ANIMATED_PREAMBLE;

  const parts = [
    /* 1. Preservation preamble — clamps identity/garment/scene across the
     *    whole clip. This is the LAW the rest of the prompt operates under. */
    preamble,
    /* 2. Fashion editorial framing. */
    `This is a cinematic fashion editorial video featuring: ${input.productName}.`,
    /* 3. Style-specific motion description (the only thing that varies between
     *    the 10 styles). */
    styleDef.motion,
    /* 4. Style references — anchor the visual / pacing vocabulary to specific
     *    fashion films the AI will recognise. */
    `Style reference: ${styleDef.styleRef}.`,
    /* 5. Universal craft directives. */
    'Director-of-photography lighting: cinematic, soft directional key light, shallow depth of field, natural fabric and skin texture, color graded to film stock.',
    'No text, no watermark, no brand logos added.',
  ];
  if (input.userPrompt?.trim()) parts.push(`Additional art direction: ${input.userPrompt.trim()}.`);
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

    /* Kling 2.1 Pro takes 2-5 min typically, up to 7 min at peak. We
     * cap at ~4.6 min to stay under Vercel's 300s function maxDuration.
     * If we still timeout at peak Magnific load, we lose €1 to Magnific
     * but the Studio user's pack output is still refunded by the route's
     * catch-all refund path. That's a cost-of-doing-business issue with
     * Kling at peak; longer term the fix is webhook-based async retrieval. */
    for (let i = 0; i < 56; i++) {
      await new Promise((r) => setTimeout(r, 5000)); // 5s × 56 = 280s = 4m40s
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
    throw new Error(`Kling polling timed out after 4m40s (task_id: ${taskId})`);
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
