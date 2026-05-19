'use client';

/**
 * BuyStrategyBlock — Block 2 ScenariosContent pattern, sales-management edition
 *
 * Phase machine: archetypes → editor → confirmed
 *   · archetypes — 4 cards (A/B/C/D) with stats 2×2 + benchmarks + best-for
 *     + CTA pill "Work on this strategy".
 *   · editor — 5 axis cards (ActionMix, Budget, LeadTimeCalendar,
 *     FamilyPivot, ActualsDelta). Each card supports "+ Más" deepen.
 *   · CanonicalActionBar at the bottom: "Change strategy" (back) +
 *     "Confirm strategy" (POSTs to buy-strategy-confirm).
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
  localizeArchetypes,
  type BuyStrategyArchetype,
  type BuyStrategyArchetypeId,
} from '@/lib/strategy/sales-archetypes';
import type {
  BuyStrategyPrefillEditor,
  BuyStrategyAxis,
} from '@/lib/strategy/buy-strategy-prompts';
import { ActionMixCard, type ActionMix } from '@/components/strategy/axis-cards/ActionMixCard';
import { BudgetCard, type BudgetState } from '@/components/strategy/axis-cards/BudgetCard';
import { LeadTimeCalendarCard, type BuyWave } from '@/components/strategy/axis-cards/LeadTimeCalendarCard';
import { FamilyPivotCard, type FamilyPivotRow } from '@/components/strategy/axis-cards/FamilyPivotCard';
import { ActualsDeltaCard, type ActualsDeltaRow } from '@/components/strategy/axis-cards/ActualsDeltaCard';

interface Tenant {
  id: string;
  slug: string;
  display_name: string;
}

interface ExistingConstraint {
  id: string;
  name: string;
  chosen_archetype_id: 'A' | 'B' | 'C' | 'D' | null;
  action_mix: Record<string, number> | null;
  buy_waves: unknown[] | null;
  target_adjacent_families: string[] | null;
  target_total_skus: number | null;
  target_buy_budget: number | null;
  target_avg_margin: number | null;
}

interface Props {
  tenant: Tenant;
  archetypes: BuyStrategyArchetype[];
  existingConstraint: ExistingConstraint | null;
  existingBriefId: string | null;
  topFamilyCodes: string[];
  gatingBlocked: boolean;
}

type Phase = 'archetypes' | 'editor' | 'confirmed';

interface EditorState {
  archetype: BuyStrategyArchetype;
  action_mix: ActionMix;
  budget: BudgetState;
  buy_waves: BuyWave[];
  family_pivot: FamilyPivotRow[];
  target_adjacent_families: string[];
  actuals_delta: ActualsDeltaRow[];
}

export function BuyStrategyBlock({
  tenant,
  archetypes: archetypesFromServer,
  existingConstraint,
  existingBriefId,
  topFamilyCodes,
  gatingBlocked,
}: Props) {
  const router = useRouter();
  const t = useTranslation();
  const [phase, setPhase] = useState<Phase>('archetypes');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [loadingPrefill, setLoadingPrefill] = useState<BuyStrategyArchetypeId | null>(null);
  const [deepening, setDeepening] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>('');

  // Localize the 4 archetype cards using the current locale's strings.
  // Server-rendered `archetypesFromServer` carries action_mix / benchmarks /
  // primary_scenario_type (locale-invariant); copy comes from the i18n dict.
  const archetypes = useMemo<BuyStrategyArchetype[]>(
    () => localizeArchetypes(t.inSeason.archetypes),
    [t]
  );
  // archetypesFromServer is retained as a prop for future server-rendered
  // benchmark hydration, but UI rendering uses the locale-aware array.
  void archetypesFromServer;

  // ── Pick archetype → fetch prefill editor ───────────────────────────────
  const handleSelectArchetype = useCallback(
    async (archetype: BuyStrategyArchetype) => {
      if (gatingBlocked) return;
      setLoadingPrefill(archetype.id);
      setError('');
      try {
        const res = await fetch('/api/in-season/buy-strategy-prefill-editor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: tenant.id,
            archetype_id: archetype.id,
            language: 'es',
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Prefill failed (${res.status})`);
        }
        const data = await res.json();
        const e: BuyStrategyPrefillEditor = data.editor;

        setEditor({
          archetype,
          action_mix: e.action_mix ?? archetype.default_action_mix,
          budget: e.budget ?? {
            target_buy_budget_eur: null,
            target_sales_y1_eur: null,
            target_margin_pct: null,
            last_season_buy_budget_eur: null,
            last_season_revenue_eur: null,
            last_season_margin_pct: null,
          },
          buy_waves: (e.buy_waves ?? []).map((w) => ({
            name: w.name ?? 'Wave',
            share_pct: w.share_pct ?? 0,
            target_lead_time_days: w.target_lead_time_days ?? 30,
          })),
          family_pivot: (e.family_pivot ?? []).map((row) => ({
            family_code: row.family_code,
            pivot_pct: row.pivot_pct ?? 0,
            rationale: row.rationale ?? '',
          })),
          target_adjacent_families: e.target_adjacent_families ?? [],
          actuals_delta: [], // hydrated on demand by the deepen endpoint
        });
        setPhase('editor');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Prefill failed');
      } finally {
        setLoadingPrefill(null);
      }
    },
    [tenant.id, gatingBlocked]
  );

  const handleBackToArchetypes = useCallback(() => {
    setPhase('archetypes');
    setEditor(null);
    setError('');
  }, []);

  // ── Per-axis deepen ────────────────────────────────────────────────────
  const handleDeepen = useCallback(
    async (axis: string) => {
      if (!editor) return;
      setDeepening(axis);
      setError('');
      try {
        const currentEditor: BuyStrategyPrefillEditor = {
          action_mix: editor.action_mix,
          budget: editor.budget,
          buy_waves: editor.buy_waves,
          family_pivot: editor.family_pivot,
          target_adjacent_families: editor.target_adjacent_families,
          rationale: '',
        };
        const res = await fetch('/api/in-season/buy-strategy-deepen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: tenant.id,
            archetype_id: editor.archetype.id,
            axis: axis as BuyStrategyAxis,
            current_editor: currentEditor,
            language: 'es',
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Deepen failed (${res.status})`);
        }
        const { patch } = await res.json();
        if (!patch) return;

        // Merge axis-scoped patch into the editor state.
        setEditor((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (axis === 'action_mix' && patch.action_mix) {
            next.action_mix = patch.action_mix;
          } else if (axis === 'budget' && patch.budget) {
            next.budget = { ...next.budget, ...patch.budget };
          } else if (axis === 'lead_time_calendar' && Array.isArray(patch.buy_waves)) {
            next.buy_waves = patch.buy_waves;
          } else if (axis === 'family_pivot' && Array.isArray(patch.family_pivot)) {
            next.family_pivot = patch.family_pivot.map((r: any) => ({
              family_code: r.family_code,
              pivot_pct: r.pivot_pct ?? 0,
              rationale: r.rationale ?? '',
            }));
          } else if (axis === 'actuals_delta' && Array.isArray(patch.actuals_delta)) {
            next.actuals_delta = patch.actuals_delta;
          }
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Deepen failed');
      } finally {
        setDeepening(null);
      }
    },
    [editor, tenant.id]
  );

  // ── Confirm ────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!editor) return;
    setConfirming(true);
    setError('');
    try {
      const res = await fetch('/api/in-season/buy-strategy-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          archetype_id: editor.archetype.id,
          action_mix: editor.action_mix,
          buy_waves: editor.buy_waves,
          target_adjacent_families: editor.target_adjacent_families,
          target_buy_budget: editor.budget.target_buy_budget_eur,
          target_avg_margin:
            editor.budget.target_margin_pct != null
              ? editor.budget.target_margin_pct / 100
              : null,
          family_share_targets: {},
          constraint_id: existingConstraint?.id,
          create_run: true,
          brief_id: existingBriefId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Confirm failed (${res.status})`);
      }
      const data = await res.json();
      setPhase('confirmed');
      router.refresh();
      if (data.run_id) {
        router.push(`/in-season/${tenant.slug}/runs/${data.run_id}`);
      } else {
        router.push(`/in-season/${tenant.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setConfirming(false);
    }
  }, [editor, existingConstraint?.id, existingBriefId, router, tenant.id, tenant.slug]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (phase === 'archetypes' || !editor) {
    return (
      <div>
        <div className="max-w-2xl mx-auto text-center mb-10">
          <p className="text-[14px] text-carbon/55 leading-relaxed italic">
            {t.inSeason.buyStrategy.archetypesIntro}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {archetypes.map((a) => {
            const isLoading = loadingPrefill === a.id;
            return (
              <button
                key={a.id}
                type="button"
                disabled={isLoading || gatingBlocked}
                onClick={() => handleSelectArchetype(a)}
                className="group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[540px] text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-carbon/[0.06] disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="min-h-[120px] mb-6">
                  <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
                    {t.inSeason.buyStrategy.archetypeLabel.replace('{id}', a.id)}
                  </div>
                  <h3 className="text-[22px] md:text-[24px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
                    {a.name}
                  </h3>
                  <p className="text-[12px] text-carbon/50 mt-1.5">{a.tagline}</p>
                </div>

                {/* Stats 2×2 — action mix tilt */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-6">
                  <Stat label={t.inSeason.buyStrategy.actionMixStats.replenish} value={`${a.default_action_mix.replenish_pct}%`} />
                  <Stat label={t.inSeason.buyStrategy.actionMixStats.newSkus} value={`${a.default_action_mix.new_sku_proposal_pct}%`} />
                  <Stat label={t.inSeason.buyStrategy.actionMixStats.familyExt} value={`${a.default_action_mix.family_extension_pct}%`} />
                  <Stat label={t.inSeason.buyStrategy.actionMixStats.kill} value={`${a.default_action_mix.kill_pct}%`} />
                </div>

                {/* Benchmark brands */}
                <div className="pt-4 border-t border-carbon/[0.06] mb-5 min-h-[80px]">
                  <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-2">
                    {t.inSeason.buyStrategy.benchmarkMoves}
                  </div>
                  <p className="text-[12px] text-carbon/65 leading-[1.5] tracking-[-0.01em]">
                    {a.benchmarks.slice(0, 3).map((b) => b.brand).join(' · ')}
                  </p>
                </div>

                {/* Best for */}
                <div className="pt-4 border-t border-carbon/[0.06] mb-6 min-h-[80px]">
                  <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35 mb-1.5">
                    {t.inSeason.buyStrategy.bestFor}
                  </div>
                  <p className="text-[11px] text-carbon/55 leading-[1.5] line-clamp-3">
                    {a.best_for}
                  </p>
                </div>

                <div className="flex-1" />

                <div className="flex justify-center mt-2">
                  <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all bg-carbon text-white group-hover:bg-carbon/90">
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {t.inSeason.buyStrategy.workOnThisStrategy}
                    {!isLoading && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mt-6 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Editor phase
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackToArchetypes}
          className="inline-flex items-center gap-1.5 text-[12px] text-carbon/50 hover:text-carbon transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.inSeason.buyStrategy.changeStrategy}
        </button>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
            {t.inSeason.buyStrategy.workingOnArchetype.replace('{id}', editor.archetype.id)}
          </div>
          <div className="text-[14px] font-semibold text-carbon tracking-[-0.02em]">
            {editor.archetype.name}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ActionMixCard
          mix={editor.action_mix}
          onChange={(next) => setEditor((prev) => (prev ? { ...prev, action_mix: next } : prev))}
          onDeepen={handleDeepen}
          deepening={deepening}
        />
        <BudgetCard
          budget={editor.budget}
          onChange={(next) => setEditor((prev) => (prev ? { ...prev, budget: next } : prev))}
          onDeepen={handleDeepen}
          deepening={deepening}
        />
        <LeadTimeCalendarCard
          waves={editor.buy_waves}
          onChange={(next) => setEditor((prev) => (prev ? { ...prev, buy_waves: next } : prev))}
          onDeepen={handleDeepen}
          deepening={deepening}
        />
        <FamilyPivotCard
          pivots={editor.family_pivot}
          topFamilyCodes={topFamilyCodes}
          adjacentFamilies={editor.target_adjacent_families}
          archetypeId={editor.archetype.id}
          onPivotChange={(next) =>
            setEditor((prev) => (prev ? { ...prev, family_pivot: next } : prev))
          }
          onAdjacentChange={(next) =>
            setEditor((prev) => (prev ? { ...prev, target_adjacent_families: next } : prev))
          }
          onDeepen={handleDeepen}
          deepening={deepening}
        />
        <ActualsDeltaCard
          rows={editor.actuals_delta}
          onDeepen={handleDeepen}
          deepening={deepening}
        />
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mt-6 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800">
          {error}
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold hover:bg-carbon/90 disabled:opacity-40 transition-colors"
        >
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {confirming ? t.inSeason.buyStrategy.confirming : t.inSeason.buyStrategy.confirmStrategyRun}
        </button>
        <button
          type="button"
          onClick={handleBackToArchetypes}
          className="inline-flex items-center gap-1.5 text-[12px] text-carbon/50 hover:text-carbon transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          {t.inSeason.buyStrategy.changeArchetype}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div>
        <div className="text-[10px] tracking-[0.05em] uppercase text-carbon/35 font-medium">{label}</div>
        <div className="text-[16px] font-semibold text-carbon tracking-[-0.02em] leading-tight">{value}</div>
      </div>
    </div>
  );
}
