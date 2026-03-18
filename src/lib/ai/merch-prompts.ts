/**
 * Merchandising & Planning Block — Prompt Registry
 *
 * 8 prompt types covering:
 * - Product Families (assisted + proposals)
 * - Pricing (assisted + proposals)
 * - Channels & Markets (assisted + proposals)
 * - Budget & Financials (assisted + proposals)
 *
 * Key principle: Every prompt inherits context from the Creative block
 * (consumer, vibe, brand DNA, trends) to generate contextually rich outputs.
 */

import {
  PERSONAS,
  QUALITY_GATES,
  OUTPUT_RULES,
  buildInheritedContext,
} from './prompt-foundations';

export interface MerchPrompt {
  system: string;
  user: string;
  temperature: number;
}

type MerchPromptType =
  | 'families-assisted'
  | 'families-proposals'
  | 'pricing-assisted'
  | 'pricing-proposals'
  | 'channels-assisted'
  | 'channels-proposals'
  | 'budget-assisted'
  | 'budget-proposals';

export function buildMerchPrompt(
  type: MerchPromptType,
  input: Record<string, string>
): MerchPrompt | null {
  const ctx = buildInheritedContext(input);

  switch (type) {
    // ═══════════════════════════════════════════════════
    // PRODUCT FAMILIES
    // ═══════════════════════════════════════════════════

    case 'families-assisted':
      return {
        temperature: 0.65,
        system: PERSONAS.merchPlanner,
        user: `${ctx}

The user has given this direction about their product families:

"${input.direction}"

Based on this direction and the inherited context (consumer, vibe, season, trends), suggest a structured product family hierarchy.

HARD LIMIT: Maximum 5 families. Choose the most impactful ones.

ANALYSIS FRAMEWORK:
1. FAMILY LOGIC — Why these families? Tie each one to the consumer profile and collection vibe
2. SUBCATEGORY DEPTH — Each family needs 3-6 subcategories that represent real product types this brand would actually produce
3. SEASONAL FIT — Subcategories must make sense for the specific season (no heavy boots in SS unless there's a strategic reason)
4. COMMERCIAL BALANCE — Include both high-volume commercial categories and lower-volume differentiating categories
5. PRODUCTION REALITY — Consider that each subcategory implies a different supply chain (don't suggest 15 subcategories for a startup)

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "families": [
    {
      "name": "Family Name (industry-standard naming)",
      "subcategories": ["Subcategory 1", "Subcategory 2", "Subcategory 3"],
      "priority": "core" or "strategic" or "complementary",
      "rationale": "15-25 words: why this family and these subcategories for this specific collection"
    }
  ]
}

Priority levels:
- "core": Essential families — highest revenue potential, must-have for the collection to work commercially
- "strategic": Important differentiators — builds brand identity, attracts the target consumer, may not be the highest volume
- "complementary": Nice-to-have — completes the offering, enables cross-selling, can be cut if budget is tight`,
      };

    case 'families-proposals':
      return {
        temperature: 0.65,
        system: PERSONAS.merchPlanner,
        user: `${ctx}

You have the COMPLETE creative direction above. The user has NOT given any direction about product families — you must deduce the optimal family structure entirely from the creative brief.

STEP 1 — SYNTHESIZE A DIRECTION (do this internally):
Read the consumer profiles, collection vibe, brand DNA, trends, and season. Ask yourself:
- What does this consumer actually buy? What product categories are in their wardrobe?
- What does the vibe imply in terms of product types? (e.g., "Vacation Archaeology" implies resort shirting, relaxed bottoms, layering pieces)
- What does the brand DNA suggest about category focus? (e.g., a footwear brand DNA → footwear as hero family)
- What does the season demand? (SS = lighter categories, FW = layering/outerwear)

STEP 2 — BUILD THE FAMILY HIERARCHY:
Based on your synthesized direction, suggest a structured product family hierarchy — exactly as if a senior merchandiser had briefed you.

HARD LIMIT: Maximum 5 families. Choose the most impactful ones.

ANALYSIS FRAMEWORK:
1. FAMILY LOGIC — Why these families? Tie each one to the consumer profile and collection vibe
2. SUBCATEGORY DEPTH — Each family needs 3-6 subcategories that represent real product types this brand would actually produce
3. SEASONAL FIT — Subcategories must make sense for the specific season (no heavy boots in SS unless there's a strategic reason)
4. COMMERCIAL BALANCE — Include both high-volume commercial categories and lower-volume differentiating categories
5. PRODUCTION REALITY — Consider that each subcategory implies a different supply chain (don't suggest 15 subcategories for a startup)

Use INDUSTRY-STANDARD family and subcategory names. These are real product categories a buyer or production manager would recognize: "Shirts", "Trousers", "Knitwear", "Outerwear", "Footwear", "Bags", "Accessories" — NOT conceptual names like "Resort Lifestyle Pyramid" or "Intellectual Provocation Edit".

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "families": [
    {
      "name": "Family Name (industry-standard naming: Shirts, Trousers, Knitwear, Footwear, etc.)",
      "subcategories": ["Subcategory 1", "Subcategory 2", "Subcategory 3"],
      "priority": "core" or "strategic" or "complementary",
      "rationale": "15-25 words: why this family and these subcategories for this specific collection"
    }
  ]
}

Priority levels:
- "core": Essential families — highest revenue potential, must-have for the collection to work commercially
- "strategic": Important differentiators — builds brand identity, attracts the target consumer, may not be the highest volume
- "complementary": Nice-to-have — completes the offering, enables cross-selling, can be cut if budget is tight

Order families from highest to lowest priority.`,
      };

    // ═══════════════════════════════════════════════════
    // PRICING
    // ═══════════════════════════════════════════════════

    case 'pricing-assisted':
      return {
        temperature: 0.5,
        system: PERSONAS.merchPlanner,
        user: `${ctx}

The validated product families are:
${input.families}

The user has given this pricing direction:

"${input.direction}"

Assign min/max price ranges (EUR) for each family and subcategory.

PRICING METHODOLOGY:
1. COMPETITIVE BENCHMARKING — Base prices on real European market benchmarks for this brand tier. Reference comparable brands when setting ranges.
2. PRICE ARCHITECTURE — Ensure clear separation between entry, core, and premium price points within each family
3. CHANNEL MATH — If the brand sells wholesale, the retail price must support a 2.5-2.8x markup from wholesale cost. Factor this in.
4. CONSUMER ALIGNMENT — Prices must match the validated consumer profile's purchasing power and price sensitivity
5. MARGIN REALITY — Premium materials and construction methods implied by the collection vibe affect floor prices. Don't suggest luxury construction at fast-fashion prices.

IMPORTANT: These are retail/PVP prices in EUR. Round to clean numbers (€89, €125, €195 — not €87.43).

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Return:
{
  "pricing": [
    {
      "family": "Family Name",
      "subcategories": [
        {
          "name": "Subcategory",
          "minPrice": 0,
          "maxPrice": 0,
          "rationale": "10-20 words: why this range, referencing competitive positioning"
        }
      ]
    }
  ]
}`,
      };

    case 'pricing-proposals':
      return {
        temperature: 0.55,
        system: PERSONAS.merchPlanner,
        user: `${ctx}

The validated product families are:
${input.families}

Generate a complete pricing matrix. The user hasn't given specific direction — use the inherited context (consumer profile, brand DNA, channel strategy, competitive landscape) to determine the optimal price architecture.

PRICING METHODOLOGY:
1. Start from the consumer: what is their "comfortable" price range? What feels aspirational but reachable?
2. Analyze the brand positioning: where does this brand sit between accessible-premium (COS, & Other Stories) and entry-luxury (A.P.C., Sandro)?
3. Build internal logic: there should be a clear price ladder WITHIN each family (entry subcategory → core → premium subcategory)
4. Build cross-family logic: accessories should be accessible entry points, hero categories command premium
5. All prices in EUR, rounded to clean retail numbers

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Return:
{
  "pricing": [
    {
      "family": "Family Name",
      "subcategories": [
        {
          "name": "Subcategory",
          "minPrice": 0,
          "maxPrice": 0,
          "rationale": "10-20 words: pricing logic"
        }
      ]
    }
  ]
}`,
      };

    // ═══════════════════════════════════════════════════
    // CHANNELS & MARKETS
    // ═══════════════════════════════════════════════════

    case 'channels-assisted':
      return {
        temperature: 0.65,
        system: `${PERSONAS.merchPlanner}

You also have deep expertise in fashion distribution strategy — you understand the economics, logistics, and brand implications of each channel model.`,
        user: `${ctx}

The user has given this direction about channels and markets:

"${input.direction}"

CHANNEL ANALYSIS:
For DTC: What infrastructure is needed? (E-commerce platform, fulfillment, customer service, returns)
For Wholesale: What type of wholesale? (Department stores, multi-brand boutiques, showrooms, online wholesale platforms like Joor/NuOrder)
For any custom channels: What's the strategic rationale?

MARKET ANALYSIS:
For each recommended market, provide:
1. WHY this market — specific consumer presence, brand fit, competitive density
2. ENTRY STRATEGY — how would the brand enter? (Online first? Showroom? Agent?)
3. MARKET SIZE signal — is this a "test" market, "growth" market, or "core" market?

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "channels": ["DTC", "Wholesale"],
  "customChannels": [],
  "markets": [
    {
      "name": "Market Name (city or country)",
      "region": "Region",
      "opportunity": "high" or "medium",
      "rationale": "20-35 words: WHY this market for this brand — specific reasons, not generic",
      "entryStrategy": "10-20 words: how to enter"
    }
  ]
}`,
      };

    case 'channels-proposals':
      return {
        temperature: 0.7,
        system: `${PERSONAS.merchPlanner}

You also have deep expertise in fashion distribution strategy and international market entry.`,
        user: `${ctx}

Based on all available context (consumer, brand positioning, pricing, product families), recommend the optimal distribution strategy.

ANALYSIS:
1. Channel mix — DTC/Wholesale/Hybrid? What percentage of revenue from each? Why?
2. Geographic prioritization — Recommend 4-6 markets ordered by opportunity
3. Include at least one "discovery" market that's non-obvious but strategically smart
4. Consider the season: SS collections have different market dynamics than FW

For each market, explain the SPECIFIC opportunity — not "large market" but "growing appetite for Mediterranean-inspired brands in the €150-400 range, underserved by current retail mix."

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "channels": ["DTC", "Wholesale"],
  "customChannels": [],
  "channelRationale": "30-50 words: why this channel mix for this brand",
  "markets": [
    {
      "name": "Market Name",
      "region": "Region",
      "opportunity": "high" or "medium",
      "rationale": "20-35 words: specific opportunity description",
      "entryStrategy": "10-20 words: recommended entry approach"
    }
  ]
}`,
      };

    // ═══════════════════════════════════════════════════
    // BUDGET & FINANCIALS
    // ═══════════════════════════════════════════════════

    case 'budget-assisted':
      return {
        temperature: 0.5,
        system: PERSONAS.financialStrategist,
        user: `${ctx}

Additional validated data from previous cards:
- Product families: ${input.families || 'not yet defined'}
- Pricing ranges: ${input.pricing || 'not yet defined'}
- Channels: ${input.channels || 'not yet defined'}
- Markets: ${input.markets || 'not yet defined'}

The user has given this financial direction:

"${input.direction}"

Build financial targets that are grounded in the collection's actual product architecture and market context.

FINANCIAL METHODOLOGY:
1. SALES TARGET — Derive from: (avg price × estimated units × sell-through rate × number of doors/traffic). Show your math.
2. MARGIN — Reference industry benchmarks: premium fashion DTC 60-70% gross, wholesale 45-55%. Adjust for this brand's actual channel mix and material costs implied by the collection.
3. DISCOUNT — DTC discount strategy varies: full-price sell-through target first, then markdown cadence. Reference industry norms (20-30% of inventory typically discounted in fashion).
4. SELL-THROUGH MONTHS — Standard is 4-6 months for main collection. Consider if there are carryover pieces that extend this.
5. SEGMENTATION — Revenue/Image/Entry split affects margin mix. Newness/Carry-Over split affects development costs.

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Return:
{
  "salesTarget": 0,
  "currency": "EUR",
  "targetMargin": 0,
  "avgDiscount": 0,
  "sellThroughMonths": 0,
  "segmentation": {
    "type": [
      { "name": "Revenue", "percentage": 0 },
      { "name": "Image", "percentage": 0 },
      { "name": "Entry", "percentage": 0 }
    ],
    "newness": [
      { "name": "Newness", "percentage": 0 },
      { "name": "Carry-Over", "percentage": 0 }
    ]
  },
  "rationale": "50-80 words: why these numbers make sense for this specific collection, with key assumptions stated"
}`,
      };

    case 'budget-proposals':
      return {
        temperature: 0.55,
        system: PERSONAS.financialStrategist,
        user: `${ctx}

Validated data from previous cards:
- Product families: ${input.families || 'not yet defined'}
- Pricing ranges: ${input.pricing || 'not yet defined'}
- Channels: ${input.channels || 'not yet defined'}
- Markets: ${input.markets || 'not yet defined'}

Generate a complete financial plan. No user direction — use all available context to build the most realistic financial framework.

METHODOLOGY:
1. Estimate total SKU count from validated families (each subcategory typically produces 3-8 SKUs)
2. Apply the pricing matrix to estimate average selling price
3. Model sell-through based on channel mix (DTC: 60-75% at full price, Wholesale: shipped = sold at wholesale price)
4. Gross margin should reflect the actual material/construction costs implied by the product families and price tier
5. Segmentation should reflect the brand's strategic intent:
   - Emerging brands: 60-70% Revenue, 15-25% Entry, 10-20% Image
   - Established brands: 50-60% Revenue, 10-15% Entry, 25-35% Image
   - First collection: 70%+ Newness (limited carryover possible)

Percentages must sum to 100 within each segmentation dimension.

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Return:
{
  "salesTarget": 0,
  "currency": "EUR",
  "targetMargin": 0,
  "avgDiscount": 0,
  "sellThroughMonths": 0,
  "segmentation": {
    "type": [
      { "name": "Revenue", "percentage": 0 },
      { "name": "Image", "percentage": 0 },
      { "name": "Entry", "percentage": 0 }
    ],
    "newness": [
      { "name": "Newness", "percentage": 0 },
      { "name": "Carry-Over", "percentage": 0 }
    ]
  },
  "rationale": "60-100 words: complete financial thesis — why these numbers, key assumptions, industry benchmarks referenced"
}`,
      };

    default:
      return null;
  }
}
