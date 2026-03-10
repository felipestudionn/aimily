"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Calculator, Loader2, Target, TrendingUp, DollarSign, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CollectionPlan, SetupData } from "@/types/planner";
import { CollectionBuilder } from './CollectionBuilder';

interface PlannerDashboardProps {
  plan: CollectionPlan;
}

export function PlannerDashboard({ plan }: PlannerDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("builder");
  const [setupComplete, setSetupComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Budget setup state - initialize with AI suggestions
  const [budgetData, setBudgetData] = useState({
    totalSalesTarget: plan.setup_data.totalSalesTarget,
    targetMargin: plan.setup_data.targetMargin,
  });
  
  // Modified setup data with user's budget
  const [setupData, setSetupData] = useState<SetupData>(plan.setup_data);

  // Handle budget confirmation and auto-generate SKUs
  const handleConfirmBudget = async () => {
    setIsGenerating(true);
    
    // Update setup data with user's budget
    const updatedSetupData: SetupData = {
      ...plan.setup_data,
      totalSalesTarget: budgetData.totalSalesTarget,
      targetMargin: budgetData.targetMargin,
    };
    setSetupData(updatedSetupData);

    try {
      // Generate EXACTLY the expected number of SKUs with EXACT sales target
      const response = await fetch('/api/ai/generate-skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupData: updatedSetupData,
          count: updatedSetupData.expectedSkus, // Generate EXACTLY this many SKUs
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate SKUs');
      }

      const { skus: suggestedSkus, summary } = await response.json();
      
      console.log(`Generated ${summary.skuCount} SKUs with total sales: €${summary.totalExpectedSales} (target: €${summary.targetSales})`);

      // Add each suggested SKU to the collection - use expectedSales from API (already calculated to hit exact target)
      for (const suggested of suggestedSkus) {
        const margin = ((suggested.pvp - suggested.cost) / suggested.pvp) * 100;

        await fetch('/api/skus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection_plan_id: plan.id,
            name: suggested.name,
            family: suggested.family || updatedSetupData.productFamilies[0]?.name || 'General',
            category: updatedSetupData.productCategory || 'ROPA',
            type: suggested.type || 'REVENUE',
            channel: 'DTC',
            drop_number: suggested.drop || 1,
            pvp: suggested.pvp,
            cost: suggested.cost,
            discount: 0,
            final_price: suggested.pvp, // No discount initially
            buy_units: suggested.suggestedUnits,
            sale_percentage: 60,
            expected_sales: suggested.expectedSales, // Use EXACT value from API
            margin: Math.round(margin * 100) / 100,
            launch_date: new Date().toISOString().split('T')[0],
          }),
        });
      }

      setSetupComplete(true);
    } catch (error) {
      console.error('Error generating SKUs:', error);
      // Still allow to continue even if generation fails
      setSetupComplete(true);
    } finally {
      setIsGenerating(false);
    }
  };

  // Skip budget setup and go directly to builder
  const handleSkipSetup = () => {
    setSetupComplete(true);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 py-6">
      {/* Step Indicator - 4 AI Power Steps */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
            3
          </div>
          <div>
            <h3 className="font-semibold">Step 3 of 4: Planning</h3>
            <p className="text-sm text-muted-foreground">Build your SKU-level collection plan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" title="Inspiration" />
            <div className="w-2 h-2 rounded-full bg-green-500" title="Strategy" />
            <div className="w-2 h-2 rounded-full bg-green-500" title="Planning" />
            <div className="w-2 h-2 rounded-full bg-gray-300" title="Go to Market" />
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700 ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            4 AI Power Steps
          </Badge>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm border rounded-xl mb-6">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/ai-advisor')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Strategy
              </Button>
              <div className="border-l pl-4">
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  {plan.name}
                </h1>
                {plan.description && (
                  <p className="text-slate-600 text-sm">{plan.description}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Season: {plan.season || "N/A"} · Location: {plan.location || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {setupComplete && (
                <Button variant="outline" onClick={() => router.push(`/collection-calendar/${plan.id}`)}>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              )}
              {setupComplete && (
                <Button onClick={() => router.push(`/go-to-market/${plan.id}`)} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  Go to Market
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Setup Step */}
      {!setupComplete && (
        <Card className="mb-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Target className="h-5 w-5" />
              Define Your Budget
            </CardTitle>
            <CardDescription>
              Set your sales target and margin before we generate your collection SKUs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Sales Target */}
              <div className="space-y-2">
                <Label htmlFor="salesTarget" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Total Sales Target (€)
                </Label>
                <Input
                  id="salesTarget"
                  type="number"
                  value={budgetData.totalSalesTarget}
                  onChange={(e) => setBudgetData(prev => ({ ...prev, totalSalesTarget: Number(e.target.value) }))}
                  className="text-lg font-semibold"
                  placeholder="e.g., 500000"
                />
                <p className="text-xs text-muted-foreground">
                  AI suggested: €{plan.setup_data.totalSalesTarget.toLocaleString()}
                </p>
              </div>

              {/* Target Margin */}
              <div className="space-y-2">
                <Label htmlFor="targetMargin" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Target Margin (%)
                </Label>
                <Input
                  id="targetMargin"
                  type="number"
                  value={budgetData.targetMargin}
                  onChange={(e) => setBudgetData(prev => ({ ...prev, targetMargin: Number(e.target.value) }))}
                  className="text-lg font-semibold"
                  min={0}
                  max={100}
                  placeholder="e.g., 65"
                />
                <p className="text-xs text-muted-foreground">
                  AI suggested: {plan.setup_data.targetMargin}%
                </p>
              </div>

              {/* Summary from Strategy */}
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-sm font-medium">Strategy Summary</Label>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white/80 rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Expected SKUs</p>
                    <p className="text-lg font-semibold">{plan.setup_data.expectedSkus}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Avg Price</p>
                    <p className="text-lg font-semibold">€{plan.setup_data.avgPriceTarget}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 border">
                    <p className="text-xs text-muted-foreground">Drops</p>
                    <p className="text-lg font-semibold">{plan.setup_data.dropsCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-green-200">
              <Button variant="ghost" onClick={handleSkipSetup}>
                Skip & Build Manually
              </Button>
              <Button 
                onClick={handleConfirmBudget}
                disabled={isGenerating || budgetData.totalSalesTarget <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating SKUs...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Confirm & Generate SKUs
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Only show after setup */}
      {setupComplete && (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="builder">Constructor</TabsTrigger>
            <TabsTrigger value="strategic">Strategic Dashboard</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
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
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-lg font-semibold mb-4">Collection Framework</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Strategic parameters from AI Advisor (Block 2)
                  </p>
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Expected SKUs</p>
                      <p className="text-xl font-semibold">{setupData.expectedSkus}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Drops</p>
                      <p className="text-xl font-semibold">{setupData.dropsCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Target Margin</p>
                      <p className="text-xl font-semibold">{setupData.targetMargin}%</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Total Sales Target</p>
                      <p className="text-xl font-semibold">€{setupData.totalSalesTarget.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Average Price Target</p>
                      <p className="text-xl font-semibold">€{setupData.avgPriceTarget}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Price Range</p>
                      <p className="text-sm font-medium">
                        €{setupData.minPrice} 
                        <span className="text-slate-400 px-1">→</span>
                        €{setupData.maxPrice}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-lg font-semibold mb-4">Monthly Distribution</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Seasonality profile for this collection (sum = 100).
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                    {setupData.monthlyDistribution.map((value, index) => (
                      <div
                        key={index}
                        className="space-y-1 rounded-md border bg-background p-2 flex flex-col items-start"
                      >
                        <span className="text-[10px] uppercase text-slate-500">
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][index]}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-semibold text-sm">{value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-lg font-semibold mb-4">Families Snapshot</h2>
                  <div className="space-y-2 text-sm">
                    {setupData.productFamilies.map((family) => (
                      <div key={family.name} className="flex items-center justify-between">
                        <span>{family.name}</span>
                        <span className="font-medium">{family.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-lg font-semibold mb-4">Product Types Mix</h2>
                  <div className="space-y-2 text-sm">
                    {setupData.productTypeSegments.map((seg) => (
                      <div key={seg.type} className="flex items-center justify-between">
                        <span>{seg.type}</span>
                        <span className="font-medium">{seg.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strategic" className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Product Families</h2>
              <div className="space-y-3">
                {setupData.productFamilies.map((family) => (
                  <div key={family.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{family.name}</span>
                      <span>{family.percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{ width: `${family.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Price Segments</h2>
              <div className="space-y-3 text-sm">
                {setupData.priceSegments.map((seg) => (
                  <div key={seg.name} className="flex justify-between">
                    <div>
                      <p className="font-medium">{seg.name}</p>
                      <p className="text-xs text-slate-500">
                        €{seg.minPrice} - €{seg.maxPrice}
                      </p>
                    </div>
                    <p className="font-medium">{seg.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Product Types</h2>
              <div className="space-y-2 text-sm">
                {setupData.productTypeSegments.map((seg) => (
                  <div key={seg.type} className="flex justify-between">
                    <span>{seg.type}</span>
                    <span>{seg.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historical" className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-2">Historical View</h2>
              <p className="text-sm text-muted-foreground">
                Historical performance dashboards will be added here once sales and
                buy-in data are available.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
