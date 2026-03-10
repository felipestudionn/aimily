'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  BarChart3,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import type { SalesEntry, LessonLearned } from '@/types/launch';
import { SALES_CHANNELS, CURRENCIES, LESSON_CATEGORIES, LESSON_TYPES } from '@/types/launch';

interface PostLaunchAnalyticsProps {
  collectionId: string;
}

function useLocalStorage<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);

  return [state, setState];
}

export function PostLaunchAnalytics({ collectionId }: PostLaunchAnalyticsProps) {
  const storageKey = (sub: string) => `olawave_launch_${collectionId}_${sub}`;

  const [sales, setSales] = useLocalStorage<SalesEntry[]>(storageKey('sales'), []);
  const [lessons, setLessons] = useLocalStorage<LessonLearned[]>(storageKey('lessons'), []);

  const [showSalesForm, setShowSalesForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);

  // ── Sales Form ──
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleChannel, setSaleChannel] = useState<string>(SALES_CHANNELS[0]);
  const [saleUnits, setSaleUnits] = useState('');
  const [saleRevenue, setSaleRevenue] = useState('');
  const [saleCurrency, setSaleCurrency] = useState<string>(CURRENCIES[0]);

  const addSale = useCallback(() => {
    if (!saleUnits || !saleRevenue) return;
    const entry: SalesEntry = {
      id: crypto.randomUUID(),
      date: saleDate,
      channel: saleChannel,
      units: parseInt(saleUnits, 10) || 0,
      revenue: parseFloat(saleRevenue) || 0,
      currency: saleCurrency,
    };
    setSales((prev) => [entry, ...prev]);
    setSaleUnits(''); setSaleRevenue(''); setShowSalesForm(false);
  }, [saleDate, saleChannel, saleUnits, saleRevenue, saleCurrency, setSales]);

  const deleteSale = useCallback((id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  }, [setSales]);

  // ── Lesson Form ──
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonCategory, setLessonCategory] = useState<LessonLearned['category']>('product');
  const [lessonType, setLessonType] = useState<LessonLearned['type']>('success');

  const addLesson = useCallback(() => {
    if (!lessonTitle.trim()) return;
    const lesson: LessonLearned = {
      id: crypto.randomUUID(),
      category: lessonCategory,
      type: lessonType,
      title: lessonTitle.trim(),
      description: lessonDesc.trim(),
    };
    setLessons((prev) => [lesson, ...prev]);
    setLessonTitle(''); setLessonDesc(''); setShowLessonForm(false);
  }, [lessonTitle, lessonDesc, lessonCategory, lessonType, setLessons]);

  const deleteLesson = useCallback((id: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }, [setLessons]);

  // ── Sales Summary ──
  const summary = useMemo(() => {
    const totalUnits = sales.reduce((sum, s) => sum + s.units, 0);
    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
    const mainCurrency = sales.length > 0 ? sales[0].currency : 'EUR';
    const byChannel: Record<string, { units: number; revenue: number }> = {};
    sales.forEach((s) => {
      if (!byChannel[s.channel]) byChannel[s.channel] = { units: 0, revenue: 0 };
      byChannel[s.channel].units += s.units;
      byChannel[s.channel].revenue += s.revenue;
    });
    const avgOrderValue = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    return { totalUnits, totalRevenue, mainCurrency, byChannel, avgOrderValue };
  }, [sales]);

  // ── Lesson Summary ──
  const lessonCounts = useMemo(() => {
    return {
      success: lessons.filter((l) => l.type === 'success').length,
      improvement: lessons.filter((l) => l.type === 'improvement').length,
      issue: lessons.filter((l) => l.type === 'issue').length,
    };
  }, [lessons]);

  const formatCurrency = (val: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);

  return (
    <div className="space-y-6">
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <ShoppingBag className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{summary.totalUnits}</p>
          <p className="text-xs text-gray-500">Units Sold</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue, summary.mainCurrency)}</p>
          <p className="text-xs text-gray-500">Total Revenue</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-purple-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgOrderValue, summary.mainCurrency)}</p>
          <p className="text-xs text-gray-500">Avg. per Unit</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <BarChart3 className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{Object.keys(summary.byChannel).length}</p>
          <p className="text-xs text-gray-500">Active Channels</p>
        </div>
      </div>

      {/* Sales by Channel */}
      {Object.keys(summary.byChannel).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Sales by Channel</h3>
          <div className="space-y-2">
            {Object.entries(summary.byChannel)
              .sort(([, a], [, b]) => b.revenue - a.revenue)
              .map(([channel, data]) => {
                const pct = summary.totalRevenue > 0 ? (data.revenue / summary.totalRevenue) * 100 : 0;
                return (
                  <div key={channel} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-28 truncate">{channel}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{data.units} units</span>
                    <span className="text-xs font-medium text-gray-700 w-20 text-right">
                      {formatCurrency(data.revenue, summary.mainCurrency)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Sales Tracker */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold text-gray-900">Sales Tracker</h3>
            <span className="text-xs text-gray-400">Registro de ventas</span>
          </div>
          <button
            onClick={() => setShowSalesForm(true)}
            className="flex items-center gap-1 text-xs font-medium bg-green-50 text-green-600 rounded-lg px-3 py-1.5 hover:bg-green-100"
          >
            <Plus className="h-3 w-3" /> Add Sale
          </button>
        </div>

        {/* Sales form */}
        {showSalesForm && (
          <div className="bg-green-50/50 rounded-xl p-4 mb-4 space-y-3 border border-green-100">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
              <select value={saleChannel} onChange={(e) => setSaleChannel(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200">
                {SALES_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={saleUnits} onChange={(e) => setSaleUnits(e.target.value)} placeholder="Units" min="0" className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
              <input type="number" value={saleRevenue} onChange={(e) => setSaleRevenue(e.target.value)} placeholder="Revenue" min="0" step="0.01" className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200" />
              <select value={saleCurrency} onChange={(e) => setSaleCurrency(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSalesForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
              <button onClick={addSale} disabled={!saleUnits || !saleRevenue} className="text-xs font-medium bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-40">Add</button>
            </div>
          </div>
        )}

        {/* Sales table */}
        {sales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No sales recorded yet. Add entries to track performance.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium text-right">Units</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="group border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-gray-700">{new Date(sale.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td className="py-2 text-gray-700">{sale.channel}</td>
                    <td className="py-2 text-right text-gray-700">{sale.units}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(sale.revenue, sale.currency)}</td>
                    <td className="py-2">
                      <button onClick={() => deleteSale(sale.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lessons Learned */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Lessons Learned</h3>
            <span className="text-xs text-gray-400">Lecciones aprendidas</span>
          </div>
          <button
            onClick={() => setShowLessonForm(true)}
            className="flex items-center gap-1 text-xs font-medium bg-purple-50 text-purple-600 rounded-lg px-3 py-1.5 hover:bg-purple-100"
          >
            <Plus className="h-3 w-3" /> Add Lesson
          </button>
        </div>

        {/* Lesson type summary */}
        <div className="flex gap-3 mb-4">
          {LESSON_TYPES.map((lt) => (
            <div key={lt.id} className="flex items-center gap-1.5 text-xs">
              <span>{lt.emoji}</span>
              <span className="text-gray-500">{lt.label}:</span>
              <span className="font-bold" style={{ color: lt.color }}>{lessonCounts[lt.id]}</span>
            </div>
          ))}
        </div>

        {/* Lesson form */}
        {showLessonForm && (
          <div className="bg-purple-50/50 rounded-xl p-4 mb-4 space-y-3 border border-purple-100">
            <input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Lesson title..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={lessonCategory} onChange={(e) => setLessonCategory(e.target.value as LessonLearned['category'])} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200">
                {LESSON_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select value={lessonType} onChange={(e) => setLessonType(e.target.value as LessonLearned['type'])} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200">
                {LESSON_TYPES.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <textarea
              value={lessonDesc}
              onChange={(e) => setLessonDesc(e.target.value)}
              placeholder="Details..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowLessonForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
              <button onClick={addLesson} disabled={!lessonTitle.trim()} className="text-xs font-medium bg-purple-600 text-white rounded-lg px-3 py-1.5 hover:bg-purple-700 disabled:opacity-40">Add</button>
            </div>
          </div>
        )}

        {/* Lessons list */}
        {lessons.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Document what worked and what to improve for next time.</p>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson) => {
              const typeConfig = LESSON_TYPES.find((t) => t.id === lesson.type);
              const catConfig = LESSON_CATEGORIES.find((c) => c.id === lesson.category);
              return (
                <div key={lesson.id} className="group flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-base mt-0.5">{typeConfig?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{lesson.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{catConfig?.label}</span>
                    </div>
                    {lesson.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{lesson.description}</p>
                    )}
                  </div>
                  <button onClick={() => deleteLesson(lesson.id)} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
