'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Sparkles, Loader2, Plus, Trash2,
  Check, X,
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
import { getDefaultZones, zonesToColorwayZones } from '@/lib/product-zones';
import type { FooterAction } from '../SkuDetailView';

type InputMode = 'free' | 'ai';

const STEPS = [
  { id: 'sketch', label: 'Drawing' },
  { id: 'colorways', label: 'Colorways' },
  { id: 'materials', label: 'Materials' },
  { id: 'techpack', label: 'Tech Pack' },
];

interface SketchPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'sketch_url' | 'reference_image_url') => void;
  uploading: string | null;
  onFooterAction?: (action: FooterAction | null) => void;
  onAdvancePhase?: () => void;
}

export function SketchPhase({ sku, onUpdate, onImageUpload, uploading, onFooterAction, onAdvancePhase }: SketchPhaseProps) {
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
  const materials = (designData.patterns[sku.id] || []) as { name: string; url: string; fileType: string; gradingNotes: string }[];

  const [activeStep, setActiveStep] = useState(0);
  const [modes, setModes] = useState<Record<string, InputMode>>({ sketch: 'free', colorways: 'free', materials: 'free', techpack: 'free' });
  const [notes, setNotes] = useState(sku.notes || '');

  // AI state
  const [generating, setGenerating] = useState(false);
  const [sketchTopView, setSketchTopView] = useState<string | null>(sku.sketch_top_url || null);
  const firstCwId = colorways.filter(c => c.sku_id === sku.id)[0]?.id || null;
  const [expandedCw, setExpandedCw] = useState<string | null>(firstCwId);
  const [generatingSketchFor, setGeneratingSketchFor] = useState<number | null>(null);
  const [aiProposals, setAiProposals] = useState<{ title: string; description: string; keyFeatures: string[]; silhouette: string; sketchUrl?: string }[] | null>(null);
  const [aiColorways, setAiColorways] = useState<{ name: string; colors: string[]; description: string; primary: string; commercialRole: string }[] | null>(null);
  const [aiMaterials, setAiMaterials] = useState<{ name: string; type: string; description: string; sustainability: string; priceImpact: string }[] | null>(null);

  // Zone Editor (no state needed — renders immediately when sketch exists)

  const existingRenderUrls = sku.render_urls || {};
  const defaultAngle = 'three_quarter' as const;
  const initialAngle: 'front' | 'three_quarter' | 'side' | 'back' = existingRenderUrls[defaultAngle] ? defaultAngle : (Object.keys(existingRenderUrls)[0] as 'front' | 'three_quarter' | 'side' | 'back') || defaultAngle;
  const [renderUrl, setRenderUrl] = useState<string | null>(existingRenderUrls[initialAngle] || sku.render_url || null);
  const [renderGenerating, setRenderGenerating] = useState(false);
  const [renderAngle, setRenderAngle] = useState(initialAngle);
  const [renderUrls, setRenderUrls] = useState<Record<string, string>>(existingRenderUrls);

  const [confirmedSteps, setConfirmedSteps] = useState<Set<number>>(() => {
    const s = new Set<number>();
    if (sku.sketch_url) s.add(0);
    if (skuColorways.length > 0) s.add(1);
    if (materials.length > 0) s.add(2);
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
  useEffect(() => {
    if (!onFooterAction) return;

    if (activeStep < STEPS.length - 1) {
      // Not on last step → "Next: [step name]"
      const nextStepLabel = STEPS[activeStep + 1].label;
      onFooterAction({
        label: `${stepLabel('next') || 'Next'}: ${nextStepLabel}`,
        action: confirmAndNext,
        isPhaseAdvance: false,
      });
    } else {
      // On tech pack → "Send to Prototyping" (phase advance)
      onFooterAction({
        label: t.skuPhases?.advanceToProto || 'Send to Prototyping',
        action: () => onAdvancePhase?.(),
        isPhaseAdvance: true,
      });
    }

    return () => onFooterAction(null);
  }, [activeStep, onFooterAction, confirmAndNext, onAdvancePhase, t.skuPhases]);

  const callDesignAI = useCallback(async (type: string, input: Record<string, string>) => {
    const res = await fetch('/api/ai/design-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, input, language }),
    });
    return res.ok ? (await res.json()).result : null;
  }, [language]);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Sub-stepper: numbered steps with connecting line ── */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isActive = idx === activeStep;
          const isConfirmed = confirmedSteps.has(idx);
          const isPast = idx < activeStep;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
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
                  {isConfirmed && !isActive ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                </span>
                {/* Clear button on confirmed steps (not tech pack) */}
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

      {/* ── Mode selector ── */}
      {activeStep < 3 && (
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
            {mode === 'free' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{stepLabel('designSketch') || 'Design Sketch'}</p>
                  <ImageUploadArea imageUrl={sku.sketch_url} uploading={uploading === 'sketch_url'}
                    placeholder={stepLabel('uploadSketch') || 'Upload your sketch'}
                    onUpload={(file) => onImageUpload(file, 'sketch_url')}
                    onRemove={() => onUpdate({ sketch_url: undefined })} aspectClass="aspect-[4/5] max-h-[40vh] sm:max-h-[55vh]" />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{stepLabel('referenceComparison') || 'Reference'}</p>
                  {sku.reference_image_url ? (
                    <div className="border border-carbon/[0.06] overflow-hidden aspect-[4/5] max-h-[40vh] sm:max-h-[55vh] bg-white">
                      <img src={sku.reference_image_url} alt="" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="border border-carbon/[0.06] bg-white aspect-[4/5] max-h-[40vh] sm:max-h-[55vh] flex items-center justify-center">
                      <p className="text-[11px] text-carbon/15">{stepLabel('noReference') || 'No reference image'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {mode === 'ai' && (
              <>
              {/* Option A: From reference photo */}
              <div className="space-y-4 mb-8">
                <p className="text-[11px] font-medium text-carbon/30 uppercase tracking-[0.15em]">{stepLabel('fromReference') || 'From Reference'}</p>
                {/* Reference photo compact + generate button */}
                <div className="flex items-end gap-4">
                  <div className="shrink-0">
                    <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1.5">{stepLabel('referencePhoto') || 'Reference'}</p>
                    {sku.reference_image_url ? (
                      <div className="border border-carbon/[0.06] overflow-hidden bg-white w-28 h-28">
                        <img src={sku.reference_image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <ImageUploadArea imageUrl={undefined} uploading={uploading === 'reference_image_url'}
                        placeholder={stepLabel('uploadReference') || 'Upload'}
                        onUpload={(file) => onImageUpload(file, 'reference_image_url' as 'sketch_url')}
                        onRemove={() => {}} aspectClass="w-28 h-28" />
                    )}
                  </div>
                  <button onClick={async () => {
                      if (!sku.reference_image_url) return;
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
                          const sideView = views.find((v: { id: string }) => v.id === 'side')?.frontImageBase64 || views[0]?.frontImageBase64;
                          const topView = views.find((v: { id: string }) => v.id === 'top')?.frontImageBase64;
                          if (sideView) {
                            await onUpdate({
                              sketch_url: sideView,
                              ...(topView ? { sketch_top_url: topView } : {}),
                            } as Partial<SKU>);
                            if (topView) setSketchTopView(topView);
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
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/50 hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30 w-full">
                      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {stepLabel('generateFlat') || 'Generate Flat Sketch'}
                    </button>
                </div>

                {/* Sketch views */}
                {sku.category === 'CALZADO' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1.5">{stepLabel('sideProfile') || 'Side Profile'}</p>
                      {sku.sketch_url ? (
                        <div className="border border-carbon/[0.06] bg-white p-3">
                          <img src={sku.sketch_url} alt="Side profile" className="w-full h-auto object-contain max-h-[45vh]" />
                        </div>
                      ) : (
                        <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] h-48 flex items-center justify-center">
                          {generating ? <Loader2 className="h-4 w-4 animate-spin text-carbon/15" /> : <p className="text-[10px] text-carbon/15">{stepLabel('sideProfilePlaceholder') || 'Side profile'}</p>}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1.5">{stepLabel('topDown') || 'Top Down'}</p>
                      {sketchTopView ? (
                        <div className="border border-carbon/[0.06] bg-white p-3">
                          <img src={sketchTopView} alt="Top down" className="w-full h-auto object-contain max-h-[45vh]" />
                        </div>
                      ) : (
                        <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] h-48 flex items-center justify-center">
                          {generating ? <Loader2 className="h-4 w-4 animate-spin text-carbon/15" /> : <p className="text-[10px] text-carbon/15">{stepLabel('topDownPlaceholder') || 'Top-down view'}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1.5">{stepLabel('generatedSketch') || 'Generated Sketch'}</p>
                    {sku.sketch_url ? (
                      <div className="border border-carbon/[0.06] bg-white p-3 max-w-md">
                        <img src={sku.sketch_url} alt="Front view" className="w-full h-auto object-contain" />
                      </div>
                    ) : (
                      <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] h-48 max-w-md flex items-center justify-center">
                        <p className="text-[11px] text-carbon/15">{stepLabel('sketchWillAppear') || 'Sketch will appear here'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-carbon/[0.06]" />
                <span className="text-[10px] text-carbon/20 uppercase tracking-[0.15em]">{stepLabel('or') || 'or'}</span>
                <div className="flex-1 h-px bg-carbon/[0.06]" />
              </div>

              {/* Option B: AI proposes from scratch */}
              <div className="space-y-4">
                <p className="text-[11px] font-medium text-carbon/30 uppercase tracking-[0.15em]">{stepLabel('aiFromScratch') || 'AI Proposal'}</p>
                <p className="text-[12px] font-light text-carbon/45 leading-relaxed">{stepLabel('aiSketchDesc') || 'Aimily will propose sketch directions and generate visual flat sketches.'}</p>
                {!aiProposals && (
                  <button onClick={async () => {
                    setGenerating(true);
                    const result = await callDesignAI('sketch-suggest', { productType: sku.category, family: sku.family, concept: sku.notes || '', priceRange: `€${sku.pvp}` });
                    if (result?.proposals) setAiProposals(result.proposals.map((p: Record<string, unknown>) => ({ ...p, sketchUrl: undefined })));
                    setGenerating(false);
                  }} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30">
                    {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {stepLabel('proposeDirections') || 'Propose Directions'}
                  </button>
                )}
                {aiProposals?.map((p, idx) => (
                  <div key={idx} className="border border-carbon/[0.06] bg-white p-3 sm:p-4 flex items-start gap-3 sm:gap-4">
                    <div className="w-20 sm:w-28 shrink-0">
                      {p.sketchUrl ? (
                        <div className="border border-carbon/[0.06] aspect-square overflow-hidden bg-white"><img src={p.sketchUrl} alt="" className="w-full h-full object-contain" /></div>
                      ) : (
                        <button onClick={async () => {
                          setGeneratingSketchFor(idx);
                          const res = await fetch('/api/ai/freepik/sketch', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ description: `${p.title}: ${p.description}. ${p.silhouette}`, productType: sku.category, family: sku.family, skuName: sku.name, collectionPlanId }) });
                          if (res.ok) { const d = await res.json(); const url = d.images?.[0]?.url || d.images?.[0]?.originalUrl; if (url) setAiProposals(prev => prev?.map((x, i) => i === idx ? { ...x, sketchUrl: url } : x) || null); }
                          setGeneratingSketchFor(null);
                        }} disabled={generatingSketchFor !== null} className="w-full border border-dashed border-carbon/[0.08] aspect-square flex flex-col items-center justify-center gap-1 hover:border-carbon/15 disabled:opacity-30">
                          {generatingSketchFor === idx ? <Loader2 className="h-3.5 w-3.5 text-carbon/25 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 text-carbon/15" /><span className="text-[8px] text-carbon/20 uppercase">{stepLabel('generateSketch') || 'Generate'}</span></>}
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h4 className="text-sm font-light text-carbon">{p.title}</h4>
                      <p className="text-[11px] text-carbon/45 leading-relaxed">{p.description}</p>
                      <p className="text-[10px] text-carbon/25 italic">{p.silhouette}</p>
                      <div className="flex flex-wrap gap-1">{p.keyFeatures.map((f, i) => <span key={i} className="px-1.5 py-0.5 text-[8px] bg-carbon/[0.03] text-carbon/40">{f}</span>)}</div>
                      <button onClick={async () => { await onUpdate({ notes: `${p.title}\n${p.description}`, ...(p.sketchUrl ? { sketch_url: p.sketchUrl } : {}) }); }}
                        className="mt-1.5 px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors">
                        {stepLabel('accept') || 'Accept'}{p.sketchUrl ? ' + Sketch' : ''}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
            )}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => { if (notes !== (sku.notes || '')) onUpdate({ notes }); }}
              placeholder={stepLabel('sketchNotesPlaceholder') || 'Design notes...'} className="w-full h-12 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.12]" />
          </div>
        )}

        {/* ═══ STEP 2: COLOR-UP SHEET ═══ */}
        {activeStep === 1 && (() => {
          const defaultZones = getDefaultZones(sku.category);
          // expandedCw state is at component level to respect React hooks rules

          const ensureZones = (cw: SkuColorway): ColorwayZone[] => {
            if (cw.zones && cw.zones.length > 0) return cw.zones;
            // Migrate: create zones from defaults + existing hex_primary
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
            // Also update hex_primary from first zone for backward compat
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

          return (
          <div className="space-y-4">
            {sku.sketch_url && (
              <div className="flex items-center gap-3 p-2.5 bg-white border border-carbon/[0.04]">
                <div className="w-10 h-10 border border-carbon/[0.06] overflow-hidden shrink-0 bg-white"><img src={sku.sketch_url} alt="" className="w-full h-full object-contain" /></div>
                <p className="text-[10px] text-carbon/35">{stepLabel('sketchConfirmed') || 'Sketch confirmed'} — {stepLabel('colorUpDesc') || 'assign colors to each product zone'}</p>
              </div>
            )}

            {/* Existing colorways — expandable zone editor */}
            {(mode === 'free' || skuColorways.length > 0) && (
              <div className="space-y-3">
                {skuColorways.map((cw) => {
                  const zones = ensureZones(cw);
                  const isOpen = expandedCw === cw.id;
                  return (
                    <div key={cw.id} className="border border-carbon/[0.06] bg-white overflow-hidden">
                      {/* Colorway header */}
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-carbon/[0.01]" onClick={() => setExpandedCw(isOpen ? null : cw.id)}>
                        {/* Color strip preview — all zone colors */}
                        <div className="flex shrink-0 h-5 overflow-hidden border border-carbon/[0.06]">
                          {zones.map((z, i) => <div key={i} className="w-4 h-full" style={{ backgroundColor: z.hex }} />)}
                        </div>
                        <input value={cw.name} onClick={e => e.stopPropagation()} onChange={(e) => updateColorway(cw.id, { name: e.target.value })}
                          className="flex-1 text-[13px] font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.06] focus:border-carbon/[0.12] focus:outline-none" />
                        <select value={cw.status} onClick={e => e.stopPropagation()} onChange={(e) => updateColorway(cw.id, { status: e.target.value as SkuColorway['status'] })}
                          className="text-[9px] font-medium uppercase bg-transparent border border-carbon/[0.06] px-1.5 py-0.5 text-carbon/45 focus:outline-none">
                          <option value="proposed">Proposed</option><option value="sampled">Sampled</option><option value="approved">Approved</option><option value="production">Production</option>
                        </select>
                        <button onClick={(e) => { e.stopPropagation(); deleteColorway(cw.id); }} className="text-carbon/15 hover:text-[#A0463C]/50"><Trash2 className="h-3 w-3" /></button>
                        <Check className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180 text-carbon/30' : 'rotate-0 text-carbon/10'}`} />
                      </div>

                      {/* Zone grid — expanded */}
                      {isOpen && (
                        <div className="border-t border-carbon/[0.04] px-4 py-3 space-y-1.5">
                          <div className="grid grid-cols-[1fr_44px_120px_1fr] gap-x-3 gap-y-0 mb-1">
                            <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('zoneLabel') || 'Zone'}</span>
                            <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('colorLabel') || 'Color'}</span>
                            <span className="text-[8px] text-carbon/20 uppercase tracking-wider">Pantone</span>
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
                              <input value={z.pantone || ''} onChange={(e) => updateZone(cw.id, zi, 'pantone', e.target.value)}
                                placeholder="e.g. 19-4052 TCX" className="text-[10px] text-carbon/40 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />
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
                <button onClick={() => {
                  const zones = zonesToColorwayZones(defaultZones);
                  addColorway({ sku_id: sku.id, name: `Colorway ${skuColorways.length + 1}`, hex_primary: zones[0]?.hex || '#3B3B3B', hex_secondary: zones[1]?.hex || null as unknown as string, hex_accent: zones[2]?.hex || null as unknown as string, pantone_primary: null as unknown as string, pantone_secondary: null as unknown as string, material_swatch_url: null as unknown as string, status: 'proposed', position: skuColorways.length, zones } as Omit<SkuColorway, 'id' | 'created_at'>);
                }}
                  className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-carbon/[0.08] text-carbon/30 text-[9px] font-medium tracking-[0.08em] uppercase hover:border-carbon/15 w-full justify-center">
                  <Plus className="h-2.5 w-2.5" /> {stepLabel('addColorway') || 'Add Colorway'}
                </button>
              </div>
            )}

            {/* AI mode: Colorway proposals with AI-colorized sketch previews */}
            {mode === 'ai' && (
              <div className="space-y-4">
                {/* Step 1: Generate AI colorway proposals + colorize each */}
                {!aiColorways && !generating && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-carbon/40 leading-relaxed">
                      {stepLabel('aiColorProposalDesc') || 'Aimily will propose colorway combinations and colorize your sketch with each one.'}
                    </p>
                    <button onClick={async () => {
                      setGenerating(true);
                      try {
                        const result = await callDesignAI('color-suggest', { productType: sku.category, family: sku.family, concept: sku.notes || '' });
                        if (result?.colorways) {
                          // Set proposals immediately (show cards with spinners)
                          const proposals = result.colorways.map((cw: Record<string, unknown>) => ({ ...cw, colorizedUrl: null }));
                          setAiColorways(proposals);

                          // Colorize each in parallel (~$0.007/image × 4 = $0.028 total)
                          if (sku.sketch_url) {
                            const colorizePromises = proposals.slice(0, 4).map(async (cw: any, i: number) => {
                              try {
                                const zoneColors = defaultZones.map((z, zi) => ({ zone: z.zone, hex: cw.colors[zi % cw.colors.length] || z.defaultHex }));
                                const res = await fetch('/api/ai/colorize-sketch', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    sketch_url: sku.sketch_url,
                                    colorway_name: cw.name,
                                    color_description: cw.description,
                                    zone_colors: zoneColors,
                                    category: sku.category,
                                    product_name: sku.name,
                                    family: sku.family,
                                    collectionPlanId,
                                  }),
                                });
                                if (res.ok) {
                                  const { imageUrl } = await res.json();
                                  if (imageUrl) {
                                    setAiColorways(prev => prev?.map((p: any, pi: number) => pi === i ? { ...p, colorizedUrl: imageUrl } : p) || null);
                                  }
                                }
                              } catch { /* colorization failed for this one — show swatches only */ }
                            });
                            await Promise.all(colorizePromises);
                          }
                        }
                      } finally {
                        setGenerating(false);
                      }
                    }} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30">
                      <Sparkles className="h-3 w-3" />
                      {stepLabel('proposeColorways') || 'Propose Colorways'}
                    </button>
                  </div>
                )}

                {generating && !aiColorways && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-carbon/20" />
                    <p className="text-[11px] text-carbon/25">{stepLabel('generatingColorways') || 'Generating colorway proposals...'}</p>
                  </div>
                )}

                {/* Step 2: Show proposals with AI-colorized previews */}
                {aiColorways && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aiColorways.map((cw, idx) => (
                      <div key={idx} className="border border-carbon/[0.06] bg-white overflow-hidden">
                        {/* Colorized preview */}
                        <div className="aspect-[4/3] bg-carbon/[0.02] overflow-hidden">
                          {(cw as any).colorizedUrl ? (
                            <img src={(cw as any).colorizedUrl} alt={cw.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-carbon/15" />
                              <span className="text-[9px] text-carbon/20">{stepLabel('colorizing') || 'Colorizing...'}</span>
                            </div>
                          )}
                        </div>
                        {/* Info + swatches + accept */}
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-light text-carbon">{cw.name}</p>
                            <div className="flex gap-0.5 shrink-0">{cw.colors.map((hex: string, i: number) => <div key={i} className="w-5 h-5 border border-carbon/[0.06]" style={{ backgroundColor: hex }} />)}</div>
                          </div>
                          <p className="text-[10px] text-carbon/35 leading-relaxed">{cw.description}</p>
                          <span className="text-[8px] text-carbon/20 uppercase tracking-wider block">{cw.commercialRole}</span>
                          <button onClick={async () => {
                            const zones = defaultZones.map((z, i) => ({ zone: z.zone, hex: cw.colors[i % cw.colors.length] || z.defaultHex }));
                            await addColorway({ sku_id: sku.id, name: cw.name, hex_primary: cw.primary, hex_secondary: cw.colors[1] || null as unknown as string, hex_accent: cw.colors[2] || null as unknown as string, pantone_primary: null as unknown as string, pantone_secondary: null as unknown as string, material_swatch_url: null as unknown as string, status: 'proposed', position: skuColorways.length, zones } as Omit<SkuColorway, 'id' | 'created_at'>);
                            toast(stepLabel('colorwayAccepted') || `${cw.name} added`, 'success');
                          }}
                            className="w-full px-3 py-2 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors text-center">
                            {stepLabel('accept') || 'Accept'} {cw.name}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

          // Get zone colors from first colorway for visual reference
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

          return (
          <div className="space-y-4">
            {/* Context bar */}
            <div className="flex items-center gap-2.5 p-2.5 bg-white border border-carbon/[0.04]">
              {sku.sketch_url && <div className="w-8 h-8 border border-carbon/[0.06] overflow-hidden shrink-0 bg-white"><img src={sku.sketch_url} alt="" className="w-full h-full object-contain" /></div>}
              {firstCw && cwZones.length > 0 && (
                <div className="flex shrink-0 h-4 overflow-hidden border border-carbon/[0.06]">
                  {cwZones.map((z, i) => <div key={i} className="w-3 h-full" style={{ backgroundColor: z.hex }} />)}
                </div>
              )}
              <p className="text-[10px] text-carbon/35">{skuColorways.length} {skuColorways.length === 1 ? 'colorway' : 'colorways'} — {stepLabel('bomDesc') || 'assign materials to each zone'}</p>
            </div>

            {/* Zone-based BOM table */}
            {(mode === 'free' || matZones.some(m => m.material)) && (
              <div className="space-y-1.5">
                {/* Headers */}
                <div className="grid grid-cols-[20px_minmax(80px,1fr)_minmax(100px,1.5fr)_minmax(80px,1fr)_minmax(60px,0.7fr)_minmax(70px,0.8fr)_20px] gap-x-2 px-3">
                  <span />
                  <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('zoneLabel') || 'Zone'}</span>
                  <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('materialLabel') || 'Material'}</span>
                  <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('compositionLabel') || 'Composition'}</span>
                  <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('weightLabel') || 'Weight'}</span>
                  <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('finishLabel') || 'Finish'}</span>
                  <span />
                </div>

                {matZones.map((mz, idx) => {
                  const hex = zoneColor(mz.zone);
                  return (
                    <div key={idx} className="grid grid-cols-[20px_minmax(80px,1fr)_minmax(100px,1.5fr)_minmax(80px,1fr)_minmax(60px,0.7fr)_minmax(70px,0.8fr)_20px] gap-x-2 items-center px-3 py-2 bg-white border border-carbon/[0.04]">
                      {/* Color dot from colorway */}
                      <div>{hex ? <div className="w-4 h-4 border border-carbon/[0.08]" style={{ backgroundColor: hex }} /> : <div className="w-4 h-4 border border-dashed border-carbon/[0.06]" />}</div>

                      <input value={mz.zone} onChange={(e) => updateMatZone(idx, 'zone', e.target.value)}
                        className="text-[11px] font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.06] focus:outline-none focus:border-carbon/[0.12]" />

                      <input value={mz.material} onChange={(e) => updateMatZone(idx, 'material', e.target.value)}
                        placeholder="e.g. Nubuck leather" className="text-[11px] text-carbon/50 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />

                      <input value={mz.composition || ''} onChange={(e) => updateMatZone(idx, 'composition', e.target.value)}
                        placeholder="100% bovine" className="text-[10px] text-carbon/35 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />

                      <input value={mz.weight || ''} onChange={(e) => updateMatZone(idx, 'weight', e.target.value)}
                        placeholder="1.4mm" className="text-[10px] text-carbon/35 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />

                      <input value={mz.finish || ''} onChange={(e) => updateMatZone(idx, 'finish', e.target.value)}
                        placeholder="Tumbled" className="text-[10px] text-carbon/35 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />

                      <button onClick={() => removeMatZone(idx)} className="text-carbon/10 hover:text-[#A0463C]/40"><X className="h-3 w-3" /></button>
                    </div>
                  );
                })}

                <button onClick={addMatZone}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.08] text-carbon/30 text-[9px] font-medium tracking-[0.08em] uppercase hover:border-carbon/15 w-full justify-center">
                  <Plus className="h-2.5 w-2.5" /> {stepLabel('addZone') || 'Add Zone'}
                </button>

                {/* Zones without material = factory discretion note */}
                {matZones.some(m => !m.material) && (
                  <p className="text-[9px] text-carbon/20 italic px-1">{stepLabel('emptyZonesNote') || 'Empty zones will be noted as "factory discretion" in the tech pack.'}</p>
                )}
              </div>
            )}

            {/* AI material proposals */}
            {mode === 'ai' && !aiMaterials && (
              <button onClick={async () => {
                setGenerating(true);
                const zoneContext = matZones.map(m => m.zone).join(', ');
                const colorwayContext = skuColorways.map(c => {
                  const zones = c.zones && c.zones.length > 0 ? c.zones : [];
                  return `${c.name}: ${zones.map(z => `${z.zone}=${z.hex}`).join(', ')}`;
                }).join(' | ');
                const result = await callDesignAI('materials-suggest', {
                  productType: sku.category || sku.type || '',
                  subcategory: sku.name || '',
                  family: sku.family,
                  concept: sku.notes || '',
                  priceRange: `€${sku.pvp}`,
                  designDirection: `${sku.name} — ${sku.family}. ${sku.notes || ''}`,
                  colorways: colorwayContext,
                  zones: zoneContext,
                });
                if (result?.materials) setAiMaterials(result.materials);
                setGenerating(false);
              }} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30">
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {stepLabel('proposeMaterials') || 'Propose Materials'}
              </button>
            )}
            {aiMaterials?.map((mat, idx) => (
              <div key={idx} className="border border-carbon/[0.06] bg-white p-3.5 flex items-start gap-3">
                <div className="flex-1">
                  <span className="text-[8px] font-semibold tracking-[0.1em] uppercase text-carbon/25">{mat.type}</span>
                  <p className="text-[12px] font-light text-carbon mt-0.5">{mat.name}</p>
                  <p className="text-[10px] text-carbon/35 mt-0.5">{mat.description}</p>
                  {mat.sustainability && <p className="text-[9px] text-[#2d6a4f]/50 mt-0.5 italic">{mat.sustainability}</p>}
                </div>
                <button onClick={() => {
                  // Find matching zone or add to first empty
                  const updated = [...matZones];
                  const emptyIdx = updated.findIndex(m => !m.material);
                  if (emptyIdx >= 0) {
                    updated[emptyIdx] = { ...updated[emptyIdx], material: mat.name, composition: mat.description };
                  } else {
                    updated.push({ zone: mat.type || 'Other', material: mat.name, composition: mat.description });
                  }
                  onUpdate({ material_zones: updated } as Partial<SKU>);
                }}
                  className="px-2.5 py-1 text-[9px] font-medium uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors shrink-0">{stepLabel('accept') || 'Accept'}</button>
              </div>
            ))}
          </div>
          );
        })()}

        {/* ═══ STEP 4: TECH PACK ═══ */}
        {activeStep === 3 && (() => {
          const primaryCw = skuColorways[0];
          const cwZones = primaryCw?.zones?.length ? primaryCw.zones : [];
          const mZones = sku.material_zones || [];

          // Callout positions for side profile (% from top-left)
          const sideCallouts: Record<string, { top: string; left: string }> = {
            'Upper': { top: '35%', left: '45%' },
            'Tongue': { top: '15%', left: '55%' },
            'Lining': { top: '25%', left: '65%' },
            'Midsole': { top: '72%', left: '50%' },
            'Outsole': { top: '85%', left: '50%' },
            'Laces': { top: '20%', left: '45%' },
            'Heel Counter': { top: '40%', left: '85%' },
            'Eyelets': { top: '28%', left: '40%' },
            'Branding': { top: '55%', left: '30%' },
          };
          // Callout positions for top-down view
          const topCallouts: Record<string, { top: string; left: string }> = {
            'Upper': { top: '50%', left: '30%' },
            'Tongue': { top: '25%', left: '50%' },
            'Lining': { top: '20%', left: '70%' },
            'Midsole': { top: '80%', left: '30%' },
            'Outsole': { top: '90%', left: '50%' },
            'Laces': { top: '35%', left: '50%' },
            'Heel Counter': { top: '85%', left: '70%' },
            'Eyelets': { top: '30%', left: '35%' },
            'Branding': { top: '60%', left: '50%' },
          };

          return (
          <div className="space-y-0">
            {/* ── Tech Pack Sheet ── */}
            <div className="bg-white border border-carbon/[0.08]">
              {/* Header bar */}
              <div className="border-b border-carbon/[0.08] px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-light text-carbon tracking-tight">{sku.name}</h3>
                    <p className="text-[10px] text-carbon/30 mt-0.5">{sku.family} · Drop {sku.drop_number} · {sku.category}</p>
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
                {/* Side Profile */}
                <div className="border-r border-carbon/[0.08] p-4">
                  <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('sideProfile') || 'Side Profile'}</p>
                  {sku.sketch_url ? (
                    <div className="relative">
                      <img src={sku.sketch_url} alt="Side profile" className="w-full object-contain" />
                      {/* Numbered callouts */}
                      {cwZones.map((z, i) => {
                        const pos = sideCallouts[z.zone];
                        if (!pos) return null;
                        return (
                          <div key={i} className="absolute flex items-center justify-center w-4 h-4 rounded-full bg-carbon text-crema text-[7px] font-bold shadow-sm" style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}>
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-[10px] text-carbon/15">No sketch</div>
                  )}
                </div>
                {/* Top Down */}
                <div className="p-4">
                  <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('topDown') || 'Top Down'}</p>
                  {(sku.sketch_top_url || sketchTopView) ? (
                    <div className="relative">
                      <img src={sku.sketch_top_url || sketchTopView || ''} alt="Top down" className="w-full object-contain" />
                      {cwZones.map((z, i) => {
                        const pos = topCallouts[z.zone];
                        if (!pos) return null;
                        return (
                          <div key={i} className="absolute flex items-center justify-center w-4 h-4 rounded-full bg-carbon text-crema text-[7px] font-bold shadow-sm" style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}>
                            {i + 1}
                          </div>
                        );
                      })}
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
                    {cwZones.map((z, i) => {
                      const mat = mZones.find(m => m.zone === z.zone);
                      return (
                        <tr key={i} className="border-b border-carbon/[0.03]">
                          <td className="py-1.5 pr-2 text-[9px] font-semibold text-carbon/40">{i + 1}</td>
                          <td className="py-1.5 pr-2"><div className="w-3.5 h-3.5 border border-carbon/[0.08]" style={{ backgroundColor: z.hex }} /></td>
                          <td className="py-1.5 pr-3 text-carbon/60 font-medium">{z.zone}</td>
                          <td className="py-1.5 pr-3 text-carbon/30">{z.pantone || '—'}</td>
                          <td className="py-1.5 pr-3 text-carbon/50">{mat?.material || <span className="text-carbon/15 italic">Factory discretion</span>}</td>
                          <td className="py-1.5 pr-3 text-carbon/35">{mat?.composition || '—'}</td>
                          <td className="py-1.5 pr-3 text-carbon/35">{mat?.weight || '—'}</td>
                          <td className="py-1.5 text-carbon/35">{mat?.finish || '—'}</td>
                        </tr>
                      );
                    })}
                    {cwZones.length === 0 && (
                      <tr><td colSpan={8} className="py-4 text-center text-carbon/15">{stepLabel('noZonesConfigured') || 'No zones configured — go to Colorways step'}</td></tr>
                    )}
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

            {/* ── Product Render — AI realistic photo from sketch + colors + materials ── */}
            {sku.sketch_url && skuColorways.length > 0 && (
              <div className="border border-carbon/[0.06] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-carbon/30 uppercase tracking-[0.15em]">{stepLabel('productRender') || 'Product Render'}</p>
                    <p className="text-[11px] text-carbon/40 mt-0.5">{stepLabel('renderDesc') || 'Generate a photorealistic render from your sketch, colors and materials'}</p>
                  </div>
                </div>

                {/* Angle selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-carbon/25 uppercase tracking-wider">{stepLabel('angle') || 'Angle'}:</span>
                  {(['front', 'three_quarter', 'side', 'back'] as const).map(a => {
                    const labels = { front: 'Front', three_quarter: '3/4', side: 'Side', back: 'Back' };
                    const hasRender = !!renderUrls[a];
                    return (
                      <button
                        key={a}
                        onClick={() => {
                          setRenderAngle(a);
                          if (renderUrls[a]) setRenderUrl(renderUrls[a]);
                        }}
                        className={`px-3 py-1.5 text-[10px] font-medium tracking-[0.06em] uppercase border transition-colors relative ${
                          renderAngle === a
                            ? 'bg-carbon text-crema border-carbon'
                            : 'border-carbon/[0.08] text-carbon/40 hover:border-carbon/20'
                        }`}
                      >
                        {labels[a]}
                        {hasRender && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                      </button>
                    );
                  })}
                </div>

                {/* Generate button */}
                <button
                  onClick={async () => {
                    setRenderGenerating(true);
                    try {
                      const primaryCw = skuColorways[0];
                      const colorDesc = skuColorways.map(c => `${c.name} (${c.hex_primary})`).join(', ');
                      const materialDesc = materials.map(m => m.name + (m.gradingNotes ? `: ${m.gradingNotes}` : '')).join('. ');
                      // Zone-based data for richer prompts
                      const colorZones = primaryCw?.zones?.length ? primaryCw.zones.map(z => ({ zone: z.zone, hex: z.hex })) : [];
                      const colorHexes = colorZones.length > 0
                        ? colorZones.map(z => ({ hex: z.hex, weight: 0.5 }))
                        : skuColorways.map(c => ({ hex: c.hex_primary, weight: 0.5 }));
                      const matZones = sku.material_zones?.filter(m => m.material) || [];
                      const materialZones = matZones.map(m => ({ zone: m.zone, material: m.material, finish: m.finish }));
                      const res = await fetch('/api/ai/freepik/render', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sketch_base64: sku.sketch_url,
                          collectionPlanId,
                          angle: renderAngle,
                          design_context: {
                            productName: `${sku.name} - ${primaryCw?.name || ''}`,
                            productType: `${sku.family} (${sku.category})`,
                            colorway: colorDesc,
                            colorHexes,
                            colorZones,
                            materialZones,
                            materials: materialDesc || 'premium materials',
                            designNotes: sku.notes || '',
                          },
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        const url = data.images?.[0]?.url || data.images?.[0]?.originalUrl;
                        if (url) {
                          setRenderUrl(url);
                          const updated = { ...renderUrls, [renderAngle]: url };
                          setRenderUrls(updated);
                          // Save primary render_url (first generated) + all angles
                          const isFirst = !sku.render_url && Object.keys(renderUrls).length === 0;
                          await onUpdate({
                            ...(isFirst ? { render_url: url } : {}),
                            render_urls: updated,
                          } as Partial<SKU>);
                        }
                      } else {
                        const err = await res.json().catch(() => ({}));
                        toast(`Render failed: ${err.error || 'Unknown error'}`, 'error');
                      }
                    } finally {
                      setRenderGenerating(false);
                    }
                  }}
                  disabled={renderGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30 w-fit"
                >
                  {renderGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {renderUrls[renderAngle]
                    ? (stepLabel('regenerateAngle') || 'Regenerate')
                    : (stepLabel('generateRender') || 'Generate Render')
                  }
                </button>

                {renderGenerating && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-carbon/20" />
                    <p className="text-[11px] text-carbon/25">{stepLabel('renderGenerating') || 'Generating photorealistic render...'}</p>
                  </div>
                )}

                {/* Render gallery — show all generated angles */}
                {Object.keys(renderUrls).length > 0 && !renderGenerating && (
                  <div className="space-y-3">
                    {/* Active angle large */}
                    {renderUrl && (
                      <div className="border border-carbon/[0.06] overflow-hidden bg-white aspect-square max-w-md">
                        <img src={renderUrl} alt={`Render ${renderAngle}`} className="w-full h-full object-contain" />
                      </div>
                    )}
                    {/* Thumbnails of all generated angles */}
                    {Object.keys(renderUrls).length > 1 && (
                      <div className="flex gap-2">
                        {Object.entries(renderUrls).map(([angle, url]) => (
                          <button
                            key={angle}
                            onClick={() => { setRenderAngle(angle as typeof renderAngle); setRenderUrl(url); }}
                            className={`w-16 h-16 border overflow-hidden ${
                              renderAngle === angle ? 'border-carbon ring-1 ring-carbon' : 'border-carbon/[0.06]'
                            }`}
                          >
                            <img src={url} alt={angle} className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
