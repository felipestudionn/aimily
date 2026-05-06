import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { normalizeAiError } from '@/lib/ai/error-messages';

/**
 * Consumer · Suggest Input — pre-fills the entry phase from prior CIS
 * (mainly the moodboard analysis) so the user never starts from a blank
 * slate. Output is a single suggestion shape:
 *   { gender, reference }
 *
 * The caller (ConsumerContent) calls this once on mount when no consumer
 * proposals exist yet AND no gender is set. If there is no moodboard
 * data, returns nulls — caller falls back to fully empty entry.
 *
 * The actual proposal generation still goes through creative-generate
 * with type='consumer-proposals'. This endpoint only seeds the INPUT.
 */

interface SuggestionResponse {
  gender: 'women' | 'men' | 'unisex' | 'mixed' | null;
  ageRange: string;       // "28-45"
  cities: string[];       // neighborhoods + cities the consumer lives in
  wearsBrands: string[];  // brands she owns / wears
  shopsAt: string[];      // stores she actually buys from
  reads: string[];        // accounts / publications / blogs she follows
  values: string[];       // what she cares about (craftsmanship, sustainability)
  lifestyle: string[];    // concrete lifestyle markers (galleries, dinner parties)
  reference: string;      // single editorial summary sentence
}

const SYSTEM = `You are a fashion creative director. From a moodboard analysis you extract a STRUCTURED consumer profile.

You return JSON with these fields:
- gender — one of "women", "men", "unisex", "mixed". Most defensible single value, or "unisex" if truly ambiguous.
- ageRange — short range like "28-45" or "30-40". Editorial, not marketing-clean.
- cities — array of cities/neighborhoods (e.g. "NYC Tribeca", "London Shoreditch"). 3-6 items. Real places, never generic.
- wearsBrands — array of brands she actually owns/wears (e.g. "The Row", "Jacquemus"). 4-7 items. Real brand names.
- shopsAt — array of stores/retailers/marketplaces where she buys (e.g. "Net-a-Porter", "Dover Street Market", "vintage markets"). 3-6 items.
- reads — array of accounts/publications/blogs she follows (e.g. "@emilisindlev", "Cereal Magazine"). 3-5 items.
- values — array of priorities (e.g. "craftsmanship over trends", "sustainability non-negotiable"). 3-5 items, each 3-8 words.
- lifestyle — array of concrete daily-life markers (e.g. "shops galleries in the morning", "dinner parties on terraces"). 3-5 items, each a vivid micro-scene.
- reference — ONE editorial sentence (10-25 words) summarizing the person. Lowercase, no marketing fluff, fashion magazine voice.

Quality rules:
- ALL extraction must be grounded in the moodboard analysis text. If something is not implied, infer the most defensible adjacent value rather than fabricating.
- Use real proper nouns (brands, stores, publications) — never generic placeholders.
- Lowercase the reference sentence; arrays use natural casing.

Return ONLY valid JSON, no markdown wrapping.`;

const LANG_INSTRUCTION_ES = '\n\nIMPORTANT: Respond entirely in Spanish (Castilian). The reference field must be Spanish.';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const { collectionPlanId, language } = body as { collectionPlanId?: string; language?: 'en' | 'es' };

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

    const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
    if (!ownership.authorized) return ownership.error;

    const ctx = await loadFullContext(collectionPlanId);

    // No moodboard yet → no suggestion. Caller will render the entry empty.
    if (!ctx.moodboard || ctx.moodboard.trim().length < 20) {
      console.log('[ConsumerSuggestInput] empty:', {
        collectionPlanId,
        moodboardLength: ctx.moodboard?.length || 0,
      });
      const empty: SuggestionResponse = {
        gender: null, ageRange: '', cities: [], wearsBrands: [], shopsAt: [],
        reads: [], values: [], lifestyle: [], reference: '',
      };
      return NextResponse.json(empty);
    }

    const collectionLine = [
      ctx.collectionName ? `Collection: ${ctx.collectionName}` : '',
      ctx.season ? `Season: ${ctx.season}` : '',
    ].filter(Boolean).join(' · ');

    const userPrompt = `Read the moodboard analysis below and propose a STRUCTURED consumer profile.

${collectionLine ? `${collectionLine}\n\n` : ''}MOODBOARD ANALYSIS:
${ctx.moodboard}

Return JSON with this exact shape:
{
  "gender": "women" | "men" | "unisex" | "mixed",
  "ageRange": "e.g. 28-45",
  "cities": ["NYC Tribeca", "London Shoreditch", ...],
  "wearsBrands": ["The Row", "Jacquemus", ...],
  "shopsAt": ["Net-a-Porter", "Dover Street Market", ...],
  "reads": ["@emilisindlev", "Cereal Magazine", ...],
  "values": ["craftsmanship over trends", "sustainability non-negotiable", ...],
  "lifestyle": ["shops galleries in the morning", "dinner parties on terraces", ...],
  "reference": "single editorial sentence in lowercase"
}`;

    const system = language === 'es' ? SYSTEM + LANG_INSTRUCTION_ES : SYSTEM;

    const { data } = await generateJSON<SuggestionResponse>({
      system,
      user: userPrompt,
      temperature: 0.6,
      maxTokens: 1500,
      language,
    });

    // Sanitize all fields. Each defaults to a clean empty value if the
    // LLM returned the wrong type — keeps the client schema stable.
    const allowed = ['women', 'men', 'unisex', 'mixed'];
    const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim().length > 0).map((x) => (x as string).trim()) : [];
    const str = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
    const out: SuggestionResponse = {
      gender: data.gender && allowed.includes(data.gender) ? data.gender : null,
      ageRange: str(data.ageRange),
      cities: arr(data.cities),
      wearsBrands: arr(data.wearsBrands),
      shopsAt: arr(data.shopsAt),
      reads: arr(data.reads),
      values: arr(data.values),
      lifestyle: arr(data.lifestyle),
      reference: str(data.reference),
    };

    console.log('[ConsumerSuggestInput] result:', {
      collectionPlanId,
      moodboardLength: ctx.moodboard.length,
      gender: out.gender,
      ageRange: out.ageRange,
      counts: {
        cities: out.cities.length,
        brands: out.wearsBrands.length,
        shopsAt: out.shopsAt.length,
        reads: out.reads.length,
        values: out.values.length,
        lifestyle: out.lifestyle.length,
      },
      referenceLength: out.reference.length,
    });

    return NextResponse.json(out);
  } catch (error) {
    console.error('[ConsumerSuggestInput] error', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus },
    );
  }
}
