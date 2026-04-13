'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';
import { computeWizardState } from '@/lib/wizard-phases';
import InlineTimeline from './InlineTimeline';
import { useTranslation } from '@/i18n';
import { useRouter } from 'next/navigation';
import { SegmentedPill } from '@/components/ui/segmented-pill';

type ViewMode = 'blocks' | 'calendar' | 'presentation';

/* ═══════════════════════════════════════════════════════════
   Block definitions — simplified for clean dashboard cards
   ═══════════════════════════════════════════════════════════ */

interface BlockDef {
  phase: TimelinePhase;
  title: string;
  titleItalic: string;
  description: string;
  route: string;
}

const BLOCK_DEFS: BlockDef[] = [
  {
    phase: 'creative',
    title: 'Creative &',
    titleItalic: 'Brand',
    description: 'Vision, research, and brand identity for your collection.',
    route: 'creative',
  },
  {
    phase: 'planning',
    title: 'Merchandising &',
    titleItalic: 'Planning',
    description: 'Product families, pricing, channels, and budget.',
    route: 'merchandising',
  },
  {
    phase: 'development',
    title: 'Design &',
    titleItalic: 'Development',
    description: 'Sketch, prototype, select, and produce your collection.',
    route: 'product',
  },
  {
    phase: 'go_to_market',
    title: 'Marketing &',
    titleItalic: 'Sales',
    description: 'Content, communications, and go-to-market strategy.',
    route: 'marketing/creation',
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
  const progress = blockProgress;
  const isStarted = progress > 0;
  const isComplete = progress === 100;

  /* ── Smart CTA ── */
  const merchDone = allBlockProgress.planning === 100;

  const getCtaLabel = (): string => {
    if (isComplete) return 'Completed';
    if (block.phase === 'planning' && merchDone) return 'Open Builder';
    if (block.phase === 'development') return 'Open Builder';
    if (isStarted) return 'Continue';
    return 'Start';
  };

  const getCtaRoute = (): string => {
    if (block.phase === 'planning' && merchDone) {
      return `/collection/${collectionId}/product`;
    }
    return `/collection/${collectionId}/${block.route}`;
  };

  const blockIndex = BLOCK_DEFS.indexOf(block) + 1;

  return (
    <Link
      href={getCtaRoute()}
      className="group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[420px] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
    >
      {/* Block number — large, ghost */}
      <span className="text-[64px] font-bold text-carbon/[0.06] leading-none tracking-[-0.04em] mb-6">
        0{blockIndex}.
      </span>

      {/* Title */}
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
        {block.title} {block.titleItalic}
      </h3>

      {/* Description */}
      <p className="text-[14px] text-carbon/50 leading-[1.6] tracking-[-0.02em]">
        {block.description}
      </p>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Progress + CTA */}
      <div className="flex items-center justify-between mt-8">
        <span className="text-[13px] font-medium text-carbon/30 tabular-nums">
          {progress > 0 ? `${progress}%` : ''}
        </span>

        <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
          isComplete
            ? 'bg-carbon/[0.06] text-carbon/50'
            : 'bg-carbon text-white group-hover:bg-carbon/90'
        }`}>
          {getCtaLabel()}
          {!isComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
          {isComplete && <Check className="h-3.5 w-3.5" />}
        </div>
      </div>
    </Link>
  );
}

export function CollectionOverview({ plan, timeline, skuCount }: CollectionOverviewProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const router = useRouter();
  const milestones = timeline?.milestones || [];
  const [view, setView] = useState<ViewMode>('blocks');
  const t = useTranslation();

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

  const handleViewChange = (newView: string) => {
    if (newView === 'presentation') {
      router.push(`/collection/${collectionId}/presentation`);
    } else {
      setView(newView as ViewMode);
    }
  };

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-16 pb-16">

        {/* ── Collection title ── */}
        <div className="text-center mb-12">
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.1]">
            {plan.name}
          </h1>
        </div>

        {/* ── View switch ── */}
        <div className="flex justify-center mb-12">
          <SegmentedPill
            options={[
              { id: 'blocks', label: t.overview?.blocks || 'Blocks' },
              { id: 'calendar', label: t.overview?.calendar || 'Calendar' },
              { id: 'presentation', label: (t.overview as Record<string, string>)?.presentation || 'Presentation' },
            ]}
            value={view}
            onChange={handleViewChange}
            size="md"
          />
        </div>

        {/* ── Blocks view — horizontal row ── */}
        {view === 'blocks' && (
          <div className="max-w-[1100px] mx-auto grid grid-cols-4 gap-4">
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

      {/* ── Calendar view ── */}
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
