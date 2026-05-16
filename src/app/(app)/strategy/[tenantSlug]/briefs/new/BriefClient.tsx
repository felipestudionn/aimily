'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Wand2, AlertCircle, ChevronDown } from 'lucide-react';
import {
  MoodboardBriefUploader,
  type MoodboardExtractionResult,
} from './MoodboardBriefUploader';

interface Props {
  tenantSlug: string;
  tenantId: string;
  availableColors: string[];
  availableArchetypes: string[];
}

export function BriefClient({
  tenantSlug,
  tenantId,
  availableColors,
  availableArchetypes,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorStory, setColorStory] = useState<string[]>([]);
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [familyPivotJson, setFamilyPivotJson] = useState('');
  const [narrative, setNarrative] = useState('');
  const [busy, setBusy] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverNote, setDiscoverNote] = useState<string | null>(null);
  const [discoverWarning, setDiscoverWarning] = useState<string | null>(null);
  const [moodboardAnalysis, setMoodboardAnalysis] = useState<
    MoodboardExtractionResult['moodboard_analysis'] | null
  >(null);
  const [showDataDrivenFallback, setShowDataDrivenFallback] = useState(false);
  const [err, setErr] = useState('');

  /** Apply a discovery result to empty form fields. Used by both the
      moodboard extraction flow AND the data-driven fallback. */
  const applyDraft = (result: MoodboardExtractionResult, sourceLabel: string) => {
    const draft = result.draft;
    if (!name) setName(draft.name || 'AI-discovered direction');
    if (!description) setDescription(draft.description || '');
    if (colorStory.length === 0 && Array.isArray(draft.color_story))
      setColorStory(draft.color_story);
    if (archetypes.length === 0 && Array.isArray(draft.archetypes_focus))
      setArchetypes(draft.archetypes_focus);
    if (!familyPivotJson && draft.family_pivot && Object.keys(draft.family_pivot).length > 0) {
      setFamilyPivotJson(JSON.stringify(draft.family_pivot, null, 2));
    }
    if (!narrative && draft.creative_narrative) setNarrative(draft.creative_narrative);
    setMoodboardAnalysis(result.moodboard_analysis ?? null);
    setDiscoverNote(`Draft filled from ${sourceLabel}.`);
    if (draft.data_sufficiency_warning) setDiscoverWarning(draft.data_sufficiency_warning);
  };

  /** Data-driven fallback: brand DNA + portfolio winners + Perplexity trends.
      No moodboard input. Surfaces only when the merchandiser explicitly
      opts in (collapsed by default — the moodboard flow is the primary). */
  const handleDataDrivenDiscover = async () => {
    setDiscovering(true);
    setErr('');
    setDiscoverNote(null);
    setDiscoverWarning(null);
    try {
      const res = await fetch('/api/strategy/briefs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_slug: tenantSlug }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Failed (${res.status})`);
      }
      const json = (await res.json()) as MoodboardExtractionResult;
      const sources = (json.draft.sources || {}) as Record<string, unknown>;
      const parts: string[] = [];
      if (sources.brand_profile_used) parts.push('brand DNA used');
      if (sources.brand_profile_auto_discovered)
        parts.push('brand DNA auto-discovered via Perplexity');
      if (typeof sources.trends_count === 'number' && sources.trends_count > 0)
        parts.push(`${sources.trends_count} trend signals`);
      if (typeof sources.winners_count === 'number' && sources.winners_count > 0)
        parts.push(`${sources.winners_count} portfolio winners`);
      applyDraft(json, parts.join(', ') || 'tenant context');
    } catch (e: any) {
      setErr(`AI discovery: ${e.message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const handleMoodboardExtraction = (result: MoodboardExtractionResult) => {
    const count =
      (result.context_used as any)?.moodboard_image_count ??
      result.moodboard_analysis?.keyColors.length ??
      0;
    applyDraft(
      result,
      `${count} reference image${count === 1 ? '' : 's'}${result.moodboard_analysis ? ' · vision decoded' : ''}`
    );
  };

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => setter((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');

    let familyPivot: Record<string, number> = {};
    if (familyPivotJson.trim()) {
      try {
        familyPivot = JSON.parse(familyPivotJson);
      } catch {
        setErr('family_pivot must be valid JSON: {"family_code": 0.15, "another_family": -0.10}');
        setBusy(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/strategy/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          name,
          description: description || null,
          color_story: colorStory,
          archetypes_focus: archetypes,
          family_pivot: familyPivot,
          creative_narrative: narrative || null,
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
      {/* PRIMARY · Moodboard → brief — drag images / paste Pinterest URLs.
          Mirrors Block 1's moodboard analyse loop, scoped to Strategy. */}
      <MoodboardBriefUploader
        tenantSlug={tenantSlug}
        busy={busy}
        onExtracted={handleMoodboardExtraction}
      />

      {/* Surface the moodboard analysis the model extracted from the images */}
      {moodboardAnalysis && (
        <div className="rounded-[12px] bg-carbon/[0.03] p-4 space-y-2 text-[11px] text-carbon/70 leading-[1.5]">
          <p className="text-[10px] uppercase tracking-[0.08em] text-carbon/45">
            Vision decoded · the visual signals behind this draft
          </p>
          {moodboardAnalysis.moodDescription && <p>{moodboardAnalysis.moodDescription}</p>}
          {moodboardAnalysis.keyColors.length > 0 && (
            <p>
              <strong className="text-carbon">Colors:</strong>{' '}
              {moodboardAnalysis.keyColors.join(' · ')}
            </p>
          )}
          {moodboardAnalysis.keyMaterials.length > 0 && (
            <p>
              <strong className="text-carbon">Materials:</strong>{' '}
              {moodboardAnalysis.keyMaterials.join(' · ')}
            </p>
          )}
          {moodboardAnalysis.keySilhouettes.length > 0 && (
            <p>
              <strong className="text-carbon">Silhouettes:</strong>{' '}
              {moodboardAnalysis.keySilhouettes.join(' · ')}
            </p>
          )}
          {moodboardAnalysis.keyArchetypes.length > 0 && (
            <p>
              <strong className="text-carbon">Archetypes:</strong>{' '}
              {moodboardAnalysis.keyArchetypes.join(' · ')}
            </p>
          )}
          {moodboardAnalysis.detectedBrandReferences.length > 0 && (
            <p>
              <strong className="text-carbon">Brand refs detected:</strong>{' '}
              {moodboardAnalysis.detectedBrandReferences.join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* SECONDARY · Data-driven fallback (no moodboard available) */}
      <button
        type="button"
        onClick={() => setShowDataDrivenFallback((s) => !s)}
        className="inline-flex items-center gap-1 text-[11px] text-carbon/50 hover:text-carbon/80 transition-colors"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${showDataDrivenFallback ? 'rotate-180' : ''}`}
        />
        No moodboard yet? Use brand DNA + trends instead
      </button>
      {showDataDrivenFallback && (
        <div className="rounded-[12px] bg-carbon/[0.03] p-4 -mt-2 space-y-3">
          <p className="text-[12px] text-carbon/65 leading-[1.5]">
            Drafts from your brand DNA, current Perplexity trend signals, and your portfolio winners.
            Slower (~30s) and less visual than uploading a moodboard, but works when you have no
            references yet.
          </p>
          <button
            type="button"
            onClick={handleDataDrivenDiscover}
            disabled={busy || discovering}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-carbon/[0.15] text-carbon/75 text-[12px] font-semibold hover:bg-carbon/[0.04] disabled:opacity-50"
          >
            {discovering ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            Discover from brand DNA + trends
          </button>
        </div>
      )}

      {discoverNote && (
        <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-[8px]">
          {discoverNote}
        </p>
      )}
      {discoverWarning && (
        <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-[8px] flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          {discoverWarning}
        </p>
      )}

      <div className="h-px bg-carbon/[0.06] -mx-2" />

      <Field label="Name *">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="V27 creative direction · ocre & tabaco palette"
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

      <Field label="Color story">
        {availableColors.length === 0 ? (
          <p className="text-[12px] text-carbon/40 italic">
            No color taxonomy defined yet — colors won&apos;t map to specific SKU colorways.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableColors.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggle(setColorStory, c)}
                className={`px-3 py-1.5 rounded-full text-[12px] uppercase tracking-[0.06em] transition-colors ${
                  colorStory.includes(c)
                    ? 'bg-carbon text-white'
                    : 'bg-carbon/[0.06] text-carbon/60 hover:bg-carbon/[0.1]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label="Archetype focus">
        {availableArchetypes.length === 0 ? (
          <p className="text-[12px] text-carbon/40 italic">No archetypes defined for this tenant.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableArchetypes.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => toggle(setArchetypes, a)}
                className={`px-3 py-1.5 rounded-full text-[12px] tracking-[-0.01em] transition-colors ${
                  archetypes.includes(a)
                    ? 'bg-carbon text-white'
                    : 'bg-carbon/[0.06] text-carbon/60 hover:bg-carbon/[0.1]'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label="Family pivot · JSON map of family_code → delta (-1 to 1)">
        <textarea
          value={familyPivotJson}
          onChange={(e) => setFamilyPivotJson(e.target.value)}
          rows={3}
          placeholder='{"W.E FAMILIAS LARGO - 1511": 0.15, "W.A.SASTRE FABRIC - 1003": -0.10}'
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none font-mono resize-none"
        />
      </Field>

      <Field label="Creative narrative (free text — fed to LLM)">
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={4}
          placeholder="Pivot to elevated everyday — tonal layering in ocre/tabaco, sastrería refined into deconstructed shapes…"
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30 resize-none"
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
          Save brief
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
