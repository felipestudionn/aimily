/**
 * POST /api/ai/brand-propose
 *
 * Sprint A.3 (2026-05-08) — Brand DNA · rama B (propose from Block 1).
 *
 * Loads ALL Block 1 context server-side (consumer + moodboard +
 * market_trends[color/material] + market_competitors[reference]) and
 * asks Sonnet to produce a 6-axis BrandIdentityProposal. No external
 * scraping; everything the model needs already lives in CIS.
 *
 * Anti-leak rule: collection_plans.name (the working title) is
 * scrubbed before the prompt sees it. The user is BUILDING the brand
 * here — the working title must never become a name candidate.
 *
 * Body:    { collectionPlanId: string, language?: string }
 * Returns: { result: BrandIdentityProposal, model: 'sonnet' | 'haiku' | 'gemini', fallback: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  getAuthenticatedUser,
  checkAuthOnly,
  usageDeniedResponse,
  verifyCollectionOwnership,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { buildCreativePrompt, type BrandIdentityProposal } from '@/lib/ai/creative-prompts';
import { extractJSON, generateJSON } from '@/lib/ai/llm-client';
import { normalizeAiError } from '@/lib/ai/error-messages';
import { supabaseAdmin } from '@/lib/supabase-admin';

type DeepenAxis = 'nameOptions' | 'palette' | 'typography' | 'visualIdentity' | 'applications';

const DEEPEN_AXIS_LABELS: Record<DeepenAxis, { label: string; askMore: string; schema: string }> = {
  nameOptions: {
    label: 'Brand name + tagline candidates',
    askMore: 'Generate 3 ADDITIONAL brand name candidates that COMPLEMENT (do not duplicate) the existing ones. Each must feel like it could share the same brand world but offers a distinct linguistic register.',
    schema: '{ "nameOptions": [ { "name": "...", "tagline": "...", "reasoning": "..." } ] }',
  },
  palette: {
    label: 'Color palette',
    askMore: 'Generate 3 ADDITIONAL palette colours that complement the existing palette without duplicating roles already covered. Use evocative names + accurate hex values.',
    schema: '{ "palette": [ { "name": "...", "hex": "#RRGGBB", "role": "primary|secondary|accent|neutral", "rationale": "..." } ] }',
  },
  typography: {
    label: 'Typography pairings',
    askMore: 'Generate 1-2 ADDITIONAL typography pairings that offer alternative font directions for the brand. Real font families only.',
    schema: '{ "typography": [ { "role": "display|body|mono", "family": "Real font family", "fallback": "fallback stack", "usage": "..." } ] }',
  },
  visualIdentity: {
    label: 'Visual identity axes',
    askMore: 'Generate 1-2 ADDITIONAL visual identity axes. Pick axes not covered yet (composition / photography / lighting / casting). Each with concrete description + 1-3 reference imagery codes.',
    schema: '{ "visualIdentity": [ { "axis": "composition|photography|lighting|casting", "description": "...", "references": ["...", "..."] } ] }',
  },
  applications: {
    label: 'Applications',
    askMore: 'Generate 1-2 ADDITIONAL application mockup briefs. Pick types not covered yet (logo / packaging / hangtag / social_square).',
    schema: '{ "applications": [ { "type": "logo|packaging|hangtag|social_square", "prompt": "..." } ] }',
  },
};

function summariseExistingForAxis(axis: DeepenAxis, p: BrandIdentityProposal): string {
  if (axis === 'nameOptions') return p.nameOptions.map(n => `· ${n.name}${n.tagline ? ` — ${n.tagline}` : ''}`).join('\n');
  if (axis === 'palette') return p.palette.map(c => `· ${c.name} (${c.hex}, role=${c.role})`).join('\n');
  if (axis === 'typography') return p.typography.map(t => `· ${t.role}: ${t.family}`).join('\n');
  if (axis === 'visualIdentity') return p.visualIdentity.map(v => `· ${v.axis}: ${v.description}`).join('\n');
  if (axis === 'applications') return p.applications.map(a => `· ${a.type}: ${a.prompt.slice(0, 80)}…`).join('\n');
  return '';
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = 'claude-sonnet-4-20250514';

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish (Castilian)', fr: 'French', it: 'Italian', de: 'German',
  pt: 'Portuguese (Brazilian)', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian (Bokmål)',
};

interface MarketCard {
  title: string;
  brands?: string;
  desc: string;
  dimension?: string;
}

function formatCards(cards: MarketCard[]): string {
  return cards.map(c => `${c.title}${c.brands ? ` — ${c.brands}` : ''}: ${c.desc}`).join('\n\n');
}

async function loadStructuredMarket(collectionPlanId: string): Promise<{
  references: string;
  colors: string;
  materials: string;
}> {
  const { data: rows } = await supabaseAdmin
    .from('collection_decisions')
    .select('domain, subdomain, key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('domain', 'creative')
    .eq('subdomain', 'market')
    .eq('is_current', true);

  const get = (key: string): MarketCard[] => {
    const row = (rows || []).find(r => r.key === key);
    return Array.isArray(row?.value) ? (row!.value as MarketCard[]) : [];
  };

  const competitors = get('competitors');
  const trends = get('trends');

  const referenceCards = competitors.filter(c => c.dimension === 'reference');
  const colorCards = trends.filter(c => c.dimension === 'color');
  const materialCards = trends.filter(c => c.dimension === 'material');

  return {
    references: referenceCards.length ? formatCards(referenceCards) : '',
    colors: colorCards.length ? formatCards(colorCards) : '',
    materials: materialCards.length ? formatCards(materialCards) : '',
  };
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'heavy-text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  const collectionPlanId = body?.collectionPlanId as string | undefined;
  const language = body?.language as string | undefined;
  const deepenAxis = body?.deepenAxis as DeepenAxis | undefined;
  const existingProposal = body?.existingProposal as BrandIdentityProposal | undefined;

  if (!collectionPlanId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }
  if (deepenAxis && !DEEPEN_AXIS_LABELS[deepenAxis]) {
    return NextResponse.json({ error: `Unknown deepenAxis: ${deepenAxis}` }, { status: 400 });
  }
  if (deepenAxis && !existingProposal) {
    return NextResponse.json({ error: 'existingProposal is required when deepenAxis is set' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Load full context, then scrub the working title (anti-leak rule).
  const ctx = await loadFullContext(collectionPlanId);
  delete ctx.collectionName;

  // Pull the structured market axes that Brand DNA cares about most:
  // - aspirational reference brands (imagery codes)
  // - season color direction
  // - season material direction
  const market = await loadStructuredMarket(collectionPlanId);
  const input: Record<string, string> = {
    ...ctx,
    market_competitors_references: market.references,
    market_trends_colors: market.colors,
    market_trends_materials: market.materials,
  };

  const prompt = buildCreativePrompt('brand-multi-axis', input);
  if (!prompt) {
    return NextResponse.json({ error: 'Failed to build brand prompt' }, { status: 500 });
  }

  // Inject language directive (Sonnet path — generateJSON handles its own).
  let system = prompt.system;
  if (language && language !== 'en' && LANG_NAMES[language]) {
    system += `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${LANG_NAMES[language]}. ALL text content (names, taglines, descriptions, voice rules, vocabulary, rationales) must be written in ${LANG_NAMES[language]}. Do NOT mix English. Technical terms that are universally English (mood board, drop, SKU) may stay in English.`;
  }

  // Deepen-axis path: replace the user prompt with a focused ask that
  // shows what already exists for this axis and requests N additional
  // complementary items. Returns ONLY the axis array, not all 6.
  let userPrompt = prompt.user;
  if (deepenAxis && existingProposal) {
    const meta = DEEPEN_AXIS_LABELS[deepenAxis];
    userPrompt = `${prompt.user}

You are NOT generating a fresh 6-axis proposal. You are DEEPENING one axis only.

CURRENT AXIS: ${meta.label}
ALREADY-PROPOSED ITEMS (do not duplicate, complement these):
${summariseExistingForAxis(deepenAxis, existingProposal) || '(none)'}

TASK: ${meta.askMore}

Return ONLY this JSON shape:
${meta.schema}`;
  }

  // Try Sonnet first (per Sprint A.3 stack contract); fall through to
  // Haiku/Gemini via generateJSON if Sonnet is unavailable or errors.
  // Deepen calls return a smaller payload; let Sonnet finish faster.
  const maxTokens = deepenAxis ? 2048 : (prompt.maxTokens ?? 8192);

  if (ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: prompt.temperature,
      });
      const block = response.content[0];
      if (block?.type === 'text' && block.text) {
        const data = extractJSON(block.text);
        return NextResponse.json({ result: data, model: 'sonnet', fallback: false });
      }
    } catch (err) {
      console.warn('[brand-propose] Sonnet failed, falling through to Haiku:', err instanceof Error ? err.message : err);
    }
  }

  try {
    const { data, model, fallback } = await generateJSON({
      system,
      user: userPrompt,
      temperature: prompt.temperature,
      maxTokens,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (err) {
    const friendly = normalizeAiError(err);
    return NextResponse.json({ error: friendly.userMessage }, { status: friendly.httpStatus ?? 500 });
  }
}
