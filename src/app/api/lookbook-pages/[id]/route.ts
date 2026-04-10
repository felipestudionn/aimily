import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('lookbook_pages')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'edit_marketing');
      if (!authorized) return ownerError;
    }

    const updates = await req.json();

    const { data, error } = await supabaseAdmin
      .from('lookbook_pages')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating lookbook_page:', error);
    const message = error instanceof Error ? error.message : 'Failed to update page';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('lookbook_pages')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'edit_marketing');
      if (!authorized) return ownerError;
    }

    const { error } = await supabaseAdmin
      .from('lookbook_pages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lookbook_page:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete page';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
