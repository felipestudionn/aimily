'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  ChevronLeft,
  Package,
  DollarSign,
  Calendar,
  BarChart3,
  Layers,
  Target,
  Percent,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useStories, type Story } from '@/hooks/useStories';
import { useDrops, type Drop } from '@/hooks/useDrops';
import { useTranslation } from '@/i18n';

/* ── Props ── */

interface SalesDashboardCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function SalesDashboardCard({ collectionPlanId }: SalesDashboardCardProps) {
  const t = useTranslation();
  const { skus, loading: skusLoading } = useSkus(collectionPlanId);
  const { stories, loading: storiesLoading } = useStories(collectionPlanId);
  const { drops, loading: dropsLoading } = useDrops(collectionPlanId);
  const [expanded, setExpanded] = useState(false);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    if (!skus.length) return null;
    const totalRevenue = skus.reduce((sum, s) => sum + (s.expected_sales * s.pvp), 0);
    const totalUnits = skus.reduce((sum, s) => sum + s.buy_units, 0);
    const avgPvp = skus.reduce((sum, s) => sum + s.pvp, 0) / skus.length;
    const avgMargin = skus.reduce((sum, s) => sum + s.margin, 0) / skus.length;
    const avgSellThrough = skus.reduce((sum, s) => sum + s.sale_percentage, 0) / skus.length;
    return {
      totalRevenue: Math.round(totalRevenue),
      totalUnits,
      avgPvp: Math.round(avgPvp),
      avgMargin: Math.round(avgMargin),
      skuCount: skus.length,
      storyCount: stories.length,
      dropCount: drops.length,
      avgSellThrough: Math.round(avgSellThrough),
    };
  }, [skus, stories.length, drops.length]);

  /* ── Revenue curve by month ── */
  const revenueCurve = useMemo(() => {
    if (!drops.length || !skus.length) return [];

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sortedDrops = [...drops].sort((a, b) => new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime());
    const startDate = new Date(sortedDrops[0].launch_date);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 8);

    const months: { date: Date; label: string }[] = [];
    const current = new Date(startDate);
    while (current < endDate) {
      months.push({ date: new Date(current), label: MONTH_NAMES[current.getMonth()] });
      current.setMonth(current.getMonth() + 1);
    }

    let cumulative = 0;
    return months.map(month => {
      let monthlySales = 0;
      const monthStart = month.date;
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      drops.forEach(drop => {
        const dropStart = new Date(drop.launch_date);
        const dropEnd = new Date(dropStart);
        dropEnd.setDate(dropEnd.getDate() + (drop.weeks_active || 8) * 7);

        if (dropStart < monthEnd && dropEnd > monthStart) {
          const dropSkus = skus.filter(s => s.drop_number === drop.drop_number);
          const dropRevenue = dropSkus.reduce((sum, s) => sum + (s.expected_sales * s.pvp), 0);
          const weeksActive = drop.weeks_active || 8;
          const weeklyRate = dropRevenue / weeksActive;

          const overlapStart = new Date(Math.max(dropStart.getTime(), monthStart.getTime()));
          const overlapEnd = new Date(Math.min(dropEnd.getTime(), monthEnd.getTime()));
          const overlapWeeks = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (7 * 24 * 60 * 60 * 1000));

          monthlySales += weeklyRate * overlapWeeks;
        }
      });

      cumulative += monthlySales;
      return {
        month: month.label,
        revenue: Math.round(monthlySales),
        cumulative: Math.round(cumulative),
      };
    });
  }, [drops, skus]);

  /* ── Stories with commercial data ── */
  const storiesWithCommercial = useMemo(() => {
    return stories.map(story => {
      const storySkus = skus.filter(s => (s as SKU & { story_id?: string }).story_id === story.id);
      const totalRevenue = storySkus.reduce((sum, s) => sum + (s.expected_sales * s.pvp), 0);
      const totalUnits = storySkus.reduce((sum, s) => sum + s.buy_units, 0);
      const avgPvp = storySkus.length ? storySkus.reduce((sum, s) => sum + s.pvp, 0) / storySkus.length : 0;
      const avgMargin = storySkus.length ? storySkus.reduce((sum, s) => sum + s.margin, 0) / storySkus.length : 0;
      const dropNumbers = Array.from(new Set(storySkus.map(s => s.drop_number)));
      const assignedDrops = drops.filter(d => dropNumbers.includes(d.drop_number));

      return {
        ...story,
        skuCount: storySkus.length,
        totalRevenue: Math.round(totalRevenue),
        totalUnits,
        avgPvp: Math.round(avgPvp),
        avgMargin: Math.round(avgMargin),
        assignedDrops,
      };
    });
  }, [stories, skus, drops]);

  /* ── Drops with revenue ── */
  const dropsWithRevenue = useMemo(() => {
    return drops.map(drop => {
      const dropSkus = skus.filter(s => s.drop_number === drop.drop_number);
      const revenue = dropSkus.reduce((sum, s) => sum + (s.expected_sales * s.pvp), 0);
      const units = dropSkus.reduce((sum, s) => sum + s.buy_units, 0);
      return { ...drop, revenue: Math.round(revenue), units, skuCount: dropSkus.length };
    }).sort((a, b) => new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime());
  }, [drops, skus]);

  const loading = skusLoading || storiesLoading || dropsLoading;

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `€${(n / 1000).toFixed(0)}K`;
    return `€${n}`;
  };

  /* ── Collapsed card ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.salesLabel || 'SALES'}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.salesTitle || 'Sales Dashboard'}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.salesDesc || 'Revenue forecasting, drop planning, and commercial KPIs for your collection.'}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {loading ? (
            <p className="text-xs text-carbon/30">{t.common?.loading || 'Loading...'}</p>
          ) : kpis ? (
            <div className="flex items-center gap-6">
              <div>
                <span className="text-2xl font-light text-carbon">{formatCurrency(kpis.totalRevenue)}</span>
                <span className="text-xs text-carbon/40 ml-2">{t.marketingPage.revenueTarget || 'revenue target'}</span>
              </div>
              <div className="text-xs text-carbon/30">
                {kpis.dropCount} drops · {kpis.skuCount} SKUs
              </div>
            </div>
          ) : (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noSalesData || 'No sales data yet'}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open || 'OPEN'}
        </div>
      </button>
    );
  }

  /* ── Expanded view ── */
  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-crema/95 backdrop-blur border-b border-carbon/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2 text-sm font-light text-carbon/60 hover:text-carbon transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.marketingPage.backToCreation || 'Back'}
          </button>
          <div className="text-center">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
              {t.marketingPage.salesLabel || 'SALES'}
            </p>
            <h2 className="text-lg font-light text-carbon tracking-tight">
              {t.marketingPage.salesTitle || 'Sales Dashboard'}
            </h2>
          </div>
          <div className="w-32" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ═══ KPI BAR ═══ */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { icon: DollarSign, label: t.marketingPage.kpiRevenue || 'Revenue', value: formatCurrency(kpis.totalRevenue) },
              { icon: Package, label: t.marketingPage.kpiUnits || 'Units', value: kpis.totalUnits.toLocaleString() },
              { icon: DollarSign, label: t.marketingPage.kpiAvgPrice || 'Avg PVP', value: `€${kpis.avgPvp}` },
              { icon: Percent, label: t.marketingPage.kpiMargin || 'Margin', value: `${kpis.avgMargin}%` },
              { icon: Layers, label: 'SKUs', value: String(kpis.skuCount) },
              { icon: BarChart3, label: t.marketingPage.kpiStories || 'Stories', value: String(kpis.storyCount) },
              { icon: Calendar, label: 'Drops', value: String(kpis.dropCount) },
              { icon: Target, label: t.marketingPage.kpiSellThrough || 'Sell-through', value: `${kpis.avgSellThrough}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white border border-carbon/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5 text-carbon/25" />
                  <span className="text-[9px] font-medium tracking-[0.12em] uppercase text-carbon/30">{label}</span>
                </div>
                <p className="text-lg font-light text-carbon">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ═══ REVENUE CURVE ═══ */}
        {revenueCurve.length > 0 && (
          <div className="bg-white border border-carbon/[0.06] p-6">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">
              {t.marketingPage.revenueCurve || 'Revenue Curve'}
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#999' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip
                    formatter={(value: number) => [`€${value.toLocaleString()}`, '']}
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e5e5', borderRadius: 0 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2C2C2C" fill="#2C2C2C" fillOpacity={0.08} strokeWidth={2} name="Monthly" />
                  <Area type="monotone" dataKey="cumulative" stroke="#D4A574" fill="#D4A574" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="4 4" name="Cumulative" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ═══ STORIES WITH COMMERCIAL DATA ═══ */}
        {storiesWithCommercial.length > 0 && (
          <div className="bg-white border border-carbon/[0.06] p-6">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">
              {t.marketingPage.storiesCommercial || 'Stories — Commercial Overview'}
            </p>
            <div className="space-y-3">
              {storiesWithCommercial.map(story => (
                <div key={story.id} className="border border-carbon/[0.06] p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-light text-carbon tracking-tight">{story.name}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] text-carbon/30">{story.skuCount} SKUs</span>
                      <span className="text-[10px] text-carbon/30">{formatCurrency(story.totalRevenue)}</span>
                      <span className="text-[10px] text-carbon/30">{story.totalUnits} units</span>
                      <span className="text-[10px] text-carbon/30">€{story.avgPvp} avg</span>
                      <span className="text-[10px] text-carbon/30">{story.avgMargin}% margin</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {story.assignedDrops.length > 0 ? (
                      story.assignedDrops.map(drop => (
                        <span key={drop.id} className="text-[9px] font-medium tracking-[0.1em] uppercase bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">
                          {drop.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] italic text-carbon/20">{t.marketingPage.noDrop || 'No drop assigned'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ DROPS TIMELINE ═══ */}
        {dropsWithRevenue.length > 0 && (
          <div className="bg-white border border-carbon/[0.06] p-6">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-4">
              {t.marketingPage.dropCalendar || 'Drop Calendar'}
            </p>
            <div className="space-y-3">
              {dropsWithRevenue.map(drop => (
                <div key={drop.id} className="border border-carbon/[0.06] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-carbon rounded-full flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-light text-carbon">{drop.name}</h4>
                      <p className="text-[10px] text-carbon/30">
                        {new Date(drop.launch_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{drop.weeks_active}w active
                        {' · '}{drop.channels?.join(' + ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-light text-carbon">{formatCurrency(drop.revenue)}</p>
                    <p className="text-[10px] text-carbon/30">{drop.units} units · {drop.skuCount} SKUs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !kpis && (
          <div className="text-center py-20 text-carbon/25 text-sm font-light">
            {t.marketingPage.noSalesData || 'Create SKUs in the Merchandising block to see sales data here.'}
          </div>
        )}
      </div>
    </div>
  );
}
