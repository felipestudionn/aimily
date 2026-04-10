/**
 * Content Guides — reusable prompt fragments for marketing content generation.
 *
 * These constants are concatenated into prompt templates in marketing-prompts.ts.
 * Text-only (no placeholders) so they can be consumed verbatim via string
 * concatenation in any prompt.
 *
 * Sources: distilled from installed marketing skills (social-content,
 * copywriting, ad-creative, email-sequence, launch-strategy). See
 * marketing-expert-audit.md for the full audit that produced these.
 */

/**
 * Hook formulas taxonomy — 4 categories with example patterns.
 *
 * Consumed by: social_templates, calendar_generate, paid_plan, email_sequence.
 *
 * Enforces that generated content diversifies hook types across a set,
 * preventing the "5 variations of the same hook" failure mode.
 */
export const HOOK_FORMULAS_GUIDE = `HOOK TYPES (use one per content piece, diversify across sets):

1. CURIOSITY — Make them click to satisfy a question
   - "I was wrong about [common belief]"
   - "The real reason [outcome] happens isn't what you think"
   - "[Impressive result] — and it only took [surprisingly short time]"

2. STORY — Pull them into a narrative
   - "Last week, [unexpected thing] happened"
   - "I almost [big mistake/failure]"
   - "3 years ago I [past state]. Today [current state]"

3. VALUE — Promise specific utility
   - "How to [desirable outcome] (without [common pain])"
   - "[Number] [things] that [outcome]"
   - "Stop [common mistake]. Do this instead"

4. CONTRARIAN — Challenge conventional wisdom
   - "Unpopular opinion: [bold statement]"
   - "[Common advice] is wrong. Here's why"
   - "I stopped [common practice] and [positive result]"

DIVERSITY RULE: When generating N content pieces, include at least 3 different hook types across the set. Never 5 pieces of the same hook category.`;

/**
 * Core copywriting principles — clarity, specificity, active voice, honest claims.
 *
 * Consumed by: product_copy, email_templates, social_templates, paid_plan.
 */
export const COPYWRITING_PRINCIPLES = `COPYWRITING PRINCIPLES (apply to every line):

1. CLARITY OVER CLEVERNESS — If a reader has to re-read, you failed. Lead with the point.
2. SPECIFICITY OVER ABSTRACTION — "Cuts drying time from 20 to 4 minutes" beats "dries faster".
   Numbers, sensory details, concrete outcomes. Never vague.
3. BENEFITS OVER FEATURES — Features describe what the product is; benefits describe what
   changes for the reader. Lead with the change.
4. ACTIVE VOICE — "We ship in 24 hours" not "Orders are shipped within 24 hours".
5. CUSTOMER LANGUAGE — Use the words the customer uses in their DMs and reviews, not
   the words the brand uses in its mission statement.
6. HONEST CLAIMS — No fabricated superlatives. No generic buzzwords: "elevate", "curate",
   "versatile", "timeless", "effortless", "essential", "seamless", "innovative".
7. NO EXCLAMATION POINTS — Confidence doesn't need to shout.`;

/**
 * Owned / Rented / Borrowed framework — classifies every marketing touchpoint
 * by channel control. Consumed by: gtm_plan, launch_checklist, calendar_generate.
 */
export const ORB_FRAMEWORK_GUIDE = `ORB FRAMEWORK (apply to every touchpoint):

- OWNED: channels you control completely (email list, your website, in-app, in-store).
  Compound value, direct relationship, no algorithm risk. These channels get better
  over time because you control them.

- RENTED: platforms where you have presence but not control (Instagram, TikTok,
  Pinterest, paid ads, YouTube). Reach and speed, but algorithm-dependent. Can
  disappear overnight if the platform changes its rules.

- BORROWED: someone else's audience (press, influencers, wholesale partners,
  collaborations, podcast guest spots). Instant credibility but requires ongoing
  outreach to maintain access.

Every marketing touchpoint must classify into one of these three layers. The
strategic goal of any BORROWED or RENTED activity is ultimately to flow users
into OWNED relationships — newsletter signups, accounts, purchases.`;
