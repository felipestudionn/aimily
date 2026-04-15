'use client';

import { useState, useMemo } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { GanttChart, CalendarLang } from '@/components/timeline/GanttChart';
import { useCollectionTimeline } from '@/hooks/useCollectionTimeline';
import {
  RotateCcw,
  Download,
  Loader2,
  Cloud,
} from 'lucide-react';
import { useTranslation } from '@/i18n';

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
  /** When true, skip Navbar and background wrapper (used inside Collection Hub) */
  embedded?: boolean;
}

export function CollectionCalendarClient({
  plan,
  skus,
  drops,
  commercialActions,
  embedded = false,
}: CollectionCalendarClientProps) {
  const t = useTranslation();

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

  const [lang, setLang] = useState<CalendarLang>('en');

  if (loading) {
    if (embedded) {
      return (
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          <span className="text-gray-500">{t.calendarPage.loadingCalendar}</span>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-crema">
        <Navbar />
        <div className="pt-28 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          <span className="text-gray-500">{t.calendarPage.loadingCalendar}</span>
        </div>
      </div>
    );
  }

  /* Minimal toolbar — language toggle + export + reset.
     Back/title/launch date only shown in the standalone route (non-embedded);
     in the Overview, the sidebar is the spine and these are redundant. */
  const Toolbar = () => (
    <div className="flex items-center justify-end gap-2 mb-4">
      <div className="inline-flex rounded-full border border-carbon/[0.12] overflow-hidden">
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em] transition-colors ${lang === 'en' ? 'bg-carbon text-white' : 'text-carbon/50 hover:bg-carbon/[0.04]'}`}
        >
          EN
        </button>
        <button
          onClick={() => setLang('es')}
          className={`px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em] transition-colors ${lang === 'es' ? 'bg-carbon text-white' : 'text-carbon/50 hover:bg-carbon/[0.04]'}`}
        >
          ES
        </button>
      </div>
      <button
        onClick={async () => {
          if (!timeline) return;
          const { exportTimelineToExcel } = await import('@/lib/export-timeline-excel');
          await exportTimelineToExcel(timeline, lang);
        }}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
        title={t.calendarPage.exportToExcel}
      >
        <Download className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={resetToDefaults}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30 transition-colors"
        title={t.calendarPage.resetToTemplate}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      {saving && (
        <span className="inline-flex items-center gap-1 text-[11px] text-carbon/50 ml-2">
          <Cloud className="w-3 h-3" />
          {t.calendarPage.saving}
        </span>
      )}
    </div>
  );

  const calendarContent = (
    <>
      {/* Minimal toolbar — collection name & season already shown in the sidebar */}
      <Toolbar />

      {/* Gantt chart — the spine's horizontal extension.
          20 rows, one per mini-block, no internal label column. */}
      {timeline && (
        <div style={{ height: embedded ? 'calc(100vh - 160px)' : 'calc(100vh - 160px)' }}>
          <GanttChart
            timeline={timeline}
            onUpdateMilestone={updateMilestone}
            onUpdateTimeline={updateTimeline}
            lang={lang}
          />
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="pb-8 max-w-[1600px] mx-auto">
        {calendarContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shade">
      <Navbar />
      <div className="pt-24 pb-8 px-4 max-w-[1600px] mx-auto">
        {calendarContent}
      </div>
    </div>
  );
}
