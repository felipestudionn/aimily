'use client';

/* ═══════════════════════════════════════════════════════════════════
   SketchColorWorkspace — dedicated sketch + colorway + materials hub.

   Per SKU, surface at a glance:
   - The flat sketch (with a mini top-view preview when present)
   - Colorway dots (primary hex per colorway, active dot flipped)
   - Material zones count
   - PVP / COGS
   - Readiness: "Continue in sketch" until sketched + colorway + zones
     are all defined, then "Ready for Tech Pack"

   Click-through → the existing SkuDetailView modal on the sketch step
   inherits the full AI pipeline (colorize, 3D render, zone picker).
   ═══════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { ChevronRight, ImagePlus, Layers, Palette, Sparkles } from 'lucide-react';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useColorways } from '@/hooks/useColorways';
import { useSampleReviews } from '@/hooks/useSampleReviews';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { SkuLifecycleProvider, EMPTY_DESIGN_DATA, type DesignWorkspaceData } from '@/components/planner/sku-phases/SkuLifecycleContext';
import { SkuDetailView } from '@/components/planner/SkuDetailView';
import type { SkuColorway } from '@/types/design';
import { useTranslation } from '@/i18n';

interface Props {
  collectionPlanId: string;
  collectionName: string;
}

type Readiness = 'empty' | 'sketching' | 'coloring' | 'ready';

function readiness(sku: SKU, cws: SkuColorway[]): Readiness {
  const hasSketch = Boolean(sku.sketch_url);
  const hasColorway = cws.length > 0;
  const hasZones = (sku.material_zones?.length || 0) > 0;
  if (!hasSketch) return 'empty';
  if (!hasColorway) return 'sketching';
  if (!hasZones) return 'coloring';
  return 'ready';
}

type Filter = 'all' | Readiness;

export function SketchColorWorkspace({ collectionPlanId, collectionName }: Props) {
  const t = useTranslation();
  const w = (t as unknown as { sketchWorkspace?: Record<string, string> }).sketchWorkspace || {};

  const { skus: allSkus, updateSku, deleteSku, loading } = useSkus(collectionPlanId);
  const { colorways, addColorway, updateColorway, deleteColorway } = useColorways(collectionPlanId);
  const { reviews, addReview, updateReview, deleteReview } = useSampleReviews(collectionPlanId);
  const { data: designData, save: saveDesignData } = useWorkspaceData<DesignWorkspaceData>(
    collectionPlanId,
    'design',
    EMPTY_DESIGN_DATA,
  );
  const { orders } = useProductionOrders(collectionPlanId);

  const [filter, setFilter] = useState<Filter>('all');
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);

  const skus = useMemo(
    () => allSkus.filter(s => ['range_plan', 'sketch'].includes(s.design_phase || 'range_plan')),
    [allSkus],
  );

  const cwBySku = useMemo(() => {
    const map = new Map<string, SkuColorway[]>();
    colorways.forEach(c => {
      const list = map.get(c.sku_id) || [];
      list.push(c);
      map.set(c.sku_id, list);
    });
    return map;
  }, [colorways]);

  const index = useMemo(() => {
    const counts: Record<Readiness, number> = { empty: 0, sketching: 0, coloring: 0, ready: 0 };
    skus.forEach(s => {
      const r = readiness(s, cwBySku.get(s.id) || []);
      counts[r] += 1;
    });
    const withSketch = skus.filter(s => s.sketch_url).length;
    const totalColorways = colorways.filter(c => skus.some(s => s.id === c.sku_id)).length;
    return { counts, withSketch, totalColorways };
  }, [skus, colorways, cwBySku]);

  const visibleSkus = useMemo(() => {
    if (filter === 'all') return skus;
    return skus.filter(s => readiness(s, cwBySku.get(s.id) || []) === filter);
  }, [filter, skus, cwBySku]);

  const label = (s: Readiness) => (w[`status_${s}`] as string) || s;

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-10 md:pt-14 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            {w.title || 'Sketch & Color'}
          </h1>
          <p className="text-[14px] text-carbon/50 mt-3 max-w-[640px] mx-auto leading-relaxed">
            {w.intro || 'Every silhouette, colorway, and material in one hub. Finish a sketch, lock a palette, define the zones — then ship the tech pack.'}
          </p>
        </div>

        {/* Summary */}
        {skus.length > 0 && (
          <div className="bg-white rounded-[20px] p-7 md:p-8 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <Stat label={w.summarySketched || 'Sketched'} value={`${index.withSketch} / ${skus.length}`} />
              <Stat label={w.summaryColorways || 'Colorways'} value={String(index.totalColorways)} />
              <Stat label={w.summaryReadyTechPack || 'Ready for tech pack'} value={String(index.counts.ready)} />
              <Stat label={w.summaryEmpty || 'Awaiting sketch'} value={String(index.counts.empty)} tone={index.counts.empty > 0 ? 'muted' : undefined} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill active={filter === 'all'} label={w.filterAll || 'All'} count={skus.length} onClick={() => setFilter('all')} />
              <Pill active={filter === 'empty'} label={label('empty')} count={index.counts.empty} onClick={() => setFilter('empty')} tone="muted" />
              <Pill active={filter === 'sketching'} label={label('sketching')} count={index.counts.sketching} onClick={() => setFilter('sketching')} tone="gold" />
              <Pill active={filter === 'coloring'} label={label('coloring')} count={index.counts.coloring} onClick={() => setFilter('coloring')} tone="plum" />
              <Pill active={filter === 'ready'} label={label('ready')} count={index.counts.ready} onClick={() => setFilter('ready')} tone="moss" />
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="text-[13px] text-carbon/40 text-center py-16">…</div>
        ) : skus.length === 0 ? (
          <div className="mx-auto max-w-[520px] text-center bg-white rounded-[20px] p-14">
            <Palette className="h-6 w-6 text-carbon/30 mx-auto mb-5" strokeWidth={1.5} />
            <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
              {w.emptyTitle || 'Nothing to sketch yet'}
            </h3>
            <p className="text-[14px] text-carbon/50 leading-[1.6]">
              {w.emptyBody || 'Add SKUs in the Collection Builder to start sketching silhouettes and colorways here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleSkus.map(sku => {
              const skuColorways = cwBySku.get(sku.id) || [];
              const zones = sku.material_zones?.length || 0;
              const r = readiness(sku, skuColorways);
              return (
                <button
                  key={sku.id}
                  onClick={() => setSelectedSku(sku)}
                  className="group bg-white rounded-[20px] overflow-hidden text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                >
                  {/* Sketch + top view */}
                  <div className="aspect-[4/5] bg-carbon/[0.02] relative">
                    {sku.sketch_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sku.sketch_url} alt={sku.name} className="absolute inset-0 w-full h-full object-contain p-3" />
                        {sku.sketch_top_url && (
                          <div className="absolute bottom-3 right-3 w-16 h-16 rounded-[10px] bg-white border border-carbon/[0.08] overflow-hidden shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sku.sketch_top_url} alt="" className="w-full h-full object-contain p-1" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <ImagePlus className="h-7 w-7 text-carbon/15" strokeWidth={1.25} />
                        <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
                          {w.noSketch || 'No sketch yet'}
                        </p>
                      </div>
                    )}

                    {/* Readiness pill */}
                    <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.1em] uppercase ${
                      r === 'ready' ? 'bg-[#2d6a4f]/10 text-[#2d6a4f]'
                      : r === 'coloring' ? 'bg-[#7d5a8c]/10 text-[#7d5a8c]'
                      : r === 'sketching' ? 'bg-[#9c7c4c]/15 text-[#9c7c4c]'
                      : 'bg-carbon/[0.06] text-carbon/50'
                    }`}>
                      {label(r)}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
                      {sku.family} · {(w.drop || 'Drop')} {sku.drop_number}
                    </p>
                    <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.01em] leading-tight mb-3 truncate">
                      {sku.name}
                    </h3>

                    {/* PVP / COGS */}
                    <div className="flex items-center gap-4 text-[11px] text-carbon/55 mb-3 tabular-nums">
                      <span><span className="text-carbon/40 uppercase tracking-wide">{w.cardPvp || 'PVP'}</span> <span className="font-semibold text-carbon">€{sku.pvp}</span></span>
                      <span><span className="text-carbon/40 uppercase tracking-wide">{w.cardCogs || 'COGS'}</span> <span className="font-semibold text-carbon">€{sku.cost}</span></span>
                    </div>

                    {/* Colorways */}
                    <div className="flex items-center gap-2 mb-3">
                      <Palette className="h-3 w-3 text-carbon/35" strokeWidth={2} />
                      {skuColorways.length === 0 ? (
                        <span className="text-[11px] text-carbon/45">{w.noColorways || 'No colorways yet'}</span>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            {skuColorways.slice(0, 5).map(cw => (
                              <span
                                key={cw.id}
                                title={cw.name}
                                className="h-3.5 w-3.5 rounded-full border border-carbon/10"
                                style={{ background: cw.hex_primary || '#000' }}
                              />
                            ))}
                            {skuColorways.length > 5 && (
                              <span className="text-[10px] text-carbon/45 ml-1">+{skuColorways.length - 5}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-carbon/45 ml-1">
                            {skuColorways.length} {skuColorways.length === 1 ? (w.colorwaySingular || 'colorway') : (w.colorwayPlural || 'colorways')}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Material zones */}
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="h-3 w-3 text-carbon/35" strokeWidth={2} />
                      <span className="text-[11px] text-carbon/55">
                        {zones > 0
                          ? `${zones} ${zones === 1 ? (w.zoneSingular || 'material zone') : (w.zonePlural || 'material zones')}`
                          : (w.noZones || 'No material zones defined')}
                      </span>
                    </div>

                    {/* CTA */}
                    <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                      r === 'ready' ? 'text-[#2d6a4f]' : 'text-carbon/60 group-hover:text-carbon'
                    }`}>
                      {r === 'ready' ? (
                        <>
                          <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                          {w.ctaReady || 'Ready for tech pack'}
                        </>
                      ) : r === 'empty' ? (
                        <>
                          {w.ctaStart || 'Start sketch'}
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                        </>
                      ) : (
                        <>
                          {w.ctaContinue || 'Continue'}
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedSku && (
        <SkuLifecycleProvider value={{
          colorways, addColorway, updateColorway, deleteColorway,
          reviews, addReview, updateReview, deleteReview,
          designData, saveDesignData,
          orders,
          collectionPlanId,
        }}>
          <SkuDetailView
            sku={selectedSku}
            onClose={() => setSelectedSku(null)}
            onUpdate={updateSku}
            onDelete={deleteSku}
          />
        </SkuLifecycleProvider>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'muted' }) {
  const color = tone === 'muted' ? 'text-carbon/40' : 'text-carbon';
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-2">{label}</p>
      <p className={`text-[22px] md:text-[24px] font-bold tabular-nums tracking-[-0.03em] leading-none ${color}`}>{value}</p>
    </div>
  );
}

function Pill({ active, label, count, onClick, tone }: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  tone?: 'muted' | 'gold' | 'plum' | 'moss';
}) {
  const toneClasses = {
    muted: 'bg-carbon/[0.06] text-carbon/50',
    gold:  'bg-[#9c7c4c]/15 text-[#9c7c4c]',
    plum:  'bg-[#7d5a8c]/10 text-[#7d5a8c]',
    moss:  'bg-[#2d6a4f]/10 text-[#2d6a4f]',
  }[tone ?? 'muted'];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-colors ${
        active ? 'bg-carbon text-white' : `${toneClasses} hover:bg-carbon/[0.1]`
      }`}
    >
      {label}
      <span className={`tabular-nums ${active ? 'text-white/70' : 'opacity-60'}`}>{count}</span>
    </button>
  );
}
