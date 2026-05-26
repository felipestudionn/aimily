/* ═══════════════════════════════════════════════════════════════════════════
   /studio/[id] — Aimily Studio project workspace.

   Gallery of generated outputs + inline new-generation flow. The client
   component does the AI calls; this server page loads the project,
   recent assets, and casting (aimily_models) so the form is ready to
   render without secondary fetches.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ADMIN_EMAILS } from '@/lib/stripe';
import { getEffectiveBrand } from '@/lib/studio/effective-brand';
import ProjectWorkspaceClient from './ProjectWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function StudioProjectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { user } = await getServerSession();
  if (!user) redirect('/');

  // Load project + verify ownership
  const { data: project } = await supabaseAdmin
    .from('studio_projects')
    .select('id, user_id, brand_name, brand_logo_url, brand_palette, brand_fabric_refs, brand_source_collection_id')
    .eq('id', id)
    .single();
  if (!project) notFound();
  if (project.user_id !== user.id) notFound();

  // Resolve effective brand — if soft-linked to a collection, brand_name +
  // palette come live from CIS. Otherwise it's the local snapshot. The
  // header renders the effective name and (when linked) a badge with the
  // source collection. See lib/studio/effective-brand.ts.
  const effective = await getEffectiveBrand(id);

  // Recent assets + purchases + casting in parallel
  const [{ data: assetsData }, { data: purchasesData }, { data: modelsData }] = await Promise.all([
    supabaseAdmin
      .from('collection_assets')
      .select('id, asset_type, name, url, metadata, is_style_memory, style_memory_role, created_at')
      .eq('studio_project_id', id)
      .is('deleted_at', null)
      /* Hide failed/orphan video rows whose `url` is still the
       * `pending:<task_id>` placeholder — they render as broken
       * <video> thumbnails in the gallery. The status endpoint
       * rewrites url to the signed Supabase URL on success, so a
       * row that still starts with `pending:` is either currently
       * in-flight (covered by the client poll) or terminally failed. */
      .not('url', 'like', 'pending:%')
      .order('created_at', { ascending: false })
      .limit(60),
    supabaseAdmin
      .from('studio_purchases')
      .select('id, pack_tier, outputs_allocated, outputs_consumed, created_at')
      .eq('studio_project_id', id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('aimily_models')
      .select('id, name, headshot_url, gender, complexion, hair_style, hair_color, description')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ]);

  const assets = assetsData || [];
  const purchases = purchasesData || [];
  const models = modelsData || [];

  const outputs_remaining = purchases.reduce(
    (acc, p) => acc + Math.max(Number(p.outputs_allocated) - Number(p.outputs_consumed), 0),
    0
  );

  // Admin bypass detection (must mirror /api/studio/generate logic)
  const isAdminByEmail = ADMIN_EMAILS.includes(user.email || '');
  let isAdminByDb = false;
  if (!isAdminByEmail) {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    isAdminByDb = !!sub?.is_admin;
  }
  const isAdmin = isAdminByEmail || isAdminByDb;

  // Override snapshot brand_name with the live effective one so the header
  // never drifts when the source collection's brand changes.
  const projectWithEffective = effective
    ? { ...project, brand_name: effective.brand_name }
    : project;
  const brandSource =
    effective?.source === 'collection' && effective.source_collection_id && effective.source_collection_name
      ? { id: effective.source_collection_id, name: effective.source_collection_name }
      : null;

  return (
    <ProjectWorkspaceClient
      project={projectWithEffective}
      assets={assets}
      models={models}
      outputs_remaining={outputs_remaining}
      pack_count={purchases.length}
      isAdmin={isAdmin}
      brandSource={brandSource}
    />
  );
}
