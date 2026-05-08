/**
 * POST /api/brand-confirm
 *
 * Sprint A.3 (2026-05-08) — Brand DNA confirm step.
 *
 * Lands a confirmed BrandIdentityProposal into the user-level vault
 * (`user_brands`), links it to the collection (`collection_plans.brand_id`),
 * and projects the structured payload into CIS (`creative.identity.*` +
 * `marketing.voice.*`) so every downstream prompt reader keeps working
 * without changes.
 *
 *   user_brands  ← canonical truth (jsonb structured fields)
 *   creative.identity.*  ← cache, defensive — read by every existing prompt
 *
 * Body:
 *   {
 *     collectionPlanId: string,
 *     proposal: BrandIdentityProposal,
 *     chosenName: { name: string, tagline?: string },  // user picks one of nameOptions
 *     brandId?: string,        // present if updating an existing vault row
 *   }
 *
 * Returns: { brand: <user_brands row>, projected: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecisions } from '@/lib/collection-intelligence';
import type { BrandIdentityProposal } from '@/lib/ai/creative-prompts';

interface ConfirmBody {
  collectionPlanId: string;
  proposal: BrandIdentityProposal;
  chosenName: { name: string; tagline?: string };
  brandId?: string;
}

// Build the legacy `style` (visual identity) text summary from the
// structured visualIdentity axes — keeps existing CIS readers (which
// expect a single string at `creative.identity.visual_direction`) happy.
function summariseVisualIdentity(vi: BrandIdentityProposal['visualIdentity']): string {
  if (!Array.isArray(vi) || vi.length === 0) return '';
  return vi.map(a => `${a.axis}: ${a.description}`).join(' · ');
}

// Build the legacy `typography` text summary from the structured pairings.
function summariseTypography(typo: BrandIdentityProposal['typography']): string {
  if (!Array.isArray(typo) || typo.length === 0) return '';
  return typo.map(t => `${t.role}: ${t.family}`).join(' · ');
}

// Build the legacy `tone` text summary from the structured voice.
function summariseTone(voice: BrandIdentityProposal['voice']): string {
  if (!voice) return '';
  return [voice.personality, voice.tone].filter(Boolean).join(' — ');
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as ConfirmBody | null;
  if (!body?.collectionPlanId || !body?.proposal || !body?.chosenName?.name) {
    return NextResponse.json(
      { error: 'collectionPlanId, proposal, and chosenName.name are required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, body.collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const supabase = await createClient();
  const { proposal, chosenName, brandId, collectionPlanId } = body;

  // 1. Build the user_brands row from the proposal + chosen name.
  const row: Record<string, unknown> = {
    user_id: user.id,
    brand_name: chosenName.name,
    tagline: chosenName.tagline ?? null,
    colors: proposal.palette ?? [],
    voice: proposal.voice ?? null,
    visual_identity: proposal.visualIdentity ?? [],
    applications: proposal.applications ?? [],
    source: 'created_in_aimily',
    // legacy text columns still populated for any pre-refactor reader
    tone: summariseTone(proposal.voice),
    typography: summariseTypography(proposal.typography),
    style: summariseVisualIdentity(proposal.visualIdentity),
    // typography_pairings + nameOptions live inside brand_data so the
    // full proposal is recoverable without re-running the model.
    brand_data: {
      typography_pairings: proposal.typography ?? [],
      nameOptions: proposal.nameOptions ?? [],
      sources: proposal.sources ?? [],
    },
    updated_at: new Date().toISOString(),
  };

  let saved: Record<string, unknown> | null = null;

  if (brandId) {
    // Update existing vault row (verify ownership + not deleted)
    const { data: existing } = await supabase
      .from('user_brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    const { data, error } = await supabase
      .from('user_brands')
      .update(row)
      .eq('id', brandId)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) {
      console.error('[brand-confirm] update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    saved = data;
  } else {
    const { data, error } = await supabase
      .from('user_brands')
      .insert([row])
      .select()
      .single();
    if (error) {
      console.error('[brand-confirm] insert failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    saved = data;
  }

  if (!saved) {
    return NextResponse.json({ error: 'Failed to persist brand' }, { status: 500 });
  }

  // 2. Link to the collection plan (verify ownership via service role —
  //    we already passed verifyCollectionOwnership above).
  await supabaseAdmin
    .from('collection_plans')
    .update({ brand_id: saved.id, updated_at: new Date().toISOString() })
    .eq('id', collectionPlanId);

  // 3. Project structured fields to CIS as the defensive cache so every
  //    existing prompt reader keeps working with no changes. Truth still
  //    lives in user_brands; this is a denormalised read-side projection.
  try {
    await recordDecisions([
      {
        collectionPlanId,
        domain: 'creative', subdomain: 'identity', key: 'brand_name',
        value: chosenName.name,
        valueType: 'text',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
        tags: ['affects_content', 'affects_marketing', 'affects_design'],
      },
      {
        collectionPlanId,
        domain: 'creative', subdomain: 'identity', key: 'tagline',
        value: chosenName.tagline ?? '',
        valueType: 'text',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
      },
      {
        collectionPlanId,
        domain: 'creative', subdomain: 'identity', key: 'colors',
        value: proposal.palette ?? [],
        valueType: 'list',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
        tags: ['affects_design', 'affects_content'],
      },
      {
        collectionPlanId,
        domain: 'creative', subdomain: 'identity', key: 'visual_direction',
        value: summariseVisualIdentity(proposal.visualIdentity),
        valueType: 'text',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
        tags: ['affects_design', 'affects_photography'],
      },
      {
        collectionPlanId,
        domain: 'creative', subdomain: 'identity', key: 'visual_identity_axes',
        value: proposal.visualIdentity ?? [],
        valueType: 'list',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
      },
      {
        collectionPlanId,
        domain: 'creative', subdomain: 'identity', key: 'typography_pairings',
        value: proposal.typography ?? [],
        valueType: 'list',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
      },
      {
        collectionPlanId,
        domain: 'marketing', subdomain: 'voice', key: 'personality',
        value: proposal.voice?.personality ?? '',
        valueType: 'text',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
        tags: ['affects_content'],
      },
      {
        collectionPlanId,
        domain: 'marketing', subdomain: 'voice', key: 'tone',
        value: proposal.voice?.tone ?? '',
        valueType: 'text',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
        tags: ['affects_content'],
      },
      {
        collectionPlanId,
        domain: 'marketing', subdomain: 'voice', key: 'do_rules',
        value: proposal.voice?.do_rules ?? [],
        valueType: 'list',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
      },
      {
        collectionPlanId,
        domain: 'marketing', subdomain: 'voice', key: 'dont_rules',
        value: proposal.voice?.dont_rules ?? [],
        valueType: 'list',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
      },
      {
        collectionPlanId,
        domain: 'marketing', subdomain: 'voice', key: 'vocabulary',
        value: proposal.voice?.vocabulary ?? [],
        valueType: 'list',
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'BrandConfirm',
        userId: user.id,
      },
    ]);
  } catch (err) {
    // CIS projection is the cache layer; the canonical write to
    // user_brands already succeeded, so we don't fail the request.
    console.error('[brand-confirm] CIS projection failed:', err);
  }

  return NextResponse.json({ brand: saved, projected: true });
}
