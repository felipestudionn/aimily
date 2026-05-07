'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, ChevronDown, User, Sparkles, Image, Fingerprint, Globe, Microscope, Radio, Building2, X, Loader2, Upload, ExternalLink, Palette, Type, Mic, ThumbsUp, ThumbsDown, RefreshCw, Plus, Pencil } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { SegmentedPill } from '@/components/ui/segmented-pill';
import { DecisionCard, DecisionCardGrid } from '@/components/workspace/DecisionCard';
import { TypographySpecimen } from '@/components/workspace/TypographySpecimen';
import { VoiceToneField } from '@/components/workspace/VoiceToneField';
import { VisualIdentityField } from '@/components/workspace/VisualIdentityField';
import { BrandBoardCanvas } from '@/components/workspace/BrandBoardCanvas';
import { usePaletteSync } from '@/components/workspace/ColorPaletteField';

/* ─── AI generation helper ─── */
async function generateCreative(
  type: string,
  input: Record<string, string>,
  language?: string,
): Promise<{ result: unknown; error?: string }> {
  const res = await fetch('/api/ai/creative-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    return { result: null, error: err.error || 'AI generation failed' };
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   Creative & Brand Block — 3-Step Flow
   Vision → Research → Synthesis
   Expand/Collapse animation: click START → block fills grid,
   others collapse to icons. Confirm → back to 2x2.
   ═══════════════════════════════════════════════════════════ */

interface MiniBlock {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
}

type InputMode = 'free' | 'assisted' | 'ai';

interface BlockData {
  [blockId: string]: {
    mode: InputMode;
    confirmed: boolean;
    data: Record<string, unknown>;
  };
}

const STEPS = [
  {
    id: 'vision',
    name: 'Creative Vision',
    nameEs: 'Visión Creativa',
    description: 'Define your consumer, collection vibe, moodboard, and brand DNA',
    blocks: [
      { id: 'brand-dna', name: 'Brand DNA', nameEs: 'Identidad de Marca', description: 'Extract or create your brand identity — logo, colors, typography, tone', icon: Fingerprint, available: true },
      { id: 'consumer', name: 'Consumer Definition', nameEs: 'Definición de Consumidor', description: 'Define your target consumer profiles with AI-assisted personas', icon: User, available: true },
      { id: 'moodboard', name: 'Moodboard', nameEs: 'Moodboard', description: 'Upload photos or connect Pinterest for visual references', icon: Image, available: true },
      { id: 'vibe', name: 'Collection Vibe', nameEs: 'Vibe de la Colección', description: 'Set the spirit and creative direction of the collection', icon: Sparkles, available: true },
    ] as MiniBlock[],
  },
  {
    id: 'research',
    name: 'Market Research',
    nameEs: 'Investigación de Mercado',
    description: 'Explore trends, signals, and competitive landscape',
    blocks: [
      { id: 'global-trends', name: 'Global Trends', nameEs: 'Tendencias Globales', description: 'Macro-trends from runways for your season', icon: Globe, available: true },
      { id: 'deep-dive', name: 'Deep Dive', nameEs: 'Deep Dive', description: 'Micro-trends by product type, market, and season', icon: Microscope, available: true },
      { id: 'live-signals', name: 'Live Signals', nameEs: 'Señales en Vivo', description: 'Viral trends from social media right now', icon: Radio, available: true },
      { id: 'competitors', name: 'Competitors & References', nameEs: 'Competencia y Referencia', description: 'Analyze competitor brands and positioning', icon: Building2, available: true },
    ] as MiniBlock[],
  },
  {
    id: 'synthesis',
    name: 'Creative Synthesis',
    nameEs: 'Síntesis Creativa',
    description: 'Consolidated creative input — vision + selected trends ready for the next block',
    blocks: [] as MiniBlock[],
  },
];

const INPUT_MODES: { id: InputMode; label: string; description: string }[] = [
  { id: 'free', label: 'Free', description: 'You fill everything manually' },
  { id: 'assisted', label: 'Assisted', description: 'Give direction, AI complements' },
  { id: 'ai', label: 'AI Proposal', description: 'aimily generates from your collection context — you edit and approve' },
];

/* ─── Expanded Block Content Components ─── */

interface ConsumerProfile {
  title: string;
  desc: string;
  // Structured fields populated by the new endpoint shape. Optional for
  // back-compat with older proposals that only have desc.
  essence?: string;
  keyQuote?: string;
  wardrobe?: string[];
  lifestyle?: string[];
  values?: string[];
  status: 'pending' | 'liked' | 'rejected';
  editing?: boolean;
}

interface VibeProposal {
  title: string;
  vibe: string;
  keywords: string;
}

function VibeProposalFlow({
  data, onChange, collectionContext, consumerProfile, generating, setGenerating, error, setError,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  collectionContext: { season: string; collectionName: string };
  consumerProfile?: string;
  generating: boolean;
  setGenerating: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const proposals = (data.vibeProposals as VibeProposal[]) || [];
  const selectedIdx = data.selectedVibe as number | null;
  const isEditing = data.editingVibe as boolean;

  const generateVibes = async () => {
    setGenerating(true);
    setError(null);
    const { result, error: err } = await generateCreative('vibe-proposals', {
      reference: (data.reference as string) || '',
      consumer: consumerProfile || '',
      moodboard: (data._moodboardContext as string) || '',
      ...collectionContext,
    }, language);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { proposals: VibeProposal[] };
    onChange({ ...data, vibeProposals: parsed.proposals || [], selectedVibe: null, editingVibe: false });
    setGenerating(false);
  };

  const selectVibe = (idx: number) => {
    const p = proposals[idx];
    onChange({ ...data, selectedVibe: idx, editingVibe: true, vibe: p.vibe, keywords: p.keywords, vibeTitle: p.title });
  };

  const deselectVibe = () => {
    onChange({ ...data, selectedVibe: null, editingVibe: false, vibe: '', keywords: '', vibeTitle: '' });
  };

  const selected = selectedIdx !== null && selectedIdx !== undefined;

  // Build context summary from existing collection data
  const hasContext = !!(consumerProfile || collectionContext.season || collectionContext.collectionName);
  const contextParts: string[] = [];
  if (collectionContext.collectionName) contextParts.push(`Collection: ${collectionContext.collectionName}`);
  if (collectionContext.season) contextParts.push(`Season: ${collectionContext.season}`);
  if (consumerProfile) contextParts.push(`Consumer: ${consumerProfile.slice(0, 200)}`);
  // Moodboard images are stored in the parent data
  const moodboardData = data._moodboardContext as string | undefined;
  if (moodboardData) contextParts.push(`Moodboard: ${moodboardData}`);

  return (
    <div className="space-y-4">
      {/* Context summary — show what aimily already knows */}
      <div className="bg-carbon/[0.03] border border-carbon/[0.06] p-4 space-y-2">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/50">
          {t.creative.aimilyKnows || 'WHAT AIMILY ALREADY KNOWS'}
        </p>
        {contextParts.length > 0 ? (
          <ul className="space-y-1">
            {contextParts.map((part, i) => (
              <li key={i} className="text-xs text-carbon/60 flex items-start gap-2">
                <Check className="h-3 w-3 mt-0.5 text-carbon/30 flex-shrink-0" />
                {part}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-carbon/40 italic">{t.creative.noContextYet || 'No data yet — fill in other blocks first for better results, or generate directly.'}</p>
        )}
      </div>

      {/* Optional extra direction */}
      <div>
        <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/40 mb-1.5 block">
          {t.creative.optionalDirection || 'EXTRA DIRECTION (OPTIONAL)'}
        </label>
        <input
          type="text"
          value={(data.reference as string) || ''}
          onChange={(e) => onChange({ ...data, reference: e.target.value })}
          placeholder={t.creative.optionalDirectionPlaceholder || "e.g. 'coastal vibes' or leave empty — aimily will propose from context"}
          className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
        />
      </div>

      {/* Generate button — always enabled */}
      <button
        onClick={generateVibes}
        disabled={generating}
        className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {t.creative.generateVibes}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Proposals — pick one */}
      {proposals.length > 0 && !selected && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">
            {t.creative.selectOneDirection}
          </p>
          {proposals.map((p, i) => (
            <button
              key={i}
              onClick={() => selectVibe(i)}
              className="w-full text-left p-5 border border-carbon/[0.08] hover:border-carbon/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-carbon">{p.title}</span>
                <span className="text-xs tracking-[0.1em] uppercase text-carbon/40 opacity-0 group-hover:opacity-100 transition-opacity">{t.creative.selectAction}</span>
              </div>
              <div className="text-xs text-carbon/80 leading-relaxed">{p.vibe}</div>
              <div className="text-xs text-carbon/50 mt-2 tracking-wide">{p.keywords}</div>
            </button>
          ))}
        </div>
      )}

      {/* Selected — editable */}
      {selected && isEditing && (
        <div className="space-y-4 border border-carbon/20 p-5 bg-carbon/[0.02]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">
              {t.creative.editYourVibe}
            </p>
            <button
              onClick={deselectVibe}
              className="text-xs tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors"
            >
              {`← ${t.creative.chooseAnother}`}
            </button>
          </div>
          {/* Title */}
          <div>
            <label className="text-xs font-semibold tracking-[0.1em] uppercase text-carbon/60 mb-1.5 block">{t.creative.titleLabel}</label>
            <input
              type="text"
              value={(data.vibeTitle as string) || ''}
              onChange={(e) => onChange({ ...data, vibeTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm font-medium text-carbon bg-white border border-carbon/[0.12] focus:border-carbon/30 focus:outline-none transition-colors"
            />
          </div>
          {/* Narrative */}
          <div>
            <label className="text-xs font-semibold tracking-[0.1em] uppercase text-carbon/60 mb-1.5 block">{t.creative.creativeNarrative}</label>
            <textarea
              value={(data.vibe as string) || ''}
              onChange={(e) => onChange({ ...data, vibe: e.target.value })}
              className="w-full h-36 px-4 py-3 text-xs text-carbon bg-white border border-carbon/[0.12] focus:border-carbon/30 focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
          {/* Keywords */}
          <div>
            <label className="text-xs font-semibold tracking-[0.1em] uppercase text-carbon/60 mb-1.5 block">{t.creative.keywords}</label>
            <input
              type="text"
              value={(data.keywords as string) || ''}
              onChange={(e) => onChange({ ...data, keywords: e.target.value })}
              className="w-full px-3 py-2 text-xs text-carbon bg-white border border-carbon/[0.12] focus:border-carbon/30 focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Capitalize the first character of a string. Idempotent: already-capital
// strings (proper nouns, brand names, @handles) pass through unchanged.
// Used at the display + commit layer for chip clouds and at the endpoint
// for fresh writes — keeps BD canonical and old lowercase rows readable.
function capitalizeFirst(s: string): string {
  if (!s) return s;
  const first = s.charAt(0);
  const upper = first.toUpperCase();
  return upper === first ? s : upper + s.slice(1);
}

// FichaRow — small two-row layout used across the Consumer entry phase.
// Tiny uppercase label on top, content below. Same rhythm as the editorial
// "para quién / edad / ciudades…" sections.
function FichaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <p className="text-[11px] tracking-[0.15em] uppercase text-carbon/60 mb-2 font-semibold">
        {label}
      </p>
      {children}
    </div>
  );
}

// EditableChipCloud — small reusable for any string[] dimension (cities,
// brands, shops, reads, values, lifestyle). Hover a chip to reveal its
// remove ✕. The trailing + opens an inline input. Enter / blur commits;
// Esc cancels. Used across the Consumer entry phase to let the user
// trim or extend each dimension that aimily pre-filled from the moodboard.
function EditableChipCloud({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));
  const commit = () => {
    const trimmed = inputValue.trim();
    if (trimmed) onChange([...values, capitalizeFirst(trimmed)]);
    setInputValue('');
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {values.map((v, i) => (
        <div
          key={`${v}-${i}`}
          className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] bg-carbon/[0.04] text-carbon/70 transition-all"
        >
          <span>{capitalizeFirst(v)}</span>
          <button
            type="button"
            onClick={() => remove(i)}
            className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 flex items-center justify-center text-carbon/30 hover:text-red-500 transition-opacity"
            aria-label="remove"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {adding ? (
        <input
          autoFocus
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              setAdding(false);
              setInputValue('');
            }
          }}
          placeholder={placeholder}
          className="px-3 py-1.5 rounded-full text-[12px] bg-carbon/[0.06] text-carbon focus:outline-none border-0 min-w-[140px] placeholder:text-carbon/35"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-carbon/[0.04] text-carbon/40 hover:bg-carbon/[0.08] hover:text-carbon transition-all"
          aria-label="add"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ConsumerContent — single canonical mode (no Free/Assisted/AI toggle).
//
// Two phases driven entirely by data.proposals:
//   ENTRY (no proposals yet) — centered question "para quién diseñamos {collection}",
//     four gender chips, optional inline reference field, single CTA.
//   PROPOSAL (proposals exist) — breadcrumb of current params + list of
//     proposal cards with edit/like/reject + "regenerate rejected" affordance.
//
// Pattern aligned with the canonical: aimily situates → asks the bare
// minimum → proposes → user edits → user confirms (parent shell handles
// the confirm; the breadcrumb here lets the user reopen entry to tweak).
function ConsumerContent({ data: rawData, onChange, collectionContext }: { mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void; collectionContext: { season: string; collectionName: string } }) {
  const t = useTranslation();
  const { language } = useLanguage();
  const { id: collectionPlanId } = useParams();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  // 'idle' until we try; 'success' when aimily proposed something; 'empty'
  // when the endpoint succeeded but had nothing to propose; 'error' on
  // network/server failure. Used to keep the caption visible (so the user
  // never feels left in limbo after a fast/silent failure).
  const [suggestionStatus, setSuggestionStatus] = useState<'idle' | 'success' | 'empty' | 'error'>('idle');
  const genderRef = useRef<HTMLDivElement | null>(null);
  // Close gender dropdown on outside click — keeps the chip-with-popover
  // pattern feeling native instead of sticky.
  useEffect(() => {
    if (!genderOpen) return;
    const handler = (e: MouseEvent) => {
      if (genderRef.current && !genderRef.current.contains(e.target as Node)) {
        setGenderOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [genderOpen]);

  // Defensive: data can be undefined when the workspace row was reset to
  // a partial structure (e.g. {mode, confirmed} without `data`). Spreading
  // null/undefined into onChange would otherwise blow up below.
  const data: Record<string, unknown> = rawData || {};
  const proposals = (data.proposals as ConsumerProfile[]) || [];
  const gender = (data.gender as string) || '';
  const reference = (data.reference as string) || '';
  const ageRange = (data.ageRange as string) || '';
  const cities = (data.cities as string[]) || [];
  const wearsBrands = (data.wearsBrands as string[]) || [];
  const shopsAt = (data.shopsAt as string[]) || [];
  const reads = (data.reads as string[]) || [];
  const values = (data.values as string[]) || [];
  const lifestyle = (data.lifestyle as string[]) || [];
  const suggestionFromMoodboard = Boolean(data._suggestionFromMoodboard);
  const hasProposals = proposals.length > 0;
  const updateField = (key: string, val: unknown) => onChange({ ...data, [key]: val });

  // One-shot normalization of stored chip clouds + reference on mount.
  // Migrates rows written before the capitalize-first pass landed: old data
  // had values like "craftsmanship sobre tendencias" which now need to read
  // "Craftsmanship sobre tendencias". Idempotent — runs once per row state
  // and only writes back if anything actually changes.
  const casingNormalizedRef = useRef(false);
  useEffect(() => {
    if (casingNormalizedRef.current) return;
    if (hasProposals) return;
    const norm = (arr: string[]) => arr.map(capitalizeFirst);
    const arrChanged = (a: string[], b: string[]) => a.some((v, i) => v !== b[i]);
    const nextCities = norm(cities);
    const nextBrands = norm(wearsBrands);
    const nextShopsAt = norm(shopsAt);
    const nextReads = norm(reads);
    const nextValues = norm(values);
    const nextLifestyle = norm(lifestyle);
    const nextReference = capitalizeFirst(reference);
    const dirty =
      arrChanged(cities, nextCities) || arrChanged(wearsBrands, nextBrands) ||
      arrChanged(shopsAt, nextShopsAt) || arrChanged(reads, nextReads) ||
      arrChanged(values, nextValues) || arrChanged(lifestyle, nextLifestyle) ||
      reference !== nextReference;
    if (!dirty) {
      casingNormalizedRef.current = true;
      return;
    }
    casingNormalizedRef.current = true;
    onChange({
      ...data,
      cities: nextCities,
      wearsBrands: nextBrands,
      shopsAt: nextShopsAt,
      reads: nextReads,
      values: nextValues,
      lifestyle: nextLifestyle,
      reference: nextReference,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill the entry phase from CIS (mainly moodboard analysis) once on
  // mount. Versioned so collections sitting on the pre-rediseño 2-field
  // shape (gender + reference only) auto-enrich on next visit instead of
  // staying frozen with empty chip clouds. Bump _fichaVersion in any
  // future shape change so the migration cascade keeps flowing.
  const fichaVersion = (data._fichaVersion as number) || 0;
  const hasRichFields = Boolean(
    cities.length || wearsBrands.length || shopsAt.length ||
    reads.length || values.length || lifestyle.length,
  );
  const suggestionFetchedRef = useRef(false);
  useEffect(() => {
    if (hasProposals) return;
    if (fichaVersion >= 2) return;
    // Don't clobber rich fields a user already populated under the new
    // shape without the version flag (transitional collections mid-edit).
    if (hasRichFields) return;
    if (suggestionFetchedRef.current) return;
    if (!collectionPlanId) return;
    suggestionFetchedRef.current = true;

    let mounted = true;
    const minSpinnerMs = 400; // never flash the spinner for less than this
    const startedAt = Date.now();

    (async () => {
      setSuggesting(true);
      let outcome: 'success' | 'empty' | 'error' = 'error';
      try {
        const res = await fetch('/api/ai/consumer-suggest-input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId, language }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '<unreadable body>');
          console.error('[ConsumerSuggestInput] HTTP', res.status, body);
          outcome = 'error';
          return;
        }
        const out = await res.json() as {
          gender: string | null;
          ageRange: string;
          cities: string[];
          wearsBrands: string[];
          shopsAt: string[];
          reads: string[];
          values: string[];
          lifestyle: string[];
          reference: string;
        };
        const anyValue =
          out.gender ||
          out.ageRange ||
          out.reference ||
          (out.cities?.length || 0) +
          (out.wearsBrands?.length || 0) +
          (out.shopsAt?.length || 0) +
          (out.reads?.length || 0) +
          (out.values?.length || 0) +
          (out.lifestyle?.length || 0);
        if (anyValue) {
          if (mounted) {
            onChange({
              ...data,
              gender: out.gender || gender,
              ageRange: out.ageRange || ageRange,
              cities: out.cities?.length ? out.cities : cities,
              wearsBrands: out.wearsBrands?.length ? out.wearsBrands : wearsBrands,
              shopsAt: out.shopsAt?.length ? out.shopsAt : shopsAt,
              reads: out.reads?.length ? out.reads : reads,
              values: out.values?.length ? out.values : values,
              lifestyle: out.lifestyle?.length ? out.lifestyle : lifestyle,
              reference: out.reference || reference,
              _suggestionFromMoodboard: true,
              _fichaVersion: 2,
            });
          }
          outcome = 'success';
        } else {
          console.warn('[ConsumerSuggestInput] empty result', out);
          outcome = 'empty';
        }
      } catch (err) {
        console.error('[ConsumerSuggestInput] fetch threw', err);
        outcome = 'error';
      } finally {
        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, minSpinnerMs - elapsed);
        setTimeout(() => {
          if (!mounted) return;
          setSuggesting(false);
          setSuggestionStatus(outcome);
        }, wait);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPlanId]);

  const genderOptions = [
    { id: 'women', label: t.creative.women },
    { id: 'men', label: t.creative.men },
    { id: 'unisex', label: t.creative.unisex },
    { id: 'mixed', label: t.creative.mixed },
  ] as const;

  const generateProposals = async () => {
    if (!gender) return;
    setGenerating(true);
    setError(null);
    const { result, error: err } = await generateCreative('consumer-proposals', {
      reference,
      gender,
      ageRange,
      cities: cities.join(', '),
      wearsBrands: wearsBrands.join(', '),
      shopsAt: shopsAt.join(', '),
      reads: reads.join(', '),
      values: values.join(', '),
      lifestyle: lifestyle.join(' · '),
      ...collectionContext,
    }, language);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { proposals: Array<{ title: string; desc: string }> };
    // All AI proposals start "liked" — they ARE what the user got. They
    // trim what doesn't fit and ask for more if needed. Synthesis filters
    // status === 'liked' downstream so this preserves the contract.
    const withStatus = (parsed.proposals || []).map((p) => ({ ...p, status: 'liked' as const }));
    onChange({ ...data, proposals: withStatus });
    setGenerating(false);
  };

  // Pide una propuesta adicional al endpoint. La añade a la lista existente
  // sin tocar las que ya están. Las nuevas también entran como 'liked'.
  const requestOneMore = async () => {
    setGenerating(true);
    setError(null);
    const existingTitles = proposals.map((p) => p.title).join(', ');
    const { result, error: err } = await generateCreative('consumer-proposals', {
      reference,
      gender,
      ageRange,
      cities: cities.join(', '),
      wearsBrands: wearsBrands.join(', '),
      shopsAt: shopsAt.join(', '),
      reads: reads.join(', '),
      values: values.join(', '),
      lifestyle: lifestyle.join(' · '),
      existingProfiles: existingTitles,
      count: '1',
      ...collectionContext,
    }, language);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { proposals: Array<{ title: string; desc: string }> };
    const next = (parsed.proposals || [])
      .filter((p) => !proposals.some((q) => q.title === p.title))
      .slice(0, 1)
      .map((p) => ({ ...p, status: 'liked' as const }));
    if (next.length === 0) {
      setError(((t.creative as Record<string, string>).noNewProposal || 'no he podido proponer una nueva — prueba a editar la ficha'));
      setGenerating(false);
      return;
    }
    onChange({ ...data, proposals: [...proposals, ...next] });
    setGenerating(false);
  };

  const updateProposal = (idx: number, updates: Partial<ConsumerProfile>) => {
    const updated = [...proposals];
    updated[idx] = { ...updated[idx], ...updates };
    onChange({ ...data, proposals: updated });
  };

  const removeProposal = (idx: number) => {
    onChange({ ...data, proposals: proposals.filter((_, i) => i !== idx) });
  };

  const regenerateRejected = async () => {
    const liked = proposals.filter((p) => p.status === 'liked');
    const rejected = proposals.filter((p) => p.status === 'rejected');
    if (rejected.length === 0) return;
    setGenerating(true);
    setError(null);
    const { result, error: err } = await generateCreative('consumer-proposals', {
      reference,
      gender,
      ageRange,
      cities: cities.join(', '),
      wearsBrands: wearsBrands.join(', '),
      shopsAt: shopsAt.join(', '),
      reads: reads.join(', '),
      values: values.join(', '),
      lifestyle: lifestyle.join(' · '),
      existingProfiles: liked.map((p) => p.title).join(', '),
      count: String(rejected.length),
      ...collectionContext,
    }, language);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { proposals: Array<{ title: string; desc: string }> };
    const fresh = (parsed.proposals || []).map((p) => ({ ...p, status: 'liked' as const }));
    const kept = proposals.filter((p) => p.status !== 'rejected');
    onChange({ ...data, proposals: [...kept, ...fresh] });
    setGenerating(false);
  };

  // Reopen entry — clear proposals so the entry phase renders again.
  // Existing data.gender + data.reference stay so the user starts from
  // their previous state. After tweaking and clicking "generate" again,
  // a fresh proposals array is produced.
  const reopenEntry = () => {
    onChange({ ...data, proposals: [] });
  };

  const rejectedCount = proposals.filter((p) => p.status === 'rejected').length;

  // ENTRY face — ficha 3-col layout (2 sub-cols of pills + reference textarea)
  const entryFace = (
    <div className="max-w-6xl mx-auto w-full">
      {/* Status caption — editorial pill, never plain prose */}
      <div className="flex justify-center mb-12">
        {suggesting ? (
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-carbon/[0.04]">
            <Loader2 className="h-3 w-3 animate-spin text-carbon/45" />
            <span className="text-[10px] tracking-[0.18em] uppercase text-carbon/55 font-semibold">
              {(t.creative as Record<string, string>).readingMoodboard || 'leyendo tu moodboard…'}
            </span>
          </div>
        ) : suggestionFromMoodboard ? (
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-carbon/[0.04]">
            <span className="text-[10px] tracking-[0.18em] uppercase text-carbon/55 font-semibold">
              {(t.creative as Record<string, string>).basedOnMoodboard || 'Basado en tu moodboard. Edita lo que quieras.'}
            </span>
          </div>
        ) : suggestionStatus === 'empty' ? (
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-carbon/[0.04]">
            <span className="text-[10px] tracking-[0.18em] uppercase text-carbon/45 font-semibold italic">
              {(t.creative as Record<string, string>).noMoodboardSignal || 'aún no leo señal clara — empieza tú'}
            </span>
          </div>
        ) : suggestionStatus === 'error' ? (
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-carbon/[0.04]">
            <span className="text-[10px] tracking-[0.18em] uppercase text-carbon/45 font-semibold italic">
              {(t.creative as Record<string, string>).moodboardReadFailed || 'no he podido leer tu moodboard — empieza tú'}
            </span>
          </div>
        ) : null}
      </div>

      {/* 3-col grid: 2 sub-cols ficha (left) + reference textarea (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-10 items-start">
        {/* LEFT BLOCK — 2 sub-columns of 8 ficha rows */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
          <FichaRow label={(t.creative as Record<string, string>).forWhom || 'para quién'}>
            <div ref={genderRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setGenderOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] bg-carbon/[0.04] text-carbon/70 hover:bg-carbon/[0.08] transition-all"
              >
                <span>{gender ? (genderOptions.find((o) => o.id === gender)?.label) : ((t.creative as Record<string, string>).pickGender || 'elige')}</span>
                <ChevronDown className={`h-3 w-3 text-carbon/40 transition-transform ${genderOpen ? 'rotate-180' : ''}`} />
              </button>
              {genderOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-white rounded-[12px] shadow-[0_8px_28px_rgba(0,0,0,0.10)] border border-carbon/[0.06] p-1 z-20 flex gap-1">
                  {genderOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { onChange({ ...data, gender: opt.id }); setGenderOpen(false); }}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                        gender === opt.id
                          ? 'bg-carbon text-white'
                          : 'text-carbon/70 hover:bg-carbon/[0.06]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FichaRow>

          <FichaRow label={(t.creative as Record<string, string>).ageRange || 'edad'}>
            <input
              type="text"
              value={ageRange}
              onChange={(e) => updateField('ageRange', e.target.value)}
              placeholder="28-45"
              className="px-3 py-1.5 rounded-full text-[12px] bg-carbon/[0.04] text-carbon/70 border-0 focus:outline-none focus:bg-carbon/[0.08] placeholder:text-carbon/30 w-32"
            />
          </FichaRow>

          <FichaRow label={(t.creative as Record<string, string>).consumerCities || 'ciudades'}>
            <EditableChipCloud
              values={cities}
              onChange={(v) => updateField('cities', v)}
              placeholder="ciudad o barrio"
            />
          </FichaRow>

          <FichaRow label={(t.creative as Record<string, string>).consumerWearsBrands || 'marcas que lleva'}>
            <EditableChipCloud
              values={wearsBrands}
              onChange={(v) => updateField('wearsBrands', v)}
              placeholder="añadir marca"
            />
          </FichaRow>

          <FichaRow label={(t.creative as Record<string, string>).consumerShopsAt || 'dónde compra'}>
            <EditableChipCloud
              values={shopsAt}
              onChange={(v) => updateField('shopsAt', v)}
              placeholder="tienda, marketplace…"
            />
          </FichaRow>

          <FichaRow label={(t.creative as Record<string, string>).consumerReads || 'qué lee'}>
            <EditableChipCloud
              values={reads}
              onChange={(v) => updateField('reads', v)}
              placeholder="cuenta, revista, blog"
            />
          </FichaRow>

          <FichaRow label={(t.creative as Record<string, string>).consumerValues || 'lo que valora'}>
            <EditableChipCloud
              values={values}
              onChange={(v) => updateField('values', v)}
              placeholder="añadir valor"
            />
          </FichaRow>

          <FichaRow label={(t.creative as Record<string, string>).consumerLifestyle || 'cómo vive'}>
            <EditableChipCloud
              values={lifestyle}
              onChange={(v) => updateField('lifestyle', v)}
              placeholder="añadir momento"
            />
          </FichaRow>
        </div>

        {/* RIGHT BLOCK — reference grows into a textarea, gets the full
            column height. Lets the editorial line breathe instead of
            squashing it into a thin underline. */}
        <div className="lg:col-span-1">
          <FichaRow label={(t.creative as Record<string, string>).describeYourCustomerLabel || 'en una frase'}>
            <textarea
              value={reference}
              onChange={(e) => onChange({ ...data, reference: e.target.value })}
              placeholder={(t.creative as Record<string, string>).describeYourCustomerPlaceholder || 'una frase, una referencia, un detalle…'}
              rows={12}
              className="w-full text-[16px] text-carbon bg-carbon/[0.02] rounded-[16px] border border-carbon/[0.06] focus:border-carbon/25 focus:outline-none p-5 resize-none leading-[1.7] tracking-[-0.01em] placeholder:text-carbon/25 font-light min-h-[280px]"
            />
          </FichaRow>
        </div>
      </div>

      {/* CTA — Aimily-branded, no Sparkles */}
      <div className="mt-14 flex flex-col items-center gap-3">
        <button
          onClick={generateProposals}
          disabled={!gender || generating}
          className="inline-flex items-center gap-2 pl-7 pr-6 py-3 rounded-full text-[14px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>
            {generating
              ? ((t.creative as Record<string, string>).generatingProposals || 'generando…')
              : ((t.creative as Record<string, string>).generateProposalsCta || 'Generar con Aimily')}
          </span>
          {!generating && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );

  // PROPOSAL face — gold-standard 4-card grid (white, rounded-[20px], hover lift).
  // All visible cards are implicitly "selected" (status === 'liked') so Synthesis
  // downstream sees them. Removing a card flips it to 'rejected' (filtered out).
  // "Pedir una más" appends a fresh card via the same endpoint with count=1.
  const visibleProposals = proposals
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.status !== 'rejected');

  // Render a section ("cómo viste / cómo vive / valores") — only when the
  // proposal carries the structured array. Keeps the card editorial when
  // the LLM emits the new schema, and gracefully omits when missing.
  const renderSection = (label: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mt-5">
        <div className="text-[9px] tracking-[0.22em] uppercase text-carbon/45 font-semibold mb-2">
          {label}
        </div>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] xl:text-[13px] text-carbon/70 leading-[1.55] tracking-[-0.01em]">
              <span className="text-carbon/30 mt-[3px]">·</span>
              <span>{capitalizeFirst(item)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const proposalFace = (
    <div className="max-w-[1600px] mx-auto w-full">
      {/* Navigation controls (Modificar brief ← / → Confirmar y Continuar)
          live in the parent below the grid — see the bar after
          ExpandedBlockContent. They sit on the same row aligned with
          the card edges so the user has a "back ↔ forward" frame
          around the proposals. */}

      {/* 4-card grid + a compact "+ una más" column on the right. Cards
          take 1fr each; the add column is auto-sized to its content so
          it never balloons into a card-shaped tile. On smaller breakpoints
          it spans the row beneath the cards. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-5 items-stretch">
        {visibleProposals.map(({ p, idx: originalIdx }, displayIdx) => {
          const isEditing = editingIdx === originalIdx;
          const isLiked = p.status === 'liked';
          const hasStructured = Boolean(
            p.essence || (p.wardrobe && p.wardrobe.length) || (p.lifestyle && p.lifestyle.length) || (p.values && p.values.length),
          );
          return (
            <div
              key={`${p.title}-${originalIdx}`}
              className={`group relative bg-white rounded-[20px] p-7 xl:p-8 flex flex-col min-h-[420px] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left ${
                isLiked ? 'ring-2 ring-carbon/15' : 'opacity-60'
              }`}
            >
              {/* Top row — perfil 0X label + accept toggle in the corner */}
              <div className="flex items-start justify-between mb-5">
                <div className="text-[10px] tracking-[0.22em] uppercase text-carbon/55 font-semibold">
                  {(t.creative as Record<string, string>).consumerProfileLabel || 'perfil'} 0{displayIdx + 1}
                </div>
                <button
                  type="button"
                  onClick={() => updateProposal(originalIdx, { status: isLiked ? 'pending' : 'liked' })}
                  aria-label={(t.creative as Record<string, string>).keepAction || 'me lo quedo'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isLiked
                      ? 'bg-carbon text-white'
                      : 'bg-carbon/[0.06] text-carbon/30 hover:bg-carbon/[0.12]'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Brief block — title + essence wrapped in a fixed min-height
                  so the section headers below ("CÓMO VISTE", etc) line up
                  vertically across all four cards regardless of how long
                  the title or essence runs in any given proposal. */}
              <div className="min-h-[170px] mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={p.title}
                    onChange={(e) => updateProposal(originalIdx, { title: e.target.value })}
                    autoFocus
                    className="text-[22px] xl:text-[26px] font-medium tracking-[-0.02em] text-carbon leading-[1.1] mb-4 bg-transparent border-0 border-b border-carbon/25 focus:border-carbon focus:outline-none w-full"
                  />
                ) : (
                  <h3 className="text-[22px] xl:text-[26px] font-medium tracking-[-0.02em] text-carbon leading-[1.1] mb-3">
                    {capitalizeFirst(p.title)}
                  </h3>
                )}

                {!isEditing && p.essence && (
                  <p className="text-[13px] xl:text-[14px] text-carbon/65 italic leading-[1.55] tracking-[-0.01em]">
                    {capitalizeFirst(p.essence)}
                  </p>
                )}
              </div>

              {/* Editing OR sections OR fallback paragraph */}
              {isEditing ? (
                <textarea
                  value={p.desc}
                  onChange={(e) => updateProposal(originalIdx, { desc: e.target.value })}
                  rows={10}
                  className="text-[13px] text-carbon/70 leading-[1.7] tracking-[-0.01em] bg-carbon/[0.02] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/25 focus:outline-none p-3 resize-none w-full"
                />
              ) : hasStructured ? (
                <>
                  {renderSection((t.creative as Record<string, string>).consumerWardrobeLabel || 'cómo viste', p.wardrobe)}
                  {renderSection((t.creative as Record<string, string>).consumerLifestyleLabel || 'cómo vive', p.lifestyle)}
                  {renderSection((t.creative as Record<string, string>).consumerValuesLabel || 'qué valora', p.values)}
                </>
              ) : (
                <p className="text-[13px] xl:text-[13.5px] text-carbon/60 leading-[1.7] tracking-[-0.01em]">
                  {capitalizeFirst(p.desc)}
                </p>
              )}

              <div className="flex-1" />

              {/* Action row — always visible, never hover-only. */}
              <div className="mt-6 flex items-center gap-1.5">
                <button
                  onClick={() => setEditingIdx(isEditing ? null : originalIdx)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    isEditing
                      ? 'bg-carbon text-white'
                      : 'bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08]'
                  }`}
                >
                  {isEditing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                  {isEditing
                    ? ((t.creative as Record<string, string>).doneAction || 'listo')
                    : ((t.creative as Record<string, string>).editAction || 'editar')}
                </button>
                <button
                  onClick={() => updateProposal(originalIdx, { status: 'rejected' })}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-carbon/[0.04] text-carbon/45 hover:bg-red-50 hover:text-red-600 transition-all"
                  aria-label={(t.creative as Record<string, string>).removeAction || 'descartar'}
                >
                  <X className="h-3 w-3" />
                  {(t.creative as Record<string, string>).discardAction || 'descartar'}
                </button>
              </div>
            </div>
          );
        })}

        {/* Compact "+ una más" — auto-sized column to the right of the last
            card on lg+. Vertically centered against the cards. On sm: spans
            the row beneath. Never balloons into a card-shape that wastes
            vertical space. */}
        {visibleProposals.length < 8 && (
          <div className="flex items-center justify-center sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={requestOneMore}
              disabled={generating}
              className="group inline-flex items-center justify-center w-14 lg:w-16 h-14 lg:h-16 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] text-carbon/55 hover:text-carbon hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={(t.creative as Record<string, string>).requestOneMore || 'pedir una más'}
              title={(t.creative as Record<string, string>).requestOneMore || 'pedir una más'}
            >
              {generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 flex justify-center">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );

  // Flip wrapper — entry on the front, proposals on the back. Both
  // children stack in the same grid cell (1/1) so the parent sizes to
  // the larger face. Parent rotates Y on hasProposals; each face has
  // backface-visibility:hidden + the back is pre-rotated 180 so it
  // shows upright once the parent is flipped. perspective drives the
  // depth illusion.
  return (
    <div className="[perspective:1800px] w-full">
      <div
        className={`grid w-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${
          hasProposals ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="[grid-area:1/1] [backface-visibility:hidden]">
          {entryFace}
        </div>
        <div className="[grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {proposalFace}
        </div>
      </div>
    </div>
  );
}

function VibeContent({ mode, data, onChange, collectionContext, consumerProfile }: { mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void; collectionContext: { season: string; collectionName: string }; consumerProfile?: string }) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {mode === 'free' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              {t.creative.collectionSpiritDirection}
            </label>
            <textarea
              value={(data.vibe as string) || ''}
              onChange={(e) => onChange({ ...data, vibe: e.target.value })}
              placeholder={t.creative.vibePlaceholder}
              className="w-full h-40 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              {t.creative.keywords}
            </label>
            <input
              type="text"
              value={(data.keywords as string) || ''}
              onChange={(e) => onChange({ ...data, keywords: e.target.value })}
              placeholder="e.g. raw, industrial, feminine, deconstructed, nostalgic..."
              className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
            />
          </div>
        </div>
      )}

      {mode === 'assisted' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              {t.creative.directionKeywords}
            </label>
            <textarea
              value={(data.direction as string) || ''}
              onChange={(e) => onChange({ ...data, direction: e.target.value })}
              placeholder={(t.creative as Record<string, string>)?.moodboardPlaceholder || "Give a few keywords"}
              className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={async () => {
              setGenerating(true);
              setError(null);
              const { result, error: err } = await generateCreative('vibe-assisted', {
                direction: (data.direction as string) || '',
                consumer: consumerProfile || '',
                ...collectionContext,
              }, language);
              if (err) { setError(err); setGenerating(false); return; }
              const parsed = result as { vibe: string; keywords: string };
              onChange({ ...data, vibe: parsed.vibe, keywords: parsed.keywords });
              setGenerating(false);
            }}
            disabled={generating || !(data.direction as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t.creative.buildNarrative}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {(data.vibe as string) && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
                  {t.creative.aiGeneratedNarrative} <span className="text-carbon/40">({t.creative.editable})</span>
                </label>
                <textarea
                  value={(data.vibe as string) || ''}
                  onChange={(e) => onChange({ ...data, vibe: e.target.value })}
                  className="w-full h-32 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
                  {t.creative.keywords} <span className="text-carbon/40">({t.creative.editable})</span>
                </label>
                <input
                  type="text"
                  value={(data.keywords as string) || ''}
                  onChange={(e) => onChange({ ...data, keywords: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'ai' && (
        <VibeProposalFlow
          data={data}
          onChange={onChange}
          collectionContext={collectionContext}
          consumerProfile={consumerProfile}
          generating={generating}
          setGenerating={setGenerating}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
}

interface PinterestBoard { id: string; name: string; pin_count: number; image_thumbnail_url?: string; }
interface PinterestPin { id: string; title?: string; imageUrl: string; dominantColor?: string; }

function MoodboardContent({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const t = useTranslation();
  const { id: collectionId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = (data.images as string[]) || [];
  const analysis = (data.analysis as string) || '';
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Pinterest state
  const [pinterestStep, setPinterestStep] = useState<'idle' | 'boards' | 'pins'>('idle');
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  const [selectedBoard, setSelectedBoard] = useState<PinterestBoard | null>(null);
  const [pinterestLoading, setPinterestLoading] = useState(false);
  const [pinterestError, setPinterestError] = useState('');
  const [importingPins, setImportingPins] = useState(false);

  // Auto-analyze ≥3 images. Silent — result stored in data.analysis +
  // data.keywords for loadFullContext (server-side prompt builder reads
  // bd.moodboard.data.analysis on line 173 of load-full-context.ts).
  // The endpoint also writes a string summary to CIS so downstream prompts
  // see {{moodboard}} populated. Runs once per unique image set.
  useEffect(() => {
    if (images.length < 5) return;
    if (analyzing) return;
    const key = images.join('|');
    const lastKey = (data._analyzedKey as string) || '';
    if (key === lastKey) return;

    const handle = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const res = await fetch('/api/ai/analyze-moodboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrls: images, collectionPlanId: collectionId }),
        });
        if (res.ok) {
          const result = await res.json();
          const summary = [
            result.moodDescription ? `Mood: ${result.moodDescription}` : '',
            result.keyColors?.length ? `Colors: ${result.keyColors.join(', ')}` : '',
            result.keyStyles?.length ? `Styles: ${result.keyStyles.join(', ')}` : '',
            result.keyMaterials?.length ? `Materials: ${result.keyMaterials.join(', ')}` : '',
            result.keyTrends?.length ? `Trends: ${result.keyTrends.join(', ')}` : '',
            result.keyBrands?.length ? `Brands: ${result.keyBrands.join(', ')}` : '',
            result.targetAudience ? `Audience hint: ${result.targetAudience}` : '',
            result.seasonalFit ? `Season fit: ${result.seasonalFit}` : '',
          ].filter(Boolean).join('\n');
          const keywords: string[] = [
            ...((result.keyColors as string[]) || []),
            ...((result.keyStyles as string[]) || []),
            ...((result.keyMaterials as string[]) || []),
          ].slice(0, 30);
          onChange({ ...data, analysis: summary, keywords, _analyzedKey: key });
        }
      } catch (err) {
        console.error('[Moodboard] silent analysis failed', err);
      }
      setAnalyzing(false);
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join('|'), collectionId]);

  // Upload files to Supabase Storage
  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`${t.creative.uploadingProgress} ${i + 1}/${files.length}...`);
      const file = files[i];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      try {
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionPlanId: collectionId,
            assetType: 'moodboard',
            name: file.name,
            base64: base64.split(',')[1],
            mimeType: file.type,
          }),
        });
        if (res.ok) {
          const { publicUrl } = await res.json();
          newUrls.push(publicUrl);
        }
      } catch { /* skip failed uploads */ }
    }
    if (newUrls.length > 0) {
      onChange({ ...data, images: [...images, ...newUrls] });
    }
    setUploading(false);
    setUploadProgress('');
  };

  // Listen for Pinterest OAuth popup callback — original behavior, restored.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'pinterest_connected') {
        // OAuth succeeded — reload boards.
        handlePinterestConnect();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pinterest: connect or load boards.
  const handlePinterestConnect = async () => {
    setPinterestLoading(true);
    setPinterestError('');
    try {
      const res = await fetch('/api/pinterest/boards');
      if (res.status === 401) {
        const clientId = process.env.NEXT_PUBLIC_PINTEREST_CLIENT_ID || '';
        const redirectUri = process.env.NEXT_PUBLIC_PINTEREST_REDIRECT_URI || `${window.location.origin}/api/auth/pinterest/callback`;
        const scope = 'boards:read,pins:read';
        const state = Math.random().toString(36).substring(2, 15);
        const url = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
        window.open(url, '_blank', 'width=600,height=700');
        setPinterestLoading(false);
        return;
      }
      const boardsData = await res.json();
      setBoards(boardsData.items || []);
      setPinterestStep('boards');
    } catch {
      setPinterestError('Failed to connect to Pinterest');
    }
    setPinterestLoading(false);
  };

  // Pinterest: load pins from a board
  const handleSelectBoard = async (board: PinterestBoard) => {
    setSelectedBoard(board);
    setPinterestLoading(true);
    setPinterestError('');
    try {
      const res = await fetch(`/api/pinterest/boards/${board.id}/pins`);
      if (!res.ok) throw new Error('Failed to load pins');
      const data = await res.json();
      setPins(data.items || []);
      setSelectedPins(new Set());
      setPinterestStep('pins');
    } catch {
      setPinterestError('Failed to load pins from this board');
    }
    setPinterestLoading(false);
  };

  // Pinterest: toggle pin selection
  const togglePin = (pinId: string) => {
    setSelectedPins(prev => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  };

  // Pinterest: import selected pins to moodboard
  const handleImportPins = async () => {
    const selected = pins.filter(p => selectedPins.has(p.id));
    if (selected.length === 0) return;
    setImportingPins(true);
    const newUrls: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      setUploadProgress(`${t.creative.importingProgress} ${i + 1}/${selected.length}...`);
      try {
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionPlanId: collectionId,
            assetType: 'moodboard',
            name: `pinterest-${selected[i].id}.jpg`,
            sourceUrl: selected[i].imageUrl,
            description: selected[i].title || 'Pinterest pin',
            metadata: { source: 'pinterest', pinId: selected[i].id, dominantColor: selected[i].dominantColor },
          }),
        });
        if (res.ok) {
          const { publicUrl } = await res.json();
          newUrls.push(publicUrl);
        }
      } catch { /* skip failed */ }
    }
    if (newUrls.length > 0) {
      onChange({ ...data, images: [...images, ...newUrls] });
    }
    setImportingPins(false);
    setUploadProgress('');
    setPinterestStep('idle');
    setSelectedPins(new Set());
  };

  // Pinterest: close modal
  const closePinterest = () => {
    setPinterestStep('idle');
    setBoards([]);
    setPins([]);
    setSelectedPins(new Set());
    setSelectedBoard(null);
    setPinterestError('');
  };

  // Drag-and-drop handlers — wired on the <label> so users can either
  // drop files anywhere on the dropzone or click to open the picker.
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // Single hidden file input shared across entry dropzone + add-more pill
  // via <label htmlFor>. The label pattern is more reliable than calling
  // ref.click() programmatically — some browsers throttle/block synthetic
  // clicks on hidden inputs from within React event handlers.
  const FILE_INPUT_ID = 'moodboard-file-input';
  const fileInput = (
    <input
      ref={fileInputRef}
      id={FILE_INPUT_ID}
      type="file"
      multiple
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        if (e.target.files && e.target.files.length > 0) handleUpload(e.target.files);
        // Reset value so the same file can be re-selected after removal.
        e.target.value = '';
      }}
    />
  );

  return (
    <div className="space-y-6">
      {fileInput}

      {/* ENTRY phase — Pinterest + drag/upload, side-by-side, equal weight.
          Pinterest left because most fashion moodboards live there already.
          Upload right with full drag-and-drop support. Both feel like real
          surfaces, not buttons. */}
      {images.length === 0 && pinterestStep === 'idle' && (
        <div className="flex flex-col items-center py-6 md:py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
            {/* Pinterest card */}
            <button
              onClick={handlePinterestConnect}
              disabled={pinterestLoading}
              className={`flex flex-col items-center justify-center gap-4 py-16 md:py-20 px-6 rounded-[20px] bg-carbon/[0.04] hover:bg-carbon/[0.07] transition-all disabled:opacity-40 ${pinterestLoading ? 'cursor-wait' : 'cursor-pointer'}`}
            >
              <div className="w-14 h-14 rounded-full bg-carbon/[0.06] flex items-center justify-center">
                {pinterestLoading ? <Loader2 className="h-6 w-6 animate-spin text-carbon/50" /> : <ExternalLink className="h-6 w-6 text-carbon/50" />}
              </div>
              <p className="text-[16px] font-medium text-carbon/75">
                {pinterestLoading ? t.creative.connecting : `${t.creative.connect} ${t.creative.pinterest.toLowerCase()}`}
              </p>
              <p className="text-[13px] text-carbon/35 max-w-[220px] text-center leading-relaxed">
                {t.creative.pinterestHint}
              </p>
            </button>

            {/* Upload card — drag-and-drop zone */}
            <label
              htmlFor={FILE_INPUT_ID}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-4 py-16 md:py-20 px-6 rounded-[20px] border-2 border-dashed transition-all cursor-pointer ${
                dragActive
                  ? 'border-carbon/50 bg-carbon/[0.05]'
                  : 'border-carbon/[0.15] hover:border-carbon/30 hover:bg-carbon/[0.02]'
              } ${uploading ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <div className="w-14 h-14 rounded-full bg-carbon/[0.04] flex items-center justify-center">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin text-carbon/50" /> : <Upload className="h-6 w-6 text-carbon/50" />}
              </div>
              <p className="text-[16px] font-medium text-carbon/75">
                {uploading ? uploadProgress : t.creative.dragOrUpload}
              </p>
              <p className="text-[13px] text-carbon/35 max-w-[220px] text-center leading-relaxed">
                {t.creative.uploadHint}
              </p>
            </label>
          </div>

          <p className="mt-8 text-[13px] text-carbon/35 max-w-md text-center leading-relaxed">
            {t.creative.moodboardEntryHint}
          </p>
        </div>
      )}

      {/* Pinterest Modal — Boards */}
      {pinterestStep === 'boards' && (
        <div className="border border-carbon/20 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">{t.creative.selectBoard}</p>
            <button onClick={closePinterest} className="text-carbon/40 hover:text-carbon/70"><X className="h-4 w-4" /></button>
          </div>
          {pinterestError && <p className="text-xs text-red-600">{pinterestError}</p>}
          <div className="max-h-[60vh] overflow-y-auto scrollbar-subtle">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => handleSelectBoard(board)}
                  className="flex flex-col items-center gap-2 p-4 border border-carbon/10 hover:border-carbon/30 transition-colors text-left"
                >
                  {board.image_thumbnail_url && (
                    <img src={board.image_thumbnail_url} alt="" className="w-full aspect-square object-cover" />
                  )}
                  <span className="text-xs font-medium text-carbon/80 truncate w-full">{board.name}</span>
                  <span className="text-xs text-carbon/50">{board.pin_count} {t.creative.pins}</span>
                </button>
              ))}
            </div>
          </div>
          {boards.length === 0 && !pinterestLoading && (
            <p className="text-xs text-carbon/50 text-center py-4">{t.creative.noBoardsFound}</p>
          )}
        </div>
      )}

      {/* Pinterest Modal — Pins */}
      {pinterestStep === 'pins' && (
        <div className="border border-carbon/20 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setPinterestStep('boards')} className="text-xs text-carbon/50 hover:text-carbon/80">
                <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />{t.creative.boards}
              </button>
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">{selectedBoard?.name}</p>
            </div>
            <button onClick={closePinterest} className="text-carbon/40 hover:text-carbon/70"><X className="h-4 w-4" /></button>
          </div>
          {pinterestError && <p className="text-xs text-red-600">{pinterestError}</p>}

          <div className="max-h-[60vh] overflow-y-auto scrollbar-subtle">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {pins.map(pin => (
                <button
                  key={pin.id}
                  onClick={() => togglePin(pin.id)}
                  className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                    selectedPins.has(pin.id) ? 'border-carbon ring-1 ring-carbon/30' : 'border-transparent hover:border-carbon/20'
                  }`}
                >
                  <img src={pin.imageUrl} alt={pin.title || ''} className="w-full h-full object-cover" />
                  {selectedPins.has(pin.id) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-carbon text-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedPins.size > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-carbon/10">
              <span className="text-xs text-carbon/60">{selectedPins.size} {t.common.selected}</span>
              <button
                onClick={handleImportPins}
                disabled={importingPins}
                className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-50"
              >
                {importingPins ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {importingPins ? uploadProgress : t.creative.importSelected}
              </button>
            </div>
          )}

          {pins.length === 0 && !pinterestLoading && (
            <p className="text-xs text-carbon/50 text-center py-4">{t.creative.noPinsFound}</p>
          )}
        </div>
      )}

      {/* IMAGE GRID + status + add-more */}
      {images.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square bg-carbon/[0.04] rounded-[10px] overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => onChange({ ...data, images: images.filter((_, j) => j !== i) })}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-carbon/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Silent analysis status — single line, no panel of inferences */}
          <div className="flex items-center justify-center gap-2 text-[12px] text-carbon/35 min-h-[18px]">
            {images.length < 5 ? (
              <span>{t.creative.moodboardCounter.replace('{n}', String(images.length)).replace('{min}', '5')}</span>
            ) : analyzing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{t.creative.moodboardReading}</span>
              </>
            ) : analysis ? (
              <span>{t.creative.moodboardToneSaved}</span>
            ) : null}
          </div>

          {/* Add-more — same two equal cards as entry, just shorter padding.
              Drag is always visible, Pinterest stays prominent. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto pt-4">
            {/* Pinterest card */}
            <button
              onClick={handlePinterestConnect}
              disabled={pinterestLoading}
              className={`flex flex-col items-center justify-center gap-3 py-10 md:py-12 px-6 rounded-[20px] bg-carbon/[0.04] hover:bg-carbon/[0.07] transition-all disabled:opacity-40 ${pinterestLoading ? 'cursor-wait' : 'cursor-pointer'}`}
            >
              <div className="w-11 h-11 rounded-full bg-carbon/[0.06] flex items-center justify-center">
                {pinterestLoading ? <Loader2 className="h-5 w-5 animate-spin text-carbon/50" /> : <ExternalLink className="h-5 w-5 text-carbon/50" />}
              </div>
              <p className="text-[14px] font-medium text-carbon/70">
                {pinterestLoading ? t.creative.connecting : `${t.creative.connect} ${t.creative.pinterest.toLowerCase()}`}
              </p>
            </button>

            {/* Drag/upload card */}
            <label
              htmlFor={FILE_INPUT_ID}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 py-10 md:py-12 px-6 rounded-[20px] border-2 border-dashed transition-all cursor-pointer ${
                dragActive
                  ? 'border-carbon/50 bg-carbon/[0.05]'
                  : 'border-carbon/[0.15] hover:border-carbon/30 hover:bg-carbon/[0.02]'
              } ${uploading ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <div className="w-11 h-11 rounded-full bg-carbon/[0.04] flex items-center justify-center">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-carbon/50" /> : <Plus className="h-5 w-5 text-carbon/50" />}
              </div>
              <p className="text-[14px] font-medium text-carbon/70">
                {uploading ? uploadProgress : t.creative.addMore}
              </p>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared editable brand result ─── */
function BrandResultEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const t = useTranslation();
  const { id: collectionId } = useParams();
  const colors = (data.colors as string[]) || [];
  const visualIdentityImages = (data.visualIdentityImages as string[]) || [];
  const aiGenerated = Boolean(data.extracted || data.generated);
  const autoGenRef = useRef(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const generateVisualReferences = useCallback(async (): Promise<string[] | null> => {
    try {
      const res = await fetch('/api/ai/brand/visual-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: (data.brandName as string) || '',
          tone: (data.tone as string) || '',
          style: (data.style as string) || '',
          colors: colors,
          collectionPlanId: collectionId,
        }),
      });
      if (!res.ok) {
        console.error('[VisualRefs] request failed', res.status);
        return null;
      }
      const json = await res.json();
      return Array.isArray(json.images) ? json.images : null;
    } catch (err) {
      console.error('[VisualRefs] fetch error', err);
      return null;
    }
  }, [data.brandName, data.tone, data.style, colors]);

  useEffect(() => {
    if (!aiGenerated) return;
    if (visualIdentityImages.length > 0) return;
    if (autoGenRef.current) return;
    autoGenRef.current = true;
    (async () => {
      setAutoGenerating(true);
      try {
        const urls = await generateVisualReferences();
        if (urls && urls.length > 0) {
          onChange({ ...data, visualIdentityImages: urls });
        }
      } finally {
        setAutoGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiGenerated]);

  const { palette, setPalette } = usePaletteSync(data, onChange);

  return (
    <div>
      <BrandBoardCanvas
        brandName={(data.brandName as string) || ''}
        onBrandNameChange={(v) => onChange({ ...data, brandName: v })}
        palette={palette}
        onPaletteChange={setPalette}
        typographyFont={(data.typographyFont as string) || ''}
        onTypographyFontChange={(v) => onChange({ ...data, typographyFont: v })}
        tone={(data.tone as string) || ''}
        onToneChange={(v) => onChange({ ...data, tone: v })}
        style={(data.style as string) || ''}
        onStyleChange={(v) => onChange({ ...data, style: v })}
        moodboardImages={visualIdentityImages}
      />

      {/* Legacy VisualIdentityField kept wired for auto-gen side effects */}
      <div className="hidden">
        <VisualIdentityField
          images={visualIdentityImages}
          onImagesChange={(v) => onChange({ ...data, visualIdentityImages: v })}
          notes={(data.style as string) || ''}
          onNotesChange={(v) => onChange({ ...data, style: v })}
          notesPlaceholder={t.creative.visualIdentityPlaceholder}
          generateLabel={t.creative.visualIdentityGenerate}
          uploadLabel={t.creative.visualIdentityUpload}
          onGenerate={aiGenerated ? generateVisualReferences : undefined}
          externalGenerating={autoGenerating}
        />
      </div>
    </div>
  );
}

interface SavedBrand {
  id: string;
  brand_name: string;
  colors: string[];
  tone: string;
  typography: string;
  style: string;
  instagram: string;
  website: string;
  is_trend_driven: boolean;
  brand_data: Record<string, unknown>;
}

type BrandDNAOption = 'existing' | 'new' | null;
type ExistingBrandMethod = 'extract' | 'manual';
type NewBrandMethod = 'free' | 'assisted' | 'ai';

interface BrandProposal {
  brandName: string;
  colors: string[];
  tone: string;
  typography: string;
  style: string;
}

function BrandDNAContent({ data, onChange, collectionContext }: { mode?: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void; collectionContext: { season: string; collectionName: string } }) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBrands, setSavedBrands] = useState<SavedBrand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const hasResult = (data.extracted as boolean) || (data.generated as boolean);
  const selectedOption = (data._brandOption as BrandDNAOption) || null;
  const existingMethod = (data._existingMethod as ExistingBrandMethod) || 'extract';
  const newMethod = (data._newMethod as NewBrandMethod) || 'free';
  const brandProposals = (data._brandProposals as BrandProposal[]) || [];
  const selectedProposalIdx = data._selectedProposal as number | null;

  // Fetch saved brands on mount
  useEffect(() => {
    fetch('/api/user-brands')
      .then(res => res.json())
      .then(res => setSavedBrands(res.brands || []))
      .catch(() => setSavedBrands([]))
      .finally(() => setLoadingBrands(false));
  }, []);

  const handleSaveBrand = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user-brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: (data.brandName as string) || 'Untitled Brand',
          colors: (data.colors as string[]) || [],
          tone: (data.tone as string) || '',
          typography: (data.typography as string) || '',
          style: (data.style as string) || '',
          instagram: (data.instagram as string) || '',
          website: (data.website as string) || '',
          is_trend_driven: false,
          brand_data: data,
        }),
      });
      const result = await res.json();
      if (result.brand) {
        setSavedBrands(prev => [result.brand, ...prev]);
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2500);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleUseBrand = (brand: SavedBrand) => {
    onChange({
      ...data,
      brandName: brand.brand_name,
      colors: brand.colors || [],
      tone: brand.tone || '',
      typography: brand.typography || '',
      style: brand.style || '',
      instagram: brand.instagram || '',
      website: brand.website || '',
      trendDriven: false,
      extracted: true,
      _brandOption: 'existing',
      _existingMethod: 'extract',
    });
  };

  const handleDeleteBrand = async (id: string) => {
    await fetch(`/api/user-brands?id=${id}`, { method: 'DELETE' });
    setSavedBrands(prev => prev.filter(b => b.id !== id));
  };

  const goBackToLevel1 = () => {
    onChange({ ...data, _brandOption: null, _existingMethod: 'extract', _newMethod: 'free', extracted: false, generated: false, _brandProposals: [], _selectedProposal: null });
  };

  // ── EXISTING BRAND: Extract with AI ──
  const handleExtract = async () => {
    setGenerating(true);
    setError(null);
    const { result, error: err } = await generateCreative('brand-extract', {
      instagram: (data.instagram as string) || '',
      website: (data.website as string) || '',
    }, language);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { brandName: string; colors: string[]; tone: string; typography: string; style?: string };
    onChange({ ...data, extracted: true, brandName: parsed.brandName, colors: parsed.colors, tone: parsed.tone, typography: parsed.typography, style: parsed.style || '' });
    setGenerating(false);
  };

  // ── NEW BRAND: Assisted — extract reference + generate inspired brand ──
  const handleAssisted = async () => {
    setGenerating(true);
    setError(null);
    const { result, error: err } = await generateCreative('brand-assisted', {
      website: (data.website as string) || '',
      instagram: (data.instagram as string) || '',
      brief: (data._brief as string) || '',
      brandName: (data.brandName as string) || '',
      ...collectionContext,
    }, language);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { brandName: string; colors: string[]; tone: string; typography: string; style?: string };
    onChange({ ...data, generated: true, brandName: parsed.brandName, colors: parsed.colors, tone: parsed.tone, typography: parsed.typography, style: parsed.style || '' });
    setGenerating(false);
  };

  // ── NEW BRAND: AI Proposals — generate 3 brand proposals ──
  const handleGenerateProposals = async () => {
    setGenerating(true);
    setError(null);
    const { result, error: err } = await generateCreative('brand-proposals', {
      brief: (data._brief as string) || '',
      ...collectionContext,
    }, language);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { proposals: BrandProposal[] };
    onChange({ ...data, _brandProposals: parsed.proposals || [], _selectedProposal: null });
    setGenerating(false);
  };

  const selectProposal = (idx: number) => {
    const p = brandProposals[idx];
    onChange({
      ...data,
      _selectedProposal: idx,
      generated: true,
      brandName: p.brandName,
      colors: p.colors,
      tone: p.tone,
      typography: p.typography,
      style: p.style,
    });
  };

  // ── Save + Back buttons (shared) ──
  const renderSaveBar = () => (
    <div className="flex items-center gap-3 mt-6">
      <button
        onClick={goBackToLevel1}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium text-carbon/40 hover:text-carbon/60 bg-carbon/[0.04] hover:bg-carbon/[0.06] transition-all"
      >
        {`\u2190 ${t.creative.changeOption || 'Change option'}`}
      </button>
      <button
        onClick={handleSaveBrand}
        disabled={saving}
        className="ml-auto inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 hover:text-carbon transition-all disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        {savedMsg ? (t.creative.brandSaved || 'Brand saved!') : (t.creative.saveToMyBrands || 'Save to My Brands')}
      </button>
    </div>
  );

  // ══════════════════════════════════════════════
  // RESULT VIEW — shown after extraction/generation/manual fill for both flows
  // ══════════════════════════════════════════════
  if (hasResult) {
    return (
      <div className="space-y-5">
        <BrandResultEditor data={data} onChange={onChange} />
        {renderSaveBar()}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // EXISTING BRAND FLOW
  // ══════════════════════════════════════════════
  if (selectedOption === 'existing') {
    return (
      <div className="space-y-6">
        {/* Back to Level 1 */}
        <button onClick={goBackToLevel1} className="text-xs text-carbon/40 hover:text-carbon/60 transition-colors tracking-wide uppercase">
          {`\u2190 ${t.creative.backToSelection || 'Back'}`}
        </button>

        {/* Saved Brands */}
        {!loadingBrands && savedBrands.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/50">
              {t.creative.savedBrands || 'Your saved brands'}
            </p>
            <div className="flex flex-wrap gap-3">
              {savedBrands.map((brand) => (
                <div key={brand.id} className="flex items-center gap-3 px-4 py-3 border border-carbon/[0.08] hover:border-carbon/20 transition-all group">
                  <div className="flex gap-1">
                    {(brand.colors || []).slice(0, 4).map((c, i) => {
                      const hex = c.replace(/\s*\(.*\)/, '').trim();
                      return <div key={i} className="w-5 h-5 border border-carbon/[0.08]" style={{ backgroundColor: hex.startsWith('#') ? hex : '#ccc' }} />;
                    })}
                    {(!brand.colors || brand.colors.length === 0) && <div className="w-5 h-5 bg-carbon/[0.06] border border-carbon/[0.08]" />}
                  </div>
                  <span className="text-xs font-medium text-carbon">{brand.brand_name}</span>
                  <button onClick={() => handleUseBrand(brand)} className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors px-2 py-1 border border-carbon/[0.08] hover:border-carbon/20">
                    {t.creative.useBrand || 'Use'}
                  </button>
                  <button onClick={() => handleDeleteBrand(brand.id)} className="text-carbon/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Method toggle */}
        <SegmentedPill
          options={[
            { id: 'extract' as ExistingBrandMethod, label: t.creative.extractWithAI || 'Extract with AI' },
            { id: 'manual' as ExistingBrandMethod, label: t.creative.enterManually || 'Enter manually' },
          ]}
          value={existingMethod}
          onChange={(v) => onChange({ ...data, _existingMethod: v })}
          size="md"
        />

        {/* Extract with AI */}
        {existingMethod === 'extract' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.creative.instagramLabel}</label>
                <input
                  type="text"
                  value={(data.instagram as string) || ''}
                  onChange={(e) => onChange({ ...data, instagram: e.target.value })}
                  placeholder="@yourbrand"
                  className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.creative.websiteLabel}</label>
                <input
                  type="text"
                  value={(data.website as string) || ''}
                  onChange={(e) => onChange({ ...data, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
                />
              </div>
            </div>
            <button
              onClick={handleExtract}
              disabled={generating || (!(data.instagram as string)?.trim() && !(data.website as string)?.trim())}
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.creative.extractBrandDNA}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}

        {/* Enter manually */}
        {existingMethod === 'manual' && (
          <div className="space-y-4">
            <BrandResultEditor data={data} onChange={onChange} />
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange({ ...data, extracted: true })}
                disabled={!(data.brandName as string)?.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5" />
                {t.creative.confirmBrand || "That's all."}
              </button>
              <button
                onClick={handleSaveBrand}
                disabled={saving || !(data.brandName as string)?.trim()}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-[11px] font-medium tracking-[0.1em] uppercase border border-carbon/20 text-carbon/70 hover:bg-carbon/[0.04] transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {savedMsg ? (t.creative.brandSaved || 'Brand saved!') : (t.creative.saveToMyBrands || 'Save to My Brands')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // NEW BRAND FLOW
  // ══════════════════════════════════════════════
  if (selectedOption === 'new') {
    return (
      <div className="space-y-6">
        {/* Back to Level 1 */}
        <button onClick={goBackToLevel1} className="text-xs text-carbon/40 hover:text-carbon/60 transition-colors tracking-wide uppercase">
          {`\u2190 ${t.creative.backToSelection || 'Back'}`}
        </button>

        {/* Method toggle: Free / Assisted / AI Proposal */}
        <SegmentedPill
          options={[
            { id: 'free' as NewBrandMethod, label: t.creative.freeMode || 'Free' },
            { id: 'assisted' as NewBrandMethod, label: t.creative.assistedMode || 'Assisted' },
            { id: 'ai' as NewBrandMethod, label: t.creative.aiProposalMode || 'AI Proposal' },
          ]}
          value={newMethod}
          onChange={(v) => onChange({ ...data, _newMethod: v, _brandProposals: [], _selectedProposal: null })}
          size="md"
        />

        {/* ── Free: empty BrandResultEditor ── */}
        {newMethod === 'free' && (
          <div className="space-y-4">
            <BrandResultEditor data={data} onChange={onChange} />
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange({ ...data, generated: true })}
                disabled={!(data.brandName as string)?.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5" />
                {t.creative.confirmBrand || "That's all."}
              </button>
              <button
                onClick={handleSaveBrand}
                disabled={saving || !(data.brandName as string)?.trim()}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-[11px] font-medium tracking-[0.1em] uppercase border border-carbon/20 text-carbon/70 hover:bg-carbon/[0.04] transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {savedMsg ? (t.creative.brandSaved || 'Brand saved!') : (t.creative.saveToMyBrands || 'Save to My Brands')}
              </button>
            </div>
          </div>
        )}

        {/* ── Assisted: reference brand + brief → AI generates inspired brand ── */}
        {newMethod === 'assisted' && (
          <div className="space-y-4">
            <p className="text-xs text-carbon/50 leading-relaxed">
              {t.creative.assistedBrandDesc || 'Provide a reference brand and a brief. aimily will extract the reference and generate a new brand inspired by it.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.creative.referenceBrandIG || 'Reference Instagram'}</label>
                <input
                  type="text"
                  value={(data.instagram as string) || ''}
                  onChange={(e) => onChange({ ...data, instagram: e.target.value })}
                  placeholder="@referencebrand"
                  className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.creative.referenceBrandURL || 'Reference Website'}</label>
                <input
                  type="text"
                  value={(data.website as string) || ''}
                  onChange={(e) => onChange({ ...data, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.creative.yourBrandName || 'Your New Brand Name'}</label>
              <input
                type="text"
                value={(data.brandName as string) || ''}
                onChange={(e) => onChange({ ...data, brandName: e.target.value })}
                placeholder={t.creative.brandNamePlaceholder || 'e.g. Maison Soleil'}
                className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">{t.creative.briefLabel || 'Brief'}</label>
              <textarea
                value={(data._brief as string) || ''}
                onChange={(e) => onChange({ ...data, _brief: e.target.value })}
                placeholder={t.creative.briefPlaceholder || 'Describe the brand you want to create: target audience, positioning, values, aesthetic...'}
                className="w-full h-24 px-3 py-2.5 text-xs text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
              />
            </div>
            <button
              onClick={handleAssisted}
              disabled={generating || (!(data.instagram as string)?.trim() && !(data.website as string)?.trim())}
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.creative.generateBrand || 'Generate Brand'}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}

        {/* ── AI Proposal: generate 3 brand proposals ── */}
        {newMethod === 'ai' && (
          <div className="space-y-4">
            <p className="text-xs text-carbon/50 leading-relaxed">
              {t.creative.aiProposalBrandDesc || 'aimily will generate 3 brand proposals based on your collection context. Add an optional brief to guide the direction.'}
            </p>
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/40 mb-1.5 block">
                {t.creative.optionalBrief || 'Brief (optional)'}
              </label>
              <textarea
                value={(data._brief as string) || ''}
                onChange={(e) => onChange({ ...data, _brief: e.target.value })}
                placeholder={t.creative.briefPlaceholder || 'Describe the brand you want to create: target audience, positioning, values, aesthetic...'}
                className="w-full h-24 px-3 py-2.5 text-xs text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
              />
            </div>
            <button
              onClick={handleGenerateProposals}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.creative.generateProposals || 'Generate Proposals'}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}

            {/* Proposal cards */}
            {brandProposals.length > 0 && selectedProposalIdx === null && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">
                  {t.creative.selectOneDirection || 'Select one direction'}
                </p>
                {brandProposals.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => selectProposal(i)}
                    className="w-full text-left p-5 border border-carbon/[0.08] hover:border-carbon/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-carbon">{p.brandName}</span>
                      <span className="text-xs tracking-[0.1em] uppercase text-carbon/40 opacity-0 group-hover:opacity-100 transition-opacity">{t.creative.selectAction || 'Select'}</span>
                    </div>
                    {/* Color preview */}
                    <div className="flex gap-1.5 mb-2">
                      {(p.colors || []).slice(0, 6).map((c, ci) => {
                        const hex = c.replace(/\s*\(.*\)/, '').trim();
                        return <div key={ci} className="w-6 h-6 border border-carbon/[0.08]" style={{ backgroundColor: hex.startsWith('#') ? hex : '#ccc' }} />;
                      })}
                    </div>
                    <div className="text-xs text-carbon/70 leading-relaxed line-clamp-2">{p.tone}</div>
                    <div className="text-[11px] text-carbon/40 mt-1">{p.typography}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // LEVEL 1 — "Do you already have a brand?"
  // ══════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Saved Brands Section ── */}
      {!loadingBrands && savedBrands.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/50">
            {t.creative.savedBrands || 'Your saved brands'}
          </p>
          <div className="flex flex-wrap gap-3">
            {savedBrands.map((brand) => (
              <div key={brand.id} className="flex items-center gap-3 px-4 py-3 border border-carbon/[0.08] hover:border-carbon/20 transition-all group">
                <div className="flex gap-1">
                  {(brand.colors || []).slice(0, 4).map((c, i) => {
                    const hex = c.replace(/\s*\(.*\)/, '').trim();
                    return <div key={i} className="w-5 h-5 border border-carbon/[0.08]" style={{ backgroundColor: hex.startsWith('#') ? hex : '#ccc' }} />;
                  })}
                  {(!brand.colors || brand.colors.length === 0) && <div className="w-5 h-5 bg-carbon/[0.06] border border-carbon/[0.08]" />}
                </div>
                <span className="text-xs font-medium text-carbon">{brand.brand_name}</span>
                <button onClick={() => handleUseBrand(brand)} className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors px-2 py-1 border border-carbon/[0.08] hover:border-carbon/20">
                  {t.creative.useBrand || 'Use'}
                </button>
                <button onClick={() => handleDeleteBrand(brand.id)} className="text-carbon/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two Cards: Existing vs New ── */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/50 mb-4">
          {t.creative.doYouHaveBrand || 'Do you already have a brand?'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card A: I already have my brand */}
          <button
            onClick={() => onChange({ ...data, _brandOption: 'existing', _existingMethod: 'extract' })}
            className="text-left p-6 border border-carbon/[0.08] hover:border-carbon/20 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center mb-3">
              <Fingerprint className="h-5 w-5 text-carbon/50" />
            </div>
            <p className="text-sm font-medium text-carbon mb-1">{t.creative.iHaveMyBrand || 'I already have my brand'}</p>
            <p className="text-[11px] text-carbon/50 leading-relaxed">{t.creative.iHaveMyBrandDesc || 'Extract your brand identity from your website or Instagram, or enter it manually.'}</p>
          </button>

          {/* Card B: Create a new brand */}
          <button
            onClick={() => onChange({ ...data, _brandOption: 'new', _newMethod: 'free' })}
            className="text-left p-6 border border-carbon/[0.08] hover:border-carbon/20 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-carbon/50" />
            </div>
            <p className="text-sm font-medium text-carbon mb-1">{t.creative.createNewBrand || 'Create a new brand'}</p>
            <p className="text-[11px] text-carbon/50 leading-relaxed">{t.creative.createNewBrandDesc || 'Build a brand from scratch — manually, with AI assistance, or let aimily propose one for you.'}</p>
          </button>
        </div>
      </div>
    </div>
  );
}

/* Placeholder content for Step 2 blocks */
interface ResearchResult {
  title: string;
  brands?: string;
  desc: string;
  relevance?: string;
  selected: boolean;
  editing?: boolean;
}

function ResearchBlockContent({ blockId, data, onChange, collectionContext, consumerProfile }: { blockId: string; mode?: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void; collectionContext: { season: string; collectionName: string }; consumerProfile?: string }) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config per block: which need required input, which are one-click
  const config: Record<string, { requiresInput: boolean; inputLabel: string; placeholder: string; generateLabel: string; description: string }> = {
    'global-trends': {
      requiresInput: false,
      inputLabel: 'Optional focus',
      placeholder: 'e.g. footwear, knitwear, sustainable materials... (optional)',
      generateLabel: t.creative.analyzeGlobalTrends,
      description: `We'll research macro-trends for ${collectionContext.season || 'your season'} using your collection context.`,
    },
    'deep-dive': {
      requiresInput: true,
      inputLabel: t.creative.productTypeMarket,
      placeholder: t.creative.productTypeMarketPlaceholder,
      generateLabel: t.creative.deepDiveAnalysis,
      description: 'Tell us what specific area to investigate — product category, material, technique, or market segment.',
    },
    'live-signals': {
      requiresInput: false,
      inputLabel: 'Optional focus',
      placeholder: 'e.g. streetwear, Gen Z, sustainability... (optional)',
      generateLabel: t.creative.scanLiveSignals,
      description: `We'll scan what's trending right now in fashion and culture.`,
    },
    'competitors': {
      requiresInput: true,
      inputLabel: t.creative.referenceBrands,
      placeholder: t.creative.referenceBrandsPlaceholder,
      generateLabel: t.creative.analyzeCompetitors,
      description: 'Which brands do you want to analyze? Enter brand names.',
    },
  };

  const c = config[blockId] || { requiresInput: true, inputLabel: 'Input', placeholder: '', generateLabel: 'Generate', description: '' };
  const results = (data.results as ResearchResult[]) || [];

  const updateResult = (idx: number, updates: Partial<ResearchResult>) => {
    const updated = [...results];
    updated[idx] = { ...updated[idx], ...updates };
    onChange({ ...data, results: updated });
  };

  const removeResult = (idx: number) => {
    onChange({ ...data, results: results.filter((_, i) => i !== idx) });
  };

  const selectedCount = results.filter(r => r.selected).length;
  const unselectedCount = results.length - selectedCount;

  // Per-lens ficha shape — what the user edits in the input area.
  // All four lenses share `focus: string[]` except competitors which
  // uses `brands: string[]` (semantic separation for downstream).
  const focus = (data.focus as string[]) || [];
  const brands = (data.brands as string[]) || [];

  // Validation per lens. Felipe's framing rules:
  // - Global / Live: optional (vacío permitido = framing minimal)
  // - Deep / Competitors: at least one chip required
  const canGenerate = (() => {
    if (blockId === 'deep-dive') return focus.length > 0;
    if (blockId === 'competitors') return brands.length > 0;
    return true;
  })();

  const typeMap: Record<string, string> = {
    'global-trends': 'trends-global',
    'deep-dive': 'trends-deep-dive',
    'live-signals': 'trends-live-signals',
    'competitors': 'trends-competitors',
  };

  const callResearch = async (excludeTitles: string[] = []) => {
    // Build the prompt input from the lens-specific ficha. The
    // existing creative-generate prompts consume a single comma-
    // separated string as `input`, so we just join chips (or
    // topic + aspects for deep-dive) into that shape.
    let inputStr = '';
    if (blockId === 'competitors') {
      inputStr = brands.join(', ');
    } else {
      // global / deep / live all use focus chips
      inputStr = focus.join(', ');
    }
    if (!inputStr) inputStr = collectionContext.collectionName || '';
    const inputPayload: Record<string, string> = {
      input: inputStr,
      consumer: consumerProfile || '',
      ...collectionContext,
    };
    if (excludeTitles.length > 0) {
      inputPayload.excludeTitles = excludeTitles.join('|||');
    }
    return generateCreative(typeMap[blockId] || 'trends-global', inputPayload, language);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const { result, error: err } = await callResearch();
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { results: Array<{ title: string; brands?: string; desc: string; relevance?: string }> };
    const newResults = (parsed.results || []).map((r) => ({ ...r, selected: false, editing: false }));
    onChange({ ...data, results: newResults });
    setGenerating(false);
  };

  const handleLoadMore = async () => {
    setGenerating(true);
    setError(null);
    const existingTitles = results.map(r => r.title);
    const { result, error: err } = await callResearch(existingTitles);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { results: Array<{ title: string; brands?: string; desc: string; relevance?: string }> };
    const moreResults = (parsed.results || [])
      .filter(r => !existingTitles.includes(r.title)) // Extra safety: no duplicates
      .slice(0, 4)
      .map((r) => ({ ...r, selected: false, editing: false }));
    onChange({ ...data, results: [...results, ...moreResults] });
    setGenerating(false);
  };

  const handleReplaceUnselected = async () => {
    setGenerating(true);
    setError(null);
    const selectedResults = results.filter(r => r.selected);
    const excludeTitles = selectedResults.map(r => r.title);
    const { result, error: err } = await callResearch(excludeTitles);
    if (err) { setError(err); setGenerating(false); return; }
    const parsed = result as { results: Array<{ title: string; brands?: string; desc: string; relevance?: string }> };
    const newResults = (parsed.results || [])
      .filter(r => !excludeTitles.includes(r.title))
      .slice(0, unselectedCount)
      .map((r) => ({ ...r, selected: false, editing: false }));
    onChange({ ...data, results: [...selectedResults, ...newResults] });
    setGenerating(false);
  };

  // Lens-specific ficha label + placeholder. Three of four lenses
  // share the focus chip cloud; competitors keeps `brands` for the
  // semantic separation.
  const fichaT = t.creative as Record<string, string>;
  const fichaLabel = blockId === 'competitors'
    ? (fichaT.researchBrandsLabel || 'marcas a analizar')
    : (fichaT.researchFocusLabel || 'categorías foco');
  const fichaPlaceholder = blockId === 'competitors'
    ? (fichaT.researchBrandsPlaceholder || 'añadir marca')
    : (fichaT.researchFocusPlaceholder || 'añadir categoría');

  return (
    <div className="space-y-8">
      {/* ── Ficha + Generate — chip-based, pre-poblado desde moodboard ── */}
      <div>
        <p className="text-[14px] text-carbon/55 leading-relaxed mb-6 max-w-[640px]">{c.description}</p>

        <FichaRow label={fichaLabel}>
          <EditableChipCloud
            values={blockId === 'competitors' ? brands : focus}
            onChange={(v) => {
              if (blockId === 'competitors') onChange({ ...data, brands: v });
              else onChange({ ...data, focus: v });
            }}
            placeholder={fichaPlaceholder}
          />
        </FichaRow>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className="inline-flex items-center gap-2 pl-7 pr-6 py-3 rounded-full text-[14px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>
              {generating
                ? ((t.creative as Record<string, string>).generatingProposals || 'Generando…')
                : c.generateLabel}
            </span>
            {!generating && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </button>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
      </div>

      {/* ── Status + controls row ── */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
            {selectedCount} {t.creative.selectedCount} · {unselectedCount} {t.creative.unselectedCount} · {results.length} {t.creative.totalCount}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadMore}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors disabled:opacity-30"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Load 4 more
            </button>
            {selectedCount > 0 && unselectedCount > 0 && (
              <button
                onClick={handleReplaceUnselected}
                disabled={generating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors disabled:opacity-30"
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Replace {unselectedCount} unselected
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Results grid — premium cards ── */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((r, i) => (
            <div
              key={i}
              className={`group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[260px] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${
                r.selected ? 'border-2 border-carbon' : 'border border-carbon/[0.06]'
              }`}
            >
              {/* Selector — top right */}
              <button
                onClick={() => updateResult(i, { selected: !r.selected })}
                className={`absolute top-5 right-5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  r.selected
                    ? 'bg-carbon text-white'
                    : 'bg-carbon/[0.04] text-transparent hover:bg-carbon/[0.08] group-hover:text-carbon/30'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </button>

              {r.editing ? (
                <div className="flex flex-col gap-3 pr-10">
                  <input
                    type="text"
                    value={r.title}
                    onChange={(e) => updateResult(i, { title: e.target.value })}
                    className="px-3 py-2 text-[16px] font-semibold text-carbon bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none"
                  />
                  <textarea
                    value={r.desc}
                    onChange={(e) => updateResult(i, { desc: e.target.value })}
                    rows={4}
                    className="px-3 py-2 text-[13px] text-carbon bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none resize-none leading-relaxed"
                  />
                  <button
                    onClick={() => updateResult(i, { editing: false })}
                    className="self-start inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium bg-carbon text-white hover:bg-carbon/90 transition-colors"
                  >
                    <Check className="h-3 w-3" /> {t.creative.doneEditing}
                  </button>
                </div>
              ) : (
                <>
                  {r.relevance && (
                    <div
                      className={`inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-[9px] tracking-[0.15em] uppercase font-semibold mb-4 ${
                        r.relevance === 'high' ? 'bg-carbon text-white' : 'bg-carbon/[0.06] text-carbon/50'
                      }`}
                    >
                      {r.relevance}
                    </div>
                  )}
                  <h3 className="text-[18px] md:text-[20px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-2 pr-10">
                    {r.title}
                  </h3>
                  {r.brands && (
                    <div className="text-[12px] text-carbon/45 italic mb-3 leading-relaxed">{r.brands}</div>
                  )}
                  <p className="text-[13px] text-carbon/65 leading-relaxed flex-1">{r.desc}</p>

                  {/* Hover actions — bottom row */}
                  <div className="mt-6 pt-4 border-t border-carbon/[0.06] flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => updateResult(i, { editing: true })}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium text-carbon/50 hover:text-carbon hover:bg-carbon/[0.04] transition-colors"
                    >
                      <Pencil className="h-2.5 w-2.5" /> Edit
                    </button>
                    <button
                      onClick={() => removeResult(i)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium text-carbon/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" /> Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Market Research Unified — 4 fichas pre-pobladas + expansion 3fr/1fr ───
   Each lens lands pre-filled from upstream CIS (moodboard + consumer):
   chips visibles in the overview cards, no opaque textareas. Click
   Start on a card → grid reorganizes from 4-col to 3fr/1fr with that
   card expanded and the other 3 stacked compactly on the right. The
   expanded view hosts ResearchBlockContent with the canonical helpers
   (FichaRow + EditableChipCloud) replacing the legacy textarea path.
   ───────────────────────────────────────────────────────────────── */
type ResearchLensKey = 'global' | 'deep' | 'live' | 'competitors';

function MarketResearchUnified({
  blockData,
  updateBlockData,
  collectionContext,
  consumerProfile,
}: {
  blockData: BlockData;
  updateBlockData: (blockId: string, updates: Partial<BlockData[string]>) => void;
  collectionContext: { season: string; collectionName: string };
  consumerProfile?: string;
}) {
  const t = useTranslation();
  const { language } = useLanguage();
  const { id: collectionPlanId } = useParams();
  const RESEARCH_BLOCKS: Array<{ id: string; lens: ResearchLensKey; label: string; desc: string; icon: typeof Globe }> = [
    { id: 'global-trends', lens: 'global',      label: t.creative.globalTrends,  desc: t.creative.globalTrendsDesc,  icon: Globe },
    { id: 'deep-dive',     lens: 'deep',        label: t.creative.deepDive,      desc: t.creative.deepDiveDesc,      icon: Microscope },
    { id: 'live-signals',  lens: 'live',        label: t.creative.liveSignals,   desc: t.creative.liveSignalsDesc,   icon: Radio },
    { id: 'competitors',   lens: 'competitors', label: t.creative.competitors,   desc: t.creative.competitorsDesc,   icon: Building2 },
  ];
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const fetchedFichaRef = useRef<Set<string>>(new Set());

  // Pre-fill the four lenses' fichas from upstream CIS in parallel on
  // mount. Each lens has its own shape (focus chips for global/live;
  // topic+aspects for deep; brands for competitors) — the suggest
  // endpoint returns the right one based on `lens`. Skip if the lens
  // already has data (user already populated, or already fetched).
  useEffect(() => {
    if (!collectionPlanId) return;
    RESEARCH_BLOCKS.forEach((block) => {
      if (fetchedFichaRef.current.has(block.id)) return;
      const blockState = blockData[block.id] || { data: {} };
      const data = blockState.data || {};
      const alreadyHasFicha =
        ((data.focus as string[])?.length || 0) > 0 ||
        ((data.brands as string[])?.length || 0) > 0;
      if (alreadyHasFicha) {
        fetchedFichaRef.current.add(block.id);
        return;
      }
      fetchedFichaRef.current.add(block.id);
      (async () => {
        try {
          const res = await fetch('/api/ai/research-suggest-input', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionPlanId, lens: block.lens, language }),
          });
          if (!res.ok) return;
          const out = await res.json();
          updateBlockData(block.id, { data: { ...data, ...out, _suggestionFromMoodboard: true } });
        } catch (err) {
          console.error('[ResearchSuggestInput] failed for lens', block.lens, err);
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPlanId]);

  // Render a compact ficha summary (chips, topic, brands) for a lens
  // card — used in both the overview front face and the mini cards
  // when something else is active. Read-only display; the editable
  // version lives in the expanded view.
  const renderFichaPreview = (block: typeof RESEARCH_BLOCKS[number], compact = false) => {
    const data = blockData[block.id]?.data || {};
    const chipBase = compact
      ? 'inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] bg-carbon/[0.04] text-carbon/70'
      : 'inline-flex items-center px-3 py-1.5 rounded-full text-[12px] bg-carbon/[0.04] text-carbon/70';
    // All four lenses now share a chip-array shape: `focus` for
    // global/deep/live, `brands` for competitors. Felipe collapsed
    // Deep Dive's earlier topic+aspects shape into chips after the
    // first run came back too output-like.
    const items = block.lens === 'competitors' ? ((data.brands as string[]) || []) : ((data.focus as string[]) || []);
    if (items.length === 0) {
      return (
        <p className={`text-carbon/35 italic ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
          {(t.creative as Record<string, string>).researchPreviewLoading || 'leyendo tu moodboard…'}
        </p>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, compact ? 3 : 6).map((item, i) => (
          <span key={i} className={chipBase}>{capitalizeFirst(item)}</span>
        ))}
        {items.length > (compact ? 3 : 6) && (
          <span className="text-[10px] text-carbon/40 self-center">+{items.length - (compact ? 3 : 6)}</span>
        )}
      </div>
    );
  };

  // Confirm/results badge — shown when the user has already saved
  // selected results for that lens. Replaces the Start CTA in that
  // case. The number reflects results.filter(selected) on confirm.
  const renderBadge = (block: typeof RESEARCH_BLOCKS[number]) => {
    const blockState = blockData[block.id] || { confirmed: false, data: {} };
    const results = (blockState.data?.results as Array<{ selected?: boolean }>) || [];
    const selectedCount = results.filter((r) => r.selected).length;
    if (!blockState.confirmed || selectedCount === 0) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-[0.12em] uppercase font-semibold bg-carbon/[0.06] text-carbon/65">
        <Check className="h-3 w-3" />
        {selectedCount} {(t.creative as Record<string, string>).inYourBrief || 'en tu brief'}
      </div>
    );
  };

  /* ─── Mode 1 · Overview · 4 cards equal size, all with pre-filled fichas ─── */
  if (activeIdx === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {RESEARCH_BLOCKS.map((block, idx) => {
          const blockState = blockData[block.id] || { confirmed: false, data: {} };
          const isStarted = blockState.confirmed || ((blockState.data?.results as unknown[])?.length || 0) > 0;
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className="group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
            >
              <div className="text-[10px] tracking-[0.22em] uppercase text-carbon/55 font-semibold mb-4">
                0{idx + 1} · {block.label}
              </div>
              <h3 className="text-[22px] md:text-[26px] font-medium text-carbon tracking-[-0.02em] leading-[1.15] mb-3">
                {block.label}
              </h3>
              <p className="text-[13px] text-carbon/50 leading-[1.6] tracking-[-0.01em] mb-6">
                {block.desc}
              </p>

              {/* Ficha preview — chips pre-pobladas desde el moodboard */}
              <div className="mb-6">
                {renderFichaPreview(block, false)}
              </div>

              <div className="flex-1" />

              {renderBadge(block)}

              <div className="flex justify-center mt-6">
                <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                  {isStarted ? ((t.creative as Record<string, string>).continueAction || 'Continuar') : 'Start'}
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  /* ─── Mode 2 · Expanded · activeIdx card grows to 3fr, others compact ─── */
  const activeBlock = RESEARCH_BLOCKS[activeIdx];
  const activeState = blockData[activeBlock.id] || { mode: 'ai' as InputMode, confirmed: false, data: {} };
  const inactive = RESEARCH_BLOCKS.map((block, idx) => ({ block, idx })).filter(({ idx }) => idx !== activeIdx);

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setActiveIdx(null)}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-semibold text-carbon/65 hover:text-carbon hover:bg-carbon/[0.04] transition-all border border-carbon/[0.10] hover:border-carbon/25"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {(t.creative as Record<string, string>).backToOverview || 'Ver las 4 lentes'}
        </button>
        <button
          onClick={() => updateBlockData(activeBlock.id, { confirmed: !activeState.confirmed })}
          className={`inline-flex items-center gap-2 py-2.5 pl-7 pr-6 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
            activeState.confirmed
              ? 'border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04]'
              : 'bg-carbon text-white hover:bg-carbon/90'
          }`}
        >
          {activeState.confirmed ? t.creative.confirmedAction : t.creative.confirmContinue}
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] lg:grid-rows-3 gap-5 transition-all duration-500 ease-out">
        {/* Active card — expanded, hosts the legacy ResearchBlockContent
            inside which now renders the chip-based ficha + result cards. */}
        <div className="lg:row-span-3 lg:col-start-1 bg-white rounded-[20px] p-8 md:p-10 min-h-[640px]">
          <div className="text-[10px] tracking-[0.22em] uppercase text-carbon/55 font-semibold mb-2">
            0{activeIdx + 1} · {activeBlock.label}
          </div>
          <h2 className="text-[28px] md:text-[34px] font-medium text-carbon tracking-[-0.02em] leading-[1.05] mb-2">
            {activeBlock.label}
          </h2>
          <p className="text-[14px] text-carbon/55 leading-[1.6] mb-8">
            {activeBlock.desc}
          </p>
          <ResearchBlockContent
            blockId={activeBlock.id}
            mode={activeState.mode}
            data={activeState.data}
            onChange={(newData) => updateBlockData(activeBlock.id, { data: newData })}
            collectionContext={collectionContext}
            consumerProfile={consumerProfile}
          />
        </div>

        {/* The 3 mini cards stacked in the right column */}
        {inactive.map(({ block, idx }) => {
          const blockState = blockData[block.id] || { confirmed: false, data: {} };
          const isStarted = blockState.confirmed || ((blockState.data?.results as unknown[])?.length || 0) > 0;
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className="lg:col-start-2 group relative bg-white rounded-[20px] p-5 flex flex-col transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] text-left overflow-hidden"
            >
              <div className="text-[9px] tracking-[0.22em] uppercase text-carbon/55 font-semibold mb-2">
                0{idx + 1} · {block.label}
              </div>
              <h3 className="text-[15px] font-medium text-carbon tracking-[-0.01em] leading-tight mb-3">
                {block.label}
              </h3>
              <div className="mb-2">
                {renderFichaPreview(block, true)}
              </div>
              <div className="flex-1" />
              <div className="flex items-center justify-between mt-2 pt-2">
                {renderBadge(block) || <span />}
                <ArrowRight className="h-3 w-3 text-carbon/35 group-hover:text-carbon group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Expanded Block Content Router ─── */
function ExpandedBlockContent({ blockId, stepId, mode, data, onChange, collectionContext, consumerProfile, vibeText }: {
  blockId: string;
  stepId: string;
  mode: InputMode;
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  collectionContext: { season: string; collectionName: string };
  consumerProfile?: string;
  vibeText?: string;
}) {
  if (stepId === 'vision') {
    switch (blockId) {
      case 'consumer': return <ConsumerContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} />;
      case 'vibe': return <VibeContent mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} consumerProfile={consumerProfile} />;
      case 'moodboard': return <MoodboardContent data={data} onChange={onChange} />;
      case 'brand-dna': return <BrandDNAContent data={data} onChange={onChange} collectionContext={collectionContext} />;
    }
  }
  if (stepId === 'research') {
    return <ResearchBlockContent blockId={blockId} mode={mode} data={data} onChange={onChange} collectionContext={collectionContext} consumerProfile={consumerProfile} />;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   Creative Synthesis — Visual Creative Brief
   ═══════════════════════════════════════════════════════════ */

function CreativeSynthesisView({ blockData, collectionContext, updateBlockData }: { blockData: BlockData; collectionContext: { season: string; collectionName: string }; updateBlockData: (blockId: string, updates: Partial<BlockData[string]>) => void }) {
  const t = useTranslation();
  const router = useRouter();
  const [showAllImages, setShowAllImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { id: collectionId } = useParams();

  // ── Extract all confirmed data ──
  const vibeData = blockData.vibe?.data || {};
  const vibeTitle = (vibeData.vibeTitle as string) || '';
  const vibeNarrative = (vibeData.vibe as string) || '';
  const vibeKeywords = (vibeData.keywords as string) || '';

  const consumerData = blockData.consumer?.data || {};
  const consumerProposals = ((consumerData.proposals as Array<{ title: string; desc: string; status: string }>) || [])
    .filter(p => p.status !== 'rejected');

  const moodboardImages = (blockData.moodboard?.data?.images as string[]) || [];

  const brandData = blockData['brand-dna']?.data || {};
  const brandName = (brandData.brandName as string) || '';
  const brandColors = (brandData.colors as string[]) || [];
  const brandTone = (brandData.tone as string) || '';
  const brandTypography = (brandData.typography as string) || '';
  const brandStyle = (brandData.style as string) || '';

  const getSelectedResults = (blockId: string): ResearchResult[] => {
    const results = (blockData[blockId]?.data?.results as ResearchResult[]) || [];
    return results.filter(r => r.selected);
  };

  const globalTrends = getSelectedResults('global-trends');
  const deepDive = getSelectedResults('deep-dive');
  const liveSignals = getSelectedResults('live-signals');
  const competitors = getSelectedResults('competitors');
  const allTrends = [...globalTrends, ...deepDive, ...liveSignals];

  const hasVibe = !!(vibeTitle || vibeNarrative);
  const hasConsumer = consumerProposals.length > 0;
  const hasMoodboard = moodboardImages.length > 0;
  const hasBrand = !!(brandName || brandColors.length > 0);
  const hasTrends = allTrends.length > 0;
  const hasCompetitors = competitors.length > 0;
  const hasAnything = hasVibe || hasConsumer || hasMoodboard || hasBrand || hasTrends;

  // ── Synthesis state ──
  const [validated, setValidated] = useState(!!blockData._synthesis?.confirmed);
  const [showCelebration, setShowCelebration] = useState(false);
  const [addingTrend, setAddingTrend] = useState(false);
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [newCard, setNewCard] = useState({ title: '', brands: '', desc: '' });
  const [editingTrendIdx, setEditingTrendIdx] = useState<number | null>(null);
  const [editingCompIdx, setEditingCompIdx] = useState<number | null>(null);
  const [editingBrand, setEditingBrand] = useState(false);
  const [editingConsumerIdx, setEditingConsumerIdx] = useState<number | null>(null);
  const [addingConsumer, setAddingConsumer] = useState(false);
  const [newConsumer, setNewConsumer] = useState({ title: '', desc: '' });

  // ── Research edit helpers ──
  const updateResearchResults = (blockId: string, updatedResults: ResearchResult[]) => {
    const currentData = blockData[blockId]?.data || {};
    const allResults = (currentData.results as ResearchResult[]) || [];
    // Rebuild: keep unselected as-is, replace selected with updated
    const unselected = allResults.filter(r => !r.selected);
    updateBlockData(blockId, { data: { ...currentData, results: [...unselected, ...updatedResults] } });
  };

  const removeTrend = (idx: number) => {
    // Find which block this trend belongs to and remove it
    let offset = 0;
    for (const blockId of ['global-trends', 'deep-dive', 'live-signals'] as const) {
      const selected = getSelectedResults(blockId);
      if (idx < offset + selected.length) {
        const localIdx = idx - offset;
        const updated = selected.filter((_, i) => i !== localIdx);
        updateResearchResults(blockId, updated);
        return;
      }
      offset += selected.length;
    }
  };

  const updateTrend = (idx: number, updates: Partial<ResearchResult>) => {
    let offset = 0;
    for (const blockId of ['global-trends', 'deep-dive', 'live-signals'] as const) {
      const selected = getSelectedResults(blockId);
      if (idx < offset + selected.length) {
        const localIdx = idx - offset;
        const updated = [...selected];
        updated[localIdx] = { ...updated[localIdx], ...updates };
        updateResearchResults(blockId, updated);
        return;
      }
      offset += selected.length;
    }
  };

  const addManualTrend = () => {
    if (!newCard.title.trim()) return;
    const currentData = blockData['global-trends']?.data || {};
    const results = (currentData.results as ResearchResult[]) || [];
    const manual: ResearchResult = { title: newCard.title, brands: newCard.brands, desc: newCard.desc, relevance: 'high', selected: true };
    updateBlockData('global-trends', { data: { ...currentData, results: [...results, manual] } });
    setNewCard({ title: '', brands: '', desc: '' });
    setAddingTrend(false);
  };

  const removeCompetitor = (idx: number) => {
    const selected = getSelectedResults('competitors');
    const updated = selected.filter((_, i) => i !== idx);
    updateResearchResults('competitors', updated);
  };

  const updateCompetitor = (idx: number, updates: Partial<ResearchResult>) => {
    const selected = getSelectedResults('competitors');
    const updated = [...selected];
    updated[idx] = { ...updated[idx], ...updates };
    updateResearchResults('competitors', updated);
  };

  const addManualCompetitor = () => {
    if (!newCard.title.trim()) return;
    const currentData = blockData['competitors']?.data || {};
    const results = (currentData.results as ResearchResult[]) || [];
    const manual: ResearchResult = { title: newCard.title, brands: newCard.brands, desc: newCard.desc, relevance: 'high', selected: true };
    updateBlockData('competitors', { data: { ...currentData, results: [...results, manual] } });
    setNewCard({ title: '', brands: '', desc: '' });
    setAddingCompetitor(false);
  };

  // ── Brand DNA edit helpers ──
  const updateBrandField = (field: string, value: string | string[]) => {
    const current = blockData['brand-dna']?.data || {};
    updateBlockData('brand-dna', { data: { ...current, [field]: value } });
  };

  // ── Consumer edit helpers ──
  const getAllConsumerProposals = (): Array<{ title: string; desc: string; status: string }> => {
    return (consumerData.proposals as Array<{ title: string; desc: string; status: string }>) || [];
  };

  const updateConsumerProposal = (likedIdx: number, updates: { title?: string; desc?: string }) => {
    const all = getAllConsumerProposals();
    const liked = all.filter(p => p.status === 'liked');
    const target = liked[likedIdx];
    if (!target) return;
    const globalIdx = all.indexOf(target);
    const updated = [...all];
    updated[globalIdx] = { ...updated[globalIdx], ...updates };
    updateBlockData('consumer', { data: { ...consumerData, proposals: updated } });
  };

  const removeConsumerProposal = (likedIdx: number) => {
    const all = getAllConsumerProposals();
    const liked = all.filter(p => p.status === 'liked');
    const target = liked[likedIdx];
    if (!target) return;
    const globalIdx = all.indexOf(target);
    const updated = [...all];
    updated[globalIdx] = { ...updated[globalIdx], status: 'rejected' };
    updateBlockData('consumer', { data: { ...consumerData, proposals: updated } });
  };

  const addManualConsumer = () => {
    if (!newConsumer.title.trim()) return;
    const all = getAllConsumerProposals();
    const manual = { title: newConsumer.title, desc: newConsumer.desc, status: 'liked' };
    updateBlockData('consumer', { data: { ...consumerData, proposals: [...all, manual] } });
    setNewConsumer({ title: '', desc: '' });
    setAddingConsumer(false);
  };

  const handleValidate = () => {
    if (validated) {
      // Un-validate to allow re-editing
      setValidated(false);
      updateBlockData('_synthesis', { confirmed: false, data: {} });
    } else {
      setValidated(true);
      setShowCelebration(true);
      updateBlockData('_synthesis', { confirmed: true, data: { validatedAt: new Date().toISOString() } });
    }
  };

  // ── Moodboard edit actions ──
  const removeImage = (idx: number) => {
    const updated = moodboardImages.filter((_, i) => i !== idx);
    updateBlockData('moodboard', { data: { ...blockData.moodboard?.data, images: updated } });
  };

  const addImages = async (files: FileList) => {
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      try {
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId: collectionId, assetType: 'moodboard', name: file.name, base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.publicUrl) newUrls.push(data.publicUrl);
      } catch { /* skip failed uploads */ }
    }
    if (newUrls.length > 0) {
      updateBlockData('moodboard', { data: { ...blockData.moodboard?.data, images: [...moodboardImages, ...newUrls] } });
    }
  };

  // Images to show: first 16 or all
  const visibleImages = showAllImages ? moodboardImages : moodboardImages.slice(0, 16);
  const hasMoreImages = moodboardImages.length > 16;

  if (!hasAnything) {
    return (
      <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 sm:p-12 lg:p-16 min-h-[300px] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-carbon/[0.04] rounded-[14px] flex items-center justify-center mb-6">
          <Sparkles className="h-6 w-6 text-carbon/30" />
        </div>
        <h3 className="text-2xl font-light text-carbon tracking-tight mb-3">{(t.creative as Record<string, string>)?.creativeSynthesis || "Creative Synthesis"}</h3>
        <p className="text-sm text-carbon/60 max-w-md leading-relaxed">
          Complete your Creative Vision and Market Research to see your unified creative direction here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Validate — centered button only ── */}
      <div className="flex justify-center">
        <button
          onClick={handleValidate}
          className={`inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
            validated
              ? 'border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04]'
              : 'bg-carbon text-white hover:bg-carbon/90'
          }`}
        >
          <Check className="h-3.5 w-3.5" />
          {validated ? 'Validated — click to edit' : 'Validate Creative Direction'}
        </button>
      </div>

      {/* ── Hero: Collection + Vibe Statement ── */}
      {hasVibe && (
        <div className="bg-carbon text-crema p-8 sm:p-12 lg:p-16 rounded-[20px]">
          <div className="text-[10px] font-medium tracking-[0.3em] uppercase text-crema/40 mb-4">
            {collectionContext.collectionName}
          </div>
          {vibeTitle && (
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-6">
              {vibeTitle}
            </h2>
          )}
          {vibeNarrative && (
            <p className="text-sm sm:text-base font-light text-crema/80 leading-relaxed max-w-2xl">
              {vibeNarrative}
            </p>
          )}
          {vibeKeywords && (
            <div className="flex flex-wrap gap-2 mt-6">
              {vibeKeywords.split(',').map((kw, i) => (
                <span key={i} className="px-3.5 py-1 rounded-full text-[10px] tracking-[0.08em] uppercase border border-crema/20 text-crema/60">
                  {kw.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Moodboard — compact grid with edit controls ── */}
      {(hasMoodboard || hasAnything) && (
        <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/30">
              Moodboard {hasMoodboard ? `· ${moodboardImages.length}` : ''}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && addImages(e.target.files)}
            />
          </div>
          {hasMoodboard ? (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
                {visibleImages.map((url, i) => (
                  <div key={i} className="group relative aspect-square bg-carbon/[0.04] rounded-[8px] overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-carbon/80 text-crema flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {hasMoreImages && !showAllImages && (
                <button
                  onClick={() => setShowAllImages(true)}
                  className="mt-3 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors"
                >
                  Show all {moodboardImages.length} photos
                </button>
              )}
              {showAllImages && hasMoreImages && (
                <button
                  onClick={() => setShowAllImages(false)}
                  className="mt-3 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors"
                >
                  Show less
                </button>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-xs text-carbon/30">{(t.creative as Record<string, string>)?.noMoodboardImages || "No moodboard images yet"}</div>
          )}
        </div>
      )}

      {/* ── Brand DNA + Consumer — Side by Side, editable ── */}
      <div className={`grid gap-6 ${hasBrand && hasConsumer ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {hasBrand && (
          <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/30">{(t.creative as Record<string, string>)?.brandDNA || "Brand DNA"}</div>
              <button
                onClick={() => setEditingBrand(!editingBrand)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors"
              >
                <Pencil className="h-3 w-3" /> {editingBrand ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingBrand ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.brandName || "Brand Name"}</div>
                  <input type="text" value={brandName} onChange={(e) => updateBrandField('brandName', e.target.value)} className="w-full px-2 py-1.5 text-sm text-carbon border border-carbon/[0.12] focus:outline-none" />
                </div>
                <div>
                  <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.colorsHexLabel || "Colors (hex, comma-separated)"}</div>
                  <input type="text" value={brandColors.join(', ')} onChange={(e) => updateBrandField('colors', e.target.value.split(',').map(c => c.trim()).filter(Boolean))} className="w-full px-2 py-1.5 text-xs text-carbon border border-carbon/[0.12] focus:outline-none font-mono" />
                </div>
                <div>
                  <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.voiceTone || "Voice & Tone"}</div>
                  <textarea value={brandTone} onChange={(e) => updateBrandField('tone', e.target.value)} className="w-full px-2 py-1.5 text-xs text-carbon/70 border border-carbon/[0.12] focus:outline-none resize-none h-16" />
                </div>
                <div>
                  <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.typography || "Typography"}</div>
                  <textarea value={brandTypography} onChange={(e) => updateBrandField('typography', e.target.value)} className="w-full px-2 py-1.5 text-xs text-carbon/70 border border-carbon/[0.12] focus:outline-none resize-none h-12" />
                </div>
                <div>
                  <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.visualIdentity || "Visual Identity"}</div>
                  <textarea value={brandStyle} onChange={(e) => updateBrandField('style', e.target.value)} className="w-full px-2 py-1.5 text-xs text-carbon/70 border border-carbon/[0.12] focus:outline-none resize-none h-16" />
                </div>
              </div>
            ) : (
              <>
                {brandName && <h4 className="text-lg font-light text-carbon tracking-tight mb-4">{brandName}</h4>}
                {brandColors.length > 0 && (
                  <div className="flex gap-2 mb-5">
                    {brandColors.map((c, i) => {
                      const hex = c.replace(/\s*\(.*\)/, '').trim();
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div className="w-10 h-10 border border-carbon/[0.08]" style={{ backgroundColor: hex }} />
                          <span className="text-[9px] text-carbon/40 font-mono">{hex}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {brandTone && (
                  <div className="mb-3">
                    <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.voiceTone || "Voice & Tone"}</div>
                    <p className="text-xs text-carbon/70 leading-relaxed">{brandTone}</p>
                  </div>
                )}
                {brandTypography && (
                  <div className="mb-3">
                    <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.typography || "Typography"}</div>
                    <p className="text-xs text-carbon/70 leading-relaxed">{brandTypography}</p>
                  </div>
                )}
                {brandStyle && (
                  <div>
                    <div className="text-[9px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-1">{(t.creative as Record<string, string>)?.visualIdentity || "Visual Identity"}</div>
                    <p className="text-xs text-carbon/70 leading-relaxed">{brandStyle}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(hasConsumer || hasAnything) && (
          <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/30">
                Target Consumer{consumerProposals.length > 1 ? 's' : ''} {hasConsumer ? `· ${consumerProposals.length}` : ''}
              </div>
              <button
                onClick={() => { setAddingConsumer(true); setNewConsumer({ title: '', desc: '' }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-4">
              {consumerProposals.map((p, i) => (
                <div key={i} className="group relative">
                  {editingConsumerIdx === i ? (
                    <div className="space-y-2 p-3 border border-carbon/[0.12]">
                      <input type="text" value={p.title} onChange={(e) => updateConsumerProposal(i, { title: e.target.value })} className="w-full px-2 py-1 text-sm font-medium text-carbon border border-carbon/[0.12] focus:outline-none" />
                      <textarea value={p.desc} onChange={(e) => updateConsumerProposal(i, { desc: e.target.value })} className="w-full px-2 py-1 text-xs text-carbon/70 border border-carbon/[0.12] focus:outline-none resize-none h-20" />
                      <button onClick={() => setEditingConsumerIdx(null)} className="text-[10px] tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon">{(t.common as Record<string, string>)?.done || "Done"}</button>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingConsumerIdx(i)} className="w-5 h-5 flex items-center justify-center text-carbon/30 hover:text-carbon/70"><Pencil className="h-2.5 w-2.5" /></button>
                        <button onClick={() => removeConsumerProposal(i)} className="w-5 h-5 flex items-center justify-center text-carbon/30 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                      </div>
                      <h5 className="text-sm font-medium text-carbon mb-1 pr-12">{p.title}</h5>
                      <p className="text-xs text-carbon/70 leading-relaxed">{p.desc}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            {addingConsumer && (
              <div className="mt-4 p-4 border border-dashed border-carbon/[0.15] space-y-2">
                <input type="text" value={newConsumer.title} onChange={(e) => setNewConsumer({ ...newConsumer, title: e.target.value })} placeholder={(t.creative as Record<string, string>)?.consumerSegmentPlaceholder || "Consumer segment name..."} className="w-full px-2 py-1.5 text-sm text-carbon border border-carbon/[0.12] focus:outline-none" />
                <textarea value={newConsumer.desc} onChange={(e) => setNewConsumer({ ...newConsumer, desc: e.target.value })} placeholder={(t.creative as Record<string, string>)?.profileDescPlaceholder || "Profile description..."} className="w-full px-2 py-1.5 text-[11px] text-carbon/60 border border-carbon/[0.12] focus:outline-none resize-none h-20" />
                <div className="flex gap-2">
                  <button onClick={addManualConsumer} disabled={!newConsumer.title.trim()} className="px-4 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 disabled:opacity-30">{(t.common as Record<string, string>)?.add || "Add"}</button>
                  <button onClick={() => setAddingConsumer(false)} className="px-4 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon">{(t.common as Record<string, string>)?.cancel || "Cancel"}</button>
                </div>
              </div>
            )}
            {!hasConsumer && !addingConsumer && (
              <div className="py-4 text-center text-xs text-carbon/30">{(t.creative as Record<string, string>)?.noConsumerProfiles || "No consumer profiles selected"}</div>
            )}
          </div>
        )}
      </div>

      {/* ── Trend Direction — editable ── */}
      {(hasTrends || hasAnything) && (
        <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/30">
              Trend Direction {hasTrends ? `· ${allTrends.length}` : ''}
            </div>
            <button
              onClick={() => { setAddingTrend(true); setNewCard({ title: '', brands: '', desc: '' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add trend
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTrends.map((tr, i) => (
              <div key={i} className="group relative p-4 border border-carbon/[0.06]">
                {editingTrendIdx === i ? (
                  <div className="space-y-2">
                    <input type="text" value={tr.title} onChange={(e) => updateTrend(i, { title: e.target.value })} className="w-full px-2 py-1 text-sm font-medium text-carbon border border-carbon/[0.12] focus:outline-none" />
                    <input type="text" value={tr.brands || ''} onChange={(e) => updateTrend(i, { brands: e.target.value })} placeholder={(t.creative as Record<string, string>)?.brandsPlaceholder || "Brands..."} className="w-full px-2 py-1 text-[10px] text-carbon/60 border border-carbon/[0.12] focus:outline-none" />
                    <textarea value={tr.desc} onChange={(e) => updateTrend(i, { desc: e.target.value })} className="w-full px-2 py-1 text-[11px] text-carbon/60 border border-carbon/[0.12] focus:outline-none resize-none h-16" />
                    <button onClick={() => setEditingTrendIdx(null)} className="text-[10px] tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon">{(t.common as Record<string, string>)?.done || "Done"}</button>
                  </div>
                ) : (
                  <>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingTrendIdx(i)} className="w-5 h-5 flex items-center justify-center text-carbon/30 hover:text-carbon/70"><Pencil className="h-2.5 w-2.5" /></button>
                      <button onClick={() => removeTrend(i)} className="w-5 h-5 flex items-center justify-center text-carbon/30 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                    </div>
                    <h5 className="text-sm font-medium text-carbon mb-1 pr-12">{tr.title}</h5>
                    {tr.brands && <div className="text-[10px] text-carbon/40 italic mb-2">{tr.brands}</div>}
                    <p className="text-[11px] text-carbon/60 leading-relaxed">{tr.desc}</p>
                  </>
                )}
              </div>
            ))}
          </div>
          {/* Add trend form */}
          {addingTrend && (
            <div className="mt-4 p-4 border border-dashed border-carbon/[0.15] space-y-2">
              <input type="text" value={newCard.title} onChange={(e) => setNewCard({ ...newCard, title: e.target.value })} placeholder={(t.creative as Record<string, string>)?.trendNamePlaceholder || "Trend name..."} className="w-full px-2 py-1.5 text-sm text-carbon border border-carbon/[0.12] focus:outline-none" />
              <input type="text" value={newCard.brands} onChange={(e) => setNewCard({ ...newCard, brands: e.target.value })} placeholder={(t.creative as Record<string, string>)?.referenceBrandsPlaceholder || "Reference brands..."} className="w-full px-2 py-1.5 text-[11px] text-carbon/60 border border-carbon/[0.12] focus:outline-none" />
              <textarea value={newCard.desc} onChange={(e) => setNewCard({ ...newCard, desc: e.target.value })} placeholder="Description..." className="w-full px-2 py-1.5 text-[11px] text-carbon/60 border border-carbon/[0.12] focus:outline-none resize-none h-16" />
              <div className="flex gap-2">
                <button onClick={addManualTrend} disabled={!newCard.title.trim()} className="px-4 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 disabled:opacity-30">{(t.common as Record<string, string>)?.add || "Add"}</button>
                <button onClick={() => setAddingTrend(false)} className="px-4 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon">{(t.common as Record<string, string>)?.cancel || "Cancel"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Competitive Landscape — editable ── */}
      {(hasCompetitors || hasAnything) && (
        <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/30">
              Competitive Landscape {hasCompetitors ? `· ${competitors.length}` : ''}
            </div>
            <button
              onClick={() => { setAddingCompetitor(true); setNewCard({ title: '', brands: '', desc: '' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add insight
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {competitors.map((c, i) => (
              <div key={i} className="group relative p-4 border border-carbon/[0.06]">
                {editingCompIdx === i ? (
                  <div className="space-y-2">
                    <input type="text" value={c.title} onChange={(e) => updateCompetitor(i, { title: e.target.value })} className="w-full px-2 py-1 text-sm font-medium text-carbon border border-carbon/[0.12] focus:outline-none" />
                    <input type="text" value={c.brands || ''} onChange={(e) => updateCompetitor(i, { brands: e.target.value })} placeholder={(t.creative as Record<string, string>)?.brandsPlaceholder || "Brands..."} className="w-full px-2 py-1 text-[10px] text-carbon/60 border border-carbon/[0.12] focus:outline-none" />
                    <textarea value={c.desc} onChange={(e) => updateCompetitor(i, { desc: e.target.value })} className="w-full px-2 py-1 text-[11px] text-carbon/60 border border-carbon/[0.12] focus:outline-none resize-none h-16" />
                    <button onClick={() => setEditingCompIdx(null)} className="text-[10px] tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon">{(t.common as Record<string, string>)?.done || "Done"}</button>
                  </div>
                ) : (
                  <>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingCompIdx(i)} className="w-5 h-5 flex items-center justify-center text-carbon/30 hover:text-carbon/70"><Pencil className="h-2.5 w-2.5" /></button>
                      <button onClick={() => removeCompetitor(i)} className="w-5 h-5 flex items-center justify-center text-carbon/30 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                    </div>
                    <h5 className="text-sm font-medium text-carbon mb-1 pr-12">{c.title}</h5>
                    {c.brands && <div className="text-[10px] text-carbon/40 italic mb-2">{c.brands}</div>}
                    <p className="text-[11px] text-carbon/60 leading-relaxed">{c.desc}</p>
                  </>
                )}
              </div>
            ))}
          </div>
          {/* Add competitor form */}
          {addingCompetitor && (
            <div className="mt-4 p-4 border border-dashed border-carbon/[0.15] space-y-2">
              <input type="text" value={newCard.title} onChange={(e) => setNewCard({ ...newCard, title: e.target.value })} placeholder="Brand: Key insight..." className="w-full px-2 py-1.5 text-sm text-carbon border border-carbon/[0.12] focus:outline-none" />
              <input type="text" value={newCard.brands} onChange={(e) => setNewCard({ ...newCard, brands: e.target.value })} placeholder="Related brands..." className="w-full px-2 py-1.5 text-[11px] text-carbon/60 border border-carbon/[0.12] focus:outline-none" />
              <textarea value={newCard.desc} onChange={(e) => setNewCard({ ...newCard, desc: e.target.value })} placeholder="Positioning, prices, gap, lesson..." className="w-full px-2 py-1.5 text-[11px] text-carbon/60 border border-carbon/[0.12] focus:outline-none resize-none h-16" />
              <div className="flex gap-2">
                <button onClick={addManualCompetitor} disabled={!newCard.title.trim()} className="px-4 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 disabled:opacity-30">{(t.common as Record<string, string>)?.add || "Add"}</button>
                <button onClick={() => setAddingCompetitor(false)} className="px-4 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon">{(t.common as Record<string, string>)?.cancel || "Cancel"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Celebration Overlay ═══ */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ animation: 'fadeIn 0.6s ease-out forwards' }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-carbon/95" style={{ animation: 'fadeIn 0.4s ease-out forwards' }} />

          {/* Content */}
          <div className="relative z-10 text-center px-6 max-w-2xl" style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
            {/* aimily logo mark */}
            <div className="w-16 h-16 mx-auto mb-8 border border-crema/20 flex items-center justify-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
              <Check className="h-7 w-7 text-crema/80" />
            </div>

            <div className="text-[10px] font-medium tracking-[0.4em] uppercase text-crema/30 mb-4" style={{ animation: 'fadeIn 0.6s ease-out 0.8s both' }}>
              {collectionContext.collectionName}
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-crema tracking-tight leading-[1.1] mb-6" style={{ animation: 'fadeIn 0.6s ease-out 1s both' }}>
              Your creative direction<br />is <span className="italic">validated</span>.
            </h2>

            <p className="text-sm sm:text-base font-light text-crema/60 leading-relaxed max-w-lg mx-auto mb-4" style={{ animation: 'fadeIn 0.6s ease-out 1.3s both' }}>
              Consumer, vibe, brand DNA, moodboard, trends — everything is captured.
              Your collection has a soul now. Time to give it structure.
            </p>

            <p className="text-xs text-crema/30 italic mb-10" style={{ animation: 'fadeIn 0.6s ease-out 1.5s both' }}>
              Every great collection starts with a clear point of view. You have yours.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'fadeIn 0.6s ease-out 1.8s both' }}>
              <button
                onClick={() => router.push(`/collection/${collectionId}/merchandising`)}
                className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-white transition-colors"
              >
                Start Merchandising <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push(`/collection/${collectionId}`)}
                className="flex items-center gap-2 px-6 py-3 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/50 border border-crema/15 hover:text-crema/80 hover:border-crema/30 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setShowCelebration(false)}
              className="mt-8 text-[10px] tracking-[0.1em] uppercase text-crema/20 hover:text-crema/40 transition-colors"
            >
              Stay here and keep editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════ */

export default function CreativeBrandPage({ blockParamOverride }: { blockParamOverride?: string | null }) {
  const t = useTranslation();
  const { id } = useParams();
  const collectionId = id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockParam = blockParamOverride ?? searchParams?.get('block');
  const [expandedBlock, setExpandedBlock] = useState<string | null>(blockParam || null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [collectionContext, setCollectionContext] = useState({ season: '', collectionName: '' });

  // Persist block data + active step to Supabase (auto-save with 1s debounce)
  const { data: persisted, save: persistData, loading: persistLoading } =
    useWorkspaceData<{ blockData: BlockData; activeStep: number }>(
      collectionId,
      'creative',
      { blockData: {}, activeStep: 0 }
    );

  const blockData = persisted.blockData;
  const activeStep = persisted.activeStep;

  const setBlockData = useCallback((updater: BlockData | ((prev: BlockData) => BlockData)) => {
    persistData((prev) => {
      const newBlockData = typeof updater === 'function' ? updater(prev.blockData) : updater;
      return { ...prev, blockData: newBlockData };
    });
  }, [persistData]);

  const setActiveStep = useCallback((step: number) => {
    persistData((prev) => ({ ...prev, activeStep: step }));
  }, [persistData]);

  // Sync expandedBlock with blockParam (URL → state). When blockParam is
  // set, we expand it and select the right step. When it goes null (e.g.
  // X-close clears the URL), we collapse to grid. Without the else-branch,
  // closing a sidebar block left expandedBlock stale → stuck-open view.
  useEffect(() => {
    if (blockParam) {
      setExpandedBlock(blockParam);
      const blockToStep: Record<string, number> = {
        'consumer': 0, 'vibe': 0, 'moodboard': 0, 'brand-dna': 0,
        'global-trends': 1, 'deep-dive': 1, 'live-signals': 1, 'competitors': 1, 'research': 1,
        'synthesis': 2,
      };
      const stepIdx = blockToStep[blockParam];
      if (stepIdx !== undefined && activeStep !== stepIdx) {
        setActiveStep(stepIdx);
      }
    } else {
      setExpandedBlock(null);
    }
  }, [blockParam]);

  // Fetch collection name + season for AI prompts
  useEffect(() => {
    const supabase = createClient();
    supabase.from('collection_plans').select('name, season').eq('id', collectionId).single().then(({ data }) => {
      if (data) setCollectionContext({ collectionName: data.name || '', season: data.season || '' });
    });
  }, [collectionId]);

  const step = STEPS[activeStep];

  // Translated names for steps and blocks
  const stepNameMap: Record<string, string> = {
    'vision': t.creative.creativeVision,
    'research': t.creative.marketResearch,
    'synthesis': t.creative.creativeSynthesis,
  };
  const blockNameMap: Record<string, string> = {
    'consumer': t.creative.consumerDefinition,
    'vibe': t.creative.collectionVibe,
    'moodboard': t.creative.moodboard,
    'brand-dna': t.creative.brandDNA,
    'global-trends': t.creative.globalTrends,
    'deep-dive': t.creative.deepDive,
    'live-signals': t.creative.liveSignals,
    'competitors': t.creative.competitors,
    'research': t.creative.marketResearch,
    'synthesis': t.creative.creativeOverview,
  };
  const blockDescMap: Record<string, string> = {
    'consumer': t.creative.consumerDesc,
    'vibe': t.creative.vibeDesc,
    'moodboard': t.creative.moodboardDesc,
    'brand-dna': t.creative.brandDNADesc,
    'research': t.creative.marketResearchDesc,
    'synthesis': t.creative.creativeOverviewDesc,
    'global-trends': t.creative.globalTrendsDesc,
    'deep-dive': t.creative.deepDiveDesc,
    'live-signals': t.creative.liveSignalsDesc,
    'competitors': t.creative.competitorsDesc,
  };
  const modeNameMap: Record<string, string> = {
    'free': t.creative.modeFree,
    'assisted': t.creative.modeAssisted,
    'ai': t.creative.modeAI,
  };
  const modeDescMap: Record<string, string> = {
    'free': t.creative.modeFreeDesc,
    'assisted': t.creative.modeAssistedDesc,
    'ai': t.creative.modeAIDesc,
  };

  // Accumulated context from confirmed blocks — flows into subsequent AI prompts
  const consumerProfile = (blockData.consumer?.data?.profile as string) || '';
  const vibeText = (blockData.vibe?.data?.vibe as string) || '';

  const getBlockState = useCallback((blockId: string) => {
    return blockData[blockId] || { mode: 'free' as InputMode, confirmed: false, data: {} };
  }, [blockData]);

  const updateBlockData = useCallback((blockId: string, updates: Partial<BlockData[string]>) => {
    setBlockData((prev) => {
      const current = prev[blockId] || { mode: 'free' as InputMode, confirmed: false, data: {} };
      return { ...prev, [blockId]: { ...current, ...updates } };
    });
  }, [setBlockData]);

  const handleExpand = useCallback((blockId: string) => {
    setIsAnimating(true);
    setExpandedBlock(blockId);
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  // When the user is in sidebar mode (blockParam set) and either confirms
  // or closes a block, we need to navigate the URL — not just toggle local
  // state. Otherwise blockParam in the URL drifts from expandedBlock and
  // the page renders an incoherent hybrid (header from blockParam, body
  // from expandedBlock=null grid). See onboarding lifecycle audit · Sesión 1
  // bug found by Felipe driving AZUR through the natural flow.
  const handleCollapse = useCallback(() => {
    setIsAnimating(true);
    if (blockParam) {
      // Sidebar mode: clear blockParam from URL so the route matches the view.
      router.push(`/collection/${collectionId}/creative`, { scroll: false });
      // expandedBlock will be cleared by the blockParam effect (line 2925).
    } else {
      setExpandedBlock(null);
    }
    setTimeout(() => setIsAnimating(false), 400);
  }, [blockParam, collectionId, router]);

  // Sidebar order for creative items, mirrors src/components/wizard/WizardSidebar.tsx
  // creative section. Used to advance to the next block after a confirm
  // when the user came from the sidebar (blockParam set). When the last
  // creative item (synthesis) is confirmed, the natural progression is
  // Block 2 Merchandising → first item is `scenarios` (Buying Strategy).
  const advanceToNextSidebarBlock = useCallback((currentBlockId: string) => {
    const NEXT: Record<string, string> = {
      moodboard: 'consumer',
      consumer: 'research',
      research: 'brand-dna',
      'brand-dna': 'synthesis',
    };
    setIsAnimating(true);
    if (currentBlockId === 'synthesis') {
      router.push(`/collection/${collectionId}/merchandising?block=scenarios`);
      return;
    }
    const nextBlockId = NEXT[currentBlockId];
    if (nextBlockId) {
      router.push(`/collection/${collectionId}/creative?block=${nextBlockId}`, { scroll: false });
    } else {
      // currentBlockId is not in the sidebar (e.g. 'vibe' which is reachable
      // only via direct grid expansion). Fall back to legacy collapse.
      setExpandedBlock(null);
    }
    setTimeout(() => setIsAnimating(false), 400);
  }, [collectionId, router]);

  const handleConfirm = useCallback((blockId: string) => {
    // For consumer block: if profile text exists but no proposals, convert it
    if (blockId === 'consumer') {
      const bd = blockData[blockId];
      const profile = bd?.data?.profile as string;
      const proposals = bd?.data?.proposals as Array<{ title: string; desc: string; status: string }> | undefined;
      const hasLikedOrPending = proposals?.some(p => p.status !== 'rejected');
      if (profile && !hasLikedOrPending) {
        // Extract a meaningful title from the first sentence
        const firstSentence = profile.split(/[.!?]/)[0]?.trim() || '';
        const title = firstSentence.length > 60
          ? t.creative.targetConsumer
          : firstSentence || t.creative.targetConsumer;
        updateBlockData(blockId, {
          confirmed: true,
          data: {
            ...bd?.data,
            proposals: [{ title, desc: profile, status: 'liked' }],
          },
        });
        if (blockParam) advanceToNextSidebarBlock(blockId);
        else handleCollapse();
        return;
      }
    }
    updateBlockData(blockId, { confirmed: true });
    if (blockParam) advanceToNextSidebarBlock(blockId);
    else handleCollapse();
  }, [updateBlockData, handleCollapse, advanceToNextSidebarBlock, blockData, collectionContext, t.creative.targetConsumer, blockParam]);

  // Hide mode pills for blocks with their own flow (moodboard, brand-dna, all research blocks)
  const researchBlocks = ['global-trends', 'deep-dive', 'live-signals', 'competitors'];
  const hideModePills = expandedBlock === 'moodboard' || expandedBlock === 'consumer' || expandedBlock === 'brand-dna' || researchBlocks.includes(expandedBlock || '');

  if (persistLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/30" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      <div className={`${blockParam ? 'px-6 md:px-16 lg:px-24 pt-12 md:pt-16' : 'px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12'}`}>
        {/* Header — centered when coming from sidebar, legacy when direct */}
        {blockParam ? (
          <div className="text-center mb-10">
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
              {blockNameMap[blockParam] || t.creative.consumerDefinition}
            </h1>
            {blockDescMap[blockParam] && (
              <p className="mt-3 text-[14px] md:text-[15px] text-carbon/45 max-w-[520px] mx-auto leading-relaxed">
                {blockDescMap[blockParam]}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-8 sm:mb-10 pl-12 md:pl-0">
              <button
                onClick={() => router.push(`/collection/${id}`)}
                className="text-[10px] sm:text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="h-3 w-3" /> {t.creative.overview}
              </button>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
                {t.creative.title.split(' & ')[0]} & <span className="italic">{t.creative.title.split(' & ')[1] || 'Brand'}</span>
              </h2>
              <p className="text-xs sm:text-sm text-carbon/60 mt-2 max-w-lg">
                {t.creative.subtitle}
              </p>
            </div>

            {/* Step Navigation — only when NOT coming from sidebar */}
            <div className="flex items-center gap-0 mb-8 sm:mb-10 border border-carbon/[0.06] w-fit overflow-x-auto max-w-full">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { if (!expandedBlock) setActiveStep(i); }}
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                    activeStep === i
                      ? 'bg-carbon text-crema'
                      : expandedBlock
                        ? 'bg-white text-carbon/15 cursor-not-allowed'
                        : 'bg-white text-carbon/40 hover:text-carbon/60'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center text-xs shrink-0 ${
                    activeStep === i ? 'bg-white/20' : 'bg-carbon/[0.06]'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="whitespace-nowrap">{stepNameMap[s.id] || s.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step Content */}
        {/* ─── SYNTHESIS VIEW (Creative Overview from sidebar) ─── */}
        {blockParam === 'synthesis' ? (
          <CreativeSynthesisView blockData={blockData} collectionContext={collectionContext} updateBlockData={updateBlockData} />
        ) : blockParam === 'research' ? (
          /* ─── MARKET RESEARCH UNIFIED (4 research sub-blocks as tabs) ─── */
          <MarketResearchUnified
            blockData={blockData}
            updateBlockData={updateBlockData}
            collectionContext={collectionContext}
            consumerProfile={consumerProfile}
          />
        ) : step.blocks.length > 0 ? (
          <div className="relative">
            {/* ─── CLEAN WORKSPACE VIEW (from sidebar) ─── */}
            {blockParam && expandedBlock && (() => {
              // Find block across ALL steps, not just the active one —
              // protects against race conditions where activeStep persists
              // from a previous navigation and hasn't caught up to blockParam yet.
              const allBlocks = STEPS.flatMap((s) => s.blocks.map((b) => ({ block: b, stepId: s.id })));
              const found = allBlocks.find(({ block }) => block.id === expandedBlock);
              if (!found) return null;
              const block = found.block;
              const resolvedStepId = found.stepId;
              const state = getBlockState(block.id);
              const hideModePillsClean = block.id === 'moodboard' || block.id === 'consumer';
              return (
                <div>
                  {/* Mode selector — centered below title */}
                  {!hideModePillsClean && (
                    <div className="mb-10 flex flex-col items-center gap-3">
                      <SegmentedPill
                        options={INPUT_MODES.map((m) => ({
                          id: m.id,
                          label: modeNameMap[m.id] || m.label,
                        }))}
                        value={state.mode}
                        onChange={(modeId) => updateBlockData(block.id, { mode: modeId })}
                        size="md"
                      />
                      <p className="text-[13px] text-carbon/35 tracking-[-0.01em]">
                        {modeDescMap[state.mode] || INPUT_MODES.find((m) => m.id === state.mode)?.description}
                      </p>
                    </div>
                  )}

                  {/* Top navigation row — Consumer in proposal phase only.
                      Sits ABOVE the cards so the user never has to scroll
                      to find Confirmar y Continuar on a tall monitor. The
                      ← Modificar brief lives at the left edge of card 01;
                      Confirmar at the right edge of card 04. */}
                  {(() => {
                    if (block.id !== 'consumer') return null;
                    const proposals = (state.data?.proposals as Array<{ status?: string }>) || [];
                    const hasVisible = proposals.some((p) => p.status !== 'rejected');
                    if (!hasVisible) return null;
                    return (
                      <div className="max-w-[1600px] mx-auto mb-8 flex items-center justify-between gap-4">
                        <button
                          onClick={() => updateBlockData(block.id, { data: { ...((state.data as Record<string, unknown>) || {}), proposals: [] } })}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold text-carbon/65 hover:text-carbon hover:bg-carbon/[0.04] transition-all border border-carbon/[0.10] hover:border-carbon/25"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          {(t.creative as Record<string, string>).modifyConsumerBrief || 'Modificar brief del consumidor'}
                        </button>
                        <button
                          onClick={() => handleConfirm(block.id)}
                          className={`inline-flex items-center gap-2 py-2.5 pl-7 pr-6 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                            state.confirmed
                              ? 'border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04]'
                              : 'bg-carbon text-white hover:bg-carbon/90'
                          }`}
                        >
                          {state.confirmed ? t.creative.confirmedAction : t.creative.confirmContinue}
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Content — full width for card grid */}
                  <ExpandedBlockContent
                    blockId={block.id}
                    stepId={resolvedStepId}
                    mode={state.mode}
                    data={state.data}
                    onChange={(newData) => updateBlockData(block.id, { data: newData })}
                    collectionContext={collectionContext}
                    consumerProfile={consumerProfile}
                    vibeText={vibeText}
                  />

                  {/* Default centered Confirm — only for blocks that haven't
                      migrated to the canonical top nav bar yet. Consumer
                      hides it because the top bar already has both controls. */}
                  {(() => {
                    if (block.id === 'consumer') return null;
                    return (
                      <div className="mt-16 flex justify-center pt-8 border-t border-carbon/[0.06]">
                        <button
                          onClick={() => handleConfirm(block.id)}
                          className={`inline-flex items-center gap-2 py-2.5 pl-7 pr-6 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                            state.confirmed
                              ? 'border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04]'
                              : 'bg-carbon text-white hover:bg-carbon/90'
                          }`}
                        >
                          {state.confirmed ? t.creative.confirmedAction : t.creative.confirmContinue}
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ─── LEGACY EXPANDED VIEW (direct access, no blockParam) ─── */}
            {!blockParam && expandedBlock && (
              <div className="flex gap-4">
                {/* Collapsed sidebar icons — hidden on mobile */}
                <div className="hidden sm:flex flex-col gap-3 pt-1 w-14 shrink-0">
                  {step.blocks.map((block) => {
                    if (block.id === expandedBlock) return null;
                    const Icon = block.icon;
                    const state = getBlockState(block.id);
                    return (
                      <button
                        key={block.id}
                        onClick={() => {
                          handleCollapse();
                          setTimeout(() => handleExpand(block.id), 350);
                        }}
                        className={`group/icon relative w-12 h-12 flex items-center justify-center border transition-all duration-300 ${
                          state.confirmed
                            ? 'bg-carbon/[0.04] border-carbon/[0.12]'
                            : 'bg-white border-carbon/[0.08] hover:border-carbon/20 hover:shadow-sm'
                        }`}
                        title={blockNameMap[block.id] || block.name}
                      >
                        {state.confirmed ? (
                          <Check className="h-4 w-4 text-carbon/60" />
                        ) : (
                          <Icon className="h-4.5 w-4.5 text-carbon/35 group-hover/icon:text-carbon/60 transition-colors" />
                        )}
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-carbon text-crema text-xs tracking-wide whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10">
                          {blockNameMap[block.id] || block.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded content */}
                <div
                  className="flex-1 bg-white border border-carbon/[0.06] overflow-hidden flex flex-col"
                  style={{
                    animation: 'expandIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    minHeight: 'calc(100vh - 260px)',
                  }}
                >
                  {(() => {
                    const block = step.blocks.find((b) => b.id === expandedBlock);
                    if (!block) return null;
                    const Icon = block.icon;
                    const state = getBlockState(block.id);
                    return (
                      <div className="p-4 sm:p-10 lg:p-12 flex flex-col h-full min-h-[inherit]">
                        <div className="flex items-start justify-between mb-6 sm:mb-8">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-carbon/[0.04] flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-carbon/50" />
                            </div>
                            <div>
                              <h3 className="text-lg sm:text-xl font-light text-carbon tracking-tight">
                                {blockNameMap[block.id] || block.name}
                              </h3>
                              <p className="text-[11px] sm:text-xs text-carbon/70 mt-0.5">{blockDescMap[block.id] || block.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={handleCollapse}
                            className="w-9 h-9 flex items-center justify-center text-carbon/30 hover:text-carbon/60 hover:bg-carbon/[0.04] transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {!hideModePills && (
                          <div className="mb-6 sm:mb-8">
                            <SegmentedPill
                              options={INPUT_MODES.map((m) => ({
                                id: m.id,
                                label: modeNameMap[m.id] || m.label,
                              }))}
                              value={state.mode}
                              onChange={(modeId) => updateBlockData(block.id, { mode: modeId })}
                              description={modeDescMap[state.mode] || INPUT_MODES.find((m) => m.id === state.mode)?.description}
                              size="md"
                            />
                          </div>
                        )}

                        <div className="flex-1">
                          <ExpandedBlockContent
                            blockId={block.id}
                            stepId={step.id}
                            mode={state.mode}
                            data={state.data}
                            onChange={(newData) => updateBlockData(block.id, { data: newData })}
                            collectionContext={collectionContext}
                            consumerProfile={consumerProfile}
                            vibeText={vibeText}
                          />
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-4 sm:pt-6 border-t border-carbon/[0.06] gap-3">
                          <button
                            onClick={handleCollapse}
                            className="text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/50 hover:text-carbon transition-colors shrink-0"
                          >
                            {`← ${t.creative.backToGrid}`}
                          </button>
                          <button
                            onClick={() => handleConfirm(block.id)}
                            className="flex items-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-medium tracking-[0.1em] sm:tracking-[0.15em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t.creative.confirmContinue}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ─── GRID VIEW (2x2) ─── */}
            {!expandedBlock && (
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
                style={isAnimating ? { animation: 'gridIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' } : undefined}
              >
                {step.blocks.map((block) => {
                  const Icon = block.icon;
                  const state = getBlockState(block.id);
                  return (
                    <div
                      key={block.id}
                      onClick={() => handleExpand(block.id)}
                      className={`group relative bg-white p-5 sm:p-10 lg:p-12 hover:shadow-lg transition-all duration-300 overflow-hidden border flex flex-col min-h-[200px] sm:min-h-[320px] cursor-pointer ${
                        state.confirmed
                          ? 'border-carbon/[0.12] bg-carbon/[0.01]'
                          : 'border-carbon/[0.06]'
                      }`}
                    >
                      {/* Confirmed badge */}
                      {state.confirmed && (
                        <div className="absolute top-5 right-5 w-7 h-7 bg-carbon flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-crema" />
                        </div>
                      )}

                      {/* Icon + Title */}
                      <div className="flex items-start justify-between mb-4 sm:mb-6">
                        <div>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-carbon/[0.04] flex items-center justify-center mb-3 sm:mb-4">
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-carbon/50" />
                          </div>
                          <h3 className="text-lg sm:text-xl font-light text-carbon tracking-tight">
                            {blockNameMap[block.id] || block.name}
                          </h3>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-carbon/70 leading-relaxed flex-1">
                        {blockDescMap[block.id] || block.description}
                      </p>

                      {/* Input Mode Pills (preview) — only for vision blocks that use modes */}
                      {!['moodboard', 'brand-dna', 'global-trends', 'deep-dive', 'live-signals', 'competitors'].includes(block.id) && (
                        <div className="mt-4 sm:mt-6">
                          <SegmentedPill
                            preview
                            options={INPUT_MODES.map((m) => ({ id: m.id, label: modeNameMap[m.id] || m.label }))}
                            value={state.mode}
                            onChange={() => {}}
                          />
                        </div>
                      )}

                      {/* CTA */}
                      {(() => {
                        const hasData = Object.keys(state.data || {}).length > 0;
                        const label = state.confirmed ? t.common.edit : hasData ? t.common.continue : t.creative.start;
                        return (
                          <div className={`mt-4 sm:mt-6 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
                            state.confirmed
                              ? 'bg-carbon/[0.06] text-carbon/40 group-hover:bg-carbon/[0.1]'
                              : 'bg-carbon text-crema group-hover:bg-carbon/90'
                          }`}>
                            {label} <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Synthesis Step — Visual Creative Brief */
          <CreativeSynthesisView blockData={blockData} collectionContext={collectionContext} updateBlockData={updateBlockData} />
        )}

        {/* Step Navigation Footer */}
        {!expandedBlock && (
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase transition-all border ${
                activeStep === 0
                  ? 'border-carbon/[0.06] text-carbon/20 cursor-not-allowed'
                  : 'border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {t.creative.previous}
            </button>
            <button
              onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}
              disabled={activeStep === STEPS.length - 1}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase transition-all border ${
                activeStep === STEPS.length - 1
                  ? 'border-carbon/[0.06] text-carbon/20 cursor-not-allowed'
                  : 'border-carbon text-carbon hover:bg-carbon hover:text-crema'
              }`}
            >
              {t.creative.next} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes expandIn {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(-8px);
            max-height: 400px;
          }
          40% {
            opacity: 1;
            transform: scale(1) translateY(0);
            max-height: 400px;
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            max-height: 2000px;
          }
        }
        @keyframes gridIn {
          0% {
            opacity: 0;
            transform: scale(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
