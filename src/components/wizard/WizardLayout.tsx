'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { WizardSidebar } from '@/components/wizard/WizardSidebar';
import { Navbar } from '@/components/layout/navbar';
import { TimelineProvider } from '@/contexts/TimelineContext';
import type { TimelineMilestone } from '@/types/timeline';

interface WizardLayoutProps {
  children: React.ReactNode;
  collectionId: string;
  collectionName: string;
  season?: string;
  milestones: TimelineMilestone[];
  launchDate?: string | null;
  skuCount?: number;
  setupData?: Record<string, unknown> | null;
}

/* ── Sidebar widths (must match WizardSidebar constants + padding) ── */
const SIDEBAR_COLLAPSED = 72;
const SIDEBAR_EXPANDED = 280;

export function WizardLayout({
  children,
  collectionId,
  collectionName,
  season,
  milestones,
  launchDate,
  skuCount,
  setupData,
}: WizardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // open by default
  const [displayName, setDisplayName] = useState(collectionName);

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <TimelineProvider collectionPlanId={collectionId} initialMilestones={milestones}>
      {/* ── Persistent top navbar — shifts right for sidebar ── */}
      <Navbar
        variant="workspace"
        collectionName={displayName}
        collectionId={collectionId}
        sidebarWidth={sidebarWidth}
        onCollectionRename={setDisplayName}
      />

      {/* ── Floating sidebar ── */}
      <WizardSidebar
        collectionId={collectionId}
        collectionName={displayName}
        season={season}
        launchDate={launchDate}
        skuCount={skuCount}
        setupData={setupData}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Mobile hamburger — floating pill */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-[72px] left-4 z-30 w-10 h-10 rounded-full bg-white shadow-card text-carbon/60 flex items-center justify-center hover:shadow-card-hover transition-shadow"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* ── Main content — offset by sidebar width ── */}
      <main
        className="ml-0 pt-16 min-h-screen transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {children}
      </main>
    </TimelineProvider>
  );
}
