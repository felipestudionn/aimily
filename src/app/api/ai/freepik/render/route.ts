import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

/* ═══════════════════════════════════════════════════════════
   Freepik Mystic API — Sketch to Photorealistic Render
   Uses structure_reference to preserve sketch silhouette
   Pay-per-use ~$0.002/image
   ═══════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FREEPIK_API = 'https://api.freepik.com/v1/ai/mystic';

interface DesignContext {
  productName?: string;
  productType?: string;
  colorway?: string;
  materials?: string;
  designNotes?: string;
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

    const { sketch_base64, design_context, collectionPlanId } = await req.json();

    if (!sketch_base64) {
      return NextResponse.json({ error: 'sketch_base64 is required' }, { status: 400 });
    }

    const dc: DesignContext = design_context || {};

    // Build prompt from design context
    const promptParts = [
      `Photorealistic product photograph of ${dc.productName || 'fashion product'}`,
      dc.productType ? `Product type: ${dc.productType}` : '',
      dc.colorway ? `Color: ${dc.colorway}` : '',
      dc.materials ? `Material finish: ${dc.materials}` : '',
      dc.designNotes ? `Design: ${dc.designNotes}` : '',
      'Three-quarter angle view, pair of shoes, neutral light grey background',
      'Soft natural shadow beneath product, studio photography lighting',
      'Sharp focus on material texture, stitching details, and construction',
      'No human body, no mannequin, product only on clean background',
      'Photorealistic, high-end e-commerce product shot',
    ].filter(Boolean).join('. ');

    // Strip data URL prefix if present
    const base64Data = sketch_base64.includes('base64,')
      ? sketch_base64.split('base64,')[1]
      : sketch_base64;

    // Call Freepik Mystic API
    const createRes = await fetch(FREEPIK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': FREEPIK_API_KEY,
      },
      body: JSON.stringify({
        prompt: promptParts,
        structure_reference: base64Data,
        structure_strength: 80,
        resolution: '2k',
        aspect_ratio: 'square_1_1',
        model: 'realism',
      }),
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

    // Poll for completion (max 90 seconds)
    let imageUrl: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));

      const statusRes = await fetch(`${FREEPIK_API}/${taskId}`, {
        headers: { 'x-freepik-api-key': FREEPIK_API_KEY },
      });
      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === 'COMPLETED') {
        const images = statusData.data?.generated || [];
        imageUrl = images[0] || null;
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

    // Persist to Supabase Storage if collectionPlanId provided
    let finalUrl = imageUrl;
    if (collectionPlanId) {
      try {
        const { publicUrl } = await persistAsset({
          collectionPlanId,
          assetType: 'render',
          name: `Render ${dc.productName || 'Product'}`,
          sourceUrl: imageUrl,
          phase: 'design',
          metadata: { provider: 'freepik-mystic', taskId, prompt: promptParts },
          uploadedBy: user.id,
        });
        finalUrl = publicUrl;
      } catch (err) {
        console.error('[Freepik Render] Persist failed:', err);
        // Still return the Freepik URL if persist fails
      }
    }

    return NextResponse.json({
      images: [{ url: finalUrl, originalUrl: imageUrl }],
      taskId,
      provider: 'freepik-mystic',
    });
  } catch (error) {
    console.error('[Freepik Render] Error:', error);
    const message = error instanceof Error ? error.message : 'Render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
