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
  reference: string;
}

const SYSTEM = `You are a fashion creative director. From a moodboard analysis you extract the most likely target consumer in two compact fields:

1. gender — one of "women", "men", "unisex", "mixed". Pick the most defensible single value. If truly ambiguous, "unisex".
2. reference — ONE short editorial sentence (10-25 words) describing the consumer the moodboard implies. Reference real brands, age range, lifestyle markers. Lowercase. No marketing fluff. Editorial fashion magazine voice. Sound like a creative director sketching a person, not a marketing brief.

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
      const empty: SuggestionResponse = { gender: null, reference: '' };
      return NextResponse.json(empty);
    }

    const collectionLine = [
      ctx.collectionName ? `Collection: ${ctx.collectionName}` : '',
      ctx.season ? `Season: ${ctx.season}` : '',
    ].filter(Boolean).join(' · ');

    const userPrompt = `Read the moodboard analysis below and propose:
- the most likely target consumer gender (women / men / unisex / mixed)
- one editorial sentence (10-25 words) sketching who the consumer is

${collectionLine ? `${collectionLine}\n\n` : ''}MOODBOARD ANALYSIS:
${ctx.moodboard}

Return JSON:
{
  "gender": "women" | "men" | "unisex" | "mixed",
  "reference": "single editorial sentence in lowercase"
}`;

    const system = language === 'es' ? SYSTEM + LANG_INSTRUCTION_ES : SYSTEM;

    const { data } = await generateJSON<SuggestionResponse>({
      system,
      user: userPrompt,
      temperature: 0.6,
      maxTokens: 512,
      language,
    });

    // Sanitize gender to the allowed set
    const allowed = ['women', 'men', 'unisex', 'mixed'];
    const out: SuggestionResponse = {
      gender: data.gender && allowed.includes(data.gender) ? data.gender : null,
      reference: typeof data.reference === 'string' ? data.reference.trim() : '',
    };

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
