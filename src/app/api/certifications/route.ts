/**
 * Phase 5 — Certifications CRUD.
 *
 *   GET  /api/certifications            → user's certs, newest first
 *   POST /api/certifications            → upsert a cert
 *
 * The status column auto-updates based on expires_date: 'expired' if
 * past, 'expiring_soon' if within 90 days, else 'active'. We compute
 * it on read rather than maintaining via cron — cheaper and always
 * current.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface CertRow {
  id: string;
  user_id: string;
  certification_type: string;
  certificate_number: string | null;
  issuer: string | null;
  scope: string | null;
  document_url: string | null;
  issued_date: string | null;
  expires_date: string | null;
  linked_supplier_name: string | null;
  linked_material_ids: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

function computeStatus(expires: string | null): 'active' | 'expiring_soon' | 'expired' {
  if (!expires) return 'active';
  const now = Date.now();
  const exp = new Date(expires).getTime();
  if (Number.isNaN(exp)) return 'active';
  if (exp < now) return 'expired';
  if (exp - now < 90 * 24 * 60 * 60 * 1000) return 'expiring_soon';
  return 'active';
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from('certifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const decorated = (data ?? []).map((row) => ({
    ...row,
    status: row.status === 'revoked' ? 'revoked' : computeStatus(row.expires_date),
  }));
  return NextResponse.json({ certifications: decorated });
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: Partial<CertRow>;
  try {
    body = (await req.json()) as Partial<CertRow>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.certification_type) {
    return NextResponse.json({ error: 'certification_type required' }, { status: 400 });
  }

  const status = computeStatus(body.expires_date ?? null);
  const payload = {
    user_id: user.id,
    certification_type: body.certification_type,
    certificate_number: body.certificate_number ?? null,
    issuer: body.issuer ?? null,
    scope: body.scope ?? null,
    document_url: body.document_url ?? null,
    issued_date: body.issued_date ?? null,
    expires_date: body.expires_date ?? null,
    linked_supplier_name: body.linked_supplier_name ?? null,
    linked_material_ids: body.linked_material_ids ?? [],
    status,
  };

  const { data, error } = await supabaseAdmin
    .from('certifications')
    .insert(payload)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ certification: data });
}
