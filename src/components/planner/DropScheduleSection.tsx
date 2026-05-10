'use client';

/**
 * DropScheduleSection · Block 2.5 Collection Builder
 *
 * Renders the canonical drop calendar at the top of Collection Builder.
 * On mount, if the `drops` table is empty for this collection, it auto-
 * synthesizes drops from CIS (merchandising.strategy.drops + season +
 * Block 4 cadence if present). Once drops exist, the user can edit each
 * drop's launch_date and name inline.
 *
 * The drops are then read by:
 *   · Sales Dashboard CurvaSection (per-drop launch_date drives the
 *     aggregate sales curve)
 *   · GTM / Comms / Content Studio downstream (T-N actions anchored to
 *     drop launch_date)
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 *            (Path B: structural drop materialization in Block 2.5)
 */

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Loader2, Check, RefreshCw } from 'lucide-react';

interface Drop {
  id: string;
  drop_number: number;
  name: string;
  launch_date: string;
  weeks_active: number | null;
  channels: string[];
}

interface Props {
  collectionPlanId: string;
}

export function DropScheduleSection({ collectionPlanId }: Props) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDrops = useCallback(async () => {
    try {
      const res = await fetch(`/api/drops?planId=${encodeURIComponent(collectionPlanId)}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = (await res.json()) as Drop[];
      return data;
    } catch (err) {
      console.error('[DropSchedule] fetch failed', err);
      return [];
    }
  }, [collectionPlanId]);

  const synthesizeIfEmpty = useCallback(async () => {
    setSynthesizing(true);
    setError(null);
    try {
      const res = await fetch('/api/drops/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_plan_id: collectionPlanId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      const j = (await res.json()) as { result?: { drops: Drop[] } };
      setDrops(j.result?.drops ?? []);
    } catch (err) {
      console.error('[DropSchedule] synthesize failed', err);
      setError(err instanceof Error ? err.message : 'Error al inicializar drops');
    } finally {
      setSynthesizing(false);
    }
  }, [collectionPlanId]);

  // Initial mount: fetch existing drops; if empty, auto-synthesize.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await fetchDrops();
      if (cancelled) return;
      if (existing.length === 0) {
        await synthesizeIfEmpty();
      } else {
        setDrops(existing);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDrops, synthesizeIfEmpty]);

  const handleEditField = async (id: string, field: 'name' | 'launch_date', value: string) => {
    setSavingId(id);
    setError(null);
    // Optimistic update
    setDrops((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
    try {
      const res = await fetch(`/api/drops/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
    } catch (err) {
      console.error('[DropSchedule] update failed', err);
      setError(err instanceof Error ? err.message : 'Error al guardar');
      // Refetch to revert optimistic update
      const fresh = await fetchDrops();
      setDrops(fresh);
    } finally {
      setSavingId(null);
    }
  };

  const handleResynthesize = async () => {
    setSynthesizing(true);
    setError(null);
    try {
      const res = await fetch('/api/drops/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_plan_id: collectionPlanId, force: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }
      const j = (await res.json()) as { result?: { drops: Drop[] } };
      setDrops(j.result?.drops ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar drops');
    } finally {
      setSynthesizing(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[20px] p-7 mb-5"
      >
        <div className="flex items-center gap-3 text-[12px] text-carbon/55">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Cargando calendario de drops…</span>
        </div>
      </motion.div>
    );
  }

  if (drops.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[20px] p-7 mb-5"
      >
        <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-2">
          Calendario de drops
        </div>
        <p className="text-[13px] text-carbon/55 leading-relaxed mb-4">
          No hay drops definidos. Confirma 02.1 Estrategia de Compra primero (define cuántos drops y sus nombres).
        </p>
        {error && (
          <p className="text-[12px] text-red-600 mb-3">{error}</p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-[20px] p-7 mb-5"
    >
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-4">
          <span className="text-[40px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] shrink-0">
            00.
          </span>
          <div>
            <h3 className="text-[20px] font-semibold text-carbon tracking-[-0.03em] leading-tight">
              Calendario de drops
            </h3>
            <p className="text-[12px] text-carbon/50 leading-relaxed mt-1 max-w-[640px]">
              {drops.length} drop{drops.length !== 1 ? 's' : ''} · ajusta fecha de lanzamiento y nombre. Esto alimenta el Sales Dashboard, el GTM y todas las acciones T-N.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResynthesize}
          disabled={synthesizing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/55 hover:bg-carbon/[0.04] disabled:opacity-50 transition-colors shrink-0"
        >
          {synthesizing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Regenerar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] p-3 text-[12px] text-red-800 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {drops.map((drop) => {
          const launchDate = new Date(drop.launch_date);
          const daysUntil = Math.ceil(
            (launchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          const isPast = daysUntil < 0;
          return (
            <div
              key={drop.id}
              className="rounded-[12px] py-3 px-4 bg-shade ring-1 ring-carbon/[0.04] flex items-center gap-4"
            >
              <div className="shrink-0 w-12 h-12 rounded-full bg-white ring-1 ring-carbon/[0.06] flex items-center justify-center">
                <span className="text-[14px] font-semibold text-carbon tabular-nums">
                  {String(drop.drop_number).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  defaultValue={drop.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== drop.name) {
                      handleEditField(drop.id, 'name', e.target.value.trim());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full bg-transparent border-0 outline-none text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight focus:bg-white focus:px-2 focus:py-0.5 focus:rounded transition-all"
                />
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-carbon/55">
                  <span className="tabular-nums">
                    {isPast ? `Hace ${Math.abs(daysUntil)}d` : daysUntil === 0 ? 'Hoy' : `En ${daysUntil}d`}
                  </span>
                  {drop.weeks_active && (
                    <>
                      <span className="text-carbon/25">·</span>
                      <span>{drop.weeks_active}w activo</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                <input
                  type="date"
                  defaultValue={drop.launch_date.slice(0, 10)}
                  onChange={(e) => {
                    if (e.target.value && e.target.value !== drop.launch_date.slice(0, 10)) {
                      handleEditField(drop.id, 'launch_date', e.target.value);
                    }
                  }}
                  className="bg-white ring-1 ring-carbon/[0.08] rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-carbon focus:ring-carbon/30 focus:outline-none tabular-nums"
                />
              </div>
              {savingId === drop.id && (
                <Loader2 className="h-3.5 w-3.5 text-carbon/40 animate-spin shrink-0" />
              )}
              {savingId !== drop.id && !synthesizing && (
                <Check className="h-3.5 w-3.5 text-carbon/20 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
