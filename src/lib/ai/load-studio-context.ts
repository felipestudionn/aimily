/**
 * Aimily Studio · Lite Brand Context loader
 *
 * Aimily 360 endpoints call `loadFullContext()` from `@/lib/ai/load-full-context`
 * which expects a `collection_plan_id` and pulls the full CIS + Creative + Brief
 * + Plan context. Studio requests don't have a collection_plan — they have a
 * `studio_project_id` with much lighter brand info (name, palette, fabric refs)
 * and optionally a set of user-approved Style Memory outputs.
 *
 * This loader is the Studio equivalent. It is intentionally lightweight: no
 * CIS, no Block 1/2/3/4 graph traversal, no Brief decoding. Just what the
 * Studio prompt needs to lock brand consistency:
 *   - brand_name
 *   - brand_palette (hex array)
 *   - brand_fabric_refs (URLs uploaded by the user)
 *   - style_memory_urls (collection_assets where is_style_memory = true, scoped to this project)
 *
 * If `studioProjectId` is null/undefined → returns an empty context (the
 * generate endpoint then runs with no brand-context overlay — perfectly valid
 * for anonymous test calls, never for paying clients).
 *
 * Reference: business-plan_aimily-studio-2026-05-14.md §5.5
 */

import { createClient } from '@/lib/supabase/server';

export interface StudioContext {
  brand_name?: string;
  brand_palette?: string[];
  brand_fabric_refs?: Array<{ url: string; label?: string }>;
  style_memory_urls?: string[];
}

export async function loadStudioContext(
  studioProjectId: string | null | undefined
): Promise<StudioContext> {
  if (!studioProjectId) return {};

  const supabase = await createClient();

  const [projectResult, styleMemoryResult] = await Promise.all([
    supabase
      .from('studio_projects')
      .select('brand_name, brand_palette, brand_fabric_refs')
      .eq('id', studioProjectId)
      .maybeSingle(),
    supabase
      .from('collection_assets')
      .select('url')
      .eq('studio_project_id', studioProjectId)
      .eq('is_style_memory', true)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const project = projectResult.data;
  if (!project) return {};

  return {
    brand_name: project.brand_name || undefined,
    brand_palette: Array.isArray(project.brand_palette)
      ? (project.brand_palette as string[]).filter((c) => typeof c === 'string')
      : undefined,
    brand_fabric_refs: Array.isArray(project.brand_fabric_refs)
      ? (project.brand_fabric_refs as Array<{ url: string; label?: string }>).filter(
          (r) => r && typeof r.url === 'string'
        )
      : undefined,
    style_memory_urls: styleMemoryResult.data?.map((r) => r.url).filter(Boolean) || [],
  };
}

/**
 * Project a StudioContext into the StoryContext shape that the existing
 * prompt builders (`buildPrompt` in still-life/editorial/tryon endpoints)
 * accept. This is a thin adapter — it does NOT invent a story, just maps
 * fields one-to-one so the prompt can use them as overlay.
 *
 * The prompt builders read story.color_palette / story.brand_personality,
 * so we map the studio brand_name into brand_personality (the brand IS
 * the personality at this stage) and brand_palette into color_palette.
 */
export function studioContextToStoryOverlay(ctx: StudioContext) {
  if (!ctx.brand_name && !ctx.brand_palette?.length) return undefined;
  return {
    name: ctx.brand_name,
    brand_personality: ctx.brand_name
      ? `${ctx.brand_name} (Aimily Studio · lite brand context)`
      : undefined,
    color_palette: ctx.brand_palette,
    // narrative / mood / tone left undefined — Studio lite has no story arc
  };
}
