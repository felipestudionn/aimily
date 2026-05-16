import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getAuthenticatedUser,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { ADMIN_EMAILS } from '@/lib/stripe';
import {
  consumeStudioOutput,
  refundStudioOutput,
  studioPoolEmptyResponse,
} from '@/lib/studio/output-checker';
import {
  getActiveVideoProvider,
  type VideoMotion,
  type VideoStyle,
  type VideoDuration,
  type VideoTier,
} from '@/lib/studio/video-providers';
import { normalizeAiError } from '@/lib/ai/error-messages';

export const runtime = 'nodejs';
// Async pattern — function exits in <10s after starting the upstream job.
// No long-running polling on this route.
export const maxDuration = 30;

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/video (POST — async start)

   Kicks off a video generation upstream and returns IMMEDIATELY with the
   asset_id. The client then polls /api/studio/video/status?asset_id=X
   every 8s until the asset's status flips from 'pending' to 'completed'
   (or 'failed').

   This decouples our Vercel function lifetime (max 800s) from the upstream
   provider's actual generation time (Kling Pro 10s clips routinely run
   12+ min on Magnific at peak load). The proper architectural fix —
   previously we tried streaming heartbeats but Kling was just genuinely
   slower than Vercel's hard ceiling.

   Pending asset persistence:
     - Asset row created with `status = 'pending'`
     - Metadata includes external_task_id + external_provider so the
       status endpoint can resume polling from any future request
     - `url` field uses placeholder `pending:<task_id>` (collection_assets
       has NOT NULL on url). When completed, replaced with real signed URL.

   Refund path:
     - If startJob throws (upstream rejected the create) → refund immediately
     - If pending asset later fails on status endpoint → that endpoint refunds
   ═══════════════════════════════════════════════════════════════════════════ */

interface VideoBody {
  source_asset_id: string;
  video_style?: VideoStyle;
  motion?: VideoMotion;
  duration?: VideoDuration;
  tier?: VideoTier;
  user_prompt?: string;
}

const VALID_MOTIONS: VideoMotion[] = ['subtle', 'walk', 'pan', 'zoom', 'turn', 'dolly'];
const VALID_STYLES: VideoStyle[] = [
  'editorial-stillness', 'direct-address', 'wind-light', 'avant-garde', 'product-macro',
  'campaign-hero', 'runway-reveal', 'playful-bounce', 'street-kinetic', 'slow-reveal',
];

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

    const body = (await req.json()) as VideoBody;

    if (!body.source_asset_id) {
      return NextResponse.json({ error: 'source_asset_id is required' }, { status: 400 });
    }
    const motion: VideoMotion = VALID_MOTIONS.includes(body.motion as VideoMotion)
      ? (body.motion as VideoMotion)
      : 'subtle';
    const videoStyle: VideoStyle | undefined = VALID_STYLES.includes(body.video_style as VideoStyle)
      ? (body.video_style as VideoStyle)
      : undefined;
    const duration: VideoDuration =
      body.duration === '15' ? '15' :
      body.duration === '10' ? '10' :
      body.duration === '8' ? '8' : '5';
    const tier: VideoTier = body.tier === 'std' ? 'std' : 'pro';

    // ── 2. Source asset + ownership ──────────────────────────────────────
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

    // ── 3. Admin bypass + budget ─────────────────────────────────────────
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

    // ── 4. Source meta + product name ────────────────────────────────────
    const sourceMeta = (sourceAsset.metadata || {}) as Record<string, unknown>;
    const productName = typeof sourceMeta.product_name === 'string' && sourceMeta.product_name
      ? sourceMeta.product_name
      : sourceAsset.name || 'fashion product';

    // ── 5. Start upstream job — fast, no polling ─────────────────────────
    const provider = getActiveVideoProvider();
    let taskId: string;
    let providerLabel: string;
    try {
      const startResult = await provider.startJob({
        imageUrl: sourceAsset.url,
        productName,
        style: videoStyle,
        motion,
        duration,
        tier,
        userPrompt: body.user_prompt,
      });
      taskId = startResult.taskId;
      providerLabel = startResult.providerLabel;
    } catch (e) {
      console.error(`[Studio video] startJob ${provider.name} failed:`, e);
      if (purchaseId) await refundStudioOutput(userId, purchaseId);
      return NextResponse.json(
        {
          error: 'Video job creation failed',
          details: e instanceof Error ? e.message.slice(0, 200) : undefined,
          provider: provider.name,
        },
        { status: 502 }
      );
    }

    // ── 6. Create pending asset row ──────────────────────────────────────
    const { data: pendingAsset, error: insertError } = await supabaseAdmin
      .from('collection_assets')
      .insert({
        studio_project_id: sourceAsset.studio_project_id,
        phase: 'studio',
        asset_type: 'video',
        status: 'pending',
        name: `Video — ${sourceAsset.name} (${tier} ${duration}s)`,
        url: `pending:${taskId}`, // placeholder; collection_assets.url is NOT NULL
        metadata: {
          provider: providerLabel,
          provider_name: provider.name, // 'kling' or 'sora' for status endpoint dispatch
          external_task_id: taskId,
          video_style: videoStyle,
          motion,
          duration,
          tier,
          parent_asset_id: sourceAsset.id,
          purchase_id: purchaseId,
          user_prompt: body.user_prompt,
          started_at: new Date().toISOString(),
        },
        uploaded_by: userId,
      })
      .select('id')
      .single();

    if (insertError || !pendingAsset) {
      console.error('[Studio video] pending asset insert failed:', insertError);
      if (purchaseId) await refundStudioOutput(userId, purchaseId);
      return NextResponse.json(
        { error: 'Could not persist pending asset', details: insertError?.message },
        { status: 500 }
      );
    }

    // ── 7. Done — client polls /status from here ─────────────────────────
    return NextResponse.json({
      asset_id: pendingAsset.id,
      status: 'pending',
      provider: providerLabel,
      external_task_id: taskId,
      outputs_remaining: outputsRemaining,
      duration,
      motion,
      tier,
      video_style: videoStyle,
      admin_bypass: adminBypass || undefined,
    });
  } catch (error) {
    if (consumed && userId && purchaseId) {
      try { await refundStudioOutput(userId, purchaseId); }
      catch (refundErr) { console.error('[Studio video] refund failed in catch:', refundErr); }
    }
    console.error('[Studio video] fatal:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus }
    );
  }
}
