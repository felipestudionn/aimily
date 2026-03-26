'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { Navbar } from '@/components/layout/navbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthModal } from '@/components/auth/AuthModal';
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Sparkles,
  Search,
  Zap,
  MessageSquare,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

interface BriefUnderstanding {
  productType: string;
  styleDirection: string;
  brandStatus: string;
  pricePositioning: string;
  estimatedPriceRange: { min: number; max: number; currency: string };
  production: string;
  markets: string[];
  channels: string[];
  consumer: string;
  season: string | null;
  ambition: string;
  aestheticReferences: string[];
  additionalContext: string[];
}

interface BriefQuestion {
  id: string;
  question: string;
  why: string;
  type: 'text' | 'choice';
  options?: string[];
  priority: 'essential' | 'helpful';
}

interface BriefAssumption {
  assumption: string;
  basis: string;
}

interface AnalysisResult {
  understood: BriefUnderstanding;
  assumptions: BriefAssumption[];
  questions: BriefQuestion[];
  researchNeeded: string[];
}

interface ScenarioFamily {
  name: string;
  count: number;
  description: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  skuCount: number;
  families: ScenarioFamily[];
  priceArchitecture: {
    min: number;
    max: number;
    avg: number;
    pricePoints: { family: string; retail: number; cogs: number; margin: number }[];
  };
  financials: {
    productionBudget: number;
    marketingBudget: number;
    totalInvestment: number;
    firstYearSalesTarget: number;
    breakEvenUnits: number;
  };
  timeline: string;
  risks: string[];
  bestFor: string;
}

interface ScenariosResult {
  marketInsights: {
    competitorLandscape: string;
    priceBenchmarks: string;
    trendContext: string;
    marketOpportunity: string;
  };
  scenarios: Scenario[];
  recommendation: string;
}

/* ═══════════════════════════════════════════════════════════
   Step indicators
   ═══════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 'brief', icon: MessageSquare },
  { id: 'understand', icon: Sparkles },
  { id: 'research', icon: Search },
  { id: 'generate', icon: Zap },
  { id: 'review', icon: Check },
];

/* ═══════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════ */

export default function BriefToCollectionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslation();
  const { language } = useLanguage();
  const [authOpen, setAuthOpen] = useState(false);

  // Step state
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scenariosResult, setScenariosResult] = useState<ScenariosResult | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  // Brief labels
  const bt = (t as Record<string, Record<string, string>>).briefToCollection || {};

  /* ── API calls ── */

  const analyzeBrief = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadingMessage(bt.analyzing || 'Analyzing your vision...');
    try {
      const res = await fetch('/api/ai/brief/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, language }),
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const errData = await res.json(); errMsg = errData?.error || errMsg; } catch { /* non-JSON */ }
        throw new Error(errMsg);
      }
      const { result } = await res.json();
      if (!result?.understood) throw new Error('Invalid analysis response');
      setAnalysis(result);
      // Pre-fill answers with empty strings
      const initAnswers: Record<string, string> = {};
      (result.questions || []).forEach((q: BriefQuestion) => { initAnswers[q.id] = ''; });
      setAnswers(initAnswers);
      setStep(1);
    } catch {
      setError(bt.errorAnalyze || 'Could not analyze your brief. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brief, language, bt]);

  const fetchScenarios = useCallback(async () => {
    if (!analysis) return;
    setLoading(true);
    setError('');
    setLoadingMessage(bt.researching || 'Researching the market...');
    try {
      const res = await fetch('/api/ai/brief/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          understood: analysis.understood,
          answers,
          researchTopics: analysis.researchNeeded || [],
          language,
        }),
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const errData = await res.json(); errMsg = errData?.error || errMsg; } catch { /* non-JSON response */ }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (!data.result?.scenarios) throw new Error('No scenarios in response');
      setScenariosResult(data.result);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(`${bt.errorScenarios || 'Could not generate scenarios.'} ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [analysis, answers, language, bt]);

  const generateCollection = useCallback(async () => {
    if (!analysis || !selectedScenario) return;
    setLoading(true);
    setError('');
    setLoadingMessage(bt.generating || 'Crafting your collection...');
    try {
      const res = await fetch('/api/ai/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          understood: analysis.understood,
          answers,
          scenario: selectedScenario,
          marketResearch: JSON.stringify(scenariosResult?.marketInsights || {}),
          language,
        }),
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const errData = await res.json(); errMsg = errData?.error || errMsg; } catch { /* non-JSON */ }
        throw new Error(errMsg);
      }
      const { result } = await res.json();
      setGeneratedData(result);
      // Auto-fill collection name from brand suggestions
      if (result?.brand?.nameOptions?.[0]?.name) {
        setCollectionName(result.brand.nameOptions[0].name);
      }
      setStep(3);
    } catch {
      setError(bt.errorGenerate || 'Could not generate collection. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [analysis, selectedScenario, answers, scenariosResult, language, bt]);

  const createCollection = useCallback(async () => {
    if (!generatedData || !collectionName) return;
    setLoading(true);
    setError('');
    setLoadingMessage(bt.creating || 'Creating your collection...');
    try {
      const gen = generatedData as Record<string, unknown>;
      const season = (analysis?.understood?.season || 'SS27');
      const launchDate = season.startsWith('SS')
        ? `20${season.slice(2)}-02-01`
        : `20${season.slice(2)}-09-01`;

      // Build setupData for Collection Builder
      const merch = gen.merchandising as Record<string, unknown>;
      const budget = merch?.budget as Record<string, number>;
      const families = merch?.families as Record<string, unknown>[];

      const res = await fetch('/api/ai/brief/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collectionName,
          season,
          launchDate,
          brand: gen.brand,
          creative: gen.creative,
          merchandising: gen.merchandising,
          skus: gen.skus,
          setupData: {
            totalSalesTarget: budget?.totalSalesTarget || 0,
            avgPriceTarget: budget?.avgPrice || 0,
            targetMargin: budget?.targetMargin || 60,
            expectedSkus: (gen.skus as unknown[])?.length || 0,
            dropsCount: 2,
            productFamilies: families?.map((f: Record<string, unknown>) => ({
              name: f.name,
              subcategories: f.subcategories || [],
            })) || [],
          },
        }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const errData = await res.json(); errMsg = errData?.error || errMsg; } catch { /* non-JSON */ }
        throw new Error(errMsg);
      }
      const { plan } = await res.json();
      setStep(4);
      // Navigate to the new collection after a moment
      setTimeout(() => router.push(`/collection/${plan.id}`), 2000);
    } catch {
      setError(bt.errorCreate || 'Could not create collection. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [generatedData, collectionName, analysis, router, bt]);

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-carbon flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-crema/60 text-sm mb-4">{bt.loginRequired || 'Sign in to start'}</p>
            <button onClick={() => setAuthOpen(true)} className="px-6 py-3 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase">
              {bt.signIn || 'Sign In'}
            </button>
          </div>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signin" />
      </>
    );
  }

  return (
    <SubscriptionGate>
      <div className="min-h-screen bg-carbon text-crema">
        {/* ── Navbar — workspace-dark keeps app identity ── */}
        <Navbar variant="workspace-dark" />

        {/* ── Sub-bar: back link + step indicators ── */}
        <div className="fixed top-14 left-0 right-0 z-40 px-6 md:px-10 py-3 flex items-center justify-between">
          <Link href="/my-collections" className="flex items-center gap-2 text-crema/30 hover:text-crema/60 transition-colors text-[11px] font-medium tracking-[0.1em] uppercase">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{bt.backToCollections || 'Collections'}</span>
          </Link>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-6 sm:w-8 h-px ${isDone ? 'bg-crema/30' : 'bg-crema/[0.06]'}`} />}
                  <div className={`w-7 h-7 flex items-center justify-center transition-all ${
                    isActive ? 'bg-crema text-carbon' : isDone ? 'bg-crema/15 text-crema/60' : 'bg-crema/[0.04] text-crema/20'
                  }`}>
                    {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-16 sm:w-20" /> {/* balance spacer */}
        </div>

        {/* ── Content ── */}
        <div className="min-h-screen flex items-center justify-center px-6 py-28">
          <div className="w-full max-w-3xl">

            {/* ════ STEP 0: Brief Input ════ */}
            {step === 0 && !loading && (
              <div className="space-y-8" style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                <div className="text-center space-y-4">
                  <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-crema/25">
                    {bt.eyebrow || 'New Collection'}
                  </p>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.08]">
                    {bt.heroTitle || 'Tell us your'} <span className="italic">{bt.heroItalic || 'vision'}</span>
                  </h1>
                  <p className="text-sm text-crema/40 max-w-lg mx-auto leading-relaxed">
                    {bt.heroDesc || 'Describe your project in your own words. Aimily will organize your ideas, research the market, and build a complete collection proposal.'}
                  </p>
                </div>

                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={bt.placeholder || 'I want to create a brand of sport shoes, below Zara pricing, slim ballerina style, production in China, targeting Spain and Europe...'}
                  className="w-full h-48 sm:h-56 bg-white/[0.03] border border-crema/[0.08] p-6 text-[15px] font-light text-crema/80 placeholder:text-crema/15 leading-relaxed resize-none focus:outline-none focus:border-crema/20 transition-colors"
                />

                {error && <p className="text-[12px] text-error/80 text-center">{error}</p>}

                <div className="flex justify-center">
                  <button
                    onClick={analyzeBrief}
                    disabled={brief.trim().length < 20}
                    className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-crema/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {bt.analyzeBtn || 'Analyze my brief'}
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 1: Understanding + Questions ════ */}
            {step === 1 && !loading && analysis && (
              <div className="space-y-10" style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                {/* What Aimily understood */}
                <div className="space-y-4">
                  <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-crema/25">
                    {bt.understoodTitle || 'What we understood'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: bt.product || 'Product', value: analysis.understood.productType },
                      { label: bt.style || 'Style', value: analysis.understood.styleDirection },
                      { label: bt.price || 'Price', value: `€${analysis.understood.estimatedPriceRange?.min}-${analysis.understood.estimatedPriceRange?.max}` },
                      { label: bt.market || 'Market', value: analysis.understood.markets?.join(', ') },
                      { label: bt.consumer || 'Consumer', value: analysis.understood.consumer },
                      { label: bt.channels || 'Channels', value: analysis.understood.channels?.join(', ') },
                    ].filter(item => item.value).map((item, i) => (
                      <div key={i} className="bg-white/[0.02] border border-crema/[0.06] p-4">
                        <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-crema/25 mb-1">{item.label}</p>
                        <p className="text-[13px] font-light text-crema/70">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assumptions */}
                {analysis.assumptions?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-crema/25">
                      {bt.assumptionsTitle || 'Our assumptions'}
                    </p>
                    <div className="space-y-2">
                      {analysis.assumptions.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 py-2">
                          <Check className="h-3 w-3 text-crema/20 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[12px] text-crema/55">{a.assumption}</p>
                            <p className="text-[10px] text-crema/25 mt-0.5 italic">{a.basis}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions */}
                {analysis.questions?.length > 0 && (
                  <div className="space-y-5">
                    <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-crema/25">
                      {bt.questionsTitle || 'A few questions'}
                    </p>
                    {analysis.questions.map((q) => (
                      <div key={q.id} className="space-y-2">
                        <p className="text-[15px] font-light text-crema/80">{q.question}</p>
                        <p className="text-[10px] text-crema/25 italic">{q.why}</p>
                        {q.type === 'choice' && q.options ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {q.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={`px-4 py-2 text-[11px] font-medium tracking-[0.08em] uppercase border transition-colors ${
                                  answers[q.id] === opt
                                    ? 'bg-crema text-carbon border-crema'
                                    : 'border-crema/[0.1] text-crema/40 hover:border-crema/25'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={answers[q.id] || ''}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder={bt.answerPlaceholder || 'Your answer...'}
                            className="w-full h-16 bg-white/[0.02] border border-crema/[0.06] p-3 text-[13px] font-light text-crema/70 placeholder:text-crema/15 resize-none focus:outline-none focus:border-crema/15"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {error && <p className="text-[12px] text-error/80 text-center">{error}</p>}

                <div className="flex items-center justify-between pt-4">
                  <button onClick={() => setStep(0)} className="text-[10px] text-crema/30 hover:text-crema/60 tracking-[0.08em] uppercase transition-colors">
                    {bt.editBrief || 'Edit brief'}
                  </button>
                  <button
                    onClick={fetchScenarios}
                    className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-crema/90 transition-colors"
                  >
                    <Search className="h-3.5 w-3.5" />
                    {bt.researchBtn || 'Research & propose'}
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 2: Scenarios ════ */}
            {step === 2 && !loading && scenariosResult && (
              <div className="space-y-10" style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                {/* Market insights */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-crema/25">
                    {bt.insightsTitle || 'Market research'}
                  </p>
                  <div className="bg-white/[0.02] border border-crema/[0.06] p-5 space-y-3">
                    <p className="text-[13px] font-light text-crema/60 leading-relaxed">{scenariosResult.marketInsights?.marketOpportunity}</p>
                    <p className="text-[11px] text-crema/35 leading-relaxed">{scenariosResult.marketInsights?.priceBenchmarks}</p>
                  </div>
                </div>

                {/* Scenarios */}
                <div className="space-y-4">
                  <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-crema/25">
                    {bt.scenariosTitle || 'Three scenarios for your collection'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {scenariosResult.scenarios?.map((sc) => {
                      const isSelected = selectedScenario?.id === sc.id;
                      return (
                        <button
                          key={sc.id}
                          onClick={() => setSelectedScenario(sc)}
                          className={`text-left p-5 border transition-all ${
                            isSelected
                              ? 'bg-crema/[0.08] border-crema/30'
                              : 'bg-white/[0.01] border-crema/[0.06] hover:border-crema/15'
                          }`}
                        >
                          <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-crema/30 mb-2">{sc.name}</p>
                          <p className="text-2xl font-light text-crema/90 mb-1">{sc.skuCount} <span className="text-sm text-crema/40">SKUs</span></p>
                          <p className="text-[12px] text-crema/40 mb-4 leading-relaxed">{sc.description}</p>

                          <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-crema/25">{bt.priceRange || 'Price'}</span>
                              <span className="text-crema/60">€{sc.priceArchitecture?.min}-{sc.priceArchitecture?.max}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-crema/25">{bt.investment || 'Investment'}</span>
                              <span className="text-crema/60">€{(sc.financials?.totalInvestment || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-crema/25">{bt.salesTarget || 'Y1 Sales'}</span>
                              <span className="text-crema/60">€{(sc.financials?.firstYearSalesTarget || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          {sc.families?.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-crema/[0.06]">
                              {sc.families.map((f, i) => (
                                <p key={i} className="text-[10px] text-crema/35">{f.count}x {f.name}</p>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recommendation */}
                {scenariosResult.recommendation && (
                  <div className="bg-white/[0.02] border border-crema/[0.06] p-4">
                    <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-crema/25 mb-1">{bt.recommendation || 'Our recommendation'}</p>
                    <p className="text-[12px] text-crema/50 italic leading-relaxed">{scenariosResult.recommendation}</p>
                  </div>
                )}

                {error && <p className="text-[12px] text-error/80 text-center">{error}</p>}

                <div className="flex items-center justify-between pt-4">
                  <button onClick={() => setStep(1)} className="text-[10px] text-crema/30 hover:text-crema/60 tracking-[0.08em] uppercase transition-colors">
                    {bt.backToQuestions || 'Back'}
                  </button>
                  <button
                    onClick={generateCollection}
                    disabled={!selectedScenario}
                    className="flex items-center gap-3 px-8 py-3.5 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-crema/90 transition-colors disabled:opacity-30"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {bt.generateBtn || 'Generate collection'}
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 3: Review & Launch ════ */}
            {step === 3 && !loading && generatedData && (
              <div className="space-y-10" style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 border border-crema/[0.12] mb-2">
                    <Check className="h-6 w-6 text-crema/70" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
                    {bt.readyTitle || 'Your collection is'} <span className="italic">{bt.readyItalic || 'ready'}</span>
                  </h2>
                  <p className="text-sm text-crema/40 max-w-md mx-auto">
                    {bt.readyDesc || 'Review the proposal and name your collection to get started.'}
                  </p>
                </div>

                {/* Generated summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: bt.brandDirection || 'Brand', value: (generatedData as Record<string, Record<string, Record<string, string>[]>>).brand?.nameOptions?.[0]?.name || '—' },
                    { label: bt.skuCount || 'Products', value: `${((generatedData as Record<string, unknown[]>).skus)?.length || 0} SKUs` },
                    { label: bt.revenue || 'Target', value: `€${((generatedData as Record<string, Record<string, Record<string, number>>>).merchandising?.budget?.totalSalesTarget || 0).toLocaleString()}` },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.02] border border-crema/[0.06] p-5 text-center">
                      <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-crema/25 mb-2">{item.label}</p>
                      <p className="text-lg font-light text-crema/80">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Name input */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-crema/25">
                    {bt.nameLabel || 'Name your collection'}
                  </p>
                  <input
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder={bt.namePlaceholder || 'Collection name...'}
                    className="w-full bg-white/[0.03] border border-crema/[0.08] px-5 py-4 text-xl font-light text-crema/80 placeholder:text-crema/15 focus:outline-none focus:border-crema/20 transition-colors"
                  />
                  {/* Brand name suggestions */}
                  {(generatedData as Record<string, Record<string, Record<string, string>[]>>).brand?.nameOptions && (
                    <div className="flex flex-wrap gap-2">
                      {(generatedData as Record<string, Record<string, Record<string, string>[]>>).brand.nameOptions.map((opt: Record<string, string>, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCollectionName(opt.name)}
                          className={`px-3 py-1.5 text-[10px] font-medium tracking-[0.08em] uppercase border transition-colors ${
                            collectionName === opt.name
                              ? 'bg-crema text-carbon border-crema'
                              : 'border-crema/[0.08] text-crema/35 hover:border-crema/20'
                          }`}
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {error && <p className="text-[12px] text-error/80 text-center">{error}</p>}

                <div className="flex justify-center pt-4">
                  <button
                    onClick={createCollection}
                    disabled={!collectionName.trim()}
                    className="flex items-center gap-3 px-10 py-4 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-crema/90 transition-colors disabled:opacity-30"
                  >
                    {bt.launchBtn || 'Launch collection'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 4: Success ════ */}
            {step === 4 && !loading && (
              <div className="text-center space-y-6" style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
                <div className="inline-flex items-center justify-center w-16 h-16 border border-crema/[0.15]">
                  <Check className="h-8 w-8 text-crema" />
                </div>
                <h2 className="text-3xl font-light tracking-tight">
                  {collectionName}
                </h2>
                <p className="text-sm text-crema/40">
                  {bt.successDesc || 'Your collection has been created. Redirecting...'}
                </p>
                <Loader2 className="h-4 w-4 text-crema/30 animate-spin mx-auto" />
              </div>
            )}

            {/* ════ Loading state ════ */}
            {loading && (
              <div className="text-center space-y-6" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border border-crema/[0.08] animate-pulse" />
                  <div className="absolute inset-2 border border-crema/[0.06] animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <div className="absolute inset-4 border border-crema/[0.04] animate-pulse" style={{ animationDelay: '0.6s' }} />
                </div>
                <p className="text-sm font-light text-crema/50">{loadingMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SubscriptionGate>
  );
}
