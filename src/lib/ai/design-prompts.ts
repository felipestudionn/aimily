/**
 * Design & Development Block — Prompt Registry
 *
 * 4 prompt types covering:
 * - Sketch direction suggestions
 * - Color/colorway proposals
 * - Material recommendations
 * - Catalog/product descriptions
 *
 * These prompts receive the richest context — everything from Creative
 * and Merchandising blocks flows in, making outputs highly specific.
 */

import { formatPalettesForPrompt } from '@/lib/sanzo-colors';

import {
  PERSONAS,
  QUALITY_GATES,
  OUTPUT_RULES,
  buildInheritedContext,
} from './prompt-foundations';

export interface DesignPrompt {
  system: string;
  user: string;
  temperature: number;
}

type DesignPromptType =
  | 'sketch-suggest'
  | 'color-suggest'
  | 'materials-suggest'
  | 'catalog-description'
  | 'sourcing-suggest';

export function buildDesignPrompt(
  type: DesignPromptType,
  input: Record<string, string>
): DesignPrompt | null {
  const ctx = buildInheritedContext(input);

  switch (type) {
    case 'sketch-suggest':
      return {
        temperature: 0.8,
        system: PERSONAS.designConsultant,
        user: `${ctx}

The user needs design direction for a specific SKU in their collection:
- Product type: ${input.productType || 'not specified'}
- Family: ${input.family || 'not specified'}
- Subcategory: ${input.subcategory || 'not specified'}
- Concept/description: ${input.concept || 'not specified'}
- Target price range: ${input.priceRange || 'not specified'}

Generate 3 sketch direction proposals. Each must be detailed enough for a designer to begin sketching without additional briefing.

FOR EACH DIRECTION, SPECIFY:
1. SILHOUETTE — Overall shape and proportions. Use precise language: "slightly oversized through shoulder, tapers at hem to 2cm above ankle" not just "relaxed fit"
2. KEY DESIGN DETAILS — The 3-4 details that make this design distinctive. Be specific: "asymmetric front zip with exposed metal teeth" not just "zipper detail"
3. CONSTRUCTION — How is it built? Name the technique: "raglan sleeve with topstitched seam" or "cemented sole with Blake-stitched insole"
4. PROPORTIONS — Key measurements or ratios that define the look: "cropped to natural waist" or "elongated 3/4 length hitting mid-thigh"
5. DESIGN TENSION — What makes this interesting? Every good design has a tension between two ideas (structured × fluid, minimal × detailed, heritage × modern)

Consider the price point: a €89 sneaker uses different construction than a €350 boot. Be realistic about what's achievable.

${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "proposals": [
    {
      "title": "Design Direction Name (2-3 words — evocative of the design language)",
      "description": "80-120 words: complete design brief covering silhouette, key details, construction, and design tension",
      "keyFeatures": ["Specific feature 1", "Specific feature 2", "Specific feature 3"],
      "silhouette": "15-25 word silhouette description with proportions"
    }
  ]
}`,
      };

    case 'color-suggest': {
      // Two seeds:
      //   - "manual" : user picked 3 hex anchors → palette must be built around them.
      //   - "wada"   : no user input → fall back to the Sanzo Wada dictionary.
      const seedColorsRaw = (input.manualSeedColors as string | undefined)?.trim() || '';
      const isManualSeed = seedColorsRaw.length > 0;

      // input.zones arrives as a JSON-serialised list (the design-generate API
      // collapses inputs to Record<string, string>). Parse defensively.
      let zonesList: { id?: string; name: string; semanticRole?: string; description?: string }[] = [];
      try {
        const raw = (input.zones as string | undefined) || '';
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) zonesList = parsed;
        }
      } catch { /* zones optional — fall through to instruction-only */ }

      const zonesBlock = zonesList.length
        ? zonesList
            .map((z, i) =>
              `  ${i + 1}. ${z.name}${z.semanticRole ? ` [${z.semanticRole}]` : ''}${
                z.description ? ` — ${z.description}` : ''
              }`,
            )
            .join('\n')
        : '  (no zones provided — return one entry per major part of this product)';

      const seedBlock = isManualSeed
        ? `THE USER HAS LOCKED THESE THREE COLORS AS THE PALETTE FOUNDATION:
${seedColorsRaw}

You MUST build all 4 proposals around these exact hex values. Each proposal uses these 3 colors as anchors — you decide how to distribute them across the zones above (which one becomes the identity, which the structural ground, which the accent), and you may add neutral support colors (white, off-white, black, cream) where the product needs more than 3 distinct zones. Do NOT substitute the anchor hex values; they are non-negotiable. Do NOT pull from Sanzo Wada — the user has already picked the palette.`
        : `THE PALETTE FOUNDATION IS SANZO WADA:

${formatPalettesForPrompt(8)}

Base each of the 4 proposals on a different Wada palette above, adapting hex values for material feasibility while preserving the HARMONY of the original combination.`;

      return {
        temperature: 0.75,
        system: `${PERSONAS.designConsultant}

You are also a master of color harmony, trained in the tradition of Sanzo Wada — Japan's legendary colorist whose "Dictionary of Color Combinations" (1934) remains the definitive reference for color harmony in fashion, art, and design. You understand how color works on different materials, how it translates across production, and how to create combinations that are both commercially viable and aesthetically extraordinary.`,
        user: `${ctx}

The user needs colorway options for a specific product:
- Product type: ${input.productType || 'not specified'}
- Design direction: ${input.designDirection || 'not specified'}
- Season: ${input.season || 'current season'}

PRODUCT ZONES TO COLOR (assign one hex per zone, every zone in every proposal):
${zonesBlock}

${seedBlock}

YOUR TASK: Generate 4 colorway proposals. Each proposal must include a hex value for EVERY zone listed above — do not skip zones, do not collapse them.

MANDATORY RULES:
1. ZONE-BY-ZONE MAPPING — For every zone, return its assigned hex AND a 4–10 word rationale explaining why that color fits that specific zone (e.g. "echoes the upper for monochrome calm", "neutral ground for the bold vamp"). The rationale is what proves you actually thought about each zone.
2. SEMANTIC LOGIC — Respect the role tag on each zone. Identity zones get the dominant color. Structural zones contrast with identity. Accents pop. Neutral zones recede. Hardware reads metallic or matches branding.
3. ${isManualSeed ? 'USER-LOCKED HEX — The 3 anchor colors above must each appear in every proposal. The proposal is a different *distribution* of the same locked palette across zones, not a different palette.' : 'WADA HARMONY — Each proposal pulls from a different Wada palette above. Preserve that palette’s harmony when adapting.'}
4. PRINTABLE ON A SKETCH — Imagine the result colorized on a black-and-white drawing. If three adjacent zones share the same hex the sketch becomes mush. Vary tone across adjacent zones.
5. VISUAL DIVERSITY ACROSS PROPOSALS — The 4 proposals must feel meaningfully different from each other (mood, distribution, contrast). Not 4 variants of the same combo.
6. PRODUCTION FEASIBILITY — Hex codes must translate to real dyeable colors on the implied material.

${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return ONLY valid JSON, no preamble:
{
  "colorways": [
    {
      "name": "Colorway Name (2-3 words, evocative)",
      "description": "20-35 words: the color story — why these colors together, what world they evoke",
      "primary": "#hex_dominant",
      "commercialRole": "core" | "seasonal" | "statement" | "versatile",
      "zoneAssignments": [
        { "zoneName": "exact zone name from list above", "hex": "#XXXXXX", "rationale": "4-10 words why this color on this zone" }
      ]
    }
  ]
}

The "zoneAssignments" array MUST contain one entry per zone listed above, in the same order. No exceptions.`,
      };
    }

    case 'materials-suggest':
      return {
        temperature: 0.6,
        system: PERSONAS.designConsultant,
        user: `${ctx}

The user needs material recommendations for a specific product:
- Product name: ${input.subcategory || 'not specified'}
- Product type / category: ${input.productType || 'not specified'}
- Product family: ${input.family || 'not specified'}
- Price range: ${input.priceRange || 'not specified'}
- Design direction: ${input.designDirection || 'not specified'}
- Colorways selected: ${input.colorways || 'not specified'}
- Additional notes: ${input.concept || ''}

CRITICAL: Your material suggestions must be SPECIFIC to this exact product and its design context. Use the inherited brand DNA, vibe, and collection context above to inform material choices. Do NOT suggest generic fashion materials — suggest materials that make sense for THIS product at THIS price point within THIS collection's world.

Suggest the complete material specification for this product. Think like a product developer preparing a tech pack.

MATERIAL METHODOLOGY:
1. PRICE-QUALITY ALIGNMENT — Materials must be appropriate for the target retail price. A €120 sneaker uses different leather than a €450 boot. Be realistic.
2. TRADE NAMES — Use actual material trade names when possible: "Italian Vitello Crust from Conceria Walpier" not just "leather". "Japanese Cupro twill 100g/m²" not just "lining".
3. SUSTAINABILITY SIGNAL — For each material, note if there's a credible sustainability angle (certified, recycled, biodegradable, local sourcing). Don't force it if there isn't one.
4. TACTILE DESCRIPTION — How does the material FEEL? The hand-feel matters for consumer perception: "dry, papery hand" vs "buttery, supple hand" vs "crisp, structured hand"
5. COMPLETE BOM — Cover all material positions for this product type:
   - Primary (outer material)
   - Secondary (contrasting or accent material)
   - Lining
   - Sole/base (if applicable)
   - Hardware (if applicable)
   - Trim/binding (if applicable)

${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "materials": [
    {
      "name": "Material Name (trade/specific name)",
      "type": "Primary" | "Secondary" | "Lining" | "Sole" | "Hardware" | "Trim",
      "description": "25-40 words: specific qualities, origin if notable, hand-feel, visual appearance",
      "sustainability": "Sustainability note — or empty string if not applicable",
      "priceImpact": "low" | "medium" | "high"
    }
  ]
}`,
      };

    case 'catalog-description':
      return {
        temperature: 0.7,
        system: `${PERSONAS.contentStrategist}

For this task, you are specifically writing PRODUCT CATALOG COPY — the text that appears on a product page, in a lookbook, or in a wholesale line sheet. You write in the brand's voice, not a generic fashion voice. Every word must earn its place.`,
        user: `${ctx}

Write catalog copy for this product:
- Name: ${input.productName || 'not specified'}
- Type: ${input.productType || 'not specified'}
- Materials: ${input.materials || 'not specified'}
- Colors: ${input.colors || 'not specified'}
- Price: ${input.price || 'not specified'}
- Design details: ${input.designDetails || 'not specified'}

COPY GUIDELINES:
1. HEADLINE — Max 8 words. Must create desire, not just describe. "The shoe that ends the search" > "Premium leather derby shoe"
2. SHORT DESCRIPTION — 2-3 sentences that make the reader FEEL something. Connect the product to a moment, not just features. Reference the collection vibe/world.
3. BULLET POINTS — 4 features. Lead with the benefit, then the feature: "All-day comfort from memory-foam insole" not "Memory-foam insole"
4. IMAGE DIRECTION — Brief the photographer: setting, lighting, styling, angle. Specific enough to shoot from.

VOICE: Match the brand DNA. If the brand is minimal, the copy is spare. If the brand is narrative-rich, the copy tells a story.

${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "shortDescription": "One-liner (15-20 words) — creates desire, not just describes",
  "fullDescription": "Full catalog description (60-100 words): connects product to the collection world, then covers materials, design, fit, occasion",
  "bulletPoints": ["Benefit-led feature 1", "Benefit-led feature 2", "Benefit-led feature 3", "Benefit-led feature 4"],
  "imageDirection": "35-50 words: setting, lighting mood, styling approach, camera angle, model direction"
}`,
      };

    case 'sourcing-suggest':
      return {
        temperature: 0.65,
        system: `${PERSONAS.designConsultant}

You are also an expert in fashion supply chain and manufacturing sourcing. You have deep knowledge of global production hubs, factory capabilities, trade shows, and minimum order requirements across all fashion product categories.`,
        user: `${ctx}

The user needs sourcing recommendations for producing a specific product:
- Product type: ${input.productType || 'not specified'}
- Family: ${input.family || 'not specified'}
- Materials: ${input.materials || 'not specified'}
- Target COGS: ${input.targetCogs || 'not specified'}
- Target PVP: ${input.targetPvp || 'not specified'}
- Estimated units: ${input.units || 'not specified'}
- Quality level: ${input.qualityLevel || 'mid-to-premium'}

Generate a comprehensive sourcing recommendation:

1. FACTORY TYPE — What kind of factory is ideal? (artisan workshop, semi-industrial, full industrial, vertical manufacturer). Be specific about capabilities needed.

2. RECOMMENDED REGIONS — 3-4 production regions ranked by fit. For each:
   - Country/region name
   - Why it fits (specialization, price point, quality, lead times)
   - Typical MOQs (minimum order quantities) for this product type
   - Approximate lead times (proto + production)
   - Price range for COGS

3. TRADE SHOWS — 2-3 relevant trade shows where the user can find suppliers:
   - Show name + location + typical dates
   - What to look for there
   - Whether it's for discovery, sourcing, or both

4. SOURCING TIPS — 3-4 practical tips specific to this product:
   - What to ask for in a first meeting
   - Red flags to watch
   - How to evaluate quality from a first sample
   - Typical payment terms in this segment

${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "factoryType": {
    "recommended": "Factory type name",
    "description": "30-50 words: why this type, what capabilities to look for",
    "capabilities": ["Capability 1", "Capability 2", "Capability 3"]
  },
  "regions": [
    {
      "name": "Country/Region",
      "fit": "Why it fits (20-30 words)",
      "moq": "Typical MOQ range",
      "leadTime": "Proto + production timeline",
      "cogsRange": "€XX-€XX per unit"
    }
  ],
  "tradeShows": [
    {
      "name": "Show Name",
      "location": "City, Country",
      "dates": "Typical month/period",
      "focus": "What to look for (15-20 words)"
    }
  ],
  "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"]
}`,
      };

    default:
      return null;
  }
}
