'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, ArrowLeft, Pencil } from 'lucide-react';
import { motion, LayoutGroup } from 'motion/react';
import type { TimelinePhase, TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';
import { computeWizardState } from '@/lib/wizard-phases';
import { useRouter } from 'next/navigation';
import { useWorkspaceNavigationOptional } from '@/components/workspace/workspace-context';
import { useTranslation } from '@/i18n';

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
    title: 'Creative Direction & Brand',
    description: 'Vision, research, and brand identity for your collection.',
    route: 'creative',
    subBlocks: [
      { id: 'consumer', label: 'Consumer\nDefinition', description: 'Define your target audience, build personas, and map their lifestyle and buying behavior.', route: 'creative?block=consumer' },
      { id: 'moodboard', label: 'Moodboard', description: 'Collect visual references and set the creative direction for your collection.', route: 'creative?block=moodboard' },
      { id: 'research', label: 'Market\nResearch', description: 'Global trends, deep dive, live signals, and competitor analysis for your season.', route: 'creative?block=research' },
      { id: 'brand', label: 'Brand\nIdentity', description: 'Codify your brand DNA, define your voice, and design your visual identity.', route: 'creative?block=brand-dna' },
      { id: 'synthesis', label: 'Creative\nOverview', description: 'Consolidate everything into a creative brief, define the collection vibe and direction.', route: 'creative?block=synthesis', isOutput: true },
    ],
  },
  {
    phase: 'planning',
    number: '02',
    title: 'Merchandising & Planning',
    description: 'Buying strategy, assortment, channels, and budget.',
    route: 'merchandising',
    subBlocks: [
      { id: 'scenarios', label: 'Buying\nStrategy', description: 'Set target SKU count and budget — AI proposes A/B/C scenarios with families and pricing.', route: 'merchandising?block=scenarios' },
      { id: 'families', label: 'Assortment\n& Pricing', description: 'Define product categories, set price architecture, and structure your segments.', route: 'merchandising?block=families' },
      { id: 'channels', label: 'Distribution', description: 'Plan your DTC and wholesale distribution across target markets.', route: 'merchandising?block=channels' },
      { id: 'budget', label: 'Financial\nPlan', description: 'Set your sales target, calculate margins, and plan sell-through rates.', route: 'merchandising?block=budget' },
      { id: 'builder', label: 'Collection\nBuilder', description: 'Build your SKU grid, validate the range plan, and organize by drops.', route: 'product', isOutput: true },
    ],
  },
  {
    phase: 'development',
    number: '03',
    title: 'Design & Development',
    description: 'Sketch, tech pack, prototype, produce, and select your collection.',
    route: 'product',
    subBlocks: [
      { id: 'sketch', label: 'Sketch\n& Color', description: 'Create sketches, define colorways, and select materials for each SKU.', route: 'product?phase=sketch' },
      { id: 'tech-pack', label: 'Tech\nPack', description: 'Technical specs, BOM, materials sourcing, and factory selection for every SKU.', route: 'product?phase=techpack' },
      { id: 'prototyping', label: 'Prototyping', description: 'Review prototypes, run fit sessions, and approve samples.', route: 'product?phase=prototyping' },
      { id: 'production', label: 'Production', description: 'Send size runs, manage factory orders, and coordinate logistics.', route: 'product?phase=production' },
      { id: 'selection', label: 'Final\nSelection', description: 'Conduct the line review and confirm the final lineup for your collection.', route: 'product?phase=selection', isOutput: true },
    ],
  },
  {
    phase: 'go_to_market',
    number: '04',
    title: 'Marketing & Sales',
    description: 'Launch plan, content, communications, and commercial performance.',
    route: 'marketing/creation',
    subBlocks: [
      { id: 'gtm', label: 'GTM &\nLaunch Plan', description: 'Pre-launch timing, press kit, content calendar, paid ads, and launch countdown.', route: 'marketing/creation?block=gtm' },
      { id: 'content', label: 'Content\nStudio', description: 'Visual content per SKU: e-commerce, still life, editorial, and campaign shoots.', route: 'marketing/creation?block=content' },
      { id: 'comms', label: 'Communications', description: 'Copy, SEO, social templates, email sequences, and brand voice.', route: 'marketing/creation?block=comms' },
      { id: 'sales', label: 'Sales\nDashboard', description: 'Revenue forecasting, drop planning, and commercial KPIs for your collection.', route: 'marketing/creation?block=sales' },
      { id: 'pos', label: 'Point\nof Sale', description: 'Connect your web store, track wholesale orders, and manage distribution.', route: 'marketing/creation?block=pos', isOutput: true },
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
  const [expandedBlock, setExpandedBlock] = useState<TimelinePhase | null>(null);
  const [animating, setAnimating] = useState(false);
  const [exitingSubIdx, setExitingSubIdx] = useState<number | null>(null);
  const workspaceNav = useWorkspaceNavigationOptional();
  const t = useTranslation();
  const ov = t.overview as Record<string, string>;

  // Localised title + description for each top-level block card. Fallback
  // to the English BLOCK_DEFS values so we don't render `undefined` when
  // a key is missing in a given locale.
  const localizedBlock = (phase: TimelinePhase): { title: string; description: string } => {
    const block = BLOCK_DEFS.find((b) => b.phase === phase)!;
    const titleKey = ({
      creative: 'block01Title',
      planning: 'block02Title',
      development: 'block03Title',
      go_to_market: 'block04Title',
    } as const)[phase];
    const descKey = ({
      creative: 'block01Desc',
      planning: 'block02Desc',
      development: 'block03Desc',
      go_to_market: 'block04Desc',
    } as const)[phase];
    return {
      title: ov[titleKey] || block.title,
      description: ov[descKey] || block.description,
    };
  };

  const ctaCopy = (state: 'completed' | 'continue' | 'start') =>
    ({
      completed: ov.completed || 'Completed',
      continue: ov.ctaContinue || 'Continue',
      start: ov.start || 'Start',
    })[state];

  // Localised label + description for each sub-block. The id matches
  // BLOCK_DEFS sub-block ids. We swap `-` for `_` when composing the
  // key because hyphens aren't valid in unquoted JS object keys (the
  // i18n source files use plain literals). Falls back to the English
  // literal so we never render `undefined` if a locale lacks a key.
  const localizedSub = (subId: string): { label: string; description: string } => {
    const allSubs = BLOCK_DEFS.flatMap((b) => b.subBlocks);
    const sub = allSubs.find((s) => s.id === subId);
    const safeId = subId.replace(/-/g, '_');
    const labelKey = `sub_${safeId}_label`;
    const descKey = `sub_${safeId}_desc`;
    return {
      label: ov[labelKey] || sub?.label || subId,
      description: ov[descKey] || sub?.description || '',
    };
  };

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

  const handleBlockClick = useCallback((phase: TimelinePhase) => {
    setAnimating(true);
    // Small delay so the exit animation plays before content changes
    setTimeout(() => {
      setExpandedBlock(phase);
      setTimeout(() => setAnimating(false), 50);
    }, 300);
  }, []);

  const handleSubCardClick = useCallback((idx: number, route: string) => {
    setExitingSubIdx(idx);
    setTimeout(() => {
      if (workspaceNav) {
        // Use WorkspaceShell state-based navigation (animated, no page flash)
        const routeBase = route.split('?')[0];
        workspaceNav.navigateToWorkspace(routeBase, route);
      } else {
        // Fallback: regular Next.js navigation
        router.push(`/collection/${collectionId}/${route}`);
      }
    }, 500);
  }, [router, collectionId, workspaceNav]);

  const handleBack = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setExpandedBlock(null);
      setExitingSubIdx(null);
      // Clear the ?block= param from URL
      router.replace(`/collection/${collectionId}`, { scroll: false });
      setTimeout(() => setAnimating(false), 50);
    }, 300);
  }, [router, collectionId]);

  const activeBlock = expandedBlock ? BLOCK_DEFS.find(b => b.phase === expandedBlock) : null;
  const isUntitled = /^Sin título|^Untitled/i.test(plan.name);
  const [titleDraft, setTitleDraft] = useState(plan.name);
  const [savingTitle, setSavingTitle] = useState(false);

  // Keep titleDraft in sync if plan.name changes externally (e.g., refetch).
  useEffect(() => {
    setTitleDraft(plan.name);
  }, [plan.name]);

  const commitTitle = useCallback(async () => {
    const next = titleDraft.trim();
    if (next.length === 0 || next === plan.name) {
      setTitleDraft(plan.name);
      return;
    }
    setSavingTitle(true);
    try {
      await fetch(`/api/collection-plans/${collectionId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      // Optimistic — the value is already shown.
    } catch {
      setTitleDraft(plan.name);
    } finally {
      setSavingTitle(false);
    }
  }, [titleDraft, plan.name, collectionId]);

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-16 lg:px-24 pt-12 md:pt-16 pb-16">

        {/* ── Title — inline-editable when collection is still "Sin título" ── */}
        <div className="text-center mb-10">
          {activeBlock ? (
            <>
              <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
                {localizedBlock(activeBlock.phase).title}
              </h1>
              <p className="text-[13px] font-medium text-carbon/40 tracking-[-0.01em] mt-2">
                {titleDraft}
              </p>
            </>
          ) : isUntitled ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setTitleDraft(plan.name);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              maxLength={120}
              autoFocus
              disabled={savingTitle}
              aria-label="Collection name"
              className="text-center w-full max-w-[820px] mx-auto bg-transparent border-0 border-b border-carbon/[0.10] focus:border-carbon/40 outline-none text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15] placeholder:text-carbon/30 transition-colors py-1"
            />
          ) : (
            <h1
              onDoubleClick={() => {
                // Allow re-rename via double click on the title.
                setTitleDraft(plan.name);
              }}
              title="Double-click to rename"
              className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15] cursor-text"
            >
              {titleDraft}
            </h1>
          )}
          {/* Season chip — derived from launch date at create-time, persisted in BD. */}
          {plan.season && !activeBlock && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-carbon/[0.04] text-[11px] font-semibold tracking-[0.18em] uppercase text-carbon/55">
                {plan.season}
              </span>
            </div>
          )}
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
            {ov.allBlocks || 'All blocks'}
          </button>
        </div>

        {/* ── Cards area ── */}
        <div className={`${expandedBlock ? 'max-w-[1600px]' : 'max-w-[1300px]'} mx-auto transition-all duration-600 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            animating ? 'opacity-0 scale-[0.96] translate-y-4' : 'opacity-100 scale-100 translate-y-0'
          }`}>
            {!expandedBlock ? (
              /* ═══ TOP LEVEL — 4 block cards, full-card colored per phase accent ═══ */
              <LayoutGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {BLOCK_DEFS.map((block) => {
                  const progress = allBlockProgress[block.phase] || 0;
                  const isComplete = progress === 100;
                  const isStarted = progress > 0;
                  const blockIndex = BLOCK_DEFS.indexOf(block) + 1;

                  // Block accent. All four are pale earth-tones now, so
                  // they share the same carbon text + carbon CTA scheme.
                  // The `80` alpha suffix (~50% opacity) is what makes
                  // the colour feel "intuited" over bg-shade rather than
                  // a vivid block of paint.
                  const accentBg = ({
                    creative: '#B6C8C780',     // sea-foam @ 50%
                    planning: '#C5CAA880',     // sage @ 50%
                    development: '#D8BAA080',  // pale clay @ 50%
                    go_to_market: '#FFF4CE80', // citronella @ 50%
                  } as const)[block.phase];

                  return (
                    <motion.button
                      key={block.phase}
                      layoutId={`block-${block.phase}`}
                      transition={{ type: 'spring', stiffness: 220, damping: 32, mass: 0.9 }}
                      onClick={() => handleBlockClick(block.phase)}
                      style={{ backgroundColor: accentBg }}
                      className="group relative rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)] text-left overflow-hidden"
                    >
                      <div className="mb-10">
                        <span className="text-[72px] font-bold leading-none tracking-[-0.04em] text-carbon/[0.12]">
                          0{blockIndex}.
                        </span>
                      </div>

                      <h3 className="text-[24px] md:text-[28px] font-semibold tracking-[-0.03em] leading-[1.15] mb-5 text-carbon">
                        {localizedBlock(block.phase).title}
                      </h3>

                      <p className="text-[14px] leading-[1.7] tracking-[-0.02em] text-carbon/60">
                        {localizedBlock(block.phase).description}
                      </p>

                      <div className="flex-1" />

                      <div className="flex justify-center mt-10">
                        <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                          isComplete
                            ? 'border border-carbon/[0.20] text-carbon group-hover:bg-carbon/[0.05]'
                            : 'bg-carbon text-crema group-hover:bg-carbon/90'
                        }`}>
                          {ctaCopy(isComplete ? 'completed' : isStarted ? 'continue' : 'start')}
                          {!isComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                          {isComplete && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>

                      <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full overflow-hidden bg-carbon/[0.10]">
                        <div
                          className="h-full rounded-full bg-carbon/45 transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              </LayoutGroup>
            ) : activeBlock ? (
              /* ═══ SUB-LEVEL — 5 mini-block cards inside a block (matches sidebar 4×5) ═══ */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {activeBlock.subBlocks.map((sub, idx) => {
                  // Determine sub-block progress (simplified: check if phase milestones exist)
                  const subProgress = (() => {
                    // Map sub-block IDs to wizard phase IDs for progress tracking
                    /* Keep in sync with MILESTONE_TO_MINI_BLOCK in timeline-template.ts.
                       SUB_TO_PHASE uses the Overview's sub-block IDs (research, brand,
                       builder, synthesis, selection, gtm, content, comms) which differ
                       from sidebar IDs; the mapping below is the translation. */
                    const SUB_TO_PHASE: Record<string, string[]> = {
                      // Creative
                      consumer: ['cr-1'], moodboard: ['cr-2'], research: ['cr-3'],
                      brand: ['br-1', 'br-2', 'br-3', 'br-4'], synthesis: ['cr-4'],
                      // Merchandising
                      scenarios: ['rp-1'], families: ['rp-4'], channels: ['rp-2'],
                      budget: ['rp-3'], builder: ['rp-5', 'rp-6'],
                      // Design & Development
                      sketch: ['dd-1', 'dd-2', 'dd-3', 'dd-4', 'dd-5', 'dd-6'],
                      'tech-pack': ['dd-19', 'dd-10'],
                      prototyping: ['dd-7', 'dd-8', 'dd-9', 'dd-11', 'dd-12', 'dd-13'],
                      production: ['dd-15', 'dd-16', 'dd-17', 'dd-18'],
                      selection: ['dd-14'],
                      // Marketing & Sales
                      gtm: ['gm-1', 'gm-10', 'gm-11', 'gm-12', 'gm-13', 'gm-14'],
                      content: ['gm-3', 'gm-5', 'gm-7'],
                      comms: ['gm-4', 'gm-6', 'gm-8', 'gm-9'],
                      sales: ['gm-15'], pos: ['gm-2'],
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
                    <button
                      key={sub.id}
                      onClick={() => handleSubCardClick(idx, sub.route)}
                      className={`group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        exitingSubIdx === null
                          ? 'animate-fade-in-up hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]'
                          : exitingSubIdx === idx
                          ? 'scale-[1.04] shadow-[0_16px_48px_rgba(0,0,0,0.10)] z-10'
                          : 'opacity-0 scale-[0.95]'
                      }`}
                      style={{ animationDelay: exitingSubIdx === null ? `${idx * 100}ms` : '0ms' }}
                    >
                      <div className="mb-10">
                        <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                          {activeBlock.number}.{idx + 1}
                        </span>
                      </div>

                      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-6 whitespace-pre-line">
                        {localizedSub(sub.id).label}
                      </h3>

                      <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                        {localizedSub(sub.id).description}
                      </p>

                      <div className="flex-1" />

                      {/* CTA — same system as blocks, outputs always show "Open →" */}
                      <div className="flex justify-center mt-10">
                        {sub.isOutput ? (
                          <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                            {ov.openCta || 'Open'}
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        ) : (
                          <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                            isSubComplete
                              ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
                              : 'bg-carbon text-white group-hover:bg-carbon/90'
                          }`}>
                            {ctaCopy(isSubComplete ? 'completed' : isSubStarted ? 'continue' : 'start')}
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
                    </button>
                  );
                })}
              </div>
            ) : null}
        </div>
      </div>
    </div>
  );
}
