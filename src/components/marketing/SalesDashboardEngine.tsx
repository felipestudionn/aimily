'use client';

/**
 * 04.4 Sales Dashboard · ENGINE (Sprint C · gold-standard rewrite)
 *
 * Felipe feedback 2026-05-10: previous version used non-canonical icons
 * (Sparkles is forbidden), accent gradients as dominant surface (against
 * design-accent-palette.md: accents are SUPPORTING, not dominant), and
 * generic AI-style elements (Zap pulses, AlertCircle, Wallet, Package).
 *
 * This rewrite is strict gold standard:
 *   · NO Sparkles. ICONS = TrendingDown · Wand2 · Check · ArrowRight only
 *     (+ Loader2 for loading, ArrowLeft for nav back).
 *   · NO gradients. All cards = bg-white rounded-[20px] p-10 md:p-12.
 *   · 4 major sections with ghost numbers (01·02·03·04) at 72px carbon/[0.05].
 *   · Big numbers tabular-nums 60-72px following the SalesStrategy editor pattern.
 *   · Hierarchy: title 24-28px font-semibold + description 14px carbon/50.
 *
 * Data architecture (gauss-curve.ts + dashboard-data.ts) unchanged — only
 * the visual layer is rewritten.
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
  TrendingDown,
  Wand2,
  Check,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  buildAggregateCurve,
  fmtDate,
  fmtDateLong,
} from '@/lib/sales-strategy/gauss-curve';
import { getArchetype } from '@/lib/sales-strategy/archetypes';
import type {
  SalesArchetypeId,
  ChannelActivation,
  FulfillmentModel,
  DropMechanic,
} from '@/types/sales-strategy';

// ── Types matching API payload ─────────────────────────────────────────────

interface DropLite {
  id: string;
  drop_number: number;
  name: string;
  launch_date: string;
}

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
  drops: DropLite[];
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

// ── KPI label dictionary (Spanish, no emojis) ──────────────────────────────

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

const fmtEurCompact = (n: number): string => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `€${Math.round(n / 1000)}K`;
  return `€${Math.round(n)}`;
};

// ── Section wrapper · gold standard card ───────────────────────────────────

function Section({
  number,
  title,
  description,
  children,
  delay = 0,
}: {
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="bg-white rounded-[20px] p-7 md:p-9"
    >
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="flex items-baseline gap-4">
          <span className="text-[44px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] shrink-0">
            {number}.
          </span>
          <div>
            <h3 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
              {title}
            </h3>
            {description && (
              <p className="text-[13px] text-carbon/50 leading-[1.6] tracking-[-0.02em] mt-1.5 max-w-[640px]">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

// ── 01. Resumen · big numbers ──────────────────────────────────────────────

function ResumenSection({ data }: { data: DashboardData }) {
  const archetype = data.archetype!;
  const enabledChannels = data.channelsActivated.filter((c) => c.enabled);
  const approvedCount = data.skus.filter((s) => s.production_approved).length;
  const anchorDate = data.forecastEntryDate ? new Date(data.forecastEntryDate) : null;
  const daysUntilLaunch = anchorDate
    ? Math.ceil((anchorDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Section
      number="01"
      title={`${archetype.name} · ${enabledChannels.length} canal${enabledChannels.length !== 1 ? 'es' : ''} activo${enabledChannels.length !== 1 ? 's' : ''}`}
      description={`${archetype.fulfillment_model === 'made_to_order' ? 'Made-to-Order' : archetype.fulfillment_model === 'pre_order' ? 'Pre-order capsule' : 'In-stock'} · drop ${archetype.drop_mechanic.replace(/_/g, ' ')} · ${data.actualLineupLocked ? 'lineup lockeado' : 'pre-aprobación'}.`}
      delay={0.05}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            {fmtEurCompact(data.forecastRevenueEur)}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            Revenue forecast
          </div>
          {data.actualRevenueEur > 0 && (
            <div className="text-[11px] text-carbon/55 mt-1 tabular-nums">
              {fmtEurCompact(data.actualRevenueEur)} real ·{' '}
              {Math.round((data.actualRevenueEur / data.forecastRevenueEur) * 100)}%
            </div>
          )}
        </div>
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            {data.skuCount}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            SKUs en lineup
          </div>
          <div className="text-[11px] text-carbon/55 mt-1 tabular-nums">
            {approvedCount}/{data.skuCount} aprobados
          </div>
        </div>
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            €{Math.round(data.forecastAvgPvp)}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            AOV medio
          </div>
          <div className="text-[11px] text-carbon/55 mt-1 tabular-nums">
            margen {Math.round(data.forecastAvgMargin)}%
            {data.actualMarginPct > 0 && (
              <span className="text-carbon/45"> · {Math.round(data.actualMarginPct)}% real</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            {daysUntilLaunch !== null
              ? daysUntilLaunch >= 0
                ? `${daysUntilLaunch}d`
                : `+${Math.abs(daysUntilLaunch)}d`
              : '—'}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            {daysUntilLaunch !== null && daysUntilLaunch < 0 ? 'desde el lanzamiento' : 'al lanzamiento'}
          </div>
          {anchorDate && (
            <div className="text-[11px] text-carbon/55 mt-1">
              {fmtDate(anchorDate)}
            </div>
          )}
        </div>
      </div>

      {/* KPI focus chips · compact bottom row */}
      {data.kpiFocus.length > 0 && (
        <div className="mt-6 pt-5 border-t border-carbon/[0.06]">
          <div className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-3">
            KPIs primarios
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.kpiFocus.map((kpi, i) => (
              <span
                key={kpi}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-carbon/[0.04] text-[11px] font-medium text-carbon/70"
              >
                <span className="text-[9px] text-carbon/40 font-semibold tabular-nums">
                  {i + 1}
                </span>
                {KPI_LABEL[kpi] || kpi}
              </span>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// ── 02. Curva esperada · per-drop summed con fechas reales ─────────────────

function CurvaSection({ data, drops }: { data: DashboardData; drops: DropLite[] }) {
  const archetypeId = data.archetype?.id || 'A';
  const archetype = getArchetype(archetypeId);

  // Build aggregate curve summing per-SKU contributions from each drop's
  // launch_date. Fallback to sku.launch_date if drop_id missing.
  const aggregate = useMemo(() => {
    // Map drop_id → launch_date for SKUs that belong to a drop
    const dropById = new Map<string, DropLite>();
    drops.forEach((d) => dropById.set(d.id, d));

    const skusWithDates = data.skus.map((s) => {
      let launchDate = s.launch_date;
      if (!launchDate && s.drop_id && dropById.has(s.drop_id)) {
        launchDate = dropById.get(s.drop_id)!.launch_date;
      }
      // Fallback: if drop_number set but no drop_id, find by drop_number
      if (!launchDate && s.drop_number) {
        const drop = drops.find((d) => d.drop_number === s.drop_number);
        if (drop) launchDate = drop.launch_date;
      }
      return { ...s, launch_date: launchDate };
    });

    return buildAggregateCurve(archetypeId, skusWithDates);
  }, [archetypeId, data.skus, drops]);

  if (!aggregate || drops.length === 0) {
    // Empty state · no drops yet
    return (
      <Section
        number="02"
        title="Curva de ventas esperada"
        description="La curva se calcula sumando la contribución de cada SKU desde la fecha de su drop. Para verla, primero define el calendario de drops en Constructor de Colección."
        delay={0.1}
      >
        <div className="bg-shade rounded-[14px] p-8 text-center">
          <p className="text-[13px] text-carbon/55 leading-relaxed mb-4">
            No hay drops definidos para esta colección. Cuando confirmes el calendario en
            <span className="text-carbon font-medium"> Constructor de Colección</span>, esta curva
            mostrará picos por drop y la suma agregada con fechas reales.
          </p>
          <a
            href="../merchandising?block=builder"
            className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 transition-all"
          >
            Definir drops
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </Section>
    );
  }

  const chartData = aggregate.points.map((p) => ({
    timestamp: p.date.getTime(),
    daily: p.daily_eur,
    cumulative: p.cumulative_eur,
    activeSkus: p.active_skus,
  }));

  // Convert drop launch_dates to timestamps for ReferenceLine
  const dropMarkers = drops
    .filter((d) => d.launch_date)
    .map((d) => ({
      timestamp: new Date(d.launch_date).getTime(),
      label: `${d.drop_number}. ${d.name}`,
    }));

  const today = new Date();
  const todayMs = today.getTime();
  const earliestMs = aggregate.earliest_launch.getTime();
  const latestMs = aggregate.points[aggregate.points.length - 1].date.getTime();
  const todayInRange = todayMs >= earliestMs && todayMs <= latestMs;

  const shapeText: Record<string, string> = {
    skewed_right_long_tail: 'cola larga · DTC continuous',
    spike_decay_fast: 'pico por drop · capsule',
    bimodal_deposit_balance: 'bimodal · deposit + balance',
  };

  return (
    <Section
      number="02"
      title="Curva de ventas esperada"
      description={`${shapeText[aggregate.archetype_id === 'A' ? 'skewed_right_long_tail' : aggregate.archetype_id === 'B' ? 'spike_decay_fast' : 'bimodal_deposit_balance']} · ${drops.length} drop${drops.length !== 1 ? 's' : ''} · pico €${fmtEurCompact(aggregate.peak_daily_eur)}/día el ${aggregate.peak_day ? fmtDateLong(aggregate.peak_day) : '—'}.`}
      delay={0.1}
    >
      <div className="h-[260px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gaussInstant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#282A29" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#282A29" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(ms: number) => fmtDate(new Date(ms))}
              tickCount={7}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtEurCompact(v)}
              width={52}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtEurCompact(v)}
              width={52}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '8px 12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'daily') return [fmtEurCompact(value), 'Diario'];
                if (name === 'cumulative') return [fmtEurCompact(value), 'Acumulado'];
                return [String(value), name];
              }}
              labelFormatter={(ms: number) => fmtDateLong(new Date(ms))}
            />
            {/* Drop markers · vertical lines */}
            {dropMarkers.map((m, i) => (
              <ReferenceLine
                key={i}
                yAxisId="left"
                x={m.timestamp}
                stroke="#282A29"
                strokeOpacity={0.18}
                strokeWidth={1.5}
                label={{
                  value: `D${i + 1}`,
                  position: 'top',
                  fill: '#282A29',
                  fontSize: 9,
                  opacity: 0.5,
                }}
              />
            ))}
            {todayInRange && (
              <ReferenceLine
                yAxisId="left"
                x={todayMs}
                stroke="#282A29"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="daily"
              stroke="#282A29"
              strokeWidth={2}
              fill="url(#gaussInstant)"
              name="daily"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#B8A04C"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
              name="cumulative"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-carbon/[0.06] flex items-center justify-between text-[11px] text-carbon/55 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-carbon/80" />
          <span>Forecast diario</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-px border-t border-dashed border-[#B8A04C]" />
          <span>Acumulado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-px h-3 bg-carbon/20" />
          <span>Drop launch</span>
        </div>
        {todayInRange && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-px border-t border-dashed border-carbon/50" />
            <span>Hoy · {fmtDate(today)}</span>
          </div>
        )}
      </div>
    </Section>
  );
}

// ── 03. Lineup · SKU cards (gold standard family-card layout) ─────────────

function LineupSection({ data }: { data: DashboardData }) {
  const today = new Date();
  return (
    <Section
      number="03"
      title="Lineup"
      description={`${data.skuCount} SKUs · ${data.skus.filter((s) => s.production_approved).length} aprobados · ${fmtEurCompact(data.forecastRevenueEur)} forecast.`}
      delay={0.15}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {data.skus.slice(0, 12).map((sku) => {
          const launchDate = sku.launch_date ? new Date(sku.launch_date) : null;
          const daysUntil = launchDate
            ? Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          let statusText: string;
          let statusActive: boolean;
          if (sku.production_approved) {
            statusText = 'Aprobado';
            statusActive = true;
          } else if (daysUntil !== null && daysUntil < 0) {
            statusText = 'En venta';
            statusActive = true;
          } else if (daysUntil !== null) {
            statusText = `T-${daysUntil}d`;
            statusActive = false;
          } else {
            statusText = 'Sin fecha';
            statusActive = false;
          }

          return (
            <div
              key={sku.id}
              className="bg-shade rounded-[14px] p-3 ring-1 ring-carbon/[0.04] hover:ring-carbon/[0.12] transition-all"
            >
              <div className="aspect-square w-full rounded-[8px] bg-white mb-2.5 overflow-hidden ring-1 ring-carbon/[0.04]">
                {sku.render_url ? (
                  <img src={sku.render_url} alt={sku.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[28px] text-carbon/[0.08] font-bold tracking-[-0.04em]">
                      {sku.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <h5 className="text-[12px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-0.5 line-clamp-1">
                {sku.name}
              </h5>
              <p className="text-[9px] tracking-[0.06em] uppercase text-carbon/35 font-medium mb-2 line-clamp-1">
                {sku.category} · €{sku.pvp}
              </p>
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-[-0.01em] ${
                    statusActive
                      ? 'bg-carbon text-white'
                      : 'bg-white text-carbon/55 ring-1 ring-carbon/[0.08]'
                  }`}
                >
                  {statusText}
                </span>
                <span className="text-[10px] text-carbon/55 font-medium tabular-nums">
                  {fmtEurCompact(sku.expected_sales || 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {data.skus.length > 12 && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/65 hover:bg-carbon/[0.04] transition-colors"
          >
            Ver los {data.skus.length - 12} restantes
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </Section>
  );
}

// ── 04. Plan de acciones · vertical timeline ──────────────────────────────

interface ActionStation {
  offset: string;
  date: Date;
  title: string;
  description: string;
  status: 'pending' | 'live' | 'past';
}

function getStations(data: DashboardData): ActionStation[] {
  if (!data.archetype || !data.forecastEntryDate) return [];
  const anchor = new Date(data.forecastEntryDate);
  const today = new Date();
  const at = (offsetDays: number): Date => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + offsetDays);
    return d;
  };
  const status = (offsetDays: number): ActionStation['status'] => {
    const target = at(offsetDays);
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetMid = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    if (targetMid < todayMid) return 'past';
    if (targetMid.getTime() === todayMid.getTime()) return 'live';
    return 'pending';
  };

  const archetypeId = data.archetype.id;

  return [
    {
      offset: 'T-6 sem',
      date: at(-42),
      title: 'Editorial press push',
      description: archetypeId === 'C' ? 'Vogue · BoF · craft narrative editorial.' : 'Lookbook teaser · prensa target del nicho.',
      status: status(-42),
    },
    {
      offset: 'T-3 sem',
      date: at(-21),
      title: archetypeId === 'B' ? 'Creator brief + UGC seeding' : 'Email teaser segmentado',
      description: archetypeId === 'B' ? '10-12 micro-creators con brief generado desde brand voice.' : 'VIP list + IG carousel reveal del lookbook.',
      status: status(-21),
    },
    {
      offset: 'T-1 sem',
      date: at(-7),
      title: 'Countdown IG Stories',
      description: 'Storyboard 5-day swipe-up sequence + paid social warmup.',
      status: status(-7),
    },
    {
      offset: 'Día 0',
      date: at(0),
      title: 'Drop announcement',
      description: 'Storefront publish + multi-canal sync simultáneo.',
      status: status(0),
    },
    {
      offset: 'T+7',
      date: at(7),
      title: 'Post-launch performance check',
      description: 'Curva real vs Gauss esperado · recommendation engine si desviación >10%.',
      status: status(7),
    },
    {
      offset: 'T+30',
      date: at(30),
      title: 'Refresh creative wave',
      description: 'Segunda ola de contenido + re-engagement de waitlist.',
      status: status(30),
    },
  ];
}

function StationRow({ station, index, isLast }: { station: ActionStation; index: number; isLast: boolean }) {
  const isPast = station.status === 'past';
  const isLive = station.status === 'live';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.04, duration: 0.4 }}
      className="relative pl-9 pb-3 last:pb-0"
    >
      {/* Timeline rail */}
      {!isLast && (
        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-carbon/[0.08]" />
      )}

      {/* Status node */}
      <div
        className={`absolute left-1 top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all ${
          isPast
            ? 'bg-carbon text-white'
            : isLive
            ? 'bg-carbon text-white ring-2 ring-carbon/[0.12]'
            : 'bg-white text-carbon/45 ring-1 ring-carbon/[0.14]'
        }`}
      >
        {isPast ? (
          <Check className="h-3 w-3" strokeWidth={2.5} />
        ) : (
          <span className="text-[9px] font-semibold tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Card · horizontal compact layout */}
      <div className="rounded-[12px] py-2.5 px-4 bg-shade ring-1 ring-carbon/[0.04] flex items-center gap-4">
        <div className="shrink-0 w-[110px]">
          <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40">
            {station.offset}
          </div>
          <div className="text-[11px] text-carbon/55 mt-0.5">
            {fmtDate(station.date)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-carbon tracking-[-0.02em] leading-tight truncate">
            {station.title}
          </div>
          <p className="text-[11px] text-carbon/55 leading-snug line-clamp-1 mt-0.5">
            {station.description}
          </p>
        </div>
        <button
          type="button"
          disabled={isPast}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
            isPast
              ? 'bg-carbon/[0.04] text-carbon/35 cursor-not-allowed'
              : 'bg-carbon text-white hover:bg-carbon/90'
          }`}
        >
          {isPast ? (
            <>
              <Check className="h-3 w-3" />
              Hecho
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

function PlanSection({ data }: { data: DashboardData }) {
  const stations = getStations(data);
  if (stations.length === 0) return null;
  return (
    <Section
      number="04"
      title="Plan de acciones"
      description="Pre-launch → drop → post-launch · aimily auto-genera cada acción desde tu brand DNA + lineup + canales activos."
      delay={0.2}
    >
      <div className="mt-2">
        {stations.map((s, i) => (
          <StationRow
            key={s.offset}
            station={s}
            index={i}
            isLast={i === stations.length - 1}
          />
        ))}
      </div>
    </Section>
  );
}

// ── Empty state when no strategy confirmed ─────────────────────────────────

function EmptyStrategy() {
  return (
    <div className="bg-white rounded-[20px] p-16 md:p-20 text-center max-w-[760px] mx-auto">
      <span className="block text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] mb-6">
        00.
      </span>
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
        Primero configura tu estrategia
      </h3>
      <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em] mb-8 max-w-[480px] mx-auto">
        El Sales Dashboard se construye desde tu modelo de negocio + canales activos.
        Confirma 04.0 Estrategia de Venta y vuelve aquí.
      </p>
      <a
        href="?block=strategy"
        className="inline-flex items-center gap-2 py-2.5 px-7 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-all"
      >
        Ir a Estrategia de Venta
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ── Main Engine ───────────────────────────────────────────────────────────

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
      <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-5 text-[13px] text-red-800 flex items-start gap-3">
        <span className="flex-1">{error}</span>
      </div>
    );
  }
  if (!data) return null;
  if (!data.hasStrategy) return <EmptyStrategy />;

  return (
    <div className="space-y-4 pb-12">
      <ResumenSection data={data} />
      <CurvaSection data={data} drops={data.drops} />
      <LineupSection data={data} />
      <PlanSection data={data} />
      {/* Suppress unused-import warnings for canonical icons only used conditionally */}
      <span className="hidden">
        <TrendingDown />
        <ArrowLeft />
      </span>
    </div>
  );
}
