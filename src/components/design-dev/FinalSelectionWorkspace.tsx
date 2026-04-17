'use client';

/* ═══════════════════════════════════════════════════════════════════
   FinalSelectionWorkspace — curate the lineup.

   Lists every SKU that's in production|completed. Inline approve/reject
   toggles `production_approved`. The right column shows a live merch
   balance (family mix · tier split · drop split) and the Lock CTA.

   Gold standard: rounded-[20px] card · centered header · hover scale.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { Check, X, ImagePlus, Loader2 } from 'lucide-react';
import { useSkus, type SKU } from '@/hooks/useSkus';
import type { SetupData } from '@/types/planner';
import { useTranslation } from '@/i18n';
import { MerchBalanceSidebar } from './MerchBalanceSidebar';

interface Props {
  collectionPlanId: string;
  collectionName: string;
  setupData: SetupData;
}

const ELIGIBLE_PHASES = new Set(['production', 'completed']);

function coverImage(sku: SKU): string | undefined {
  return (
    sku.production_sample_url ||
    sku.proto_iterations?.[sku.proto_iterations.length - 1]?.images?.[0] ||
    sku.render_urls?.['3d'] ||
    sku.render_urls?.preview ||
    sku.render_url ||
    sku.sketch_url ||
    sku.reference_image_url
  );
}

export function FinalSelectionWorkspace({ collectionPlanId, collectionName, setupData }: Props) {
  const t = useTranslation();
  const w = (t as unknown as { finalSelectionWorkspace?: Record<string, string> }).finalSelectionWorkspace || {};
  const { skus: allSkus, updateSku, loading } = useSkus(collectionPlanId);

  const [pending, setPending] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [locking, setLocking] = useState(false);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  // Hydrate lock state from CIS on mount. If the selection was previously
  // locked the user sees the locked chip and the approve/reject actions
  // are disabled until they explicitly start a new cycle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/collection-intelligence?planId=${collectionPlanId}&domain=merchandising&subdomain=final_selection`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.decisions) ? data.decisions : Array.isArray(data) ? data : [];
        const lockEntry = list.find((d: { key?: string; is_current?: boolean; value?: unknown }) => d.key === 'locked_at' && d.is_current !== false);
        const value = lockEntry?.value as { locked_at?: string } | string | undefined;
        const ts = typeof value === 'string' ? value : value?.locked_at;
        if (!cancelled && ts) setLockedAt(ts);
      } catch {
        /* non-blocking */
      }
    })();
    return () => { cancelled = true; };
  }, [collectionPlanId]);

  const eligibleSkus = useMemo(
    () => allSkus.filter(s => ELIGIBLE_PHASES.has(s.design_phase || 'range_plan')),
    [allSkus],
  );
  const approvedSkus = useMemo(() => eligibleSkus.filter(s => s.production_approved === true), [eligibleSkus]);
  const pendingSkus = useMemo(() => eligibleSkus.filter(s => s.production_approved !== true), [eligibleSkus]);

  const visibleSkus = useMemo(() => {
    if (filter === 'approved') return approvedSkus;
    if (filter === 'pending') return pendingSkus;
    return eligibleSkus;
  }, [filter, approvedSkus, pendingSkus, eligibleSkus]);

  const setPendingFor = (id: string, value: boolean) => {
    setPending(prev => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleApprove = async (sku: SKU, approve: boolean) => {
    setPendingFor(sku.id, true);
    try {
      await updateSku(sku.id, { production_approved: approve });
    } catch (err) {
      console.error('[FinalSelection] approve failed', err);
    } finally {
      setPendingFor(sku.id, false);
    }
  };

  const handleLock = async () => {
    if (approvedSkus.length === 0 || locking) return;
    setLockError(null);
    setLocking(true);
    try {
      const res = await fetch(`/api/collection-plans/${collectionPlanId}/lock-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Lock failed');
      }
      const data = await res.json();
      setLockedAt(data.locked_at);
    } catch (err) {
      setLockError(err instanceof Error ? err.message : String(err));
    } finally {
      setLocking(false);
    }
  };

  const isLocked = Boolean(lockedAt);

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-10 md:pt-14 pb-24">
        {/* ── Gold standard header ── */}
        <div className="text-center mb-10">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            {w.title || 'Final Selection'}
          </h1>
          <p className="text-[14px] text-carbon/50 mt-3 max-w-[640px] mx-auto leading-relaxed">
            {w.intro || 'Curate the drop. Approve each style to lock it in or reject it to hold it back. The merch-mix panel updates live as you decide.'}
          </p>
        </div>

        {/* ── Two-column layout: grid + sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* ── Grid ── */}
          <div>
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 mb-5">
              {([
                { key: 'all', label: w.filterAll || 'All', count: eligibleSkus.length },
                { key: 'approved', label: w.filterApproved || 'Approved', count: approvedSkus.length },
                { key: 'pending', label: w.filterPending || 'Pending review', count: pendingSkus.length },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.06em] uppercase border transition-colors ${
                    filter === opt.key
                      ? 'bg-carbon text-white border-carbon'
                      : 'border-carbon/[0.12] text-carbon/50 hover:text-carbon hover:border-carbon/30'
                  }`}
                >
                  {opt.label}
                  <span className={`text-[10px] tabular-nums ${filter === opt.key ? 'text-white/70' : 'text-carbon/35'}`}>
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-[13px] text-carbon/40 text-center py-16">…</div>
            ) : eligibleSkus.length === 0 ? (
              <div className="mx-auto max-w-[520px] text-center bg-white rounded-[20px] p-14">
                <ImagePlus className="h-6 w-6 text-carbon/30 mx-auto mb-5" strokeWidth={1.5} />
                <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
                  {w.emptyTitle || 'Nothing to review yet'}
                </h3>
                <p className="text-[14px] text-carbon/50 leading-[1.6]">
                  {w.emptyBody || 'SKUs show up here once they move into Production. Finish a prototype to unlock the lineup review.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {visibleSkus.map(sku => {
                  const approved = sku.production_approved === true;
                  const image = coverImage(sku);
                  const isPending = pending.has(sku.id);
                  return (
                    <div
                      key={sku.id}
                      className={`group bg-white rounded-[20px] overflow-hidden transition-all duration-300 ${
                        approved
                          ? 'ring-1 ring-[#4c7c6c]/40 shadow-[0_8px_24px_rgba(76,124,108,0.12)]'
                          : 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]'
                      }`}
                    >
                      {/* Image */}
                      <div className="aspect-[4/5] bg-carbon/[0.02] relative">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={sku.name} className="absolute inset-0 w-full h-full object-contain p-2" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImagePlus className="h-7 w-7 text-carbon/15" strokeWidth={1.25} />
                          </div>
                        )}
                        {approved && (
                          <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4c7c6c] text-white text-[10px] font-bold tracking-[0.1em] uppercase">
                            <Check className="h-3 w-3" strokeWidth={2.75} />
                            {w.approvedChip || 'Approved'}
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
                        <div className="grid grid-cols-3 gap-2 mb-5 text-[11px]">
                          <div>
                            <p className="text-carbon/40 uppercase tracking-wide mb-0.5">{w.cardPvp || 'PVP'}</p>
                            <p className="font-semibold text-carbon tabular-nums">€{sku.pvp}</p>
                          </div>
                          <div>
                            <p className="text-carbon/40 uppercase tracking-wide mb-0.5">{w.cardUnits || 'Units'}</p>
                            <p className="font-semibold text-carbon tabular-nums">{sku.buy_units}</p>
                          </div>
                          <div>
                            <p className="text-carbon/40 uppercase tracking-wide mb-0.5">{w.cardRevenue || 'Revenue'}</p>
                            <p className="font-semibold text-carbon tabular-nums">
                              €{Math.round(Number(sku.expected_sales || 0) / 1000).toLocaleString()}K
                            </p>
                          </div>
                        </div>

                        {/* Approve / reject */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(sku, false)}
                            disabled={isPending || isLocked}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                              !approved
                                ? 'bg-carbon/[0.06] text-carbon/50'
                                : 'border border-carbon/[0.12] text-carbon/55 hover:bg-carbon/[0.04]'
                            } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <X className="h-3 w-3" strokeWidth={2.5} />
                            {w.cardReject || 'Reject'}
                          </button>
                          <button
                            onClick={() => handleApprove(sku, true)}
                            disabled={isPending || isLocked}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                              approved
                                ? 'bg-[#4c7c6c] text-white'
                                : 'bg-carbon text-white hover:bg-carbon/90'
                            } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" strokeWidth={2.75} />
                            )}
                            {approved ? (w.cardApproved || 'Approved') : (w.cardApprove || 'Approve')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {lockError && (
              <p className="mt-4 text-[12px] text-[#A0463C] text-center">{lockError}</p>
            )}
          </div>

          {/* ── Sidebar ── */}
          <MerchBalanceSidebar
            skus={eligibleSkus}
            approvedSkus={approvedSkus}
            setupData={setupData}
            onLock={handleLock}
            locking={locking}
            lockDisabled={approvedSkus.length === 0 || isLocked}
            locked={isLocked}
          />
        </div>
      </div>
    </div>
  );
}
