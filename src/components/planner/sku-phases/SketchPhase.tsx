'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Sparkles, Loader2, Plus, Trash2,
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
  /** When set by EvolutionStrip, forces the active sub-step (0=sketch, 1=colorways, 2=materials, 3=techpack) */
  evolutionStep?: 'sketch' | 'colorways' | 'render3d';
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
  const materials = (designData.patterns[sku.id] || []) as { name: string; url: string; fileType: string; gradingNotes: string }[];

  const evolutionStepMap: Record<string, number> = { sketch: 0, colorways: 1, render3d: 3 };
  const [activeStep, setActiveStep] = useState(() => evolutionStep ? (evolutionStepMap[evolutionStep] ?? 0) : 0);

  // Sync with EvolutionStrip when it changes
  useEffect(() => {
    if (evolutionStep && evolutionStepMap[evolutionStep] !== undefined) {
      setActiveStep(evolutionStepMap[evolutionStep]);
    }
  }, [evolutionStep]);
  const [modes, setModes] = useState<Record<string, InputMode>>({ sketch: 'free', colorways: 'free', materials: 'free', techpack: 'free' });
  const [notes, setNotes] = useState(sku.notes || '');

  // AI state
  const [generating, setGenerating] = useState(false);
  const [sketchTopView, setSketchTopView] = useState<string | null>(sku.sketch_top_url || null);
  const firstCwId = colorways.filter(c => c.sku_id === sku.id)[0]?.id || null;
  const [expandedCw, setExpandedCw] = useState<string | null>(firstCwId);
  const [aiColorways, setAiColorways] = useState<{ name: string; colors: string[]; description: string; primary: string; commercialRole: string }[] | null>(null);


  // Zone Editor (no state needed — renders immediately when sketch exists)

  // Render state removed — colorized sketch from colorway proposals is used as render_url

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
      {/* ── Sub-stepper: visible pills ── */}
      {/* Hidden for sketch (Drawing is own EvolutionStrip step) and render3d (Tech Pack is own step) */}
      {/* For colorways: show only Colorways + Materials (skip Drawing, skip Tech Pack) */}
      {evolutionStep !== 'sketch' && evolutionStep !== 'render3d' && (
        <div className="flex items-center gap-0">
          {STEPS.filter(s => evolutionStep === 'colorways' ? s.id !== 'sketch' : true).map((step) => {
            const idx = STEPS.findIndex(s => s.id === step.id);
            const isActive = idx === activeStep;
            const isConfirmed = confirmedSteps.has(idx);
            const isPast = idx < activeStep;
            const displayIdx = evolutionStep === 'colorways' ? (idx === 1 ? 1 : 2) : idx + 1;
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
            {/* Reference image — compact, always on top */}
            <div className="flex items-center gap-3 p-2.5 bg-white border border-carbon/[0.04]">
              {sku.reference_image_url ? (
                <div className="w-12 h-12 border border-carbon/[0.06] overflow-hidden shrink-0 bg-white">
                  <img src={sku.reference_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="shrink-0">
                  <ImageUploadArea imageUrl={undefined} uploading={uploading === 'reference_image_url'}
                    placeholder={stepLabel('uploadReference') || 'Ref'}
                    onUpload={(file) => onImageUpload(file, 'reference_image_url' as 'sketch_url')}
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
                      const sideView = views.find((v: { id: string }) => v.id === 'side')?.frontImageBase64 || views[0]?.frontImageBase64;
                      const topView = views.find((v: { id: string }) => v.id === 'top')?.frontImageBase64;
                      if (sideView) {
                        await onUpdate({
                          sketch_url: sideView,
                          ...(topView ? { sketch_top_url: topView } : {}),
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
                  {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {generating ? (stepLabel('generatingSketch') || 'Generating sketch...') : (stepLabel('generateFlat') || 'Generate Flat Sketch from Reference')}
              </button>
            )}

            {generating && mode === 'ai' && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-carbon/20" />
                <p className="text-[11px] text-carbon/25">{stepLabel('generatingSketch') || 'Generating flat sketch...'}</p>
              </div>
            )}

            {/* Sketch views — SAME layout for both modes */}
            {sku.category === 'CALZADO' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{stepLabel('sideProfile') || 'Side Profile'}</p>
                  {sku.sketch_url ? (
                    <div className="border border-carbon/[0.06] bg-white p-3 relative group">
                      <img src={sku.sketch_url} alt="Side profile" className="w-full h-auto object-contain max-h-[45vh]" />
                      {mode === 'free' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors cursor-pointer">
                            {stepLabel('replace') || 'Replace'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f, 'sketch_url'); }} />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : mode === 'free' ? (
                    <ImageUploadArea imageUrl={undefined} uploading={uploading === 'sketch_url'}
                      placeholder={stepLabel('uploadSideSketch') || 'Upload side profile sketch'}
                      onUpload={(file) => onImageUpload(file, 'sketch_url')}
                      onRemove={() => {}} aspectClass="aspect-[4/5] max-h-[45vh]" />
                  ) : (
                    <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/5] max-h-[45vh] flex items-center justify-center">
                      <p className="text-[10px] text-carbon/15">{stepLabel('sideProfilePlaceholder') || 'Side profile'}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{stepLabel('topDown') || 'Top Down'}</p>
                  {(sku.sketch_top_url || sketchTopView) ? (
                    <div className="border border-carbon/[0.06] bg-white p-3 relative group">
                      <img src={sku.sketch_top_url || sketchTopView || ''} alt="Top down" className="w-full h-auto object-contain max-h-[45vh]" />
                      {mode === 'free' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors cursor-pointer">
                            {stepLabel('replace') || 'Replace'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f, 'sketch_url'); }} />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : mode === 'free' ? (
                    <ImageUploadArea imageUrl={undefined} uploading={uploading === 'sketch_top_url'}
                      placeholder={stepLabel('uploadTopSketch') || 'Upload top-down sketch'}
                      onUpload={(file) => onImageUpload(file, 'sketch_url')}
                      onRemove={() => {}} aspectClass="aspect-[4/5] max-h-[45vh]" />
                  ) : (
                    <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/5] max-h-[45vh] flex items-center justify-center">
                      <p className="text-[10px] text-carbon/15">{stepLabel('topDownPlaceholder') || 'Top-down view'}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Non-footwear: single sketch view */
              <div className="space-y-1.5">
                <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{stepLabel('designSketch') || 'Design Sketch'}</p>
                {sku.sketch_url ? (
                  <div className="border border-carbon/[0.06] bg-white p-3 max-w-md relative group">
                    <img src={sku.sketch_url} alt="Sketch" className="w-full h-auto object-contain" />
                    {mode === 'free' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <label className="px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors cursor-pointer">
                          {stepLabel('replace') || 'Replace'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f, 'sketch_url'); }} />
                        </label>
                      </div>
                    )}
                  </div>
                ) : mode === 'free' ? (
                  <ImageUploadArea imageUrl={sku.sketch_url} uploading={uploading === 'sketch_url'}
                    placeholder={stepLabel('uploadSketch') || 'Upload your sketch'}
                    onUpload={(file) => onImageUpload(file, 'sketch_url')}
                    onRemove={() => onUpdate({ sketch_url: undefined })} aspectClass="aspect-[4/5] max-h-[55vh] max-w-md" />
                ) : (
                  <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/5] max-h-[55vh] max-w-md flex items-center justify-center">
                    <p className="text-[11px] text-carbon/15">{stepLabel('sketchWillAppear') || 'Sketch will appear here'}</p>
                  </div>
                )}
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

          // Colorize function — shared between manual description and AI proposals
          const colorizeProposals = async (colorways: any[]) => {
            const proposals = colorways.map((cw: any) => ({ ...cw, colorizedUrl: null }));
            setAiColorways(proposals);

            if (sku.sketch_url) {
              const promises = proposals.slice(0, 4).map(async (cw: any, i: number) => {
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
                } catch { /* colorization failed — show swatches only */ }
              });
              await Promise.all(promises);
            }
          };

          return (
          <div className="space-y-4">
            {/* Sketch + color direction */}
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
              {/* Sketch preview — prominent */}
              {sku.sketch_url ? (
                <div className="space-y-1.5">
                  <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{stepLabel('currentSketch') || 'Sketch'}</p>
                  <div className="border border-carbon/[0.06] bg-white p-2">
                    <img src={sku.sketch_url} alt="" className="w-full h-auto object-contain" />
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-square flex items-center justify-center">
                  <p className="text-[9px] text-carbon/15 text-center px-2">{stepLabel('completeSketchFirst') || 'Complete sketch step first'}</p>
                </div>
              )}

              {/* Color input */}
              <div className="space-y-3">
                {mode === 'free' ? (
                  /* MANUAL: describe colors → AI generates 4 options */
                  <div className="space-y-3">
                    <p className="text-[11px] text-carbon/40 leading-relaxed">
                      {'Describe the colors you want for this product. Aimily will generate 4 colorized versions of your sketch based on your description.'}
                    </p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={() => { if (notes !== (sku.notes || '')) onUpdate({ notes }); }}
                      placeholder={'e.g. "Black leather upper with white midsole and red accents on the tongue"'}
                      className="w-full h-20 p-3 bg-white border border-carbon/[0.06] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.12]"
                    />
                    <button onClick={async () => {
                    if (!notes.trim()) {
                      toast(stepLabel('describeFirst') || 'Describe the colors you want first', 'warning');
                      return;
                    }
                    setGenerating(true);
                    try {
                      const result = await callDesignAI('color-suggest', {
                        productType: sku.category, family: sku.family,
                        concept: notes,
                        designDirection: notes,
                      });
                      if (result?.colorways && result.colorways.length > 0) {
                        // Show cards immediately, colorize in background
                        setGenerating(false);
                        colorizeProposals(result.colorways);
                      } else {
                        toast('No colorways returned — try a more detailed description', 'warning');
                        setGenerating(false);
                      }
                    } catch (err) {
                      console.error('[ManualColor]', err);
                      toast('Failed to generate colorways', 'error');
                      setGenerating(false);
                    }
                  }} disabled={generating || !notes.trim()}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-30 self-end">
                    {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {stepLabel('generateColors') || 'Generate'}
                  </button>
                  </div>
                ) : (
                  /* AI: auto-propose colorways freely */
                  <div className="space-y-3">
                    {!aiColorways && !generating && (
                      <>
                        <p className="text-[11px] text-carbon/40 leading-relaxed">
                          {stepLabel('aiColorProposalDesc') || 'Aimily will propose colorway combinations inspired by Sanzo Wada and colorize your sketch with each one.'}
                        </p>
                        <button onClick={async () => {
                          setGenerating(true);
                          try {
                            const result = await callDesignAI('color-suggest', { productType: sku.category, family: sku.family, concept: sku.notes || '' });
                            if (result?.colorways) {
                              setGenerating(false);
                              colorizeProposals(result.colorways);
                            } else {
                              setGenerating(false);
                            }
                          } catch {
                            setGenerating(false);
                          }
                        }} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30">
                          <Sparkles className="h-3 w-3" />
                          {stepLabel('proposeColorways') || 'Propose Colorways'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Loading state */}
            {generating && !aiColorways && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-carbon/20" />
                <p className="text-[11px] text-carbon/25">{stepLabel('generatingColorways') || 'Generating colorway proposals...'}</p>
              </div>
            )}

            {/* ── Colorized proposals grid — SAME for both modes ── */}
            {aiColorways && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aiColorways.map((cw, idx) => (
                  <div key={idx} className="border border-carbon/[0.06] bg-white overflow-hidden">
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
                        // Save colorized image as render_url for Tech Pack
                        if ((cw as any).colorizedUrl) {
                          await onUpdate({ render_url: (cw as any).colorizedUrl } as Partial<SKU>);
                        }
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
                          <option value="proposed">Proposed</option><option value="sampled">Sampled</option><option value="approved">Approved</option><option value="production">Production</option>
                        </select>
                        <button onClick={(e) => { e.stopPropagation(); deleteColorway(cw.id); }} className="text-carbon/15 hover:text-[#A0463C]/50"><Trash2 className="h-3 w-3" /></button>
                        <Check className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180 text-carbon/30' : 'rotate-0 text-carbon/10'}`} />
                      </div>
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

          // AI auto-fill: replaces entire table at once
          const autoFillMaterials = async () => {
            setGenerating(true);
            try {
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
              if (result?.materials && result.materials.length > 0) {
                // Map AI suggestions to zones
                const filled = matZones.map(mz => {
                  const suggestion = result.materials.find((m: any) =>
                    m.type?.toLowerCase().includes(mz.zone.toLowerCase()) ||
                    mz.zone.toLowerCase().includes(m.type?.toLowerCase() || '')
                  ) || result.materials.find((m: any) => !matZones.some(existing => existing.material && existing.zone.toLowerCase().includes(m.type?.toLowerCase() || '')));
                  if (suggestion && !mz.material) {
                    return { ...mz, material: suggestion.name, composition: suggestion.description || '', finish: suggestion.sustainability || '' };
                  }
                  return mz;
                });
                // If any zones still empty, fill from remaining suggestions
                const usedNames = new Set(filled.filter(m => m.material).map(m => m.material));
                const remaining = result.materials.filter((m: any) => !usedNames.has(m.name));
                let remainIdx = 0;
                const finalFilled = filled.map(mz => {
                  if (!mz.material && remainIdx < remaining.length) {
                    const s = remaining[remainIdx++];
                    return { ...mz, material: s.name, composition: s.description || '' };
                  }
                  return mz;
                });
                onUpdate({ material_zones: finalFilled } as Partial<SKU>);
                toast('Materials suggested — review and edit as needed', 'success');
              } else {
                toast('No material suggestions returned', 'warning');
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
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-carbon/40">
                    {mode === 'free'
                      ? 'Define materials for each product zone. Specify material name and finish.'
                      : 'AI will suggest materials based on your product type, price point, and design direction.'}
                  </p>
                  {mode === 'ai' && (
                    <button onClick={autoFillMaterials} disabled={generating}
                      className="shrink-0 flex items-center gap-2 px-4 py-2 bg-carbon text-crema text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-30">
                      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {'Suggest Materials'}
                    </button>
                  )}
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
                        <input value={mz.material} onChange={(e) => updateMatZone(idx, 'material', e.target.value)}
                          placeholder="e.g. Nubuck leather" className="text-[11px] text-carbon/50 bg-transparent border-b border-carbon/[0.04] focus:outline-none focus:border-carbon/[0.12]" />
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
                    <div className="border-r border-carbon/[0.08] p-4">
                      <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('sideProfile') || 'Side Profile'}{sku.render_url ? ' (colored)' : ''}</p>
                      {(sku.render_url || sku.sketch_url) ? (
                        <div className="relative">
                          <img src={sku.render_url || sku.sketch_url} alt="Side profile" className="w-full object-contain" />
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-[10px] text-carbon/15">No sketch</div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('topDown') || 'Top Down'}</p>
                      {(sku.sketch_top_url || sketchTopView) ? (
                        <div className="relative">
                          <img src={sku.sketch_top_url || sketchTopView || ''} alt="Top down" className="w-full object-contain" />
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
              </>
            )}

            {/* ── Product Visualization ── */}
            {sku.render_url && (
              <div className="border border-carbon/[0.06] bg-white p-5 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-carbon/30 uppercase tracking-[0.15em]">{'Product Visualization'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Colorized sketch */}
                  <div className="space-y-1.5">
                    <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{'Colored Sketch'}</p>
                    <div className="border border-carbon/[0.06] bg-white overflow-hidden">
                      <img src={sku.render_url} alt="Colorized sketch" className="w-full h-auto object-contain" />
                    </div>
                  </div>
                  {/* 3D Render */}
                  <div className="space-y-1.5">
                    <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{'3D Render'}</p>
                    {(sku.render_urls as Record<string, string>)?.['3d'] ? (
                      <div className="space-y-2">
                        <div className="border border-carbon/[0.06] bg-white overflow-hidden">
                          <img src={(sku.render_urls as Record<string, string>)['3d']} alt="3D render" className="w-full h-auto object-contain" />
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
                          {generating ? <><Loader2 className="h-3 w-3 animate-spin" /> {'Regenerating...'}</> : <><RefreshCw className="h-3 w-3" /> {'Regenerate 3D'}</>}
                        </button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/3] flex flex-col items-center justify-center gap-3">
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-carbon/15" />
                            <span className="text-[9px] text-carbon/20">{'Generating 3D render...'}</span>
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
                            <Sparkles className="h-3 w-3" /> {'Generate 3D Render'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
