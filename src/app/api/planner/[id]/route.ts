import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { id } = await params;

  const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, id);
  if (!authorized) return ownerError;

  const body = await req.json();

  const updateFields: Record<string, any> = {};

  if (body.setup_data !== undefined) {
    updateFields.setup_data = body.setup_data;
  }
  if (body.name !== undefined) {
    updateFields.name = body.name;
  }
  if (body.season !== undefined) {
    updateFields.season = body.season;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('collection_plans')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
