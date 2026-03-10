'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  DEFAULT_MILESTONES,
  PHASES,
  PHASE_ORDER,
  getMilestoneDate,
  getMilestoneEndDate,
} from '@/lib/timeline-template';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { TimelinePhase } from '@/types/timeline';

/* ═══════════════════════════════════════════════════════════
   DYNAMIC SEASONS — generate from current date + 2 years
   ═══════════════════════════════════════════════════════════ */

function generateSeasons(): { id: string; label: string; launch: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const seasons: { id: string; label: string; launch: string }[] = [];

  for (let year = currentYear; year <= currentYear + 2; year++) {
    if (year > currentYear || currentMonth < 6) {
      seasons.push({
        id: `SS${String(year).slice(2)}`,
        label: `SS ${String(year).slice(2)}`,
        launch: `${year}-02-01`,
      });
    }
    seasons.push({
      id: `FW${String(year).slice(2)}`,
      label: `FW ${String(year).slice(2)}`,
      launch: `${year}-09-01`,
    });
  }

  return seasons.filter((s) => new Date(s.launch) > now);
}

/* ═══════════════════════════════════════════════════════════
   OPTIONS
   ═══════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id: 'clothing', label: 'Clothing' },
  { id: 'footwear', label: 'Footwear' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'mixed', label: 'Mixed' },
];

const COLLECTION_SIZES = [
  { id: 'capsule', label: 'Capsule', sublabel: '5–15 SKUs' },
  { id: 'medium', label: 'Medium', sublabel: '15–30 SKUs' },
  { id: 'full', label: 'Full', sublabel: '30+ SKUs' },
];

const DISTRIBUTIONS = [
  { id: 'dtc', label: 'DTC Only' },
  { id: 'wholesale', label: 'Wholesale' },
  { id: 'both', label: 'Both' },
];

/* ═══════════════════════════════════════════════════════════
   PHASE QUESTIONS — category-aware YES/NO
   YES → mark related milestones as "completed" (already done)
   NO  → milestones stay "pending" (work to do)
   ═══════════════════════════════════════════════════════════ */

type CategoryType = 'clothing' | 'footwear' | 'accessories' | 'mixed';

interface PhaseQuestion {
  id: string;
  phase: TimelinePhase;
  getTitle: (category: CategoryType) => string;
  subtitle?: string;
  milestones: string[];
  skipFor?: CategoryType[];
}

const PHASE_QUESTIONS: PhaseQuestion[] = [
  // ── Product & Merchandising ──
  { id: 'q-ow-range', phase: 'olawave', getTitle: () => 'Do you have a product range plan?', subtitle: 'Trend research, moodboarding, and range strategy', milestones: ['ow-1', 'ow-2'] },
  { id: 'q-ow-skus', phase: 'olawave', getTitle: () => 'Do you have SKU definitions?', subtitle: 'Collection planning with specific SKUs defined', milestones: ['ow-3'] },
  { id: 'q-ow-sketches', phase: 'olawave', getTitle: () => 'Do you have technical sketches?', milestones: ['ow-5'] },
  { id: 'q-ow-gtm', phase: 'olawave', getTitle: () => 'Do you have a go-to-market strategy?', milestones: ['ow-4'] },

  // ── Brand & Identity ──
  { id: 'q-br-brand', phase: 'brand', getTitle: () => 'Do you already have a brand?', subtitle: 'Brand naming, logo, visual identity, and guidelines', milestones: ['br-1', 'br-2', 'br-3'] },
  { id: 'q-br-packaging', phase: 'brand', getTitle: () => 'Do you have packaging design?', milestones: ['br-4'] },

  // ── Design & Development ──
  { id: 'q-ds-lasts', phase: 'design', getTitle: (cat) => cat === 'footwear' ? 'Do you have lasts/forms defined?' : 'Do you have base patterns/blocks defined?', skipFor: ['accessories'], milestones: ['ds-1'] },
  { id: 'q-ds-rounds', phase: 'design', getTitle: () => 'Have you completed design rounds?', subtitle: 'Design shots, paper patterns, and iterations', milestones: ['ds-2', 'ds-3', 'ds-4'] },
  { id: 'q-ds-colorways', phase: 'design', getTitle: () => 'Are colorways developed?', milestones: ['ds-5'] },

  // ── Prototyping ──
  { id: 'q-pt-protos', phase: 'prototyping', getTitle: (cat) => cat === 'footwear' ? 'Have white protos been developed?' : 'Have first samples/toiles been made?', milestones: ['pt-1', 'pt-2'] },
  { id: 'q-pt-techsheets', phase: 'prototyping', getTitle: () => 'Are tech sheets complete?', subtitle: 'Rectification and technical sheets finalized', milestones: ['pt-3', 'pt-4'] },

  // ── Sampling ──
  { id: 'q-sm-color', phase: 'sampling', getTitle: () => 'Do you have approved color samples?', milestones: ['sm-1'] },
  { id: 'q-sm-fitting', phase: 'sampling', getTitle: () => 'Do you have approved fitting samples?', subtitle: 'Fitting development, confirmation, and collection completion', milestones: ['sm-2', 'sm-3', 'sm-4'] },

  // ── Digital Presence ──
  { id: 'q-dg-website', phase: 'digital', getTitle: () => 'Do you have a website?', subtitle: 'Website design, development, and e-commerce setup', milestones: ['dg-1', 'dg-2'] },
  { id: 'q-dg-photography', phase: 'digital', getTitle: () => 'Do you have product photography?', milestones: ['dg-3'] },
  { id: 'q-dg-copy', phase: 'digital', getTitle: () => 'Do you have your brand copy written?', subtitle: 'Copywriting and brand story', milestones: ['dg-5'] },
  { id: 'q-dg-lookbook', phase: 'digital', getTitle: () => 'Do you have a lookbook?', milestones: ['dg-4'] },

  // ── Marketing ──
  { id: 'q-mk-social', phase: 'marketing', getTitle: () => 'Do you have social media set up?', milestones: ['mk-1'] },
  { id: 'q-mk-calendar', phase: 'marketing', getTitle: () => 'Do you have a content calendar?', milestones: ['mk-2'] },
  { id: 'q-mk-pr', phase: 'marketing', getTitle: () => 'Do you have influencer/PR relationships?', milestones: ['mk-3', 'mk-6'] },
  { id: 'q-mk-email', phase: 'marketing', getTitle: () => 'Do you have email marketing set up?', milestones: ['mk-4'] },

  // ── Production ──
  { id: 'q-pd-orders', phase: 'production', getTitle: () => 'Have production orders been placed?', milestones: ['pd-1'] },
  { id: 'q-pd-underway', phase: 'production', getTitle: () => 'Is production underway?', milestones: ['pd-2'] },

  // ── Launch — no questions (always pending) ──
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatShort(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function weeksFromNow(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function NewCollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  // ── Setup state ──
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [category, setCategory] = useState<CategoryType | ''>('');
  const [collectionSize, setCollectionSize] = useState('');
  const [distribution, setDistribution] = useState('');
  const [launchDate, setLaunchDate] = useState('');

  // ── Phase question answers ──
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
  const [manualToggles, setManualToggles] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  // ── Dynamic data ──
  const SEASONS = useMemo(generateSeasons, []);

  const filteredQuestions = useMemo(() => {
    if (!category) return PHASE_QUESTIONS;
    return PHASE_QUESTIONS.filter((q) => {
      if (q.skipFor?.includes(category as CategoryType)) return false;
      return true;
    });
  }, [category]);

  /* Step layout:
     0: name | 1: season | 2: category | 3: collection size | 4: distribution | 5: launch date
     6..6+N-1: phase questions
     6+N: calendar summary / confirm */
  const SETUP_STEPS = 6;
  const QUESTION_STEPS = filteredQuestions.length;
  const TOTAL_STEPS = SETUP_STEPS + QUESTION_STEPS + 1;

  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), [TOTAL_STEPS]);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const handleAnswer = useCallback((question: PhaseQuestion, yes: boolean) => {
    if (yes) {
      setCompletedMilestones((prev) => {
        const n = new Set(prev);
        question.milestones.forEach((m) => n.add(m));
        return n;
      });
    }
    next();
  }, [next]);

  const toggleMilestoneSummary = useCallback((id: string) => {
    setManualToggles((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const isMilestoneCompleted = useCallback((id: string) => {
    return completedMilestones.has(id) !== manualToggles.has(id);
  }, [completedMilestones, manualToggles]);

  const togglePhaseExpand = useCallback((phaseId: string) => {
    setExpandedPhases((prev) => {
      const n = new Set(prev);
      if (n.has(phaseId)) n.delete(phaseId); else n.add(phaseId);
      return n;
    });
  }, []);

  const canAdvance = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 5) return launchDate.length > 0;
    return true;
  }, [step, name, launchDate]);

  const isAutoAdvanceStep = step >= 1 && step <= 4;
  const isQuestionStep = step >= SETUP_STEPS && step < SETUP_STEPS + QUESTION_STEPS;
  const isSummaryStep = step === TOTAL_STEPS - 1;

  const earliestDate = useMemo(() => {
    if (!launchDate) return null;
    const maxWeeks = Math.max(...DEFAULT_MILESTONES.map((m) => m.startWeeksBefore));
    return getMilestoneDate(launchDate, maxWeeks);
  }, [launchDate]);

  /* ── Create collection ── */
  const handleCreate = async () => {
    if (!user) { setShowAuth(true); return; }
    setCreating(true);

    const milestones = DEFAULT_MILESTONES.map((m) => ({
      ...m,
      status: isMilestoneCompleted(m.id) ? ('completed' as const) : ('pending' as const),
    }));

    try {
      const res = await fetch('/api/planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          season,
          setup_data: {
            productCategory: category,
            collectionSize,
            distribution,
            workspace_config: {},
          },
          user_id: user.id,
          launch_date: launchDate,
          milestones,
        }),
      });
      const data = await res.json();
      if (data.id) router.push(`/collection/${data.id}`);
    } catch (error) {
      console.error('Error creating collection:', error);
      setCreating(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER STEPS
     ═══════════════════════════════════════════════════════════ */

  const renderName = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Name your collection</h1>
      <p className="text-texto/40 text-sm mb-14">Give it a name that inspires you</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Summer Essentials 2027"
        className="w-full max-w-md text-center text-2xl font-light text-texto bg-transparent border-b-2 border-gris/30 focus:border-carbon outline-none pb-3 placeholder:text-texto/20 transition-colors"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && canAdvance && next()}
      />
    </div>
  );

  const renderSeason = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Which season?</h1>
      <p className="text-texto/40 text-sm mb-14">Select the target season</p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {SEASONS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSeason(s.id); if (!launchDate) setLaunchDate(s.launch); next(); }}
            className={`py-5 text-sm font-medium tracking-[0.15em] uppercase transition-all ${season === s.id ? 'bg-carbon text-crema' : 'border border-gris/30 text-texto hover:border-carbon'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCategory = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">What are you making?</h1>
      <p className="text-texto/40 text-sm mb-14">This affects terminology throughout your workspace</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCategory(c.id as CategoryType); next(); }}
            className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${category === c.id ? 'bg-carbon text-crema' : 'border border-gris/30 text-texto hover:border-carbon'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCollectionSize = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">How big is your collection?</h1>
      <p className="text-texto/40 text-sm mb-14">This helps plan your timeline</p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        {COLLECTION_SIZES.map((s) => (
          <button
            key={s.id}
            onClick={() => { setCollectionSize(s.id); next(); }}
            className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${collectionSize === s.id ? 'bg-carbon text-crema' : 'border border-gris/30 text-texto hover:border-carbon'}`}
          >
            <span>{s.label}</span>
            <span className="block text-[10px] mt-1 font-normal tracking-normal normal-case opacity-50">{s.sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderDistribution = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">How will you sell?</h1>
      <p className="text-texto/40 text-sm mb-14">Select your distribution strategy</p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        {DISTRIBUTIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => { setDistribution(d.id); next(); }}
            className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${distribution === d.id ? 'bg-carbon text-crema' : 'border border-gris/30 text-texto hover:border-carbon'}`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderLaunchDate = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">When do you launch?</h1>
      <p className="text-texto/40 text-sm mb-14">Your work calendar counts backwards from here</p>
      <input
        type="date"
        value={launchDate}
        onChange={(e) => setLaunchDate(e.target.value)}
        className="text-center text-xl font-light text-texto border border-gris/30 focus:border-carbon outline-none px-8 py-4 bg-transparent transition-colors"
      />
      {launchDate && (
        <div className="mt-6 space-y-1 text-center">
          <p className="text-texto/30 text-sm">{weeksFromNow(launchDate)} weeks from today</p>
          {earliestDate && (
            <p className="text-texto/30 text-sm">
              Work starts around{' '}
              <span className="text-texto/50 font-medium">
                {earliestDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderPhaseQuestion = (questionIndex: number) => {
    const question = filteredQuestions[questionIndex];
    if (!question) return null;

    const prevQuestion = questionIndex > 0 ? filteredQuestions[questionIndex - 1] : null;
    const isNewPhase = !prevQuestion || prevQuestion.phase !== question.phase;
    const phase = PHASES[question.phase];

    return (
      <div className="flex flex-col items-center animate-fade-in-up">
        {isNewPhase && (
          <div className="text-xs text-texto/25 uppercase tracking-[0.2em] mb-6">{phase.name}</div>
        )}
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2 text-center max-w-lg">
          {question.getTitle((category || 'mixed') as CategoryType)}
        </h1>
        {question.subtitle && (
          <p className="text-texto/40 text-sm mb-14 text-center max-w-md">{question.subtitle}</p>
        )}
        {!question.subtitle && <div className="mb-14" />}
        <div className="flex gap-4 w-full max-w-xs">
          <button
            onClick={() => handleAnswer(question, true)}
            className="flex-1 py-8 text-sm font-medium tracking-[0.15em] uppercase border border-gris/30 text-texto hover:bg-carbon hover:text-crema transition-all"
          >
            Yes
          </button>
          <button
            onClick={() => handleAnswer(question, false)}
            className="flex-1 py-8 text-sm font-medium tracking-[0.15em] uppercase border border-gris/30 text-texto hover:bg-carbon hover:text-crema transition-all"
          >
            Not yet
          </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="flex flex-col items-center animate-fade-in-up w-full max-w-lg mx-auto">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Your collection plan</h1>
      <p className="text-texto/40 text-sm mb-4">Review and adjust before creating</p>

      {/* Setup summary */}
      <div className="w-full space-y-0 mb-8">
        {[
          ['Name', name],
          ['Season', season],
          ['Category', category.charAt(0).toUpperCase() + category.slice(1)],
          ['Size', COLLECTION_SIZES.find((s) => s.id === collectionSize)?.label || collectionSize],
          ['Distribution', DISTRIBUTIONS.find((d) => d.id === distribution)?.label || distribution],
          ['Launch', new Date(launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-3 border-b border-gris/15">
            <span className="text-xs text-texto/30 uppercase tracking-[0.15em]">{label}</span>
            <span className="text-sm text-texto font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Earliest start */}
      {earliestDate && (
        <div className="w-full text-center mb-8">
          <p className="text-xs text-texto/30 uppercase tracking-[0.15em] mb-1">Work starts</p>
          <p className="text-sm text-texto font-medium">
            {earliestDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}

      {/* Phase breakdown — expandable */}
      <div className="w-full space-y-1 mb-10">
        {PHASE_ORDER.map((phaseId) => {
          const phase = PHASES[phaseId];
          const milestones = DEFAULT_MILESTONES.filter((m) => m.phase === phaseId);
          const pendingCount = milestones.filter((m) => !isMilestoneCompleted(m.id)).length;
          const allDone = pendingCount === 0;
          const isExpanded = expandedPhases.has(phaseId);

          return (
            <div key={phaseId} className="border border-gris/15">
              <button
                onClick={() => togglePhaseExpand(phaseId)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gris/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-texto/25" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-texto/25" />
                  )}
                  <span className="text-sm text-texto font-medium">{phase.name}</span>
                </div>
                {allDone ? (
                  <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Done</span>
                ) : (
                  <span className="text-xs text-texto/30">{pendingCount} pending</span>
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gris/10 px-4 py-2 space-y-1">
                  {milestones.map((m) => {
                    const isCompleted = isMilestoneCompleted(m.id);
                    const startDate = getMilestoneDate(launchDate, m.startWeeksBefore);
                    const endDate = getMilestoneEndDate(launchDate, m.startWeeksBefore, m.durationWeeks);

                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMilestoneSummary(m.id)}
                        className="w-full flex items-center gap-3 py-2 text-left"
                      >
                        <div className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isCompleted ? 'border-carbon bg-carbon' : 'border-gris/40'}`}>
                          {isCompleted && <Check className="h-2.5 w-2.5 text-crema" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${isCompleted ? 'text-texto/40 line-through' : 'text-texto'}`}>{m.name}</p>
                        </div>
                        <p className="text-[10px] text-texto/20 flex-shrink-0">
                          {formatShort(startDate)} — {formatShort(endDate)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={creating}
        className="inline-flex items-center gap-3 px-12 py-4 bg-carbon text-crema text-sm font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-50"
      >
        {creating ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
        ) : (
          <><span>Create Collection</span><ArrowRight className="h-4 w-4" /></>
        )}
      </button>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     STEP ROUTER
     ═══════════════════════════════════════════════════════════ */

  const renderStep = () => {
    if (step === 0) return renderName();
    if (step === 1) return renderSeason();
    if (step === 2) return renderCategory();
    if (step === 3) return renderCollectionSize();
    if (step === 4) return renderDistribution();
    if (step === 5) return renderLaunchDate();

    const questionIndex = step - SETUP_STEPS;
    if (questionIndex >= 0 && questionIndex < QUESTION_STEPS) {
      return renderPhaseQuestion(questionIndex);
    }

    if (step === TOTAL_STEPS - 1) return renderSummary();
    return null;
  };

  /* ═══════════════════════════════════════════════════════════
     LOADING
     ═══════════════════════════════════════════════════════════ */

  if (authLoading) {
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/40" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN LAYOUT
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-crema flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-crema">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex h-20 items-center justify-between">
            <Image
              src="/images/olawave-logo-black.png"
              alt="OLAWAVE AI"
              width={120}
              height={30}
              className="object-contain h-6 w-auto"
            />
            <button
              onClick={() => router.push('/my-collections')}
              className="text-xs text-texto/30 hover:text-texto transition-colors uppercase tracking-[0.15em]"
            >
              Cancel
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-px bg-gris/20">
            <div
              className="h-px bg-carbon transition-all duration-700 ease-out"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-32">
        <div className="w-full max-w-2xl" key={step}>
          {renderStep()}
        </div>
      </div>

      {/* Footer nav — only for non-auto-advance setup steps (name, launch date) */}
      {!isAutoAdvanceStep && !isQuestionStep && !isSummaryStep && (
        <div className="fixed bottom-0 left-0 right-0 bg-crema pb-10 pt-6">
          <div className="max-w-2xl mx-auto px-6 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={back} className="inline-flex items-center gap-2 text-sm text-texto/30 hover:text-texto transition-colors">
                <ArrowLeft className="h-4 w-4" />Back
              </button>
            ) : <div />}
            <button
              onClick={next}
              disabled={!canAdvance}
              className="inline-flex items-center gap-2 px-8 py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-20"
            >
              Next<ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Back button for question + summary steps */}
      {(isQuestionStep || isSummaryStep) && step > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-crema pb-10 pt-6">
          <div className="max-w-2xl mx-auto px-6">
            <button onClick={back} className="inline-flex items-center gap-2 text-sm text-texto/30 hover:text-texto transition-colors">
              <ArrowLeft className="h-4 w-4" />Back
            </button>
          </div>
        </div>
      )}

      {/* Auth modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={handleCreate} defaultMode="signup" />
    </div>
  );
}
