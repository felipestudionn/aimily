"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import type { CollectionPlan, SetupData } from "@/types/planner";
import { CollectionBuilder } from './CollectionBuilder';
import { useTranslation } from '@/i18n';
import { useSkus } from '@/hooks/useSkus';
import { useTimeline } from '@/contexts/TimelineContext';

interface PlannerDashboardProps {
  plan: CollectionPlan;
  initialPhaseFilter?: string;
}

const EMPTY_SETUP: SetupData = {
  totalSalesTarget: 0,
  monthlyDistribution: [8, 8, 10, 10, 12, 10, 8, 8, 8, 6, 6, 6],
  expectedSkus: 0,
  families: [],
  dropsCount: 1,
  avgPriceTarget: 0,
  targetMargin: 0,
  plannedDiscounts: 0,
  productCategory: '',
  productFamilies: [],
  priceSegments: [],
  productTypeSegments: [],
  minPrice: 0,
  maxPrice: 0,
};

export function PlannerDashboard({ plan, initialPhaseFilter }: PlannerDashboardProps) {
  const t = useTranslation();
  const router = useRouter();
  const { updateMilestoneStatus } = useTimeline();
  const [setupData] = useState<SetupData>({ ...EMPTY_SETUP, ...plan.setup_data });
  const [showCelebration, setShowCelebration] = useState(false);
  const { skus } = useSkus(plan.id);

  const collectionId = plan.id;
  const displayName = plan.name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const handleConfirmDraft = () => {
    // Mark Range Planning milestones as completed → unlocks Design block
    updateMilestoneStatus('rp-5', 'completed'); // SKU Definition
    updateMilestoneStatus('rp-6', 'completed'); // Go-to-Market Strategy → Design unlockWhen
    setShowCelebration(true);
  };

  return (
    <div className="px-6 sm:px-10 md:px-14 lg:px-20 pt-8 pb-16">
      {/* Header removed — navbar breadcrumb already shows collection name */}

      {/* Collection Builder — the main content */}
      <CollectionBuilder
        setupData={setupData}
        collectionPlanId={plan.id}
        initialPhaseFilter={initialPhaseFilter}
      />

      {/* What's Next section removed — SKU detail EvolutionStrip now handles the flow */}

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ animation: 'fadeIn 0.6s ease-out forwards' }}>
          <div className="absolute inset-0 bg-carbon/95" style={{ animation: 'fadeIn 0.4s ease-out forwards' }} />
          <div className="relative z-10 text-center px-6 max-w-2xl" style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
            <div className="w-16 h-16 mx-auto mb-8 border border-crema/20 flex items-center justify-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}>
              <Check className="h-7 w-7 text-crema/80" />
            </div>
            <div className="text-[10px] font-medium tracking-[0.4em] uppercase text-crema/30 mb-4" style={{ animation: 'fadeIn 0.6s ease-out 0.8s both' }}>
              {displayName} · {plan.season}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-crema tracking-tight leading-[1.1] mb-6" style={{ animation: 'fadeIn 0.6s ease-out 1s both' }}>
              {t.rangePlan.celebrationDraftLabel}<br /><span className="italic">{t.rangePlan.celebrationTitle}</span>.
            </h2>
            <p className="text-sm sm:text-base font-light text-crema/50 leading-relaxed max-w-lg mx-auto mb-3" style={{ animation: 'fadeIn 0.6s ease-out 1.3s both' }}>
              {skus.length} {t.rangePlan.celebrationReadyDesc.replace('{families}', String(setupData.productFamilies.length))}
            </p>
            <p className="text-xs text-crema/30 leading-relaxed max-w-md mx-auto mb-10" style={{ animation: 'fadeIn 0.6s ease-out 1.5s both' }}>
              {t.rangePlan.celebrationFlowDesc}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'fadeIn 0.6s ease-out 1.8s both' }}>
              <button
                onClick={() => router.push(`/collection/${collectionId}/design`)}
                className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-white transition-colors"
              >
                {t.rangePlan.startDesign} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push(`/collection/${collectionId}`)}
                className="flex items-center gap-2 px-6 py-3 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/50 border border-crema/15 hover:text-crema/80 hover:border-crema/30 transition-colors"
              >
                {t.rangePlan.backToDashboard}
              </button>
            </div>
            <button
              onClick={() => setShowCelebration(false)}
              className="mt-8 text-[10px] tracking-[0.1em] uppercase text-crema/20 hover:text-crema/40 transition-colors"
            >
              {t.rangePlan.stayEditing}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
