'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, Loader2 } from 'lucide-react';

interface SourceRow {
  id: string;
  season: string;
  market: string | null;
  source_format: string;
  observation_date: string;
  record_count: number;
}

interface ConstraintRow {
  id: string;
  name: string;
  target_total_skus: number | null;
  target_avg_margin: number | null;
}

interface BriefRow {
  id: string;
  name: string;
}

interface Props {
  tenantSlug: string;
  sources: SourceRow[];
  constraints: ConstraintRow[];
  briefs: BriefRow[];
}

export function NewRunClient({ tenantSlug, sources, constraints, briefs }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(sources.map((s) => s.id));
  const [constraintId, setConstraintId] = useState<string>('');
  const [briefId, setBriefId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggleSource = (id: string) =>
    setSelectedSources((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSources.length === 0) {
      setErr('Pick at least one source');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/strategy/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          name: name || null,
          constraint_id: constraintId || null,
          creative_brief_id: briefId || null,
          source_set_ids: selectedSources,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      router.push(`/strategy/${tenantSlug}/runs/${data.run_id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[20px] p-8 md:p-10 space-y-6">
      <Field label="Run name (optional)">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="V27 pre-season review · women's apparel"
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
        />
      </Field>

      <Field label="Sources to ingest (processed only)">
        {sources.length === 0 ? (
          <p className="text-[13px] text-amber-700 bg-amber-50 px-4 py-3 rounded-[12px]">
            No processed sources available. Upload + parse at least one source first.
          </p>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-[12px] bg-carbon/[0.03] cursor-pointer hover:bg-carbon/[0.05]"
              >
                <input
                  type="checkbox"
                  checked={selectedSources.includes(s.id)}
                  onChange={() => toggleSource(s.id)}
                  className="rounded border-carbon/20"
                />
                <span className="text-[13px] text-carbon flex-1">
                  <strong>{s.season}</strong> · {s.source_format} · {s.record_count} records ·{' '}
                  {new Date(s.observation_date).toLocaleDateString()}
                  {s.market ? ` · ${s.market}` : ''}
                </span>
              </label>
            ))}
          </div>
        )}
      </Field>

      <Field label="Constraints set · Bucket A (optional)">
        <select
          value={constraintId}
          onChange={(e) => setConstraintId(e.target.value)}
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
        >
          <option value="">— None (use defaults) —</option>
          {constraints.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.target_total_skus ? ` · ${c.target_total_skus} SKUs` : ''}
              {c.target_avg_margin
                ? ` · ${(Number(c.target_avg_margin) * 100).toFixed(0)}% margin`
                : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Creative brief · Bucket B (optional)">
        <select
          value={briefId}
          onChange={(e) => setBriefId(e.target.value)}
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
        >
          <option value="">— None (pure data-driven) —</option>
          {briefs.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      {err && <p className="text-[13px] text-red-700 bg-red-50 px-4 py-3 rounded-[12px]">{err}</p>}

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={busy || sources.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Create run
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-carbon/50 uppercase tracking-[0.08em] mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}
