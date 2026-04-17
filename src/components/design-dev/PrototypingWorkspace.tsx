'use client';

/* ═══════════════════════════════════════════════════════════════════
   PrototypingWorkspace — dedicated proto iteration tracker.

   Lists every SKU in the prototyping phase as a gold-standard card.
   Each card surfaces the latest iteration photo, count, status,
   factory, and last notes at a glance. Click the card → the full
   SkuDetailView modal on the prototyping step (inherits the existing
   sku-phases flow, which is battle-tested).

   Status model comes straight from SKU.proto_iterations[].status
   ('pending' | 'issues' | 'approved' | 'rejected') — no migration
   needed.
   ═══════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { Camera, ChevronRight, Clock, Factory as FactoryIcon, ImagePlus } from 'lucide-react';
import { useSkus, type SKU, type ProtoIteration } from '@/hooks/useSkus';
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

type StatusFilter = 'all' | ProtoIteration['status'] | 'noproto';

function currentStatus(sku: SKU): { status: ProtoIteration['status'] | 'noproto'; iteration?: ProtoIteration } {
  const iters = sku.proto_iterations || [];
  if (iters.length === 0) return { status: 'noproto' };
  const latest = iters[iters.length - 1];
  return { status: latest.status, iteration: latest };
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

const STATUS_TOKENS: Record<ProtoIteration['status'] | 'noproto', { bg: string; fg: string; label: string }> = {
  pending:  { bg: 'bg-[#c77000]/10',  fg: 'text-[#c77000]',  label: 'Waiting' },
  issues:   { bg: 'bg-[#A0463C]/10',  fg: 'text-[#A0463C]',  label: 'Issues' },
  approved: { bg: 'bg-[#2d6a4f]/10',  fg: 'text-[#2d6a4f]',  label: 'Approved' },
  rejected: { bg: 'bg-carbon/[0.08]', fg: 'text-carbon/50',  label: 'Rejected' },
  noproto:  { bg: 'bg-carbon/[0.05]', fg: 'text-carbon/45',  label: 'No proto yet' },
};

export function PrototypingWorkspace({ collectionPlanId, collectionName }: Props) {
  const t = useTranslation();
  const w = (t as unknown as { prototypingWorkspace?: Record<string, string> }).prototypingWorkspace || {};
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

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);

  const skus = useMemo(() => allSkus.filter(s => (s.design_phase || 'range_plan') === 'prototyping'), [allSkus]);

  const statusIndex = useMemo(() => {
    const byStatus: Record<string, SKU[]> = { pending: [], issues: [], approved: [], rejected: [], noproto: [] };
    skus.forEach(s => {
      const { status } = currentStatus(s);
      byStatus[status].push(s);
    });
    return byStatus;
  }, [skus]);

  const visibleSkus = useMemo(() => {
    if (filter === 'all') return skus;
    return statusIndex[filter] || [];
  }, [filter, skus, statusIndex]);

  const statusLabel = (s: ProtoIteration['status'] | 'noproto') => {
    const key = `status_${s}`;
    return (w[key] as string) || STATUS_TOKENS[s].label;
  };

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-10 md:pt-14 pb-24">
        {/* ── Gold standard header ── */}
        <div className="text-center mb-10">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            {w.title || 'Prototyping'}
          </h1>
          <p className="text-[14px] text-carbon/50 mt-3 max-w-[640px] mx-auto leading-relaxed">
            {w.intro || 'Track every prototype in flight. Photos, fit, construction feedback — the whole factory loop at a glance.'}
          </p>
        </div>

        {/* ── Status kanban pills ── */}
        {skus.length > 0 && (
          <div className="bg-white rounded-[20px] p-6 md:p-7 mb-6">
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-4">
              {w.summaryTitle || 'Proto pipeline'}
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all' as StatusFilter, label: w.filterAll || 'All', count: skus.length, bg: 'bg-carbon/[0.06]', fg: 'text-carbon/70' },
                { key: 'pending' as StatusFilter, label: statusLabel('pending'), count: statusIndex.pending.length, bg: STATUS_TOKENS.pending.bg, fg: STATUS_TOKENS.pending.fg },
                { key: 'issues' as StatusFilter, label: statusLabel('issues'), count: statusIndex.issues.length, bg: STATUS_TOKENS.issues.bg, fg: STATUS_TOKENS.issues.fg },
                { key: 'approved' as StatusFilter, label: statusLabel('approved'), count: statusIndex.approved.length, bg: STATUS_TOKENS.approved.bg, fg: STATUS_TOKENS.approved.fg },
                { key: 'rejected' as StatusFilter, label: statusLabel('rejected'), count: statusIndex.rejected.length, bg: STATUS_TOKENS.rejected.bg, fg: STATUS_TOKENS.rejected.fg },
                { key: 'noproto' as StatusFilter, label: statusLabel('noproto'), count: statusIndex.noproto.length, bg: STATUS_TOKENS.noproto.bg, fg: STATUS_TOKENS.noproto.fg },
              ]).map(opt => {
                const active = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFilter(opt.key)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-colors ${
                      active
                        ? 'bg-carbon text-white'
                        : `${opt.bg} ${opt.fg} hover:bg-carbon/[0.1]`
                    }`}
                  >
                    {opt.label}
                    <span className={`tabular-nums ${active ? 'text-white/70' : 'opacity-60'}`}>{opt.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="text-[13px] text-carbon/40 text-center py-16">…</div>
        ) : skus.length === 0 ? (
          <div className="mx-auto max-w-[520px] text-center bg-white rounded-[20px] p-14">
            <Camera className="h-6 w-6 text-carbon/30 mx-auto mb-5" strokeWidth={1.5} />
            <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
              {w.emptyTitle || 'No prototypes yet'}
            </h3>
            <p className="text-[14px] text-carbon/50 leading-[1.6]">
              {w.emptyBody || 'SKUs show up here once they move out of Sketch. Approve a tech pack to start a prototype.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleSkus.map(sku => {
              const { status, iteration } = currentStatus(sku);
              const tokens = STATUS_TOKENS[status];
              const latestImage = iteration?.images?.[iteration.images.length - 1];
              const fallbackImage = sku.render_urls?.['3d'] || sku.sketch_url || sku.reference_image_url;
              const cover = latestImage || fallbackImage;
              const iterCount = sku.proto_iterations?.length || 0;
              const daysInStatus = daysSince(iteration?.created_at);
              const notesPreview = iteration?.notes ? iteration.notes.slice(0, 140) : '';
              const redFlag =
                status === 'pending' && daysInStatus !== null && daysInStatus > (sku.category === 'CALZADO' ? 21 : 14);

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
                    {/* Status pill */}
                    <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${tokens.bg} ${tokens.fg} text-[10px] font-bold tracking-[0.1em] uppercase`}>
                      {statusLabel(status)}
                    </div>
                    {/* Red flag */}
                    {redFlag && (
                      <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#A0463C] text-white text-[9px] font-bold tracking-[0.1em] uppercase">
                        <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
                        {daysInStatus}d
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
                      {sku.family} · {(w.drop || 'Drop')} {sku.drop_number}
                    </p>
                    <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.01em] leading-tight mb-3 truncate">
                      {sku.name}
                    </h3>

                    {/* Iteration count + days */}
                    <div className="flex items-center gap-3 text-[11px] text-carbon/55 mb-3">
                      {iterCount > 0 ? (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <span className="text-carbon font-semibold">v{iterCount}</span>
                          <span>·</span>
                          <span>{iterCount === 1 ? (w.firstIteration || 'first iteration') : (w.iterationsPrior || '{n} prior').replace('{n}', String(iterCount - 1))}</span>
                        </span>
                      ) : (
                        <span>{w.noIterYet || 'No iterations logged'}</span>
                      )}
                      {daysInStatus !== null && iterCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-carbon/40">
                          <Clock className="h-3 w-3" strokeWidth={2} />
                          {daysInStatus === 0 ? (w.today || 'today') : `${daysInStatus}${w.daysShort || 'd'}`}
                        </span>
                      )}
                    </div>

                    {/* Factory */}
                    {sku.sourcing_data?.factory && (
                      <div className="flex items-center gap-1.5 text-[11px] text-carbon/55 mb-3 truncate">
                        <FactoryIcon className="h-3 w-3 text-carbon/35" strokeWidth={2} />
                        <span className="truncate">{sku.sourcing_data.factory}</span>
                        {sku.sourcing_data.origin && (
                          <span className="text-carbon/30">· {sku.sourcing_data.origin}</span>
                        )}
                      </div>
                    )}

                    {/* Notes preview */}
                    {notesPreview && (
                      <p className="text-[11px] text-carbon/55 leading-[1.5] mb-4 line-clamp-2">
                        {notesPreview}
                        {notesPreview.length >= 140 ? '…' : ''}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-carbon/60 group-hover:text-carbon transition-colors">
                      {iterCount === 0 ? (w.ctaStart || 'Log first iteration') : (w.ctaReview || 'Review iteration')}
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SKU detail modal (inherits existing prototyping flow) ── */}
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
