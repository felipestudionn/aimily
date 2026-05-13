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
  | 'color-rename'
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

      // Parse the brand palette emitted by loadFullContext. This is the
      // canonical SOURCE for every proposal — Sanzo Wada is only a harmony
      // helper, never the lead voice. Falls back to Wada-only when no brand
      // palette has been confirmed yet.
      type BrandColor = { hex: string; name?: string; role?: string; rationale?: string };
      let brandPalette: BrandColor[] = [];
      try {
        const raw = (input.brandPalette as string | undefined) || '';
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) brandPalette = parsed;
        }
      } catch { /* fall through */ }

      const brandPaletteBlock = brandPalette.length
        ? brandPalette
            .map((c, i) =>
              `  ${i + 1}. ${c.name || 'Color'} — ${c.hex}${c.role ? ` (${c.role})` : ''}${c.rationale ? `\n     ${c.rationale}` : ''}`
            )
            .join('\n')
        : '';

      /* Reference photo palette — injected by /api/ai/design-generate when
       * the SKU has a reference_image_url. Felipe's rule (2026-05-13):
       * proposal #1 always reads back the colors of the reference photo.
       * The remaining 3 proposals still follow brand/Wada logic so the
       * collection stays anchored in the confirmed brand palette. */
      type RefColor = { hex: string; share?: number };
      let referencePalette: RefColor[] = [];
      try {
        const raw = (input.referencePalette as string | undefined) || '';
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) referencePalette = parsed;
        }
      } catch { /* fall through */ }

      const referencePaletteBlock = referencePalette.length
        ? `🔒 PROPOSAL 0 IS FROZEN — REFERENCE PHOTO PALETTE (extracted from the SKU's reference image, after background filter):

${referencePalette.map((c, i) => `  ${i + 1}. ${c.hex.toUpperCase()}${typeof c.share === 'number' ? ` (${(c.share * 100).toFixed(1)}% of the subject)` : ''}`).join('\n')}

ABSOLUTE RULES FOR PROPOSAL 0 (the FIRST proposal in your output array):
1. The hex values you assign to zones MUST come from the list above. Do NOT modify a single hex digit. Do NOT round to a "nearby" brand color. Do NOT substitute with anything from the brand palette block below.
2. Map the colors so the GARMENT BODY reads as the reference photo would: pick the 1-2 most-dominant non-neutral hex values as the dominant body color(s); use the remaining as subtle accents on small zones (stitching, lining, trim, prints).
3. The NAME of proposal 0 must be 2-3 words evoking the reference photo's mood and the specific color of the dominant hex. Never use a bare color word — never "Azul", "Verde", "Rojo". Always a qualified, Sanzo Wada-style name: "Marino Profundo", "Indigo Nocturno", "Atardecer Costero", "Cobalto Lavado". The name should sound like a Pantone reference, not a crayon.
4. The DESCRIPTION (20-35 words) must reference the photo's atmosphere — the light, the setting, the mood — not the brand identity.

PROPOSALS 1, 2, 3: follow the brand-palette / Wada logic below. Do NOT use proposal 0's hex values in proposals 1-3 (unless they happen to coincide with the brand palette).`
        : '';

      const seedBlock = isManualSeed
        ? `THE USER HAS LOCKED THESE THREE COLORS AS THE PALETTE FOUNDATION:
${seedColorsRaw}

You MUST build all 4 proposals around these exact hex values. Each proposal uses these 3 colors as anchors — you decide how to distribute them across the zones above (which one becomes the identity, which the structural ground, which the accent), and you may add neutral support colors (white, off-white, black, cream) where the product needs more than 3 distinct zones. Do NOT substitute the anchor hex values; they are non-negotiable. Do NOT pull from Sanzo Wada — the user has already picked the palette.`
        : brandPalette.length
        ? `THE PALETTE FOUNDATION IS THE BRAND'S OWN CONFIRMED COLORS (DO NOT REPLACE):

${brandPaletteBlock}

These ${brandPalette.length} hex values ARE the palette of this collection. Every one of the 4 proposals MUST be built primarily from this set. Each proposal is a different DISTRIBUTION of these colors across the zones — which becomes the identity, which the structural ground, which the accent. You may use 3-5 of these colors per proposal (not always all of them), and you may include up to ONE additional neutral or harmony helper per proposal — pulled from Sanzo Wada ONLY IF it produces a more elegant combination with the brand colors. The Wada helper is a *modulator*, not a source.

${formatPalettesForPrompt(6)}

Use the Wada palettes above ONLY as reference for harmony principles or to source one optional helper hex per proposal. NEVER lead a proposal with a Wada palette — the brand colors above are non-negotiable. If the SKU name or design direction explicitly references a color (e.g. "Rosa Pastel", "Verde Salvia", "Azul Cemento"), match it to the closest brand color above and feature that color prominently.`
        : `THE PALETTE FOUNDATION IS SANZO WADA (no brand palette confirmed yet):

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

PRODUCT ZONES TO COLOR:
${zonesBlock}

${referencePaletteBlock ? referencePaletteBlock + '\n\n' : ''}${seedBlock}

YOUR TASK: Generate 4 colorway proposals. Each proposal includes a hex value for every zone — but multiple zones SHOULD share the same hex when they form a continuous surface or when the silhouette is meant to read as monochromatic.

MANDATORY RULES:
1. ELEGANCE OVER COLOR-BLOCKING — A real elegant product (think a leather ballerina, a minimal blazer, a knit dress) is rarely a patchwork of 5 different colors. It's typically MONOCHROMATIC or near-monochromatic: one dominant color covering 70-90% of the visible surface, ONE subtle accent in 1-2 small zones (heel counter, stitching, branding, lining), and at most one structural contrast (sole vs upper, lining vs shell). Force yourself to use the SAME hex across continuous surfaces — upper + quarters + topline are usually one piece of leather, not three different leathers. The 4 proposals should feel like 4 styled products, not 4 color-blocking experiments.
2. ZONE-BY-ZONE MAPPING — For every zone, return its assigned hex AND a 4–10 word rationale. The rationale must justify the choice: "shares the upper for monochrome calm" / "subtle accent only on stitching" / "structural sole contrasts the leather body". Repeating the same hex on multiple zones is GOOD when it's the body color — say so in the rationale.
3. SEMANTIC LOGIC — Identity zones get the dominant color (often shared across them). Structural zones can contrast OR share the dominant color depending on the silhouette. Accent zones (heel counter, stitching, branding, lining) are where 1 subtle pop lives — but only in 1 or 2 of the 4 proposals; the other proposals can be fully monochromatic with no accent at all.
4. ${isManualSeed ? 'USER-LOCKED HEX — The 3 anchor colors must appear across the 4 proposals. Distributions vary, but the palette is non-negotiable.' : 'PALETTE FIDELITY — Each proposal is built from the brand palette above. Different proposals use different dominant colors from that palette, not different palettes.'}
5. VISUAL DIVERSITY ACROSS PROPOSALS — The 4 proposals must feel meaningfully different in MOOD (calm vs bold, warm vs cool, restrained vs expressive). Not 4 variants of the same combo. But "different" comes from a different DOMINANT color or different accent placement, not from spreading more colors per proposal.
6. PRODUCTION FEASIBILITY — Hex codes must translate to real dyeable/printable colors on the implied material.
7. EXQUISITE NAMING — Every colorway name is 2-3 words, Sanzo Wada / Pantone precision. NEVER a bare color word ("Azul", "Verde", "Rojo", "Beige", "Negro" alone are FORBIDDEN). Always qualified and evocative: "Marino Profundo", "Verde Salvia", "Indigo Nocturno", "Rosa Adobe", "Negro Tinta", "Hueso Lino", "Cobalto Lavado", "Ladrillo Tostado". A patternmaker should read the name and know within ±5% which Pantone reference to pull. Treat each name as the colorway's spec — not its marketing.

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

The "zoneAssignments" array MUST contain one entry per zone in the same order. Repeating the same hex across continuous zones is encouraged when the proposal is meant to read as monochromatic — that's elegance, not laziness. Use distinct hex values only where the silhouette truly demands a contrast (e.g. sole vs upper, accent zone vs body).`,
      };
    }

    case 'color-rename': {
      // The user has edited zone hexes after the initial proposal. Regenerate
      // ONLY the name + description for that single colorway, given the new
      // distribution. Brand palette + product context come from buildInheritedContext.
      let zoneAssignments: { zoneName: string; hex: string }[] = [];
      try {
        const raw = (input.zoneAssignments as string | undefined) || '';
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) zoneAssignments = parsed;
        }
      } catch { /* fall through */ }
      const distributionBlock = zoneAssignments.length
        ? zoneAssignments.map(za => `  - ${za.zoneName}: ${za.hex}`).join('\n')
        : '  (no zones provided)';
      return {
        temperature: 0.7,
        system: `${PERSONAS.designConsultant}

You are a master at naming colorways. You think in evocative 2-3 word names that conjure a world (Sanzo Wada-style: "Spinel Red", "Dusty Sage", "Architectural Linen") and concise descriptions that justify the combination in the brand's voice.`,
        user: `${ctx}

The user has edited a colorway. Regenerate ONLY the name and description to match this exact new color distribution.

PRODUCT CONTEXT:
- Product: ${input.subcategory || input.productType || 'this product'}
- Family: ${input.family || 'not specified'}
- Design direction: ${input.designDirection || 'not specified'}

UPDATED ZONE-COLOR DISTRIBUTION:
${distributionBlock}

Your task: write a NEW name (2-3 words, evocative) and a NEW description (20-35 words) that ACCURATELY reflect this distribution. If the dominant color is now red, the name and description must speak to red — not to the previous palette. Reference the brand's confirmed colors by name where they appear (Rosa Arcilla, Negro Estructura, Hueso Natural, Verde Salvia, Azul Cemento, etc.) so the user recognizes their own palette in the rationale.

${OUTPUT_RULES}

Return ONLY valid JSON:
{
  "name": "2-3 word evocative colorway name",
  "description": "20-35 words describing the color story — what world this combination evokes, who it speaks to, why these tones together"
}`,
      };
    }

    case 'materials-suggest': {
      // Cost-aware proposal: the AI receives the target COGS + margin AND the
      // computed materials budget (industry-standard ratio of COGS), and must
      // return per-material consumption + cost_per_unit + cost_total whose
      // SUM stays within the budget. This is the structural fix to the
      // "materiales bonitos pero impagables" problem.
      const targetCogs = input.targetCogs || '';
      const targetPvp = input.targetPvp || input.priceRange || '';
      const targetMargin = input.targetMargin || '';
      const materialsBudget = input.materialsBudget || ''; // e.g. "€30.00"
      const zonesContext = input.zones || '';
      const knownZones = zonesContext.split(',').map(z => z.trim()).filter(Boolean);
      return {
        temperature: 0.55,
        system: `${PERSONAS.designConsultant}

You are also a product cost engineer. Every material you propose has to be PAYABLE inside the SKU's cost structure — bourgeois-sounding leather from an Italian conceria is NOT a valid suggestion if its market price + consumption blows the materials budget. You think like a sourcing manager: you know average market prices for fabrics (linen €8-22/m², cotton twill €4-14/m², premium nappa leather €25-55/m², mid-tier nappa €10-20/m², canvas €4-9/m², jersey €6-15/m², silk €18-45/m²), trims (zippers €0.40-2.50, eyelets €0.05-0.20, buttons €0.10-1.00), and consumption (a flat shoe upper takes ~0.3 m² leather, an oversize blazer takes ~2.4 m² wool). You propose only materials whose total roll-up fits the brand's price-per-unit reality.`,
        user: `${ctx}

The user needs material recommendations for a specific product, FRAMED BY THE COST STRUCTURE.

PRODUCT CONTEXT:
- Product name: ${input.subcategory || 'not specified'}
- Product type / category: ${input.productType || 'not specified'}
- Product family: ${input.family || 'not specified'}
- Design direction: ${input.designDirection || 'not specified'}
- Colorways selected: ${input.colorways || 'not specified'}
- Additional notes: ${input.concept || ''}

COST FRAME (NON-NEGOTIABLE):
- Target retail price (PVP): ${targetPvp || 'not specified'}
- Target unit cost (COGS): ${targetCogs || 'not specified'}
- Target margin: ${targetMargin || 'not specified'}
- MATERIALS BUDGET (must not be exceeded): ${materialsBudget || 'not specified'}

The materials budget is the slice of COGS the brand can spend on materials BEFORE labor, overhead, freight and duties. Industry-standard ratios that produced this number:
- Footwear (CALZADO): materials = ~50% of COGS
- Apparel (ROPA):     materials = ~55% of COGS
- Accessories:        materials = ~45% of COGS

ZONES PRESENT IN THIS PRODUCT (one material proposal per zone — re-use a single material across multiple zones when sensible):
${knownZones.length > 0 ? knownZones.map(z => `  - ${z}`).join('\n') : '  (zones not provided — propose ~6 standard positions)'}

YOUR TASK:
1. Propose ONE material per zone listed above (or one per standard BOM position when no zones provided).
2. For EACH material return: name, zone, type, description, sustainability, an estimated consumption per unit (with its unit), an average market price per unit (cost_per_unit), and the resulting cost_total = consumption × cost_per_unit rounded to 2 decimals.
3. The SUM of cost_total across all materials MUST be ≤ the materials budget above. If the budget is tight, downgrade to mid-tier suppliers (Spanish/Portuguese tanneries instead of Italian; Turkish cotton instead of Japanese), simpler finishes, lower GSM, smaller hardware. NEVER propose premium materials that blow the budget.
4. Use realistic market prices (EUR). Be conservative — when unsure, pick the cheaper end of the realistic range. Premium ranges only when the budget allows.
5. Trade names where reasonable, but only when they fit the price. "Italian Vitello Crust from Conceria Walpier" is fine for a €350 boot; for a €60 ballerina propose a Spanish vegetable-tanned nappa €8-12/m² instead.

QUALITY RULES:
${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return ONLY valid JSON:
{
  "budget_summary": {
    "materials_budget": "€X.XX",
    "materials_total": "€X.XX",
    "headroom": "€X.XX",
    "rationale": "30-50 words: why this proposal fits the cost frame and the brand"
  },
  "materials": [
    {
      "name": "Material trade/specific name",
      "zone": "Zone name from the list above",
      "type": "Primary" | "Secondary" | "Lining" | "Sole" | "Hardware" | "Trim",
      "description": "25-40 words: specific qualities, origin, hand-feel, visual appearance",
      "sustainability": "Sustainability note — empty string if not applicable",
      "consumption": "0.32 m²"  // numeric + unit (m², m, units, cm, g)
      "cost_per_unit": "€8.50 / m²",
      "cost_total": 2.72,        // EUR, numeric
      "cost_currency": "EUR",
      "priceImpact": "low" | "medium" | "high"
    }
  ]
}`,
      };
    }

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
        temperature: 0.55,
        system: `${PERSONAS.designConsultant}

You are also an expert in fashion supply chain and manufacturing sourcing. You have deep knowledge of global production hubs, factory capabilities, trade shows, MOQs and the FULL cost stack — labor rate by region (CN €3-7/hr · IN €2-5 · TR €6-10 · PT €9-14 · IT €18-30 · ES €15-22), overhead percentages typical to each (10-18% in Asia, 15-25% in Europe), freight per unit by method and corridor (sea CN→EU ~€0.80-1.40 / 35d · air €4-7 / 5d · road IT→EU €0.30-0.60 / 5d), import duties (EU MFN ~12% on apparel/footwear from non-FTA, 0% from PT/IT/ES/Morocco/Turkey under FTA). You factor MATERIAL ORIGIN: if a SKU's BOM is dominated by materials from a specific region, the matching factory region is usually the most efficient pick — you don't recommend producing Italian Vitello in Vietnam if the lead time and freight kill the margin.`,
        user: `${ctx}

The user needs sourcing recommendations FRAMED BY THE COST STRUCTURE AND MATERIALS ALREADY CHOSEN.

PRODUCT CONTEXT:
- Product type: ${input.productType || 'not specified'}
- Family: ${input.family || 'not specified'}
- Subcategory: ${input.subcategory || 'not specified'}
- Estimated units: ${input.units || 'not specified'}
- Quality level: ${input.qualityLevel || 'mid-to-premium'}

COST FRAME:
- Target COGS: ${input.targetCogs || 'not specified'}
- Target PVP: ${input.targetPvp || 'not specified'}
- Materials already locked in BOM: ${input.materials || '(none yet)'}

The COGS minus the materials roll-up = budget for labor + overhead + freight + duties. Reverse-solve: which region(s) deliver a labor+overhead+freight+duties stack that lands inside that remainder?

YOUR TASK:
1. FACTORY TYPE — artisan workshop / semi-industrial / full industrial / vertical manufacturer. Specific about capabilities the BOM demands (e.g. Blake stitch for footwear → factories with Blake-stitch Goodyear lasting capability).
2. RECOMMENDED REGIONS — 3-4 ranked. For EACH, return numbers we can persist directly to cost_breakdown:
   - laborRate (EUR/hour, single number)
   - laborHours (estimated hours per unit for THIS product)
   - overheadPct (%, single number)
   - freightMethod ("sea" | "air" | "rail" | "road")
   - freightTotal (EUR per unit)
   - dutiesPct (%, single number — FTA-aware)
   - moq + leadTime (text)
   - originCompatibility ("high" | "medium" | "low" — does the factory region match the BOM's material origin?)
3. TRADE SHOWS — 2-3.
4. SOURCING TIPS — 3-4.

Be conservative and grounded. When unsure between two regions, prefer the one with higher originCompatibility and lower duties.

${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return ONLY valid JSON:
{
  "factoryType": {
    "recommended": "Factory type name",
    "description": "30-50 words: why this type, what capabilities to look for",
    "capabilities": ["Capability 1", "Capability 2", "Capability 3"]
  },
  "regions": [
    {
      "name": "Country/Region",
      "fit": "Why it fits (20-30 words). Mention which BOM materials this region can locally source.",
      "moq": "Typical MOQ range",
      "leadTime": "Proto + production timeline",
      "cogsRange": "€XX-€XX per unit",
      "originCompatibility": "high" | "medium" | "low",
      "laborRate": 0,
      "laborHours": 0,
      "overheadPct": 0,
      "freightMethod": "sea" | "air" | "rail" | "road",
      "freightTotal": 0,
      "dutiesPct": 0
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
