import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PlannerDashboard } from '@/components/planner/PlannerDashboard';
import { TechPackWorkspace } from '@/components/tech-pack/TechPackWorkspace';
import { FinalSelectionWorkspace } from '@/components/design-dev/FinalSelectionWorkspace';
import { PrototypingWorkspace } from '@/components/design-dev/PrototypingWorkspace';
import { ProductionWorkspace } from '@/components/design-dev/ProductionWorkspace';
import { SketchColorWorkspace } from '@/components/design-dev/SketchColorWorkspace';
import type { CollectionPlan } from '@/types/planner';
import { loadDerivedSetupData } from '@/lib/derive-setup-data';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phase?: string }>;
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { phase } = await searchParams;

  const [planRes, derived] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', id).single(),
    loadDerivedSetupData(id),
  ]);

  if (planRes.error || !planRes.data) notFound();
  const plan = planRes.data as CollectionPlan;

  // Tech Pack workspace — dedicated sub-block (Sprint 5)
  if (phase === 'techpack') {
    return (
      <TechPackWorkspace
        collectionPlanId={id}
        collectionName={plan.name || 'Collection'}
        productCategory={derived.productCategory}
      />
    );
  }

  // Sketch & Color workspace — sketches, colorways, material zones
  if (phase === 'sketch') {
    return (
      <SketchColorWorkspace
        collectionPlanId={id}
        collectionName={plan.name || 'Collection'}
      />
    );
  }

  // Prototyping workspace — dedicated proto iteration tracker
  if (phase === 'prototyping') {
    return (
      <PrototypingWorkspace
        collectionPlanId={id}
        collectionName={plan.name || 'Collection'}
      />
    );
  }

  // Production workspace — PO + sample validation hub
  if (phase === 'production') {
    return (
      <ProductionWorkspace
        collectionPlanId={id}
        collectionName={plan.name || 'Collection'}
      />
    );
  }

  // Final Selection workspace — dedicated curation view with live merch balance
  if (phase === 'selection') {
    return (
      <FinalSelectionWorkspace
        collectionPlanId={id}
        collectionName={plan.name || 'Collection'}
        derived={derived}
      />
    );
  }

  return <PlannerDashboard plan={plan} derived={derived} initialPhaseFilter={phase} />;
}
