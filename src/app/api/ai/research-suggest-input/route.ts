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

/**
 * Mirror season helper — given a season code like "SS27" / "FW27" /
 * "Pre-Fall 27" / "Resort 28", returns the same season type one year
 * earlier (the fashion shows that already happened and set the tone
 * for the current collection). Used to force-include a "{prev}
 * fashion shows" chip into the macro trends ficha so Sonar always
 * pulls from the mirror season's runway coverage.
 *
 * Returns null if the season string can't be parsed.
 */
function previousMirrorSeason(season: string | undefined | null): string | null {
  if (!season) return null;
  const m = season.trim().match(/^(SS|FW|Pre-Fall|Resort|Cruise)\s*(\d{2,4})$/i);
  if (!m) return null;
  const rawPrefix = m[1].toUpperCase() === 'SS' ? 'SS'
    : m[1].toUpperCase() === 'FW' ? 'FW'
    : m[1].toLowerCase().startsWith('pre') ? 'Pre-Fall'
    : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  const yearStr = m[2];
  const year = parseInt(yearStr, 10);
  const fullYear = yearStr.length === 2 ? 2000 + year : year;
  const prevFull = fullYear - 1;
  const prevStr = yearStr.length === 2 ? String(prevFull).slice(-2) : String(prevFull);
  // SS/FW have no space; Pre-Fall / Resort / Cruise carry one.
  const sep = rawPrefix === 'SS' || rawPrefix === 'FW' ? '' : ' ';
  return `${rawPrefix}${sep}${prevStr}`;
}

// All 4 lenses now share the same response shape — a tight chip
// array. Deep dive used to carry topic + aspects (more elaborate
// editorial input) but Felipe's feedback was that the input was
// looking like output. Keep input MINIMAL — chips of 1-4 words —
// and let the actual research prompt downstream do the elaboration.
interface ChipsShape { focus: string[]; }
interface BrandsShape { brands: string[]; }

const SYSTEM = `You are a fashion market researcher producing FRAMING INPUTS for downstream research, not the research itself. Your output is short editorial CHIPS the user can edit before triggering Perplexity Sonar.

CRITICAL — these are INPUTS, not outputs. Each chip must be 1-4 words max. NEVER paragraphs. NEVER full sentences. NEVER descriptions. Just the keyword.

GOOD chip examples:
  "SS27 Pre-Fall"          (4 words ok)
  "mujer 28-45"            (3 words)
  "minimalismo arquitectónico"
  "vestidos de verano"
  "sastrería deconstruida"
  "NYC Tribeca"
  "vida en galerías"
  "The Row"
  "Frankie Shop"

BAD examples (too long, descriptive — don't do this):
  "diseñadores que viven en lofts brutalist con luz natural extrema"
  "categorías clave para escanear macro tendencias en pre-fall 2026 incluyendo sastrería deconstruida"
  "marcas de tier aspiracional que la consumidora ya admira y a veces compra"

Forbidden words: elevate · curate · versatile · timeless · effortless · essential.

Return ONLY valid JSON. No markdown wrapping.`;

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
        deep: { focus: [] },
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
      userPrompt = `${collectionLine}\n\n${upstream}\n\nReturn 3-4 SHORT chips that frame WHO + WHEN + WHAT STYLE this brand operates in. Don't over-specify — Global is the macro lens; the more open it is, the more freedom Sonar has to find unexpected trends.\n\nReturn each thing as a SEPARATE chip. Don't fuse them.\n\nThe chips you should produce:\n  1. SEASON (just the season code) — pull from collection context (e.g. "SS27")\n  2. PRE-SEASON adjective ONLY if the moodboard explicitly references one (e.g. "Pre-Fall transitional" → only if moodboard mentions that). Skip otherwise.\n  3. CONSUMER in 2-4 words — gender + age range + 1 adjective (e.g. "mujer 28-45 creativa")\n  4. HIGH-LEVEL STYLE in 2-4 words from the moodboard mood (e.g. "lujo intelectual sin logo")\n\nNO product categories — that's Deep Dive's job. NO mid descriptors. Each chip max 5 words.\n\nReturn JSON:\n{ "focus": ["SS27", "consumer chip", "style chip", ...] }`;
    } else if (lens === 'deep') {
      userPrompt = `${collectionLine}\n\n${upstream}\n\nReturn 3-5 PRODUCT-FAMILY chips that the moodboard already surfaces. These are the families this collection should deep-dive into. The downstream Sonar will research micro-trends within each family.\n\nLook at moodboard.keyItems / keyTrends / keyMaterials and distill the actual product families — what kinds of pieces this collection clearly hints at. Add a tight qualifier when it sharpens the family.\n\nGOOD examples (keep this short):\n  "Sastrería arquitectónica"\n  "Vestidos cropped midriff"\n  "Knitwear gauge fino"\n  "Calzado plano editorial"\n  "Outerwear estructurado"\n  "Bolsos minimal"\n\nDon't fuse with season — it lives in the upstream context already. 2-4 words per chip.\n\nReturn JSON:\n{ "focus": ["chip 1", "chip 2", ...] }`;
    } else if (lens === 'live') {
      userPrompt = `${collectionLine}\n\n${upstream}\n\nReturn 4-6 chips that frame WHERE her world lives + WHAT cultural moments / hashtags relate to the moodboard. Sonar will then research live signals within those chips.\n\nMix:\n- 1-2 cities (pull verbatim from consumer.cities — e.g. "Copenhagen", "NYC Tribeca")\n- 1-2 lifestyle markers (distill from consumer.lifestyle — e.g. "vida en galerías", "cenas en terrazas")\n- 1-2 moodboard-related hashtags or hot topics (infer from moodboard.keyTrends + keyStyles — e.g. "#brutalistinteriors", "#tabiflats", "#liquidhemlines", "#biascutslip"). These are the social-media tags that align with the moodboard's visual language.\n\n1-3 words per chip. Hashtags lowercase, no spaces. Don't write full sentences.\n\nReturn JSON:\n{ "focus": ["chip 1", "chip 2", ...] }`;
    } else {
      // competitors
      userPrompt = `${collectionLine}\n\n${upstream}\n\nReturn 6-8 BRAND chips spanning the FULL price spectrum competing for or aspiring this consumer's wallet. Mix:\n- 2-3 high-tier (€500+/piece) — aspirational brands she admires\n- 2-3 mid-tier (€150-400/piece) — direct competitors\n- 2 accessible-tier (€50-150/piece) — affordable equivalents (e.g. Mango, Massimo Dutti, Arket, Uniqlo C, COS Plus)\n\nReal brand names only. No descriptions. 1-3 words each.\n\nReturn JSON:\n{ "brands": ["Brand 1", "Brand 2", ...] }`;
    }

    const system = language === 'es' ? SYSTEM + LANG_INSTRUCTION_ES : SYSTEM;

    const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim().length > 0).map((x) => (x as string).trim()) : [];

    // Three of the four lenses (global / deep / live) all return a
    // `focus` chip array now. Competitors keeps its own `brands`
    // shape because semantically they are brand names, and downstream
    // Block 2/4 readers may want to distinguish.
    if (lens === 'competitors') {
      const { data } = await generateJSON<BrandsShape>({
        system, user: userPrompt, temperature: 0.5, maxTokens: 600, language,
      });
      const out: BrandsShape = { brands: arr(data.brands) };
      console.log('[ResearchSuggestInput:competitors] result:', { count: out.brands.length });
      return NextResponse.json(out);
    }

    const { data } = await generateJSON<ChipsShape>({
      system, user: userPrompt, temperature: 0.5, maxTokens: 500, language,
    });
    const out: ChipsShape = { focus: arr(data.focus) };

    // Macro trends carry a non-negotiable mirror-season anchor: the
    // same season type one year earlier. SS27 → "SS26 fashion shows".
    // The runway shows of that mirror season already set the trends
    // that arrive a year later in collection.
    if (lens === 'global') {
      const mirror = previousMirrorSeason(ctx.season);
      if (mirror) {
        const mirrorChip = `${mirror} fashion shows`;
        const alreadyPresent = out.focus.some((c) => c.toLowerCase().includes(mirror.toLowerCase()));
        if (!alreadyPresent) out.focus = [mirrorChip, ...out.focus];
      }
    }

    console.log(`[ResearchSuggestInput:${lens}] result:`, { count: out.focus.length });
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
