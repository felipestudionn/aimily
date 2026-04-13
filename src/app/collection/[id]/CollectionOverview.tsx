'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, ArrowLeft, Pencil } from 'lucide-react';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';
import { computeWizardState } from '@/lib/wizard-phases';
import InlineTimeline from './InlineTimeline';
import { useTranslation } from '@/i18n';
import { useRouter } from 'next/navigation';
import { SegmentedPill } from '@/components/ui/segmented-pill';

type ViewMode = 'blocks' | 'calendar' | 'presentation';

/* ═══════════════════════════════════════════════════════════
   Block & sub-block definitions
   ═══════════════════════════════════════════════════════════ */

interface SubBlockDef {
  id: string;
  label: string;
  description: string;
  route: string;
  isOutput?: boolean;  // Creative Synthesis, Collection Builder — always "Open →"
}

interface BlockDef {
  phase: TimelinePhase;
  number: string;
  title: string;
  description: string;
  route: string;
  subBlocks: SubBlockDef[];
}

const BLOCK_DEFS: BlockDef[] = [
  {
    phase: 'creative',
    number: '01',
    title: 'Creative & Brand',
    description: 'Vision, research, and brand identity for your collection.',
    route: 'creative',
    subBlocks: [
      { id: 'consumer', label: 'Consumer\nDefinition', description: 'Define your target audience, build personas, and map their lifestyle and buying behavior.', route: 'creative' },
      { id: 'moodboard', label: 'Moodboard\n& Research', description: 'Collect visual references, explore trends, and analyze competitors for your season.', route: 'creative' },
      { id: 'brand', label: 'Brand\nIdentity', description: 'Codify your brand DNA, define your voice, and design your visual identity.', route: 'brand' },
      { id: 'synthesis', label: 'Creative\nBrief', description: 'Consolidate everything into a creative brief, define the collection vibe and direction.', route: 'creative', isOutput: true },
    ],
  },
  {
    phase: 'planning',
    number: '02',
    title: 'Merchandising & Planning',
    description: 'Product families, pricing, channels, and budget.',
    route: 'merchandising',
    subBlocks: [
      { id: 'families', label: 'Families\n& Pricing', description: 'Define product categories, set price architecture, and structure your segments.', route: 'merchandising' },
      { id: 'channels', label: 'Channels\n& Markets', description: 'Plan your DTC and wholesale distribution across target markets.', route: 'merchandising' },
      { id: 'budget', label: 'Budget\n& Financials', description: 'Set your sales target, calculate margins, and plan sell-through rates.', route: 'merchandising' },
      { id: 'builder', label: 'Collection\nBuilder', description: 'Build your SKU grid, validate the range plan, and organize by drops.', route: 'product', isOutput: true },
    ],
  },
  {
    phase: 'development',
    number: '03',
    title: 'Design & Development',
    description: 'Sketch, prototype, select, and produce your collection.',
    route: 'product',
    subBlocks: [
      { id: 'sketch', label: 'Sketch\n& Color', description: 'Create sketches, define colorways, and select materials for each SKU.', route: 'product?phase=sketch' },
      { id: 'prototyping', label: 'Proto\n& Fitting', description: 'Review prototypes, run fit sessions, and finalize tech packs.', route: 'product?phase=prototyping' },
      { id: 'production', label: 'Production\n& Logistics', description: 'Send size runs, manage factory orders, and coordinate logistics.', route: 'product?phase=production' },
      { id: 'selection', label: 'Final\nSelection', description: 'Conduct the line review and confirm the final lineup for your collection.', route: 'product?phase=selection' },
    ],
  },
  {
    phase: 'go_to_market',
    number: '04',
    title: 'Marketing & Sales',
    description: 'Content, communications, and go-to-market strategy.',
    route: 'marketing/creation',
    subBlocks: [
      { id: 'sales', label: 'Sales &\nPerformance', description: 'Revenue forecasting, drop planning, and commercial KPIs for your collection.', route: 'marketing/creation' },
      { id: 'content', label: 'Content\nCreation', description: 'Visual content per SKU: e-commerce, still life, editorial, and campaign shoots.', route: 'marketing/creation' },
      { id: 'comms', label: 'Communications\n& Brand Voice', description: 'Copy, SEO, social templates, email sequences, and brand voice.', route: 'marketing/creation' },
      { id: 'pos', label: 'Distribution\n& Retail', description: 'Connect your web store, track wholesale orders, and manage distribution.', route: 'marketing/creation' },
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

export function CollectionOverview({ plan, timeline, skuCount }: CollectionOverviewProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const milestones = timeline?.milestones || [];
  const [view, setView] = useState<ViewMode>('blocks');
  const [expandedBlock, setExpandedBlock] = useState<TimelinePhase | null>(null);
  const [animating, setAnimating] = useState(false);
  const t = useTranslation();

  // Open block sub-dashboard when ?block= param is present
  useEffect(() => {
    const blockParam = searchParams?.get('block') as TimelinePhase | null;
    if (blockParam && BLOCK_DEFS.find(b => b.phase === blockParam)) {
      setExpandedBlock(blockParam);
    }
  }, [searchParams]);

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

  const handleBlockClick = useCallback((phase: TimelinePhase) => {
    setAnimating(true);
    // Small delay so the exit animation plays before content changes
    setTimeout(() => {
      setExpandedBlock(phase);
      setTimeout(() => setAnimating(false), 50);
    }, 300);
  }, []);

  const handleBack = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setExpandedBlock(null);
      // Clear the ?block= param from URL
      router.replace(`/collection/${collectionId}`, { scroll: false });
      setTimeout(() => setAnimating(false), 50);
    }, 300);
  }, [router, collectionId]);

  const activeBlock = expandedBlock ? BLOCK_DEFS.find(b => b.phase === expandedBlock) : null;

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-16 pb-16">

        {/* ── Title area ── */}
        <div className="text-center mb-12">
          {/* Collection name — shrinks when inside a block */}
          <p className={`font-medium text-carbon/40 tracking-[-0.02em] transition-all duration-600 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeBlock ? 'text-[14px] mb-2 opacity-100' : 'text-[36px] md:text-[46px] mb-0 opacity-100 !text-carbon'
          }`}>
            {plan.name}
          </p>
          {/* Block title — appears large when inside a block */}
          <div className={`overflow-hidden transition-all duration-600 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeBlock ? 'max-h-[140px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <h2 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.2] pb-2">
              {activeBlock?.title}
            </h2>
          </div>
        </div>

        {/* ── View switch — only visible at top level ── */}
        <div className={`flex justify-center transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          expandedBlock ? 'max-h-0 opacity-0 mb-0 overflow-hidden' : 'max-h-[60px] opacity-100 mb-12'
        }`}>
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

        {/* ── Back button — only when inside a block ── */}
        <div className={`flex justify-start transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          expandedBlock ? 'max-h-[60px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0 overflow-hidden'
        }`}>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[13px] font-medium text-carbon/40 hover:text-carbon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All blocks
          </button>
        </div>

        {/* ── Cards area ── */}
        {view === 'blocks' && (
          <div className={`max-w-[1300px] mx-auto transition-all duration-600 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            animating ? 'opacity-0 scale-[0.96] translate-y-4' : 'opacity-100 scale-100 translate-y-0'
          }`}>
            {!expandedBlock ? (
              /* ═══ TOP LEVEL — 4 block cards ═══ */
              <div className="grid grid-cols-4 gap-5">
                {BLOCK_DEFS.map((block) => {
                  const progress = allBlockProgress[block.phase] || 0;
                  const isComplete = progress === 100;
                  const isStarted = progress > 0;
                  const blockIndex = BLOCK_DEFS.indexOf(block) + 1;

                  return (
                    <button
                      key={block.phase}
                      onClick={() => handleBlockClick(block.phase)}
                      className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                    >
                      <div className="mb-10">
                        <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                          0{blockIndex}.
                        </span>
                      </div>

                      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                        {block.title}
                      </h3>

                      <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                        {block.description}
                      </p>

                      <div className="flex-1" />

                      <div className="flex justify-center mt-10">
                        <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                          isComplete
                            ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
                            : 'bg-carbon text-white group-hover:bg-carbon/90'
                        }`}>
                          {isComplete ? 'Completed' : isStarted ? 'Continue' : 'Start'}
                          {!isComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                          {isComplete && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>

                      <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : activeBlock ? (
              /* ═══ SUB-LEVEL — 4 mini-block cards inside a block ═══ */
              <div className="grid grid-cols-4 gap-5">
                {activeBlock.subBlocks.map((sub, idx) => {
                  // Determine sub-block progress (simplified: check if phase milestones exist)
                  const subProgress = (() => {
                    // Map sub-block IDs to wizard phase IDs for progress tracking
                    const SUB_TO_PHASE: Record<string, string[]> = {
                      consumer: ['cr-1'], moodboard: ['cr-2'], brand: ['br-1', 'br-2', 'br-3', 'br-4'],
                      synthesis: [], families: ['rp-1', 'rp-3', 'rp-4'], channels: ['rp-2'],
                      budget: ['rp-3'], builder: ['rp-5', 'rp-6'],
                      sketch: ['dd-1', 'dd-2', 'dd-3', 'dd-4', 'dd-5', 'dd-6'],
                      prototyping: ['dd-7', 'dd-8', 'dd-9', 'dd-10'],
                      production: ['dd-15', 'dd-16', 'dd-17', 'dd-18'],
                      selection: ['dd-11', 'dd-12', 'dd-13', 'dd-14'],
                      sales: ['gm-3'], content: ['gm-4'], comms: ['gm-5'],
                      pos: ['gm-1', 'gm-2'],
                    };
                    const mIds = SUB_TO_PHASE[sub.id] || [];
                    if (mIds.length === 0) return 0;
                    const total = mIds.length;
                    const done = mIds.filter(mid =>
                      milestones.find(m => m.id === mid && m.status === 'completed')
                    ).length;
                    return total > 0 ? Math.round((done / total) * 100) : 0;
                  })();
                  const isSubComplete = subProgress === 100;
                  const isSubStarted = subProgress > 0;

                  return (
                    <Link
                      key={sub.id}
                      href={`/collection/${collectionId}/${sub.route}`}
                      className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] animate-fade-in-up"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="mb-10">
                        <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                          {activeBlock.number}.{idx + 1}
                        </span>
                      </div>

                      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-6 whitespace-pre-line">
                        {sub.label}
                      </h3>

                      <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                        {sub.description}
                      </p>

                      <div className="flex-1" />

                      {/* CTA — same system as blocks, outputs always show "Open →" */}
                      <div className="flex justify-center mt-10">
                        {sub.isOutput ? (
                          <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                            Open
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        ) : (
                          <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                            isSubComplete
                              ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
                              : 'bg-carbon text-white group-hover:bg-carbon/90'
                          }`}>
                            {isSubComplete ? 'Completed' : isSubStarted ? 'Continue' : 'Start'}
                            {!isSubComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                            {isSubComplete && <Pencil className="h-3 w-3 ml-0.5" />}
                          </div>
                        )}
                      </div>

                      {/* Progress pill — same as blocks (hidden for outputs) */}
                      {!sub.isOutput && (
                        <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out"
                            style={{ width: `${subProgress}%` }}
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : null}
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
