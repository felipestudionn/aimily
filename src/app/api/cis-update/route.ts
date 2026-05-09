/**
 * POST /api/cis-update
 *
 * Sprint B.5 (2026-05-09) · Generic CIS partial write.
 *
 * Lets the Collection Builder (and any other downstream consumer) write
 * a SINGLE canonical CIS key inline, without having to re-traverse the
 * mini-block confirm flow. The "espacio vivo" pattern: edits at the
 * point of consequence cascade upstream automatically.
 *
 * Body:
 *   {
 *     collectionPlanId: string,
 *     domain: string,
 *     subdomain: string,
 *     key: string,
 *     value: unknown,
 *     valueType: 'number' | 'text' | 'object' | 'list',
 *     tags?: string[]
 *   }
 *
 * Allow-list of (domain, subdomain) pairs that the inline editor is
 * permitted to write. Anything outside the allow-list is rejected —
 * we don't want this endpoint to become a general CIS bypass.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecisions, type RecordDecisionParams } from '@/lib/collection-intelligence';

interface CisUpdateBody {
  collectionPlanId?: string;
  domain?: string;
  subdomain?: string;
  key?: string;
  value?: unknown;
  valueType?: RecordDecisionParams['valueType'];
  tags?: string[];
}

// Allow-list: pairs the Collection Builder + future inline editors may write.
// Each entry maps to the default tags applied (callers may extend via body.tags).
const ALLOWED_KEYS: Record<string, { valueType: RecordDecisionParams['valueType']; tags: string[] }> = {
  // 02.1 Strategy
  'merchandising:strategy:target_margin_pct':  { valueType: 'number', tags: ['affects_pricing', 'affects_budget'] },
  'merchandising:strategy:sales_target_y1':    { valueType: 'number', tags: ['affects_budget', 'affects_channels', 'affects_assortment'] },
  'merchandising:strategy:target_sku_count':   { valueType: 'number', tags: ['affects_assortment', 'affects_design'] },
  'merchandising:strategy:investment':         { valueType: 'object', tags: ['affects_budget'] },
  // 02.3 Distribution
  'merchandising:channels:channel_mix':        { valueType: 'object', tags: ['affects_channels', 'affects_budget'] },
  'merchandising:channels:pricing_per_channel':{ valueType: 'object', tags: ['affects_channels', 'affects_pricing'] },
};

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as CisUpdateBody | null;
  const { collectionPlanId, domain, subdomain, key, value, valueType: bodyValueType, tags } = body || {};

  if (!collectionPlanId || !domain || !subdomain || !key) {
    return NextResponse.json(
      { error: 'collectionPlanId, domain, subdomain and key are required' },
      { status: 400 },
    );
  }
  if (value === undefined) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  const allowKey = `${domain}:${subdomain}:${key}`;
  const allow = ALLOWED_KEYS[allowKey];
  if (!allow) {
    return NextResponse.json(
      { error: `CIS key not in allow-list: ${allowKey}` },
      { status: 403 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const valueType = bodyValueType || allow.valueType;
  const finalTags = Array.from(new Set([...(allow.tags || []), ...(tags || [])]));

  try {
    await recordDecisions([{
      collectionPlanId,
      domain,
      subdomain,
      key,
      value,
      valueType,
      source: 'user_input',
      sourcePhase: 'merchandising',
      sourceComponent: 'CollectionBuilderInline',
      userId: user.id,
      tags: finalTags,
    }]);
  } catch (err) {
    console.error('[cis-update] write failed', err);
    return NextResponse.json({ error: 'Failed to persist update' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, key: allowKey });
}
