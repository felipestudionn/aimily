import {
  Paintbrush,
  BarChart3,
  PenTool,
  Rocket,
  // Workspace-level icons (used by sidebar, not calendar phases)
  ShoppingBag,
  Pencil,
  Wrench,
  Scissors,
  Sparkles,
  Monitor,
  Megaphone,
  Factory,
} from 'lucide-react';
import type { TimelinePhase } from '@/types/timeline';
import type { ElementType } from 'react';

/**
 * Icons for the 4 calendar blocks (phases).
 * Used by GanttChart, CollectionOverview phase cards, Excel export, etc.
 */
export const PHASE_ICONS: Record<TimelinePhase, ElementType> = {
  creative: Paintbrush,
  planning: BarChart3,
  development: PenTool,
  go_to_market: Rocket,
};

/**
 * Icons for individual workspaces (sidebar navigation).
 * These map to workspace route IDs, not TimelinePhase.
 */
export const WORKSPACE_ICONS: Record<string, ElementType> = {
  product: ShoppingBag,
  brand: Paintbrush,
  design: Pencil,
  prototyping: Wrench,
  sampling: Scissors,
  studio: Sparkles,
  digital: Monitor,
  marketing: Megaphone,
  production: Factory,
  launch: Rocket,
};

interface PhaseIconProps {
  phase: TimelinePhase | string;
  className?: string;
  filled?: boolean;
}

export function PhaseIcon({ phase, className = 'h-5 w-5', filled = true }: PhaseIconProps) {
  const Icon = PHASE_ICONS[phase as TimelinePhase] || WORKSPACE_ICONS[phase];
  if (!Icon) return null;
  return <Icon className={className} fill={filled ? 'currentColor' : 'none'} />;
}
