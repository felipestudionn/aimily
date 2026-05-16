/**
 * Strategy Market Trends · ad-hoc Perplexity Sonar prompt
 *
 * Felipe's product-direction rule: descriptions are PRODUCT angles, not
 * marketing storytelling. Each trend must answer:
 *   · what pattern/silhouette/material/color is it about?
 *   · which 2-3 reference brands are driving it right now?
 *
 * Returns trends grouped by `dimension` so the UI can render category
 * sections (Silhouette · Color · Material · Pattern · Reference brand ·
 * Category direction).
 *
 * Built from scratch — does NOT modify the existing Block 1 trends prompt
 * (`buildSonarTrendsPrompt` in lib/ai/perplexity-client.ts).
 */

export type StrategyTrendDimension =
  | 'silhouette'
  | 'pattern'
  | 'color'
  | 'material'
  | 'reference_brand';

export interface StrategyTrend {
  dimension: StrategyTrendDimension;
  title: string;
  /** Product spec line — what the trend IS, not what it represents. */
  product_spec: string;
  /** 2-4 reference brands driving the trend right now. */
  reference_brands: string[];
  /** Hex color when dimension === 'color'. */
  color_hex?: string;
  /** Color name when dimension === 'color'. */
  color_name?: string;
}

export interface StrategyMarketTrendsResponse {
  trends: StrategyTrend[];
}

export interface BuildMarketTrendsPromptOptions {
  /** Tenant display name (used only for context, not for marketing copy). */
  tenantName: string;
  /** Product category — e.g. "Womenswear contemporary" / "Footwear casual". */
  productCategory: string;
  /** Active season for the upcoming buy — e.g. "2026 SS". */
  season: string;
  /** Top families from the tenant's sales history. */
  topFamilies: string[];
  /** Brand archetype detected on the tenant (e.g. "editorial-heritage"). */
  brandArchetype?: string;
  /** Reference brands already known for the tenant — narrows the lens. */
  referenceBrands?: string[];
  /** Language for the descriptions. Default Spanish (Castilian). */
  language?: 'en' | 'es';
}

export function buildStrategyMarketTrendsPrompt(
  opts: BuildMarketTrendsPromptOptions
): { system: string; user: string } {
  const lang = opts.language === 'en' ? 'English' : 'Spanish (Castilian)';

  const system = `You are a senior fashion product strategist. Your job: extract MARKET TRENDS that are actionable at the product-design level for a brand making buying decisions for the next season. You emit ONLY structured JSON matching the schema. NO marketing storytelling, NO narrative prose, NO romantic descriptions. Output language: ${lang}.

CRITICAL OUTPUT RULES:
- Every "product_spec" field is a tight, technical sentence (max 20 words) describing the CONCRETE product feature: silhouette shape, fabric spec, pattern technique, color, or material construction.
- NEVER write feel/mood/vibe descriptions. Write only what a pattern-maker, fabric buyer, or merchandiser could act on.
- Bad: "Lap Welcome 2.0 — The rebirth of bouclé tailoring evokes warmth and craft."
- Good: "Bouclé wool jacket, boxy oversized fit, raglan sleeve, double-breasted with notched collar."
- Reference brands: 2-4 brand names actually driving the trend on runway/retail/social RIGHT NOW.
- Group every trend under exactly ONE dimension from the schema.`;

  const refsBlock = opts.referenceBrands && opts.referenceBrands.length > 0
    ? `\n- Reference brands already in this brand's orbit: ${opts.referenceBrands.join(', ')}`
    : '';

  const archetypeBlock = opts.brandArchetype
    ? `\n- Brand archetype detected: ${opts.brandArchetype}`
    : '';

  const user = `# Brand context
- Brand: ${opts.tenantName}
- Product category: ${opts.productCategory}
- Top families from last season: ${opts.topFamilies.slice(0, 6).join(', ') || 'unknown'}
- Buying season ahead: ${opts.season}${archetypeBlock}${refsBlock}

# Task
Surface 16-24 market trends relevant for this brand's next-season buy. Distribute them across these 5 dimensions:

1. **silhouette** (5-7 trends) — specific cuts/shapes the brand should consider. Examples: "blazer oversized raglan, double-breasted", "midi slip dress bias-cut", "trouser pleated wide-leg".
2. **pattern** (3-5 trends) — print/jacquard/embroidery techniques. Examples: "tonal jacquard floral", "lace overlay scallop edge", "abstract block print 70s palette".
3. **color** (4-6 trends) — Each card MUST include color_hex AND color_name. Examples: "Dusty Rose #DCAE96", "Midnight Petrol #0B2A33", "Soft Bone #E8DDC7".
4. **material** (3-4 trends) — fabric specs with weight when relevant. Examples: "bouclé wool 320gsm", "silk crêpe de chine", "garment-dyed cotton twill".
5. **reference_brand** (2-3 trends) — brands worth tracking specifically because their next-season releases will set the pace. Each trend's title = the brand name; product_spec = 1 sentence on what makes them the reference right now.

# SCHEMA (emit one JSON object, no markdown fences, no prose)
{
  "trends": [
    {
      "dimension": "silhouette | pattern | color | material | reference_brand",
      "title": "concise label (max 6 words)",
      "product_spec": "1 technical sentence describing the product feature (max 20 words)",
      "reference_brands": ["Brand 1", "Brand 2", "Brand 3"],
      "color_hex": "#RRGGBB (ONLY when dimension=color)",
      "color_name": "Color name (ONLY when dimension=color)"
    }
  ]
}

CRITICAL:
- 16-24 trends total, distributed per the counts above.
- color trends MUST have color_hex AND color_name fields populated.
- ALL OTHER trends must omit color_hex and color_name.
- Each title and product_spec language: ${lang}.
- Reference brands list = real brand names from runway/retail RIGHT NOW.

Begin output now with the JSON object.`;

  return { system, user };
}
