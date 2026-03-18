import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PlannerDashboard } from '@/components/planner/PlannerDashboard';
import type { CollectionPlan, SetupData, ProductFamily, PriceSegment, ProductTypeSegment } from '@/types/planner';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Bridge Merchandising workspace data → Collection Builder SetupData.
 * Runs server-side on page load. If setup_data is empty but merchandising
 * workspace has data, we compute SetupData and persist it back.
 */
async function bridgeMerchToSetup(planId: string, plan: CollectionPlan): Promise<CollectionPlan> {
  // If setup_data already has real data, skip bridging
  if (plan.setup_data?.totalSalesTarget > 0) return plan;

  // Fetch merchandising workspace data
  const { data: wsRow } = await supabaseAdmin
    .from('collection_workspace_data')
    .select('data')
    .eq('collection_plan_id', planId)
    .eq('workspace', 'merchandising')
    .single();

  if (!wsRow?.data) return plan;

  const ws = wsRow.data as { cardData?: Record<string, { confirmed?: boolean; data?: Record<string, unknown> }> };
  const cd = ws.cardData || {};

  // ── Families ──
  type MerchFamily = { name: string; subcategories: string[]; priority?: string };
  const families = (cd.families?.data?.families as MerchFamily[]) || [];
  const totalSubcats = families.reduce((sum, f) => sum + f.subcategories.length, 0);
  const familyNames = families.map(f => f.name);

  // Calculate family percentages proportional to subcategory count
  const productFamilies: ProductFamily[] = families.map(f => ({
    name: f.name,
    percentage: totalSubcats > 0 ? Math.round((f.subcategories.length / totalSubcats) * 100) : 0,
  }));

  // ── Pricing ──
  type PricingSub = { name: string; minPrice: number; maxPrice: number; rationale?: string };
  type PricingRow = { family: string; subcategories: PricingSub[] };
  const pricing = (cd.pricing?.data?.pricing as PricingRow[]) || [];

  let allMinPrices: number[] = [];
  let allMaxPrices: number[] = [];
  pricing.forEach(fam => {
    fam.subcategories.forEach(sub => {
      if (sub.minPrice > 0) allMinPrices.push(sub.minPrice);
      if (sub.maxPrice > 0) allMaxPrices.push(sub.maxPrice);
    });
  });

  const minPrice = allMinPrices.length ? Math.min(...allMinPrices) : 0;
  const maxPrice = allMaxPrices.length ? Math.max(...allMaxPrices) : 0;
  const avgPrice = allMinPrices.length
    ? Math.round(allMinPrices.concat(allMaxPrices).reduce((a, b) => a + b, 0) / (allMinPrices.length + allMaxPrices.length))
    : 0;

  // Price segments from pricing families
  const priceSegments: PriceSegment[] = pricing.map(fam => {
    const mins = fam.subcategories.map(s => s.minPrice).filter(p => p > 0);
    const maxs = fam.subcategories.map(s => s.maxPrice).filter(p => p > 0);
    return {
      name: fam.family,
      minPrice: mins.length ? Math.min(...mins) : 0,
      maxPrice: maxs.length ? Math.max(...maxs) : 0,
      percentage: totalSubcats > 0 ? Math.round((fam.subcategories.length / totalSubcats) * 100) : 0,
    };
  });

  // ── Budget ──
  const budget = cd.budget?.data || {};
  const salesTarget = (budget.salesTarget as number) || 0;
  const targetMargin = (budget.targetMargin as number) || 0;
  const avgDiscount = (budget.avgDiscount as number) || 0;

  // Type segmentation (Revenue/Image/Entry)
  type Seg = { name: string; percentage: number };
  const typeSeg = (budget.typeSegmentation as Seg[]) || [];
  const productTypeSegments: ProductTypeSegment[] = typeSeg.map(s => ({
    type: s.name.toUpperCase() as 'REVENUE' | 'IMAGEN' | 'ENTRY',
    percentage: s.percentage,
  }));
  // Map "Image" → "IMAGEN" for the pyramid
  productTypeSegments.forEach(s => {
    if (s.type === ('IMAGE' as string)) s.type = 'IMAGEN';
  });

  // ── Season-based monthly distribution ──
  const season = (plan.season || '').toUpperCase();
  const isSS = season.startsWith('SS') || season.includes('SPRING') || season.includes('SUMMER');
  const monthlyDistribution = isSS
    ? [4, 8, 12, 14, 14, 12, 10, 8, 6, 5, 4, 3]   // SS peaks Mar-Jun
    : [3, 4, 5, 6, 8, 10, 12, 14, 14, 12, 8, 4];   // FW peaks Aug-Oct

  // ── Estimate SKUs ──
  const expectedSkus = totalSubcats * 4; // ~4 SKUs per subcategory average

  // ── Build SetupData ──
  const setupData: SetupData = {
    totalSalesTarget: salesTarget,
    monthlyDistribution,
    expectedSkus,
    families: familyNames,
    dropsCount: 1,
    avgPriceTarget: avgPrice,
    targetMargin,
    plannedDiscounts: avgDiscount,
    productCategory: familyNames.length > 0 ? familyNames[0] : '',
    productFamilies,
    priceSegments,
    productTypeSegments,
    minPrice,
    maxPrice,
  };

  // Persist setup_data back to collection_plans
  await supabaseAdmin
    .from('collection_plans')
    .update({ setup_data: setupData })
    .eq('id', planId);

  return { ...plan, setup_data: setupData };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  const { data: plan, error } = await supabaseAdmin
    .from('collection_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !plan) notFound();

  // Bridge merchandising data → setup_data if needed
  const enrichedPlan = await bridgeMerchToSetup(id, plan as CollectionPlan);

  return <PlannerDashboard plan={enrichedPlan} />;
}
