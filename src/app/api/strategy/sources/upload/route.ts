/**
 * POST /api/strategy/sources/upload
 *
 * Multipart upload entry point for Strategy ingest. Validates the tenant
 * membership (analyst+), stores the file in the private `strategy-uploads`
 * bucket under `<tenant_id>/<source_id>/<filename>`, creates a row in
 * `strategy_sources`, and kicks off (synchronously, for now) the parse +
 * ETL pipeline by calling the internal parse function.
 *
 * Path convention is enforced by the storage RLS policies created in
 * migration 059d — the first path segment MUST equal the tenant_id, and
 * the user must be an active member.
 *
 * Body (multipart/form-data):
 *   file:           File (pdf | csv | xlsx | json | txt, max 100MB)
 *   tenant_slug:    string (slug of the tenant)
 *   season:         string (e.g. 'V26', 'V25', 'I26+V26')
 *   market:         string | null
 *   source_format:  strategy_source_format enum value
 *   observation_date: ISO date string
 *   notes:          string | null
 *
 * Response: { source_id, storage_path, record_count_estimate }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BUCKET = 'strategy-uploads';
const MAX_BYTES = 100 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/json',
  'text/plain',
]);

const SOURCE_FORMATS = new Set([
  'zara_rnk_pdf',
  'shopify_csv',
  'shopify_csv_bundle',
  'erp_custom_csv',
  'erp_sftp',
  'erp_api',
  'manual_upload',
]);

const SOURCE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'application/json': 'json',
  'text/plain': 'csv',
};

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const tenantSlug = form.get('tenant_slug');
  if (typeof tenantSlug !== 'string' || !tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;
  const { tenant, userId } = access;

  const file = form.get('file');
  const season = form.get('season');
  const market = form.get('market');
  const sourceFormat = form.get('source_format');
  const observationDateRaw = form.get('observation_date');
  const notes = form.get('notes');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 413 }
    );
  }
  if (typeof season !== 'string' || !season) {
    return NextResponse.json({ error: 'season is required' }, { status: 400 });
  }
  if (typeof sourceFormat !== 'string' || !SOURCE_FORMATS.has(sourceFormat)) {
    return NextResponse.json({ error: 'invalid source_format' }, { status: 400 });
  }
  if (typeof observationDateRaw !== 'string' || !observationDateRaw) {
    return NextResponse.json({ error: 'observation_date is required' }, { status: 400 });
  }
  const observationDate = new Date(observationDateRaw);
  if (Number.isNaN(observationDate.getTime())) {
    return NextResponse.json({ error: 'observation_date is invalid' }, { status: 400 });
  }

  const mimeType = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 415 });
  }
  const sourceType = SOURCE_TYPES[mimeType] || 'csv';

  // Create source row first (gets us an id we can use as path segment).
  const { data: sourceRow, error: insertError } = await supabaseAdmin
    .from('strategy_sources')
    .insert({
      tenant_id: tenant.id,
      season,
      market: typeof market === 'string' ? market : null,
      source_format: sourceFormat,
      source_type: sourceType,
      observation_date: observationDate.toISOString().slice(0, 10),
      uploaded_by: userId,
      notes: typeof notes === 'string' ? notes : null,
      coverage_dimensions: {},
    })
    .select('id')
    .single();

  if (insertError || !sourceRow) {
    return NextResponse.json(
      { error: 'Failed to create source row', detail: insertError?.message },
      { status: 500 }
    );
  }

  // Compose storage path: <tenant_id>/<source_id>/<safe_filename>
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200);
  const storagePath = `${tenant.id}/${sourceRow.id}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    // Rollback the source row
    await supabaseAdmin.from('strategy_sources').delete().eq('id', sourceRow.id);
    return NextResponse.json(
      { error: 'Storage upload failed', detail: uploadError.message },
      { status: 500 }
    );
  }

  // Persist the path on the row.
  await supabaseAdmin
    .from('strategy_sources')
    .update({ storage_path: storagePath })
    .eq('id', sourceRow.id);

  return NextResponse.json({
    source_id: sourceRow.id,
    storage_path: storagePath,
    tenant_id: tenant.id,
    source_format: sourceFormat,
    next_step: `POST /api/strategy/sources/${sourceRow.id}/parse to begin extraction`,
  });
}
