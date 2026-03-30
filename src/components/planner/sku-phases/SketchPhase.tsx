'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Sparkles, Loader2, Plus, Trash2,
  Check, X, GripVertical, ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SKU } from '@/hooks/useSkus';
import type { SkuColorway } from '@/types/design';
import { useSkuLifecycle } from './SkuLifecycleContext';
import { ImageUploadArea } from './shared';
import { SegmentedPill } from '@/components/ui/segmented-pill';
import type { FooterAction } from '../SkuDetailView';

type InputMode = 'free' | 'assisted' | 'ai';

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
  const { colorways, addColorway, updateColorway, deleteColorway, designData, saveDesignData, collectionPlanId } = useSkuLifecycle();

  const skuColorways = colorways.filter(c => c.sku_id === sku.id);
  const materials = (designData.patterns[sku.id] || []) as { name: string; url: string; fileType: string; gradingNotes: string }[];

  const [activeStep, setActiveStep] = useState(0);
  const [modes, setModes] = useState<Record<string, InputMode>>({ sketch: 'free', colorways: 'free', materials: 'free' });
  const [notes, setNotes] = useState(sku.notes || '');

  // AI state
  const [generating, setGenerating] = useState(false);
  const [generatingSketchFor, setGeneratingSketchFor] = useState<number | null>(null);
  const [aiProposals, setAiProposals] = useState<{ title: string; description: string; keyFeatures: string[]; silhouette: string; sketchUrl?: string }[] | null>(null);
  const [aiColorways, setAiColorways] = useState<{ name: string; colors: string[]; description: string; primary: string; commercialRole: string }[] | null>(null);
  const [aiMaterials, setAiMaterials] = useState<{ name: string; type: string; description: string; sustainability: string; priceImpact: string }[] | null>(null);

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
            { id: 'free' as InputMode, label: stepLabel('modeFree') || 'Free' },
            { id: 'assisted' as InputMode, label: stepLabel('assisted') || 'Assisted' },
            { id: 'ai' as InputMode, label: stepLabel('aiProposal') || 'AI Proposal' },
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
            {mode === 'assisted' && (
              <div className="space-y-4">
                <p className="text-[12px] font-light text-carbon/45 leading-relaxed">{stepLabel('assistedSketchDesc') || 'Upload a reference photo and Aimily will generate a technical flat sketch.'}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{stepLabel('referencePhoto') || 'Reference'}</p>
                    {sku.reference_image_url ? (
                      <div className="border border-carbon/[0.06] overflow-hidden aspect-[4/5] max-h-[40vh] sm:max-h-[55vh] bg-white">
                        <img src={sku.reference_image_url} alt="" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <ImageUploadArea imageUrl={undefined} uploading={uploading === 'reference_image_url'}
                        placeholder={stepLabel('uploadReference') || 'Upload reference'}
                        onUpload={(file) => onImageUpload(file, 'reference_image_url' as 'sketch_url')}
                        onRemove={() => {}} aspectClass="aspect-[4/5] max-h-[40vh] sm:max-h-[55vh]" />
                    )}
                    <button onClick={async () => {
                      if (!sku.reference_image_url) return;
                      setGenerating(true);
                      try {
                        const base64 = sku.reference_image_url.startsWith('data:') ? sku.reference_image_url.split(',')[1] : sku.reference_image_url;
                        const res = await fetch('/api/ai/generate-sketch-options', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ images: [{ base64, mimeType: 'image/png', instructions: '' }], garmentType: sku.category, season: '', styleName: sku.name, fabric: '', additionalNotes: sku.notes || '', collectionPlanId }),
                        });
                        if (res.ok) { const data = await res.json(); const sketch = data.sketchOptions?.[0]?.frontImageBase64; if (sketch) await onUpdate({ sketch_url: sketch }); }
                      } finally { setGenerating(false); }
                    }} disabled={generating || !sku.reference_image_url}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/50 hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30 w-full">
                      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {stepLabel('generateFlat') || 'Generate Flat Sketch'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{stepLabel('generatedSketch') || 'Generated'}</p>
                    {sku.sketch_url ? (
                      <div className="border border-carbon/[0.06] overflow-hidden aspect-[4/5] max-h-[40vh] sm:max-h-[55vh] bg-white"><img src={sku.sketch_url} alt="" className="w-full h-full object-contain" /></div>
                    ) : (
                      <div className="border border-dashed border-carbon/[0.08] bg-carbon/[0.01] aspect-[4/5] max-h-[40vh] sm:max-h-[55vh] flex items-center justify-center">
                        <p className="text-[11px] text-carbon/15 text-center px-4">{stepLabel('sketchWillAppear') || 'Sketch will appear here'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {mode === 'ai' && (
              <div className="space-y-4">
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
                          const res = await fetch('/api/ai/fal/sketch', { method: 'POST', headers: { 'Content-Type': 'application/json' },
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
            )}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => { if (notes !== (sku.notes || '')) onUpdate({ notes }); }}
              placeholder={stepLabel('sketchNotesPlaceholder') || 'Design notes...'} className="w-full h-12 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.12]" />
          </div>
        )}

        {/* ═══ STEP 2: COLORWAYS ═══ */}
        {activeStep === 1 && (
          <div className="space-y-4">
            {sku.sketch_url && (
              <div className="flex items-center gap-3 p-2.5 bg-white border border-carbon/[0.04]">
                <div className="w-10 h-10 border border-carbon/[0.06] overflow-hidden shrink-0 bg-white"><img src={sku.sketch_url} alt="" className="w-full h-full object-contain" /></div>
                <p className="text-[10px] text-carbon/35">{stepLabel('sketchConfirmed') || 'Sketch confirmed'} — {stepLabel('colorwaysStepDesc') || 'now define your color palette'}</p>
              </div>
            )}
            {(mode === 'free' || skuColorways.length > 0) && (
              <div className="space-y-2">
                {skuColorways.map((cw) => (
                  <div key={cw.id} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-carbon/[0.04]">
                    <GripVertical className="h-3 w-3 text-carbon/10 shrink-0" />
                    <div className="flex gap-1 shrink-0">
                      <div className="w-6 h-6 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_primary }} />
                      {cw.hex_secondary && <div className="w-6 h-6 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_secondary }} />}
                    </div>
                    <input value={cw.name} onChange={(e) => updateColorway(cw.id, { name: e.target.value })} className="flex-1 text-[12px] font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.06] focus:border-carbon/[0.12] focus:outline-none" />
                    <input value={cw.pantone_primary || ''} onChange={(e) => updateColorway(cw.id, { pantone_primary: e.target.value })} placeholder="Pantone" className="w-20 text-[9px] text-carbon/35 bg-transparent border-b border-carbon/[0.05] focus:outline-none text-right" />
                    <select value={cw.status} onChange={(e) => updateColorway(cw.id, { status: e.target.value as SkuColorway['status'] })} className="text-[9px] font-medium uppercase bg-transparent border border-carbon/[0.06] px-1.5 py-0.5 text-carbon/45 focus:outline-none">
                      <option value="proposed">Proposed</option><option value="sampled">Sampled</option><option value="approved">Approved</option><option value="production">Production</option>
                    </select>
                    <button onClick={() => deleteColorway(cw.id)} className="text-carbon/15 hover:text-[#A0463C]/50"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                <button onClick={() => addColorway({ sku_id: sku.id, name: 'New Colorway', hex_primary: '#4ECDC4', hex_secondary: null as unknown as string, hex_accent: null as unknown as string, pantone_primary: null as unknown as string, pantone_secondary: null as unknown as string, material_swatch_url: null as unknown as string, status: 'proposed', position: skuColorways.length })}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.08] text-carbon/30 text-[9px] font-medium tracking-[0.08em] uppercase hover:border-carbon/15 w-full justify-center">
                  <Plus className="h-2.5 w-2.5" /> {stepLabel('addColorway') || 'Add Colorway'}
                </button>
              </div>
            )}
            {(mode === 'assisted' || mode === 'ai') && !aiColorways && (
              <button onClick={async () => {
                setGenerating(true);
                const result = await callDesignAI('color-suggest', { productType: sku.category, family: sku.family, concept: sku.notes || '' });
                if (result?.colorways) setAiColorways(result.colorways);
                setGenerating(false);
              }} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30">
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {stepLabel('proposeColorways') || 'Propose Colorways'}
              </button>
            )}
            {aiColorways?.map((cw, idx) => (
              <div key={idx} className="border border-carbon/[0.06] bg-white p-3.5 flex items-center gap-3">
                <div className="flex gap-0.5 shrink-0">{cw.colors.map((hex, i) => <div key={i} className="w-7 h-7 border border-carbon/[0.06]" style={{ backgroundColor: hex }} />)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-light text-carbon">{cw.name}</p>
                  <p className="text-[10px] text-carbon/35 mt-0.5">{cw.description}</p>
                  <span className="text-[8px] text-carbon/20 uppercase tracking-wider">{cw.commercialRole}</span>
                </div>
                <button onClick={async () => { await addColorway({ sku_id: sku.id, name: cw.name, hex_primary: cw.primary, hex_secondary: cw.colors[1] || null as unknown as string, hex_accent: cw.colors[2] || null as unknown as string, pantone_primary: null as unknown as string, pantone_secondary: null as unknown as string, material_swatch_url: null as unknown as string, status: 'proposed', position: skuColorways.length }); }}
                  className="px-2.5 py-1 text-[9px] font-medium uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors shrink-0">{stepLabel('accept') || 'Accept'}</button>
              </div>
            ))}
          </div>
        )}

        {/* ═══ STEP 3: MATERIALS ═══ */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 p-2.5 bg-white border border-carbon/[0.04]">
              {sku.sketch_url && <div className="w-8 h-8 border border-carbon/[0.06] overflow-hidden shrink-0 bg-white"><img src={sku.sketch_url} alt="" className="w-full h-full object-contain" /></div>}
              {skuColorways.slice(0, 4).map(cw => <div key={cw.id} className="w-4 h-4 border border-carbon/[0.06] shrink-0" style={{ backgroundColor: cw.hex_primary }} />)}
              <p className="text-[10px] text-carbon/35">{skuColorways.length} colorways — {stepLabel('materialsStepDesc') || 'now define materials'}</p>
            </div>
            {(mode === 'free' || materials.length > 0) && (
              <div className="space-y-2">
                {materials.map((mat, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-carbon/[0.04]">
                    <input value={mat.name} onChange={(e) => { const m = [...materials]; m[idx] = { ...m[idx], name: e.target.value }; saveDesignData({ ...designData, patterns: { ...designData.patterns, [sku.id]: m } }); }}
                      className="flex-1 text-[12px] font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.06] focus:outline-none" placeholder="Material name" />
                    <input value={mat.gradingNotes} onChange={(e) => { const m = [...materials]; m[idx] = { ...m[idx], gradingNotes: e.target.value }; saveDesignData({ ...designData, patterns: { ...designData.patterns, [sku.id]: m } }); }}
                      placeholder="Description" className="flex-1 text-[10px] text-carbon/35 bg-transparent border-b border-carbon/[0.05] focus:outline-none" />
                    <button onClick={() => saveDesignData({ ...designData, patterns: { ...designData.patterns, [sku.id]: materials.filter((_, i) => i !== idx) } })} className="text-carbon/15 hover:text-[#A0463C]/50"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                <button onClick={() => saveDesignData({ ...designData, patterns: { ...designData.patterns, [sku.id]: [...materials, { name: '', url: '', fileType: 'Other', gradingNotes: '' }] } })}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.08] text-carbon/30 text-[9px] font-medium tracking-[0.08em] uppercase hover:border-carbon/15 w-full justify-center">
                  <Plus className="h-2.5 w-2.5" /> {stepLabel('addMaterial') || 'Add Material'}
                </button>
              </div>
            )}
            {(mode === 'assisted' || mode === 'ai') && !aiMaterials && (
              <button onClick={async () => {
                setGenerating(true);
                const colorwayContext = skuColorways.map(c => `${c.name}: ${[c.hex_primary, c.hex_secondary, c.hex_accent].filter(Boolean).join(', ')}`).join(' | ');
                const result = await callDesignAI('materials-suggest', {
                  productType: sku.category || sku.type || '',
                  subcategory: sku.name || '',
                  family: sku.family,
                  concept: sku.notes || '',
                  priceRange: `€${sku.pvp}`,
                  designDirection: `${sku.name} — ${sku.family}. ${sku.notes || ''}`,
                  colorways: colorwayContext,
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
                <button onClick={() => saveDesignData({ ...designData, patterns: { ...designData.patterns, [sku.id]: [...materials, { name: `${mat.type}: ${mat.name}`, url: '', fileType: 'Other', gradingNotes: mat.description }] } })}
                  className="px-2.5 py-1 text-[9px] font-medium uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors shrink-0">{stepLabel('accept') || 'Accept'}</button>
              </div>
            ))}
          </div>
        )}

        {/* ═══ STEP 4: TECH PACK ═══ */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="p-5 bg-white border border-carbon/[0.06] space-y-4">
              <h4 className="text-sm font-light text-carbon">{sku.name}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-[11px]">
                <div><span className="text-carbon/25 uppercase tracking-wider text-[8px]">Category</span><p className="text-carbon mt-0.5">{sku.category}</p></div>
                <div><span className="text-carbon/25 uppercase tracking-wider text-[8px]">Family</span><p className="text-carbon mt-0.5">{sku.family}</p></div>
                <div><span className="text-carbon/25 uppercase tracking-wider text-[8px]">PVP / COGS</span><p className="text-carbon mt-0.5">€{sku.pvp} / €{sku.cost}</p></div>
              </div>
              {sku.sketch_url && (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border border-carbon/[0.06] overflow-hidden bg-white"><img src={sku.sketch_url} alt="" className="w-full h-full object-contain" /></div>
                  <div>
                    <span className="text-carbon/25 uppercase tracking-wider text-[8px]">Sketch</span>
                    <p className="text-[10px] text-carbon/45 mt-0.5 line-clamp-2">{sku.notes}</p>
                  </div>
                </div>
              )}
              {skuColorways.length > 0 && (
                <div>
                  <span className="text-carbon/25 uppercase tracking-wider text-[8px]">Colorways</span>
                  <div className="flex gap-2 mt-1">{skuColorways.map(cw => <div key={cw.id} className="flex items-center gap-1"><div className="w-3.5 h-3.5" style={{ backgroundColor: cw.hex_primary }} /><span className="text-[9px] text-carbon/40">{cw.name}</span></div>)}</div>
                </div>
              )}
              {materials.length > 0 && (
                <div>
                  <span className="text-carbon/25 uppercase tracking-wider text-[8px]">Materials</span>
                  <div className="mt-1 space-y-0.5">{materials.map((m, i) => <p key={i} className="text-[10px] text-carbon/45">{m.name}{m.gradingNotes ? ` — ${m.gradingNotes}` : ''}</p>)}</div>
                </div>
              )}
            </div>
            {!(confirmedSteps.has(0) && confirmedSteps.has(1) && confirmedSteps.has(2)) && (
              <div className="p-3 bg-carbon/[0.02] border border-carbon/[0.06]">
                <p className="text-[10px] text-carbon/30">{stepLabel('techPackPending') || 'Complete Sketch, Colorways and Materials to finalize the tech pack.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
