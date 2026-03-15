"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CollectionPlan, SetupData } from "@/types/planner";
import { CollectionBuilder } from './CollectionBuilder';
import { useTranslation } from '@/i18n';

interface PlannerDashboardProps {
  plan: CollectionPlan;
}

export function PlannerDashboard({ plan }: PlannerDashboardProps) {
  const t = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("builder");
  const [setupData] = useState<SetupData>(plan.setup_data);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-16">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-4">
          {t.plannerSections.productAndPlanning}
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          {plan.name}
        </h1>
        <p className="text-sm font-light text-carbon/40 mt-2">
          {t.plannerSections.season}: {plan.season || t.plannerSections.na}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent border border-carbon/[0.06]">
            <TabsTrigger value="builder" className="py-3 text-[11px] font-medium tracking-[0.08em] uppercase data-[state=active]:bg-carbon data-[state=active]:text-crema data-[state=active]:shadow-none text-carbon/40 rounded-none">{t.plannerSections.constructor}</TabsTrigger>
            <TabsTrigger value="strategic" className="py-3 text-[11px] font-medium tracking-[0.08em] uppercase data-[state=active]:bg-carbon data-[state=active]:text-crema data-[state=active]:shadow-none text-carbon/40 rounded-none">{t.plannerSections.strategicDashboard}</TabsTrigger>
            <TabsTrigger value="historical" className="py-3 text-[11px] font-medium tracking-[0.08em] uppercase data-[state=active]:bg-carbon data-[state=active]:text-crema data-[state=active]:shadow-none text-carbon/40 rounded-none">{t.plannerSections.historical}</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            {/* Full Collection Builder with SKU table */}
            <CollectionBuilder
              setupData={setupData}
              collectionPlanId={plan.id}
            />

            {/* Collection Framework Summary */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white border border-carbon/[0.06] p-8">
                  <h2 className="text-lg font-light text-carbon mb-4">{t.plannerSections.collectionFramework}</h2>
                  <p className="text-sm font-light text-carbon/40 mb-4">
                    {t.plannerSections.strategicParamsDesc}
                  </p>
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">{t.plannerSections.expectedSkus}</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">{setupData.expectedSkus}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">{t.plannerSections.drops}</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">{setupData.dropsCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">{t.plannerSections.targetMargin}</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">{setupData.targetMargin}%</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">{t.plannerSections.totalSalesTarget}</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">€{setupData.totalSalesTarget.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">{t.plannerSections.averagePriceTarget}</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">€{setupData.avgPriceTarget}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">{t.plannerSections.priceRange}</p>
                      <p className="text-sm font-light text-carbon">
                        €{setupData.minPrice}
                        <span className="text-carbon/30 px-1">&rarr;</span>
                        €{setupData.maxPrice}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-carbon/[0.06] p-8">
                  <h2 className="text-lg font-light text-carbon mb-4">{t.plannerSections.monthlyDistribution}</h2>
                  <p className="text-sm font-light text-carbon/40 mb-4">
                    {t.plannerSections.seasonalityDesc}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                    {setupData.monthlyDistribution.map((value, index) => (
                      <div
                        key={index}
                        className="space-y-1 border border-carbon/[0.06] bg-white p-2 flex flex-col items-start"
                      >
                        <span className="text-[10px] uppercase text-carbon/30">
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][index]}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-light text-carbon">{value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-carbon/[0.06] p-8">
                  <h2 className="text-lg font-light text-carbon mb-4">{t.plannerSections.familiesSnapshot}</h2>
                  <div className="space-y-2 text-sm">
                    {setupData.productFamilies.map((family) => (
                      <div key={family.name} className="flex items-center justify-between">
                        <span className="font-light text-carbon">{family.name}</span>
                        <span className="font-light text-carbon">{family.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-carbon/[0.06] p-8">
                  <h2 className="text-lg font-light text-carbon mb-4">{t.plannerSections.productTypesMix}</h2>
                  <div className="space-y-2 text-sm">
                    {setupData.productTypeSegments.map((seg) => (
                      <div key={seg.type} className="flex items-center justify-between">
                        <span className="font-light text-carbon">{seg.type}</span>
                        <span className="font-light text-carbon">{seg.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strategic" className="space-y-6">
            {/* Distribution Pyramid — IMAGEN / REVENUE / ENTRY */}
            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-2">{t.plannerSections.distributionPyramid}</h2>
              <p className="text-xs font-light text-carbon/40 mb-6">
                {t.plannerSections.distributionPyramidDesc}
              </p>
              <div className="flex flex-col items-center gap-1 mb-6">
                {(() => {
                  const pyramidOrder: Array<{ type: 'IMAGEN' | 'REVENUE' | 'ENTRY'; label: string; desc: string; color: string }> = [
                    { type: 'IMAGEN', label: 'Imagen', desc: t.plannerSections.heroAspirational, color: 'bg-carbon' },
                    { type: 'REVENUE', label: 'Revenue', desc: t.plannerSections.coreVolume, color: 'bg-carbon/70' },
                    { type: 'ENTRY', label: 'Entry', desc: t.plannerSections.accessibleCaptation, color: 'bg-carbon/40' },
                  ];
                  return pyramidOrder.map((tier, idx) => {
                    const seg = setupData.productTypeSegments.find(s => s.type === tier.type);
                    const pct = seg?.percentage || 0;
                    // Pyramid widths: top=40%, mid=70%, bottom=100%
                    const widths = ['40%', '70%', '100%'];
                    return (
                      <div key={tier.type} className="w-full flex flex-col items-center">
                        <div
                          className={`${tier.color} relative flex items-center justify-between px-4 py-3 text-crema transition-all`}
                          style={{ width: widths[idx], clipPath: idx === 0 ? 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)' : undefined }}
                        >
                          <span className="text-xs font-medium tracking-[0.1em] uppercase">{tier.label}</span>
                          <span className="text-lg font-light">{pct}%</span>
                        </div>
                        <p className="text-[10px] text-carbon/30 mt-0.5">{tier.desc}</p>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Pyramid per family breakdown */}
              <div className="border-t border-carbon/[0.06] pt-6">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30 mb-4">{t.plannerSections.targetByFamily}</p>
                <div className="grid gap-3">
                  {setupData.productFamilies.map((family) => {
                    const totalPct = family.percentage;
                    // Show proportional split based on global type segments
                    const segments = setupData.productTypeSegments;
                    return (
                      <div key={family.name} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-light text-carbon">{family.name}</span>
                          <span className="font-light text-carbon/60">{totalPct}% {t.plannerSections.ofCollection}</span>
                        </div>
                        <div className="flex h-2 w-full overflow-hidden">
                          {segments.map((seg) => {
                            const colors: Record<string, string> = {
                              IMAGEN: 'bg-carbon',
                              REVENUE: 'bg-carbon/60',
                              ENTRY: 'bg-carbon/30',
                            };
                            return (
                              <div
                                key={seg.type}
                                className={`${colors[seg.type] || 'bg-carbon/20'} h-full`}
                                style={{ width: `${seg.percentage}%` }}
                                title={`${seg.type}: ${seg.percentage}%`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-3 text-[10px] text-carbon/40">
                          {segments.map(seg => (
                            <span key={seg.type}>{seg.type} {seg.percentage}%</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Product Families */}
            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-4">{t.plannerSections.productFamilies}</h2>
              <div className="space-y-3">
                {setupData.productFamilies.map((family) => (
                  <div key={family.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-carbon">{family.name}</span>
                      <span className="font-light text-carbon">{family.percentage}%</span>
                    </div>
                    <div className="w-full h-[2px] bg-carbon/[0.06]">
                      <div
                        className="bg-carbon h-[2px]"
                        style={{ width: `${family.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Segments */}
            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-4">{t.plannerSections.priceSegments}</h2>
              <div className="space-y-3 text-sm">
                {setupData.priceSegments.map((seg) => (
                  <div key={seg.name} className="flex justify-between">
                    <div>
                      <p className="font-light text-carbon">{seg.name}</p>
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">
                        €{seg.minPrice} - €{seg.maxPrice}
                      </p>
                    </div>
                    <p className="font-light text-carbon">{seg.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Types */}
            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-4">{t.plannerSections.productTypes}</h2>
              <div className="space-y-2 text-sm">
                {setupData.productTypeSegments.map((seg) => (
                  <div key={seg.type} className="flex justify-between">
                    <span className="font-light text-carbon">{seg.type}</span>
                    <span className="font-light text-carbon">{seg.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historical" className="space-y-6">
            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-2">{t.plannerSections.historicalView}</h2>
              <p className="text-sm font-light text-carbon/40">
                {t.plannerSections.historicalDesc}
              </p>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}
