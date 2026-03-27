import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';
import { PresentationNav } from './PresentationNav';

/* ═══════════════════════════════════════════════════════════════════════════
   Collection Presentation — Full-screen editorial slide deck
   Server component. Print-ready: Cmd+P produces one PDF page per slide.
   ═══════════════════════════════════════════════════════════════════════════ */

interface PageProps {
  params: Promise<{ id: string }>;
}

/* ─── Data helpers ─── */

function safe<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined || val === '') return fallback;
  return val as T;
}

function currency(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(n)) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(n)) return '\u2014';
  return `${Math.round(n * (n < 1 ? 100 : 1))}%`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '\u2014';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

/* ─── Types ─── */

interface SKU {
  id: string;
  name: string;
  family: string;
  type: string;
  pvp: number;
  cost: number;
  margin: number;
  buy_units: number;
  expected_sales: number;
  sketch_url?: string;
  category?: string;
  drop_number?: number;
}

interface SetupData {
  totalSalesTarget?: number;
  expectedSkus?: number;
  avgPriceTarget?: number;
  targetMargin?: number;
  minPrice?: number;
  maxPrice?: number;
  families?: string[];
  productFamilies?: { name: string; percentage: number }[];
  productTypeSegments?: { type: string; percentage: number }[];
  priceSegments?: { name: string; minPrice: number; maxPrice: number; percentage: number }[];
  productCategory?: string;
}

interface TimelineMilestone {
  id: string;
  phase: string;
  name: string;
  startWeeksBefore: number;
  durationWeeks: number;
  status: string;
}

/* ─── Fetch all data ─── */

async function getPresentationData(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [planRes, timelineRes, skusRes, creativeRes, merchRes] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    supabaseAdmin.from('collection_timelines').select('*').eq('collection_plan_id', id).single(),
    supabaseAdmin.from('collection_skus').select('*').eq('collection_plan_id', id),
    supabaseAdmin.from('collection_workspace_data').select('data').eq('collection_plan_id', id).eq('workspace', 'creative').single(),
    supabaseAdmin.from('collection_workspace_data').select('data').eq('collection_plan_id', id).eq('workspace', 'merchandising').single(),
  ]);

  if (planRes.error || !planRes.data) return null;

  // Verify ownership
  if (planRes.data.user_id !== user.id) return null;

  return {
    plan: planRes.data,
    timeline: timelineRes.data,
    skus: (skusRes.data || []) as SKU[],
    creative: (creativeRes.data?.data || {}) as Record<string, unknown>,
    merch: (merchRes.data?.data || {}) as Record<string, unknown>,
  };
}

/* ─── Page ─── */

export default async function PresentationPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPresentationData(id);
  if (!data) notFound();

  const { plan, timeline, skus, creative, merch } = data;
  const setup: SetupData = plan.setup_data || {};
  const milestones: TimelineMilestone[] = timeline?.milestones || [];
  const launchDate = timeline?.launch_date;

  // ── Creative workspace extraction ──
  const blockData = (creative?.blockData || {}) as Record<string, { confirmed?: boolean; data?: Record<string, unknown> }>;

  const vibeData = blockData?.vibe?.data || {};
  const vibeTitle = safe<string>(vibeData.vibeTitle, '');
  const vibeNarrative = safe<string>(vibeData.vibe, '');
  const vibeKeywords = safe<string>(vibeData.keywords, '');

  const consumerData = blockData?.consumer?.data || {};
  const consumerProposals = (safe<Array<{ title: string; desc: string; status: string }>>(consumerData.proposals, []))
    .filter(p => p.status === 'liked');

  const brandData = blockData?.['brand-dna']?.data || {};
  const brandName = safe<string>(brandData.brandName, '');
  const brandColors = safe<string[]>(brandData.colors, []);
  const brandTone = safe<string>(brandData.tone, '');
  const brandTypography = safe<string>(brandData.typography, '');
  const brandStyle = safe<string>(brandData.style, '');

  const moodboardImages = safe<string[]>((blockData?.moodboard?.data as Record<string, unknown>)?.images as string[], []);

  // ── Merch workspace extraction ──
  const merchBlock = (merch?.blockData || {}) as Record<string, { confirmed?: boolean; data?: Record<string, unknown> }>;
  const channelsData = merchBlock?.channels?.data || {};

  const channels = safe<string[]>(channelsData.channels, []);
  const markets = safe<string[]>(channelsData.markets, []);

  // ── SKU-derived metrics ──
  const totalSkus = skus.length || setup.expectedSkus || 0;
  const skuPrices = skus.map(s => s.pvp).filter(p => p > 0);
  const avgPrice = skuPrices.length > 0 ? skuPrices.reduce((a, b) => a + b, 0) / skuPrices.length : (setup.avgPriceTarget || 0);
  const minPrice = skuPrices.length > 0 ? Math.min(...skuPrices) : (setup.minPrice || 0);
  const maxPrice = skuPrices.length > 0 ? Math.max(...skuPrices) : (setup.maxPrice || 0);

  const skuMargins = skus.filter(s => s.margin > 0).map(s => s.margin);
  const avgMargin = skuMargins.length > 0 ? skuMargins.reduce((a, b) => a + b, 0) / skuMargins.length : (setup.targetMargin || 0);

  const totalUnits = skus.reduce((sum, s) => sum + (s.buy_units || 0), 0);
  const totalRevenue = skus.reduce((sum, s) => sum + (s.expected_sales || 0), 0) || (setup.totalSalesTarget || 0);
  const totalCogs = skus.reduce((sum, s) => sum + ((s.cost || 0) * (s.buy_units || 0)), 0);
  const grossProfit = totalRevenue - totalCogs;

  // ── Family breakdown ──
  const familyMap: Record<string, { count: number; minPvp: number; maxPvp: number; types: Record<string, number> }> = {};
  for (const sku of skus) {
    const f = sku.family || 'Other';
    if (!familyMap[f]) familyMap[f] = { count: 0, minPvp: Infinity, maxPvp: -Infinity, types: {} };
    familyMap[f].count++;
    if (sku.pvp > 0) {
      familyMap[f].minPvp = Math.min(familyMap[f].minPvp, sku.pvp);
      familyMap[f].maxPvp = Math.max(familyMap[f].maxPvp, sku.pvp);
    }
    const t = sku.type || 'REVENUE';
    familyMap[f].types[t] = (familyMap[f].types[t] || 0) + 1;
  }
  const families = Object.entries(familyMap).sort((a, b) => b[1].count - a[1].count);

  // Type mix
  const typeCounts: Record<string, number> = {};
  for (const sku of skus) {
    const t = sku.type || 'REVENUE';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const typeTotal = skus.length || 1;

  // ── Family-level pricing table ──
  const familyPricing = families.map(([name, info]) => {
    const famSkus = skus.filter(s => (s.family || 'Other') === name);
    const avgRetail = famSkus.length > 0 ? famSkus.reduce((s, k) => s + (k.pvp || 0), 0) / famSkus.length : 0;
    const avgCogs = famSkus.length > 0 ? famSkus.reduce((s, k) => s + (k.cost || 0), 0) / famSkus.length : 0;
    const avgM = famSkus.filter(s => s.margin > 0).length > 0
      ? famSkus.filter(s => s.margin > 0).reduce((s, k) => s + k.margin, 0) / famSkus.filter(s => s.margin > 0).length
      : 0;
    return { name, count: info.count, avgRetail, avgCogs, avgMargin: avgM };
  });

  // ── Timeline phases ──
  const phaseConfig: Record<string, { label: string; color: string }> = {
    creative: { label: 'Creative & Brand', color: '#9c7c4c' },
    planning: { label: 'Merchandising', color: '#6B8E7B' },
    development: { label: 'Design & Dev', color: '#7B6B8E' },
    go_to_market: { label: 'Marketing', color: '#8E6B6B' },
  };

  const phaseRanges: Record<string, { start: number; end: number; label: string; color: string }> = {};
  for (const m of milestones) {
    const ph = m.phase;
    if (!phaseRanges[ph]) {
      phaseRanges[ph] = {
        start: m.startWeeksBefore,
        end: m.startWeeksBefore - m.durationWeeks,
        label: phaseConfig[ph]?.label || ph,
        color: phaseConfig[ph]?.color || '#666',
      };
    } else {
      phaseRanges[ph].start = Math.max(phaseRanges[ph].start, m.startWeeksBefore);
      phaseRanges[ph].end = Math.min(phaseRanges[ph].end, m.startWeeksBefore - m.durationWeeks);
    }
  }
  const maxWeeks = Math.max(...milestones.map(m => m.startWeeksBefore), 1);
  const phases = Object.entries(phaseRanges).sort((a, b) => b[1].start - a[1].start);

  return (
    <>
      {/* ── Print & screen styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: #282A29 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .slide { page-break-after: always; page-break-inside: avoid; min-height: 100vh; }
          .slide:last-child { page-break-after: auto; }
          .no-print { display: none !important; }
          @page { margin: 0; size: landscape; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media screen {
          .slide { scroll-snap-align: start; }
          .slide-container { scroll-snap-type: y mandatory; }
        }
        .gold-line { background: linear-gradient(90deg, #9c7c4c, #c4a66a, #9c7c4c); }
        .fade-text { background: linear-gradient(180deg, rgba(245,241,232,0.9) 0%, rgba(245,241,232,0.4) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      `}} />

      {/* ── Top navigation bar (no-print) ── */}
      <PresentationNav collectionId={id} totalSkus={totalSkus} />

      {/* ── Slide deck ── */}
      <div className="slide-container overflow-y-auto h-screen">

        {/* ═══════════════════════════════════════════
            SLIDE 1 — COVER
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center items-start px-16 py-12 bg-carbon relative overflow-hidden">
          {/* Subtle decorative line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] gold-line opacity-40" />

          <div className="flex-1 flex flex-col justify-center max-w-5xl">
            {/* Season label */}
            {plan.season && (
              <p className="text-[11px] tracking-[0.3em] uppercase font-light mb-8" style={{ color: '#9c7c4c' }}>
                {plan.season}
              </p>
            )}

            {/* Collection name — hero typography */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-crema leading-[0.9] tracking-tight">
              {plan.name || 'Untitled Collection'}
            </h1>

            {/* Vibe title as italic subtitle */}
            {vibeTitle && (
              <p className="mt-6 text-xl md:text-2xl font-light italic text-crema/40 max-w-2xl">
                {vibeTitle}
              </p>
            )}

            {/* Thin gold separator */}
            <div className="mt-12 w-16 h-[1px]" style={{ backgroundColor: '#9c7c4c' }} />

            {/* Key metrics tease */}
            <div className="mt-8 flex gap-12">
              {totalSkus > 0 && (
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30">Products</p>
                  <p className="text-2xl font-light text-crema/70 mt-1">{totalSkus}</p>
                </div>
              )}
              {totalRevenue > 0 && (
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30">Target Revenue</p>
                  <p className="text-2xl font-light text-crema/70 mt-1">{currency(totalRevenue)}</p>
                </div>
              )}
              {launchDate && (
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30">Launch</p>
                  <p className="text-2xl font-light text-crema/70 mt-1">{formatDate(launchDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* aimily logo, bottom */}
          <div className="absolute bottom-10 left-16">
            <p className="text-[13px] tracking-[0.25em] uppercase font-light text-crema/20">aimily</p>
          </div>
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 2 — THE VISION
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Creative Direction
            </p>

            {vibeNarrative ? (
              <blockquote className="text-2xl md:text-3xl lg:text-4xl font-light text-crema leading-snug max-w-4xl">
                &ldquo;{vibeNarrative}&rdquo;
              </blockquote>
            ) : (
              <p className="text-2xl font-light text-crema/30 italic">No creative direction defined yet</p>
            )}

            {vibeKeywords && (
              <div className="mt-10 flex flex-wrap gap-3">
                {vibeKeywords.split(',').map((kw, i) => (
                  <span key={i} className="text-[10px] tracking-[0.15em] uppercase text-crema/40 border border-crema/10 px-3 py-1.5">
                    {kw.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Color palette */}
            {brandColors.length > 0 && (
              <div className="mt-14">
                <p className="text-[10px] tracking-[0.3em] uppercase text-crema/30 mb-5">Color Palette</p>
                <div className="flex gap-4">
                  {brandColors.map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-full border border-white/10"
                        style={{ backgroundColor: color.startsWith('#') ? color : `#${color}` }}
                      />
                      <span className="text-[9px] tracking-[0.1em] uppercase text-crema/30">
                        {color.startsWith('#') ? color : `#${color}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brand info subtle footer */}
            {(brandName || brandTone) && (
              <div className="mt-14 pt-6 border-t border-crema/[0.06] flex gap-12">
                {brandName && (
                  <div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-crema/20 mb-1">Brand</p>
                    <p className="text-sm font-light text-crema/50">{brandName}</p>
                  </div>
                )}
                {brandTone && (
                  <div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-crema/20 mb-1">Tone</p>
                    <p className="text-sm font-light text-crema/50">{brandTone}</p>
                  </div>
                )}
                {brandTypography && (
                  <div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-crema/20 mb-1">Typography</p>
                    <p className="text-sm font-light text-crema/50">{brandTypography}</p>
                  </div>
                )}
                {brandStyle && (
                  <div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-crema/20 mb-1">Style</p>
                    <p className="text-sm font-light text-crema/50">{brandStyle}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SLIDE 2B — MOODBOARD
            ═══════════════════════════════════════════ */}
        {moodboardImages.length > 0 && (
          <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
            <div className="w-full">
              <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
                Moodboard
              </p>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {moodboardImages.slice(0, 12).map((url, i) => (
                  <div key={i} className="aspect-[3/4] overflow-hidden bg-crema/[0.03]">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                    />
                  </div>
                ))}
              </div>

              {moodboardImages.length > 12 && (
                <p className="text-[10px] tracking-[0.15em] uppercase text-crema/25 mt-4 text-center">
                  + {moodboardImages.length - 12} more images
                </p>
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════
            SLIDE 3 — THE CONSUMER
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Target Consumer
            </p>

            {consumerProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {consumerProposals.map((profile, i) => (
                  <div key={i} className="border border-crema/[0.08] p-8 group">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-[10px] tracking-[0.15em] uppercase font-medium px-2 py-0.5 border border-crema/10 text-crema/30">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-lg font-light text-crema">{profile.title}</h3>
                    </div>
                    <p className="text-sm font-light text-crema/50 leading-relaxed">{profile.desc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-light text-crema/30 italic">No consumer profiles defined yet</p>
            )}

            {/* Brand voice section */}
            {(brandTone || brandStyle) && (
              <div className="mt-14 pt-6 border-t border-crema/[0.06]">
                <p className="text-[10px] tracking-[0.3em] uppercase text-crema/30 mb-5">Brand Voice</p>
                <div className="flex gap-12">
                  {brandTone && (
                    <div>
                      <p className="text-[9px] tracking-[0.2em] uppercase text-crema/20 mb-2">Tone</p>
                      <p className="text-sm font-light text-crema/50 max-w-md">{brandTone}</p>
                    </div>
                  )}
                  {vibeKeywords && (
                    <div>
                      <p className="text-[9px] tracking-[0.2em] uppercase text-crema/20 mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {vibeKeywords.split(',').slice(0, 8).map((kw, i) => (
                          <span key={i} className="text-[10px] tracking-[0.1em] text-crema/40">
                            {kw.trim()}{i < Math.min(vibeKeywords.split(',').length, 8) - 1 ? ' /' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 4 — MARKET OPPORTUNITY (light)
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-crema relative">
          <div className="max-w-5xl">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Market Opportunity
            </p>

            <div className="grid grid-cols-3 gap-8 mb-14">
              <div>
                <p className="text-[9px] tracking-[0.2em] uppercase text-carbon/30 mb-2">Target Revenue</p>
                <p className="text-4xl font-light text-carbon">{currency(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.2em] uppercase text-carbon/30 mb-2">Avg Price Point</p>
                <p className="text-4xl font-light text-carbon">{currency(avgPrice)}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.2em] uppercase text-carbon/30 mb-2">Target Margin</p>
                <p className="text-4xl font-light text-carbon">{pct(avgMargin)}</p>
              </div>
            </div>

            {/* Channels & Markets */}
            <div className="grid grid-cols-2 gap-12">
              {channels.length > 0 && (
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-carbon/30 mb-4">Distribution Channels</p>
                  <div className="space-y-2">
                    {channels.map((ch, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-carbon/[0.06]">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#9c7c4c' }} />
                        <span className="text-sm font-light text-carbon/70">{ch}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {markets.length > 0 && (
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-carbon/30 mb-4">Target Markets</p>
                  <div className="space-y-2">
                    {markets.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-carbon/[0.06]">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#9c7c4c' }} />
                        <span className="text-sm font-light text-carbon/70">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fallback if no channels/markets */}
            {channels.length === 0 && markets.length === 0 && (
              <div className="grid grid-cols-2 gap-12">
                {setup.productCategory && (
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-carbon/30 mb-4">Product Category</p>
                    <p className="text-lg font-light text-carbon/70">{setup.productCategory}</p>
                  </div>
                )}
                {(setup.families?.length || 0) > 0 && (
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-carbon/30 mb-4">Product Families</p>
                    <p className="text-lg font-light text-carbon/70">{setup.families?.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Page corner accent */}
          <div className="absolute bottom-0 right-0 w-32 h-32 opacity-[0.04]" style={{ background: 'radial-gradient(circle at bottom right, #9c7c4c, transparent)' }} />
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 5 — COLLECTION ARCHITECTURE
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Collection Architecture
            </p>

            <div className="flex items-end gap-6 mb-14">
              <p className="text-7xl font-light text-crema leading-none">{totalSkus}</p>
              <p className="text-sm tracking-[0.15em] uppercase text-crema/30 pb-3">Products</p>
            </div>

            {/* Family breakdown bars */}
            {families.length > 0 && (
              <div className="space-y-4 mb-14">
                {families.map(([name, info]) => (
                  <div key={name} className="flex items-center gap-6">
                    <div className="w-36 shrink-0">
                      <p className="text-sm font-light text-crema">{name}</p>
                      <p className="text-[10px] text-crema/30">{info.count} SKU{info.count !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Bar */}
                    <div className="flex-1 h-8 bg-crema/[0.04] relative overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.max((info.count / typeTotal) * 100, 4)}%`,
                          backgroundColor: '#9c7c4c',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    {/* Price range */}
                    <div className="w-40 text-right shrink-0">
                      {info.minPvp < Infinity && (
                        <p className="text-[10px] tracking-[0.1em] text-crema/40">
                          {currency(info.minPvp)} &mdash; {currency(info.maxPvp)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Type mix */}
            {Object.keys(typeCounts).length > 0 && (
              <div className="flex gap-10 pt-6 border-t border-crema/[0.06]">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <div key={type}>
                    <p className="text-2xl font-light text-crema">{Math.round((count / typeTotal) * 100)}%</p>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-crema/30 mt-1">{type}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback from setup if no SKUs */}
            {families.length === 0 && (setup.productFamilies?.length || 0) > 0 && (
              <div className="space-y-3">
                {setup.productFamilies?.map((fam, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm font-light text-crema w-40">{fam.name}</span>
                    <div className="flex-1 h-6 bg-crema/[0.04]">
                      <div className="h-full" style={{ width: `${fam.percentage}%`, backgroundColor: '#9c7c4c', opacity: 0.6 }} />
                    </div>
                    <span className="text-[10px] text-crema/40 w-12 text-right">{fam.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 6 — PRICE ARCHITECTURE
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Price Architecture
            </p>

            {/* Price range hero */}
            <div className="mb-14">
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-light text-crema">{currency(minPrice)}</span>
                <span className="text-2xl font-light text-crema/20">&mdash;</span>
                <span className="text-5xl font-light text-crema">{currency(maxPrice)}</span>
              </div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30 mt-3">Price Range</p>
            </div>

            {/* Average price */}
            <div className="mb-14 flex gap-16">
              <div>
                <p className="text-3xl font-light text-crema">{currency(avgPrice)}</p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30 mt-1">Average Price</p>
              </div>
              <div>
                <p className="text-3xl font-light text-crema">{pct(avgMargin)}</p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30 mt-1">Average Margin</p>
              </div>
            </div>

            {/* Family pricing table */}
            {familyPricing.length > 0 && (
              <div className="border-t border-crema/[0.06]">
                {/* Header */}
                <div className="grid grid-cols-5 py-3 border-b border-crema/[0.06]">
                  <p className="text-[9px] tracking-[0.2em] uppercase text-crema/25">Family</p>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-crema/25 text-right">SKUs</p>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-crema/25 text-right">Avg Retail</p>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-crema/25 text-right">Avg COGS</p>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-crema/25 text-right">Avg Margin</p>
                </div>
                {/* Rows */}
                {familyPricing.map((fam, i) => (
                  <div key={i} className="grid grid-cols-5 py-3 border-b border-crema/[0.03]">
                    <p className="text-sm font-light text-crema/70">{fam.name}</p>
                    <p className="text-sm font-light text-crema/50 text-right">{fam.count}</p>
                    <p className="text-sm font-light text-crema/50 text-right">{currency(fam.avgRetail)}</p>
                    <p className="text-sm font-light text-crema/50 text-right">{currency(fam.avgCogs)}</p>
                    <p className="text-sm font-light text-crema/50 text-right">{pct(fam.avgMargin)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 7 — FINANCIAL OVERVIEW (light)
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-crema relative">
          <div className="max-w-5xl">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-14" style={{ color: '#9c7c4c' }}>
              Financial Overview
            </p>

            <div className="grid grid-cols-3 gap-x-16 gap-y-14">
              {/* Revenue Target */}
              <div>
                <p className="text-[9px] tracking-[0.25em] uppercase text-carbon/30 mb-3">Revenue Target</p>
                <p className="text-4xl font-light text-carbon">{currency(totalRevenue)}</p>
              </div>

              {/* Total Units */}
              <div>
                <p className="text-[9px] tracking-[0.25em] uppercase text-carbon/30 mb-3">Total Units</p>
                <p className="text-4xl font-light text-carbon">{totalUnits > 0 ? totalUnits.toLocaleString() : '\u2014'}</p>
              </div>

              {/* Average Price */}
              <div>
                <p className="text-[9px] tracking-[0.25em] uppercase text-carbon/30 mb-3">Average Price</p>
                <p className="text-4xl font-light text-carbon">{currency(avgPrice)}</p>
              </div>

              {/* Average Margin */}
              <div>
                <p className="text-[9px] tracking-[0.25em] uppercase text-carbon/30 mb-3">Average Margin</p>
                <p className="text-4xl font-light text-carbon">{pct(avgMargin)}</p>
              </div>

              {/* COGS Total */}
              <div>
                <p className="text-[9px] tracking-[0.25em] uppercase text-carbon/30 mb-3">Total COGS</p>
                <p className="text-4xl font-light text-carbon">{totalCogs > 0 ? currency(totalCogs) : '\u2014'}</p>
              </div>

              {/* Gross Profit */}
              <div>
                <p className="text-[9px] tracking-[0.25em] uppercase text-carbon/30 mb-3">Gross Profit</p>
                <p className="text-4xl font-light text-carbon">{grossProfit > 0 ? currency(grossProfit) : '\u2014'}</p>
              </div>
            </div>

            {/* Thin separator */}
            <div className="mt-16 w-full h-[1px] bg-carbon/[0.06]" />

            {/* SKU summary row */}
            <div className="mt-6 flex justify-between items-center">
              <p className="text-[10px] tracking-[0.2em] uppercase text-carbon/25">
                {totalSkus} products across {families.length || setup.productFamilies?.length || 0} families
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-carbon/25">
                {plan.season || ''} {launchDate ? `\u2014 Launch ${formatDate(launchDate)}` : ''}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-48 h-48 opacity-[0.03]" style={{ background: 'radial-gradient(circle at bottom left, #9c7c4c, transparent)' }} />
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 8 — PRODUCT GRID
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-8" style={{ color: '#9c7c4c' }}>
              Product Portfolio
            </p>

            {skus.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {skus.slice(0, 20).map((sku) => (
                  <div key={sku.id} className="border border-crema/[0.06] p-3 group hover:border-crema/[0.12] transition-colors">
                    {/* Sketch image or placeholder */}
                    {sku.sketch_url ? (
                      <div className="aspect-square bg-crema/[0.03] mb-3 overflow-hidden">
                        <img
                          src={sku.sketch_url}
                          alt={sku.name}
                          className="w-full h-full object-cover opacity-80"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-crema/[0.03] mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 border border-crema/[0.08] rounded-full flex items-center justify-center">
                          <span className="text-[8px] text-crema/20 uppercase">{(sku.family || '?')[0]}</span>
                        </div>
                      </div>
                    )}
                    {/* Name */}
                    <p className="text-[11px] font-light text-crema truncate">{sku.name}</p>
                    {/* Family */}
                    <p className="text-[9px] text-crema/30 truncate">{sku.family}</p>
                    {/* Price & type */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] font-light text-crema/60">{sku.pvp > 0 ? currency(sku.pvp) : '\u2014'}</span>
                      <span
                        className="text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5"
                        style={{
                          color: sku.type === 'IMAGEN' ? '#c4a66a' : sku.type === 'ENTRY' ? '#7B9E8E' : '#8E8B82',
                          backgroundColor: sku.type === 'IMAGEN' ? 'rgba(196,166,106,0.1)' : sku.type === 'ENTRY' ? 'rgba(123,158,142,0.1)' : 'rgba(142,139,130,0.1)',
                        }}
                      >
                        {sku.type || 'REV'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xl font-light text-crema/30 italic">No products created yet</p>
            )}

            {skus.length > 20 && (
              <p className="text-[10px] tracking-[0.15em] uppercase text-crema/25 mt-6 text-center">
                + {skus.length - 20} more products
              </p>
            )}
          </div>
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 9 — TIMELINE
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Timeline to Launch
            </p>

            {phases.length > 0 ? (
              <div className="space-y-6 mb-14">
                {phases.map(([phase, range]) => {
                  const left = ((maxWeeks - range.start) / maxWeeks) * 100;
                  const width = ((range.start - range.end) / maxWeeks) * 100;
                  return (
                    <div key={phase} className="flex items-center gap-6">
                      <div className="w-36 shrink-0">
                        <p className="text-sm font-light text-crema">{range.label}</p>
                      </div>
                      <div className="flex-1 h-10 bg-crema/[0.03] relative">
                        <div
                          className="absolute h-full flex items-center px-3"
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 3)}%`,
                            backgroundColor: range.color,
                            opacity: 0.7,
                          }}
                        >
                          <span className="text-[8px] tracking-[0.1em] uppercase text-white/70 whitespace-nowrap">
                            {Math.round(range.start - range.end)}w
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Week scale */}
                <div className="flex items-center gap-6 mt-4">
                  <div className="w-36" />
                  <div className="flex-1 flex justify-between px-1">
                    <span className="text-[8px] tracking-[0.1em] uppercase text-crema/20">{maxWeeks}w before</span>
                    <span className="text-[8px] tracking-[0.1em] uppercase text-crema/20">Launch</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xl font-light text-crema/30 italic mb-14">No timeline configured yet</p>
            )}

            {/* Launch date callout */}
            {launchDate && (
              <div className="pt-8 border-t border-crema/[0.06] flex items-end gap-4">
                <div>
                  <p className="text-[9px] tracking-[0.25em] uppercase text-crema/20 mb-2">Launch Date</p>
                  <p className="text-3xl font-light text-crema">{formatDate(launchDate)}</p>
                </div>
                <div className="ml-auto">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9c7c4c' }} />
                </div>
              </div>
            )}
          </div>
        </section>


        {/* ═══════════════════════════════════════════
            SLIDE 10 — CLOSE
            ═══════════════════════════════════════════ */}
        <section className="slide min-h-screen flex flex-col justify-center items-center px-16 py-12 bg-carbon relative text-center">
          <div className="absolute top-0 left-0 right-0 h-[1px] gold-line opacity-20" />

          <div className="flex flex-col items-center">
            {/* Designed with aimily */}
            <p className="text-[10px] tracking-[0.3em] uppercase text-crema/20 mb-2">Designed with</p>
            <p className="text-3xl tracking-[0.15em] font-light text-crema/60 mb-12">aimily</p>

            {/* Thin gold line */}
            <div className="w-12 h-[1px] mb-12" style={{ backgroundColor: '#9c7c4c' }} />

            {/* Collection name */}
            <h2 className="text-4xl md:text-5xl font-light text-crema mb-4">{plan.name}</h2>

            {/* Season & launch */}
            <p className="text-sm tracking-[0.2em] uppercase text-crema/30 mb-2">
              {[plan.season, launchDate ? formatDate(launchDate) : ''].filter(Boolean).join(' \u2014 ')}
            </p>

            {/* Confidential */}
            <p className="mt-16 text-[9px] tracking-[0.25em] uppercase text-crema/15">
              Confidential &mdash; prepared for internal use
            </p>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-[1px] gold-line opacity-20" />
        </section>

      </div>
    </>
  );
}
