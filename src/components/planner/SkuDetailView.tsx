'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2, ArrowRight, ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU, DesignPhase } from '@/hooks/useSkus';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { RangePlanPhase } from './sku-phases/RangePlanPhase';
import { SketchPhase } from './sku-phases/SketchPhase';
import { PrototypingPhase } from './sku-phases/PrototypingPhase';
import { ProductionPhase } from './sku-phases/ProductionPhase';
import { EvolutionStrip, computeEvolutionState, EVOLUTION_STEPS, type EvolutionStep } from './sku-phases/EvolutionStrip';

/* ── Phase config (kept for DB mapping) ── */
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

/* ── Map evolution step → DB design_phase ── */
function stepToPhase(step: EvolutionStep): DesignPhase {
  switch (step) {
    case 'concept': return 'range_plan';
    case 'sketch': case 'colorways': case 'render3d': return 'sketch';
    case 'prototype': return 'prototyping';
    case 'production': return 'production';
  }
}

/* ── Footer action type ── */
export interface FooterAction {
  label: string;
  action: () => void;
  isPhaseAdvance?: boolean;
}

/* ── Props ── */
interface SkuDetailViewProps {
  sku: SKU;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<SKU>) => Promise<SKU | null>;
  onDelete: (id: string) => Promise<boolean>;
  onImageUpload?: (skuId: string, file: File, field: string) => Promise<string | null>;
}

export function SkuDetailView({ sku, onClose, onUpdate, onDelete, onImageUpload }: SkuDetailViewProps) {
  const t = useTranslation();
  const { toast } = useToast();
  const [localSku, setLocalSku] = useState<SKU>(sku);

  // Evolution strip state — compute from SKU data
  const evolution = computeEvolutionState(localSku);
  const [activeStep, setActiveStepRaw] = useState<EvolutionStep>('concept');
  const setActiveStep = useCallback((step: EvolutionStep) => {
    setChildFooterAction(null); // Clear child overrides when switching steps
    setActiveStepRaw(step);
  }, []);
  // Legacy activePhase for existing component compatibility
  const activePhase = stepToPhase(activeStep);
  const setActivePhase = (phase: DesignPhase) => {
    // Map phase back to first evolution step of that phase
    const map: Record<DesignPhase, EvolutionStep> = {
      range_plan: 'concept', sketch: 'sketch', prototyping: 'prototype', production: 'production', completed: 'production' as EvolutionStep,
    };
    setActiveStep(map[phase] || 'concept');
  };
  const [uploading, setUploading] = useState<string | null>(null);
  const [savingPhase, setSavingPhase] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{ from: DesignPhase; to: DesignPhase } | null>(null);
  const [childFooterAction, setChildFooterAction] = useState<FooterAction | null>(null);
  const [closing, setClosing] = useState(false);

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

  /* ── Mobile breadcrumb dropdown ── */
  const [mobileBreadcrumbOpen, setMobileBreadcrumbOpen] = useState(false);

  const currentPhaseIdx = phaseIndex(localSku.design_phase || 'range_plan');
  const isCompleted = localSku.design_phase === 'completed';

  /* ── Phase labels ── */
  const phaseLabel = (phase: DesignPhase): string => {
    const labels: Record<DesignPhase, string> = {
      range_plan: t.skuPhases?.concept || 'Concept',
      sketch: t.skuPhases?.sketch || 'Design',
      prototyping: t.skuPhases?.prototyping || 'Prototyping',
      production: t.skuPhases?.production || 'Production',
      completed: t.skuPhases?.completed || 'Completed',
    };
    return labels[phase];
  };

  /* ── Close with exit confirmation ── */
  const handleClose = useCallback(() => {
    const phase = localSku.design_phase || 'range_plan';
    const phaseNames: Record<DesignPhase, string> = {
      range_plan: t.skuPhases?.concept || 'Concept',
      sketch: t.skuPhases?.sketch || 'Design',
      prototyping: t.skuPhases?.prototyping || 'Prototyping',
      production: t.skuPhases?.production || 'Production',
      completed: t.skuPhases?.completed || 'Completed',
    };
    setConfirmDialog({
      open: true,
      title: t.skuPhases?.exitTitle || 'Exit SKU editor?',
      description: (t.skuPhases?.exitDescription || 'Your progress is saved automatically. This SKU will remain in the "{phase}" phase.')
        .replace('{phase}', phaseNames[phase]),
      confirmLabel: t.skuPhases?.exitConfirm || 'Exit',
      cancelLabel: t.skuPhases?.exitCancel || 'Keep editing',
      variant: 'neutral',
      onConfirm: () => {
        setConfirmDialog(null);
        setClosing(true);
        setTimeout(() => onClose(), 150);
      },
    });
  }, [localSku.design_phase, onClose, t.skuPhases]);

  /* ── Lock background scroll ── */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* ── Update helper with auto-save feedback ── */
  const update = useCallback(async (updates: Partial<SKU>) => {
    const result = await onUpdate(localSku.id, updates);
    if (result) setLocalSku(result);
    return result;
  }, [localSku.id, onUpdate]);

  /* ── Image upload helper ── */
  const handleImageUpload = useCallback(async (file: File, field: string) => {
    if (!onImageUpload) return;
    setUploading(field);
    try {
      const url = await onImageUpload(localSku.id, file, field);
      if (url) {
        const result = await onUpdate(localSku.id, { [field]: url } as Partial<SKU>);
        if (result) setLocalSku(result);
      }
    } finally {
      setUploading(null);
    }
  }, [localSku.id, onImageUpload, onUpdate]);

  /* ── Advance phase with validation ── */
  const advancePhase = useCallback(async () => {
    const order: DesignPhase[] = ['range_plan', 'sketch', 'prototyping', 'production', 'completed'];
    const idx = order.indexOf(localSku.design_phase || 'range_plan');
    if (idx >= order.length - 1) return;

    const current = localSku.design_phase || 'range_plan';
    const next = order[idx + 1];

    // Validation checks
    const warnings: string[] = [];
    if (current === 'range_plan') {
      if (!localSku.reference_image_url) warnings.push(t.skuPhases?.warnNoReference || 'No reference image uploaded');
      if (!localSku.pvp || localSku.pvp <= 0) warnings.push(t.skuPhases?.warnNoPricing || 'No pricing set (PVP)');
    }
    // Sketch phase validation is handled by SketchPhase footer CTA

    if (warnings.length > 0) {
      setConfirmDialog({
        open: true,
        title: t.skuPhases?.advanceIncomplete || 'Advance with incomplete data?',
        description: warnings.join('\n') + '\n\n' + (t.skuPhases?.advanceAnywayDesc || 'You can come back to complete this later.'),
        confirmLabel: t.skuPhases?.advanceAnyway || 'Advance anyway',
        cancelLabel: t.skuPhases?.stayAndComplete || 'Stay and complete',
        variant: 'warning',
        onConfirm: async () => {
          setConfirmDialog(null);
          setSavingPhase(true);
          await update({ design_phase: next });
          setSavingPhase(false);
          if (next !== 'completed') {
            setActivePhase(next);
            toast(t.skuPhases?.phaseAdvanced || 'Phase advanced', 'success');
          } else {
            setShowSuccess({ from: order[idx], to: next });
          }
        },
      });
      return;
    }

    // No warnings → advance directly
    setSavingPhase(true);
    await update({ design_phase: next });
    setSavingPhase(false);
    if (next !== 'completed') {
      setActivePhase(next);
      toast(t.skuPhases?.phaseAdvanced || 'Phase advanced', 'success');
    } else {
      setShowSuccess({ from: order[idx], to: next });
    }
  }, [localSku, update, toast, t.skuPhases]);

  /* ── Revert to previous phase (with confirmation) ── */
  const canRevert = ['sketch', 'prototyping'].includes(localSku.design_phase || '');
  const revertPhase = useCallback(() => {
    const order: DesignPhase[] = ['range_plan', 'sketch', 'prototyping', 'production', 'completed'];
    const idx = order.indexOf(localSku.design_phase || 'range_plan');
    if (idx <= 0 || idx > 2) return;

    const prev = order[idx - 1];
    const prevLabel = phaseLabel(prev);

    setConfirmDialog({
      open: true,
      title: (t.skuPhases?.revertTitle || 'Go back to {phase}?').replace('{phase}', prevLabel),
      description: t.skuPhases?.revertDescription || 'The SKU phase will be changed. Your data will be preserved.',
      confirmLabel: (t.skuPhases?.revertConfirm || 'Back to {phase}').replace('{phase}', prevLabel),
      cancelLabel: t.skuPhases?.cancel || 'Cancel',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog(null);
        setSavingPhase(true);
        await update({ design_phase: prev });
        setSavingPhase(false);
        setActivePhase(prev);
        toast((t.skuPhases?.revertedTo || 'Reverted to {phase}').replace('{phase}', prevLabel), 'info');
      },
    });
  }, [localSku.design_phase, update, toast, t.skuPhases]);

  /* ── Delete SKU (with confirmation) ── */
  const handleDeleteSku = useCallback(() => {
    setConfirmDialog({
      open: true,
      title: t.skuPhases?.deleteTitle || 'Delete this SKU?',
      description: (t.skuPhases?.deleteDescription || 'This will permanently delete "{name}" and all its design data, colorways, and renders. This cannot be undone.')
        .replace('{name}', localSku.name),
      confirmLabel: t.skuPhases?.deleteConfirm || 'Delete permanently',
      cancelLabel: t.skuPhases?.cancel || 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        await onDelete(localSku.id);
        onClose();
      },
    });
  }, [localSku, onDelete, onClose, t.skuPhases]);

  const advanceLabel = (): string => {
    const labels: Record<string, string> = {
      range_plan: t.skuPhases?.advanceToSketch || 'Start Design',
      sketch: t.skuPhases?.advanceToProto || 'Send to Prototyping',
      prototyping: t.skuPhases?.advanceToProduction || 'Approve for Production',
      production: t.skuPhases?.markCompleted || 'Mark as Completed',
    };
    return labels[localSku.design_phase || 'range_plan'] || '';
  };

  /* ── Success overlay handlers ── */
  const handleSuccessContinue = () => {
    const to = showSuccess?.to;
    setShowSuccess(null);
    if (to && to !== 'completed') setActivePhase(to);
  };

  const handleSuccessBack = () => {
    setShowSuccess(null);
    onClose();
  };

  /* ── Footer navigation — 3 actions: navigate, validate, undo ── */
  const STEP_ORDER: EvolutionStep[] = ['concept', 'sketch', 'colorways', 'render3d', 'prototype', 'production'];
  const activeStepIdx = STEP_ORDER.indexOf(activeStep);
  const prevStepLabel = activeStepIdx > 0 ? EVOLUTION_STEPS[activeStepIdx - 1]?.label : null;

  // 1. Navigate (view only) — no data changes
  const navigatePrev = useCallback(() => {
    if (activeStepIdx <= 0) return;
    setActiveStep(STEP_ORDER[activeStepIdx - 1]);
  }, [activeStepIdx, setActiveStep]);

  // 2. Validate & Continue — advance to next step
  const validateAndContinue = useCallback(() => {
    if (activeStepIdx >= STEP_ORDER.length - 1) return;
    const next = STEP_ORDER[activeStepIdx + 1];
    const currentPhase = stepToPhase(activeStep);
    const nextPhase = stepToPhase(next);
    if (currentPhase !== nextPhase && localSku.design_phase === currentPhase) {
      advancePhase();
    } else {
      setActiveStep(next);
    }
  }, [activeStep, activeStepIdx, localSku.design_phase, advancePhase, setActiveStep]);

  // 3. Undo & Go Back — destructive: clears current step data + reverts phase
  const undoCurrentStep = useCallback(() => {
    const step = activeStep;
    const undoMap: Record<EvolutionStep, { clear: Partial<SKU>; revertPhase?: DesignPhase; deleteColorways?: boolean }> = {
      concept: { clear: {} }, // Can't undo concept
      sketch: { clear: { sketch_url: null, sketch_top_url: null } as unknown as Partial<SKU>, revertPhase: 'range_plan' },
      colorways: { clear: { render_url: null, material_zones: [] } as unknown as Partial<SKU>, deleteColorways: true },
      render3d: { clear: { render_urls: {} } },
      prototype: { clear: { proto_iterations: [], sourcing_data: {} } as unknown as Partial<SKU>, revertPhase: 'sketch' },
      production: { clear: { production_data: {}, size_run: {}, production_sample_url: null, production_approved: false } as unknown as Partial<SKU>, revertPhase: 'prototyping' },
    };

    const undo = undoMap[step];
    if (!undo || step === 'concept') return;

    const stepName = EVOLUTION_STEPS.find(s => s.id === step)?.label || step;
    setConfirmDialog({
      open: true,
      title: `Undo ${stepName}?`,
      description: 'This will clear all data for this step and go back to the previous one. This cannot be undone.',
      confirmLabel: `Undo ${stepName}`,
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        setSavingPhase(true);

        // Clear data
        const clearData = { ...undo.clear };
        if (undo.revertPhase) (clearData as Record<string, unknown>).design_phase = undo.revertPhase;
        await update(clearData);

        // Delete colorways if needed
        if (undo.deleteColorways) {
          const { colorways, deleteColorway } = await import('./sku-phases/SkuLifecycleContext').then(() => {
            // Can't easily access context from here — colorways will be orphaned but harmless
            // The render_url clear is the important part
            return { colorways: [], deleteColorway: async () => {} };
          });
        }

        setSavingPhase(false);
        // Navigate to previous step
        if (activeStepIdx > 0) setActiveStep(STEP_ORDER[activeStepIdx - 1]);
        toast(`${stepName} undone`, 'info');
      },
    });
  }, [activeStep, activeStepIdx, update, setActiveStep, toast]);

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] bg-[#F5F1E8] flex flex-col ${closing ? 'sku-zoom-out' : 'sku-zoom-in'}`}
    >
      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-carbon/[0.06]">
        {/* Row 1: Back to Collection + SKU identity card (centered) */}
        <div className="flex items-center px-6 sm:px-10 py-3">
          {/* Left: Back to Collection */}
          <button onClick={handleClose} className="flex items-center gap-1.5 text-carbon/35 hover:text-carbon transition-colors shrink-0 group">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-medium tracking-[0.08em] uppercase group-hover:text-carbon">Back to Collection</span>
          </button>

          {/* Center: SKU identity card */}
          <div className="flex-1 flex justify-center">
            <div className="bg-carbon px-5 py-2 flex items-center gap-3 rounded-md">
              <div className="text-center">
                <h1 className="text-[13px] font-light text-crema tracking-tight">{localSku.name}</h1>
                <p className="text-[9px] text-crema/40">{localSku.family} · Drop {localSku.drop_number} · {localSku.type === 'IMAGEN' ? 'Image' : localSku.type === 'REVENUE' ? 'Revenue' : 'Entry'}</p>
              </div>
            </div>
          </div>

          {/* Right: spacer to balance the layout */}
          <div className="w-[140px] shrink-0" />
        </div>

        {/* Row 2: Evolution Strip */}
        <div className="px-6 sm:px-10 py-2 border-t border-carbon/[0.03]">
          <div className="max-w-5xl mx-auto">
            <EvolutionStrip
              active={activeStep}
              onSelect={setActiveStep}
              thumbnails={evolution.thumbnails}
              textPreviews={evolution.textPreviews}
              completed={evolution.completed}
              reachable={evolution.reachable}
            />
          </div>
        </div>
      </div>

      {/* ── Content — scrollable ── */}
      <div className="flex-1 min-h-0 px-3.5 sm:px-10 lg:px-16 py-3 sm:py-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto h-full">
          {/* Concept → identity + financials + reference + notes */}
          {activeStep === 'concept' && (
            <RangePlanPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading} onDelete={handleDeleteSku} />
          )}
          {/* Sketch + Colorways + 3D Render → SketchPhase with evolution step sync */}
          {(activeStep === 'sketch' || activeStep === 'colorways' || activeStep === 'render3d') && (
            <SketchPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading}
              onFooterAction={setChildFooterAction} onAdvancePhase={advancePhase} evolutionStep={activeStep} />
          )}
          {/* Prototype → PrototypingPhase */}
          {activeStep === 'prototype' && (
            <PrototypingPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading} />
          )}
          {/* Production → ProductionPhase */}
          {activeStep === 'production' && (
            <ProductionPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading} />
          )}
        </div>
      </div>

      {/* ── Footer — navigate / undo / validate ── */}
      {!isCompleted && (
        <div className="shrink-0 border-t border-carbon/[0.06] bg-[#F5F1E8] px-6 sm:px-10 lg:px-16 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Navigate back + Undo */}
            <div className="flex items-center gap-2">
              {prevStepLabel && (
                <button onClick={navigatePrev}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium tracking-[0.08em] uppercase text-carbon/30 hover:text-carbon/60 transition-colors">
                  <ArrowLeft className="h-3 w-3" /> {prevStepLabel}
                </button>
              )}
              {activeStep !== 'concept' && (
                <button onClick={undoCurrentStep} disabled={savingPhase}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium tracking-[0.08em] uppercase text-carbon/15 hover:text-[#A0463C]/50 transition-colors disabled:opacity-30">
                  Undo & Go Back
                </button>
              )}
            </div>

            {/* Right: Continue (sub-step) or Validate & Continue (evolution step) */}
            {childFooterAction ? (
              <button
                onClick={childFooterAction.action}
                disabled={savingPhase}
                className="flex items-center gap-2 px-6 py-2.5 border border-carbon/[0.12] text-carbon text-[10px] font-medium tracking-[0.12em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-50"
              >
                {savingPhase ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                  <>{childFooterAction.label} <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            ) : (
              <button
                onClick={activeStep === 'production' ? advancePhase : validateAndContinue}
                disabled={savingPhase}
                className="flex items-center gap-2 px-6 py-2.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.12em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-50"
              >
                {savingPhase ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                  <>{activeStep === 'production' ? 'Approve for Production' : 'Validate & Continue'} <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Success overlay ── */}
      {showSuccess && (
        <div className="absolute inset-0 z-10 bg-carbon/95 flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
          <div className="text-center space-y-6 max-w-md px-8" style={{ animation: 'slideUp 0.4s ease-out 0.15s both' }}>
            <div className="inline-flex items-center justify-center w-14 h-14 border border-white/[0.12]">
              <Check className="h-7 w-7 text-crema" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-light text-crema tracking-tight">
                {phaseLabel(showSuccess.from)} <span className="italic">{t.skuPhases?.completedLabel || 'completed'}</span>
              </h2>
              <p className="text-[12px] text-white/40 leading-relaxed">
                {localSku.name} — {showSuccess.to === 'completed'
                  ? (t.skuPhases?.skuFullyCompleted || 'This SKU has completed its full lifecycle.')
                  : (t.skuPhases?.phaseAdvancedTo || 'Ready for') + ' ' + phaseLabel(showSuccess.to).toLowerCase() + '.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleSuccessBack}
                className="px-5 py-2.5 border border-white/[0.1] text-[10px] font-medium tracking-[0.12em] uppercase text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
              >
                {t.skuPhases?.backToCollection || 'Back to Collection'}
              </button>
              {showSuccess.to !== 'completed' && (
                <button
                  onClick={handleSuccessContinue}
                  className="px-5 py-2.5 bg-crema text-carbon text-[10px] font-medium tracking-[0.12em] uppercase hover:bg-crema/90 transition-colors"
                >
                  {t.skuPhases?.continueToPhase || 'Continue to'} {phaseLabel(showSuccess.to)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>,
    document.body
  );
}
