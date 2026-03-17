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

    // ═══════════════════════════════════════════════════
    // TREND RESEARCH
    // ═══════════════════════════════════════════════════

    case 'trends-global':
      return {
        temperature: 0.7,
        maxTokens: 8192,
        system: PERSONAS.trendForecaster,
        user: `${ctx}

The user is researching macro-trends for their collection. They provided this context:

"${input.input}"

${input._webResearch ? `
═══ REAL-TIME WEB RESEARCH (sourced from current fashion press & industry data) ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
═══════════════════════════════════════════════════════════════════════════════════
USE THIS RESEARCH as your primary source of evidence. Cross-reference with your knowledge to produce expert analysis.
` : ''}
Identify 4-5 global macro-trends relevant to this season and context. These should be MACRO-level cultural/design shifts, not product-specific details.

ANALYSIS FRAMEWORK (for each trend):
1. THE SHIFT — What is changing? From what → to what? (Not just "X is trending" but the directional movement)
2. EVIDENCE — Which designers/collections showed this on the runway? Which cultural moments are driving it? What retail data supports it?
3. MANIFESTATION — How does this macro-trend translate into actual design decisions? (Silhouettes, palettes, materials, details)
4. COMMERCIAL WINDOW — Is this trend at the beginning (risky but differentiated), peak (safe but crowded), or filtering down (accessible but late)?
5. RELEVANCE SCORE — How relevant is this specifically for the user's collection context?

${QUALITY_GATES.trendSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Trend Name (2-4 words — the industry would recognize this name)",
      "desc": "80-120 words: the shift, evidence (name specific designers/brands/collections), manifestation in design, commercial window assessment",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    case 'trends-deep-dive':
      return {
        temperature: 0.7,
        maxTokens: 8192,
        system: PERSONAS.trendForecaster,
        user: `${ctx}

The user is doing a product-specific trend deep dive. Context:

"${input.input}"

${input._webResearch ? `
═══ REAL-TIME WEB RESEARCH (sourced from current fashion press & industry data) ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
═══════════════════════════════════════════════════════════════════════════════════
USE THIS RESEARCH as your primary source of evidence. Cross-reference with your knowledge to produce expert analysis.
` : ''}
Identify 4-5 specific MICRO-TRENDS relevant to this product category and market. These should be design-level details, not macro shifts.

ANALYSIS FRAMEWORK (for each micro-trend):
1. THE DETAIL — What specific design element, material, construction, or finish is gaining traction?
2. ORIGIN — Where did it start? (Runway → street? Street → runway? Subculture → mainstream?)
3. ADOPTION MAP — Which brands at which price tiers are adopting it? (Luxury first? Contemporary first? Streetwear first?)
4. EXECUTION GUIDE — How would a designer execute this? Specific materials, techniques, proportions, color applications
5. SHELF LIFE — How many seasons does this micro-trend have? Is it a flash (1 season), wave (2-3 seasons), or fundamental shift?

${QUALITY_GATES.trendSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Micro-Trend Name (2-4 words)",
      "desc": "80-120 words: the specific detail, origin, adoption map with named brands, execution guide with named materials/techniques, shelf life assessment",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    case 'trends-live-signals':
      return {
        temperature: 0.75,
        maxTokens: 8192,
        system: PERSONAS.trendForecaster,
        user: `${ctx}

The user wants to know what is trending — live cultural and style signals that could inform their collection.

Categories/context: "${input.input}"

${input._webResearch ? `
═══ REAL-TIME WEB RESEARCH (sourced from current social media, press & trend reports) ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
═══════════════════════════════════════════════════════════════════════════════════════════
THIS IS REAL, CURRENT DATA. Use it as your primary source. These are actual signals happening right now.
` : ''}
Identify 4-5 LIVE SIGNALS — things happening across social media, street style, pop culture, or retail that are relevant to fashion.

ANALYSIS FRAMEWORK (for each signal):
1. THE SIGNAL — What specifically is happening? (Not "X is popular" but "X started appearing on TikTok after Y event/person/moment")
2. VELOCITY — How fast is it spreading? Is it niche-viral or mass-viral?
3. PLATFORM MAP — Where is it strongest? (TikTok = speed, Instagram = aspiration, Pinterest = intent, Street style = credibility)
4. PRODUCT TRANSLATION — How does this cultural signal translate into a physical product decision? (Color, silhouette, detail, material, styling)
5. RISK ASSESSMENT — Flash-in-the-pan (< 3 months) vs. sustained signal (6+ months)? Safe to develop product around, or only useful for marketing/content?

${QUALITY_GATES.trendSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Signal Name (2-4 words)",
      "desc": "80-120 words: what's happening, where/who is driving it, velocity assessment, specific product translation, risk assessment",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    case 'trends-competitors':
      return {
        temperature: 0.7,
        maxTokens: 8192,
        system: `${PERSONAS.trendForecaster}

You also have deep competitive intelligence expertise — you analyze brands not just aesthetically but strategically: their positioning, pricing architecture, trend adoption speed, and market gaps.`,
        user: `${ctx}

The user wants competitive intelligence on these reference/competitor brands:

"${input.input}"

${input._webResearch ? `
═══ REAL-TIME WEB RESEARCH (sourced from current industry data & brand analysis) ═══
${input._webResearch}
${input._sources ? `Sources: ${input._sources}` : ''}
═══════════════════════════════════════════════════════════════════════════════════════
USE THIS RESEARCH as your primary source. It contains real, current data about these brands.
` : ''}

For each brand or the group as a whole, provide STRATEGIC insights — not descriptions.

ANALYSIS FRAMEWORK:
1. POSITIONING MATRIX — Where does this brand sit on the axes of price (accessible ↔ luxury) and aesthetic (classic ↔ avant-garde)?
2. TREND STRATEGY — How fast do they adopt trends? Do they lead, follow, or deliberately ignore? What's their innovation cadence?
3. PRICE ARCHITECTURE — What's their actual price range? How do they structure good/better/best? What's their entry point product?
4. GAP ANALYSIS — What is this brand NOT doing that the market wants? Where is the white space between competitors?
5. LESSON — What specific, actionable lesson should the user take from this brand for their own collection?

${QUALITY_GATES.trendSpecificity}
${QUALITY_GATES.antiGeneric}
${OUTPUT_RULES}

Return:
{
  "results": [
    {
      "title": "Insight Title (2-4 words — the strategic takeaway)",
      "desc": "80-120 words: positioning, trend strategy, pricing, gap analysis, and one specific actionable lesson for the user's collection",
      "relevance": "high" or "medium"
    }
  ]
}`,
      };

    default:
      return null;
  }
}
