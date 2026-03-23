import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/drops/[id] - Get a single drop
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('drops')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching drop:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, data.collection_plan_id);
      if (!authorized) return ownerError;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Drop GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/drops/[id] - Update a drop
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('drops')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id);
      if (!authorized) return ownerError;
    }

    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('drops')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating drop:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Drop PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/drops/[id] - Delete a drop
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('drops')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (existing?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, existing.collection_plan_id);
      if (!authorized) return ownerError;
    }

    // First, unlink all SKUs from this drop
    await supabaseAdmin
      .from('collection_skus')
      .update({ drop_id: null })
      .eq('drop_id', id);

    const { error } = await supabaseAdmin
      .from('drops')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting drop:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Drop DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
