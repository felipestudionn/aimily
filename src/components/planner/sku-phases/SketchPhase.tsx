'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Palette, Footprints, Scissors, Sparkles, Plus, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SKU } from '@/hooks/useSkus';
import type { SkuColorway } from '@/types/design';
import { useSkuLifecycle, type DesignWorkspaceData } from './SkuLifecycleContext';
import { PhaseAccordion } from './PhaseAccordion';
import { ImageUploadArea, StatusBadge } from './shared';
import { AiGenerateButton } from './AiGenerateButton';

interface SketchPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'sketch_url' | 'reference_image_url') => void;
  uploading: string | null;
}

export function SketchPhase({ sku, onUpdate, onImageUpload, uploading }: SketchPhaseProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const { colorways, addColorway, updateColorway, deleteColorway, designData, saveDesignData } = useSkuLifecycle();
  const [notes, setNotes] = useState(sku.notes || '');

  const skuColorways = colorways.filter(c => c.sku_id === sku.id);
  const designFiles = designData.designFiles[sku.id] || [];
  const formSpec = designData.formSpecs[sku.id] || { lastType: '', lastCode: '', factoryLink: '', notes: '' };
  const patterns = designData.patterns[sku.id] || [];

  /* ── Design files helpers ── */
  const updateDesignFiles = (files: typeof designFiles) => {
    saveDesignData({ ...designData, designFiles: { ...designData.designFiles, [sku.id]: files } });
  };
  const updateFormSpec = (spec: typeof formSpec) => {
    saveDesignData({ ...designData, formSpecs: { ...designData.formSpecs, [sku.id]: spec } });
  };
  const updatePatterns = (pats: typeof patterns) => {
    saveDesignData({ ...designData, patterns: { ...designData.patterns, [sku.id]: pats } });
  };

  return (
    <div className="space-y-4">
      {/* ── Sketch + Reference ── */}
      <PhaseAccordion title={t.skuPhases?.designSketch || 'Design Sketch'} icon={ImageIcon} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.designSketch || 'Sketch'}</p>
            <ImageUploadArea
              imageUrl={sku.sketch_url}
              uploading={uploading === 'sketch_url'}
              placeholder={t.skuPhases?.uploadSketch || 'Upload design sketch'}
              onUpload={(file) => onImageUpload(file, 'sketch_url')}
              onRemove={() => onUpdate({ sketch_url: undefined })}
              aspectClass="aspect-[3/4]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.referenceComparison || 'Reference'}</p>
            {sku.reference_image_url ? (
              <div className="border border-carbon/[0.06] overflow-hidden aspect-[3/4]">
                <img src={sku.reference_image_url} alt="Reference" className="w-full h-full object-contain bg-white" />
              </div>
            ) : (
              <div className="border border-carbon/[0.06] bg-white aspect-[3/4] flex items-center justify-center">
                <p className="text-xs text-carbon/20">{t.skuPhases?.noReference || 'No reference image'}</p>
              </div>
            )}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (sku.notes || '')) onUpdate({ notes }); }}
          placeholder={t.skuPhases?.sketchNotesPlaceholder || 'Materials, construction details, key design decisions...'}
          className="w-full h-16 p-3 mt-4 bg-carbon/[0.02] border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
        />
      </PhaseAccordion>

      {/* ── Design Iterations (from DesignReviewHub) ── */}
      <PhaseAccordion
        title={t.skuPhases?.designIterations || 'Design Iterations'}
        icon={ImageIcon}
        badge={designFiles.length > 0 ? `${designFiles.filter(f => f.status === 'approved').length}/${designFiles.length}` : undefined}
      >
        <div className="space-y-3">
          {designFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-carbon/[0.02] border border-carbon/[0.04]">
              {/* Thumbnail */}
              <div className="w-10 h-10 bg-white border border-carbon/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                {file.url ? <img src={file.url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-4 w-4 text-carbon/15" />}
              </div>
              {/* Name */}
              <input
                value={file.name}
                onChange={(e) => { const f = [...designFiles]; f[idx] = { ...f[idx], name: e.target.value }; updateDesignFiles(f); }}
                className="flex-1 text-sm font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none"
              />
              {/* Status */}
              <select
                value={file.status}
                onChange={(e) => { const f = [...designFiles]; f[idx] = { ...f[idx], status: e.target.value as typeof file.status }; updateDesignFiles(f); }}
                className="text-[10px] font-medium tracking-[0.06em] uppercase bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              {/* URL input */}
              <input
                value={file.url}
                onChange={(e) => { const f = [...designFiles]; f[idx] = { ...f[idx], url: e.target.value }; updateDesignFiles(f); }}
                placeholder="Image URL"
                className="w-32 text-[10px] text-carbon/40 bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.15] focus:outline-none"
              />
              {/* Delete */}
              <button onClick={() => updateDesignFiles(designFiles.filter((_, i) => i !== idx))} className="text-carbon/20 hover:text-[#A0463C]/60">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => updateDesignFiles([...designFiles, { name: `Shot ${designFiles.length + 1}`, url: '', status: 'draft' }])}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center"
          >
            <Plus className="h-3 w-3" /> {t.skuPhases?.addIteration || 'Add Iteration'}
          </button>
        </div>
      </PhaseAccordion>

      {/* ── Colorways (from ColorwayManager) ── */}
      <PhaseAccordion
        title={t.skuPhases?.colorways || 'Colorways'}
        icon={Palette}
        badge={skuColorways.length > 0 ? `${skuColorways.filter(c => c.status === 'approved').length}/${skuColorways.length}` : undefined}
      >
        <div className="space-y-3">
          {skuColorways.map((cw) => (
            <div key={cw.id} className="flex items-center gap-3 p-3 bg-carbon/[0.02] border border-carbon/[0.04]">
              <GripVertical className="h-3 w-3 text-carbon/15 shrink-0" />
              {/* Color swatches */}
              <div className="flex gap-1 shrink-0">
                <div className="w-6 h-6 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_primary }} title={cw.hex_primary} />
                {cw.hex_secondary && <div className="w-6 h-6 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_secondary }} />}
                {cw.hex_accent && <div className="w-6 h-6 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_accent }} />}
              </div>
              {/* Name */}
              <input
                value={cw.name}
                onChange={(e) => updateColorway(cw.id, { name: e.target.value })}
                className="flex-1 text-sm font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none"
              />
              {/* Pantone */}
              <input
                value={cw.pantone_primary || ''}
                onChange={(e) => updateColorway(cw.id, { pantone_primary: e.target.value })}
                placeholder="Pantone"
                className="w-24 text-[10px] text-carbon/40 bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.15] focus:outline-none text-right"
              />
              {/* Status */}
              <select
                value={cw.status}
                onChange={(e) => updateColorway(cw.id, { status: e.target.value as SkuColorway['status'] })}
                className="text-[10px] font-medium tracking-[0.06em] uppercase bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none"
              >
                <option value="proposed">Proposed</option>
                <option value="sampled">Sampled</option>
                <option value="approved">Approved</option>
                <option value="production">Production</option>
              </select>
              {/* Delete */}
              <button onClick={() => deleteColorway(cw.id)} className="text-carbon/20 hover:text-[#A0463C]/60">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addColorway({ sku_id: sku.id, name: 'New Colorway', hex_primary: '#4ECDC4', hex_secondary: null as unknown as string, hex_accent: null as unknown as string, pantone_primary: null as unknown as string, pantone_secondary: null as unknown as string, material_swatch_url: null as unknown as string, status: 'proposed', position: skuColorways.length })}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center"
          >
            <Plus className="h-3 w-3" /> {t.skuPhases?.addColorway || 'Add Colorway'}
          </button>
        </div>
      </PhaseAccordion>

      {/* ── Form Specs / Last (from LastFormSection) ── */}
      <PhaseAccordion title={t.skuPhases?.formSpecs || 'Form / Last Specs'} icon={Footprints} badge={formSpec.lastType || undefined}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.lastType || 'Last Type'}</p>
              <input value={formSpec.lastType} onChange={(e) => updateFormSpec({ ...formSpec, lastType: e.target.value })}
                className="w-full text-sm font-light text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none pb-1" placeholder="e.g. Mondor 5000" />
            </div>
            <div>
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.lastCode || 'Last Code'}</p>
              <input value={formSpec.lastCode} onChange={(e) => updateFormSpec({ ...formSpec, lastCode: e.target.value })}
                className="w-full text-sm font-light text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none pb-1" placeholder="e.g. MON-5000" />
            </div>
          </div>
          <div>
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.factoryLink || 'Factory Catalog Link'}</p>
            <div className="flex gap-2">
              <input value={formSpec.factoryLink} onChange={(e) => updateFormSpec({ ...formSpec, factoryLink: e.target.value })}
                className="flex-1 text-sm font-light text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none pb-1" placeholder="https://..." />
              {formSpec.factoryLink && (
                <a href={formSpec.factoryLink} target="_blank" rel="noopener noreferrer" className="text-carbon/30 hover:text-carbon">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          <div>
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.formNotes || 'Notes'}</p>
            <textarea value={formSpec.notes} onChange={(e) => updateFormSpec({ ...formSpec, notes: e.target.value })}
              className="w-full h-14 p-2 text-sm font-light text-carbon bg-carbon/[0.02] border border-carbon/[0.06] resize-none focus:outline-none focus:border-carbon/[0.15]" />
          </div>
        </div>
      </PhaseAccordion>

      {/* ── Patterns (from PatternSection) ── */}
      <PhaseAccordion title={t.skuPhases?.patterns || 'Patterns / CAD'} icon={Scissors} badge={patterns.length > 0 ? `${patterns.length} files` : undefined}>
        <div className="space-y-3">
          {patterns.map((pat, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-carbon/[0.02] border border-carbon/[0.04]">
              <input value={pat.name} onChange={(e) => { const p = [...patterns]; p[idx] = { ...p[idx], name: e.target.value }; updatePatterns(p); }}
                className="flex-1 text-sm font-light text-carbon bg-transparent border-b border-transparent hover:border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none" placeholder="File name" />
              <select value={pat.fileType} onChange={(e) => { const p = [...patterns]; p[idx] = { ...p[idx], fileType: e.target.value }; updatePatterns(p); }}
                className="text-[10px] font-medium bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none">
                <option>PDF</option><option>AI</option><option>DXF</option><option>PLT</option><option>Other</option>
              </select>
              <input value={pat.url} onChange={(e) => { const p = [...patterns]; p[idx] = { ...p[idx], url: e.target.value }; updatePatterns(p); }}
                placeholder="URL" className="w-28 text-[10px] text-carbon/40 bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.15] focus:outline-none" />
              {pat.url && <a href={pat.url} target="_blank" rel="noopener noreferrer" className="text-carbon/30 hover:text-carbon"><ExternalLink className="h-3 w-3" /></a>}
              <button onClick={() => updatePatterns(patterns.filter((_, i) => i !== idx))} className="text-carbon/20 hover:text-[#A0463C]/60"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <button
            onClick={() => updatePatterns([...patterns, { name: '', url: '', fileType: 'PDF', gradingNotes: '' }])}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center"
          >
            <Plus className="h-3 w-3" /> {t.skuPhases?.addPattern || 'Add Pattern File'}
          </button>
        </div>
      </PhaseAccordion>

      {/* ── AI Suggestions ── */}
      <PhaseAccordion title={t.skuPhases?.aiSuggestions || 'AI Suggestions'} icon={Sparkles}>
        <div className="flex flex-wrap gap-3">
          <AiGenerateButton
            label={t.skuPhases?.suggestSketchDirections || 'Sketch Directions'}
            type="sketch-suggest"
            input={{ productType: sku.category, family: sku.family, concept: sku.notes || '', priceRange: `€${sku.pvp}` }}
            onResult={(data) => console.log('Sketch suggestions:', data)}
            language={language}
          />
          <AiGenerateButton
            label={t.skuPhases?.suggestColorways || 'Colorway Ideas'}
            type="color-suggest"
            input={{ productType: sku.category, family: sku.family, concept: sku.notes || '' }}
            onResult={(data) => console.log('Color suggestions:', data)}
            language={language}
          />
          <AiGenerateButton
            label={t.skuPhases?.suggestMaterials || 'Material BOM'}
            type="materials-suggest"
            input={{ productType: sku.category, family: sku.family, concept: sku.notes || '', priceRange: `€${sku.pvp}` }}
            onResult={(data) => console.log('Material suggestions:', data)}
            language={language}
          />
        </div>
      </PhaseAccordion>
    </div>
  );
}
