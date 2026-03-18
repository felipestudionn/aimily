"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import type { CollectionPlan, SetupData } from "@/types/planner";
import { CollectionBuilder } from './CollectionBuilder';
import { useTranslation } from '@/i18n';
import { useSkus } from '@/hooks/useSkus';

interface PlannerDashboardProps {
  plan: CollectionPlan;
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

export function PlannerDashboard({ plan }: PlannerDashboardProps) {
  const t = useTranslation();
  const router = useRouter();
  const [setupData] = useState<SetupData>({ ...EMPTY_SETUP, ...plan.setup_data });
  const [showCelebration, setShowCelebration] = useState(false);
  const { skus } = useSkus(plan.id);

  const collectionId = plan.id;
  const displayName = plan.name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const handleConfirmDraft = () => {
    setShowCelebration(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 md:px-12 pt-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-medium tracking-[0.25em] uppercase text-carbon/25 mb-3">
          Range Plan
        </p>
        <h1 className="text-2xl sm:text-3xl font-light text-carbon tracking-tight leading-[1.15]">
          {displayName} <span className="italic">Collection</span>
        </h1>
        <p className="text-xs text-carbon/35 mt-2 font-light">
          {plan.season} · {setupData.productFamilies.length} families · {setupData.expectedSkus} SKUs planned
        </p>
      </div>

      {/* Collection Builder — the main content */}
      <CollectionBuilder
        setupData={setupData}
        collectionPlanId={plan.id}
      />

      {/* Confirm Draft CTA */}
      {skus.length > 0 && (
        <div className="mt-8 bg-white border border-carbon/[0.06] p-6 sm:p-8 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-light text-carbon tracking-tight">
              Ready to start <span className="italic">designing</span>?
            </h3>
            <p className="text-xs text-carbon/35 mt-1">
              Confirm your draft range plan to unlock Design & Development.
            </p>
          </div>
          <button
            onClick={handleConfirmDraft}
            className="flex items-center gap-2 px-6 py-3 bg-carbon text-crema text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors shrink-0"
          >
            Confirm Draft Range Plan <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

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
              Your draft range plan<br />is <span className="italic">confirmed</span>.
            </h2>
            <p className="text-sm sm:text-base font-light text-crema/60 leading-relaxed max-w-lg mx-auto mb-4" style={{ animation: 'fadeIn 0.6s ease-out 1.3s both' }}>
              {skus.length} SKUs across {setupData.productFamilies.length} families.
              Your collection has a plan now. Time to bring it to life.
            </p>
            <p className="text-xs text-crema/30 italic mb-10" style={{ animation: 'fadeIn 0.6s ease-out 1.5s both' }}>
              Design & Development is now unlocked.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'fadeIn 0.6s ease-out 1.8s both' }}>
              <button
                onClick={() => router.push(`/collection/${collectionId}/design`)}
                className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-white transition-colors"
              >
                Start Design & Development <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push(`/collection/${collectionId}`)}
                className="flex items-center gap-2 px-6 py-3 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/50 border border-crema/15 hover:text-crema/80 hover:border-crema/30 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
            <button
              onClick={() => setShowCelebration(false)}
              className="mt-8 text-[10px] tracking-[0.1em] uppercase text-crema/20 hover:text-crema/40 transition-colors"
            >
              Stay here and keep editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
