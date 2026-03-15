'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronDown,
  Sparkles,
  Palette,
  DollarSign,
  PenTool,
  Megaphone,
  CalendarRange,
  TrendingUp,
  Layers,
  Target,
  ShoppingBag,
  Scissors,
  BookOpen,
  Video,
  Globe,
  Rocket,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

/* ──────────────────────────────────────────────
   Scroll-triggered reveal hook
   ────────────────────────────────────────────── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/* ──────────────────────────────────────────────
   Animated section wrapper
   ────────────────────────────────────────────── */
function Reveal({
  children,
  className = '',
  direction = 'up',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.12);

  const transforms: Record<string, string> = {
    up: 'translateY(40px)',
    left: 'translateX(-40px)',
    right: 'translateX(40px)',
    scale: 'scale(0.95)',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : transforms[direction],
        transition: `opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Animated counter
   ────────────────────────────────────────────── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const { ref, isVisible } = useScrollReveal(0.3);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const duration = 1200;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ──────────────────────────────────────────────
   Block data (icons only — text comes from i18n)
   ────────────────────────────────────────────── */
const BLOCK_ICONS = [
  {
    step: '01',
    icon: Palette,
    featureIcons: [TrendingUp, Sparkles, Palette, BookOpen],
  },
  {
    step: '02',
    icon: DollarSign,
    featureIcons: [Layers, DollarSign, ShoppingBag, BarChart3],
  },
  {
    step: '03',
    icon: PenTool,
    featureIcons: [Scissors, Layers, Target, BookOpen],
  },
  {
    step: '04',
    icon: Megaphone,
    featureIcons: [BookOpen, Video, Globe, Rocket],
  },
];

const STATS_DATA = [
  { value: 4, suffix: '' },
  { value: 45, suffix: '' },
  { value: 1, suffix: '' },
  { value: 360, suffix: '°' },
];

/* ──────────────────────────────────────────────
   Page component
   ────────────────────────────────────────────── */
export default function MeetAimilyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();
  const p = t.meetAimilyPage;

  // Build translated block data from i18n keys
  const BLOCKS = BLOCK_ICONS.map((b, i) => {
    const n = (i + 1) as 1 | 2 | 3 | 4;
    return {
      ...b,
      label: p[`block${n}Label`],
      headline: p[`block${n}Headline`],
      headlineItalic: p[`block${n}HeadlineItalic`],
      description: p[`block${n}Desc`],
      features: [
        p[`block${n}Feat1`],
        p[`block${n}Feat2`],
        p[`block${n}Feat3`],
        p[`block${n}Feat4`],
      ],
      screenshot: p[`block${n}Screenshot`],
    };
  });

  const STATS_LABELS = [
    p.statIntegratedBlocks,
    p.statAutomatedMilestones,
    p.statConnectedTimeline,
    p.statCollectionVisibility,
  ];

  const TRANSFORM_ROWS = [
    { before: p.transformBefore1, after: p.transformAfter1 },
    { before: p.transformBefore2, after: p.transformAfter2 },
    { before: p.transformBefore3, after: p.transformAfter3 },
    { before: p.transformBefore4, after: p.transformAfter4 },
    { before: p.transformBefore5, after: p.transformAfter5 },
  ];

  const MILESTONE_BLOCKS = [
    { label: p.orchestratorCreative, count: 12 },
    { label: p.orchestratorMerchandising, count: 10 },
    { label: p.orchestratorDesignDev, count: 13 },
    { label: p.orchestratorMarketing, count: 10 },
  ];

  return (
    <div className="min-h-screen bg-carbon">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 bg-carbon/80 backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-5 w-auto brightness-[0.95] sepia-[0.15]"
              priority
              unoptimized
            />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/discover"
              className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
            >
              {t.common.discover}
            </Link>
            <Link
              href="/meet-aimily"
              className="text-crema text-xs font-medium tracking-widest uppercase"
            >
              {t.common.meetAimily}
            </Link>
            <Link
              href="/contact"
              className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
            >
              {t.common.contact}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Language toggle */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-[10px] font-medium tracking-[0.12em] uppercase cursor-pointer border border-gris/20 rounded px-2.5 py-1 text-crema transition-colors focus:outline-none [&>option]:bg-carbon [&>option]:text-crema"
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="it">IT</option>
            <option value="de">DE</option>
          </select>
          {user ? (
            <Link
              href="/my-collections"
              className="text-crema text-xs font-medium tracking-widest uppercase hover:text-crema/70 transition-colors"
            >
              {t.common.myCollections}
            </Link>
          ) : (
            <>
              <button
                onClick={() => setAuthOpen(true)}
                className="hidden md:block text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
              >
                {t.common.logIn}
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-5 py-2 text-[11px] tracking-[0.15em]"
              >
                {p.getStarted}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 max-w-4xl text-center">
          <p className="text-gris/50 text-xs font-medium tracking-[0.3em] uppercase mb-8 animate-fade-in-up">
            {p.heroLabel}
          </p>
          <h1 className="text-crema text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-6 animate-fade-in-up animate-delay-100">
            {p.heroTitle}{' '}
            <span className="italic">{p.heroTitleItalic}</span>
          </h1>
          <p className="text-gris text-lg md:text-xl font-light tracking-wide leading-relaxed max-w-2xl mx-auto mb-12 animate-fade-in-up animate-delay-200">
            {p.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
            {user ? (
              <Link
                href="/my-collections"
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                {t.common.myCollections.toUpperCase()}
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                {t.common.startFreeTrialUpper}
              </button>
            )}
            <Link
              href="/pricing"
              className="btn-secondary px-10 py-4 text-sm tracking-[0.15em] border-gris/30 text-gris hover:bg-white/5"
            >
              {t.common.seePricing}
            </Link>
          </div>
        </div>
        <a
          href="#stats"
          className="absolute bottom-10 z-20 flex flex-col items-center gap-1 text-gris/20 hover:text-gris/50 transition-colors animate-bounce"
        >
          <ChevronDown className="w-5 h-5" />
        </a>
      </section>

      {/* ─── STATS BAR ─── */}
      <section id="stats" className="relative py-0 border-t border-gris/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gris/10">
            {STATS_DATA.map((stat, i) => (
              <Reveal key={i} className="bg-carbon p-8 md:p-10 text-center" delay={i * 100}>
                <p className="text-crema text-3xl md:text-4xl font-light mb-2">
                  <Counter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-gris/50 text-[10px] md:text-xs font-medium tracking-[0.2em] uppercase">
                  {STATS_LABELS[i]}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INTRO ─── */}
      <section className="relative py-24 md:py-32 px-6 border-t border-gris/10">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6">
              {p.introLabel}
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-8">
              {p.introTitle1} <span className="italic">{p.introTitleIdea}</span> {p.introTitleTo}{' '}
              <span className="italic">{p.introTitleMarket}</span>{p.introTitleEnd}
            </h2>
            <p className="text-gris text-base md:text-lg font-light leading-relaxed">
              {p.introDesc}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── BLOCK SHOWCASES ─── */}
      {BLOCKS.map((block, index) => {
        const isEven = index % 2 === 0;
        return (
          <section
            key={block.step}
            className="relative py-24 md:py-32 px-6 border-t border-gris/10"
          >
            <div className="max-w-6xl mx-auto">
              <div
                className={`flex flex-col ${
                  isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                } gap-12 lg:gap-20 items-center`}
              >
                {/* Text side */}
                <div className="flex-1 max-w-xl">
                  <Reveal direction={isEven ? 'left' : 'right'}>
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-gris/15 text-6xl md:text-7xl font-light tracking-tight leading-none">
                        {block.step}
                      </span>
                      <block.icon className="w-5 h-5 text-gris/30" />
                    </div>
                    <p className="text-gris/40 text-[10px] font-medium tracking-[0.3em] uppercase mb-4">
                      {block.label}
                    </p>
                    <h2 className="text-crema text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-[1.2] mb-6">
                      {block.headline}{' '}
                      <span className="italic">
                        {block.headlineItalic}
                      </span>
                    </h2>
                    <p className="text-gris text-base font-light leading-relaxed mb-8">
                      {block.description}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {block.features.map((featText, fi) => {
                        const FeatIcon = block.featureIcons[fi];
                        return (
                          <div
                            key={fi}
                            className="flex items-center gap-3 text-gris/60 group"
                          >
                            <FeatIcon className="w-4 h-4 text-gris/30 group-hover:text-crema/60 transition-colors shrink-0" />
                            <span className="text-sm font-light">
                              {featText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Reveal>
                </div>

                {/* Visual side — screenshot placeholder */}
                <div className="flex-1 w-full max-w-xl">
                  <Reveal direction={isEven ? 'right' : 'left'} delay={150}>
                    <div className="relative aspect-[4/3] bg-carbon border border-gris/10 overflow-hidden group">
                      <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                          backgroundSize: '40px 40px',
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                        <block.icon className="w-12 h-12 text-gris/10 mb-4 group-hover:text-gris/20 transition-colors" />
                        <p className="text-gris/20 text-xs font-medium tracking-widest uppercase text-center">
                          {block.screenshot}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ─── THE ORCHESTRATOR (Calendar) ─── */}
      <section className="relative py-24 md:py-32 px-6 bg-crema">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-3 mb-6">
                <CalendarRange className="w-5 h-5 text-carbon/30" />
                <p className="text-carbon/40 text-[10px] font-medium tracking-[0.3em] uppercase">
                  {p.orchestratorLabel}
                </p>
              </div>
              <h2 className="text-carbon text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-6">
                {p.orchestratorTitle1}{' '}
                <span className="italic">{p.orchestratorTitleItalic}</span>
              </h2>
              <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto">
                {p.orchestratorDesc}
              </p>
            </div>
          </Reveal>

          {/* Calendar placeholder — full width */}
          <Reveal direction="scale" delay={200}>
            <div className="relative aspect-[3/1] md:aspect-[4/1] bg-white border border-texto/10 overflow-hidden group">
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                  backgroundSize: '60px 30px',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <CalendarRange className="w-16 h-16 text-texto/5 mb-4 group-hover:text-texto/10 transition-colors" />
                <p className="text-texto/20 text-xs font-medium tracking-widest uppercase text-center">
                  {p.orchestratorGanttPlaceholder}
                </p>
              </div>
            </div>
          </Reveal>

          {/* Milestone highlights */}
          <Reveal delay={300}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-texto/10 mt-px">
              {MILESTONE_BLOCKS.map((item, i) => (
                <div key={i} className="bg-crema p-6 text-center">
                  <p className="text-sm font-medium tracking-wide text-carbon">
                    {item.label}
                  </p>
                  <p className="text-texto/40 text-xs mt-1">
                    {item.count} {p.milestones}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── THE FLOW (Before → After) ─── */}
      <section className="relative py-24 md:py-32 px-6 border-t border-gris/10">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6">
                {p.transformLabel}
              </p>
              <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
                {p.transformTitle}{' '}
                <span className="italic">{p.transformTitleItalic}</span>
              </h2>
            </div>
          </Reveal>
          <div className="space-y-0">
            {TRANSFORM_ROWS.map((row, i, arr) => (
              <Reveal key={i} delay={i * 80}>
                <div
                  className={`flex items-center justify-center gap-6 md:gap-10 py-7 ${
                    i < arr.length - 1 ? 'border-b border-gris/10' : ''
                  }`}
                >
                  <span className="text-gris/30 text-sm md:text-base font-light tracking-wide text-right w-[160px] md:w-[260px]">
                    {row.before}
                  </span>
                  <ArrowRight className="h-4 w-4 text-crema/20 shrink-0" />
                  <span className="text-crema text-sm md:text-base font-medium tracking-wide text-left w-[160px] md:w-[260px]">
                    {row.after}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 md:py-32 px-6 border-t border-gris/10">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] italic mb-6">
              {p.ctaTitle}
            </h2>
            <p className="text-gris text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto mb-10">
              {p.ctaDesc}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  href="/my-collections"
                  className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
                >
                  {t.common.myCollections.toUpperCase()}
                </Link>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
                >
                  {t.common.startFreeTrialUpper}
                </button>
              )}
              <Link
                href="/pricing"
                className="btn-secondary px-10 py-4 text-sm tracking-[0.15em] border-gris/30 text-gris hover:bg-white/5"
              >
                {t.common.seePricing}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-gris/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-4 w-auto opacity-40"
              unoptimized
            />
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/discover"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              {t.common.discover}
            </Link>
            <Link
              href="/meet-aimily"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              {t.common.meetAimily}
            </Link>
            <Link
              href="/terms"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              {t.common.terms}
            </Link>
            <Link
              href="/privacy"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              {t.common.privacy}
            </Link>
            <Link
              href="/cookies"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              {t.common.cookies}
            </Link>
            <Link
              href="/contact"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              {t.common.contact}
            </Link>
          </div>
          <p className="text-gris/20 text-[10px] tracking-widest uppercase">
            &copy; {new Date().getFullYear()} StudioNN Agency
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push('/my-collections')}
      />
    </div>
  );
}
