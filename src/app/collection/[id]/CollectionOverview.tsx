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
  Check,
  Presentation,
} from 'lucide-react';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';
import { computeWizardState } from '@/lib/wizard-phases';
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
    route: 'product',
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
  collectionId,
  blockProgress,
  allBlockProgress,
}: {
  block: BlockDef;
  collectionId: string;
  blockProgress: number;
  allBlockProgress: Record<TimelinePhase, number>;
}) {
  const t = useTranslation();
  const progress = blockProgress;
  const isStarted = progress > 0;
  const isComplete = progress === 100;

  /* ── Smart CTA logic ── */
  const merchDone = allBlockProgress.planning === 100;

  const getCtaLabel = (): string => {
    if (isComplete) return (t.overview as Record<string, string>).completed || 'Completed';

    // Merch done → CTA becomes "Open Builder"
    if (block.phase === 'planning' && merchDone) {
      return (t.overview as Record<string, string>).openBuilder || 'Open Builder';
    }
    // Design block → always "Open Builder"
    if (block.phase === 'development') {
      return (t.overview as Record<string, string>).openBuilder || 'Open Builder';
    }

    if (isStarted) return t.common.continue;
    return t.overview.start;
  };

  const getCtaRoute = (): string => {
    // When merch is done, CTA links to builder
    if (block.phase === 'planning' && merchDone) {
      return `/collection/${collectionId}/product`;
    }
    return `/collection/${collectionId}/${block.route}`;
  };

  return (
    <Link
      href={getCtaRoute()}
      className="group relative bg-white p-5 sm:p-6 md:p-8 hover:shadow-md transition-all duration-300 overflow-hidden border border-carbon/[0.06] shadow-sm flex flex-col"
    >
      {/* Progress bar top */}
      <div className="absolute top-0 left-0 h-[2px] bg-carbon/[0.06] w-full">
        <div
          className="h-full bg-carbon transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Title + progress indicator */}
      <div className="flex items-start justify-between mb-1 mt-1">
        <h3 className="text-lg sm:text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
          {t.overview[block.titleKey as keyof typeof t.overview]} <span className="italic">{t.overview[block.titleItalicKey as keyof typeof t.overview]}</span>
        </h3>
        <span className="text-xs font-medium text-carbon/30 flex-shrink-0 ml-3 mt-1">
          {progress}%
        </span>
      </div>

      {/* Subtitle */}
      <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-carbon/40 mb-6">
        {t.overview[block.subtitleKey as keyof typeof t.overview]}
      </p>

      {/* Internal steps */}
      <div className="pt-5 border-t border-carbon/[0.06] space-y-3 flex-1">
        {block.steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.nameKey} className="flex items-center gap-3">
              <div className="w-7 h-7 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
                <Icon className="h-3.5 w-3.5 text-carbon/40" />
              </div>
              <p className="text-sm text-carbon/60 truncate">
                {t.overview[step.nameKey as keyof typeof t.overview]}
              </p>
            </div>
          );
        })}
      </div>

      {/* CTA — inline, centered */}
      <div className="mt-6 flex justify-center">
        <div className={`relative inline-flex items-center justify-center gap-2 py-2.5 px-8 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors overflow-hidden ${
          isComplete
            ? 'bg-carbon/[0.05] text-carbon/35'
            : 'bg-carbon text-crema group-hover:bg-carbon/90'
        }`}>
          {getCtaLabel()}
          {!isComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
          {isComplete && <Check className="h-3.5 w-3.5" />}

          {/* Shimmer effect for unstarted blocks */}
          {!isStarted && !isComplete && (
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

  // Use computeWizardState (same as sidebar) to get accurate per-block progress
  const wizardPhases = computeWizardState(milestones);
  const BLOCK_TO_PHASE_IDS: Record<TimelinePhase, string[]> = {
    creative: ['product', 'brand'],
    planning: ['merchandising'],
    development: ['design', 'prototyping', 'sampling', 'production'],
    go_to_market: ['marketing-creation', 'marketing-distribution'],
  };
  const allBlockProgress = Object.entries(BLOCK_TO_PHASE_IDS).reduce((acc, [block, phaseIds]) => {
    const blockPhases = phaseIds.map(id => wizardPhases.find(p => p.phase.id === id)).filter(Boolean) as typeof wizardPhases;
    const total = blockPhases.reduce((s, p) => s + p.totalCount, 0);
    const done = blockPhases.reduce((s, p) => s + p.completedCount, 0);
    acc[block as TimelinePhase] = total > 0 ? Math.round((done / total) * 100) : 0;
    return acc;
  }, {} as Record<TimelinePhase, number>);

  return (
    <div className="min-h-[80vh]">
      <div className="px-4 sm:px-5 md:px-12 lg:px-16 pt-16 md:pt-12 pb-12">
        {/* Header + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 pl-12 md:pl-0">
          <div>
            <p className="text-[10px] sm:text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
              {t.overview.yourWorkspace}
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.overview.teamBlocks} <span className="italic">{t.overview.teamBlocksItalic}</span>
            </h2>
          </div>

          {/* Actions: View Toggle + Presentation + Export */}
          <div className="flex items-center gap-2">
            {/* Presentation */}
            <Link
              href={`/collection/${collectionId}/presentation`}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-carbon/[0.06] text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/40 hover:text-carbon hover:border-carbon/20 transition-all whitespace-nowrap"
            >
              <Presentation className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{(t.overview as Record<string, string>).presentation || 'Presentation'}</span>
            </Link>

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
                  className={`flex items-center gap-2 px-2.5 sm:px-4 md:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase transition-all whitespace-nowrap ${
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
        </div>

        {/* View Content */}
        {view === 'blocks' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
            {BLOCK_DEFS.map((block) => (
              <BlockCard
                key={block.phase}
                block={block}
                collectionId={collectionId}
                blockProgress={allBlockProgress[block.phase] || 0}
                allBlockProgress={allBlockProgress}
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
