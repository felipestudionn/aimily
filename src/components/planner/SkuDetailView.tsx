'use client';

import React, { useState, useCallback } from 'react';
import { X, Loader2, Trash2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
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
      const next = order[idx + 1];
      await update({ design_phase: next });
      setActivePhase(next === 'completed' ? 'production' : next);
      setSavingPhase(false);
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
      range_plan: t.skuPhases?.advanceToSketch || 'Advance to Sketch',
      sketch: t.skuPhases?.advanceToProto || 'Send to Prototyping',
      prototyping: t.skuPhases?.advanceToProduction || 'Approve for Production',
      production: t.skuPhases?.markCompleted || 'Mark as Completed',
    };
    return labels[localSku.design_phase || 'range_plan'] || '';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-carbon/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[90vw] max-w-6xl h-[88vh] bg-crema flex flex-col overflow-hidden rounded-[12px]">
        {/* Header */}
        <div className="shrink-0 border-b border-carbon/[0.06]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={onClose} className="flex items-center gap-1.5 text-carbon/40 hover:text-carbon transition-colors shrink-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[10px] font-medium tracking-[0.1em] uppercase hidden sm:inline">{t.skuPhases?.back || 'Back'}</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-light text-carbon tracking-tight truncate">{localSku.name}</h1>
                <p className="text-[11px] text-carbon/35 mt-0.5">
                  {localSku.family} · Drop {localSku.drop_number} ·{' '}
                  <span className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.05em] uppercase text-white rounded ${
                    localSku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : localSku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'
                  }`}>{localSku.type === 'IMAGEN' ? 'IMAGE' : localSku.type}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-carbon/30 hover:text-carbon transition-colors shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Phase Timeline */}
          <div className="px-6 pb-3">
            <div className="flex items-center gap-0">
              {PHASES.map((phase, idx) => {
                const isActive = activePhase === phase.id;
                const isReached = idx <= currentPhaseIdx;
                const isCurrentPhase = idx === currentPhaseIdx;
                const isDone = idx < currentPhaseIdx || isCompleted;
                return (
                  <React.Fragment key={phase.id}>
                    {idx > 0 && <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-carbon' : 'bg-carbon/[0.1]'}`} />}
                    <button
                      onClick={() => setActivePhase(phase.id)}
                      className={`flex items-center gap-2 px-3 py-2 transition-all ${
                        isActive ? 'bg-carbon text-crema' : isReached ? 'text-carbon hover:bg-carbon/[0.04]' : 'text-carbon/25 cursor-default'
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold ${
                        isDone && !isActive ? 'bg-carbon text-crema' : isActive ? 'bg-crema/20 text-crema' : isReached ? 'bg-carbon/[0.1] text-carbon/60' : 'bg-carbon/[0.05] text-carbon/20'
                      }`}>{isDone && !isActive ? <Check className="h-3 w-3" /> : phase.stepNumber}</span>
                      <span className="text-[10px] font-medium tracking-[0.08em] uppercase whitespace-nowrap hidden sm:inline">{phaseLabel(phase.id)}</span>
                      {isCurrentPhase && !isCompleted && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />}
                    </button>
                  </React.Fragment>
                );
              })}
              {isCompleted && (
                <>
                  <div className="flex-1 h-px mx-1 bg-carbon" />
                  <div className="flex items-center gap-2 px-3 py-2 bg-carbon text-crema">
                    <Check className="h-4 w-4" />
                    <span className="text-[10px] font-medium tracking-[0.08em] uppercase hidden sm:inline">{phaseLabel('completed')}</span>
                  </div>
                </>
              )}
            </div>
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

        {/* Footer */}
        <div className="shrink-0 border-t border-carbon/[0.06] px-6 py-3 flex items-center justify-between">
          <button
            onClick={async () => { await onDelete(localSku.id); onClose(); }}
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
              {savingPhase ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{advanceLabel()} <ArrowRight className="h-4 w-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
