'use client';

/**
 * 02.3 Distribución · DistributionContent
 *
 * Sprint B.3 (2026-05-09) — canonical pattern, mirrors AssortmentContent.
 * Reads CIS strategy seeds (02.1 confirmed) + brand identity + consumer
 * lifestyle + retail signals. Auto-fires Sonnet propose on first mount,
 * then exposes a 4-axis dashboard editor:
 *
 *   1. Channel mix      — donut + 4 sliders (DTC online / DTC physical /
 *                         wholesale / marketplace) summing to 100
 *   2. Mercados         — vertical bars per market + rationale chips
 *   3. Wholesale        — store shortlist with city + type + rationale
 *   4. Sell-through     — 4-point curve (week 4 / 8 / 12 / 24)
 *
 * Confirm writes merchandising.channels.* to CIS and navigates to budget.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { Loader2, Plus, X, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CanonicalActionBar } from '@/components/workspace/CanonicalActionBar';
import type { DistributionPlan } from '@/lib/ai/distribution-prompts';

interface Props {
  collectionContext: { collectionPlanId: string; collectionName?: string };
  language?: string;
  basePath: string;
}

const localeFor = (lang: string) => (lang === 'en' ? 'en-US' : 'es-ES');

function fmtNum(n: number | null | undefined, locale: string): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return new Intl.NumberFormat(locale).format(Math.round(n));
}
function parseNum(s: string): number {
  const cleaned = s.replace(/[^\d-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Aimily accent palette — channels colour-coded for cross-card consistency
const CHANNEL_ACCENTS = {
  dtc_online:    '#b6c8c7',  // sea foam — primary digital
  dtc_physical:  '#c5caa8',  // moss — own retail
  wholesale:     '#fff4ce',  // citronella — multibrand
  marketplace:   '#f1efed',  // linen — aggregators
} as const;

const MARKET_ACCENT = '#001519'; // midnight for bars

// ── Channel Mix card (donut + sliders) ────────────────────────────────────

function ChannelMixCard({
  mix, onChange, locale,
}: {
  mix: DistributionPlan['channel_mix'];
  onChange: (next: DistributionPlan['channel_mix']) => void;
  locale: string;
}) {
  const t = useTranslation();
  const labels = (t.distribution as Record<string, string>) || {};
  const total = mix.dtc_online + mix.dtc_physical + mix.wholesale + mix.marketplace;
  const safe = total === 0 ? 1 : total;

  const channels: Array<{
    key: keyof DistributionPlan['channel_mix'];
    label: string;
    color: string;
  }> = [
    { key: 'dtc_online',   label: labels.channelDtcOnline   || 'DTC online',     color: CHANNEL_ACCENTS.dtc_online },
    { key: 'dtc_physical', label: labels.channelDtcPhysical || 'DTC propio',     color: CHANNEL_ACCENTS.dtc_physical },
    { key: 'wholesale',    label: labels.channelWholesale   || 'Wholesale',      color: CHANNEL_ACCENTS.wholesale },
    { key: 'marketplace',  label: labels.channelMarketplace || 'Marketplace',    color: CHANNEL_ACCENTS.marketplace },
  ];

  // Donut math
  const RADIUS = 60;
  const STROKE = 14;
  const C = 2 * Math.PI * RADIUS;
  let cumulative = 0;
  const segments = channels.map(({ key, color }) => {
    const pct = (mix[key] || 0) / safe;
    const dasharray = `${C * pct} ${C}`;
    const offset = -cumulative * C;
    cumulative += pct;
    return { key, color, pct, dasharray, offset };
  });

  // Auto-rebalance to 100: redistribute delta across non-zero peers
  // (same pattern as MarketsCard + Collection Builder dashboard).
  const handleEdit = (key: keyof DistributionPlan['channel_mix'], value: number) => {
    const ALL = ['dtc_online', 'dtc_physical', 'wholesale', 'marketplace'] as const;
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const delta = clamped - (mix[key] || 0);
    if (delta === 0) return;
    const others = ALL.filter(k => k !== key && (mix[k] || 0) > 0);
    if (others.length === 0) {
      const next: typeof mix = { dtc_online: 0, dtc_physical: 0, wholesale: 0, marketplace: 0, [key]: clamped };
      const padTarget = ALL.find(k => k !== key)!;
      next[padTarget] = 100 - clamped;
      onChange(next);
      return;
    }
    const otherSum = others.reduce((s, k) => s + (mix[k] || 0), 0);
    const next: typeof mix = { ...mix, [key]: clamped };
    let absorbed = 0;
    others.forEach((k, i) => {
      const isLast = i === others.length - 1;
      const adj = isLast ? -delta - absorbed : Math.round(-delta * ((mix[k] || 0) / otherSum));
      next[k] = Math.max(0, (mix[k] || 0) + adj);
      absorbed += adj;
    });
    const finalSum = ALL.reduce((s, k) => s + next[k], 0);
    if (finalSum !== 100) {
      const drift = 100 - finalSum;
      const fixKey = others.reduce((best, k) => (next[k] > next[best] ? k : best), others[0]);
      next[fixKey] = Math.max(0, next[fixKey] + drift);
    }
    onChange(next);
  };

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.channelMix || 'Mix de canales'}
        </span>
        <span className={`text-[11px] tabular-nums ${total === 100 ? 'text-carbon/40' : 'text-amber-700'}`}>
          {fmtNum(total, locale)}%
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="148" height="148" viewBox="0 0 148 148">
            <circle cx="74" cy="74" r={RADIUS} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={STROKE} />
            {segments.map(({ key, color, pct, dasharray, offset }) => (
              pct > 0 ? (
                <circle
                  key={key}
                  cx="74" cy="74" r={RADIUS}
                  fill="none"
                  stroke={color}
                  strokeWidth={STROKE}
                  strokeDasharray={dasharray}
                  strokeDashoffset={offset}
                  transform="rotate(-90 74 74)"
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}
                />
              ) : null
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[28px] font-semibold text-carbon tabular-nums leading-none">100</span>
            <span className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 mt-1">%</span>
          </div>
        </div>

        {/* Channel rows */}
        <div className="flex-1 space-y-2.5">
          {channels.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[13px] text-carbon/65 flex-1 truncate">{label}</span>
              <input
                type="text"
                inputMode="numeric"
                value={mix[key] || 0}
                onChange={(e) => handleEdit(key, parseNum(e.target.value))}
                className="w-[44px] text-right text-[14px] font-semibold text-carbon tabular-nums bg-transparent outline-none focus:bg-carbon/[0.04] rounded px-1.5 py-0.5"
              />
              <span className="text-[10px] text-carbon/30">%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Markets card (vertical bars) ──────────────────────────────────────────

function MarketsCard({
  markets, onChange, locale,
}: {
  markets: DistributionPlan['markets'];
  onChange: (next: DistributionPlan['markets']) => void;
  locale: string;
}) {
  const t = useTranslation();
  const labels = (t.distribution as Record<string, string>) || {};
  const total = markets.reduce((s, m) => s + (m.share_pct || 0), 0);
  const max = Math.max(1, ...markets.map(m => m.share_pct || 0));

  // Auto-rebalance to 100: when one share_pct changes, the others absorb
  // the delta proportional to their existing share so the user doesn't
  // have to do mental math.
  const updateShare = (idx: number, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const prev = markets[idx]?.share_pct || 0;
    const delta = clamped - prev;
    if (delta === 0) {
      const next = [...markets];
      next[idx] = { ...next[idx], share_pct: clamped };
      onChange(next);
      return;
    }
    const others = markets.map((m, i) => ({ m, i })).filter(({ m, i }) => i !== idx && (m.share_pct || 0) > 0);
    if (others.length === 0) {
      // No other non-zero markets — pad first non-edited with the remainder.
      const next = markets.map((m, i) => ({ ...m, share_pct: i === idx ? clamped : 0 }));
      const padTarget = next.find((_, i) => i !== idx);
      if (padTarget) padTarget.share_pct = 100 - clamped;
      onChange(next);
      return;
    }
    const otherSum = others.reduce((s, { m }) => s + (m.share_pct || 0), 0);
    const next = [...markets];
    next[idx] = { ...next[idx], share_pct: clamped };
    let absorbed = 0;
    others.forEach(({ i }, j) => {
      const isLast = j === others.length - 1;
      const cur = markets[i].share_pct || 0;
      const adj = isLast ? -delta - absorbed : Math.round(-delta * (cur / otherSum));
      next[i] = { ...next[i], share_pct: Math.max(0, cur + adj) };
      absorbed += adj;
    });
    // Final guard: if rounding drifted, fix the largest other market.
    const finalSum = next.reduce((s, m) => s + (m.share_pct || 0), 0);
    if (finalSum !== 100) {
      const drift = 100 - finalSum;
      const fixIdx = others.reduce((bestIdx, { i }) => (next[i].share_pct > next[bestIdx].share_pct ? i : bestIdx), others[0].i);
      next[fixIdx] = { ...next[fixIdx], share_pct: Math.max(0, next[fixIdx].share_pct + drift) };
    }
    onChange(next);
  };
  const updateName = (idx: number, name: string) => {
    const next = [...markets];
    next[idx] = { ...next[idx], name };
    onChange(next);
  };
  const updateCode = (idx: number, code: string) => {
    const next = [...markets];
    next[idx] = { ...next[idx], code: code.toUpperCase().slice(0, 3) };
    onChange(next);
  };
  const remove = (idx: number) => onChange(markets.filter((_, i) => i !== idx));
  const add = () => onChange([...markets, { code: '', name: '', share_pct: 0, rationale: '' }]);

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.markets || 'Mercados'}
        </span>
        <span className={`text-[11px] tabular-nums ${total === 100 ? 'text-carbon/40' : 'text-amber-700'}`}>
          {fmtNum(total, locale)}%
        </span>
      </div>

      <div className="flex items-end gap-4 h-[120px] mb-4">
        {markets.map((m, i) => {
          const pct = (m.share_pct || 0) / max;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/bar">
              <span className="text-[11px] font-semibold text-carbon tabular-nums">
                {fmtNum(m.share_pct || 0, locale)}%
              </span>
              <div className="w-full bg-carbon/[0.04] rounded-[6px] flex-1 flex items-end overflow-hidden">
                <div
                  className="w-full rounded-[6px] transition-all"
                  style={{ height: `${Math.max(2, pct * 100)}%`, backgroundColor: MARKET_ACCENT }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Rows under the bars */}
      <div className="space-y-1.5">
        {markets.map((m, i) => (
          <div key={i} className="group/row flex items-center gap-2 rounded-[10px] hover:bg-carbon/[0.02] px-2 py-1">
            <input
              type="text"
              value={m.code}
              onChange={(e) => updateCode(i, e.target.value)}
              placeholder="ES"
              className="w-[36px] text-[11px] font-semibold text-carbon/60 tabular-nums uppercase bg-transparent outline-none text-center"
            />
            <input
              type="text"
              value={m.name}
              onChange={(e) => updateName(i, e.target.value)}
              placeholder={labels.marketName || 'Mercado'}
              className="flex-1 text-[13px] text-carbon bg-transparent outline-none focus:bg-carbon/[0.03] rounded px-1.5 py-0.5"
            />
            <input
              type="text"
              inputMode="numeric"
              value={m.share_pct || 0}
              onChange={(e) => updateShare(i, parseNum(e.target.value))}
              className="w-[44px] text-right text-[13px] font-semibold text-carbon tabular-nums bg-transparent outline-none focus:bg-carbon/[0.04] rounded px-1"
            />
            <span className="text-[10px] text-carbon/30">%</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-5 h-5 flex items-center justify-center text-carbon/15 hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity"
              title="Eliminar mercado"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="rounded-full h-7 px-3 text-[12px] text-carbon/30 hover:text-carbon/60 hover:bg-carbon/[0.03] inline-flex items-center transition-colors"
        >
          <Plus className="h-3 w-3 mr-1" />
          {labels.addMarket || 'Añadir mercado'}
        </button>
      </div>
    </div>
  );
}

// ── Wholesale shortlist card ──────────────────────────────────────────────

const WHOLESALE_TYPES: Array<{ id: DistributionPlan['wholesale_targets'][number]['type']; label: string }> = [
  { id: 'concept_store',     label: 'Concept' },
  { id: 'multibrand_lux',    label: 'Multimarca' },
  { id: 'department_store',  label: 'Department' },
  { id: 'online_specialist', label: 'Online' },
];

function WholesaleCard({
  targets, onChange,
}: {
  targets: DistributionPlan['wholesale_targets'];
  onChange: (next: DistributionPlan['wholesale_targets']) => void;
}) {
  const t = useTranslation();
  const labels = (t.distribution as Record<string, string>) || {};

  const update = (idx: number, patch: Partial<DistributionPlan['wholesale_targets'][number]>) => {
    const next = [...targets];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const remove = (idx: number) => onChange(targets.filter((_, i) => i !== idx));
  const add = () => onChange([...targets, { name: '', type: 'concept_store', city: '', rationale: '' }]);

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.wholesaleShortlist || 'Wholesale shortlist'}
        </span>
        <span className="text-[11px] text-carbon/40 tabular-nums">{targets.length}</span>
      </div>

      <div className="space-y-2">
        {targets.map((tgt, i) => (
          <div key={i} className="group/row rounded-[12px] border border-carbon/[0.06] hover:border-carbon/[0.12] px-3 py-2.5 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={tgt.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={labels.storeName || 'Tienda'}
                className="flex-1 text-[14px] font-medium text-carbon bg-transparent outline-none placeholder:text-carbon/25"
              />
              <select
                value={tgt.type}
                onChange={(e) => update(i, { type: e.target.value as DistributionPlan['wholesale_targets'][number]['type'] })}
                className="text-[11px] text-carbon/55 bg-carbon/[0.03] rounded-full px-2.5 py-1 outline-none border-0 cursor-pointer"
              >
                {WHOLESALE_TYPES.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(i)}
                className="w-5 h-5 flex items-center justify-center text-carbon/15 hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity"
                title="Eliminar"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tgt.city}
                onChange={(e) => update(i, { city: e.target.value })}
                placeholder={labels.city || 'Ciudad'}
                className="text-[12px] text-carbon/50 bg-transparent outline-none focus:bg-carbon/[0.03] rounded px-1.5 py-0.5 w-[120px]"
              />
              <input
                type="text"
                value={tgt.rationale}
                onChange={(e) => update(i, { rationale: e.target.value })}
                placeholder={labels.rationale || 'Por qué encaja'}
                className="flex-1 text-[12px] text-carbon/55 italic bg-transparent outline-none focus:bg-carbon/[0.03] rounded px-1.5 py-0.5"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="rounded-full h-7 px-3 text-[12px] text-carbon/30 hover:text-carbon/60 hover:bg-carbon/[0.03] inline-flex items-center transition-colors"
        >
          <Plus className="h-3 w-3 mr-1" />
          {labels.addStore || 'Añadir tienda'}
        </button>
      </div>
    </div>
  );
}

// ── Sell-through curve card ───────────────────────────────────────────────

function SellThroughCard({
  curve, onChange, locale,
}: {
  curve: DistributionPlan['sell_through_targets'];
  onChange: (next: DistributionPlan['sell_through_targets']) => void;
  locale: string;
}) {
  const t = useTranslation();
  const labels = (t.distribution as Record<string, string>) || {};

  const points: Array<{ key: keyof DistributionPlan['sell_through_targets']; label: string }> = [
    { key: 'week_4',  label: 'Sem 4' },
    { key: 'week_8',  label: 'Sem 8' },
    { key: 'week_12', label: 'Sem 12' },
    { key: 'week_24', label: 'Sem 24' },
  ];
  // Sell-through must escalate (week_4 ≤ week_8 ≤ week_12 ≤ week_24).
  // Auto-correct: if user types a value that breaks monotonicity, adjust
  // neighbours so the curve stays valid without forcing them to think.
  const update = (key: keyof DistributionPlan['sell_through_targets'], v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    const next = { ...curve, [key]: clamped };
    // Earlier points must be ≤ this one
    const order: Array<keyof DistributionPlan['sell_through_targets']> = ['week_4', 'week_8', 'week_12', 'week_24'];
    const idx = order.indexOf(key);
    for (let i = 0; i < idx; i++) {
      if (next[order[i]] > clamped) next[order[i]] = clamped;
    }
    // Later points must be ≥ this one
    for (let i = idx + 1; i < order.length; i++) {
      if (next[order[i]] < clamped) next[order[i]] = clamped;
    }
    onChange(next);
  };

  // SVG line chart
  const W = 320;
  const H = 100;
  const padX = 30;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const xs = points.map((_, i) => padX + (i / (points.length - 1)) * innerW);
  const ys = points.map(p => padY + innerH * (1 - (curve[p.key] || 0) / 100));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const areaPath = `${path} L${xs[xs.length - 1]},${padY + innerH} L${xs[0]},${padY + innerH} Z`;

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.sellThrough || 'Sell-through'}
        </span>
        <span className="text-[11px] text-carbon/40">{labels.percentSold || '% vendido'}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[100px] mb-4">
        {/* Grid lines */}
        {[25, 50, 75].map(g => (
          <line
            key={g}
            x1={padX} x2={W - padX}
            y1={padY + innerH * (1 - g / 100)}
            y2={padY + innerH * (1 - g / 100)}
            stroke="rgba(0,0,0,0.04)" strokeDasharray="2 4"
          />
        ))}
        <path d={areaPath} fill={CHANNEL_ACCENTS.dtc_online} fillOpacity="0.3" />
        <path d={path} fill="none" stroke={MARKET_ACCENT} strokeWidth="2" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="3.5" fill={MARKET_ACCENT} />
        ))}
      </svg>

      <div className="grid grid-cols-4 gap-2">
        {points.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={curve[key] || 0}
              onChange={(e) => update(key, parseNum(e.target.value))}
              className="w-full text-center text-[14px] font-semibold text-carbon tabular-nums bg-carbon/[0.03] rounded-[8px] outline-none focus:bg-carbon/[0.06] py-1.5"
            />
            <span className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 font-medium">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-carbon/35 italic mt-3 leading-relaxed">
        {fmtNum(curve.week_24 || 0, locale)}% {labels.sellThroughHint || 'a fin de temporada — el resto pasa a markdown'}
      </p>
    </div>
  );
}

// ── Marketplaces + Retail (compact) ───────────────────────────────────────

function ExtrasCard({
  marketplaces, physicalRetail, pricing, onMarketplaces, onRetail, onPricing,
}: {
  marketplaces: DistributionPlan['marketplaces'];
  physicalRetail: DistributionPlan['physical_retail'];
  pricing: DistributionPlan['pricing_per_channel'];
  onMarketplaces: (next: DistributionPlan['marketplaces']) => void;
  onRetail: (next: DistributionPlan['physical_retail']) => void;
  onPricing: (next: DistributionPlan['pricing_per_channel']) => void;
}) {
  const t = useTranslation();
  const labels = (t.distribution as Record<string, string>) || {};

  return (
    <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06]">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
          {labels.extras || 'Marketplaces · Retail · Pricing'}
        </span>
      </div>

      {/* Marketplaces */}
      <div className="mb-5">
        <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/55 font-medium mb-2">
          {labels.marketplacesLabel || 'Marketplaces'}
        </p>
        <div className="flex flex-wrap gap-2">
          {marketplaces.map((mp, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 rounded-full bg-carbon/[0.03] px-3 py-1.5 text-[12px] text-carbon/70 group/mp"
            >
              <input
                type="text"
                value={mp.name}
                onChange={(e) => {
                  const next = [...marketplaces];
                  next[i] = { ...mp, name: e.target.value };
                  onMarketplaces(next);
                }}
                placeholder={labels.marketplaceName || 'Nombre'}
                className="bg-transparent outline-none w-[80px]"
              />
              <span className="text-carbon/30">·</span>
              <input
                type="text"
                inputMode="numeric"
                value={mp.commission_pct || 0}
                onChange={(e) => {
                  const next = [...marketplaces];
                  next[i] = { ...mp, commission_pct: parseNum(e.target.value) };
                  onMarketplaces(next);
                }}
                className="w-[28px] bg-transparent outline-none tabular-nums text-right"
              />
              <span className="text-carbon/40 text-[10px]">% com</span>
              <button
                type="button"
                onClick={() => onMarketplaces(marketplaces.filter((_, j) => j !== i))}
                className="text-carbon/15 hover:text-destructive opacity-0 group-hover/mp:opacity-100 transition-opacity"
                title={labels.removeMarketplace || 'Eliminar marketplace'}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onMarketplaces([...marketplaces, { name: '', type: 'aggregator', commission_pct: 30 }])}
            className="rounded-full px-3 py-1.5 text-[12px] text-carbon/35 hover:text-carbon/65 hover:bg-carbon/[0.03] inline-flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            {labels.addMarketplace || 'Añadir'}
          </button>
        </div>
      </div>

      {/* Pricing per channel */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/55 font-medium mb-1.5">
            {labels.wholesaleDiscount || 'Wholesale off retail'}
          </p>
          <div className="flex items-baseline gap-1.5 rounded-full bg-carbon/[0.03] px-3 py-1.5 w-fit">
            <input
              type="text"
              inputMode="numeric"
              value={pricing.wholesale_discount_pct || 0}
              onChange={(e) => onPricing({ ...pricing, wholesale_discount_pct: parseNum(e.target.value) })}
              className="w-[34px] text-[14px] font-semibold text-carbon tabular-nums bg-transparent outline-none text-right"
            />
            <span className="text-[10px] text-carbon/45">%</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/55 font-medium mb-1.5">
            {labels.marketplaceDiscount || 'Marketplace off retail'}
          </p>
          <div className="flex items-baseline gap-1.5 rounded-full bg-carbon/[0.03] px-3 py-1.5 w-fit">
            <input
              type="text"
              inputMode="numeric"
              value={pricing.marketplace_discount_pct || 0}
              onChange={(e) => onPricing({ ...pricing, marketplace_discount_pct: parseNum(e.target.value) })}
              className="w-[34px] text-[14px] font-semibold text-carbon tabular-nums bg-transparent outline-none text-right"
            />
            <span className="text-[10px] text-carbon/45">%</span>
          </div>
        </div>
      </div>

      {/* Physical retail toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/55 font-medium">
            {labels.physicalRetail || 'Retail propio Y1'}
          </p>
          <button
            type="button"
            onClick={() => onRetail({ ...physicalRetail, enabled: !physicalRetail.enabled })}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              physicalRetail.enabled ? 'bg-carbon text-white' : 'bg-carbon/[0.04] text-carbon/55'
            }`}
          >
            {physicalRetail.enabled ? labels.yes || 'Sí' : labels.no || 'No'}
          </button>
        </div>
        {physicalRetail.enabled && (
          <textarea
            value={physicalRetail.plan}
            onChange={(e) => onRetail({ ...physicalRetail, plan: e.target.value })}
            placeholder={labels.retailPlanPlaceholder || 'Pop-up, showroom, tienda — describe el plan'}
            className="w-full text-[12px] text-carbon/70 bg-carbon/[0.02] rounded-[10px] px-3 py-2 outline-none focus:bg-carbon/[0.04] resize-none border border-carbon/[0.04]"
            rows={2}
          />
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function DistributionContent({ collectionContext, language = 'es', basePath }: Props) {
  const t = useTranslation();
  const labels = (t.distribution as Record<string, string>) || {};
  const locale = localeFor(language);

  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hasStrategy, setHasStrategy] = useState(false);
  const [plan, setPlan] = useState<DistributionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategySummary, setStrategySummary] = useState<{
    archetype_name: string; target_sku_count: number; sales_target_y1: number; drops: number;
  } | null>(null);

  const propose = useCallback(async () => {
    setProposing(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/distribution-propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId, language }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || labels.errPropose || 'No se pudo construir la distribución');
        return;
      }
      const { result } = await res.json();
      setPlan(result as DistributionPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.errPropose || 'Error inesperado');
    } finally {
      setProposing(false);
    }
  }, [collectionContext.collectionPlanId, language, labels]);

  // Initial CIS load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/distribution-load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (!cancelled) setError(err.error || 'No se pudo cargar la distribución.');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setHasStrategy(!!data.has_strategy);
        setStrategySummary(data.strategy_summary || null);
        if (data.has_distribution && data.plan) {
          setPlan(data.plan as DistributionPlan);
        } else if (data.has_strategy) {
          // Auto-fire propose; bail out of the load spinner so propose's own
          // loader takes over.
          setLoading(false);
          await propose();
          return;
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [collectionContext.collectionPlanId, propose]);

  const handleConfirm = useCallback(async () => {
    if (!plan) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/distribution-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId: collectionContext.collectionPlanId, plan }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'No se pudo confirmar.');
        return;
      }
      window.location.href = `${basePath}?block=budget`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setConfirming(false);
    }
  }, [collectionContext.collectionPlanId, plan, basePath]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/40" />
        <p className="text-[13px] text-carbon/55 italic">
          {labels.loadingDistribution || 'Cargando tu distribución…'}
        </p>
      </div>
    );
  }

  if (!hasStrategy) {
    return (
      <div className="max-w-[640px] mx-auto bg-white rounded-[20px] p-10 md:p-14 border border-carbon/[0.06] text-center">
        <div className="w-12 h-12 rounded-full bg-carbon/[0.04] flex items-center justify-center mx-auto mb-5">
          <ArrowLeft className="h-5 w-5 text-carbon/45" />
        </div>
        <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
          {labels.distributionEmptyTitle || 'Define primero la estrategia de compra'}
        </h3>
        <p className="text-[14px] text-carbon/55 leading-relaxed mb-6">
          {labels.distributionEmptyDesc || 'La distribución se construye sobre tu volumen y tu objetivo Y1. Confirma 02.1 Estrategia y volvemos aquí con un plan pre-poblado.'}
        </p>
        <Link
          href={`${basePath}?block=scenarios`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {labels.goToStrategy || 'Ir a Estrategia de Compra'}
        </Link>
      </div>
    );
  }

  if (proposing && !plan) {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/40" />
        <p className="text-[13px] text-carbon/55 italic">
          {labels.proposingDistribution || 'Aimily está leyendo tu estrategia, consumidor y señales de retail para proponer la distribución…'}
        </p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-[640px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-5 text-[13px] text-red-800 flex items-start gap-3">
        <span className="flex-1">{error || 'No se pudo construir la distribución.'}</span>
        <Button onClick={propose} variant="ghost" size="sm" className="rounded-full">
          <RefreshCw className="h-3 w-3 mr-1.5" />
          {labels.retry || 'Reintentar'}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Strategy summary header — context line */}
      {strategySummary && (
        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-carbon/55">
          <span>
            <span className="text-carbon/35">{labels.workingOn || 'Trabajando sobre'} </span>
            <span className="text-carbon font-medium">{strategySummary.archetype_name}</span>
          </span>
          <span className="text-carbon/20">·</span>
          <span className="tabular-nums">{fmtNum(strategySummary.target_sku_count, locale)} SKUs</span>
          <span className="text-carbon/20">·</span>
          <span className="tabular-nums">€{fmtNum(strategySummary.sales_target_y1, locale)} Y1</span>
          <span className="text-carbon/20">·</span>
          <span>{strategySummary.drops} {strategySummary.drops === 1 ? (labels.drop || 'drop') : (labels.drops || 'drops')}</span>
          <button
            type="button"
            onClick={propose}
            disabled={proposing}
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-carbon/40 hover:text-carbon transition-colors"
          >
            {proposing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {labels.regenerate || 'Regenerar plan'}
          </button>
        </div>
      )}

      {error && (
        <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800 mb-5">
          {error}
        </div>
      )}

      {/* 2x2 dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChannelMixCard
          mix={plan.channel_mix}
          onChange={(channel_mix) => setPlan({ ...plan, channel_mix })}
          locale={locale}
        />
        <MarketsCard
          markets={plan.markets}
          onChange={(markets) => setPlan({ ...plan, markets })}
          locale={locale}
        />
        <WholesaleCard
          targets={plan.wholesale_targets}
          onChange={(wholesale_targets) => setPlan({ ...plan, wholesale_targets })}
        />
        <SellThroughCard
          curve={plan.sell_through_targets}
          onChange={(sell_through_targets) => setPlan({ ...plan, sell_through_targets })}
          locale={locale}
        />
      </div>

      <ExtrasCard
        marketplaces={plan.marketplaces}
        physicalRetail={plan.physical_retail}
        pricing={plan.pricing_per_channel}
        onMarketplaces={(marketplaces) => setPlan({ ...plan, marketplaces })}
        onRetail={(physical_retail) => setPlan({ ...plan, physical_retail })}
        onPricing={(pricing_per_channel) => setPlan({ ...plan, pricing_per_channel })}
      />

      {/* Editorial rationale */}
      {plan.rationale && (
        <div className="bg-white rounded-[20px] p-7 border border-carbon/[0.06] mt-5">
          <p className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
            {labels.rationaleTitle || 'Por qué este plan'}
          </p>
          <textarea
            value={plan.rationale}
            onChange={(e) => setPlan({ ...plan, rationale: e.target.value })}
            className="w-full text-[14px] text-carbon/70 leading-relaxed bg-transparent outline-none focus:bg-carbon/[0.02] rounded-[10px] px-2 py-1 resize-none italic"
            rows={3}
          />
        </div>
      )}

      <CanonicalActionBar
        onModify={() => { window.history.back(); }}
        onConfirm={handleConfirm}
        modifyLabel={labels.backLabel || 'Atrás'}
        confirmLabel={labels.confirmDistribution || 'Confirmar y continuar a Plan Financiero'}
        confirmDisabled={!plan}
        loading={confirming}
      />
    </div>
  );
}
