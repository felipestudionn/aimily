import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Freepik Mystic API — Photorealistic Render (single angle)
   User picks angle → auto-adjusts prompt + structure_strength
   Engine: magnific_sharpy for max texture detail
   Styling.colors: injects exact colorway hexes
   ═══════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FREEPIK_API = 'https://api.freepik.com/v1/ai/mystic';

interface ZoneColor { zone: string; hex: string; }
interface ZoneMaterial { zone: string; material: string; finish?: string; }

interface DesignContext {
  productName?: string;
  productType?: string;
  colorway?: string;
  colorHexes?: { hex: string; weight?: number }[];
  colorZones?: ZoneColor[];
  materialZones?: ZoneMaterial[];
  materials?: string;
  designNotes?: string;
}

export type RenderAngle = 'front' | 'three_quarter' | 'side' | 'back';

interface AngleConfig {
  label: string;
  promptSuffix: string;
  structureStrength: number;
}

const ANGLE_CONFIGS: Record<RenderAngle, AngleConfig> = {
  front: {
    label: 'Front',
    promptSuffix: 'Straight front view, centered, symmetrical composition',
    structureStrength: 85,
  },
  three_quarter: {
    label: 'Three-Quarter',
    promptSuffix: 'Three-quarter angle view, showing depth and volume, slightly rotated 30-45 degrees',
    structureStrength: 85,
  },
  side: {
    label: 'Side Profile',
    promptSuffix: 'Side profile view pointing left, 90-degree lateral exterior angle, showing full silhouette, sole unit, and construction details',
    structureStrength: 70,
  },
  back: {
    label: 'Back',
    promptSuffix: 'Back view, showing rear construction, heel counter, back panel details',
    structureStrength: 40,
  },
};

function buildPrompt(dc: DesignContext, angleConfig: AngleConfig): string {
  // Build rich zone-based descriptions if available
  const zoneColorDesc = dc.colorZones?.length
    ? 'Color specification by component: ' + dc.colorZones.map(z => `${z.zone}: ${z.hex}`).join(', ')
    : dc.colorway ? `Color: ${dc.colorway}` : '';

  const zoneMaterialDesc = dc.materialZones?.filter(z => z.material).length
    ? 'Material specification by component: ' + dc.materialZones.filter(z => z.material).map(z =>
        `${z.zone}: ${z.material}${z.finish ? ` (${z.finish})` : ''}`
      ).join(', ')
    : dc.materials ? `Material finish: ${dc.materials}` : '';

  return [
    `Photorealistic product photograph of ${dc.productName || 'fashion product'}`,
    dc.productType ? `Product type: ${dc.productType}` : '',
    zoneColorDesc,
    zoneMaterialDesc,
    dc.designNotes ? `Design: ${dc.designNotes}` : '',
    angleConfig.promptSuffix,
    'Product only on neutral light grey background',
    'Soft natural shadow beneath product, studio photography lighting',
    'Sharp focus on material texture, stitching details, and construction',
    'No human body, no mannequin, clean background',
    'Photorealistic, high-end e-commerce product shot',
  ].filter(Boolean).join('. ');
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    if (!FREEPIK_API_KEY) {
      return NextResponse.json({ error: 'Freepik API key not configured' }, { status: 500 });
    }

    const { sketch_base64, design_context, collectionPlanId, angle } = await req.json();

    if (!sketch_base64) {
      return NextResponse.json({ error: 'sketch_base64 is required' }, { status: 400 });
    }

    const dc: DesignContext = design_context || {};
    const selectedAngle: RenderAngle = (angle && angle in ANGLE_CONFIGS) ? angle : 'three_quarter';
    const config = ANGLE_CONFIGS[selectedAngle];

    const prompt = buildPrompt(dc, config);

    // Strip data URL prefix if present
    const base64Data = sketch_base64.includes('base64,')
      ? sketch_base64.split('base64,')[1]
      : sketch_base64;

    // Build styling.colors from colorway hexes
    const styling: Record<string, unknown> | undefined = dc.colorHexes?.length
      ? {
          colors: dc.colorHexes.slice(0, 5).map(c => ({
            color: c.hex.toUpperCase().replace(/^(?!#)/, '#'),
            weight: c.weight ?? 0.5,
          })),
        }
      : undefined;

    const body: Record<string, unknown> = {
      prompt,
      structure_reference: base64Data,
      structure_strength: config.structureStrength,
      resolution: '1k',
      aspect_ratio: 'square_1_1',
      model: 'realism',
      engine: 'magnific_sharpy',
      creative_detailing: '50',
    };
    if (styling) body.styling = styling;

    // Create task
    const createRes = await fetch(FREEPIK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': FREEPIK_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error('[Freepik Render] Create failed:', err);
      return NextResponse.json({ error: err.message || 'Freepik API error' }, { status: createRes.status });
    }

    const { data: createData } = await createRes.json();
    const taskId = createData?.task_id;

    if (!taskId) {
      return NextResponse.json({ error: 'No task_id returned' }, { status: 500 });
    }

    // Poll for completion (max 120 seconds)
    let imageUrl: string | null = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const statusRes = await fetch(`${FREEPIK_API}/${taskId}`, {
        headers: { 'x-freepik-api-key': FREEPIK_API_KEY },
      });
      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === 'COMPLETED') {
        imageUrl = statusData.data?.generated?.[0] || null;
        break;
      }
      if (status === 'FAILED') {
        console.error('[Freepik Render] Task failed:', statusData);
        return NextResponse.json({ error: 'Render generation failed' }, { status: 500 });
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Render timed out' }, { status: 504 });
    }

    // Persist to Supabase Storage
    let finalUrl = imageUrl;
    if (collectionPlanId) {
      try {
        const { publicUrl } = await persistAsset({
          collectionPlanId,
          assetType: 'render',
          name: `Render ${dc.productName || 'Product'} — ${config.label}`,
          sourceUrl: imageUrl,
          phase: 'design',
          metadata: { provider: 'freepik-mystic', taskId, angle: selectedAngle },
          uploadedBy: user.id,
        });
        finalUrl = publicUrl;
      } catch (err) {
        console.error('[Freepik Render] Persist failed:', err);
      }
    }

    return NextResponse.json({
      images: [{ url: finalUrl, originalUrl: imageUrl }],
      angle: selectedAngle,
      taskId,
      provider: 'freepik-mystic',
    });
  } catch (error) {
    console.error('[Freepik Render] Error:', error);
    const message = error instanceof Error ? error.message : 'Render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
