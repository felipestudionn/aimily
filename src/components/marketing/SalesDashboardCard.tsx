'use client';

import { useMemo } from 'react';
import {
  Package,
  DollarSign,
  Calendar,
  BarChart3,
  Layers,
  Target,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useStories } from '@/hooks/useStories';
import { useDrops } from '@/hooks/useDrops';
import { useTranslation } from '@/i18n';

/* ═══════════════════════════════════════════════════════════
   Sales Dashboard — gold-standard hub for commercial KPIs.
   Renders inline inside the sidebar-driven page shell.
   ═══════════════════════════════════════════════════════════ */

interface SalesDashboardCardProps {
  collectionPlanId: string;
}

export function SalesDashboardCard({ collectionPlanId }: SalesDashboardCardProps) {
  const t = useTranslation();
  const m = (t as unknown as { marketingPage?: Record<string, string> }).marketingPage || {};
  const { skus, loading: skusLoading } = useSkus(collectionPlanId);
  const { stories, loading: storiesLoading } = useStories(collectionPlanId);
  const { drops, loading: dropsLoading } = useDrops(collectionPlanId);

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
    return months.map((month) => {
      let monthlySales = 0;
      const monthStart = month.date;
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      drops.forEach((drop) => {
        const dropStart = new Date(drop.launch_date);
        const dropEnd = new Date(dropStart);
        dropEnd.setDate(dropEnd.getDate() + (drop.weeks_active || 8) * 7);

        if (dropStart < monthEnd && dropEnd > monthStart) {
          const dropSkus = skus.filter((s) => s.drop_number === drop.drop_number);
          const dropRevenue = dropSkus.reduce((sum, s) => sum + (s.expected_sales * s.pvp), 0);
          const weeksActive = drop.weeks_active || 8;
          const weeklyRate = dropRevenue / weeksActive;

          const overlapStart = new Date(Math.max(dropStart.getTime(), monthStart.getTime()));
          const overlapEnd = new Date(Math.min(dropEnd.getTime(), monthEnd.getTime()));
          const overlapWeeks = Math.max(
            0,
            (overlapEnd.getTime() - overlapStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
          );

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
    return stories.map((story) => {
      const storySkus = skus.filter((s) => (s as SKU & { story_id?: string }).story_id === story.id);
      const totalRevenue = storySkus.reduce((sum, s) => sum + (s.expected_sales * s.pvp), 0);
      const totalUnits = storySkus.reduce((sum, s) => sum + s.buy_units, 0);
      const avgPvp = storySkus.length ? storySkus.reduce((sum, s) => sum + s.pvp, 0) / storySkus.length : 0;
      const avgMargin = storySkus.length ? storySkus.reduce((sum, s) => sum + s.margin, 0) / storySkus.length : 0;
      const dropNumbers = Array.from(new Set(storySkus.map((s) => s.drop_number)));
      const assignedDrops = drops.filter((d) => dropNumbers.includes(d.drop_number));

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
    return drops
      .map((drop) => {
        const dropSkus = skus.filter((s) => s.drop_number === drop.drop_number);
        const revenue = dropSkus.reduce((sum, s) => sum + (s.expected_sales * s.pvp), 0);
        const units = dropSkus.reduce((sum, s) => sum + s.buy_units, 0);
        return { ...drop, revenue: Math.round(revenue), units, skuCount: dropSkus.length };
      })
      .sort((a, b) => new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime());
  }, [drops, skus]);

  const loading = skusLoading || storiesLoading || dropsLoading;

  const formatCurrency = (n: number) => {
    if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `€${(n / 1000).toFixed(0)}K`;
    return `€${n}`;
  };

  if (loading && !kpis) {
    return (
      <div className="bg-white rounded-[20px] p-10 text-center">
        <p className="text-[13px] text-carbon/40">
          {(t as unknown as { common?: { loading?: string } }).common?.loading || 'Loading…'}
        </p>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="bg-white rounded-[20px] p-12 md:p-16 text-center">
        <div className="w-14 h-14 rounded-full bg-carbon/[0.04] flex items-center justify-center mx-auto mb-5">
          <TrendingUp className="h-6 w-6 text-carbon/25" strokeWidth={1.75} />
        </div>
        <p className="text-[14px] text-carbon/55 max-w-md mx-auto leading-relaxed">
          {m.noSalesData || 'Create SKUs in the Merchandising block to see sales data here.'}
        </p>
      </div>
    );
  }

  const kpiTiles = [
    { icon: DollarSign, label: m.kpiRevenue || 'Revenue', value: formatCurrency(kpis.totalRevenue) },
    { icon: Package, label: m.kpiUnits || 'Units', value: kpis.totalUnits.toLocaleString() },
    { icon: DollarSign, label: m.kpiAvgPrice || 'Avg PVP', value: `€${kpis.avgPvp}` },
    { icon: Percent, label: m.kpiMargin || 'Margin', value: `${kpis.avgMargin}%` },
    { icon: Layers, label: 'SKUs', value: String(kpis.skuCount) },
    { icon: BarChart3, label: m.kpiStories || 'Stories', value: String(kpis.storyCount) },
    { icon: Calendar, label: m.kpiDrops || 'Drops', value: String(kpis.dropCount) },
    { icon: Target, label: m.kpiSellThrough || 'Sell-through', value: `${kpis.avgSellThrough}%` },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ KPI tiles ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpiTiles.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-[16px] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Icon className="h-3.5 w-3.5 text-carbon/30" strokeWidth={1.75} />
              <span className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/35">
                {label}
              </span>
            </div>
            <p className="text-[20px] font-semibold text-carbon tracking-[-0.02em] leading-none">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ═══ Revenue curve ═══ */}
      {revenueCurve.length > 0 && (
        <div className="bg-white rounded-[20px] p-6 md:p-8">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45 mb-5">
            {m.revenueCurve || 'Revenue Curve'}
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#999' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                />
                <Tooltip
                  formatter={(value: number) => [`€${value.toLocaleString()}`, '']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e5e5', borderRadius: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2C2C2C" fill="#2C2C2C" fillOpacity={0.08} strokeWidth={2} name="Monthly" />
                <Area type="monotone" dataKey="cumulative" stroke="#D8BAA0" fill="#D8BAA0" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" name="Cumulative" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ Stories — commercial overview ═══ */}
      {storiesWithCommercial.length > 0 && (
        <div className="bg-white rounded-[20px] p-6 md:p-8">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45 mb-5">
            {m.storiesCommercial || 'Stories — Commercial overview'}
          </p>
          <div className="space-y-2.5">
            {storiesWithCommercial.map((story) => (
              <div
                key={story.id}
                className="rounded-[14px] bg-carbon/[0.02] hover:bg-carbon/[0.04] transition-colors p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] mb-1.5 truncate">
                    {story.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-carbon/45">
                    <span>{story.skuCount} SKUs</span>
                    <span>·</span>
                    <span>{formatCurrency(story.totalRevenue)}</span>
                    <span>·</span>
                    <span>{story.totalUnits} units</span>
                    <span>·</span>
                    <span>€{story.avgPvp} {m.kpiAvgPrice?.toLowerCase() || 'avg'}</span>
                    <span>·</span>
                    <span>{story.avgMargin}% margin</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {story.assignedDrops.length > 0 ? (
                    story.assignedDrops.map((drop) => (
                      <span
                        key={drop.id}
                        className="px-3 py-1 rounded-full bg-carbon/[0.06] text-[10px] font-semibold text-carbon/65 tracking-[-0.01em]"
                      >
                        {drop.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] italic text-carbon/30">
                      {m.noDrop || 'No drop assigned'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Drop calendar ═══ */}
      {dropsWithRevenue.length > 0 && (
        <div className="bg-white rounded-[20px] p-6 md:p-8">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45 mb-5">
            {m.dropCalendar || 'Drop calendar'}
          </p>
          <div className="space-y-2.5">
            {dropsWithRevenue.map((drop) => (
              <div
                key={drop.id}
                className="rounded-[14px] bg-carbon/[0.02] hover:bg-carbon/[0.04] transition-colors p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-carbon flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] truncate">
                      {drop.name}
                    </h4>
                    <p className="text-[11px] text-carbon/45 mt-0.5 truncate">
                      {new Date(drop.launch_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {drop.weeks_active}w active
                      {drop.channels?.length ? ` · ${drop.channels.join(' + ')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-semibold text-carbon tracking-[-0.01em]">
                    {formatCurrency(drop.revenue)}
                  </p>
                  <p className="text-[11px] text-carbon/45 mt-0.5">
                    {drop.units} units · {drop.skuCount} SKUs
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
