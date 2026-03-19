'use client';

import React, { useState, useCallback } from 'react';
import {
  PenTool, Palette, Layers, FileText, Sparkles, Loader2, Plus, Trash2,
  Check, X, Upload, GripVertical, ExternalLink, ImagePlus,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SKU } from '@/hooks/useSkus';
import type { SkuColorway } from '@/types/design';
import { useSkuLifecycle } from './SkuLifecycleContext';
import { ImageUploadArea } from './shared';

/* ── Types ── */
type InputMode = 'free' | 'assisted' | 'ai';

interface StepConfig {
  id: string;
  icon: React.ElementType;
  nameKey: string;
  descKey: string;
}

const STEPS: StepConfig[] = [
  { id: 'sketch', icon: PenTool, nameKey: 'sketchStep', descKey: 'sketchStepDesc' },
  { id: 'colorways', icon: Palette, nameKey: 'colorwaysStep', descKey: 'colorwaysStepDesc' },
  { id: 'materials', icon: Layers, nameKey: 'materialsStep', descKey: 'materialsStepDesc' },
  { id: 'techpack', icon: FileText, nameKey: 'techPackStep', descKey: 'techPackStepDesc' },
];

/* ── Props ── */
interface SketchPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'sketch_url' | 'reference_image_url') => void;
  uploading: string | null;
}

export function SketchPhase({ sku, onUpdate, onImageUpload, uploading }: SketchPhaseProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const { colorways, addColorway, updateColorway, deleteColorway, designData, saveDesignData, collectionPlanId } = useSkuLifecycle();

  const skuColorways = colorways.filter(c => c.sku_id === sku.id);
  const materials = (designData.patterns[sku.id] || []) as { name: string; url: string; fileType: string; gradingNotes: string }[];

  // Step state: which is expanded, confirmed status per step
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [confirmedSteps, setConfirmedSteps] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (sku.sketch_url) s.add('sketch');
    if (skuColorways.length > 0) s.add('colorways');
    if (materials.length > 0) s.add('materials');
    return s;
  });
  const [modes, setModes] = useState<Record<string, InputMode>>({
    sketch: 'free', colorways: 'free', materials: 'free', techpack: 'free',
  });

  const confirmStep = (stepId: string) => {
    setConfirmedSteps(prev => { const n = new Set(prev); n.add(stepId); return n; });
    setExpandedStep(null);
  };

  const stepLabel = (key: string): string => {
    return (t.skuPhases as Record<string, string>)?.[key] || key;
  };

  return (
    <div className="space-y-3">
      {/* ── Step Grid ── */}
      {STEPS.map((step) => {
        const isExpanded = expandedStep === step.id;
        const isConfirmed = confirmedSteps.has(step.id);
        const Icon = step.icon;
        const mode = modes[step.id] || 'free';

        if (isExpanded) {
          return (
            <div key={step.id} className="bg-white border border-carbon/[0.06] overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              {/* Expanded header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-carbon/[0.06]">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-carbon/40" />
                  <div>
                    <h3 className="text-lg font-light text-carbon tracking-tight">{stepLabel(step.nameKey)}</h3>
                    <p className="text-[11px] text-carbon/40 mt-0.5">{stepLabel(step.descKey)}</p>
                  </div>
                </div>
                <button onClick={() => setExpandedStep(null)} className="w-8 h-8 flex items-center justify-center text-carbon/30 hover:text-carbon/60">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mode pills — Alfred style */}
              {step.id !== 'techpack' && (
                <div className="px-6 pt-4">
                  <div className="flex items-center bg-carbon/[0.06] rounded-full p-0.5 w-fit">
                    {(['free', 'assisted', 'ai'] as const).map((m) => (
                      <button key={m} onClick={() => setModes(prev => ({ ...prev, [step.id]: m }))}
                        className={`px-5 py-2 text-[10px] font-medium tracking-[0.1em] uppercase transition-all rounded-full ${mode === m ? 'bg-carbon text-crema shadow-sm' : 'text-carbon/40 hover:text-carbon/60'}`}>
                        {m === 'free' ? 'Free' : m === 'assisted' ? (stepLabel('assisted') || 'Assisted') : (stepLabel('aiProposal') || 'AI Proposal')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step content */}
              <div className="px-6 py-5">
                {step.id === 'sketch' && (
                  <SketchStepContent sku={sku} mode={mode} onUpdate={onUpdate} onImageUpload={onImageUpload} uploading={uploading} collectionPlanId={collectionPlanId} language={language} t={t} />
                )}
                {step.id === 'colorways' && (
                  <ColorwaysStepContent sku={sku} mode={mode} colorways={skuColorways} addColorway={addColorway} updateColorway={updateColorway} deleteColorway={deleteColorway} language={language} t={t} />
                )}
                {step.id === 'materials' && (
                  <MaterialsStepContent sku={sku} mode={mode} materials={materials} onUpdate={(mats) => saveDesignData({ ...designData, patterns: { ...designData.patterns, [sku.id]: mats } })} language={language} t={t} />
                )}
                {step.id === 'techpack' && (
                  <TechPackStepContent sku={sku} skuColorways={skuColorways} materials={materials} confirmedSteps={confirmedSteps} t={t} />
                )}
              </div>

              {/* Footer: confirm */}
              <div className="px-6 py-4 border-t border-carbon/[0.06] flex items-center justify-between">
                <button onClick={() => setExpandedStep(null)} className="text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/40 hover:text-carbon transition-colors">
                  {stepLabel('backToGrid') || 'Back'}
                </button>
                <button onClick={() => confirmStep(step.id)} className="flex items-center gap-2 px-6 py-2.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors">
                  <Check className="h-3.5 w-3.5" /> {stepLabel('validateContinue') || 'Validate & Continue'}
                </button>
              </div>
            </div>
          );
        }

        // Collapsed card
        return (
          <button key={step.id} onClick={() => setExpandedStep(step.id)}
            className={`w-full text-left bg-white border p-5 flex items-center gap-4 transition-all hover:border-carbon/15 ${
              isConfirmed ? 'border-carbon/[0.12]' : 'border-carbon/[0.06]'
            }`}
          >
            <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${
              isConfirmed ? 'bg-carbon text-crema' : 'bg-carbon/[0.04] text-carbon/30'
            }`}>
              {isConfirmed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-light text-carbon tracking-tight">{stepLabel(step.nameKey)}</h3>
              <p className="text-[11px] text-carbon/35 mt-0.5 truncate">{stepLabel(step.descKey)}</p>
            </div>
            {isConfirmed && (
              <span className="text-[9px] font-medium tracking-[0.1em] uppercase text-carbon/25">{stepLabel('confirmed') || 'Confirmed'}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 1: SKETCH
   ═══════════════════════════════════════════════════════ */
function SketchStepContent({ sku, mode, onUpdate, onImageUpload, uploading, collectionPlanId, language, t }: {
  sku: SKU; mode: InputMode; onUpdate: (u: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'sketch_url') => void; uploading: string | null;
  collectionPlanId: string; language: string; t: ReturnType<typeof useTranslation>;
}) {
  const [generating, setGenerating] = useState(false);
  const [generatingSketchFor, setGeneratingSketchFor] = useState<number | null>(null);
  const [generatedSketch, setGeneratedSketch] = useState<string | null>(null);
  const [aiProposals, setAiProposals] = useState<{ title: string; description: string; keyFeatures: string[]; silhouette: string; sketchUrl?: string }[] | null>(null);
  const [notes, setNotes] = useState(sku.notes || '');

  // Assisted: photo → flat sketch via OpenAI
  const generateFromPhoto = useCallback(async () => {
    if (!sku.reference_image_url) return;
    setGenerating(true);
    try {
      const base64 = sku.reference_image_url.startsWith('data:')
        ? sku.reference_image_url.split(',')[1]
        : sku.reference_image_url;
      const res = await fetch('/api/ai/generate-sketch-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [{ base64, mimeType: 'image/png', instructions: '' }],
          garmentType: sku.category,
          season: '',
          styleName: sku.name,
          fabric: '',
          additionalNotes: sku.notes || '',
          collectionPlanId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const sketch = data.sketchOptions?.[0]?.frontImageBase64;
        if (sketch) {
          setGeneratedSketch(sketch);
          await onUpdate({ sketch_url: sketch });
        }
      }
    } finally { setGenerating(false); }
  }, [sku, collectionPlanId, onUpdate]);

  // AI Proposal: sketch direction suggestions (text) → then generate visual sketch
  const generateProposals = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/design-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sketch-suggest',
          input: { productType: sku.category, family: sku.family, concept: sku.notes || '', priceRange: `€${sku.pvp}` },
          language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiProposals((data.result?.proposals || []).map((p: Record<string, unknown>) => ({ ...p, sketchUrl: undefined })));
      }
    } finally { setGenerating(false); }
  }, [sku, language]);

  // Generate visual flat sketch from a proposal description using fal.ai
  const generateSketchFromProposal = useCallback(async (proposalIdx: number) => {
    if (!aiProposals?.[proposalIdx]) return;
    const proposal = aiProposals[proposalIdx];
    setGeneratingSketchFor(proposalIdx);
    try {
      const res = await fetch('/api/ai/fal/sketch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${proposal.title}: ${proposal.description}. Silhouette: ${proposal.silhouette}. Key features: ${proposal.keyFeatures.join(', ')}`,
          productType: sku.category,
          family: sku.family,
          concept: sku.notes || '',
          skuName: sku.name,
          collectionPlanId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const sketchUrl = data.images?.[0]?.url || data.images?.[0]?.originalUrl;
        if (sketchUrl) {
          setAiProposals(prev => prev?.map((p, i) => i === proposalIdx ? { ...p, sketchUrl } : p) || null);
        }
      }
    } finally { setGeneratingSketchFor(null); }
  }, [aiProposals, sku, collectionPlanId]);

  // Accept a proposal: save its sketch as the SKU sketch
  const acceptProposal = useCallback(async (proposalIdx: number) => {
    if (!aiProposals?.[proposalIdx]) return;
    const proposal = aiProposals[proposalIdx];
    const updates: Partial<SKU> = {
      notes: `${proposal.title}\n${proposal.description}\n\nSilhouette: ${proposal.silhouette}\nKey features: ${proposal.keyFeatures.join(', ')}`,
    };
    if (proposal.sketchUrl) {
      updates.sketch_url = proposal.sketchUrl;
    }
    await onUpdate(updates);
  }, [aiProposals, onUpdate]);

  return (
    <div className="space-y-5">
      {mode === 'free' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.designSketch || 'Your Sketch'}</p>
            <ImageUploadArea imageUrl={sku.sketch_url} uploading={uploading === 'sketch_url'}
              placeholder={t.skuPhases?.uploadSketch || 'Upload your sketch'}
              onUpload={(file) => onImageUpload(file, 'sketch_url')}
              onRemove={() => onUpdate({ sketch_url: undefined })} aspectClass="aspect-[3/4]" />
          </div>
          <div className="space-y-2">
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.referenceComparison || 'Reference'}</p>
            {sku.reference_image_url ? (
              <div className="border border-carbon/[0.06] overflow-hidden aspect-[3/4]">
                <img src={sku.reference_image_url} alt="" className="w-full h-full object-contain bg-white" />
              </div>
            ) : (
              <div className="border border-carbon/[0.06] bg-white aspect-[3/4] flex items-center justify-center">
                <p className="text-xs text-carbon/20">{t.skuPhases?.noReference || 'No reference image'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'assisted' && (
        <div className="space-y-4">
          <p className="text-sm font-light text-carbon/60">
            {t.skuPhases?.assistedSketchDesc || 'Upload a reference photo and Aimily will generate a technical flat sketch for your tech pack.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.referencePhoto || 'Reference Photo'}</p>
              {sku.reference_image_url ? (
                <div className="border border-carbon/[0.06] overflow-hidden aspect-[3/4]">
                  <img src={sku.reference_image_url} alt="" className="w-full h-full object-contain bg-white" />
                </div>
              ) : (
                <ImageUploadArea imageUrl={undefined} uploading={uploading === 'reference_image_url'}
                  placeholder={t.skuPhases?.uploadReference || 'Upload reference photo'}
                  onUpload={(file) => onImageUpload(file, 'reference_image_url' as 'sketch_url')}
                  onRemove={() => {}} aspectClass="aspect-[3/4]" />
              )}
              <button onClick={generateFromPhoto} disabled={generating || !sku.reference_image_url}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-carbon text-crema text-[10px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-40">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {t.skuPhases?.generateFlat || 'Generate Flat Sketch'}
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.generatedSketch || 'Generated Sketch'}</p>
              {sku.sketch_url || generatedSketch ? (
                <div className="border border-carbon/[0.06] overflow-hidden aspect-[3/4]">
                  <img src={sku.sketch_url || generatedSketch || ''} alt="" className="w-full h-full object-contain bg-white" />
                </div>
              ) : (
                <div className="border border-dashed border-carbon/[0.1] bg-carbon/[0.02] aspect-[3/4] flex items-center justify-center">
                  <p className="text-xs text-carbon/20 text-center px-4">{t.skuPhases?.sketchWillAppear || 'Your flat sketch will appear here'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <p className="text-sm font-light text-carbon/60">
            {t.skuPhases?.aiSketchDesc || 'Aimily will analyze your creative direction, propose sketch directions, and generate visual flat sketches.'}
          </p>
          {!aiProposals && (
            <button onClick={generateProposals} disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-carbon text-crema text-[10px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-40">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.skuPhases?.proposeDirections || 'Propose Sketch Directions'}
            </button>
          )}
          {aiProposals && (
            <div className="space-y-4">
              {aiProposals.map((proposal, idx) => (
                <div key={idx} className="border border-carbon/[0.06] bg-white p-5 space-y-3">
                  <div className="flex items-start gap-5">
                    {/* Sketch image (or generate button) */}
                    <div className="w-40 shrink-0">
                      {proposal.sketchUrl ? (
                        <div className="border border-carbon/[0.06] overflow-hidden aspect-square">
                          <img src={proposal.sketchUrl} alt={proposal.title} className="w-full h-full object-contain bg-white" />
                        </div>
                      ) : (
                        <button
                          onClick={() => generateSketchFromProposal(idx)}
                          disabled={generatingSketchFor !== null}
                          className="w-full border border-dashed border-carbon/[0.1] bg-carbon/[0.02] aspect-square flex flex-col items-center justify-center gap-2 hover:border-carbon/20 transition-colors disabled:opacity-40"
                        >
                          {generatingSketchFor === idx ? (
                            <Loader2 className="h-5 w-5 text-carbon/30 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5 text-carbon/20" />
                              <span className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.generateSketch || 'Generate Sketch'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {/* Description */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <h4 className="text-sm font-light text-carbon">{proposal.title}</h4>
                      <p className="text-[12px] text-carbon/50 leading-relaxed">{proposal.description}</p>
                      <p className="text-[10px] text-carbon/30 italic">{proposal.silhouette}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {proposal.keyFeatures.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 text-[9px] bg-carbon/[0.04] text-carbon/50 rounded">{f}</span>
                        ))}
                      </div>
                      {/* Accept button */}
                      <div className="pt-2">
                        <button onClick={() => acceptProposal(idx)}
                          className="px-4 py-2 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.1] text-carbon/50 hover:bg-carbon hover:text-crema transition-colors">
                          {t.skuPhases?.accept || 'Accept'}{proposal.sketchUrl ? ' + Sketch' : ''}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={generateProposals} disabled={generating}
                className="text-[10px] text-carbon/40 hover:text-carbon/60 tracking-[0.1em] uppercase">
                {generating ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                {t.skuPhases?.regenerate || 'Regenerate'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes — always visible */}
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        onBlur={() => { if (notes !== (sku.notes || '')) onUpdate({ notes }); }}
        placeholder={t.skuPhases?.sketchNotesPlaceholder || 'Materials, construction details, key design decisions...'}
        className="w-full h-16 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 2: COLORWAYS
   ═══════════════════════════════════════════════════════ */
function ColorwaysStepContent({ sku, mode, colorways, addColorway, updateColorway, deleteColorway, language, t }: {
  sku: SKU; mode: InputMode; colorways: SkuColorway[];
  addColorway: (c: Omit<SkuColorway, 'id' | 'created_at'>) => Promise<SkuColorway | null>;
  updateColorway: (id: string, u: Partial<SkuColorway>) => Promise<SkuColorway | null>;
  deleteColorway: (id: string) => Promise<boolean>;
  language: string; t: ReturnType<typeof useTranslation>;
}) {
  const [generating, setGenerating] = useState(false);
  const [aiColorways, setAiColorways] = useState<{ name: string; colors: string[]; description: string; primary: string; commercialRole: string }[] | null>(null);

  const generateColorways = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/design-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'color-suggest',
          input: { productType: sku.category, family: sku.family, concept: sku.notes || '' },
          language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiColorways(data.result?.colorways || []);
      }
    } finally { setGenerating(false); }
  }, [sku, language]);

  const acceptAiColorway = async (cw: { name: string; colors: string[]; primary: string }) => {
    await addColorway({
      sku_id: sku.id, name: cw.name, hex_primary: cw.primary,
      hex_secondary: cw.colors[1] || null as unknown as string,
      hex_accent: cw.colors[2] || null as unknown as string,
      pantone_primary: null as unknown as string, pantone_secondary: null as unknown as string,
      material_swatch_url: null as unknown as string, status: 'proposed', position: colorways.length,
    });
  };

  return (
    <div className="space-y-5">
      {(mode === 'free' || colorways.length > 0) && (
        <div className="space-y-3">
          {colorways.map((cw) => (
            <div key={cw.id} className="flex items-center gap-3 p-3 bg-carbon/[0.02] border border-carbon/[0.04]">
              <GripVertical className="h-3 w-3 text-carbon/15 shrink-0" />
              <div className="flex gap-1 shrink-0">
                <div className="w-7 h-7 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_primary }} />
                {cw.hex_secondary && <div className="w-7 h-7 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_secondary }} />}
                {cw.hex_accent && <div className="w-7 h-7 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_accent }} />}
              </div>
              <input value={cw.name} onChange={(e) => updateColorway(cw.id, { name: e.target.value })}
                className="flex-1 text-sm font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none" />
              <input value={cw.pantone_primary || ''} onChange={(e) => updateColorway(cw.id, { pantone_primary: e.target.value })}
                placeholder="Pantone" className="w-24 text-[10px] text-carbon/40 bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.15] focus:outline-none text-right" />
              <select value={cw.status} onChange={(e) => updateColorway(cw.id, { status: e.target.value as SkuColorway['status'] })}
                className="text-[10px] font-medium tracking-[0.06em] uppercase bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none">
                <option value="proposed">Proposed</option><option value="sampled">Sampled</option>
                <option value="approved">Approved</option><option value="production">Production</option>
              </select>
              <button onClick={() => deleteColorway(cw.id)} className="text-carbon/20 hover:text-[#A0463C]/60"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          {mode === 'free' && (
            <button onClick={() => addColorway({ sku_id: sku.id, name: 'New Colorway', hex_primary: '#4ECDC4', hex_secondary: null as unknown as string, hex_accent: null as unknown as string, pantone_primary: null as unknown as string, pantone_secondary: null as unknown as string, material_swatch_url: null as unknown as string, status: 'proposed', position: colorways.length })}
              className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center">
              <Plus className="h-3 w-3" /> {t.skuPhases?.addColorway || 'Add Colorway'}
            </button>
          )}
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          <p className="text-sm font-light text-carbon/60">
            {mode === 'assisted'
              ? (t.skuPhases?.assistedColorDesc || 'Aimily will propose colorways based on your design direction and brand DNA.')
              : (t.skuPhases?.aiColorDesc || 'Aimily will analyze the full creative context and propose a complete color palette.')}
          </p>
          {!aiColorways && (
            <button onClick={generateColorways} disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-carbon text-crema text-[10px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-40">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.skuPhases?.proposeColorways || 'Propose Colorways'}
            </button>
          )}
          {aiColorways && (
            <div className="space-y-3">
              {aiColorways.map((cw, idx) => (
                <div key={idx} className="border border-carbon/[0.06] bg-white p-4 flex items-center gap-4">
                  <div className="flex gap-1 shrink-0">
                    {cw.colors.map((hex, i) => (
                      <div key={i} className="w-8 h-8 border border-carbon/[0.06]" style={{ backgroundColor: hex }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light text-carbon">{cw.name}</p>
                    <p className="text-[11px] text-carbon/40 mt-0.5">{cw.description}</p>
                    <span className="text-[9px] text-carbon/25 uppercase tracking-wider">{cw.commercialRole}</span>
                  </div>
                  <button onClick={() => acceptAiColorway(cw)}
                    className="px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.1] text-carbon/50 hover:bg-carbon hover:text-crema transition-colors shrink-0">
                    {t.skuPhases?.accept || 'Accept'}
                  </button>
                </div>
              ))}
              <button onClick={generateColorways} disabled={generating}
                className="text-[10px] text-carbon/40 hover:text-carbon/60 tracking-[0.1em] uppercase">
                {generating ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                {t.skuPhases?.regenerate || 'Regenerate'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 3: MATERIALS
   ═══════════════════════════════════════════════════════ */
function MaterialsStepContent({ sku, mode, materials, onUpdate, language, t }: {
  sku: SKU; mode: InputMode;
  materials: { name: string; url: string; fileType: string; gradingNotes: string }[];
  onUpdate: (m: typeof materials) => void;
  language: string; t: ReturnType<typeof useTranslation>;
}) {
  const [generating, setGenerating] = useState(false);
  const [aiMaterials, setAiMaterials] = useState<{ name: string; type: string; description: string; sustainability: string; priceImpact: string }[] | null>(null);

  const generateMaterials = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/design-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'materials-suggest',
          input: { productType: sku.category, family: sku.family, concept: sku.notes || '', priceRange: `€${sku.pvp}` },
          language,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiMaterials(data.result?.materials || []);
      }
    } finally { setGenerating(false); }
  }, [sku, language]);

  const acceptMaterial = (mat: { name: string; type: string; description: string }) => {
    onUpdate([...materials, { name: `${mat.type}: ${mat.name}`, url: '', fileType: 'Other', gradingNotes: mat.description }]);
  };

  return (
    <div className="space-y-5">
      {(mode === 'free' || materials.length > 0) && (
        <div className="space-y-3">
          {materials.map((mat, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-carbon/[0.02] border border-carbon/[0.04]">
              <input value={mat.name} onChange={(e) => { const m = [...materials]; m[idx] = { ...m[idx], name: e.target.value }; onUpdate(m); }}
                className="flex-1 text-sm font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none" placeholder="Material name" />
              <input value={mat.gradingNotes} onChange={(e) => { const m = [...materials]; m[idx] = { ...m[idx], gradingNotes: e.target.value }; onUpdate(m); }}
                placeholder="Description" className="flex-1 text-[11px] text-carbon/40 bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.15] focus:outline-none" />
              <button onClick={() => onUpdate(materials.filter((_, i) => i !== idx))} className="text-carbon/20 hover:text-[#A0463C]/60"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          {mode === 'free' && (
            <button onClick={() => onUpdate([...materials, { name: '', url: '', fileType: 'Other', gradingNotes: '' }])}
              className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center">
              <Plus className="h-3 w-3" /> {t.skuPhases?.addMaterial || 'Add Material'}
            </button>
          )}
        </div>
      )}

      {(mode === 'assisted' || mode === 'ai') && (
        <div className="space-y-4">
          <p className="text-sm font-light text-carbon/60">
            {t.skuPhases?.aiMaterialDesc || 'Aimily will suggest a complete bill of materials with trade names and sustainability notes.'}
          </p>
          {!aiMaterials && (
            <button onClick={generateMaterials} disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-carbon text-crema text-[10px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-40">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.skuPhases?.proposeMaterials || 'Propose Materials'}
            </button>
          )}
          {aiMaterials && (
            <div className="space-y-3">
              {aiMaterials.map((mat, idx) => (
                <div key={idx} className="border border-carbon/[0.06] bg-white p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30">{mat.type}</span>
                      {mat.priceImpact === 'high' && <span className="text-[8px] text-[#c77000]">$$</span>}
                    </div>
                    <p className="text-sm font-light text-carbon mt-1">{mat.name}</p>
                    <p className="text-[11px] text-carbon/40 mt-1">{mat.description}</p>
                    {mat.sustainability && <p className="text-[10px] text-[#2d6a4f]/60 mt-1 italic">{mat.sustainability}</p>}
                  </div>
                  <button onClick={() => acceptMaterial(mat)}
                    className="px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.1] text-carbon/50 hover:bg-carbon hover:text-crema transition-colors shrink-0">
                    {t.skuPhases?.accept || 'Accept'}
                  </button>
                </div>
              ))}
              <button onClick={generateMaterials} disabled={generating}
                className="text-[10px] text-carbon/40 hover:text-carbon/60 tracking-[0.1em] uppercase">
                {generating ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                {t.skuPhases?.regenerate || 'Regenerate'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 4: TECH PACK (auto-generated summary)
   ═══════════════════════════════════════════════════════ */
function TechPackStepContent({ sku, skuColorways, materials, confirmedSteps, t }: {
  sku: SKU; skuColorways: SkuColorway[];
  materials: { name: string; gradingNotes: string }[];
  confirmedSteps: Set<string>; t: ReturnType<typeof useTranslation>;
}) {
  const sketchReady = confirmedSteps.has('sketch');
  const colorsReady = confirmedSteps.has('colorways');
  const materialsReady = confirmedSteps.has('materials');
  const allReady = sketchReady && colorsReady && materialsReady;

  return (
    <div className="space-y-4">
      {/* Status checklist */}
      <div className="space-y-2">
        {[
          { key: 'sketch', ready: sketchReady, label: t.skuPhases?.sketchStep || 'Sketch' },
          { key: 'colorways', ready: colorsReady, label: t.skuPhases?.colorwaysStep || 'Colorways' },
          { key: 'materials', ready: materialsReady, label: t.skuPhases?.materialsStep || 'Materials' },
        ].map(item => (
          <div key={item.key} className="flex items-center gap-2">
            {item.ready ? <Check className="h-3.5 w-3.5 text-[#2d6a4f]" /> : <div className="w-3.5 h-3.5 border border-carbon/[0.15]" />}
            <span className={`text-[11px] ${item.ready ? 'text-carbon' : 'text-carbon/30'}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {allReady ? (
        <div className="p-5 bg-carbon/[0.03] border border-carbon/[0.06] space-y-4">
          <h4 className="text-sm font-light text-carbon">{sku.name}</h4>
          <div className="grid grid-cols-3 gap-4 text-[11px]">
            <div><span className="text-carbon/30 uppercase tracking-wider text-[9px]">Category</span><p className="text-carbon mt-0.5">{sku.category}</p></div>
            <div><span className="text-carbon/30 uppercase tracking-wider text-[9px]">Family</span><p className="text-carbon mt-0.5">{sku.family}</p></div>
            <div><span className="text-carbon/30 uppercase tracking-wider text-[9px]">PVP / COGS</span><p className="text-carbon mt-0.5">€{sku.pvp} / €{sku.cost}</p></div>
          </div>
          {skuColorways.length > 0 && (
            <div>
              <span className="text-carbon/30 uppercase tracking-wider text-[9px]">{t.skuPhases?.colorways || 'Colorways'}</span>
              <div className="flex gap-2 mt-1">
                {skuColorways.map(cw => (
                  <div key={cw.id} className="flex items-center gap-1.5">
                    <div className="w-4 h-4" style={{ backgroundColor: cw.hex_primary }} />
                    <span className="text-[10px] text-carbon/50">{cw.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {materials.length > 0 && (
            <div>
              <span className="text-carbon/30 uppercase tracking-wider text-[9px]">{t.skuPhases?.materialsStep || 'Materials'}</span>
              <div className="mt-1 space-y-1">
                {materials.map((m, i) => (
                  <p key={i} className="text-[11px] text-carbon/50">{m.name}{m.gradingNotes ? ` — ${m.gradingNotes}` : ''}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-carbon/[0.02] border border-carbon/[0.06]">
          <p className="text-[11px] text-carbon/35">{t.skuPhases?.techPackPending || 'Complete Sketch, Colorways and Materials to generate the tech pack.'}</p>
        </div>
      )}
    </div>
  );
}
