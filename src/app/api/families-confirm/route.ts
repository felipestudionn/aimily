/**
 * POST /api/families-confirm
 *
 * Sprint B.2 (2026-05-08) · 02.2 Surtido & Precios — confirm.
 *
 * Persists the refined family list (+ per-subcategory pricing) to CIS:
 *   · merchandising.families.list           — refined PrefilledFamily[]
 *   · merchandising.families.subcategory_prices — per-subcat min/max pricing
 *   · merchandising.pricing.tiers           — globally-edited tier ranges
 *   · merchandising.pricing.average_price   — derived avg PVP
 *
 * Tags applied:
 *   · affects_assortment  → Block 3 SKU generator reads families
 *   · affects_pricing     → Block 4 sales / pricing prompts read tiers
 *   · affects_design      → Block 3 design prompts read material/color hints
 *
 * Body:
 * {
 *   collectionPlanId: string,
 *   families: PrefilledFamily[],
 *   pricing_tiers: { entry, core, hero },
 *   subcategory_prices?: Record<string, { min: number; max: number }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecisions } from '@/lib/collection-intelligence';
import type { PrefilledEditor } from '@/lib/ai/scenarios-prompts';

interface FamiliesConfirmBody {
  collectionPlanId?: string;
  families?: PrefilledEditor['families'];
  pricing_tiers?: PrefilledEditor['pricing_tiers'];
  subcategory_prices?: Record<string, { min: number; max: number }>;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as FamiliesConfirmBody | null;
  const collectionPlanId = body?.collectionPlanId;
  const families = body?.families;
  const pricing_tiers = body?.pricing_tiers;
  const subcategory_prices = body?.subcategory_prices || {};

  if (!collectionPlanId || !Array.isArray(families)) {
    return NextResponse.json(
      { error: 'collectionPlanId and families[] are required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  // Compute avg PVP across all subcategorías' midpoints (skipping zeros).
  const prices: number[] = [];
  for (const f of families) {
    for (const s of f.subcategories || []) {
      const tier = pricing_tiers
        ? (pricing_tiers.core?.min && pricing_tiers.core?.max
            ? Math.round((pricing_tiers.core.min + pricing_tiers.core.max) / 2)
            : 0)
        : 0;
      const subPrice = subcategory_prices[`${f.name}__${s.name}`];
      if (subPrice && subPrice.min && subPrice.max) {
        prices.push(Math.round((subPrice.min + subPrice.max) / 2));
      } else if (tier > 0) {
        prices.push(tier);
      }
    }
  }
  const avg_price = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  const writes = [
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'families', key: 'list',
      value: families, valueType: 'list',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FamiliesConfirm',
      userId: user.id, tags: ['affects_assortment', 'affects_design'],
    },
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'families', key: 'subcategory_prices',
      value: subcategory_prices, valueType: 'object',
      source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FamiliesConfirm',
      userId: user.id, tags: ['affects_pricing'],
    },
    ...(pricing_tiers
      ? [{
          collectionPlanId, domain: 'merchandising', subdomain: 'pricing', key: 'tiers',
          value: pricing_tiers, valueType: 'object',
          source: 'user_input' as const, sourcePhase: 'merchandising', sourceComponent: 'FamiliesConfirm',
          userId: user.id, tags: ['affects_pricing', 'affects_design'],
        }]
      : []),
    {
      collectionPlanId, domain: 'merchandising', subdomain: 'pricing', key: 'average_price',
      value: avg_price, valueType: 'number',
      source: 'calculation' as const, sourcePhase: 'merchandising', sourceComponent: 'FamiliesConfirm',
      userId: user.id, tags: ['affects_pricing'],
    },
  ];

  try {
    await recordDecisions(writes);
  } catch (err) {
    console.error('[FamiliesConfirm] CIS write failed', err);
    return NextResponse.json(
      { error: 'No se pudo confirmar Surtido & Precios. Inténtalo de nuevo.' },
      { status: 500 },
    );
  }

  console.log('[FamiliesConfirm] wrote', { collectionPlanId, families: families.length, avg_price });

  return NextResponse.json({ ok: true, written: writes.length, avg_price });
}
