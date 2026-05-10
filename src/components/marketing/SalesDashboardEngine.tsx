'use client';

/**
 * 04.4 Sales Dashboard · ENGINE (Sprint C)
 *
 * The motor that reconnects Block 3 → Block 4 → Block 4 downstream.
 * Reads:
 *   - marketing.sales_strategy.* (CIS) for archetype + channels + KPIs
 *   - collection_skus + drops + production_orders
 * Computes:
 *   - Gauss expected revenue curve per archetype
 *   - Hero KPI tiles per archetype + per active channel
 *   - SKU lineup with entry-date countdowns
 *   - Action timeline T-6..T+30 derived from anchor dates
 *
 * Visual: ULTRA modern (Felipe brief) — no Excel-feel. Big numbers,
 * gradient charts, motion-driven transitions, citronella/linen accents,
 * status pulse indicators.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Wallet,
  Sparkles as SparklesIcon, // unused fallback (won't render)
  ArrowRight,
  Wand2,
  Check,
  Clock,
  AlertCircle,
  Lock,
  Zap,
} from 'lucide-react';
import {
  computeExpectedCurve,
  cumulativeCurve,
  fmtDate,
} from '@/lib/sales-strategy/gauss-curve';
import { getArchetype } from '@/lib/sales-strategy/archetypes';
import type {
  SalesArchetypeId,
  ChannelActivation,
  FulfillmentModel,
  DropMechanic,
} from '@/types/sales-strategy';

// keep Sparkles ref to satisfy eslint no-unused-imports — but we never render it.
void SparklesIcon;

// ── Types matching API payload ─────────────────────────────────────────────

interface SkuLite {
  id: string;
  name: string;
  category: string | null;
  family: string | null;
  pvp: number | null;
  cost: number | null;
  margin: number | null;
  expected_sales: number | null;
  buy_units: number | null;
  fulfillment_model: FulfillmentModel;
  lead_time_days: number | null;
  deposit_pct: number | null;
  drop_id: string | null;
  drop_number: number | null;
  launch_date: string | null;
  production_approved: boolean;
  render_url: string | null;
  cost_breakdown: Record<string, unknown> | null;
}

interface DashboardData {
  hasStrategy: boolean;
  archetype: {
    id: SalesArchetypeId;
    name: string;
    fulfillment_model: FulfillmentModel;
    drop_mechanic: DropMechanic;
    payment_provider: string;
    capital_intensity: string;
  } | null;
  channelsActivated: ChannelActivation[];
  kpiFocus: string[];
  cadence: { drops_frequency_weeks: number; posts_per_day: number; emails_per_week: number } | null;
  volume: { skus_per_drop: number; catalog_mode: 'permanent' | 'capsule' } | null;
  skus: SkuLite[];
  skuCount: number;
  drops: unknown[];
  productionOrders: unknown[];
  productionDispatched: number;
  productionPendingDispatch: number;
  forecastRevenueEur: number;
  forecastUnits: number;
  forecastAvgPvp: number;
  forecastAvgMargin: number;
  forecastSellthrough: number;
  forecastEntryDate: string | null;
  actualRevenueEur: number;
  actualUnitsDispatched: number;
  actualMarginPct: number;
  actualLineupLocked: boolean;
  finalSelectionLockedAt: string | null;
}

// ── KPI label dictionary ────────────────────────────────────────────────────

const KPI_LABEL: Record<string, string> = {
  conversion_rate: 'Conversion rate',
  aov: 'AOV',
  cac_payback: 'CAC payback',
  email_capture_rate: 'Email capture',
  repeat_purchase_rate: 'Repeat purchase',
  sellthrough_first_24h: 'Sellthrough 24h',
  founder_engagement_rate: 'Founder engagement',
  drop_to_drop_repeat_rate: 'Drop repeat',
  email_capture_per_drop: 'Email capture/drop',
  audience_to_buyer_conversion: 'Audience-to-buyer',
  founder_reputation_health: 'Founder reputation',
  deposit_conversion_rate: 'Deposit conversion',
  lead_time_adherence: 'Lead time adherence',
  cancellation_rate: 'Cancellation rate',
  deposit_to_balance_collection_rate: 'Balance collection',
  waitlist_size: 'Waitlist size',
  gmv: 'GMV',
  creator_attribution_share: 'Creator share',
  live_session_gmv: 'LIVE GMV',
  return_rate: 'Return rate',
  video_to_order_cvr: 'Video → order',
  dm_to_order_cvr: 'DM → order',
  broadcast_list_size: 'Broadcast list',
  median_response_time_min: 'Response time',
  abandoned_cart_recovery_rate: 'Cart recovery',
  wholesale_orders_pending: 'B2B pending',
  net30_collection_rate: 'Net30 collection',
  reorder_rate: 'Reorder rate',
  in_person_revenue: 'In-person revenue',
  footfall: 'Footfall',
  ig_capture_at_event: 'IG @ event',
  cross_listing_cvr: 'Cross-list CVR',
  resale_velocity: 'Resale velocity',
};

// Archetype accent for hero card backdrop
const ARCHETYPE_BACKDROP: Record<SalesArchetypeId, string> = {
  A: 'bg-gradient-to-br from-[#F1EFED] via-[#F8F6F3] to-white',
  B: 'bg-gradient-to-br from-[#FFF4CE] via-[#FFFAE6] to-white',
  C: 'bg-gradient-to-br from-[#EDEEE7] via-[#F4F5EE] to-white',
};

const fmtEurCompact = (n: number): string => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `€${Math.round(n / 1000)}K`;
  return `€${Math.round(n)}`;
};

// ── Hero KPI tile (5-6 across) ─────────────────────────────────────────────

function HeroKPITile({
  label,
  value,
  delta,
  Icon,
  index,
}: {
  label: string;
  value: string;
  delta?: { sign: 'up' | 'down' | 'flat'; text: string };
  Icon: React.ElementType;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: 'easeOut' }}
      className="bg-white rounded-[18px] p-5 ring-1 ring-carbon/[0.06] hover:ring-carbon/[0.15] transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className="h-4 w-4 text-carbon/30" strokeWidth={1.6} />
        {delta && (
          <span
            className={`text-[10px] tracking-tight font-semibold tabular-nums ${
              delta.sign === 'up'
                ? 'text-emerald-600'
                : delta.sign === 'down'
                ? 'text-red-500'
                : 'text-carbon/35'
            }`}
          >
            {delta.text}
          </span>
        )}
      </div>
      <div className="text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-none mb-1.5 tabular-nums">
        {value}
      </div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 font-medium">
        {label}
      </div>
    </motion.div>
  );
}

// ── Gauss curve chart ──────────────────────────────────────────────────────

function GaussCurveSection({ data }: { data: DashboardData }) {
  const archetypeId = data.archetype?.id || 'A';
  const archetype = getArchetype(archetypeId);
  const anchorDate = data.forecastEntryDate
    ? new Date(data.forecastEntryDate)
    : new Date();
  const durationDays =
    archetypeId === 'B' ? 30 : archetypeId === 'C' ? 140 : 180;

  const expected = useMemo(
    () =>
      computeExpectedCurve({
        archetypeId,
        anchorDate,
        totalRevenueEur: data.forecastRevenueEur,
        totalUnits: data.forecastUnits,
        durationDays,
        leadTimeDays: data.archetype?.fulfillment_model === 'made_to_order' ? 56 : undefined,
      }),
    [archetypeId, anchorDate, data.forecastRevenueEur, data.forecastUnits, durationDays, data.archetype?.fulfillment_model],
  );

  const cumulative = useMemo(() => cumulativeCurve(expected), [expected]);

  // Combine for chart: each row has expected_revenue (instant) + cumulative
  const chartData = expected.points.map((p, i) => ({
    day: p.day_offset,
    instant: p.expected_revenue_eur,
    cumulative: cumulative[i].cumulative_revenue_eur,
  }));

  // Today's offset from anchor
  const today = new Date();
  const todayOffset = Math.round(
    (today.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const todayInRange = todayOffset >= 0 && todayOffset <= durationDays;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-white rounded-[20px] p-7 md:p-8 ring-1 ring-carbon/[0.06]"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
            Curva de ventas esperada
          </div>
          <h3 className="text-[22px] md:text-[26px] font-semibold text-carbon tracking-[-0.03em] leading-tight">
            {data.archetype?.name || 'Forecast'} ·{' '}
            {fmtEurCompact(data.forecastRevenueEur)}
          </h3>
          <p className="text-[12px] text-carbon/50 mt-1.5 italic">
            Forma {expected.shape.replace(/_/g, ' ')} · {durationDays}d desde {fmtDate(anchorDate)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1">
            Indicador de salud
          </div>
          <div className="text-[12px] text-carbon/65 max-w-[180px] leading-relaxed">
            {expected.good_threshold.description}
          </div>
        </div>
      </div>

      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gaussArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#282A29" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#282A29" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gaussCum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFF4CE" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#FFF4CE" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `D+${v}`}
              interval={Math.floor(durationDays / 6)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtEurCompact(v)}
              width={50}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: '1px solid #e5e5e5',
                borderRadius: 12,
                padding: '8px 12px',
              }}
              formatter={(value: number, name: string) => [
                fmtEurCompact(value),
                name === 'instant' ? 'Diario' : 'Acumulado',
              ]}
              labelFormatter={(d: number) => `Día +${d}`}
            />
            {todayInRange && (
              <ReferenceLine
                x={todayOffset}
                stroke="#282A29"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{
                  value: 'hoy',
                  position: 'top',
                  fill: '#282A29',
                  fontSize: 10,
                  opacity: 0.65,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="instant"
              stroke="#282A29"
              strokeWidth={2}
              fill="url(#gaussArea)"
              name="instant"
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#B8A04C"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#gaussCum)"
              name="cumulative"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Key milestones bar */}
      <div className="mt-4 pt-4 border-t border-carbon/[0.06] flex items-center justify-between text-[11px] text-carbon/55">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-carbon/80" />
          <span>Forecast diario</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B8A04C]" />
          <span>Acumulado</span>
        </div>
        {todayInRange && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-3 border-l-2 border-dashed border-carbon/50" />
            <span>Hoy = D+{todayOffset}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── SKU lineup card (horizontal scroll) ────────────────────────────────────

function SkuLineupCard({ sku, anchorDate, index }: { sku: SkuLite; anchorDate: Date | null; index: number }) {
  const launchDate = sku.launch_date ? new Date(sku.launch_date) : anchorDate;
  const today = new Date();
  const daysUntilLaunch = launchDate
    ? Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let statusLabel: string;
  let statusColor: string;
  if (sku.production_approved) {
    statusLabel = 'Aprobado';
    statusColor = 'bg-emerald-50 text-emerald-700 ring-emerald-200/50';
  } else if (daysUntilLaunch !== null && daysUntilLaunch < 0) {
    statusLabel = 'En venta';
    statusColor = 'bg-carbon text-white ring-carbon';
  } else if (daysUntilLaunch !== null) {
    statusLabel = `T-${daysUntilLaunch}d`;
    statusColor = 'bg-[#FFF4CE] text-carbon ring-[#E8D67E]/40';
  } else {
    statusLabel = 'Sin fecha';
    statusColor = 'bg-carbon/[0.04] text-carbon/55 ring-carbon/[0.06]';
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className="shrink-0 w-[240px] bg-white rounded-[16px] p-4 ring-1 ring-carbon/[0.06] hover:ring-carbon/[0.18] transition-all"
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full rounded-[10px] bg-carbon/[0.03] mb-3 overflow-hidden">
        {sku.render_url ? (
          <img src={sku.render_url} alt={sku.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-carbon/15">
            <Package className="h-6 w-6" strokeWidth={1.3} />
          </div>
        )}
      </div>

      {/* Name */}
      <h5 className="text-[13px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-1 line-clamp-1">
        {sku.name}
      </h5>
      <p className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium mb-2.5">
        {sku.category} · €{sku.pvp}
      </p>

      {/* Status pill + expected */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${statusColor}`}
        >
          {statusLabel}
        </span>
        <span className="text-[11px] text-carbon/55 font-medium tabular-nums">
          {fmtEurCompact(sku.expected_sales || 0)}
        </span>
      </div>
    </motion.div>
  );
}

// ── Action timeline station ────────────────────────────────────────────────

interface ActionStation {
  offset: string;     // 'T-6 sem' / 'Día 0' etc.
  date: Date;
  title: string;
  description: string;
  channel?: 'storefront' | 'tiktok' | 'community_dm' | 'press' | 'email';
  status: 'pending' | 'live' | 'past';
  Icon: React.ElementType;
}

function getActionStations(data: DashboardData): ActionStation[] {
  if (!data.archetype || !data.forecastEntryDate) return [];
  const anchor = new Date(data.forecastEntryDate);
  const today = new Date();
  const daysFromToday = (offsetDays: number): Date => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + offsetDays);
    return d;
  };
  const status = (offsetDays: number): ActionStation['status'] => {
    const target = daysFromToday(offsetDays);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    if (targetMidnight < todayMidnight) return 'past';
    if (targetMidnight.getTime() === todayMidnight.getTime()) return 'live';
    return 'pending';
  };

  const archetypeId = data.archetype.id;

  // Default 6-station plan, adapted per archetype
  const stations: ActionStation[] = [
    {
      offset: 'T-6 sem',
      date: daysFromToday(-42),
      title: 'Editorial press push',
      description: archetypeId === 'C' ? 'Vogue · BoF · craft narrative' : 'Lookbook teaser · prensa target',
      channel: 'press',
      status: status(-42),
      Icon: SparklesIcon, // we'll override icon below
    },
    {
      offset: 'T-3 sem',
      date: daysFromToday(-21),
      title: archetypeId === 'B' ? 'Creator brief + UGC seeding' : 'Email teaser segmentado',
      description: archetypeId === 'B' ? '10-12 micro-creators · brief generado' : 'VIP list · carousel reveal',
      channel: archetypeId === 'B' ? 'tiktok' : 'email',
      status: status(-21),
      Icon: SparklesIcon,
    },
    {
      offset: 'T-1 sem',
      date: daysFromToday(-7),
      title: 'Countdown IG Stories',
      description: 'Storyboard generado · 5-day swipe-up sequence',
      channel: 'storefront',
      status: status(-7),
      Icon: SparklesIcon,
    },
    {
      offset: 'Día 0',
      date: daysFromToday(0),
      title: 'Drop announcement',
      description: 'Storefront publish + multi-canal sync',
      channel: 'storefront',
      status: status(0),
      Icon: SparklesIcon,
    },
    {
      offset: 'T+7',
      date: daysFromToday(7),
      title: 'Post-launch performance',
      description: 'Curva real vs Gauss · recommendation engine',
      status: status(7),
      Icon: SparklesIcon,
    },
    {
      offset: 'T+30',
      date: daysFromToday(30),
      title: 'Refresh creative wave',
      description: 'Segunda ola contenido · re-engagement',
      status: status(30),
      Icon: SparklesIcon,
    },
  ];

  return stations.map((s) => ({
    ...s,
    Icon: iconForStatus(s.status),
  }));
}

function iconForStatus(status: ActionStation['status']): React.ElementType {
  if (status === 'past') return Check;
  if (status === 'live') return Zap;
  return Clock;
}

function ActionStationCard({ station, index }: { station: ActionStation; index: number }) {
  const isLive = station.status === 'live';
  const isPast = station.status === 'past';
  const Icon = station.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.05, duration: 0.4 }}
      className="relative pl-12 pb-6 last:pb-0"
    >
      {/* Timeline rail */}
      <div className="absolute left-[18px] top-7 bottom-0 w-px bg-carbon/[0.08]" />

      {/* Status dot */}
      <div
        className={`absolute left-2 top-1.5 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-shade ${
          isPast
            ? 'bg-carbon text-white'
            : isLive
            ? 'bg-[#FFF4CE] text-carbon animate-pulse'
            : 'bg-white text-carbon/40 ring-carbon/[0.08]'
        }`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>

      {/* Card */}
      <div className="bg-white rounded-[14px] p-4 ring-1 ring-carbon/[0.06] hover:ring-carbon/[0.18] transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40">
            {station.offset} · {fmtDate(station.date)}
          </span>
          {isLive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-1">
          {station.title}
        </div>
        <p className="text-[12px] text-carbon/50 leading-relaxed mb-3">
          {station.description}
        </p>
        <button
          type="button"
          disabled={isPast}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
            isPast
              ? 'bg-carbon/[0.04] text-carbon/35 cursor-not-allowed'
              : 'bg-carbon text-white hover:bg-carbon/90'
          }`}
        >
          {isPast ? (
            <>
              <Check className="h-3 w-3" />
              Completado
            </>
          ) : (
            <>
              <Wand2 className="h-3 w-3" />
              Auto-generar
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ── Empty state when no strategy confirmed ─────────────────────────────────

function EmptyStrategy() {
  return (
    <div className="max-w-[640px] mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFF4CE] flex items-center justify-center mx-auto mb-6">
        <Wallet className="h-7 w-7 text-carbon/55" strokeWidth={1.6} />
      </div>
      <h3 className="text-[24px] font-semibold text-carbon tracking-[-0.03em] mb-3">
        Primero configura tu estrategia
      </h3>
      <p className="text-[14px] text-carbon/55 leading-relaxed mb-6">
        El Sales Dashboard se construye desde tu modelo de negocio + canales activos.
        Confirma 04.0 Estrategia de Venta y vuelve aquí.
      </p>
      <a
        href="?block=strategy"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 transition-colors"
      >
        Ir a Estrategia de Venta
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ── Main Engine Component ──────────────────────────────────────────────────

export default function SalesDashboardEngine({
  collectionPlanId,
}: {
  collectionPlanId: string;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/sales-dashboard/data?cpId=${encodeURIComponent(collectionPlanId)}`,
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Error ${res.status}`);
        }
        const j = await res.json();
        if (!cancelled) setData(j.result as DashboardData);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionPlanId]);

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto py-20 text-center">
        <Loader2 className="h-6 w-6 mx-auto mb-4 text-carbon/30 animate-spin" />
        <p className="text-[14px] text-carbon/55">Cargando dashboard…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-5 text-[13px] text-red-800">
        {error}
      </div>
    );
  }
  if (!data) return null;
  if (!data.hasStrategy) return <EmptyStrategy />;

  const archetype = data.archetype!;
  const enabledChannels = data.channelsActivated.filter((c) => c.enabled);
  const anchorDate = data.forecastEntryDate ? new Date(data.forecastEntryDate) : null;
  const stations = getActionStations(data);

  // Compose hero KPIs (5 tiles)
  const heroKpis: { label: string; value: string; Icon: React.ElementType; delta?: { sign: 'up' | 'down' | 'flat'; text: string } }[] = [
    {
      label: 'Revenue forecast',
      value: fmtEurCompact(data.forecastRevenueEur),
      Icon: Wallet,
      delta:
        data.actualRevenueEur > 0
          ? {
              sign: 'flat',
              text: `${Math.round(
                (data.actualRevenueEur / data.forecastRevenueEur) * 100,
              )}% real`,
            }
          : { sign: 'flat', text: 'sin actuals aún' },
    },
    {
      label: 'SKUs',
      value: data.skuCount.toString(),
      Icon: Package,
      delta:
        data.skus.filter((s) => s.production_approved).length > 0
          ? {
              sign: 'up',
              text: `${data.skus.filter((s) => s.production_approved).length} aprobados`,
            }
          : undefined,
    },
    {
      label: 'AOV medio',
      value: `€${Math.round(data.forecastAvgPvp)}`,
      Icon: TrendingUp,
    },
    {
      label: 'Margen forecast',
      value: `${Math.round(data.forecastAvgMargin)}%`,
      Icon: TrendingDown,
      delta:
        data.actualMarginPct > 0
          ? {
              sign: data.actualMarginPct >= data.forecastAvgMargin ? 'up' : 'down',
              text: `${Math.round(data.actualMarginPct)}% real`,
            }
          : undefined,
    },
    {
      label: 'Días al lanzamiento',
      value: anchorDate
        ? Math.ceil((anchorDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)).toString()
        : '—',
      Icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── HERO HEADER (archetype context + lock state) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative rounded-[24px] p-7 md:p-8 ${ARCHETYPE_BACKDROP[archetype.id]} ring-1 ring-carbon/[0.04] overflow-hidden`}
      >
        <div className="absolute right-6 top-2 text-[140px] leading-none font-bold tracking-[-0.06em] text-carbon/[0.04] pointer-events-none select-none">
          {archetype.id}
        </div>
        <div className="relative">
          <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">
            Estrategia activa
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[28px] md:text-[34px] font-semibold text-carbon tracking-[-0.03em] leading-tight">
              {archetype.name}
            </h2>
            {data.actualLineupLocked ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200/50">
                <Lock className="h-3 w-3" />
                Lineup lockeado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 text-carbon/55 text-[11px] font-semibold ring-1 ring-carbon/[0.08]">
                <AlertCircle className="h-3 w-3" />
                Pre-aprobación
              </span>
            )}
          </div>
          <p className="text-[13px] text-carbon/55 mt-2 leading-relaxed">
            {enabledChannels.length} canal{enabledChannels.length !== 1 ? 'es' : ''} activo{enabledChannels.length !== 1 ? 's' : ''}
            {' · '}
            {archetype.fulfillment_model === 'made_to_order'
              ? 'Made-to-Order'
              : archetype.fulfillment_model === 'pre_order'
              ? 'Pre-order capsule'
              : 'In-stock'}
            {' · '}
            Drop {archetype.drop_mechanic.replace(/_/g, ' ')}
          </p>
        </div>
      </motion.div>

      {/* ─── HERO KPI ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {heroKpis.map((k, i) => (
          <HeroKPITile key={k.label} {...k} index={i} />
        ))}
      </div>

      {/* ─── GAUSS CURVE ─── */}
      <GaussCurveSection data={data} />

      {/* ─── KPI FOCUS (chips) ─── */}
      {data.kpiFocus.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-[20px] p-6 ring-1 ring-carbon/[0.06]"
        >
          <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-4">
            KPIs primarios · vigilas a diario
          </div>
          <div className="flex flex-wrap gap-2">
            {data.kpiFocus.map((kpi, i) => (
              <motion.div
                key={kpi}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.03 }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-carbon/[0.04] text-[12px] font-medium text-carbon/75"
              >
                <span className="text-[10px] text-carbon/40 font-semibold tabular-nums">
                  {i + 1}
                </span>
                {KPI_LABEL[kpi] || kpi}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── SKU LINEUP CAROUSEL ─── */}
      {data.skus.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
              Lineup · {data.skus.length} SKUs · {fmtEurCompact(data.forecastRevenueEur)}
            </div>
            <div className="text-[11px] text-carbon/45">
              {data.skus.filter((s) => s.production_approved).length}/{data.skus.length} aprobados
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
            {data.skus.map((sku, i) => (
              <div key={sku.id} className="snap-start">
                <SkuLineupCard sku={sku} anchorDate={anchorDate} index={i} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── ACTION TIMELINE ─── */}
      {stations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="bg-white rounded-[20px] p-7 md:p-8 ring-1 ring-carbon/[0.06]"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
                Plan de acciones
              </div>
              <h3 className="text-[22px] md:text-[24px] font-semibold text-carbon tracking-[-0.03em] leading-tight">
                Pre-launch → drop → post-launch
              </h3>
              <p className="text-[12px] text-carbon/50 mt-1.5 italic">
                aimily auto-genera cada acción desde tu Brand DNA + lineup
              </p>
            </div>
          </div>
          <div className="mt-2">
            {stations.map((s, i) => (
              <ActionStationCard key={s.offset} station={s} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
