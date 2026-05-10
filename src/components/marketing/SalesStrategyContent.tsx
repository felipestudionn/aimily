'use client';

/**
 * 04.0 Estrategia de Venta · SalesStrategyContent
 *
 * Sprint B (Block 4) · canonical pattern from Block 2 ScenariosContent,
 * but visually punchy: accent-tinted cards, BIG stats horizontal, benchmark
 * avatars (not text lists), single tagline (not paragraph), compact channel
 * toggles. Felipe feedback 2026-05-10: original was "antiguo, mucho texto,
 * poco intuitivo" — this rewrite trades prose for visual hierarchy.
 *
 * Flow: archetypes → channels → editor → confirmed
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 *            memory/design-accent-palette.md (linen · citronella · moss)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Check,
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

const fmtRange = (r: { min: number; max: number }, suffix = '') =>
  r.min === r.max ? `${r.min}${suffix}` : `${r.min}–${r.max}${suffix}`;

const CHANNEL_ICONS: Record<SalesChannelId, React.ElementType> = {
  own_storefront: Store,
  tiktok_shop: Smartphone,
  community_dm: MessageCircle,
  wholesale_b2b: Building2,
  pop_ups_physical: MapPin,
  marketplaces: ShoppingBag,
};

// Archetype accent for benchmark avatars (paleta aimily)
const ARCHETYPE_AVATAR_BG: Record<SalesArchetypeId, string> = {
  A: 'bg-[#F1EFED]',  // linen
  B: 'bg-[#FFF4CE]',  // citronella
  C: 'bg-[#EDEEE7]',  // moss tint
};

// One-line punchy description per archetype (replaces verbose narrative)
const ARCHETYPE_SHORT_DESC: Record<SalesArchetypeId, string> = {
  A: 'Tienda propia, brand voice como lever, in-stock. Tú construyes la audiencia.',
  B: 'Tu cara es el brand. Drops capsule. Tu audiencia personal es el engine.',
  C: 'Cliente paga primero, tú produces después. Capital-light. 4–20 semanas.',
};

// 2-3 stat pills inline (compact, not big tiles)
function getStatPills(archetype: SalesArchetype): string[] {
  const lev = archetype.levers;
  const capLabel = { low: 'BAJO', medium: 'MEDIO', 'medium-high': 'MEDIO-ALTO', high: 'ALTO' }[lev.capital_initial] || lev.capital_initial.toUpperCase();
  if (archetype.id === 'A') {
    return [
      `Capital ${capLabel}`,
      `Margen ${fmtRange(lev.typical_margin_pct)}%`,
      `CAC €${fmtRange(lev.cac_eur)}`,
    ];
  }
  if (archetype.id === 'B') {
    return [
      `Capital ${capLabel}`,
      `CVR ${fmtRange(lev.typical_cvr_pct)}%`,
      `Día 1 launch`,
    ];
  }
  // C · MTO
  return [
    `Capital ${capLabel}`,
    `Lead ${lev.typical_lead_time_days?.min}–${lev.typical_lead_time_days?.max}d`,
    `Margen ${fmtRange(lev.typical_margin_pct)}%`,
  ];
}

// Benchmark avatar (initial in colored circle)
function BenchmarkAvatar({ brand, archetypeId }: { brand: string; archetypeId: SalesArchetypeId }) {
  const initial = brand.replace(/[^A-Za-z]/, '').charAt(0).toUpperCase() || brand.charAt(0).toUpperCase();
  return (
    <div
      className={`w-7 h-7 rounded-full ${ARCHETYPE_AVATAR_BG[archetypeId]} ring-2 ring-white flex items-center justify-center text-carbon/80 text-[11px] font-semibold tracking-tight shrink-0`}
      title={brand}
    >
      {initial}
    </div>
  );
}

// ── Archetype Card · gold standard (CollectionOverview pattern) ────────────

function ArchetypeCard({
  archetype,
  onSelect,
  loading,
}: {
  archetype: SalesArchetype;
  onSelect: () => void;
  loading: boolean;
}) {
  const stats = getStatPills(archetype);
  const benchmarkBrands = archetype.benchmarks.slice(0, 5);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left disabled:opacity-50 disabled:cursor-wait"
    >
      {/* Ghost number — 72px, carbon/[0.05] (gold standard) */}
      <div className="mb-10">
        <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
          {archetype.id}.
        </span>
      </div>

      {/* Title — 24-28px semibold (gold standard) */}
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
        {archetype.name}
      </h3>

      {/* Description — 14px, carbon/50 (gold standard) · ONE punchy line */}
      <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em] mb-6">
        {ARCHETYPE_SHORT_DESC[archetype.id]}
      </p>

      {/* Stat pills · compact inline */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {stats.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2.5 py-1 rounded-full bg-carbon/[0.04] text-[11px] font-medium text-carbon/65 tracking-[-0.01em]"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Benchmark avatars · subtle row */}
      <div className="flex items-center gap-1.5 mb-1">
        {benchmarkBrands.map((b) => (
          <BenchmarkAvatar key={b.brand} brand={b.brand} archetypeId={archetype.id} />
        ))}
        {archetype.benchmarks.length > 5 && (
          <span className="text-[10px] text-carbon/35 font-medium ml-1">
            +{archetype.benchmarks.length - 5}
          </span>
        )}
      </div>
      <p className="text-[11px] text-carbon/35 leading-relaxed truncate">
        {benchmarkBrands.map((b) => b.brand).join(' · ')}
      </p>

      <div className="flex-1" />

      {/* CTA pill centered (gold standard) */}
      <div className="flex justify-center mt-10">
        <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all bg-carbon text-white group-hover:bg-carbon/90">
          Empezar
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Progress bar 120x6 (gold standard · empty for archetypes) */}
      <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out w-0" />
      </div>
    </button>
  );
}

// ── Channel Card · compact horizontal ─────────────────────────────────────

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
      className={`group relative flex items-start gap-4 bg-white rounded-[18px] p-5 ring-1 transition-all duration-200 text-left ${
        isActive
          ? 'ring-carbon shadow-[0_4px_16px_rgba(0,0,0,0.05)]'
          : 'ring-carbon/[0.06] hover:ring-carbon/[0.2]'
      } ${isLocked ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
          isActive ? 'bg-carbon text-white' : 'bg-carbon/[0.04] text-carbon/55'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="text-[15px] font-semibold text-carbon tracking-[-0.02em] truncate">
            {channel.name}
          </h4>
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? 'bg-carbon border-carbon'
                : 'border-carbon/20 group-hover:border-carbon/40'
            }`}
          >
            {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </div>
        </div>

        {/* Single benchmark stat line */}
        <p className="text-[11px] text-carbon/50 leading-snug line-clamp-2">
          {channel.benchmark_scale_signal}
        </p>

        {/* Tag row */}
        <div className="flex items-center gap-2 mt-2">
          {channel.default_on && (
            <span className="text-[9px] tracking-[0.1em] uppercase text-carbon/40 font-medium">
              Siempre activo
            </span>
          )}
          {!channel.default_on && (
            <span className="text-[9px] tracking-[0.1em] uppercase text-carbon/35 font-medium">
              {channel.templates.length} plantillas auto-generadas
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Editor axis card ───────────────────────────────────────────────────────

function EditorAxisCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[20px] p-7 ring-1 ring-carbon/[0.06]">
      <h4 className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/45 mb-4">
        {title}
      </h4>
      {children}
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
    <EditorAxisCard title="Volumen y catálogo">
      <div className="flex items-baseline gap-3 mb-4">
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
          className="bg-transparent border-0 outline-none text-[64px] md:text-[72px] font-semibold text-carbon tracking-[-0.04em] leading-none w-[160px] focus:text-carbon tabular-nums"
        />
        <span className="text-[14px] text-carbon/45 tracking-[-0.01em]">
          SKUs por drop
        </span>
      </div>

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
            className={`px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${
              editor.volume.catalog_mode === mode
                ? 'bg-carbon text-white'
                : 'bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08]'
            }`}
          >
            {mode === 'permanent' ? 'Permanente' : 'Capsule'}
          </button>
        ))}
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
    <EditorAxisCard title="Cadencia">
      <div className="grid grid-cols-3 gap-4">
        <div>
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
            className="bg-transparent border-0 outline-none text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.03em] leading-none w-full focus:text-carbon tabular-nums"
          />
          <div className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 font-medium mt-1">
            {editor.cadence.drops_frequency_weeks === 0
              ? 'on-demand'
              : 'sem entre drops'}
          </div>
        </div>
        <div>
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
            className="bg-transparent border-0 outline-none text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.03em] leading-none w-full focus:text-carbon tabular-nums"
          />
          <div className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 font-medium mt-1">
            posts/día
          </div>
        </div>
        <div>
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
            className="bg-transparent border-0 outline-none text-[40px] md:text-[44px] font-semibold text-carbon tracking-[-0.03em] leading-none w-full focus:text-carbon tabular-nums"
          />
          <div className="text-[10px] tracking-[0.1em] uppercase text-carbon/40 font-medium mt-1">
            emails/sem
          </div>
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
    <EditorAxisCard title="KPIs primarios · los que vigilas a diario">
      <div className="flex flex-wrap gap-2">
        {editor.kpi_focus.map((kpi, idx) => (
          <div
            key={kpi}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-carbon text-white text-[12px] font-medium"
          >
            <span className="text-[10px] tracking-[0.05em] text-white/55 font-semibold tabular-nums">
              {idx + 1}
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
              className="text-white/50 hover:text-white transition-colors text-[16px] leading-none -mr-0.5"
              aria-label="Quitar"
            >
              ×
            </button>
          </div>
        ))}
        {editor.kpi_focus.length === 0 && (
          <p className="text-[12px] italic text-carbon/40">
            Sin KPIs seleccionados
          </p>
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
  const [data, setData] = useState<SalesStrategyData>({ phase: 'archetypes' });
  const [loadingArchetypes, setLoadingArchetypes] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phase: Phase = data.phase || 'archetypes';
  const archetypes = data.archetypes || [];
  const channelsActivated = data.channels_activated || [];

  // ── Auto-load archetypes ─────────────────────────────────────────────────
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
    if (SALES_CHANNELS.find((c) => c.id === channelId)?.default_on) {
      return;
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

  // Phase: archetypes
  if (phase === 'archetypes') {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="max-w-[640px] mx-auto text-center mb-12">
          <p className="text-[14px] text-carbon/55 leading-relaxed italic">
            Tres modelos económicos del mercado fashion 2025-2026. Reconócete en uno y configuramos el resto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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

  // Phase: channels
  if (phase === 'channels' && chosenArchetype) {
    const compatibleChannels = getChannelsForArchetype(chosenArchetype.id);
    const enabledCount = channelsActivated.filter((c) => c.enabled).length;
    return (
      <div className="max-w-[1100px] mx-auto pb-32">
        {/* Working strategy header */}
        <div className="mb-10 flex items-center justify-between">
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

        <div className="max-w-[640px] mx-auto text-center mb-10">
          <h2 className="text-[32px] md:text-[40px] font-medium text-carbon tracking-[-0.03em] leading-[1.05] mb-3">
            ¿Por dónde vendes?
          </h2>
          <p className="text-[13px] text-carbon/55 leading-relaxed italic">
            Activa los canales que vas a operar · {enabledCount} activo{enabledCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

  // Phase: editor
  if ((phase === 'editor' || phase === 'confirmed') && chosenArchetype && data.editor) {
    const editor = data.editor;
    const enabledChannels = channelsActivated.filter((c) => c.enabled);
    return (
      <div className="max-w-[1100px] mx-auto pb-32">
        <div className="mb-10 flex items-center justify-between">
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
              Estrategia {chosenArchetype.id} · {enabledChannels.length} canal
              {enabledChannels.length !== 1 ? 'es' : ''}
            </div>
            <div className="text-[14px] font-semibold text-carbon tracking-[-0.02em]">
              {chosenArchetype.name}
            </div>
          </div>
        </div>

        <div className="max-w-[640px] mx-auto text-center mb-10">
          <h2 className="text-[32px] md:text-[40px] font-medium text-carbon tracking-[-0.03em] leading-[1.05] mb-3">
            Configura tu operación
          </h2>
          <p className="text-[13px] text-carbon/55 leading-relaxed italic">
            Tres números que definen tu ritmo · ya pre-fillados desde tu estrategia
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                {chosenArchetype.name} con {enabledChannels.length} canal
                {enabledChannels.length !== 1 ? 'es' : ''}. Sales Dashboard, Content
                Studio y GTM se han pre-fillado con esta configuración.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto py-20 text-center">
      <Loader2 className="h-6 w-6 mx-auto mb-4 text-carbon/30 animate-spin" />
      <p className="text-[14px] text-carbon/55">Cargando…</p>
    </div>
  );
}
