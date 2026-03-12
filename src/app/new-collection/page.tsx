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
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

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
  { id: 'bags', label: 'Bags' },
  { id: 'jewelry', label: 'Jewelry' },
  { id: 'eyewear', label: 'Eyewear' },
  { id: 'swimwear', label: 'Swimwear' },
  { id: 'activewear', label: 'Activewear' },
  { id: 'denim', label: 'Denim' },
  { id: 'socks', label: 'Socks' },
  { id: 'hats', label: 'Hats' },
  { id: 'scarves', label: 'Scarves' },
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
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [collectionSize, setCollectionSize] = useState('');
  const [distribution, setDistribution] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  // ── Dynamic data ──
  const SEASONS = useMemo(generateSeasons, []);

  // Derive primary category for workspace terminology
  const primaryCategory = useMemo(() => {
    if (categories.has('footwear')) return 'footwear';
    if (categories.has('clothing') || categories.has('denim') || categories.has('swimwear') || categories.has('activewear')) return 'clothing';
    if (categories.size > 0) return 'accessories';
    return 'mixed';
  }, [categories]);

  /* Step layout: 0-5 setup, 6 summary = 7 total */
  const TOTAL_STEPS = 7;

  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const togglePhaseExpand = useCallback((phaseId: string) => {
    setExpandedPhases((prev) => {
      const n = new Set(prev);
      if (n.has(phaseId)) n.delete(phaseId); else n.add(phaseId);
      return n;
    });
  }, []);

  const canAdvance = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) return categories.size > 0;
    if (step === 5) return launchDate.length > 0;
    return true;
  }, [step, name, categories.size, launchDate]);

  // Steps 1, 3, 4 are auto-advance (season, size, distribution)
  const isAutoAdvanceStep = step === 1 || step === 3 || step === 4;
  const isSummaryStep = step === TOTAL_STEPS - 1;

  const earliestDate = useMemo(() => {
    if (!launchDate) return null;
    const maxWeeks = Math.max(...DEFAULT_MILESTONES.map((m) => m.startWeeksBefore));
    return getMilestoneDate(launchDate, maxWeeks);
  }, [launchDate]);

  /* ── Create collection — all milestones start as pending ── */
  const handleCreate = async () => {
    if (!user) { setShowAuth(true); return; }
    setCreating(true);

    const milestones = DEFAULT_MILESTONES.map((m) => ({
      ...m,
      status: 'pending' as const,
    }));

    try {
      const res = await fetch('/api/planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          season,
          setup_data: {
            productCategory: primaryCategory,
            productCategories: Array.from(categories),
            collectionSize,
            distribution,
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

  const toggleCategory = (id: string) => {
    setCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderCategory = () => (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">What are you making?</h1>
      <p className="text-texto/40 text-sm mb-14">Select all that apply</p>
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-md">
        {CATEGORIES.map((c) => {
          const isSelected = categories.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={`relative py-5 text-xs font-medium tracking-[0.12em] uppercase transition-all ${isSelected ? 'bg-carbon text-crema' : 'border border-gris/30 text-texto hover:border-carbon'}`}
            >
              {isSelected && (
                <Check className="absolute top-1.5 right-1.5 h-3 w-3 text-crema/60" />
              )}
              {c.label}
            </button>
          );
        })}
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

  const renderSummary = () => (
    <div className="flex flex-col items-center animate-fade-in-up w-full max-w-lg mx-auto">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">Your collection plan</h1>
      <p className="text-texto/40 text-sm mb-4">Review before creating</p>

      {/* Setup summary */}
      <div className="w-full space-y-0 mb-8">
        {[
          ['Name', name],
          ['Season', season],
          ['Category', Array.from(categories).map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')],
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

      {/* Timeline overview — expandable phases (read-only) */}
      <div className="w-full space-y-1 mb-10">
        {PHASE_ORDER.map((phaseId) => {
          const phase = PHASES[phaseId];
          const milestones = DEFAULT_MILESTONES.filter((m) => m.phase === phaseId);
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
                <span className="text-xs text-texto/30">{milestones.length} milestones</span>
              </button>

              {isExpanded && (
                <div className="border-t border-gris/10 px-4 py-2 space-y-1">
                  {milestones.map((m) => {
                    const startDate = getMilestoneDate(launchDate, m.startWeeksBefore);
                    const endDate = getMilestoneEndDate(launchDate, m.startWeeksBefore, m.durationWeeks);

                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2">
                        <div className="w-2 h-2 rounded-full bg-gris/30 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-texto">{m.name}</p>
                        </div>
                        <p className="text-[10px] text-texto/20 flex-shrink-0">
                          {formatShort(startDate)} — {formatShort(endDate)}
                        </p>
                      </div>
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
    if (step === 6) return renderSummary();
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
    <SubscriptionGate>
    <div className="min-h-screen bg-crema flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-crema">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex h-20 items-center justify-between">
            <Image
              src="/images/aimily-logo-black.png"
              alt="aimily"
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

      {/* Footer nav — only for non-auto-advance setup steps */}
      {!isAutoAdvanceStep && !isSummaryStep && (
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

      {/* Back button for summary step */}
      {isSummaryStep && (
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
    </SubscriptionGate>
  );
}
