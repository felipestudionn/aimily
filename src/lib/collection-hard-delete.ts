/**
 * Hard-delete a collection — used by the 30-day trash cleanup cron and by
 * any future "permanently delete now" admin flow. Not exposed to user-
 * facing endpoints directly.
 *
 * Behaviour (this is the side that actually destroys things):
 *   1. List every Storage object under `<id>/...` in the collection-assets
 *      bucket and move them to `__trash/<id>/<deletedAtSlug>/...` so the
 *      monthly Storage cleanup cron can sweep them later. Storage isn't
 *      part of Supabase's daily backups, so a hard rm = permanent loss.
 *   2. DELETE the collection_plans row. Postgres CASCADE handles every
 *      related table (~28 of them).
 *
 * Returns the number of Storage files moved + the trash prefix, useful
 * for cron logging.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'collection-assets';

const ASSET_TYPES = [
  'moodboard', 'render', 'lifestyle', 'tryon', 'sketch', 'video', 'model',
  'still_life', 'editorial', 'tech_pack', 'material_swatch', 'callout',
];

export async function hardDeleteCollection(id: string): Promise<{
  storageFilesMovedToTrash: number;
  trashPrefix: string;
}> {
  // 1. Move Storage files to __trash/{id}/{ts}/
  const storagePaths: string[] = [];

  await Promise.all(
    ASSET_TYPES.map(async (type) => {
      const { data: files } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(`${id}/${type}`);
      if (files?.length) {
        storagePaths.push(...files.map((f) => `${id}/${type}/${f.name}`));
      }
    }),
  );

  const { data: rootFiles } = await supabaseAdmin.storage.from(BUCKET).list(id);
  if (rootFiles?.length) {
    for (const f of rootFiles) {
      if (f.id) storagePaths.push(`${id}/${f.name}`);
    }
  }

  const deletedAtSlug = new Date().toISOString().replace(/[:.]/g, '-');
  let movedCount = 0;
  for (let i = 0; i < storagePaths.length; i += 16) {
    const slice = storagePaths.slice(i, i + 16);
    await Promise.all(
      slice.map(async (from) => {
        const to = `__trash/${id}/${deletedAtSlug}/${from.slice(id.length + 1)}`;
        const { error } = await supabaseAdmin.storage.from(BUCKET).move(from, to);
        if (error) {
          console.error('[collection-hard-delete] move-to-trash failed', { from, to, error });
        } else {
          movedCount += 1;
        }
      }),
    );
  }

  // 2. Delete collection_plans row — CASCADE wipes 28+ related tables:
  //    collection_skus, collection_timelines, collection_workspace_data,
  //    collection_stories, collection_assets, ai_generations, brand_models,
  //    brand_profiles, brand_voice_config, content_calendar, content_pillars,
  //    drops, commercial_actions, market_predictions, email_templates_content,
  //    launch_tasks, launch_checklist, launch_issues, lessons_learned,
  //    lookbook_pages, paid_campaigns, pr_contacts, product_copy,
  //    production_orders, sales_entries, sample_reviews, social_templates,
  //    campaign_shoots.
  const { error: deleteError } = await supabaseAdmin
    .from('collection_plans')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;

  return {
    storageFilesMovedToTrash: movedCount,
    trashPrefix: `__trash/${id}/${deletedAtSlug}/`,
  };
}
