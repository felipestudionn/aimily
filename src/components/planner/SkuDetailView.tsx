'use client';

import React, { useState, useCallback } from 'react';
import {
  X, ImagePlus, Loader2, Trash2, ArrowRight, ArrowLeft,
  Check, Plus, ChevronRight, AlertCircle, Camera,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU, DesignPhase, ProtoIteration } from '@/hooks/useSkus';

/* ── Phase config ── */
const PHASES: { id: DesignPhase; stepNumber: number }[] = [
  { id: 'range_plan', stepNumber: 1 },
  { id: 'sketch', stepNumber: 2 },
  { id: 'prototyping', stepNumber: 3 },
  { id: 'production', stepNumber: 4 },
];

function phaseIndex(phase: DesignPhase): number {
  const idx = PHASES.findIndex(p => p.id === phase);
  return idx >= 0 ? idx : 0;
}

/* ── Props ── */
interface SkuDetailViewProps {
  sku: SKU;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<SKU>) => Promise<SKU | null>;
  onDelete: (id: string) => Promise<boolean>;
  onImageUpload?: (skuId: string, file: File, field: 'reference_image_url' | 'sketch_url' | 'production_sample_url') => Promise<string | null>;
}

export function SkuDetailView({ sku, onClose, onUpdate, onDelete, onImageUpload }: SkuDetailViewProps) {
  const t = useTranslation();
  const [activePhase, setActivePhase] = useState<DesignPhase>(sku.design_phase || 'range_plan');
  const [localSku, setLocalSku] = useState<SKU>(sku);
  const [editingNotes, setEditingNotes] = useState(sku.notes || '');
  const [uploading, setUploading] = useState<string | null>(null);
  const [protoNotes, setProtoNotes] = useState('');
  const [savingPhase, setSavingPhase] = useState(false);

  const currentPhaseIdx = phaseIndex(localSku.design_phase || 'range_plan');

  /* ── Helpers ── */
  const update = useCallback(async (updates: Partial<SKU>) => {
    const result = await onUpdate(localSku.id, updates);
    if (result) setLocalSku(result);
    return result;
  }, [localSku.id, onUpdate]);

  const handleImageUploadForField = useCallback(async (
    file: File,
    field: 'reference_image_url' | 'sketch_url' | 'production_sample_url'
  ) => {
    if (!onImageUpload) return;
    setUploading(field);
    try {
      const url = await onImageUpload(localSku.id, file, field);
      if (url) {
        const updates = { [field]: url } as Partial<SKU>;
        await update(updates);
      }
    } finally {
      setUploading(null);
    }
  }, [localSku.id, onImageUpload, update]);

  const advancePhase = useCallback(async () => {
    const order: DesignPhase[] = ['range_plan', 'sketch', 'prototyping', 'production', 'completed'];
    const idx = order.indexOf(localSku.design_phase || 'range_plan');
    if (idx < order.length - 1) {
      setSavingPhase(true);
      const next = order[idx + 1];
      await update({ design_phase: next });
      setActivePhase(next === 'completed' ? 'production' : next);
      setSavingPhase(false);
    }
  }, [localSku.design_phase, update]);

  const addProtoIteration = useCallback(async () => {
    const newIter: ProtoIteration = {
      id: crypto.randomUUID(),
      images: [],
      notes: protoNotes,
      status: 'pending',
      created_at: new Date().toISOString().split('T')[0],
    };
    const iterations = [...(localSku.proto_iterations || []), newIter];
    await update({ proto_iterations: iterations });
    setProtoNotes('');
  }, [localSku.proto_iterations, protoNotes, update]);

  const updateProtoIteration = useCallback(async (iterId: string, updates: Partial<ProtoIteration>) => {
    const iterations = (localSku.proto_iterations || []).map(it =>
      it.id === iterId ? { ...it, ...updates } : it
    );
    await update({ proto_iterations: iterations });
  }, [localSku.proto_iterations, update]);

  const deleteProtoIteration = useCallback(async (iterId: string) => {
    const iterations = (localSku.proto_iterations || []).filter(it => it.id !== iterId);
    await update({ proto_iterations: iterations });
  }, [localSku.proto_iterations, update]);

  /* ── Phase labels ── */
  const phaseLabel = (phase: DesignPhase): string => {
    const labels: Record<DesignPhase, string> = {
      range_plan: t.skuPhases?.rangePlan || 'Range Plan',
      sketch: t.skuPhases?.sketch || 'Sketch',
      prototyping: t.skuPhases?.prototyping || 'Prototyping',
      production: t.skuPhases?.production || 'Production',
      completed: t.skuPhases?.completed || 'Completed',
    };
    return labels[phase];
  };

  /* ── Advance CTA label ── */
  const advanceLabel = (): string => {
    const labels: Record<string, string> = {
      range_plan: t.skuPhases?.advanceToSketch || 'Advance to Sketch',
      sketch: t.skuPhases?.advanceToProto || 'Send to Prototyping',
      prototyping: t.skuPhases?.advanceToProduction || 'Approve for Production',
      production: t.skuPhases?.markCompleted || 'Mark as Completed',
    };
    return labels[localSku.design_phase || 'range_plan'] || '';
  };

  const isCompleted = localSku.design_phase === 'completed';

  return (
    <div className="fixed inset-0 z-[60] bg-crema overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-crema border-b border-carbon/[0.06]">
          <div className="flex items-center justify-between px-6 sm:px-10 py-5">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={onClose} className="flex items-center gap-1.5 text-carbon/40 hover:text-carbon transition-colors shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[10px] font-medium tracking-[0.1em] uppercase hidden sm:inline">{t.skuPhases?.back || 'Back'}</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-light text-carbon tracking-tight truncate">
                  {localSku.name}
                </h1>
                <p className="text-[11px] text-carbon/35 mt-0.5">
                  {localSku.family} · Drop {localSku.drop_number} ·{' '}
                  <span className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.05em] uppercase text-white rounded ${
                    localSku.type === 'REVENUE' ? 'bg-[#9c7c4c]' :
                    localSku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'
                  }`}>
                    {localSku.type === 'IMAGEN' ? 'IMAGE' : localSku.type}
                  </span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-carbon/30 hover:text-carbon transition-colors shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Phase Timeline ── */}
          <div className="px-6 sm:px-10 pb-5">
            <div className="flex items-center gap-0">
              {PHASES.map((phase, idx) => {
                const isActive = activePhase === phase.id;
                const isReached = idx <= currentPhaseIdx;
                const isCurrentPhase = idx === currentPhaseIdx;
                const isDone = idx < currentPhaseIdx || isCompleted;

                return (
                  <React.Fragment key={phase.id}>
                    {idx > 0 && (
                      <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-carbon' : 'bg-carbon/[0.1]'}`} />
                    )}
                    <button
                      onClick={() => setActivePhase(phase.id)}
                      className={`flex items-center gap-2 px-3 py-2 transition-all ${
                        isActive
                          ? 'bg-carbon text-crema'
                          : isReached
                            ? 'text-carbon hover:bg-carbon/[0.04]'
                            : 'text-carbon/25 cursor-default'
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold ${
                        isDone && !isActive
                          ? 'bg-carbon text-crema'
                          : isActive
                            ? 'bg-crema/20 text-crema'
                            : isReached
                              ? 'bg-carbon/[0.1] text-carbon/60'
                              : 'bg-carbon/[0.05] text-carbon/20'
                      }`}>
                        {isDone && !isActive ? <Check className="h-3 w-3" /> : phase.stepNumber}
                      </span>
                      <span className="text-[10px] font-medium tracking-[0.08em] uppercase whitespace-nowrap hidden sm:inline">
                        {phaseLabel(phase.id)}
                      </span>
                      {isCurrentPhase && !isCompleted && (
                        <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
              {/* Completed indicator */}
              {isCompleted && (
                <>
                  <div className="flex-1 h-px mx-1 bg-carbon" />
                  <div className="flex items-center gap-2 px-3 py-2 bg-carbon text-crema">
                    <Check className="h-4 w-4" />
                    <span className="text-[10px] font-medium tracking-[0.08em] uppercase hidden sm:inline">
                      {phaseLabel('completed')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Phase Content ── */}
        <div className="px-6 sm:px-10 py-8 space-y-6">
          {/* ═══ RANGE PLAN PHASE ═══ */}
          {activePhase === 'range_plan' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reference Image */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.referenceImage || 'Reference Image'}
                  </p>
                  <ImageUploadArea
                    imageUrl={localSku.reference_image_url}
                    uploading={uploading === 'reference_image_url'}
                    placeholder={t.skuPhases?.uploadReference || 'Upload reference image'}
                    onUpload={(file) => handleImageUploadForField(file, 'reference_image_url')}
                    onRemove={() => update({ reference_image_url: undefined })}
                    aspectClass="aspect-square"
                  />
                </div>

                {/* Financial Summary */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.financials || 'Financial Details'}
                  </p>
                  <div className="bg-white border border-carbon/[0.06] p-5 space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <MetricCell label="PVP" value={`€${localSku.pvp}`} />
                      <MetricCell label="COGS" value={`€${localSku.cost}`} />
                      <MetricCell label={t.skuPhases?.units || 'Units'} value={String(localSku.buy_units)} />
                      <MetricCell label={t.skuPhases?.margin || 'Margin'} value={`${Math.round(localSku.margin)}%`} />
                    </div>
                    <div className="border-t border-carbon/[0.05] pt-3 grid grid-cols-4 gap-4">
                      <MetricCell label={t.skuPhases?.discount || 'Discount'} value={`${localSku.discount}%`} secondary />
                      <MetricCell label={t.skuPhases?.finalPrice || 'Final Price'} value={`€${localSku.final_price}`} secondary />
                      <MetricCell label={t.skuPhases?.sellThrough || 'Sell-through'} value={`${localSku.sale_percentage}%`} secondary />
                      <MetricCell label={t.skuPhases?.expectedSales || 'Expected'} value={`€${Math.round(localSku.expected_sales).toLocaleString()}`} secondary />
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="bg-white border border-carbon/[0.06] p-5">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.channel || 'Channel'}</p>
                        <p className="text-sm font-light text-carbon">{localSku.channel}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.origin || 'Origin'}</p>
                        <p className="text-sm font-light text-carbon">{localSku.origin || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.role || 'Role'}</p>
                        <p className="text-sm font-light text-carbon">
                          {localSku.sku_role === 'BESTSELLER_REINVENTION' ? 'Bestseller' :
                           localSku.sku_role === 'CARRYOVER' ? 'Carry-over' :
                           localSku.sku_role || 'New'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                  {t.skuPhases?.notes || 'Notes & Concept'}
                </p>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  onBlur={() => {
                    if (editingNotes !== (localSku.notes || '')) {
                      update({ notes: editingNotes });
                    }
                  }}
                  placeholder={t.skuPhases?.notesPlaceholder || 'Concept description, fabric ideas, inspiration references...'}
                  className="w-full h-24 p-4 bg-white border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
                />
              </div>
            </>
          )}

          {/* ═══ SKETCH PHASE ═══ */}
          {activePhase === 'sketch' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sketch Upload */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.designSketch || 'Design Sketch'}
                  </p>
                  <ImageUploadArea
                    imageUrl={localSku.sketch_url}
                    uploading={uploading === 'sketch_url'}
                    placeholder={t.skuPhases?.uploadSketch || 'Upload design sketch'}
                    onUpload={(file) => handleImageUploadForField(file, 'sketch_url')}
                    onRemove={() => update({ sketch_url: undefined })}
                    aspectClass="aspect-[3/4]"
                  />
                </div>

                {/* Reference comparison */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.referenceComparison || 'Reference'}
                  </p>
                  {localSku.reference_image_url ? (
                    <div className="border border-carbon/[0.06] overflow-hidden">
                      <img src={localSku.reference_image_url} alt="Reference" className="w-full object-contain max-h-80 bg-white" />
                    </div>
                  ) : (
                    <div className="border border-carbon/[0.06] bg-white aspect-[3/4] flex items-center justify-center">
                      <p className="text-xs text-carbon/20">{t.skuPhases?.noReference || 'No reference image'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Design notes */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                  {t.skuPhases?.designNotes || 'Design Notes'}
                </p>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  onBlur={() => {
                    if (editingNotes !== (localSku.notes || '')) {
                      update({ notes: editingNotes });
                    }
                  }}
                  placeholder={t.skuPhases?.sketchNotesPlaceholder || 'Materials, construction details, key design decisions...'}
                  className="w-full h-24 p-4 bg-white border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
                />
              </div>
            </>
          )}

          {/* ═══ PROTOTYPING PHASE ═══ */}
          {activePhase === 'prototyping' && (
            <>
              {/* Side-by-side: Sketch + Proto iterations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sketch reference (small) */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.sketchReference || 'Sketch Reference'}
                  </p>
                  {localSku.sketch_url ? (
                    <div className="border border-carbon/[0.06] overflow-hidden">
                      <img src={localSku.sketch_url} alt="Sketch" className="w-full object-contain max-h-60 bg-white" />
                    </div>
                  ) : localSku.reference_image_url ? (
                    <div className="border border-carbon/[0.06] overflow-hidden">
                      <img src={localSku.reference_image_url} alt="Reference" className="w-full object-contain max-h-60 bg-white" />
                    </div>
                  ) : (
                    <div className="border border-carbon/[0.06] bg-white aspect-square flex items-center justify-center">
                      <p className="text-xs text-carbon/20">{t.skuPhases?.noSketch || 'No sketch uploaded'}</p>
                    </div>
                  )}
                </div>

                {/* Proto Iterations */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                      {t.skuPhases?.protoIterations || 'Prototype Iterations'}
                    </p>
                    <span className="text-[10px] text-carbon/25">
                      {(localSku.proto_iterations || []).length} {t.skuPhases?.iterations || 'iterations'}
                    </span>
                  </div>

                  {/* Existing iterations */}
                  {(localSku.proto_iterations || []).map((iter, idx) => (
                    <ProtoIterationCard
                      key={iter.id}
                      iteration={iter}
                      index={idx}
                      onUpdate={(updates) => updateProtoIteration(iter.id, updates)}
                      onDelete={() => deleteProtoIteration(iter.id)}
                      onImageUpload={onImageUpload ? async (file) => {
                        if (!onImageUpload) return;
                        setUploading(`proto-${iter.id}`);
                        try {
                          const url = await onImageUpload(localSku.id, file, 'reference_image_url');
                          if (url) {
                            await updateProtoIteration(iter.id, {
                              images: [...iter.images, url],
                            });
                          }
                        } finally {
                          setUploading(null);
                        }
                      } : undefined}
                      uploading={uploading === `proto-${iter.id}`}
                      t={t}
                    />
                  ))}

                  {/* Add new iteration */}
                  <div className="border border-dashed border-carbon/[0.1] bg-white p-5 space-y-3">
                    <p className="text-xs font-light text-carbon/50">
                      {t.skuPhases?.newIterationDesc || 'Add a new prototype iteration with photos and notes.'}
                    </p>
                    <textarea
                      value={protoNotes}
                      onChange={(e) => setProtoNotes(e.target.value)}
                      placeholder={t.skuPhases?.protoNotesPlaceholder || 'Notes for this iteration (issues found, corrections needed...)'}
                      className="w-full h-16 p-3 border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
                    />
                    <button
                      onClick={addProtoIteration}
                      className="flex items-center gap-2 px-4 py-2 border border-carbon/[0.1] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 hover:text-carbon/70 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> {t.skuPhases?.addIteration || 'Add Iteration'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ PRODUCTION PHASE ═══ */}
          {activePhase === 'production' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Production Sample Image */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.productionSample || 'Production Sample'}
                  </p>
                  <ImageUploadArea
                    imageUrl={localSku.production_sample_url}
                    uploading={uploading === 'production_sample_url'}
                    placeholder={t.skuPhases?.uploadProductionSample || 'Upload production sample photo'}
                    onUpload={(file) => handleImageUploadForField(file, 'production_sample_url')}
                    onRemove={() => update({ production_sample_url: undefined })}
                    aspectClass="aspect-square"
                  />
                </div>

                {/* Size Run — final quantities */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.sizeRunFinal || 'Size Run — Final Quantities'}
                  </p>
                  <div className="bg-white border border-carbon/[0.06] p-5">
                    <SizeRunEditor
                      category={localSku.category}
                      sizeRun={localSku.size_run || {}}
                      buyUnits={localSku.buy_units}
                      onUpdate={(sizeRun) => update({ size_run: sizeRun } as Partial<SKU>)}
                    />
                  </div>

                  {/* Financial recap */}
                  <div className="bg-white border border-carbon/[0.06] p-5">
                    <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35 mb-3">
                      {t.skuPhases?.financialRecap || 'Financial Recap'}
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <MetricCell label="PVP" value={`€${localSku.pvp}`} />
                      <MetricCell label="COGS" value={`€${localSku.cost}`} />
                      <MetricCell label={t.skuPhases?.margin || 'Margin'} value={`${Math.round(localSku.margin)}%`} />
                    </div>
                  </div>

                  {/* Approval status */}
                  {isCompleted ? (
                    <div className="bg-carbon text-crema p-4 flex items-center gap-3">
                      <Check className="h-5 w-5" />
                      <div>
                        <p className="text-[11px] font-medium tracking-[0.08em] uppercase">
                          {t.skuPhases?.approvedForProduction || 'Approved for Production'}
                        </p>
                        <p className="text-[10px] text-crema/50 mt-0.5">
                          {t.skuPhases?.approvedDesc || 'This SKU has been approved and is ready for production order.'}
                        </p>
                      </div>
                    </div>
                  ) : localSku.design_phase === 'production' ? (
                    <div className="border border-carbon/[0.08] bg-carbon/[0.02] p-4 flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-carbon/30" />
                      <p className="text-[11px] text-carbon/40">
                        {t.skuPhases?.pendingApproval || 'Review the production sample and approve when ready.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Proto history (read-only) */}
              {(localSku.proto_iterations || []).length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
                    {t.skuPhases?.protoHistory || 'Prototype History'}
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {(localSku.proto_iterations || []).map((iter, idx) => (
                      <div key={iter.id} className="shrink-0 w-48 border border-carbon/[0.06] bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-carbon/50 uppercase tracking-wider">
                            Proto {idx + 1}
                          </span>
                          <ProtoStatusBadge status={iter.status} />
                        </div>
                        {iter.images[0] && (
                          <img src={iter.images[0]} alt="" className="w-full aspect-square object-cover" />
                        )}
                        {iter.notes && (
                          <p className="text-[11px] text-carbon/40 line-clamp-2">{iter.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="sticky bottom-0 bg-crema border-t border-carbon/[0.06] px-6 sm:px-10 py-4 flex items-center justify-between">
          <button
            onClick={async () => {
              await onDelete(localSku.id);
              onClose();
            }}
            className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25 hover:text-red-600/60 transition-colors"
          >
            <Trash2 className="h-3 w-3" /> {t.skuPhases?.deleteSku || 'Delete SKU'}
          </button>

          {!isCompleted && (
            <button
              onClick={advancePhase}
              disabled={savingPhase}
              className="flex items-center gap-2 px-6 py-3 bg-carbon text-crema text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-50"
            >
              {savingPhase ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  {advanceLabel()} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════ */

/* ── Image Upload Area ── */
function ImageUploadArea({
  imageUrl, uploading, placeholder, onUpload, onRemove, aspectClass = 'aspect-square',
}: {
  imageUrl?: string;
  uploading: boolean;
  placeholder: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  aspectClass?: string;
}) {
  return (
    <div className={`border border-carbon/[0.06] overflow-hidden bg-white ${aspectClass} relative`}>
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="" className="w-full h-full object-contain" />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-carbon/80 text-white flex items-center justify-center hover:bg-carbon transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-carbon/[0.02] transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          {uploading ? (
            <Loader2 className="h-6 w-6 text-carbon/20 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-carbon/15 mb-2" />
              <span className="text-[11px] text-carbon/25">{placeholder}</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}

/* ── Metric Cell ── */
function MetricCell({ label, value, secondary }: { label: string; value: string; secondary?: boolean }) {
  return (
    <div>
      <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`font-light text-carbon ${secondary ? 'text-sm' : 'text-base'}`}>{value}</p>
    </div>
  );
}

/* ── Proto Status Badge ── */
function ProtoStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-carbon/[0.06]', text: 'text-carbon/40', label: 'Pending' },
    issues: { bg: 'bg-[#c77000]/10', text: 'text-[#c77000]', label: 'Issues' },
    approved: { bg: 'bg-[#2d6a4f]/10', text: 'text-[#2d6a4f]', label: 'Approved' },
    rejected: { bg: 'bg-carbon/10', text: 'text-carbon/50', label: 'Rejected' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.05em] uppercase ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

/* ── Proto Iteration Card ── */
function ProtoIterationCard({
  iteration, index, onUpdate, onDelete, onImageUpload, uploading, t,
}: {
  iteration: ProtoIteration;
  index: number;
  onUpdate: (updates: Partial<ProtoIteration>) => void;
  onDelete: () => void;
  onImageUpload?: (file: File) => void;
  uploading: boolean;
  t: ReturnType<typeof useTranslation>;
}) {
  const [notes, setNotes] = useState(iteration.notes);

  return (
    <div className="bg-white border border-carbon/[0.06] p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-carbon/40">
            Proto {index + 1}
          </span>
          <span className="text-[10px] text-carbon/25">{iteration.created_at}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status selector */}
          <select
            value={iteration.status}
            onChange={(e) => onUpdate({ status: e.target.value as ProtoIteration['status'] })}
            className="text-[10px] font-medium tracking-[0.06em] uppercase bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="issues">Issues</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={onDelete} className="text-carbon/20 hover:text-red-500/60 transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Images */}
      <div className="flex gap-2 overflow-x-auto">
        {iteration.images.map((img, i) => (
          <div key={i} className="shrink-0 w-28 h-28 border border-carbon/[0.06] overflow-hidden">
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {/* Add photo */}
        {onImageUpload && (
          <label className="shrink-0 w-28 h-28 border border-dashed border-carbon/[0.1] flex flex-col items-center justify-center cursor-pointer hover:bg-carbon/[0.02] transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageUpload(file);
              }}
            />
            {uploading ? (
              <Loader2 className="h-4 w-4 text-carbon/20 animate-spin" />
            ) : (
              <>
                <Camera className="h-4 w-4 text-carbon/15" />
                <span className="text-[9px] text-carbon/20 mt-1">{t.skuPhases?.addPhoto || 'Add photo'}</span>
              </>
            )}
          </label>
        )}
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (notes !== iteration.notes) onUpdate({ notes });
        }}
        placeholder={t.skuPhases?.iterationNotesPlaceholder || 'Issues found, corrections needed, comments...'}
        className="w-full h-16 p-3 border border-carbon/[0.06] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
      />
    </div>
  );
}

/* ── Size Run Editor ── */
function SizeRunEditor({
  category, sizeRun, buyUnits, onUpdate,
}: {
  category: string;
  sizeRun: Record<string, number>;
  buyUnits: number;
  onUpdate: (sizeRun: Record<string, number>) => void;
}) {
  const sizes = category === 'CALZADO'
    ? ['35','36','37','38','39','40','41','42','43','44','45']
    : category === 'ROPA'
      ? ['XXS','XS','S','M','L','XL','XXL']
      : ['ONE'];

  const total = Object.values(sizeRun).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sizes.map(size => (
          <div key={size} className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-carbon/30 uppercase tracking-wider">{size}</span>
            <input
              type="number"
              min={0}
              className="h-8 w-14 text-center text-xs border border-carbon/[0.08] bg-transparent text-carbon focus:outline-none focus:border-carbon/[0.2]"
              value={sizeRun[size] || ''}
              placeholder="0"
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                const newRun = { ...sizeRun, [size]: val };
                if (val === 0) delete newRun[size];
                onUpdate(newRun);
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-carbon/30">
        <span>Total: {total} units</span>
        {buyUnits > 0 && total !== buyUnits && (
          <span className="text-[#c77000]">Plan: {buyUnits} units</span>
        )}
      </div>
    </div>
  );
}
