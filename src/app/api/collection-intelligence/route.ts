import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import {
  getIntelligence,
  recordDecision,
  compilePromptContext,
  type RecordDecisionParams,
} from '@/lib/collection-intelligence';

/**
 * GET /api/collection-intelligence?planId=X
 *
 * Read decisions. Optional filters:
 *   &domain=creative        — filter by domain
 *   &subdomain=inspiration  — filter by subdomain
 *   &tags=affects_photography,affects_content — filter by tags (OR)
 *   &preset=editorial_prompt — compile a preset context (returns flat object)
 */
export async function GET(req: NextRequest) {
  const { error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const params = req.nextUrl.searchParams;
  const planId = params.get('planId');
  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }

  const preset = params.get('preset');
  if (preset) {
    const ctx = await compilePromptContext(planId, preset);
    return NextResponse.json({ context: ctx });
  }

  const domain = params.get('domain') || undefined;
  const subdomain = params.get('subdomain') || undefined;
  const tagsParam = params.get('tags');
  const tags = tagsParam ? tagsParam.split(',') : undefined;

  const decisions = await getIntelligence(planId, { domain, subdomain, tags });
  return NextResponse.json({ decisions });
}

/**
 * POST /api/collection-intelligence
 *
 * Record a decision (or batch of decisions).
 *
 * Body: RecordDecisionParams | RecordDecisionParams[]
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = await req.json();

  const decisions: RecordDecisionParams[] = Array.isArray(body) ? body : [body];

  for (const d of decisions) {
    if (!d.collectionPlanId || !d.domain || !d.subdomain || !d.key || d.value === undefined) {
      return NextResponse.json(
        { error: 'Each decision requires: collectionPlanId, domain, subdomain, key, value' },
        { status: 400 }
      );
    }
    d.userId = d.userId || user!.id;
  }

  await Promise.all(decisions.map(recordDecision));

  return NextResponse.json({ recorded: decisions.length });
}
