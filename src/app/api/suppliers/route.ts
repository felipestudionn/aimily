/* ═══════════════════════════════════════════════════════════════════
   Suppliers address book — user-scoped CRUD.
   GET    /api/suppliers             → list + optional ?q= search
   POST   /api/suppliers              → create
   PATCH  /api/suppliers              → update by id
   DELETE /api/suppliers?id=X         → soft-delete (actually deletes)
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

interface SupplierInput {
  id?: string;
  name?: string;
  supplier_type?: string | null;
  region?: string | null;
  moq?: number | null;
  lead_time_days?: number | null;
  cost_note?: string | null;
  certifications?: string[];
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_name?: string | null;
  website?: string | null;
  notes?: string | null;
}

const WRITABLE_FIELDS: (keyof SupplierInput)[] = [
  'name', 'supplier_type', 'region', 'moq', 'lead_time_days', 'cost_note',
  'certifications', 'contact_email', 'contact_phone', 'contact_name',
  'website', 'notes',
];

function pickWritable(input: SupplierInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of WRITABLE_FIELDS) {
    if (input[f] !== undefined) out[f] = input[f];
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  let query = supabaseAdmin
    .from('suppliers')
    .select('*')
    .eq('user_id', user!.id)
    .order('name', { ascending: true });
  if (q) query = query.ilike('name', `%${q}%`);

  const { data } = await query;
  return NextResponse.json({ suppliers: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  let body: SupplierInput;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const payload = { ...pickWritable(body), user_id: user!.id };
  const { data, error } = await supabaseAdmin.from('suppliers').insert(payload).select().single();
  if (error) {
    console.error('[suppliers POST]', error);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
  return NextResponse.json({ supplier: data });
}

export async function PATCH(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  let body: SupplierInput;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .update(pickWritable(body))
    .eq('id', body.id)
    .eq('user_id', user!.id)
    .select()
    .maybeSingle();
  if (error) {
    console.error('[suppliers PATCH]', error);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
  return NextResponse.json({ supplier: data });
}

export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await supabaseAdmin.from('suppliers').delete().eq('id', id).eq('user_id', user!.id);
  return NextResponse.json({ ok: true });
}
