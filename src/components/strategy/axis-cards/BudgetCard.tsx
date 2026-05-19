'use client';

/**
 * BudgetCard — production buy budget + sales Y1 + margin target + implied ROI.
 * Surfaces last-season actuals as a footnote when supplied.
 */

import { EditorAxisCard } from './EditorAxisCard';
import { useTranslation } from '@/i18n';

export interface BudgetState {
  target_buy_budget_eur: number | null;
  target_sales_y1_eur: number | null;
  target_margin_pct: number | null;
  last_season_buy_budget_eur: number | null;
  last_season_revenue_eur: number | null;
  last_season_margin_pct: number | null;
}

interface Props {
  budget: BudgetState;
  onChange: (next: BudgetState) => void;
  onDeepen?: (axis: string) => void;
  deepening?: string | null;
}

function fmtEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${Math.round(n)}`;
}

export function BudgetCard({ budget, onChange, onDeepen, deepening }: Props) {
  const t = useTranslation();
  const b = t.inSeason.axis.budget;
  const roi =
    budget.target_buy_budget_eur != null &&
    budget.target_buy_budget_eur > 0 &&
    budget.target_sales_y1_eur != null
      ? budget.target_sales_y1_eur / budget.target_buy_budget_eur
      : null;

  const handleChange = (key: keyof BudgetState, raw: string) => {
    const num = raw === '' ? null : Number(raw.replace(/[^\d.-]/g, ''));
    onChange({ ...budget, [key]: num != null && Number.isFinite(num) ? num : null });
  };

  return (
    <EditorAxisCard
      title={b.title}
      description={b.description}
      axis="budget"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Stat
          label={b.buyBudget}
          value={budget.target_buy_budget_eur}
          onEdit={(v) => handleChange('target_buy_budget_eur', v)}
        />
        <Stat
          label={b.salesTargetY1}
          value={budget.target_sales_y1_eur}
          onEdit={(v) => handleChange('target_sales_y1_eur', v)}
        />
        <StatPct
          label={b.targetMargin}
          value={budget.target_margin_pct}
          onEdit={(v) => handleChange('target_margin_pct', v)}
        />
      </div>

      {roi != null && (
        <div className="text-[12px] text-carbon/55 italic mb-4">
          {b.impliedRoi.replace('{roi}', roi.toFixed(2))}
        </div>
      )}

      {/* Last-season actuals footnote */}
      <div className="pt-4 border-t border-carbon/[0.06] grid grid-cols-3 gap-4 text-[11px] text-carbon/45">
        <div>
          <div className="uppercase tracking-[0.08em]">{b.lastBuy}</div>
          <div className="text-[13px] text-carbon/75 tabular-nums mt-1">
            {fmtEur(budget.last_season_buy_budget_eur)}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-[0.08em]">{b.lastRevenue}</div>
          <div className="text-[13px] text-carbon/75 tabular-nums mt-1">
            {fmtEur(budget.last_season_revenue_eur)}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-[0.08em]">{b.lastMargin}</div>
          <div className="text-[13px] text-carbon/75 tabular-nums mt-1">
            {budget.last_season_margin_pct != null
              ? `${budget.last_season_margin_pct.toFixed(0)}%`
              : '—'}
          </div>
        </div>
      </div>
    </EditorAxisCard>
  );
}

function Stat({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: number | null;
  onEdit: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.08em] uppercase font-semibold text-carbon/45 mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-carbon/40">€</span>
        <input
          type="text"
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => onEdit(e.target.value)}
          placeholder="0"
          className="flex-1 text-[18px] font-semibold text-carbon tabular-nums bg-carbon/[0.03] rounded-md px-2 py-1 outline-none focus:bg-carbon/[0.06]"
        />
      </div>
    </div>
  );
}

function StatPct({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: number | null;
  onEdit: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.08em] uppercase font-semibold text-carbon/45 mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => onEdit(e.target.value)}
          placeholder="0"
          className="flex-1 text-[18px] font-semibold text-carbon tabular-nums bg-carbon/[0.03] rounded-md px-2 py-1 outline-none focus:bg-carbon/[0.06]"
        />
        <span className="text-carbon/40">%</span>
      </div>
    </div>
  );
}
