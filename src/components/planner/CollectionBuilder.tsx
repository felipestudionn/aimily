'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Sparkles, Loader2, LayoutGrid, List, ImagePlus, X, Download, ChevronDown, Kanban } from 'lucide-react';
import { useSkus, type SKU, type DesignPhase } from '@/hooks/useSkus';
import type { SetupData } from '@/types/planner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n';
import { useColorways } from '@/hooks/useColorways';
import { useSampleReviews } from '@/hooks/useSampleReviews';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { SkuDetailView } from './SkuDetailView';
import { SkuLifecycleProvider, EMPTY_DESIGN_DATA, type DesignWorkspaceData } from './sku-phases/SkuLifecycleContext';

interface CollectionBuilderProps {
  setupData: SetupData;
  collectionPlanId: string;
}

export function CollectionBuilder({ setupData, collectionPlanId }: CollectionBuilderProps) {
  const { language } = useLanguage();
  const t = useTranslation();
  const [name, setName] = useState('');
  const [family, setFamily] = useState('');
  const [type, setType] = useState<'REVENUE' | 'IMAGEN' | 'ENTRY'>('REVENUE');
  const [channel, setChannel] = useState<'DTC' | 'WHOLESALE' | 'BOTH'>('DTC');
  const [origin, setOrigin] = useState<'LOCAL' | 'CHINA' | 'EUROPE' | 'OTHER'>('LOCAL');
  const [skuRole, setSkuRole] = useState<'NEW' | 'BESTSELLER_REINVENTION' | 'CARRYOVER' | 'CAPSULE'>('NEW');
  const [dropNumber, setDropNumber] = useState(1);
  const [pvp, setPvp] = useState(0);
  const [cost, setCost] = useState(0);
  const [buyUnits, setBuyUnits] = useState(0);
  const [salePercentage, setSalePercentage] = useState(60);
  const [discount, setDiscount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenStep, setAutoGenStep] = useState(0);
  const [autoGenDone, setAutoGenDone] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'pipeline'>('cards');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCarryOver, setShowCarryOver] = useState(false);
  const [carryOverData, setCarryOverData] = useState<{ collections: any[]; skus: SKU[] } | null>(null);
  const [carryOverLoading, setCarryOverLoading] = useState(false);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [importingSkus, setImportingSkus] = useState(false);

  const { skus, addSku, updateSku, deleteSku, loading, refetch } = useSkus(collectionPlanId);

  // ── Lifecycle hooks (for SKU detail modal) ──
  const { colorways, addColorway, updateColorway, deleteColorway } = useColorways(collectionPlanId);
  const { reviews, addReview, updateReview, deleteReview } = useSampleReviews(collectionPlanId);
  const { data: designData, save: saveDesignData } = useWorkspaceData<DesignWorkspaceData>(collectionPlanId, 'design', EMPTY_DESIGN_DATA);
  const { orders } = useProductionOrders(collectionPlanId);

  // ── Auto-generate SKUs on first load (wow moment) ──
  const autoGenSteps = [
    t.plannerSections.autoGenStep1 || 'Reading your creative direction...',
    t.plannerSections.autoGenStep2 || 'Analyzing product families & pricing...',
    t.plannerSections.autoGenStep3 || 'Building SKU architecture...',
    t.plannerSections.autoGenStep4 || 'Balancing revenue targets...',
    t.plannerSections.autoGenStep5 || 'Your collection is ready.',
  ];

  useEffect(() => {
    if (loading || autoGenDone || autoGenerating) return;
    if (skus.length > 0) { setAutoGenDone(true); return; }
    if (!setupData.totalSalesTarget || setupData.totalSalesTarget <= 0) return;
    if (!setupData.expectedSkus || setupData.expectedSkus <= 0) return;

    // Trigger auto-generation
    setAutoGenerating(true);
    setAutoGenStep(0);

    // Step animation interval
    const stepInterval = setInterval(() => {
      setAutoGenStep(prev => {
        if (prev < autoGenSteps.length - 2) return prev + 1;
        return prev;
      });
    }, 2500);

    // Generate ALL SKUs via AI in batches of 20
    // The generate-skus endpoint handles naming, financial balancing, type distribution
    const totalCount = setupData.expectedSkus;
    const BATCH_SIZE = 20;
    const batches = Math.ceil(totalCount / BATCH_SIZE);

    (async () => {
      try {
        // Auto-generate SKUs from creative + merchandising data

        // Fetch creative context for SKU naming
        const creativeRes = await fetch(`/api/workspace-data?planId=${collectionPlanId}&workspace=creative`);
        const creativeWs = creativeRes.ok ? await creativeRes.json() : null;
        const bd = creativeWs?.data?.blockData || {};

        // Build creative context summary
        const vibeData = bd.vibe?.data;
        const brandData = bd['brand-dna']?.data;
        const consumerProposals = (bd.consumer?.data?.proposals as Array<{ title: string; desc: string; status: string }>) || [];
        const likedConsumers = consumerProposals.filter(p => p.status === 'liked');

        const trendParts: string[] = [];
        for (const blockId of ['global-trends', 'deep-dive', 'live-signals']) {
          const results = (bd[blockId]?.data?.results as Array<{ title: string; selected?: boolean }>) || [];
          results.filter(r => r.selected).forEach(r => trendParts.push(r.title));
        }

        const creativeContext = {
          vibe: vibeData ? `${vibeData.vibeTitle || ''}: ${vibeData.vibe || ''}. Keywords: ${vibeData.keywords || ''}` : '',
          brandDNA: brandData ? `${brandData.brandName || ''}. Colors: ${(brandData.colors as string[])?.join(', ') || ''}. Tone: ${brandData.tone || ''}. Style: ${brandData.style || ''}` : '',
          consumer: likedConsumers.map(c => `${c.title}: ${c.desc.substring(0, 150)}`).join(' | '),
          trends: trendParts.join(', '),
        };

        const allGeneratedSkus: Array<Record<string, unknown>> = [];
        let remainingCount = totalCount;
        let remainingSalesTarget = setupData.totalSalesTarget;

        for (let batch = 0; batch < batches; batch++) {
          const batchCount = Math.min(BATCH_SIZE, remainingCount);

          // Update step animation
          if (batch === 0) setAutoGenStep(1);
          else if (batch === 1) setAutoGenStep(2);
          else setAutoGenStep(3);

          // Adjust setupData for this batch's proportional share
          const batchSetup = {
            ...setupData,
            expectedSkus: batchCount,
            totalSalesTarget: Math.round(remainingSalesTarget * (batchCount / remainingCount)),
          };

          // Generate batch

          const response = await fetch('/api/ai/generate-skus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setupData: batchSetup, count: batchCount, language, creativeContext }),
          });

          if (!response.ok) {
            throw new Error(`Generation failed`);
          }

          const responseData = await response.json();
          const batchSkus = responseData.skus || [];

          for (const suggested of batchSkus) {
            const margin = ((suggested.pvp - suggested.cost) / suggested.pvp) * 100;
            allGeneratedSkus.push({
              collection_plan_id: collectionPlanId,
              name: suggested.name,
              family: suggested.family || setupData.families?.[0] || 'General',
              category: setupData.productCategory || 'ROPA',
              type: suggested.type || 'REVENUE',
              channel: 'DTC',
              drop_number: suggested.drop || 1,
              pvp: suggested.pvp,
              cost: suggested.cost,
              discount: 0,
              final_price: suggested.pvp,
              buy_units: suggested.suggestedUnits,
              sale_percentage: 60,
              expected_sales: suggested.expectedSales,
              margin: Math.round(margin * 100) / 100,
              // sku_role not in DB schema
              launch_date: new Date().toISOString().split('T')[0],
            });
          }

          remainingCount -= batchCount;
          remainingSalesTarget -= batchSetup.totalSalesTarget;
        }

        // Batch insert ALL generated SKUs at once
        if (allGeneratedSkus.length > 0) {
          await fetch('/api/skus/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skus: allGeneratedSkus }),
          });
        }

        // Show final step, then refetch SKUs (no reload)
        setAutoGenStep(autoGenSteps.length - 1);
        await refetch();
        setTimeout(() => {
          setAutoGenerating(false);
          setAutoGenDone(true);
        }, 2000);
      } catch (err) {
        console.error('Auto-generate failed:', err);
        setAutoGenerating(false);
        setAutoGenDone(true);
      } finally {
        clearInterval(stepInterval);
      }
    })();

    return () => clearInterval(stepInterval);
  }, [loading, skus.length, setupData.totalSalesTarget, setupData.expectedSkus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carry-over: fetch SKUs from other collections
  const handleOpenCarryOver = async () => {
    setShowCarryOver(true);
    setCarryOverLoading(true);
    setSelectedImports(new Set());
    try {
      const res = await fetch(`/api/skus/carry-over?excludePlanId=${collectionPlanId}`);
      if (res.ok) {
        const data = await res.json();
        setCarryOverData(data);
      }
    } catch (e) {
      console.error('Error fetching carry-over SKUs:', e);
    } finally {
      setCarryOverLoading(false);
    }
  };

  const handleImportSkus = async (role: 'CARRYOVER' | 'BESTSELLER_REINVENTION') => {
    if (selectedImports.size === 0) return;
    setImportingSkus(true);
    try {
      const res = await fetch('/api/skus/carry-over', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlanId: collectionPlanId,
          sourceSkuIds: Array.from(selectedImports),
          role,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Refetch SKUs to show imported ones
        window.location.reload();
      }
    } catch (e) {
      console.error('Error importing SKUs:', e);
    } finally {
      setImportingSkus(false);
      setShowCarryOver(false);
    }
  };

  // Calculate totals
  const totalExpectedSales = useMemo(() => {
    return skus.reduce((acc, sku) => acc + sku.expected_sales, 0);
  }, [skus]);

  // COGS = production cost (materials + labor + packaging)
  const totalCOGS = useMemo(() => {
    return skus.reduce((acc, sku) => {
      const soldUnits = Math.round(sku.buy_units * (sku.sale_percentage || 60) / 100);
      return acc + (sku.cost * soldUnits);
    }, 0);
  }, [skus]);

  // Wholesale value (COGS × 2.5 industry standard)
  const totalWholesaleValue = useMemo(() => {
    return skus.reduce((acc, sku) => {
      const soldUnits = Math.round(sku.buy_units * (sku.sale_percentage || 60) / 100);
      return acc + (Math.round(sku.cost * 2.5) * soldUnits);
    }, 0);
  }, [skus]);

  // DTC Margin = (Revenue - COGS) / Revenue
  const dtcMargin = useMemo(() => {
    return totalExpectedSales > 0 ? ((totalExpectedSales - totalCOGS) / totalExpectedSales) * 100 : 0;
  }, [totalExpectedSales, totalCOGS]);

  // Wholesale Margin = (WS Revenue - COGS) / WS Revenue
  const wsMargin = useMemo(() => {
    return totalWholesaleValue > 0 ? ((totalWholesaleValue - totalCOGS) / totalWholesaleValue) * 100 : 0;
  }, [totalWholesaleValue, totalCOGS]);

  // Use DTC margin as primary (most brands start DTC)
  const marginPercentage = dtcMargin;

  const handleAddSku = async () => {
    if (!name || pvp <= 0 || cost <= 0) return;

    const finalPrice = pvp * (1 - discount / 100);
    const expectedSales = (buyUnits * salePercentage / 100) * finalPrice;
    const margin = ((pvp - cost) / pvp) * 100;

    const newSku: Omit<SKU, 'id' | 'created_at' | 'updated_at'> = {
      collection_plan_id: collectionPlanId,
      name,
      family: family || setupData.productFamilies[0]?.name || 'General',
      category: (setupData.productCategory || 'ROPA') as 'CALZADO' | 'ROPA' | 'ACCESORIOS',
      type,
      channel,
      origin,
      sku_role: skuRole,
      drop_number: dropNumber,
      pvp,
      cost,
      discount,
      final_price: finalPrice,
      buy_units: buyUnits,
      sale_percentage: salePercentage,
      expected_sales: expectedSales,
      margin,
      launch_date: new Date().toISOString().split('T')[0],
      design_phase: 'range_plan' as DesignPhase,
      proto_iterations: [],
      production_approved: false,
    };

    await addSku(newSku);

    // Reset form
    setName('');
    setPvp(0);
    setCost(0);
    setBuyUnits(0);
    setDiscount(0);
  };

  const availableFamilies = setupData.productFamilies?.map(f => f.name) || [];

  // Generic image upload for any SKU field
  const handleImageUpload = async (skuId: string, file: File, field: 'reference_image_url' | 'sketch_url' | 'production_sample_url' = 'reference_image_url'): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Handle notes update
  const handleNotesUpdate = async (skuId: string) => {
    await updateSku(skuId, { notes: editingNotes });
    if (selectedSku?.id === skuId) {
      setSelectedSku(prev => prev ? { ...prev, notes: editingNotes } : null);
    }
  };

  // Open SKU detail
  const openSkuDetail = (sku: SKU) => {
    setSelectedSku(sku);
    setEditingNotes(sku.notes || '');
  };

  // Calculate framework validation metrics
  const frameworkValidation = useMemo(() => {
    // Family distribution
    const familyDistribution = availableFamilies.map(familyName => {
      const familySkus = skus.filter(s => s.family === familyName);
      const actual = skus.length > 0 ? (familySkus.length / skus.length) * 100 : 0;
      const target = (setupData.productFamilies || []).find(f => f.name === familyName)?.percentage || 0;
      return { name: familyName, actual: Math.round(actual), target };
    });

    // Type distribution
    const typeDistribution = (['REVENUE', 'IMAGEN', 'ENTRY'] as const).map(typeName => {
      const typeSkus = skus.filter(s => s.type === typeName);
      const actual = skus.length > 0 ? (typeSkus.length / skus.length) * 100 : 0;
      const target = (setupData.productTypeSegments || []).find(t => t.type === typeName)?.percentage || 0;
      return { name: typeName, actual: Math.round(actual), target };
    });

    // Average price
    const avgPrice = skus.length > 0 
      ? skus.reduce((sum, s) => sum + s.pvp, 0) / skus.length 
      : 0;
    const avgPriceTarget = setupData.avgPriceTarget;
    const avgPriceDiff = avgPriceTarget > 0 ? ((avgPrice - avgPriceTarget) / avgPriceTarget) * 100 : 0;

    // Margin check
    const marginTarget = setupData.targetMargin;
    const marginDiff = marginTarget > 0 ? marginPercentage - marginTarget : 0;

    // Role distribution (bestseller target: 60-70% carry/bestseller)
    const roleDistribution = (['NEW', 'BESTSELLER_REINVENTION', 'CARRYOVER', 'CAPSULE'] as const).map(role => {
      const roleSkus = skus.filter(s => (s.sku_role || 'NEW') === role);
      const actual = skus.length > 0 ? (roleSkus.length / skus.length) * 100 : 0;
      return { name: role === 'BESTSELLER_REINVENTION' ? 'Bestseller' : role === 'CARRYOVER' ? 'Carry-over' : role === 'CAPSULE' ? 'Capsule' : 'New', actual: Math.round(actual) };
    });

    // Origin distribution
    const originDistribution = (['LOCAL', 'CHINA', 'EUROPE', 'OTHER'] as const).map(orig => {
      const origSkus = skus.filter(s => (s.origin || 'LOCAL') === orig);
      const actual = skus.length > 0 ? (origSkus.length / skus.length) * 100 : 0;
      return { name: orig, actual: Math.round(actual) };
    });

    return {
      familyDistribution,
      typeDistribution,
      roleDistribution,
      originDistribution,
      avgPrice: Math.round(avgPrice),
      avgPriceTarget,
      avgPriceDiff: Math.round(avgPriceDiff),
      marginTarget,
      marginDiff: Math.round(marginDiff * 10) / 10,
    };
  }, [skus, availableFamilies, setupData, marginPercentage]);

  // Generate AI-suggested SKUs - fills remaining to reach EXACT expected count
  const handleGenerateSkus = async () => {
    const remaining = setupData.expectedSkus - skus.length;
    if (remaining <= 0) {
      alert('You have already reached the expected SKU count');
      return;
    }

    // Calculate remaining sales target based on current SKUs
    const currentSales = skus.reduce((sum, sku) => sum + sku.expected_sales, 0);
    const remainingSalesTarget = setupData.totalSalesTarget - currentSales;

    // Create adjusted setupData for remaining SKUs
    const adjustedSetupData = {
      ...setupData,
      expectedSkus: remaining,
      totalSalesTarget: remainingSalesTarget > 0 ? remainingSalesTarget : setupData.totalSalesTarget / remaining * remaining,
    };

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupData: adjustedSetupData,
          count: remaining, // Generate EXACTLY the remaining count
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate SKUs');
      }

      const { skus: suggestedSkus } = await response.json();

      // Add each suggested SKU - use expectedSales from API
      for (const suggested of suggestedSkus) {
        const margin = ((suggested.pvp - suggested.cost) / suggested.pvp) * 100;

        await addSku({
          collection_plan_id: collectionPlanId,
          name: suggested.name,
          family: suggested.family || availableFamilies[0] || 'General',
          category: (setupData.productCategory || 'ROPA') as 'CALZADO' | 'ROPA' | 'ACCESORIOS',
          type: suggested.type || 'REVENUE',
          channel: 'DTC',
          drop_number: suggested.drop || 1,
          pvp: suggested.pvp,
          cost: suggested.cost,
          discount: 0,
          final_price: suggested.pvp,
          buy_units: suggested.suggestedUnits,
          sale_percentage: 60,
          expected_sales: suggested.expectedSales, // Use EXACT value from API
          margin: Math.round(margin * 100) / 100,
          launch_date: new Date().toISOString().split('T')[0],
          design_phase: 'range_plan' as DesignPhase,
          proto_iterations: [],
          production_approved: false,
        });
      }
    } catch (error) {
      console.error('Error generating SKUs:', error);
      alert('Error generating SKUs. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Auto-generation overlay (wow moment + educational context) ──
  if (autoGenerating) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-xl px-6" style={{ animation: 'fadeIn 0.6s ease-out forwards' }}>
          {/* Animated icon */}
          <div className="w-14 h-14 mx-auto mb-6 border border-carbon/15 flex items-center justify-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
            <Loader2 className="h-5 w-5 text-carbon/40 animate-spin" />
          </div>

          <h2 className="text-xl font-light text-carbon tracking-tight mb-2" style={{ animation: 'fadeIn 0.6s ease-out 0.5s both' }}>
            Aimily is building your <span className="italic">range plan</span>
          </h2>

          <p className="text-xs text-carbon/35 mb-8 max-w-sm mx-auto leading-relaxed" style={{ animation: 'fadeIn 0.6s ease-out 0.7s both' }}>
            Using your creative direction, product families, pricing architecture, and market strategy to generate a complete draft collection.
          </p>

          {/* Steps */}
          <div className="space-y-2.5 mb-8">
            {autoGenSteps.map((step, i) => (
              <div
                key={i}
                className={`text-sm transition-all duration-700 ${
                  i < autoGenStep ? 'text-carbon/25' :
                  i === autoGenStep ? 'text-carbon font-light' :
                  'text-carbon/10'
                }`}
                style={i <= autoGenStep ? { animation: `slideUp 0.5s ease-out ${0.9 + i * 0.3}s both` } : { opacity: 0 }}
              >
                {i < autoGenStep && <span className="text-carbon/25 mr-2">&#10003;</span>}
                {i === autoGenStep && <span className="inline-block w-1.5 h-1.5 bg-carbon rounded-full mr-2 animate-pulse" />}
                {step}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-48 h-[2px] bg-carbon/[0.06] mx-auto overflow-hidden">
            <div className="h-full bg-carbon transition-all duration-1000 ease-out" style={{ width: `${((autoGenStep + 1) / autoGenSteps.length) * 100}%` }} />
          </div>

          {/* What happens next — educational */}
          <div className="mt-10 pt-6 border-t border-carbon/[0.06] max-w-sm mx-auto" style={{ animation: 'fadeIn 0.6s ease-out 2s both' }}>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/20 mb-3">What happens next</p>
            <div className="space-y-2 text-left">
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] text-carbon/20 mt-0.5 font-medium">1</span>
                <p className="text-[11px] text-carbon/35 leading-relaxed">Review and adjust your range plan — names, prices, units, families</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] text-carbon/20 mt-0.5 font-medium">2</span>
                <p className="text-[11px] text-carbon/35 leading-relaxed">Confirm the draft to unlock Design & Development</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] text-carbon/20 mt-0.5 font-medium">3</span>
                <p className="text-[11px] text-carbon/35 leading-relaxed">Design and strategy work together — adjustments flow both ways</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Financial Overview — dark card ── */}
      <div className="bg-carbon p-6 sm:p-8">
        <p className="text-[10px] font-medium tracking-[0.25em] uppercase text-white/30 mb-5">Collection Overview</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-4 sm:gap-5">
          {[
            { label: 'Revenue', value: `€${Math.round(totalExpectedSales / 1000).toLocaleString()}K` },
            { label: 'COGS', value: `€${Math.round(totalCOGS / 1000).toLocaleString()}K` },
            { label: 'Gross Profit', value: `€${Math.round((totalExpectedSales - totalCOGS) / 1000).toLocaleString()}K` },
            { label: 'WS Value', value: `€${Math.round(totalWholesaleValue / 1000).toLocaleString()}K` },
            { label: 'DTC Margin', value: `${dtcMargin.toFixed(0)}%` },
            { label: 'WS Margin', value: `${wsMargin.toFixed(0)}%` },
            { label: 'Avg Price', value: `€${frameworkValidation.avgPrice}` },
            { label: 'SKUs', value: `${skus.length}` },
            { label: 'Families', value: `${new Set(skus.map(s => s.family)).size}` },
            { label: 'Total Units', value: `${skus.reduce((s, sk) => s + sk.buy_units, 0).toLocaleString()}` },
          ].map((metric) => (
            <div key={metric.label}>
              <p className="text-[9px] font-medium tracking-[0.12em] uppercase text-white/25 mb-1">{metric.label}</p>
              <p className="text-lg font-light text-crema tracking-tight">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How Aimily built your collection ── */}
      {skus.length > 0 && (
        <div className="bg-white border border-carbon/[0.06] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-light text-carbon tracking-tight leading-[1.15] mb-1">
            How Aimily <span className="italic">built</span> your collection
          </h2>
          <p className="text-xs text-carbon/30 mb-8">Product architecture derived from your creative direction and merchandising strategy.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Family mix — horizontal bars */}
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">Family Mix</p>
              <div className="space-y-3">
                {frameworkValidation.familyDistribution.map((fam) => (
                  <div key={fam.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-light text-carbon">{fam.name}</span>
                      <span className="text-sm font-light text-carbon/50">{fam.actual}%</span>
                    </div>
                    <div className="h-1.5 bg-carbon/[0.06] overflow-hidden">
                      <div className="h-full bg-carbon transition-all duration-700" style={{ width: `${fam.actual}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Type mix — single donut */}
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">Segmentation Mix</p>
              <div className="flex items-center gap-6">
                {(() => {
                  const r = 50; const circ = 2 * Math.PI * r;
                  const segments = frameworkValidation.typeDistribution;
                  const segColors = ['#9c7c4c', '#7d5a8c', '#4c7c6c'];
                  let cumulative = 0;
                  return (
                    <svg width="110" height="110" className="transform -rotate-90 shrink-0">
                      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(40,42,41,0.04)" strokeWidth="8" />
                      {segments.map((seg, i) => {
                        const offset = circ * (1 - cumulative / 100);
                        const length = circ * (seg.actual / 100);
                        cumulative += seg.actual;
                        return (
                          <circle key={seg.name} cx="55" cy="55" r={r} fill="none" stroke={segColors[i] || '#999'} strokeWidth="8"
                            strokeDasharray={`${length} ${circ - length}`} strokeDashoffset={offset}
                            className="transition-all duration-700" />
                        );
                      })}
                    </svg>
                  );
                })()}
                <div className="space-y-2.5">
                  {frameworkValidation.typeDistribution.map((td) => {
                    const labels: Record<string, string> = { REVENUE: 'Revenue', IMAGEN: 'Image', ENTRY: 'Entry' };
                    const dots: Record<string, string> = { REVENUE: 'bg-[#9c7c4c]', IMAGEN: 'bg-[#7d5a8c]', ENTRY: 'bg-[#4c7c6c]' };
                    return (
                      <div key={td.name} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 shrink-0 ${dots[td.name] || 'bg-carbon/30'}`} />
                        <span className="text-sm font-light text-carbon">{labels[td.name] || td.name}</span>
                        <span className="text-sm font-light text-carbon/40">{td.actual}%</span>
                        <span className="text-[9px] text-carbon/20 italic">target {td.target}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Design Progress — SKUs by phase */}
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">Design Progress</p>
              <div className="space-y-3">
                {(() => {
                  const phases: { id: string; label: string; color: string }[] = [
                    { id: 'range_plan', label: 'Concept', color: '#282A29' },
                    { id: 'sketch', label: 'Sketch', color: '#9c7c4c' },
                    { id: 'prototyping', label: 'Proto', color: '#7d5a8c' },
                    { id: 'production', label: 'Production', color: '#4c7c6c' },
                    { id: 'completed', label: 'Complete', color: '#2d6a4f' },
                  ];
                  const total = skus.length || 1;
                  return phases.map((phase) => {
                    const count = skus.filter(s => (s.design_phase || 'range_plan') === phase.id).length;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={phase.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-light text-carbon">{phase.label}</span>
                          <span className="text-sm font-light text-carbon/50">{count}</span>
                        </div>
                        <div className="h-1.5 bg-carbon/[0.06] overflow-hidden">
                          <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: phase.color }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add SKU Form (collapsible) ── */}
      {showAddForm && (
        <div className="bg-white border border-carbon/[0.06] p-6 sm:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">{t.plannerSections.productName}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.plannerSections.productNamePlaceholder}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.family}</Label>
              <Select value={family} onValueChange={setFamily}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t.plannerSections.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {availableFamilies.map((fam) => (
                    <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.type}</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REVENUE">Revenue</SelectItem>
                  <SelectItem value="IMAGEN">Imagen</SelectItem>
                  <SelectItem value="ENTRY">Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.channel}</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DTC">DTC</SelectItem>
                  <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.origin}</Label>
              <Select value={origin} onValueChange={(v) => setOrigin(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL">Local</SelectItem>
                  <SelectItem value="CHINA">China</SelectItem>
                  <SelectItem value="EUROPE">Europe</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.role}</Label>
              <Select value={skuRole} onValueChange={(v) => setSkuRole(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="BESTSELLER_REINVENTION">Bestseller</SelectItem>
                  <SelectItem value="CARRYOVER">Carry-over</SelectItem>
                  <SelectItem value="CAPSULE">Capsule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.dropNumber}</Label>
              <Input
                type="number"
                value={dropNumber}
                onChange={(e) => setDropNumber(Number(e.target.value))}
                className="h-9"
                min={1}
                max={setupData.dropsCount}
              />
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.costLabel}</Label>
              <Input
                type="number"
                value={cost || ''}
                onChange={(e) => setCost(Number(e.target.value))}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.pvpLabel}</Label>
              <Input
                type="number"
                value={pvp || ''}
                onChange={(e) => setPvp(Number(e.target.value))}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.units}</Label>
              <Input
                type="number"
                value={buyUnits || ''}
                onChange={(e) => setBuyUnits(Number(e.target.value))}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.salePercent}</Label>
              <Input
                type="number"
                value={salePercentage}
                onChange={(e) => setSalePercentage(Number(e.target.value))}
                className="h-9"
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label className="text-xs">{t.plannerSections.discountPercent}</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-9"
                min={0}
                max={100}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddSku} 
                disabled={!name || pvp <= 0 || cost <= 0}
                className="h-9 w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.plannerSections.add}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Range Plan ── */}
      <div className="bg-white border border-carbon/[0.06]">
        <div className="px-6 sm:px-8 py-5 flex items-center justify-between border-b border-carbon/[0.04]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-light text-carbon tracking-tight">
              Range <span className="italic">Plan</span>
            </h2>
            <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/40 hover:text-carbon hover:border-carbon/20 transition-colors">
              <Plus className="h-3 w-3" /> Add SKU
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`/api/collection-export?planId=${collectionPlanId}`);
                  if (!res.ok) throw new Error('Export failed');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `collection_export.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch { /* silently fail */ }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/40 hover:text-carbon hover:border-carbon/20 transition-colors"
            >
              <Download className="h-3 w-3" /> Excel
            </button>
          </div>
          <div className="flex items-center bg-carbon/[0.06] rounded-full p-0.5">
            {(['pipeline', 'list', 'cards'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-medium tracking-[0.08em] uppercase transition-all rounded-full ${viewMode === mode ? 'bg-carbon text-crema shadow-sm' : 'text-carbon/40 hover:text-carbon/60'}`}>
                {mode === 'pipeline' ? <Kanban className="h-3 w-3" /> : mode === 'list' ? <List className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}{mode}
              </button>
            ))}
          </div>
        </div>
        {/* Family filter pills */}
        {viewMode === 'list' && skus.length > 0 && (
          <div className="px-6 sm:px-8 pb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFamily('')} className={`px-3 py-1 text-[10px] font-medium tracking-[0.08em] uppercase transition-colors ${!family ? 'bg-carbon text-crema' : 'text-carbon/35 hover:text-carbon/60'}`}>
              All
            </button>
            {availableFamilies.map((f) => (
              <button key={f} onClick={() => setFamily(family === f ? '' : f)} className={`px-3 py-1 text-[10px] font-medium tracking-[0.08em] uppercase transition-colors ${family === f ? 'bg-carbon text-crema' : 'text-carbon/35 hover:text-carbon/60'}`}>
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          {loading ? (
            <p className="text-sm text-carbon/40">{t.plannerSections.loadingSkus}</p>
          ) : skus.length === 0 ? (
            <p className="text-sm text-carbon/40">{t.plannerSections.noSkusYet}</p>
          ) : viewMode === 'pipeline' ? (
            /* Pipeline View — SKUs grouped by design phase */
            <PipelineView skus={skus} onSkuClick={openSkuDetail} t={t} />
          ) : viewMode === 'list' ? (
            /* List View — grouped by family */
            <div className="space-y-6">
              {(() => {
                const filteredSkus = family ? skus.filter(s => s.family === family) : skus;
                const families = Array.from(new Set(filteredSkus.map(s => s.family)));
                return families.map(fam => {
                  const famSkus = filteredSkus.filter(s => s.family === fam);
                  const famRevenue = famSkus.reduce((s, sk) => s + sk.expected_sales, 0);
                  return (
                    <div key={fam}>
                      {/* Family header with pill */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-4 py-1.5 text-xs font-medium text-carbon border border-carbon/[0.12] rounded-full">{fam}</span>
                          <span className="text-[10px] text-carbon/25">{famSkus.length} SKUs</span>
                        </div>
                        <span className="text-xs text-carbon/30 font-light">€{Math.round(famRevenue).toLocaleString()}</span>
                      </div>
                      {/* SKU rows */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left py-1.5 px-2 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">Product</th>
                              <th className="text-left py-1.5 px-2 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">Type</th>
                              <th className="text-right py-1.5 px-2 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">COGS</th>
                              <th className="text-right py-1.5 px-2 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">PVP</th>
                              <th className="text-right py-1.5 px-2 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">Units</th>
                              <th className="text-right py-1.5 px-2 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">Sales</th>
                              <th className="text-right py-1.5 px-2 text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">Margin</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {famSkus.map((sku) => (
                              <tr key={sku.id} className="border-t border-carbon/[0.04] hover:bg-carbon/[0.02] cursor-pointer" onClick={() => openSkuDetail(sku)}>
                                <td className="py-2.5 px-2 font-light text-carbon">{sku.name}</td>
                                <td className="py-2.5 px-2">
                                  <span className={`px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] uppercase text-white rounded ${sku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : sku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'}`}>
                                    {sku.type === 'IMAGEN' ? 'IMAGE' : sku.type}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-right text-carbon/60">€{sku.cost}</td>
                                <td className="py-2.5 px-2 text-right text-carbon">€{sku.pvp}</td>
                                <td className="py-2.5 px-2 text-right text-carbon/60">{sku.buy_units}</td>
                                <td className="py-2.5 px-2 text-right font-light text-carbon">€{Math.round(sku.expected_sales).toLocaleString()}</td>
                                <td className="py-2.5 px-2 text-right text-carbon/50">{Math.round(sku.margin)}%</td>
                                <td className="py-2.5 px-2 text-right">
                                  <button onClick={(e) => { e.stopPropagation(); deleteSku(sku.id); }} className="text-carbon/15 hover:text-carbon/40 transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            /* Cards View — grouped by family */
            <div className="space-y-6">
              {(() => {
                const cardFamilies = Array.from(new Set(skus.map(s => s.family)));
                return cardFamilies.map((fam, fIdx) => {
                  const famSkus = skus.filter(s => s.family === fam);
                  return (
                    <div key={fam}>
                      {/* Family pill header */}
                      <div className={`flex items-center gap-3 mb-3 ${fIdx > 0 ? 'pt-2' : ''}`}>
                        <span className="px-4 py-1.5 text-xs font-medium text-carbon border border-carbon/[0.12] rounded-full">{fam}</span>
                        <span className="text-[10px] text-carbon/25">{famSkus.length} SKUs · €{Math.round(famSkus.reduce((s, sk) => s + sk.expected_sales, 0)).toLocaleString()}</span>
                      </div>
                      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {famSkus.map((sku) => {
                // Dynamic image: show most advanced phase image
                const protoImg = sku.proto_iterations?.length > 0 ? sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] : undefined;
                const displayImage = sku.production_sample_url || protoImg || sku.sketch_url || sku.reference_image_url;
                const isSketchImage = !sku.production_sample_url && !protoImg && !!sku.sketch_url;
                // Phase progress
                const phaseProgress: Record<string, number> = {
                  range_plan: 0, sketch: 25, prototyping: 50, production: 75, completed: 100,
                };
                const phaseLabels: Record<string, string> = {
                  range_plan: 'Concept', sketch: 'Sketch', prototyping: 'Proto', production: 'Prod', completed: 'Done',
                };
                const progress = phaseProgress[sku.design_phase || 'range_plan'] || 0;
                const phaseLabel = phaseLabels[sku.design_phase || 'range_plan'] || 'Concept';
                // Circle colors per segment: gold (0-25), plum (25-50), sage (50-75), carbon (75-100)
                const phaseStrokeColor = progress <= 25 ? '#9c7c4c' : progress <= 50 ? '#7d5a8c' : progress <= 75 ? '#4c7c6c' : '#282A29';
                return (
                <div
                  key={sku.id}
                  className="border border-carbon/[0.06] overflow-hidden hover:border-carbon/15 transition-all cursor-pointer bg-white group"
                  onClick={() => openSkuDetail(sku)}
                >
                  {/* Image / Name area */}
                  <div className="aspect-[4/5] bg-white relative overflow-hidden">
                    {displayImage ? (
                      <img src={displayImage as string} alt={sku.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center px-4">
                          <p className="text-[13px] font-light text-carbon leading-snug text-center">{sku.name}</p>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <ImagePlus className="h-5 w-5 text-carbon/[0.08]" />
                        </div>
                      </>
                    )}
                    {/* Phase Progress Bar — bottom overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-3 py-2">
                      <div className="w-full h-1 bg-carbon/[0.06] mb-1.5">
                        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: phaseStrokeColor }} />
                      </div>
                      <p className="text-[8px] font-semibold tracking-[0.1em] uppercase" style={{ color: phaseStrokeColor }}>{phaseLabel}</p>
                    </div>
                  </div>

                  {/* Metrics — 3 rows of 2 */}
                  <div className="px-3 py-2.5 border-t border-carbon/[0.04] space-y-1.5">
                    <div className="grid grid-cols-2 gap-x-3">
                      <div><p className="text-[9px] text-carbon/20 uppercase">PVP</p><p className="text-sm font-light text-carbon">€{sku.pvp}</p></div>
                      <div><p className="text-[9px] text-carbon/20 uppercase">COGS</p><p className="text-sm font-light text-carbon">€{sku.cost}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 pt-1 border-t border-carbon/[0.03]">
                      <div><p className="text-[9px] text-carbon/20 uppercase">Units</p><p className="text-sm font-light text-carbon">{sku.buy_units}</p></div>
                      <div><p className="text-[9px] text-carbon/20 uppercase">Margin</p><p className="text-sm font-light text-carbon">{Math.round(sku.margin)}%</p></div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-carbon/[0.03]">
                      <div><p className="text-[9px] text-carbon/20 uppercase">Sales</p><p className="text-sm font-light text-carbon">€{Math.round(sku.expected_sales).toLocaleString()}</p></div>
                      <span className={`px-2 py-0.5 text-[8px] font-semibold tracking-[0.04em] uppercase text-white rounded ${
                        sku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : sku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'
                      }`}>{sku.type === 'IMAGEN' ? 'IMAGE' : sku.type}</span>
                    </div>
                  </div>
                  {/* CTA — dynamic per phase */}
                  <div className="px-3 pb-3">
                    <div className="w-full py-1.5 bg-carbon text-crema text-[8px] font-medium tracking-[0.1em] uppercase text-center hover:bg-carbon/90 transition-colors rounded-full">
                      {(sku.design_phase || 'range_plan') === 'range_plan' && !sku.reference_image_url && (t.skuPhases?.ctaAddReference || 'Add Reference Image')}
                      {(sku.design_phase || 'range_plan') === 'range_plan' && sku.reference_image_url && (t.skuPhases?.ctaStartSketch || 'Start Sketch')}
                      {sku.design_phase === 'sketch' && !sku.sketch_url && (t.skuPhases?.ctaUploadSketch || 'Upload Sketch')}
                      {sku.design_phase === 'sketch' && sku.sketch_url && (t.skuPhases?.ctaDefineColors || 'Define Colorways')}
                      {sku.design_phase === 'prototyping' && (t.skuPhases?.ctaReviewProto || 'Review Proto')}
                      {sku.design_phase === 'production' && (t.skuPhases?.ctaValidate || 'Validate Sample')}
                      {sku.design_phase === 'completed' && (t.skuPhases?.ctaCompleted || 'View Details')}
                    </div>
                  </div>
                </div>
                );
              })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* SKU Detail View — 4-phase design lifecycle */}
      {selectedSku && (
        <SkuLifecycleProvider value={{
          colorways, addColorway, updateColorway, deleteColorway,
          reviews, addReview, updateReview, deleteReview,
          designData, saveDesignData,
          orders,
          collectionPlanId,
        }}>
          <SkuDetailView
            sku={selectedSku}
            onClose={() => { setSelectedSku(null); refetch(); }}
            onUpdate={updateSku}
            onDelete={deleteSku}
            onImageUpload={async (skuId, file, field) => {
              const url = await handleImageUpload(skuId, file, field as 'reference_image_url');
              if (url) {
                await updateSku(skuId, { [field]: url } as Partial<SKU>);
              }
              return url;
            }}
          />
        </SkuLifecycleProvider>
      )}

      {/* Carry-Over Import Modal */}
      {showCarryOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Import from Previous Collections</CardTitle>
                <CardDescription>Select bestsellers or carry-over products to reinvent</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowCarryOver(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {carryOverLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !carryOverData || carryOverData.skus.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No previous collections found. Create and populate another collection first.
                </p>
              ) : (
                <>
                  {carryOverData.collections.map(col => {
                    const colSkus = carryOverData.skus.filter(s => s.collection_plan_id === col.id);
                    if (colSkus.length === 0) return null;
                    return (
                      <div key={col.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{col.name}</p>
                            <p className="text-xs text-muted-foreground">{col.season} · {col.skuCount} SKUs</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const allIds = colSkus.map(s => s.id);
                              const allSelected = allIds.every(id => selectedImports.has(id));
                              const next = new Set(selectedImports);
                              allIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
                              setSelectedImports(next);
                            }}
                          >
                            {colSkus.every(s => selectedImports.has(s.id)) ? 'Deselect all' : 'Select all'}
                          </Button>
                        </div>
                        <div className="divide-y">
                          {colSkus.slice(0, 20).map(sku => (
                            <label
                              key={sku.id}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedImports.has(sku.id)}
                                onChange={() => {
                                  const next = new Set(selectedImports);
                                  next.has(sku.id) ? next.delete(sku.id) : next.add(sku.id);
                                  setSelectedImports(next);
                                }}
                                className="rounded"
                              />
                              {sku.reference_image_url ? (
                                <img src={sku.reference_image_url} alt="" className="w-10 h-10 object-cover rounded" />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-[8px] text-muted-foreground">IMG</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{sku.name}</p>
                                <p className="text-xs text-muted-foreground">{sku.family} · €{sku.pvp}</p>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-0.5 text-[9px] font-semibold uppercase text-white rounded ${sku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : sku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'}`}>{sku.type === 'IMAGEN' ? 'IMAGE' : sku.type}</span>
                                <p className="text-xs text-muted-foreground mt-0.5">€{Math.round(sku.expected_sales).toLocaleString()}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {selectedImports.size > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t sticky bottom-0 bg-white pb-2">
                      <p className="text-sm text-muted-foreground">{selectedImports.size} SKU{selectedImports.size > 1 ? 's' : ''} selected</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={importingSkus}
                          onClick={() => handleImportSkus('CARRYOVER')}
                        >
                          {importingSkus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Import as Carry-over
                        </Button>
                        <Button
                          size="sm"
                          disabled={importingSkus}
                          onClick={() => handleImportSkus('BESTSELLER_REINVENTION')}
                        >
                          {importingSkus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Import as Bestseller Reinvention
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── Pipeline View ── */
function PipelineView({ skus, onSkuClick, t }: { skus: SKU[]; onSkuClick: (sku: SKU) => void; t: ReturnType<typeof useTranslation> }) {
  const phases: { id: DesignPhase; label: string; count: number }[] = [
    { id: 'range_plan', label: t.skuPhases?.rangePlan || 'Range Plan', count: 0 },
    { id: 'sketch', label: t.skuPhases?.sketch || 'Sketch', count: 0 },
    { id: 'prototyping', label: t.skuPhases?.prototyping || 'Prototyping', count: 0 },
    { id: 'production', label: t.skuPhases?.production || 'Production', count: 0 },
    { id: 'completed', label: t.skuPhases?.completed || 'Completed', count: 0 },
  ];

  const grouped: Record<string, SKU[]> = {};
  for (const p of phases) {
    grouped[p.id] = [];
  }
  for (const sku of skus) {
    const phase = sku.design_phase || 'range_plan';
    if (grouped[phase]) grouped[phase].push(sku);
    else grouped['range_plan'].push(sku);
  }
  phases.forEach(p => { p.count = grouped[p.id].length; });

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {phases.map((phase) => (
        <div key={phase.id} className="shrink-0 w-56 flex flex-col">
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-carbon/[0.03] border border-carbon/[0.06] mb-2">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-carbon/50">
              {phase.label}
            </span>
            <span className="text-[10px] text-carbon/25 tabular-nums">{phase.count}</span>
          </div>

          {/* SKU cards */}
          <div className="space-y-2 min-h-[120px]">
            {grouped[phase.id].map((sku) => (
              <button
                key={sku.id}
                onClick={() => onSkuClick(sku)}
                className="w-full text-left border border-carbon/[0.06] bg-white hover:border-carbon/15 transition-all p-3 space-y-2"
              >
                {/* Image thumbnail */}
                <div className="aspect-[4/3] bg-carbon/[0.02] overflow-hidden relative">
                  {(phase.id === 'completed' || phase.id === 'production') && sku.production_sample_url ? (
                    <img src={sku.production_sample_url} alt="" className="w-full h-full object-cover" />
                  ) : phase.id === 'prototyping' && sku.proto_iterations?.length > 0 && sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] ? (
                    <img src={sku.proto_iterations[sku.proto_iterations.length - 1].images[0]} alt="" className="w-full h-full object-cover" />
                  ) : phase.id === 'sketch' && sku.sketch_url ? (
                    <img src={sku.sketch_url} alt="" className="w-full h-full object-cover" />
                  ) : sku.reference_image_url ? (
                    <img src={sku.reference_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[11px] font-light text-carbon/30 text-center px-2">{sku.name}</p>
                    </div>
                  )}
                  {/* Type badge */}
                  <span className={`absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.04em] uppercase text-white rounded ${
                    sku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : sku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'
                  }`}>
                    {sku.type === 'IMAGEN' ? 'IMG' : sku.type === 'REVENUE' ? 'REV' : 'ENT'}
                  </span>
                </div>
                {/* Name + price */}
                <div>
                  <p className="text-[11px] font-light text-carbon leading-snug line-clamp-1">{sku.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-carbon/30">{sku.family}</span>
                    <span className="text-[10px] font-light text-carbon/50">€{sku.pvp}</span>
                  </div>
                </div>
              </button>
            ))}
            {grouped[phase.id].length === 0 && (
              <div className="border border-dashed border-carbon/[0.08] p-4 flex items-center justify-center min-h-[80px]">
                <p className="text-[10px] text-carbon/15">{t.skuPhases?.noSkus || 'No SKUs'}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
