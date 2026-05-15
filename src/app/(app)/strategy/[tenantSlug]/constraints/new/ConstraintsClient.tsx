'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';

interface Props {
  tenantSlug: string;
  tenantId: string;
}

export function ConstraintsClient({ tenantSlug, tenantId }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetSkus, setTargetSkus] = useState('');
  const [targetBudget, setTargetBudget] = useState('');
  const [targetMargin, setTargetMargin] = useState('');
  const [positioning, setPositioning] = useState('');
  const [familySharesText, setFamilySharesText] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');

    let familyShareTargets: Record<string, number> = {};
    if (familySharesText.trim()) {
      try {
        familyShareTargets = JSON.parse(familySharesText);
      } catch {
        setErr('family_share_targets must be valid JSON: {"family_code": 0.30, ...}');
        setBusy(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/strategy/constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          name,
          description: description || null,
          target_total_skus: targetSkus ? parseInt(targetSkus, 10) : null,
          target_buy_budget: targetBudget ? parseFloat(targetBudget) : null,
          target_avg_margin: targetMargin ? parseFloat(targetMargin) / 100 : null,
          positioning_tier: positioning || null,
          family_share_targets: familyShareTargets,
          hard_exclusions: exclusions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Failed (${res.status})`);
      }
      router.push(`/strategy/${tenantSlug}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[20px] p-8 md:p-10 space-y-5">
      <Field label="Name *">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="V27 pre-season constraints · women's apparel"
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30"
        />
      </Field>
      <Field label="Description (optional)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none resize-none"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Target total SKUs">
          <input
            type="number"
            value={targetSkus}
            onChange={(e) => setTargetSkus(e.target.value)}
            placeholder="450"
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
          />
        </Field>
        <Field label="Target buy budget (€)">
          <input
            type="number"
            step="0.01"
            value={targetBudget}
            onChange={(e) => setTargetBudget(e.target.value)}
            placeholder="2500000"
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
          />
        </Field>
        <Field label="Target avg margin (%)">
          <input
            type="number"
            step="0.1"
            value={targetMargin}
            onChange={(e) => setTargetMargin(e.target.value)}
            placeholder="62"
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
          />
        </Field>
        <Field label="Positioning tier">
          <select
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
          >
            <option value="">— Auto —</option>
            <option value="premium">Premium</option>
            <option value="mid">Mid</option>
            <option value="value">Value</option>
          </select>
        </Field>
      </div>
      <Field label="Family share targets · JSON map of family_code → share (0-1)">
        <textarea
          value={familySharesText}
          onChange={(e) => setFamilySharesText(e.target.value)}
          rows={3}
          placeholder='{"W.A FLUIDOS LARGO - 1500": 0.30, "W.A.SASTRE FABRIC - 1003": 0.20}'
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none font-mono resize-none"
        />
      </Field>
      <Field label="Hard exclusions · comma-separated scope_refs">
        <input
          type="text"
          value={exclusions}
          onChange={(e) => setExclusions(e.target.value)}
          placeholder="4786 166 305, 8307 47 427"
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
        />
      </Field>

      {err && <p className="text-[13px] text-red-700 bg-red-50 px-4 py-3 rounded-[12px]">{err}</p>}

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save constraints
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
