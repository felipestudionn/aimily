'use client';

/* ═══════════════════════════════════════════════════════════════════
   ProductionWorkspace — dedicated PO + production sample hub.

   Each SKU in production surfaces:
   - Production sample photo (or render fallback)
   - PO state (draft → sent → in-production → shipped → approved)
   - Unit cost final vs target COGS (red flag on overrun)
   - ETA vs target_delivery_date (amber flag when <14d and not shipped)
   - Factory name + region
   - Primary CTA: "Review sample" or "Approve for drop"

   The summary strip above the grid shows the pipeline health at a
   glance — state breakdown + cost & timeline health bars.

   Deep editing inherits the existing SkuDetailView → ProductionPhase
   flow by opening the same modal CollectionBuilder uses.
   ═══════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { Package, Factory as FactoryIcon, Clock, AlertTriangle, Check, ChevronRight, ImagePlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useColorways } from '@/hooks/useColorways';
import { useSampleReviews } from '@/hooks/useSampleReviews';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { SkuLifecycleProvider, EMPTY_DESIGN_DATA, type DesignWorkspaceData } from '@/components/planner/sku-phases/SkuLifecycleContext';
import { SkuDetailView } from '@/components/planner/SkuDetailView';
import { useTranslation } from '@/i18n';

interface Props {
  collectionPlanId: string;
  collectionName: string;
}

type PoStatus = 'draft' | 'sent' | 'in_production' | 'shipped' | 'approved';
type Filter = 'all' | PoStatus;

const PO_STATUS_TOKENS: Record<PoStatus, { bg: string; fg: string; label: string }> = {
  draft:         { bg: 'bg-carbon/[0.06]', fg: 'text-carbon/55',  label: 'Draft' },
  sent:          { bg: 'bg-[#7d5a8c]/10',  fg: 'text-[#7d5a8c]',  label: 'PO sent' },
  in_production: { bg: 'bg-[#c77000]/10',  fg: 'text-[#c77000]',  label: 'In production' },
  shipped:       { bg: 'bg-[#9c7c4c]/15',  fg: 'text-[#9c7c4c]',  label: 'Sample in' },
  approved:      { bg: 'bg-[#2d6a4f]/10',  fg: 'text-[#2d6a4f]',  label: 'Approved' },
};

function derivePoStatus(sku: SKU): PoStatus {
  if (sku.production_approved) return 'approved';
  const pd = sku.production_data || {};
  if (sku.production_sample_url) return 'shipped';
  if (pd.po_number || pd.po_generated_at) return 'in_production';
  if (pd.factory_name) return 'sent';
  return 'draft';
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatK(value: number) {
  if (!value) return '€0';
  if (Math.abs(value) >= 1000) return `€${Math.round(value / 1000).toLocaleString()}K`;
  return `€${value.toLocaleString()}`;
}

function sampleCover(sku: SKU): string | undefined {
  return (
    sku.production_sample_url ||
    sku.render_urls?.['3d'] ||
    sku.render_urls?.preview ||
    sku.render_url ||
    sku.sketch_url ||
    sku.reference_image_url
  );
}

export function ProductionWorkspace({ collectionPlanId, collectionName }: Props) {
  const t = useTranslation();
  const w = (t as unknown as { productionWorkspace?: Record<string, string> }).productionWorkspace || {};
  const { skus: allSkus, updateSku, deleteSku, loading } = useSkus(collectionPlanId);

  // Lifecycle hooks needed by SkuDetailView modal
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

  const skus = useMemo(() => allSkus.filter(s => (s.design_phase || 'range_plan') === 'production'), [allSkus]);

  // PO status index
  const index = useMemo(() => {
    const byStatus: Record<PoStatus, SKU[]> = { draft: [], sent: [], in_production: [], shipped: [], approved: [] };
    let totalValue = 0;
    let costOverruns = 0;
    let slippingEta = 0;
    skus.forEach(s => {
      const status = derivePoStatus(s);
      byStatus[status].push(s);
      const pd = s.production_data || {};
      const qty = Number(pd.order_quantity || s.buy_units || 0);
      const unitCost = Number(pd.unit_cost_final || s.cost || 0);
      totalValue += qty * unitCost;
      if (pd.unit_cost_final && s.cost && pd.unit_cost_final > s.cost) costOverruns += 1;
      const d = daysUntil(pd.target_delivery_date);
      if (d !== null && d < 14 && status !== 'shipped' && status !== 'approved') slippingEta += 1;
    });
    return { byStatus, totalValue, costOverruns, slippingEta };
  }, [skus]);

  const visibleSkus = useMemo(() => {
    if (filter === 'all') return skus;
    return index.byStatus[filter] || [];
  }, [filter, skus, index]);

  const statusLabel = (s: PoStatus) => (w[`status_${s}`] as string) || PO_STATUS_TOKENS[s].label;

  const handleApprove = async (sku: SKU, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateSku(sku.id, { production_approved: true });
    } catch (err) {
      console.error('[Production] approve failed', err);
    }
  };

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-10 md:pt-14 pb-24">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            {w.title || 'Production'}
          </h1>
          <p className="text-[14px] text-carbon/50 mt-3 max-w-[640px] mx-auto leading-relaxed">
            {w.intro || 'Own the production order. Factories, POs, costs, ETAs and final samples — everything the team needs to land the drop on time and on budget.'}
          </p>
        </div>

        {/* ── Summary card ── */}
        {skus.length > 0 && (
          <div className="bg-white rounded-[20px] p-7 md:p-8 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <SummaryStat
                label={w.summaryOpenPos || 'Open POs'}
                value={String(skus.filter(s => !s.production_approved).length)}
              />
              <SummaryStat
                label={w.summaryTotalValue || 'Total PO value'}
                value={formatK(index.totalValue)}
              />
              <SummaryStat
                label={w.summaryCostOverrun || 'Over COGS'}
                value={String(index.costOverruns)}
                icon={index.costOverruns > 0 ? AlertTriangle : undefined}
                tone={index.costOverruns > 0 ? 'warn' : undefined}
              />
              <SummaryStat
                label={w.summaryEtaSlip || 'ETA slipping'}
                value={String(index.slippingEta)}
                icon={index.slippingEta > 0 ? Clock : undefined}
                tone={index.slippingEta > 0 ? 'warn' : undefined}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={filter === 'all'}
                label={w.filterAll || 'All'}
                count={skus.length}
                onClick={() => setFilter('all')}
              />
              {(['draft', 'sent', 'in_production', 'shipped', 'approved'] as PoStatus[]).map(s => (
                <FilterPill
                  key={s}
                  active={filter === s}
                  label={statusLabel(s)}
                  count={index.byStatus[s].length}
                  bg={PO_STATUS_TOKENS[s].bg}
                  fg={PO_STATUS_TOKENS[s].fg}
                  onClick={() => setFilter(s)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="text-[13px] text-carbon/40 text-center py-16">…</div>
        ) : skus.length === 0 ? (
          <div className="mx-auto max-w-[520px] text-center bg-white rounded-[20px] p-14">
            <Package className="h-6 w-6 text-carbon/30 mx-auto mb-5" strokeWidth={1.5} />
            <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
              {w.emptyTitle || 'No production orders yet'}
            </h3>
            <p className="text-[14px] text-carbon/50 leading-[1.6]">
              {w.emptyBody || 'SKUs show up here once the prototype is approved. Sign off on a proto to kick off the factory order.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleSkus.map(sku => {
              const pd = sku.production_data || {};
              const cover = sampleCover(sku);
              const status = derivePoStatus(sku);
              const tokens = PO_STATUS_TOKENS[status];
              const isApproved = sku.production_approved === true;

              const finalCost = Number(pd.unit_cost_final || 0);
              const targetCost = Number(sku.cost || 0);
              const costOverrun = finalCost > 0 && targetCost > 0 && finalCost > targetCost;
              const costDelta = costOverrun ? finalCost - targetCost : 0;

              const daysToEta = daysUntil(pd.target_delivery_date);
              const etaAmber = daysToEta !== null && daysToEta < 14 && daysToEta >= 0 && status !== 'shipped' && status !== 'approved';
              const etaRed = daysToEta !== null && daysToEta < 0;

              const qty = Number(pd.order_quantity || sku.buy_units || 0);

              return (
                <button
                  key={sku.id}
                  onClick={() => setSelectedSku(sku)}
                  className="group bg-white rounded-[20px] overflow-hidden text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                >
                  {/* Image */}
                  <div className="aspect-[4/5] bg-carbon/[0.02] relative">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover as string} alt={sku.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImagePlus className="h-7 w-7 text-carbon/15" strokeWidth={1.25} />
                      </div>
                    )}
                    <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${tokens.bg} ${tokens.fg} text-[10px] font-bold tracking-[0.1em] uppercase`}>
                      {statusLabel(status)}
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

                    {/* Factory */}
                    <div className="flex items-center gap-1.5 text-[11px] text-carbon/55 mb-3 truncate">
                      <FactoryIcon className="h-3 w-3 text-carbon/35" strokeWidth={2} />
                      <span className="truncate">
                        {pd.factory_name || (w.noFactory || 'Factory not assigned')}
                      </span>
                      {pd.factory_origin && (
                        <span className="text-carbon/30 truncate">· {pd.factory_origin}</span>
                      )}
                    </div>

                    {/* Qty / Cost / ETA */}
                    <div className="grid grid-cols-3 gap-2 mb-5 text-[11px]">
                      <div>
                        <p className="text-carbon/40 uppercase tracking-wide mb-0.5">{w.cardQty || 'Qty'}</p>
                        <p className="font-semibold text-carbon tabular-nums">{qty.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-carbon/40 uppercase tracking-wide mb-0.5">{w.cardCost || 'Unit cost'}</p>
                        <p className={`font-semibold tabular-nums ${costOverrun ? 'text-[#A0463C]' : 'text-carbon'}`}>
                          {finalCost > 0 ? `€${finalCost}` : `€${targetCost}`}
                          {costOverrun && (
                            <span className="ml-1 text-[9px] font-bold">▲€{costDelta}</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-carbon/40 uppercase tracking-wide mb-0.5">{w.cardEta || 'ETA'}</p>
                        <p className={`font-semibold tabular-nums ${etaRed ? 'text-[#A0463C]' : etaAmber ? 'text-[#c77000]' : 'text-carbon'}`}>
                          {daysToEta === null
                            ? '—'
                            : daysToEta < 0
                              ? (w.etaOverdue || 'Overdue')
                              : daysToEta === 0
                                ? (w.today || 'today')
                                : `${daysToEta}${w.daysShort || 'd'}`}
                        </p>
                      </div>
                    </div>

                    {/* CTA row */}
                    <div className="flex items-center gap-2">
                      {!isApproved && sku.production_sample_url ? (
                        <>
                          <div className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-carbon/[0.04] text-carbon/55 text-[11px] font-semibold">
                            {w.ctaReviewSample || 'Review sample'}
                            <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                          </div>
                          <button
                            onClick={(e) => handleApprove(sku, e)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-[#2d6a4f] text-white text-[11px] font-semibold hover:bg-[#245740] transition-colors"
                          >
                            <Check className="h-3 w-3" strokeWidth={2.75} />
                            {w.ctaApprove || 'Approve'}
                          </button>
                        </>
                      ) : isApproved ? (
                        <div className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[#2d6a4f]/10 text-[#2d6a4f] text-[11px] font-semibold">
                          <Check className="h-3 w-3" strokeWidth={2.75} />
                          {w.ctaApproved || 'Approved for drop'}
                        </div>
                      ) : (
                        <div className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-carbon text-white text-[11px] font-semibold group-hover:bg-carbon/90 transition-colors">
                          {w.ctaOpen || 'Open production'}
                          <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SKU detail modal ── */}
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

function SummaryStat({ label, value, icon: Icon, tone }: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: 'warn';
}) {
  const color = tone === 'warn' ? 'text-[#c77000]' : 'text-carbon';
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-2">{label}</p>
      <p className={`text-[22px] md:text-[24px] font-bold tabular-nums tracking-[-0.03em] leading-none inline-flex items-center gap-1.5 ${color}`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={2.25} />}
        {value}
      </p>
    </div>
  );
}

function FilterPill({ active, label, count, onClick, bg, fg }: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  bg?: string;
  fg?: string;
}) {
  const fallbackBg = bg || 'bg-carbon/[0.06]';
  const fallbackFg = fg || 'text-carbon/70';
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-colors ${
        active ? 'bg-carbon text-white' : `${fallbackBg} ${fallbackFg} hover:bg-carbon/[0.1]`
      }`}
    >
      {label}
      <span className={`tabular-nums ${active ? 'text-white/70' : 'opacity-60'}`}>{count}</span>
    </button>
  );
}
