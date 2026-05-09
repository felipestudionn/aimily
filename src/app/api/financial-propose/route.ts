/**
 * POST /api/financial-propose
 *
 * Sprint B.4 (2026-05-09) · 02.4 Plan Financiero · PROPOSE.
 *
 * Auto-fires on first mount of `?block=budget`. Reads CIS (strategy +
 * channels + pricing/families seeded by 02.1-02.3), runs the deterministic
 * financial calculator, then asks Sonnet for the editorial layer
 * (narrative + risks + levers).
 *
 * The math is NEVER invented — only the narrative is AI. This separation
 * lets us recompute live in the UI when the user edits any input number,
 * without hitting the AI again until they ask "+ Más narrativa".
 *
 * Body:    { collectionPlanId, language? }
 * Returns: { result: { plan: FinancialPlan, narrative: FinancialNarrative, inputs: FinancialInputs }, model, fallback }
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
import { buildPromptContext } from '@/lib/prompts/prompt-context';
import { extractJSON, generateJSON } from '@/lib/ai/llm-client';
import { normalizeAiError } from '@/lib/ai/error-messages';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { computeFinancialPlan, type FinancialInputs } from '@/lib/financial-plan/calculate';
import { buildFinancialNarrativePrompt } from '@/lib/ai/financial-narrative-prompts';
import type { DistributionPlan } from '@/lib/ai/distribution-prompts';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = 'claude-sonnet-4-20250514';

export const maxDuration = 60;

interface DecisionRow {
  subdomain: string;
  key: string;
  value: unknown;
}

interface PriceTier {
  min?: number;
  max?: number;
}

interface PricingTiers {
  entry?: PriceTier;
  core?: PriceTier;
  hero?: PriceTier;
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
  const language = (body?.language as string | undefined) || 'es';

  if (!collectionPlanId) {
    return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Pull strategy + channels + pricing keys from CIS
  const { data: rows } = await supabaseAdmin
    .from('collection_decisions')
    .select('subdomain, key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('domain', 'merchandising')
    .eq('is_current', true)
    .in('subdomain', ['strategy', 'channels', 'pricing', 'families']);

  const get = (subdomain: string, key: string): unknown =>
    (rows as DecisionRow[] | null)?.find(r => r.subdomain === subdomain && r.key === key)?.value;

  const archetypeName = (get('strategy', 'archetype_name') as string | undefined) || '';
  const targetSkuCount = (get('strategy', 'target_sku_count') as number | undefined) || 0;
  const salesTargetY1 = (get('strategy', 'sales_target_y1') as number | undefined) || 0;
  const investmentObj = (get('strategy', 'investment') as { production?: number; marketing?: number; total?: number } | undefined) || {};
  const targetMarginPct = (get('strategy', 'target_margin_pct') as number | undefined) || 60;
  const dropsObj = get('strategy', 'drops') as { count?: number } | undefined;
  const dropCount = dropsObj?.count || 1;

  const pricingTiers = get('pricing', 'tiers') as PricingTiers | undefined;
  // Avg price = midpoint of core tier if available, else fall back to (entry+hero)/2
  let avgUnitPrice = 0;
  if (pricingTiers?.core?.min && pricingTiers?.core?.max) {
    avgUnitPrice = (pricingTiers.core.min + pricingTiers.core.max) / 2;
  } else if (pricingTiers?.entry?.min && pricingTiers?.hero?.max) {
    avgUnitPrice = (pricingTiers.entry.min + pricingTiers.hero.max) / 2;
  } else if (salesTargetY1 > 0 && targetSkuCount > 0) {
    // Last-resort fallback: revenue ÷ skus × 4 (each SKU sells ~4 units Y1)
    avgUnitPrice = Math.round(salesTargetY1 / targetSkuCount / 4);
  }

  const channelsPlan = get('channels', 'plan_full') as DistributionPlan | undefined;
  if (!channelsPlan) {
    return NextResponse.json(
      { error: 'Distribution not confirmed. Define 02.3 Distribución first.' },
      { status: 400 },
    );
  }
  if (!archetypeName || !targetSkuCount || !salesTargetY1) {
    return NextResponse.json(
      { error: 'Strategy not confirmed. Define 02.1 Estrategia de Compra first.' },
      { status: 400 },
    );
  }

  const inputs: FinancialInputs = {
    target_sku_count: targetSkuCount,
    sales_target_y1: salesTargetY1,
    investment: {
      production: investmentObj.production || 0,
      marketing: investmentObj.marketing || 0,
      total: investmentObj.total || (investmentObj.production || 0) + (investmentObj.marketing || 0),
    },
    target_margin_pct: targetMarginPct,
    drops: dropCount,
    avg_unit_price: avgUnitPrice,
    channel_mix: channelsPlan.channel_mix,
    sell_through_targets: channelsPlan.sell_through_targets,
    pricing_per_channel: channelsPlan.pricing_per_channel,
  };

  const plan = computeFinancialPlan(inputs);

  const [ctx, promptCtx] = await Promise.all([
    loadFullContext(collectionPlanId),
    buildPromptContext(collectionPlanId),
  ]);

  const narrativePrompt = buildFinancialNarrativePrompt({
    brandName: promptCtx.brand_name || ctx.collectionName || '',
    brandTagline: promptCtx.brand_tagline || '',
    archetypeName,
    productCategory: ctx.productCategory || '',
    plan,
    totalInvestment: inputs.investment.total,
    language,
  });

  let narrative = null;
  let model = 'sonnet';
  let fallback = false;

  if (ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: 1500,
        system: narrativePrompt.system,
        messages: [{ role: 'user', content: narrativePrompt.user }],
        temperature: narrativePrompt.temperature,
      });
      const block = response.content[0];
      if (block?.type === 'text' && block.text) {
        narrative = extractJSON(block.text);
      }
    } catch (err) {
      console.warn('[financial-propose] Sonnet failed, falling through:', err instanceof Error ? err.message : err);
    }
  }

  if (!narrative) {
    try {
      const result = await generateJSON({
        system: narrativePrompt.system,
        user: narrativePrompt.user,
        temperature: narrativePrompt.temperature,
        maxTokens: 1500,
      });
      narrative = result.data;
      model = result.model;
      fallback = result.fallback;
    } catch (err) {
      const friendly = normalizeAiError(err);
      // Plan + math is still useful even without narrative — return what we have
      console.error('[financial-propose] Narrative generation failed entirely:', friendly);
      narrative = { narrative: '', risks: [], levers: [] };
    }
  }

  return NextResponse.json({
    result: { plan, narrative, inputs },
    model,
    fallback,
  });
}
