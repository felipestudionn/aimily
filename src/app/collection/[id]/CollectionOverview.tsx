'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  LayoutGrid,
  CalendarDays,
  User,
  Sparkles,
  Image,
  Fingerprint,
  ShoppingBag,
  DollarSign,
  Store,
  Calculator,
  Pencil,
  Package,
  CheckSquare,
  Factory,
  Palette,
  Megaphone,
  Target,
  Rocket,
} from 'lucide-react';
import { PHASES, PHASE_ORDER } from '@/lib/timeline-template';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';
import InlineTimeline from './InlineTimeline';
import { useTranslation } from '@/i18n';

type ViewMode = 'blocks' | 'calendar';

/* ═══════════════════════════════════════════════════════════
   Block definitions — internal structure for each of the 4 blocks
   ═══════════════════════════════════════════════════════════ */

interface BlockStep {
  nameKey: string;
  icon: React.ElementType;
}

interface BlockDef {
  phase: TimelinePhase;
  titleKey: string;
  titleItalicKey: string;
  subtitleKey: string;
  route: string;
  steps: BlockStep[];
}

const BLOCK_DEFS: BlockDef[] = [
  {
    phase: 'creative',
    titleKey: 'creativeTitle',
    titleItalicKey: 'creativeItalic',
    subtitleKey: 'creativeSub',
    route: 'creative',
    steps: [
      { nameKey: 'consumerDefinition', icon: User },
      { nameKey: 'collectionVibe', icon: Sparkles },
      { nameKey: 'moodboard', icon: Image },
      { nameKey: 'brandDNA', icon: Fingerprint },
    ],
  },
  {
    phase: 'planning',
    titleKey: 'planningTitle',
    titleItalicKey: 'planningItalic',
    subtitleKey: 'planningSub',
    route: 'merchandising',
    steps: [
      { nameKey: 'productFamilies', icon: ShoppingBag },
      { nameKey: 'pricing', icon: DollarSign },
      { nameKey: 'channelsMarkets', icon: Store },
      { nameKey: 'budgetFinancials', icon: Calculator },
    ],
  },
  {
    phase: 'development',
    titleKey: 'devTitle',
    titleItalicKey: 'devItalic',
    subtitleKey: 'devSub',
    route: 'development',
    steps: [
      { nameKey: 'sketchColor', icon: Pencil },
      { nameKey: 'prototyping', icon: Package },
      { nameKey: 'selectionCatalog', icon: CheckSquare },
      { nameKey: 'production', icon: Factory },
    ],
  },
  {
    phase: 'go_to_market',
    titleKey: 'gtmTitle',
    titleItalicKey: 'gtmItalic',
    subtitleKey: 'gtmSub',
    route: 'marketing/creation',
    steps: [
      { nameKey: 'collectionStories', icon: Palette },
      { nameKey: 'contentStrategy', icon: Megaphone },
      { nameKey: 'goToMarket', icon: Target },
      { nameKey: 'launchGrowth', icon: Rocket },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════ */

interface CollectionOverviewProps {
  plan: CollectionPlan;
  timeline: {
    id: string;
    collection_plan_id: string;
    launch_date: string;
    milestones: TimelineMilestone[];
  } | null;
  skuCount: number;
}

function BlockCard({
  block,
  milestones,
  collectionId,
}: {
  block: BlockDef;
  milestones: TimelineMilestone[];
  collectionId: string;
}) {
  const t = useTranslation();
  const phaseMilestones = milestones.filter((m) => m.phase === block.phase);
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const total = phaseMilestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isStarted = progress > 0;

  return (
    <Link
      href={`/collection/${collectionId}/${block.route}`}
      className="group relative bg-white p-6 md:p-10 lg:p-12 hover:shadow-lg transition-all duration-300 overflow-hidden border border-carbon/[0.06] flex flex-col md:min-h-[420px]"
    >
      {/* Progress bar top */}
      <div className="absolute top-0 left-0 h-[2px] bg-carbon/[0.06] w-full">
        <div
          className="h-full bg-carbon transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Title + circular progress */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-2xl md:text-3xl font-light text-carbon tracking-tight leading-[1.15]">
          {t.overview[block.titleKey as keyof typeof t.overview]} <span className="italic">{t.overview[block.titleItalicKey as keyof typeof t.overview]}</span>
        </h3>

        {/* Circular progress */}
        <div className="relative flex-shrink-0 w-14 h-14">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke="currentColor"
              className="text-carbon/[0.06]"
              strokeWidth="2.5"
            />
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke="currentColor"
              className="text-carbon transition-all duration-700"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs text-carbon/50">
            {progress}%
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-carbon/50 mb-8">
        {t.overview[block.subtitleKey as keyof typeof t.overview]}
      </p>

      {/* Internal steps */}
      <div className="pt-6 border-t border-carbon/[0.06] space-y-4 flex-1">
        {block.steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.nameKey} className="flex items-center gap-3">
              <div className="w-7 h-7 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
                <Icon className="h-3.5 w-3.5 text-carbon/40" />
              </div>
              <p className="text-sm text-carbon/70 truncate">
                {t.overview[step.nameKey as keyof typeof t.overview]}
              </p>
            </div>
          );
        })}
      </div>

      {/* CTA bar */}
      <div className={`relative mt-auto pt-8`}>
        <div className="flex items-center justify-center gap-3 bg-carbon text-crema py-3.5 px-6 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors overflow-hidden">
          {isStarted ? t.common.continue : t.overview.start}
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />

          {/* Shimmer effect for unstarted blocks */}
          {!isStarted && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          )}
        </div>
      </div>
    </Link>
  );
}

export function CollectionOverview({ plan, timeline, skuCount }: CollectionOverviewProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const milestones = timeline?.milestones || [];
  const [view, setView] = useState<ViewMode>('blocks');
  const t = useTranslation();

  return (
    <div className="min-h-[80vh]">
      <div className="px-5 md:px-12 lg:px-16 pt-16 md:pt-12 pb-12">
        {/* Header + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
              {t.overview.yourWorkspace}
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.overview.teamBlocks} <span className="italic">{t.overview.teamBlocksItalic}</span>
            </h2>
          </div>

          {/* View Toggle */}
          <div className="flex border border-carbon/[0.06] overflow-x-auto">
            {[
              { id: 'blocks' as ViewMode, label: t.overview.blocks, icon: LayoutGrid },
              { id: 'calendar' as ViewMode, label: t.overview.calendar, icon: CalendarDays },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`flex items-center gap-2 px-4 md:px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] uppercase transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-carbon text-crema'
                      : 'bg-white text-carbon/40 hover:text-carbon/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Content */}
        {view === 'blocks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {BLOCK_DEFS.map((block) => (
              <BlockCard
                key={block.phase}
                block={block}
                milestones={milestones}
                collectionId={collectionId}
              />
            ))}
          </div>
        )}
      </div>

      {view === 'calendar' && (
        <InlineTimeline
          collectionId={collectionId}
          collectionName={plan.name}
          season={plan.season || ''}
          launchDate={timeline?.launch_date}
        />
      )}

    </div>
  );
}
