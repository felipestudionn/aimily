/**
 * Aimily Studio · Background removal (Recraft / Photoroom API wrapper)
 *
 * The client uploads a raw product photo (phone shot, busy background, etc.).
 * Before passing it to gpt-image-1.5 as `product_image_url`, we want a clean
 * cutout on a neutral background so the AI doesn't accidentally generate
 * elements that came from the cluttered upload.
 *
 * Provider plan:
 *   - Recraft API (primary): https://docs.recraft.ai
 *   - Photoroom API (fallback): https://www.photoroom.com/api
 *   - If neither key is configured: pass through the original URL with a
 *     warning flag. The client UI will tell the user "for best results,
 *     upload a clean product photo" but generation still proceeds.
 *
 * Cost when configured: ~$0.02–0.05 per cutout. Plan §0.0 decision #8.
 *
 * Implementation status v1: GRACEFUL FALLBACK (no API key configured).
 * To activate: add `RECRAFT_API_KEY=...` to `.env.local` + Vercel envs.
 *
 * Reference: business-plan_aimily-studio-2026-05-14.md §0.0 decision #8
 */

const RECRAFT_API_KEY = process.env.RECRAFT_API_KEY;
const PHOTOROOM_API_KEY = process.env.PHOTOROOM_API_KEY;

export interface BackgroundRemovalResult {
  cleanedUrl: string;
  provider: 'recraft' | 'photoroom' | 'none';
  /** True when no API was used (passthrough). UI may want to advise the user. */
  passthrough: boolean;
}

export async function removeBackground(inputUrl: string): Promise<BackgroundRemovalResult> {
  // Recraft primary
  if (RECRAFT_API_KEY) {
    try {
      const cleaned = await callRecraft(inputUrl);
      if (cleaned) return { cleanedUrl: cleaned, provider: 'recraft', passthrough: false };
    } catch (e) {
      console.error('[Studio bg-removal] Recraft failed, trying Photoroom:', e);
    }
  }

  // Photoroom fallback
  if (PHOTOROOM_API_KEY) {
    try {
      const cleaned = await callPhotoroom(inputUrl);
      if (cleaned) return { cleanedUrl: cleaned, provider: 'photoroom', passthrough: false };
    } catch (e) {
      console.error('[Studio bg-removal] Photoroom failed, falling back to passthrough:', e);
    }
  }

  // Passthrough — no provider configured or both failed
  return { cleanedUrl: inputUrl, provider: 'none', passthrough: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Provider implementations (kept inline — small, no separate file needed)
// ─────────────────────────────────────────────────────────────────────────

async function callRecraft(imageUrl: string): Promise<string | null> {
  // Recraft removeBackground endpoint
  // Docs: https://www.recraft.ai/docs/api
  const res = await fetch('https://external.api.recraft.ai/v1/images/removeBackground', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RECRAFT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url: imageUrl }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    console.error('[Recraft] HTTP', res.status, await res.text().catch(() => '<no body>'));
    return null;
  }

  const json: { image?: { url?: string } } = await res.json();
  return json.image?.url || null;
}

async function callPhotoroom(imageUrl: string): Promise<string | null> {
  // Photoroom v1 endpoint
  // Docs: https://www.photoroom.com/api/docs/reference/v1/segment
  const form = new FormData();
  form.append('image_url', imageUrl);

  const res = await fetch('https://image-api.photoroom.com/v2/edit', {
    method: 'POST',
    headers: {
      'x-api-key': PHOTOROOM_API_KEY!,
    },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    console.error('[Photoroom] HTTP', res.status, await res.text().catch(() => '<no body>'));
    return null;
  }

  // Photoroom returns the cleaned image bytes — we'd need to upload back to
  // our Supabase storage to get a URL. For v1, signal not-implemented to
  // fall to passthrough. When Felipe activates Photoroom, complete this.
  console.warn('[Photoroom] storage roundtrip not yet implemented — passthrough');
  return null;
}
