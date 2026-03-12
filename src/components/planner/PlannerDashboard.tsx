"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CollectionPlan, SetupData } from "@/types/planner";
import { CollectionBuilder } from './CollectionBuilder';

interface PlannerDashboardProps {
  plan: CollectionPlan;
}

export function PlannerDashboard({ plan }: PlannerDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("builder");
  const [setupData] = useState<SetupData>(plan.setup_data);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-16">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-4">
          Product &amp; Planning
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          {plan.name}
        </h1>
        <p className="text-sm font-light text-carbon/40 mt-2">
          Season: {plan.season || "N/A"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent border border-carbon/[0.06]">
            <TabsTrigger value="builder" className="py-3 text-[11px] font-medium tracking-[0.08em] uppercase data-[state=active]:bg-carbon data-[state=active]:text-crema data-[state=active]:shadow-none text-carbon/40 rounded-none">Constructor</TabsTrigger>
            <TabsTrigger value="strategic" className="py-3 text-[11px] font-medium tracking-[0.08em] uppercase data-[state=active]:bg-carbon data-[state=active]:text-crema data-[state=active]:shadow-none text-carbon/40 rounded-none">Strategic Dashboard</TabsTrigger>
            <TabsTrigger value="historical" className="py-3 text-[11px] font-medium tracking-[0.08em] uppercase data-[state=active]:bg-carbon data-[state=active]:text-crema data-[state=active]:shadow-none text-carbon/40 rounded-none">Historical</TabsTrigger>
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
                  <h2 className="text-lg font-light text-carbon mb-4">Collection Framework</h2>
                  <p className="text-sm font-light text-carbon/40 mb-4">
                    Strategic parameters from AI Advisor (Block 2)
                  </p>
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">Expected SKUs</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">{setupData.expectedSkus}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">Drops</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">{setupData.dropsCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">Target Margin</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">{setupData.targetMargin}%</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">Total Sales Target</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">€{setupData.totalSalesTarget.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">Average Price Target</p>
                      <p className="text-2xl font-light text-carbon tracking-tight">€{setupData.avgPriceTarget}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">Price Range</p>
                      <p className="text-sm font-light text-carbon">
                        €{setupData.minPrice}
                        <span className="text-carbon/30 px-1">&rarr;</span>
                        €{setupData.maxPrice}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-carbon/[0.06] p-8">
                  <h2 className="text-lg font-light text-carbon mb-4">Monthly Distribution</h2>
                  <p className="text-sm font-light text-carbon/40 mb-4">
                    Seasonality profile for this collection (sum = 100).
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
                  <h2 className="text-lg font-light text-carbon mb-4">Families Snapshot</h2>
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
                  <h2 className="text-lg font-light text-carbon mb-4">Product Types Mix</h2>
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
            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-4">Product Families</h2>
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

            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-4">Price Segments</h2>
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

            <div className="bg-white border border-carbon/[0.06] p-8">
              <h2 className="text-lg font-light text-carbon mb-4">Product Types</h2>
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
              <h2 className="text-lg font-light text-carbon mb-2">Historical View</h2>
              <p className="text-sm font-light text-carbon/40">
                Historical performance dashboards will be added here once sales and
                buy-in data are available.
              </p>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}
