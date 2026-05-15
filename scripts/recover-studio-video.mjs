// Recovery script: finalises orphan pending Studio video assets where the
// upstream Kling task is already COMPLETED but the client-side poll bailed.
// Idempotent — re-running on an already-completed asset is a no-op.
//
// Usage: node /tmp/recover-studio-video.mjs <asset_id>

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FREEPIK_KEY = process.env.FREEPIK_API_KEY;

const ASSET_ID = process.argv[2];
if (!ASSET_ID) {
  console.error('usage: node recover-studio-video.mjs <asset_id>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const KLING_STATUS = 'https://api.freepik.com/v1/ai/image-to-video/kling-v2-1';
const BUCKET = 'collection-assets';

async function main() {
  const { data: asset, error } = await supabase
    .from('collection_assets')
    .select('id, studio_project_id, name, status, url, metadata, uploaded_by')
    .eq('id', ASSET_ID)
    .single();
  if (error || !asset) throw new Error(`asset not found: ${error?.message}`);

  if (asset.status === 'completed' && asset.url && !asset.url.startsWith('pending:')) {
    console.log('already completed — nothing to do');
    return;
  }

  const meta = asset.metadata ?? {};
  const taskId = meta.external_task_id;
  if (!taskId) throw new Error('no external_task_id on metadata');

  console.log(`recovering asset=${asset.id} task=${taskId}`);

  const statusRes = await fetch(`${KLING_STATUS}/${taskId}`, {
    headers: { 'x-freepik-api-key': FREEPIK_KEY },
  });
  if (!statusRes.ok) throw new Error(`kling status ${statusRes.status}`);
  const statusJson = await statusRes.json();
  const sd = statusJson.data ?? {};
  if (sd.status !== 'COMPLETED') {
    console.log('upstream status:', sd.status, '— bailing');
    return;
  }

  const videoUrl = sd.generated?.[0] ?? sd.video_url;
  if (!videoUrl) throw new Error('COMPLETED but no video URL');
  console.log('upstream video:', videoUrl.slice(0, 120) + '...');

  const dlRes = await fetch(videoUrl);
  if (!dlRes.ok) throw new Error(`download failed ${dlRes.status}`);
  const videoBuffer = Buffer.from(await dlRes.arrayBuffer());
  const mimeType = dlRes.headers.get('content-type') || 'video/mp4';
  console.log(`downloaded ${videoBuffer.length} bytes (${mimeType})`);

  const filename = `${taskId}.mp4`;
  const storagePath = `${asset.studio_project_id}/video/${Date.now()}-${filename}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, videoBuffer, { contentType: mimeType, upsert: false });
  if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);
  console.log('uploaded to', storagePath);

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 365 * 24 * 60 * 60);
  if (signErr || !signed?.signedUrl) throw new Error(`signed url failed: ${signErr?.message}`);
  console.log('signed url:', signed.signedUrl.slice(0, 120) + '...');

  const { error: updErr } = await supabase
    .from('collection_assets')
    .update({
      status: 'completed',
      url: signed.signedUrl,
      metadata: {
        ...meta,
        completed_at: new Date().toISOString(),
        storage_path: storagePath,
        upstream_video_url: videoUrl,
        recovered_by: 'manual-recovery-2026-05-16',
      },
    })
    .eq('id', asset.id);
  if (updErr) throw new Error(`asset update failed: ${updErr.message}`);

  console.log('DONE — asset', asset.id, 'is now completed');
}

main().catch((e) => { console.error(e); process.exit(1); });
