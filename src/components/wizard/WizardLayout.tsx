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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <TimelineProvider collectionPlanId={collectionId} initialMilestones={milestones}>
      {/* ── Persistent top navbar — shifts right for sidebar ── */}
      <Navbar
        variant="workspace"
        collectionName={collectionName}
        collectionId={collectionId}
        sidebarWidth={sidebarCollapsed ? 52 : 200}
      />

      {/* ── Sidebar below navbar ── */}
      <WizardSidebar
        collectionId={collectionId}
        collectionName={collectionName}
        season={season}
        launchDate={launchDate}
        skuCount={skuCount}
        setupData={setupData}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Mobile hamburger button — below navbar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-[72px] left-4 z-30 w-10 h-10 bg-carbon text-crema flex items-center justify-center shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <main className={`ml-0 pt-16 min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'md:ml-[52px]' : 'md:ml-[200px]'
      }`}>
        {children}
      </main>
    </TimelineProvider>
  );
}
