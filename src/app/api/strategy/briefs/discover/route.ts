/**
 * POST /api/strategy/briefs/discover
 *
 * Returns an AI-discovered draft creative brief for the tenant. The draft
 * is NOT persisted — the user reviews + accepts, then POSTs the accepted
 * shape to /api/strategy/briefs to create the real row.
 *
 * Body: { tenant_slug: string, season?: string, language?: 'en' | 'es' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import {
  discoverCreativeBrief,
  type SelectedTrend,
} from '@/lib/strategy/creative-discovery';

const VALID_DIMS: SelectedTrend['dimension'][] = [
  'silhouette',
  'pattern',
  'color',
  'material',
  'reference_brand',
];

function normalizeSelectedTrends(raw: unknown): SelectedTrend[] {
  // Accept two shapes from CreativeBlock for backwards-compat:
  //   A) [{ dimension, title, product_spec?, color_hex?, color_name? }, ...]
  //   B) ['Vestido midi al bies', 'Bone', ...]  (legacy · titles only)
  // Shape B has no dimension, so we drop those silently — the hard
  // constraint only fires when the client sends shape A.
  if (!Array.isArray(raw)) return [];
  const out: SelectedTrend[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const dim = rec.dimension;
    const title = rec.title;
    if (typeof dim !== 'string' || !VALID_DIMS.includes(dim as SelectedTrend['dimension'])) continue;
    if (typeof title !== 'string' || !title.trim()) continue;
    out.push({
      dimension: dim as SelectedTrend['dimension'],
      title: title.trim(),
      product_spec: typeof rec.product_spec === 'string' ? rec.product_spec : undefined,
      color_hex: typeof rec.color_hex === 'string' ? rec.color_hex : undefined,
      color_name: typeof rec.color_name === 'string' ? rec.color_name : undefined,
    });
    if (out.length >= 40) break; // hard cap to keep prompt size sane
  }
  return out;
}

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantSlug = body?.tenant_slug;
  if (typeof tenantSlug !== 'string' || !tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;

  // Moodboard input (NEW · vision-driven primary mode):
  // { moodboard: { images?: [{base64, mimeType}], imageUrls?: string[] } }
  const moodboard =
    body.moodboard && typeof body.moodboard === 'object'
      ? {
          images: Array.isArray(body.moodboard.images)
            ? body.moodboard.images
                .filter(
                  (img: any) =>
                    img && typeof img.base64 === 'string' && typeof img.mimeType === 'string'
                )
                .slice(0, 12)
            : undefined,
          imageUrls: Array.isArray(body.moodboard.imageUrls)
            ? body.moodboard.imageUrls
                .filter((u: any) => typeof u === 'string' && u.startsWith('http'))
                .slice(0, 12)
            : undefined,
        }
      : undefined;

  const selectedTrends = normalizeSelectedTrends(body.selected_trends);

  try {
    const result = await discoverCreativeBrief({
      tenantId: access.tenant.id,
      moodboard,
      selectedTrends,
      season: typeof body.season === 'string' ? body.season : undefined,
      language: body.language === 'es' || body.language === 'en' ? body.language : undefined,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Creative discovery failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
