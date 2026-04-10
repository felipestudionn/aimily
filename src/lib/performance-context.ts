/**
 * C7 — Performance feedback loop V1 (pre-analytics).
 *
 * Extracts "what worked" signals from the current collection's own history
 * and formats them as a concise prompt block that AI generators can use to
 * double down on winners.
 *
 * V1 sources (all on-platform, no external analytics):
 *   - ai_generations.is_favorite === true         → positive signal
 *   - ai_generations with recent favorites count  → momentum signal
 *   - Distinct generation_types favorited         → what kind of content
 *                                                    the user actually keeps
 *
 * V2 (post-analytics, not implemented yet):
 *   - Meta Pixel / TikTok Pixel / Google conversions
 *   - Email open/click rates
 *   - Social engagement metrics
 *
 * The helper stays cheap: a single query, a short formatted string. It is
 * safe to call on every AI generation because the output collapses to an
 * empty string when there are no favorites yet.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

interface AiGenerationRow {
  id: string;
  generation_type: string | null;
  is_favorite: boolean | null;
  prompt: string | null;
  created_at: string | null;
  model_used: string | null;
}

interface PerformanceSummary {
  total_favorites: number;
  by_type: Record<string, number>;
  recent_favorites: Array<{
    type: string;
    prompt_hint: string;
    model_used: string;
    created_at: string;
  }>;
  winning_pattern?: string;
}

/**
 * Fetch and summarize the collection's favorited AI generations.
 * Returns a compact object safe to stringify into prompt contexts.
 */
export async function buildPerformanceContext(
  collectionPlanId: string
): Promise<PerformanceSummary> {
  const { data, error } = await supabaseAdmin
    .from('ai_generations')
    .select('id, generation_type, is_favorite, prompt, created_at, model_used')
    .eq('collection_plan_id', collectionPlanId)
    .eq('is_favorite', true)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    return {
      total_favorites: 0,
      by_type: {},
      recent_favorites: [],
    };
  }

  const rows = data as AiGenerationRow[];

  const by_type: Record<string, number> = {};
  for (const row of rows) {
    const key = row.generation_type || 'unknown';
    by_type[key] = (by_type[key] ?? 0) + 1;
  }

  // Dominant type (>=40% of favorites) is the "winning pattern"
  const total = rows.length;
  let winning_pattern: string | undefined;
  if (total >= 3) {
    const sorted = Object.entries(by_type).sort((a, b) => b[1] - a[1]);
    const [topType, topCount] = sorted[0];
    if (topCount / total >= 0.4) {
      winning_pattern = `${topType} (${topCount}/${total} favorites)`;
    }
  }

  const recent_favorites = rows.slice(0, 8).map((row) => ({
    type: row.generation_type || 'unknown',
    prompt_hint: (row.prompt || '').slice(0, 180),
    model_used: row.model_used || 'unknown',
    created_at: row.created_at || '',
  }));

  return {
    total_favorites: total,
    by_type,
    recent_favorites,
    winning_pattern,
  };
}

/**
 * Format a PerformanceSummary as a prompt-ready text block. Collapses to an
 * empty string when there's nothing useful to say. Consumers concatenate
 * this into the user prompt of social_templates / calendar / paid generators.
 */
export function formatPerformanceContextForPrompt(summary: PerformanceSummary): string {
  if (summary.total_favorites === 0) return '';

  const lines: string[] = [];
  lines.push('PREVIOUS PERFORMANCE SIGNALS (in-app favorites — use to double down on winners):');
  lines.push(`- Total favorited generations: ${summary.total_favorites}`);

  const byType = Object.entries(summary.by_type)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => `${type}:${count}`)
    .join(', ');
  if (byType) lines.push(`- Favorites by type: ${byType}`);

  if (summary.winning_pattern) {
    lines.push(`- Winning pattern so far: ${summary.winning_pattern}`);
  }

  if (summary.recent_favorites.length > 0) {
    lines.push('- Recent winners (prompt hints):');
    for (const fav of summary.recent_favorites.slice(0, 5)) {
      lines.push(`  · [${fav.type}] ${fav.prompt_hint}`);
    }
  }

  lines.push(
    'Use these signals to bias the output toward what the brand has already validated. Do NOT copy verbatim — use the patterns, the angles, and the tone, then produce fresh content.'
  );

  return lines.join('\n');
}
