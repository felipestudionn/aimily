/* ═══════════════════════════════════════════════════════════════════
   loadPresentationData — server-side data loader for the deck

   Wraps the existing loadFullContext() (🔒 ARCH LOCKED — do not touch)
   and transforms the flat CIS record into a slide-shaped structure.
   Each slide template receives only the fields it needs.

   Scoped for F2.1: populates narrative-portrait slides that already
   have rich text in the CIS (consumer, brand-identity, communications).
   F2.2+ will extend to stats, grids, and timelines.
   ═══════════════════════════════════════════════════════════════════ */

import { loadFullContext } from '@/lib/ai/load-full-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface NarrativeSlideData {
  lead?: string;
  body?: string;
  attribution?: string;
}

export interface CoverSlideData {
  brandName?: string;
  season?: string;
  launchDate?: string | null;
}

export interface StatSlideData {
  value?: string;
  caption?: string;
  narrative?: string;
  support?: { value: string; label: string }[];
}

export interface GridSlideData {
  caption?: string;
  tiles?: { eyebrow: string; label: string; value?: string }[];
}

export interface TimelineSlideData {
  lead?: string;
  milestones?: { date: string; label: string; status: 'done' | 'current' | 'next' }[];
}

export interface PresentationData {
  cover: CoverSlideData;
  narratives: Record<string, NarrativeSlideData>;  // keyed by slide id
  stats: Record<string, StatSlideData>;
  grids: Record<string, GridSlideData>;
  timelines: Record<string, TimelineSlideData>;
  /* Presence flag so the UI can show "no data yet" states if
     the entire collection hasn't been filled. */
  hasAnyData: boolean;
}

/* Split a CIS string into lead (first line) + body (rest). Used to
   convert the flat "consumer", "brandDNA", "brandVoice" strings into
   narrative-portrait shape. */
function splitLeadBody(raw: string | undefined): { lead?: string; body?: string } {
  if (!raw || !raw.trim()) return {};
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return {};
  if (lines.length === 1) return { lead: lines[0] };
  return {
    lead: lines[0],
    body: lines.slice(1).join(' '),
  };
}

export async function loadPresentationData(collectionPlanId: string): Promise<PresentationData> {
  const ctx = await loadFullContext(collectionPlanId);

  // Pull launch date directly (loadFullContext doesn't expose it)
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season, launch_date, setup_data')
    .eq('id', collectionPlanId)
    .single();

  const data: PresentationData = {
    cover: {
      brandName: ctx.collectionName || plan?.name || undefined,
      season: ctx.season || plan?.season || undefined,
      launchDate: plan?.launch_date ?? null,
    },
    narratives: {},
    stats: {},
    grids: {},
    timelines: {},
    hasAnyData: false,
  };

  // ─── F2.1 narrative templates ───────────────────────────────────
  const consumerSplit = splitLeadBody(ctx.consumer);
  if (consumerSplit.lead || consumerSplit.body) {
    data.narratives.consumer = {
      ...consumerSplit,
      attribution: 'Consumer archetype · From your research',
    };
    data.hasAnyData = true;
  }

  const brandSplit = splitLeadBody(ctx.brandDNA);
  if (brandSplit.lead || brandSplit.body) {
    data.narratives['brand-identity'] = {
      ...brandSplit,
      attribution: 'Brand DNA · Core positioning',
    };
    data.hasAnyData = true;
  }

  const voiceSplit = splitLeadBody(ctx.brandVoice);
  if (voiceSplit.lead || voiceSplit.body) {
    data.narratives.communications = {
      ...voiceSplit,
      attribution: 'Voice & tone · Communications spine',
    };
    data.hasAnyData = true;
  }

  // Tech-pack — derive from productCategory + existingSkus count
  if (ctx.productCategory || ctx.existingSkus) {
    const parts: string[] = [];
    if (ctx.productCategory) parts.push(`Category: ${ctx.productCategory}`);
    if (ctx.existingSkus) parts.push(ctx.existingSkus.split('\n').slice(0, 3).join(' · '));
    if (parts.length) {
      data.narratives['tech-pack'] = {
        lead: 'Specs that a factory can build without a phone call.',
        body: parts.join(' · '),
        attribution: 'Tech pack · Production-ready',
      };
      data.hasAnyData = true;
    }
  }

  // Buying strategy — derive from drops / sales target
  if (ctx.drops || ctx.salesTarget) {
    const parts: string[] = [];
    if (ctx.drops) parts.push(`Drop cadence: ${ctx.drops.split('\n').length} drops planned.`);
    if (ctx.salesTarget) parts.push(`Revenue target ${ctx.salesTarget}.`);
    data.narratives['buying-strategy'] = {
      lead: 'Narrow and deep over broad and shallow.',
      body: parts.join(' ') || undefined,
      attribution: 'Buying strategy · Season blueprint',
    };
    data.hasAnyData = true;
  }

  return data;
}
