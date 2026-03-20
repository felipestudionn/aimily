'use client';

import React, { useState, useCallback } from 'react';
import { X, Loader2, Trash2, ArrowRight, ArrowLeft, Check, PartyPopper } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU, DesignPhase } from '@/hooks/useSkus';
import { RangePlanPhase } from './sku-phases/RangePlanPhase';
import { SketchPhase } from './sku-phases/SketchPhase';
import { PrototypingPhase } from './sku-phases/PrototypingPhase';
import { ProductionPhase } from './sku-phases/ProductionPhase';

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
  onImageUpload?: (skuId: string, file: File, field: string) => Promise<string | null>;
}

export function SkuDetailView({ sku, onClose, onUpdate, onDelete, onImageUpload }: SkuDetailViewProps) {
  const t = useTranslation();
  const [activePhase, setActivePhase] = useState<DesignPhase>(sku.design_phase || 'range_plan');
  const [localSku, setLocalSku] = useState<SKU>(sku);
  const [uploading, setUploading] = useState<string | null>(null);
  const [savingPhase, setSavingPhase] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{ from: DesignPhase; to: DesignPhase } | null>(null);

  const currentPhaseIdx = phaseIndex(localSku.design_phase || 'range_plan');
  const isCompleted = localSku.design_phase === 'completed';

  /* ── Update helper ── */
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

  /* ── Advance phase ── */
  const advancePhase = useCallback(async () => {
    const order: DesignPhase[] = ['range_plan', 'sketch', 'prototyping', 'production', 'completed'];
    const idx = order.indexOf(localSku.design_phase || 'range_plan');
    if (idx < order.length - 1) {
      setSavingPhase(true);
      const from = order[idx];
      const next = order[idx + 1];
      await update({ design_phase: next });
      setSavingPhase(false);
      setShowSuccess({ from, to: next });
    }
  }, [localSku.design_phase, update]);

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

  const advanceLabel = (): string => {
    const labels: Record<string, string> = {
      range_plan: t.skuPhases?.advanceToSketch || 'Send to Sketch',
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-carbon/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[90vw] max-w-6xl h-[88vh] bg-crema flex flex-col overflow-hidden rounded-[12px]">
        {/* Header — compact */}
        <div className="shrink-0 border-b border-carbon/[0.06]">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onClose} className="text-carbon/30 hover:text-carbon transition-colors shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-light text-carbon tracking-tight truncate">{localSku.name}</h1>
                <p className="text-[10px] text-carbon/30 mt-0">
                  {localSku.family} · Drop {localSku.drop_number} ·{' '}
                  <span className={`inline-block px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.05em] uppercase text-white rounded-sm ${
                    localSku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : localSku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'
                  }`}>{localSku.type === 'IMAGEN' ? 'IMAGE' : localSku.type}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-carbon/25 hover:text-carbon transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Phase breadcrumb — minimal */}
          <div className="px-6 pb-2.5 flex items-center gap-0">
            {PHASES.map((phase, idx) => {
              const isActive = activePhase === phase.id;
              const isReached = idx <= currentPhaseIdx;
              const isCurrentPhase = idx === currentPhaseIdx;
              const isDone = idx < currentPhaseIdx || isCompleted;
              return (
                <React.Fragment key={phase.id}>
                  {idx > 0 && <div className={`w-6 h-px mx-0.5 ${isDone ? 'bg-carbon/30' : 'bg-carbon/[0.08]'}`} />}
                  <button
                    onClick={() => isReached && setActivePhase(phase.id)}
                    disabled={!isReached}
                    className={`flex items-center gap-1.5 py-1 transition-colors ${
                      isActive
                        ? 'text-carbon'
                        : isDone
                          ? 'text-carbon/40 hover:text-carbon/60'
                          : 'text-carbon/20 cursor-default'
                    }`}
                  >
                    {isDone && !isActive ? (
                      <Check className="h-3 w-3 text-carbon/40" />
                    ) : (
                      <span className={`text-[9px] font-medium ${isActive ? 'text-carbon' : ''}`}>{phase.stepNumber}</span>
                    )}
                    <span className={`text-[10px] tracking-[0.06em] uppercase whitespace-nowrap ${
                      isActive ? 'font-semibold' : 'font-medium'
                    }`}>{phaseLabel(phase.id)}</span>
                    {isCurrentPhase && !isCompleted && isActive && (
                      <span className="w-1 h-1 bg-carbon rounded-full animate-pulse" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
            {isCompleted && (
              <>
                <div className="w-6 h-px mx-0.5 bg-carbon/30" />
                <div className="flex items-center gap-1.5 py-1 text-carbon/40">
                  <Check className="h-3 w-3" />
                  <span className="text-[10px] font-medium tracking-[0.06em] uppercase">{phaseLabel('completed')}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Phase Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activePhase === 'range_plan' && (
            <RangePlanPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading} />
          )}
          {activePhase === 'sketch' && (
            <SketchPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading} />
          )}
          {activePhase === 'prototyping' && (
            <PrototypingPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading} />
          )}
          {activePhase === 'production' && (
            <ProductionPhase sku={localSku} onUpdate={async (u) => { await update(u); }} onImageUpload={(f, field) => handleImageUpload(f, field)} uploading={uploading} />
          )}
        </div>

        {/* Footer — single CTA */}
        <div className="shrink-0 border-t border-carbon/[0.06] px-6 py-2.5 flex items-center justify-between">
          <button
            onClick={async () => { await onDelete(localSku.id); onClose(); }}
            className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.1em] uppercase text-carbon/20 hover:text-red-600/50 transition-colors"
          >
            <Trash2 className="h-3 w-3" /> {t.skuPhases?.deleteSku || 'Delete SKU'}
          </button>
          {!isCompleted && (
            <button
              onClick={advancePhase}
              disabled={savingPhase}
              className="flex items-center gap-2 px-5 py-2.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.12em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-50"
            >
              {savingPhase ? <Loader2 className="h-3 w-3 animate-spin" /> : <>{advanceLabel()} <ArrowRight className="h-3.5 w-3.5" /></>}
            </button>
          )}
        </div>

        {/* ── Success overlay ── */}
        {showSuccess && (
          <div className="absolute inset-0 z-10 bg-carbon/95 flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
            <div className="text-center space-y-6 max-w-md px-8" style={{ animation: 'slideUp 0.4s ease-out 0.15s both' }}>
              <div className="inline-flex items-center justify-center w-14 h-14 border border-white/[0.12]">
                <Check className="h-7 w-7 text-crema" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-light text-crema tracking-tight">
                  {phaseLabel(showSuccess.from)} <span className="italic">completed</span>
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
      </div>
    </div>
  );
}

/* ── Keyframe animations (used inline) ── */
const _styles = `
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
`;
