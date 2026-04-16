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
  const consumerSplit = extractLeadBody(ctx.consumer);
  if (consumerSplit.lead || consumerSplit.body) {
    data.narratives.consumer = {
      ...consumerSplit,
      attribution: 'Consumer archetype · From your research',
    };
    data.hasAnyData = true;
  }

  const brandSplit = extractLeadBody(ctx.brandDNA);
  if (brandSplit.lead || brandSplit.body) {
    data.narratives['brand-identity'] = {
      ...brandSplit,
      attribution: 'Brand DNA · Core positioning',
    };
    data.hasAnyData = true;
  }

  const voiceSplit = extractLeadBody(ctx.brandVoice);
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

  // ─── Stats (EditorialStat) ──────────────────────────────────────

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
    }
  }

  // ─── Grid templates ──────────────────────────────────────────────

  // Moodboard — keywords + trend signals as tiles
  {
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
        // "Title (brands): desc" → Title, brands
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

  // Assortment & pricing — collection SKUs grouped by family
  {
    const { data: skuRows } = await supabaseAdmin
      .from('collection_skus')
      .select('name, family, subcategory, pvp, category')
      .eq('collection_plan_id', collectionPlanId)
      .limit(24);
    if (skuRows?.length) {
      // Group by family, pick cheapest + most expensive per family, up to 6 tiles
      const byFamily: Record<string, typeof skuRows> = {};
      for (const s of skuRows) {
        const key = s.family || 'Other';
        (byFamily[key] ||= []).push(s);
      }
      const tiles: { eyebrow: string; label: string; value?: string }[] = [];
      for (const [family, rows] of Object.entries(byFamily)) {
        if (tiles.length >= 6) break;
        const sorted = [...rows].sort((a, b) => (a.pvp ?? 0) - (b.pvp ?? 0));
        const rep = sorted[Math.floor(sorted.length / 2)];
        tiles.push({
          eyebrow: family,
          label: rep.subcategory || rep.name || family,
          value: rep.pvp ? `€${rep.pvp}` : undefined,
        });
      }
      if (tiles.length) {
        data.grids['assortment-pricing'] = {
          caption: `${skuRows.length} SKUs across ${Object.keys(byFamily).length} families.`,
          tiles,
        };
        data.hasAnyData = true;
      }
    }
  }

  // Sketch & Color — first 6 SKUs as the design starting lineup
  {
    const { data: skuRows } = await supabaseAdmin
      .from('collection_skus')
      .select('name, family, subcategory')
      .eq('collection_plan_id', collectionPlanId)
      .order('created_at', { ascending: true })
      .limit(6);
    if (skuRows?.length) {
      data.grids['sketch-color'] = {
        caption: 'Opening round of sketches.',
        tiles: skuRows.map((s, i) => ({
          eyebrow: `SKU ${String(i + 1).padStart(2, '0')}`,
          label: s.subcategory || s.name || s.family,
          value: `R${Math.floor(i / 3) + 1}`,
        })),
      };
      data.hasAnyData = true;
    }
  }

  // Content studio — content pillars as tiles
  if (ctx.contentPillars) {
    const pillars = ctx.contentPillars.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 6);
    if (pillars.length) {
      data.grids['content-studio'] = {
        caption: `${pillars.length} content pillars feeding every channel.`,
        tiles: pillars.map((p, i) => {
          const [name, desc] = p.split(':').map(s => s?.trim() ?? '');
          return {
            eyebrow: String(i + 1).padStart(2, '0'),
            label: name,
            value: desc ? desc.slice(0, 3) : undefined,
          };
        }),
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

    // Timeline overrides (F5.3): dot-notation keys like
    // `milestones.0.label`. Status stays unmanaged — it's derived
    // from the actual milestone state, not an editable free-form.
    if (data.timelines[slideId]?.milestones) {
      const ms = [...(data.timelines[slideId].milestones ?? [])];
      let touched = false;
      for (const [k, v] of Object.entries(fields)) {
        const m = k.match(/^milestones\.(\d+)\.(label|date)$/);
        if (!m) continue;
        const idx = Number(m[1]);
        const prop = m[2] as 'label' | 'date';
        if (ms[idx]) {
          ms[idx] = { ...ms[idx], [prop]: v };
          touched = true;
        }
      }
      if (touched) data.timelines[slideId].milestones = ms;
      // Also allow overriding the timeline lead
      if (fields.lead) data.timelines[slideId].lead = fields.lead;
    }
  }

  return data;
}
