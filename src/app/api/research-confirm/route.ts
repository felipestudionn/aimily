import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { recordDecision } from '@/lib/collection-intelligence';

/**
 * Investigación de Mercado · Confirm
 *
 * Called when the user confirms a lens (Tendencias / Deep Dive /
 * Live Signals / Competidores). Writes only the SELECTED result
 * cards to the new `creative.market.{lens}` CIS subdomain so Block
 * 2/3/4 can read each lens independently downstream.
 *
 * Lens → CIS key map:
 *   global       → creative.market.trends
 *   deep         → creative.market.deep_dive
 *   live         → creative.market.live_signals
 *   competitors  → creative.market.competitors
 *
 * The legacy `creative.inspiration.trends_selected` blob is kept for
 * back-compat until S5 of the migration when the Block 2/3/4 prompts
 * cut over to read these new keys.
 */

type Lens = 'global' | 'deep' | 'live' | 'competitors';

interface ResearchCard {
  title: string;
  brands?: string;
  desc: string;
  relevance?: string;
  selected?: boolean;
}

const LENS_TO_KEY: Record<Lens, string> = {
  global: 'trends',
  deep: 'deep_dive',
  live: 'live_signals',
  competitors: 'competitors',
};

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { collectionPlanId, lens, results, fichaInput } = body as {
      collectionPlanId?: string;
      lens?: Lens;
      results?: ResearchCard[];
      // Competitors lens carries TWO arrays (competitors / references)
      // since the split-tier refactor. Old shape `brands` kept for
      // back-compat — readers should prefer the split arrays.
      fichaInput?: { focus?: string[]; brands?: string[]; competitors?: string[]; references?: string[] };
    };

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }
    if (!lens || !LENS_TO_KEY[lens]) {
      return NextResponse.json({ error: 'lens is required (global|deep|live|competitors)' }, { status: 400 });
    }

    const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
    if (!ownership.authorized) return ownership.error;

    const cisKey = LENS_TO_KEY[lens];
    const safeResults = Array.isArray(results) ? results : [];
    const kept = safeResults
      .filter((r) => r.selected !== false)
      .map((r) => ({
        title: (r.title || '').trim(),
        brands: (r.brands || '').trim(),
        desc: (r.desc || '').trim(),
        relevance: r.relevance || undefined,
      }))
      .filter((r) => r.title.length > 0);

    // Write the kept cards as the lens' canonical source-of-truth.
    // recordDecision dedupes by (domain, subdomain, key) so re-confirming
    // simply supersedes the previous version — the user can change their
    // mind without writing a stale row.
    await recordDecision({
      collectionPlanId,
      domain: 'creative',
      subdomain: 'market',
      key: cisKey,
      value: kept,
      source: 'user_input',
      sourcePhase: 'creative',
      sourceComponent: 'MarketResearchUnified',
      tags: ['affects_design', 'affects_buying_strategy', 'affects_content'],
      userId: user.id,
    });

    // Also stash the ficha input so we can reproduce / re-research
    // later from the same framing. Useful for "regenerate with same
    // chips" UX in the future.
    if (fichaInput && (fichaInput.focus?.length || fichaInput.brands?.length || fichaInput.competitors?.length || fichaInput.references?.length)) {
      await recordDecision({
        collectionPlanId,
        domain: 'creative',
        subdomain: 'market',
        key: `${cisKey}_input`,
        value: fichaInput,
        source: 'user_input',
        sourcePhase: 'creative',
        sourceComponent: 'MarketResearchUnified',
        userId: user.id,
      });
    }

    console.log('[ResearchConfirm] wrote', { collectionPlanId, lens, cisKey, count: kept.length });

    return NextResponse.json({ ok: true, cisKey, count: kept.length });
  } catch (error) {
    console.error('[ResearchConfirm] error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
