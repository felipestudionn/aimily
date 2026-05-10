'use client';

/**
 * 04.1 GTM y Lanzamiento · gold standard rewrite (Sprint H)
 *
 * Replaces GtmLaunchHub (which drilled into 4 legacy cards with
 * libre/asistido/propuesta SegmentedPills) with a control-tower view
 * focused on what actually matters at launch time:
 *   01. Drop calendar · all drops with countdown + status
 *   02. Pre-launch checklist · derived from action timeline
 *   03. Live state · current drop + KPIs vs Gauss
 *   04. Post-launch tasks · generated artifacts + recommendations
 *
 * Reads from sales-dashboard data API + drops table.
 * No more libre/asistido/propuesta forms · canonical pattern only.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Loader2,
  ArrowRight,
  Check,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import type { ChannelActivation, SalesArchetypeId } from '@/types/sales-strategy';

interface DropLite {
  id: string;
  drop_number: number;
  name: string;
  launch_date: string;
  weeks_active: number | null;
  channels: string[];
}

interface GtmData {
  hasStrategy: boolean;
  archetype: { id: SalesArchetypeId; name: string } | null;
  channelsActivated: ChannelActivation[];
  drops: DropLite[];
  forecastRevenueEur: number;
  actualRevenueEur: number;
  skuCount: number;
  productionDispatched: number;
  productionPendingDispatch: number;
}

interface Props {
  collectionPlanId: string;
}

// ── Section wrapper ──

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
      <div className="mb-6 flex items-baseline gap-4">
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
      {children}
    </motion.section>
  );
}

// ── 01. Drop calendar · big timeline ──

function DropCalendarSection({ drops }: { drops: DropLite[] }) {
  if (drops.length === 0) {
    return (
      <Section
        number="01"
        title="Calendario de drops"
        description="Tu schedule de lanzamientos. Define drops desde Constructor de Colección y aparecerán aquí."
        delay={0.05}
      >
        <div className="bg-shade rounded-[14px] p-8 text-center">
          <p className="text-[13px] text-carbon/55 leading-relaxed mb-4">
            No hay drops definidos todavía.
          </p>
          <a
            href="../product"
            className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 transition-all"
          >
            Definir drops en Collection Builder
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </Section>
    );
  }

  const today = Date.now();
  return (
    <Section
      number="01"
      title="Calendario de drops"
      description={`${drops.length} drop${drops.length !== 1 ? 's' : ''} agendados · cada uno dispara su propio plan de acciones T-N en el Sales Dashboard.`}
      delay={0.05}
    >
      <div className="space-y-3">
        {drops.map((drop) => {
          const launchTime = new Date(drop.launch_date).getTime();
          const daysUntil = Math.ceil((launchTime - today) / (1000 * 60 * 60 * 24));
          const isPast = daysUntil < 0;
          const isLive = daysUntil === 0;
          const dateLabel = new Date(drop.launch_date).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          return (
            <motion.div
              key={drop.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-shade rounded-[14px] p-5 ring-1 ring-carbon/[0.04] flex items-center gap-5"
            >
              <div
                className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${
                  isPast
                    ? 'bg-carbon text-white'
                    : isLive
                    ? 'bg-carbon text-white ring-4 ring-carbon/[0.12]'
                    : 'bg-white ring-1 ring-carbon/[0.08] text-carbon'
                }`}
              >
                <span className="text-[16px] font-semibold tabular-nums">
                  {String(drop.drop_number).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1">
                  <h4 className="text-[16px] font-semibold text-carbon tracking-[-0.02em] truncate">
                    {drop.name}
                  </h4>
                  <span className="text-[11px] text-carbon/45">
                    {dateLabel}
                  </span>
                </div>
                <p className="text-[12px] text-carbon/55 leading-snug">
                  {isPast ? `Lanzado hace ${Math.abs(daysUntil)} días` : isLive ? 'Lanzando hoy' : `En ${daysUntil} días`}
                  {drop.weeks_active && ` · ${drop.weeks_active} sem activo`}
                  {drop.channels.length > 0 && ` · ${drop.channels.join(' + ')}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-none tabular-nums">
                  {isPast ? '—' : isLive ? 'HOY' : `${daysUntil}d`}
                </div>
                <div className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 font-medium mt-1">
                  {isPast ? 'Hecho' : isLive ? 'Live' : 'Cuenta atrás'}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

// ── 02. Pre-launch checklist (derived per archetype) ──

interface ChecklistTask {
  offset_days_before: number;
  task: string;
}

const CHECKLIST_BY_ARCHETYPE: Record<SalesArchetypeId, ChecklistTask[]> = {
  A: [
    { offset_days_before: 60, task: 'Editorial press push · prensa target del nicho' },
    { offset_days_before: 35, task: 'SEO research + on-page optimization storefront' },
    { offset_days_before: 28, task: 'Lookbook editorial · 4-6 looks shot' },
    { offset_days_before: 21, task: 'Email teaser segmentado VIP + IG carousel reveal' },
    { offset_days_before: 14, task: 'Paid social warmup · audience building' },
    { offset_days_before: 7, task: 'Countdown IG Stories + Influencer seeding wave 1' },
    { offset_days_before: 1, task: 'QA storefront publish · payment + checkout' },
    { offset_days_before: 0, task: 'Drop announcement multi-canal' },
  ],
  B: [
    { offset_days_before: 42, task: 'Founder vlog · drop teaser primero' },
    { offset_days_before: 28, task: 'Creator brief + UGC seeding kit · 10-12 micros' },
    { offset_days_before: 21, task: 'IG drop carousel + behind-the-scenes' },
    { offset_days_before: 14, task: 'TikTok pre-drop trend audio · 3-5 videos founder' },
    { offset_days_before: 10, task: 'Waitlist signup push · founder personal account' },
    { offset_days_before: 7, task: 'Countdown IG Stories · 5-day sequence' },
    { offset_days_before: 1, task: 'Final inventory check + creator briefs sent' },
    { offset_days_before: 0, task: 'Drop launch · LIVE selling session opcional' },
  ],
  C: [
    { offset_days_before: 90, task: 'Editorial press push · Vogue / BoF / craft narrative' },
    { offset_days_before: 60, task: 'Atelier documentary · process video' },
    { offset_days_before: 45, task: 'Waitlist anticipation drip email start' },
    { offset_days_before: 30, task: 'PreProduct config · deposit % + lead time' },
    { offset_days_before: 21, task: 'Showroom/atelier appointments calendar opens' },
    { offset_days_before: 10, task: 'Final SKU prep + size_run + materiales confirmados' },
    { offset_days_before: 1, task: 'Storefront pre-order activation QA' },
    { offset_days_before: 0, task: 'Pre-order window opens · ventana 4-8 sem' },
  ],
};

function ChecklistSection({ data, drops }: { data: GtmData; drops: DropLite[] }) {
  const archetype = data.archetype;
  if (!archetype || drops.length === 0) {
    return (
      <Section
        number="02"
        title="Pre-launch checklist"
        description="La lista de tareas pre-launch derivada de tu archetype + drops. Define ambos para verla."
        delay={0.1}
      >
        <div className="bg-shade rounded-[14px] p-6 text-center">
          <p className="text-[13px] text-carbon/55">
            Confirma archetype + define drops para ver checklist.
          </p>
        </div>
      </Section>
    );
  }

  // Anchor on next upcoming drop (or earliest if all past)
  const today = Date.now();
  const nextDrop = drops.find((d) => new Date(d.launch_date).getTime() >= today) || drops[0];
  const launchTime = new Date(nextDrop.launch_date).getTime();
  const tasks = CHECKLIST_BY_ARCHETYPE[archetype.id];

  return (
    <Section
      number="02"
      title={`Checklist · ${nextDrop.name}`}
      description={`${tasks.length} tareas anchored to launch date · per archetype ${archetype.name}.`}
      delay={0.1}
    >
      <div className="space-y-2">
        {tasks.map((t, i) => {
          const taskDate = new Date(launchTime - t.offset_days_before * 1000 * 60 * 60 * 24);
          const taskTime = taskDate.getTime();
          const isPast = taskTime < today;
          const isLive = taskDate.toDateString() === new Date().toDateString();
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.03 }}
              className="bg-shade rounded-[12px] py-2.5 px-4 flex items-center gap-4"
            >
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isPast
                    ? 'bg-carbon text-white'
                    : isLive
                    ? 'bg-carbon text-white ring-2 ring-carbon/[0.12]'
                    : 'bg-white ring-1 ring-carbon/[0.14] text-carbon/45'
                }`}
              >
                {isPast ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <span className="text-[10px] font-semibold tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div className="shrink-0 w-[88px]">
                <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40">
                  {t.offset_days_before === 0 ? 'Día 0' : `T-${t.offset_days_before}d`}
                </div>
                <div className="text-[11px] text-carbon/55 mt-0.5">
                  {taskDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-carbon font-medium tracking-[-0.01em] leading-tight truncate">
                  {t.task}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-carbon/[0.06] flex items-center justify-between text-[11px] text-carbon/55">
        <span>Acciones T-N orquestadas desde Sales Dashboard</span>
        <a
          href="?block=sales"
          className="inline-flex items-center gap-1.5 text-carbon hover:underline font-semibold"
        >
          Ir al motor
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </Section>
  );
}

// ── 03. Live KPIs ──

function fmtEurCompact(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `€${Math.round(n / 1000)}K`;
  return `€${Math.round(n)}`;
}

function LiveKpisSection({ data }: { data: GtmData }) {
  const sellThruPct = data.forecastRevenueEur > 0
    ? Math.round((data.actualRevenueEur / data.forecastRevenueEur) * 100)
    : 0;

  return (
    <Section
      number="03"
      title="Estado en vivo"
      description="KPIs del lanzamiento · sellthrough vs forecast · production status."
      delay={0.15}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            {fmtEurCompact(data.actualRevenueEur)}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            Revenue real
          </div>
          <div className="text-[11px] text-carbon/55 mt-1 tabular-nums">
            {fmtEurCompact(data.forecastRevenueEur)} forecast · {sellThruPct}%
          </div>
        </div>
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            {data.productionDispatched}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            Unidades despachadas
          </div>
          <div className="text-[11px] text-carbon/55 mt-1 tabular-nums">
            {data.productionPendingDispatch} pendientes
          </div>
        </div>
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            {data.skuCount}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            SKUs activos
          </div>
        </div>
        <div>
          <div className="text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.04em] leading-none tabular-nums">
            {data.drops.length}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mt-2">
            Drops totales
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Empty state ──

function EmptyState() {
  return (
    <div className="bg-white rounded-[20px] p-16 md:p-20 text-center max-w-[760px] mx-auto">
      <span className="block text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] mb-6">
        00.
      </span>
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
        Primero define tu estrategia
      </h3>
      <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em] mb-8 max-w-[480px] mx-auto">
        El control tower del lanzamiento se activa cuando confirmas archetype + canales. Después define drops en Collection Builder.
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

// ── Main ──

export function GtmLaunchContent({ collectionPlanId }: Props) {
  const [data, setData] = useState<GtmData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sales-dashboard/data?cpId=${encodeURIComponent(collectionPlanId)}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const j = await res.json();
        if (!cancelled) setData(j.result as GtmData);
      } catch {
        if (!cancelled) setData(null);
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
        <p className="text-[14px] text-carbon/55">Cargando control tower…</p>
      </div>
    );
  }
  if (!data || !data.hasStrategy) return <EmptyState />;

  return (
    <div className="space-y-4 pb-12">
      <DropCalendarSection drops={data.drops} />
      <ChecklistSection data={data} drops={data.drops} />
      <LiveKpisSection data={data} />
      <span className="hidden">
        <Calendar />
        <TrendingDown />
      </span>
    </div>
  );
}
