'use client';

/**
 * RunScenariosEditor — inline scenario editor for the run detail page.
 *
 * Rendered above the existing static scenario cards in
 * /strategy/[tenantSlug]/runs/[runId]/page.tsx (server component) so the
 * user can edit a scenario's action mix inline. Editing creates a NEW
 * custom scenario row (parent_scenario_id link) via create-custom — never
 * patches the source's derived totals. Closes Codex v2 P1 #2.
 *
 * Promote is a separate explicit action (CanonicalActionBar) and POSTs to
 * the promote endpoint, which demote-then-selects in a tight sequence
 * (UNIQUE index enforces "at most one selected per run"), kicks off
 * allocate-replenishment, and navigates the browser to /decision-pack.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2, Pencil, RotateCcw, X } from 'lucide-react';
import { ActionMixCard, type ActionMix } from '@/components/strategy/axis-cards/ActionMixCard';
import { useTranslation } from '@/i18n';

interface ScenarioRow {
  id: string;
  name: string;
  scenario_type: string;
  description: string | null;
  is_selected: boolean;
  is_default: boolean;
  parent_scenario_id: string | null;
  total_predicted_revenue: number | null;
  total_predicted_margin: number | null;
  total_predicted_buy_budget: number | null;
  predicted_sku_count: number | null;
  custom_action_mix: ActionMix | null;
}

interface Props {
  tenantSlug: string;
  runId: string;
  scenarios: ScenarioRow[];
  /** Default mix to seed the editor when the user clicks Edit on a parent
   *  scenario that doesn't carry one already. Comes from the run's
   *  constraints (chosen_archetype_id → default_action_mix). */
  defaultMix: ActionMix;
}

function fmtEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${Math.round(n)}`;
}

export function RunScenariosEditor({ tenantSlug: _tenantSlug, runId, scenarios, defaultMix }: Props) {
  const t = useTranslation();
  const labels = t.inSeason.run.sections;
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMix, setEditMix] = useState<ActionMix>(defaultMix);
  const [busyAction, setBusyAction] = useState<{ id: string; kind: 'create' | 'promote' } | null>(null);
  const [error, setError] = useState<string>('');

  const handleStartEdit = (scenario: ScenarioRow) => {
    setEditingId(scenario.id);
    setEditMix(scenario.custom_action_mix ?? defaultMix);
    setError('');
  };

  const handleCreateCustom = async (parent: ScenarioRow) => {
    setBusyAction({ id: parent.id, kind: 'create' });
    setError('');
    try {
      const sum =
        editMix.replenish_pct +
        editMix.new_sku_proposal_pct +
        editMix.family_extension_pct +
        editMix.kill_pct;
      if (Math.abs(sum - 100) > 0.5) {
        throw new Error('Action mix must sum to 100');
      }
      const res = await fetch(`/api/in-season/runs/${runId}/scenarios/create-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_scenario_id: parent.id,
          name: `Custom from ${parent.name}`,
          action_mix: editMix,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Create custom failed (${res.status})`);
      }
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePromote = async (scenario: ScenarioRow) => {
    setBusyAction({ id: scenario.id, kind: 'promote' });
    setError('');
    try {
      const res = await fetch(
        `/api/in-season/runs/${runId}/scenarios/${scenario.id}/promote`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Promote failed (${res.status})`);
      }
      const data = await res.json();
      if (data.redirect_to) {
        router.push(data.redirect_to);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Promote failed');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="mb-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em]">
          Scenarios
        </h2>
        <p className="text-[12px] text-carbon/50 italic">
          Edit any scenario to create a counterfactual. Promote one to lock it in as your active plan.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        {scenarios.map((s) => {
          const isEditing = editingId === s.id;
          const isPromoting = busyAction?.id === s.id && busyAction.kind === 'promote';
          const isCreatingCustom = busyAction?.id === s.id && busyAction.kind === 'create';
          const isCustom = s.scenario_type === 'custom' || s.parent_scenario_id != null;

          return (
            <article
              key={s.id}
              className={`bg-white rounded-[20px] p-6 md:p-7 transition-all ${
                s.is_selected ? 'ring-2 ring-carbon/30 shadow-[0_8px_24px_rgba(0,0,0,0.06)]' : 'ring-1 ring-carbon/[0.06]'
              }`}
            >
              <header className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] text-carbon/40 uppercase tracking-[0.08em]">
                    {s.scenario_type.replace(/_/g, ' ')}
                  </p>
                  {s.is_selected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-[0.08em]">
                      <Check className="h-3 w-3" />
                      Active plan
                    </span>
                  )}
                  {isCustom && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium uppercase tracking-[0.06em]">
                      Custom
                    </span>
                  )}
                </div>
                <h3 className="text-[16px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
                  {s.name}
                </h3>
              </header>

              <dl className="space-y-1.5 text-[12px] mb-4">
                <Metric label={labels.skus} value={s.predicted_sku_count?.toLocaleString() ?? '—'} />
                <Metric label={labels.revenue} value={fmtEur(s.total_predicted_revenue)} />
                <Metric label={labels.margin} value={fmtEur(s.total_predicted_margin)} />
                <Metric label={labels.buyBudget} value={fmtEur(s.total_predicted_buy_budget)} />
              </dl>

              {isEditing && (
                <div className="border-t border-carbon/[0.06] pt-4 mb-4 -mx-1">
                  <ActionMixCard
                    mix={editMix}
                    onChange={setEditMix}
                    deepening={null}
                  />
                </div>
              )}

              {!isEditing ? (
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/70 hover:bg-carbon/[0.04] transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit mix
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePromote(s)}
                    disabled={isPromoting || s.is_selected}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold bg-carbon text-white hover:bg-carbon/90 disabled:opacity-40 transition-colors"
                  >
                    {isPromoting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : s.is_selected ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <ArrowRight className="h-3 w-3" />
                    )}
                    {s.is_selected ? 'Active' : 'Promote'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/70 hover:bg-carbon/[0.04] transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateCustom(s)}
                    disabled={isCreatingCustom}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold bg-carbon text-white hover:bg-carbon/90 disabled:opacity-40 transition-colors"
                  >
                    {isCreatingCustom ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    Save custom
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {error && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800 max-w-2xl mx-auto">
          {error}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-carbon/50">{label}</span>
      <span className="text-carbon font-medium tabular-nums">{value}</span>
    </div>
  );
}
