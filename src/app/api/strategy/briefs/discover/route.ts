/**
 * POST /api/strategy/briefs/discover
 *
 * Returns an AI-discovered draft creative brief for the tenant. The draft
 * is NOT persisted — the user reviews + accepts, then POSTs the accepted
 * shape to /api/strategy/briefs to create the real row.
 *
 * Body: { tenant_slug: string, season?: string, language?: 'en' | 'es' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { discoverCreativeBrief } from '@/lib/strategy/creative-discovery';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantSlug = body?.tenant_slug;
  if (typeof tenantSlug !== 'string' || !tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug, minRole: 'analyst' });
  if (!access.ok) return access.response;

  try {
    const result = await discoverCreativeBrief({
      tenantId: access.tenant.id,
      season: typeof body.season === 'string' ? body.season : undefined,
      language: body.language === 'es' || body.language === 'en' ? body.language : undefined,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Creative discovery failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
