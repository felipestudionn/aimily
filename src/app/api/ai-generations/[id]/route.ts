import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('ai_generations')
      .select('collection_plan_id, user_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id);
      if (!authorized) return ownerError;
    } else if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await req.json();

    const { data, error } = await supabaseAdmin
      .from('ai_generations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating ai_generation:', error);
    const message = error instanceof Error ? error.message : 'Failed to update generation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('ai_generations')
      .select('collection_plan_id, user_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id);
      if (!authorized) return ownerError;
    } else if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('ai_generations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ai_generation:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete generation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
