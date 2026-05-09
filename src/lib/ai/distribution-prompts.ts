/**
 * 02.3 Distribución · Prompt Builders (Sprint B.3, 2026-05-09)
 *
 * Two AI prompt builders mirroring the 02.1 / 02.2 contract:
 *   1. propose — auto-fire on mount once 02.1 strategy is confirmed.
 *                Reads strategy + consumer.lifestyle + market_live_signals
 *                [dim=retail_signals] + brand identity. Returns the full
 *                multi-axis editor state (channel mix, markets, wholesale
 *                targets, marketplaces, sell-through, retail plan,
 *                pricing-per-channel, rationale).
 *   2. deepen — refine ONE axis (channel_mix, markets, wholesale,
 *                marketplaces, sell_through). Frontend merges back into
 *                the working state.
 *
 * Anti-leak:
 *   · brandName must be the user's confirmed brand (e.g. "Nudo"), NEVER
 *     plan.name (working title like "AZUR")
 *   · Live signals must come from market_live_signals[dim=retail_signals]
 *     ONLY, not the trends or competitors lens
 */

export interface DistributionPlan {
  channel_mix: {
    dtc_online: number;     // 0-100, sum across the 4 channels = 100
    dtc_physical: number;
    wholesale: number;
    marketplace: number;
  };
  markets: Array<{
    code: string;             // ISO-2 ("ES", "FR", "IT", "DE", "US", "UK", "JP")
    name: string;             // "España", "Francia", ...
    share_pct: number;        // 0-100, sum = 100
    rationale: string;        // why this market makes sense
  }>;
  wholesale_targets: Array<{
    name: string;             // store name (e.g. "Dover Street Market")
    type: 'concept_store' | 'multibrand_lux' | 'department_store' | 'online_specialist';
    city: string;
    rationale: string;
  }>;
  marketplaces: Array<{
    name: string;             // "Lyst", "Farfetch", "Ssense", ...
    type: 'aggregator' | 'curated';
    commission_pct: number;
  }>;
  sell_through_targets: {
    week_4: number;           // % of inventory sold by week 4
    week_8: number;
    week_12: number;
    week_24: number;
  };
  physical_retail: {
    enabled: boolean;
    plan: string;             // 1-2 sentences, "Pop-up September 2027 in Madrid", or "No own retail Y1"
  };
  pricing_per_channel: {
    wholesale_discount_pct: number;   // typical 50% off retail
    marketplace_discount_pct: number; // typical 30-40% off retail
  };
  rationale: string;          // 2-3 editorial sentences justifying the plan
}

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish (Castilian)',
  en: 'English',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  pt: 'Portuguese (Brazilian)',
  nl: 'Dutch',
  sv: 'Swedish',
  no: 'Norwegian (Bokmål)',
};

function langDirective(language: string): string {
  if (!language || language === 'en') return '';
  const name = LANG_NAMES[language];
  if (!name) return '';
  return `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${name}. ALL text content (rationale, plan strings) must be written in ${name}. Universally English fashion/retail terms (DTC, wholesale, marketplace, pop-up, drop, lookbook, SKU) may stay in English.`;
}

const PERSONA = `You are a senior brand-distribution strategist with 20 years of experience launching contemporary fashion brands across Europe, North America, and Asia. You have a deep memory of how the strongest first-year brands carved their channel mix: who went DTC-only via Shopify+Stripe, who placed early in Dover Street Market, who skipped marketplaces, who used Lyst for awareness only. You ground every recommendation in the brand's actual creative direction and the consumer profile already confirmed in Block 1. You never invent sell-through numbers — you cite category norms.`;

/**
 * Prompt 1 — propose the full distribution plan from upstream context.
 *
 * Auto-fires on first mount of `?block=channels` (after 02.1 confirmed).
 * Returns the COMPLETE plan (8 axes), not a partial.
 */
export function buildDistributionProposePrompt(args: {
  brandName: string;
  brandTagline: string;
  archetypeName: string;        // "Cápsula" / "Colección Esencial" / "Apuesta Fuerte" / "Drops Escalonados"
  targetSkuCount: number;
  salesTargetY1: number;
  totalInvestment: number;
  dropCount: number;
  consumerSummary: string;
  consumerLifestyle: string;
  retailSignalCards: string;     // formatted live_signals[dim=retail_signals]
  productCategory: string;
  language: string;
}): { system: string; user: string; temperature: number } {
  const {
    brandName, brandTagline, archetypeName, targetSkuCount, salesTargetY1,
    totalInvestment, dropCount, consumerSummary, consumerLifestyle,
    retailSignalCards, productCategory, language,
  } = args;

  const system = `${PERSONA}

The user has already confirmed their 02.1 buying strategy (archetype: ${archetypeName}, ${targetSkuCount} SKUs, €${salesTargetY1.toLocaleString()} Y1 target, €${totalInvestment.toLocaleString()} total investment, ${dropCount} drop${dropCount === 1 ? '' : 's'}). Now you must propose the distribution plan that delivers those numbers.

YOUR TASK: produce a complete distribution editor state — channel mix, target markets, wholesale shortlist, marketplace plan, sell-through targets, physical retail plan, channel-specific pricing — that respects BOTH the strategy envelope AND the brand's consumer + retail-signal evidence from Block 1.

NON-NEGOTIABLE RULES:
- BRAND NAME for every narrative is ${brandName}. NEVER mention any working title.
- Channel mix percentages (dtc_online + dtc_physical + wholesale + marketplace) MUST sum to exactly 100.
- Markets share_pct MUST sum to exactly 100.
- Pick 3 to 5 markets. Don't spray globally for a Y1 launch — concentrate.
- Wholesale targets: 5 to 8 stores ONLY. Real, current, well-known multibrand or concept stores in the brand's primary markets. NEVER invent.
- Marketplaces: 0 to 3. Skip if the brand doesn't fit the marketplace channel (luxury / handcraft / heritage usually skip aggregators).
- Sell-through targets must escalate: week_4 < week_8 < week_12 < week_24, all values 0-100.
- Pricing-per-channel: wholesale_discount_pct typically 50 (retail = 2× wholesale). Marketplace 30-40 depending on type.
- Y1 own retail (physical_retail.enabled): default false unless the consumer profile + investment envelope clearly support it. Bold claims need bold evidence.

CITE THE CONSUMER. Your rationale must reference the actual consumer profile and at least one retail signal card. Generic "the brand should target Europe" rationales are worthless.
${langDirective(language)}`;

  const user = `BRAND: ${brandName}${brandTagline ? ` — "${brandTagline}"` : ''}
PRODUCT CATEGORY: ${productCategory || 'contemporary fashion'}

CONFIRMED 02.1 STRATEGY:
- Archetype: ${archetypeName}
- Target SKUs: ${targetSkuCount}
- Y1 sales target: €${salesTargetY1.toLocaleString()}
- Total investment: €${totalInvestment.toLocaleString()}
- Drops: ${dropCount}

═══ BLOCK 1 INPUTS ═══

CONSUMER SUMMARY:
${consumerSummary || '(not provided)'}

CONSUMER LIFESTYLE:
${consumerLifestyle || '(not provided)'}

RETAIL SIGNALS (Block 1 · Lens 2 — informs channel mix):
${retailSignalCards || '(no retail signals captured — fall back to category norms for this brand profile)'}

═══ END BLOCK 1 INPUTS ═══

Return ONLY valid JSON (no markdown, no fences):
{
  "channel_mix": {"dtc_online": 0, "dtc_physical": 0, "wholesale": 0, "marketplace": 0},
  "markets": [
    {"code": "ES", "name": "España", "share_pct": 0, "rationale": "..."}
  ],
  "wholesale_targets": [
    {"name": "...", "type": "concept_store", "city": "...", "rationale": "..."}
  ],
  "marketplaces": [
    {"name": "...", "type": "aggregator", "commission_pct": 0}
  ],
  "sell_through_targets": {"week_4": 0, "week_8": 0, "week_12": 0, "week_24": 0},
  "physical_retail": {"enabled": false, "plan": "..."},
  "pricing_per_channel": {"wholesale_discount_pct": 50, "marketplace_discount_pct": 35},
  "rationale": "..."
}

Replace ALL placeholders. Channel mix must sum to 100. Markets share_pct must sum to 100. Sell-through must escalate.`;

  return { system, user, temperature: 0.45 };
}

export type DistributionDeepenAxis = 'channel_mix' | 'markets' | 'wholesale' | 'marketplaces' | 'sell_through';

/**
 * Prompt 2 — refine ONE axis of the current distribution plan.
 *
 * Returns ONLY the refined axis object. Frontend merges into working state.
 */
export function buildDistributionDeepenPrompt(args: {
  axis: DistributionDeepenAxis;
  current: DistributionPlan;
  brandName: string;
  consumerSummary: string;
  retailSignalCards: string;
  language: string;
}): { system: string; user: string; temperature: number } {
  const { axis, current, brandName, consumerSummary, retailSignalCards, language } = args;

  const axisInstructions: Record<DistributionDeepenAxis, { task: string; schema: string }> = {
    channel_mix: {
      task: 'Re-balance the channel mix percentages. Look at the consumer lifestyle and retail signals — should DTC online dominate? Is wholesale visibility worth more than the margin loss? Does the brand belong in marketplaces at all? Justify any shift in the rationale field. Sum must stay = 100.',
      schema: '{"channel_mix": {"dtc_online": 0, "dtc_physical": 0, "wholesale": 0, "marketplace": 0}, "rationale": "..."}',
    },
    markets: {
      task: 'Refine the market list — add or replace 1-2 markets with stronger evidence from the consumer profile or retail signals. share_pct must sum to 100. 3-5 markets only.',
      schema: '{"markets": [{"code": "ES", "name": "España", "share_pct": 0, "rationale": "..."}]}',
    },
    wholesale: {
      task: 'Refine the wholesale shortlist — replace generic stores with sharper picks for the brand. Cite specific buyers / cities / why the store fits. 5-8 real stores only. NEVER invent names.',
      schema: '{"wholesale_targets": [{"name": "...", "type": "concept_store", "city": "...", "rationale": "..."}]}',
    },
    marketplaces: {
      task: 'Re-examine whether the brand should be on marketplaces at all. If yes, refine the picks. If no, return an empty array with a one-sentence rationale.',
      schema: '{"marketplaces": [{"name": "...", "type": "aggregator", "commission_pct": 0}], "rationale": "..."}',
    },
    sell_through: {
      task: 'Tune the sell-through curve to category norms (apparel typically 25/45/65/85, accessories more conservative, jewelry slower). Must escalate: week_4 < week_8 < week_12 < week_24.',
      schema: '{"sell_through_targets": {"week_4": 0, "week_8": 0, "week_12": 0, "week_24": 0}}',
    },
  };

  const meta = axisInstructions[axis];

  const system = `${PERSONA}

You are NOT generating a fresh distribution plan. You are DEEPENING ONE AXIS of an already-loaded plan for ${brandName}.

CURRENT AXIS: ${axis}
TASK: ${meta.task}

ANTI-LEAK RULES (still apply):
- Brand name = ${brandName}. Never echo working titles.
- Use the consumer profile + retail signals as ground truth. Do not invent.
${langDirective(language)}`;

  const user = `CURRENT PLAN STATE:
${JSON.stringify(current, null, 2)}

═══ BLOCK 1 INPUTS (relevant to ${axis}) ═══
${axis === 'channel_mix' || axis === 'wholesale' || axis === 'marketplaces' ? `RETAIL SIGNALS:\n${retailSignalCards}` : ''}
${axis === 'markets' || axis === 'channel_mix' ? `CONSUMER:\n${consumerSummary}` : ''}

Return ONLY this JSON (no markdown, no fences):
${meta.schema}`;

  return { system, user, temperature: 0.5 };
}
