'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Wand2, Loader2, Plus, Trash2,
  Check, X, RefreshCw,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SKU } from '@/hooks/useSkus';
import type { SkuColorway, ColorwayZone, MaterialZone } from '@/types/design';
import { useSkuLifecycle } from './SkuLifecycleContext';
import { ImageUploadArea } from './shared';
import { SegmentedPill } from '@/components/ui/segmented-pill';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { getDefaultZones } from '@/lib/product-zones';
import { MaterialCombobox } from '@/components/materials/MaterialCombobox';
import { PantonePicker } from '@/components/materials/PantonePicker';
import type { Zone } from '@/lib/materials-library';
import type { FooterAction } from '../SkuDetailView';

type InputMode = 'free' | 'ai';

const STEPS = [
  { id: 'sketch', label: 'Drawing' },
  { id: 'colorways', label: 'Colorways' },
  { id: 'materials', label: 'Materials' },
];

/* Industry-standard share of COGS that the materials line typically takes.
   Used to compute the materials budget that constrains the AI proposal. */
const MATERIALS_RATIO_BY_CATEGORY: Record<string, number> = {
  CALZADO: 0.50,
  ROPA: 0.55,
  ACCESORIOS: 0.45,
};

/* Shape returned by `design-generate` materials-suggest after the cost-aware
   refactor. The frontend treats every cost field as optional so the UI
   degrades gracefully if the model omits them. */
interface AiMaterialSuggestion {
  name: string;
  zone?: string;
  type?: string;
  description?: string;
  sustainability?: string;
  consumption?: string;
  cost_per_unit?: string;
  cost_total?: number | string;
  cost_currency?: string;
  priceImpact?: string;
}

function buildMaterialsBudget(sku: { cost?: number | string | null; category?: string | null }) {
  const cost = Number(sku.cost) || 0;
  const ratio = MATERIALS_RATIO_BY_CATEGORY[sku.category || ''] ?? 0.50;
  const budget = cost > 0 ? +(cost * ratio).toFixed(2) : 0;
  return { cost, ratio, budget, budgetLabel: budget > 0 ? `€${budget.toFixed(2)}` : '' };
}

/* Match an AI suggestion to a material zone. Tries exact zone-name match
   first (the new prompt asks the model to set `zone` explicitly), then
   falls back to type-string overlap (legacy behavior). */
function matchSuggestionToZone(
  zoneName: string,
  suggestions: AiMaterialSuggestion[],
  alreadyConsumed: Set<string>,
): AiMaterialSuggestion | null {
  const lower = zoneName.toLowerCase();
  const exact = suggestions.find(s => s.zone && s.zone.toLowerCase() === lower && !alreadyConsumed.has(s.name));
  if (exact) return exact;
  const partial = suggestions.find(s => {
    if (alreadyConsumed.has(s.name)) return false;
    const sZone = (s.zone || '').toLowerCase();
    const sType = (s.type || '').toLowerCase();
    return (sZone && (sZone.includes(lower) || lower.includes(sZone))) ||
      (sType && (sType.includes(lower) || lower.includes(sType)));
  });
  return partial || null;
}

interface SketchPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'sketch_url' | 'sketch_top_url' | 'sketch_back_url' | 'reference_image_url') => void;
  uploading: string | null;
  onFooterAction?: (action: FooterAction | null) => void;
  onAdvancePhase?: () => void;
  /** When set by EvolutionStrip, forces the active sub-step (0=sketch, 1=colorways, 2=materials, 3=techpack) */
  evolutionStep?: 'sketch' | 'colorways' | 'render3d';
}

/* Render a single flat-sketch panel (side / top / back / front). Same shape
 * for footwear views and apparel views — keeps the layout DRY now that every
 * category renders multiple panels. object-contain everywhere: per Felipe's
 * 2026-05-13 rule, the frontend never crops a sketch. */
function SketchPanel({
  label,
  imageUrl,
  uploadField,
  placeholder,
  emptyPlaceholder,
  mode,
  uploading,
  onImageUpload,
  onRemove,
}: {
  label: string;
  imageUrl: string | null | undefined;
  uploadField: 'sketch_url' | 'sketch_top_url' | 'sketch_back_url';
  placeholder: string;
  emptyPlaceholder: string;
  mode: InputMode;
  uploading: string | null;
  onImageUpload: SketchPhaseProps['onImageUpload'];
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{label}</p>
      {imageUrl ? (
        <div className="border border-carbon/[0.06] bg-white relative group aspect-[4/5] max-h-[50vh] flex items-center justify-center">
          <img src={imageUrl} alt={label} className="max-w-[92%] max-h-[92%] object-contain" />
          {mode === 'free' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors cursor-pointer">
                Replace
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f, uploadField); }} />
              </label>
            </div>
          )}
        </div>
      ) : mode === 'free' ? (
        <ImageUploadArea imageUrl={undefined} uploading={uploading === uploadField}
          placeholder={placeholder}
          onUpload={(file) => onImageUpload(file, uploadField)}
          onRemove={onRemove || (() => {})} aspectClass="aspect-[4/5] max-h-[50vh]" />
      ) : (
        <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/5] max-h-[50vh] flex items-center justify-center">
          <p className="text-[10px] text-carbon/15">{emptyPlaceholder}</p>
        </div>
      )}
    </div>
  );
}

export function SketchPhase({ sku, onUpdate, onImageUpload, uploading, onFooterAction, onAdvancePhase, evolutionStep }: SketchPhaseProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { colorways, addColorway, updateColorway, deleteColorway, designData, collectionPlanId } = useSkuLifecycle();

  /* ── Confirm dialog state ── */
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel: string;
    cancelLabel: string;
    variant: 'danger' | 'warning' | 'neutral';
    onConfirm: () => void;
  } | null>(null);

  const skuColorways = colorways.filter(c => c.sku_id === sku.id);
  // The "Materials" sub-step is considered filled when at least one zone has a
  // material assigned. This used to read from designData.patterns[sku.id],
  // which conflated the patterns workspace (reserved for Phase 6 Pattern
  // Library) with materials state. Source of truth is sku.material_zones.
  const filledMaterialZones = (sku.material_zones || []).filter(z => z?.material);

  const evolutionStepMap: Record<string, number> = { sketch: 0, colorways: 1, render3d: 3 };
  const [activeStep, setActiveStep] = useState(() => evolutionStep ? (evolutionStepMap[evolutionStep] ?? 0) : 0);

  // Sync with EvolutionStrip when it changes
  useEffect(() => {
    if (evolutionStep && evolutionStepMap[evolutionStep] !== undefined) {
      setActiveStep(evolutionStepMap[evolutionStep]);
    }
  }, [evolutionStep]);
  // Canonical pattern: aimily proposes first, user can switch to manual.
  // Sketch defaults to 'ai' so the wow-effect is the first thing the user
  // sees — same intent as Materials auto-propose. Other sub-steps either
  // own their picker (colorways) or are auto-generated (techpack); their
  // defaults are kept on 'free' as a no-op.
  const [modes, setModes] = useState<Record<string, InputMode>>({ sketch: 'ai', colorways: 'free', materials: 'free', techpack: 'free' });
  const [notes, setNotes] = useState(sku.notes || '');

  // AI state
  const [generating, setGenerating] = useState(false);
  const [sketchTopView, setSketchTopView] = useState<string | null>(sku.sketch_top_url || null);
  const firstCwId = colorways.filter(c => c.sku_id === sku.id)[0]?.id || null;
  const [expandedCw, setExpandedCw] = useState<string | null>(firstCwId);

  // ── Color step v2: zone-aware proposals ──
  // Each proposal carries an explicit zoneAssignments map (zoneName → hex) that
  // the AI returned. The frontend distributes them 1:1 (no % 3 modulus).
  type ZoneAssignment = { zoneName: string; hex: string; rationale?: string };
  type AiColorway = {
    name: string;
    description: string;
    primary: string;
    commercialRole: string;
    zoneAssignments: ZoneAssignment[];
    colorizedUrl?: string | null;
    colorizing?: boolean;
    lastError?: string;
  };
  type DetectedZone = {
    id: string;
    name: string;
    defaultHex: string;
    semanticRole: 'identity' | 'structural' | 'accent' | 'neutral' | 'hardware';
    description: string;
  };
  const [aiColorways, setAiColorways] = useState<AiColorway[] | null>(null);
  const [detectedZones, setDetectedZones] = useState<DetectedZone[] | null>(null);
  const [detectingZones, setDetectingZones] = useState(false);
  // When colorize calls fail (OpenAI 5xx, network, etc.), the per-card placeholder
  // is not always enough. Track the most recent error globally so we can show a
  // persistent banner above the grid until the user retries successfully.
  const [colorizeError, setColorizeError] = useState<string | null>(null);
  // Dedupe simultaneous toast spam when 4 parallel colorize calls all fail.
  const lastToastAtRef = React.useRef<number>(0);


  // Zone Editor (no state needed — renders immediately when sketch exists)

  // Render state removed — colorized sketch from colorway proposals is used as render_url

  const [confirmedSteps, setConfirmedSteps] = useState<Set<number>>(() => {
    const s = new Set<number>();
    if (sku.sketch_url) s.add(0);
    if (skuColorways.length > 0) s.add(1);
    if (filledMaterialZones.length > 0) s.add(2);
    return s;
  });

  const confirmAndNext = useCallback(() => {
    setConfirmedSteps(prev => { const n = new Set(prev); n.add(activeStep); return n; });
    if (activeStep < STEPS.length - 1) setActiveStep(activeStep + 1);
  }, [activeStep]);

  const doClearStep = useCallback(async (stepIdx: number) => {
    setConfirmedSteps(prev => { const n = new Set(prev); n.delete(stepIdx); return n; });
    if (stepIdx === 0) {
      await onUpdate({ sketch_url: undefined });
    } else if (stepIdx === 1) {
      for (const cw of skuColorways) await deleteColorway(cw.id);
    } else if (stepIdx === 2) {
      await onUpdate({ material_zones: [] } as Partial<SKU>);
    }
    setActiveStep(stepIdx);
    toast(stepLabel('stepCleared') || 'Step cleared', 'info');
  }, [skuColorways, deleteColorway, onUpdate, toast]);

  const clearStep = useCallback((stepIdx: number) => {
    const stepNames = [
      stepLabel('drawing') || 'Sketch',
      stepLabel('colorways') || 'Colorways',
      stepLabel('materials') || 'Materials',
    ];
    setConfirmDialog({
      open: true,
      title: (stepLabel('clearStepTitle') || 'Clear {step}?').replace('{step}', stepNames[stepIdx] || ''),
      description: stepLabel('clearStepDesc') || 'This will delete all data for this step. You can redo it afterwards.',
      confirmLabel: stepLabel('clearConfirm') || 'Clear',
      cancelLabel: stepLabel('cancel') || 'Cancel',
      variant: 'danger',
      onConfirm: () => { setConfirmDialog(null); doClearStep(stepIdx); },
    });
  }, [doClearStep]);

  const mode = modes[STEPS[activeStep]?.id] || 'free';
  const stepLabel = (key: string): string => (t.skuPhases as Record<string, string>)?.[key] || key;

  // Sync footer CTA with parent
  // When evolutionStep === 'colorways': sub-step navigation (Continue through Colorways→Materials→TechPack)
  // On tech pack (last sub-step): return null so SkuDetailView shows "Validate & Continue" to advance to 3D Render
  // When evolutionStep === 'sketch' or 'render3d': parent handles footer entirely
  useEffect(() => {
    if (!onFooterAction) return;

    // For colorways evolution step: control sub-step navigation
    if (evolutionStep === 'colorways') {
      // activeStep 1=Colorways, 2=Materials → show "Continue" to next sub-step
      // activeStep 3=TechPack → return null so parent shows "Validate & Continue"
      if (activeStep < STEPS.length - 1) {
        const nextStep = STEPS[activeStep + 1];
        onFooterAction({
          label: `${stepLabel('continue') || 'Continue'}: ${nextStep.label}`,
          action: confirmAndNext,
          isPhaseAdvance: false,
        });
      } else {
        // On Tech Pack — let parent handle "Validate & Continue"
        onFooterAction(null);
      }
      return () => onFooterAction(null);
    }

    // For sketch/render3d evolution steps: parent handles footer entirely
    if (evolutionStep) return;

    // Legacy mode (no evolution step): original behavior
    if (activeStep < STEPS.length - 1) {
      const nextStepLabel = STEPS[activeStep + 1].label;
      onFooterAction({
        label: `${stepLabel('next') || 'Next'}: ${nextStepLabel}`,
        action: confirmAndNext,
        isPhaseAdvance: false,
      });
    } else {
      onFooterAction({
        label: t.skuPhases?.advanceToProto || 'Send to Prototyping',
        action: () => onAdvancePhase?.(),
        isPhaseAdvance: true,
      });
    }

    return () => onFooterAction(null);
  }, [activeStep, onFooterAction, confirmAndNext, onAdvancePhase, t.skuPhases, evolutionStep]);

  const callDesignAI = useCallback(async (type: string, input: Record<string, string>) => {
    const res = await fetch('/api/ai/design-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, input, language, collectionPlanId }),
    });
    return res.ok ? (await res.json()).result : null;
  }, [language, collectionPlanId]);

  // ── Background zone detection ──
  // Fires as soon as we have a sketch + product info, regardless of which
  // sub-step the user is on. This way the zones are usually already detected
  // by the time the user clicks into Colorways — no waiting.
  // Guarded by a ref to avoid re-firing on every state change (the previous
  // useEffect was caught in a loop because setDetectingZones(true) was in
  // the deps array, cancelling the in-flight call before it returned).
  const zoneDetectInflightFor = React.useRef<string | null>(null);
  useEffect(() => {
    if (!sku.sketch_url) return;
    if (!sku.name && !sku.family) return;
    if (detectedZones && detectedZones.length > 0) return;
    if (zoneDetectInflightFor.current === sku.id) return;
    zoneDetectInflightFor.current = sku.id;
    let cancelled = false;
    setDetectingZones(true);
    (async () => {
      try {
        const res = await fetch('/api/ai/zones/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: sku.name,
            family: sku.family,
            category: sku.category,
          }),
        });
        if (!res.ok) throw new Error('zones detect failed');
        const json = await res.json();
        if (!cancelled && Array.isArray(json.zones) && json.zones.length > 0) {
          setDetectedZones(json.zones);
        } else if (!cancelled) {
          throw new Error('empty zones response');
        }
      } catch {
        if (!cancelled) {
          const fallback = getDefaultZones(sku.category).map((z, i) => ({
            id: `zone-${i}`,
            name: z.zone,
            defaultHex: z.defaultHex,
            semanticRole: (i === 0 ? 'identity' : i < 3 ? 'structural' : 'accent') as DetectedZone['semanticRole'],
            description: z.description,
          }));
          setDetectedZones(fallback);
        }
      } finally {
        // Always clear the spinner — even when the effect was cancelled by
        // StrictMode's double-invocation, the user still needs the UI unstuck.
        setDetectingZones(false);
        zoneDetectInflightFor.current = null;
      }
    })();
    return () => {
      cancelled = true;
      // Clear the inflight lock on cleanup so StrictMode's second invocation
      // can re-fire the fetch (the first invocation's fetch will be cancelled
      // by the `cancelled` flag above and won't write stale state).
      zoneDetectInflightFor.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku.id, sku.sketch_url, sku.name, sku.family, sku.category]);

  // ── Auto-propose materials when entering the Materials sub-step ──
  // Canonical pattern: aimily proposes on open, user edits inline. Triggered
  // exactly once per SKU when zones are still empty. The user can always click
  // "Regenerar materiales" to refresh.
  const materialsAutoFiredFor = React.useRef<string | null>(null);
  useEffect(() => {
    if (activeStep !== 2) return;
    if (!sku.id || !collectionPlanId) return;
    if (materialsAutoFiredFor.current === sku.id) return;
    const matZones = sku.material_zones || [];
    const hasAnyMaterial = matZones.some(z => z?.material);
    if (hasAnyMaterial) return;
    materialsAutoFiredFor.current = sku.id;
    let cancelled = false;
    (async () => {
      try {
        const skuColorwaysLocal = colorways.filter(c => c.sku_id === sku.id);
        const colorwayContext = skuColorwaysLocal.map(c => {
          const zones = c.zones && c.zones.length > 0 ? c.zones : [];
          return `${c.name}: ${zones.map(z => `${z.zone}=${z.hex}`).join(', ')}`;
        }).join(' | ');
        // Build zone list from detected zones if matZones is empty.
        const seedZones = matZones.length > 0
          ? matZones
          : getDefaultZones(sku.category).map(z => ({ zone: z.zone, material: '' } as MaterialZone));
        const zoneContext = seedZones.map(m => m.zone).join(', ');
        const { budget, budgetLabel } = buildMaterialsBudget(sku);
        const res = await fetch('/api/ai/design-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'materials-suggest',
            input: {
              productCategory: sku.category,
              productType: sku.category || sku.type || '',
              subcategory: sku.name || '',
              family: sku.family,
              concept: sku.notes || '',
              priceRange: `€${sku.pvp}`,
              targetCogs: sku.cost != null ? `€${sku.cost}` : '',
              targetPvp: sku.pvp != null ? `€${sku.pvp}` : '',
              targetMargin: sku.margin != null ? `${Math.round(sku.margin)}%` : '',
              materialsBudget: budgetLabel,
              designDirection: `${sku.name} — ${sku.family}. ${sku.notes || ''}`,
              colorways: colorwayContext,
              zones: zoneContext,
            },
            collectionPlanId,
            language,
          }),
        });
        if (!res.ok) return;
        const { result } = await res.json();
        const suggestions: AiMaterialSuggestion[] = result?.materials || [];
        if (!suggestions.length) return;
        const consumed = new Set<string>();
        const filled = seedZones.map(mz => {
          const suggestion = matchSuggestionToZone(mz.zone, suggestions, consumed);
          if (!suggestion) return mz;
          consumed.add(suggestion.name);
          const costNum = typeof suggestion.cost_total === 'number'
            ? suggestion.cost_total
            : Number(String(suggestion.cost_total || '').replace(/[^0-9.\-]/g, '')) || undefined;
          return {
            ...mz,
            material: suggestion.name,
            composition: suggestion.description || mz.composition || '',
            finish: suggestion.sustainability || mz.finish || '',
            consumption: suggestion.consumption || mz.consumption,
            cost_per_unit: suggestion.cost_per_unit || mz.cost_per_unit,
            cost_total: costNum != null ? costNum : mz.cost_total,
            cost_currency: suggestion.cost_currency || mz.cost_currency || 'EUR',
          };
        });
        if (!cancelled) {
          await onUpdate({ material_zones: filled } as Partial<SKU>);
          // Telemetry: log overshoot so we can see it in the console while
          // we tune the prompt. Doesn't alert the user — the cost-aware
          // prompt already keeps things in budget.
          const totalCost = filled.reduce((acc, z) => acc + (z.cost_total || 0), 0);
          if (budget > 0 && totalCost > budget * 1.05) {
            console.warn(`[Materials] overshoot: ${totalCost.toFixed(2)} > budget ${budget} (+${(((totalCost - budget) / budget) * 100).toFixed(1)}%)`);
          }
        }
      } catch (err) {
        console.error('[Materials auto-propose]', err);
      }
    })();
    return () => {
      cancelled = true;
      // Clear the inflight ref so StrictMode's second invocation can re-fire.
      // The first invocation's response is gated by `cancelled` and won't
      // write stale state.
      materialsAutoFiredFor.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, sku.id, collectionPlanId]);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Sub-stepper: visible pills ── */}
      {/* Hidden for sketch (Drawing is own EvolutionStrip step) and render3d (only shows Product Visualization) */}
      {/* For colorways: show Colorways + Materials + Tech Pack (skip Drawing) */}
      {evolutionStep !== 'sketch' && evolutionStep !== 'render3d' && (
        <div className="flex items-center gap-0">
          {STEPS.filter(s => evolutionStep === 'colorways' ? s.id !== 'sketch' : true).map((step) => {
            const idx = STEPS.findIndex(s => s.id === step.id);
            const isActive = idx === activeStep;
            const isConfirmed = confirmedSteps.has(idx);
            const isPast = idx < activeStep;
            const displayIdx = evolutionStep === 'colorways' ? idx : idx + 1; // colorways: skip Drawing so idx 1=Colorways, 2=Materials, 3=TechPack
            return (
              <React.Fragment key={step.id}>
                {displayIdx > 1 && (
                  <div className={`flex-1 h-px ${isConfirmed || isPast ? 'bg-carbon/20' : 'bg-carbon/[0.06]'}`} />
                )}
                <button
                  onClick={() => setActiveStep(idx)}
                  className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                    isActive
                      ? 'text-carbon'
                      : isConfirmed
                        ? 'text-carbon/50 hover:text-carbon/70'
                        : 'text-carbon/20 hover:text-carbon/30'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center text-[9px] font-semibold rounded-full shrink-0 ${
                    isActive
                      ? 'bg-carbon text-crema'
                      : isConfirmed
                        ? 'bg-carbon/15 text-carbon/60'
                        : 'bg-carbon/[0.05] text-carbon/25'
                  }`}>
                    {isConfirmed && !isActive ? <Check className="h-2.5 w-2.5" /> : displayIdx}
                  </span>
                  {isConfirmed && isActive && idx < 3 && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); clearStep(idx); }}
                      className="ml-0.5 text-carbon/15 hover:text-[#A0463C]/50 transition-colors"
                      title={stepLabel('clearStep') || 'Clear this step'}
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                  <span className={`text-[10px] tracking-[0.06em] uppercase whitespace-nowrap ${
                    isActive ? 'font-semibold' : 'font-medium'
                  }`}>{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── Mode selector ── only on Sketch (Drawing) sub-step; Colorways has
           its own picker, Materials is canonical (auto-propose + edit inline),
           Tech Pack is auto-generated. */}
      {activeStep === 0 && (
        <SegmentedPill
          options={[
            { id: 'free' as InputMode, label: stepLabel('modeFree') || 'Manual' },
            { id: 'ai' as InputMode, label: stepLabel('aiProposal') || 'AI' },
          ]}
          value={mode}
          onChange={(m) => setModes(prev => ({ ...prev, [STEPS[activeStep].id]: m }))}
        />
      )}

      {/* ── Step Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ═══ STEP 1: SKETCH ═══ */}
        {activeStep === 0 && (
          <div className="space-y-4">
            {/* Reference image — compact, always on top */}
            <div className="flex items-center gap-3 p-2.5 bg-white border border-carbon/[0.04]">
              {sku.reference_image_url ? (
                <div className="w-12 h-12 border border-carbon/[0.06] overflow-hidden shrink-0 bg-white">
                  <img src={sku.reference_image_url} alt="" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="shrink-0">
                  <ImageUploadArea imageUrl={undefined} uploading={uploading === 'reference_image_url'}
                    placeholder={stepLabel('uploadReference') || 'Ref'}
                    onUpload={(file) => onImageUpload(file, 'reference_image_url')}
                    onRemove={() => {}} aspectClass="w-12 h-12" />
                </div>
              )}
              <p className="text-[10px] text-carbon/35">{stepLabel('referenceImage') || 'Reference image'}</p>
            </div>

            {/* AI generate button — only in AI mode, only if sketch doesn't exist yet */}
            {mode === 'ai' && (
              <button onClick={async () => {
                  if (!sku.reference_image_url) {
                    toast(stepLabel('needReference') || 'Upload a reference photo first', 'warning');
                    return;
                  }
                  setGenerating(true);
                  try {
                    let base64: string;
                    if (sku.reference_image_url.startsWith('data:')) {
                      base64 = sku.reference_image_url.split(',')[1];
                    } else {
                      const imgRes = await fetch(sku.reference_image_url);
                      const buf = await imgRes.arrayBuffer();
                      const bytes = new Uint8Array(buf);
                      let binary = '';
                      for (let b = 0; b < bytes.length; b++) binary += String.fromCharCode(bytes[b]);
                      base64 = btoa(binary);
                    }
                    const res = await fetch('/api/ai/generate-sketch-options', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ images: [{ base64, mimeType: 'image/png', instructions: '' }], garmentType: sku.category, season: '', styleName: sku.name, fabric: '', additionalNotes: sku.notes || '', collectionPlanId }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const views = data.sketchOptions || [];
                      // Footwear: side / top / back. Apparel: front / back.
                      // sketch_url holds the primary view (side for footwear,
                      // front for apparel); sketch_top_url is footwear-only;
                      // sketch_back_url is universal.
                      const primaryView =
                        views.find((v: { id: string }) => v.id === 'side')?.frontImageBase64 ||
                        views.find((v: { id: string }) => v.id === 'front')?.frontImageBase64 ||
                        views[0]?.frontImageBase64;
                      const topView = views.find((v: { id: string }) => v.id === 'top')?.frontImageBase64;
                      const backView = views.find((v: { id: string }) => v.id === 'back')?.frontImageBase64;
                      if (primaryView) {
                        await onUpdate({
                          sketch_url: primaryView,
                          ...(topView ? { sketch_top_url: topView } : {}),
                          ...(backView ? { sketch_back_url: backView } : {}),
                        } as Partial<SKU>);
                        if (topView) setSketchTopView(topView);
                        toast(stepLabel('sketchGenerated') || 'Sketch generated from reference', 'success');
                      }
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast(`Sketch failed: ${err.error || 'Unknown error'}`, 'error');
                    }
                  } catch (e) {
                    console.error('[Sketch] Error:', e);
                    toast(stepLabel('sketchFailed') || 'Sketch generation failed', 'error');
                  } finally { setGenerating(false); }
                }} disabled={generating || !sku.reference_image_url}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/50 hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30 w-full">
                  {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" strokeWidth={2.25} />}
                  {generating ? (stepLabel('generatingSketch') || 'Generating sketch...') : (stepLabel('generateFlat') || 'Generate Flat Sketch from Reference')}
              </button>
            )}

            {generating && mode === 'ai' && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-carbon/20" />
                <p className="text-[11px] text-carbon/25">{stepLabel('generatingSketch') || 'Generating flat sketch...'}</p>
              </div>
            )}

            {/* Sketch views — SAME layout for both modes.
                FOOTWEAR: side + top + back (3 panels).
                APPAREL:  front + back (2 panels). */}
            {sku.category === 'CALZADO' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SketchPanel
                  label={stepLabel('sideProfile') || 'Side Profile'}
                  imageUrl={sku.sketch_url}
                  uploadField="sketch_url"
                  placeholder={stepLabel('uploadSideSketch') || 'Upload side profile sketch'}
                  emptyPlaceholder={stepLabel('sideProfilePlaceholder') || 'Side profile'}
                  mode={mode}
                  uploading={uploading}
                  onImageUpload={onImageUpload}
                />
                <SketchPanel
                  label={stepLabel('topDown') || 'Top Down'}
                  imageUrl={sku.sketch_top_url || sketchTopView}
                  uploadField="sketch_top_url"
                  placeholder={stepLabel('uploadTopSketch') || 'Upload top-down sketch'}
                  emptyPlaceholder={stepLabel('topDownPlaceholder') || 'Top-down view'}
                  mode={mode}
                  uploading={uploading}
                  onImageUpload={onImageUpload}
                />
                <SketchPanel
                  label={stepLabel('backView') || 'Back'}
                  imageUrl={sku.sketch_back_url}
                  uploadField="sketch_back_url"
                  placeholder={stepLabel('uploadBackSketch') || 'Upload back sketch'}
                  emptyPlaceholder={stepLabel('backPlaceholder') || 'Back view'}
                  mode={mode}
                  uploading={uploading}
                  onImageUpload={onImageUpload}
                />
              </div>
            ) : (
              /* Apparel: front + back side-by-side */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                <SketchPanel
                  label={stepLabel('frontView') || 'Front'}
                  imageUrl={sku.sketch_url}
                  uploadField="sketch_url"
                  placeholder={stepLabel('uploadFrontSketch') || 'Upload front sketch'}
                  emptyPlaceholder={stepLabel('frontPlaceholder') || 'Front view'}
                  mode={mode}
                  uploading={uploading}
                  onImageUpload={onImageUpload}
                  onRemove={() => onUpdate({ sketch_url: undefined })}
                />
                <SketchPanel
                  label={stepLabel('backView') || 'Back'}
                  imageUrl={sku.sketch_back_url}
                  uploadField="sketch_back_url"
                  placeholder={stepLabel('uploadBackSketch') || 'Upload back sketch'}
                  emptyPlaceholder={stepLabel('backPlaceholder') || 'Back view'}
                  mode={mode}
                  uploading={uploading}
                  onImageUpload={onImageUpload}
                  onRemove={() => onUpdate({ sketch_back_url: undefined })}
                />
              </div>
            )}

            {/* SVG download/upload for designers */}
            {sku.sketch_url && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    // Create SVG wrapper around the sketch image
                    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024">
  <image xlink:href="${sku.sketch_url}" width="1024" height="1024" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
                    const blob = new Blob([svg], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${sku.name || 'sketch'}.svg`; a.click();
                    URL.revokeObjectURL(url);
                    toast('SVG downloaded', 'success');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/30 border border-carbon/[0.06] hover:border-carbon/15 transition-colors"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                  Download SVG
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/30 border border-carbon/[0.06] hover:border-carbon/15 transition-colors cursor-pointer">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 8l-5-5-5 5M12 3v12" /></svg>
                  Upload SVG
                  <input type="file" accept=".svg,.png,.jpg,.jpeg" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
                      // Convert SVG to data URL
                      const text = await file.text();
                      const blob = new Blob([text], { type: 'image/svg+xml' });
                      const url = URL.createObjectURL(blob);
                      // Draw SVG to canvas to get PNG data URL
                      const img = new Image();
                      img.onload = async () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 1024; canvas.height = 1024;
                        const ctx = canvas.getContext('2d')!;
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, 1024, 1024);
                        const scale = Math.min(1024 / img.width, 1024 / img.height);
                        ctx.drawImage(img, (1024 - img.width * scale) / 2, (1024 - img.height * scale) / 2, img.width * scale, img.height * scale);
                        const dataUrl = canvas.toDataURL('image/png');
                        await onUpdate({ sketch_url: dataUrl } as Partial<SKU>);
                        URL.revokeObjectURL(url);
                        toast('SVG imported as sketch', 'success');
                      };
                      img.src = url;
                    } else {
                      // Regular image upload
                      onImageUpload(file, 'sketch_url');
                    }
                    e.target.value = '';
                  }} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: COLOR-UP SHEET ═══ */}
        {activeStep === 1 && (() => {
          const defaultZones = getDefaultZones(sku.category);

          const ensureZones = (cw: SkuColorway): ColorwayZone[] => {
            if (cw.zones && cw.zones.length > 0) return cw.zones;
            return defaultZones.map((z, i) => ({
              zone: z.zone,
              hex: i === 0 ? cw.hex_primary : z.defaultHex,
            }));
          };

          const updateZone = (cwId: string, zoneIdx: number, field: keyof ColorwayZone, value: string) => {
            const cw = skuColorways.find(c => c.id === cwId);
            if (!cw) return;
            const zones = [...ensureZones(cw)];
            zones[zoneIdx] = { ...zones[zoneIdx], [field]: value };
            const primary = zones[0]?.hex || cw.hex_primary;
            const secondary = zones[1]?.hex || null;
            const accent = zones[2]?.hex || null;
            updateColorway(cwId, { zones, hex_primary: primary, hex_secondary: secondary, hex_accent: accent } as Partial<SkuColorway>);
          };

          const addZoneToCw = (cwId: string) => {
            const cw = skuColorways.find(c => c.id === cwId);
            if (!cw) return;
            const zones = [...ensureZones(cw), { zone: 'Custom', hex: '#808080' }];
            updateColorway(cwId, { zones } as Partial<SkuColorway>);
          };

          const removeZoneFromCw = (cwId: string, zoneIdx: number) => {
            const cw = skuColorways.find(c => c.id === cwId);
            if (!cw) return;
            const zones = ensureZones(cw).filter((_, i) => i !== zoneIdx);
            updateColorway(cwId, { zones } as Partial<SkuColorway>);
          };

          // Effective zone list for proposals: prefer AI-detected, fall back to category template.
          const effectiveZones: { name: string; hex: string; semanticRole?: string; description?: string }[] =
            (detectedZones && detectedZones.length > 0)
              ? detectedZones.map(z => ({ name: z.name, hex: z.defaultHex, semanticRole: z.semanticRole, description: z.description }))
              : defaultZones.map(z => ({ name: z.zone, hex: z.defaultHex, description: z.description }));

          // Colorize a single proposal against the current sketch using its
          // zoneAssignments (zone → hex). Used both for initial generation and
          // for the "Re-colorize" button after editing a hex on a card.
          // We do NOT clear colorizedUrl up-front: if the call fails the user
          // keeps seeing the previous render instead of an empty placeholder.
          const reportColorizeError = (reason: string) => {
            setColorizeError(reason);
            // Only show one toast per ~2s window, no matter how many parallel
            // colorize calls all fail at once.
            const now = Date.now();
            if (now - lastToastAtRef.current > 2000) {
              lastToastAtRef.current = now;
              toast(`${stepLabel('colorizeFailed') || 'Colorize failed'}: ${reason}`, 'error');
            }
          };

          const colorizeOne = async (idx: number, cw: AiColorway) => {
            if (!sku.sketch_url) return;
            setAiColorways(prev => prev?.map((p, pi) => pi === idx ? { ...p, colorizing: true, lastError: undefined } : p) || null);
            try {
              const zone_colors = (cw.zoneAssignments || []).map(za => ({ zone: za.zoneName, hex: za.hex }));
              const res = await fetch('/api/ai/colorize-sketch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sketch_url: sku.sketch_url,
                  colorway_name: cw.name,
                  color_description: cw.description,
                  zone_colors,
                  category: sku.category,
                  product_name: sku.name,
                  family: sku.family,
                  collectionPlanId,
                  skuId: sku.id,
                }),
              });
              if (!res.ok) {
                const errPayload = await res.json().catch(() => ({}));
                const reason = (errPayload?.error as string) || `HTTP ${res.status}`;
                console.error('[Colorize]', res.status, errPayload);
                setAiColorways(prev => prev?.map((p, pi) => pi === idx ? { ...p, colorizing: false, lastError: reason } : p) || null);
                reportColorizeError(reason);
                return;
              }
              const { imageUrl } = await res.json();
              if (!imageUrl) {
                setAiColorways(prev => prev?.map((p, pi) => pi === idx ? { ...p, colorizing: false, lastError: 'no image returned' } : p) || null);
                reportColorizeError(stepLabel('recolorizeNoImage') || 'No image returned');
                return;
              }
              setAiColorways(prev => prev?.map((p, pi) => pi === idx ? { ...p, colorizedUrl: imageUrl, colorizing: false, lastError: undefined } : p) || null);
              // If everything finally went through, clear the global banner.
              setColorizeError(null);
              // Regenerate name + description so they match the new distribution.
              // Fire-and-forget — failure here is non-blocking (the user already
              // has a fresh image; stale name is only mildly annoying).
              callDesignAI('color-rename', {
                productCategory: sku.category,
                productType: sku.category,
                family: sku.family,
                subcategory: sku.name,
                designDirection: sku.notes || sku.name,
                zoneAssignments: JSON.stringify(cw.zoneAssignments || []),
              }).then(result => {
                if (result?.name && result?.description) {
                  setAiColorways(prev => prev?.map((p, pi) =>
                    pi === idx ? { ...p, name: result.name, description: result.description } : p
                  ) || null);
                }
              }).catch(() => { /* non-blocking */ });
            } catch (err) {
              console.error('[Colorize]', err);
              const reason = err instanceof Error ? err.message : 'network error';
              setAiColorways(prev => prev?.map((p, pi) => pi === idx ? { ...p, colorizing: false, lastError: reason } : p) || null);
              reportColorizeError(reason);
            }
          };

          const recolorizeAll = async () => {
            if (!aiColorways || !sku.sketch_url) return;
            setColorizeError(null);
            await Promise.all(aiColorways.slice(0, 4).map((p, i) => colorizeOne(i, p)));
          };

          const colorizeAll = async (proposals: AiColorway[]) => {
            // Initial colorize (after Propose): clear any stale image, mark
            // colorizing so the placeholder spinner shows up.
            const next = proposals.map(p => ({ ...p, colorizedUrl: null, colorizing: !!sku.sketch_url }));
            setAiColorways(next);
            if (!sku.sketch_url) return;
            await Promise.all(next.slice(0, 4).map((p, i) => colorizeOne(i, p)));
          };

          // Edit a single zone's hex on a single proposal (before Accept).
          const updateProposalZoneHex = (idx: number, zoneName: string, hex: string) => {
            setAiColorways(prev => prev?.map((p, pi) => {
              if (pi !== idx) return p;
              const zoneAssignments = (p.zoneAssignments || []).map(za => za.zoneName === zoneName ? { ...za, hex } : za);
              return { ...p, zoneAssignments };
            }) || null);
          };

          // Detected-zone management (Confirm Zones bar) — rename / add / delete.
          const renameDetectedZone = (id: string, name: string) => {
            setDetectedZones(prev => prev?.map(z => z.id === id ? { ...z, name } : z) || null);
          };
          const removeDetectedZone = (id: string) => {
            setDetectedZones(prev => prev?.filter(z => z.id !== id) || null);
          };
          const addDetectedZone = () => {
            setDetectedZones(prev => [
              ...(prev || []),
              { id: `custom-${Date.now()}`, name: 'New zone', defaultHex: '#808080', semanticRole: 'accent', description: '' },
            ]);
          };

          const launchGenerate = async () => {
            const zonesPayload = effectiveZones.map(z => ({ name: z.name, semanticRole: z.semanticRole, description: z.description }));
            const input: Record<string, string> = {
              productCategory: sku.category,
              productType: sku.category,
              family: sku.family,
              subcategory: sku.name,
              concept: sku.notes || '',
              designDirection: notes || sku.notes || sku.name,
              priceRange: `€${sku.pvp}`,
              zones: JSON.stringify(zonesPayload),
            };
            setGenerating(true);
            try {
              const result = await callDesignAI('color-suggest', input);
              if (result?.colorways && result.colorways.length > 0) {
                setGenerating(false);
                await colorizeAll(result.colorways as AiColorway[]);
              } else {
                toast(stepLabel('noColorwaysReturned') || 'No colorways returned — try again', 'warning');
                setGenerating(false);
              }
            } catch (err) {
              console.error('[ColorGenerate]', err);
              toast(stepLabel('failedColorways') || 'Failed to generate colorways', 'error');
              setGenerating(false);
            }
          };

          return (
          <div className="space-y-5">
            {/* ── Sketch + Confirm zones panel ── */}
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
              {/* Sketch preview */}
              {sku.sketch_url ? (
                <div className="space-y-1.5">
                  <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('currentSketch') || 'Sketch'}</p>
                  <div className="border border-carbon/[0.06] bg-white p-2">
                    <img src={sku.sketch_url} alt="" className="w-full h-auto object-contain" />
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/5] flex items-center justify-center">
                  <p className="text-[9px] text-carbon/15 text-center px-2">{stepLabel('completeSketchFirst') || 'Complete sketch step first'}</p>
                </div>
              )}

              {/* Right column: Confirm zones + Path picker + Generate */}
              <div className="space-y-5">
                {/* ── Confirm zones (always visible — auto-detected, editable) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/45">
                      {stepLabel('confirmZones') || 'Zones detected for this product'}
                    </p>
                    {detectingZones && (
                      <span className="flex items-center gap-1.5 text-[10px] text-carbon/35">
                        <Loader2 className="h-3 w-3 animate-spin" /> {stepLabel('detectingZones') || 'Detecting…'}
                      </span>
                    )}
                  </div>
                  {!detectingZones && effectiveZones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(detectedZones || []).map(z => (
                        <span key={z.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/70">
                          <input
                            value={z.name}
                            onChange={(e) => renameDetectedZone(z.id, e.target.value)}
                            className="bg-transparent text-[11px] focus:outline-none w-auto"
                            style={{ width: `${Math.max(z.name.length, 4) * 7}px` }}
                          />
                          <span className="text-[8px] text-carbon/30 uppercase tracking-wider">{z.semanticRole}</span>
                          <button onClick={() => removeDetectedZone(z.id)} className="text-carbon/20 hover:text-[#A0463C]/60">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      <button onClick={addDetectedZone}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-carbon/[0.15] text-[11px] text-carbon/40 hover:border-carbon/35 hover:text-carbon/70">
                        <Plus className="h-2.5 w-2.5" /> {stepLabel('addZone') || 'Add zone'}
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-carbon/35 leading-relaxed">
                    {stepLabel('zonesHelp') || 'These are the parts the AI will color. Rename or remove anything that doesn’t apply to your product.'}
                  </p>
                </div>

                {/* ── Generate from brand palette ── */}
                <div className="space-y-3">
                  <button onClick={launchGenerate}
                    disabled={generating || effectiveZones.length === 0}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-all disabled:opacity-30">
                    {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {aiColorways
                      ? (stepLabel('regenerateColorways') || 'Regenerate proposals')
                      : (stepLabel('proposeColorways') || 'Generate proposals')}
                  </button>
                </div>
              </div>
            </div>

            {/* Loading state */}
            {generating && !aiColorways && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-carbon/20" />
                <p className="text-[11px] text-carbon/25">{stepLabel('generatingColorways') || 'Generating colorway proposals...'}</p>
              </div>
            )}

            {/* ── Global colorize error banner ── */}
            {colorizeError && aiColorways && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] border border-[#A0463C]/30 bg-[#A0463C]/[0.04]">
                <X className="h-3.5 w-3.5 text-[#A0463C] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#A0463C] mb-0.5">
                    {stepLabel('colorizeFailedHeading') || 'Colorize failed'}
                  </p>
                  <p className="text-[10px] text-carbon/60 leading-relaxed font-mono">{colorizeError}</p>
                </div>
                <button onClick={recolorizeAll}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-[-0.01em] bg-carbon text-crema hover:bg-carbon/90">
                  <RefreshCw className="h-3 w-3" /> {stepLabel('recolorizeAll') || 'Re-colorize all'}
                </button>
              </div>
            )}

            {/* ── Colorized proposals grid — zone-aware, per-card editable ── */}
            {aiColorways && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aiColorways.map((cw, idx) => {
                  const za = cw.zoneAssignments || [];
                  return (
                  <div key={idx} className="border border-carbon/[0.06] bg-white overflow-hidden">
                    <div className="aspect-[4/3] bg-carbon/[0.02] overflow-hidden relative">
                      {cw.colorizedUrl && (
                        <img src={cw.colorizedUrl} alt={cw.name} className="w-full h-full object-contain" />
                      )}
                      {cw.colorizing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[1px]">
                          <Loader2 className="h-4 w-4 animate-spin text-carbon/35" />
                          <span className="text-[9px] text-carbon/40">{stepLabel('colorizing') || 'Colorizing…'}</span>
                        </div>
                      )}
                      {!cw.colorizedUrl && !cw.colorizing && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3 text-center">
                          <span className="text-[9px] text-carbon/35">{stepLabel('noPreviewYet') || 'No preview yet'}</span>
                          {cw.lastError && (
                            <span className="text-[9px] font-mono text-[#A0463C]/70 line-clamp-2 max-w-[90%]">{cw.lastError}</span>
                          )}
                          <button onClick={() => colorizeOne(idx, cw)} disabled={!sku.sketch_url}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.12] text-carbon/55 hover:bg-carbon/[0.03] disabled:opacity-30">
                            <RefreshCw className="h-3 w-3" /> {stepLabel('retry') || 'Retry'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-medium text-carbon truncate">{cw.name}</p>
                        <span className="shrink-0 text-[8px] text-carbon/20 uppercase tracking-wider">{cw.commercialRole}</span>
                      </div>
                      <p className="text-[10px] text-carbon/45 leading-relaxed">{cw.description}</p>

                      {/* Zone → hex table (the visibility Felipe asked for) */}
                      {za.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-carbon/[0.04]">
                          <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1">
                            {stepLabel('zoneAssignments') || 'Zone assignments'}
                          </p>
                          {za.map((z, zi) => (
                            <div key={zi} className="flex items-center gap-2 text-[10px]">
                              <div className="relative w-5 h-5 rounded-[4px] border border-carbon/[0.08] cursor-pointer hover:ring-1 hover:ring-carbon/30 shrink-0"
                                style={{ backgroundColor: z.hex }}>
                                <input type="color" value={z.hex}
                                  onChange={(e) => updateProposalZoneHex(idx, z.zoneName, e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                              </div>
                              <span className="text-carbon/70 font-medium shrink-0 w-[80px] truncate">{z.zoneName}</span>
                              <span className="text-carbon/30 font-mono text-[9px] shrink-0">{z.hex.toUpperCase()}</span>
                              {z.rationale && <span className="text-carbon/40 italic truncate">— {z.rationale}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => colorizeOne(idx, cw)}
                          disabled={cw.colorizing || !sku.sketch_url}
                          title={stepLabel('recolorizeTooltip') || 'Re-colorize this card with the current colors'}
                          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/55 hover:bg-carbon/[0.03] transition-colors disabled:opacity-30">
                          {cw.colorizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          {stepLabel('recolorize') || 'Re-colorize'}
                        </button>
                        <button onClick={async () => {
                          const zonesForSave: ColorwayZone[] = za.map(z => ({ zone: z.zoneName, hex: z.hex, notes: z.rationale }));
                          await addColorway({
                            sku_id: sku.id,
                            name: cw.name,
                            hex_primary: cw.primary || za[0]?.hex || '#000000',
                            hex_secondary: za[1]?.hex || (null as unknown as string),
                            hex_accent: za[2]?.hex || (null as unknown as string),
                            pantone_primary: null as unknown as string,
                            pantone_secondary: null as unknown as string,
                            material_swatch_url: null as unknown as string,
                            status: 'proposed',
                            position: skuColorways.length,
                            zones: zonesForSave,
                          } as Omit<SkuColorway, 'id' | 'created_at'>);
                          if (cw.colorizedUrl) await onUpdate({ render_url: cw.colorizedUrl } as Partial<SKU>);
                          toast(stepLabel('colorwayAccepted') || `${cw.name} added`, 'success');
                        }}
                          className="flex-1 px-3 py-2 text-[9px] font-medium tracking-[0.08em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors text-center">
                          {stepLabel('accept') || 'Accept'}
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* ── Accepted colorways — expandable zone editor (advanced) ── */}
            {skuColorways.length > 0 && (
              <div className="space-y-3">
                <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('acceptedColorways') || 'Accepted Colorways'} ({skuColorways.length})</p>
                {skuColorways.map((cw) => {
                  const zones = ensureZones(cw);
                  const isOpen = expandedCw === cw.id;
                  return (
                    <div key={cw.id} className="border border-carbon/[0.06] bg-white overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-carbon/[0.01]" onClick={() => setExpandedCw(isOpen ? null : cw.id)}>
                        <div className="flex shrink-0 h-5 overflow-hidden border border-carbon/[0.06]">
                          {zones.map((z, i) => <div key={i} className="w-4 h-full" style={{ backgroundColor: z.hex }} />)}
                        </div>
                        <input value={cw.name} onClick={e => e.stopPropagation()} onChange={(e) => updateColorway(cw.id, { name: e.target.value })}
                          className="flex-1 text-[13px] font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.06] focus:border-carbon/[0.12] focus:outline-none" />
                        <select value={cw.status} onClick={e => e.stopPropagation()} onChange={(e) => updateColorway(cw.id, { status: e.target.value as SkuColorway['status'] })}
                          className="text-[9px] font-medium uppercase bg-transparent border border-carbon/[0.06] px-1.5 py-0.5 text-carbon/45 focus:outline-none">
                          <option value="proposed">{(t.status as Record<string, string>)?.proposed || 'Proposed'}</option><option value="sampled">{(t.status as Record<string, string>)?.sampled || 'Sampled'}</option><option value="approved">{(t.status as Record<string, string>)?.approved || 'Approved'}</option><option value="production">{(t.status as Record<string, string>)?.production || 'Production'}</option>
                        </select>
                        <button onClick={(e) => { e.stopPropagation(); deleteColorway(cw.id); }} className="text-carbon/15 hover:text-[#A0463C]/50"><Trash2 className="h-3 w-3" /></button>
                        <Check className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180 text-carbon/30' : 'rotate-0 text-carbon/10'}`} />
                      </div>
                      {isOpen && (
                        <div className="border-t border-carbon/[0.04] px-4 py-3 space-y-1.5">
                          <div className="grid grid-cols-[1fr_44px_120px_1fr] gap-x-3 gap-y-0 mb-1">
                            <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('zoneLabel') || 'Zone'}</span>
                            <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('colorLabel') || 'Color'}</span>
                            <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{(t.fieldLabels as Record<string, string>)?.pantone || 'Pantone'}</span>
                            <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('notesLabel') || 'Notes'}</span>
                          </div>
                          {zones.map((z, zi) => (
                            <div key={zi} className="grid grid-cols-[1fr_44px_120px_1fr_20px] gap-x-3 items-center py-1 border-b border-carbon/[0.02] last:border-0">
                              <input value={z.zone} onChange={(e) => updateZone(cw.id, zi, 'zone', e.target.value)}
                                className="text-[11px] font-light text-carbon bg-transparent focus:outline-none border-b border-transparent hover:border-carbon/[0.06] focus:border-carbon/[0.12]" />
                              <div className="relative">
                                <div className="w-7 h-7 border border-carbon/[0.08] cursor-pointer hover:ring-1 hover:ring-carbon/20" style={{ backgroundColor: z.hex }} />
                                <input type="color" value={z.hex} onChange={(e) => updateZone(cw.id, zi, 'hex', e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                              </div>
                              <PantonePicker
                                value={z.pantone || ''}
                                onChange={(code) => updateZone(cw.id, zi, 'pantone', code)}
                                onHexChange={(hex) => updateZone(cw.id, zi, 'hex', hex)}
                                targetHex={z.hex}
                                size="compact"
                                placeholder="19-4052 TCX"
                              />
                              <input value={z.notes || ''} onChange={(e) => updateZone(cw.id, zi, 'notes', e.target.value)}
                                placeholder="DTM, contrast, etc." className="text-[10px] text-carbon/30 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />
                              <button onClick={() => removeZoneFromCw(cw.id, zi)} className="text-carbon/10 hover:text-[#A0463C]/40"><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                          <button onClick={() => addZoneToCw(cw.id)}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] text-carbon/25 hover:text-carbon/45 transition-colors">
                            <Plus className="h-2.5 w-2.5" /> {stepLabel('addZone') || 'Add zone'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })()}

        {/* ═══ STEP 3: MATERIALS / BOM ═══ */}
        {activeStep === 2 && (() => {
          const defaultZones = getDefaultZones(sku.category);
          const matZones: MaterialZone[] = sku.material_zones && sku.material_zones.length > 0
            ? sku.material_zones
            : defaultZones.map(z => ({ zone: z.zone, material: '' }));

          const firstCw = skuColorways[0];
          const cwZones = firstCw?.zones && firstCw.zones.length > 0 ? firstCw.zones : [];
          const zoneColor = (zoneName: string): string | null => {
            const z = cwZones.find(cz => cz.zone === zoneName);
            return z?.hex || null;
          };

          const updateMatZone = (idx: number, field: keyof MaterialZone, value: string) => {
            const updated = [...matZones];
            updated[idx] = { ...updated[idx], [field]: value };
            onUpdate({ material_zones: updated } as Partial<SKU>);
          };

          const addMatZone = () => {
            const updated = [...matZones, { zone: 'Custom', material: '' }];
            onUpdate({ material_zones: updated } as Partial<SKU>);
          };

          const removeMatZone = (idx: number) => {
            const updated = matZones.filter((_, i) => i !== idx);
            onUpdate({ material_zones: updated } as Partial<SKU>);
          };

          // AI auto-fill: cost-aware materials proposal that respects the
          // SKU's COGS target. The AI receives the materials budget as a
          // hard constraint and returns per-material cost, which is wired
          // into the BOM downstream.
          const autoFillMaterials = async () => {
            setGenerating(true);
            try {
              const zoneContext = matZones.map(m => m.zone).join(', ');
              const colorwayContext = skuColorways.map(c => {
                const zones = c.zones && c.zones.length > 0 ? c.zones : [];
                return `${c.name}: ${zones.map(z => `${z.zone}=${z.hex}`).join(', ')}`;
              }).join(' | ');
              const { budget, budgetLabel } = buildMaterialsBudget(sku);
              const result = await callDesignAI('materials-suggest', {
                productCategory: sku.category,
                productType: sku.category || sku.type || '',
                subcategory: sku.name || '',
                family: sku.family,
                concept: sku.notes || '',
                priceRange: `€${sku.pvp}`,
                targetCogs: sku.cost != null ? `€${sku.cost}` : '',
                targetPvp: sku.pvp != null ? `€${sku.pvp}` : '',
                targetMargin: sku.margin != null ? `${Math.round(sku.margin)}%` : '',
                materialsBudget: budgetLabel,
                designDirection: `${sku.name} — ${sku.family}. ${sku.notes || ''}`,
                colorways: colorwayContext,
                zones: zoneContext,
              });
              const suggestions: AiMaterialSuggestion[] = result?.materials || [];
              if (suggestions.length === 0) {
                toast('No material suggestions returned', 'warning');
                return;
              }
              const consumed = new Set<string>();
              const filled = matZones.map(mz => {
                const suggestion = matchSuggestionToZone(mz.zone, suggestions, consumed);
                if (!suggestion) return mz;
                consumed.add(suggestion.name);
                const costNum = typeof suggestion.cost_total === 'number'
                  ? suggestion.cost_total
                  : Number(String(suggestion.cost_total || '').replace(/[^0-9.\-]/g, '')) || undefined;
                return {
                  ...mz,
                  material: suggestion.name,
                  composition: suggestion.description || mz.composition || '',
                  finish: suggestion.sustainability || mz.finish || '',
                  consumption: suggestion.consumption || mz.consumption,
                  cost_per_unit: suggestion.cost_per_unit || mz.cost_per_unit,
                  cost_total: costNum != null ? costNum : mz.cost_total,
                  cost_currency: suggestion.cost_currency || mz.cost_currency || 'EUR',
                };
              });
              onUpdate({ material_zones: filled } as Partial<SKU>);
              const totalCost = filled.reduce((acc, z) => acc + (z.cost_total || 0), 0);
              const overshoot = budget > 0 ? ((totalCost - budget) / budget) * 100 : 0;
              if (totalCost > 0 && Math.abs(overshoot) <= 5) {
                toast(`Materials proposed · €${totalCost.toFixed(2)} of €${budget.toFixed(2)} budget`, 'success');
              } else if (totalCost > budget * 1.05) {
                toast(`Materials over budget by ${overshoot.toFixed(0)}% — review costs`, 'warning');
              } else {
                toast('Materials suggested — review and edit as needed', 'success');
              }
            } catch (err) {
              console.error('[Materials]', err);
              toast('Failed to suggest materials', 'error');
            } finally {
              setGenerating(false);
            }
          };

          return (
          <div className="space-y-4">
            {/* Context: sketch + colorway strip */}
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
              {sku.sketch_url && (
                <div className="space-y-1.5">
                  <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('currentSketch') || 'Sketch'}</p>
                  <div className="border border-carbon/[0.06] bg-white p-2">
                    <img src={sku.sketch_url} alt="" className="w-full h-auto object-contain" />
                  </div>
                  {firstCw && cwZones.length > 0 && (
                    <div className="flex h-4 overflow-hidden border border-carbon/[0.06]">
                      {cwZones.map((z, i) => <div key={i} className="flex-1 h-full" style={{ backgroundColor: z.hex }} />)}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-carbon/40 leading-relaxed">
                    {stepLabel('materialsCanonicalDesc') || 'Aimily ha propuesto materiales basados en tu paleta y dirección de diseño. Edita lo que necesites.'}
                  </p>
                  <button onClick={autoFillMaterials} disabled={generating}
                    className="shrink-0 inline-flex items-center justify-center gap-2 py-2 px-5 rounded-full border border-carbon/[0.12] text-carbon/60 text-[12px] font-medium tracking-[-0.01em] hover:bg-carbon hover:text-white transition-all disabled:opacity-30">
                    {generating && <Loader2 className="h-3 w-3 animate-spin" />}
                    {stepLabel('regenerateMaterials') || 'Regenerar materiales'}
                  </button>
                </div>

                {/* Simplified BOM table: Zone + Material + Finish */}
                <div className="space-y-1">
                  <div className="grid grid-cols-[20px_minmax(80px,1.2fr)_minmax(120px,2fr)_minmax(80px,1fr)_20px] gap-x-2 px-3">
                    <span />
                    <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('zoneLabel') || 'Zone'}</span>
                    <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('materialLabel') || 'Material'}</span>
                    <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('finishLabel') || 'Finish'}</span>
                    <span />
                  </div>

                  {matZones.map((mz, idx) => {
                    const hex = zoneColor(mz.zone);
                    return (
                      <div key={idx} className="grid grid-cols-[20px_minmax(80px,1.2fr)_minmax(120px,2fr)_minmax(80px,1fr)_20px] gap-x-2 items-center px-3 py-2 bg-white border border-carbon/[0.04]">
                        <div>{hex ? <div className="w-4 h-4 border border-carbon/[0.08]" style={{ backgroundColor: hex }} /> : <div className="w-4 h-4 border border-dashed border-carbon/[0.06]" />}</div>
                        <input value={mz.zone} onChange={(e) => updateMatZone(idx, 'zone', e.target.value)}
                          className="text-[11px] font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.06] focus:outline-none focus:border-carbon/[0.12]" />
                        <MaterialCombobox
                          value={mz.material}
                          onChange={(val, picked) => {
                            updateMatZone(idx, 'material', val);
                            // Auto-fill finish from picked material's defaultFinish
                            // when the user hasn't already typed one. Reduces busywork.
                            if (picked?.defaultFinish && !mz.finish) {
                              updateMatZone(idx, 'finish', picked.defaultFinish);
                            }
                          }}
                          category={sku.category}
                          zone={mz.zone as Zone}
                          size="compact"
                          placeholder={stepLabel('materialPlaceholder') || 'e.g. Italian linen 230gsm'}
                        />
                        <input value={mz.finish || ''} onChange={(e) => updateMatZone(idx, 'finish', e.target.value)}
                          placeholder="Tumbled, Matte..." className="text-[10px] text-carbon/35 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />
                        <button onClick={() => removeMatZone(idx)} className="text-carbon/10 hover:text-[#A0463C]/40"><X className="h-3 w-3" /></button>
                      </div>
                    );
                  })}

                  <button onClick={addMatZone}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.08] text-carbon/30 text-[9px] font-medium tracking-[0.08em] uppercase hover:border-carbon/15 w-full justify-center">
                    <Plus className="h-2.5 w-2.5" /> {stepLabel('addZone') || 'Add Zone'}
                  </button>

                  {matZones.some(m => !m.material) && (
                    <p className="text-[9px] text-carbon/20 italic px-1">{stepLabel('emptyZonesNote') || 'Empty zones will be noted as "factory discretion" in the tech pack.'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ═══ STEP 4: TECH PACK (or just Product Visualization when driven by render3d) ═══ */}
        {activeStep === 3 && (() => {
          const primaryCw = skuColorways[0];
          const cwZones = primaryCw?.zones?.length ? primaryCw.zones : [];
          const mZones = sku.material_zones || [];


          return (
          <div className="space-y-0">
            {/* ── Tech Pack Sheet (hidden when EvolutionStrip is on render3d) ── */}
            {evolutionStep !== 'render3d' && (
              <>
                <div className="bg-white border border-carbon/[0.08]">
                  {/* Header bar */}
                  <div className="border-b border-carbon/[0.08] px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-light text-carbon tracking-tight">{sku.name}</h3>
                        <p className="text-[10px] text-carbon/30 mt-0.5">{sku.family} · Drop {sku.drop_number} · {sku.category === 'CALZADO' ? ((t.skuPhases as Record<string, string>)?.categoryFootwear || 'Footwear') : sku.category === 'ROPA' ? ((t.skuPhases as Record<string, string>)?.categoryApparel || 'Apparel') : sku.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-carbon/20 uppercase tracking-wider">PVP / COGS</p>
                        <p className="text-[13px] font-light text-carbon">€{sku.pvp} / €{sku.cost}</p>
                        <p className="text-[8px] text-carbon/20 mt-0.5">{stepLabel('margin') || 'Margin'}: {sku.pvp > 0 ? Math.round((1 - sku.cost / sku.pvp) * 100) : 0}%</p>
                      </div>
                    </div>
                    {sku.notes && <p className="text-[10px] text-carbon/35 mt-2 leading-relaxed">{sku.notes}</p>}
                  </div>

                  {/* Sketch views with numbered callouts */}
                  <div className="grid grid-cols-2 border-b border-carbon/[0.08]">
                    <div className="border-r border-carbon/[0.08] p-4 flex flex-col">
                      <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('sideProfile') || 'Side Profile'}{sku.render_url ? ' (colored)' : ''}</p>
                      {(sku.render_url || sku.sketch_url) ? (
                        <div className="relative flex items-center justify-center bg-white aspect-[4/3] max-h-[40vh]">
                          <img src={sku.render_url || sku.sketch_url} alt="Side profile" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-[10px] text-carbon/15">No sketch</div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col">
                      <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('topDown') || 'Top Down'}</p>
                      {(sku.sketch_top_url || sketchTopView) ? (
                        <div className="relative flex items-center justify-center bg-white aspect-[4/3] max-h-[40vh]">
                          <img src={sku.sketch_top_url || sketchTopView || ''} alt="Top down" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-[10px] text-carbon/15">No top-down view</div>
                      )}
                    </div>
                  </div>

                  {/* BOM / Color-Up Table */}
                  <div className="px-6 py-4">
                    <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-3">{stepLabel('colorUpBom') || 'Color-Up & Bill of Materials'}{primaryCw ? ` — ${primaryCw.name}` : ''}</p>
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-carbon/[0.08]">
                          <th className="text-left py-1.5 pr-2 text-[8px] text-carbon/25 uppercase tracking-wider font-medium w-6">#</th>
                          <th className="text-left py-1.5 pr-2 text-[8px] text-carbon/25 uppercase tracking-wider font-medium w-5"></th>
                          <th className="text-left py-1.5 pr-3 text-[8px] text-carbon/25 uppercase tracking-wider font-medium">{stepLabel('zoneLabel') || 'Zone'}</th>
                          <th className="text-left py-1.5 pr-3 text-[8px] text-carbon/25 uppercase tracking-wider font-medium">Pantone</th>
                          <th className="text-left py-1.5 pr-3 text-[8px] text-carbon/25 uppercase tracking-wider font-medium">{stepLabel('materialLabel') || 'Material'}</th>
                          <th className="text-left py-1.5 pr-3 text-[8px] text-carbon/25 uppercase tracking-wider font-medium">{stepLabel('compositionLabel') || 'Composition'}</th>
                          <th className="text-left py-1.5 pr-3 text-[8px] text-carbon/25 uppercase tracking-wider font-medium">{stepLabel('weightLabel') || 'Weight'}</th>
                          <th className="text-left py-1.5 text-[8px] text-carbon/25 uppercase tracking-wider font-medium">{stepLabel('finishLabel') || 'Finish'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Iterate the union of material zones (which carry the
                          // material/composition/finish data filled in the Materials
                          // sub-step) and colorway zones (which carry color/pantone).
                          // mZones is the canonical row source: every material zone
                          // gets a row, even if no colorway hex is assigned.
                          const rows = mZones.length > 0 ? mZones : cwZones.map(z => ({ zone: z.zone, material: '', composition: '', finish: '', weight: '' } as MaterialZone));
                          if (rows.length === 0) {
                            return <tr><td colSpan={8} className="py-4 text-center text-carbon/15">{stepLabel('noZonesConfigured') || 'No hay zonas configuradas — vuelve al paso Colorways'}</td></tr>;
                          }
                          return rows.map((mat, i) => {
                            const cwz = cwZones.find(z => z.zone === mat.zone);
                            return (
                              <tr key={i} className="border-b border-carbon/[0.03]">
                                <td className="py-1.5 pr-2 text-[9px] font-semibold text-carbon/40">{i + 1}</td>
                                <td className="py-1.5 pr-2">{cwz?.hex ? <div className="w-3.5 h-3.5 border border-carbon/[0.08]" style={{ backgroundColor: cwz.hex }} /> : <div className="w-3.5 h-3.5 border border-dashed border-carbon/[0.08]" />}</td>
                                <td className="py-1.5 pr-3 text-carbon/60 font-medium">{mat.zone}</td>
                                <td className="py-1.5 pr-3 text-carbon/30">{cwz?.pantone || '—'}</td>
                                <td className="py-1.5 pr-3 text-carbon/50">{mat.material || <span className="text-carbon/15 italic">{stepLabel('factoryDiscretion') || 'Decisión fábrica'}</span>}</td>
                                <td className="py-1.5 pr-3 text-carbon/35">{mat.composition || '—'}</td>
                                <td className="py-1.5 pr-3 text-carbon/35">{mat.weight || '—'}</td>
                                <td className="py-1.5 text-carbon/35">{mat.finish || '—'}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    {skuColorways.length > 1 && (
                      <p className="text-[8px] text-carbon/20 mt-2">+{skuColorways.length - 1} additional colorway{skuColorways.length > 2 ? 's' : ''} configured</p>
                    )}
                  </div>
                </div>

                {!(confirmedSteps.has(0) && confirmedSteps.has(1) && confirmedSteps.has(2)) && (
                  <div className="p-3 bg-carbon/[0.02] border border-carbon/[0.06] mt-4">
                    <p className="text-[10px] text-carbon/30">{stepLabel('techPackPending') || 'Complete Sketch, Colorways and Materials to finalize the tech pack.'}</p>
                  </div>
                )}
              </>
            )}

            {/* ── Product Visualization — only shown in 3D Render evolution step ── */}
            {evolutionStep === 'render3d' && (
              <div className="space-y-6">
                {/* Colored Sketch */}
                {sku.render_url && (
                  <div className="space-y-1.5">
                    <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('coloredSketch') || 'Colored Sketch'}</p>
                    <div className="border border-carbon/[0.06] bg-white overflow-hidden flex items-center justify-center p-4">
                      <img src={sku.render_url} alt="Colorized sketch" className="max-w-full max-h-[50vh] object-contain" />
                    </div>
                  </div>
                )}

                {/* 3D Render */}
                <div className="space-y-1.5">
                  <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('render3d') || '3D Render'}</p>
                  {(sku.render_urls as Record<string, string>)?.['3d'] ? (
                    <div className="space-y-2">
                      <div className="border border-carbon/[0.06] bg-white overflow-hidden flex items-center justify-center p-4">
                        <img src={(sku.render_urls as Record<string, string>)['3d']} alt="3D render" className="max-w-full max-h-[50vh] object-contain" />
                      </div>
                      <button
                        onClick={async () => {
                          setGenerating(true);
                          try {
                            const primaryCw = skuColorways[0];
                            const res = await fetch('/api/ai/colorize-sketch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                sketch_url: sku.render_url,
                                colorway_name: primaryCw?.name || 'main',
                                zone_colors: primaryCw?.zones || [],
                                category: sku.category,
                                product_name: sku.name,
                                family: sku.family,
                                collectionPlanId,
                                is_3d_render: true,
                                skuId: sku.id,
                              }),
                            });
                            if (res.ok) {
                              const { imageUrl } = await res.json();
                              if (imageUrl) {
                                const updated = { ...(sku.render_urls || {}), '3d': imageUrl };
                                await onUpdate({ render_urls: updated } as Partial<SKU>);
                                toast('3D render regenerated', 'success');
                              }
                            } else {
                              const err = await res.json().catch(() => ({}));
                              toast(`Render failed: ${err.error || 'Unknown error'}`, 'error');
                            }
                          } catch (err) {
                            console.error('[3DRender]', err);
                            toast('3D render failed', 'error');
                          } finally {
                            setGenerating(false);
                          }
                        }}
                        disabled={generating}
                        className="flex items-center justify-center gap-2 w-full px-3 py-1.5 border border-carbon/[0.08] text-carbon/30 text-[9px] font-medium tracking-[0.08em] uppercase hover:bg-carbon hover:text-crema transition-colors"
                      >
                        {generating ? <><Loader2 className="h-3 w-3 animate-spin" /> {stepLabel('regenerating') || 'Regenerating...'}</> : <><RefreshCw className="h-3 w-3" /> {stepLabel('regenerate3d') || 'Regenerate 3D'}</>}
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/3] flex flex-col items-center justify-center gap-3">
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-carbon/15" />
                          <span className="text-[9px] text-carbon/20">{stepLabel('generating3d') || 'Generating 3D render...'}</span>
                        </>
                      ) : (
                        <button
                          onClick={async () => {
                            setGenerating(true);
                            try {
                              const primaryCw = skuColorways[0];
                              const res = await fetch('/api/ai/colorize-sketch', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sketch_url: sku.render_url,
                                  colorway_name: primaryCw?.name || 'main',
                                  zone_colors: primaryCw?.zones || [],
                                  category: sku.category,
                                  product_name: sku.name,
                                  family: sku.family,
                                  collectionPlanId,
                                  is_3d_render: true,
                                  skuId: sku.id,
                                }),
                              });
                              if (res.ok) {
                                const { imageUrl } = await res.json();
                                if (imageUrl) {
                                  const updated = { ...(sku.render_urls || {}), '3d': imageUrl };
                                  await onUpdate({ render_urls: updated } as Partial<SKU>);
                                  toast('3D render generated', 'success');
                                }
                              } else {
                                const err = await res.json().catch(() => ({}));
                                toast(`Render failed: ${err.error || 'Unknown error'}`, 'error');
                              }
                            } catch (err) {
                              console.error('[3DRender]', err);
                              toast('3D render failed', 'error');
                            } finally {
                              setGenerating(false);
                            }
                          }}
                          disabled={generating}
                          className="flex items-center gap-2 px-4 py-2 border border-carbon/[0.08] text-carbon/40 text-[10px] font-medium tracking-[0.08em] uppercase hover:bg-carbon hover:text-crema transition-colors"
                        >
                          <Wand2 className="h-3 w-3" strokeWidth={2.25} /> {stepLabel('generate3d') || 'Generate 3D Render'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          );
        })()}
      </div>

      {/* ── Confirm dialog ── */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
