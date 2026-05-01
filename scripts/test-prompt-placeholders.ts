/**
 * Renders every prompt in MARKETING_PROMPTS against a real SLAIZ
 * context built from CIS, and reports any placeholder that resolves
 * to an empty string. Catches the silent-eat-undefined behaviour of
 * renderPrompt() that lets prompts ship to the LLM with bullet points
 * like "VOICE: " or "CONSUMER: " when a CIS field is missing.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-prompt-placeholders.ts
 *
 * Exit code 1 when any GLOBAL placeholder (one we expect compilePrompt
 * Context to populate) is empty for a real, well-populated collection
 * like SLAIZ. Per-call placeholders (sku_name, drops, etc.) are
 * documented as such instead of failing.
 */

import { MARKETING_PROMPTS } from '../src/lib/prompts/marketing-prompts';
import { compilePromptContext } from '../src/lib/collection-intelligence';

/* Placeholders that MUST be populated by compilePromptContext on a
   well-populated collection. Empty here is a real bug. */
const GLOBAL_REQUIRED = new Set<string>([
  'brand_name',
  'collection_vibe',
  'brand_voice_personality',
  'brand_voice_tone',
  'consumer_demographics',
  'consumer_psychographics',
  'consumer_lifestyle',
  'moodboard_summary',
]);

/* Placeholders the calling endpoint is expected to inject (sku
   list, drop info, calendar window, etc.). Listed for the docs but
   not failed when missing in the global context. */
const PER_CALL = new Set<string>([
  'sku_name', 'sku_family', 'sku_category', 'sku_pvp', 'sku_colorways',
  'sku_materials', 'sku_notes', 'sku_type', 'sku_count', 'sku_list_json',
  'sku_ids', 'hero_sku_id', 'hero_sku_name', 'hero_sku_pvp',
  'drop_name', 'launch_date', 'name', 'narrative', 'mood',
  'pillar_type', 'pillar_description', 'pillar_notes', 'distribution_days',
  'start_date', 'end_date', 'active_platforms', 'platform', 'hook_type',
  'visuals_json', 'visual_count', 'video_count', 'render_count',
  'duration_seconds', 'platform_specific_instructions',
  'story_alignment', 'story_mood', 'story_name', 'story_tone',
  'story_narrative', 'story_skus_summary', 'story_sales_summary',
  'desired_drops', 'season', 'specific_dates',
  'price_min', 'price_max', 'price_avg', 'sales_months',
  'expected_sales_weight', 'total_sales_target', 'total_paid_budget',
  'target_roas', 'target_pages', 'collection_url', 'product_url',
  'lookbook_url', 'extra_instructions', 'date', 'channels', 'markets',
  'sales_summary', 'predictions_vs_actual', 'previous_conversions_count',
  'calendar_entries_count', 'email_template_count', 'email_type',
  'copy_context', 'copy_count', 'copy_snippets',
  'action_type', 'sequence_type', 'buyer_stage', 'consumer_signals',
  'this', 'placeholders', 'type',
]);

function findPlaceholders(template: string): string[] {
  const re = /\{\{(\w+(?:\.\w+)*)\}\}/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) set.add(m[1]);
  return [...set];
}

function isGloballyMissing(placeholder: string, ctx: Record<string, unknown>): boolean {
  if (PER_CALL.has(placeholder)) return false;
  // {{nested.path}} — peel
  const root = placeholder.split('.')[0];
  if (PER_CALL.has(root)) return false;
  const v = ctx[placeholder];
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

const SLAIZ_PLAN = '60652ef7-1b06-4be4-9a61-31357be0be65';

async function main() {
  console.log(`Building global context from SLAIZ (${SLAIZ_PLAN})…\n`);
  const ctx = await compilePromptContext(SLAIZ_PLAN, 'full');

  let failures = 0;
  let scanned = 0;
  const promptEntries = Object.entries(MARKETING_PROMPTS) as [string, { user?: string }][];
  for (const [name, prompt] of promptEntries) {
    if (!prompt?.user) continue;
    scanned++;
    const placeholders = findPlaceholders(prompt.user);
    const missing: string[] = [];
    const requiredMissing: string[] = [];
    for (const p of placeholders) {
      if (!isGloballyMissing(p, ctx)) continue;
      missing.push(p);
      if (GLOBAL_REQUIRED.has(p)) requiredMissing.push(p);
    }
    if (missing.length === 0) {
      console.log(`✓ ${name} — all ${placeholders.length} placeholders covered`);
      continue;
    }
    if (requiredMissing.length > 0) {
      failures++;
      console.error(`✗ ${name} — REQUIRED placeholder(s) empty: ${requiredMissing.join(', ')}`);
    } else {
      console.log(`◦ ${name} — endpoint must inject: ${missing.join(', ')}`);
    }
  }

  console.log(`\n${scanned} prompts scanned. ${failures} failed required-coverage check.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
