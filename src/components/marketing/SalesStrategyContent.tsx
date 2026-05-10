'use client';

/**
 * 04.0 Estrategia de Venta · SalesStrategyContent
 *
 * Sprint B (Block 4) · canonical pattern verbatim from Block 2 ScenariosContent.
 *
 * Flow:
 *   archetypes (3 cards) → channels (multi-select) → editor (3 axis) → confirmed
 *
 * Persistence:
 *   - /api/sales-strategy-confirm writes marketing.sales_strategy.* to CIS
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Check,
  TrendingDown,
  Wallet,
  Calendar,
  Target,
  Percent,
  Layers,
  Store,
  Smartphone,
  MessageCircle,
  Building2,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import { CanonicalActionBar } from '@/components/workspace/CanonicalActionBar';
import type {
  SalesArchetype,
  SalesChannelDefinition,
  SalesArchetypeId,
  SalesChannelId,
  ChannelActivation,
  SalesStrategyEditorPrefill,
} from '@/types/sales-strategy';
import { SALES_ARCHETYPES } from '@/lib/sales-strategy/archetypes';
import { SALES_CHANNELS, getChannelsForArchetype } from '@/lib/sales-strategy/channels';

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = 'archetypes' | 'channels' | 'editor' | 'confirmed';

interface SalesStrategyData {
  phase?: Phase;
  archetypes?: SalesArchetype[];
  archetypes_at?: string;
  chosen_archetype_id?: SalesArchetypeId;
  channels_activated?: ChannelActivation[];
  editor?: SalesStrategyEditorPrefill;
}

interface Props {
  collectionPlanId: string;
  onConfirmed?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M€` : n >= 1000 ? `${Math.round(n / 1000)}K€` : `${n}€`;

const fmtRange = (r: { min: number; max: number }, suffix = '') =>
  r.min === r.max ? `${r.min}${suffix}` : `${r.min}–${r.max}${suffix}`;

const fmtEurRange = (r: { min: number; max: number }) =>
  r.min === r.max ? fmtEur(r.min) : `${fmtEur(r.min)}–${fmtEur(r.max)}`;

const CHANNEL_ICONS: Record<SalesChannelId, React.ElementType> = {
  own_storefront: Store,
  tiktok_shop: Smartphone,
  community_dm: MessageCircle,
  wholesale_b2b: Building2,
  pop_ups_physical: MapPin,
  marketplaces: ShoppingBag,
};

const CAPITAL_LABEL: Record<string, string> = {
  low: 'BAJA',
  medium: 'MEDIA',
  'medium-high': 'MEDIA-ALTA',
  high: 'ALTA',
};

// ── Archetype Card ─────────────────────────────────────────────────────────

function ArchetypeCard({
  archetype,
  onSelect,
  loading,
}: {
  archetype: SalesArchetype;
  onSelect: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className="group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[600px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-carbon/[0.06] disabled:opacity-50 disabled:cursor-wait"
    >
      <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
        Estrategia {archetype.id}
      </div>
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-2">
        {archetype.name}
      </h3>
      <p className="text-[12px] italic text-carbon/55 mb-4 leading-relaxed">
        {archetype.tagline}
      </p>
      <p className="text-[13px] text-carbon/65 leading-relaxed mb-5">
        {archetype.narrative}
      </p>

      {/* 4 stat tiles */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex items-start gap-2">
          <Wallet className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">
              Capital inicial
            </div>
            <div className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {CAPITAL_LABEL[archetype.levers.capital_initial] || archetype.levers.capital_initial}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">
              Tiempo a primer revenue
            </div>
            <div className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {archetype.levers.time_to_first_revenue}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Target className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">
              CAC esperado
            </div>
            <div className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {fmtEurRange(archetype.levers.cac_eur)}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Percent className="h-3.5 w-3.5 text-carbon/35 mt-0.5 shrink-0" />
          <div>
            <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">
              Margen
            </div>
            <div className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
              {fmtRange(archetype.levers.typical_margin_pct, '%')}
            </div>
          </div>
        </div>
      </div>

      {/* Benchmarks */}
      <div className="pt-4 border-t border-carbon/[0.06] mb-4">
        <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-2">
          Marcas similares
        </div>
        <div className="space-y-1.5">
          {archetype.benchmarks.slice(0, 5).map((b, i) => (
            <div key={i} className="text-[12px] text-carbon/70 leading-snug">
              <span className="font-medium">{b.brand}</span>
              <span className="text-carbon/50">
                {' · '}
                {b.country}
                {' · '}
                {b.scale}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Best for */}
      <div className="mt-auto pt-3 border-t border-carbon/[0.06]">
        <div className="text-[10px] tracking-[0.1em] uppercase font-semibold text-carbon/40 mb-1.5">
          Mejor para
        </div>
        <p className="text-[12px] text-carbon/55 leading-relaxed">
          {archetype.best_for}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-5 flex items-center justify-end text-[12px] font-semibold text-carbon group-hover:gap-2 transition-all gap-1.5">
        <span>Trabajar con esta estrategia</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

// ── Channel multi-select card ──────────────────────────────────────────────

function ChannelCard({
  channel,
  isActive,
  isLocked,
  onToggle,
}: {
  channel: SalesChannelDefinition;
  isActive: boolean;
  isLocked: boolean;
  onToggle: () => void;
}) {
  const Icon = CHANNEL_ICONS[channel.id];
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLocked}
      className={`group relative flex flex-col text-left bg-white rounded-[20px] p-7 ring-1 transition-all duration-300 ${
        isActive
          ? 'ring-carbon shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
          : 'ring-carbon/[0.06] hover:ring-carbon/[0.18]'
      } ${isLocked ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01]'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            isActive ? 'bg-carbon text-white' : 'bg-carbon/[0.04] text-carbon/55'
          }`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-[16px] font-semibold text-carbon tracking-[-0.02em]">
              {channel.name}
            </h4>
            {channel.default_on && (
              <p className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 font-medium mt-0.5">
                Siempre activo
              </p>
            )}
          </div>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isActive
            ? 'bg-carbon border-carbon'
            : 'border-carbon/20 group-hover:border-carbon/40'
        }`}>
          {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
      </div>

      <p className="text-[12px] text-carbon/60 leading-relaxed mb-3">
        {channel.description}
      </p>

      {/* Benchmark scale signal */}
      <div className="text-[11px] italic text-carbon/45 leading-relaxed mb-3">
        {channel.benchmark_scale_signal}
      </div>

      {/* Templates count */}
      <div className="mt-auto pt-3 border-t border-carbon/[0.06] flex items-center gap-2 text-[10px] tracking-[0.05em] uppercase text-carbon/40 font-medium">
        <Layers className="h-3 w-3" />
        <span>{channel.templates.length} plantillas que aimily genera</span>
      </div>
    </button>
  );
}

// ── Editor axis card ───────────────────────────────────────────────────────

function EditorAxisCard({
  title,
  description,
  children,
  reasoning,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  reasoning?: string;
}) {
  return (
    <div className="bg-white rounded-[20px] p-7 ring-1 ring-carbon/[0.06]">
      <h4 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-[12px] text-carbon/50 mb-4 leading-relaxed">{description}</p>
      )}
      {children}
      {reasoning && (
        <p className="text-[11px] italic text-carbon/40 mt-4 pt-3 border-t border-carbon/[0.06] leading-relaxed">
          aimily propone: {reasoning}
        </p>
      )}
    </div>
  );
}

// ── Volume axis ────────────────────────────────────────────────────────────

function VolumeAxis({
  editor,
  onChange,
}: {
  editor: SalesStrategyEditorPrefill;
  onChange: (e: SalesStrategyEditorPrefill) => void;
}) {
  return (
    <EditorAxisCard
      title="Volumen y catálogo"
      description="¿Cuántos SKUs por drop y cómo gestionas el catálogo?"
      reasoning={editor.reasoning?.volume}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-2 block">
            SKUs por drop
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={editor.volume.skus_per_drop}
            onChange={(e) =>
              onChange({
                ...editor,
                volume: {
                  ...editor.volume,
                  skus_per_drop: Math.max(1, Number(e.target.value) || 0),
                },
              })
            }
            className="w-full px-4 py-3 text-[24px] font-semibold text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none transition-colors tabular-nums tracking-[-0.02em]"
          />
        </div>
        <div>
          <label className="text-[11px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-2 block">
            Modo de catálogo
          </label>
          <div className="flex gap-2">
            {(['permanent', 'capsule'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  onChange({
                    ...editor,
                    volume: { ...editor.volume, catalog_mode: mode },
                  })
                }
                className={`flex-1 px-4 py-3 rounded-[12px] text-[13px] font-medium transition-colors ${
                  editor.volume.catalog_mode === mode
                    ? 'bg-carbon text-white'
                    : 'bg-carbon/[0.03] text-carbon/60 hover:bg-carbon/[0.06]'
                }`}
              >
                {mode === 'permanent' ? 'Permanente' : 'Capsule'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </EditorAxisCard>
  );
}

// ── Cadence axis ───────────────────────────────────────────────────────────

function CadenceAxis({
  editor,
  onChange,
}: {
  editor: SalesStrategyEditorPrefill;
  onChange: (e: SalesStrategyEditorPrefill) => void;
}) {
  return (
    <EditorAxisCard
      title="Cadencia de drops"
      description="¿Cada cuánto lanzas y con qué frecuencia comunicas?"
      reasoning={editor.reasoning?.cadence}
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-2 block">
            Drops cada
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={52}
              value={editor.cadence.drops_frequency_weeks}
              onChange={(e) =>
                onChange({
                  ...editor,
                  cadence: {
                    ...editor.cadence,
                    drops_frequency_weeks: Math.max(0, Number(e.target.value) || 0),
                  },
                })
              }
              className="w-full px-3 py-2.5 text-[18px] font-semibold text-carbon bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none transition-colors tabular-nums"
            />
            <span className="text-[12px] text-carbon/50 whitespace-nowrap">semanas</span>
          </div>
          {editor.cadence.drops_frequency_weeks === 0 && (
            <p className="text-[10px] italic text-carbon/40 mt-1">on-demand</p>
          )}
        </div>
        <div>
          <label className="text-[11px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-2 block">
            Posts/día
          </label>
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={editor.cadence.posts_per_day}
            onChange={(e) =>
              onChange({
                ...editor,
                cadence: {
                  ...editor.cadence,
                  posts_per_day: Math.max(0, Number(e.target.value) || 0),
                },
              })
            }
            className="w-full px-3 py-2.5 text-[18px] font-semibold text-carbon bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none transition-colors tabular-nums"
          />
        </div>
        <div>
          <label className="text-[11px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-2 block">
            Emails/semana
          </label>
          <input
            type="number"
            min={0}
            max={14}
            step={0.5}
            value={editor.cadence.emails_per_week}
            onChange={(e) =>
              onChange({
                ...editor,
                cadence: {
                  ...editor.cadence,
                  emails_per_week: Math.max(0, Number(e.target.value) || 0),
                },
              })
            }
            className="w-full px-3 py-2.5 text-[18px] font-semibold text-carbon bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none transition-colors tabular-nums"
          />
        </div>
      </div>
    </EditorAxisCard>
  );
}

// ── KPIs axis ──────────────────────────────────────────────────────────────

const KPI_LABELS: Record<string, string> = {
  conversion_rate: 'Conversion rate',
  aov: 'AOV',
  cac_payback: 'CAC payback',
  email_capture_rate: 'Email capture',
  repeat_purchase_rate: 'Repeat purchase',
  sellthrough_first_24h: 'Sellthrough 24h',
  founder_engagement_rate: 'Founder engagement',
  drop_to_drop_repeat_rate: 'Drop-to-drop repeat',
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
  live_session_gmv: 'LIVE session GMV',
  return_rate: 'Return rate',
  video_to_order_cvr: 'Video-to-order CVR',
  dm_to_order_cvr: 'DM-to-order CVR',
  broadcast_list_size: 'Broadcast list size',
  median_response_time_min: 'Response time',
  abandoned_cart_recovery_rate: 'Cart recovery',
  wholesale_orders_pending: 'B2B orders pending',
  net30_collection_rate: 'Net30 collection',
  reorder_rate: 'Reorder rate',
  in_person_revenue: 'In-person revenue',
  footfall: 'Footfall',
  ig_capture_at_event: 'IG capture (event)',
  cross_listing_cvr: 'Cross-listing CVR',
  resale_velocity: 'Resale velocity',
};

function KpisAxis({
  editor,
  onChange,
}: {
  editor: SalesStrategyEditorPrefill;
  onChange: (e: SalesStrategyEditorPrefill) => void;
}) {
  return (
    <EditorAxisCard
      title="KPIs primarios"
      description="Los que vas a vigilar diariamente. Pre-fill por archetype + canales activados."
      reasoning={editor.reasoning?.kpi_focus}
    >
      <div className="flex flex-wrap gap-2">
        {editor.kpi_focus.map((kpi, idx) => (
          <div
            key={kpi}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-carbon text-white text-[12px] font-medium"
          >
            <span className="text-[10px] tracking-[0.05em] text-white/60 font-semibold">
              {idx + 1}.
            </span>
            <span>{KPI_LABELS[kpi] || kpi}</span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...editor,
                  kpi_focus: editor.kpi_focus.filter((k) => k !== kpi),
                })
              }
              className="text-white/50 hover:text-white transition-colors text-[14px] leading-none"
              aria-label="Quitar"
            >
              ×
            </button>
          </div>
        ))}
        {editor.kpi_focus.length === 0 && (
          <p className="text-[12px] italic text-carbon/40">Sin KPIs seleccionados</p>
        )}
      </div>
    </EditorAxisCard>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SalesStrategyContent({
  collectionPlanId,
  onConfirmed,
}: Props) {
  const t = useTranslation();
  void t; // i18n placeholder for Sprint H sweep

  const [data, setData] = useState<SalesStrategyData>({ phase: 'archetypes' });
  const [loadingArchetypes, setLoadingArchetypes] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phase: Phase = data.phase || 'archetypes';
  const archetypes = data.archetypes || [];
  const channelsActivated = data.channels_activated || [];

  // ── Auto-load archetypes (deterministic, no AI) ─────────────────────────
  const fetchArchetypes = useCallback(async () => {
    if (loadingArchetypes) return;
    setLoadingArchetypes(true);
    setError(null);
    try {
      const res = await fetch('/api/sales-strategy-archetypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      const j = await res.json();
      const list = (j.result?.archetypes as SalesArchetype[]) || SALES_ARCHETYPES;
      setData((d) => ({
        ...d,
        archetypes: list,
        archetypes_at: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[SalesStrategy] fetchArchetypes failed', err);
      // Fallback to static data
      setData((d) => ({ ...d, archetypes: SALES_ARCHETYPES }));
      setError(null);
    } finally {
      setLoadingArchetypes(false);
    }
  }, [collectionPlanId, loadingArchetypes]);

  useEffect(() => {
    if (phase === 'archetypes' && archetypes.length === 0 && !loadingArchetypes) {
      fetchArchetypes();
    }
  }, [phase, archetypes.length, loadingArchetypes, fetchArchetypes]);

  // ── Phase: archetypes → channels ────────────────────────────────────────

  const handleSelectArchetype = (archetype: SalesArchetype) => {
    // Initialize channelsActivated with own_storefront ON, others available
    const initial: ChannelActivation[] = SALES_CHANNELS.map((c) => ({
      channel: c.id,
      enabled: c.default_on,
      share_pct: undefined,
    }));
    setData((d) => ({
      ...d,
      chosen_archetype_id: archetype.id,
      channels_activated: initial,
      phase: 'channels',
    }));
  };

  // ── Phase: channels → editor ────────────────────────────────────────────

  const toggleChannel = (channelId: SalesChannelId) => {
    const current = channelsActivated.find((c) => c.channel === channelId);
    if (current && SALES_CHANNELS.find((c) => c.id === channelId)?.default_on) {
      return; // own_storefront cannot be disabled
    }
    const next = channelsActivated.map((c) =>
      c.channel === channelId ? { ...c, enabled: !c.enabled } : c,
    );
    setData((d) => ({ ...d, channels_activated: next }));
  };

  const handleChannelsConfirmed = async () => {
    if (!data.chosen_archetype_id) return;
    setLoadingPrefill(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/sales-strategy-prefill-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          archetypeId: data.chosen_archetype_id,
          channelsActivated,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      const j = await res.json();
      const editor = j.result?.editor as SalesStrategyEditorPrefill | undefined;
      if (!editor) throw new Error('Editor prefill missing in response');
      setData((d) => ({ ...d, editor, phase: 'editor' }));
    } catch (err) {
      console.error('[SalesStrategy] prefill failed', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el editor');
    } finally {
      setLoadingPrefill(false);
    }
  };

  // ── Phase: editor → confirm ─────────────────────────────────────────────

  const handleEditorChange = (next: SalesStrategyEditorPrefill) => {
    setData((d) => ({ ...d, editor: next }));
  };

  const handleConfirm = async () => {
    if (!data.chosen_archetype_id || !data.editor) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/sales-strategy-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          archetypeId: data.chosen_archetype_id,
          channelsActivated,
          editor: data.editor,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      setData((d) => ({ ...d, phase: 'confirmed' }));
      onConfirmed?.();
    } catch (err) {
      console.error('[SalesStrategy] confirm failed', err);
      setError(err instanceof Error ? err.message : 'Error al confirmar la estrategia');
    } finally {
      setConfirming(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  // Phase: archetypes loading
  if (phase === 'archetypes' && archetypes.length === 0) {
    if (loadingArchetypes) {
      return (
        <div className="max-w-[700px] mx-auto py-20 text-center">
          <Loader2 className="h-6 w-6 mx-auto mb-4 text-carbon/30 animate-spin" />
          <p className="text-[14px] text-carbon/55">Cargando estrategias…</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="max-w-[700px] mx-auto bg-red-50 border border-red-200 rounded-[14px] p-5 text-[13px] text-red-800 flex items-start gap-3">
          <span className="flex-1">{error}</span>
          <button
            onClick={fetchArchetypes}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
        </div>
      );
    }
  }

  // Phase: archetypes (3 cards)
  if (phase === 'archetypes') {
    return (
      <div className="max-w-[1600px] mx-auto">
        <div className="max-w-[760px] mx-auto text-center mb-10">
          <p className="text-[14px] text-carbon/55 leading-relaxed italic">
            Tres modelos económicos del mercado fashion 2025-2026. Elige el que se parezca a tu situación — luego
            configuras los canales y la operación juntos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {archetypes.map((a) => (
            <ArchetypeCard
              key={a.id}
              archetype={a}
              loading={loadingPrefill}
              onSelect={() => handleSelectArchetype(a)}
            />
          ))}
        </div>

        {error && (
          <div className="max-w-[700px] mx-auto mt-6 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
            {error}
          </div>
        )}
      </div>
    );
  }

  const chosenArchetype = archetypes.find((a) => a.id === data.chosen_archetype_id);

  // Phase: channels (multi-select)
  if (phase === 'channels' && chosenArchetype) {
    const compatibleChannels = getChannelsForArchetype(chosenArchetype.id);
    return (
      <div className="max-w-[1400px] mx-auto pb-32">
        {/* Working strategy header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setData((d) => ({ ...d, phase: 'archetypes' }))}
            className="inline-flex items-center gap-1.5 text-[12px] text-carbon/50 hover:text-carbon transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cambiar estrategia
          </button>
          <div className="text-right">
            <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
              Estrategia {chosenArchetype.id}
            </div>
            <div className="text-[14px] font-semibold text-carbon tracking-[-0.02em]">
              {chosenArchetype.name}
            </div>
          </div>
        </div>

        <div className="max-w-[760px] mx-auto text-center mb-8">
          <h2 className="text-[28px] md:text-[32px] font-medium text-carbon tracking-[-0.03em] leading-[1.15] mb-3">
            ¿Por dónde vendes?
          </h2>
          <p className="text-[14px] text-carbon/55 leading-relaxed italic">
            Activa los canales que vas a operar. Tu tienda propia siempre está activa. Los demás son opt-in y se pueden
            activar después.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {compatibleChannels.map((c) => {
            const activation = channelsActivated.find((a) => a.channel === c.id);
            const isActive = activation?.enabled ?? false;
            return (
              <ChannelCard
                key={c.id}
                channel={c}
                isActive={isActive}
                isLocked={c.default_on}
                onToggle={() => toggleChannel(c.id)}
              />
            );
          })}
        </div>

        {error && (
          <div className="max-w-[700px] mx-auto mt-6 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
            {error}
          </div>
        )}

        <CanonicalActionBar
          onModify={() => setData((d) => ({ ...d, phase: 'archetypes' }))}
          onConfirm={handleChannelsConfirmed}
          modifyLabel="Cambiar estrategia"
          confirmLabel="Configurar operación"
          loading={loadingPrefill}
          confirmDisabled={loadingPrefill}
        />
      </div>
    );
  }

  // Phase: editor (3 axis)
  if ((phase === 'editor' || phase === 'confirmed') && chosenArchetype && data.editor) {
    const editor = data.editor;
    const enabledChannels = channelsActivated.filter((c) => c.enabled);
    return (
      <div className="max-w-[1200px] mx-auto pb-32">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setData((d) => ({ ...d, phase: 'channels' }))}
            className="inline-flex items-center gap-1.5 text-[12px] text-carbon/50 hover:text-carbon transition-colors"
            disabled={phase === 'confirmed'}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cambiar canales
          </button>
          <div className="text-right">
            <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
              Operación · Estrategia {chosenArchetype.id}
            </div>
            <div className="text-[14px] font-semibold text-carbon tracking-[-0.02em]">
              {chosenArchetype.name}
            </div>
          </div>
        </div>

        <div className="max-w-[760px] mx-auto text-center mb-8">
          <h2 className="text-[28px] md:text-[32px] font-medium text-carbon tracking-[-0.03em] leading-[1.15] mb-3">
            Configura tu operación
          </h2>
          <p className="text-[14px] text-carbon/55 leading-relaxed italic">
            Tres decisiones operacionales · {enabledChannels.length} canal{enabledChannels.length !== 1 ? 'es' : ''} activo{enabledChannels.length !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VolumeAxis editor={editor} onChange={handleEditorChange} />
          <CadenceAxis editor={editor} onChange={handleEditorChange} />
          <div className="lg:col-span-2">
            <KpisAxis editor={editor} onChange={handleEditorChange} />
          </div>
        </div>

        {error && (
          <div className="max-w-[700px] mx-auto mt-6 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
            {error}
          </div>
        )}

        <CanonicalActionBar
          onModify={() => setData((d) => ({ ...d, phase: 'channels' }))}
          onConfirm={handleConfirm}
          modifyLabel="Cambiar canales"
          confirmLabel={
            phase === 'confirmed'
              ? 'Confirmado'
              : confirming
              ? 'Confirmando…'
              : 'Confirmar Estrategia'
          }
          confirmDisabled={phase === 'confirmed' || confirming}
          loading={confirming}
        />

        {phase === 'confirmed' && (
          <div className="max-w-[700px] mx-auto mt-6 bg-emerald-50 border border-emerald-200 rounded-[14px] p-4 text-[13px] text-emerald-800 flex items-start gap-3">
            <Check className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">Estrategia confirmada</p>
              <p className="text-emerald-700/80">
                {chosenArchetype.name} con {enabledChannels.length} canal{enabledChannels.length !== 1 ? 'es' : ''}.
                Sales Dashboard, Content Studio y GTM se han pre-fillado con esta configuración.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Loading prefill
  return (
    <div className="max-w-[700px] mx-auto py-20 text-center">
      <Loader2 className="h-6 w-6 mx-auto mb-4 text-carbon/30 animate-spin" />
      <p className="text-[14px] text-carbon/55">Cargando…</p>
      <TrendingDown className="h-0 w-0 hidden" />
    </div>
  );
}
