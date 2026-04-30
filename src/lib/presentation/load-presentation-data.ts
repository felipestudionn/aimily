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
import { loadFinancialPlanSources } from '@/lib/financial-plan/load-sources';
import { computeFinancialPlan, formatEur, formatPct } from '@/lib/financial-plan/compute';
import { DEFAULT_INPUTS, type FinancialPlanInputs, type FinancialPlanNarrative } from '@/lib/financial-plan/types';

export interface NarrativeSlideData {
  lead?: string;
  body?: string;
  attribution?: string;
  /** Real visuals to render in the LEFT image panel. When present + non-empty
   *  the template paints a magazine-style image instead of the legacy mute
   *  placeholder. 1 image → full-bleed; 2-4 → mosaic; >4 capped at 4. */
  images?: string[];
  /** Optional alternate visual modes for slides that aren't best served by a
   *  photo: 'palette' renders a hex swatch grid (brand-identity), 'single'
   *  forces a hero image even with multiple sources. Default: auto. */
  imageMode?: 'auto' | 'palette' | 'single' | 'mosaic';
  /** Hex values for 'palette' mode — drives Brand Identity's left panel. */
  paletteHex?: string[];
  /** Optional caption shown over the image (used for product captions etc). */
  imageCaption?: string;
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
  /** When 'pending', the template renders a Work-in-Progress overlay
      instead of the sample-editorial placeholder. Used for slides that
      have a structural data source defined but no populated data yet
      (e.g. sales-dashboard before launch, financial-plan before a
      buying strategy is selected). */
  status?: 'ready' | 'pending';
  /** Short contextual note shown under the WIP overlay. Explains what
      is still needed for the slide to populate. */
  pendingMessage?: string;
}

export interface GridSlideData {
  caption?: string;
  tiles?: { eyebrow: string; label: string; value?: string }[];
  /** Optional image URLs for photo grids. When present + non-empty,
      the template renders a photo mosaic instead of label tiles. Used
      today by the moodboard slide. Other slides keep tile labels. */
  images?: string[];
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
  /* Per-slide field override map. Populated from
     presentation_deck_overrides. UI uses these to (a) mark slides with
     edits (gold dot in sidebar) and (b) show "Revert to original"
     when a field has an override. Merged OVER the CIS-derived values
     above so templates read the final rendered text from the same
     narratives/grids/timelines maps. */
  overrides: Record<string, Record<string, string>>; // slideId → fieldName → value
  /* Presence flag so the UI can show "no data yet" states if
     the entire collection hasn't been filled. */
  hasAnyData: boolean;
}

/* Strip markdown syntax from a raw CIS string so slides don't render
   `# Consumer Profile SS27 SLAIZ` as a headline. Keeps the content,
   drops the decoration. */
function cleanMarkdown(raw: string): string {
  return raw
    .replace(/^#+\s+/gm, '')              // headers: # ## ###
    .replace(/^[-*+]\s+/gm, '')           // bullet markers: - * +
    .replace(/^\d+\.\s+/gm, '')           // numbered lists: 1.
    .replace(/\*\*(.+?)\*\*/g, '$1')      // bold
    .replace(/\*(.+?)\*/g, '$1')          // italic
    .replace(/`([^`]+)`/g, '$1')          // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → just text
    .replace(/\n{3,}/g, '\n\n')           // collapse > 2 newlines
    .trim();
}

/* Split a cleaned CIS string into a punchy lead sentence + a concise
   body. Targets: lead ≤ 140 chars (one impactful sentence), body ≤
   420 chars (2-3 sentences). Falls back gracefully for short content. */
function extractLeadBody(raw: string | undefined): { lead?: string; body?: string } {
  if (!raw || !raw.trim()) return {};
  const cleaned = cleanMarkdown(raw);

  // Sentence tokenise — keep punctuation, skip fragments < 12 chars
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 12);

  if (!sentences.length) {
    // Short line, no punctuation — use it as lead, no body
    const one = cleaned.replace(/\s+/g, ' ').trim();
    return one ? { lead: one.slice(0, 180) } : {};
  }

  const LEAD_MAX = 150;
  const BODY_MAX = 420;

  // Pick the first sentence that fits the lead budget
  let leadIdx = sentences.findIndex(s => s.length <= LEAD_MAX);
  if (leadIdx === -1) {
    // All sentences too long — truncate the first to a word boundary
    const trimmed = sentences[0].slice(0, LEAD_MAX).replace(/\s\S*$/, '') + '…';
    return { lead: trimmed, body: sentences.slice(1).join(' ').slice(0, BODY_MAX) || undefined };
  }

  const lead = sentences[leadIdx];
  const rest = sentences.slice(leadIdx + 1).join(' ');
  let body: string | undefined;
  if (rest.length > BODY_MAX) {
    body = rest.slice(0, BODY_MAX).replace(/\s\S*$/, '') + '…';
  } else if (rest.length > 0) {
    body = rest;
  }
  return { lead, body };
}

export async function loadPresentationData(collectionPlanId: string): Promise<PresentationData> {
  const ctx = await loadFullContext(collectionPlanId);

  // Pull plan basics + launch date. launch_date lives on the timeline
  // row (collection_timelines), not on collection_plans.
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season, setup_data')
    .eq('id', collectionPlanId)
    .single();
  const { data: timelineRow } = await supabaseAdmin
    .from('collection_timelines')
    .select('launch_date, milestones')
    .eq('collection_plan_id', collectionPlanId)
    .maybeSingle();

  const data: PresentationData = {
    cover: {
      brandName: ctx.collectionName || plan?.name || undefined,
      season: ctx.season || plan?.season || undefined,
      launchDate: timelineRow?.launch_date ?? null,
    },
    narratives: {},
    stats: {},
    grids: {},
    timelines: {},
    overrides: {},
    hasAnyData: false,
  };

  // ─── Narrative templates ─────────────────────────────────────────
  // Pre-fetch the creative + marketing workspaces once. We need them for
  // narrative image hydration (consumer/brand/communications) and they're
  // also re-read further down for moodboard/distribution/financial — Supabase
  // caches but a single round-trip is cleaner.
  type CreativeWS = {
    blockData?: {
      moodboard?: { data?: { images?: string[] } };
      'brand-identity'?: { data?: { logoUrl?: string; iconUrl?: string; paletteHex?: string[]; typographyName?: string } };
    };
  };
  const { data: creativeWsRow } = await supabaseAdmin
    .from('collection_workspace_data')
    .select('data')
    .eq('collection_plan_id', collectionPlanId)
    .eq('workspace', 'creative')
    .maybeSingle();
  const creativeWs = (creativeWsRow?.data || {}) as CreativeWS;
  const moodboardImages = creativeWs.blockData?.moodboard?.data?.images ?? [];
  const brandBoard = creativeWs.blockData?.['brand-identity']?.data ?? {};

  // Latest editorial generation for this collection — used as the visual
  // anchor on the communications slide (the editorial is the brand voice
  // made photographic).
  const { data: latestEditorial } = await supabaseAdmin
    .from('ai_generations')
    .select('output_data')
    .eq('collection_plan_id', collectionPlanId)
    .eq('generation_type', 'editorial')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const editorialUrl = (latestEditorial?.output_data as { images?: { url: string }[] } | null)?.images?.[0]?.url;

  const consumerSplit = extractLeadBody(ctx.consumer);
  if (consumerSplit.lead || consumerSplit.body) {
    // Consumer slide gets a 2x2 mosaic from the moodboard — those images
    // were curated to evoke the consumer mindset, so they're the right
    // visual anchor here. Falls back gracefully when no moodboard.
    data.narratives.consumer = {
      ...consumerSplit,
      attribution: 'Consumer archetype · From your research',
      images: moodboardImages.slice(0, 4),
      imageMode: 'mosaic',
    };
    data.hasAnyData = true;
  }

  const brandSplit = extractLeadBody(ctx.brandDNA);
  if (brandSplit.lead || brandSplit.body) {
    // Brand identity prefers logo+typography composition; falls back to
    // palette swatch grid; final fallback is the legacy placeholder.
    const brandImages: string[] = [];
    if (brandBoard.logoUrl) brandImages.push(brandBoard.logoUrl);
    if (brandBoard.iconUrl && brandBoard.iconUrl !== brandBoard.logoUrl) brandImages.push(brandBoard.iconUrl);
    data.narratives['brand-identity'] = {
      ...brandSplit,
      attribution: 'Brand DNA · Core positioning',
      images: brandImages.length > 0 ? brandImages : undefined,
      paletteHex: (brandBoard.paletteHex && brandBoard.paletteHex.length > 0) ? brandBoard.paletteHex : undefined,
      imageMode: brandImages.length > 0 ? 'single' : (brandBoard.paletteHex?.length ? 'palette' : 'auto'),
    };
    data.hasAnyData = true;
  }

  const voiceSplit = extractLeadBody(ctx.brandVoice);
  if (voiceSplit.lead || voiceSplit.body) {
    // Communications slide pulls the latest editorial — the brand voice
    // made visual. If none yet, falls back to a moodboard mosaic.
    const commsImages = editorialUrl
      ? [editorialUrl]
      : moodboardImages.slice(0, 4);
    data.narratives.communications = {
      ...voiceSplit,
      attribution: 'Voice & tone · Communications spine',
      images: commsImages.length > 0 ? commsImages : undefined,
      imageMode: editorialUrl ? 'single' : 'mosaic',
    };
    data.hasAnyData = true;
  }

  // SKU thumbnails fetched once — needed for tech-pack (single hero) and
  // buying-strategy (mosaic of family representatives) narrative slides.
  const { data: thumbSkuRows } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, family, sketch_url, render_url, render_urls, reference_image_url, production_sample_url')
    .eq('collection_plan_id', collectionPlanId)
    .order('created_at', { ascending: true })
    .limit(20);
  const skuThumbs = (thumbSkuRows ?? []).map((s) => ({
    family: (s as { family?: string }).family || 'Other',
    url:
      ((s as { render_urls?: Record<string, string> }).render_urls?.['3d'] as string | undefined) ||
      (s as { render_url?: string }).render_url ||
      (s as { sketch_url?: string }).sketch_url ||
      (s as { production_sample_url?: string }).production_sample_url ||
      (s as { reference_image_url?: string }).reference_image_url ||
      undefined,
  })).filter((t) => !!t.url) as { family: string; url: string }[];

  // Tech-pack — derive from productCategory + existingSkus count.
  // Visual anchor: the first SKU's 3D render (most polished) as a single
  // hero — production-ready vibe.
  if (ctx.productCategory || ctx.existingSkus) {
    const parts: string[] = [];
    if (ctx.productCategory) parts.push(`Category: ${ctx.productCategory}`);
    if (ctx.existingSkus) parts.push(ctx.existingSkus.split('\n').slice(0, 3).join(' · '));
    if (parts.length) {
      data.narratives['tech-pack'] = {
        lead: 'Specs that a factory can build without a phone call.',
        body: parts.join(' · '),
        attribution: 'Tech pack · Production-ready',
        images: skuThumbs[0]?.url ? [skuThumbs[0].url] : undefined,
        imageMode: 'single',
        imageCaption: skuThumbs[0] ? `${skuThumbs[0].family.toUpperCase()} · LEAD STYLE` : undefined,
      };
      data.hasAnyData = true;
    }
  }

  // Buying strategy — derive from drops / sales target.
  // Visual anchor: family representatives as a 2x2 mosaic (one per family).
  if (ctx.drops || ctx.salesTarget) {
    const parts: string[] = [];
    if (ctx.drops) parts.push(`Drop cadence: ${ctx.drops.split('\n').length} drops planned.`);
    if (ctx.salesTarget) parts.push(`Revenue target ${ctx.salesTarget}.`);
    // One thumb per family, up to 4 — gives the buyer a sense of breadth.
    const seenFamilies = new Set<string>();
    const familyMosaic: string[] = [];
    for (const s of skuThumbs) {
      if (seenFamilies.has(s.family)) continue;
      seenFamilies.add(s.family);
      familyMosaic.push(s.url);
      if (familyMosaic.length >= 4) break;
    }
    data.narratives['buying-strategy'] = {
      lead: 'Narrow and deep over broad and shallow.',
      body: parts.join(' ') || undefined,
      attribution: 'Buying strategy · Season blueprint',
      images: familyMosaic.length > 0 ? familyMosaic : undefined,
      imageMode: 'mosaic',
    };
    data.hasAnyData = true;
  }

  // ─── Stats (EditorialStat) ──────────────────────────────────────

  // Market Research — the count of selected signals + a headline drawn
  // from the first trend. The CIS only stores the selected list, so we
  // count entries and treat the top entry as the headline.
  {
    const lines = ctx.trends ? ctx.trends.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const entries = lines.filter(l => /:|\(/.test(l));
    const count = entries.length || lines.length;
    if (count > 0) {
      const first = entries[0] || lines[0];
      const m = first.match(/^(.+?)(?:\s*\((.+?)\))?(?::\s*(.+))?$/);
      const title = m?.[1]?.trim() ?? first;
      const brands = m?.[2]?.trim();
      const desc = m?.[3]?.trim() ?? '';
      data.stats['market-research'] = {
        status: 'ready',
        value: String(count).padStart(2, '0'),
        caption: 'Signals tracked across global, deep-dive and live research',
        narrative: desc
          ? `${title}${brands ? ` · ${brands}` : ''} — ${desc.slice(0, 220)}${desc.length > 220 ? '…' : ''}`
          : `${title}${brands ? ` · ${brands}` : ''} anchors the season's visual voice.`,
        support: [
          { value: String(count), label: 'signals selected' },
          { value: '3', label: 'research streams' },
          { value: ctx.season || '—', label: 'season frame' },
        ],
      };
      data.hasAnyData = true;
    } else {
      data.stats['market-research'] = { status: 'pending' };
    }
  }

  // Distribution — read the merchandising workspace channels card.
  // We surface the channel mix (DTC / Wholesale / Retail as on/off) plus
  // the count of target markets. No CIS pipeline read — same pattern as
  // financial-plan: workspace is the source of truth, loader composes.
  {
    const { data: distRow } = await supabaseAdmin
      .from('collection_workspace_data')
      .select('data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('workspace', 'merchandising')
      .maybeSingle();
    type ChannelCfg = { enabled?: boolean; digital?: boolean; physical?: boolean };
    type Market = { name: string; region?: string; opportunity?: string; selected?: boolean };
    const dist = (distRow?.data || {}) as {
      cardData?: { channels?: { data?: { dtc?: ChannelCfg; wholesale?: ChannelCfg; markets?: Market[] } } };
    };
    const channels = dist.cardData?.channels?.data || {};
    const dtcOn = channels.dtc?.enabled === true;
    const wholesaleOn = channels.wholesale?.enabled === true;
    const markets = (channels.markets || []).filter(m => m.selected !== false);
    const highOpps = markets.filter(m => m.opportunity === 'high').length;

    if (dtcOn || wholesaleOn || markets.length > 0) {
      const label = dtcOn && wholesaleOn ? 'DTC + Wholesale' : dtcOn ? 'DTC-only' : wholesaleOn ? 'Wholesale-led' : 'Channel TBD';
      const primaryMarket = markets[0];
      const narrative = primaryMarket
        ? `Anchored in ${primaryMarket.name}${primaryMarket.region ? ` (${primaryMarket.region})` : ''}. ${markets.length} priority ${markets.length === 1 ? 'market' : 'markets'}${highOpps > 0 ? `, ${highOpps} flagged high-opportunity` : ''}.`
        : `${label} distribution — markets still being mapped.`;
      data.stats.distribution = {
        status: 'ready',
        value: markets.length > 0 ? String(markets.length).padStart(2, '0') : label,
        caption: markets.length > 0
          ? `Priority markets · ${label}`
          : 'Channel architecture',
        narrative,
        support: [
          { value: dtcOn ? 'YES' : '—', label: 'DTC active' },
          { value: wholesaleOn ? 'YES' : '—', label: 'wholesale active' },
          { value: String(markets.length), label: 'target markets' },
        ],
      };
      data.hasAnyData = true;
    } else {
      // Structurally wired, waiting for the user to fill the channels card.
      data.stats.distribution = { status: 'pending' };
    }
  }

  // Sales Dashboard — structurally wired; waits for post-launch sales
  // data. When that pipeline is available, swap this block to query
  // the sales metrics table. Until then, the slide renders an
  // explicit Work-in-Progress card (driven by status === 'pending').
  {
    // Placeholder read path — any future sales_metrics / drops revenue
    // source plugs in here. For now we always emit 'pending' so every
    // collection's deck surfaces the WIP state consistently.
    data.stats['sales-dashboard'] = { status: 'pending' };
  }

  // Financial Plan — compose from selected scenario + user assumptions.
  // Reads the merchandising workspace directly (not loadFullContext, to
  // keep the AI context lock untouched) and the drops table. Uses the
  // same pure compute() as the workspace, so the slide and the UI
  // always agree. Narrative comes from the AI button in the workspace;
  // when absent we still render KPIs with a short fallback sentence.
  {
    const { data: merchRow } = await supabaseAdmin
      .from('collection_workspace_data')
      .select('data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('workspace', 'merchandising')
      .maybeSingle();

    const merch = (merchRow?.data || {}) as {
      cardData?: { budget?: { data?: { inputs?: FinancialPlanInputs; narrative?: FinancialPlanNarrative } } };
    };
    const stored = merch.cardData?.budget?.data;
    const inputs = stored?.inputs ?? DEFAULT_INPUTS;
    const sources = await loadFinancialPlanSources(collectionPlanId);
    if (sources.scenarioId) {
      const derived = computeFinancialPlan(inputs, sources);
      const n = stored?.narrative;
      data.stats['financial-plan'] = {
        status: 'ready',
        value: formatEur(derived.kpis.totalInvestment, { compact: true }),
        caption: `Investment → ${formatEur(derived.kpis.expectedRevenue, { compact: true })} revenue${inputs.marketing.status === 'pending' ? ' · marketing pending' : ''}`,
        narrative: n?.thesis
          ?? `Pre-business plan composed from the ${sources.scenarioName ?? 'selected'} scenario. Gross margin ${formatPct(derived.kpis.grossMarginPct)}, payback ${Math.round(derived.kpis.paybackMonths)} months.`,
        support: [
          { value: formatPct(derived.kpis.grossMarginPct), label: 'gross margin' },
          { value: formatPct(derived.kpis.roi * 100), label: 'ROI' },
          { value: `${Math.round(derived.kpis.paybackMonths)} mo`, label: 'payback' },
        ],
      };
      data.hasAnyData = true;
    } else {
      // Structurally wired; waiting for a scenario in Buying Strategy.
      data.stats['financial-plan'] = { status: 'pending' };
    }
  }

  // ─── Grid templates ──────────────────────────────────────────────

  // Moodboard — prefer real uploaded images; fall back to keywords+trend tiles.
  {
    // Read moodboard images from the creative workspace directly. They
    // live at blockData.moodboard.data.images as string[]. We pick the
    // first 8 for a 4×2 photo mosaic on the slide.
    const { data: creativeRow } = await supabaseAdmin
      .from('collection_workspace_data')
      .select('data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('workspace', 'creative')
      .maybeSingle();
    const creative = (creativeRow?.data || {}) as {
      blockData?: { moodboard?: { data?: { images?: string[] } } };
    };
    const images = creative.blockData?.moodboard?.data?.images ?? [];

    if (images.length > 0) {
      data.grids.moodboard = {
        caption: `${images.length} reference${images.length === 1 ? '' : 's'} anchoring the visual voice.`,
        images: images.slice(0, 8),
      };
      data.hasAnyData = true;
    } else {
      const moodTiles: { eyebrow: string; label: string; value?: string }[] = [];
      if (ctx.moodboard) {
        const kwMatch = ctx.moodboard.match(/Keywords:\s*(.+)/);
        if (kwMatch) {
          kwMatch[1].split(/[,·]/).map(k => k.trim()).filter(Boolean).slice(0, 3).forEach((kw, i) => {
            moodTiles.push({ eyebrow: ['Texture', 'Form', 'Atmosphere'][i] ?? 'Signal', label: kw });
          });
        }
      }
      if (ctx.trends) {
        ctx.trends.split(/\n{1,2}/).map(s => s.trim()).filter(Boolean).slice(0, 6 - moodTiles.length).forEach((line, i) => {
          const m = line.match(/^(.+?)(?:\s*\((.+?)\))?(?::\s*(.+))?$/);
          const label = m?.[1]?.trim() ?? line;
          const brands = m?.[2]?.trim();
          moodTiles.push({
            eyebrow: brands || 'Trend',
            label: label.length > 36 ? label.slice(0, 36) + '…' : label,
            value: String(i + 1).padStart(2, '0'),
          });
        });
      }
      if (moodTiles.length) {
        data.grids.moodboard = {
          caption: 'Keywords and trend signals anchoring the visual voice.',
          tiles: moodTiles.slice(0, 6),
        };
        data.hasAnyData = true;
      }
    }
  }

  // Assortment & pricing — collection SKUs grouped by family.
  // Photo mode: when SKUs have a 3D render or sketch, show the family
  // representative as a real image (mosaic 3x2). Tiles stay as fallback
  // when the user hasn't generated visuals yet.
  {
    const { data: skuRows } = await supabaseAdmin
      .from('collection_skus')
      .select('name, family, subcategory, pvp, category, sketch_url, render_url, render_urls, reference_image_url, production_sample_url')
      .eq('collection_plan_id', collectionPlanId)
      .limit(40);
    if (skuRows?.length) {
      type SkuRow = (typeof skuRows)[number] & {
        render_urls?: Record<string, string>;
        sketch_url?: string;
        render_url?: string;
        reference_image_url?: string;
        production_sample_url?: string;
      };
      const pickThumb = (s: SkuRow): string | undefined =>
        s.render_urls?.['3d'] ||
        s.render_url ||
        s.sketch_url ||
        s.production_sample_url ||
        s.reference_image_url ||
        undefined;
      const byFamily: Record<string, SkuRow[]> = {};
      for (const s of skuRows as SkuRow[]) {
        const key = s.family || 'Other';
        (byFamily[key] ||= []).push(s);
      }
      const reps: { family: string; row: SkuRow }[] = [];
      for (const [family, rows] of Object.entries(byFamily)) {
        if (reps.length >= 6) break;
        const withImage = rows.find((r) => pickThumb(r));
        const rep = withImage || [...rows].sort((a, b) => (a.pvp ?? 0) - (b.pvp ?? 0))[Math.floor(rows.length / 2)];
        reps.push({ family, row: rep });
      }
      const tiles = reps.map(({ family, row }) => ({
        eyebrow: family,
        label: row.subcategory || row.name || family,
        value: row.pvp ? `€${row.pvp}` : undefined,
      }));
      const images = reps.map(({ row }) => pickThumb(row)).filter(Boolean) as string[];
      if (tiles.length) {
        data.grids['assortment-pricing'] = {
          caption: `${skuRows.length} SKUs across ${Object.keys(byFamily).length} families.`,
          tiles,
          // Only flip into photo mode when EVERY representative has an
          // image — otherwise the grid mixes photos and empty cells.
          images: images.length === reps.length ? images : undefined,
        };
        data.hasAnyData = true;
      }
    }
  }

  // Sketch & Color — first 6 SKUs as the design starting lineup.
  // Photo mode whenever the SKUs have a sketch or render — that's
  // the literal subject of this slide.
  {
    const { data: skuRows } = await supabaseAdmin
      .from('collection_skus')
      .select('name, family, subcategory, sketch_url, render_url, render_urls, reference_image_url, production_sample_url')
      .eq('collection_plan_id', collectionPlanId)
      .order('created_at', { ascending: true })
      .limit(6);
    if (skuRows?.length) {
      type SkuRow = (typeof skuRows)[number] & {
        render_urls?: Record<string, string>;
        sketch_url?: string;
        render_url?: string;
        reference_image_url?: string;
        production_sample_url?: string;
      };
      const pickThumb = (s: SkuRow): string | undefined =>
        s.render_urls?.['3d'] ||
        s.render_url ||
        s.sketch_url ||
        s.production_sample_url ||
        s.reference_image_url ||
        undefined;
      const images = (skuRows as SkuRow[])
        .map((s) => pickThumb(s))
        .filter(Boolean) as string[];
      data.grids['sketch-color'] = {
        caption: 'Opening round of sketches.',
        tiles: skuRows.map((s, i) => ({
          eyebrow: `SKU ${String(i + 1).padStart(2, '0')}`,
          label: s.subcategory || s.name || s.family,
          value: `R${Math.floor(i / 3) + 1}`,
        })),
        // Photo mode when at least 4 SKUs have a real image — keeps the
        // mosaic uniform. Below that, fall back to the textual tiles.
        images: images.length >= 4 ? images.slice(0, 6) : undefined,
      };
      data.hasAnyData = true;
    }
  }

  // Content studio — content pillars as tiles, plus the latest editorials
  // generated for this collection as a real photo mosaic when present.
  {
    // Editorial photo wall: pull the most recent 6 editorial images
    // across all SKUs. This is the single most valuable visual the user
    // produces — putting it in the deck is non-negotiable.
    const { data: editorialRows } = await supabaseAdmin
      .from('ai_generations')
      .select('output_data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('generation_type', 'editorial')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(6);
    const editorialImages: string[] = [];
    for (const row of editorialRows ?? []) {
      const imgs = (row.output_data as { images?: { url: string }[] } | null)?.images ?? [];
      for (const img of imgs) {
        if (img.url && editorialImages.length < 6) editorialImages.push(img.url);
      }
    }

    const pillars = ctx.contentPillars
      ? ctx.contentPillars.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6)
      : [];

    if (pillars.length || editorialImages.length) {
      data.grids['content-studio'] = {
        caption: editorialImages.length
          ? `${editorialImages.length} editorial${editorialImages.length === 1 ? '' : 's'} produced · ${pillars.length} content pillars`
          : `${pillars.length} content pillars feeding every channel.`,
        tiles: pillars.length
          ? pillars.map((p, i) => {
              const [name, desc] = p.split(':').map((s) => s?.trim() ?? '');
              return {
                eyebrow: String(i + 1).padStart(2, '0'),
                label: name,
                value: desc ? desc.slice(0, 3) : undefined,
              };
            })
          : undefined,
        images: editorialImages.length >= 3 ? editorialImages : undefined,
      };
      data.hasAnyData = true;
    }
  }

  // ─── Timeline templates ──────────────────────────────────────────

  // GTM Launch — drops as milestones (order by date)
  if (ctx.drops) {
    const dropLines = ctx.drops.split('\n').map(s => s.trim()).filter(Boolean);
    // Format: "NAME (YYYY-MM-DD) — channels — X% sales"
    type MStatus = 'done' | 'current' | 'next';
    const milestones: { date: string; label: string; status: MStatus }[] = dropLines.slice(0, 5).map(line => {
      const m = line.match(/^(.+?)\s*\((\d{4}-\d{2}-\d{2})\)/);
      const name = m?.[1]?.trim() ?? line;
      const date = m?.[2] ?? '';
      const when = date ? new Date(date) : null;
      const now = new Date();
      const status: MStatus = when && when < now ? 'done' : 'next';
      const dateLabel = when
        ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
        : '—';
      return { date: dateLabel, label: name.length > 24 ? name.slice(0, 24) + '…' : name, status };
    });
    // Mark the next upcoming as 'current'
    const nextIdx = milestones.findIndex(m => m.status === 'next');
    if (nextIdx >= 0) milestones[nextIdx].status = 'current';
    if (milestones.length) {
      data.timelines['gtm-launch'] = {
        lead: `${dropLines.length} drops mapped across the season.`,
        milestones,
      };
      data.hasAnyData = true;
    }
  }

  // Prototyping & Production — reuse the timeline row already fetched
  // above (collection_timelines has both launch_date and milestones).
  {
    if (timelineRow?.milestones) {
      const all = (timelineRow.milestones as Array<{ id: string; phase: string; name: string; status: string; startWeeksBefore: number }>) ?? [];
      const mkStatus = (s: string): 'done' | 'current' | 'next' => s === 'completed' ? 'done' : s === 'in-progress' ? 'current' : 'next';

      // Prototyping: phase=development, dd-7 through dd-10 (proto cycle + tech pack)
      const protoIds = ['dd-7', 'dd-8', 'dd-9', 'dd-19', 'dd-10'];
      const protoMs = protoIds.map(id => all.find(m => m.id === id)).filter(Boolean) as typeof all;
      if (protoMs.length) {
        data.timelines.prototyping = {
          lead: 'White proto → rectifications → final tech pack.',
          milestones: protoMs.slice(0, 5).map(m => ({
            date: `WK ${m.startWeeksBefore}`,
            label: m.name.length > 26 ? m.name.slice(0, 26) + '…' : m.name,
            status: mkStatus(m.status),
          })),
        };
        data.hasAnyData = true;
      }

      // Production: phase=development, dd-11 through dd-15 (samples + production)
      const prodIds = ['dd-11', 'dd-12', 'dd-13', 'dd-14', 'dd-15'];
      const prodMs = prodIds.map(id => all.find(m => m.id === id)).filter(Boolean) as typeof all;
      if (prodMs.length) {
        data.timelines.production = {
          lead: 'Bulk fabric → cutting & sewing → warehouse.',
          milestones: prodMs.slice(0, 5).map(m => ({
            date: `WK ${m.startWeeksBefore}`,
            label: m.name.length > 26 ? m.name.slice(0, 26) + '…' : m.name,
            status: mkStatus(m.status),
          })),
        };
        data.hasAnyData = true;
      }
    }
  }

  // ─── Apply per-slide deck overrides (owner-edited text) ─────────
  // Overrides win over CIS-derived values. They're kept in a separate
  // map too so the UI can surface "Revert to original" per field.
  const { data: overrideRows } = await supabaseAdmin
    .from('presentation_deck_overrides')
    .select('slide_id, field_overrides')
    .eq('collection_plan_id', collectionPlanId);

  for (const row of overrideRows ?? []) {
    const slideId = row.slide_id as string;
    const fields = (row.field_overrides as Record<string, string>) ?? {};
    if (!Object.keys(fields).length) continue;

    data.overrides[slideId] = fields;

    // Narrative overrides (F5.1 scope): lead / body / attribution.
    if (data.narratives[slideId]) {
      if (fields.lead) data.narratives[slideId].lead = fields.lead;
      if (fields.body) data.narratives[slideId].body = fields.body;
      if (fields.attribution) data.narratives[slideId].attribution = fields.attribution;
    } else if (fields.lead || fields.body) {
      data.narratives[slideId] = {
        lead: fields.lead,
        body: fields.body,
        attribution: fields.attribution,
      };
    }

    // Grid overrides (F5.3): dot-notation keys like `tiles.0.label`,
    // `tiles.3.eyebrow`. We apply them onto a copy of the existing
    // tiles array so non-edited tiles keep their CIS-derived content.
    if (data.grids[slideId]?.tiles) {
      const tiles = [...(data.grids[slideId].tiles ?? [])];
      let touched = false;
      for (const [k, v] of Object.entries(fields)) {
        const m = k.match(/^tiles\.(\d+)\.(label|eyebrow|value)$/);
        if (!m) continue;
        const idx = Number(m[1]);
        const prop = m[2] as 'label' | 'eyebrow' | 'value';
        if (tiles[idx]) {
          tiles[idx] = { ...tiles[idx], [prop]: v };
          touched = true;
        }
      }
      if (touched) data.grids[slideId].tiles = tiles;
    }

    // Timeline overrides: dot-notation keys `milestones.N.{label|date|status}`
    // plus the free-form `lead`. Status accepts only the three enum values;
    // anything else is discarded.
    if (data.timelines[slideId]?.milestones) {
      const ms = [...(data.timelines[slideId].milestones ?? [])];
      const validStatus = (s: string): s is 'done' | 'current' | 'next' =>
        s === 'done' || s === 'current' || s === 'next';
      let touched = false;
      for (const [k, v] of Object.entries(fields)) {
        const m = k.match(/^milestones\.(\d+)\.(label|date|status)$/);
        if (!m) continue;
        const idx = Number(m[1]);
        const prop = m[2] as 'label' | 'date' | 'status';
        if (!ms[idx]) continue;
        if (prop === 'status') {
          if (validStatus(v)) {
            ms[idx] = { ...ms[idx], status: v };
            touched = true;
          }
        } else {
          ms[idx] = { ...ms[idx], [prop]: v };
          touched = true;
        }
      }
      if (touched) data.timelines[slideId].milestones = ms;
      if (fields.lead) data.timelines[slideId].lead = fields.lead;
    }
  }

  return data;
}
