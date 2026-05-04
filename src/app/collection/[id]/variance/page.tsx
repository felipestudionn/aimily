'use client';

/**
 * Phase 8 — PO variance dashboard.
 *
 * Lists every production order in the collection with its variance
 * status (open / on-target / overrun / underrun) and per-PO settle
 * action. Top-level KPIs roll up the cohort: average variance,
 * total overrun in EUR.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, X, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface POOrder {
  id: string;
  order_number: string | null;
  factory_name: string | null;
  status: string | null;
  order_date: string | null;
  estimated_delivery: string | null;
  total_units: number | null;
  total_cost: number | null;
  currency: string | null;
  actual_total_cost: number | null;
  variance_total: number | null;
  variance_pct: number | null;
  closed_at: string | null;
  close_notes: string | null;
}

interface Summary {
  total: number;
  settled: number;
  open: number;
  overrun: number;
  underrun: number;
  on_target: number;
  avg_variance_pct: number;
  total_overrun_eur: number;
}

export default function VariancePage() {
  const params = useParams<{ id: string }>();
  const [orders, setOrders] = useState<POOrder[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<POOrder | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/production-orders/variance-dashboard?planId=${params.id}`);
    if (res.ok) {
      const j = (await res.json()) as { orders: POOrder[]; summary: Summary };
      setOrders(j.orders);
      setSummary(j.summary);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  return (
    <div className="min-h-screen bg-shade">
      <header className="bg-white border-b border-carbon/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Collection</p>
          <h1 className="text-[28px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">Production variance</h1>
          <p className="text-[12px] text-carbon/55 mt-1">
            How much each PO over- or under-ran the projected landed cost.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-carbon/40" />}

        {summary && summary.total > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Settled" value={String(summary.settled)} sub={`${summary.open} open`} />
            <KPI
              label="Avg variance"
              value={`${summary.avg_variance_pct.toFixed(2)}%`}
              tone={summary.avg_variance_pct > 1 ? 'red' : summary.avg_variance_pct < -1 ? 'moss' : 'neutral'}
            />
            <KPI label="Overruns" value={String(summary.overrun)} sub={`${summary.underrun} underruns`} />
            <KPI
              label="Total overrun"
              value={`€${summary.total_overrun_eur.toLocaleString('en-EU', { maximumFractionDigits: 0 })}`}
              tone={summary.total_overrun_eur > 0 ? 'red' : 'neutral'}
            />
          </section>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-20 text-carbon/55 text-[14px]">
            No production orders for this collection yet.
          </div>
        )}

        {orders.length > 0 && (
          <section>
            <h2 className="text-[14px] font-semibold text-carbon mb-3 tracking-[-0.01em]">All POs</h2>
            <div className="bg-white rounded-[14px] border border-carbon/[0.06] overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.1em] text-carbon/45 border-b border-carbon/[0.05]">
                    <th className="text-left px-4 py-3">PO</th>
                    <th className="text-left px-4 py-3">Factory</th>
                    <th className="text-left px-4 py-3">Units</th>
                    <th className="text-right px-4 py-3">Projected</th>
                    <th className="text-right px-4 py-3">Actual</th>
                    <th className="text-right px-4 py-3">Variance</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const isSettled = o.actual_total_cost != null;
                    const variance = Number(o.variance_pct ?? 0);
                    return (
                      <tr key={o.id} className="border-t border-carbon/[0.05]">
                        <td className="px-4 py-3 font-semibold text-carbon">{o.order_number ?? o.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-carbon/70">{o.factory_name ?? '—'}</td>
                        <td className="px-4 py-3 text-carbon/65">{o.total_units ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-carbon/65">
                          {o.total_cost != null ? `${(o.currency ?? 'EUR')} ${Number(o.total_cost).toLocaleString('en-EU', { maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-carbon/65">
                          {o.actual_total_cost != null ? `${(o.currency ?? 'EUR')} ${Number(o.actual_total_cost).toLocaleString('en-EU', { maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSettled ? (
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                variance > 0 ? 'text-red-700' : variance < 0 ? 'text-moss' : 'text-carbon/65'
                              }`}
                            >
                              {variance > 0 ? <TrendingUp className="h-3 w-3" /> : variance < 0 ? <TrendingDown className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                              {variance > 0 ? '+' : ''}
                              {variance.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-carbon/35">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px] uppercase tracking-[0.05em] text-carbon/55">
                          {isSettled ? 'Settled' : (o.status ?? 'Open')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isSettled && (
                            <button
                              type="button"
                              onClick={() => setClosing(o)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon text-white text-[11px] font-semibold hover:bg-carbon/90"
                            >
                              Close PO
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {closing && (
        <CloseModal
          po={closing}
          onClose={() => setClosing(null)}
          onSettled={() => {
            setClosing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: 'neutral' | 'red' | 'moss' }) {
  const bg = tone === 'red' ? 'bg-red-50' : tone === 'moss' ? 'bg-moss/[0.18]' : 'bg-white';
  return (
    <div className={`p-5 rounded-[14px] ${bg} border border-carbon/[0.06]`}>
      <p className="text-[10px] tracking-[0.18em] uppercase font-semibold text-carbon/45 mb-1.5">{label}</p>
      <p className="text-[24px] font-semibold text-carbon tracking-[-0.02em] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-carbon/45 mt-1.5">{sub}</p>}
    </div>
  );
}

function CloseModal({ po, onClose, onSettled }: { po: POOrder; onClose: () => void; onSettled: () => void }) {
  const [actual, setActual] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = parseFloat(actual);
    if (!Number.isFinite(value) || value < 0) {
      setError('Enter a non-negative actual amount');
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/production-orders/${po.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_total_cost: value, notes }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Could not close PO');
      return;
    }
    onSettled();
  }

  const projected = Number(po.total_cost ?? 0);
  const actualNum = parseFloat(actual) || 0;
  const previewPct = projected > 0 ? ((actualNum - projected) / projected) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/30 backdrop-blur-[2px] px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-shade rounded-[16px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-carbon/[0.06]">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Settle PO</p>
            <h2 className="text-[20px] font-semibold text-carbon mt-0.5">{po.order_number ?? po.id.slice(0, 8)}</h2>
            <p className="text-[12px] text-carbon/55 mt-1">{po.factory_name ?? '—'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-3 py-2 rounded-[10px] bg-red-50 text-red-700 text-[12px]">{error}</div>}

          <div className="bg-white rounded-[10px] border border-carbon/[0.06] p-3">
            <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-1">Projected</p>
            <p className="text-[18px] font-semibold text-carbon">
              {(po.currency ?? 'EUR')} {projected.toLocaleString('en-EU', { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">
              Actual paid ({po.currency ?? 'EUR'})
            </label>
            <input
              type="number"
              step="0.01"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className="w-full px-3 py-2.5 text-[15px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none"
            />
          </div>

          {actualNum > 0 && projected > 0 && (
            <div className={`rounded-[10px] p-3 ${previewPct > 0 ? 'bg-red-50' : previewPct < 0 ? 'bg-moss/[0.18]' : 'bg-carbon/[0.04]'}`}>
              <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-1">Variance</p>
              <p className={`text-[18px] font-semibold ${previewPct > 0 ? 'text-red-700' : previewPct < 0 ? 'text-carbon' : 'text-carbon/65'}`}>
                {previewPct > 0 ? '+' : ''}
                {previewPct.toFixed(2)}%
              </p>
            </div>
          )}

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What drove the variance? Currency move, fabric upgrade, scrap, …"
              className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-carbon/[0.06] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-[12px] font-semibold text-carbon/60 hover:bg-carbon/[0.04]">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Close PO
          </button>
        </div>
      </div>
    </div>
  );
}
