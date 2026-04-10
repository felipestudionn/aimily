import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// PATCH /api/stories/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('collection_stories')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'edit_marketing');
      if (!authorized) return ownerError;
    }

    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('collection_stories')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating story:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Story PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/stories/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('collection_stories')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id, 'edit_marketing');
      if (!authorized) return ownerError;
    }

    // Unlink SKUs from this story
    await supabaseAdmin
      .from('collection_skus')
      .update({ story_id: null })
      .eq('story_id', id);

    const { error } = await supabaseAdmin
      .from('collection_stories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting story:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Story DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
