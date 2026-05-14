/**
 * Aimily Studio · Multi-format derivative pipeline
 *
 * Each Studio output is generated ONCE at master resolution (1024x1536 from
 * gpt-image-1.5 or 2048x2048 if upscaled). This module then derives the 12
 * channel-specific formats via `sharp` post-processing — purely CPU local,
 * $0 additional API cost. The cost analysis in the business plan §3.4
 * depends on this step costing nothing more than storage.
 *
 * Sharp's "attention" crop strategy uses entropy-based smart cropping to
 * avoid cutting faces or products on off-center fashion compositions. This
 * works for ≈95% of cases; the remaining 5% would benefit from a manual
 * crop UI (v2 feature).
 *
 * Reference: business-plan_aimily-studio-2026-05-14.md §0.0 decision #7
 * Reference: .planning/studio/IMPLEMENTATION-PLAN.md §2.3
 */

import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { ensureSafeExternalUrl } from '@/lib/url-allowlist';

export interface StudioFormat {
  key: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'inside';
  /** Sharp position: a strategy enum value (smart crop) or a gravity string ('centre', etc.) */
  position: number | string;
  quality: number;
}

/**
 * The 12 channel-specific formats every Studio output is derived into.
 *
 * Aspect ratios cover Instagram (square, 4:5, 9:16), TikTok (9:16),
 * Pinterest (2:3), Facebook/LinkedIn Ads (1.91:1), Twitter (16:9), Web
 * hero (16:9), e-commerce PDP (1:1 oversized), Print A4 (3:4 @ ~300dpi),
 * Email banner (4:1).
 *
 * "attention" = sharp's smart-crop based on visual saliency. Falls back
 * to centre when no clear focal point exists.
 */
export const STUDIO_FORMATS: StudioFormat[] = [
  { key: 'instagram-square', width: 1080, height: 1080, fit: 'cover', position: sharp.strategy.attention, quality: 92 },
  { key: 'instagram-portrait', width: 1080, height: 1350, fit: 'cover', position: sharp.strategy.attention, quality: 92 },
  { key: 'instagram-story', width: 1080, height: 1920, fit: 'cover', position: sharp.strategy.attention, quality: 90 },
  { key: 'tiktok-vertical', width: 1080, height: 1920, fit: 'cover', position: sharp.strategy.attention, quality: 90 },
  { key: 'pinterest', width: 1000, height: 1500, fit: 'cover', position: sharp.strategy.attention, quality: 92 },
  { key: 'facebook-ad', width: 1200, height: 628, fit: 'cover', position: sharp.strategy.attention, quality: 88 },
  { key: 'linkedin', width: 1200, height: 628, fit: 'cover', position: sharp.strategy.attention, quality: 88 },
  { key: 'twitter', width: 1200, height: 675, fit: 'cover', position: sharp.strategy.attention, quality: 88 },
  { key: 'web-hero', width: 1920, height: 1080, fit: 'cover', position: sharp.strategy.attention, quality: 90 },
  { key: 'ecommerce-pdp', width: 2000, height: 2000, fit: 'cover', position: 'centre', quality: 94 },
  { key: 'print-a4', width: 2480, height: 3508, fit: 'cover', position: sharp.strategy.attention, quality: 95 },
  { key: 'email-banner', width: 1200, height: 300, fit: 'cover', position: sharp.strategy.attention, quality: 88 },
];

const FORMAT_BUCKET = 'studio-outputs';

export interface GeneratedFormat {
  format_key: string;
  storage_url: string;
  width: number;
  height: number;
  file_size: number;
}

/**
 * Download the master image, derive all 12 formats with sharp, upload each
 * to Supabase storage, and insert rows into `studio_output_formats`.
 *
 * This runs server-side after the master is persisted. It is NOT awaited by
 * the API response — the gallery can show formats as they appear. (For v1
 * we DO await in the response path because the dev server's edge cases are
 * less surprising synchronous; we move to background job after MVP.)
 */
export async function generateAllFormats(opts: {
  masterUrl: string;
  assetId: string;
  studioProjectId: string;
}): Promise<GeneratedFormat[]> {
  await ensureSafeExternalUrl(opts.masterUrl);

  const masterRes = await fetch(opts.masterUrl, { signal: AbortSignal.timeout(30_000) });
  if (!masterRes.ok) {
    throw new Error(`Master fetch failed: ${masterRes.status}`);
  }
  const masterBuffer = Buffer.from(await masterRes.arrayBuffer());

  const supabase = await createClient();
  const generated: GeneratedFormat[] = [];

  for (const fmt of STUDIO_FORMATS) {
    try {
      const resizedBuffer = await sharp(masterBuffer)
        .resize(fmt.width, fmt.height, { fit: fmt.fit, position: fmt.position })
        .jpeg({ quality: fmt.quality, mozjpeg: true })
        .toBuffer();

      const storagePath = `${opts.studioProjectId}/${opts.assetId}/${fmt.key}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(FORMAT_BUCKET)
        .upload(storagePath, resizedBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error(`[Studio] Upload failed for ${fmt.key}:`, uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from(FORMAT_BUCKET).getPublicUrl(storagePath);
      const storageUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase.from('studio_output_formats').insert({
        asset_id: opts.assetId,
        format_key: fmt.key,
        storage_url: storageUrl,
        width: fmt.width,
        height: fmt.height,
        file_size: resizedBuffer.byteLength,
      });

      if (insertError) {
        console.error(`[Studio] DB insert failed for ${fmt.key}:`, insertError);
        continue;
      }

      generated.push({
        format_key: fmt.key,
        storage_url: storageUrl,
        width: fmt.width,
        height: fmt.height,
        file_size: resizedBuffer.byteLength,
      });
    } catch (e) {
      console.error(`[Studio] Format pipeline error for ${fmt.key}:`, e);
    }
  }

  return generated;
}
