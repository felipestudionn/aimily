import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { normalizeAiError } from '@/lib/ai/error-messages';

/**
 * Investigación de Mercado · Suggest Input
 *
 * Per-lens ficha pre-fill. Each of the four lenses (global / deep /
 * live / competitors) carries a small ficha that this endpoint pre-
 * populates from upstream CIS (moodboard analysis + consumer profile).
 * The user lands with editable chips already in place — they trim,
 * extend, or just hit "Start" and get the research cards back.
 *
 * Lens shapes:
 *   global       → { focus: string[] }                    categories or product types to scan
 *   deep         → { topic: string, aspects: string[] }   single deep-dive theme + sub-aspects
 *   live         → { focus: string[] }                    cultural moments / accounts / cities
 *   competitors  → { brands: string[] }                   mix of aspirational + direct competitors
 */

type Lens = 'global' | 'deep' | 'live' | 'competitors';

interface GlobalShape { focus: string[]; }
interface DeepShape { topic: string; aspects: string[]; }
interface LiveShape { focus: string[]; }
interface CompetitorsShape { brands: string[]; }

const SYSTEM = `You are a fashion market researcher. From the upstream creative context (moodboard analysis + consumer profile), you propose the STARTING POINT for a market research lens. Suggestions are editorial, lowercase, concrete (real product types / real proper nouns / real cultural moments).

Quality rules:
- Real proper nouns over abstractions. "Bias-cut slip dress" beats "fluid silhouette".
- For competitors: mix tier-aspirational brands the consumer wears with 2-3 brands at her actual buying tier (direct competitors). Don't just repeat wearsBrands verbatim.
- For live signals: cultural moments / hashtags / reference accounts that are happening NOW, anchored to the consumer's reads + cities.
- For deep dives: pick the single trend from the moodboard most actionable for this collection. The aspects are sub-areas to explore.
- Forbidden words: elevate · curate · versatile · timeless · effortless · essential.
Return ONLY valid JSON, no markdown wrapping.`;

const LANG_INSTRUCTION_ES = '\n\nIMPORTANT: Respond entirely in Spanish (Castilian). Strings should read natural in Spanish.';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const { collectionPlanId, lens, language } = body as { collectionPlanId?: string; lens?: Lens; language?: 'en' | 'es' };

    if (!collectionPlanId) return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    if (!lens || !['global', 'deep', 'live', 'competitors'].includes(lens)) {
      return NextResponse.json({ error: 'lens is required (global|deep|live|competitors)' }, { status: 400 });
    }

    const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
    if (!ownership.authorized) return ownership.error;

    const ctx = await loadFullContext(collectionPlanId);

    const haveAnyUpstream = Boolean(
      (ctx.moodboard && ctx.moodboard.trim().length > 20) ||
      (ctx.consumer && ctx.consumer.trim().length > 20),
    );
    if (!haveAnyUpstream) {
      const empty: Record<Lens, unknown> = {
        global: { focus: [] },
        deep: { topic: '', aspects: [] },
        live: { focus: [] },
        competitors: { brands: [] },
      };
      return NextResponse.json(empty[lens]);
    }

    const collectionLine = [
      ctx.collectionName ? `Collection: ${ctx.collectionName}` : '',
      ctx.season ? `Season: ${ctx.season}` : '',
    ].filter(Boolean).join(' · ');

    const upstream = [
      ctx.moodboard ? `MOODBOARD ANALYSIS:\n${ctx.moodboard}` : '',
      ctx.consumer ? `CONSUMER PROFILE:\n${ctx.consumer}` : '',
    ].filter(Boolean).join('\n\n');

    let userPrompt = '';
    if (lens === 'global') {
      userPrompt = `${collectionLine}\n\n${upstream}\n\nPropose 3-5 PRODUCT CATEGORIES or PIECE TYPES this brand should pay close attention to when scanning macro fashion trends for ${ctx.season || 'this season'}. These are areas where macro-trend coverage will move the collection most. Examples: "tailoring", "bias-cut slips", "leather outerwear", "knit dressing", "footwear silhouettes".\n\nReturn JSON:\n{ "focus": ["category 1", "category 2", ...] }`;
    } else if (lens === 'deep') {
      userPrompt = `${collectionLine}\n\n${upstream}\n\nFrom the moodboard, identify the SINGLE trend that deserves a deep-dive analysis for this collection. The most likely to drive specific design moves. Then propose 2-4 sub-aspects to explore within that trend (e.g. for "Deconstructed Suiting" → "exaggerated shoulder lines", "raw-edge lapels", "powder palette").\n\nReturn JSON:\n{ "topic": "the single deep-dive trend (3-7 words)", "aspects": ["aspect 1", "aspect 2", ...] }`;
    } else if (lens === 'live') {
      userPrompt = `${collectionLine}\n\n${upstream}\n\nPropose 3-5 cultural moments, accounts, hashtags, or city scenes that the consumer's feed is most likely to surface RIGHT NOW. Anchor to her reads and her cities. Real proper nouns. Examples: "@emilisindlev", "Tribeca gallery openings", "tabi flat moment", "Phoebe Philo return".\n\nReturn JSON:\n{ "focus": ["signal 1", "signal 2", ...] }`;
    } else {
      // competitors
      userPrompt = `${collectionLine}\n\n${upstream}\n\nPropose 4-6 brands to analyze competitively. Mix:\n- 2-3 of the consumer's aspirational brands (the ones she'd wear at higher tier — pull from her wearsBrands)\n- 2-3 direct competitors at the brand's actual buying tier (similar price point, similar consumer, NOT the aspirational ones)\nReturn real brand names only. No descriptions, just names.\n\nReturn JSON:\n{ "brands": ["Brand 1", "Brand 2", ...] }`;
    }

    const system = language === 'es' ? SYSTEM + LANG_INSTRUCTION_ES : SYSTEM;

    const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim().length > 0).map((x) => (x as string).trim()) : [];
    const str = (v: unknown): string => typeof v === 'string' ? v.trim() : '';

    if (lens === 'global' || lens === 'live') {
      const { data } = await generateJSON<GlobalShape | LiveShape>({
        system, user: userPrompt, temperature: 0.6, maxTokens: 800, language,
      });
      const out = { focus: arr(data.focus) };
      console.log(`[ResearchSuggestInput:${lens}] result:`, { count: out.focus.length });
      return NextResponse.json(out);
    }

    if (lens === 'deep') {
      const { data } = await generateJSON<DeepShape>({
        system, user: userPrompt, temperature: 0.6, maxTokens: 1000, language,
      });
      const out: DeepShape = { topic: str(data.topic), aspects: arr(data.aspects) };
      console.log('[ResearchSuggestInput:deep] result:', { topicLen: out.topic.length, aspectsCount: out.aspects.length });
      return NextResponse.json(out);
    }

    // competitors
    const { data } = await generateJSON<CompetitorsShape>({
      system, user: userPrompt, temperature: 0.6, maxTokens: 800, language,
    });
    const out: CompetitorsShape = { brands: arr(data.brands) };
    console.log('[ResearchSuggestInput:competitors] result:', { count: out.brands.length });
    return NextResponse.json(out);
  } catch (error) {
    console.error('[ResearchSuggestInput] error', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus },
    );
  }
}
