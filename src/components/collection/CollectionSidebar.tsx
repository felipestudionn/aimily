'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  Rocket,
  Paintbrush,
  Pencil,
  Wrench,
  Scissors,
  Monitor,
  Megaphone,
  Factory,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { PHASES, PHASE_ORDER } from '@/lib/timeline-template';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';

const PHASE_ICONS: Record<string, React.ElementType> = {
  overview: LayoutDashboard,
  calendar: CalendarDays,
  olawave: ShoppingBag,
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

// Insert AI Studio between sampling and digital in the nav
const PHASE_ITEMS: Array<{ id: string; path: string; label: string; labelEs: string }> = PHASE_ORDER.map((phase) => ({
  id: phase,
  path: `/${phase === 'olawave' ? 'product' : phase}`,
  label: PHASES[phase].name,
  labelEs: PHASES[phase].nameEs,
}));

const samplingIdx = PHASE_ITEMS.findIndex((p) => p.id === 'sampling');
PHASE_ITEMS.splice(samplingIdx + 1, 0, {
  id: 'studio',
  path: '/studio',
  label: 'AI Creative Studio',
  labelEs: 'Estudio Creativo IA',
});

const SIDEBAR_ITEMS = [
  { id: 'overview', path: '', label: 'Overview', labelEs: 'Vista General' },
  { id: 'calendar', path: '/calendar', label: 'Calendar', labelEs: 'Calendario' },
  ...PHASE_ITEMS,
];

interface CollectionSidebarProps {
  collectionId: string;
  collectionName: string;
  season?: string;
  milestones?: TimelineMilestone[];
}

function getPhaseProgress(milestones: TimelineMilestone[], phase: TimelinePhase): number {
  const phaseMilestones = milestones.filter((m) => m.phase === phase);
  if (phaseMilestones.length === 0) return 0;
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  return Math.round((completed / phaseMilestones.length) * 100);
}

export function CollectionSidebar({
  collectionId,
  collectionName,
  season,
  milestones = [],
}: CollectionSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const basePath = `/collection/${collectionId}`;

  // Calculate overall progress
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <aside
      className={`fixed left-0 top-24 bottom-0 bg-white border-r border-gray-200 z-40 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Collection Header */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 truncate text-sm">{collectionName}</h2>
          {season && <p className="text-xs text-gray-500 mt-0.5">{season}</p>}
          {/* Overall Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-carbon rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="py-2 overflow-y-auto" style={{ maxHeight: collapsed ? 'calc(100vh - 6rem - 3rem)' : 'calc(100vh - 6rem - 8rem)' }}>
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = PHASE_ICONS[item.id] || Zap;
          const fullPath = `${basePath}${item.path}`;
          const isActive =
            item.path === ''
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname?.startsWith(fullPath);

          const isSpecial = item.id === 'overview' || item.id === 'calendar' || item.id === 'studio';
          const phaseColor = !isSpecial
            ? PHASES[item.id as TimelinePhase]?.color
            : item.id === 'studio' ? '#9C27B0' : undefined;

          const progress = !isSpecial && milestones.length > 0
            ? getPhaseProgress(milestones, item.id as TimelinePhase)
            : undefined;

          return (
            <Link
              key={item.id}
              href={fullPath}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className="h-4 w-4 flex-shrink-0"
                style={!isActive && phaseColor ? { color: phaseColor } : undefined}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {progress !== undefined && progress > 0 && (
                    <span
                      className={`text-xs ${
                        isActive ? 'text-white/70' : 'text-gray-400'
                      }`}
                    >
                      {progress}%
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
