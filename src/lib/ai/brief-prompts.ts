/**
 * Brief-to-Collection Prompts
 *
 * The intelligence behind "Tell me your idea" — a conversational flow that
 * turns a rough brief into a complete collection proposal.
 *
 * Philosophy: Aimily listens like a senior creative director in a café.
 * The user can say anything, in any order, in any language.
 * Aimily's job is to organize, research, infer, and only ask what she truly can't figure out.
 *
 * Priority order for filling information:
 * 1. Extract from what the user said (even if messy/indirect)
 * 2. Research via Perplexity (market data, competitor pricing, trends)
 * 3. Infer from industry knowledge (lead times, margin norms, collection sizes)
 * 4. Ask the user (ONLY what can't be solved by 1-3, max 3-5 questions)
 */

import { PERSONAS, QUALITY_GATES, OUTPUT_RULES, seasonContext } from './prompt-foundations';

// ─── Collection Knowledge Map ───
// Everything Aimily needs to build a complete collection.
// Used to detect gaps in the user's brief.

const COLLECTION_KNOWLEDGE_MAP = `
You have an internal checklist of what you need to create a complete fashion collection.
When analyzing a brief, mentally check each area:

BRAND & IDENTITY
- Brand name (existing or needs creation?)
- Visual direction / aesthetic references
- Emotional territory (what feelings should the brand evoke?)
- Brand tier (luxury / premium / accessible premium / mass market)

PRODUCT
- Product category (footwear, apparel, accessories, multi-category)
- Style/silhouette direction
- Key materials or construction methods
- Production origin

MARKET & CONSUMER
- Target consumer (gender, age range, lifestyle, psychographic)
- Price positioning (exact range or relative to known brands)
- Geographic markets (primary + expansion)
- Sales channels (DTC e-commerce, own retail, wholesale, marketplace)

BUSINESS
- Season / target launch date
- Ambition level (test launch, full launch, scale)
- Collection size (number of models/SKUs)
- Budget range (if known)
- First collection or existing brand?

IMPORTANT RULES FOR GAP DETECTION:
- If the user says "below Zara" → you KNOW the price tier, approximate range, and consumer segment. Don't ask.
- If they mention a production country → you can infer lead times and minimum orders. Don't ask.
- If they say "no brand identity" → you know you need to propose naming and visual direction. Don't ask.
- If they reference a trend (e.g., "Miu Miu ballet flats") → you understand the aesthetic universe. Don't ask.
- ONLY ask what you truly cannot extract, research, or infer.
`;

// ─── Step 1: Analyze Brief ───

export function buildAnalyzePrompt(brief: string, language: string) {
  const system = `${PERSONAS.creativeDirector}

You are also an expert business strategist. A potential client has just described their fashion project idea to you.
Your job is to:

1. LISTEN carefully — extract every piece of useful information, even if stated indirectly or messily.
2. ORGANIZE what you understood into structured categories.
3. INFER what you can from industry knowledge (don't ask what you can deduce).
4. IDENTIFY what's truly missing that only the user can answer.

${COLLECTION_KNOWLEDGE_MAP}

INFERENCE EXAMPLES:
- "Below Zara pricing" → Price range approximately €15-35 depending on category. Mass market positioning. High volume production. Digital-first distribution likely.
- "Made in China" → Production lead time 90-120 days. MOQs typically 300-500 units per style. Cost advantage enables lower price points.
- "Miu Miu ballet flat trend" → Aware of the luxury-to-mass democratization of ballet/hybrid silhouettes. SS24-SS26 macro trend. Flat sole, feminine but sporty construction.
- "No brand identity" → Full brand creation needed: naming, visual identity, tone of voice, packaging. This is an opportunity, not a problem.
- "Spain and Europe" → Primary market Spain (test), expansion to France/Italy/Germany/UK. EU regulations apply. Sizing: EU standard.

QUESTION STRATEGY:
- Ask MAXIMUM 5 questions, ideally 3-4.
- NEVER ask what you can infer or research.
- Frame questions as choices when possible (easier for user to answer).
- If something is ambiguous but not critical, note it as an assumption you'll make.
- Group related unknowns into single questions.

${OUTPUT_RULES}

Respond in ${language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : language === 'it' ? 'Italian' : language === 'de' ? 'German' : language === 'pt' ? 'Portuguese' : language === 'nl' ? 'Dutch' : language === 'sv' ? 'Swedish' : language === 'no' ? 'Norwegian' : 'English'}.`;

  const user = `Here is the client's brief (they may have written it casually, in any language, in any order):

"""
${brief}
"""

Analyze this brief and return JSON with this exact schema:
{
  "understood": {
    "productType": "string — what they want to create",
    "styleDirection": "string — aesthetic/silhouette direction you extracted",
    "brandStatus": "string — existing brand or starting from zero",
    "pricePositioning": "string — what you inferred about price tier",
    "estimatedPriceRange": { "min": number, "max": number, "currency": "EUR" },
    "production": "string — production origin if mentioned",
    "markets": ["string — target markets"],
    "channels": ["string — sales channels mentioned or inferred"],
    "consumer": "string — target consumer description (inferred if not explicit)",
    "season": "string or null — target season if mentioned",
    "ambition": "string — what scale/ambition you detect",
    "aestheticReferences": ["string — brands, trends, cultural references mentioned"],
    "additionalContext": ["string — any other useful info extracted"]
  },
  "assumptions": [
    {
      "assumption": "string — what you're assuming",
      "basis": "string — why this assumption is reasonable"
    }
  ],
  "questions": [
    {
      "id": "string — unique id like q1, q2",
      "question": "string — the question, written conversationally",
      "why": "string — brief explanation of why you need this (helps user understand)",
      "type": "text | choice",
      "options": ["string — only if type is choice, 2-4 options"],
      "priority": "essential | helpful"
    }
  ],
  "researchNeeded": [
    "string — topics Perplexity should investigate before proposing scenarios"
  ]
}`;

  return { system, user };
}

// ─── Step 2: Generate Scenarios (after research + answers) ───

export function buildScenariosPrompt(
  understood: Record<string, unknown>,
  answers: Record<string, string>,
  marketResearch: string,
  language: string
) {
  const system = `${PERSONAS.merchPlanner}

You also have the strategic vision of a brand architect. A client has briefed you on a new fashion project.
You've researched the market and now need to propose 3 scenarios for their collection.

Each scenario should be a complete, coherent proposal — not just numbers, but a strategic narrative.

SCENARIO GUIDELINES:
- "Conservative": Minimum viable collection. Lower risk, faster to market, smaller investment. Test the concept.
- "Balanced": Solid first collection. Enough variety to tell a brand story. Moderate investment.
- "Ambitious": Full statement collection. Maximum impact, higher investment, bigger bet.

For each scenario, provide:
- Exact SKU count with family breakdown (e.g., "8 ballet flats + 4 sport sandals + 3 slip-ons = 15 SKUs")
- Price architecture with specific price points per family (not ranges — exact target retail prices)
- Production budget estimate (based on typical MOQs and production costs for the origin country)
- Marketing budget range (as % of projected revenue — industry standard 15-25% for launch year)
- First-year sales target (conservative, based on comparable brand launches)
- Rationale: WHY this scenario makes sense, referencing the market research

${QUALITY_GATES.merchSpecificity}
${OUTPUT_RULES}

Respond in ${language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : language === 'it' ? 'Italian' : language === 'de' ? 'German' : language === 'pt' ? 'Portuguese' : language === 'nl' ? 'Dutch' : language === 'sv' ? 'Swedish' : language === 'no' ? 'Norwegian' : 'English'}.`;

  const user = `PROJECT CONTEXT:
${JSON.stringify(understood, null, 2)}

CLIENT ANSWERS TO FOLLOW-UP QUESTIONS:
${Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join('\n')}

MARKET RESEARCH (from Perplexity — real, current data):
${marketResearch}

Based on all this information, propose 3 scenarios. Return JSON:
{
  "marketInsights": {
    "competitorLandscape": "string — key competitors and their positioning",
    "priceBenchmarks": "string — real prices found for comparable products",
    "trendContext": "string — relevant trend data from research",
    "marketOpportunity": "string — the whitespace/opportunity you see"
  },
  "scenarios": [
    {
      "id": "conservative | balanced | ambitious",
      "name": "string — a catchy scenario name",
      "description": "string — 2-3 sentence strategic narrative",
      "skuCount": number,
      "families": [
        { "name": "string", "count": number, "description": "string — style direction" }
      ],
      "priceArchitecture": {
        "min": number,
        "max": number,
        "avg": number,
        "pricePoints": [
          { "family": "string", "retail": number, "cogs": number, "margin": number }
        ]
      },
      "financials": {
        "productionBudget": number,
        "marketingBudget": number,
        "totalInvestment": number,
        "firstYearSalesTarget": number,
        "breakEvenUnits": number
      },
      "timeline": "string — key milestones from now to launch",
      "risks": ["string — 1-2 key risks for this scenario"],
      "bestFor": "string — what type of founder/situation this scenario suits"
    }
  ],
  "recommendation": "string — which scenario you'd recommend and why"
}`;

  return { system, user };
}

// ─── Step 3: Generate Full Collection ───

export function buildGeneratePrompt(
  understood: Record<string, unknown>,
  answers: Record<string, string>,
  scenario: Record<string, unknown>,
  marketResearch: string,
  language: string
) {
  const system = `${PERSONAS.creativeDirector}

You are leading the creation of a complete fashion collection from scratch. The client has approved a specific scenario.
Your job is to generate ALL the data needed to populate the collection management system.

You need to produce:

1. BRAND DIRECTION (if brand is new):
   - Brand name suggestions (3 options)
   - Visual identity direction (colors, typography mood, photography style)
   - Brand voice (tone, vocabulary, do's and don'ts)
   - Target consumer profile (detailed psychographic)

2. COLLECTION CREATIVE:
   - Collection vibe / creative concept
   - Color palette (hex codes)
   - Key material directions
   - Trend alignment

3. MERCHANDISING:
   - Product families with subcategories
   - Price matrix (retail, COGS, margin per family)
   - Channel strategy
   - Budget allocation

4. SKUs:
   - Each individual product with: name, family, category, price (PVP), cost (COGS),
     units, margin, discount, channel, type (REVENUE/IMAGE/ENTRY), drop number, novelty

CRITICAL: Your output will directly populate a database. Every field must match the exact schema.
Names should be creative, specific, and commercially viable — NOT generic ("Model A", "Style 1").
Each SKU name should evoke the product's character (e.g., "Portofino Slip-On", "Riviera Ballet Flat").

${QUALITY_GATES.creativeSpecificity}
${QUALITY_GATES.merchSpecificity}
${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Respond in ${language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : language === 'it' ? 'Italian' : language === 'de' ? 'German' : language === 'pt' ? 'Portuguese' : language === 'nl' ? 'Dutch' : language === 'sv' ? 'Swedish' : language === 'no' ? 'Norwegian' : 'English'}.`;

  const user = `PROJECT:
${JSON.stringify(understood, null, 2)}

CLIENT DECISIONS:
${Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join('\n')}

APPROVED SCENARIO:
${JSON.stringify(scenario, null, 2)}

MARKET RESEARCH:
${marketResearch}

Generate the complete collection. Return JSON:
{
  "brand": {
    "nameOptions": [
      { "name": "string", "rationale": "string — why this name works" }
    ],
    "visualDirection": {
      "primaryColor": "string — hex",
      "secondaryColor": "string — hex",
      "accentColor": "string — hex",
      "typographyMood": "string — description of type direction",
      "photographyStyle": "string — visual language for shoots"
    },
    "voice": {
      "tone": "string",
      "personality": "string",
      "keywords": ["string — signature vocabulary"],
      "doNot": ["string — what the brand never says/does"]
    },
    "consumerProfile": {
      "demographics": "string",
      "psychographics": "string",
      "lifestyle": "string",
      "shopsAt": ["string — brands/retailers they buy from"],
      "mediaConsumption": ["string — specific accounts, publications, platforms"]
    }
  },
  "creative": {
    "collectionVibe": "string — the overarching creative concept",
    "colorPalette": [
      { "name": "string — evocative name", "hex": "string", "role": "string — primary/accent/neutral" }
    ],
    "materialDirections": ["string — key material stories"],
    "trendAlignment": ["string — which trends this collection taps into"]
  },
  "merchandising": {
    "families": [
      {
        "name": "string",
        "subcategories": [{ "name": "string", "description": "string" }],
        "skuCount": number,
        "priceRange": { "min": number, "max": number },
        "marginTarget": number
      }
    ],
    "channels": {
      "dtc": boolean,
      "wholesale": boolean,
      "marketplace": boolean,
      "details": "string — channel strategy description"
    },
    "budget": {
      "totalSalesTarget": number,
      "avgPrice": number,
      "targetMargin": number,
      "totalUnits": number
    }
  },
  "skus": [
    {
      "name": "string — creative product name",
      "family": "string — must match a family above",
      "subcategory": "string",
      "category": "string — product category (CALZADO, ROPA, etc.)",
      "pvp": number,
      "cost": number,
      "margin": number,
      "buy_units": number,
      "discount": 0,
      "sale_percentage": 85,
      "channel": "string — DTC / Wholesale / Both",
      "type": "REVENUE | IMAGEN | ENTRY",
      "drop_number": number,
      "novelty": "NEW",
      "notes": "string — brief design direction for this specific product"
    }
  ]
}`;

  return { system, user };
}

// ─── Perplexity Research Query Builder ───

export function buildResearchQueries(
  understood: Record<string, unknown>,
  answers: Record<string, string>,
  researchTopics: string[]
): string[] {
  const queries: string[] = [];

  // Always research competitor pricing
  const productType = (understood as Record<string, string>).productType || 'fashion';
  const pricePos = (understood as Record<string, string>).pricePositioning || '';
  const markets = (understood as Record<string, string[]>).markets || [];
  const refs = (understood as Record<string, string[]>).aestheticReferences || [];

  // Core query: competitor pricing and market
  queries.push(
    `${productType} pricing ${pricePos} ${markets[0] || 'Europe'} 2025 2026 retail price comparison brands`
  );

  // Trend query if aesthetic references exist
  if (refs.length > 0) {
    queries.push(
      `${refs.join(' ')} trend 2025 2026 fashion market ${productType} collection size`
    );
  }

  // Launch benchmarks
  queries.push(
    `new ${productType} brand launch first year collection size Europe revenue benchmark`
  );

  // Add any AI-identified research topics
  for (const topic of researchTopics.slice(0, 2)) {
    queries.push(topic);
  }

  return queries.slice(0, 4); // Max 4 Perplexity queries
}
