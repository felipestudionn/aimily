'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Calendar,
  Palette,
  TrendingUp,
  Camera,
  ShoppingBag,
  Factory,
  Rocket,
  ArrowRight,
  ChevronDown,
  Layers,
  Zap,
  Globe,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();

  const CAPABILITIES = [
    {
      icon: TrendingUp,
      title: t.discoverPage.capTrend,
      description: t.discoverPage.capTrendDesc,
    },
    {
      icon: Palette,
      title: t.discoverPage.capBrand,
      description: t.discoverPage.capBrandDesc,
    },
    {
      icon: Layers,
      title: t.discoverPage.capMerch,
      description: t.discoverPage.capMerchDesc,
    },
    {
      icon: Camera,
      title: t.discoverPage.capStudio,
      description: t.discoverPage.capStudioDesc,
    },
    {
      icon: Globe,
      title: t.discoverPage.capGTM,
      description: t.discoverPage.capGTMDesc,
    },
    {
      icon: Factory,
      title: t.discoverPage.capProd,
      description: t.discoverPage.capProdDesc,
    },
  ];

  const WORKFLOW_STEPS = [
    { number: '01', title: t.discoverPage.step1Title, description: t.discoverPage.step1Desc },
    { number: '02', title: t.discoverPage.step2Title, description: t.discoverPage.step2Desc },
    { number: '03', title: t.discoverPage.step3Title, description: t.discoverPage.step3Desc },
    { number: '04', title: t.discoverPage.step4Title, description: t.discoverPage.step4Desc },
  ];

  const ADVANTAGES = [
    { before: t.discoverPage.advBefore1, after: t.discoverPage.advAfter1 },
    { before: t.discoverPage.advBefore2, after: t.discoverPage.advAfter2 },
    { before: t.discoverPage.advBefore3, after: t.discoverPage.advAfter3 },
    { before: t.discoverPage.advBefore4, after: t.discoverPage.advAfter4 },
  ];

  return (
    <div className="min-h-screen bg-carbon">
      {/* Navigation */}
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
            <Link href="/discover" className="text-crema text-xs font-medium tracking-widest uppercase">
              {t.common.discover}
            </Link>
            <Link href="/meet-aimily" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
              {t.common.meetAimily}
            </Link>
              <Link href="/how-it-works" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
                {t.common.howItWorks}
              </Link>
            <Link href="/contact" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
              {t.common.contact}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Language Toggle */}
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
      <option value="pt">PT</option>
      <option value="nl">NL</option>
      <option value="sv">SV</option>
      <option value="no">NO</option>
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
                className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
              >
                {t.common.logIn}
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-5 py-2 text-[11px] tracking-[0.15em]"
              >
                {t.common.startFreeTrialUpper}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 max-w-4xl text-center">
          <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-8 animate-fade-in-up">
            {t.discoverPage.heroLabel}
          </p>
          <h1 className="text-crema text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-4 animate-fade-in-up animate-delay-100">
            {t.discoverPage.heroTitle1} <span className="italic">{t.discoverPage.concept}</span> {t.discoverPage.heroTitle2} <span className="italic">{t.discoverPage.market}</span>.
          </h1>
          <p className="text-crema/70 text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-8 animate-fade-in-up animate-delay-150">
            {t.discoverPage.heroSubtitle1} <span className="italic">{t.discoverPage.expertise}</span> {t.discoverPage.heroSubtitle2} <span className="italic">{t.discoverPage.ai}</span>.
          </p>
          <p className="text-gris text-lg md:text-xl font-light tracking-wide leading-relaxed max-w-2xl mx-auto mb-12 animate-fade-in-up animate-delay-200">
            {t.discoverPage.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
            {user ? (
              <Link href="/new-collection" className="btn-primary px-10 py-4 text-sm tracking-[0.15em]">
                {t.discoverPage.newCollection}
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                {t.discoverPage.startFree}
              </button>
            )}
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-10 animate-fade-in-up animate-delay-500">
          <ChevronDown className="h-5 w-5 text-gris/30 animate-bounce" />
        </div>
      </section>

      {/* ─── VALUE PROPOSITION ─── */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6">
                {t.discoverPage.whyAimily}
              </p>
              <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-8">
                {t.discoverPage.whyTitle1}{' '}
                <span className="italic">{t.discoverPage.whyTitle2}</span>
              </h2>
              <p className="text-gris text-base md:text-lg font-light leading-relaxed mb-6">
                {t.discoverPage.whyDesc1}
              </p>
              <p className="text-gris text-base md:text-lg font-light leading-relaxed">
                {t.discoverPage.whyDesc2}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-gris/10">
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <Sparkles className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">AI</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">{t.discoverPage.agents}</p>
              </div>
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <Layers className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">11</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">{t.discoverPage.workspaces}</p>
              </div>
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <Zap className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">24/7</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">{t.discoverPage.available}</p>
              </div>
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <BarChart3 className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">360°</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">{t.discoverPage.visibility}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES ─── */}
      <section className="relative py-32 px-6 border-t border-gris/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6">
              {t.discoverPage.capabilities}
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
              {t.discoverPage.capTitle}{' '}
              <span className="italic">{t.discoverPage.capTitleItalic}</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-gris/10">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="bg-carbon p-10 group">
                <cap.icon className="h-6 w-6 text-gris/40 mb-6 group-hover:text-crema transition-colors" />
                <h3 className="text-crema text-lg font-medium tracking-tight mb-3">
                  {cap.title}
                </h3>
                <p className="text-gris/60 text-sm font-light leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── YOUR ADVANTAGE ─── */}
      <section className="relative py-32 px-6 border-t border-gris/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6">
              {t.discoverPage.yourAdvantage}
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
              {t.discoverPage.advTitle1}{' '}
              <span className="italic">{t.discoverPage.advTitle2}</span>
            </h2>
          </div>
          <div className="space-y-0">
            {ADVANTAGES.map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-center gap-6 md:gap-10 py-8 ${
                  i < 3 ? 'border-b border-gris/10' : ''
                }`}
              >
                <span className="text-gris/40 text-base md:text-lg font-light tracking-wide text-right w-[200px] md:w-[280px]">
                  {row.before}
                </span>
                <ArrowRight className="h-4 w-4 text-crema/20 shrink-0" />
                <span className="text-crema text-base md:text-lg font-medium tracking-wide text-left w-[200px] md:w-[280px]">
                  {row.after}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative py-32 px-6 border-t border-gris/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6">
              {t.discoverPage.howItWorks}
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
              {t.discoverPage.howTitle1}{' '}
              <span className="italic">{t.discoverPage.howTitle2}</span>
            </h2>
          </div>
          <div className="space-y-0">
            {WORKFLOW_STEPS.map((step, i) => (
              <div
                key={step.number}
                className={`flex gap-8 items-start py-10 ${
                  i < WORKFLOW_STEPS.length - 1 ? 'border-b border-gris/10' : ''
                }`}
              >
                <span className="text-gris/20 text-4xl md:text-5xl font-light tracking-tight shrink-0 w-16">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-crema text-xl md:text-2xl font-light tracking-tight mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gris/60 text-base font-light leading-relaxed max-w-lg">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE EVOLUTION ─── */}
      <section className="relative py-32 px-6 bg-crema">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-carbon/40 text-xs font-medium tracking-[0.25em] uppercase mb-6">
            {t.discoverPage.theEvolution}
          </p>
          <h2 className="text-carbon text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-8">
            {t.discoverPage.evoTitle1}{' '}
            <span className="italic">{t.discoverPage.evoTitle2}</span>
          </h2>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mb-8">
            {t.discoverPage.evoDesc1}
          </p>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mb-8">
            {t.discoverPage.evoDesc2}
          </p>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto">
            {t.discoverPage.evoDesc3}
          </p>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-32 px-6 border-t border-gris/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] italic mb-8">
            {t.discoverPage.ctaTitle}
          </h2>
          <p className="text-gris text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto mb-12">
            {t.discoverPage.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href="/new-collection" className="btn-primary px-10 py-4 text-sm tracking-[0.15em]">
                {t.discoverPage.newCollection}
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                {t.discoverPage.getStartedFree}
              </button>
            )}
            <Link
              href="/contact"
              className="btn-secondary px-10 py-4 text-sm tracking-[0.15em] border-gris/30 text-gris hover:bg-white/5"
            >
              {t.discoverPage.contactUs}
            </Link>
          </div>
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
            <Link href="/meet-aimily" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              {t.common.meetAimily}
            </Link>
              <Link href="/how-it-works" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
                {t.common.howItWorks}
              </Link>
            <Link href="/terms" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              {t.common.terms}
            </Link>
            <Link href="/privacy" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              {t.common.privacy}
            </Link>
            <Link href="/cookies" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              {t.common.cookies}
            </Link>
            <Link href="/contact" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
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
