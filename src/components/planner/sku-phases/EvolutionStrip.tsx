'use client';

import React from 'react';
import { Check, FileText, Image as ImageIcon, Pencil, Palette, Box, Factory, Package, Lock } from 'lucide-react';

export type EvolutionStep =
  | 'concept'
  | 'sketch'
  | 'colorways'
  | 'render3d'
  | 'prototype'
  | 'production';

export const EVOLUTION_STEPS: { id: EvolutionStep; label: string; icon: React.ElementType }[] = [
  { id: 'concept', label: 'Concept', icon: FileText },
  { id: 'sketch', label: 'Sketch', icon: Pencil },
  { id: 'colorways', label: 'Color & Materials', icon: Palette },
  { id: 'render3d', label: '3D Render', icon: Box },
  { id: 'prototype', label: 'Prototype', icon: Factory },
  { id: 'production', label: 'Production', icon: Package },
];

interface EvolutionStripProps {
  active: EvolutionStep;
  onSelect: (step: EvolutionStep) => void;
  /** Map of step id → thumbnail URL (null if not yet completed) */
  thumbnails: Partial<Record<EvolutionStep, string | null>>;
  /** Map of step id → short text preview (for steps without images, like Concept) */
  textPreviews?: Partial<Record<EvolutionStep, string>>;
  /** Which steps are completed */
  completed: Set<EvolutionStep>;
  /** Farthest reachable step (user can click up to this) */
  reachable: EvolutionStep;
}

/* ═══════════════════════════════════════════════════════════════════
   EvolutionStrip — gold-standard 6-step card rail.

   Rendered above the SKU detail workspace. Each step is a mini card
   (rounded-[12px], aspect-[4/5] thumbnail + label) that the user can
   click to jump into that phase. Active step gets a ring + shadow;
   completed steps show a check corner; locked steps dim to 35%
   grayscale so the user reads the flow at a glance.
   ═══════════════════════════════════════════════════════════════════ */
export function EvolutionStrip({ active, onSelect, thumbnails, textPreviews, completed, reachable }: EvolutionStripProps) {
  const reachableIdx = EVOLUTION_STEPS.findIndex(s => s.id === reachable);

  return (
    <div className="bg-white rounded-[20px] border border-carbon/[0.06] p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {EVOLUTION_STEPS.map((step, idx) => {
          const isActive = step.id === active;
          const isCompleted = completed.has(step.id);
          const isReachable = idx <= reachableIdx;
          const thumb = thumbnails[step.id];
          const textPreview = textPreviews?.[step.id];
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => isReachable && onSelect(step.id)}
              disabled={!isReachable}
              className={`relative flex flex-col overflow-hidden rounded-[12px] text-left transition-all duration-200 ${
                isActive
                  ? 'ring-2 ring-carbon shadow-[0_8px_32px_rgba(0,0,0,0.08)] bg-white'
                  : isReachable
                    ? 'bg-carbon/[0.02] hover:bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] cursor-pointer'
                    : 'bg-carbon/[0.02] opacity-35 grayscale cursor-default'
              }`}
            >
              {/* Thumbnail area — aspect-square, fills the top of the card */}
              <div className="relative w-full aspect-square bg-carbon/[0.02] overflow-hidden">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={step.label} className="w-full h-full object-cover" />
                ) : textPreview ? (
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    <p className="text-[11px] text-carbon/55 text-center leading-snug line-clamp-4">{textPreview}</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isReachable ? (
                      <Icon className={`h-7 w-7 ${isActive ? 'text-carbon/40' : 'text-carbon/15'}`} strokeWidth={1.5} />
                    ) : (
                      <Lock className="h-5 w-5 text-carbon/20" strokeWidth={1.5} />
                    )}
                  </div>
                )}

                {/* Completed check — top-right corner */}
                {isCompleted && (
                  <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-carbon text-white' : 'bg-white text-carbon shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                  }`}>
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              {/* Label — 13px, semibold on active, medium on reachable */}
              <div className="px-2.5 py-2.5">
                <div className={`text-[12px] tracking-[-0.01em] leading-tight ${
                  isActive ? 'font-semibold text-carbon' : isReachable ? 'font-medium text-carbon/75' : 'text-carbon/30'
                }`}>
                  {step.label}
                </div>
                <div className={`text-[10px] tracking-[0.1em] uppercase mt-1 ${
                  isActive ? 'text-carbon/40' : 'text-carbon/30'
                }`}>
                  {String(idx + 1).padStart(2, '0')}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Helper: compute evolution state from SKU data ── */
export function computeEvolutionState(sku: {
  notes?: string;
  name?: string;
  pvp?: number;
  reference_image_url?: string;
  sketch_url?: string;
  render_url?: string;
  render_urls?: Record<string, string>;
  proto_iterations?: { images: string[]; status?: string }[];
  production_sample_url?: string;
  production_approved?: boolean;
  design_phase?: string;
}) {
  const completed = new Set<EvolutionStep>();
  const thumbnails: Partial<Record<EvolutionStep, string | null>> = {};
  const textPreviews: Partial<Record<EvolutionStep, string>> = {};

  // Concept — completed only when user has validated (advanced past range_plan)
  const conceptHasData = !!(sku.name && sku.pvp && sku.pvp > 0);
  const conceptValidated = sku.design_phase !== 'range_plan';
  if (conceptHasData && conceptValidated) {
    completed.add('concept');
  }
  if (sku.reference_image_url) {
    thumbnails.concept = sku.reference_image_url;
  } else if (sku.name) {
    const parts = [sku.name];
    if (sku.notes) parts.push(sku.notes.slice(0, 50));
    textPreviews.concept = parts.join(' · ');
  }

  if (sku.sketch_url) {
    completed.add('sketch');
    thumbnails.sketch = sku.sketch_url;
  }
  if (sku.render_url) {
    completed.add('colorways');
    thumbnails.colorways = sku.render_url;
  }
  const render3d = (sku.render_urls as Record<string, string>)?.['3d'];
  if (render3d) {
    completed.add('render3d');
    thumbnails.render3d = render3d;
  }
  const protoImg = sku.proto_iterations?.find(it => it.images?.length > 0)?.images?.[0];
  if (protoImg) {
    completed.add('prototype');
    thumbnails.prototype = protoImg;
  }
  if (sku.production_sample_url) {
    completed.add('production');
    thumbnails.production = sku.production_sample_url;
  }

  const order: EvolutionStep[] = ['concept', 'sketch', 'colorways', 'render3d', 'prototype', 'production'];
  const phaseGate: Record<string, number> = {
    range_plan: 0,
    sketch: 3,
    prototyping: 4,
    production: 5,
    completed: 5,
  };
  const maxByPhase = phaseGate[sku.design_phase || 'range_plan'] ?? 0;

  let maxByCompletion = 0;
  for (let i = 0; i < order.length; i++) {
    if (completed.has(order[i])) {
      maxByCompletion = i + 1;
    } else {
      break;
    }
  }

  const reachableIdx = Math.min(Math.max(maxByPhase, maxByCompletion), order.length - 1);
  const reachable = order[reachableIdx];

  let active: EvolutionStep = 'concept';
  for (const step of order) {
    if (!completed.has(step)) { active = step; break; }
    active = step;
  }

  // ImageIcon reserved for future use (empty-thumbnail state variant)
  void ImageIcon;

  return { completed, thumbnails, textPreviews, reachable, active };
}
