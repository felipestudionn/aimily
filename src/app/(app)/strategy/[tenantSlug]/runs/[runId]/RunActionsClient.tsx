'use client';

/* Run action panel: execute pipeline, run backtest, generate narratives.
   Client because we POST + then router.refresh() so the page repaints with
   fresh data from the server. */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, Activity, Brain, Loader2 } from 'lucide-react';

interface Props {
  runId: string;
  runStatus: string;
  hasBacktest: boolean;
}

export function RunActionsClient({ runId, runStatus, hasBacktest }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'execute' | 'backtest' | 'narrate' | null>(null);
  const [err, setErr] = useState<string>('');

  const exec = async (
    path: string,
    label: 'execute' | 'backtest' | 'narrate'
  ) => {
    setBusy(label);
    setErr('');
    try {
      const res = await fetch(path, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const canExecute = runStatus === 'pending' || runStatus === 'failed';
  const canBacktestOrNarrate = runStatus === 'complete';

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {canExecute && (
          <button
            onClick={() => exec(`/api/strategy/runs/${runId}/execute`, 'execute')}
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
        {canBacktestOrNarrate && (
          <>
            <button
              onClick={() => exec(`/api/strategy/runs/${runId}/backtest`, 'backtest')}
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
              onClick={() => exec(`/api/strategy/runs/${runId}/narrate`, 'narrate')}
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
          </>
        )}
      </div>
      {err && <p className="text-[11px] text-red-700 max-w-xs text-right">{err}</p>}
    </div>
  );
}
