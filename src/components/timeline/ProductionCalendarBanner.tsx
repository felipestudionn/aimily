'use client';

/* ═══════════════════════════════════════════════════════════════════
   ProductionCalendarBanner — surfaces a calendar-level insight when
   the per-SKU production timeline (computed from BOM + sourcing pick)
   exceeds the calendar template default (~70 days for dd-15..dd-18).

   Renders via portal so it sits on top of the Gantt full-viewport portal
   that WizardSidebar opens on /calendar. ZERO mutation to the existing
   milestones — the user clicks "Aplicar" to commit the suggested adjust.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, TrendingUp, X } from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { TimelineMilestone } from '@/types/timeline';
import { computeProductionTimeline } from '@/lib/production/timeline';

interface Props {
  collectionPlanId: string;
}

/* The 4 canonical production milestones from the calendar template. */
const PRODUCTION_MILESTONE_IDS = ['dd-15', 'dd-16', 'dd-17', 'dd-18'] as const;

/* Compute the aggregate slack — i.e. the minimum slack across all SKUs
 * that already have BOM + sourcing data. Returns null when no SKU is
 * far enough along to give a meaningful number. */
function aggregateSkuLead(skus: SKU[], launchDate: string | undefined) {
  const skuLeads = skus
    .filter(s => (s.material_zones || []).length > 0)
    .map(s => {
      const cb = (s as { cost_breakdown?: { labor?: { hours?: number }; freight?: { method?: string; origin?: string } } }).cost_breakdown || {};
      const sourcingNotes = (s as { sourcing_data?: { notes?: string } }).sourcing_data?.notes || '';
      const factoryTypeMatch = sourcingNotes.match(/(artisan|semi-industrial|vertical|OEM)/i);
      const factoryType = factoryTypeMatch?.[1];
      const factoryLeadDays = cb.labor?.hours
        ? Math.max(7, Math.round((cb.labor.hours * (s.buy_units || 100)) / 8))
        : 45;
      const result = computeProductionTimeline({
        materialZones: s.material_zones || [],
        factoryLeadDays,
        factoryType,
        freightMethod: (cb.freight?.method as 'sea' | 'air' | 'rail' | 'road') || 'sea',
        freightOrigin: cb.freight?.origin || '',
        launchDate,
        buyUnits: s.buy_units,
        category: s.category,
        family: s.family,
      });
      return { skuId: s.id, name: s.name, totalDays: result.totalDays, slackDays: result.slackDays, status: result.status };
    });
  if (skuLeads.length === 0) return null;
  // Worst case = SKU with longest production lead OR shortest slack.
  const longest = skuLeads.reduce((acc, x) => (x.totalDays > acc.totalDays ? x : acc));
  const tightest = skuLeads.reduce((acc, x) => (x.slackDays < acc.slackDays ? x : acc));
  const aggregateDays = longest.totalDays;
  return { skuLeads, longest, tightest, aggregateDays };
}

export function ProductionCalendarBanner({ collectionPlanId }: Props) {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [launchDate, setLaunchDate] = useState<string | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [skusRes, tlRes] = await Promise.all([
          fetch(`/api/skus?planId=${collectionPlanId}`),
          fetch(`/api/collection-timelines?planId=${collectionPlanId}`),
        ]);
        const skusJson = skusRes.ok ? await skusRes.json() : { skus: [] };
        const tlJson = tlRes.ok ? await tlRes.json() : null;
        if (cancelled) return;
        setSkus(skusJson.skus || skusJson || []);
        const ml = (tlJson?.timeline?.milestones || tlJson?.milestones || []) as TimelineMilestone[];
        setMilestones(ml);
        const ld = tlJson?.timeline?.launch_date || tlJson?.launch_date;
        if (ld) setLaunchDate(ld);
      } catch {
        /* non-blocking */
      }
    })();
    return () => { cancelled = true; };
  }, [collectionPlanId]);

  const insight = useMemo(() => {
    if (skus.length === 0 || milestones.length === 0) return null;
    const aggregate = aggregateSkuLead(skus, launchDate);
    if (!aggregate) return null;

    // Sum production milestone durations from the template currently in
    // the calendar (the 4 dd-15..dd-18 bars). Each duration is in weeks.
    const productionMilestones = milestones.filter(m => (PRODUCTION_MILESTONE_IDS as readonly string[]).includes(m.id));
    if (productionMilestones.length === 0) return null;
    const templateWeeks = productionMilestones.reduce((acc, m) => acc + m.durationWeeks, 0);
    const templateDays = Math.round(templateWeeks * 7);

    // Real production-only days from the calculator's last 2 phases
    // (factory production + freight + customs) — those map to dd-16..dd-18.
    // Materials lead falls in dd-7..dd-13 in the calendar template.
    const skuLead = aggregate.longest;
    const realProductionDays = skuLead.totalDays;

    const diff = realProductionDays - templateDays;
    return {
      skuLead,
      tightest: aggregate.tightest,
      templateDays,
      realProductionDays,
      diff,
      productionMilestones,
    };
  }, [skus, milestones, launchDate]);

  const hasOvershoot = insight && insight.diff > 7; // >1 week of overshoot
  const isAtRisk = insight && insight.tightest && insight.tightest.status === 'at-risk';

  if (dismissed || (!hasOvershoot && !isAtRisk)) return null;

  const applySuggestion = async () => {
    if (!insight) return;
    setApplying(true);
    try {
      const ratio = insight.realProductionDays / insight.templateDays;
      const adjusted = milestones.map(m => {
        if (!(PRODUCTION_MILESTONE_IDS as readonly string[]).includes(m.id)) return m;
        const newDur = Math.round(m.durationWeeks * ratio * 2) / 2;
        const extraWeeks = newDur - m.durationWeeks;
        // Keep the relative anchoring: shift each milestone backward in time
        // (further from launch) by the extra weeks proportional to its share.
        return { ...m, durationWeeks: newDur, startWeeksBefore: Math.round((m.startWeeksBefore + extraWeeks) * 2) / 2 };
      });
      await fetch('/api/collection-timelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_plan_id: collectionPlanId,
          milestones: adjusted,
        }),
      });
      setMilestones(adjusted);
      setDismissed(true);
    } catch (err) {
      console.error('[ProductionCalendarBanner] apply failed', err);
    } finally {
      setApplying(false);
    }
  };

  if (typeof document === 'undefined') return null;
  if (!insight) return null;

  return createPortal(
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] w-[min(92vw,720px)]">
      <div className="bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-carbon/[0.06] p-4 flex items-start gap-3">
        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isAtRisk ? 'bg-[#A0463C]/10 text-[#A0463C]' : 'bg-[#FFF4CE]/40 text-carbon/70'}`}>
          {isAtRisk ? <Clock className="h-4 w-4" strokeWidth={2.25} /> : <TrendingUp className="h-4 w-4" strokeWidth={2.25} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold tracking-[-0.01em] text-carbon">
            {isAtRisk
              ? `${insight.tightest.name} corre riesgo en el calendario`
              : `Tu producción real necesita +${insight.diff}d sobre el template`}
          </p>
          <p className="text-[11px] text-carbon/55 mt-0.5 leading-relaxed">
            {insight.skuLead.name} requiere {insight.realProductionDays}d (template del calendario marca {insight.templateDays}d).
            {' '}Los 4 bloques de producción (dd-15…dd-18) se ajustarán proporcionalmente.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={applySuggestion}
            disabled={applying}
            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-full bg-carbon text-white text-[11px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 disabled:opacity-50 transition-all"
          >
            {applying ? 'Aplicando…' : 'Aplicar al calendario'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full text-carbon/40 hover:text-carbon/70 hover:bg-carbon/[0.04]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
