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

  return (
    <Link
      href={getCtaRoute()}
      className="group relative bg-white rounded-[16px] p-6 md:p-8 flex flex-col min-h-[280px] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
    >
      {/* Progress */}
      <span className="text-[12px] font-medium text-carbon/35 tabular-nums mb-4">
        {progress}%
      </span>

      {/* Title */}
      <h3 className="text-[20px] md:text-[22px] font-medium text-carbon tracking-[-0.03em] leading-[1.2] mb-3">
        {block.title}<br />
        <span className="italic">{block.titleItalic}</span>
      </h3>

      {/* Description */}
      <p className="text-[13px] text-carbon/45 leading-relaxed tracking-[-0.02em] mb-auto">
        {block.description}
      </p>

      {/* CTA */}
      <div className="mt-6 flex justify-center">
        <div className={`inline-flex items-center justify-center gap-2 py-2 px-6 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-all ${
          isComplete
            ? 'bg-carbon/[0.06] text-carbon/50'
            : 'bg-carbon text-white group-hover:bg-carbon/90'
        }`}>
          {getCtaLabel()}
          {!isComplete && <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />}
          {isComplete && <Check className="h-3 w-3" />}
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
