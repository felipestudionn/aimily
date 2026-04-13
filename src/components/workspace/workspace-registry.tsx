'use client';

import { lazy, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useTimeline } from '@/contexts/TimelineContext';
import { createClient } from '@/lib/supabase/client';
import type { WorkspaceComponentProps } from './ViewPort';
import type { CollectionPlan } from '@/types/planner';

/* ══════════════════════════════════════════════════════════════
   Workspace Registry

   Maps route segments to lazy-loaded workspace components.
   Each workspace is wrapped to normalize props — components
   that need server data get client-side fetching wrappers.
   ══════════════════════════════════════════════════════════════ */

/* ── Lazy imports ── */

const LazyCreativePage = lazy(() => import('@/app/collection/[id]/creative/page'));
const LazyMerchandisingPage = lazy(() => import('@/app/collection/[id]/merchandising/page'));
const LazyBrandWorkspace = lazy(() =>
  import('@/components/brand/BrandWorkspace').then(m => ({ default: m.BrandWorkspace }))
);
const LazyPlannerDashboard = lazy(() =>
  import('@/components/planner/PlannerDashboard').then(m => ({ default: m.PlannerDashboard }))
);
const LazyMarketingCreation = lazy(() =>
  import('@/components/marketing/MarketingCreationScreen').then(m => ({ default: m.MarketingCreationScreen }))
);

/* ── Wrapper: Brand (needs milestones from context) ── */

function BrandWrapper({ collectionId }: WorkspaceComponentProps) {
  const { milestones } = useTimeline();
  return <LazyBrandWorkspace milestones={milestones} />;
}

/* ── Wrapper: Product / Collection Builder (needs plan data) ── */

function ProductWrapper({ collectionId, blockParam }: WorkspaceComponentProps) {
  const [plan, setPlan] = useState<CollectionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('collection_plans')
      .select('*')
      .eq('id', collectionId)
      .single()
      .then(({ data }) => {
        if (data) setPlan(data as CollectionPlan);
        setLoading(false);
      });
  }, [collectionId]);

  if (loading) {
    return (
      <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-16 pb-16 animate-pulse">
        <div className="h-10 w-48 bg-carbon/[0.06] rounded mx-auto mb-8" />
        <div className="h-[400px] bg-carbon/[0.04] rounded-[20px]" />
      </div>
    );
  }

  if (!plan) return null;

  return <LazyPlannerDashboard plan={plan} initialPhaseFilter={blockParam} />;
}

/* ── Wrapper: Marketing Creation (needs collectionPlanId + milestones) ── */

function MarketingCreationWrapper({ collectionId }: WorkspaceComponentProps) {
  const { milestones } = useTimeline();
  return <LazyMarketingCreation collectionPlanId={collectionId} milestones={milestones} />;
}

/* ── Wrapper: Creative (passes blockParam override) ── */

function CreativeWrapper({ blockParam }: WorkspaceComponentProps) {
  return <LazyCreativePage blockParamOverride={blockParam} />;
}

/* ── Wrapper: Merchandising (self-contained) ── */

function MerchandisingWrapper(_props: WorkspaceComponentProps) {
  return <LazyMerchandisingPage />;
}

/* ══════════════════════════════════════════════════════════════
   Registry: route segment → workspace component
   ══════════════════════════════════════════════════════════════ */

interface RegistryEntry {
  component: ComponentType<WorkspaceComponentProps>;
  fullWidth?: boolean;  // e.g. Collection Builder needs full viewport
}

const WORKSPACE_REGISTRY: Record<string, RegistryEntry> = {
  'creative': { component: CreativeWrapper },
  'brand': { component: BrandWrapper },
  'merchandising': { component: MerchandisingWrapper },
  'product': { component: ProductWrapper, fullWidth: true },
  'marketing/creation': { component: MarketingCreationWrapper },
};

/**
 * Resolve a sidebar route (e.g. "creative?block=consumer", "product?phase=sketch")
 * to a workspace component + parsed params.
 */
export function resolveWorkspace(route: string): {
  component: ComponentType<WorkspaceComponentProps>;
  workspaceId: string;
  params: Record<string, string>;
  fullWidth: boolean;
} | null {
  // Parse route: "creative?block=consumer" → base="creative", params={block: "consumer"}
  const [base, queryString] = route.split('?');
  const params: Record<string, string> = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((v, k) => { params[k] = v; });
  }

  const entry = WORKSPACE_REGISTRY[base];
  if (!entry) return null;

  return {
    component: entry.component,
    workspaceId: base,
    params,
    fullWidth: entry.fullWidth ?? false,
  };
}
