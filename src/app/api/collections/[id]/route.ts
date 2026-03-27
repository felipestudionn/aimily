import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'collection-assets';

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
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!collection || collection.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
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
 * Enterprise-grade collection deletion:
 * 1. Verify ownership
 * 2. Clean up Storage files (bucket: collection-assets/{id}/*)
 * 3. Delete collection_plans row (CASCADE handles all 27+ related tables)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user owns this collection
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

    // 1. Clean up Storage files
    // List all files under {collection_id}/ prefix
    const storagePaths: string[] = [];
    const assetTypes = ['moodboard', 'render', 'lifestyle', 'tryon', 'sketch', 'video', 'model'];

    await Promise.all(
      assetTypes.map(async (type) => {
        const { data: files } = await supabaseAdmin.storage
          .from(BUCKET)
          .list(`${id}/${type}`);
        if (files?.length) {
          storagePaths.push(...files.map((f) => `${id}/${type}/${f.name}`));
        }
      })
    );

    // Also check root folder for any unlisted files
    const { data: rootFiles } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(id);
    if (rootFiles?.length) {
      for (const f of rootFiles) {
        // Skip folders (they have no id)
        if (f.id) {
          storagePaths.push(`${id}/${f.name}`);
        }
      }
    }

    if (storagePaths.length > 0) {
      // Supabase storage remove supports batches
      const batchSize = 100;
      for (let i = 0; i < storagePaths.length; i += batchSize) {
        await supabaseAdmin.storage
          .from(BUCKET)
          .remove(storagePaths.slice(i, i + batchSize));
      }
    }

    // 2. Delete collection_plans row — CASCADE handles all related tables:
    // collection_skus, collection_timelines, collection_workspace_data,
    // collection_stories, collection_assets, ai_generations, brand_models,
    // brand_profiles, brand_voice_config, content_calendar, content_pillars,
    // drops, commercial_actions, market_predictions, email_templates_content,
    // launch_tasks, launch_checklist, launch_issues, lessons_learned,
    // lookbook_pages, paid_campaigns, pr_contacts, product_copy,
    // production_orders, sales_entries, sample_reviews, social_templates,
    // campaign_shoots
    const { error: deleteError } = await supabaseAdmin
      .from('collection_plans')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, storageFilesCleaned: storagePaths.length });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
