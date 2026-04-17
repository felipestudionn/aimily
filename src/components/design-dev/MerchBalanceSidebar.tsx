'use client';

/* ═══════════════════════════════════════════════════════════════════
   MerchBalanceSidebar — reusable live merch-mix panel.

   Reads target mix from SetupData (families · price/type segmentation)
   and compares against the ACTIVE SKU subset (whatever the parent
   workspace considers "the lineup"). Used by the Final Selection
   workspace today; designed so future dashboards can drop it in the
   same way.

   Non-negotiable rules enforced:
   - rounded-[20px] card surfaces
   - rounded-full CTAs
   - tokens (text-carbon / carbon/40 / carbon/[0.06])
   ═══════════════════════════════════════════════════════════════════ */

import { Lock, Loader2 } from 'lucide-react';
import type { SetupData } from '@/types/planner';
import type { SKU } from '@/hooks/useSkus';
import { useTranslation } from '@/i18n';

interface Props {
  skus: SKU[];
  approvedSkus: SKU[];
  setupData: SetupData;
  onLock: () => void;
  locking?: boolean;
  lockDisabled?: boolean;
  locked?: boolean;
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10; // 1 decimal
}

function formatK(value: number) {
  if (!value) return '€0';
  return `€${Math.round(value / 1000).toLocaleString()}K`;
}

export function MerchBalanceSidebar({ skus, approvedSkus, setupData, onLock, locking, lockDisabled, locked }: Props) {
  const t = useTranslation();
  const w = (t as unknown as { finalSelectionWorkspace?: Record<string, string> }).finalSelectionWorkspace || {};

  const eligibleCount = skus.length;
  const approvedCount = approvedSkus.length;

  // Families — compare approved distribution vs target.
  // Target comes from setupData.productFamilies. Families that exist in
  // the actual SKUs but not in the target plan show up too (actual only).
  const approvedByFamily = new Map<string, number>();
  approvedSkus.forEach(s => {
    if (!s.family) return;
    approvedByFamily.set(s.family, (approvedByFamily.get(s.family) || 0) + 1);
  });
  const targetMap = new Map<string, number>();
  (setupData.productFamilies || []).forEach(fam => {
    if (fam.name) targetMap.set(fam.name, Number(fam.percentage) || 0);
  });
  const allFamilyNames = new Set<string>([
    ...targetMap.keys(),
    ...Array.from(approvedByFamily.keys()),
    ...skus.map(s => s.family).filter(Boolean),
  ]);
  const familyRows = Array.from(allFamilyNames).map(name => {
    const actualCount = approvedByFamily.get(name) || 0;
    const actualPct = pct(actualCount, approvedCount);
    const targetPct = targetMap.get(name) || 0;
    const hasTarget = targetPct > 0;
    const deviation = Math.abs(actualPct - targetPct);
    return {
      name,
      actualPct,
      targetPct,
      hasTarget,
      count: actualCount,
      warn: hasTarget && deviation > 10 && approvedCount > 0,
    };
  }).sort((a, b) => b.targetPct - a.targetPct || a.name.localeCompare(b.name));

  // Type split — revenue/image/entry
  const typeRevenue = approvedSkus.reduce((acc, s) => {
    const key = s.type;
    const revenue = Number(s.expected_sales || 0);
    acc[key] = (acc[key] || 0) + revenue;
    return acc;
  }, {} as Record<string, number>);
  const totalTypeRevenue = Object.values(typeRevenue).reduce((a, b) => a + b, 0);
  const typeTargets: Record<string, number> = {};
  (setupData.productTypeSegments || []).forEach(seg => { typeTargets[seg.type] = seg.percentage; });
  const TYPES: Array<SKU['type']> = ['REVENUE', 'IMAGEN', 'ENTRY'];

  // Drop split
  const byDrop = new Map<number, { units: number; revenue: number; count: number }>();
  approvedSkus.forEach(s => {
    const drop = s.drop_number || 1;
    const curr = byDrop.get(drop) || { units: 0, revenue: 0, count: 0 };
    curr.units += Number(s.buy_units || 0);
    curr.revenue += Number(s.expected_sales || 0);
    curr.count += 1;
    byDrop.set(drop, curr);
  });
  const dropRows = Array.from(byDrop.entries()).sort((a, b) => a[0] - b[0]);

  const lockLabel = locked
    ? (w.sidebarLockedChip || 'Selection locked')
    : (w.sidebarLockCta || 'Lock the collection');

  return (
    <aside className="bg-white rounded-[20px] p-7 md:p-8 sticky top-6 self-start">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-3">
          {w.sidebarTitle || 'Curated lineup'}
        </p>
        <p className="text-[32px] font-bold text-carbon tabular-nums tracking-[-0.03em] leading-none">
          {approvedCount}
          <span className="text-[18px] font-medium text-carbon/35 ml-1.5">
            / {eligibleCount}
          </span>
        </p>
        <p className="text-[11px] text-carbon/45 mt-1.5">{w.sidebarApprovedHint || 'approved SKUs'}</p>
      </div>

      {/* Families */}
      {familyRows.length > 0 && (
        <div className="mb-7">
          <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
            {w.sidebarFamilies || 'Family mix'}
          </p>
          <div className="space-y-3">
            {familyRows.map(row => (
              <div key={row.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-carbon/80 truncate pr-2">{row.name}</span>
                  <span className={`text-[11px] tabular-nums ${row.warn ? 'text-[#b06d2b]' : 'text-carbon/50'}`}>
                    {row.actualPct}%
                    {row.hasTarget && (
                      <span className="text-carbon/30 ml-1">· {row.targetPct}%</span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-carbon/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${row.warn ? 'bg-[#b06d2b]' : 'bg-carbon/70'}`}
                    style={{ width: `${Math.min(row.actualPct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type split */}
      {(setupData.productTypeSegments || []).length > 0 && (
        <div className="mb-7">
          <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
            {w.sidebarTierSplit || 'Tier split'}
          </p>
          <div className="space-y-2.5">
            {TYPES.map(type => {
              const revenue = typeRevenue[type] || 0;
              const actual = pct(revenue, totalTypeRevenue);
              const target = typeTargets[type] || 0;
              if (!target && !actual) return null;
              const label = type === 'IMAGEN' ? (w.tierImage || 'Image') : type === 'REVENUE' ? (w.tierRevenue || 'Revenue') : (w.tierEntry || 'Entry');
              const color = type === 'REVENUE' ? '#9c7c4c' : type === 'IMAGEN' ? '#7d5a8c' : '#4c7c6c';
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-carbon/80">{label}</span>
                    <span className="text-[11px] tabular-nums text-carbon/50">
                      {actual}%
                      {target > 0 && (
                        <span className="text-carbon/30 ml-1">· {target}%</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-carbon/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(actual, 100)}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drop split */}
      {dropRows.length > 0 && (
        <div className="mb-7">
          <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
            {w.sidebarDrops || 'Drop split'}
          </p>
          <div className="space-y-2.5">
            {dropRows.map(([drop, v]) => (
              <div key={drop} className="flex items-center justify-between">
                <span className="text-[12px] text-carbon/75">
                  {(w.drop || 'Drop')} {drop}
                </span>
                <span className="text-[11px] tabular-nums text-carbon/55">
                  {v.count} SKU · {formatK(v.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lock CTA */}
      <button
        onClick={onLock}
        disabled={locking || lockDisabled}
        className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold transition-colors ${
          locked
            ? 'bg-[#4c7c6c]/10 text-[#4c7c6c] cursor-default'
            : lockDisabled
              ? 'bg-carbon/[0.04] text-carbon/30 cursor-not-allowed'
              : 'bg-carbon text-white hover:bg-carbon/90'
        }`}
      >
        {locking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" strokeWidth={2.25} />}
        {lockLabel}
      </button>
      {!locked && approvedCount === 0 && (
        <p className="text-[11px] text-carbon/35 text-center mt-3 leading-relaxed">
          {w.sidebarLockEmptyHint || 'Approve at least one SKU to lock.'}
        </p>
      )}
    </aside>
  );
}
