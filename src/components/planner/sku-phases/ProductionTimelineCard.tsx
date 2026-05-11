'use client';

/* ═══════════════════════════════════════════════════════════════════
   ProductionTimelineCard — per-SKU production calendar at a glance.

   Replaces "estimaciones genéricas" with a real calc:
     materials lead × max(BOM)  +
     factory production × volume × complexity × factory tier  +
     freight + customs

   Surfaced in the SKU detail Production phase + (later) reflected
   into the macro calendar at /collection/[id]/calendar via badge
   on dd-15..dd-18.
   ═══════════════════════════════════════════════════════════════════ */

import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import { computeProductionTimeline } from '@/lib/production/timeline';

interface Props {
  sku: SKU;
  /** Drop launch date (ISO) — from collection_timelines or per-drop calendar. */
  launchDate?: string;
  /** Factory type from sourcing pick (sku.cost_breakdown derived). */
  factoryType?: string;
  /** Factory production lead days from sourcing pick (single number). */
  factoryLeadDays?: number;
}

const PHASE_BAR_COLOR = ['bg-[#B6C8C7]', 'bg-[#C5CAA8]', 'bg-[#D8BAA0]'];
const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: 'En tiempo', bg: 'bg-[#9CAF88]/20', text: 'text-carbon/80', Icon: CheckCircle2 },
  tight: { label: 'Tiempo justo', bg: 'bg-[#FFF4CE]/40', text: 'text-carbon/85', Icon: AlertCircle },
  'at-risk': { label: 'Riesgo', bg: 'bg-[#A0463C]/12', text: 'text-[#A0463C]', Icon: AlertCircle },
};

export function ProductionTimelineCard({ sku, launchDate, factoryType, factoryLeadDays }: Props) {
  const cb = (sku as { cost_breakdown?: Record<string, unknown> }).cost_breakdown || {};
  const freight = (cb.freight as { method?: string; origin?: string }) || {};
  const sourcingData = (sku as { sourcing_data?: Record<string, string> }).sourcing_data || {};

  const result = computeProductionTimeline({
    materialZones: sku.material_zones || [],
    factoryLeadDays: factoryLeadDays ?? 45,
    factoryType,
    freightMethod: (freight.method as 'sea' | 'air' | 'rail' | 'road') || 'sea',
    freightOrigin: freight.origin || sourcingData.origin || '',
    freightDestination: 'EU',
    launchDate,
    buyUnits: sku.buy_units,
    category: sku.category,
    family: sku.family,
  });

  const meta = STATUS_BADGE[result.status];
  const StatusIcon = meta.Icon;

  const maxPhaseDays = Math.max(...result.phases.map(p => p.days), 1);

  return (
    <div className="bg-white rounded-[16px] border border-carbon/[0.06] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase font-semibold text-carbon/40">Calendario de producción</p>
          <h4 className="text-[16px] font-semibold tracking-[-0.02em] text-carbon mt-1">
            {result.totalDays} días de producción
          </h4>
          {launchDate && Number.isFinite(result.daysAvailable) && (
            <p className="text-[12px] text-carbon/55 mt-0.5">
              {result.daysAvailable} días hasta dispatch · {result.slackDays >= 0 ? `+${result.slackDays}d slack` : `${result.slackDays}d short`}
            </p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${meta.bg} ${meta.text} text-[10px] font-semibold tracking-[-0.01em]`}>
          <StatusIcon className="h-3 w-3" strokeWidth={2.25} />
          {meta.label}
        </span>
      </div>

      {/* Phases breakdown — proportional bars */}
      <div className="space-y-2">
        {result.phases.map((p, i) => {
          const widthPct = Math.round((p.days / maxPhaseDays) * 100);
          return (
            <div key={p.label} className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold tracking-[-0.01em] text-carbon">{p.label}</span>
                  {p.detail && <span className="text-[10px] text-carbon/45">{p.detail}</span>}
                </div>
                <div className="h-1.5 bg-carbon/[0.04] rounded-full overflow-hidden">
                  <div className={`h-full ${PHASE_BAR_COLOR[i % PHASE_BAR_COLOR.length]} transition-all duration-500`} style={{ width: `${widthPct}%` }} />
                </div>
              </div>
              <span className="text-[12px] font-semibold tabular-nums text-carbon">{p.days}d</span>
            </div>
          );
        })}
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-carbon/[0.04]">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-carbon/55 leading-relaxed flex items-start gap-1.5">
              <Clock className="h-3 w-3 text-carbon/35 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{w}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
