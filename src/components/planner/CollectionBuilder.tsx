'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Sparkles, Loader2, LayoutGrid, List, ImagePlus, X, Download, ChevronDown } from 'lucide-react';
import { useSkus, type SKU } from '@/hooks/useSkus';
import type { SetupData } from '@/types/planner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n';

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
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
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

  // Handle image upload for SKU
  const handleImageUpload = async (skuId: string, file: File) => {
    setUploadingImage(true);
    try {
      // Convert to base64 for now (in production, upload to storage)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateSku(skuId, { reference_image_url: base64 });
        if (selectedSku?.id === skuId) {
          setSelectedSku(prev => prev ? { ...prev, reference_image_url: base64 } : null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
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
        });
      }
    } catch (error) {
      console.error('Error generating SKUs:', error);
      alert('Error generating SKUs. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Auto-generation overlay (wow moment) ──
  if (autoGenerating) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-lg px-6" style={{ animation: 'fadeIn 0.6s ease-out forwards' }}>
          {/* Animated logo */}
          <div className="w-16 h-16 mx-auto mb-8 border border-carbon/20 flex items-center justify-center" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
            <Loader2 className="h-6 w-6 text-carbon/40 animate-spin" />
          </div>

          <div className="text-[10px] font-medium tracking-[0.35em] uppercase text-carbon/25 mb-6" style={{ animation: 'fadeIn 0.6s ease-out 0.5s both' }}>
            {t.plannerSections.aiBuilding || 'Aimily is building your collection'}
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-8">
            {autoGenSteps.map((step, i) => (
              <div
                key={i}
                className={`text-sm transition-all duration-700 ${
                  i < autoGenStep ? 'text-carbon/30' :
                  i === autoGenStep ? 'text-carbon font-medium' :
                  'text-carbon/10'
                }`}
                style={i <= autoGenStep ? { animation: `slideUp 0.5s ease-out ${0.8 + i * 0.3}s both` } : { opacity: 0 }}
              >
                {i < autoGenStep && <span className="text-carbon/30 mr-2">&#10003;</span>}
                {i === autoGenStep && <span className="inline-block w-1.5 h-1.5 bg-carbon rounded-full mr-2 animate-pulse" />}
                {step}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-48 h-[2px] bg-carbon/[0.06] mx-auto overflow-hidden">
            <div
              className="h-full bg-carbon transition-all duration-1000 ease-out"
              style={{ width: `${((autoGenStep + 1) / autoGenSteps.length) * 100}%` }}
            />
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
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-5 sm:gap-6">
          {[
            { label: 'Revenue', value: `€${Math.round(totalExpectedSales / 1000).toLocaleString()}K` },
            { label: 'COGS', value: `€${Math.round(totalCOGS / 1000).toLocaleString()}K` },
            { label: 'WS Value', value: `€${Math.round(totalWholesaleValue / 1000).toLocaleString()}K` },
            { label: 'DTC Margin', value: `${dtcMargin.toFixed(0)}%` },
            { label: 'WS Margin', value: `${wsMargin.toFixed(0)}%` },
            { label: 'Avg Price', value: `€${frameworkValidation.avgPrice}` },
            { label: 'SKUs', value: `${skus.length}` },
          ].map((metric) => (
            <div key={metric.label}>
              <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-white/25 mb-1.5">{metric.label}</p>
              <p className="text-xl font-light text-crema tracking-tight">{metric.value}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
              <div className="flex items-center gap-8">
                {/* Donut chart */}
                {(() => {
                  const r = 50; const circ = 2 * Math.PI * r;
                  const segments = frameworkValidation.typeDistribution;
                  const segColors = ['#9c7c4c', '#7d5a8c', '#4c7c6c'];
                  let cumulative = 0;
                  return (
                    <svg width="120" height="120" className="transform -rotate-90 shrink-0">
                      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(40,42,41,0.04)" strokeWidth="8" />
                      {segments.map((seg, i) => {
                        const offset = circ * (1 - cumulative / 100);
                        const length = circ * (seg.actual / 100);
                        cumulative += seg.actual;
                        return (
                          <circle key={seg.name} cx="60" cy="60" r={r} fill="none" stroke={segColors[i] || '#999'} strokeWidth="8"
                            strokeDasharray={`${length} ${circ - length}`} strokeDashoffset={offset}
                            className="transition-all duration-700" />
                        );
                      })}
                    </svg>
                  );
                })()}
                {/* Legend */}
                <div className="space-y-3">
                  {frameworkValidation.typeDistribution.map((td) => {
                    const labels: Record<string, string> = { REVENUE: 'Revenue', IMAGEN: 'Image', ENTRY: 'Entry' };
                    const dots: Record<string, string> = { REVENUE: 'bg-[#9c7c4c]', IMAGEN: 'bg-[#7d5a8c]', ENTRY: 'bg-[#4c7c6c]' };
                    return (
                      <div key={td.name} className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 shrink-0 ${dots[td.name] || 'bg-carbon/30'}`} />
                        <div>
                          <span className="text-sm font-light text-carbon">{labels[td.name] || td.name}</span>
                          <span className="text-sm font-light text-carbon/40 ml-2">{td.actual}%</span>
                          <span className="text-[9px] text-carbon/20 italic ml-1">target {td.target}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          </div>
          <div className="flex items-center">
            {(['list', 'cards'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 text-[10px] font-medium tracking-[0.08em] uppercase transition-colors ${viewMode === mode ? 'bg-carbon text-crema' : 'text-carbon/30 hover:text-carbon/60'}`}>
                {mode === 'list' ? <List className="h-3 w-3 inline mr-1" /> : <LayoutGrid className="h-3 w-3 inline mr-1" />}{mode}
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.plannerSections.loadingSkus}</p>
          ) : skus.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.plannerSections.noSkusYet}</p>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">{t.plannerSections.productName}</th>
                    <th className="text-left py-2 px-2">{t.plannerSections.family}</th>
                    <th className="text-left py-2 px-2">{t.plannerSections.type}</th>
                    <th className="text-left py-2 px-2">{t.plannerSections.role}</th>
                    <th className="text-left py-2 px-2">{t.plannerSections.origin}</th>
                    <th className="text-right py-2 px-2">{t.plannerSections.cost}</th>
                    <th className="text-right py-2 px-2">PVP</th>
                    <th className="text-right py-2 px-2">{t.plannerSections.units}</th>
                    <th className="text-right py-2 px-2">{t.plannerSections.sales}</th>
                    <th className="text-right py-2 px-2">{t.plannerSections.marginPercent}</th>
                    <th className="text-right py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {skus.map((sku) => (
                    <tr 
                      key={sku.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => openSkuDetail(sku)}
                    >
                      <td className="py-2 px-2 font-medium">{sku.name}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">{sku.family}</Badge>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] uppercase text-white ${sku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : sku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'}`}>
                          {sku.type === 'IMAGEN' ? 'IMAGE' : sku.type}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {sku.sku_role && <Badge variant="outline" className={`text-xs ${sku.sku_role === 'BESTSELLER_REINVENTION' ? 'border-carbon/30 text-carbon/60' : sku.sku_role === 'CARRYOVER' ? 'border-carbon/20 text-carbon/40' : sku.sku_role === 'CAPSULE' ? 'border-carbon/20 text-carbon/40' : ''}`}>{sku.sku_role === 'BESTSELLER_REINVENTION' ? 'Bestseller' : sku.sku_role === 'CARRYOVER' ? 'Carry-over' : sku.sku_role || 'New'}</Badge>}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{sku.origin || '—'}</td>
                      <td className="py-2 px-2 text-right">€{sku.cost}</td>
                      <td className="py-2 px-2 text-right">€{sku.pvp}</td>
                      <td className="py-2 px-2 text-right">{sku.buy_units}</td>
                      <td className="py-2 px-2 text-right font-medium">€{Math.round(sku.expected_sales).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={sku.margin >= 50 ? 'text-carbon' : 'text-carbon/40'}>
                          {Math.round(sku.margin)}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteSku(sku.id); }}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {skus.map((sku) => (
                <div
                  key={sku.id}
                  className="border border-carbon/[0.06] overflow-hidden hover:border-carbon/15 transition-all cursor-pointer bg-white group"
                  onClick={() => openSkuDetail(sku)}
                >
                  {/* Image / Name area */}
                  <div className="aspect-square bg-carbon/[0.02] relative flex items-center justify-center">
                    {sku.reference_image_url ? (
                      <img src={sku.reference_image_url} alt={sku.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="px-4 text-center">
                        <ImagePlus className="h-6 w-6 text-carbon/10 mx-auto mb-2" />
                        <p className="text-[13px] font-light text-carbon leading-snug">{sku.name}</p>
                        <p className="text-[10px] text-carbon/25 mt-1 italic">{sku.family}</p>
                      </div>
                    )}
                    {/* Type Badge */}
                    <span className={`absolute top-2 right-2 px-2 py-0.5 text-[9px] font-semibold tracking-[0.06em] uppercase text-white ${
                      sku.type === 'REVENUE' ? 'bg-[#9c7c4c]' :
                      sku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'
                    }`}>
                      {sku.type === 'IMAGEN' ? 'IMAGE' : sku.type}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="px-3 py-3 border-t border-carbon/[0.04] space-y-2">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div>
                        <p className="text-[9px] text-carbon/25 uppercase tracking-wider">PVP</p>
                        <p className="text-sm font-light text-carbon">€{sku.pvp}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/25 uppercase tracking-wider">COGS</p>
                        <p className="text-sm font-light text-carbon">€{sku.cost}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/25 uppercase tracking-wider">Units</p>
                        <p className="text-sm font-light text-carbon">{sku.buy_units}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/25 uppercase tracking-wider">Margin</p>
                        <p className="text-sm font-light text-carbon">{Math.round(sku.margin)}%</p>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-carbon/[0.03]">
                      <p className="text-[9px] text-carbon/25 uppercase tracking-wider">Expected Sales</p>
                      <p className="text-sm font-light text-carbon">€{Math.round(sku.expected_sales).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SKU Detail Modal */}
      {selectedSku && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{selectedSku.name}</CardTitle>
                <CardDescription>{selectedSku.family} · Drop {selectedSku.drop_number}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSku(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Section */}
              <div className="space-y-2">
                <Label>Reference Image / Sketch</Label>
                <div className="border-2 border-dashed rounded-lg overflow-hidden">
                  {selectedSku.reference_image_url ? (
                    <div className="relative">
                      <img
                        src={selectedSku.reference_image_url}
                        alt={selectedSku.name}
                        className="w-full max-h-64 object-contain bg-gray-50"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() => updateSku(selectedSku.id, { reference_image_url: undefined })}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-muted/50">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(selectedSku.id, file);
                        }}
                      />
                      {uploadingImage ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload image or sketch</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t.plannerSections.type}</Label>
                  <span className={`w-full flex justify-center px-2 py-1 text-[10px] font-semibold tracking-[0.06em] uppercase text-white ${
                    selectedSku.type === 'REVENUE' ? 'bg-[#9c7c4c]' :
                    selectedSku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'
                  }`}>
                    {selectedSku.type === 'IMAGEN' ? 'IMAGE' : selectedSku.type}
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t.plannerSections.channel}</Label>
                  <p className="font-semibold text-sm">{selectedSku.channel}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t.plannerSections.origin}</Label>
                  <p className="font-semibold text-sm">{selectedSku.origin || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t.plannerSections.role}</Label>
                  <p className="font-semibold text-sm">{selectedSku.sku_role === 'BESTSELLER_REINVENTION' ? 'Bestseller' : selectedSku.sku_role === 'CARRYOVER' ? 'Carry-over' : selectedSku.sku_role || 'New'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="font-semibold text-sm">{selectedSku.category}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Launch Date</Label>
                  <p className="font-semibold text-sm">{selectedSku.launch_date || 'TBD'}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3">Financial Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.plannerSections.cost}</span>
                    <p className="font-semibold text-lg">€{selectedSku.cost}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PVP</span>
                    <p className="font-semibold text-lg">€{selectedSku.pvp}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.plannerSections.buyUnits}</span>
                    <p className="font-semibold text-lg">{selectedSku.buy_units}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.plannerSections.margin}</span>
                    <p className={`font-semibold text-lg ${selectedSku.margin >= 50 ? 'text-carbon' : 'text-carbon/40'}`}>
                      {Math.round(selectedSku.margin)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.plannerSections.discount}</span>
                    <p className="font-semibold">{selectedSku.discount}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Final Price</span>
                    <p className="font-semibold">€{selectedSku.final_price}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.plannerSections.salePercent}</span>
                    <p className="font-semibold">{selectedSku.sale_percentage}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Sales</span>
                    <p className="font-semibold text-carbon">€{Math.round(selectedSku.expected_sales).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Size Run */}
              <div className="space-y-2">
                <Label>Size Run (units per size)</Label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const category = selectedSku.category;
                    const sizes = category === 'CALZADO'
                      ? ['35','36','37','38','39','40','41','42','43','44','45']
                      : category === 'ROPA'
                      ? ['XXS','XS','S','M','L','XL','XXL']
                      : ['ONE'];
                    const currentRun = selectedSku.size_run || {};
                    return sizes.map(size => (
                      <div key={size} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{size}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-14 text-center text-xs"
                          value={currentRun[size] || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const newRun = { ...currentRun, [size]: val };
                            if (val === 0) delete newRun[size];
                            updateSku(selectedSku.id, { size_run: newRun } as any);
                            setSelectedSku(prev => prev ? { ...prev, size_run: newRun } : null);
                          }}
                        />
                      </div>
                    ));
                  })()}
                </div>
                {selectedSku.size_run && Object.keys(selectedSku.size_run).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total: {Object.values(selectedSku.size_run).reduce((a: number, b: number) => a + b, 0)} units
                  </p>
                )}
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <Label>Notes & Concept Description</Label>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder={t.plannerSections.skuNotesPlaceholder}
                  className="w-full h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => handleNotesUpdate(selectedSku.id)}
                    disabled={editingNotes === (selectedSku.notes || '')}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteSku(selectedSku.id);
                    setSelectedSku(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete SKU
                </Button>
                <Button onClick={() => setSelectedSku(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                                <span className={`px-2 py-0.5 text-[9px] font-semibold uppercase text-white ${sku.type === 'REVENUE' ? 'bg-[#9c7c4c]' : sku.type === 'IMAGEN' ? 'bg-[#7d5a8c]' : 'bg-[#4c7c6c]'}`}>{sku.type === 'IMAGEN' ? 'IMAGE' : sku.type}</span>
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
