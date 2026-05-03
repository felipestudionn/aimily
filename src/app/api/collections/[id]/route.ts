import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * PATCH /api/collections/[id] — Rename collection
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: collection } = await supabaseAdmin
      .from('collection_plans')
      .select('id, user_id, deleted_at')
      .eq('id', id)
      .single();

    if (!collection || collection.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    if (collection.deleted_at) {
      return NextResponse.json({ error: 'Collection is in trash. Restore it first.' }, { status: 409 });
    }

    const body = await req.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('collection_plans')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error('Error renaming collection:', error);
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 });
  }
}

/**
 * DELETE /api/collections/[id]
 *
 * Soft-delete (2026-05-03). Sets deleted_at = NOW() on the row and leaves
 * everything else (related tables, Storage assets) untouched. The row is
 * filtered out of the user's listing immediately, but everything is
 * recoverable via POST /api/collections/[id]/restore for the next 30 days.
 *
 * The actual destructive operation — moving Storage to __trash/, dropping
 * the row, CASCADE-wiping 28+ related tables — is performed by the
 * /api/cron/cleanup-deleted-collections cron once deleted_at < now() -
 * 30 days. See src/lib/collection-hard-delete.ts for the helper.
 *
 * Idempotent: re-deleting an already-deleted collection just rewrites
 * deleted_at (which is harmless and arguably more correct — it resets
 * the 30-day clock on the most recent action).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: collection, error: fetchError } = await supabaseAdmin
      .from('collection_plans')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
    if (collection.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('collection_plans')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      deletedAt: now,
      restorableUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
  } catch (error) {
    console.error('Error soft-deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
