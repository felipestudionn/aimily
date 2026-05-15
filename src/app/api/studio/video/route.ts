import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getAuthenticatedUser,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { ADMIN_EMAILS } from '@/lib/stripe';
import { persistStudioAsset } from '@/lib/storage';
import {
  consumeStudioOutput,
  refundStudioOutput,
  studioPoolEmptyResponse,
} from '@/lib/studio/output-checker';
import {
  getActiveVideoProvider,
  type VideoMotion,
  type VideoDuration,
  type VideoTier,
} from '@/lib/studio/video-providers';
import { normalizeAiError } from '@/lib/ai/error-messages';

export const runtime = 'nodejs';
export const maxDuration = 300;

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/video

   Image-to-video for a confirmed Studio output. Uses the active provider
   (Kling 2.1 via Freepik by default, Sora 2 direct from OpenAI when
   STUDIO_VIDEO_PROVIDER=sora) to animate the source image.

   Request:
     {
       source_asset_id: UUID,
       motion: 'subtle' | 'walk' | 'pan' | 'zoom' | 'turn' | 'dolly',
       duration: '5' | '10',
       tier?: 'pro' | 'std',           // Kling-only; ignored by Sora
       user_prompt?: string,
     }

   Budget: counts as 1 Studio output (same as an image). Felipe can
   change this to 5 outputs later by adding a loop around consumeStudio
   Output if the economics shift. With the current Capsule €49 / 10
   outputs pricing, 1 video at ~$1-2 cost still maintains ~80% margin.

   The video bytes are downloaded from the provider and re-uploaded into
   the Studio's own studio-outputs bucket so the URL is stable (Kling
   URLs expire after some time; Supabase signed URLs last a year).
   ═══════════════════════════════════════════════════════════════════════════ */

interface VideoBody {
  source_asset_id: string;
  motion?: VideoMotion;
  duration?: VideoDuration;
  tier?: VideoTier;
  user_prompt?: string;
}

const VALID_MOTIONS: VideoMotion[] = ['subtle', 'walk', 'pan', 'zoom', 'turn', 'dolly'];

export async function POST(req: NextRequest) {
  let userId: string | undefined;
  let purchaseId: string | undefined;
  let consumed = false;

  try {
    // ── 1. Auth + rate limit ─────────────────────────────────────────────
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    userId = user!.id;

    const rateLimited = enforceAiUserRateLimit(userId, 'video');
    if (rateLimited) return rateLimited;

    // ── 2. Parse + validate body ─────────────────────────────────────────
    const body = (await req.json()) as VideoBody;

    if (!body.source_asset_id) {
      return NextResponse.json({ error: 'source_asset_id is required' }, { status: 400 });
    }
    const motion: VideoMotion = VALID_MOTIONS.includes(body.motion as VideoMotion)
      ? (body.motion as VideoMotion)
      : 'subtle';
    const duration: VideoDuration = body.duration === '10' ? '10' : '5';
    const tier: VideoTier = body.tier === 'std' ? 'std' : 'pro';

    // ── 3. Load source asset + verify ownership ──────────────────────────
    const { data: sourceAsset } = await supabaseAdmin
      .from('collection_assets')
      .select('id, studio_project_id, url, name, asset_type, metadata')
      .eq('id', body.source_asset_id)
      .single();

    if (!sourceAsset || !sourceAsset.studio_project_id) {
      return NextResponse.json({ error: 'source asset not found' }, { status: 404 });
    }

    const { data: project } = await supabaseAdmin
      .from('studio_projects')
      .select('id, user_id, brand_name')
      .eq('id', sourceAsset.studio_project_id)
      .single();

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ error: 'source asset not found' }, { status: 404 });
    }

    // ── 4. Admin bypass + budget ─────────────────────────────────────────
    const isAdmin = ADMIN_EMAILS.includes(user!.email || '');
    let isAdminFromDb = false;
    if (!isAdmin) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('is_admin')
        .eq('user_id', userId)
        .maybeSingle();
      isAdminFromDb = !!sub?.is_admin;
    }
    const adminBypass = isAdmin || isAdminFromDb;

    let outputsRemaining = -1;
    if (!adminBypass) {
      const budget = await consumeStudioOutput(userId, sourceAsset.studio_project_id);
      if (!budget.allowed) {
        return studioPoolEmptyResponse(sourceAsset.studio_project_id);
      }
      purchaseId = budget.purchaseId;
      consumed = true;
      outputsRemaining = Math.max(budget.outputsRemaining - 1, 0);
    }

    // ── 5. Read product name from source metadata ────────────────────────
    const sourceMeta = (sourceAsset.metadata || {}) as Record<string, unknown>;
    const productName = typeof sourceMeta.product_name === 'string' && sourceMeta.product_name
      ? sourceMeta.product_name
      : sourceAsset.name || 'fashion product';

    // ── 6. Invoke the active provider (Kling | Sora) ─────────────────────
    const provider = getActiveVideoProvider();
    let videoBuffer: Buffer;
    let mimeType: string;
    let providerLabel: string;
    try {
      const result = await provider.generate({
        imageUrl: sourceAsset.url,
        productName,
        motion,
        duration,
        tier,
        userPrompt: body.user_prompt,
      });
      videoBuffer = result.videoBuffer;
      mimeType = result.mimeType;
      providerLabel = result.providerLabel;
    } catch (e) {
      console.error(`[Studio video] provider ${provider.name} failed:`, e);
      if (purchaseId) await refundStudioOutput(userId, purchaseId);
      return NextResponse.json(
        {
          error: 'Video generation failed',
          details: e instanceof Error ? e.message.slice(0, 200) : undefined,
          provider: provider.name,
        },
        { status: 502 }
      );
    }

    // ── 7. Persist video — base64 the buffer into our studio-outputs bucket ─
    const persisted = await persistStudioAsset({
      studioProjectId: sourceAsset.studio_project_id,
      assetType: 'video',
      name: `Video — ${sourceAsset.name} (${tier} ${duration}s)`,
      base64: videoBuffer.toString('base64'),
      mimeType,
      phase: 'studio',
      metadata: {
        provider: providerLabel,
        motion,
        duration,
        tier,
        parent_asset_id: sourceAsset.id,
        purchase_id: purchaseId,
        user_prompt: body.user_prompt,
      },
      uploadedBy: userId,
    });

    return NextResponse.json({
      asset_id: persisted.assetId,
      master_url: persisted.publicUrl,
      asset_type: 'video',
      outputs_remaining: outputsRemaining,
      provider: providerLabel,
      parent_asset_id: sourceAsset.id,
      duration,
      motion,
      tier,
      admin_bypass: adminBypass || undefined,
    });
  } catch (error) {
    if (consumed && userId && purchaseId) {
      try {
        await refundStudioOutput(userId, purchaseId);
      } catch (refundErr) {
        console.error('[Studio video] refund failed in catch:', refundErr);
      }
    }
    console.error('[Studio video] fatal:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus }
    );
  }
}
