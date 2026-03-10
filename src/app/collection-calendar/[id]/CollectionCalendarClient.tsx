'use client';

import { useMemo } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { GanttChart } from '@/components/timeline/GanttChart';
import { useCollectionTimeline } from '@/hooks/useCollectionTimeline';
import {
  Calendar,
  Edit3,
  Save,
  RotateCcw,
  Package,
  Layers,
  Megaphone,
  ArrowLeft,
  Loader2,
  Cloud,
} from 'lucide-react';
import Link from 'next/link';

interface CollectionCalendarClientProps {
  plan: {
    id: string;
    name: string;
    season?: string;
    setup_data?: {
      expectedSkus?: number;
      totalSalesTarget?: number;
      productCategory?: string;
    };
  };
  skus: {
    id: string;
    name: string;
    family: string;
    type: string;
    category: string;
    drop_number: number;
    launch_date?: string;
    pvp?: number;
    cost?: number;
  }[];
  drops: {
    id: string;
    drop_number: number;
    name: string;
    launch_date: string;
    weeks_active: number;
    story_name?: string;
  }[];
  commercialActions: {
    id: string;
    name: string;
    action_type: string;
    start_date: string;
    end_date?: string;
    category?: string;
  }[];
}

export function CollectionCalendarClient({
  plan,
  skus,
  drops,
  commercialActions,
}: CollectionCalendarClientProps) {
  // Derive launch date from earliest drop
  const derivedLaunchDate = useMemo(() => {
    if (drops.length > 0) {
      const sorted = [...drops].sort(
        (a, b) =>
          new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime()
      );
      return sorted[0].launch_date;
    }
    return '2027-02-01';
  }, [drops]);

  const {
    timeline,
    loading,
    saving,
    updateMilestone,
    updateTimeline,
    resetToDefaults,
  } = useCollectionTimeline(
    plan.id,
    plan.name,
    plan.season || 'SS27',
    derivedLaunchDate
  );

  // Collection summary stats
  const stats = useMemo(() => {
    const families = Array.from(new Set(skus.map((s) => s.family)));
    const categories = Array.from(new Set(skus.map((s) => s.category)));
    const totalPvp = skus.reduce((sum, s) => sum + (s.pvp || 0), 0);
    return {
      skuCount: skus.length,
      dropCount: drops.length,
      actionCount: commercialActions.length,
      families,
      categories,
      avgPvp: skus.length > 0 ? totalPvp / skus.length : 0,
    };
  }, [skus, drops, commercialActions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff6dc]">
        <Navbar />
        <div className="pt-28 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          <span className="text-gray-500">Cargando calendario...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />
      <div className="pt-24 pb-8 px-4 max-w-[1600px] mx-auto">
        {/* Back + Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link
              href={`/planner/${plan.id}`}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al planner
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {plan.name}{' '}
                  <span className="text-gray-400 font-semibold">
                    {plan.season || 'SS27'}
                  </span>
                </h1>
                <p className="text-sm text-gray-500">
                  Lanzamiento:{' '}
                  <span className="font-semibold text-gray-700">
                    {timeline
                      ? new Date(timeline.launchDate).toLocaleDateString(
                          'es-ES',
                          {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }
                        )
                      : ''}
                  </span>
                  {saving && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-500">
                      <Cloud className="w-3 h-3" />
                      Guardando...
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              title="Resetear al template base"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <Link
              href={`/go-to-market/${plan.id}`}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Go to Market
            </Link>
          </div>
        </div>

        {/* Collection data cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* SKUs card */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Modelos a Desarrollar
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.skuCount}{' '}
              <span className="text-sm font-normal text-gray-400">SKUs</span>
            </div>
            {stats.families.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {stats.families.slice(0, 5).map((f) => (
                  <span
                    key={f}
                    className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full"
                  >
                    {f}
                  </span>
                ))}
                {stats.families.length > 5 && (
                  <span className="text-[10px] text-gray-400">
                    +{stats.families.length - 5} mas
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Drops card */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Drops Planificados
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.dropCount}{' '}
              <span className="text-sm font-normal text-gray-400">drops</span>
            </div>
            {drops.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-2">
                {drops.slice(0, 3).map((d) => (
                  <div
                    key={d.id}
                    className="text-[10px] text-gray-500 flex justify-between"
                  >
                    <span>{d.name}</span>
                    <span className="text-gray-400">
                      {new Date(d.launch_date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commercial Actions card */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Acciones Comerciales
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.actionCount}{' '}
              <span className="text-sm font-normal text-gray-400">
                acciones
              </span>
            </div>
            {commercialActions.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-2">
                {commercialActions.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="text-[10px] text-gray-500 flex justify-between"
                  >
                    <span>{a.name}</span>
                    <span className="text-gray-400">{a.action_type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Phase legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'Product & Merchandising', color: '#FF6B6B' },
            { label: 'Marca e Identidad', color: '#4ECDC4' },
            { label: 'Diseño y Desarrollo', color: '#F5A623' },
            { label: 'Prototipado', color: '#7B68EE' },
            { label: 'Muestrario', color: '#E91E63' },
            { label: 'Presencia Digital', color: '#9C27B0' },
            { label: 'Marketing', color: '#FF9800' },
            { label: 'Producción', color: '#2196F3' },
            { label: 'Lanzamiento', color: '#F44336' },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full border border-gray-100 shadow-sm"
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-[11px] font-medium text-gray-600">
                {p.label}
              </span>
            </div>
          ))}
        </div>

        {/* Gantt chart */}
        {timeline && (
          <div style={{ height: 'calc(100vh - 340px)' }}>
            <GanttChart
              timeline={timeline}
              onUpdateMilestone={updateMilestone}
              onUpdateTimeline={updateTimeline}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-xs text-gray-400 flex items-center gap-4">
          <span>
            Click en el circulo para cambiar estado
          </span>
          <span>|</span>
          <span>Click en las semanas para editar duracion</span>
          <span>|</span>
          <span>Guardado automatico en la nube</span>
        </div>
      </div>
    </div>
  );
}
