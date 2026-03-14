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
  Megaphone,
  Factory,
  Zap,
  BarChart3,
  PenTool,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { PHASES } from '@/lib/timeline-template';
import { WIZARD_PHASES } from '@/lib/wizard-phases';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import { useTranslation } from '@/i18n';

const WORKSPACE_ICONS: Record<string, React.ElementType> = {
  overview: LayoutDashboard,
  calendar: CalendarDays,
  product: ShoppingBag,
  brand: Paintbrush,
  design: Pencil,
  prototyping: Wrench,
  sampling: Scissors,
  marketing: Megaphone,
  production: Factory,
};

const BLOCK_ICONS: Record<TimelinePhase, React.ElementType> = {
  creative: Paintbrush,
  planning: BarChart3,
  development: PenTool,
  go_to_market: Rocket,
};

interface CollectionSidebarProps {
  collectionId: string;
  collectionName: string;
  season?: string;
  milestones?: TimelineMilestone[];
}

function getBlockProgress(milestones: TimelineMilestone[], block: TimelinePhase): number {
  const blockMilestones = milestones.filter((m) => m.phase === block);
  if (blockMilestones.length === 0) return 0;
  const completed = blockMilestones.filter((m) => m.status === 'completed').length;
  return Math.round((completed / blockMilestones.length) * 100);
}

function getWorkspaceProgress(milestones: TimelineMilestone[], workspaceId: string): number {
  const wizardPhase = WIZARD_PHASES.find((p) => p.id === workspaceId);
  if (!wizardPhase) return 0;
  const wsMilestones = milestones.filter((m) => wizardPhase.milestoneIds.includes(m.id));
  if (wsMilestones.length === 0) return 0;
  const completed = wsMilestones.filter((m) => m.status === 'completed').length;
  return Math.round((completed / wsMilestones.length) * 100);
}

export function CollectionSidebar({
  collectionId,
  collectionName,
  season,
  milestones = [],
}: CollectionSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslation();

  const basePath = `/collection/${collectionId}`;

  // Calculate overall progress
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Block groups with translated labels
  const BLOCK_GROUPS: {
    block: TimelinePhase;
    label: string;
    workspaces: Array<{ id: string; path: string; label: string }>;
  }[] = [
    {
      block: 'creative',
      label: t.sidebar.creativeAndBrand,
      workspaces: [
        { id: 'product', path: '/product', label: t.sidebar.creativeAndBrand },
        { id: 'brand', path: '/brand', label: t.sidebar.creativeAndBrand },
      ],
    },
    {
      block: 'planning',
      label: t.sidebar.merchandisingPlanning,
      workspaces: [],
    },
    {
      block: 'development',
      label: t.sidebar.designDevelopment,
      workspaces: [
        { id: 'design', path: '/design', label: t.sidebar.sketchColorMaterials },
        { id: 'prototyping', path: '/prototyping', label: t.sidebar.prototyping },
        { id: 'sampling', path: '/sampling', label: t.sidebar.selectionCatalog },
        { id: 'production', path: '/production', label: t.sidebar.productionLogistics },
      ],
    },
    {
      block: 'go_to_market',
      label: t.sidebar.marketingDigital,
      workspaces: [
        { id: 'marketing', path: '/marketing/creation', label: t.sidebar.creation },
        { id: 'marketing', path: '/marketing/distribution', label: t.sidebar.distributionLaunch },
      ],
    },
  ];

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
              <span>{t.common.progress}</span>
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
        {/* Top-level items: Overview + Calendar */}
        {[
          { id: 'overview', path: '', label: t.sidebar.overview },
          { id: 'calendar', path: '/calendar', label: t.sidebar.calendar },
        ].map((item) => {
          const Icon = WORKSPACE_ICONS[item.id] || Zap;
          const fullPath = `${basePath}${item.path}`;
          const isActive =
            item.path === ''
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname?.startsWith(fullPath);

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
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Block groups with workspace sub-items */}
        {BLOCK_GROUPS.map((group) => {
          const BlockIcon = BLOCK_ICONS[group.block];
          const blockColor = PHASES[group.block].color;
          const blockProgress = milestones.length > 0 ? getBlockProgress(milestones, group.block) : undefined;

          // Skip rendering empty blocks (planning has no dedicated workspaces)
          if (group.workspaces.length === 0) return null;

          return (
            <div key={group.block} className="mt-3">
              {/* Block Header */}
              {!collapsed && (
                <div className="flex items-center gap-2 px-4 py-1.5 mx-2">
                  <BlockIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: blockColor }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 truncate">
                    {group.label}
                  </span>
                  {blockProgress !== undefined && blockProgress > 0 && (
                    <span className="text-[10px] text-gray-400 ml-auto">{blockProgress}%</span>
                  )}
                </div>
              )}

              {/* Workspace items */}
              {group.workspaces.map((ws) => {
                const Icon = WORKSPACE_ICONS[ws.id] || Zap;
                const fullPath = `${basePath}${ws.path}`;
                const isActive = pathname?.startsWith(fullPath);
                const progress = milestones.length > 0 ? getWorkspaceProgress(milestones, ws.id) : undefined;

                return (
                  <Link
                    key={ws.path}
                    href={fullPath}
                    className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={collapsed ? ws.label : undefined}
                  >
                    <Icon
                      className="h-4 w-4 flex-shrink-0"
                      style={!isActive ? { color: blockColor } : undefined}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{ws.label}</span>
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
            </div>
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
