/* ═══════════════════════════════════════════════════════════════════
   POST /api/presentation/promote
   Body: { collectionId, slideId }

   "Promote to Workspace" — for slides where the deck override has a
   clean mapping into the CIS (collection_decisions table), writes the
   override text back as the canonical value. After this, the CIS is
   the source of truth: AI prompts, Workspace views, and the deck all
   see the new text.

   After successful promote the deck override row is DELETED (the
   override no longer has a job — the CIS holds the value now).

   Mapping supported (F5.2 scope — narrative slides with single
   target fields):
   - consumer        → creative.target.demographics  (lead + body concat)
   - brand-identity  → creative.identity.visual_direction
   - communications  → marketing.voice.tone
   Slides outside this map return 400 with a reason.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { recordDecision } from '@/lib/collection-intelligence';

export const runtime = 'nodejs';

interface PromoteBody {
  collectionId: string;
  slideId: string;
}

/* slide → (domain, subdomain, key) in collection_decisions.
   The loader (buildPromptContext / compilePromptContext) reads this
   exact (domain, subdomain, key) triple, so writing here makes the
   new text visible to every downstream consumer: Workspace UI, AI
   prompt builder, and the deck itself. */
const SLIDE_PROMOTE_MAP: Record<string, { domain: string; subdomain: string; key: string; label: string }> = {
  consumer: {
    domain: 'creative',
    subdomain: 'target',
    key: 'demographics',
    label: 'Consumer profile',
  },
  'brand-identity': {
    domain: 'creative',
    subdomain: 'identity',
    key: 'visual_direction',
    label: 'Brand identity · Visual direction',
  },
  communications: {
    domain: 'marketing',
    subdomain: 'voice',
    key: 'tone',
    label: 'Brand voice · Tone',
  },
};

function combineFields(fields: Record<string, string>): string {
  const lead = (fields.lead ?? '').trim();
  const body = (fields.body ?? '').trim();
  if (!lead && !body) return '';
  if (!body) return lead;
  if (!lead) return body;
  return `${lead}\n\n${body}`;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: PromoteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { collectionId, slideId } = body;
  if (!collectionId || !slideId) {
    return NextResponse.json({ error: 'Missing collectionId or slideId' }, { status: 400 });
  }

  const target = SLIDE_PROMOTE_MAP[slideId];
  if (!target) {
    return NextResponse.json(
      { error: 'This slide can\'t be promoted yet — edits remain deck-only.' },
      { status: 400 },
    );
  }

  const check = await verifyCollectionOwnership(user!.id, collectionId);
  if (!check.authorized) return check.error;

  // Read the current override for this slide
  const { data: override } = await supabaseAdmin
    .from('presentation_deck_overrides')
    .select('field_overrides')
    .eq('collection_plan_id', collectionId)
    .eq('slide_id', slideId)
    .maybeSingle();

  if (!override?.field_overrides) {
    return NextResponse.json({ error: 'No override to promote on this slide' }, { status: 400 });
  }

  const fields = override.field_overrides as Record<string, string>;
  const combined = combineFields(fields);
  if (!combined) {
    return NextResponse.json({ error: 'Override has no text content to promote' }, { status: 400 });
  }

  // Write to the CIS. recordDecision handles version history + upsert.
  try {
    await recordDecision({
      collectionPlanId: collectionId,
      userId: user!.id,
      domain: target.domain,
      subdomain: target.subdomain,
      key: target.key,
      value: combined,
      source: 'user_input',
      sourcePhase: 'presentation',
      sourceComponent: 'deck_promote',
      tags: ['promoted_from_deck', `slide:${slideId}`],
    });
  } catch (e) {
    console.error('[api/presentation/promote] recordDecision failed:', e);
    return NextResponse.json({ error: 'Failed to write to Workspace' }, { status: 500 });
  }

  // Delete the deck override now that the CIS holds the canonical value.
  await supabaseAdmin
    .from('presentation_deck_overrides')
    .delete()
    .eq('collection_plan_id', collectionId)
    .eq('slide_id', slideId);

  return NextResponse.json({
    ok: true,
    promotedTo: target.label,
  });
}

/* GET returns which slides can be promoted + their CIS destination
   labels. Used by the UI to show/hide the Promote button per slide. */
export async function GET() {
  return NextResponse.json({
    supported: Object.fromEntries(
      Object.entries(SLIDE_PROMOTE_MAP).map(([k, v]) => [k, v.label]),
    ),
  });
}
