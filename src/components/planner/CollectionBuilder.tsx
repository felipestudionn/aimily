'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Sparkles, Loader2, LayoutGrid, List, X, Download, ChevronDown, Kanban, Package, FlipHorizontal2, ArrowRight } from 'lucide-react';
import { useSkus, type SKU, type DesignPhase } from '@/hooks/useSkus';
import { DropScheduleSection } from './DropScheduleSection';
import type { SetupData } from '@/types/planner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n';
import { useColorways } from '@/hooks/useColorways';
import { useSampleReviews } from '@/hooks/useSampleReviews';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { SkuDetailView } from './SkuDetailView';
import { SkuLifecycleProvider, EMPTY_DESIGN_DATA, type DesignWorkspaceData } from './sku-phases/SkuLifecycleContext';

/**
 * Map a Block 2 family name to the legacy macro-category enum.
 * The DB column `category` is typed as 'CALZADO' | 'ROPA' | 'ACCESORIOS'
 * (load-bearing for PO export, tech-pack labels, prototyping SLA, sketch
 * material zones). Block 2's canonical pattern uses richer family names
 * (Sastrería, Vestidos, Calzado, Bolsos…) so we project down to the
 * macro enum here. Anything bag-shaped → ACCESORIOS, anything
 * shoe-shaped → CALZADO, everything else → ROPA.
 */
/** Editable family header pill — used in both list and cards views.
 * Click the name → rename inline (writes to CIS families.list + cascades
 * SKU.family). Hover the pill → reveals X to delete the entire family. */
function FamilyHeaderPill({
  family, skuCount, revenue, onRename, onDelete,
}: {
  family: string;
  skuCount: number;
  revenue: number;
  onRename: (newName: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(family);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === family) {
      setDraft(family);
      return;
    }
    setBusy(true);
    try { await onRename(trimmed); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-3 group/fam">
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setDraft(family); setEditing(false); }
          }}
          onBlur={submit}
          disabled={busy}
          className="px-4 py-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-carbon border border-carbon/30 rounded-full bg-white outline-none w-[180px]"
        />
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(family); setEditing(true); }}
          disabled={busy}
          className="px-4 py-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-carbon border border-carbon/[0.15] rounded-full hover:border-carbon/30 hover:bg-carbon/[0.02] transition-colors cursor-text disabled:opacity-50"
          title="Renombrar familia (cascadea a todos sus SKUs)"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin inline" /> : family}
        </button>
      )}
      <span className="text-[11px] text-carbon/55 tabular-nums">{skuCount} SKUs</span>
      <span className="text-[11px] text-carbon/35 tabular-nums">€{Math.round(revenue).toLocaleString()}</span>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(`¿Eliminar la familia "${family}" y los ${skuCount} SKUs que contiene?`)) {
            onDelete();
          }
        }}
        disabled={busy}
        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-carbon/15 hover:text-destructive hover:bg-destructive/[0.04] opacity-0 group-hover/fam:opacity-100 transition-opacity"
        title="Eliminar familia (borra todos sus SKUs)"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

/** Display-only secondary KPI cell (mirrors the inline-editable pattern). */
function SecondaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mb-1.5 whitespace-nowrap">{label}</p>
      <p className="text-[16px] font-semibold text-carbon/70 tabular-nums tracking-[-0.02em] leading-none">{value}</p>
    </div>
  );
}

function familyToCategory(family: string | undefined): 'CALZADO' | 'ROPA' | 'ACCESORIOS' {
  const f = (family || '').toLowerCase();
  if (!f) return 'ROPA';
  if (/^calzad|shoe|footwear|zapato|botas?\b|sandalias?|mocasin/.test(f)) return 'CALZADO';
  if (/bolso|bag|cluth|crossbody|tote|hobo|accesori|bisuter|joyeria|jewelry/.test(f)) return 'ACCESORIOS';
  return 'ROPA';
}

interface CollectionBuilderProps {
  setupData: SetupData;
  collectionPlanId: string;
  initialPhaseFilter?: string;
}

/* ── SkuCardPill — mini sliding pill for Sketch/AI toggle on cards ── */
function SkuCardPill({ hasRender, showRender, isGenerating, onToggle }: {
  hasRender: boolean;
  showRender: boolean;
  isGenerating: boolean;
  onToggle: (view: 'sketch' | 'ai') => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });
  const active = isGenerating ? 'ai' : showRender ? 'ai' : 'sketch';

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-pill-btn]');
    const idx = active === 'sketch' ? 0 : 1;
    const btn = buttons[idx];
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center bg-white/90 backdrop-blur-sm border border-carbon/[0.08] rounded-full p-[2px] shadow-sm"
    >
      <div
        className="absolute top-[2px] h-[calc(100%-4px)] bg-carbon rounded-full transition-all duration-250 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      <button
        data-pill-btn
        onClick={() => onToggle('sketch')}
        className={`relative z-10 px-2.5 py-1 text-[8px] font-semibold tracking-[0.08em] uppercase transition-colors duration-200 rounded-full whitespace-nowrap ${
          active === 'sketch' ? 'text-crema' : 'text-carbon/35 hover:text-carbon/55'
        }`}
      >
        Sketch
      </button>
      <button
        data-pill-btn
        onClick={() => onToggle('ai')}
        disabled={isGenerating}
        className={`relative z-10 px-2.5 py-1 text-[8px] font-semibold tracking-[0.08em] uppercase transition-colors duration-200 rounded-full whitespace-nowrap flex items-center gap-1 ${
          active === 'ai' ? 'text-crema' : 'text-carbon/35 hover:text-carbon/55'
        } ${isGenerating ? 'cursor-wait' : ''}`}
      >
        {isGenerating && <Loader2 className="h-2 w-2 animate-spin" />}
        {hasRender ? 'AI' : <><Sparkles className="h-2 w-2" /> AI</>}
      </button>
    </div>
  );
}

export function CollectionBuilder({ setupData, collectionPlanId, initialPhaseFilter }: CollectionBuilderProps) {
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
  /* Inline editable margin (writes to strategy.target_margin_pct + cascades
   * SKU costs). The "espacio vivo" pattern — edits at the point of
   * consequence flow back to CIS without a "refresh" button. */
  const [editingMarginPct, setEditingMarginPct] = useState<string | null>(null);
  const [savingMargin, setSavingMargin] = useState(false);
  /* Inline editable wholesale discount % (drives WS value + WS margin
   * formulas; the underlying knob from 02.3 Distribución). */
  const [editingWsDiscount, setEditingWsDiscount] = useState<string | null>(null);
  const [savingWsDiscount, setSavingWsDiscount] = useState(false);
  /* Inline editable SKU target — opens a confirmation row when the new
   * target diverges from skus.length (auto-generate diff or trim lowest). */
  const [editingSkuTarget, setEditingSkuTarget] = useState<string | null>(null);
  const [pendingSkuTarget, setPendingSkuTarget] = useState<{ newCount: number; current: number; delta: number } | null>(null);
  const [applyingSkuTarget, setApplyingSkuTarget] = useState<'add' | 'trim' | null>(null);
  /* Inline editable channel mix — 4 inputs, must sum to 100. Loaded once
   * from CIS via /api/distribution-load on mount; edits write the whole
   * channel_mix object back via /api/cis-update. */
  type ChannelKey = 'dtc_online' | 'dtc_physical' | 'wholesale' | 'marketplace';
  const [channelMix, setChannelMix] = useState<Record<ChannelKey, number> | null>(null);
  const [editingChannelKey, setEditingChannelKey] = useState<ChannelKey | null>(null);
  const [editingChannelValue, setEditingChannelValue] = useState<string>('');
  const [savingChannelMix, setSavingChannelMix] = useState(false);
  /* Inline editable revenue + absorption strip. New target opens a 3-option
   * choice: add SKUs (Aimily auto-gen) / scale pvp (preserve count) / mixto. */
  const [editingRevenueK, setEditingRevenueK] = useState<string | null>(null);
  const [pendingAbsorption, setPendingAbsorption] = useState<{
    newTarget: number; current: number; delta: number;
  } | null>(null);
  const [applyingAbsorption, setApplyingAbsorption] = useState<'A' | 'B' | 'C' | null>(null);
  /* Bottom-up drift modal — when the user edits SKUs (add/remove/change pvp,
   * cost, units, family), the dashboard's actuals diverge from the CIS plan
   * targets. After a 1.5s debounce we surface a modal that shows the impact
   * and offers a one-click "Actualizar plan" to push the actuals back into
   * CIS, closing the loop. The "espacio vivo" pattern in reverse. */
  const [cisBaseline, setCisBaseline] = useState<{
    sales_target_y1: number;
    target_margin_pct: number;
    target_sku_count: number;
  } | null>(null);
  const [driftDismissedAt, setDriftDismissedAt] = useState(0);
  const [lastCascadeAt, setLastCascadeAt] = useState(0);
  const [driftModalOpen, setDriftModalOpen] = useState(false);
  const [driftSyncing, setDriftSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenStep, setAutoGenStep] = useState(0);
  const [autoGenDone, setAutoGenDone] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'pipeline' | 'orders'>('cards');
  /* Flip toggle — when true, every SKU card in the grid rotates to its
     back side showing full financial detail with a mini thumbnail.
     Two states, no zoom, no modes. */
  const [flipped, setFlipped] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [aiViewSkus, setAiViewSkus] = useState<Set<string>>(new Set());
  const [renderingSkus, setRenderingSkus] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCarryOver, setShowCarryOver] = useState(false);
  const [carryOverData, setCarryOverData] = useState<{ collections: any[]; skus: SKU[] } | null>(null);
  const [carryOverLoading, setCarryOverLoading] = useState(false);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [importingSkus, setImportingSkus] = useState(false);

  const { skus: allSkus, addSku, updateSku, deleteSku, loading, refetch } = useSkus(collectionPlanId);

  // Felipe sprint Aimily Design 2026-05-18 · auto-open SKU detail when
  // navigating from In-Season ("Abrir Aimily Design →"). Reads ?open_sku=
  // once after SKUs load and triggers openSkuDetail with that SKU. Cleans
  // the URL so refresh doesn't re-trigger.
  // Ref: /api/in-season/sku-actions/open-design/route.ts
  const [autoOpenSkuId, setAutoOpenSkuId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get('open_sku');
    if (target) {
      setAutoOpenSkuId(target);
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);
  useEffect(() => {
    if (!autoOpenSkuId || loading) return;
    const found = allSkus.find((s) => s.id === autoOpenSkuId);
    if (found) {
      setSelectedSku(found);
      setEditingNotes(found.notes || '');
      setAutoOpenSkuId(null);
    }
  }, [autoOpenSkuId, allSkus, loading]);

  /* ── Phase filter from sidebar navigation (reads URL ?phase= directly) ── */
  const currentSearchParams = useSearchParams();
  const phaseFilter = currentSearchParams?.get('phase') || null;
  const PHASE_FILTER_MAP: Record<string, string[]> = {
    sketch: ['range_plan', 'sketch'],
    prototyping: ['prototyping'],
    production: ['production'],
    selection: ['production', 'completed'],
  };
  const skus = useMemo(() => {
    if (!phaseFilter || !PHASE_FILTER_MAP[phaseFilter]) return allSkus;
    const allowedPhases = PHASE_FILTER_MAP[phaseFilter];
    return allSkus.filter(s => allowedPhases.includes(s.design_phase || 'range_plan'));
  }, [allSkus, phaseFilter]);

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
            throw new Error(t.plannerSections?.generationFailed || 'Generation failed');
          }

          const responseData = await response.json();
          const batchSkus = responseData.skus || [];

          for (const suggested of batchSkus) {
            const margin = ((suggested.pvp - suggested.cost) / suggested.pvp) * 100;
            allGeneratedSkus.push({
              collection_plan_id: collectionPlanId,
              name: suggested.name,
              family: suggested.family || setupData.families?.[0] || 'General',
              // Map family → legacy CALZADO/ROPA/ACCESORIOS enum (used by
              // PO export, tech-pack labels, prototyping SLA days, sketch
              // material zones). Without per-SKU mapping we used to bunch
              // all SKUs under setupData.productCategory (= the first
              // family of the collection), which broke every downstream
              // grouping. Bag-like and footwear-like family names route
              // to their respective macros; anything else is ROPA.
              category: familyToCategory(suggested.family || setupData.productCategory),
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

  // Wholesale value reads the user's confirmed wholesale discount from CIS
  // (02.3 channels.pricing_per_channel.wholesale_discount_pct, surfaced via
  // derived.plannedDiscounts). Default 50% if CIS hasn't been seeded yet.
  // Old formula `COGS × 2.5` ignored the strategy and inflated WS value
  // → WS margin always read 60%, which is the markup-chain rule of thumb,
  // not what the user actually negotiated.
  const wholesaleDiscountPct = setupData.plannedDiscounts ?? 50;
  const totalWholesaleValue = useMemo(() => {
    const factor = 1 - (wholesaleDiscountPct / 100);
    return skus.reduce((acc, sku) => {
      const soldUnits = Math.round(sku.buy_units * (sku.sale_percentage || 60) / 100);
      return acc + (sku.pvp * factor * soldUnits);
    }, 0);
  }, [skus, wholesaleDiscountPct]);

  // DTC Margin = (Revenue - COGS) / Revenue
  const dtcMargin = useMemo(() => {
    return totalExpectedSales > 0 ? ((totalExpectedSales - totalCOGS) / totalExpectedSales) * 100 : 0;
  }, [totalExpectedSales, totalCOGS]);

  // Wholesale Margin = (WS Revenue - COGS) / WS Revenue
  // Now driven by the actual CIS wholesale_discount_pct, not a hardcoded markup chain.
  const wsMargin = useMemo(() => {
    return totalWholesaleValue > 0 ? ((totalWholesaleValue - totalCOGS) / totalWholesaleValue) * 100 : 0;
  }, [totalWholesaleValue, totalCOGS]);

  // Use DTC margin as primary (most brands start DTC)
  const marginPercentage = dtcMargin;

  // ── Drift detection (bottom-up) ────────────────────────────────────────
  // Capture the CIS baseline once, the first time we have stable SKU data.
  // From then on, watch totalExpectedSales / dtcMargin / skus.length and
  // open the drift modal when actuals diverge from the plan beyond
  // tolerance. Cooldowns: skip during initial mount, skip for 5s after a
  // knob-driven cascade, skip for 30s after the user dismisses the modal.
  useEffect(() => {
    if (cisBaseline !== null) return;
    if (loading) return;
    if (!setupData.totalSalesTarget && !setupData.targetMargin && !setupData.expectedSkus) return;
    setCisBaseline({
      sales_target_y1: setupData.totalSalesTarget || 0,
      target_margin_pct: setupData.targetMargin || 0,
      target_sku_count: setupData.expectedSkus || 0,
    });
  }, [loading, setupData.totalSalesTarget, setupData.targetMargin, setupData.expectedSkus, cisBaseline]);

  const driftImpacts = useMemo(() => {
    if (!cisBaseline) return [];
    const impacts: Array<{ key: string; label: string; before: string; after: string; deltaPct: number; severity: 'low' | 'medium' | 'high' }> = [];
    // Revenue drift
    if (cisBaseline.sales_target_y1 > 0) {
      const deltaPct = ((totalExpectedSales - cisBaseline.sales_target_y1) / cisBaseline.sales_target_y1) * 100;
      if (Math.abs(deltaPct) >= 2) {
        impacts.push({
          key: 'revenue',
          label: 'Revenue Y1',
          before: `€${Math.round(cisBaseline.sales_target_y1 / 1000)}K`,
          after: `€${Math.round(totalExpectedSales / 1000)}K`,
          deltaPct,
          severity: Math.abs(deltaPct) >= 10 ? 'high' : Math.abs(deltaPct) >= 5 ? 'medium' : 'low',
        });
      }
    }
    // Margin drift
    if (cisBaseline.target_margin_pct > 0) {
      const deltaPP = dtcMargin - cisBaseline.target_margin_pct;
      if (Math.abs(deltaPP) >= 2) {
        impacts.push({
          key: 'margin',
          label: 'Margen DTC',
          before: `${Math.round(cisBaseline.target_margin_pct)}%`,
          after: `${Math.round(dtcMargin)}%`,
          deltaPct: deltaPP,
          severity: Math.abs(deltaPP) >= 5 ? 'high' : Math.abs(deltaPP) >= 3 ? 'medium' : 'low',
        });
      }
    }
    // SKU count drift
    if (cisBaseline.target_sku_count > 0 && skus.length !== cisBaseline.target_sku_count) {
      impacts.push({
        key: 'sku_count',
        label: 'SKUs',
        before: `${cisBaseline.target_sku_count}`,
        after: `${skus.length}`,
        deltaPct: ((skus.length - cisBaseline.target_sku_count) / cisBaseline.target_sku_count) * 100,
        severity: 'low',
      });
    }
    return impacts;
  }, [cisBaseline, totalExpectedSales, dtcMargin, skus.length]);

  // Open the modal when drift appears (with cooldowns). Debounced 1.5s
  // so a series of edits collapse into one modal opening.
  useEffect(() => {
    if (driftImpacts.length === 0) {
      if (driftModalOpen) setDriftModalOpen(false);
      return;
    }
    if (driftModalOpen) return; // Already showing
    const now = Date.now();
    if (now - lastCascadeAt < 5000) return;       // Just applied an intentional knob change
    if (now - driftDismissedAt < 30000) return;   // User dismissed recently
    const handle = setTimeout(() => {
      setDriftModalOpen(true);
    }, 1500);
    return () => clearTimeout(handle);
  }, [driftImpacts.length, lastCascadeAt, driftDismissedAt, driftModalOpen]);

  // Push the current actuals into CIS (closes the drift loop)
  const applyDriftSync = async () => {
    if (!cisBaseline || driftImpacts.length === 0) return;
    setDriftSyncing(true);
    try {
      const writes: Array<{ key: string; value: number; valueType: 'number' }> = [];
      for (const imp of driftImpacts) {
        if (imp.key === 'revenue') {
          writes.push({ key: 'sales_target_y1', value: Math.round(totalExpectedSales), valueType: 'number' });
        } else if (imp.key === 'margin') {
          writes.push({ key: 'target_margin_pct', value: Math.round(dtcMargin), valueType: 'number' });
        } else if (imp.key === 'sku_count') {
          writes.push({ key: 'target_sku_count', value: skus.length, valueType: 'number' });
        }
      }
      await Promise.all(writes.map(w => fetch('/api/cis-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          domain: 'merchandising',
          subdomain: 'strategy',
          key: w.key,
          value: w.value,
          valueType: w.valueType,
        }),
      })));
      // Refresh baseline so the modal stops firing
      setCisBaseline({
        sales_target_y1: Math.round(totalExpectedSales),
        target_margin_pct: Math.round(dtcMargin),
        target_sku_count: skus.length,
      });
      setLastCascadeAt(Date.now());
      setDriftModalOpen(false);
    } catch (err) {
      console.error('[applyDriftSync] failed', err);
    } finally {
      setDriftSyncing(false);
    }
  };

  const dismissDriftModal = () => {
    setDriftModalOpen(false);
    setDriftDismissedAt(Date.now());
  };

  // Load the channel mix from CIS (02.3 Distribución) once on mount
  useEffect(() => {
    if (channelMix) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/distribution-load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const mix = data?.plan?.channel_mix;
        if (mix && typeof mix.dtc_online === 'number') {
          setChannelMix({
            dtc_online: mix.dtc_online || 0,
            dtc_physical: mix.dtc_physical || 0,
            wholesale: mix.wholesale || 0,
            marketplace: mix.marketplace || 0,
          });
        }
      } catch (err) {
        console.warn('[channelMix load]', err);
      }
    })();
    return () => { cancelled = true; };
  }, [collectionPlanId, channelMix]);

  // Redistribute the delta across the other non-zero channels in proportion
  // to their existing share so the four values always sum to exactly 100.
  // The user shouldn't have to do mental math — they tweak one knob and the
  // mix self-balances.
  const redistributeChannelMix = (prev: Record<ChannelKey, number>, key: ChannelKey, newValue: number): Record<ChannelKey, number> => {
    const ALL: ChannelKey[] = ['dtc_online', 'dtc_physical', 'wholesale', 'marketplace'];
    const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
    const delta = clamped - prev[key];
    if (delta === 0) return prev;

    const others = ALL.filter(k => k !== key && prev[k] > 0);
    // Edge: the edited channel was the only non-zero one (e.g. user pushed
    // 100→90, others all zero). Just keep it as-is and pad first non-edited
    // with the remainder so the sum stays 100.
    if (others.length === 0) {
      const fallback: Record<ChannelKey, number> = { dtc_online: 0, dtc_physical: 0, wholesale: 0, marketplace: 0 };
      fallback[key] = clamped;
      const padTarget = ALL.find(k => k !== key)!;
      fallback[padTarget] = 100 - clamped;
      return fallback;
    }

    const otherSum = others.reduce((s, k) => s + prev[k], 0);
    const next: Record<ChannelKey, number> = { ...prev, [key]: clamped };
    let absorbed = 0;
    for (let i = 0; i < others.length; i++) {
      const k = others[i];
      const isLast = i === others.length - 1;
      // Last channel takes whatever's left so the sum lands on 100 exactly,
      // avoiding rounding drift.
      const adj = isLast
        ? -delta - absorbed
        : Math.round(-delta * (prev[k] / otherSum));
      next[k] = Math.max(0, prev[k] + adj);
      absorbed += adj;
    }

    // Final guard: if a channel went negative (large delta clamped to 0),
    // re-normalise across the surviving non-zero channels.
    const finalSum = ALL.reduce((s, k) => s + next[k], 0);
    if (finalSum !== 100) {
      const drift = 100 - finalSum;
      const fixTarget = others.find(k => next[k] + drift >= 0) || key;
      next[fixTarget] = Math.max(0, Math.min(100, next[fixTarget] + drift));
    }
    return next;
  };

  const applyChannelMixEdit = async (key: ChannelKey, raw: string) => {
    const parsed = parseFloat(raw);
    if (!channelMix || !Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setEditingChannelKey(null);
      return;
    }
    const next = redistributeChannelMix(channelMix, key, parsed);
    setEditingChannelKey(null);
    if (next[key] === channelMix[key]) return;
    setSavingChannelMix(true);
    setChannelMix(next); // optimistic
    try {
      // Write to the canonical `mix` key (matches distribution-confirm's
      // schema; channels.plan_full.channel_mix gets refreshed via the
      // distribution-confirm flow when the user re-edits 02.3 explicitly).
      await fetch('/api/cis-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          domain: 'merchandising',
          subdomain: 'channels',
          key: 'mix',
          value: next,
          valueType: 'object',
        }),
      });
      setLastCascadeAt(Date.now());
    } catch (err) {
      console.error('[applyChannelMixEdit] failed', err);
      setChannelMix(channelMix); // rollback
    } finally {
      setSavingChannelMix(false);
    }
  };

  // ── Family edits (top-down knob, inline on each family pill) ───────────
  const writeFamiliesToCis = useCallback(async (updatedNames: string[]) => {
    // Project the current SKU shape back into the families list shape
    // (PrefilledFamily). We don't have subcategory info at this level —
    // pass an empty subcategories array so families-confirm just refreshes
    // the canonical list. Subcat detail still lives on the 02.2 confirm.
    const families = updatedNames.map((name) => ({
      name,
      count: skus.filter(s => s.family === name).length,
      subcategories: [] as Array<{ name: string; count: number; evidence?: string }>,
    }));
    await fetch('/api/families-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionPlanId, families }),
    });
  }, [collectionPlanId, skus]);

  const renameFamily = useCallback(async (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;
    try {
      // 1. Cascade SKUs (family + category)
      await fetch('/api/skus/bulk-rename-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId, oldName, newName }),
      });
      // 2. Update CIS families list with the renamed entry
      const currentNames = Array.from(new Set(skus.map(s => s.family)));
      const updated = currentNames.map(n => (n === oldName ? newName : n));
      await writeFamiliesToCis(updated);
      await refetch();
      setLastCascadeAt(Date.now());
    } catch (err) {
      console.error('[renameFamily] failed', err);
    }
  }, [collectionPlanId, skus, refetch, writeFamiliesToCis]);

  const deleteFamily = useCallback(async (family: string) => {
    try {
      await fetch('/api/skus/bulk-delete-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId, family }),
      });
      const currentNames = Array.from(new Set(skus.map(s => s.family))).filter(n => n !== family);
      await writeFamiliesToCis(currentNames);
      await refetch();
      setLastCascadeAt(Date.now());
    } catch (err) {
      console.error('[deleteFamily] failed', err);
    }
  }, [collectionPlanId, skus, refetch, writeFamiliesToCis]);

  // ── Inline-edit Revenue Y1 (espacio vivo · top-down) ────────────────
  // Open absorption strip so the user picks how to materialize the delta.
  const proposeRevenueEdit = (rawK: string) => {
    const parsed = parseFloat(rawK);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEditingRevenueK(null);
      return;
    }
    const newTarget = Math.round(parsed * 1000);  // K → €
    const current = totalExpectedSales;
    const delta = newTarget - current;
    setEditingRevenueK(null);
    if (Math.abs(delta) / Math.max(current, 1) < 0.01) return; // <1% drift, ignore
    setPendingAbsorption({ newTarget, current, delta });
  };

  const applyAbsorption = async (option: 'A' | 'B' | 'C') => {
    if (!pendingAbsorption) return;
    const { newTarget, current } = pendingAbsorption;
    setApplyingAbsorption(option);
    try {
      // 1. Persist new sales_target_y1 (always)
      await fetch('/api/cis-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          domain: 'merchandising',
          subdomain: 'strategy',
          key: 'sales_target_y1',
          value: newTarget,
          valueType: 'number',
        }),
      });

      const ratio = current > 0 ? newTarget / current : 1;
      const factorB = ratio;          // full pvp scale
      const factorC = Math.sqrt(ratio); // mixto: half via pvp, half via SKUs
      const targetMarginPct = Math.round(dtcMargin);

      if (option === 'A') {
        // Add/remove SKUs proportionally — defer to existing auto-gen flow
        const newCount = Math.round(skus.length * ratio);
        await fetch('/api/cis-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionPlanId,
            domain: 'merchandising',
            subdomain: 'strategy',
            key: 'target_sku_count',
            value: newCount,
            valueType: 'number',
          }),
        });
        // Generate the diff (positive: add N; negative: trim from least-selling)
        const diff = newCount - skus.length;
        if (diff > 0) {
          // Reuse generate-skus for the additional batch
          const adjustedSetup = {
            ...setupData,
            expectedSkus: diff,
            totalSalesTarget: Math.round(newTarget - current),
            targetMargin: targetMarginPct,
          };
          const res = await fetch('/api/ai/generate-skus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setupData: adjustedSetup,
              count: diff,
              language: 'es',
              collectionPlanId,
              creativeContext: {},
            }),
          });
          if (res.ok) {
            const { skus: newSkus } = await res.json();
            const rows = (newSkus as Array<{ name: string; family?: string; type?: string; pvp: number; cogs: number; suggestedUnits: number; drop?: number; expectedSales: number }>).map((s) => ({
              collection_plan_id: collectionPlanId,
              name: s.name,
              family: s.family || setupData.families?.[0] || 'General',
              category: familyToCategory(s.family),
              type: s.type || 'REVENUE',
              channel: 'DTC',
              drop_number: s.drop || 1,
              pvp: s.pvp,
              cost: s.cogs,
              discount: 0,
              final_price: s.pvp,
              buy_units: s.suggestedUnits,
              sale_percentage: 60,
              expected_sales: s.expectedSales,
              margin: targetMarginPct,
              launch_date: new Date().toISOString().split('T')[0],
            }));
            await fetch('/api/skus/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ skus: rows }),
            });
          }
        }
        // diff < 0: not auto-trimming SKUs — user should review which to drop
      } else if (option === 'B') {
        await fetch('/api/skus/bulk-scale-pvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId, factor: factorB, targetMarginPct }),
        });
      } else {
        // Mixto = √ratio of pvp + (skus.length × (√ratio − 1)) new SKUs
        await fetch('/api/skus/bulk-scale-pvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId, factor: factorC, targetMarginPct }),
        });
        const addCount = Math.max(0, Math.round(skus.length * (factorC - 1)));
        if (addCount > 0) {
          const adjustedSetup = {
            ...setupData,
            expectedSkus: addCount,
            totalSalesTarget: Math.round(newTarget - current * factorC),
            targetMargin: targetMarginPct,
          };
          const res = await fetch('/api/ai/generate-skus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setupData: adjustedSetup,
              count: addCount,
              language: 'es',
              collectionPlanId,
              creativeContext: {},
            }),
          });
          if (res.ok) {
            const { skus: newSkus } = await res.json();
            const rows = (newSkus as Array<{ name: string; family?: string; type?: string; pvp: number; cogs: number; suggestedUnits: number; drop?: number; expectedSales: number }>).map((s) => ({
              collection_plan_id: collectionPlanId,
              name: s.name,
              family: s.family || setupData.families?.[0] || 'General',
              category: familyToCategory(s.family),
              type: s.type || 'REVENUE',
              channel: 'DTC',
              drop_number: s.drop || 1,
              pvp: s.pvp,
              cost: s.cogs,
              discount: 0,
              final_price: s.pvp,
              buy_units: s.suggestedUnits,
              sale_percentage: 60,
              expected_sales: s.expectedSales,
              margin: targetMarginPct,
              launch_date: new Date().toISOString().split('T')[0],
            }));
            await fetch('/api/skus/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ skus: rows }),
            });
          }
        }
      }

      await refetch();
      setLastCascadeAt(Date.now());
    } catch (err) {
      console.error('[applyAbsorption] failed', err);
    } finally {
      setApplyingAbsorption(null);
      setPendingAbsorption(null);
    }
  };

  // ── Inline-edit SKU target (Block 2 strategy.target_sku_count) ─────
  // Open a confirmation row: if delta > 0 → auto-gen N new SKUs;
  // if delta < 0 → offer "Aimily trim lowest N" or "Tú los eliges" (cancel).
  const proposeSkuTargetEdit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
      setEditingSkuTarget(null);
      return;
    }
    const newCount = parsed;
    const current = skus.length;
    const delta = newCount - current;
    setEditingSkuTarget(null);
    if (delta === 0) return;
    setPendingSkuTarget({ newCount, current, delta });
  };

  const applySkuTargetEdit = async (mode: 'add' | 'trim') => {
    if (!pendingSkuTarget) return;
    const { newCount, delta } = pendingSkuTarget;
    setApplyingSkuTarget(mode);
    try {
      // Always persist the new target to CIS first
      await fetch('/api/cis-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          domain: 'merchandising',
          subdomain: 'strategy',
          key: 'target_sku_count',
          value: newCount,
          valueType: 'number',
        }),
      });
      if (mode === 'add' && delta > 0) {
        // Generate the diff via existing SKU generator
        const adjustedSetup = {
          ...setupData,
          expectedSkus: delta,
          targetMargin: Math.round(dtcMargin),
          totalSalesTarget: Math.round((setupData.totalSalesTarget || 0) * (delta / Math.max(skus.length, 1))),
        };
        const res = await fetch('/api/ai/generate-skus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setupData: adjustedSetup,
            count: delta,
            language: 'es',
            collectionPlanId,
            creativeContext: {},
          }),
        });
        if (res.ok) {
          const { skus: newSkus } = await res.json();
          const rows = (newSkus as Array<{ name: string; family?: string; type?: string; pvp: number; cogs: number; suggestedUnits: number; drop?: number; expectedSales: number }>).map((s) => ({
            collection_plan_id: collectionPlanId,
            name: s.name,
            family: s.family || setupData.families?.[0] || 'General',
            category: familyToCategory(s.family),
            type: s.type || 'REVENUE',
            channel: 'DTC',
            drop_number: s.drop || 1,
            pvp: s.pvp,
            cost: s.cogs,
            discount: 0,
            final_price: s.pvp,
            buy_units: s.suggestedUnits,
            sale_percentage: 60,
            expected_sales: s.expectedSales,
            margin: Math.round(dtcMargin),
            launch_date: new Date().toISOString().split('T')[0],
          }));
          await fetch('/api/skus/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skus: rows }),
          });
        }
      } else if (mode === 'trim' && delta < 0) {
        await fetch('/api/skus/bulk-trim-lowest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId, count: -delta }),
        });
      }
      await refetch();
      setLastCascadeAt(Date.now());
    } catch (err) {
      console.error('[applySkuTargetEdit] failed', err);
    } finally {
      setApplyingSkuTarget(null);
      setPendingSkuTarget(null);
    }
  };

  // Inline-edit DTC margin → write to CIS + cascade SKU costs
  const applyMarginEdit = async (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setEditingMarginPct(null);
      return;
    }
    const next = Math.round(parsed * 10) / 10;
    if (Math.abs(next - dtcMargin) < 0.05) {
      setEditingMarginPct(null);
      return;
    }
    setSavingMargin(true);
    try {
      // 1. Persist the new target to CIS (single source of truth)
      // 2. Cascade: rewrite every SKU's cost so the dashboard recomputes consistently
      await Promise.all([
        fetch('/api/cis-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionPlanId,
            domain: 'merchandising',
            subdomain: 'strategy',
            key: 'target_margin_pct',
            value: next,
            valueType: 'number',
          }),
        }),
        fetch('/api/skus/bulk-update-margin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionPlanId, marginPct: next }),
        }),
      ]);
      await refetch();
      setLastCascadeAt(Date.now());
    } catch (err) {
      console.error('[applyMarginEdit] failed', err);
    } finally {
      setSavingMargin(false);
      setEditingMarginPct(null);
    }
  };

  // Inline-edit wholesale discount % → write to CIS channels.pricing_per_channel.
  // Recomputes WS value + WS margin live (no SKU mutation needed; the dashboard
  // re-renders from the new wholesaleDiscountPct).
  const applyWsDiscountEdit = async (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setEditingWsDiscount(null);
      return;
    }
    const next = Math.round(parsed);
    if (Math.abs(next - wholesaleDiscountPct) < 0.5) {
      setEditingWsDiscount(null);
      return;
    }
    setSavingWsDiscount(true);
    try {
      // Read existing pricing_per_channel object via /api/distribution-load
      // so we don't clobber marketplace_discount_pct.
      const loadRes = await fetch('/api/distribution-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId }),
      });
      const loadJson = loadRes.ok ? await loadRes.json() : null;
      const currentChannelsPlan = loadJson?.plan;
      const currentPricing = currentChannelsPlan?.pricing_per_channel || { wholesale_discount_pct: 50, marketplace_discount_pct: 35 };
      const newPricing = { ...currentPricing, wholesale_discount_pct: next };

      await fetch('/api/cis-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          domain: 'merchandising',
          subdomain: 'channels',
          key: 'pricing_per_channel',
          value: newPricing,
          valueType: 'object',
        }),
      });
      // No SKU cascade — the dashboard formula reads wholesaleDiscountPct
      // directly from setupData. Force a refetch of derived setup data via
      // page reload (cleanest path until we wire setupData to live state).
      window.location.reload();
    } catch (err) {
      console.error('[applyWsDiscountEdit] failed', err);
    } finally {
      setSavingWsDiscount(false);
      setEditingWsDiscount(null);
    }
  };

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

  // Derive families from actual SKU data (source of truth) — fall back to setupData only if no SKUs yet
  const availableFamilies = useMemo(() => {
    const skuFamilies = Array.from(new Set(skus.map(s => s.family).filter(Boolean)));
    return skuFamilies.length > 0 ? skuFamilies : (setupData.productFamilies?.map(f => f.name) || []);
  }, [skus, setupData.productFamilies]);

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
      alert(t.plannerSections?.skuLimitReached || 'You have already reached the expected SKU count');
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
        throw new Error(t.plannerSections?.generateSkusFailed || 'Failed to generate SKUs');
      }

      const { skus: suggestedSkus } = await response.json();

      // Add each suggested SKU - use expectedSales from API
      for (const suggested of suggestedSkus) {
        const margin = ((suggested.pvp - suggested.cost) / suggested.pvp) * 100;

        await addSku({
          collection_plan_id: collectionPlanId,
          name: suggested.name,
          family: suggested.family || availableFamilies[0] || 'General',
          category: familyToCategory(suggested.family || setupData.productCategory),
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
      alert(t.plannerSections?.skuGenerationRetry || 'Error generating SKUs. Please try again.');
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
            <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-carbon/20 mb-3">What happens next</p>
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

  /* Gold-standard title per phase — centered header matches the
     Creative / Merchandising / Financial Plan pattern. */
  const sidebarT = (t.sidebar as Record<string, string>) || {};
  const phaseTitleMap: Record<string, string> = {
    sketch: sidebarT.sketchColor || 'Sketch & Color',
    prototyping: sidebarT.prototyping || 'Prototyping',
    production: sidebarT.production || 'Production',
    selection: sidebarT.finalSelection || 'Final Selection',
  };
  const headerTitle = phaseFilter && phaseTitleMap[phaseFilter]
    ? phaseTitleMap[phaseFilter]
    : (sidebarT.collectionBuilder || 'Collection Builder');

  /* Final Selection — the curated lineup summary. Built on top of
     `production_approved` as the selection flag (already tracked per
     SKU). Shown only when phaseFilter === 'selection'. */
  const isFinalSelection = phaseFilter === 'selection';
  const selectionStats = useMemo(() => {
    if (!isFinalSelection) return null;
    const eligible = skus; // already filtered to production + completed
    const approved = eligible.filter(s => s.production_approved === true);
    const approvedRevenue = approved.reduce((sum, s) => sum + (s.expected_sales || 0), 0);
    const approvedUnits = approved.reduce((sum, s) => sum + (s.buy_units || 0), 0);
    const approvedFamilies = new Set(approved.map(s => s.family)).size;
    return {
      eligibleCount: eligible.length,
      approvedCount: approved.length,
      approvedRevenue,
      approvedUnits,
      approvedFamilies,
    };
  }, [isFinalSelection, skus]);

  return (
    <div className="space-y-5">
      {/* ── Gold-standard header + KPI ribbon ───────────────────── */}
      <div className="text-center pt-6 pb-2">
        <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
          {setupData.productCategory ? setupData.productCategory : 'Collection'}
        </p>
        <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
          {headerTitle}
        </h1>
        {isFinalSelection && (
          <p className="text-[14px] text-carbon/50 tracking-[-0.01em] mt-3 max-w-[640px] mx-auto">
            {sidebarT.finalSelectionIntro || 'The curated lineup that ships. Approve each SKU to lock it into the final collection.'}
          </p>
        )}
      </div>

      {/* ── Drop schedule (auto-synthesizes on mount if drops table empty) ── */}
      {!phaseFilter && <DropScheduleSection collectionPlanId={collectionPlanId} />}

      {/* ── Final Selection summary card (only on selection phase) ── */}
      {isFinalSelection && selectionStats && (
        <div className="bg-white rounded-[20px] p-8 md:p-10">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <p className="text-[11px] tracking-[0.12em] uppercase font-semibold text-carbon/35">
              {sidebarT.finalSelectionSummary || 'Curated lineup'}
            </p>
            <div className="flex items-center gap-2 text-[12px] text-carbon/55">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carbon text-white font-semibold">
                {selectionStats.approvedCount}
              </span>
              <span>/ {selectionStats.eligibleCount} {sidebarT.finalSelectionApproved || 'approved'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2">{sidebarT.finalSelectionRevenue || 'Approved revenue'}</p>
              <p className="text-[24px] font-bold text-carbon tabular-nums tracking-[-0.03em] leading-none">€{Math.round(selectionStats.approvedRevenue / 1000).toLocaleString()}K</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2">{sidebarT.finalSelectionUnits || 'Approved units'}</p>
              <p className="text-[24px] font-bold text-carbon tabular-nums tracking-[-0.03em] leading-none">{selectionStats.approvedUnits.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2">{sidebarT.finalSelectionFamilies || 'Families'}</p>
              <p className="text-[24px] font-bold text-carbon tabular-nums tracking-[-0.03em] leading-none">{selectionStats.approvedFamilies}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2">{sidebarT.finalSelectionPending || 'Pending review'}</p>
              <p className="text-[24px] font-bold text-carbon/40 tabular-nums tracking-[-0.03em] leading-none">{selectionStats.eligibleCount - selectionStats.approvedCount}</p>
            </div>
          </div>
          {selectionStats.eligibleCount > 0 && (
            <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
              <div className="h-2 rounded-full bg-carbon/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-carbon transition-all duration-700"
                  style={{ width: `${(selectionStats.approvedCount / selectionStats.eligibleCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI ribbon — 5 primary (large) + 5 secondary (muted second row) */}
      <div className="bg-white rounded-[20px] p-8 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[11px] tracking-[0.12em] uppercase font-semibold text-carbon/35">
            {sidebarT.collectionOverviewLabel || 'Overview'}
          </p>
          {skus.length > 0 && (
            <button
              onClick={() => setAnalyticsOpen(!analyticsOpen)}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] uppercase text-carbon/50 border border-carbon/[0.12] rounded-full hover:text-carbon/80 hover:border-carbon/30 transition-colors"
            >
              {analyticsOpen ? (sidebarT.hideDetails || 'Hide details') : (sidebarT.showDetails || 'Details')}
              <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${analyticsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>
        {/* Primary KPIs — Revenue is editable inline; opens absorption strip. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Revenue — editable */}
          <div className="flex flex-col">
            <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2.5 whitespace-nowrap">{sidebarT.metricRevenue || 'Revenue'}</p>
            {editingRevenueK !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] font-semibold text-carbon/55">€</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={editingRevenueK}
                  onChange={(e) => setEditingRevenueK(e.target.value.replace(/[^\d.]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingRevenueK(null);
                  }}
                  onBlur={() => editingRevenueK !== null && proposeRevenueEdit(editingRevenueK)}
                  className="w-[90px] text-[24px] md:text-[26px] font-semibold text-carbon tabular-nums tracking-[-0.03em] leading-none bg-carbon/[0.04] outline-none rounded px-1 -mx-1"
                />
                <span className="text-[18px] font-semibold text-carbon/55">K</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingRevenueK(String(Math.round(totalExpectedSales / 1000)))}
                className="text-[24px] md:text-[26px] font-semibold text-carbon tabular-nums tracking-[-0.03em] leading-none text-left hover:text-carbon hover:bg-carbon/[0.03] rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors w-fit cursor-text"
                title={sidebarT.editRevenueHint || 'Edita el target Y1 — Aimily ofrece 3 vías para absorberlo'}
              >
                €{Math.round(totalExpectedSales / 1000).toLocaleString()}K
              </button>
            )}
          </div>
          {/* Gross profit + Avg price (derived) */}
          {[
            { label: sidebarT.metricGrossProfit || 'Gross profit', value: `€${Math.round((totalExpectedSales - totalCOGS) / 1000).toLocaleString()}K` },
            { label: sidebarT.metricAvgPrice || 'Avg price', value: `€${frameworkValidation.avgPrice}` },
          ].map((metric) => (
            <div key={metric.label} className="flex flex-col">
              <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2.5 whitespace-nowrap">{metric.label}</p>
              <p className="text-[24px] md:text-[26px] font-semibold text-carbon tabular-nums tracking-[-0.03em] leading-none">{metric.value}</p>
            </div>
          ))}
          {/* SKUs — editable target (auto-gen diff or trim lowest) */}
          <div className="flex flex-col">
            <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2.5 whitespace-nowrap">{sidebarT.metricSkus || 'SKUs'}</p>
            {editingSkuTarget !== null ? (
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                value={editingSkuTarget}
                onChange={(e) => setEditingSkuTarget(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEditingSkuTarget(null);
                }}
                onBlur={() => editingSkuTarget !== null && proposeSkuTargetEdit(editingSkuTarget)}
                className="w-[60px] text-[24px] md:text-[26px] font-semibold text-carbon tabular-nums tracking-[-0.03em] leading-none bg-carbon/[0.04] outline-none rounded px-1 -mx-1"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingSkuTarget(String(skus.length))}
                className="text-[24px] md:text-[26px] font-semibold text-carbon tabular-nums tracking-[-0.03em] leading-none text-left hover:text-carbon hover:bg-carbon/[0.03] rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors w-fit cursor-text"
                title="Edita el número objetivo de SKUs — Aimily añade o retira los necesarios"
              >
                {skus.length}
              </button>
            )}
          </div>
          {/* Total units (derived) */}
          <div className="flex flex-col">
            <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/40 mb-2.5 whitespace-nowrap">{sidebarT.metricTotalUnits || 'Total units'}</p>
            <p className="text-[24px] md:text-[26px] font-semibold text-carbon tabular-nums tracking-[-0.03em] leading-none">{skus.reduce((s, sk) => s + sk.buy_units, 0).toLocaleString()}</p>
          </div>
        </div>

        {/* SKU target absorption strip — visible while user picks how to materialize a count delta */}
        {pendingSkuTarget && (
          <div className="mt-6 rounded-[16px] bg-carbon/[0.03] border border-carbon/[0.06] p-5">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
              <p className="text-[13px] text-carbon/70">
                <span className="font-semibold text-carbon">{pendingSkuTarget.current} → {pendingSkuTarget.newCount} SKUs</span>
                <span className="text-carbon/45 ml-2">
                  {pendingSkuTarget.delta >= 0 ? '+' : ''}{pendingSkuTarget.delta}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setPendingSkuTarget(null)}
                className="text-[11px] text-carbon/45 hover:text-carbon"
              >
                {sidebarT.cancel || 'Cancelar'}
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {pendingSkuTarget.delta > 0 ? (
                <button
                  type="button"
                  onClick={() => applySkuTargetEdit('add')}
                  disabled={applyingSkuTarget !== null}
                  className={`text-left rounded-[12px] border bg-white p-4 flex-1 min-w-[240px] transition-all ${
                    applyingSkuTarget === 'add' ? 'border-carbon/30 ring-2 ring-carbon/15' : 'border-carbon/[0.08] hover:border-carbon/30 hover:shadow-sm'
                  } disabled:opacity-50 disabled:cursor-wait`}
                >
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-[13px] font-semibold text-carbon">+{pendingSkuTarget.delta} SKUs</span>
                    {applyingSkuTarget === 'add' && <Loader2 className="h-3 w-3 animate-spin text-carbon/45" />}
                  </div>
                  <p className="text-[11px] text-carbon/55 leading-relaxed">Aimily auto-genera {pendingSkuTarget.delta} SKUs respetando familias y precios. ~30s.</p>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => applySkuTargetEdit('trim')}
                    disabled={applyingSkuTarget !== null}
                    className={`text-left rounded-[12px] border bg-white p-4 flex-1 min-w-[240px] transition-all ${
                      applyingSkuTarget === 'trim' ? 'border-carbon/30 ring-2 ring-carbon/15' : 'border-carbon/[0.08] hover:border-carbon/30 hover:shadow-sm'
                    } disabled:opacity-50 disabled:cursor-wait`}
                  >
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-[13px] font-semibold text-carbon">−{Math.abs(pendingSkuTarget.delta)} SKUs (menor venta)</span>
                      {applyingSkuTarget === 'trim' && <Loader2 className="h-3 w-3 animate-spin text-carbon/45" />}
                    </div>
                    <p className="text-[11px] text-carbon/55 leading-relaxed">Aimily quita los {Math.abs(pendingSkuTarget.delta)} SKUs con menor expected sales (no toca production-approved).</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingSkuTarget(null)}
                    className="text-left rounded-[12px] border border-carbon/[0.08] bg-white p-4 flex-1 min-w-[240px] hover:border-carbon/30 hover:shadow-sm transition-all"
                  >
                    <div className="text-[13px] font-semibold text-carbon mb-1.5">Tú los eliges</div>
                    <p className="text-[11px] text-carbon/55 leading-relaxed">Cierra esto y elimina manualmente los SKUs que no quieras del grid.</p>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Absorption strip — visible while user picks how to materialize a revenue delta */}
        {pendingAbsorption && (
          <div className="mt-6 rounded-[16px] bg-carbon/[0.03] border border-carbon/[0.06] p-5">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
              <p className="text-[13px] text-carbon/70">
                <span className="font-semibold text-carbon">€{Math.round(pendingAbsorption.current / 1000).toLocaleString()}K → €{Math.round(pendingAbsorption.newTarget / 1000).toLocaleString()}K</span>
                <span className="text-carbon/45 ml-2">
                  {pendingAbsorption.delta >= 0 ? '+' : ''}€{Math.round(pendingAbsorption.delta / 1000).toLocaleString()}K
                </span>
              </p>
              <button
                type="button"
                onClick={() => setPendingAbsorption(null)}
                className="text-[11px] text-carbon/45 hover:text-carbon"
              >
                {sidebarT.cancel || 'Cancelar'}
              </button>
            </div>
            <p className="text-[11px] tracking-[0.08em] uppercase text-carbon/45 font-medium mb-3">
              {sidebarT.absorptionHowTo || 'Cómo absorber'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(() => {
                const ratio = pendingAbsorption.current > 0 ? pendingAbsorption.newTarget / pendingAbsorption.current : 1;
                const diffSkus = Math.round(skus.length * ratio) - skus.length;
                const pvpPct = Math.round((ratio - 1) * 100);
                const mixSqrt = Math.sqrt(ratio);
                const mixSkus = Math.max(0, Math.round(skus.length * (mixSqrt - 1)));
                const mixPvpPct = Math.round((mixSqrt - 1) * 100);
                const opts = [
                  {
                    id: 'A' as const,
                    title: diffSkus >= 0 ? `+${diffSkus} SKUs` : `${diffSkus} SKUs`,
                    desc: diffSkus >= 0
                      ? (sidebarT.absorptionAddSkus || `Aimily auto-genera ${diffSkus} SKUs nuevos respetando familias y precios.`)
                      : (sidebarT.absorptionTrimSkus || `Tendrás que retirar ${Math.abs(diffSkus)} SKUs manualmente — pulsa para confirmar el target.`),
                  },
                  {
                    id: 'B' as const,
                    title: `${pvpPct >= 0 ? '+' : ''}${pvpPct}% pvp`,
                    desc: sidebarT.absorptionScalePvp || `Reescala el precio de los ${skus.length} SKUs sin tocar el surtido.`,
                  },
                  {
                    id: 'C' as const,
                    title: `+${mixSkus} SKUs · ${mixPvpPct >= 0 ? '+' : ''}${mixPvpPct}% pvp`,
                    desc: sidebarT.absorptionMixed || 'Reparto equilibrado entre nuevos SKUs y subida de precio.',
                  },
                ];
                return opts.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyAbsorption(opt.id)}
                    disabled={applyingAbsorption !== null}
                    className={`text-left rounded-[12px] border bg-white p-4 transition-all ${
                      applyingAbsorption === opt.id ? 'border-carbon/30 ring-2 ring-carbon/15' : 'border-carbon/[0.08] hover:border-carbon/30 hover:shadow-sm'
                    } disabled:opacity-50 disabled:cursor-wait`}
                  >
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-[13px] font-semibold text-carbon tracking-[-0.01em]">{opt.title}</span>
                      {applyingAbsorption === opt.id && <Loader2 className="h-3 w-3 animate-spin text-carbon/45" />}
                    </div>
                    <p className="text-[11px] text-carbon/55 leading-relaxed">{opt.desc}</p>
                  </button>
                ));
              })()}
            </div>
          </div>
        )}
        {/* Secondary KPIs — hairline row, smaller + muted. DTC margin is
            editable inline (click to retype %): writes target_margin_pct to
            CIS and cascades SKU costs. */}
        <div className="mt-7 pt-6 border-t border-carbon/[0.06] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          <SecondaryMetric label={sidebarT.metricCogs || 'COGS'} value={`€${Math.round(totalCOGS / 1000).toLocaleString()}K`} />
          <SecondaryMetric label={sidebarT.metricWsValue || 'WS value'} value={`€${Math.round(totalWholesaleValue / 1000).toLocaleString()}K`} />
          <div className="flex flex-col group/edit">
            <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mb-1.5 whitespace-nowrap">{sidebarT.metricDtcMargin || 'DTC margin'}</p>
            {editingMarginPct !== null ? (
              <div className="flex items-baseline gap-1">
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={editingMarginPct}
                  onChange={(e) => setEditingMarginPct(e.target.value.replace(/[^\d.]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Escape') { setEditingMarginPct(null); }
                  }}
                  onBlur={() => editingMarginPct !== null && applyMarginEdit(editingMarginPct)}
                  disabled={savingMargin}
                  className="w-[44px] text-[16px] font-semibold text-carbon tabular-nums tracking-[-0.02em] leading-none bg-carbon/[0.04] outline-none rounded px-1 -mx-1"
                />
                <span className="text-[16px] font-semibold text-carbon/70 leading-none">%</span>
                {savingMargin && <Loader2 className="h-3 w-3 animate-spin text-carbon/35 ml-1" />}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingMarginPct(dtcMargin.toFixed(0))}
                className="text-[16px] font-semibold text-carbon/70 tabular-nums tracking-[-0.02em] leading-none text-left hover:text-carbon hover:bg-carbon/[0.03] rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors w-fit cursor-text"
                title={sidebarT.editMarginHint || 'Edita el margen objetivo — los costes de los SKUs se reescalan automáticamente'}
              >
                {dtcMargin.toFixed(0)}%
              </button>
            )}
          </div>
          {/* WS margin — derived; sub-line is the editable knob (wholesale_discount_pct) */}
          <div className="flex flex-col">
            <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mb-1.5 whitespace-nowrap">{sidebarT.metricWsMargin || 'WS margin'}</p>
            <p className="text-[16px] font-semibold text-carbon/70 tabular-nums tracking-[-0.02em] leading-none mb-0.5">{wsMargin.toFixed(0)}%</p>
            {editingWsDiscount !== null ? (
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] text-carbon/40">−</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={editingWsDiscount}
                  onChange={(e) => setEditingWsDiscount(e.target.value.replace(/[^\d.]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingWsDiscount(null);
                  }}
                  onBlur={() => editingWsDiscount !== null && applyWsDiscountEdit(editingWsDiscount)}
                  disabled={savingWsDiscount}
                  className="w-[28px] text-[10px] tabular-nums text-carbon/60 bg-carbon/[0.04] outline-none rounded px-0.5"
                />
                <span className="text-[10px] text-carbon/40">% off retail</span>
                {savingWsDiscount && <Loader2 className="h-2.5 w-2.5 animate-spin text-carbon/35 ml-1" />}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingWsDiscount(String(wholesaleDiscountPct))}
                className="text-[10px] text-carbon/40 hover:text-carbon/65 hover:bg-carbon/[0.03] rounded px-0.5 -mx-0.5 transition-colors w-fit text-left"
                title="Edita el descuento wholesale — afecta WS value y WS margin"
              >
                −{wholesaleDiscountPct}% off retail
              </button>
            )}
          </div>
          <SecondaryMetric label={sidebarT.metricFamilies || 'Families'} value={`${new Set(skus.map(s => s.family)).size}`} />
        </div>

        {/* Channel mix row — 4 percentages, all editable inline.
            Sourced from merchandising.channels.channel_mix in CIS. */}
        {channelMix && (() => {
          const total = channelMix.dtc_online + channelMix.dtc_physical + channelMix.wholesale + channelMix.marketplace;
          const channels: Array<{ key: ChannelKey; label: string; color: string }> = [
            { key: 'dtc_online',   label: 'DTC online',   color: '#b6c8c7' },
            { key: 'dtc_physical', label: 'DTC propio',   color: '#c5caa8' },
            { key: 'wholesale',    label: 'Wholesale',    color: '#fff4ce' },
            { key: 'marketplace',  label: 'Marketplace',  color: '#f1efed' },
          ];
          return (
            <div className="mt-5 pt-5 border-t border-carbon/[0.06]">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mr-2">
                  {sidebarT.metricChannelMix || 'Mix de canales'}
                </p>
                {channels.map(({ key, label, color }) => (
                  <div key={key} className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[12px] text-carbon/55">{label}</span>
                    {editingChannelKey === key ? (
                      <div className="inline-flex items-baseline gap-0.5">
                        <input
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          value={editingChannelValue}
                          onChange={(e) => setEditingChannelValue(e.target.value.replace(/[^\d.]/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingChannelKey(null);
                          }}
                          onBlur={() => applyChannelMixEdit(key, editingChannelValue)}
                          disabled={savingChannelMix}
                          className="w-[28px] text-[12px] font-semibold text-carbon tabular-nums bg-carbon/[0.04] outline-none rounded px-0.5"
                        />
                        <span className="text-[10px] text-carbon/45">%</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingChannelKey(key);
                          setEditingChannelValue(String(channelMix[key]));
                        }}
                        className="text-[12px] font-semibold text-carbon tabular-nums hover:bg-carbon/[0.04] rounded px-1 -mx-0.5 transition-colors cursor-text"
                        title="Edita el % de este canal — debe sumar 100"
                      >
                        {channelMix[key]}%
                      </button>
                    )}
                  </div>
                ))}
                <span className={`ml-2 text-[11px] tabular-nums ${total === 100 ? 'text-carbon/35' : 'text-amber-700 font-semibold'}`}>
                  {total === 100 ? '✓ 100%' : `Suma ${total}%`}
                </span>
                {savingChannelMix && <Loader2 className="h-3 w-3 animate-spin text-carbon/45 ml-1" />}
              </div>
            </div>
          );
        })()}

        {/* Analytics — expandable (Family Mix · Segmentation · Design Progress) */}
        {analyticsOpen && skus.length > 0 && (
          <div className="mt-8 pt-8 border-t border-carbon/[0.06]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Family mix — horizontal bars */}
              <div>
                <p className="text-[11px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mb-4">{sidebarT.analyticsFamilyMix || 'Family mix'}</p>
                <div className="space-y-3">
                  {frameworkValidation.familyDistribution.map((fam) => (
                    <div key={fam.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] text-carbon/80">{fam.name}</span>
                        <span className="text-[13px] text-carbon/50 tabular-nums">{fam.actual}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-carbon/[0.06] overflow-hidden">
                        <div className="h-full bg-carbon/70 transition-all duration-700" style={{ width: `${fam.actual}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Type mix — single donut */}
              <div>
                <p className="text-[11px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mb-4">{sidebarT.analyticsSegmentation || 'Segmentation mix'}</p>
                <div className="flex items-center gap-6">
                  {(() => {
                    const r = 50; const circ = 2 * Math.PI * r;
                    const segments = frameworkValidation.typeDistribution;
                    const segColors = ['#282A29', '#9c7c4c', '#7d5a8c'];
                    let cumulative = 0;
                    return (
                      <svg width="110" height="110" className="transform -rotate-90 shrink-0">
                        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
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
                    {frameworkValidation.typeDistribution.map((td, i) => {
                      const labels: Record<string, string> = { REVENUE: 'Revenue', IMAGEN: 'Image', ENTRY: 'Entry' };
                      const colors = ['bg-[#282A29]', 'bg-[#9c7c4c]', 'bg-[#7d5a8c]'];
                      return (
                        <div key={td.name} className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i] || 'bg-carbon/30'}`} />
                          <span className="text-[13px] text-carbon/80">{labels[td.name] || td.name}</span>
                          <span className="text-[13px] text-carbon/50 tabular-nums">{td.actual}%</span>
                          <span className="text-[10px] text-carbon/35 italic">target {td.target}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Design Progress — SKUs by phase */}
              <div>
                <p className="text-[11px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mb-4">{sidebarT.analyticsDesignProgress || 'Design progress'}</p>
                <div className="space-y-3">
                  {(() => {
                    const phases: { id: string; label: string; color: string }[] = [
                      { id: 'range_plan', label: 'Concept', color: '#6b7280' },
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
                            <span className="text-[13px] text-carbon/80">{phase.label}</span>
                            <span className="text-[13px] text-carbon/50 tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-carbon/[0.06] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: phase.color }} />
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
      </div>

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
        <div className="px-6 sm:px-8 py-5 flex items-center justify-between gap-4 flex-wrap border-b border-carbon/[0.04]">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[13px] font-semibold tracking-[0.12em] uppercase text-carbon/70 whitespace-nowrap">{(t.fieldLabels as Record<string, string>)?.rangePlan || "Range Plan"}</p>
            <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] uppercase border border-carbon/[0.12] rounded-full text-carbon/50 hover:text-carbon hover:border-carbon/30 transition-colors whitespace-nowrap">
              <Plus className="h-3 w-3" /> Add SKU
            </button>
            <button
              onClick={async (e) => {
                const btn = e.currentTarget;
                btn.textContent = '...';
                try {
                  const res = await fetch(`/api/collection-export?planId=${collectionPlanId}`);
                  if (!res.ok) {
                    const text = await res.text();
                    alert(`${t.plannerSections?.exportErrorPrefix || 'Export error'}: ${res.status} ${text.slice(0, 100)}`);
                    return;
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `collection_export.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  alert(`${t.plannerSections?.exportFailedPrefix || 'Export failed'}: ${err instanceof Error ? err.message : err}`);
                } finally {
                  btn.innerHTML = '<svg class="h-3 w-3" />' + ' Excel';
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] uppercase border border-carbon/[0.12] rounded-full text-carbon/50 hover:text-carbon hover:border-carbon/30 transition-colors whitespace-nowrap"
            >
              <Download className="h-3 w-3" /> Excel
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap max-w-full">
            {viewMode === 'cards' && (
              <button
                onClick={() => setFlipped(!flipped)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] uppercase rounded-full transition-all whitespace-nowrap ${
                  flipped
                    ? 'bg-carbon text-crema'
                    : 'border border-carbon/[0.12] text-carbon/50 hover:text-carbon hover:border-carbon/30'
                }`}
                title={flipped ? (t.plannerSections?.showVisual || 'Show visual') : (t.plannerSections?.flipForDetails || 'Flip for details')}
              >
                <FlipHorizontal2 className="h-3 w-3" />
                {flipped ? (t.plannerSections?.showVisual || 'Show visual') : (t.plannerSections?.flipForDetails || 'Flip for details')}
              </button>
            )}
            <div className="flex items-center bg-carbon/[0.04] rounded-full p-0.5 overflow-x-auto scrollbar-subtle max-w-full">
              {(['pipeline', 'list', 'cards', 'orders'] as const).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)} className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-medium tracking-[0.06em] uppercase transition-all rounded-full ${viewMode === mode ? 'bg-carbon text-crema shadow-sm' : 'text-carbon/35 hover:text-carbon/60'}`}>
                  {mode === 'pipeline' ? <Kanban className="h-3 w-3" /> : mode === 'list' ? <List className="h-3 w-3" /> : mode === 'orders' ? <Package className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}{mode}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Family filter pills */}
        {viewMode === 'list' && skus.length > 0 && (
          <div className="px-6 sm:px-8 pb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFamily('')} className={`px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] uppercase rounded-full border transition-colors ${!family ? 'bg-carbon text-crema border-carbon' : 'border-carbon/[0.08] text-carbon/35 hover:text-carbon/60 hover:border-carbon/20'}`}>
              All
            </button>
            {availableFamilies.map((f) => (
              <button key={f} onClick={() => setFamily(family === f ? '' : f)} className={`px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] uppercase rounded-full border transition-colors ${family === f ? 'bg-carbon text-crema border-carbon' : 'border-carbon/[0.08] text-carbon/35 hover:text-carbon/60 hover:border-carbon/20'}`}>
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
                      {/* Family header — editable inline (rename + delete cascade) */}
                      <div className="flex items-center justify-between mb-3">
                        <FamilyHeaderPill
                          family={fam}
                          skuCount={famSkus.length}
                          revenue={famRevenue}
                          onRename={(newName) => renameFamily(fam, newName)}
                          onDelete={() => deleteFamily(fam)}
                        />
                      </div>
                      {/* SKU rows */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left py-1.5 px-2 text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">{(t.fieldLabels as Record<string, string>)?.product || "Product"}</th>
                              <th className="text-left py-1.5 px-2 text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">{(t.fieldLabels as Record<string, string>)?.type || "Type"}</th>
                              <th className="text-right py-1.5 px-2 text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">COGS</th>
                              <th className="text-right py-1.5 px-2 text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">PVP</th>
                              <th className="text-right py-1.5 px-2 text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">{(t.fieldLabels as Record<string, string>)?.units || "Units"}</th>
                              <th className="text-right py-1.5 px-2 text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">{(t.fieldLabels as Record<string, string>)?.sales || "Sales"}</th>
                              <th className="text-right py-1.5 px-2 text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">{(t.fieldLabels as Record<string, string>)?.margin || "Margin"}</th>
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
                                  <button onClick={(e) => { e.stopPropagation(); deleteSku(sku.id); }} className="text-carbon/20 hover:text-[#A0463C]/50 transition-colors">
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
          ) : viewMode === 'orders' ? (
            /* Orders View — approved SKUs grouped by factory */
            <OrdersView skus={skus} collectionPlanId={collectionPlanId} onSkuClick={openSkuDetail} />
          ) : (
            /* Cards View — grouped by family */
            <div className="space-y-6">
              {(() => {
                const cardFamilies = Array.from(new Set(skus.map(s => s.family)));
                return cardFamilies.map((fam, fIdx) => {
                  const famSkus = skus.filter(s => s.family === fam);
                  return (
                    <div key={fam}>
                      {/* Family pill header — editable inline (rename + delete cascade) */}
                      <div className={`flex items-center justify-between gap-3 flex-wrap mb-4 ${fIdx > 0 ? 'pt-6 border-t border-carbon/[0.06]' : ''}`}>
                        <FamilyHeaderPill
                          family={fam}
                          skuCount={famSkus.length}
                          revenue={famSkus.reduce((s, sk) => s + sk.expected_sales, 0)}
                          onRename={(newName) => renameFamily(fam, newName)}
                          onDelete={() => deleteFamily(fam)}
                        />
                      </div>
                      <div
                        className="grid gap-5"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}
                      >
              {famSkus.map((sku) => {
                // Dynamic image: show most advanced phase image
                const protoImg = sku.proto_iterations?.length > 0 ? sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] : undefined;
                const displayImage = sku.production_sample_url || protoImg || sku.render_url || sku.sketch_url || sku.reference_image_url;
                const renderImage = (sku.render_urls as Record<string, string>)?.['3d'] || (sku.render_urls as Record<string, string>)?.['preview'];
                const showRender = aiViewSkus.has(sku.id) && renderImage;
                // No cropping policy (Felipe, 2026-05-13): the frontend never
                // crops what the API returns. Reference photos, sketches, 3D
                // renders, proto and production shots all render with
                // object-contain. Letterboxing is preferable to silently
                // losing pixels off any side.
                const displayFit = 'object-contain';
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
                const typeColor = sku.type === 'REVENUE' ? '#9c7c4c' : sku.type === 'IMAGEN' ? '#7d5a8c' : '#4c7c6c';
                const typeLabel = sku.type === 'IMAGEN' ? 'IMAGE' : sku.type;
                const ctaText =
                  (sku.design_phase || 'range_plan') === 'range_plan' && !sku.reference_image_url ? (t.skuPhases?.ctaAddReference || 'Add Reference')
                  : (sku.design_phase || 'range_plan') === 'range_plan' ? (t.skuPhases?.ctaStartSketch || 'Start Sketch')
                  : sku.design_phase === 'sketch' && !sku.sketch_url ? (t.skuPhases?.ctaUploadSketch || 'Upload Sketch')
                  : sku.design_phase === 'sketch' ? (t.skuPhases?.ctaDefineColors || 'Define Colorways')
                  : sku.design_phase === 'prototyping' ? (t.skuPhases?.ctaReviewProto || 'Review Proto')
                  : sku.design_phase === 'production' ? (t.skuPhases?.ctaValidate || 'Validate Sample')
                  : sku.design_phase === 'completed' ? (t.skuPhases?.ctaCompleted || 'View Details')
                  : (t.skuPhases?.ctaAddReference || 'Add Reference');
                return (
                <div
                  key={sku.id}
                  className="relative group [perspective:1200px]"
                  onClick={() => openSkuDetail(sku)}
                >
                {/* ── Hover peek — shown only when grid is in visual mode ── */}
                {!flipped && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[260px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                  <div className="bg-white rounded-[16px] shadow-[0_24px_56px_rgba(0,0,0,0.14)] border border-carbon/[0.06] p-4">
                    <p className="text-[13px] font-medium text-carbon tracking-[-0.01em] leading-tight mb-1 truncate">{sku.name}</p>
                    <div className="flex items-center gap-3 mb-3 text-[9px] font-semibold tracking-[0.08em] uppercase">
                      <span className="inline-flex items-center gap-1.5" style={{ color: phaseStrokeColor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phaseStrokeColor }} />
                        {phaseLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5" style={{ color: typeColor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor }} />
                        {typeLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 tabular-nums pt-3 border-t border-carbon/[0.06]">
                      <div>
                        <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">PVP</p>
                        <p className="text-[14px] font-semibold text-carbon">€{sku.pvp}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">COGS</p>
                        <p className="text-[14px] font-semibold text-carbon">€{sku.cost}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">{(t.fieldLabels as Record<string, string>)?.units || "Units"}</p>
                        <p className="text-[14px] font-semibold text-carbon">{sku.buy_units}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">{(t.fieldLabels as Record<string, string>)?.margin || "Margin"}</p>
                        <p className="text-[14px] font-semibold text-carbon">{Math.round(sku.margin)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-carbon/[0.06] flex items-center justify-between">
                      <span className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold">{(t.fieldLabels as Record<string, string>)?.nextStep || "Next step"}</span>
                      <span className="text-[11px] font-semibold text-carbon tracking-[-0.01em]">{ctaText}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-carbon/[0.06] rotate-45" />
                </div>
                )}

                {/* ── Flipper — 3D transform container ── */}
                <div className={`relative transition-transform duration-700 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>

                {/* ── FRONT — visual-first ── */}
                <div className="[backface-visibility:hidden]">
                <div
                  className="bg-white rounded-[20px] overflow-hidden border border-carbon/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-carbon/[0.1] transition-all duration-300 cursor-pointer"
                >
                  {/* Visual zone — CLEAN. Only the image. No overlays, no pills, no CTA. */}
                  <div className="aspect-[4/5] bg-white relative overflow-hidden">
                    {showRender ? (
                      <img src={renderImage} alt={sku.name} className="absolute inset-0 w-full h-full object-contain" />
                    ) : displayImage ? (
                      <img src={displayImage as string} alt={sku.name} className={`absolute inset-0 w-full h-full ${displayFit}`} />
                    ) : (
                      <>
                        {/* Empty cover — quiet canvas, no text. Name + phase live in the footer. */}
                        <div className="absolute inset-0 bg-gradient-to-br from-carbon/[0.025] via-shade/60 to-carbon/[0.01]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-px bg-carbon/15" />
                        </div>
                      </>
                    )}

                    {/* Sketch / AI pill toggle — top center (only when a sketch exists, functional) */}
                    {sku.sketch_url && (
                      <div
                        className="absolute top-2 left-1/2 -translate-x-1/2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SkuCardPill
                          hasRender={!!renderImage}
                          showRender={!!showRender}
                          isGenerating={renderingSkus.has(sku.id)}
                          onToggle={(view) => {
                            if (view === 'ai' && !renderImage) {
                              // Generate render
                              setRenderingSkus(prev => new Set(prev).add(sku.id));
                              const cws = colorways.filter(c => c.sku_id === sku.id);
                              const primaryCw = cws[0];
                              // Use same gpt-image-1.5 pipeline as SketchPhase 3D render
                              fetch('/api/ai/colorize-sketch', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sketch_url: sku.render_url || sku.sketch_url,
                                  colorway_name: primaryCw?.name || 'main',
                                  zone_colors: primaryCw?.zones || [],
                                  category: sku.category,
                                  product_name: sku.name,
                                  family: sku.family,
                                  collectionPlanId,
                                  is_3d_render: true,
                                  skuId: sku.id,
                                }),
                              }).then(async (res) => {
                                if (res.ok) {
                                  const { imageUrl } = await res.json();
                                  if (imageUrl) {
                                    const updatedUrls = { ...(sku.render_urls || {}), '3d': imageUrl };
                                    await updateSku(sku.id, { render_urls: updatedUrls });
                                    setAiViewSkus(prev => new Set(prev).add(sku.id));
                                    refetch();
                                  }
                                } else {
                                  const err = await res.json().catch(() => ({}));
                                  console.error('[AI Render] Failed:', err);
                                  alert(`${t.plannerSections?.renderFailedPrefix || 'Render failed'}: ${err.error || (t.plannerSections?.unknownError || 'Unknown error')}`);
                                }
                              }).catch((err) => {
                                console.error('[AI Render] Network error:', err);
                                alert(t.plannerSections?.renderFailedNetwork || 'Render failed: network error');
                              }).finally(() => {
                                setRenderingSkus(prev => { const n = new Set(prev); n.delete(sku.id); return n; });
                              });
                            } else if (view === 'ai') {
                              setAiViewSkus(prev => new Set(prev).add(sku.id));
                            } else {
                              setAiViewSkus(prev => { const n = new Set(prev); n.delete(sku.id); return n; });
                            }
                          }}
                        />
                      </div>
                    )}

                  </div>

                  {/* Front footer — 4 essentials, deterministic height so the grid stays symmetric */}
                  <div className="px-5 pt-4 pb-4">
                    {/* Phase — tiny, at top as a state indicator */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.12em] uppercase"
                        style={{ color: phaseStrokeColor }}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: phaseStrokeColor }} />
                        {phaseLabel}
                      </span>
                      <span className="text-[13px] font-semibold text-carbon tabular-nums leading-none">
                        €{sku.pvp}
                      </span>
                    </div>
                    {/* Name — quiet, reserves fixed 2-line height so cards stay symmetric */}
                    <p className="text-[12.5px] font-normal text-carbon/80 tracking-[-0.005em] leading-[1.35] line-clamp-2 min-h-[2.7em]">
                      {sku.name}
                    </p>
                    {/* Next step — full-width pill button. Action is self-evident, no label needed. */}
                    <div className="mt-3">
                      <div className="w-full rounded-full bg-carbon/[0.04] group-hover:bg-carbon/[0.08] transition-colors py-2 px-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-[-0.005em] text-carbon whitespace-nowrap">
                        {ctaText}
                        <ArrowRight className="h-3 w-3 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                {/* ── BACK — financial detail with mini thumbnail ── */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="bg-white rounded-[20px] border border-carbon/[0.05] h-full flex flex-col overflow-hidden cursor-pointer">
                    <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: typeColor }} />
                    <div className="flex-1 p-5 flex flex-col gap-4">
                      {/* Header — mini thumbnail + name + dots */}
                      <div className="flex gap-3">
                        <div className="w-[72px] h-[90px] rounded-[12px] overflow-hidden bg-gradient-to-br from-carbon/[0.04] to-carbon/[0.01] shrink-0 flex items-center justify-center border border-carbon/[0.05]">
                          {displayImage ? (
                            <img src={displayImage as string} alt="" className={`w-full h-full ${displayFit}`} />
                          ) : (
                            <span className="text-[10px] font-medium text-carbon/40 text-center px-1 leading-tight line-clamp-3">{sku.name}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-[13px] font-semibold text-carbon tracking-[-0.01em] leading-tight line-clamp-2 mb-1.5">{sku.name}</p>
                          <div className="flex items-center gap-2.5 text-[9px] font-semibold tracking-[0.08em] uppercase flex-wrap">
                            <span className="inline-flex items-center gap-1" style={{ color: phaseStrokeColor }}>
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: phaseStrokeColor }} />{phaseLabel}
                            </span>
                            <span className="inline-flex items-center gap-1" style={{ color: typeColor }}>
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: typeColor }} />{typeLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial 2×2 */}
                      <div className="grid grid-cols-2 gap-x-5 gap-y-3 tabular-nums pt-3 border-t border-carbon/[0.06]">
                        <div>
                          <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">PVP</p>
                          <p className="text-[15px] font-semibold text-carbon">€{sku.pvp}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">COGS</p>
                          <p className="text-[15px] font-semibold text-carbon">€{sku.cost}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">{(t.fieldLabels as Record<string, string>)?.units || "Units"}</p>
                          <p className="text-[15px] font-semibold text-carbon">{sku.buy_units}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold mb-0.5">{(t.fieldLabels as Record<string, string>)?.margin || "Margin"}</p>
                          <p className="text-[15px] font-semibold text-carbon">{Math.round(sku.margin)}%</p>
                        </div>
                      </div>

                      {/* Expected sales + Next step, bottom-aligned */}
                      <div className="mt-auto pt-3 border-t border-carbon/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-carbon/40 uppercase tracking-[0.08em] font-semibold">{t.plannerSections?.expectedSales || 'Expected sales'}</span>
                          <span className="text-[16px] font-semibold text-carbon tabular-nums tracking-[-0.02em]">€{Math.round(sku.expected_sales).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-carbon/35 shrink-0">Next</span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-carbon/75 truncate">
                            {ctaText}
                            <ArrowRight className="h-3 w-3 shrink-0" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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
            onClose={() => setSelectedSku(null)}
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
                            {colSkus.every(s => selectedImports.has(s.id)) ? (t.plannerSections?.deselectAll || 'Deselect all') : (t.plannerSections?.selectAll || 'Select all')}
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
                                <img src={sku.reference_image_url} alt="" className="w-10 h-10 object-contain rounded bg-carbon/[0.02]" />
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

      {/* Drift modal — bottom-up feedback loop. Surfaces when actual SKU
          numbers diverge from the CIS plan baseline. */}
      {driftModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="absolute inset-0 bg-carbon/40 backdrop-blur-sm" onClick={dismissDriftModal} />
          <div className="relative bg-white rounded-[20px] max-w-[520px] w-full p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <p className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
              {(t.plannerSections as Record<string, string>)?.driftLabel || 'Tu plan ha derivado'}
            </p>
            <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.02em] leading-[1.2] mb-5">
              {(t.plannerSections as Record<string, string>)?.driftTitle || 'Tus ediciones han movido el resumen'}
            </h3>
            <div className="space-y-3 mb-6">
              {driftImpacts.map((imp) => {
                const sevColor = imp.severity === 'high' ? 'text-red-700' : imp.severity === 'medium' ? 'text-amber-700' : 'text-emerald-700';
                const sign = imp.deltaPct >= 0 ? '+' : '';
                const deltaLabel = imp.label === 'Margen DTC'
                  ? `${sign}${imp.deltaPct.toFixed(1)}pp`
                  : `${sign}${imp.deltaPct.toFixed(1)}%`;
                return (
                  <div key={imp.key} className="flex items-baseline justify-between gap-3 py-2 border-b border-carbon/[0.05] last:border-0">
                    <span className="text-[13px] text-carbon/65">{imp.label}</span>
                    <div className="flex items-baseline gap-2 tabular-nums">
                      <span className="text-[13px] text-carbon/35">{imp.before}</span>
                      <span className="text-carbon/20">→</span>
                      <span className="text-[14px] font-semibold text-carbon">{imp.after}</span>
                      <span className={`text-[11px] font-semibold ${sevColor}`}>{deltaLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[12px] text-carbon/55 leading-relaxed mb-5">
              {(t.plannerSections as Record<string, string>)?.driftHelp || 'Si los nuevos números reflejan mejor el plan, actualízalo. Si fueron ajustes puntuales, ciérralo y el resumen seguirá comparando contra el target original.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={dismissDriftModal}
                disabled={driftSyncing}
                className="px-4 py-2 rounded-full text-[13px] font-medium text-carbon/60 hover:bg-carbon/[0.03] transition-colors"
              >
                {(t.plannerSections as Record<string, string>)?.driftDismiss || 'Cerrar'}
              </button>
              <button
                type="button"
                onClick={applyDriftSync}
                disabled={driftSyncing}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {driftSyncing && <Loader2 className="h-3 w-3 animate-spin" />}
                {(t.plannerSections as Record<string, string>)?.driftApply || 'Actualizar plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pipeline View ── */
/* ═══ ORDERS VIEW — Approved SKUs grouped by factory ═══ */
function OrdersView({ skus, collectionPlanId, onSkuClick }: { skus: SKU[]; collectionPlanId: string; onSkuClick: (sku: SKU) => void }) {
  const t = useTranslation();
  const approvedSkus = skus.filter(s => s.production_approved);

  if (approvedSkus.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Package className="h-8 w-8 text-carbon/15 mx-auto" />
        <p className="text-[13px] text-carbon/40">No approved SKUs yet</p>
        <p className="text-[11px] text-carbon/30">Complete the production workflow for SKUs to see them here.</p>
      </div>
    );
  }

  // Group by factory
  const factoryGroups = new Map<string, SKU[]>();
  approvedSkus.forEach(sku => {
    const pd = sku.production_data || {};
    const factory = pd.factory_name || sku.sourcing_data?.factory || 'Unassigned';
    if (!factoryGroups.has(factory)) factoryGroups.set(factory, []);
    factoryGroups.get(factory)!.push(sku);
  });

  const downloadPO = async (factory?: string) => {
    try {
      const params = new URLSearchParams({ planId: collectionPlanId });
      if (factory && factory !== 'Unassigned') params.set('factory', factory);
      const res = await fetch(`/api/purchase-order?${params}`);
      if (!res.ok) { alert(t.plannerSections?.exportFailedShort || 'Export failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO-${factory || 'all'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert(t.plannerSections?.exportFailedShort || 'Export failed'); }
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between p-4 bg-[#2d6a4f]/5 border border-[#2d6a4f]/10 rounded-lg">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] text-[#2d6a4f]/60 uppercase tracking-wide font-medium">Approved</p>
            <p className="text-xl font-medium text-[#2d6a4f]">{approvedSkus.length} SKUs</p>
          </div>
          <div>
            <p className="text-[10px] text-[#2d6a4f]/60 uppercase tracking-wide font-medium">Factories</p>
            <p className="text-xl font-medium text-[#2d6a4f]">{factoryGroups.size}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#2d6a4f]/60 uppercase tracking-wide font-medium">{t.plannerSections?.totalUnitsLabel || 'Total Units'}</p>
            <p className="text-xl font-medium text-[#2d6a4f]">{approvedSkus.reduce((s, sk) => s + ((sk.production_data?.order_quantity as number) || sk.buy_units), 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#2d6a4f]/60 uppercase tracking-wide font-medium">{t.plannerSections?.totalCostLabel || 'Total Cost'}</p>
            <p className="text-xl font-medium text-[#2d6a4f]">€{approvedSkus.reduce((s, sk) => s + (((sk.production_data?.order_quantity as number) || sk.buy_units) * ((sk.production_data?.unit_cost_final as number) || sk.cost)), 0).toLocaleString()}</p>
          </div>
        </div>
        <button onClick={() => downloadPO()} className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2d6a4f] text-white text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-[#245a42] transition-colors rounded-full">
          <Download className="h-3.5 w-3.5" /> Export All POs
        </button>
      </div>

      {/* Factory groups */}
      {Array.from(factoryGroups.entries()).map(([factory, factorySkus]) => {
        const totalUnits = factorySkus.reduce((s, sk) => s + ((sk.production_data?.order_quantity as number) || sk.buy_units), 0);
        const totalCost = factorySkus.reduce((s, sk) => s + (((sk.production_data?.order_quantity as number) || sk.buy_units) * ((sk.production_data?.unit_cost_final as number) || sk.cost)), 0);
        const pd0 = factorySkus[0]?.production_data || {};

        return (
          <div key={factory} className="border border-carbon/[0.06] bg-white">
            {/* Factory header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-carbon/[0.04]">
              <div>
                <p className="text-[14px] font-medium text-carbon">{factory}</p>
                <p className="text-[11px] text-carbon/45 mt-0.5">
                  {pd0.factory_origin || factorySkus[0]?.sourcing_data?.origin || ''}{pd0.factory_contact ? ` · ${pd0.factory_contact}` : ''}
                  {' · '}{factorySkus.length} SKUs · {totalUnits.toLocaleString()} units · €{totalCost.toLocaleString()}
                </p>
              </div>
              <button onClick={() => downloadPO(factory)} className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.12] text-carbon/60 text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-carbon hover:text-crema transition-colors rounded-full">
                <Download className="h-3 w-3" /> Export PO
              </button>
            </div>

            {/* SKU rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-4 text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/50">{(t.fieldLabels as Record<string, string>)?.product || "Product"}</th>
                    <th className="text-left py-2 px-4 text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/50">Family</th>
                    <th className="text-right py-2 px-4 text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/50">Quantity</th>
                    <th className="text-right py-2 px-4 text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/50">{t.plannerSections?.unitCostLabel || 'Unit Cost'}</th>
                    <th className="text-right py-2 px-4 text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/50">Total</th>
                    <th className="text-left py-2 px-4 text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/50">PO #</th>
                  </tr>
                </thead>
                <tbody>
                  {factorySkus.map(sku => {
                    const skuPd = sku.production_data || {};
                    const qty = (skuPd.order_quantity as number) || sku.buy_units;
                    const cost = (skuPd.unit_cost_final as number) || sku.cost;
                    return (
                      <tr key={sku.id} onClick={() => onSkuClick(sku)} className="border-t border-carbon/[0.04] hover:bg-carbon/[0.02] cursor-pointer transition-colors">
                        <td className="py-2.5 px-4 text-carbon font-medium">{sku.name}</td>
                        <td className="py-2.5 px-4 text-carbon/60">{sku.family}</td>
                        <td className="py-2.5 px-4 text-right text-carbon">{qty.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right text-carbon">€{cost}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-carbon">€{(qty * cost).toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-carbon/40 font-mono text-[11px]">{(skuPd.po_number as string) || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineView({ skus, onSkuClick, t }: { skus: SKU[]; onSkuClick: (sku: SKU) => void; t: ReturnType<typeof useTranslation> }) {
  const phases: { id: DesignPhase; label: string; count: number }[] = [
    { id: 'range_plan', label: t.skuPhases?.rangePlan || 'Concept', count: 0 },
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
            <span className="text-[11px] text-carbon/50 tabular-nums">{phase.count}</span>
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
                    <img src={sku.production_sample_url} alt="" className="w-full h-full object-contain" />
                  ) : phase.id === 'prototyping' && sku.proto_iterations?.length > 0 && sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] ? (
                    <img src={sku.proto_iterations[sku.proto_iterations.length - 1].images[0]} alt="" className="w-full h-full object-contain" />
                  ) : phase.id === 'sketch' && sku.sketch_url ? (
                    <img src={sku.sketch_url} alt="" className="w-full h-full object-contain" />
                  ) : sku.reference_image_url ? (
                    <img src={sku.reference_image_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[12px] text-carbon/60 text-center px-2">{sku.name}</p>
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
                    <span className="text-[11px] text-carbon/50">{sku.family}</span>
                    <span className="text-[10px] font-light text-carbon/50">€{sku.pvp}</span>
                  </div>
                </div>
              </button>
            ))}
            {grouped[phase.id].length === 0 && (
              <div className="border border-dashed border-carbon/[0.08] p-4 flex items-center justify-center min-h-[80px]">
                <p className="text-[10px] text-carbon/35">{t.skuPhases?.noSkus || 'No SKUs'}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
