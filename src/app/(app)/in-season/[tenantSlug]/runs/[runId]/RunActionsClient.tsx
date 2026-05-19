'use client';

/* Run action panel: execute pipeline, run backtest, generate narratives,
   open decision pack for PDF export, AND the Paso 2 generative CTAs
   (new SKU proposals + family extensions + palette per family).
   Client because we POST + then router.refresh() so the page repaints
   with fresh data from the server. */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlayCircle,
  Activity,
  Brain,
  Loader2,
  FileDown,
  Wand2,
  PackagePlus,
  Layers3,
  Palette,
} from 'lucide-react';

type Busy =
  | 'execute'
  | 'backtest'
  | 'narrate'
  | 'propose-skus'
  | 'propose-extensions'
  | 'recommend-palette'
  | null;

interface Props {
  runId: string;
  runStatus: string;
  hasBacktest: boolean;
  tenantSlug: string;
  /** Family codes available for palette recommendation (passed from server). */
  familyCodes: string[];
}

export function RunActionsClient({
  runId,
  runStatus,
  hasBacktest,
  tenantSlug,
  familyCodes,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [err, setErr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paletteFamily, setPaletteFamily] = useState<string>(familyCodes[0] || '');

  const post = async (path: string, label: Busy, body?: Record<string, unknown>) => {
    setBusy(label);
    setErr('');
    setNote('');
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Failed (${res.status})`);
      }
      const data = await res.json().catch(() => ({}));
      if (typeof data.created === 'number') {
        setNote(`${data.created} candidate${data.created === 1 ? '' : 's'} created.`);
      } else if (Array.isArray(data.colors)) {
        setNote(`Palette saved · ${data.colors.length} colors for ${data.family_code}.`);
      }
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const canExecute = runStatus === 'pending' || runStatus === 'failed';
  const isComplete = runStatus === 'complete';

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2 justify-end">
        {canExecute && (
          <button
            onClick={() => post(`/api/in-season/runs/${runId}/execute`, 'execute')}
            disabled={busy != null}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 disabled:opacity-50"
          >
            {busy === 'execute' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Run scoring + recommendations
          </button>
        )}
        {isComplete && (
          <>
            <button
              onClick={() => post(`/api/in-season/runs/${runId}/backtest`, 'backtest')}
              disabled={busy != null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-carbon/[0.12] text-carbon/70 text-[12px] font-semibold hover:bg-carbon/[0.04] disabled:opacity-50"
            >
              {busy === 'backtest' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              {hasBacktest ? 'Re-run backtest' : 'Run backtest'}
            </button>
            <button
              onClick={() => post(`/api/in-season/runs/${runId}/narrate`, 'narrate')}
              disabled={busy != null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-carbon/[0.12] text-carbon/70 text-[12px] font-semibold hover:bg-carbon/[0.04] disabled:opacity-50"
            >
              {busy === 'narrate' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
              Generate narrative
            </button>
            <Link
              href={`/in-season/${tenantSlug}/runs/${runId}/decision-pack`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90"
            >
              <FileDown className="h-3.5 w-3.5" />
              Decision pack PDF
            </Link>
          </>
        )}
      </div>

      {/* Paso 2 · Generative CTAs (only when run is complete) */}
      {isComplete && (
        <div className="flex flex-wrap gap-2 items-center justify-end mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-carbon/45 uppercase tracking-[0.08em] mr-1">
            <Wand2 className="h-3 w-3" />
            Generative
          </div>
          <button
            onClick={() =>
              post(`/api/in-season/runs/${runId}/propose-skus`, 'propose-skus', { count: 8 })
            }
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/75 text-[11px] font-semibold hover:bg-carbon/[0.08] disabled:opacity-50"
          >
            {busy === 'propose-skus' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <PackagePlus className="h-3 w-3" />
            )}
            Propose new SKUs
          </button>
          <button
            onClick={() =>
              post(`/api/in-season/runs/${runId}/propose-extensions`, 'propose-extensions', {
                count: 4,
              })
            }
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/75 text-[11px] font-semibold hover:bg-carbon/[0.08] disabled:opacity-50"
          >
            {busy === 'propose-extensions' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Layers3 className="h-3 w-3" />
            )}
            Family extensions
          </button>
          {familyCodes.length > 0 && (
            <>
              <select
                value={paletteFamily}
                onChange={(e) => setPaletteFamily(e.target.value)}
                disabled={busy != null}
                className="text-[11px] px-2 py-1 rounded-full bg-carbon/[0.04] text-carbon/75 border-0 focus:outline-none focus:bg-carbon/[0.08] disabled:opacity-50"
              >
                {familyCodes.map((f) => (
                  <option key={f} value={f}>
                    {f.length > 28 ? `${f.slice(0, 28)}…` : f}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  paletteFamily &&
                  post(`/api/in-season/runs/${runId}/recommend-palette`, 'recommend-palette', {
                    familyCode: paletteFamily,
                  })
                }
                disabled={busy != null || !paletteFamily}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/75 text-[11px] font-semibold hover:bg-carbon/[0.08] disabled:opacity-50"
              >
                {busy === 'recommend-palette' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Palette className="h-3 w-3" />
                )}
                Recommend palette
              </button>
            </>
          )}
        </div>
      )}

      {note && <p className="text-[11px] text-emerald-700 max-w-xs text-right">{note}</p>}
      {err && <p className="text-[11px] text-red-700 max-w-xs text-right">{err}</p>}
    </div>
  );
}
