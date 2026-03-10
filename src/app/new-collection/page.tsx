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
} from 'lucide-react';
import type { TimelinePhase } from '@/types/timeline';

/* ── Options ── */

const SEASONS = [
  { id: 'SS26', label: 'SS 26', launch: '2026-02-01' },
  { id: 'FW26', label: 'FW 26', launch: '2026-09-01' },
  { id: 'SS27', label: 'SS 27', launch: '2027-02-01' },
  { id: 'FW27', label: 'FW 27', launch: '2027-09-01' },
  { id: 'SS28', label: 'SS 28', launch: '2028-02-01' },
  { id: 'FW28', label: 'FW 28', launch: '2028-09-01' },
];

const CATEGORIES = [
  { id: 'clothing', label: 'Clothing' },
  { id: 'footwear', label: 'Footwear' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'mixed', label: 'Mixed' },
];

/* ── Steps ── */

const SETUP_STEPS = 4; // name, season, category, launch date
const PHASE_STEPS = PHASE_ORDER.length; // 9 phases
const TOTAL_STEPS = SETUP_STEPS + PHASE_STEPS + 1; // +1 for confirm

/* ── Helpers ── */

function formatShort(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function weeksFromNow(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
}

/* ── Component ── */

export default function NewCollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [category, setCategory] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [excludedMilestones, setExcludedMilestones] = useState<Set<string>>(
    new Set()
  );
  const [creating, setCreating] = useState(false);

  /* Navigation */
  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const back = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  /* Toggle milestone */
  const toggleMilestone = useCallback((id: string) => {
    setExcludedMilestones((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  /* Milestones for phase */
  const getMilestonesForPhase = useCallback((phaseId: TimelinePhase) => {
    return DEFAULT_MILESTONES.filter((m) => m.phase === phaseId);
  }, []);

  /* Can advance? */
  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return season.length > 0;
      case 2:
        return category.length > 0;
      case 3:
        return launchDate.length > 0;
      default:
        return true;
    }
  }, [step, name, season, category, launchDate]);

  /* Auto-advance steps (season, category) */
  const isAutoAdvanceStep = step === 1 || step === 2;

  /* Create collection */
  const handleCreate = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setCreating(true);

    const filteredMilestones = DEFAULT_MILESTONES.filter(
      (m) => !excludedMilestones.has(m.id)
    ).map((m) => ({ ...m, status: 'pending' as const }));

    try {
      const res = await fetch('/api/planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          season,
          setup_data: { productCategory: category },
          user_id: user.id,
          launch_date: launchDate,
          milestones: filteredMilestones,
        }),
      });

      const data = await res.json();
      if (data.id) {
        router.push(`/collection/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      setCreating(false);
    }
  };

  /* ── Render helpers ── */

  const renderName = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
        Name your collection
      </h1>
      <p className="text-texto/40 text-sm mb-14">
        Give it a name that inspires you
      </p>
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
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
        Which season?
      </h1>
      <p className="text-texto/40 text-sm mb-14">
        Select the target season
      </p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {SEASONS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSeason(s.id);
              if (!launchDate) setLaunchDate(s.launch);
              next();
            }}
            className={`py-5 text-sm font-medium tracking-[0.15em] uppercase transition-all ${
              season === s.id
                ? 'bg-carbon text-crema'
                : 'border border-gris/30 text-texto hover:border-carbon'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCategory = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
        What are you making?
      </h1>
      <p className="text-texto/40 text-sm mb-14">
        Select your product category
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id);
              next();
            }}
            className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${
              category === c.id
                ? 'bg-carbon text-crema'
                : 'border border-gris/30 text-texto hover:border-carbon'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderLaunchDate = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
        When do you launch?
      </h1>
      <p className="text-texto/40 text-sm mb-14">
        Your work calendar counts backwards from here
      </p>
      <input
        type="date"
        value={launchDate}
        onChange={(e) => setLaunchDate(e.target.value)}
        className="text-center text-xl font-light text-texto border border-gris/30 focus:border-carbon outline-none px-8 py-4 bg-transparent transition-colors"
      />
      {launchDate && (
        <p className="mt-6 text-texto/30 text-sm">
          {weeksFromNow(launchDate)} weeks from today
        </p>
      )}
    </div>
  );

  const renderPhase = (phaseIndex: number) => {
    const phaseId = PHASE_ORDER[phaseIndex];
    const phase = PHASES[phaseId];
    const milestones = getMilestonesForPhase(phaseId);
    const activeCount = milestones.filter(
      (m) => !excludedMilestones.has(m.id)
    ).length;

    return (
      <div className="flex flex-col items-center w-full max-w-lg animate-fade-in-up">
        <div className="text-xs text-texto/25 uppercase tracking-[0.2em] mb-4">
          Phase {phaseIndex + 1} of {PHASE_STEPS}
        </div>
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
          {phase.name}
        </h1>
        <p className="text-texto/40 text-sm mb-10">
          {activeCount} of {milestones.length} milestones active
        </p>

        <div className="w-full space-y-2">
          {milestones.map((m) => {
            const isExcluded = excludedMilestones.has(m.id);
            const startDate = getMilestoneDate(launchDate, m.startWeeksBefore);
            const endDate = getMilestoneEndDate(
              launchDate,
              m.startWeeksBefore,
              m.durationWeeks
            );

            return (
              <button
                key={m.id}
                onClick={() => toggleMilestone(m.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all ${
                  isExcluded
                    ? 'opacity-30'
                    : 'border border-gris/20'
                }`}
              >
                <div
                  className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isExcluded
                      ? 'border-gris/40'
                      : 'border-carbon bg-carbon'
                  }`}
                >
                  {!isExcluded && (
                    <Check className="h-3 w-3 text-crema" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isExcluded
                        ? 'text-texto/40 line-through'
                        : 'text-texto'
                    }`}
                  >
                    {m.name}
                  </p>
                  <p className="text-xs text-texto/25 mt-0.5">
                    {formatShort(startDate)} — {formatShort(endDate)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderConfirm = () => {
    const activeCount = DEFAULT_MILESTONES.filter(
      (m) => !excludedMilestones.has(m.id)
    ).length;

    return (
      <div className="flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
          Ready to go
        </h1>
        <p className="text-texto/40 text-sm mb-14">
          Review your collection setup
        </p>

        <div className="w-full max-w-sm space-y-0 mb-14">
          {[
            ['Name', name],
            ['Season', season],
            ['Category', category.charAt(0).toUpperCase() + category.slice(1)],
            [
              'Launch',
              new Date(launchDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
            ],
            ['Milestones', `${activeCount} active`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-4 border-b border-gris/15"
            >
              <span className="text-xs text-texto/30 uppercase tracking-[0.15em]">
                {label}
              </span>
              <span className="text-sm text-texto font-medium">{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-3 px-12 py-4 bg-carbon text-crema text-sm font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-50"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create Collection
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    );
  };

  /* ── Step router ── */

  const renderStep = () => {
    if (step === 0) return renderName();
    if (step === 1) return renderSeason();
    if (step === 2) return renderCategory();
    if (step === 3) return renderLaunchDate();

    const phaseIndex = step - SETUP_STEPS;
    if (phaseIndex >= 0 && phaseIndex < PHASE_STEPS) {
      return renderPhase(phaseIndex);
    }

    if (step === TOTAL_STEPS - 1) return renderConfirm();
    return null;
  };

  /* ── Loading ── */

  if (authLoading) {
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/40" />
      </div>
    );
  }

  /* ── Main layout ── */

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

      {/* Footer nav */}
      {step < TOTAL_STEPS - 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-crema pb-10 pt-6">
          <div className="max-w-2xl mx-auto px-6 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={back}
                className="inline-flex items-center gap-2 text-sm text-texto/30 hover:text-texto transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {!isAutoAdvanceStep && (
              <button
                onClick={next}
                disabled={!canAdvance}
                className="inline-flex items-center gap-2 px-8 py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-20"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auth modal for unauthenticated users */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleCreate}
        defaultMode="signup"
      />
    </div>
  );
}
