'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarDays, Plus, Trash2, GripVertical, Sparkles, Loader2, Filter, AlertTriangle, CheckCircle, TrendingUp, Save, User, LogOut } from 'lucide-react';
import { useDrops, type Drop } from '@/hooks/useDrops';
import { useCommercialActions, type CommercialAction } from '@/hooks/useCommercialActions';
import { useSkus, type SKU } from '@/hooks/useSkus';
import type { SetupData } from '@/types/planner';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslation } from '@/i18n';

// Month names for timeline
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface GoToMarketDashboardProps {
  plan: { id: string; name: string; setup_data: SetupData };
  initialSkus: SKU[];
}

const ACTION_COLORS: Record<string, string> = {
  SALE: 'bg-red-500', COLLAB: 'bg-purple-500', CAMPAIGN: 'bg-blue-500',
  SEEDING: 'bg-green-500', EVENT: 'bg-orange-500', OTHER: 'bg-gray-500',
};

const CATEGORY_COLORS: Record<string, string> = {
  VISIBILIDAD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  POSICIONAMIENTO: 'bg-blue-100 text-blue-800 border-blue-300',
  VENTAS: 'bg-green-100 text-green-800 border-green-300',
  NOTORIEDAD: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function GoToMarketDashboard({ plan, initialSkus }: GoToMarketDashboardProps) {
  const t = useTranslation();
  const setupData = plan.setup_data;
  const { drops, addDrop, updateDrop, deleteDrop, loading: dropsLoading } = useDrops(plan.id);
  const { actions, addAction, deleteAction } = useCommercialActions(plan.id);
  const { skus, updateSku, refetch: refetchSkus } = useSkus(plan.id);
  
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [showAddDrop, setShowAddDrop] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newDrop, setNewDrop] = useState({ name: '', launch_date: '', weeks_active: 8 });
  const [newAction, setNewAction] = useState({ name: '', action_type: 'CAMPAIGN' as CommercialAction['action_type'], start_date: '', category: '' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { user, signOut } = useAuth();

  // Initialize drops from SKU drop_numbers if no drops exist
  useEffect(() => {
    if (!dropsLoading && drops.length === 0 && skus.length > 0) {
      const dropNumbers = Array.from(new Set(skus.map(s => s.drop_number))).sort();
      const today = new Date();
      dropNumbers.forEach(async (num, index) => {
        const launchDate = new Date(today);
        launchDate.setDate(launchDate.getDate() + (index * 30));
        await addDrop({
          collection_plan_id: plan.id, drop_number: num, name: `Drop ${num}`,
          launch_date: launchDate.toISOString().split('T')[0], weeks_active: 8,
          channels: ['DTC', 'WHOLESALE'], position: index,
        });
      });
    }
  }, [dropsLoading, drops.length, skus]);

  const filteredSkus = useMemo(() => {
    if (channelFilter === 'ALL') return skus;
    return skus.filter(sku => sku.channel === channelFilter || sku.channel === 'BOTH');
  }, [skus, channelFilter]);

  const skusByDrop = useMemo(() => {
    const grouped: Record<number, SKU[]> = {};
    filteredSkus.forEach(sku => {
      const dropNum = sku.drop_number || 1;
      if (!grouped[dropNum]) grouped[dropNum] = [];
      grouped[dropNum].push(sku);
    });
    return grouped;
  }, [filteredSkus]);

  const handleAddDrop = async () => {
    if (!newDrop.name || !newDrop.launch_date) return;
    const nextDropNumber = drops.length > 0 ? Math.max(...drops.map(d => d.drop_number)) + 1 : 1;
    await addDrop({
      collection_plan_id: plan.id, drop_number: nextDropNumber, name: newDrop.name,
      launch_date: newDrop.launch_date, weeks_active: newDrop.weeks_active,
      channels: ['DTC', 'WHOLESALE'], position: drops.length,
    });
    setNewDrop({ name: '', launch_date: '', weeks_active: 8 });
    setShowAddDrop(false);
  };

  const handleAddAction = async () => {
    if (!newAction.name || !newAction.start_date) return;
    await addAction({
      collection_plan_id: plan.id, name: newAction.name, action_type: newAction.action_type,
      start_date: newAction.start_date, category: newAction.category,
      channels: ['DTC', 'WHOLESALE'], position: actions.length,
    });
    setNewAction({ name: '', action_type: 'CAMPAIGN', start_date: '', category: '' });
    setShowAddAction(false);
  };

  const handleMoveSku = async (skuId: string, newDropNumber: number) => {
    await updateSku(skuId, { drop_number: newDropNumber });
    refetchSkus();
  };

  const handleGeneratePrediction = async () => {
    setIsGeneratingPrediction(true);
    try {
      // Calculate total sales target from SKUs (source of truth)
      const calculatedSalesTarget = skus.reduce((sum, sku) => sum + (sku.expected_sales || 0), 0);
      
      const response = await fetch('/api/ai/market-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId: plan.id, drops, commercialActions: actions, skus,
          totalSalesTarget: calculatedSalesTarget, season: (setupData as any).season || 'AW',
          productCategory: setupData.productCategory, location: (setupData as any).location || 'Europe',
        }),
      });
      if (!response.ok) throw new Error('Failed to generate prediction');
      const data = await response.json();
      setPrediction(data);
    } catch (error) {
      console.error('Error generating prediction:', error);
      alert(t.marketingPage.errorPrediction);
    } finally {
      setIsGeneratingPrediction(false);
    }
  };

  const totalPlannedSales = skus.reduce((sum, sku) => sum + sku.expected_sales, 0);

  // Handle save plan
  const handleSavePlan = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await fetch(`/api/collection-plans/${plan.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (!response.ok) throw new Error('Failed to save plan');
      
      setSaveMessage({ type: 'success', text: t.marketingPage.planSaved });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: t.marketingPage.planSaveFailed });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate timeline range (6 months from first drop)
  const timelineData = useMemo(() => {
    if (drops.length === 0) return { months: [], startDate: new Date(), endDate: new Date() };
    
    const sortedDrops = [...drops].sort((a, b) => new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime());
    const startDate = new Date(sortedDrops[0].launch_date);
    startDate.setDate(1); // Start of month
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);
    
    const months: { date: Date; label: string; year: number }[] = [];
    const current = new Date(startDate);
    while (current < endDate) {
      months.push({
        date: new Date(current),
        label: MONTH_NAMES[current.getMonth()],
        year: current.getFullYear()
      });
      current.setMonth(current.getMonth() + 1);
    }
    return { months, startDate, endDate };
  }, [drops]);

  // Calculate planned sales curve by month based on drops
  const plannedSalesByMonth = useMemo(() => {
    if (drops.length === 0 || timelineData.months.length === 0) return [];
    
    return timelineData.months.map(month => {
      let monthlySales = 0;
      const monthStart = month.date;
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      drops.forEach(drop => {
        const dropStart = new Date(drop.launch_date);
        const dropEnd = new Date(dropStart);
        dropEnd.setDate(dropEnd.getDate() + (drop.weeks_active || 8) * 7);
        
        // Check if drop is active during this month
        if (dropStart < monthEnd && dropEnd > monthStart) {
          const dropSkus = skus.filter(s => s.drop_number === drop.drop_number);
          const dropTotalSales = dropSkus.reduce((sum, s) => sum + (s.expected_sales || 0), 0);
          const weeksActive = drop.weeks_active || 8;
          const weeklyRate = dropTotalSales / weeksActive;
          
          // Calculate weeks overlap with this month
          const overlapStart = new Date(Math.max(dropStart.getTime(), monthStart.getTime()));
          const overlapEnd = new Date(Math.min(dropEnd.getTime(), monthEnd.getTime()));
          const overlapWeeks = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
          
          monthlySales += weeklyRate * overlapWeeks;
        }
      });
      
      return { month: month.label, year: month.year, sales: Math.round(monthlySales) };
    });
  }, [drops, skus, timelineData]);

  // Get position percentage for a date on the timeline
  const getTimelinePosition = (dateStr: string) => {
    if (!timelineData.startDate || !timelineData.endDate) return 0;
    const date = new Date(dateStr);
    const totalRange = timelineData.endDate.getTime() - timelineData.startDate.getTime();
    const position = date.getTime() - timelineData.startDate.getTime();
    return Math.max(0, Math.min(100, (position / totalRange) * 100));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-4">
            {t.marketingPage.goToMarket}
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            {plan.name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`/collection-calendar/${plan.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-3 bg-white border border-carbon/[0.06] text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/60 hover:text-carbon transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            {t.marketingPage.calendarLink}
          </a>
          <div className="text-right">
            <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.totalSalesTarget}</p>
            <p className="text-lg sm:text-xl md:text-2xl font-light text-carbon tracking-tight mt-1">€{totalPlannedSales.toLocaleString()}</p>
          </div>

          {/* Save & User Section */}
          <div className="flex items-center gap-2 pl-4 border-l border-carbon/[0.06]">
            {saveMessage && (
              <span className={`text-sm font-light ${saveMessage.type === 'success' ? 'text-carbon/60' : 'text-carbon'}`}>
                {saveMessage.text}
              </span>
            )}
            <Button
              onClick={handleSavePlan}
              disabled={isSaving}
              className="bg-carbon hover:bg-carbon/90 rounded-none text-[11px] font-medium tracking-[0.08em] uppercase"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.saving}</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />{t.marketingPage.savePlan}</>
              )}
            </Button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 border border-carbon/[0.06]">
                  <User className="h-4 w-4 text-carbon/40" />
                  <span className="text-xs text-carbon/60 max-w-[120px] truncate">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowAuthModal(true)} className="rounded-none">
                <User className="h-4 w-4 mr-2" />
                {t.marketingPage.signIn}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // After login, try to save again
          handleSavePlan();
        }}
      />

      {/* Channel Filter */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Filter className="h-4 w-4 text-carbon/30" />
        <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.channel}:</span>
        {['ALL', 'DTC', 'WHOLESALE'].map(channel => (
          <Button key={channel} variant={channelFilter === channel ? 'default' : 'outline'} size="sm" onClick={() => setChannelFilter(channel)}>
            {channel === 'ALL' ? t.marketingPage.allChannels : channel}
          </Button>
        ))}
      </div>

      {/* Visual Timeline */}
      {drops.length > 0 && (
        <Card className="border-carbon/[0.06] rounded-none shadow-none">
          <CardHeader className="pb-2">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30">{t.marketingPage.launchTimeline}</p>
            <p className="text-sm font-light text-carbon/40">{t.marketingPage.dropsAndActions}</p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Month labels */}
              <div className="flex border-b border-gray-200 mb-4">
                {timelineData.months.map((month, i) => (
                  <div key={i} className="flex-1 text-center pb-2">
                    <span className="text-sm font-medium text-gray-700">{month.label}</span>
                    <span className="text-xs text-gray-400 ml-1">{month.year}</span>
                  </div>
                ))}
              </div>
              
              {/* Timeline track */}
              <div className="relative h-16 sm:h-20 md:h-24 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                {/* Grid lines for months */}
                <div className="absolute inset-0 flex">
                  {timelineData.months.map((_, i) => (
                    <div key={i} className="flex-1 border-r border-gray-200 last:border-r-0" />
                  ))}
                </div>
                
                {/* Drops as circles on timeline */}
                <div className="absolute top-4 left-0 right-0 h-8">
                  {drops.map((drop, i) => {
                    const position = getTimelinePosition(drop.launch_date);
                    const dropSkus = skusByDrop[drop.drop_number] || [];
                    const dropSales = dropSkus.reduce((sum, s) => sum + s.expected_sales, 0);
                    const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
                    return (
                      <div
                        key={drop.id}
                        className="absolute transform -translate-x-1/2 group cursor-pointer"
                        style={{ left: `${position}%` }}
                      >
                        <div className={`w-10 h-10 rounded-full ${colors[i % colors.length]} text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white`}>
                          D{drop.drop_number}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                            <p className="font-semibold">{drop.name}</p>
                            <p>{new Date(drop.launch_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                            <p className="text-green-400">€{Math.round(dropSales).toLocaleString()}</p>
                          </div>
                        </div>
                        {/* Drop duration bar */}
                        <div 
                          className={`absolute top-1/2 left-5 h-2 ${colors[i % colors.length]} opacity-30 rounded-r`}
                          style={{ width: `${(drop.weeks_active || 8) * 2}px` }}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Commercial actions as smaller dots below */}
                <div className="absolute bottom-3 left-0 right-0 h-6">
                  {actions.map((action) => {
                    const position = getTimelinePosition(action.start_date);
                    return (
                      <div
                        key={action.id}
                        className="absolute transform -translate-x-1/2 group cursor-pointer"
                        style={{ left: `${position}%` }}
                      >
                        <div className={`w-4 h-4 rounded-full ${ACTION_COLORS[action.action_type]} border-2 border-white shadow`} />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            <p className="font-medium">{action.name}</p>
                            <p className="text-gray-300">{action.action_type}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">D</div>
                  <span className="text-gray-600">{t.marketingPage.drops}</span>
                </div>
                <div className="flex items-center gap-4">
                  {Object.entries(ACTION_COLORS).slice(0, 4).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="text-gray-500 capitalize">{type.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drops Section */}
      <Card className="border-carbon/[0.06] rounded-none shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.drops}</p><p className="text-sm font-light text-carbon/40">{t.marketingPage.dragProducts}</p></div>
            <Button size="sm" onClick={() => setShowAddDrop(true)}><Plus className="h-4 w-4 mr-1" />{t.marketingPage.addDrop}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddDrop && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div><Label className="text-xs">{t.marketingPage.dropName}</Label><Input value={newDrop.name} onChange={(e) => setNewDrop({ ...newDrop, name: e.target.value })} placeholder="e.g., Season Launch" className="h-9" /></div>
              <div><Label className="text-xs">{t.marketingPage.launchDate}</Label><Input type="date" value={newDrop.launch_date} onChange={(e) => setNewDrop({ ...newDrop, launch_date: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">{t.marketingPage.weeksActive}</Label><Input type="number" value={newDrop.weeks_active} onChange={(e) => setNewDrop({ ...newDrop, weeks_active: Number(e.target.value) })} className="h-9" min={1} max={52} /></div>
              <div className="flex items-end gap-2"><Button size="sm" onClick={handleAddDrop}>{t.common.add}</Button><Button size="sm" variant="outline" onClick={() => setShowAddDrop(false)}>{t.common.cancel}</Button></div>
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {drops.map((drop) => (
              <div key={drop.id} className="flex-shrink-0 w-56 sm:w-64 border rounded-lg bg-white">
                <div className="p-3 border-b bg-crema">
                  <div className="flex items-center justify-between mb-1">
                    <Input value={drop.name} onChange={(e) => updateDrop(drop.id, { name: e.target.value })} className="h-7 text-sm font-semibold bg-transparent border-none p-0 focus-visible:ring-0" />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteDrop(drop.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <Input type="date" value={drop.launch_date} onChange={(e) => updateDrop(drop.id, { launch_date: e.target.value })} className="h-6 text-xs bg-transparent border-none p-0 w-auto focus-visible:ring-0" />
                  </div>
                </div>
                <div className="p-2 min-h-[120px] max-h-[300px] overflow-y-auto">
                  {(skusByDrop[drop.drop_number] || []).map((sku) => (
                    <div key={sku.id} className="flex items-center gap-2 p-2 mb-1 bg-gray-50 rounded text-xs hover:bg-gray-100">
                      <GripVertical className="h-3 w-3 text-gray-400" />
                      {sku.reference_image_url ? <img src={sku.reference_image_url} alt={sku.name} className="w-8 h-8 object-cover rounded" /> : <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-[8px] text-gray-400">IMG</div>}
                      <div className="flex-1 min-w-0"><p className="font-medium truncate">{sku.name}</p><p className="text-muted-foreground">€{sku.pvp}</p></div>
                      <Select value={String(sku.drop_number)} onValueChange={(v) => handleMoveSku(sku.id, Number(v))}>
                        <SelectTrigger className="h-6 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{drops.map((d) => (<SelectItem key={d.id} value={String(d.drop_number)}>D{d.drop_number}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  ))}
                  {(!skusByDrop[drop.drop_number] || skusByDrop[drop.drop_number].length === 0) && <p className="text-xs text-muted-foreground text-center py-4">{t.marketingPage.noProducts}</p>}
                </div>
                <div className="p-2 border-t bg-gray-50 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t.marketingPage.skus}</span><span className="font-medium">{(skusByDrop[drop.drop_number] || []).length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t.marketingPage.sales}</span><span className="font-medium text-green-600">€{Math.round((skusByDrop[drop.drop_number] || []).reduce((s, sku) => s + sku.expected_sales, 0)).toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commercial Actions */}
      <Card className="border-carbon/[0.06] rounded-none shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.commercialActions}</p><p className="text-sm font-light text-carbon/40">{t.marketingPage.commercialActionsDesc}</p></div>
            <Button size="sm" onClick={() => setShowAddAction(true)}><Plus className="h-4 w-4 mr-1" />{t.marketingPage.addAction}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddAction && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              <div><Label className="text-xs">{t.marketingPage.name}</Label><Input value={newAction.name} onChange={(e) => setNewAction({ ...newAction, name: e.target.value })} placeholder="e.g., Black Friday" className="h-9" /></div>
              <div><Label className="text-xs">{t.marketingPage.type}</Label><Select value={newAction.action_type} onValueChange={(v) => setNewAction({ ...newAction, action_type: v as any })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SALE">Sale</SelectItem><SelectItem value="COLLAB">Collab</SelectItem><SelectItem value="CAMPAIGN">Campaign</SelectItem><SelectItem value="SEEDING">Seeding</SelectItem><SelectItem value="EVENT">Event</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">{t.marketingPage.date}</Label><Input type="date" value={newAction.start_date} onChange={(e) => setNewAction({ ...newAction, start_date: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">{t.marketingPage.category}</Label><Select value={newAction.category} onValueChange={(v) => setNewAction({ ...newAction, category: v })}><SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="VISIBILIDAD">Visibilidad</SelectItem><SelectItem value="POSICIONAMIENTO">Posicionamiento</SelectItem><SelectItem value="VENTAS">Ventas</SelectItem><SelectItem value="NOTORIEDAD">Notoriedad</SelectItem></SelectContent></Select></div>
              <div className="flex items-end gap-2"><Button size="sm" onClick={handleAddAction}>{t.common.add}</Button><Button size="sm" variant="outline" onClick={() => setShowAddAction(false)}>{t.common.cancel}</Button></div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <div key={action.id} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${CATEGORY_COLORS[action.category || ''] || 'bg-gray-100 border-gray-300'}`}>
                <div className={`w-2 h-2 rounded-full ${ACTION_COLORS[action.action_type]}`} />
                <div><p className="text-xs font-medium">{action.name}</p><p className="text-[10px] text-muted-foreground">{new Date(action.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p></div>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => deleteAction(action.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            {actions.length === 0 && <p className="text-sm text-muted-foreground">{t.marketingPage.noActionsYet}</p>}
          </div>
        </CardContent>
      </Card>

      {/* AI Validation */}
      <Card className="border-carbon/[0.06] rounded-none shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.aiMarketValidation}</p><p className="text-sm font-light text-carbon/40">{t.marketingPage.compareWithMarket}</p></div>
            <Button onClick={handleGeneratePrediction} disabled={isGeneratingPrediction || drops.length === 0}>
              {isGeneratingPrediction ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.analyzing}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.validateWithAi}</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {prediction ? (
            <div className="space-y-6">
              {/* Sales Comparison Chart */}
              {prediction.weeklyPredictions && prediction.weeklyPredictions.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t.marketingPage.salesForecast}
                  </h4>
                  
                  {/* Chart */}
                  <div className="relative h-80 mt-4">
                    {(() => {
                      // Aggregate predictions by month
                      const predictionsByMonth: Record<string, number> = {};
                      prediction.weeklyPredictions.forEach((wp: any) => {
                        const [year, weekStr] = wp.week.split('-W');
                        const weekNum = parseInt(weekStr);
                        // Approximate month from week number
                        const monthIndex = Math.min(11, Math.floor((weekNum - 1) / 4.33));
                        const monthKey = `${MONTH_NAMES[monthIndex]} ${year}`;
                        predictionsByMonth[monthKey] = (predictionsByMonth[monthKey] || 0) + (wp.predictedSales || 0);
                      });
                      
                      // Combine with planned sales
                      const chartData = plannedSalesByMonth.map(p => ({
                        label: `${p.month}`,
                        planned: p.sales,
                        predicted: predictionsByMonth[`${p.month} ${p.year}`] || 0
                      }));
                      
                      const maxValue = Math.max(
                        ...chartData.map(d => Math.max(d.planned, d.predicted)),
                        1
                      );
                      
                      return (
                        <>
                          {/* Y-axis labels */}
                          <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
                            <span>€{Math.round(maxValue / 1000)}k</span>
                            <span>€{Math.round(maxValue / 2000)}k</span>
                            <span>€0</span>
                          </div>
                          
                          {/* Chart area */}
                          <div className="ml-16 h-full relative">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="border-t border-gray-200 w-full" />
                              ))}
                            </div>
                            
                            {/* SVG Lines */}
                            <svg className="absolute inset-0 w-full h-[calc(100%-2rem)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                              {/* Area fill for Your Plan */}
                              <polygon
                                fill="url(#blueGradient)"
                                opacity="0.15"
                                points={`0,100 ${chartData.map((d, i) => {
                                  const x = (i / (chartData.length - 1)) * 100;
                                  const y = 100 - (d.planned / maxValue) * 100;
                                  return `${x},${y}`;
                                }).join(' ')} 100,100`}
                              />
                              <defs>
                                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#f97316" />
                                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {/* Predicted line (AI/Market) - dashed */}
                              <polyline
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="0.8"
                                strokeDasharray="2,1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={chartData.map((d, i) => {
                                  const x = (i / (chartData.length - 1)) * 100;
                                  const y = 100 - (d.predicted / maxValue) * 100;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                              {/* Planned line (Your Plan) - solid */}
                              <polyline
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="0.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={chartData.map((d, i) => {
                                  const x = (i / (chartData.length - 1)) * 100;
                                  const y = 100 - (d.planned / maxValue) * 100;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                            </svg>
                            {/* Data points overlay (separate SVG to maintain aspect ratio for circles) */}
                            <svg className="absolute inset-0 w-full h-[calc(100%-2rem)]">
                              {/* Data points - Predicted */}
                              {chartData.map((d, i) => {
                                const x = (i / (chartData.length - 1)) * 100;
                                const y = 100 - (d.predicted / maxValue) * 100;
                                return (
                                  <circle
                                    key={`pred-${i}`}
                                    cx={`${x}%`}
                                    cy={`${y}%`}
                                    r="6"
                                    fill="#f97316"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="drop-shadow-sm"
                                  />
                                );
                              })}
                              {/* Data points - Planned */}
                              {chartData.map((d, i) => {
                                const x = (i / (chartData.length - 1)) * 100;
                                const y = 100 - (d.planned / maxValue) * 100;
                                return (
                                  <circle
                                    key={`plan-${i}`}
                                    cx={`${x}%`}
                                    cy={`${y}%`}
                                    r="6"
                                    fill="#3b82f6"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="drop-shadow-sm"
                                  />
                                );
                              })}
                            </svg>
                            
                            {/* X-axis labels */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 h-8 items-end">
                              {chartData.map((d, i) => (
                                <span key={i} className="text-center">{d.label}</span>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-blue-500 rounded" />
                      <span className="text-sm text-gray-600">{t.marketingPage.yourPlan}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-orange-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 8px, transparent 8px, transparent 12px)' }} />
                      <span className="text-sm text-gray-600">{t.marketingPage.aiMarketPrediction}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Insights */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">{t.marketingPage.insights}</h4>
                <p className="text-sm text-blue-800">{prediction.insights}</p>
              </div>
              
              {/* Gaps */}
              {prediction.gaps?.length > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />{t.marketingPage.gapsDetected}
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    {prediction.gaps.map((gap: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Recommendations */}
              {prediction.recommendations?.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />{t.marketingPage.recommendations}
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    {prediction.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{t.marketingPage.clickValidate}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
