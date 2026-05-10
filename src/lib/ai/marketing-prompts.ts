/**
 * Marketing generator prompts · Sprint D · Action Timeline Engine
 *
 * Six core generators that the Sales Dashboard Action Timeline triggers.
 * Each maps action_type × archetype × channel → tailored AI prompt.
 *
 * All prompts follow:
 *   · brand voice = creative.identity.voice (ANTI-LEAK: use brand_name, never collection_plans.name)
 *   · cost-aware: respect pricing.tiers + production realities
 *   · per-archetype tone (DTC = editorial, Creator = personal, MTO = craft)
 *   · per-channel format (press = MD, creator brief = 8-section, DM = chat)
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md §Sales Dashboard
 */

import type { SalesArchetypeId, SalesChannelId } from '@/types/sales-strategy';

export type MarketingGenerationType =
  | 'press-release'
  | 'creator-brief'
  | 'dm-announcement'
  | 'email-teaser'
  | 'countdown-stories'
  | 'drop-announcement'
  | 'refresh-creative'
  | 'post-launch-check';

export interface MarketingGenerationInput {
  brandName: string;
  brandTagline?: string;
  brandVoice?: string;
  brandPalette?: string;
  consumerProfile?: string;
  collectionVibe?: string;
  archetype: SalesArchetypeId;
  archetypeName: string;
  channels: SalesChannelId[];
  dropName: string;
  dropLaunchDate: string; // ISO YYYY-MM-DD
  dropMechanic?: string;
  topSkus: Array<{
    name: string;
    category: string;
    family: string;
    pvp: number;
    description?: string;
  }>;
  totalSkus: number;
  totalRevenueEur: number;
  language?: 'es' | 'en';
}

export interface MarketingPrompt {
  system: string;
  user: string;
  temperature: number;
  jsonMode: boolean;
}

const PERSONA_BASE = `You are a senior fashion-marketing strategist with 15 years launching contemporary brands across Spain, France, Italy, the UK, and LATAM. You write in the brand's exact voice and tone — never in your own. You ground every output in the actual SKU lineup, the actual drop date, and the actual archetype's economic shape. You never invent facts (no fake press quotes, no false sustainability claims, no fabricated commission rates). You match the channel's native format: press releases in editorial markdown, creator briefs in structured JSON sections, DM scripts as chat-ready short messages.`;

function brandContextBlock(input: MarketingGenerationInput): string {
  return `BRAND CONTEXT (anti-leak: use "${input.brandName}" exactly · never reference collection working titles):
· Name: ${input.brandName}
${input.brandTagline ? `· Tagline: ${input.brandTagline}` : ''}
${input.brandVoice ? `· Voice: ${input.brandVoice}` : ''}
${input.brandPalette ? `· Palette: ${input.brandPalette}` : ''}
${input.consumerProfile ? `· Consumer: ${input.consumerProfile}` : ''}
${input.collectionVibe ? `· Collection vibe: ${input.collectionVibe}` : ''}

DROP CONTEXT:
· Drop name: ${input.dropName}
· Launch date: ${input.dropLaunchDate}
· Archetype: ${input.archetypeName} (${input.archetype})
· Active channels: ${input.channels.join(', ')}
${input.dropMechanic ? `· Drop mechanic: ${input.dropMechanic}` : ''}

TOP SKUS (${input.topSkus.length} of ${input.totalSkus} in this drop):
${input.topSkus
  .slice(0, 8)
  .map(
    (s, i) =>
      `${i + 1}. ${s.name} · ${s.category} · ${s.family} · €${s.pvp}${s.description ? ` · ${s.description}` : ''}`,
  )
  .join('\n')}

TOTAL DROP REVENUE FORECAST: €${Math.round(input.totalRevenueEur).toLocaleString()}`;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 1 · PRESS RELEASE (DTC + MTO archetypes)                                */
/* ─────────────────────────────────────────────────────────────────────── */

function pressReleasePrompt(input: MarketingGenerationInput): MarketingPrompt {
  const archetypeAngle: Record<SalesArchetypeId, string> = {
    A: 'Frame the announcement around brand voice and editorial craft. Position as a curated drop. Avoid creator-led personality angles.',
    B: 'Frame the announcement around the founder personality. Lean into the creator-led story. Quotes from founder allowed (mark with [FOUNDER QUOTE]).',
    C: 'Frame as a craft/atelier moment. Emphasize made-to-order, limited window, lead time as a feature. Quotes from artisan/founder allowed.',
  };

  return {
    system: `${PERSONA_BASE}

You write fashion press releases in editorial Spanish for top-tier press lists (Vogue ES, Elle, Harper's Bazaar, Highxtar, Modaes, BoF España). Tone: confident, declarative, never salesy. 350-450 words. Markdown format.`,
    user: `${brandContextBlock(input)}

ARCHETYPE-SPECIFIC ANGLE: ${archetypeAngle[input.archetype]}

TASK: Write a press release in Spanish (markdown) for this drop with this exact structure:

# [HEADLINE — declarative, max 12 words, no exclamation]
## [SUBHEAD — 18-25 words framing the drop]

[OPENING PARAGRAPH — 60-80 words. Lead with what's distinctive. Cite actual launch date in long form (e.g., "el 14 de febrero de 2027"). Include brand_name once.]

[BODY PARAGRAPH 1 — 80-100 words. Talk about the lineup using 2-3 specific SKUs by name from the top SKUs list. No price quotes unless integral.]

[BODY PARAGRAPH 2 — 70-90 words. Either: archetype A = brand voice + craft details · archetype B = founder/creator persona + audience · archetype C = atelier/oficio + lead time as feature.]

[FOUNDER QUOTE — 25-35 words in quotes, archetype-appropriate. For A use brand voice impersonal. For B/C personal "I" voice. Sign as "— [Founder name placeholder] · founder, ${input.brandName}".]

[CLOSING — 40-60 words. Distribution channels (mention "${input.channels.join(', ')}"). Where to buy. Press contact placeholder ("Para prensa: press@[brand].com").]

Output ONLY the markdown · no preamble or explanation.`,
    temperature: 0.7,
    jsonMode: false,
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 2 · CREATOR BRIEF (TikTok Shop · Creator brand archetype B)             */
/* ─────────────────────────────────────────────────────────────────────── */

function creatorBriefPrompt(input: MarketingGenerationInput): MarketingPrompt {
  return {
    system: `${PERSONA_BASE}

You write affiliate creator briefs that micro-influencers (10K-200K followers) actually use. You know that creator briefs that are too long get ignored. Be tight, specific, copy-paste-ready. Output STRICT JSON.`,
    user: `${brandContextBlock(input)}

TASK: Write an 8-section creator brief in Spanish (JSON) for 10-12 micro-creators promoting this drop on TikTok Shop / Reels.

OUTPUT JSON shape:
{
  "brand_voice_summary": "2-3 sentences capturing the brand's tone — what to mimic and what to avoid",
  "product_story": "3-4 sentences explaining the product family + collection narrative — what creators should communicate",
  "key_talking_points": ["6-8 short bullet talking points · each <15 words · concrete and SKU-specific"],
  "visual_references": "2-3 sentences describing visual style for video (lighting, framing, color palette per brand DNA, music vibe)",
  "hooks": [
    {"hook": "first 3-second hook for vertical video · max 8 words", "use_when": "when to use this hook"},
    {"hook": "second hook variant", "use_when": "..."},
    {"hook": "third hook variant", "use_when": "..."}
  ],
  "commission_terms": {
    "rate_pct": 12,
    "minimum_followers": "10K engaged",
    "exclusivity": "no exclusivity required · multi-brand creators welcome",
    "tracking": "unique affiliate code per creator · auto-attributed via TikTok Shop"
  },
  "posting_schedule": {
    "drop_announcement": "1 video posted on launch day with affiliate link in bio",
    "follow_up": "1-2 videos within first 7 days · LIVE selling session optional in week 2",
    "hashtags": ["array of 5-8 hashtags · brand-specific + trend-aligned"]
  },
  "measurement_framework": {
    "primary_kpi": "GMV via affiliate code · target tier breakdown",
    "tracking_window": "30 days from first post",
    "bonus_tier": "describe bonus structure · e.g. 'extra 5% bonus if creator video drives >€2K GMV in 30d'",
    "report_cadence": "monthly settlement on 15th"
  }
}

Output ONLY valid JSON · no preamble.`,
    temperature: 0.6,
    jsonMode: true,
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 3 · DM ANNOUNCEMENT (Community DM channel)                              */
/* ─────────────────────────────────────────────────────────────────────── */

function dmAnnouncementPrompt(input: MarketingGenerationInput): MarketingPrompt {
  return {
    system: `${PERSONA_BASE}

You write WhatsApp/IG DM scripts that feel personal, not corporate. Short messages (<200 chars per message · most readable size). Spanish ES/LATAM tone. JSON output with multiple variants.`,
    user: `${brandContextBlock(input)}

TASK: Write a Community DM script set for the VIP broadcast list. JSON output:

{
  "teaser_dm": {
    "send_at": "T-7 days from launch",
    "message": "short DM (<150 chars) · creates curiosity · no price · no full SKU details · invites to reply"
  },
  "drop_announcement_dm": {
    "send_at": "Launch day · 09:00 local",
    "message_part1": "first message <150 chars · the news · drop name + signature SKU + 1-line value prop",
    "message_part2": "second message <100 chars · price range or hero SKU price + Bizum/payment link placeholder",
    "message_part3": "third message <80 chars · friction-free CTA · 'Confirma talla y te lo envío hoy'"
  },
  "follow_up_dm": {
    "send_at": "T+24h post-launch",
    "for_engaged_no_purchase": "DM <120 chars · soft re-engagement · sizing help offer",
    "for_purchasers": "DM <100 chars · gracias + tracking placeholder + cross-sell hint"
  },
  "voice_note_script": {
    "duration_seconds": 45,
    "script": "30-50 word natural-sounding script for a personal voice note · sign-off as founder · warm + casual"
  },
  "ig_story_swipe_up_caption": "single line <80 chars to drive IG bio link → WhatsApp DM"
}

Output ONLY valid JSON · no preamble.`,
    temperature: 0.7,
    jsonMode: true,
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 4 · EMAIL TEASER (DTC archetype A)                                      */
/* ─────────────────────────────────────────────────────────────────────── */

function emailTeaserPrompt(input: MarketingGenerationInput): MarketingPrompt {
  return {
    system: `${PERSONA_BASE}

You write fashion email marketing that converts · subject lines tested A/B · clean editorial body · Klaviyo-ready markdown. Spanish ES.`,
    user: `${brandContextBlock(input)}

TASK: Write an email teaser sequence sent T-2 weeks from drop launch. JSON output:

{
  "subject_line_variants": [
    "Variant A — short (<35 chars) · brand-voice focused",
    "Variant B — medium (35-50 chars) · benefit-led",
    "Variant C — curiosity (curiosity gap)"
  ],
  "preview_text": "preview text 80-100 chars complementing the subject · drives open without spoiling",
  "email_body_markdown": "Full email body in markdown. Structure: hero headline (## level) · 2-3 paragraph body weaving 2-3 specific SKU names from top SKUs · single CTA button text · short P.S. · sign-off with brand_name. ~250-350 words.",
  "cta_button_text": "max 4 words · imperative · brand voice (not generic 'Shop Now')",
  "send_at": "T-14 days · 10:00 local",
  "segment": "VIP list + repeat customers (90d window)"
}

Output ONLY valid JSON · no preamble.`,
    temperature: 0.7,
    jsonMode: true,
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 5 · COUNTDOWN STORIES (DTC + Creator archetypes)                        */
/* ─────────────────────────────────────────────────────────────────────── */

function countdownStoriesPrompt(input: MarketingGenerationInput): MarketingPrompt {
  return {
    system: `${PERSONA_BASE}

You design 5-day IG/TikTok Story countdown sequences. Each frame is short copy (<80 chars) + a visual brief (what to show). Spanish ES. JSON output.`,
    user: `${brandContextBlock(input)}

TASK: Design a 5-day countdown sequence (T-5 to T-1) culminating in the drop launch. JSON output:

{
  "days": [
    {
      "day_offset": -5,
      "post_at": "10:00 local",
      "frame_copy": "<80 chars Story copy · build anticipation · no full reveal",
      "visual_brief": "what to show on screen · 2-3 sentences · framing, lighting, focus subject (SKU detail crop, brand color block, etc.)",
      "sticker_overlay": "countdown sticker text · '${input.dropName} · 5 días'"
    },
    {
      "day_offset": -4,
      "post_at": "...",
      "frame_copy": "...",
      "visual_brief": "...",
      "sticker_overlay": "..."
    },
    "... 5 days total ..."
  ],
  "swipe_up_destination": "where the swipe-up goes for each day (e.g. 'newsletter signup days -5/-4 · drop product page days -3/-2 · drop announcement post day -1')",
  "music_recommendation": "1 specific track suggestion (genre + mood · not a real song name to avoid copyright)",
  "color_palette_for_overlays": "use brand palette · 3 specific hex codes from brand DNA"
}

Output ONLY valid JSON · no preamble.`,
    temperature: 0.7,
    jsonMode: true,
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 6 · DROP ANNOUNCEMENT (multi-channel orchestrator · Día 0 default)      */
/* ─────────────────────────────────────────────────────────────────────── */

function dropAnnouncementPrompt(input: MarketingGenerationInput): MarketingPrompt {
  return {
    system: `${PERSONA_BASE}

You write drop-day multi-channel announcement scripts that ship simultaneously across the brand's active surfaces. Each surface gets its own native format (storefront banner short · IG/TikTok caption + visual brief · email subject + body short · paid ad headline). Spanish ES. Output STRICT JSON.`,
    user: `${brandContextBlock(input)}

TASK: Write a drop-day multi-channel announcement that goes live on the launch date across all active channels. JSON output:

{
  "storefront_banner": {
    "headline": "max 8 words · top of homepage / hero overlay",
    "subhead": "12-18 words · drop name + 1-line value prop",
    "cta_label": "max 3 words · 'Compra ya' style"
  },
  "ig_post": {
    "caption_first_line": "first line / hook · max 12 words · stop-the-scroll",
    "caption_body": "60-90 words · brand voice · mentions 2 specific SKUs by name · ends with affiliate/CTA hashtag · 4-6 hashtags",
    "visual_brief": "2-3 sentences · what to show in the carousel/reel · framing, lighting, model direction",
    "post_at": "Launch day · 09:00 local"
  },
  "tiktok_post": {
    "video_hook_3s": "first 3 seconds · stop-the-scroll text overlay",
    "video_caption": "30-60 words · vertical video friendly · trend audio direction · 4-6 hashtags",
    "visual_brief": "what to show in 15-30s vertical · brand voice match"
  },
  "email_blast": {
    "subject": "max 50 chars · launch day excitement · brand voice",
    "preview_text": "max 90 chars complementing subject",
    "body_short_md": "150-200 words markdown · single hero CTA · sign with brand_name"
  },
  "press_snippet": {
    "for_pickup": "30-50 word snippet ready to drop into press releases for last-minute pickup · cite drop name + launch date"
  },
  "send_sequence": [
    "06:00 — internal team confirmation",
    "08:00 — storefront banner goes live + email blast scheduled",
    "09:00 — IG carousel + TikTok video published simultaneously",
    "12:00 — paid social ads activated (if applicable)",
    "18:00 — first sellthrough check"
  ]
}

Output ONLY valid JSON · no preamble.`,
    temperature: 0.65,
    jsonMode: true,
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 7 · REFRESH CREATIVE WAVE (T+30 second wave)                            */
/* ─────────────────────────────────────────────────────────────────────── */

function refreshCreativePrompt(input: MarketingGenerationInput): MarketingPrompt {
  return {
    system: `${PERSONA_BASE}

You design second-wave creative refreshes 30 days post-drop. The first content wave has fatigue · you propose 3 new creative angles + content briefs per top SKU + paid amplification recs + email re-engagement template. Spanish ES. JSON output.`,
    user: `${brandContextBlock(input)}

TASK: Write a T+30 refresh creative wave plan to re-energize sellthrough. JSON output:

{
  "diagnosis": "2-3 sentences · what the first wave did well + where fatigue likely set in (assume top SKUs sold through faster than tail)",
  "refresh_angles": [
    {"angle": "first new creative angle · 1 sentence", "why": "why this angle re-engages", "ig_post_hook": "hook for IG", "tiktok_hook": "hook for TikTok"},
    {"angle": "second angle", "why": "...", "ig_post_hook": "...", "tiktok_hook": "..."},
    {"angle": "third angle", "why": "...", "ig_post_hook": "...", "tiktok_hook": "..."}
  ],
  "content_per_top_sku": [
    {"sku_name": "first top SKU", "refresh_brief": "specific re-shoot or re-angle direction · 1-2 sentences"},
    {"sku_name": "second top SKU", "refresh_brief": "..."},
    {"sku_name": "third top SKU", "refresh_brief": "..."}
  ],
  "paid_amplification": {
    "what_to_boost": "which posts/videos from wave 1 to boost · which new wave 2 creative · which audience segments to retarget",
    "estimated_budget_pct_of_drop_revenue": "recommendation · e.g. '3-5% of drop revenue · diminishing returns >7%'",
    "platforms": ["primary platform", "secondary platform"]
  },
  "email_re_engagement": {
    "segment": "audience segment to re-engage · e.g. 'opened email 1 but didn't purchase' or 'browsed PDP but no add-to-cart'",
    "subject_line": "max 50 chars · curiosity or social proof",
    "body_md_short": "100-150 words markdown · soft re-engagement · single CTA"
  },
  "next_milestone": "1-2 sentences · what to watch for week 5+ and signal to plan next drop"
}

Output ONLY valid JSON · no preamble.`,
    temperature: 0.7,
    jsonMode: true,
  };
}

/* ─────────────────────────────────────────────────────────────────────── */
/* 8 · POST-LAUNCH CHECK (deterministic · NO AI)                           */
/* ─────────────────────────────────────────────────────────────────────── */

// post-launch-check is computed deterministically in the endpoint
// (no AI prompt) — it compares actual revenue to Gauss expected curve
// and returns a recommendation engine output.

/* ─── Dispatcher ──────────────────────────────────────────────────────── */

export function buildMarketingPrompt(
  type: MarketingGenerationType,
  input: MarketingGenerationInput,
): MarketingPrompt | null {
  switch (type) {
    case 'press-release':
      return pressReleasePrompt(input);
    case 'creator-brief':
      return creatorBriefPrompt(input);
    case 'dm-announcement':
      return dmAnnouncementPrompt(input);
    case 'email-teaser':
      return emailTeaserPrompt(input);
    case 'countdown-stories':
      return countdownStoriesPrompt(input);
    case 'drop-announcement':
      return dropAnnouncementPrompt(input);
    case 'refresh-creative':
      return refreshCreativePrompt(input);
    case 'post-launch-check':
      return null; // deterministic, no AI
    default:
      return null;
  }
}

/* ─── Action type → generator type mapping ──────────────────────────── */

/**
 * Maps an Action Timeline station (action_type + archetype + active channels)
 * to the right generator. Returns null if no generator matches (button disabled).
 */
export function dispatchGenerator(
  action_type: string,
  archetype: SalesArchetypeId,
  channels: SalesChannelId[],
): MarketingGenerationType | null {
  // T-6 sem · Editorial press push (all archetypes that benefit from press)
  if (action_type === 'editorial_press' || action_type === 'press_release') {
    return 'press-release';
  }

  // T-3 sem · varies by archetype + channels
  if (action_type === 'creator_brief' || (action_type.includes('creator') && channels.includes('tiktok_shop'))) {
    return 'creator-brief';
  }

  if (action_type === 'email_teaser' || (action_type.includes('email') && archetype === 'A')) {
    return 'email-teaser';
  }

  // T-1 sem · Countdown IG Stories
  if (action_type === 'ig_story_countdown' || action_type.includes('countdown')) {
    return 'countdown-stories';
  }

  // Drop announcement · DM if community_dm channel active
  if (action_type === 'drop_announcement' && channels.includes('community_dm')) {
    return 'dm-announcement';
  }

  // T+7 · Post-launch performance
  if (action_type === 'post_launch_check' || action_type.includes('post_launch') || action_type.includes('performance')) {
    return 'post-launch-check';
  }

  // Multi-purpose: if archetype B with TikTok Shop, default to creator brief
  if (archetype === 'B' && channels.includes('tiktok_shop')) {
    return 'creator-brief';
  }

  // Default for DTC: press release
  if (archetype === 'A') return 'press-release';

  return null;
}
