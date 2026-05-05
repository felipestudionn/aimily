/* SEO module prompts · keep them small + composable */

export function keywordsPrompt(brandName: string, season: string, families: string[], audience: string): string {
  return `You are a senior SEO strategist for fashion brands.

Brand: ${brandName}
Season: ${season || 'current'}
Families: ${families.join(', ') || 'fashion'}
Target audience: ${audience.slice(0, 400)}

Generate 18 high-intent keywords this brand should rank for. Mix:
- 6 transactional (buy intent: "buy <product>", "<product> shop")
- 6 informational (research intent: "how to style <product>", "<product> trends 2026")
- 6 brand+category combos ("<brand> + <product>" variants)

For each keyword return:
- term: the keyword phrase (lowercase, 2-6 words, fashion-natural)
- intent: "transactional" | "informational" | "brand"
- difficulty_hint: "low" | "medium" | "high" (based on commercial intent + brand strength)
- rationale: 1 sentence on why this brand should target it

Return JSON: { keywords: [{ term, intent, difficulty_hint, rationale }] }
NO commentary outside the JSON.`;
}

export function onpagePrompt(
  brandName: string,
  page: string,
  pageContext: string,
  voice: string,
): string {
  return `You write on-page SEO for fashion storefronts.

Brand: ${brandName}
Page: ${page}
Voice: ${voice.slice(0, 200)}
Page context: ${pageContext.slice(0, 600)}

Generate SEO copy for this page:
- meta_title: 50-60 chars, brand at end, includes primary keyword naturally
- meta_description: 140-160 chars, persuasive, ends with soft CTA
- og_title: same as meta_title or shorter punchier variant
- og_description: same as meta_description but social-tone (1st person OK)
- h1: 40-60 chars, the page's display headline (not the same as meta_title)
- image_alt_pattern: a {placeholder}-style template for alt text on this page's images

Return JSON: { meta_title, meta_description, og_title, og_description, h1, image_alt_pattern }
NO commentary.`;
}

export function competitorsPrompt(brandName: string, families: string[]): string {
  return `You are an SEO competitive analyst for fashion brands.

Brand: ${brandName}
Categories: ${families.join(', ')}

Identify 5-7 brands ranking in Google for queries this brand should target.
For each return:
- name: brand name
- url: their domain (best guess if unknown)
- estimated_traffic_tier: "small" | "medium" | "large"
- ranking_keywords_sample: 3 keywords they likely rank for
- content_strengths: 1 sentence on their SEO strategy strengths
- gaps_for_us: 1 sentence on opportunities the user's brand could capture

Return JSON: { competitors: [...] }
NO commentary.`;
}

export function copyPrompt(brandName: string, voice: string, skuName: string, skuDescription: string, family: string): string {
  return `You write SEO-optimized product descriptions for fashion brands.

Brand: ${brandName}
Voice: ${voice.slice(0, 200)}
Product: ${skuName}
Family: ${family}
Current description: ${skuDescription.slice(0, 400) || '(none yet)'}

Rewrite as a 60-90 word SEO product description that:
- Front-loads the primary keyword (product type) in the first sentence
- Includes a sensory hook (texture, fit, material) within 20 words
- Mentions an occasion or styling moment
- Ends with a soft why-buy line (not pushy)
- Matches the brand voice exactly — never generic

Return JSON: { description, primary_keyword, secondary_keywords (array of 3), suggested_meta_title, suggested_meta_description }
NO commentary.`;
}
