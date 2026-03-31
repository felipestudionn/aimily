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

    case 'color-suggest':
      return {
        temperature: 0.75,
        system: `${PERSONAS.designConsultant}

You also have specialized knowledge in color theory for fashion — you understand how color works on different materials, how it translates across production processes, and how seasonal palettes evolve. You think in color systems, not individual swatches.`,
        user: `${ctx}

The user needs colorway options for a specific product:
- Product type: ${input.productType || 'not specified'}
- Design direction: ${input.designDirection || 'not specified'}
- Season: ${input.season || 'current season'}

Generate 4 complete colorway options. Each colorway is a COMBINATION of 3 colors that represent the MAIN ZONES of this product (e.g., for footwear: upper, midsole, outsole/accents).

CRITICAL — VISUAL CONTRAST:
• The 3 colors in each colorway MUST be visually distinct from each other. Do NOT propose 3 shades of the same color.
• Minimum contrast: at least one light color and one dark color per colorway. Example: dark navy upper + white midsole + gum outsole.
• Think like a product designer: the color blocking creates the visual identity. Monochrome is boring on a sketch.

COLOR METHODOLOGY:
1. CONTRAST FIRST — Each colorway must have clear light/dark differentiation between zones. Avoid muddy all-dark or all-light palettes.
2. MATERIAL REALITY — Colors look different on leather vs. canvas vs. knit. Specify how each color is achieved on the material.
3. COMMERCIAL GRADIENT — Include a range: one "core" (commercial anchor), one "seasonal" (trend-forward), one "statement" (bold/editorial). Plus one versatile option.
4. SEASONAL LOGIC — Align with the season's light and mood.
5. PRODUCTION FEASIBILITY — Hex codes must translate to achievable, dyeable colors.

Each colorway should have a name that evokes its world — not "Blue/White" but a name that could appear on a product page. Each colorway MUST feel fresh and visually distinct when colorized on a sketch.

${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "colorways": [
    {
      "name": "Colorway Name (2-3 words, evocative — could appear on product page)",
      "colors": ["#hex1", "#hex2", "#hex3"],
      "description": "20-35 words: the color story — why these colors together, what world they evoke, how they work on the material",
      "primary": "#hex_dominant_color",
      "commercialRole": "core" or "seasonal" or "statement"
    }
  ]
}`,
      };

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
