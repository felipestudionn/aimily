/* ═══════════════════════════════════════════════════════════════════════════
   Studio · Effective brand resolution.

   A Studio project's "effective" brand depends on whether it's standalone
   (brand_source_collection_id IS NULL — Studio-only subscribers, Felipe's
   default) or linked to a collection (the inherit model picked 2026-05-26).

   When linked, brand_name + brand_palette come live from the source
   collection's CIS (creative.identity.brand_name + creative.identity.colors,
   with a fallback to creative.color.primary_palette for the palette). The
   Studio project still keeps its own snapshot of those fields as a safety
   net for the moment the source collection gets deleted (FK ON DELETE SET
   NULL), but it's not the source of truth while the link is active.

   brand_logo_url and brand_fabric_refs are never inherited — those are
   Studio-local assets uploaded by the user. The collection has no logo
   or fabric files; that's the studio project's job.
   ═══════════════════════════════════════════════════════════════════════════ */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface PaletteColor {
  hex: string;
  name?: string;
  role?: string;
}

export interface EffectiveBrand {
  brand_name: string;
  brand_palette: PaletteColor[] | string[] | null;
  brand_logo_url: string | null;
  brand_fabric_refs: Array<{ url: string; label?: string }> | null;
  source: 'standalone' | 'collection';
  source_collection_id: string | null;
  source_collection_name: string | null;
}

interface StudioProjectRow {
  id: string;
  brand_name: string;
  brand_palette: unknown;
  brand_logo_url: string | null;
  brand_fabric_refs: unknown;
  brand_source_collection_id: string | null;
}

/**
 * Resolve the effective brand for a Studio project.
 *
 * For standalone projects this is a pass-through over the studio_projects
 * row. For linked projects it overlays the source collection's CIS brand
 * over the local snapshot — local fields act as fallback if the CIS lookup
 * misses (which happens for very new collections that haven't filled
 * creative.identity yet).
 */
export async function getEffectiveBrand(
  studioProjectId: string,
): Promise<EffectiveBrand | null> {
  const { data: project } = await supabaseAdmin
    .from('studio_projects')
    .select('id, brand_name, brand_palette, brand_logo_url, brand_fabric_refs, brand_source_collection_id')
    .eq('id', studioProjectId)
    .single();

  if (!project) return null;
  const p = project as StudioProjectRow;

  const standalone: EffectiveBrand = {
    brand_name: p.brand_name,
    brand_palette: (p.brand_palette as PaletteColor[] | string[] | null) ?? null,
    brand_logo_url: p.brand_logo_url,
    brand_fabric_refs:
      (p.brand_fabric_refs as Array<{ url: string; label?: string }> | null) ?? null,
    source: 'standalone',
    source_collection_id: null,
    source_collection_name: null,
  };

  if (!p.brand_source_collection_id) return standalone;

  const [{ data: collection }, { data: decisions }] = await Promise.all([
    supabaseAdmin
      .from('collection_plans')
      .select('id, name')
      .eq('id', p.brand_source_collection_id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabaseAdmin
      .from('collection_decisions')
      .select('domain, subdomain, key, value')
      .eq('collection_plan_id', p.brand_source_collection_id)
      .eq('domain', 'creative')
      .in('subdomain', ['identity', 'color']),
  ]);

  // Source collection deleted between writes — degrade to standalone
  // gracefully. The FK ON DELETE SET NULL will eventually catch up.
  if (!collection) return standalone;

  const keyed: Record<string, unknown> = {};
  for (const row of decisions || []) {
    const k = `${row.subdomain}.${row.key}`;
    if (!(k in keyed)) keyed[k] = row.value;
  }

  const inheritedName =
    (keyed['identity.brand_name'] as string | undefined) ?? p.brand_name;
  const inheritedPalette =
    (keyed['identity.colors'] as PaletteColor[] | undefined) ??
    (keyed['color.primary_palette'] as PaletteColor[] | undefined) ??
    (p.brand_palette as PaletteColor[] | null);

  return {
    brand_name: inheritedName,
    brand_palette: inheritedPalette ?? null,
    // Logo + fabric refs are NEVER inherited — local studio assets.
    brand_logo_url: p.brand_logo_url,
    brand_fabric_refs:
      (p.brand_fabric_refs as Array<{ url: string; label?: string }> | null) ?? null,
    source: 'collection',
    source_collection_id: collection.id as string,
    source_collection_name: collection.name as string,
  };
}
