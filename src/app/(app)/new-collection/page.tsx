'use client';

/* ═══════════════════════════════════════════════════════════════════════
   /new-collection — single-screen, single-decision entry to the tool.

   1. Land → see the 40-week timeline as 4 colored bands.
   2. Adjust launch date inline (the only required field).
   3. Click "Empezar" → the canvas fades, then we navigate to the real
      /collection/[id] where the WorkspaceShell takes over.

   Plain fade transition. No layout morph — that turned out to be too
   fragile across the heavy WorkspaceShell mount, so we keep the entry
   simple and reliable: the bands fade out, the wizard loads.
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, X, Calendar, Image as ImageIcon, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimelinePreview } from '@/components/new-collection/TimelinePreview';
import { track, Events } from '@/lib/posthog';

/** Default launch ≈ 6 months from today, snapped to the 1st of the month. */
function defaultLaunchDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Derive SS/FW season label from launch date.
 *   • Jan–Jul launch → SS of that calendar year (e.g. "SS27").
 *   • Aug–Dec launch → FW of that calendar year (e.g. "FW26").
 */
function deriveSeason(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth(); // 0 = Jan
  const year = d.getFullYear();
  if (month >= 7) return `FW${String(year).slice(2)}`;
  return `SS${String(year).slice(2)}`;
}

function defaultName(season: string, untitledLabel: string): string {
  return `${untitledLabel} · ${season}`;
}

type View = 'intent' | 'pick-date' | 'leaving';

function NewCollectionFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslation();
  const { language } = useLanguage();

  // Skip the intent selector when we come from a place that already knows
  // the user wants to create a collection (e.g. the "+ nueva colección" CTA
  // inside /my-collections). The selector is for fresh navigations only.
  const skipIntent = searchParams?.get('direct') === '1';
  const [view, setView] = useState<View>(skipIntent ? 'pick-date' : 'intent');
  const [launchDate, setLaunchDate] = useState(defaultLaunchDate());
  const [name, setName] = useState('');
  const [skipNaming, setSkipNaming] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Felipe 2026-05-19 noche · Sprint D · "Bring forward seeds" gate.
  // Si el merch tiene semillas activas de runs In-Season previos, le
  // ofrecemos traerlas a esta colección. Fetch del summary endpoint
  // agrega seeds across all aimily_360 tenants del user.
  const [seedsSummary, setSeedsSummary] = useState<{
    total_live: number;
    tenants: Array<{
      tenant_id: string;
      tenant_slug: string;
      display_name: string;
      live_count: number;
      by_type: Record<string, number>;
    }>;
  } | null>(null);
  const [showSeedsPicker, setShowSeedsPicker] = useState(false);
  const [selectedSeedIds, setSelectedSeedIds] = useState<Set<string>>(new Set());
  const [seedsForPicker, setSeedsForPicker] = useState<Array<{
    id: string;
    seed_type: string;
    source_model_ref: string | null;
    source_color_ref: string | null;
    source_product_name: string | null;
    source_family_code: string | null;
    tenant_slug: string;
    rationale: string;
    proposed_changes: Record<string, unknown>;
  }>>([]);
  useEffect(() => {
    if (!user) return;
    fetch('/api/in-season/seeds/summary')
      .then((r) => r.json())
      .then((j) => setSeedsSummary(j))
      .catch(() => {});
  }, [user]);

  const season = useMemo(() => deriveSeason(launchDate), [launchDate]);
  const trimmedName = name.trim();
  const canStart = trimmedName.length > 0 || skipNaming;

  const nc = (t as unknown as Record<string, Record<string, string>>).newCollection || {};
  const untitledLabel = nc.untitled || 'Sin título';
  const headline = nc.headline || 'El día del lanzamiento de la colección.';
  const subheadline = nc.subheadline || 'Lo demás ya lo construimos juntos.';
  const launchLabel = nc.launchLabel || 'Lanzamiento';
  const namePlaceholder = nc.namePlaceholder || 'Cómo se llama tu colección';
  const skipNamingCta = nc.skipNaming || 'Aún no tengo título — ponedlo después';
  const namingSkipped = nc.namingSkipped || 'La nombras dentro';
  const startCta = nc.start || 'Empezar';
  const cancel = nc.cancel || 'Cancelar';
  const creatingCopy = nc.creating || 'Preparando tu colección…';

  useEffect(() => {
    if (!authLoading && !user) setShowAuth(true);
  }, [authLoading, user]);

  const handleStart = useCallback(async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!canStart) return;
    setError(null);
    setCreating(true);

    // If the user typed a title, use it. Otherwise (only when they
    // explicitly opted out of naming) fall back to "Sin título · SS27".
    const finalName = trimmedName.length > 0
      ? trimmedName
      : defaultName(season, untitledLabel);

    try {
      track(Events.COLLECTION_CREATED, {
        source: 'new-collection-disruptive',
        named_at_creation: trimmedName.length > 0,
      });
      const res = await fetch('/api/planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          season,
          launch_date: launchDate,
          untitledLabel,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'create_failed');
      }

      const plan = await res.json();

      // Sprint D · consume seeds bulk con el collection_id de la nueva colección.
      // Si el merch seleccionó N semillas, las marcamos status='consumed' +
      // consumed_in_collection_id=plan.id. El bloque Moodboard / Brief leerá
      // de aquí para pre-poblar (Sprint E ingestion).
      if (selectedSeedIds.size > 0 && seedsForPicker.length > 0) {
        // Group seed ids by tenant_slug for the bulk endpoint (1 call per tenant).
        const byTenant = new Map<string, string[]>();
        for (const s of seedsForPicker) {
          if (!selectedSeedIds.has(s.id)) continue;
          const arr = byTenant.get(s.tenant_slug) ?? [];
          arr.push(s.id);
          byTenant.set(s.tenant_slug, arr);
        }
        await Promise.all(
          Array.from(byTenant.entries()).map(([tenantSlug, seedIds]) =>
            fetch('/api/in-season/seeds/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tenant_slug: tenantSlug,
                seed_ids: seedIds,
                action: 'consume',
                collection_id: plan.id,
              }),
            }).catch(() => {})
          )
        );
      }

      // Fade the canvas out, then navigate. Plain transition.
      setView('leaving');
      setTimeout(() => {
        router.push(`/collection/${plan.id}`);
      }, 450);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'create_failed');
      setCreating(false);
    }
  }, [user, canStart, trimmedName, launchDate, season, untitledLabel, router]);

  const onLaunchDateChange = useCallback((iso: string) => {
    if (!iso) return;
    if (new Date(iso).getTime() <= Date.now()) return;
    setLaunchDate(iso);
  }, []);

  return (
    <div className="min-h-screen bg-shade flex flex-col">
      <header className="flex items-center justify-between px-6 md:px-10 lg:px-14 py-6">
        <span className="text-[18px] font-normal text-carbon tracking-[-0.02em]">aimily</span>
        <button
          onClick={() => router.push('/my-collections')}
          className="flex items-center gap-2 text-[12px] tracking-[0.16em] uppercase text-carbon/40 hover:text-carbon transition-colors"
          aria-label={cancel}
        >
          {cancel}
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 md:px-10 lg:px-14 pb-12">
        <AnimatePresence mode="wait">
          {view === 'intent' && (
            <motion.div
              key="intent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="w-full max-w-[1400px] mx-auto"
            >
              <div className="text-center mb-12 md:mb-16">
                <h1 className="text-[40px] md:text-[56px] font-semibold text-carbon tracking-[-0.04em] leading-[1.05]">
                  {language === 'es'
                    ? '¿Qué quieres hacer hoy?'
                    : language === 'fr'
                      ? "Qu'est-ce que tu veux faire aujourd'hui?"
                      : language === 'it'
                        ? 'Cosa vuoi fare oggi?'
                        : language === 'de'
                          ? 'Was möchtest du heute tun?'
                          : language === 'pt'
                            ? 'O que queres fazer hoje?'
                            : 'What do you want to do today?'}
                </h1>
                <p className="mt-3 text-[16px] md:text-[18px] text-carbon/55 italic tracking-[-0.01em] max-w-[640px] mx-auto leading-[1.5]">
                  {language === 'es'
                    ? 'Crea una colección desde cero, genera contenido para una existente, o analiza tus ventas en directo.'
                    : 'Start a new collection, generate content for an existing one, or analyse your live sales.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 01 · Empezar o gestionar colección — lleva a /my-collections hub */}
                <button
                  type="button"
                  onClick={() => router.push('/my-collections')}
                  className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="mb-10">
                    <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                      01.
                    </span>
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                    {language === 'es' ? 'Empezar o gestionar colección' : 'Start or manage a collection'}
                  </h3>
                  <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                    {language === 'es'
                      ? 'Brand DNA, range plan, tech pack y GTM — el ciclo aimily 360 completo. Crea una nueva o continúa con las que ya tienes.'
                      : 'Brand DNA, range plan, tech pack and GTM — the full aimily 360 cycle. Start a new one or pick up where you left off.'}
                  </p>
                  <div className="flex-1" />
                  <div className="flex justify-center mt-10">
                    <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all bg-carbon text-white group-hover:bg-carbon/90">
                      {language === 'es' ? 'Mis colecciones' : 'My collections'}
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* 02 · Generar contenido — Studio */}
                <button
                  type="button"
                  onClick={() => router.push('/studio/new')}
                  className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="mb-10">
                    <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                      02.
                    </span>
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                    {language === 'es' ? 'Generar contenido' : 'Generate content'}
                  </h3>
                  <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                    {language === 'es'
                      ? 'Editoriales, still life, try-on y vídeo. Sube referencia o reutiliza tu producto — Content Studio se encarga.'
                      : 'Editorials, still life, try-on and video. Drop a reference or reuse your product — Content Studio takes care of it.'}
                  </p>
                  <div className="flex-1" />
                  <div className="flex justify-center mt-10">
                    <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all bg-carbon text-white group-hover:bg-carbon/90">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {language === 'es' ? 'Abrir Studio' : 'Open Studio'}
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* 03 · Analizar ventas — In-Season */}
                <button
                  type="button"
                  onClick={() => router.push('/in-season')}
                  className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="mb-10">
                    <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                      03.
                    </span>
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                    {language === 'es' ? 'Analizar ventas In-Season' : 'Analyse In-Season sales'}
                  </h3>
                  <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                    {language === 'es'
                      ? 'Conecta Shopify o sube tu reporte interno. El motor te devuelve qué reponer, matar, redimensionar, recolorear o investigar.'
                      : 'Connect Shopify or upload your internal report. The engine returns what to replenish, kill, resize, recolor or investigate.'}
                  </p>
                  <div className="flex-1" />
                  <div className="flex justify-center mt-10">
                    <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all bg-carbon text-white group-hover:bg-carbon/90">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {language === 'es' ? 'Abrir In-Season' : 'Open In-Season'}
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {view === 'pick-date' && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="w-full max-w-[1100px] mx-auto"
            >
              <div className="text-center mb-10 md:mb-14">
                <h1 className="text-[40px] md:text-[56px] font-semibold text-carbon tracking-[-0.04em] leading-[1.05]">
                  {headline}
                </h1>
                <p className="mt-3 text-[16px] md:text-[18px] text-carbon/55 italic tracking-[-0.01em]">
                  {subheadline}
                </p>
              </div>

              {/* Seeds gate — Sprint D · Felipe 2026-05-19 noche.
                  Si hay semillas activas de runs In-Season, ofrecemos
                  traerlas como inputs base de la nueva colección. */}
              {seedsSummary && seedsSummary.total_live > 0 && (
                <div className="max-w-[800px] mx-auto mb-10 bg-white rounded-[20px] p-6 md:p-8 border border-carbon/[0.06]">
                  <div className="flex items-start gap-5 flex-wrap">
                    <div className="flex-1 min-w-[260px]">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-carbon/40 mb-1 font-medium">
                        Semillas In-Season
                      </div>
                      <div className="text-[18px] font-semibold text-carbon tracking-[-0.02em] mb-1.5">
                        Tienes {seedsSummary.total_live} semilla{seedsSummary.total_live === 1 ? '' : 's'} activa{seedsSummary.total_live === 1 ? '' : 's'}
                      </div>
                      <p className="text-[13px] text-carbon/55 leading-[1.6]">
                        Propuestas del motor In-Season de tus runs previos. Tráelas a esta colección como SKUs base — el moodboard y el brief heredarán sus colores y rationale.
                      </p>
                      {Object.keys(seedsSummary.tenants[0]?.by_type ?? {}).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {seedsSummary.tenants.flatMap((t) =>
                            Object.entries(t.by_type).map(([type, count]) => (
                              <span
                                key={`${t.tenant_slug}-${type}`}
                                className="text-[11px] text-carbon/55 bg-carbon/[0.04] px-2.5 py-1 rounded-full"
                              >
                                {type === 'amplify_next_season'
                                  ? 'Replica · próxima'
                                  : type === 'extend_colors'
                                    ? 'Extender colores'
                                    : type === 'drop_color'
                                      ? 'Drop color'
                                      : type === 'retire'
                                        ? 'Retirar'
                                        : type}
                                <span className="text-carbon/35 ml-1">{count}</span>
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-stretch">
                      <button
                        type="button"
                        onClick={async () => {
                          // Lazy-fetch full seed list across tenants
                          const allSeeds = await Promise.all(
                            seedsSummary.tenants.map(async (t) => {
                              const r = await fetch(`/api/in-season/seeds?tenant_slug=${t.tenant_slug}&status=live`);
                              const j = await r.json();
                              return ((j.seeds ?? []) as Array<Record<string, unknown>>).map((s) => ({
                                ...s,
                                tenant_slug: t.tenant_slug,
                              }));
                            })
                          );
                          setSeedsForPicker(allSeeds.flat() as typeof seedsForPicker);
                          setShowSeedsPicker(true);
                        }}
                        className="px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-colors whitespace-nowrap"
                      >
                        Elegir cuáles traer →
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeedsSummary(null)}
                        className="text-[11px] text-carbon/40 hover:text-carbon/70 transition-colors"
                      >
                        Empezar sin semillas
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Name field — first creative moment. The user writes a
                  title before doing anything else; if they truly don't
                  have one yet they tap "skip" below to fall back to the
                  default placeholder. */}
              <div className="flex flex-col items-center gap-2 mb-10">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                  maxLength={120}
                  autoFocus
                  disabled={creating || skipNaming}
                  className="w-full max-w-[640px] text-center bg-transparent border-0 border-b border-carbon/[0.10] focus:border-carbon/40 outline-none text-[28px] md:text-[34px] font-medium text-carbon tracking-[-0.02em] leading-[1.2] placeholder:text-carbon/30 transition-colors py-2 disabled:opacity-50"
                />
                {trimmedName.length === 0 && !skipNaming && (
                  <button
                    type="button"
                    onClick={() => setSkipNaming(true)}
                    className="text-[12px] text-carbon/40 hover:text-carbon/70 italic tracking-[-0.01em] transition-colors mt-2"
                  >
                    {skipNamingCta}
                  </button>
                )}
                {skipNaming && (
                  <button
                    type="button"
                    onClick={() => setSkipNaming(false)}
                    className="text-[12px] text-carbon/40 hover:text-carbon/70 italic tracking-[-0.01em] transition-colors mt-2"
                  >
                    {namingSkipped}
                  </button>
                )}
              </div>

              <div className="mb-10">
                <TimelinePreview launchDate={launchDate} language={language} asCards={false} />
              </div>

              <div className="flex flex-col items-center gap-3">
                <label className="flex items-center gap-3 px-5 py-3 bg-white rounded-full border border-carbon/[0.08] text-[14px] text-carbon shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                  <Calendar className="h-4 w-4 text-carbon/50" />
                  <span className="text-carbon/50">{launchLabel}:</span>
                  <input
                    type="date"
                    value={launchDate}
                    onChange={(e) => onLaunchDateChange(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    className="bg-transparent border-0 outline-none font-medium text-carbon text-[14px] cursor-pointer"
                    disabled={creating}
                  />
                </label>

                <p className="text-[12px] text-carbon/45 italic tracking-[-0.01em]">
                  {(nc.seasonLabel || 'Temporada')}: <span className="not-italic font-medium text-carbon/65">{season}</span>
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center gap-8">

                <button
                  onClick={handleStart}
                  disabled={creating || !canStart}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-[14px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-[0_4px_14px_rgba(0,0,0,0.08)] disabled:opacity-30 disabled:hover:scale-100"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {creatingCopy}
                    </>
                  ) : (
                    <>
                      {startCta}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {error && (
                  <p className="text-[13px] text-[#A0463C]" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {view === 'leaving' && (
            <motion.div
              key="leaving"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="flex items-center gap-3 text-[14px] text-carbon/50"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {creatingCopy}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AuthModal
        isOpen={showAuth}
        defaultMode="signup"
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />

      {/* Seeds picker modal — Sprint D Felipe 2026-05-19 noche.
          Checkboxes para que el merch elija qué semillas traer a la
          colección. Al confirmar, se cierra; selectedSeedIds queda en
          state. El consume bulk ocurre en handleStart después de crear
          la colección (necesita plan.id). */}
      {showSeedsPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSeedsPicker(false)}
        >
          <div
            className="bg-white rounded-[24px] max-w-[860px] w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8 border-b border-carbon/[0.06] flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-carbon/40 mb-1 font-medium">
                  Semillas In-Season
                </div>
                <h2 className="text-[24px] font-semibold text-carbon tracking-[-0.02em]">
                  Elige cuáles traer a {season}
                </h2>
                <p className="text-[13px] text-carbon/55 mt-1">
                  {selectedSeedIds.size === 0
                    ? `${seedsForPicker.length} semillas disponibles`
                    : `${selectedSeedIds.size} de ${seedsForPicker.length} seleccionadas`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSeedsPicker(false)}
                className="text-carbon/40 hover:text-carbon transition-colors p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-2">
              {seedsForPicker.length === 0 ? (
                <p className="text-[13px] text-carbon/45 text-center py-8">Cargando semillas…</p>
              ) : (
                seedsForPicker.map((s) => {
                  const checked = selectedSeedIds.has(s.id);
                  const typeLabel =
                    s.seed_type === 'amplify_next_season'
                      ? 'Replica el concepto'
                      : s.seed_type === 'extend_colors'
                        ? 'Extender colores'
                        : s.seed_type === 'drop_color'
                          ? 'Retirar color'
                          : s.seed_type === 'retire'
                            ? 'Decontinuar'
                            : s.seed_type;
                  return (
                    <label
                      key={s.id}
                      className={`flex items-start gap-3 p-3 rounded-[12px] cursor-pointer transition-colors ${
                        checked ? 'bg-carbon/[0.04]' : 'hover:bg-carbon/[0.02]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedSeedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) next.delete(s.id);
                            else next.add(s.id);
                            return next;
                          });
                        }}
                        className="mt-1 w-4 h-4 accent-carbon"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[10px] uppercase tracking-[0.1em] text-carbon/45 font-medium">
                            {typeLabel}
                          </span>
                        </div>
                        <div className="text-[14px] font-medium text-carbon truncate">
                          {s.source_product_name ?? s.source_model_ref ?? '—'}
                        </div>
                        <div className="text-[11px] text-carbon/45 font-mono">
                          {s.source_model_ref}
                          {s.source_family_code ? ` · ${s.source_family_code}` : ''}
                          {s.source_color_ref ? ` · ${s.source_color_ref}` : ''}
                        </div>
                        {s.rationale && (
                          <p className="text-[11px] text-carbon/55 leading-[1.5] mt-1 line-clamp-2">
                            {s.rationale}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="p-6 md:p-8 border-t border-carbon/[0.06] flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedSeedIds(new Set(seedsForPicker.map((s) => s.id)));
                }}
                className="text-[12px] text-carbon/50 hover:text-carbon transition-colors underline underline-offset-4"
              >
                Seleccionar todas
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSeedsPicker(false)}
                  className="px-5 py-2 rounded-full text-[12px] font-medium text-carbon/60 border border-carbon/[0.12]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setShowSeedsPicker(false)}
                  disabled={selectedSeedIds.size === 0}
                  className="px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold disabled:opacity-40"
                >
                  Confirmar {selectedSeedIds.size > 0 ? `(${selectedSeedIds.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewCollectionPage() {
  return (
    <SubscriptionGate>
      <NewCollectionFlow />
    </SubscriptionGate>
  );
}
