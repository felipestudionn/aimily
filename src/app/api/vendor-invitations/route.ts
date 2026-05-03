/**
 * Phase 5 — Vendor portal invitations.
 *
 *   GET  /api/vendor-invitations?planId=X     → list of invitations for a collection
 *   POST /api/vendor-invitations              → create + return one-time token
 *
 * Tokens are 32-byte base64url strings shown to the user once. The
 * vendor visits /vendor/[token] to access their assigned SKUs. There
 * is no password — the token IS the credential, and it expires in 30
 * days by default (configurable per invite).
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface CreateBody {
  collection_plan_id: string;
  vendor_email: string;
  vendor_name?: string;
  sku_ids?: string[];
  ttl_days?: number;
  permissions?: Record<string, boolean>;
}

function makeToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const planId = req.nextUrl.searchParams.get('planId');
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

  const ownership = await verifyCollectionOwnership(user.id, planId);
  if (!ownership.authorized) return ownership.error;

  const { data, error } = await supabaseAdmin
    .from('vendor_invitations')
    .select('id, vendor_email, vendor_name, sku_ids, permissions, expires_at, revoked_at, last_used_at, use_count, created_at')
    .eq('collection_plan_id', planId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.collection_plan_id || !body.vendor_email) {
    return NextResponse.json(
      { error: 'collection_plan_id and vendor_email required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, body.collection_plan_id, 'edit_design');
  if (!ownership.authorized) return ownership.error;

  const ttl = body.ttl_days && body.ttl_days > 0 ? body.ttl_days : 30;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();
  const token = makeToken();

  const { data, error } = await supabaseAdmin
    .from('vendor_invitations')
    .insert({
      collection_plan_id: body.collection_plan_id,
      invited_by: user.id,
      vendor_email: body.vendor_email,
      vendor_name: body.vendor_name ?? null,
      token,
      sku_ids: body.sku_ids ?? [],
      permissions: body.permissions ?? {
        read_tech_pack: true,
        upload_samples: true,
        comment: true,
        translate: true,
      },
      expires_at: expiresAt,
    })
    .select('id, vendor_email, vendor_name, sku_ids, permissions, expires_at, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Token only returned on creation — store securely on the user side
  // (we show it once + ship via email in a follow-up enhancement).
  return NextResponse.json({ invitation: data, token });
}
