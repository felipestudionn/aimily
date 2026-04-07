'use client';

import React from 'react';
import { Check, FileText, Image, Pencil, Palette, Box, Factory, Package } from 'lucide-react';

export type EvolutionStep =
  | 'concept'
  | 'reference'
  | 'sketch'
  | 'colorways'
  | 'render3d'
  | 'prototype'
  | 'production';

export const EVOLUTION_STEPS: { id: EvolutionStep; label: string; icon: React.ElementType }[] = [
  { id: 'concept', label: 'Concept', icon: FileText },
  { id: 'reference', label: 'Reference', icon: Image },
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

export function EvolutionStrip({ active, onSelect, thumbnails, textPreviews, completed, reachable }: EvolutionStripProps) {
  const reachableIdx = EVOLUTION_STEPS.findIndex(s => s.id === reachable);

  return (
    <div className="flex items-stretch gap-px bg-carbon/[0.04] border border-carbon/[0.06] overflow-hidden overflow-x-auto">
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
            className={`flex-1 min-w-[80px] flex flex-col items-center transition-all relative ${
              isActive
                ? 'bg-white ring-1 ring-carbon/[0.12] z-10'
                : isCompleted
                  ? 'bg-white hover:bg-carbon/[0.02]'
                  : isReachable
                    ? 'bg-white/60 hover:bg-white/80'
                    : 'bg-carbon/[0.02] opacity-40 cursor-default'
            }`}
          >
            {/* Thumbnail area */}
            <div className={`w-full aspect-square flex items-center justify-center p-1.5 ${
              isActive ? 'bg-white' : ''
            }`}>
              {thumb ? (
                <img src={thumb} alt={step.label} className="w-full h-full object-contain" />
              ) : textPreview && isCompleted ? (
                <p className="text-[9px] font-light text-carbon/50 text-center leading-tight px-1 line-clamp-4">{textPreview}</p>
              ) : (
                <Icon className={`h-5 w-5 ${isActive ? 'text-carbon/40' : 'text-carbon/10'}`} />
              )}
            </div>

            {/* Label */}
            <div className={`w-full py-1.5 text-center border-t ${
              isActive
                ? 'border-carbon bg-carbon text-crema'
                : isCompleted
                  ? 'border-carbon/[0.04] text-carbon/40'
                  : 'border-carbon/[0.04] text-carbon/15'
            }`}>
              <span className="text-[7px] font-medium tracking-[0.1em] uppercase">{step.label}</span>
            </div>
          </button>
        );
      })}
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

  // Concept — completed if has name + pvp
  if (sku.name && sku.pvp && sku.pvp > 0) {
    completed.add('concept');
    const parts = [sku.name];
    if (sku.notes) parts.push(sku.notes.slice(0, 60));
    textPreviews.concept = parts.join(' · ');
  }

  // Reference
  if (sku.reference_image_url) {
    completed.add('reference');
    thumbnails.reference = sku.reference_image_url;
  }

  // Sketch B&W
  if (sku.sketch_url) {
    completed.add('sketch');
    thumbnails.sketch = sku.sketch_url;
  }

  // Colorways (colored sketch)
  if (sku.render_url) {
    completed.add('colorways');
    thumbnails.colorways = sku.render_url;
  }

  // 3D Render
  const render3d = (sku.render_urls as Record<string, string>)?.['3d'];
  if (render3d) {
    completed.add('render3d');
    thumbnails.render3d = render3d;
  }

  // Prototype — has at least one iteration with an image
  const protoImg = sku.proto_iterations?.find(it => it.images?.length > 0)?.images?.[0];
  if (protoImg) {
    completed.add('prototype');
    thumbnails.prototype = protoImg;
  }

  // Production — has sample photo
  if (sku.production_sample_url) {
    completed.add('production');
    thumbnails.production = sku.production_sample_url;
  }

  // Determine farthest reachable step — uses BOTH completion state AND DB design_phase
  // design_phase gates major transitions; within a phase, completion of prior steps gates the next
  const order: EvolutionStep[] = ['concept', 'reference', 'sketch', 'colorways', 'render3d', 'prototype', 'production'];
  const phaseGate: Record<string, number> = {
    range_plan: 1,   // can reach up to reference
    sketch: 4,       // can reach up to render3d
    prototyping: 5,  // can reach prototype
    production: 6,   // can reach production
    completed: 6,
  };
  const maxByPhase = phaseGate[sku.design_phase || 'range_plan'] ?? 0;

  // Within the phase, find farthest reachable by completion
  let maxByCompletion = 0;
  for (let i = 0; i < order.length; i++) {
    if (completed.has(order[i])) {
      maxByCompletion = i + 1; // next step is reachable
    } else {
      // Reference is optional — if concept done, sketch is reachable even without reference
      if (order[i] === 'reference' && completed.has('concept')) {
        maxByCompletion = i + 1;
        continue;
      }
      break;
    }
  }

  const reachableIdx = Math.min(Math.max(maxByPhase, maxByCompletion), order.length - 1);
  const reachable = order[reachableIdx];

  // Determine active step — farthest incomplete, or last if all done
  let active: EvolutionStep = 'concept';
  for (const step of order) {
    if (!completed.has(step) && step !== 'reference') { active = step; break; }
    if (!completed.has(step) && step === 'reference') { active = step; break; }
    active = step;
  }

  return { completed, thumbnails, textPreviews, reachable, active };
}
