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
  | 'budget-proposals'
  | 'financial-plan-narrative';

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

HARD LIMIT: Maximum 5 families.

CRITICAL — TWO LEVELS OF SPECIFICITY:
- FAMILY = broad product category. SHORT names: "Sneakers", "Sandals", "Knitwear", "Bags"
- SUBCATEGORY = specific type within the family: "Low-top Runner", "Slip-on", "Oxford", "Tote"
WRONG: Family "Split-Toe & Asymmetrical Sneakers" — too specific. RIGHT: Family "Sneakers".

Each family needs 3-5 subcategories. Respect the PRODUCT CATEGORY from context.

MANDATORY PRICING: For each subcategory, suggest minPrice/maxPrice in EUR.
Use EXISTING PRICE DATA from context as anchor. Do NOT invent premium prices.

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return EXACTLY this JSON:
{
  "families": [
    {
      "name": "Sneakers",
      "subcategories": ["Low-top Runner", "Slip-on", "High-top"],
      "pricing": [
        { "name": "Low-top Runner", "minPrice": 29, "maxPrice": 39 },
        { "name": "Slip-on", "minPrice": 25, "maxPrice": 35 }
      ],
      "priority": "core",
      "rationale": "15-25 words explaining why"
    }
  ]
}

Priority: "core" (revenue), "strategic" (identity), "complementary" (completes offering).`,
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
Suggest a structured product family hierarchy — exactly as if a senior merchandiser had briefed you.

HARD LIMIT: Maximum 5 families.

CRITICAL — TWO LEVELS OF SPECIFICITY:
- FAMILY = broad product category. SHORT, SIMPLE names. Examples:
  Footwear: "Sneakers", "Sandals", "Loafers", "Ballet Flats", "Boots"
  Apparel: "Shirts", "Trousers", "Knitwear", "Outerwear", "Dresses"
  Accessories: "Bags", "Belts", "Scarves", "Jewelry", "Hats"

- SUBCATEGORY = specific product type WITHIN the family. More descriptive. Examples:
  Sneakers → "Low-top Runner", "Slip-on", "High-top", "Chunky Platform"
  Shirts → "Oxford", "Camp Collar", "Overshirt", "Poplin"
  Bags → "Structured Tote", "Crossbody", "Clutch", "Backpack"

WRONG: Family "Split-Toe & Asymmetrical Sneakers" — that's a subcategory, not a family.
WRONG: Family "Minimalist Second-Skin Sneakers" — way too specific for a family.
RIGHT: Family "Sneakers" with subcategory "Split-Toe Low-Top".

Each family needs 3-5 subcategories. Respect the PRODUCT CATEGORY from context.

STEP 3 — PRICE EACH SUBCATEGORY (MANDATORY):
For each subcategory, suggest a retail price range (minPrice, maxPrice in EUR).
CRITICAL: Use the EXISTING PRICE DATA from context as your anchor. If the context shows existing SKUs at €25-€39, your prices MUST be in that range. Do NOT invent premium prices — match the brand's actual positioning.
The "pricing" array MUST have one entry per subcategory.

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return EXACTLY this JSON structure:
{
  "families": [
    {
      "name": "Sneakers",
      "subcategories": ["Low-top Runner", "Slip-on", "High-top"],
      "pricing": [
        { "name": "Low-top Runner", "minPrice": 29, "maxPrice": 39 },
        { "name": "Slip-on", "minPrice": 25, "maxPrice": 35 },
        { "name": "High-top", "minPrice": 35, "maxPrice": 45 }
      ],
      "priority": "core",
      "rationale": "15-25 words explaining why"
    }
  ]
}

Priority: "core" (highest revenue), "strategic" (brand identity), "complementary" (completes offering).
Order families from highest to lowest priority.`,
      };

    // ═══════════════════════════════════════════════════
    // PRICING
    // ═══════════════════════════════════════════════════

    case 'pricing-assisted': {
      const pricingResearchBlock = input.pricingResearch
        ? `\n── REAL PRICING DATA FROM REFERENCE BRANDS (researched from web) ──\n${input.pricingResearch}\n── END PRICING RESEARCH ──\n\nUSE THIS DATA: The pricing research above contains REAL retail prices from the reference brands. Your pricing recommendations MUST be informed by these real benchmarks. Position the collection's prices relative to these references based on the user's direction.\n`
        : '';

      return {
        temperature: 0.5,
        system: PERSONAS.merchPlanner,
        user: `${ctx}

The validated product families are:
${input.families}

The user has given this pricing direction:

"${input.direction}"
${input.referenceBrands ? `\nReference brands for pricing benchmarking: ${input.referenceBrands}` : ''}
${pricingResearchBlock}
Assign min/max price ranges (EUR) for each family and subcategory.

PRICING METHODOLOGY:
1. COMPETITIVE BENCHMARKING — ${input.pricingResearch ? 'Use the REAL pricing data above from the reference brands. Position prices relative to these real benchmarks.' : 'Base prices on real European market benchmarks for this brand tier. Reference comparable brands when setting ranges.'}
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
    }

    case 'pricing-proposals':
      return {
        temperature: 0.55,
        system: PERSONAS.merchPlanner,
        user: `${ctx}

The validated product families are:
${input.families}

Generate a complete pricing matrix. The user hasn't given specific direction — you must deduce the optimal price architecture entirely from the inherited context.

STEP 1 — SYNTHESIZE A PRICING THESIS (include this in your response as "pricingThesis"):
Before generating ANY prices, analyze all available data and write a clear positioning statement:
a) List the SPECIFIC competitor price ranges mentioned in the competitive landscape above. Calculate the average price range across all selected competitors.
b) Cross-reference with consumer basket sizes from the consumer profiles. What's the weighted average basket?
c) Determine WHERE this collection sits relative to the competitors. Between which two brands? Closer to which one?
d) State the target ASP (Average Selling Price) range in one sentence. Example: "Positioning between Aimé Leon Dore (€200-700) and Ralph Lauren premium (€150-800), targeting ASP €180-450 per piece."

STEP 2 — GENERATE PRICES ANCHORED TO THE THESIS:
Every price must be consistent with the thesis from Step 1. If your thesis says ASP €180-450, no core item should be priced at €89.

PRICING RULES:
1. COMPETITIVE ANCHORING — For each subcategory, reference the SPECIFIC competitor whose pricing you're benchmarking against. If competitors sell shirts at €150-€400, your shirts should be in that range, not €89-€129.
2. PRICE ARCHITECTURE — Clear ladder within each family: entry → core → premium subcategory
3. CROSS-FAMILY LOGIC — Accessories as accessible entry points, hero categories command premium
4. CONSUMER ALIGNMENT — Prices within the consumer basket range. If basket is €220-420, individual items should make sense within that spend.
5. All prices in EUR, rounded to clean retail numbers

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Return:
{
  "pricingThesis": "2-3 sentences: your positioning analysis — which competitors you're benchmarking against, the target price range, and why. Include specific price references from the competitive data.",
  "pricing": [
    {
      "family": "Family Name",
      "subcategories": [
        {
          "name": "Subcategory",
          "minPrice": 0,
          "maxPrice": 0,
          "rationale": "10-20 words: vs [Competitor] at €X — positioned [above/below/at parity] because [reason]"
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

The user has selected these distribution channels: ${input.channelConfig || 'Not specified'}

The user has given this direction about markets:

"${input.direction}"

CRITICAL CHANNEL FILTERING RULES:
- If the user selected "Digital" only (no Physical): Do NOT recommend flagships, pop-ups, showrooms, or physical retail. Focus on e-commerce platforms, online marketplaces, social commerce, digital wholesale (Joor, NuOrder, FAIRE).
- If the user selected "Physical" only (no Digital): Do NOT recommend e-commerce or online marketplaces. Focus on retail stores, showrooms, department stores, multi-brand boutiques.
- If BOTH Digital + Physical: Recommend a mix of both, but specify which markets are better for digital-first vs physical-first entry.

MARKET ANALYSIS:
For each recommended market, provide:
1. WHY this market — specific consumer presence, brand fit, competitive density
2. ENTRY STRATEGY — must be consistent with the channel selection above (digital-only = online entry, physical-only = retail entry, both = specify)
3. MARKET SIZE signal — is this a "test" market, "growth" market, or "core" market?

Recommend 4-6 markets ordered by opportunity.

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "markets": [
    {
      "name": "Market Name (city or country)",
      "region": "Region",
      "opportunity": "high" or "medium",
      "rationale": "20-35 words: WHY this market for this brand — specific reasons, not generic",
      "entryPoints": [
        {
          "label": "Channel type label (e.g. DTC E-commerce, Wholesale Digital, Key Accounts, Flagship, Showroom, Pop-Up, Multi-brand Boutiques)",
          "detail": "10-20 words: specific recommendation — name actual platforms, retailers, neighborhoods, or strategies"
        }
      ]
    }
  ]
}

ENTRY POINTS RULES:
- Each market should have 2-4 entry points, matching the user's channel config
- Labels must be specific channel types: "DTC E-commerce", "Social Commerce", "Wholesale Digital (Joor/NuOrder)", "Key Accounts", "Multi-brand Boutiques", "Department Stores", "Flagship Store", "Showroom", "Pop-Up"
- Details must name SPECIFIC retailers, platforms, neighborhoods, or strategies — not generic advice
- If Digital only: entry points should be "DTC E-commerce", "Social Commerce", "Online Wholesale" etc.
- If Physical only: entry points should be "Key Accounts", "Flagship", "Showroom", "Multi-brand Boutiques" etc.
- If both: mix of digital and physical entry points`,
      };

    case 'channels-proposals':
      return {
        temperature: 0.7,
        system: `${PERSONAS.merchPlanner}

You also have deep expertise in fashion distribution strategy and international market entry.`,
        user: `${ctx}

The user has selected these distribution channels: ${input.channelConfig || 'Not specified'}

Based on all available context (consumer, brand positioning, pricing, product families) and the channel configuration above, recommend target markets.

CRITICAL CHANNEL FILTERING RULES:
- If "Digital" only: No flagships, no physical retail, no showrooms. E-commerce, online wholesale, social commerce only.
- If "Physical" only: No e-commerce recommendations. Retail stores, showrooms, department stores, boutiques.
- If both: Specify per market whether digital-first or physical-first entry makes more sense.

ANALYSIS:
1. Geographic prioritization — Recommend 4-6 markets ordered by opportunity
2. Include at least one "discovery" market that's non-obvious but strategically smart
3. Consider the season: SS collections have different market dynamics than FW
4. Entry strategies MUST match the channel config

For each market, explain the SPECIFIC opportunity — not "large market" but "growing appetite for Mediterranean-inspired brands in the €150-400 range, underserved by current retail mix."

${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "markets": [
    {
      "name": "Market Name",
      "region": "Region",
      "opportunity": "high" or "medium",
      "rationale": "20-35 words: specific opportunity description",
      "entryPoints": [
        {
          "label": "Channel type (DTC E-commerce, Key Accounts, Showroom, etc.)",
          "detail": "10-20 words: specific recommendation with named platforms/retailers/neighborhoods"
        }
      ]
    }
  ]
}

ENTRY POINTS: 2-4 per market, matching user's channel config. Labels = specific channel types. Details = name actual retailers, platforms, neighborhoods.`,
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

STEP 1 — ANALYZE GROWTH MODELS:
Consider these 10 real fashion growth models and determine which ONE best fits this specific brand based on the creative brief, channel config, pricing tier, and market selection:

1. DTC-First Bootstrap (ref: Axel Arigato) — €100K-300K Y1, 80%+ DTC, 65% margin, drop model
2. Wholesale-Led Launch (ref: Jacquemus early) — €200K-500K Y1, 60%+ wholesale, 50% margin, showroom-driven
3. Community-Driven (ref: Holzweiler/Ganni) — €150K-400K Y1, 50/50 mix, 60% margin, event marketing
4. Quiet Luxury (ref: COS/The Row) — €300K-800K Y1, controlled distribution, 70% margin
5. Collab & Hype Engine (ref: Aimé Leon Dore) — €200K-600K Y1, DTC + collabs, 60% margin
6. Digital Native Scale (ref: Pangaia/Reformation) — €150K-500K Y1, 90%+ digital, 65% margin
7. Accessible Premium (ref: Sandro/Maje) — €400K-1M Y1, omnichannel, 55% margin
8. Artisan Craft Story (ref: HEREU/Loewe Craft) — €80K-250K Y1, selective, 70% margin
9. Marketplace Accelerator (ref: SSENSE/Farfetch) — €100K-400K Y1, 70%+ marketplace, 45% margin
10. Investor-Backed Blitz (ref: Holzweiler+Sequoia) — €500K-2M Y1, aggressive, 55% margin

STEP 2 — SELECT AND JUSTIFY:
Pick the model that best matches the data. Explain:
- WHY this model fits (reference specific elements: brand DNA, consumer profiles, channel config, pricing tier)
- RISKS of this model (2-3 specific risks)
- ADVANTAGES of this model (2-3 specific advantages)
- Any FINE-TUNING needed to adapt the model to this specific brand

STEP 3 — GENERATE FINANCIAL PLAN:
Build the numbers based on the selected model, fine-tuned to this brand's actual data.

Percentages must sum to 100 within each segmentation dimension.

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Return:
{
  "selectedModel": "Model name (e.g. 'Artisan Craft Story')",
  "selectedModelRef": "Reference brand (e.g. 'HEREU / Loewe Craft')",
  "whyThisModel": "30-50 words: why this model is the best fit for this specific brand — reference elements from the brief",
  "risks": ["Risk 1 (15-20 words)", "Risk 2", "Risk 3"],
  "advantages": ["Advantage 1 (15-20 words)", "Advantage 2", "Advantage 3"],
  "fineTuning": "20-40 words: what adjustments were made to adapt the model to this brand",
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
  "rationale": "60-100 words: complete financial thesis — the numbers, key assumptions, and how they connect to the selected growth model"
}`,
      };

    // ═══════════════════════════════════════════════════
    // FINANCIAL PLAN NARRATIVE
    // ═══════════════════════════════════════════════════
    // Numbers are already computed by computeFinancialPlan().
    // This prompt writes the investor-facing story that wraps them.
    // Used by the Presentation deck as the 'financial-plan' slide.

    case 'financial-plan-narrative':
      return {
        temperature: 0.5,
        system: PERSONAS.financialStrategist,
        user: `${ctx}

Numbers (pre-computed, do NOT invent or alter):
- Buying-strategy scenario: ${input.scenarioName || 'unspecified'}
- Total investment: €${Number(input.totalInvestment).toLocaleString('en-US')}
- Expected revenue: €${Number(input.expectedRevenue).toLocaleString('en-US')}
- Gross margin: ${input.grossMarginPct}%
- ROI: ${input.roi}%
- Payback: ${input.paybackMonths} months
- Full-price sell-through assumption: ${input.fullPriceSellThrough}%
- Revenue scenario committed: ${input.selectedScenario}
- Marketing: ${input.marketingStatus === 'pending'
  ? `PENDING — numbers assume €${Number(input.marketingAssumed).toLocaleString('en-US')} (placeholder until investment decision)`
  : `committed at €${Number(input.marketingAssumed).toLocaleString('en-US')}`}

Write a pre-business-plan narrative that a founder would put in front of an investor,
a brand partner, or a buying committee. This is the Financial Plan slide of the
presentation deck — it has to sound like an investment memo, not a spreadsheet summary.

RULES:
1. NEVER invent numbers. You may only reference the numbers above. Do not introduce
   new financial figures, channel splits, or assumptions.
2. The narrative has to be GROUNDED in this specific brand: reference the consumer,
   the vibe, the season, and the scenario name where natural.
3. If marketing is PENDING, the narrative must acknowledge it explicitly and explain
   that contribution margin assumes a placeholder. Include a "marketingNote" field.
4. If marketing is SET, no marketingNote — the narrative speaks as if locked.
5. Tone: senior, confident, crisp. No clichés ("we believe", "unlock", "unprecedented",
   "game-changing"). No emojis. No marketing-speak.

${OUTPUT_RULES}

Return EXACTLY this JSON:
{
  "headline": "One 10-14 word line that pairs investment with outcome. E.g. '€120K investment returns €340K at 58% gross margin, payback in 6 months'",
  "thesis": "60-90 words. The business story. What is being built, why the numbers hold, what the collection's position is. Reference the scenario name and the consumer/vibe from context.",
  "assumptions": [
    "Assumption 1 (15-25 words — sell-through, pricing tier, channel mix, something specific)",
    "Assumption 2",
    "Assumption 3"
  ],
  "risks": [
    "Risk 1 (15-25 words — what would break the plan)",
    "Risk 2"
  ]${input.marketingStatus === 'pending' ? `,
  "marketingNote": "20-35 words explaining that marketing is pending and what the placeholder assumes. No speculation on what the real number should be."` : ''}
}`,
      };

    default:
      return null;
  }
}
