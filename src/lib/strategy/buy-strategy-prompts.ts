/**
 * Buy-strategy Claude prompts · prefill editor + per-axis deepen
 *
 * Used by:
 *   · POST /api/strategy/buy-strategy-prefill-editor (pre-fills the 5-axis editor
 *     when the user picks an archetype)
 *   · POST /api/strategy/buy-strategy-deepen (refines ONE axis based on user
 *     pressing "+ Más" on a card)
 *
 * Mirrors the prompt shape of /api/ai/scenarios-prefill-editor +
 * /api/ai/scenarios-deepen (Block 2's canonical pattern). The structural
 * difference: Block 2 grounds in collection-planning context (Block 1 brief,
 * competitors); here we ground in the tenant's actual sales history
 * (top families with hero/dog counts + ROI + share-of-wallet).
 */

import type { BuyStrategyArchetype } from './sales-archetypes';
import type { StrategyTenantContext } from './context-loader';

export interface BuyStrategyPrefillPromptInput {
  archetype: BuyStrategyArchetype;
  tenantContext: StrategyTenantContext;
  language?: 'en' | 'es';
}

export interface BuyStrategyPrefillEditor {
  action_mix: {
    replenish_pct: number;
    new_sku_proposal_pct: number;
    family_extension_pct: number;
    kill_pct: number;
  };
  budget: {
    target_buy_budget_eur: number | null;
    target_sales_y1_eur: number | null;
    target_margin_pct: number | null;
    last_season_buy_budget_eur: number | null;
    last_season_revenue_eur: number | null;
    last_season_margin_pct: number | null;
  };
  buy_waves: Array<{
    name: string;
    share_pct: number;
    target_lead_time_days: number;
  }>;
  family_pivot: Array<{
    family_code: string;
    pivot_pct: number; // -50 to +50
    rationale: string;
  }>;
  /** Required when archetype.id === 'D'. Family codes the user is pushing into. */
  target_adjacent_families: string[];
  rationale: string;
}

export function buildBuyStrategyPrefillPrompt(input: BuyStrategyPrefillPromptInput): {
  system: string;
  user: string;
} {
  const { archetype, tenantContext, language = 'es' } = input;
  const lang = language === 'es' ? 'Spanish (Castilian)' : 'English';

  const system = `You are a senior retail merchandising director helping a fashion brand plan their next buying season based on last season's sales data. You emit ONLY structured JSON matching the schema. Output language: ${lang}.`;

  const topFamiliesBlock = tenantContext.top_families
    .map(
      (f) =>
        `- ${f.family_code} · ${f.sku_count} SKUs · ${f.hero_count} heroes / ${f.dog_count} dogs · ROI ${f.family_roi?.toFixed(2) ?? '?'} · share ${
          f.share_of_wallet_pct != null ? (f.share_of_wallet_pct * 100).toFixed(1) + '%' : '?'
        }`
    )
    .join('\n');

  const winnersBlock = tenantContext.top_winners
    .slice(0, 10)
    .map(
      (w) =>
        `- ${w.product_name || w.model_ref} · ${w.family_code ?? '?'} · €${w.pvp ?? '?'} · margin ${
          w.margin_pct_list != null ? (w.margin_pct_list * 100).toFixed(0) + '%' : '?'
        }`
    )
    .join('\n');

  const adjacencyBlock = archetype.requires_adjacent_families
    ? `# Adjacency requirement (ARCHETYPE D)
This archetype REQUIRES target_adjacent_families to be a non-empty array of family codes the brand wants to push into. Look at the top families above and propose 2-4 ADJACENT category codes (think: women → kids, denim → outerwear, ready-to-wear → home). Adjacent ≠ existing family. Justify in rationale.`
    : `# No adjacency
This archetype does NOT require target_adjacent_families. Return an empty array [].`;

  const user = `The user just chose buy-strategy archetype "${archetype.id} · ${archetype.name}" in the setup workspace. Pre-fill the 5-axis editor with a coherent starting point grounded in this tenant's actual portfolio. The user will then fine-tune each axis.

# Archetype chosen
- ID: ${archetype.id}
- Name: ${archetype.name}
- Tagline: ${archetype.tagline}
- Narrative: ${archetype.narrative}
- Default action mix: ${JSON.stringify(archetype.default_action_mix)}
- Target growth: ${archetype.levers.target_sales_growth}
- Target margin: ${archetype.levers.target_margin}
- Buy budget posture: ${archetype.levers.buy_budget}
- Best for: ${archetype.best_for}

# Tenant top families (from latest completed run)
${topFamiliesBlock || '(no top families — likely first run for this tenant)'}

# Top portfolio winners
${winnersBlock || '(no winners surfaced)'}

${adjacencyBlock}

# Task
Emit one JSON object matching the schema. Anchor every number in the tenant data above — don't invent figures. If a field is unknowable, set null.

# SCHEMA
{
  "action_mix": {
    "replenish_pct": <0-100>,
    "new_sku_proposal_pct": <0-100>,
    "family_extension_pct": <0-100>,
    "kill_pct": <0-100>
  },
  "budget": {
    "target_buy_budget_eur": <number or null>,
    "target_sales_y1_eur": <number or null>,
    "target_margin_pct": <0-100 or null>,
    "last_season_buy_budget_eur": <number or null>,
    "last_season_revenue_eur": <number or null>,
    "last_season_margin_pct": <0-100 or null>
  },
  "buy_waves": [
    { "name": "Wave 1 · pre-season", "share_pct": <0-100>, "target_lead_time_days": <number> }
  ],
  "family_pivot": [
    { "family_code": "exact code from top families", "pivot_pct": <-50..+50>, "rationale": "1 sentence" }
  ],
  "target_adjacent_families": [<exact family codes ONLY if archetype.id === 'D', else []>],
  "rationale": "2-3 sentences explaining why this mix fits the chosen archetype + this tenant's data"
}

CRITICAL:
- action_mix sum MUST equal 100.
- Each pct in [0, 100].
- If archetype.id !== 'D', target_adjacent_families MUST be [].
- family_pivot.family_code MUST appear in the top families list above.
- Anchor budgets in the data when possible (sum the top families' implied revenue × markup) — never fabricate.

Begin output now with the JSON object.`;

  return { system, user };
}

// ─── Per-axis deepen prompts ─────────────────────────────────────────────

export type BuyStrategyAxis =
  | 'action_mix'
  | 'budget'
  | 'lead_time_calendar'
  | 'family_pivot'
  | 'actuals_delta';

export interface BuyStrategyDeepenInput {
  archetype: BuyStrategyArchetype;
  axis: BuyStrategyAxis;
  currentEditor: BuyStrategyPrefillEditor;
  tenantContext: StrategyTenantContext;
  language?: 'en' | 'es';
}

export function buildBuyStrategyDeepenPrompt(input: BuyStrategyDeepenInput): {
  system: string;
  user: string;
} {
  const { archetype, axis, currentEditor, tenantContext, language = 'es' } = input;
  const lang = language === 'es' ? 'Spanish (Castilian)' : 'English';

  const system = `You are a senior retail merchandiser refining ONE axis of a buy-strategy editor. The user pressed "+ Más" on the ${axis} card. Refine only that axis based on the tenant context and the rest of the editor state. Output JSON only. Language: ${lang}.`;

  const contextBlock = `# Archetype
${archetype.id} · ${archetype.name} — ${archetype.tagline}

# Current editor state
${JSON.stringify(currentEditor, null, 2)}

# Top families
${tenantContext.top_families
  .map(
    (f) =>
      `- ${f.family_code} · ${f.sku_count} SKUs · ${f.hero_count}H/${f.dog_count}D · ROI ${f.family_roi?.toFixed(2) ?? '?'}`
  )
  .join('\n')}`;

  let schema = '';
  let task = '';

  switch (axis) {
    case 'action_mix':
      task =
        'Re-balance the action_mix to better fit the archetype + tenant signals. Sum must equal 100.';
      schema = `{ "action_mix": { "replenish_pct": <n>, "new_sku_proposal_pct": <n>, "family_extension_pct": <n>, "kill_pct": <n> } }`;
      break;
    case 'budget':
      task =
        'Refine the budget block. Surface a tighter ROI calculation and a more realistic margin target grounded in the families\' real margin profile.';
      schema = `{ "budget": { "target_buy_budget_eur": <n>, "target_sales_y1_eur": <n>, "target_margin_pct": <n>, "last_season_buy_budget_eur": <n>, "last_season_revenue_eur": <n>, "last_season_margin_pct": <n> } }`;
      break;
    case 'lead_time_calendar':
      task =
        'Refine the buy_waves. Surface 2-4 waves with share_pct summing to 100 + target_lead_time_days appropriate for the season.';
      schema = `{ "buy_waves": [ { "name": "...", "share_pct": <n>, "target_lead_time_days": <n> } ] }`;
      break;
    case 'family_pivot':
      task =
        'Re-rank the family_pivot. Surface 3-6 families with sharper pivots (positive for amplify, negative for shrink) and concrete rationale per family.';
      schema = `{ "family_pivot": [ { "family_code": "...", "pivot_pct": <-50..+50>, "rationale": "..." } ] }`;
      break;
    case 'actuals_delta':
      task =
        'For each top family, surface a side-by-side: last season actuals (bought, sold-through %, returns %, margin %) vs recommended now (buy units, projected sell-through, expected margin). Highlight rows with > 20% delta.';
      schema = `{ "actuals_delta": [ { "family_code": "...", "last_bought": <n>, "last_sold_through_pct": <n>, "last_returns_pct": <n>, "last_margin_pct": <n>, "recommended_buy": <n>, "projected_sell_through_pct": <n>, "expected_margin_pct": <n>, "delta_flag": "amplify | hold | shrink | investigate" } ] }`;
      break;
  }

  const user = `${contextBlock}

# Task
${task}

# SCHEMA (emit one JSON object)
${schema}

Begin output now.`;

  return { system, user };
}
