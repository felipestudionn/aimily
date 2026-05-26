import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { persistStudioAsset } from '@/lib/storage';
import { refundStudioOutput } from '@/lib/studio/output-checker';
import {
  klingProvider,
  soraProvider,
  happyHorseProvider,
  type VideoProvider,
} from '@/lib/studio/video-providers';

export const runtime = 'nodejs';
// Status polling endpoint — each call is fast (one upstream HTTP roundtrip
// + optional download). 60s ceiling is plenty.
export const maxDuration = 60;

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/video/status (GET — async status check)

   Client polls this every 8s after kicking off a video via POST /api/studio/
   video. Three response states:

     status: 'pending'   → upstream still processing, keep polling
     status: 'completed' → asset has been finalised, master_url is ready
     status: 'failed'    → upstream rejected; pack output refunded

   When this endpoint detects status=COMPLETED upstream for the first time,
   it does the finalisation atomically:
     1. Download the MP4 from the provider
     2. Upload to Supabase Storage (studio-outputs bucket)
     3. Update the pending asset row: status='completed', url=signed URL,
        metadata.completed_at, metadata.storage_path

   Subsequent polls for the same asset are cheap — just read the row.

   Ownership chain: asset → studio_project.user_id (RLS-enforced).
   ═══════════════════════════════════════════════════════════════════════════ */

const PROVIDERS_BY_NAME: Record<string, VideoProvider> = {
  kling: klingProvider,
  sora: soraProvider,
  'happy-horse': happyHorseProvider,
};

function resolveProvider(providerName: string, providerLabel: string): VideoProvider {
  // Prefer label match (more specific) over name fallback.
  if (providerLabel.startsWith('magnific-happy-horse')) return happyHorseProvider;
  if (providerLabel.startsWith('openai-sora')) return soraProvider;
  if (providerLabel.startsWith('freepik-kling')) return klingProvider;
  return PROVIDERS_BY_NAME[providerName] || klingProvider;
}

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const assetId = req.nextUrl.searchParams.get('asset_id');
    if (!assetId) {
      return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
    }

    // ── 1. Load asset + verify ownership ─────────────────────────────────
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('collection_assets')
      .select('id, studio_project_id, status, url, name, asset_type, metadata, uploaded_by')
      .eq('id', assetId)
      .single();

    if (assetError || !asset || !asset.studio_project_id) {
      return NextResponse.json({ error: 'asset not found' }, { status: 404 });
    }

    const { data: project } = await supabaseAdmin
      .from('studio_projects')
      .select('id, user_id')
      .eq('id', asset.studio_project_id)
      .single();

    if (!project || project.user_id !== user!.id) {
      return NextResponse.json({ error: 'asset not found' }, { status: 404 });
    }

    const meta = (asset.metadata || {}) as Record<string, unknown>;

    // ── 2. Already done — return cached state ────────────────────────────
    if (asset.status === 'completed' && asset.url && !asset.url.startsWith('pending:')) {
      return NextResponse.json({
        asset_id: asset.id,
        status: 'completed',
        master_url: asset.url,
        provider: meta.provider,
      });
    }
    if (asset.status === 'failed') {
      return NextResponse.json({
        asset_id: asset.id,
        status: 'failed',
        error: typeof meta.error === 'string' ? meta.error : 'Video generation failed',
        provider: meta.provider,
      });
    }

    // ── 3. Pending — check upstream ──────────────────────────────────────
    const taskId = typeof meta.external_task_id === 'string' ? meta.external_task_id : null;
    const providerName = typeof meta.provider_name === 'string' ? meta.provider_name : 'kling';
    const providerLabel = typeof meta.provider === 'string' ? meta.provider : '';
    if (!taskId) {
      return NextResponse.json({
        asset_id: asset.id,
        status: 'failed',
        error: 'Missing external_task_id in asset metadata',
      });
    }

    const provider = resolveProvider(providerName, providerLabel);
    let upstream;
    try {
      upstream = await provider.checkStatus(taskId);
    } catch (e) {
      console.error('[Studio video status] checkStatus threw:', e);
      // Don't fail the whole asset on a transient check error — let client retry
      return NextResponse.json({
        asset_id: asset.id,
        status: 'pending',
        provider: providerLabel,
        external_task_id: taskId,
      });
    }

    // ── 4a. Still pending ────────────────────────────────────────────────
    if (upstream.status === 'pending') {
      return NextResponse.json({
        asset_id: asset.id,
        status: 'pending',
        provider: providerLabel,
        external_task_id: taskId,
      });
    }

    // ── 4b. Failed upstream — refund + mark asset failed ─────────────────
    if (upstream.status === 'failed') {
      // Migration 077 moved Studio credits from per-project pools to the
      // global user_credits ledger. We stored plan_consumed / pack_consumed
      // on the asset metadata at start time so we can issue an exact refund
      // now without having to know which plan/pack tier the user is on.
      const planConsumed = typeof meta.plan_consumed === 'number' ? meta.plan_consumed : 0;
      const packConsumed = typeof meta.pack_consumed === 'number' ? meta.pack_consumed : 0;
      if ((planConsumed > 0 || packConsumed > 0) && asset.uploaded_by) {
        try { await refundStudioOutput(asset.uploaded_by, planConsumed, packConsumed); }
        catch (rErr) { console.error('[Studio video status] refund failed:', rErr); }
      }
      await supabaseAdmin
        .from('collection_assets')
        .update({
          status: 'failed',
          metadata: { ...meta, error: upstream.error, failed_at: new Date().toISOString() },
        })
        .eq('id', asset.id);

      return NextResponse.json({
        asset_id: asset.id,
        status: 'failed',
        error: upstream.error,
        provider: providerLabel,
      });
    }

    // ── 4c. COMPLETED — download, upload, finalise ───────────────────────
    if (!upstream.videoUrl) {
      return NextResponse.json({
        asset_id: asset.id,
        status: 'failed',
        error: 'Upstream completed but no video URL',
      });
    }

    let downloadResult;
    try {
      downloadResult = await provider.downloadResult(upstream.videoUrl);
    } catch (e) {
      console.error('[Studio video status] downloadResult failed:', e);
      // Don't permanently fail — the video may still be downloadable later
      return NextResponse.json({
        asset_id: asset.id,
        status: 'pending',
        error: e instanceof Error ? e.message.slice(0, 200) : 'download failed',
        provider: providerLabel,
        external_task_id: taskId,
      });
    }

    /* Upload the bytes to OUR Supabase bucket and overwrite the asset row.
     * persistStudioAsset creates a NEW asset row by default — to UPDATE
     * the existing pending row, we manually do upload + update here. */
    const finalised = await persistStudioAsset({
      studioProjectId: asset.studio_project_id,
      assetType: 'video',
      name: asset.name,
      base64: downloadResult.videoBuffer.toString('base64'),
      mimeType: downloadResult.mimeType,
      phase: 'studio',
      metadata: {
        ...meta,
        completed_at: new Date().toISOString(),
        upstream_video_url: upstream.videoUrl,
      },
      uploadedBy: asset.uploaded_by || undefined,
    });

    /* The pending row is now stale — we have a NEW row from persistStudioAsset.
     * Update the pending row to point at the same URL (so client polling
     * by asset_id keeps working) and mark it completed. Or alternatively,
     * delete the pending row and return the new one's id. Simpler: rewrite
     * the pending row to have the final URL + metadata, then delete the
     * temporary duplicate. */
    await supabaseAdmin
      .from('collection_assets')
      .update({
        status: 'completed',
        url: finalised.publicUrl,
        metadata: {
          ...meta,
          provider: meta.provider,
          completed_at: new Date().toISOString(),
          upstream_video_url: upstream.videoUrl,
          storage_path: (finalised as unknown as { storagePath?: string }).storagePath || undefined,
        },
      })
      .eq('id', asset.id);

    // Delete the temporary duplicate (the new row created by persistStudioAsset)
    await supabaseAdmin
      .from('collection_assets')
      .delete()
      .eq('id', finalised.assetId);

    return NextResponse.json({
      asset_id: asset.id,
      status: 'completed',
      master_url: finalised.publicUrl,
      provider: providerLabel,
    });
  } catch (error) {
    console.error('[Studio video status] fatal:', error);
    return NextResponse.json(
      { error: 'Status check failed', details: error instanceof Error ? error.message.slice(0, 200) : undefined },
      { status: 500 }
    );
  }
}
