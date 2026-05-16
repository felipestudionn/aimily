/**
 * Buy-strategy archetypes · static curated seed data
 *
 * The 4 retail-merchandising postures the user picks from in the Strategy
 * Setup workspace (`/strategy/[tenantSlug]/setup?block=buy-strategy`).
 * Mirrors the shape of Block 4's sales-strategy/archetypes.ts but the
 * semantics are completely different — these are POST-SEASON BUYING
 * postures (replenish/new/extension/kill mix), not pre-launch channel
 * strategies.
 *
 * Used by:
 *   · POST /api/strategy/buy-strategy-archetypes (returns this list)
 *   · /strategy/[tenantSlug]/setup buy-strategy block (kickoff display)
 *   · POST /api/strategy/buy-strategy-prefill-editor (grounds Claude prompt)
 *
 * Source: .planning/strategy/plan_strategy-restructure-v3-2026-05-16.md §3
 * Codex v3-patched: PASS — D is engine-backed (orchestrator dispatches
 * proposers when chosen_archetype_id==='D').
 */

export type BuyStrategyArchetypeId = 'A' | 'B' | 'C' | 'D';

export interface BuyStrategyArchetype {
  id: BuyStrategyArchetypeId;
  name: string;
  tagline: string;
  narrative: string;
  /** Default action-mix tilt presented when the user picks this archetype.
   *  The editor then lets them fine-tune. Sum must equal 100. */
  default_action_mix: {
    replenish_pct: number;
    new_sku_proposal_pct: number;
    family_extension_pct: number;
    kill_pct: number;
  };
  /** DB scenario_type the run will primarily produce for this archetype.
   *  Useful for UI labels mapping archetype→headline scenario. */
  primary_scenario_type:
    | 'creative_amplified'
    | 'base_case'
    | 'risk_minimized'
    | 'kill_heavy'
    | 'category_transition';
  levers: {
    target_sales_growth: string;
    target_margin: string;
    buy_budget: string;
  };
  best_for: string;
  failure_mode: string;
  benchmarks: Array<{
    brand: string;
    note: string;
  }>;
  /** Whether this archetype REQUIRES the user to fill target_adjacent_families.
   *  Currently only D. */
  requires_adjacent_families: boolean;
}

export const BUY_STRATEGY_ARCHETYPES: BuyStrategyArchetype[] = [
  {
    id: 'A',
    name: 'Replenish & Amplify',
    tagline: 'Aggressive growth · double down on heroes',
    narrative:
      'You bet on what worked. Replenish heroes aggressively, expand winning lineages with new colours / silhouettes, accept margin compression for volume growth. Zara / Inditex playbook adapted to a single brand: refresh fast, follow the data, take inventory risk for upside.',
    default_action_mix: {
      replenish_pct: 50,
      new_sku_proposal_pct: 15,
      family_extension_pct: 30,
      kill_pct: 5,
    },
    primary_scenario_type: 'creative_amplified',
    levers: {
      target_sales_growth: '+20% to +40%',
      target_margin: 'preserve or compress',
      buy_budget: 'high',
    },
    best_for:
      'Tenants with clear hero signals + capital to invest + tolerance for inventory risk if heroes don\'t repeat.',
    failure_mode:
      'Over-buy on yesterday\'s winners → unsold inventory → markdown spiral that eats next-season cash.',
    benchmarks: [
      { brand: 'Zara · 26W22', note: 'Replenished W.A FLUIDOS LARGO heroes 2.5× while extending colourways 30%.' },
      { brand: 'Mango · 26SS', note: 'Doubled denim ROI by replenishing top 12 SKUs and adding 4 colourway extensions.' },
      { brand: 'COS · 26SS', note: 'Replenish-led capsule refresh on 20% of last season\'s heroes.' },
    ],
    requires_adjacent_families: false,
  },
  {
    id: 'B',
    name: 'Balanced ROI',
    tagline: '80/20 discipline · the default',
    narrative:
      'The mid-market default. Apply the 80/20 rule: kill the bottom 20% of SKUs, replenish proven winners, modest extensions on growing families, protect 60%+ margin. Conservative ambition, durable margins. Suits tenants who can\'t afford either side of the extremes.',
    default_action_mix: {
      replenish_pct: 40,
      new_sku_proposal_pct: 20,
      family_extension_pct: 20,
      kill_pct: 20,
    },
    primary_scenario_type: 'base_case',
    levers: {
      target_sales_growth: '+5% to +15%',
      target_margin: 'protect 60-65%',
      buy_budget: 'medium',
    },
    best_for:
      'Most tenants. The starting point when the merchandising team has no strong signal in either direction.',
    failure_mode:
      'Middle-of-road can miss the moment if competitors lean aggressive. Brand drift if curation reads as "no newness".',
    benchmarks: [
      { brand: 'Massimo Dutti · 26SS', note: 'Killed 18% of SS25 line · replenished top 60% · extended 4 archetypes.' },
      { brand: 'Sandro · 26SS', note: 'Standard pre-season buy: 65% carryover, 20% new, 15% extension.' },
      { brand: 'Other Stories · 26SS', note: 'Stable mix with focused extensions on best-selling silhouettes.' },
    ],
    requires_adjacent_families: false,
  },
  {
    id: 'C',
    name: 'Defend & Curate',
    tagline: 'Margin-first · premium positioning',
    narrative:
      'You protect margin above all. Kill aggressively (anything below the margin floor), replenish only A-tier heroes, minimal new SKUs. Premium / contemporary playbook — the customer pays for curation, not novelty. Small drops, narrative-driven.',
    default_action_mix: {
      replenish_pct: 30,
      new_sku_proposal_pct: 5,
      family_extension_pct: 5,
      kill_pct: 60,
    },
    primary_scenario_type: 'kill_heavy',
    levers: {
      target_sales_growth: 'flat to +5%',
      target_margin: 'expand to 65%+',
      buy_budget: 'low',
    },
    best_for:
      'Premium positioning with strong margin pressure. Tenants where customers buy fewer pieces at higher price points.',
    failure_mode:
      'Curation read as "boring" by the customer → traffic erosion → harder to recover than over-buying.',
    benchmarks: [
      { brand: 'Toteme · 26SS', note: 'Killed 35% of SS25 SKUs · only replenished 8 archetype heroes.' },
      { brand: 'Khaite · 26SS', note: 'Tight 80-SKU edit · 90% carryover at full margin · zero markdowns.' },
      { brand: 'Lemaire · 26SS', note: 'Curated 45 SKUs · 70% carryover · margin > 70%.' },
    ],
    requires_adjacent_families: false,
  },
  {
    id: 'D',
    name: 'Category Transition',
    tagline: 'Adjacency push · expand into new families',
    narrative:
      'You are deliberately moving the brand into an adjacent category (denim → outerwear, womenswear → kidswear, ready-to-wear → homewear). Generative proposers fire BEFORE scenario assembly to seed new_sku + family_extension candidates into your target families. Replenish core heroes minimally to fund the push. Investigate categories where signal is still thin.',
    default_action_mix: {
      replenish_pct: 25,
      new_sku_proposal_pct: 40,
      family_extension_pct: 30,
      kill_pct: 5,
    },
    primary_scenario_type: 'category_transition',
    levers: {
      target_sales_growth: 'flat overall · category +∞%',
      target_margin: 'neutral (some compression accepted in new category)',
      buy_budget: 'medium · reallocated from core to adjacent',
    },
    best_for:
      'Tenants making a deliberate category bet — Mango entering homewear, a denim brand launching outerwear capsule, womenswear adding kidswear.',
    failure_mode:
      'Adjacency without commitment = no traction in either category. Investigate-only burns a season.',
    benchmarks: [
      { brand: 'Mango Home (2022 launch)', note: 'Mango entered homewear via family extension + new SKU mix. 1st year focus = adjacency, not core replenish.' },
      { brand: 'Zara Kids (origin)', note: 'Zara womenswear → kidswear pivot used the same supply chain + adjacent designs.' },
      { brand: 'Levi\'s Outerwear FW25', note: 'Denim brand pivoted into outerwear with 12 new SKUs anchored to denim heroes.' },
    ],
    requires_adjacent_families: true,
  },
];

export function getBuyStrategyArchetype(
  id: BuyStrategyArchetypeId
): BuyStrategyArchetype | undefined {
  return BUY_STRATEGY_ARCHETYPES.find((a) => a.id === id);
}

/**
 * Localized view of the 4 archetypes for client rendering. Pure data,
 * keeps action_mix / benchmarks / primary_scenario_type from the seed
 * but overrides every user-facing string with the active locale.
 *
 * The `t` argument is the Dictionary returned by useTranslation(); we
 * accept a structural sub-type so this helper stays decoupled from the
 * full i18n module (server callers can pass `enDict.strategy.archetypes`
 * directly when they don't have a hook context).
 */
export interface LocalizedArchetypeStrings {
  name: string;
  tagline: string;
  narrative: string;
  best_for: string;
  failure_mode: string;
  target_sales_growth: string;
  target_margin: string;
  buy_budget: string;
}

export function localizeArchetypes(
  strings: Record<'a' | 'b' | 'c' | 'd', LocalizedArchetypeStrings>
): BuyStrategyArchetype[] {
  return BUY_STRATEGY_ARCHETYPES.map((a) => {
    const localeKey = a.id.toLowerCase() as 'a' | 'b' | 'c' | 'd';
    const s = strings[localeKey];
    return {
      ...a,
      name: s.name,
      tagline: s.tagline,
      narrative: s.narrative,
      best_for: s.best_for,
      failure_mode: s.failure_mode,
      levers: {
        target_sales_growth: s.target_sales_growth,
        target_margin: s.target_margin,
        buy_budget: s.buy_budget,
      },
    };
  });
}
