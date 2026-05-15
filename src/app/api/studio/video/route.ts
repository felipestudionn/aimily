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
  type VideoStyle,
  type VideoDuration,
  type VideoTier,
} from '@/lib/studio/video-providers';
import { normalizeAiError } from '@/lib/ai/error-messages';

export const runtime = 'nodejs';
/* Vercel Pro plan allows up to 800s. Video providers (Kling, Happy Horse)
 * can take 5-10 min at peak load — we set the function ceiling near the
 * Pro max so the polling has room to run without prematurely abandoning
 * a paid generation that's still processing upstream. */
export const maxDuration = 800;

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
  /* Canonical style (preferred). When set, motion is ignored. */
  video_style?: VideoStyle;
  /* Legacy motion preset — kept for backwards compat. */
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

    // ── 2. Parse + validate body ─────────────────────────────────────────
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
      body.duration === '10' ? '10' : '5';
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

    /* ═════════════════════════════════════════════════════════════════
       STREAMING RESPONSE WITH HEARTBEAT
       ─────────────────────────────────
       Cloudflare (Vercel's edge proxy) closes HTTP connections that go
       ~100s without any bytes flowing — even if our Node function is
       still running. For 4-10 min Kling/Happy Horse polls, we MUST emit
       periodic bytes to keep the connection alive.

       Pattern: send a single space character every 15s while polling.
       At the end, emit the final JSON. The client reads the whole body
       as text, strips leading whitespace, and parses the final JSON.

       Status is always 200; success/failure is signalled by the body's
       `error` field instead of the HTTP status. This is because once
       we've started streaming, the status code is committed.
       ═════════════════════════════════════════════════════════════════ */
    const provider = getActiveVideoProvider();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let heartbeat: ReturnType<typeof setInterval> | null = setInterval(() => {
          try { controller.enqueue(encoder.encode(' ')); } catch { /* closed */ }
        }, 15_000);

        const finish = (payload: Record<string, unknown>) => {
          if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
          try {
            controller.enqueue(encoder.encode(JSON.stringify(payload)));
            controller.close();
          } catch { /* already closed */ }
        };

        try {
          const result = await provider.generate({
            imageUrl: sourceAsset.url,
            productName,
            style: videoStyle,
            motion,
            duration,
            tier,
            userPrompt: body.user_prompt,
          });

          const persisted = await persistStudioAsset({
            studioProjectId: sourceAsset.studio_project_id,
            assetType: 'video',
            name: `Video — ${sourceAsset.name} (${tier} ${duration}s)`,
            base64: result.videoBuffer.toString('base64'),
            mimeType: result.mimeType,
            phase: 'studio',
            metadata: {
              provider: result.providerLabel,
              video_style: videoStyle,
              motion,
              duration,
              tier,
              parent_asset_id: sourceAsset.id,
              purchase_id: purchaseId,
              user_prompt: body.user_prompt,
            },
            uploadedBy: userId,
          });

          finish({
            asset_id: persisted.assetId,
            master_url: persisted.publicUrl,
            asset_type: 'video',
            outputs_remaining: outputsRemaining,
            provider: result.providerLabel,
            parent_asset_id: sourceAsset.id,
            duration,
            motion,
            tier,
            video_style: videoStyle,
            admin_bypass: adminBypass || undefined,
          });
        } catch (e) {
          console.error(`[Studio video] provider ${provider.name} failed:`, e);
          if (purchaseId && userId) {
            try { await refundStudioOutput(userId, purchaseId); }
            catch (rErr) { console.error('[Studio video] refund inside stream failed:', rErr); }
          }
          finish({
            error: 'Video generation failed',
            details: e instanceof Error ? e.message.slice(0, 200) : undefined,
            provider: provider.name,
          });
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Disable any proxy buffering — we need bytes to flow immediately
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
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
