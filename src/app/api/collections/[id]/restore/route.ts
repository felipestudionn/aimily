/**
 * POST /api/collections/[id]/restore
 *
 * Pulls a collection back out of the trash (only if it's actually in the
 * trash AND the 30-day window hasn't expired). Sets deleted_at = NULL.
 *
 * Returns 404 if not found / not owned, 410 ("Gone") if the cleanup
 * cron already swept it, 200 on success.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: collection, error: fetchError } = await supabaseAdmin
    .from('collection_plans')
    .select('id, user_id, deleted_at, name')
    .eq('id', id)
    .single();

  if (fetchError || !collection) {
    // 410 Gone — the cron probably ran and the row is no longer there.
    return NextResponse.json(
      { error: 'Collection no longer exists. The 30-day trash window has expired.' },
      { status: 410 },
    );
  }

  if (collection.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!collection.deleted_at) {
    return NextResponse.json({ error: 'Collection is not in trash.' }, { status: 409 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('collection_plans')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    console.error('[restore] failed', updateError);
    return NextResponse.json({ error: 'Failed to restore collection' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    id: collection.id,
    name: collection.name,
  });
}
