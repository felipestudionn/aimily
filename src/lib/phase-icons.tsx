import {
  ShoppingBag,
  Paintbrush,
  PenTool,
  Wrench,
  Scissors,
  Sparkles,
  Monitor,
  Megaphone,
  Factory,
  Rocket,
} from 'lucide-react';
import type { TimelinePhase } from '@/types/timeline';
import type { ElementType } from 'react';

/**
 * Filled-style Lucide icons for each phase.
 * Used by WizardSidebar, workspace headers, GanttChart, etc.
 */
export const PHASE_ICONS: Record<TimelinePhase, ElementType> = {
  aimily: ShoppingBag,
  brand: Paintbrush,
  design: PenTool,
  prototyping: Wrench,
  sampling: Scissors,
  studio: Sparkles,
  digital: Monitor,
  marketing: Megaphone,
  production: Factory,
  launch: Rocket,
} as Record<TimelinePhase, ElementType>;

interface PhaseIconProps {
  phase: TimelinePhase | string;
  className?: string;
  filled?: boolean;
}

export function PhaseIcon({ phase, className = 'h-5 w-5', filled = true }: PhaseIconProps) {
  const Icon = PHASE_ICONS[phase as TimelinePhase];
  if (!Icon) return null;
  return <Icon className={className} fill={filled ? 'currentColor' : 'none'} />;
}
