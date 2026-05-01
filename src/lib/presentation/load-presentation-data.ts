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

export interface RangeWallSlideData {
  caption?: string;
  /** SKU thumbnails to render as a photo wall (up to 12). */
  items?: { url: string; family?: string; name?: string; pvp?: number }[];
  /** Aggregated stats shown in the corner — total SKUs, families, drops. */
  stats?: { total: number; families: number; drops?: number; revenue?: string };
}

export interface PaletteSlideData {
  caption?: string;
  swatches?: { hex: string; role?: string }[];
  typography?: {
    displayName?: string;
    bodyName?: string;
    sample?: string;
    weight?: string;
    tracking?: string;
  };
}

export interface ScenarioCompareSlideData {
  caption?: string;
  selectedId?: string;
  scenarios?: {
    id: string;
    name: string;
    description?: string;
    skuCount?: number;
    families?: { name: string; count: number }[];
    investment?: string;
    revenue?: string;
    margin?: string;
    role?: string;
  }[];
}

export interface MaterialZonesSlideData {
  caption?: string;
  sketchUrl?: string;
  productName?: string;
  family?: string;
  rows?: { zone: string; hex?: string; material?: string; supplier?: string }[];
}

export interface ChannelMapSlideData {
  caption?: string;
  /** Web store status — connected/coming. */
  webStore?: { status: 'live' | 'coming'; provider?: string };
  /** DTC channels: digital + physical flags. */
  dtc?: { enabled: boolean; digital: boolean; physical: boolean };
  /** Wholesale channels + order count. */
  wholesale?: { enabled: boolean; ordersCount: number; valueLabel?: string };
  /** Top markets — name + region + opportunity tag. */
  markets?: { name: string; region?: string; opportunity?: 'high' | 'medium' | 'low' }[];
}

export interface PresentationData {
  cover: CoverSlideData;
  narratives: Record<string, NarrativeSlideData>;  // keyed by slide id
  stats: Record<string, StatSlideData>;
  grids: Record<string, GridSlideData>;
  timelines: Record<string, TimelineSlideData>;
  ranges: Record<string, RangeWallSlideData>;
  channels: Record<string, ChannelMapSlideData>;
  palettes: Record<string, PaletteSlideData>;
  scenarioCompares: Record<string, ScenarioCompareSlideData>;
  materialZones: Record<string, MaterialZonesSlideData>;
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
    ranges: {},
    channels: {},
    palettes: {},
    scenarioCompares: {},
    materialZones: {},
    overrides: {},
    hasAnyData: false,
  };

  // ─── Narrative templates ─────────────────────────────────────────
  // Pre-fetch the creative + marketing workspaces once. We need them for
  // narrative image hydration (consumer/brand/communications) and they're
  // also re-read further down for moodboard/distribution/financial — Supabase
  // caches but a single round-trip is cleaner.
  // Workspace shape (verified against creative/page.tsx + BrandBoardCanvas):
  //   blockData.moodboard.data.images   → string[] of moodboard image URLs.
  //   blockData['brand-dna'].data       → { brandName, colors[], colorPalette[],
  //                                         tone, typography, style, ... }
  // Past versions of this loader assumed brand-identity / logoUrl /
  // paletteHex / typographyName fields that DON'T exist in the workspace —
  // that mismatch is what caused the Palette slide to render the template's
  // hard-coded fallback swatches.
  // Verified shape of blockData['brand-dna'].data on SS27 SLAIZ:
  //   brandName, _brief, personality, tone, style, keywords[], toneKeywords[],
  //   colors[] (legacy "#HEX (name)" strings),
  //   colorPalette[] (current shape: { hex, name, role }),
  //   typographyFont (e.g. "Inter"),
  //   typographyMood (longer descriptive paragraph),
  //   visualIdentityImages[] (Freepik URLs from the AI brand pipeline),
  //   doNot[] (explicit don't-rules), accentColor, primaryColor, secondaryColor.
  // We treat anything that isn't here as missing — never invent.
  type ColorEntry = { hex: string; name?: string; role?: string };
  type CreativeWS = {
    blockData?: {
      moodboard?: { data?: { images?: string[] } };
      'brand-dna'?: {
        data?: {
          brandName?: string;
          _brief?: string;
          personality?: string;
          tone?: string;
          style?: string;
          colors?: string[];
          colorPalette?: ColorEntry[];
          typographyFont?: string;
          typographyMood?: string;
          visualIdentityImages?: string[];
          logoUrl?: string; // canvas doesn't currently expose this — kept for future
        };
      };
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
  const brandData = creativeWs.blockData?.['brand-dna']?.data ?? {};

  // Normalise the palette: prefer the new colorPalette[] entries, fall
  // back to parsing the legacy colors[] strings ("#HEX (Name)").
  const paletteEntries: ColorEntry[] = (() => {
    if (Array.isArray(brandData.colorPalette) && brandData.colorPalette.length > 0) {
      return brandData.colorPalette;
    }
    if (Array.isArray(brandData.colors)) {
      return brandData.colors
        .map((raw) => {
          const str = String(raw).trim();
          const hexMatch = str.match(/#?([A-Fa-f0-9]{6})/);
          if (!hexMatch) return null;
          const nameMatch = str.match(/\(([^)]+)\)/);
          return {
            hex: `#${hexMatch[1].toUpperCase()}`,
            name: nameMatch ? nameMatch[1] : undefined,
          } as ColorEntry;
        })
        .filter((x): x is ColorEntry => !!x);
    }
    return [];
  })();
  const paletteHex = paletteEntries.map((c) => c.hex);

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

  // Some installs stored consumer fields (demographics/psychographics) as
  // structured JSONB rather than free text — load-full-context joins them
  // verbatim so we get "[object Object]" in the narrative. Strip those
  // tokens and collapse the surrounding whitespace before extracting the
  // lead/body. The string-typed fields (lifestyle, persona narrative) are
  // preserved untouched.
  const consumerClean =
    typeof ctx.consumer === 'string'
      ? ctx.consumer.replace(/\[object Object\]/g, '').replace(/\n{2,}/g, '\n').trim()
      : ctx.consumer;
  const consumerSplit = extractLeadBody(consumerClean);
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

  // Brand identity narrative — read DIRECTLY from the workspace blockData.
  // We do NOT fall back to ctx.brandDNA because loadFullContext concatenates
  // multiple fields (tone, typography, keywords) into that string, which
  // contaminated the brand-identity slide body and made it duplicate the
  // voice-and-tone slide. The workspace _brief/personality/style fields
  // are the canonical brand-identity source for THIS slide.
  {
    const wsBrandText =
      brandData._brief || brandData.personality || brandData.style || '';
    const brandSplit = wsBrandText ? extractLeadBody(wsBrandText) : {};

    if (brandSplit.lead || brandSplit.body) {
      const visualImages = brandData.visualIdentityImages ?? [];
      const brandImages: string[] = brandData.logoUrl ? [brandData.logoUrl] : [];
      const hasLogo = brandImages.length > 0;
      const hasVisuals = visualImages.length > 0;
      const hasPalette = paletteHex.length > 0;
      data.narratives['brand-identity'] = {
        ...brandSplit,
        attribution: 'Brand DNA',
        images: hasLogo
          ? brandImages
          : hasVisuals
            ? visualImages.slice(0, 4)
            : undefined,
        paletteHex: !hasLogo && !hasVisuals && hasPalette ? paletteHex : undefined,
        imageMode: hasLogo
          ? 'single'
          : hasVisuals
            ? 'mosaic'
            : hasPalette
              ? 'palette'
              : 'auto',
      };
      data.hasAnyData = true;
    }
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

  // Tech-pack — narrative composed strictly from CIS facts. We do NOT
  // invent a quotable lead sentence; the slide either renders the user's
  // own data or shows the empty state. The body is just structured facts
  // (category + first 3 SKUs), not a marketing tagline.
  if (ctx.productCategory || ctx.existingSkus) {
    const parts: string[] = [];
    if (ctx.productCategory) {
      // Map Spanish category labels (saved verbatim in BD) to English
      // for the English-rendered deck. Falls back to the raw value
      // (title-cased) when no mapping exists.
      const CATEGORY_LABELS: Record<string, string> = {
        CALZADO: 'Footwear',
        ROPA: 'Apparel',
        ACCESORIOS: 'Accessories',
      };
      const cat =
        CATEGORY_LABELS[ctx.productCategory.toUpperCase()] ??
        ctx.productCategory.charAt(0) + ctx.productCategory.slice(1).toLowerCase();
      parts.push(`Category: ${cat}`);
    }
    if (ctx.existingSkus) {
      parts.push(ctx.existingSkus.split('\n').filter((l) => l.trim()).slice(0, 3).join(' · '));
    }
    if (parts.length) {
      data.narratives['tech-pack'] = {
        body: parts.join(' · '),
        attribution: 'Tech pack',
        images: skuThumbs[0]?.url ? [skuThumbs[0].url] : undefined,
        imageMode: 'single',
        imageCaption: skuThumbs[0] ? `${skuThumbs[0].family.toUpperCase()} · LEAD STYLE` : undefined,
      };
      data.hasAnyData = true;
    }
  }

  // Buying strategy — narrative is intentionally NOT auto-composed.
  // CIS does not store a "thesis" string for this mini-block, and the
  // Phase 1 attempt that tried to write one ("Narrow and deep over broad
  // and shallow") was hard-coded marketing copy, not the user's words.
  // The slide now renders the deck-override text once the user types it,
  // or the empty-state placeholder otherwise. The dedicated
  // buying-scenarios slide carries the structural comparison.

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

  // Sales Dashboard — pre-launch we have a FORECAST (compose KPIs from
  // SKU expected_sales × pvp), post-launch we'd swap to real sales rows.
  // The Sales Dashboard card in the workspace already does this exact
  // computation; we mirror it here so the deck stays in sync.
  {
    const { data: forecastSkus } = await supabaseAdmin
      .from('collection_skus')
      .select('expected_sales, pvp, buy_units, margin, sale_percentage')
      .eq('collection_plan_id', collectionPlanId);
    const f = (forecastSkus ?? []) as Array<{
      expected_sales?: number;
      pvp?: number;
      buy_units?: number;
      margin?: number;
      sale_percentage?: number;
    }>;
    if (f.length > 0) {
      // CRITICAL: in collection_skus, `expected_sales` is stored as REVENUE
      // in euros (see brief/create/route.ts: expected_sales = buy_units ×
      // sale_percentage/100 × pvp). It is NOT a unit count. So the deck's
      // total revenue is sum(expected_sales) directly. Multiplying by pvp
      // again doubles the units and produces an inflated €4.5M instead of
      // the real €143K for SLAIZ.
      const totalRevenue = f.reduce((s, sku) => s + (sku.expected_sales ?? 0), 0);
      const totalBuyUnits = f.reduce((s, sku) => s + (sku.buy_units ?? 0), 0);
      const avgPvp = f.reduce((s, sku) => s + (sku.pvp ?? 0), 0) / f.length;
      const avgSellThrough = f.reduce((s, sku) => s + (sku.sale_percentage ?? 0), 0) / f.length;
      // Units we expect to actually sell across the season.
      const unitsSoldForecast = Math.round(totalBuyUnits * (avgSellThrough / 100));
      const fmt = (n: number) => {
        if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1000) return `€${Math.round(n / 1000)}K`;
        return `€${Math.round(n)}`;
      };
      data.stats['sales-dashboard'] = {
        status: 'ready',
        value: fmt(totalRevenue),
        // SKU-level forecast: the headline number is what the SKUs as
        // currently sized add up to. Distinct from Financial Plan, which
        // shows the selected scenario's commercial target.
        caption: 'SKU-level revenue forecast · Pre-launch projection',
        narrative: `Aggregated from ${f.length} SKUs across the planned drops. ${
          totalBuyUnits > 0
            ? `${totalBuyUnits.toLocaleString()} units to be produced; ${unitsSoldForecast.toLocaleString()} units expected to sell at €${Math.round(avgPvp)} average PVP. `
            : ''
        }Holds the ${Math.round(avgSellThrough)}% sell-through assumed per SKU. Year-1 commercial target lives in the Financial Plan slide.`,
        support: [
          { value: unitsSoldForecast.toLocaleString(), label: 'units to sell' },
          { value: `€${Math.round(avgPvp)}`, label: 'avg PVP' },
          { value: `${Math.round(avgSellThrough)}%`, label: 'sell-through target' },
        ],
      };
      data.hasAnyData = true;
    } else {
      data.stats['sales-dashboard'] = { status: 'pending' };
    }
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

      // ctx.moodboard can arrive as either a flat string ("Keywords: a, b, c\n…")
      // when compiled from the AI brand-DNA pipeline, or as a structured object
      // {keywords: string[], trend_signals: string[]} when stored directly from
      // moodboard_analysis. Handle both — and ignore anything else so a malformed
      // record never crashes the deck.
      const mb: unknown = ctx.moodboard;
      let mbKeywords: string[] = [];
      if (typeof mb === 'string') {
        const kwMatch = mb.match(/Keywords:\s*(.+)/);
        if (kwMatch) mbKeywords = kwMatch[1].split(/[,·]/).map(k => k.trim()).filter(Boolean);
      } else if (mb && typeof mb === 'object' && Array.isArray((mb as { keywords?: unknown }).keywords)) {
        mbKeywords = ((mb as { keywords: unknown[] }).keywords)
          .map(k => String(k).trim())
          .filter(Boolean);
      }
      mbKeywords.slice(0, 3).forEach((kw, i) => {
        moodTiles.push({ eyebrow: ['Texture', 'Form', 'Atmosphere'][i] ?? 'Signal', label: kw });
      });

      if (typeof ctx.trends === 'string' && ctx.trends) {
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
      .select('name, family, pvp, category, sketch_url, render_url, render_urls, reference_image_url, production_sample_url')
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
        label: row.name || family,
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
      .select('name, family, sketch_url, render_url, render_urls, reference_image_url, production_sample_url')
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
          label: s.name || s.family,
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

      // Prototyping: dd-7..dd-10 + dd-19. We sort by startWeeksBefore DESC
      // so the timeline reads in real chronological order (countdown to launch:
      // larger week-before number = earlier in the calendar).
      const protoIds = ['dd-7', 'dd-8', 'dd-9', 'dd-19', 'dd-10'];
      const protoMs = (protoIds.map(id => all.find(m => m.id === id)).filter(Boolean) as typeof all)
        .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore);
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

      // Production: dd-11..dd-15. Same DESC sort defensively.
      const prodIds = ['dd-11', 'dd-12', 'dd-13', 'dd-14', 'dd-15'];
      const prodMs = (prodIds.map(id => all.find(m => m.id === id)).filter(Boolean) as typeof all)
        .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore);
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

  // ─── Range Wall slides (collection-builder + final-selection) ──
  // Photo wall of the user's actual collection. Builder slide takes ALL
  // SKUs in the collection; Final Selection takes only those marked
  // production_approved (or falls back to the full set if approval is
  // not yet flagged — this avoids a blank slide pre-launch).
  {
    const { data: allSkus } = await supabaseAdmin
      .from('collection_skus')
      .select('id, name, family, pvp, sketch_url, render_url, render_urls, reference_image_url, production_sample_url, production_approved')
      .eq('collection_plan_id', collectionPlanId)
      .order('drop_number', { ascending: true })
      .order('created_at', { ascending: true });
    type SkuRow = NonNullable<typeof allSkus>[number] & {
      render_urls?: Record<string, string>;
      production_sample_url?: string | null;
      sketch_url?: string | null;
      render_url?: string | null;
      reference_image_url?: string | null;
      production_approved?: boolean | null;
    };
    const pickThumb = (s: SkuRow): string | undefined =>
      s.render_urls?.['3d'] ||
      s.render_url ||
      s.sketch_url ||
      s.production_sample_url ||
      s.reference_image_url ||
      undefined;

    if (allSkus && allSkus.length > 0) {
      const rows = allSkus as SkuRow[];
      const families = new Set(rows.map((s) => s.family || 'Other'));
      const drops = ctx.drops ? ctx.drops.split('\n').filter((l) => l.trim()).length : undefined;

      // Collection Builder: 12 best thumbs across the whole collection
      const builderItems = rows
        .map((s) => ({
          url: pickThumb(s),
          family: s.family || undefined,
          name: s.name || undefined,
          pvp: typeof s.pvp === 'number' ? s.pvp : undefined,
        }))
        .filter((x) => typeof x.url === 'string')
        .map((x) => ({ url: x.url as string, family: x.family, name: x.name, pvp: x.pvp }))
        .slice(0, 12);
      if (builderItems.length > 0) {
        data.ranges['collection-builder'] = {
          caption: `Every style, every drop. The full season at a glance.`,
          items: builderItems,
          stats: {
            total: rows.length,
            families: families.size,
            drops,
          },
        };
        data.hasAnyData = true;
      }

      // Final Selection: ONLY production_approved SKUs.
      // We DO NOT fall back to the full set anymore — that made this slide
      // visually identical to Collection Builder for any pre-approval
      // collection, which lied about the production-approval state. When
      // approved is empty, we emit nothing here so the template renders
      // the contextual empty state ("No styles approved yet — approve in
      // Production to lock the lineup").
      const approvedRows = rows.filter((s) => s.production_approved === true);
      const finalItems = approvedRows
        .map((s) => ({
          url: pickThumb(s),
          family: s.family || undefined,
          name: s.name || undefined,
          pvp: typeof s.pvp === 'number' ? s.pvp : undefined,
        }))
        .filter((x) => typeof x.url === 'string')
        .map((x) => ({ url: x.url as string, family: x.family, name: x.name, pvp: x.pvp }))
        .slice(0, 12);
      if (finalItems.length > 0) {
        data.ranges['final-selection'] = {
          caption: `${approvedRows.length} styles approved for production.`,
          items: finalItems,
          stats: {
            total: approvedRows.length,
            families: new Set(approvedRows.map((s) => s.family || 'Other')).size,
            drops,
          },
        };
        data.hasAnyData = true;
      }
    }
  }

  // ─── Channel Map (point-of-sale) ───────────────────────────────────
  // Reads the merchandising workspace channels card + wholesale orders
  // count. Web store is hard-coded to 'coming' until the integration
  // ships; flip to 'live' when we wire Shopify/woo.
  {
    const { data: merchRow } = await supabaseAdmin
      .from('collection_workspace_data')
      .select('data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('workspace', 'merchandising')
      .maybeSingle();
    type ChannelCfg = { enabled?: boolean; digital?: boolean; physical?: boolean };
    type Market = { name: string; region?: string; opportunity?: 'high' | 'medium' | 'low'; selected?: boolean };
    const merch = (merchRow?.data || {}) as {
      cardData?: { channels?: { data?: { dtc?: ChannelCfg; wholesale?: ChannelCfg; markets?: Market[] } } };
    };
    const channels = merch.cardData?.channels?.data || {};
    const dtcCfg = channels.dtc;
    const wholesaleCfg = channels.wholesale;
    const markets = (channels.markets || []).filter((m) => m.selected !== false);

    const { data: orderRows, count: orderCount } = await supabaseAdmin
      .from('wholesale_orders')
      .select('id, total_value', { count: 'exact' })
      .eq('collection_plan_id', collectionPlanId);
    const totalWholesaleValue =
      orderRows?.reduce((sum, o) => sum + ((o.total_value as number) || 0), 0) ?? 0;

    const formatMoney = (n: number) => {
      if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1000) return `€${Math.round(n / 1000)}K`;
      return `€${n}`;
    };

    const hasAnyChannel =
      !!dtcCfg?.enabled || !!wholesaleCfg?.enabled || markets.length > 0 || (orderCount ?? 0) > 0;

    if (hasAnyChannel) {
      data.channels['point-of-sale'] = {
        caption: 'How the collection reaches buyers — channels, markets, and active orders.',
        webStore: { status: 'coming', provider: 'Shopify integration · Q3' },
        dtc: dtcCfg
          ? { enabled: !!dtcCfg.enabled, digital: !!dtcCfg.digital, physical: !!dtcCfg.physical }
          : undefined,
        wholesale: {
          enabled: !!wholesaleCfg?.enabled,
          ordersCount: orderCount ?? 0,
          valueLabel: totalWholesaleValue > 0 ? formatMoney(totalWholesaleValue) : undefined,
        },
        markets: markets.map((m) => ({
          name: m.name,
          region: m.region,
          opportunity: m.opportunity,
        })),
      };
      data.hasAnyData = true;
    }
  }

  // ─── Brand expansions: brand-logo, brand-palette, brand-voice ──
  // We ONLY emit data when the user has actually saved something. No
  // synthetic copy ("The mark.", "A logo is a promise…", a stock pangram
  // for the typography sample, etc.). When data is missing, the slide
  // renders an explicit empty state pointing the user back to Creative.
  {
    // brand-logo: only when the user has uploaded a logo image. The
    // BrandBoardCanvas does not currently save a logoUrl field, so this
    // is normally empty until that affordance ships.
    if (brandData.logoUrl) {
      data.narratives['brand-logo'] = {
        attribution: 'Logo',
        images: [brandData.logoUrl],
        imageMode: 'single',
      };
      data.hasAnyData = true;
    }

    // brand-palette: only when palette swatches OR typography are saved.
    // The "sample" sentence is INTENTIONALLY left undefined — we don't
    // want a stock pangram pretending to be the user's voice.
    const typoName = brandData.typographyFont || undefined;
    if (paletteEntries.length > 0 || typoName) {
      const swatches = paletteEntries.slice(0, 5).map((c) => ({
        hex: c.hex,
        // Strip leading "primary —" / "accent —" prefixes from the saved
        // descriptive name so the swatch label reads cleanly. Falls back
        // to the structured role when the descriptive name is empty.
        role: (c.name?.split(' — ')[0]?.trim()) || c.role || undefined,
      }));
      data.palettes['brand-palette'] = {
        caption:
          paletteEntries.length > 0 && typoName
            ? 'Color and typography saved in Brand Identity.'
            : paletteEntries.length > 0
              ? `${paletteEntries.length} colors saved in Brand Identity.`
              : 'Typography saved in Brand Identity.',
        swatches: swatches.length > 0 ? swatches : undefined,
        typography: typoName ? { displayName: typoName } : undefined,
      };
      data.hasAnyData = true;
    }

    // brand-voice: prefer CIS brandVoice, fall back to the workspace
    // tone field (verified present on SS27 SLAIZ as a long descriptive
    // paragraph that IS the brand voice).
    {
      const cisVoiceSplit = extractLeadBody(ctx.brandVoice);
      const wsVoice = brandData.tone || '';
      const wsVoiceSplit = wsVoice ? extractLeadBody(wsVoice) : {};
      const voiceSplit =
        cisVoiceSplit.lead || cisVoiceSplit.body
          ? cisVoiceSplit
          : wsVoiceSplit;
      if (voiceSplit.lead || voiceSplit.body) {
        const voiceImages = editorialUrl
          ? [editorialUrl]
          : moodboardImages.slice(0, 4);
        data.narratives['brand-voice'] = {
          ...voiceSplit,
          attribution: 'Voice & tone',
          images: voiceImages.length > 0 ? voiceImages : undefined,
          imageMode: editorialUrl ? 'single' : 'mosaic',
        };
        data.hasAnyData = true;
      }
    }
  }

  // ─── Buying Strategy expansions: scenarios + drops ─────────────────
  {
    // Scenarios — read from collection_decisions / merchandising workspace.
    // The Buying Strategy module saves the full set of generated scenarios
    // plus the selected one. Shape is { scenarios: [...], selectedId }.
    const { data: merchRow } = await supabaseAdmin
      .from('collection_workspace_data')
      .select('data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('workspace', 'merchandising')
      .maybeSingle();
    type ScenarioRaw = {
      id: string;
      name: string;
      description?: string;
      skuCount?: number;
      families?: { name: string; count: number }[];
      financials?: { totalInvestment?: number; firstYearSalesTarget?: number; targetMargin?: number };
      commercialRole?: string;
      bestFor?: string;
    };
    const merch = (merchRow?.data || {}) as {
      cardData?: {
        scenarios?: { data?: { scenarios?: ScenarioRaw[]; selectedId?: string | null } };
      };
    };
    const stored = merch.cardData?.scenarios?.data;
    const rawScenarios = stored?.scenarios ?? [];
    if (rawScenarios.length > 0) {
      const fmt = (n?: number) => {
        if (n === undefined) return undefined;
        if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1000) return `€${Math.round(n / 1000)}K`;
        return `€${Math.round(n)}`;
      };
      data.scenarioCompares['buying-scenarios'] = {
        caption: 'Three paths through the season. Same brand, different bets on breadth and depth.',
        selectedId: stored?.selectedId ?? undefined,
        scenarios: rawScenarios.slice(0, 3).map((sc) => ({
          id: sc.id,
          name: sc.name,
          description: sc.description || sc.bestFor,
          skuCount: sc.skuCount,
          families: sc.families,
          investment: fmt(sc.financials?.totalInvestment),
          revenue: fmt(sc.financials?.firstYearSalesTarget),
          margin:
            typeof sc.financials?.targetMargin === 'number'
              ? `${Math.round(sc.financials.targetMargin)}%`
              : undefined,
          role: sc.commercialRole,
        })),
      };
      data.hasAnyData = true;
    }

    // Drop architecture — drops as grid tiles (date · channels · share).
    if (ctx.drops) {
      const dropLines = ctx.drops.split('\n').map((s) => s.trim()).filter(Boolean);
      const dropTiles = dropLines.slice(0, 6).map((line, i) => {
        const m = line.match(/^(.+?)\s*\((\d{4}-\d{2}-\d{2})\)(?:\s*[—-]\s*(.+))?$/);
        const name = m?.[1]?.trim() ?? line;
        const date = m?.[2];
        const detail = m?.[3]?.trim() ?? '';
        const dateLabel = date
          ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
          : '';
        return {
          eyebrow: `Drop ${String(i + 1).padStart(2, '0')}`,
          label: name.length > 28 ? `${name.slice(0, 28)}…` : name,
          value: dateLabel || (detail.length > 0 ? detail.slice(0, 18) : undefined),
        };
      });
      if (dropTiles.length > 0) {
        data.grids['buying-drops'] = {
          caption: `${dropLines.length} drops sequenced across the season. Each one tells the next chapter.`,
          tiles: dropTiles,
        };
        data.hasAnyData = true;
      }
    }
  }

  // ─── Sketch & Color expansions: colorways + material-zones ─────────
  {
    // Colorways — fetch the actual rows from sku_colorways for the SKUs
    // in this collection. Each colorway gets one tile with the primary
    // hex as the "value" badge and zones[].hex as a mini-strip.
    const { data: colorwayRows } = await supabaseAdmin
      .from('sku_colorways')
      .select('id, sku_id, name, hex_primary, hex_secondary, hex_accent, zones, status')
      .in(
        'sku_id',
        (skuThumbs.length > 0
          ? (await supabaseAdmin
              .from('collection_skus')
              .select('id')
              .eq('collection_plan_id', collectionPlanId)
            ).data?.map((r) => r.id as string) || []
          : []),
      );

    if (colorwayRows && colorwayRows.length > 0) {
      type CW = {
        name?: string;
        hex_primary?: string;
        zones?: { zone: string; hex: string }[];
        status?: string;
      };
      // Dedupe by (name + hex_primary) — multiple SKUs can share the same
      // colorway (e.g. "Burnt Sienna Route" applied to 3 SKUs is ONE
      // colorway story, not three identical tiles). Also drop unnamed
      // placeholder rows ("Colorway 1", "Untitled", empty) so the slide
      // only shows colorways the user actually authored.
      const seen = new Set<string>();
      const isPlaceholder = (n?: string) =>
        !n || /^untitled$/i.test(n.trim()) || /^colorway\s*\d+$/i.test(n.trim());
      const unique: CW[] = [];
      for (const cw of colorwayRows as CW[]) {
        if (isPlaceholder(cw.name)) continue;
        const key = `${(cw.name || '').toLowerCase().trim()}|${(cw.hex_primary || '').toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(cw);
      }
      // Sort: approved first, then proposed; alphabetical within each.
      const statusRank = (s?: string) =>
        s === 'approved' ? 0 : s === 'proposed' ? 1 : 2;
      unique.sort((a, b) => {
        const r = statusRank(a.status) - statusRank(b.status);
        return r !== 0 ? r : (a.name || '').localeCompare(b.name || '');
      });
      const tiles = unique.slice(0, 6).map((cw) => ({
        eyebrow: cw.status?.toUpperCase() || 'COLORWAY',
        label: cw.name || 'Untitled',
        value: cw.hex_primary?.toUpperCase() || undefined,
      }));
      if (tiles.length > 0) {
        data.grids['colorways'] = {
          caption:
            unique.length === 1
              ? '1 colorway across the season.'
              : `${unique.length} colorways across the season. Each one a complete world.`,
          tiles,
        };
        data.hasAnyData = true;
      }
    }

    // Material zones — pick the lead SKU (first with material_zones data
    // populated, otherwise just the first with a sketch) and render its
    // zone breakdown alongside the colorway hex when present.
    const { data: mzSkuRows } = await supabaseAdmin
      .from('collection_skus')
      .select('id, name, family, sketch_url, render_url, render_urls, material_zones')
      .eq('collection_plan_id', collectionPlanId)
      .order('created_at', { ascending: true })
      .limit(20);
    type MzSku = {
      id: string;
      name?: string;
      family?: string;
      sketch_url?: string;
      render_url?: string;
      render_urls?: Record<string, string>;
      material_zones?: { zone: string; material?: string; supplier?: string }[];
    };
    const lead = (mzSkuRows as MzSku[] | null)?.find(
      (s) => Array.isArray(s.material_zones) && s.material_zones.length > 0,
    ) ?? (mzSkuRows as MzSku[] | null)?.find((s) => s.sketch_url || s.render_urls?.['3d'] || s.render_url);
    if (lead) {
      // Pull the lead SKU's first colorway to attach hex per zone.
      const { data: leadCw } = await supabaseAdmin
        .from('sku_colorways')
        .select('zones')
        .eq('sku_id', lead.id)
        .limit(1)
        .maybeSingle();
      const cwZones = ((leadCw?.zones as { zone: string; hex: string }[] | null) ?? []) as {
        zone: string;
        hex: string;
      }[];
      const hexByZone = new Map(cwZones.map((z) => [z.zone, z.hex]));
      const mzList = (lead.material_zones ?? []) as { zone: string; material?: string; supplier?: string }[];
      const baseRows = mzList.length > 0
        ? mzList
        : cwZones.map((z) => ({ zone: z.zone })); // fallback to colorway zones
      const rows = baseRows.slice(0, 9).map((r) => ({
        zone: r.zone,
        hex: hexByZone.get(r.zone),
        material: (r as { material?: string }).material,
        supplier: (r as { supplier?: string }).supplier,
      }));
      data.materialZones['material-zones'] = {
        caption: 'Each zone, each material, each supplier — the brief that bridges design and the factory.',
        sketchUrl: lead.render_urls?.['3d'] || lead.render_url || lead.sketch_url || undefined,
        productName: lead.name,
        family: lead.family,
        rows: rows.length > 0 ? rows : undefined,
      };
      data.hasAnyData = true;
    }
  }

  // ─── Content Studio expansions: models, editorial wall, still life ─
  {
    // Models — aimily models that have been associated with this
    // collection's editorial generations. We surface every distinct
    // model whose face has appeared in a generated editorial.
    const { data: editorialGens } = await supabaseAdmin
      .from('ai_generations')
      .select('input_data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('generation_type', 'editorial')
      .eq('status', 'completed');
    const modelIds = new Set<string>();
    for (const row of editorialGens ?? []) {
      const id = (row.input_data as { model_id?: string } | null)?.model_id;
      if (id) modelIds.add(id);
    }
    if (modelIds.size > 0) {
      const { data: models } = await supabaseAdmin
        .from('aimily_models')
        .select('id, name, headshot_url, gender, archetype')
        .in('id', Array.from(modelIds))
        .limit(12);
      const items = (models ?? [])
        .map((m) => ({
          url: (m.headshot_url as string) || undefined,
          name: m.name as string | undefined,
          family: ((m.archetype as string) || (m.gender as string) || undefined),
        }))
        .filter((x) => !!x.url) as { url: string; name?: string; family?: string }[];
      if (items.length > 0) {
        data.ranges['content-models'] = {
          caption: `${items.length} aimily models cast for this collection. Every face, every shoot.`,
          items,
          stats: {
            total: items.length,
            families: new Set(items.map((i) => i.family || 'Unisex')).size,
          },
        };
        data.hasAnyData = true;
      }
    }

    // Editorial wall — full-bleed photo wall of all editorial outputs
    // for this collection, as a dedicated slide (different from the
    // smaller content-studio grid).
    const { data: editorialAllRows } = await supabaseAdmin
      .from('ai_generations')
      .select('output_data, input_data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('generation_type', 'editorial')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
    const editorialItems: { url: string; name?: string }[] = [];
    for (const row of editorialAllRows ?? []) {
      const imgs = (row.output_data as { images?: { url: string }[] } | null)?.images ?? [];
      const skuName = (row.input_data as { sku_name?: string } | null)?.sku_name;
      for (const img of imgs) {
        if (img.url && editorialItems.length < 12) {
          editorialItems.push({ url: img.url, name: skuName });
        }
      }
    }
    if (editorialItems.length > 0) {
      data.ranges['content-editorial'] = {
        caption: 'The collection in editorial form. Every shoot from the studio.',
        items: editorialItems,
        stats: {
          total: editorialItems.length,
          families: 1,
        },
      };
      data.hasAnyData = true;
    }

    // Still life — same shape as editorial but for product-only shots.
    const { data: stillLifeRows } = await supabaseAdmin
      .from('ai_generations')
      .select('output_data, input_data')
      .eq('collection_plan_id', collectionPlanId)
      .eq('generation_type', 'still_life')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
    const stillItems: { url: string; name?: string }[] = [];
    for (const row of stillLifeRows ?? []) {
      const imgs = (row.output_data as { images?: { url: string }[] } | null)?.images ?? [];
      const skuName = (row.input_data as { sku_name?: string } | null)?.sku_name;
      for (const img of imgs) {
        if (img.url && stillItems.length < 12) {
          stillItems.push({ url: img.url, name: skuName });
        }
      }
    }
    if (stillItems.length > 0) {
      data.ranges['content-still-life'] = {
        caption: 'Studio-still product photography — every angle, every detail.',
        items: stillItems,
        stats: {
          total: stillItems.length,
          families: 1,
        },
      };
      data.hasAnyData = true;
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
