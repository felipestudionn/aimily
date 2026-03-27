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

type CreativePromptType =
  | 'consumer-assisted'
  | 'consumer-proposals'
  | 'vibe-assisted'
  | 'vibe-proposals'
  | 'brand-extract'
  | 'brand-generate'
  | 'brand-assisted'
  | 'brand-proposals'
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
${input.gender ? `\nCOLLECTION GENDER TARGET: ${input.gender}\n` : ''}
The user needs to define their target consumer and has provided this minimal reference:

"${input.reference}"

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

Return this exact JSON structure:
{
  "proposals": [
    {
      "title": "2-3 word segment name (memorable, not generic)",
      "desc": "Full profile (100-140 words): identity, values, shopping behavior, media habits, wardrobe psychology. Must include specific brand/retailer references and at least one quantified behavior."
    }
  ]
}`,
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
    // BRAND DNA
    // ═══════════════════════════════════════════════════

    case 'brand-extract':
      return {
        temperature: 0.5,
        maxTokens: 8192,
        system: `${PERSONAS.brandArchitect}

You are extracting the Brand DNA of a fashion/lifestyle brand. You will receive TWO sources of real information:

1. **WEB RESEARCH** — sourced information about this brand from fashion press, reviews, articles, and industry analysis. This gives you the brand's positioning, reputation, and identity as perceived by the industry.
2. **WEBSITE CONTENT** — the brand's own words: their copy, about page, product descriptions, headlines. This gives you their voice, tone, and self-positioning.

Your job is to CROSS-REFERENCE both sources to produce an expert-level brand analysis that is deeply specific to THIS brand and no other.

CRITICAL RULES:
- The brand name must be EXACTLY correct — check both sources.
- Every sentence must be true ONLY of this brand. If it could describe 10 other brands, it's too generic.
- For COLORS: identify the brand's REAL signature palette. If the research mentions specific colors, use those. Think Hermès orange, Tiffany blue — what color IS this brand?
- For VOICE: analyze their ACTUAL copy. Quote specific phrases. How do they describe products? What words do they choose vs. avoid?
- For TYPOGRAPHY: name specific typefaces if known from research. Otherwise, describe the typographic character precisely.
- For VISUAL IDENTITY: be concrete — photography style, spatial grammar, iconic elements, packaging details.
- NEVER refuse. ALWAYS return valid JSON.`,
        user: `Extract the complete Brand DNA for use in fashion collection planning.

BRAND REFERENCES:
${input.website ? `- Website: ${input.website}` : ''}
${input.instagram ? `- Instagram: ${input.instagram}` : ''}
${input._igHandle ? `- IG handle: @${input._igHandle}` : ''}

${input._webResearch ? `
═══════════════════════════════════════════════════════════
SOURCE 1: WEB RESEARCH (from fashion press, articles, reviews)
═══════════════════════════════════════════════════════════
${input._webResearch}
${input._sources ? `\nSources: ${input._sources}` : ''}
═══════════════════════════════════════════════════════════
` : ''}

${input._brandName || input._bodyContent ? `
───────────────────────────────────────────────────────────
SOURCE 2: BRAND'S OWN WEBSITE CONTENT
───────────────────────────────────────────────────────────

DETECTED BRAND NAME: ${input._brandName || 'Unknown'}
${input._tagline ? `TAGLINE: ${input._tagline}` : ''}

${input._headings ? `HEADLINES:\n${input._headings}` : ''}

${input._bodyContent ? `HOMEPAGE COPY:\n${input._bodyContent}` : ''}

${input._aboutContent ? `\nABOUT/STORY PAGE:\n${input._aboutContent}` : ''}

${input._productDescriptions ? `\nPRODUCT DESCRIPTIONS:\n${input._productDescriptions}` : ''}
───────────────────────────────────────────────────────────
` : ''}

${!input._webResearch && !input._bodyContent ? 'No data available — use your knowledge of this brand.' : ''}

ANALYSIS TASK — Cross-reference BOTH sources to extract:

1. BRAND NAME — The EXACT official name as the brand uses it.

2. COLOR SYSTEM — 4 colors that define this brand's visual identity:
   - Primary: THE signature color (from research + website visual cues)
   - Secondary: A key supporting color in their system
   - Accent: A highlight/energy color
   - Neutral: Their base/background tone
   Use the web research to identify real brand colors. Provide accurate hex codes.

3. VOICE & TONE — Cross-reference the web research (how press describes them) with their actual copy (how they describe themselves). Quote or reference specific phrases from Source 2. Describe: tonal register, vocabulary patterns, what they emphasize, what they avoid. A copywriter should be able to write on-brand after reading this.

4. TYPOGRAPHY — If the research or your knowledge identifies specific typefaces, name them. Otherwise, describe the precise typographic character and what it signals about positioning.

5. VISUAL IDENTITY — Synthesize from both sources: photography style (artisanal/editorial/studio/lifestyle), layout approach, spatial grammar, iconic brand elements (logos, patterns, signatures), packaging details, store/showroom aesthetic. A designer should immediately see the visual world.

${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "brandName": "Exact official brand name",
  "colors": ["#hex1 (primary)", "#hex2 (secondary)", "#hex3 (accent)", "#hex4 (neutral)"],
  "tone": "40-70 words — cross-reference press perception with actual copy, quote specific phrases, describe tonal register and vocabulary patterns",
  "typography": "25-40 words — name actual typefaces if known, describe typographic character and positioning signal",
  "style": "40-70 words — photography style, layout, iconic elements, packaging, store aesthetic. Specific enough to brief a designer."
}`,
      };

    case 'brand-generate':
      return {
        temperature: 0.8,
        maxTokens: 8192,
        system: PERSONAS.brandArchitect,
        user: `${ctx}

The user is creating a brand identity from scratch for their collection.

${input.brandName ? `Preferred brand name: "${input.brandName}"` : 'No brand name decided yet — suggest one.'}
${input.direction ? `Brand direction: "${input.direction}"` : ''}

Create a brand identity system that feels intentional, cohesive, and market-ready. This is not a logo exercise — it's a complete signal system.

DESIGN PRINCIPLES:
1. COLOR SYSTEM — 4 colors with strategic roles (primary, secondary, accent, neutral). Colors must:
   - Work together as a system (not random "nice colors")
   - Reflect the brand positioning (accessible vs. exclusive, warm vs. cool, bold vs. restrained)
   - Be differentiated from obvious competitors in this space
   - Include hex codes that are production-ready

2. VOICE — How the brand speaks, with enough specificity that anyone could write on-brand copy after reading this

3. TYPOGRAPHY — Headline + body recommendations that match the brand metabolism

4. VISUAL IDENTITY — The overall system described in terms of its distinctive grammar

${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "brandName": "${input.brandName || 'Suggested brand name'}",
  "colors": ["#hex1 (primary)", "#hex2 (secondary)", "#hex3 (accent)", "#hex4 (neutral)"],
  "tone": "25-40 word description of brand voice",
  "typography": "20-30 word typography recommendation (headline + body)",
  "style": "25-40 word visual identity description"
}`,
      };

    case 'brand-assisted':
      return {
        temperature: 0.75,
        maxTokens: 8192,
        system: `${PERSONAS.brandArchitect}

You are helping create a NEW brand identity inspired by an existing reference brand. The user has provided a reference brand they admire — you have research data about that brand. Your job is to:
1. Understand the reference brand's DNA (from the research + scraped content)
2. Create a NEW, ORIGINAL brand identity that is INSPIRED by the reference but distinct
3. Incorporate the user's brief/direction to differentiate

CRITICAL: You are NOT copying the reference brand. You are using it as a springboard to create something new that captures a similar spirit but with its own identity.`,
        user: `${ctx}

═══ REFERENCE BRAND RESEARCH ═══
${input._webResearch || 'No web research available'}

═══ REFERENCE BRAND WEBSITE CONTENT ═══
Brand name: ${input._brandName || 'Unknown'}
Headings: ${input._headings || 'N/A'}
Body content: ${input._bodyContent || 'N/A'}
About: ${input._aboutContent || 'N/A'}
Product descriptions: ${input._productDescriptions || 'N/A'}

${input.brief ? `═══ USER'S BRIEF FOR THEIR NEW BRAND ═══\n"${input.brief}"` : ''}
${input.brandName ? `Preferred brand name for the new brand: "${input.brandName}"` : 'No brand name decided yet — suggest one.'}

Based on the reference brand's DNA and the user's brief, create a NEW brand identity that:
- Captures a SIMILAR spirit/positioning but is clearly original
- Adapts to the user's specific collection context (season, consumer, market)
- Has its own color palette (inspired by but not identical to the reference)
- Has its own voice (similar register but distinct personality)

${QUALITY_GATES.antiGeneric}
${QUALITY_GATES.designSpecificity}
${OUTPUT_RULES}

Return:
{
  "brandName": "${input.brandName || 'Suggested new brand name'}",
  "colors": ["#hex1 (primary — role)", "#hex2 (secondary — role)", "#hex3 (accent — role)", "#hex4 (neutral — role)"],
  "tone": "40-60 words — how this NEW brand speaks, referencing what was learned from the reference",
  "typography": "25-40 words — specific font families that match the new positioning",
  "style": "40-60 words — photography, layout, packaging aesthetic for the new brand",
  "inspiration": "20-30 words — what was taken from the reference and how it was transformed"
}`,
      };

    case 'brand-proposals':
      return {
        temperature: 0.85,
        maxTokens: 8192,
        system: `${PERSONAS.brandArchitect}

${PERSONAS.creativeDirector}

You create brand identities for fashion collections. Given the collection context (consumer, vibe, moodboard, trends, season), you generate 3 completely distinct brand identity proposals.

Each proposal must feel like a REAL brand — not a concept exercise. Someone should be able to launch a brand tomorrow using your output.`,
        user: `${ctx}

${input.brief ? `User's additional direction: "${input.brief}"` : ''}

Generate 3 brand identity proposals for this collection. Each must be a COMPLETELY DIFFERENT interpretation:

PROPOSAL 1 — REFINED: Minimal, understated, quiet confidence. Think The Row, Lemaire, Jil Sander.
PROPOSAL 2 — EXPRESSIVE: Bold personality, memorable, distinctive. Think Jacquemus, Ganni, Collina Strada.
PROPOSAL 3 — HERITAGE: Timeless, craft-driven, legacy-building. Think Hermès, Brunello Cucinelli, Loro Piana.

For EACH proposal, return:
{
  "title": "2-3 word brand essence (like a mood, not a tagline)",
  "brandName": "A real, usable brand name suggestion",
  "colors": ["#hex1 (primary — role)", "#hex2 (secondary — role)", "#hex3 (accent — role)", "#hex4 (neutral — role)"],
  "tone": "40-60 words — how this brand speaks, what language it uses, what it avoids",
  "typography": "25-40 words — name REAL font families (Google Fonts or system fonts) + why",
  "style": "40-60 words — photography direction, layout principles, packaging philosophy",
  "rationale": "20-30 words — why this direction works for THIS specific collection"
}

${QUALITY_GATES.antiGeneric}
${QUALITY_GATES.designSpecificity}
${OUTPUT_RULES}

Return a JSON object:
{
  "proposals": [proposal1, proposal2, proposal3]
}`,
      };

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
