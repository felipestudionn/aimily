'use client';

/* Per-scenario replenishment allocator trigger. POSTs to the allocate
   endpoint then router.refresh() so the page re-renders with the new
   strategy_replenishment_allocations rows visible. */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackageOpen, Loader2 } from 'lucide-react';

interface Props {
  runId: string;
  scenarioId: string;
  allocationsCount: number;
}

export function AllocateReplenishmentTrigger({ runId, scenarioId, allocationsCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const fire = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(
        `/api/strategy/runs/${runId}/scenarios/${scenarioId}/allocate-replenishment`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={fire}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/75 text-[11px] font-semibold hover:bg-carbon/[0.08] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackageOpen className="h-3 w-3" />}
        {allocationsCount > 0 ? 'Re-allocate' : 'Allocate replenishment'}
      </button>
      {err && <p className="text-[10px] text-red-700 mt-1">{err}</p>}
    </div>
  );
}
