/**
 * 02.1 Estrategia de Compra · Prompt Builders (Sprint B.1, 2026-05-08)
 *
 * Two AI prompt builders for the convergence and refinement steps:
 *   1. prefillEditor — once user picks an archetype (from the static
 *                      curated table at /api/scenarios-archetypes),
 *                      this builds the multi-axis editor pre-filled
 *                      from Block 1 (families+subcat from references/
 *                      moodboard/trends, pricing tiers from competitors[]
 *                      ONLY — anti-leak).
 *   2. deepen — refine ONE axis of the chosen scenario in-place.
 *
 * The kick-off (4 archetypes display) does NOT use AI — it's a
 * static-curated table lookup (`scenarios-archetypes-table.ts`). The
 * earlier Sonnet-generated kick-off hallucinated Y1 numbers and brand
 * founders, so factual ground beat AI variety there.
 *
 * Anti-leak rules:
 *   · Use brand_name (e.g. "Nudo"), NEVER plan.name (e.g. "AZUR" working title)
 *   · Pricing benchmarks → market_competitors_input.competitors[] ONLY
 *   · Families / visual mix → market_competitors_input.references[] OK
 */

// ScenarioArchetype + ArchetypeBenchmark live in the curated table —
// re-export so existing routes / components don't need to change imports.
export type { ScenarioArchetype, ArchetypeBenchmark, ArchetypeId } from '@/lib/scenarios-archetypes-table';
import type { ScenarioArchetype } from '@/lib/scenarios-archetypes-table';

export interface PrefilledFamily {
  name: string;
  count: number;
  subcategories: Array<{ name: string; count: number; evidence: string }>;
}

export interface PrefilledEditor {
  archetype_id: 'A' | 'B' | 'C' | 'D';
  sku_count: number;
  investment_split: { production: number; marketing: number; total: number };
  pricing_tiers: {
    entry: { min: number; max: number; anchored_by: string[] };
    core: { min: number; max: number; anchored_by: string[] };
    hero: { min: number; max: number; anchored_by: string[] };
  };
  families: PrefilledFamily[];
  drops: { count: number; suggested_names?: string[] };
  sales_target_y1: number;
  target_margin_pct: number;
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
  return `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${name}. ALL text content (names, narratives, best_for, evidence) must be written in ${name}. Universally English fashion terms (SKU, drop, capsule, DTC, wholesale) may stay in English.`;
}

const ARCHETYPE_PERSONA = `You are a senior merchandise planner with 20 years of experience launching contemporary fashion brands in Europe. You have a deep memory of how well-known brands looked in their first commercial year — the SKU count they carried, the investment they raised or self-funded, and the revenue they ultimately reported. You ground every recommendation in real, verifiable data points; never invent numbers.`;

/**
 * Prompt 2 — Pre-fill the editor once the user picks an archetype.
 *
 * Now we DO read Block 1 (the convergence point). The chosen archetype
 * defines the volumetric envelope; CIS data shapes the families,
 * subcategories, pricing tiers, and drop split inside that envelope.
 *
 * Anti-leak inputs split:
 *   · pricingCompetitorCards   — for pricing tiers (competitors[] only)
 *   · visualReferenceCards     — for families / subcategorías visual mix
 *   · marketTrendsCards        — for subcategorías product type hints
 */
export function buildScenariosPrefillEditorPrompt(args: {
  archetype: ScenarioArchetype;
  brandName: string;
  brandTagline: string;
  consumerSummary: string;
  moodboardSummary: string;
  productCategory: string;
  pricingCompetitorCards: string;
  visualReferenceCards: string;
  marketTrendsCards: string;
  language: string;
}): { system: string; user: string; temperature: number } {
  const { archetype, brandName, brandTagline, consumerSummary, moodboardSummary, productCategory, pricingCompetitorCards, visualReferenceCards, marketTrendsCards, language } = args;

  const system = `${ARCHETYPE_PERSONA}

The user just picked archetype ${archetype.id} (${archetype.name}) for their first commercial collection. Now you must propose how that archetype materialises against their already-confirmed creative direction.

YOUR TASK: produce a complete pre-filled editor state — families with subcategories, pricing tiers, drop split, investment breakdown, sales target — that respects BOTH the archetype's envelope AND the brand's creative work.

CRITICAL RULES — anti-leak split between sources:
- PRICING TIERS (entry / core / hero): anchor ONLY to the brand's direct competitors. Cite EXACTLY their real 2026 prices and surface those brand names in the \`anchored_by\` array. Do NOT pull from aspirational REFERENCES — those are imagery codes only, never pricing benchmarks.
- FAMILIES / SUBCATEGORIES: pull from the moodboard analysis, market trends and visual references. Each subcategory MUST cite its evidence (which trend card or reference brand inspired it) in the \`evidence\` field.
- COUNT BY FAMILY must sum to roughly the archetype's mid-range SKU count.
- BRAND NAME for any narrative must be ${brandName}. NEVER mention any other working title.

═══ TAXONOMY RULES (NON-NEGOTIABLE — readers will check) ═══

There are THREE levels of detail; you must respect all three:

  1. FAMILY (this output)        = top-level product CATEGORY. A single noun, no adjectives, no aesthetic descriptors.
  2. SUBCATEGORY (this output)   = the TYPE within the family. Two-word maximum, descriptive of the silhouette.
  3. DESCRIPTION (Block 3, NOT here) = adjectives like "minimalist", "architectural", "structured" go on the SKU itself, not the family name.

FAMILY EXAMPLES — what the field "name" must look like:
  RIGHT: "Vestidos", "Sastrería", "Calzado", "Pantalones", "Prendas superiores", "Bolsos", "Accesorios", "Outerwear"
  WRONG: "Sastrería Arquitectónica" (has descriptor), "Vestidos Fluidos" (this is a SUB-level), "Calzado Minimalista", "Prendas Superiores Minimalistas"

SUBCATEGORY EXAMPLES — what \`subcategories[].name\` must look like:
  Family "Vestidos" → subcategorías: "Vestidos fluidos", "Vestidos asimétricos", "Vestidos lenceros", "Vestidos camiseros"
  Family "Sastrería" → subcategorías: "Blazers", "Pantalones de traje", "Chaquetas"
  Family "Calzado" → subcategorías: "Mocasines", "Zapatos planos", "Sandalias", "Botas"
  Family "Prendas superiores" → subcategorías: "Blusas", "Camisas", "Knitwear", "T-shirts"
  Family "Pantalones" → subcategorías: "Cargo", "Jeans", "Tailoring", "Wide-leg"
  Family "Bolsos" → subcategorías: "Tote", "Hobo", "Crossbody", "Clutch"
  WRONG subcategorías: "Blazers Mini Estructurados" (has descriptor), "Vestidos Lencería Largos" (extra adjective), "Mocasines Cuero Adornados"

For SINGLE-CATEGORY BRANDS (jewelry, fragrance, swimwear only):
  Use the PRODUCT TYPE as the family.
  Jewelry → families: "Anillos", "Collares", "Pulseras", "Pendientes"
    Subcategorías for "Anillos": "Signets", "Solitaires", "Eternity rings", "Bandas"

═══ END TAXONOMY RULES ═══

QUALITY GATES:
- 3 to 5 top-level families maximum.
- 2 to 4 subcategories per family.
- Pricing tier ranges should not overlap (entry max < core min < hero min).
- entry tier anchored to the cheapest competitors, hero anchored to the most premium.
- Marketing % of investment must equal the archetype's marketing_pct (${archetype.marketing_pct}%).
- target_margin_pct: respect category norms (apparel/footwear 55-65%, accessories 65-75%, jewelry 70-80%).
${langDirective(language)}`;

  const user = `BRAND: ${brandName}${brandTagline ? ` — "${brandTagline}"` : ''}
PRODUCT CATEGORY: ${productCategory || 'contemporary fashion'}

CHOSEN ARCHETYPE: ${archetype.id} · ${archetype.name}
- SKU range: ${archetype.sku_range.min}–${archetype.sku_range.max}
- Investment range: €${archetype.investment_range.min.toLocaleString()}–€${archetype.investment_range.max.toLocaleString()}
- Y1 sales range: €${archetype.y1_sales_range.min.toLocaleString()}–€${archetype.y1_sales_range.max.toLocaleString()}
- Drops: ${archetype.drop_count}
- Marketing %: ${archetype.marketing_pct}%
- Benchmark brands Y1: ${archetype.benchmarks.map(b => `${b.brand} (${b.skus} SKUs / €${b.y1_sales_eur.toLocaleString()} Y1)`).join(' · ')}

═══ BLOCK 1 CREATIVE INPUTS ═══

CONSUMER:
${consumerSummary || '(not provided)'}

MOODBOARD ANALYSIS:
${moodboardSummary || '(not provided)'}

MARKET TRENDS (Block 1 · Lens 1 — informs subcategories):
${marketTrendsCards || '(no confirmed trends)'}

VISUAL REFERENCES (Block 1 · Lens 4 references — inform family mix and subcategory aesthetic):
${visualReferenceCards || '(no references confirmed)'}

DIRECT COMPETITORS (Block 1 · Lens 4 competitors — pricing benchmarks ONLY):
${pricingCompetitorCards || '(no competitors confirmed — fall back to category norms and stay conservative)'}

═══ END BLOCK 1 INPUTS ═══

Pick a single sku_count inside the archetype range. Distribute across families. Build pricing tiers anchored to the direct competitors above. Pre-fill drops and investment split.

Return ONLY valid JSON (no markdown, no fences):
{
  "archetype_id": "${archetype.id}",
  "sku_count": 0,
  "investment_split": {"production": 0, "marketing": 0, "total": 0},
  "pricing_tiers": {
    "entry": {"min": 0, "max": 0, "anchored_by": ["..."]},
    "core":  {"min": 0, "max": 0, "anchored_by": ["..."]},
    "hero":  {"min": 0, "max": 0, "anchored_by": ["..."]}
  },
  "families": [
    {"name":"...","count":0,"subcategories":[{"name":"...","count":0,"evidence":"..."}]}
  ],
  "drops": {"count": ${archetype.drop_count}, "suggested_names": ["..."]},
  "sales_target_y1": 0,
  "target_margin_pct": 0
}

Replace ALL placeholders. Sum of family counts ≈ sku_count. Sum of subcategory counts within a family = family.count.`;

  return { system, user, temperature: 0.5 };
}

export type DeepenAxis = 'volume' | 'pricing' | 'families' | 'drops' | 'narrative';

/**
 * Prompt 3 — refine ONE axis of the chosen scenario in-place.
 *
 * Returns ONLY the refined axis object, not the full prefill state.
 * Frontend merges it into the working scenario.
 */
export function buildScenariosDeepenPrompt(args: {
  axis: DeepenAxis;
  archetype: ScenarioArchetype;
  currentEditor: PrefilledEditor;
  brandName: string;
  pricingCompetitorCards: string;
  visualReferenceCards: string;
  marketTrendsCards: string;
  consumerSummary: string;
  language: string;
}): { system: string; user: string; temperature: number } {
  const { axis, archetype, currentEditor, brandName, pricingCompetitorCards, visualReferenceCards, marketTrendsCards, consumerSummary, language } = args;

  const axisInstructions: Record<DeepenAxis, { task: string; schema: string }> = {
    volume: {
      task: 'Re-balance the SKU count across families to better match the brand\'s creative narrative, while staying inside the archetype envelope. Surface 1-2 alternative volume distributions if you see a better one. Adjust subcategory counts to keep family.count = sum(subcategory.counts). TAXONOMY: family names must be generic single-noun categories (Vestidos, Sastrería, Calzado, Pantalones, Bolsos) — NO descriptors like "Arquitectónica" or "Fluidos". Subcategorías keep silhouette type names ("Vestidos fluidos", "Blazers", "Mocasines"). Descriptive adjectives belong to the SKU level, not here.',
      schema: '{"sku_count": 0, "families": [{"name":"...","count":0,"subcategories":[{"name":"...","count":0,"evidence":"..."}]}]}',
    },
    pricing: {
      task: 'Refine the pricing tiers using the direct competitor cards more precisely. Improve the anchored_by citations with specific 2026 prices when you have them. Tighten range overlaps. ONLY use direct competitors — never references.',
      schema: '{"pricing_tiers": {"entry":{"min":0,"max":0,"anchored_by":["..."]},"core":{"min":0,"max":0,"anchored_by":["..."]},"hero":{"min":0,"max":0,"anchored_by":["..."]}}}',
    },
    families: {
      task: 'Refine the families and subcategories — add 1-2 subcategories that the moodboard / trends / references support but the current draft missed. Strengthen evidence citations. Keep total SKU count stable. TAXONOMY: family names must be generic single-noun categories (Vestidos, Sastrería, Calzado, Pantalones, Bolsos) — NO adjective descriptors. Subcategorías keep silhouette-type names ("Vestidos fluidos", "Blazers", "Mocasines") — no aesthetic adjectives like "Arquitectónica", "Mini Estructurado". If existing families/subcategories carry descriptors, REWRITE them to comply.',
      schema: '{"families": [{"name":"...","count":0,"subcategories":[{"name":"...","count":0,"evidence":"..."}]}]}',
    },
    drops: {
      task: 'Refine the drop calendar — name each drop with a short, brand-aligned name and suggest a release-month split. Respect the archetype\'s drop_count.',
      schema: '{"drops": {"count": 0, "suggested_names": ["..."]}}',
    },
    narrative: {
      task: 'Re-examine the entire scenario and propose 1-2 sharper strategic narratives the user can adopt as the through-line for this collection. Cite the consumer profile or moodboard evidence supporting each.',
      schema: '{"strategic_narratives": [{"angle":"...","evidence":"..."}]}',
    },
  };

  const meta = axisInstructions[axis];

  const system = `${ARCHETYPE_PERSONA}

You are NOT generating a fresh editor state. You are DEEPENING ONE AXIS of an already-loaded scenario for ${brandName}.

CURRENT AXIS: ${axis}
TASK: ${meta.task}

ANTI-LEAK RULES (still apply):
- Pricing changes use the direct competitors only.
- Family / subcategory changes use moodboard + trends + references.
- Brand name = ${brandName}. Never echo working titles.
${langDirective(language)}`;

  const user = `CHOSEN ARCHETYPE: ${archetype.id} · ${archetype.name}
ENVELOPE: ${archetype.sku_range.min}–${archetype.sku_range.max} SKUs · €${archetype.investment_range.min.toLocaleString()}–€${archetype.investment_range.max.toLocaleString()} inv · ${archetype.drop_count} drops

CURRENT EDITOR STATE:
${JSON.stringify(currentEditor, null, 2)}

═══ BLOCK 1 INPUTS (relevant to ${axis}) ═══
${axis === 'pricing' ? `DIRECT COMPETITORS:\n${pricingCompetitorCards}` : ''}
${axis === 'families' || axis === 'volume' ? `MARKET TRENDS:\n${marketTrendsCards}\n\nVISUAL REFERENCES:\n${visualReferenceCards}` : ''}
${axis === 'narrative' ? `CONSUMER:\n${consumerSummary}` : ''}

Return ONLY this JSON (no markdown, no fences):
${meta.schema}`;

  return { system, user, temperature: 0.55 };
}
