'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { GanttChart } from '@/components/timeline/GanttChart';
import { createDefaultTimeline } from '@/lib/timeline-template';
import { CollectionTimeline, TimelineMilestone } from '@/types/timeline';
import { Calendar, Edit3, Save, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'olawave_collection_timelines';

function loadTimelines(): CollectionTimeline[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveTimelines(timelines: CollectionTimeline[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timelines));
}

export default function CollectionCalendarPage() {
  const [timelines, setTimelines] = useState<CollectionTimeline[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editLaunchDate, setEditLaunchDate] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = loadTimelines();
    if (saved.length > 0) {
      setTimelines(saved);
      setActiveId(saved[0].id);
    } else {
      // Create default SS27 timeline
      const defaultTimeline = createDefaultTimeline(
        'VAKSA',
        'SS27',
        '2027-02-01'
      );
      setTimelines([defaultTimeline]);
      setActiveId(defaultTimeline.id);
      saveTimelines([defaultTimeline]);
    }
    setLoaded(true);
  }, []);

  const activeTimeline = timelines.find((t) => t.id === activeId) || null;

  const updateTimeline = useCallback(
    (id: string, updates: Partial<CollectionTimeline>) => {
      setTimelines((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? { ...t, ...updates, updatedAt: new Date().toISOString() }
            : t
        );
        saveTimelines(next);
        return next;
      });
    },
    []
  );

  const updateMilestone = useCallback(
    (milestoneId: string, updates: Partial<TimelineMilestone>) => {
      if (!activeId) return;
      setTimelines((prev) => {
        const next = prev.map((t) => {
          if (t.id !== activeId) return t;
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            milestones: t.milestones.map((m) =>
              m.id === milestoneId ? { ...m, ...updates } : m
            ),
          };
        });
        saveTimelines(next);
        return next;
      });
    },
    [activeId]
  );

  const createNewTimeline = () => {
    const newTimeline = createDefaultTimeline(
      'Nueva Colección',
      'SS27',
      '2027-02-01'
    );
    setTimelines((prev) => {
      const next = [...prev, newTimeline];
      saveTimelines(next);
      return next;
    });
    setActiveId(newTimeline.id);
  };

  const resetTimeline = () => {
    if (!activeTimeline) return;
    if (
      !confirm(
        '¿Resetear todos los hitos a los valores por defecto? Se perderán los cambios.'
      )
    )
      return;
    const fresh = createDefaultTimeline(
      activeTimeline.collectionName,
      activeTimeline.season,
      activeTimeline.launchDate
    );
    fresh.id = activeTimeline.id;
    updateTimeline(activeTimeline.id, {
      milestones: fresh.milestones,
    });
  };

  const startEditing = () => {
    if (!activeTimeline) return;
    setEditName(activeTimeline.collectionName);
    setEditSeason(activeTimeline.season);
    setEditLaunchDate(activeTimeline.launchDate);
    setIsEditing(true);
  };

  const saveEditing = () => {
    if (!activeTimeline) return;
    updateTimeline(activeTimeline.id, {
      collectionName: editName,
      season: editSeason,
      launchDate: editLaunchDate,
    });
    setIsEditing(false);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#fff6dc]">
        <Navbar />
        <div className="pt-28 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />
      <div className="pt-24 pb-8 px-4 max-w-[1600px] mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-2xl font-bold bg-white border rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <input
                      type="text"
                      value={editSeason}
                      onChange={(e) => setEditSeason(e.target.value)}
                      className="text-lg font-semibold text-gray-500 bg-white border rounded-lg px-2 py-0.5 w-24 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {activeTimeline?.collectionName || 'Calendario'}{' '}
                    <span className="text-gray-400 font-semibold">
                      {activeTimeline?.season}
                    </span>
                  </h1>
                )}
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">Lanzamiento:</span>
                    <input
                      type="date"
                      value={editLaunchDate}
                      onChange={(e) => setEditLaunchDate(e.target.value)}
                      className="text-sm bg-white border rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Lanzamiento:{' '}
                    <span className="font-semibold text-gray-700">
                      {activeTimeline
                        ? new Date(
                            activeTimeline.launchDate
                          ).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : ''}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeline selector */}
            {timelines.length > 1 && (
              <select
                value={activeId || ''}
                onChange={(e) => setActiveId(e.target.value)}
                className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              >
                {timelines.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.collectionName} {t.season}
                  </option>
                ))}
              </select>
            )}
            {isEditing ? (
              <button
                onClick={saveEditing}
                className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            ) : (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
            )}
            <button
              onClick={resetTimeline}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              title="Resetear al template base"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={createNewTimeline}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              + Nuevo calendario
            </button>
          </div>
        </div>

        {/* Phase legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'OLA Wave Digital', color: '#FF6B6B' },
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
        {activeTimeline && (
          <div style={{ height: 'calc(100vh - 240px)' }}>
            <GanttChart
              timeline={activeTimeline}
              onUpdateMilestone={updateMilestone}
              onUpdateTimeline={(updates) =>
                updateTimeline(activeTimeline.id, updates)
              }
            />
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-xs text-gray-400 flex items-center gap-4">
          <span>
            Click en el circulo para cambiar estado (pendiente / en progreso /
            completado)
          </span>
          <span>|</span>
          <span>Click en las semanas (ej. 2w) para editar la duracion</span>
          <span>|</span>
          <span>Hover sobre un hito para editar su inicio</span>
          <span>|</span>
          <span>La linea roja marca HOY, la negra marca LAUNCH</span>
        </div>
      </div>
    </div>
  );
}
