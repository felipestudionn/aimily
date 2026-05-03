import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Revoke an invitation (sets revoked_at; the /vendor/[token] route
 *  rejects revoked tokens). */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const { id } = await params;

  const { data: inv } = await supabaseAdmin
    .from('vendor_invitations')
    .select('id, collection_plan_id')
    .eq('id', id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ownership = await verifyCollectionOwnership(user.id, inv.collection_plan_id, 'edit_design');
  if (!ownership.authorized) return ownership.error;

  const { error } = await supabaseAdmin
    .from('vendor_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
