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
import ProjectWorkspaceClient from './ProjectWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function StudioProjectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { user } = await getServerSession();
  if (!user) redirect('/');

  // Load project + verify ownership
  const { data: project } = await supabaseAdmin
    .from('studio_projects')
    .select('id, user_id, brand_name, brand_logo_url, brand_palette, brand_fabric_refs')
    .eq('id', id)
    .single();
  if (!project) notFound();
  if (project.user_id !== user.id) notFound();

  // Recent assets + purchases + casting in parallel
  const [{ data: assetsData }, { data: purchasesData }, { data: modelsData }] = await Promise.all([
    supabaseAdmin
      .from('collection_assets')
      .select('id, asset_type, name, url, metadata, is_style_memory, style_memory_role, created_at')
      .eq('studio_project_id', id)
      .is('deleted_at', null)
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

  return (
    <ProjectWorkspaceClient
      project={project}
      assets={assets}
      models={models}
      outputs_remaining={outputs_remaining}
      pack_count={purchases.length}
    />
  );
}
