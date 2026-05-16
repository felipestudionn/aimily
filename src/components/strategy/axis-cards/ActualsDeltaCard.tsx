'use client';

/**
 * ActualsDeltaCard — the wedge axis.
 * Side-by-side last-season actuals vs recommended-now per family. Pulled
 * from /api/strategy/buy-strategy-deepen?axis=actuals_delta OR pre-hydrated
 * from loadLastSeasonActuals in the run detail variant.
 */

import { EditorAxisCard } from './EditorAxisCard';

export interface ActualsDeltaRow {
  family_code: string;
  last_bought_units?: number | null;
  last_sold_through_pct?: number | null;
  last_returns_pct?: number | null;
  last_margin_pct?: number | null;
  recommended_buy_units?: number | null;
  projected_sell_through_pct?: number | null;
  expected_margin_pct?: number | null;
  delta_flag?: 'amplify' | 'hold' | 'shrink' | 'kill' | 'investigate';
}

interface Props {
  rows: ActualsDeltaRow[];
  onDeepen?: (axis: string) => void;
  deepening?: string | null;
}

function pct(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—';
  // Many sources store sell_through_pct as 0..1, others as 0..100. Sniff and format.
  return v <= 1 ? `${(v * 100).toFixed(0)}%` : `${v.toFixed(0)}%`;
}

function num(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(v));
}

const FLAG_STYLE: Record<NonNullable<ActualsDeltaRow['delta_flag']>, string> = {
  amplify: 'bg-emerald-50 text-emerald-700',
  hold: 'bg-carbon/[0.04] text-carbon/55',
  shrink: 'bg-amber-50 text-amber-700',
  kill: 'bg-red-50 text-red-700',
  investigate: 'bg-blue-50 text-blue-700',
};

export function ActualsDeltaCard({ rows, onDeepen, deepening }: Props) {
  return (
    <EditorAxisCard
      title="Actuals · last season vs recommended now"
      description="The wedge axis. What you bought + how it sold + what we recommend now per family."
      axis="actuals_delta"
      onDeepen={onDeepen}
      deepening={deepening}
      className="lg:col-span-2"
    >
      {rows.length === 0 ? (
        <p className="text-[12px] text-carbon/45 italic">
          No actuals yet. Run a baseline analysis first to populate last-season data.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] text-carbon/45 uppercase tracking-[0.08em] border-b border-carbon/[0.06]">
                <th className="text-left py-2 pr-3">Family</th>
                <th className="text-right py-2 px-2">Last bought</th>
                <th className="text-right py-2 px-2">Sell-through</th>
                <th className="text-right py-2 px-2">Returns</th>
                <th className="text-right py-2 px-2">Margin</th>
                <th className="text-right py-2 px-2 border-l border-carbon/[0.06] pl-3">Recommended</th>
                <th className="text-right py-2 px-2">Projected ST</th>
                <th className="text-right py-2 pl-2">Flag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.family_code}
                  className="border-b border-carbon/[0.04] last:border-b-0"
                >
                  <td className="py-2 pr-3 text-carbon font-mono">{row.family_code}</td>
                  <td className="text-right py-2 px-2 text-carbon/75 tabular-nums">
                    {num(row.last_bought_units)}
                  </td>
                  <td className="text-right py-2 px-2 text-carbon/75 tabular-nums">
                    {pct(row.last_sold_through_pct)}
                  </td>
                  <td className="text-right py-2 px-2 text-carbon/75 tabular-nums">
                    {pct(row.last_returns_pct)}
                  </td>
                  <td className="text-right py-2 px-2 text-carbon/75 tabular-nums">
                    {pct(row.last_margin_pct)}
                  </td>
                  <td className="text-right py-2 px-2 text-carbon font-semibold tabular-nums border-l border-carbon/[0.06] pl-3">
                    {num(row.recommended_buy_units)}
                  </td>
                  <td className="text-right py-2 px-2 text-carbon/75 tabular-nums">
                    {pct(row.projected_sell_through_pct)}
                  </td>
                  <td className="text-right py-2 pl-2">
                    {row.delta_flag && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] ${FLAG_STYLE[row.delta_flag]}`}
                      >
                        {row.delta_flag}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EditorAxisCard>
  );
}
