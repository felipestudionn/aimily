/**
 * Marketing Block — Prompt Templates Registry
 *
 * 12 prompt templates for the Marketing & Digital block.
 * All use {{placeholders}} resolved by renderPrompt() from prompt-context.ts.
 */

export interface PromptTemplate {
  /** Model to use: 'gemini' | 'claude' */
  model: 'gemini' | 'claude';
  system: string;
  user: string;
}

export const MARKETING_PROMPTS = {
  // ─── P1-T1: Stories ───

  stories_generate: {
    model: 'gemini' as const,
    system: `You are a senior fashion creative director specializing in collection storytelling and editorial narratives.

Your task is to organize a fashion collection's SKUs into cohesive STORIES — narrative groupings that will drive all content creation (photography, video, copy, social media).

Each story should feel like a mini-collection within the collection: a mood, a world, a customer moment.`,
    user: `INPUT CONTEXT:
- Season: {{season}}
- Brand DNA:
  - Name: {{brand_name}}
  - Voice/Tone: {{brand_voice_tone}}
  - Personality: {{brand_voice_personality}}
  - Values: {{brand_values}}
- Creative Vision:
  - Vibe: {{collection_vibe}}
  - Consumer Profile: {{consumer_demographics}} / {{consumer_psychographics}} / {{consumer_lifestyle}}
  - Selected Trends: {{selected_trends}}
  - Moodboard Analysis: {{moodboard_summary}}
- Reference Brands: {{reference_brands}}

SKUS TO GROUP ({{sku_count}} total):
{{sku_list_json}}
Each SKU has: name, family, subcategory, colorway, price, type (REVENUE/IMAGE/ENTRY), novelty (NEWNESS/CARRY_OVER)

{{#if user_direction}}
USER DIRECTION: {{user_direction}}
{{/if}}

RULES:
1. Create 3-5 stories (fewer if collection is small, more if diverse)
2. Every SKU must be assigned to exactly one story
3. Each story must have a mix of product types when possible (not all IMAGE in one story)
4. Stories should have commercial logic — not just aesthetic (a story must be shoppable)
5. Names should be evocative but brand-aligned (not generic like "Story 1")
6. Consider the season and trends when defining moods

OUTPUT (JSON only):
{
  "stories": [
    {
      "name": "Story Name",
      "narrative": "2-3 sentence editorial narrative describing this world",
      "mood": ["keyword1", "keyword2", "keyword3"],
      "tone": "Description of visual/verbal tone for content creation",
      "color_palette": ["dominant colors in this story"],
      "sku_ids": ["sku-id-1", "sku-id-2"],
      "hero_sku_id": "The SKU that best represents this story",
      "content_direction": "Brief direction for photography/video for this story"
    }
  ],
  "rationale": "Why this grouping makes commercial and creative sense"
}`,
  },

  stories_assist: {
    model: 'gemini' as const,
    system: `You are a senior fashion creative director. The user has provided direction for how they want their collection stories grouped. Adjust your proposals to match their vision while maintaining commercial viability.`,
    user: `INPUT CONTEXT:
- Season: {{season}}
- Brand: {{brand_name}} — {{brand_voice_personality}}
- Vibe: {{collection_vibe}}

SKUS ({{sku_count}} total):
{{sku_list_json}}

USER DIRECTION (MANDATORY — follow this closely):
{{user_direction}}

RULES:
1. Follow user direction as primary guide
2. Every SKU must be assigned to exactly one story
3. Maintain commercial logic

OUTPUT (JSON only):
{
  "stories": [
    {
      "name": "Story Name",
      "narrative": "2-3 sentence editorial narrative",
      "mood": ["keyword1", "keyword2", "keyword3"],
      "tone": "Visual/verbal tone",
      "color_palette": ["dominant colors"],
      "sku_ids": ["sku-id-1", "sku-id-2"],
      "hero_sku_id": "Hero SKU id",
      "content_direction": "Photography/video direction"
    }
  ],
  "rationale": "Why this grouping works"
}`,
  },

  // ─── P1-T4: Content Strategy ───

  pillars_generate: {
    model: 'claude' as const,
    system: `You are a brand strategist defining the editorial voice and content pillars for a fashion brand's marketing.`,
    user: `BRAND CONTEXT:
- Name: {{brand_name}}
- DNA: Voice tone={{brand_voice_tone}}, Personality={{brand_voice_personality}}, Values={{brand_values}}
- Target Consumer: {{consumer_demographics}} / {{consumer_psychographics}} / {{consumer_lifestyle}}
- Collection Vibe: {{collection_vibe}}
- Season: {{season}}

STORIES DEFINED:
{{#each stories}}
- "{{name}}": {{narrative}} — Mood: {{mood}}
{{/each}}

REFERENCE BRANDS: {{reference_brands}}
SELECTED TRENDS: {{selected_trends}}

{{#if user_direction}}
USER DIRECTION: {{user_direction}}
{{/if}}

TASK:
1. Define 3-5 CONTENT PILLARS — recurring themes that anchor all content
2. Define BRAND VOICE GUIDELINES — how the brand speaks
3. Define TONE VARIATIONS per story — same voice, different tone

OUTPUT (JSON only):
{
  "content_pillars": [
    {
      "name": "Pillar Name",
      "description": "What this pillar covers",
      "examples": ["Example post topic", "Example email angle"],
      "stories_alignment": ["Which stories this pillar maps to"]
    }
  ],
  "brand_voice": {
    "personality": "3-5 adjective description",
    "tone": "Overall tone description",
    "do": ["Writing style rules to follow"],
    "dont": ["Things to avoid"],
    "vocabulary": ["Key words/phrases to use"],
    "example_caption": "A sample social media caption in this voice"
  },
  "story_tones": [
    {
      "story_name": "Story Name",
      "tone_variation": "How voice adapts for this story",
      "sample_headline": "Example headline for this story"
    }
  ]
}`,
  },

  product_copy: {
    model: 'claude' as const,
    system: `You are an expert fashion copywriter. Write compelling, on-brand copy.`,
    user: `BRAND VOICE:
- Name: {{brand_name}}
- Tone: {{brand_voice_tone}}
- Personality: {{brand_voice_personality}}
- Keywords to use: {{brand_voice_keywords}}
- Do NOT: {{brand_voice_donot}}
- Target: {{consumer_demographics}} / {{consumer_psychographics}} / {{consumer_lifestyle}}

STORY CONTEXT (this product belongs to "{{story_name}}"):
- Narrative: {{story_narrative}}
- Mood: {{story_mood}}
- Tone for this story: {{story_tone}}

Write a compelling product description for:
Product: {{sku_name}}
Category: {{sku_category}} / Family: {{sku_family}}
Price: \u20AC{{sku_pvp}}
Colorways: {{sku_colorways}}
Materials: {{sku_materials}}
Type: {{sku_type}} (REVENUE/IMAGE/ENTRY)
Designer notes: {{sku_notes}}

Include: headline (max 8 words), short description (2-3 sentences that evoke the story mood), key features as bullet points, materials/care note.
Format as JSON: { "headline": "...", "description": "...", "features": ["..."], "care": "..." }
{{#if extra_instructions}}
Additional instructions: {{extra_instructions}}
{{/if}}`,
  },

  social_templates: {
    model: 'gemini' as const,
    system: `You are a social media strategist for a fashion brand.`,
    user: `BRAND VOICE: {{brand_voice_summary}}
CONTENT PILLARS: {{content_pillars_summary}}

Create social media templates for the "{{story_name}}" story.
Story mood: {{story_mood}}
Story tone: {{story_tone}}
Products in story: {{story_skus_summary}}

Platform: {{platform}}
{{platform_specific_instructions}}

Generate 5 caption templates that:
1. Align with the story's mood and tone
2. Reference content pillars where natural
3. Are ready to use (just swap product specifics)
4. Include hashtag strategy for this story

Format as JSON:
{
  "templates": [
    {
      "type": "product_feature" | "lifestyle" | "behind_the_scenes" | "styling_tip" | "story_narrative",
      "caption": "...",
      "hashtags": ["..."],
      "cta": "...",
      "best_paired_with": "render | lifestyle | editorial | video"
    }
  ],
  "story_hashtag_set": ["Core hashtags for this story"]
}`,
  },

  email_templates: {
    model: 'claude' as const,
    system: `You are an email marketing specialist for fashion brands.`,
    user: `BRAND: {{brand_name}}
VOICE: {{brand_voice_summary}}

Create a {{email_type}} email for the collection launch.
{{#if story_name}}
This email announces the "{{story_name}}" story drop.
Story: {{story_narrative}}
Hero product: {{hero_sku_name}} at \u20AC{{hero_sku_pvp}}
Key products: {{story_skus_summary}}
{{/if}}

Format as JSON: {
  "subject_line": "...",
  "preview_text": "...",
  "heading": "...",
  "body": "...",
  "cta_text": "...",
  "cta_url_placeholder": "..."
}
{{#if extra_instructions}}
Additional instructions: {{extra_instructions}}
{{/if}}`,
  },

  seo_generate: {
    model: 'gemini' as const,
    system: `You are an SEO specialist for fashion e-commerce.`,
    user: `Generate SEO metadata for:
Product: {{sku_name}}
Category: {{sku_category}} / Family: {{sku_family}}
Price: \u20AC{{sku_pvp}}
Brand: {{brand_name}}
Story: "{{story_name}}" \u2014 {{story_narrative}}
Season: {{season}}
Target market: {{consumer_demographics}}

Format as JSON: {
  "meta_title": "... (max 60 chars, include brand + product + key attribute)",
  "meta_description": "... (max 155 chars, compelling + story reference)",
  "alt_text": "... (descriptive for accessibility)",
  "keywords": ["... (10-15 relevant keywords)"],
  "og_title": "... (for social sharing)",
  "og_description": "... (for social sharing)"
}`,
  },

  // ─── P2-T1: GTM ───

  gtm_plan: {
    model: 'gemini' as const,
    system: `You are a senior retail strategist planning a go-to-market calendar for a fashion collection.`,
    user: `COLLECTION CONTEXT:
- Season: {{season}}
- Launch date: {{launch_date}}
- Sales months: {{sales_months}}
- Total sales target: \u20AC{{total_sales_target}}
- Channels: {{channels}}
- Markets: {{markets}}

STORIES & SKUS:
{{#each stories}}
Story "{{name}}": {{narrative}} \u2014 Mood: {{mood}}, Hero: {{hero_sku_id}}
  SKUs: {{sku_ids}}
{{/each}}

PRICING OVERVIEW:
- Price range: \u20AC{{price_min}} - \u20AC{{price_max}}
- Avg price: \u20AC{{price_avg}}

USER INPUT:
- Desired number of drops: {{desired_drops}}
- Any specific dates: {{specific_dates}}

RULES:
1. Each drop should tell a story \u2014 ideally align drops with stories
2. First drop = strongest commercial story (REVENUE-heavy)
3. IMAGE pieces can launch earlier for press/editorial
4. Consider seasonal timing (SS launches Feb-Mar, FW launches Aug-Sep)
5. Spread drops to maintain commercial momentum
6. Each drop needs enough SKUs to feel substantial (min 5-8)

OUTPUT (JSON only):
{
  "drops": [
    {
      "name": "Drop name (evocative)",
      "launch_date": "YYYY-MM-DD",
      "weeks_active": 0,
      "story_alignment": "Which story this drop primarily represents",
      "sku_ids": ["..."],
      "channels": ["DTC", "WHOLESALE"],
      "expected_sales_weight": 0,
      "rationale": "Why this timing and these SKUs"
    }
  ],
  "commercial_actions": [
    {
      "name": "Action name",
      "type": "SALE | COLLAB | CAMPAIGN | SEEDING | EVENT",
      "date": "YYYY-MM-DD",
      "category": "Visibilidad | Posicionamiento | Ventas | Notoriedad",
      "associated_drop": "Drop name or null",
      "description": "What this action involves"
    }
  ],
  "rationale": "Overall strategy explanation"
}`,
  },

  // ─── P2-T2: Content Calendar ───

  calendar_generate: {
    model: 'gemini' as const,
    system: `You are a senior social media strategist creating an editorial content calendar for a fashion brand launch.`,
    user: `BRAND: {{brand_name}}
VOICE: {{brand_voice_summary}}
CONTENT PILLARS: {{content_pillars_list}}

ACTIVE PLATFORMS: {{active_platforms}}

GTM TIMELINE:
{{#each drops}}
- {{name}}: launches {{launch_date}}, story "{{story_alignment}}"
{{/each}}

COMMERCIAL ACTIONS:
{{#each commercial_actions}}
- {{name}} ({{type}}): {{date}}
{{/each}}

STORIES:
{{#each stories}}
- "{{name}}": {{mood}}
{{/each}}

CALENDAR PERIOD: {{start_date}} to {{end_date}}

{{#if user_direction}}
USER DIRECTION: {{user_direction}}
{{/if}}

RULES:
1. Build anticipation: teasing \u2192 reveal \u2192 launch \u2192 sustain
2. Pre-drop: 2-3 weeks of teasing content
3. Drop day: multiple posts across platforms
4. Post-drop: 1-2 weeks of lifestyle, UGC reposts, styling content
5. Mix content types: product, lifestyle, behind-the-scenes, styling tips
6. Use existing social templates as caption base
7. Pair each post with the best asset type
8. Include email sends aligned with drops

OUTPUT (JSON only):
{
  "calendar_entries": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "platform": "instagram | tiktok | pinterest | facebook | email",
      "type": "post | story | reel | email | blog | ad | pr",
      "story_name": "Story this relates to",
      "title": "Internal title",
      "caption": "Full caption text",
      "hashtags": ["..."],
      "asset_suggestion": "Which type of visual to use",
      "campaign_tag": "drop-1-teasing | drop-1-launch | ...",
      "pillar_alignment": "Which content pillar this serves"
    }
  ],
  "weekly_summary": "Overview of content strategy by week"
}`,
  },

  // ─── P2-T3: Paid & Growth ───

  paid_plan: {
    model: 'gemini' as const,
    system: `You are a senior performance marketing strategist for fashion e-commerce.`,
    user: `BRAND: {{brand_name}}
CONSUMER: {{consumer_demographics}} / {{consumer_psychographics}} / {{consumer_lifestyle}}
MARKETS: {{markets}}

BUDGET: \u20AC{{total_paid_budget}}
SALES TARGET: \u20AC{{total_sales_target}}
DESIRED ROAS: {{target_roas}}x

PLATFORMS AVAILABLE: {{active_platforms}}

GTM DROPS:
{{#each drops}}
- {{name}}: {{launch_date}}, story "{{story_alignment}}", expected {{expected_sales_weight}}% of sales
{{/each}}

{{#if user_direction}}
USER DIRECTION: {{user_direction}}
{{/if}}

OUTPUT (JSON only):
{
  "campaigns": [
    {
      "name": "Campaign name",
      "platform": "meta | tiktok | pinterest | google",
      "objective": "awareness | traffic | conversions | retargeting",
      "budget": 0,
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "associated_drop": "Drop name",
      "ad_sets": [
        {
          "name": "Ad set name",
          "audience": "Audience description",
          "creative_type": "render | lifestyle | video | carousel",
          "creative_direction": "What the ad should show"
        }
      ]
    }
  ],
  "budget_split": {
    "by_platform": {},
    "by_phase": { "awareness": 0, "launch": 0, "sustain": 0 }
  },
  "expected_metrics": {
    "impressions": 0,
    "clicks": 0,
    "conversions": 0,
    "roas": 0
  }
}`,
  },

  // ─── P2-T4: Launch ───

  launch_checklist: {
    model: 'gemini' as const,
    system: `You are a launch manager for a fashion brand.`,
    user: `COLLECTION:
- Brand: {{brand_name}}
- Season: {{season}}
- Launch date: {{launch_date}}
- Channels: {{channels}}
- SKUs: {{sku_count}}
- Stories: {{stories_count}}

DROPS PLANNED:
{{#each drops}}
- {{name}}: {{launch_date}}, channels: {{channels}}
{{/each}}

COMMERCIAL ACTIONS:
{{#each commercial_actions}}
- {{name}} ({{action_type}}): {{start_date}}
{{/each}}

CONTENT READINESS:
- Product renders/photos: {{render_count}}
- Videos: {{video_count}}
- Product copy: {{copy_count}} descriptions
- Email templates: {{email_template_count}}
- Calendar entries: {{calendar_entries_count}}

{{#if user_direction}}
USER DIRECTION: {{user_direction}}
{{/if}}

TASK:
Generate a comprehensive pre-launch checklist grouped by category.
Focus on what's still needed based on content readiness counts above.

OUTPUT (JSON only):
{
  "categories": [
    {
      "name": "Category name",
      "items": [
        {
          "task": "Task description",
          "priority": "critical | important | nice_to_have",
          "deadline_days_before_launch": 0,
          "depends_on": "What must be done first"
        }
      ]
    }
  ]
}`,
  },

  post_launch_analysis: {
    model: 'gemini' as const,
    system: `You are a fashion brand analyst reviewing post-launch performance.`,
    user: `COLLECTION: {{brand_name}} {{season}}
LAUNCH DATE: {{launch_date}}

SALES DATA:
{{sales_summary}}

PREDICTIONS VS ACTUAL:
{{predictions_vs_actual}}

STORIES PERFORMANCE:
{{#each stories}}
- "{{name}}": {{story_sales_summary}}
{{/each}}

TASK:
Analyze the launch performance and provide actionable insights.

OUTPUT (JSON only):
{
  "overall_assessment": "...",
  "wins": ["..."],
  "areas_for_improvement": ["..."],
  "story_performance": [
    {
      "story_name": "...",
      "assessment": "...",
      "recommendation": "..."
    }
  ],
  "recommendations_next_season": ["..."]
}`,
  },
} as const satisfies Record<string, PromptTemplate>;

export type MarketingPromptKey = keyof typeof MARKETING_PROMPTS;
