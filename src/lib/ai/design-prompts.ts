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
  | 'catalog-description';

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

Generate 4-5 complete colorway options. Each colorway is a COMBINATION of 2-4 colors that work together on this specific product.

COLOR METHODOLOGY:
1. MATERIAL REALITY — Colors look different on leather vs. canvas vs. knit vs. nylon. Specify how each color should be achieved on the actual material.
2. COMMERCIAL GRADIENT — Include a range from "safest commercial" (the black/navy that sells 40% of units) to "boldest seasonal" (the color that gets press/social attention but sells fewer units)
3. SEASONAL LOGIC — Colors must align with the season's light: SS palettes read differently than FW palettes
4. BRAND COHERENCE — If brand DNA includes a color system, colorways should feel like they belong to the same brand
5. PRODUCTION FEASIBILITY — Specify hex codes that translate to real dyeable/achievable colors. No impossible neons on natural fibers.

Each colorway should have a name that evokes its world — not "Blue/White" but a name that could appear on a product page.

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
- Product type: ${input.productType || 'not specified'}
- Subcategory: ${input.subcategory || 'not specified'}
- Price range: ${input.priceRange || 'not specified'}
- Design direction: ${input.designDirection || 'not specified'}

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

    default:
      return null;
  }
}
