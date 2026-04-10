import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('launch_tasks')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'edit_marketing');
      if (!authorized) return ownerError;
    }

    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('launch_tasks')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating launch_task:', error);
    const message = error instanceof Error ? error.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('launch_tasks')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'edit_marketing');
      if (!authorized) return ownerError;
    }

    const { error } = await supabaseAdmin
      .from('launch_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting launch_task:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
