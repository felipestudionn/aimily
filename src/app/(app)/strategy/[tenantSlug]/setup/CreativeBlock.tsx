'use client';

/**
 * CreativeBlock — Block 1 MoodboardContent pattern adapted to Strategy
 *
 * Single workspace (NO tabs per Codex v2 P3): drag-and-drop upload + image
 * grid + silent analysis + 4 research mini-blocks below + synthesis form.
 *
 * Pinterest integration deferred to follow-up PR: would require either
 * (a) extending /api/strategy/moodboard/upload to accept source_url, or
 * (b) a new /api/strategy/moodboard/import-pin endpoint. Empty state shows
 * a "Pinterest coming soon" pill so the affordance is visible.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Upload, X, Sparkles, FlaskConical, BarChart3, Compass, Globe } from 'lucide-react';

interface Tenant {
  id: string;
  slug: string;
  display_name: string;
}

interface ExistingBrief {
  id: string;
  name: string;
  description: string | null;
  color_story: string[] | null;
  archetypes_focus: string[] | null;
  family_pivot: Record<string, number> | null;
  creative_narrative: string | null;
}

interface Props {
  tenant: Tenant;
  existingBrief: ExistingBrief | null;
  gatingBlocked: boolean;
  onSaved: () => void;
}

interface ResearchResult {
  type: string;
  trends?: Array<{ title: string; description?: string; sources?: string[] }>;
  raw_text?: string;
  citations?: string[];
}

const RESEARCH_TYPES: Array<{
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'trends-global', title: 'Global trends', description: 'Macro fashion signals for the upcoming season.', icon: Globe },
  { key: 'deep-dive', title: 'Deep dive', description: 'Drill into one direction or category.', icon: Compass },
  { key: 'live-signals', title: 'Live signals', description: 'Real-time runway, retail and street signals.', icon: BarChart3 },
  { key: 'competitors', title: 'Competitors', description: 'What peers are doing right now.', icon: FlaskConical },
];

export function CreativeBlock({ tenant, existingBrief, gatingBlocked, onSaved }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Moodboard state.
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState('');

  // Research state.
  const [researchByType, setResearchByType] = useState<Record<string, ResearchResult | null>>({});
  const [researchLoading, setResearchLoading] = useState<string | null>(null);
  const [selectedTrendTitles, setSelectedTrendTitles] = useState<string[]>([]);
  const [deepDiveTopic, setDeepDiveTopic] = useState('');

  // Synthesis (form) state — auto-fills via /api/strategy/briefs/discover.
  const [name, setName] = useState(existingBrief?.name ?? '');
  const [description, setDescription] = useState(existingBrief?.description ?? '');
  const [colorStory, setColorStory] = useState((existingBrief?.color_story ?? []).join(', '));
  const [archetypesFocus, setArchetypesFocus] = useState((existingBrief?.archetypes_focus ?? []).join(', '));
  const [familyPivotJson, setFamilyPivotJson] = useState(
    existingBrief?.family_pivot ? JSON.stringify(existingBrief.family_pivot, null, 2) : ''
  );
  const [creativeNarrative, setCreativeNarrative] = useState(existingBrief?.creative_narrative ?? '');
  const [discovering, setDiscovering] = useState(false);
  const [provenance, setProvenance] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // ── Upload handlers ────────────────────────────────────────────────────
  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1}/${files.length}…`);
      try {
        const form = new FormData();
        form.append('file', files[i]);
        form.append('tenant_slug', tenant.slug);
        const res = await fetch('/api/strategy/moodboard/upload', {
          method: 'POST',
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.signed_url) newUrls.push(data.signed_url);
        }
      } catch {
        /* skip failed */
      }
    }
    if (newUrls.length > 0) setImages((prev) => [...prev, ...newUrls]);
    setUploading(false);
    setUploadProgress('');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
  };

  // ── Silent auto-analysis at ≥5 images (matches Block 1 trigger) ────────
  useEffect(() => {
    if (images.length < 5 || analyzing) return;
    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const res = await fetch('/api/ai/analyze-moodboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrls: images }),
        });
        if (res.ok) {
          const result = await res.json();
          const lines = [
            result.moodDescription && `Mood: ${result.moodDescription}`,
            result.keyColors?.length && `Colors: ${result.keyColors.join(', ')}`,
            result.keyMaterials?.length && `Materials: ${result.keyMaterials.join(', ')}`,
            result.keyArchetypes?.length && `Archetypes: ${result.keyArchetypes.join(', ')}`,
          ].filter(Boolean) as string[];
          setAnalysisSummary(lines.join('\n'));
        }
      } catch {
        /* silent failure — analysis is a hint, not a gate */
      } finally {
        setAnalyzing(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join('|')]);

  // ── Research mini-blocks ───────────────────────────────────────────────
  const runResearch = async (type: string) => {
    setResearchLoading(type);
    try {
      const body: Record<string, unknown> = { type };
      if (type === 'deep-dive') body.topic = deepDiveTopic || 'fashion trends';
      const res = await fetch('/api/ai/creative-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setResearchByType((prev) => ({ ...prev, [type]: data }));
      }
    } catch {
      /* keep state empty on failure */
    } finally {
      setResearchLoading(null);
    }
  };

  const toggleTrend = (title: string) => {
    setSelectedTrendTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  // ── Synthesis · discover endpoint pre-populates the form ───────────────
  const handleDiscover = async () => {
    setDiscovering(true);
    setError('');
    try {
      const res = await fetch('/api/strategy/briefs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenant.slug,
          moodboard: { imageUrls: images },
          selected_trends: selectedTrendTitles,
          language: 'es',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Discover failed (${res.status})`);
      }
      const data = await res.json();
      const draft = data.draft ?? data;
      if (draft?.name) setName(draft.name);
      if (draft?.description) setDescription(draft.description);
      if (Array.isArray(draft?.color_story)) setColorStory(draft.color_story.join(', '));
      if (Array.isArray(draft?.archetypes_focus)) setArchetypesFocus(draft.archetypes_focus.join(', '));
      if (draft?.family_pivot && Object.keys(draft.family_pivot).length > 0) {
        setFamilyPivotJson(JSON.stringify(draft.family_pivot, null, 2));
      }
      if (draft?.creative_narrative) setCreativeNarrative(draft.creative_narrative);
      const sources = draft?.sources ?? data.context_used ?? {};
      const parts: string[] = [];
      if (sources.moodboard_image_count != null) parts.push(`${sources.moodboard_image_count} images`);
      if (selectedTrendTitles.length > 0) parts.push(`${selectedTrendTitles.length} trends`);
      if (sources.top_winner_count != null) parts.push(`${sources.top_winner_count} winners`);
      if (parts.length > 0) setProvenance(`Draft filled from ${parts.join(' + ')}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discover failed');
    } finally {
      setDiscovering(false);
    }
  };

  // ── Save brief ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let familyPivot: Record<string, number> = {};
      if (familyPivotJson.trim()) {
        try {
          familyPivot = JSON.parse(familyPivotJson);
        } catch {
          throw new Error('family_pivot must be valid JSON');
        }
      }

      const res = await fetch('/api/strategy/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          name: name || 'Creative brief',
          description: description || null,
          color_story: colorStory.split(',').map((s) => s.trim()).filter(Boolean),
          archetypes_focus: archetypesFocus.split(',').map((s) => s.trim()).filter(Boolean),
          family_pivot: familyPivot,
          creative_narrative: creativeNarrative || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      router.refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12">
      {/* Moodboard surface (Block 1 verbatim shape) */}
      <section className="bg-white rounded-[20px] p-8 md:p-12">
        <header className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
              Moodboard
            </h2>
            <p className="text-[13px] text-carbon/50 mt-1">
              Drop reference images. Aimily reads the visual codes silently at ≥5 images.
            </p>
          </div>
          <span className="text-[10px] tracking-[0.15em] uppercase text-carbon/35 px-2.5 py-0.5 rounded-full bg-carbon/[0.04]">
            Pinterest · soon
          </span>
        </header>

        <input
          ref={fileInputRef}
          id="moodboard-file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleUpload(e.target.files);
            e.target.value = '';
          }}
        />

        {images.length === 0 ? (
          <label
            htmlFor="moodboard-file-input"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-4 py-20 px-6 rounded-[20px] border-2 border-dashed transition-all cursor-pointer ${
              dragActive
                ? 'border-carbon/50 bg-carbon/[0.05]'
                : 'border-carbon/[0.15] hover:border-carbon/30 hover:bg-carbon/[0.02]'
            } ${uploading || gatingBlocked ? 'opacity-40 pointer-events-none' : ''}`}
          >
            <div className="w-14 h-14 rounded-full bg-carbon/[0.04] flex items-center justify-center">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-carbon/50" /> : <Upload className="h-6 w-6 text-carbon/50" />}
            </div>
            <p className="text-[15px] font-medium text-carbon/70">
              {uploading ? uploadProgress : 'Drag images or click to upload'}
            </p>
            <p className="text-[13px] text-carbon/35 max-w-[280px] text-center">
              JPG, PNG, WEBP, or HEIC · max 25MB · uploaded to your tenant\'s private bucket.
            </p>
          </label>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square bg-carbon/[0.04] rounded-[10px] overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-carbon/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Silent analysis status */}
            <div className="flex items-center justify-center gap-2 text-[12px] text-carbon/45 min-h-[18px]">
              {images.length < 5 ? (
                <span>{images.length}/5 — add {5 - images.length} more to read the tone.</span>
              ) : analyzing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Reading visual signals…</span>
                </>
              ) : analysisSummary ? (
                <span className="italic">Tone saved · synthesis ready</span>
              ) : null}
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-carbon/[0.04] hover:bg-carbon/[0.08] text-[13px] font-medium text-carbon/70 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add more
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Research mini-blocks */}
      <section>
        <div className="text-center mb-6">
          <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
            Market research
          </h2>
          <p className="text-[13px] text-carbon/50 mt-1">
            Pull live signals to ground the brief. Select the trends you want to fold into synthesis.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {RESEARCH_TYPES.map((opt) => {
            const Icon = opt.icon;
            const result = researchByType[opt.key];
            const isLoading = researchLoading === opt.key;
            return (
              <div key={opt.key} className="bg-white rounded-[20px] p-6 md:p-8">
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-carbon/55" />
                      <h3 className="text-[16px] font-semibold text-carbon tracking-[-0.02em]">{opt.title}</h3>
                    </div>
                    <p className="text-[12px] text-carbon/50 mt-1">{opt.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runResearch(opt.key)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/70 hover:bg-carbon/[0.04] disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {result ? 'Refresh' : 'Run'}
                  </button>
                </header>
                {opt.key === 'deep-dive' && (
                  <input
                    type="text"
                    value={deepDiveTopic}
                    onChange={(e) => setDeepDiveTopic(e.target.value)}
                    placeholder='topic (e.g. "bouclé tailoring revival")'
                    className="w-full mb-3 px-3 py-2 text-[13px] bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30"
                  />
                )}
                {result && (
                  <div className="space-y-2">
                    {(result.trends ?? []).slice(0, 6).map((trend, i) => {
                      const selected = selectedTrendTitles.includes(trend.title);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleTrend(trend.title)}
                          className={`w-full text-left p-3 rounded-[10px] transition-all ${
                            selected
                              ? 'bg-carbon text-white'
                              : 'bg-carbon/[0.03] hover:bg-carbon/[0.06] text-carbon/80'
                          }`}
                        >
                          <p className="text-[13px] font-medium">{trend.title}</p>
                          {trend.description && (
                            <p className={`text-[12px] mt-1 ${selected ? 'text-white/70' : 'text-carbon/50'}`}>
                              {trend.description}
                            </p>
                          )}
                        </button>
                      );
                    })}
                    {(result.trends?.length ?? 0) === 0 && result.raw_text && (
                      <p className="text-[12px] text-carbon/60 leading-relaxed">{result.raw_text.slice(0, 400)}…</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Synthesis */}
      <section className="bg-white rounded-[20px] p-8 md:p-12">
        <header className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
              Synthesis
            </h2>
            <p className="text-[13px] text-carbon/50 mt-1">
              The brief Aimily will use. Auto-fill from your moodboard + selected trends, then edit anything.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDiscover}
            disabled={discovering || images.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 disabled:opacity-40 transition-colors"
          >
            {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Auto-fill from moodboard
          </button>
        </header>

        {provenance && (
          <p className="text-[12px] text-carbon/50 italic mb-5">{provenance}</p>
        )}

        <div className="space-y-5">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none resize-none"
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Color story (comma-separated)">
              <input
                type="text"
                value={colorStory}
                onChange={(e) => setColorStory(e.target.value)}
                placeholder="Dusty Rose, Bone, Midnight"
                className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30"
              />
            </Field>
            <Field label="Archetype focus (comma-separated)">
              <input
                type="text"
                value={archetypesFocus}
                onChange={(e) => setArchetypesFocus(e.target.value)}
                placeholder="minimal-architect, editorial-heritage"
                className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30"
              />
            </Field>
          </div>
          <Field label="Family pivot (JSON: family_code → -0.5..+0.5)">
            <textarea
              value={familyPivotJson}
              onChange={(e) => setFamilyPivotJson(e.target.value)}
              rows={3}
              placeholder='{ "SASTRE_FABRIC": 0.15 }'
              className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none font-mono resize-none placeholder:text-carbon/30"
            />
          </Field>
          <Field label="Creative narrative">
            <textarea
              value={creativeNarrative}
              onChange={(e) => setCreativeNarrative(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none resize-none"
            />
          </Field>
        </div>

        {error && (
          <p className="mt-5 text-[13px] text-red-700 bg-red-50 px-4 py-3 rounded-[12px]">{error}</p>
        )}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save brief & continue to buy strategy
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-carbon/50 uppercase tracking-[0.08em] mb-2">{label}</span>
      {children}
    </label>
  );
}
