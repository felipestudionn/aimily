/**
 * Creative & Brand Block — Prompt Registry
 *
 * 10 prompt types covering:
 * - Consumer profiling (assisted + proposals)
 * - Collection vibe (assisted + proposals)
 * - Brand DNA (extract + generate)
 * - Trend research (global, deep-dive, live signals, competitors)
 *
 * All prompts use the expert persona system and quality gates
 * from prompt-foundations.ts for consistent, world-class output.
 */

import {
  PERSONAS,
  QUALITY_GATES,
  OUTPUT_RULES,
  buildInheritedContext,
} from './prompt-foundations';

export interface CreativePrompt {
  system: string;
  user: string;
  temperature: number;
  maxTokens?: number;
}

/* ─── Brand DNA · 6-axis structured contract ───
   Sprint A.3 (2026-05-08). Both rama B (propose-from-Block-1) and
   rama A2 (external import — URL/IG/PDF) emit this exact shape so
   the multi-axis renderer treats them uniformly. The synthesis
   variant may set `_needsConfirmation: true` on any field where
   the underlying sources contradict; rama B never sets it. */
export interface BrandIdentityProposal {
  // Axis 1 — Name + tagline (3–5 candidates)
  nameOptions: Array<{ name: string; tagline?: string; reasoning: string; _needsConfirmation?: boolean }>;
  // Axis 2 — Palette (4–6 colors)
  palette: Array<{ name: string; hex: string; role: 'primary' | 'secondary' | 'accent' | 'neutral'; rationale: string; _needsConfirmation?: boolean }>;
  // Axis 3 — Voice
  voice: {
    personality: string;
    tone: string;
    do_rules: string[];        // 5
    dont_rules: string[];      // 5
    vocabulary: string[];      // 8–12
    _needsConfirmation?: boolean;
  };
  // Axis 4 — Typography (2–3 pairings)
  typography: Array<{ role: 'display' | 'body' | 'mono'; family: string; fallback: string; usage: string; _needsConfirmation?: boolean }>;
  // Axis 5 — Visual identity (3–4 axes)
  visualIdentity: Array<{ axis: 'composition' | 'photography' | 'lighting' | 'casting'; description: string; references: string[]; _needsConfirmation?: boolean }>;
  // Axis 6 — Applications (2–4 mockups)
  applications: Array<{ type: 'logo' | 'packaging' | 'hangtag' | 'social_square'; assetUrl?: string; prompt: string; _needsConfirmation?: boolean }>;
  // Top-level provenance — populated by rama A2 only
  sources?: string[];
}

type CreativePromptType =
  | 'consumer-assisted'
  | 'consumer-proposals'
  | 'vibe-assisted'
  | 'vibe-proposals'
  | 'brand-multi-axis'
  | 'brand-from-external-synthesis'
  | 'trends-global'
  | 'trends-deep-dive'
  | 'trends-live-signals'
  | 'trends-competitors';

export function buildCreativePrompt(
  type: CreativePromptType,
  input: Record<string, string>
): CreativePrompt | null {
  const ctx = buildInheritedContext(input);

  switch (type) {
    // ═══════════════════════════════════════════════════
    // CONSUMER DEFINITION
    // ═══════════════════════════════════════════════════

    case 'consumer-assisted':
      return {
        temperature: 0.7,
        maxTokens: 8192,
        system: PERSONAS.consumerStrategist,
        user: `${ctx}
${input.gender ? `\nCOLLECTION GENDER TARGET: ${input.gender}\n` : ''}
The user is defining the target consumer for their collection and has provided this direction:

"${input.keywords}"

Based on this direction, write a detailed consumer profile (180-250 words) that a merchandising team can actually use to make product decisions.

Structure your profile around these dimensions:
1. IDENTITY — Age range, life stage, professional world, geographic anchors (which cities/neighborhoods represent this consumer?)
2. VALUES & TENSIONS — What do they care about? Where do their values conflict? (e.g., "demands sustainability but won't compromise on aesthetic sophistication")
3. SHOPPING BEHAVIOR — Where do they discover brands? Where do they buy? What triggers a purchase vs. what keeps them browsing? Average basket, purchase frequency
4. MEDIA & CULTURE — Which specific publications, accounts, podcasts, cultural events shape their taste? Name real sources
5. WARDROBE PSYCHOLOGY — What role does clothing play in their identity? What's already in their closet? What's the gap this collection fills?

${QUALITY_GATES.consumerSpecificity}
${QUALITY_GATES.antiGeneric}

Return ONLY the profile text as a continuous narrative. No JSON, no markdown headers, no bullet points. Write it as a brief that could be pinned on a design studio wall.`,
      };

    case 'consumer-proposals':
      return {
        temperature: 0.85,
        maxTokens: 8192,
        system: PERSONAS.consumerStrategist,
        user: `${ctx}
${input.gender ? `\nCOLLECTION GENDER TARGET: ${input.gender}\n` : ''}${input.ageRange ? `AGE RANGE: ${input.ageRange}\n` : ''}${input.cities ? `LIVES IN: ${input.cities}\n` : ''}${input.wearsBrands ? `WEARS / OWNS: ${input.wearsBrands}\n` : ''}${input.shopsAt ? `SHOPS AT: ${input.shopsAt}\n` : ''}${input.reads ? `READS / FOLLOWS: ${input.reads}\n` : ''}${input.values ? `VALUES: ${input.values}\n` : ''}${input.lifestyle ? `LIFESTYLE MARKERS: ${input.lifestyle}\n` : ''}
The user has confirmed this consumer summary based on their moodboard:

"${input.reference}"

Use the structured fields above as STRONG signal — every proposal must respect them and extend them with concrete buying behavior, media diet, and wardrobe psychology. Don't restate the fields verbatim; weave them in naturally.

${input.existingProfiles && input.count
  ? `The user has already selected these consumer profiles and wants to KEEP them:
${input.existingProfiles}

Generate exactly ${input.count} NEW and DIFFERENT consumer profiles to replace the ones the user rejected. The new profiles must NOT overlap with the existing ones listed above — they must represent genuinely different market segments.`
  : `Generate exactly 4 distinct consumer profiles that could be the target for this collection. These must be genuinely different segments — not variations of the same person.

DIFFERENTIATION STRATEGY:
- Profile 1: The most commercially obvious choice (highest market size)
- Profile 2: A more aspirational/niche choice (cultural influence > market size)
- Profile 3: An emerging segment (growing fast, underserved by current market)
- Profile 4: A counterintuitive choice (unexpected but strategically defensible)`}

${QUALITY_GATES.consumerSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return this exact JSON structure. EVERY field is required — never omit a section:
{
  "proposals": [
    {
      "title": "2-3 word segment name (memorable, not generic)",
      "essence": "ONE editorial sentence (12-18 words) that captures who she is — her psychology in one breath. Lowercase, no marketing fluff.",
      "keyQuote": "An ACTUAL phrase she would say about how she dresses or shops — natural speech, first person, 10-20 words. No quote marks in the value.",
      "wardrobe": [
        "Concrete wardrobe move with a brand or material (e.g. 'invierte en knitwear de Totême antes que en una bolsa logo')",
        "Second wardrobe move",
        "Third wardrobe move"
      ],
      "lifestyle": [
        "Vivid daily-life micro-scene with a place or ritual (e.g. 'desayuno en Cereal Café antes del estudio')",
        "Second lifestyle marker",
        "Third lifestyle marker"
      ],
      "values": [
        "What she actively prioritizes (e.g. 'craftsmanship sobre logo')",
        "Second value",
        "Third value"
      ],
      "desc": "Full profile (100-140 words): identity, values, shopping behavior, media habits, wardrobe psychology. Must include specific brand/retailer references and at least one quantified behavior. Used as fallback for older renderers — must still read as a polished standalone paragraph."
    }
  ]
}

Each wardrobe / lifestyle / values bullet: 6-14 words, concrete proper nouns over abstractions, no semicolons.`,
      };

    // ═══════════════════════════════════════════════════
    // COLLECTION VIBE
    // ═══════════════════════════════════════════════════

    case 'vibe-assisted':
      return {
        temperature: 0.8,
        system: PERSONAS.creativeDirector,
        user: `${ctx}

The user is defining the creative direction for their collection with these keywords:

"${input.direction}"

Write a creative brief (80-120 words) that captures the world of this collection. Write with the voice of Vogue or Harper's Bazaar — aspirational, visual, magnetic. Short punchy sentences that make you want to see this collection exist. Fashion-forward language, not academic.

Cover:
1. THE WORLD — A specific place, time, atmosphere (not generic moods)
2. COLORS & MATERIALS — Name them concretely
3. THE PERSON — Who wears this? A character, not demographics
4. THE TWIST — What makes this direction unexpected?

Also extract 6-8 evocative keywords.

${OUTPUT_RULES}

Return:
{
  "vibe": "The creative brief...",
  "keywords": "keyword1, keyword2, keyword3, ..."
}`,
      };

    case 'vibe-proposals':
      return {
        temperature: 0.85,
        system: PERSONAS.creativeDirector,
        user: `${ctx}

The user needs a creative direction for their collection. Use ALL available context to generate proposals:

${input.consumer ? `CONSUMER PROFILE:\n${input.consumer}\n` : ''}${input.moodboard ? `MOODBOARD REFERENCES:\n${input.moodboard}\n` : ''}${input.reference ? `EXTRA DIRECTION FROM USER:\n"${input.reference}"\n` : ''}${!input.consumer && !input.moodboard && !input.reference ? 'No additional context provided — use the collection name and season to inspire creative directions.\n' : ''}
Generate exactly 3 distinct creative directions. Each must feel like a completely different collection — different colors, different references, different energy.

IMPORTANT — TONE AND STYLE:
- Write with the voice of Vogue or Harper's Bazaar — aspirational, magnetic, fashion-forward
- Short, punchy sentences. Visual language that makes you want this collection to exist
- NOT academic, NOT verbose. Think editorial caption, not dissertation.
- Direction 1: The most refined/minimal interpretation
- Direction 2: The most textural/sensorial interpretation
- Direction 3: The most narrative/conceptual interpretation

Each direction should answer: What does this world look like? What are the key colors and materials? Who is this person? What makes it unexpected?

${OUTPUT_RULES}

Return:
{
  "proposals": [
    {
      "title": "2-3 word vibe name",
      "vibe": "Creative brief (60-80 words). Short sentences. Visual. Specific but accessible. A designer should read this and immediately see the collection.",
      "keywords": "6-8 comma-separated keywords"
    }
  ]
}`,
      };

    // ═══════════════════════════════════════════════════
    // BRAND DNA · MULTI-AXIS (Sprint A.3, 2026-05-08)
    //
    // Canonical contract: 6 axes. Two callers, same schema —
    //   brand-multi-axis            → propose from Block 1 context
    //   brand-from-external-synthesis → propose from external sources
    //
    // Anti-leak: never echo or invent a brand name from the
    // collection's working title (collection_plans.name). The user
    // is BUILDING the brand here — the working title is a placeholder.
    // ═══════════════════════════════════════════════════

    case 'brand-multi-axis': {
      const referenceCodes = (input.market_competitors_references || '').trim();
      const seasonColors = (input.market_trends_colors || '').trim();
      const seasonMaterials = (input.market_trends_materials || '').trim();

      return {
        temperature: 0.8,
        maxTokens: 8192,
        system: `${PERSONAS.brandArchitect}

${PERSONAS.creativeDirector}

You produce a complete BRAND IDENTITY system as a structured 6-axis report. Each axis is a coherent design decision; together they read as one brand, not six unrelated proposals. Every axis is grounded in the inherited Block 1 context — consumer, moodboard, market trends (theme/category/color/material), aspirational reference brands. You never default to safe generics.

ANTI-LEAK RULE — CRITICAL:
- NEVER use the collection's working title as a brand name candidate. The working title is internal scaffolding — the user has not chosen a brand name yet.
- NEVER invent prices, retail locations, founder bios, or business numbers. You design the identity system; commercial fiction is forbidden.

CASE FORMATTING — Spanish-language brand outputs:
- Brand names: Title Case (or ALL CAPS only if the brand metabolism explicitly calls for it).
- Taglines, vocabulary, descriptions: Spanish sentence case. Never gratuitous ALL CAPS.`,
        user: `${ctx}

${referenceCodes ? `\nASPIRATIONAL REFERENCE BRANDS (from Investigación de Mercado · Referencias) — use these as imagery codes for visual identity, not as price-tier benchmarks:\n${referenceCodes}\n` : ''}${seasonColors ? `\nSEASON COLOR DIRECTION (from Tendencias · color axis):\n${seasonColors}\n` : ''}${seasonMaterials ? `\nSEASON MATERIAL DIRECTION (from Tendencias · material axis):\n${seasonMaterials}\n` : ''}
Produce a complete brand identity system across these 6 axes. Every axis must feel chosen for THIS specific consumer, vibe, and moodboard — never interchangeable with another brand.

AXIS 1 — NAME + TAGLINE (3–5 candidates)
  Each candidate is a real, usable Spanish or English brand name (short, easy to say, IP-feasible). Tagline is optional but must be specific when present. Reasoning is one sentence on why the name fits THIS world.

AXIS 2 — PALETTE (4–6 colors)
  Each color: evocative name, accurate hex, one of {primary, secondary, accent, neutral}, and a rationale tying it to the moodboard or season color direction. The palette must read as ONE system, not six pretty swatches.

AXIS 3 — VOICE
  Personality (1 sentence). Tone (1 sentence). 5 do-rules + 5 don't-rules (concrete, copy-test ready). 8–12 vocabulary anchors (real words and phrases the brand would use).

AXIS 4 — TYPOGRAPHY (2–3 pairings)
  Each pairing: role (display | body | mono), real font family name (Google Fonts or licensed), a fallback stack, and one sentence on usage. Fonts must be specific and identifiable.

AXIS 5 — VISUAL IDENTITY (3–4 axes)
  Each axis is one of {composition, photography, lighting, casting}. Description is concrete — a designer reads it and can shoot. References are 1–3 imagery codes (designer names, photographers, films, places) drawn from the aspirational reference brands and the moodboard, never invented.

AXIS 6 — APPLICATIONS (2–4 mockup briefs)
  Each: type ∈ {logo, packaging, hangtag, social_square}. Prompt is the gpt-image / Freepik prompt that would render this asset. assetUrl stays empty — the renderer fills it later.

${QUALITY_GATES.designSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return EXACTLY this JSON shape:
{
  "nameOptions": [
    { "name": "Brand Name", "tagline": "Optional tagline", "reasoning": "One sentence." }
  ],
  "palette": [
    { "name": "Evocative color name", "hex": "#RRGGBB", "role": "primary", "rationale": "One sentence." }
  ],
  "voice": {
    "personality": "1 sentence",
    "tone": "1 sentence",
    "do_rules": ["...", "...", "...", "...", "..."],
    "dont_rules": ["...", "...", "...", "...", "..."],
    "vocabulary": ["...", "...", "...", "...", "...", "...", "...", "..."]
  },
  "typography": [
    { "role": "display", "family": "Real font family", "fallback": "serif | sans-serif | monospace stack", "usage": "1 sentence." }
  ],
  "visualIdentity": [
    { "axis": "composition", "description": "1–2 sentences, concrete.", "references": ["Reference 1", "Reference 2"] }
  ],
  "applications": [
    { "type": "logo", "prompt": "gpt-image prompt that would render this asset." }
  ]
}`,
      };
    }

    case 'brand-from-external-synthesis': {
      const sonarBlock = (input._sonarResearch || '').trim();
      const igBlock = (input._instagramFindings || '').trim();
      const scrapedBlock = (input._scrapedSite || '').trim();
      const pdfBlock = (input._pdfExtraction || '').trim();
      const sourcesLine = (input._sources || '').trim();

      return {
        temperature: 0.55,
        maxTokens: 8192,
        system: `${PERSONAS.brandArchitect}

You SYNTHESIZE a brand identity from real-world sources the user provided (any combination of: brand website, Instagram handle, brandbook PDF). You will receive raw research from Perplexity Sonar (web + IG with citations) and/or extracted text from a brandbook PDF.

Your job:
1. Cross-reference the sources to extract the brand's REAL identity — what already exists, not what you'd design from scratch.
2. Output the canonical 6-axis schema.
3. When sources contradict (e.g., website says "minimal" but Sonar says "maximalist"), set "_needsConfirmation": true on that field and return the most-supported value plus the contradiction in the rationale.
4. NEVER fabricate fonts, hex codes, or claims the sources don't support. If a source doesn't mention something, mark "_needsConfirmation": true and return your best inference.

ANTI-HALLUCINATION:
- Hex codes: only those visible in cited sources or industry-known signature colors for this brand. Otherwise mark _needsConfirmation.
- Font families: only those named in sources. Otherwise mark _needsConfirmation and return a best-fit characterization.
- Vocabulary: quote the brand's actual words from scraped/PDF copy when possible.`,
        user: `Synthesize the brand identity from the sources below.

${sonarBlock ? `═══ SONAR · WEB + INSTAGRAM RESEARCH ═══\n${sonarBlock}\n${sourcesLine ? `Sources: ${sourcesLine}\n` : ''}═══════════════════════════════════════\n` : ''}
${igBlock ? `═══ INSTAGRAM FINDINGS ═══\n${igBlock}\n═════════════════════════\n` : ''}
${scrapedBlock ? `═══ WEBSITE CONTENT (scraped) ═══\n${scrapedBlock}\n═════════════════════════════════\n` : ''}
${pdfBlock ? `═══ BRANDBOOK PDF (extracted) ═══\n${pdfBlock}\n═════════════════════════════════\n` : ''}
${!sonarBlock && !scrapedBlock && !pdfBlock ? 'No sources available — return a 6-axis stub with every field marked _needsConfirmation: true and reasoning that explains the gap.' : ''}

Return the canonical 6-axis JSON. For each top-level axis (nameOptions, palette, voice, typography, visualIdentity, applications), include "_needsConfirmation": true on any item where the sources don't unambiguously support the value.

${OUTPUT_RULES}

Return EXACTLY this JSON shape:
{
  "nameOptions": [
    { "name": "Exact brand name as used by the brand", "tagline": "Their actual tagline if cited", "reasoning": "Source citation.", "_needsConfirmation": false }
  ],
  "palette": [
    { "name": "Color name", "hex": "#RRGGBB", "role": "primary", "rationale": "Source citation.", "_needsConfirmation": false }
  ],
  "voice": {
    "personality": "1 sentence — paraphrase or quote",
    "tone": "1 sentence",
    "do_rules": ["..."],
    "dont_rules": ["..."],
    "vocabulary": ["..."],
    "_needsConfirmation": false
  },
  "typography": [
    { "role": "display", "family": "Real font family", "fallback": "fallback stack", "usage": "1 sentence.", "_needsConfirmation": false }
  ],
  "visualIdentity": [
    { "axis": "photography", "description": "1–2 sentences from the sources.", "references": ["..."], "_needsConfirmation": false }
  ],
  "applications": [
    { "type": "logo", "prompt": "Description of the actual logo as it appears in sources.", "_needsConfirmation": false }
  ],
  "sources": ["url1", "url2"]
}`,
      };
    }

    // ═══════════════════════════════════════════════════
    // TREND RESEARCH
    // ═══════════════════════════════════════════════════

    case 'trends-global':
      return {
        temperature: 0.65,
        maxTokens: 8192,
        system: `${PERSONAS.trendForecaster}

CRITICAL STYLE RULES FOR TREND NAMES AND DESCRIPTIONS:
- Trend names must sound like VOGUE or WWD headlines, NOT like academic papers or sci-fi novels.
- BAD examples: "Digital Enlightenment", "Regenerative Authenticity", "Neo-Sensory Paradigm", "Biomorphic Consciousness"
- GOOD examples: "Quiet Luxury", "Sheer Everything", "The New Prep", "Barn Jacket Revival", "Ballet Flat Comeback", "Tomato Red", "Linen Suiting", "Oversized Tailoring"
- Every trend must be something you could SEE on a runway, in a store, or on the street.
- Write like a Vogue trend report, not like a research paper. Direct, visual, concrete.`,
        user: `${ctx}

${input.input ? `User focus: "${input.input}"` : ''}

${input._webResearch ? `
═══ CURRENT FASHION DATA (from Vogue, Tag Walk, The Impression, Harper's Bazaar, WWD) ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
═════════════════════════════════════════════════════════════════════════════════════════
THIS IS REAL DATA from fashion press. BASE YOUR ANALYSIS PRIMARILY on this data.
Do NOT ignore this research. Extract and organize the trends found here.
` : ''}
Identify 6-8 fashion trends for this season. These must be REAL, VISIBLE trends — things you can see on runways, in stores, or on the street. NOT abstract concepts.

IMPORTANT: Use the web research data above as your PRIMARY source. The trends you list should come FROM that data, organized and analyzed with your fashion expertise. Do not invent trends that aren't supported by the research.

For each trend:
1. NAME — 2-4 words that Vogue would use as a headline. Concrete and visual.
2. WHAT IT LOOKS LIKE — Specific silhouettes, colors, materials, styling. A designer reads this and knows exactly what to sketch.
3. WHO IS DOING IT — Name specific designers, brands, or runway shows where this appeared. Real names, real collections.
4. HOW TO USE IT — Practical advice: how would a brand at this price point incorporate this trend? What pieces, what fabrics, what details?

BANNED: Abstract concepts, philosophical language, compound buzzwords, anything that sounds like a TED talk or sci-fi novel. Every trend must pass the test: "Could I point to this in a Zara window or on a runway photo?"

${QUALITY_GATES.trendSpecificity}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Trend Name (2-4 words — Vogue headline style)",
      "brands": "3-5 reference brands that represent this trend (e.g., The Row, Loro Piana, Brunello Cucinelli)",
      "desc": "60-100 words: what it looks like (silhouettes, colors, materials), how to use it (practical design advice for this collection)",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    case 'trends-deep-dive':
      return {
        temperature: 0.65,
        maxTokens: 8192,
        system: `${PERSONAS.trendForecaster}

Write like a Vogue or Highsnobiety trend report. Every trend must be VISUAL and CONCRETE — something a designer can sketch tomorrow. No abstract concepts.`,
        user: `${ctx}

The user wants to go deep on: "${input.input}"

${input._webResearch ? `
═══ CURRENT FASHION DATA ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
════════════════════════════
BASE YOUR ANALYSIS on this real data.
` : ''}
Identify 6-8 specific micro-trends in this area. Design-level details — specific looks, constructions, materials, finishes.

For each:
1. NAME — Concrete and visual (e.g., "Mesh Panel Sneakers", "Raw-Edge Denim", "Butter Yellow")
2. WHAT — The specific design detail, material, or construction. What does it LOOK like?
3. WHO — Which brands/designers are doing this? At which price tier? Name real names.
4. HOW — How to execute: specific materials, techniques, proportions. Actionable for a designer.
5. SHELF LIFE — Flash (1 season), wave (2-3 seasons), or here to stay?

${QUALITY_GATES.trendSpecificity}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Micro-Trend Name (2-4 words, concrete)",
      "brands": "3-5 brands doing this trend (e.g., Nike, Salomon, New Balance)",
      "desc": "60-100 words: what it looks like, how to execute, shelf life",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    case 'trends-live-signals':
      return {
        temperature: 0.65,
        maxTokens: 8192,
        system: `${PERSONAS.trendForecaster}

Write like a Highsnobiety or Hypebeast trend alert. Short, punchy, visual. What are people ACTUALLY wearing right now? No philosophical abstractions.`,
        user: `${ctx}

${input.input ? `Focus: "${input.input}"` : ''}

${input._webResearch ? `
═══ WHAT'S TRENDING NOW (real data from fashion press & social media) ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
════════════════════════════════════════════════════════════════════════
THIS IS REAL, CURRENT DATA. Use it as your primary source.
` : ''}
Identify 6-8 things that are trending RIGHT NOW in fashion and style. These are live signals — what people are wearing, buying, posting about.

For each:
1. NAME — What people would call it (e.g., "Barn Jacket Everywhere", "Cherry Red Bags", "Mesh Ballet Flats")
2. WHAT — What's the actual look/item/style? Be visual and specific.
3. WHO — Which celebrities, influencers, street style photos, or TikTok creators are driving it?
4. WHERE — Which platform is it strongest on? (TikTok, Instagram, Pinterest, street style)
5. SHELF LIFE — Flash (weeks), wave (months), or staying?

${QUALITY_GATES.trendSpecificity}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Signal Name (2-4 words, concrete)",
      "brands": "3-5 brands/people driving this signal",
      "desc": "50-80 words: what it looks like, where it's trending, how long it will last",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    case 'trends-competitors':
      return {
        temperature: 0.6,
        maxTokens: 8192,
        system: `${PERSONAS.trendForecaster}

You are a competitive intelligence analyst. Write like BoF (Business of Fashion) — factual, strategic, numbers-driven. No romance.`,
        user: `${ctx}

Brands to analyze: "${input.input}"

${input._webResearch ? `
═══ CURRENT BRAND DATA ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
══════════════════════════
USE THIS RESEARCH. Real, current data about these brands.
` : ''}

For each brand mentioned, give ONE insight card with:
1. TITLE — The key strategic takeaway (e.g., "COS: Affordable Minimalism Gap", "Sandro: Parisian Premium Sweet Spot")
2. POSITIONING — Price range (real numbers in €), aesthetic position, target consumer
3. WHAT THEY DO WELL — Their strongest move right now
4. THE GAP — What they're NOT doing that the market wants. Where's the opportunity?
5. YOUR LESSON — One specific, actionable thing to take for your collection

Be direct. Use real price ranges, real product categories, real consumer segments.

${QUALITY_GATES.trendSpecificity}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Brand: Key Insight (e.g., 'COS: The Minimalism Gap')",
      "desc": "60-100 words: positioning with real prices, what they do well, the gap/opportunity, one actionable lesson",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    default:
      return null;
  }
}
