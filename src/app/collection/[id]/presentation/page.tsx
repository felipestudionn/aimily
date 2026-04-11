import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';
import { PresentationNav } from './PresentationNav';
import {
  getMarketingPresentationData,
  getMarketingSlideVisibility,
} from '@/lib/presentation-data';
import type {
  MarketingPresentationData,
  MarketingSlideVisibility,
} from '@/lib/presentation-data';
import { LookbookPageRenderer } from '@/components/marketing/LookbookPageRenderer';

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

/** Extract hex color from strings like "#1A1A1A (PRIMARIO — description)" */
function extractHex(color: string): string {
  const match = color.match(/#[0-9A-Fa-f]{3,8}/);
  return match ? match[0] : color.startsWith('#') ? color.split(/[\s(]/)[0] : `#${color.split(/[\s(]/)[0]}`;
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

  const [planRes, timelineRes, skusRes, creativeRes, merchRes, marketing] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    supabaseAdmin.from('collection_timelines').select('*').eq('collection_plan_id', id).single(),
    supabaseAdmin.from('collection_skus').select('*').eq('collection_plan_id', id),
    supabaseAdmin.from('collection_workspace_data').select('data').eq('collection_plan_id', id).eq('workspace', 'creative').single(),
    supabaseAdmin.from('collection_workspace_data').select('data').eq('collection_plan_id', id).eq('workspace', 'merchandising').single(),
    getMarketingPresentationData(id, user.id),
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
    marketing,
  };
}

/* ─── Page ─── */

export default async function PresentationPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPresentationData(id);
  if (!data) notFound();

  const { plan, timeline, skus, creative, merch, marketing } = data;
  const marketingVisibility = marketing ? getMarketingSlideVisibility(marketing) : null;
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
    .filter(p => p.status !== 'rejected');

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
          /* Hide ALL chrome: sidebar, navbar, mobile buttons */
          body { background: #282A29 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          aside, nav, .no-print, [class*="fixed top-0"], [class*="fixed left-0"], button[aria-label="Open menu"] { display: none !important; }
          main { margin-left: 0 !important; padding-top: 0 !important; }
          .slide { page-break-after: always; page-break-inside: avoid; min-height: 100vh; width: 100vw; }
          .slide:last-child { page-break-after: auto; }
          .slide-container { height: auto !important; overflow: visible !important; }
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
              <div className="mt-12">
                <p className="text-[10px] tracking-[0.3em] uppercase text-crema/30 mb-5">Color Palette</p>
                <div className="flex gap-6">
                  {brandColors.map((color, i) => {
                    const hex = extractHex(color);
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div
                          className="w-14 h-14 rounded-full border border-white/10"
                          style={{ backgroundColor: hex }}
                        />
                        <span className="text-[9px] tracking-[0.1em] uppercase text-crema/30">
                          {hex}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SLIDE 2B — BRAND IDENTITY
            ═══════════════════════════════════════════ */}
        {(brandName || brandTone || brandTypography || brandStyle) && (
          <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
            <div className="max-w-5xl">
              <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
                Brand Identity
              </p>

              {brandName && (
                <h3 className="text-3xl md:text-4xl font-light text-crema mb-10">{brandName}</h3>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {brandTone && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-crema/25 mb-3">Voice & Tone</p>
                    <p className="text-sm font-light text-crema/60 leading-relaxed">{brandTone}</p>
                  </div>
                )}
                {brandTypography && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-crema/25 mb-3">Typography</p>
                    <p className="text-sm font-light text-crema/60 leading-relaxed">{brandTypography}</p>
                  </div>
                )}
                {brandStyle && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-crema/25 mb-3">Visual Style</p>
                    <p className="text-sm font-light text-crema/60 leading-relaxed">{brandStyle}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════
            SLIDE 2C — MOODBOARD
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
              consumerProposals.length === 1 && consumerProposals[0].desc.length > 400 ? (
                /* Single long profile — editorial layout */
                <div className="max-w-3xl">
                  <p className="text-xl md:text-2xl font-light text-crema leading-relaxed">
                    {consumerProposals[0].desc.slice(0, 500).replace(/\s\S*$/, '')}...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {consumerProposals.map((profile, i) => (
                    <div key={i} className="border border-crema/[0.08] p-8 group">
                      <div className="flex items-start gap-4 mb-4">
                        <span className="text-[10px] tracking-[0.15em] uppercase font-medium px-2 py-0.5 border border-crema/10 text-crema/30">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3 className="text-lg font-light text-crema">{profile.title}</h3>
                      </div>
                      <p className="text-sm font-light text-crema/50 leading-relaxed">
                        {profile.desc.length > 300 ? profile.desc.slice(0, 300).replace(/\s\S*$/, '') + '...' : profile.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )
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
            SLIDE 8+ — PRODUCT GRID (paginated, 10 per slide)
            ═══════════════════════════════════════════ */}
        {skus.length > 0 ? (
          (() => {
            const perPage = 10;
            const pages = Math.ceil(Math.min(skus.length, 40) / perPage);
            return Array.from({ length: pages }, (_, pageIdx) => {
              const pageSkus = skus.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
              return (
                <section key={`products-${pageIdx}`} className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
                  <div className="w-full">
                    <p className="text-[10px] tracking-[0.3em] uppercase mb-8" style={{ color: '#9c7c4c' }}>
                      Product Portfolio{pages > 1 ? ` (${pageIdx + 1}/${pages})` : ''}
                    </p>
                    <div className="grid grid-cols-5 gap-3">
                      {pageSkus.map((sku) => (
                        <div key={sku.id} className="border border-crema/[0.06] p-3">
                          {sku.sketch_url ? (
                            <div className="aspect-square bg-crema/[0.03] mb-2 overflow-hidden">
                              <img src={sku.sketch_url} alt={sku.name} className="w-full h-full object-cover opacity-80" />
                            </div>
                          ) : (
                            <div className="aspect-square bg-crema/[0.03] mb-2 flex items-center justify-center">
                              <span className="text-[10px] text-crema/15 uppercase">{(sku.family || '?')[0]}</span>
                            </div>
                          )}
                          <p className="text-[11px] font-light text-crema truncate">{sku.name}</p>
                          <p className="text-[9px] text-crema/30 truncate">{sku.family}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] font-light text-crema/60">{sku.pvp > 0 ? currency(sku.pvp) : '\u2014'}</span>
                            <span className="text-[8px] tracking-[0.1em] uppercase text-crema/30">{sku.type || 'REV'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            });
          })()
        ) : (
          <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
            <p className="text-xl font-light text-crema/30 italic">No products created yet</p>
          </section>
        )}


        {/* ═══════════════════════════════════════════
            MARKETING STORY MODE — 10 conditional slides
            (between Product Grid and Timeline, decisions locked 2026-04-11)
            ═══════════════════════════════════════════ */}
        {marketing && marketingVisibility && (
          <MarketingStorySlides data={marketing} visibility={marketingVisibility} />
        )}


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


/* ═══════════════════════════════════════════════════════════════════════════
   Marketing Story Mode — 10 conditional slides (decisions locked 2026-04-11).
   Inserted between Product Grid and Timeline.

   Order: Brand Voice → Stories → Pillars → Lookbook → Drops →
          Content Calendar → Paid & Growth → Launch Readiness →
          Email Sequences → Retrospective (post-launch only)

   Zero invented data: each slide omits cleanly when the source is empty.
   ═══════════════════════════════════════════════════════════════════════════ */

function MarketingStorySlides({
  data,
  visibility,
}: {
  data: MarketingPresentationData;
  visibility: MarketingSlideVisibility;
}) {
  return (
    <>
      {/* ═══ SLIDE M1 — BRAND VOICE ═══ */}
      {visibility.brandVoice && data.brandVoice && (
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Brand Voice
            </p>
            {data.brandVoice.personality && (
              <h3 className="text-3xl md:text-4xl font-light text-crema tracking-tight mb-10 max-w-3xl">
                {data.brandVoice.personality}
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {data.brandVoice.tone && (
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-crema/25 mb-3">Tone</p>
                  <p className="text-sm font-light text-crema/70 leading-relaxed max-w-md">
                    {data.brandVoice.tone}
                  </p>
                </div>
              )}
              {data.brandVoice.example_caption && (
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-crema/25 mb-3">Example Caption</p>
                  <p className="text-sm font-light italic text-crema/60 leading-relaxed max-w-md">
                    &ldquo;{data.brandVoice.example_caption}&rdquo;
                  </p>
                </div>
              )}
            </div>
            {(data.brandVoice.do_rules?.length || data.brandVoice.dont_rules?.length) ? (
              <div className="mt-14 pt-6 border-t border-crema/[0.06] grid grid-cols-1 md:grid-cols-2 gap-12">
                {data.brandVoice.do_rules && data.brandVoice.do_rules.length > 0 && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-crema/25 mb-4">Do</p>
                    <ul className="space-y-2">
                      {data.brandVoice.do_rules.map((rule, i) => (
                        <li key={i} className="text-sm font-light text-crema/70 flex items-start gap-3">
                          <span className="text-[#9c7c4c] mt-1">+</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.brandVoice.dont_rules && data.brandVoice.dont_rules.length > 0 && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-crema/25 mb-4">Don&rsquo;t</p>
                    <ul className="space-y-2">
                      {data.brandVoice.dont_rules.map((rule, i) => (
                        <li key={i} className="text-sm font-light text-crema/60 flex items-start gap-3">
                          <span className="text-crema/30 mt-1">—</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ═══ SLIDE M2 — STORIES (one per story, max 5) ═══ */}
      {visibility.stories &&
        data.stories.slice(0, 5).map(({ story, heroImageUrl, heroSkuName }, idx) => (
          <section
            key={`story-${story.id}`}
            className="slide min-h-screen flex bg-carbon relative overflow-hidden"
          >
            {/* Left: hero image (when present) */}
            {heroImageUrl ? (
              <div className="w-1/2 relative bg-crema/[0.03]">
                <img src={heroImageUrl} alt={story.name} className="w-full h-full object-cover absolute inset-0" />
              </div>
            ) : (
              <div className="w-1/2 relative bg-crema/[0.02] flex items-center justify-center">
                <p className="text-[11px] tracking-[0.25em] uppercase text-crema/15">
                  Story {String(idx + 1).padStart(2, '0')}
                </p>
              </div>
            )}
            {/* Right: narrative */}
            <div className="w-1/2 flex flex-col justify-center px-16 py-12">
              <p className="text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: '#9c7c4c' }}>
                Story {String(idx + 1).padStart(2, '0')}
              </p>
              <h3 className="text-4xl md:text-5xl font-light text-crema tracking-tight leading-[0.95] mb-8">
                {story.name}
              </h3>
              {story.editorial_hook && (
                <p className="text-lg md:text-xl font-light italic text-crema/70 leading-snug mb-8 max-w-lg">
                  &ldquo;{story.editorial_hook}&rdquo;
                </p>
              )}
              {story.narrative && (
                <p className="text-sm md:text-base font-light text-crema/60 leading-relaxed max-w-lg">
                  {story.narrative}
                </p>
              )}
              {(story.tone || heroSkuName) && (
                <div className="mt-10 pt-6 border-t border-crema/[0.06] flex gap-10 text-[10px] tracking-[0.2em] uppercase text-crema/30">
                  {story.tone && <span>Tone · {story.tone}</span>}
                  {heroSkuName && <span>Hero · {heroSkuName}</span>}
                </div>
              )}
            </div>
          </section>
        ))}

      {/* ═══ SLIDE M3 — CONTENT PILLARS ═══ */}
      {visibility.pillars && (
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-crema relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Content Pillars
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {data.pillars.slice(0, 6).map((pillar, i) => (
                <div key={pillar.id} className="border-l-2 pl-6 border-[#9c7c4c]/40">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-carbon/30">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h4 className="text-xl font-light text-carbon tracking-tight">{pillar.name}</h4>
                  </div>
                  {pillar.description && (
                    <p className="text-sm font-light text-carbon/60 leading-relaxed mb-3">
                      {pillar.description}
                    </p>
                  )}
                  {pillar.examples && pillar.examples.length > 0 && (
                    <ul className="text-[11px] font-light text-carbon/50 space-y-1">
                      {pillar.examples.slice(0, 3).map((ex, j) => (
                        <li key={j}>· {ex}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SLIDE M4 — LOOKBOOK (one slide per page, full layout fidelity) ═══ */}
      {visibility.lookbook &&
        data.lookbookPages.map((page) => (
          <section key={`lookbook-${page.id}`} className="slide min-h-screen bg-carbon">
            <LookbookPageRenderer page={page} />
          </section>
        ))}

      {/* ═══ SLIDE M5 — GO-TO-MARKET DROPS ═══ */}
      {visibility.drops && (
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Go-to-Market · Drops
            </p>
            <div className="space-y-6">
              {data.drops.map((drop) => (
                <div key={drop.id} className="flex items-start gap-6 pb-6 border-b border-crema/[0.06]">
                  <div className="w-16 shrink-0">
                    <p className="text-3xl font-light text-crema tracking-tight">
                      {String(drop.drop_number).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-light text-crema mb-2">{drop.name}</h4>
                    {drop.story_description && (
                      <p className="text-sm font-light text-crema/50 leading-relaxed mb-3 max-w-2xl">
                        {drop.story_description}
                      </p>
                    )}
                    <div className="flex gap-6 text-[10px] tracking-[0.2em] uppercase text-crema/30">
                      {drop.launch_date && <span>Launch · {formatDate(drop.launch_date)}</span>}
                      {drop.weeks_active && <span>{drop.weeks_active}w active</span>}
                      {drop.channels && drop.channels.length > 0 && (
                        <span>{drop.channels.slice(0, 3).join(' · ')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {data.commercialActions.length > 0 && (
              <div className="mt-10 pt-6 border-t border-crema/[0.06]">
                <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30 mb-4">
                  Commercial Actions
                </p>
                <div className="flex flex-wrap gap-3">
                  {data.commercialActions.slice(0, 8).map((action) => (
                    <span
                      key={action.id}
                      className="text-[11px] font-light text-crema/60 border border-crema/10 px-3 py-1.5"
                    >
                      {action.name}
                      {action.start_date && (
                        <span className="text-crema/30 ml-2">· {formatDate(action.start_date)}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ SLIDE M6 — CONTENT CALENDAR (one slide per week, max 4) ═══ */}
      {visibility.contentCalendar &&
        data.contentCalendarWeeks.map((week, weekIdx) => (
          <section
            key={`calendar-${week.startDate}`}
            className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-crema relative"
          >
            <div className="max-w-5xl w-full">
              <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
                Content Calendar · Week {weekIdx + 1}
              </p>
              <div className="flex items-baseline gap-4 mb-8">
                <p className="text-4xl font-light text-carbon tracking-tight">{week.weekLabel}</p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-carbon/30">
                  {week.entries.length} post{week.entries.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="space-y-3">
                {week.entries.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-6 py-3 border-b border-carbon/[0.06]"
                  >
                    <span className="w-20 shrink-0 text-[10px] tracking-[0.15em] uppercase text-carbon/30 pt-1">
                      {new Date(entry.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="w-24 shrink-0 text-[9px] tracking-[0.15em] uppercase text-carbon/40 pt-1">
                      {entry.platform ?? entry.content_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-carbon truncate">{entry.title}</p>
                      {entry.caption && (
                        <p className="text-[11px] font-light text-carbon/50 truncate max-w-2xl">
                          {entry.caption}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

      {/* ═══ SLIDE M7 — PAID & GROWTH ═══ */}
      {visibility.paidGrowth && (
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Paid &amp; Growth
            </p>
            <div className="flex items-baseline gap-8 mb-10">
              <div>
                <p className="text-5xl font-light text-crema tracking-tight">
                  {data.paidCampaigns.length}
                </p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30 mt-2">Campaigns</p>
              </div>
              <div>
                <p className="text-5xl font-light text-crema tracking-tight">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(
                    data.paidCampaigns.reduce((sum, c) => sum + c.totalBudget, 0)
                  )}
                </p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-crema/30 mt-2">Total Budget</p>
              </div>
            </div>
            <div className="space-y-4">
              {data.paidCampaigns.slice(0, 6).map(({ campaign, totalBudget, adSetCount }) => (
                <div
                  key={campaign.id}
                  className="flex items-center gap-6 py-4 border-b border-crema/[0.06]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1">
                      <h4 className="text-base font-light text-crema">{campaign.name}</h4>
                      <span className="text-[9px] tracking-[0.15em] uppercase text-crema/30">
                        {campaign.platform}
                      </span>
                    </div>
                    <p className="text-[11px] font-light text-crema/40">
                      {campaign.objective}
                      {adSetCount > 0 && ` · ${adSetCount} ad set${adSetCount !== 1 ? 's' : ''}`}
                      {campaign.drop_name && ` · ${campaign.drop_name}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-light text-crema">
                      {currency(totalBudget)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SLIDE M8 — LAUNCH READINESS ═══ */}
      {visibility.launchReadiness && data.launchReadiness && (
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-crema relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Launch Readiness
            </p>
            <div className="flex items-baseline gap-4 mb-12">
              <p className="text-7xl font-light text-carbon tracking-tight leading-none">
                {data.launchReadiness.overallPct}%
              </p>
              <p className="text-sm tracking-[0.2em] uppercase text-carbon/40 pb-3">
                {data.launchReadiness.completedTasks} / {data.launchReadiness.totalTasks} tasks
              </p>
            </div>
            <div className="space-y-4">
              {data.launchReadiness.categories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-6">
                  <div className="w-48 shrink-0">
                    <p className="text-sm font-light text-carbon capitalize">
                      {cat.category.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-carbon/30">
                      {cat.completed} / {cat.total}
                    </p>
                  </div>
                  <div className="flex-1 h-6 bg-carbon/[0.04] relative overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.max(cat.pct, 3)}%`,
                        backgroundColor: '#9c7c4c',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <div className="w-12 shrink-0 text-right">
                    <p className="text-sm font-light text-carbon/60">{cat.pct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SLIDE M9 — EMAIL SEQUENCES ═══ */}
      {visibility.emailSequences && (
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-carbon relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Email Sequences
            </p>
            <div className="space-y-10">
              {data.emailSequences.slice(0, 3).map((group) => (
                <div key={group.sequenceId}>
                  <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-crema/[0.06]">
                    <h4 className="text-xl font-light text-crema">
                      {group.sequenceName ?? 'Sequence'}
                    </h4>
                    {group.sequenceType && (
                      <span className="text-[9px] tracking-[0.15em] uppercase text-[#9c7c4c]">
                        {group.sequenceType.replace(/_/g, ' ')}
                      </span>
                    )}
                    <span className="text-[10px] tracking-[0.15em] uppercase text-crema/30">
                      {group.emails.length} email{group.emails.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.emails.map((email, i) => (
                      <div
                        key={email.id}
                        className="border border-crema/[0.06] p-4"
                      >
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-[9px] tracking-[0.15em] uppercase text-crema/30">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          {email.send_delay_hours !== null && email.send_delay_hours !== undefined && (
                            <span className="text-[9px] tracking-[0.1em] uppercase text-crema/25">
                              +{email.send_delay_hours}h
                            </span>
                          )}
                        </div>
                        {email.subject_line && (
                          <p className="text-sm font-light text-crema mb-1">{email.subject_line}</p>
                        )}
                        {email.preview_text && (
                          <p className="text-[11px] font-light text-crema/50 italic">
                            {email.preview_text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SLIDE M10 — RETROSPECTIVE (post-launch only) ═══ */}
      {visibility.retrospective && data.postLaunchAnalysis && (
        <section className="slide min-h-screen flex flex-col justify-center px-16 py-12 bg-crema relative">
          <div className="max-w-5xl w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-10" style={{ color: '#9c7c4c' }}>
              Retrospective
            </p>
            {data.postLaunchAnalysis.result.overall_assessment && (
              <blockquote className="text-2xl md:text-3xl font-light italic text-carbon leading-snug mb-12 max-w-4xl">
                &ldquo;{data.postLaunchAnalysis.result.overall_assessment}&rdquo;
              </blockquote>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {data.postLaunchAnalysis.result.wins && data.postLaunchAnalysis.result.wins.length > 0 && (
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-carbon/30 mb-4">Wins</p>
                  <ul className="space-y-2">
                    {data.postLaunchAnalysis.result.wins.slice(0, 5).map((win, i) => (
                      <li key={i} className="text-sm font-light text-carbon/70 flex items-start gap-2">
                        <span className="text-[#9c7c4c]">+</span>
                        <span>{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.postLaunchAnalysis.result.areas_for_improvement &&
                data.postLaunchAnalysis.result.areas_for_improvement.length > 0 && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-carbon/30 mb-4">
                      Areas for Improvement
                    </p>
                    <ul className="space-y-2">
                      {data.postLaunchAnalysis.result.areas_for_improvement.slice(0, 5).map((area, i) => (
                        <li key={i} className="text-sm font-light text-carbon/60 flex items-start gap-2">
                          <span className="text-carbon/30">—</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {data.postLaunchAnalysis.result.recommendations &&
                data.postLaunchAnalysis.result.recommendations.length > 0 && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-carbon/30 mb-4">
                      Recommendations
                    </p>
                    <ul className="space-y-2">
                      {data.postLaunchAnalysis.result.recommendations.slice(0, 5).map((rec, i) => (
                        <li key={i} className="text-sm font-light text-carbon/70 flex items-start gap-2">
                          <span className="text-[#9c7c4c]">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
