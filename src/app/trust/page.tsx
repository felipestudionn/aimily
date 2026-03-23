'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Shield, Lock, Eye, EyeOff, Server, FileCheck, Fingerprint, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

const SHIELD_LAYERS = [
  {
    icon: EyeOff,
    titleKey: 'trustShield1Title',
    descKey: 'trustShield1Desc',
    color: 'bg-[#282A29]',
  },
  {
    icon: Lock,
    titleKey: 'trustShield2Title',
    descKey: 'trustShield2Desc',
    color: 'bg-[#282A29]',
  },
  {
    icon: Fingerprint,
    titleKey: 'trustShield3Title',
    descKey: 'trustShield3Desc',
    color: 'bg-[#282A29]',
  },
  {
    icon: Server,
    titleKey: 'trustShield4Title',
    descKey: 'trustShield4Desc',
    color: 'bg-[#282A29]',
  },
  {
    icon: FileCheck,
    titleKey: 'trustShield5Title',
    descKey: 'trustShield5Desc',
    color: 'bg-[#282A29]',
  },
  {
    icon: Eye,
    titleKey: 'trustShield6Title',
    descKey: 'trustShield6Desc',
    color: 'bg-[#282A29]',
  },
];

const COMPARISON_ROWS = [
  { featureKey: 'trustCompare1', aimily: true, direct: false },
  { featureKey: 'trustCompare2', aimily: true, direct: false },
  { featureKey: 'trustCompare3', aimily: true, direct: false },
  { featureKey: 'trustCompare4', aimily: true, direct: false },
  { featureKey: 'trustCompare5', aimily: true, direct: true },
  { featureKey: 'trustCompare6', aimily: true, direct: false },
];

export default function TrustPage() {
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();
  const trust = (t as Record<string, Record<string, string>>).trust || {};

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image src="/images/aimily-logo-black.png" alt="aimily" width={774} height={96} className="object-contain h-5 w-auto" priority unoptimized />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/discover" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">{t.common.discover}</Link>
            <Link href="/how-it-works" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">{t.common.howAimilyWorks}</Link>
            <Link href="/trust" className="text-gray-900 text-xs font-medium tracking-widest uppercase">{trust.navLabel || 'Trust'}</Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer border border-gray-200 rounded px-2 py-1 text-gray-700 transition-colors focus:outline-none">
            <option value="en">EN</option><option value="es">ES</option><option value="fr">FR</option>
            <option value="it">IT</option><option value="de">DE</option><option value="pt">PT</option>
            <option value="nl">NL</option><option value="sv">SV</option><option value="no">NO</option>
          </select>
          <Link href="/" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">{t.common.home}</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-[#282A29] rounded-full flex items-center justify-center">
              <Shield className="h-7 w-7 text-[#FAEFE0]" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-light text-[#282A29] tracking-tight leading-[1.1] mb-6">
            {trust.heroTitle || 'Your creative strategy is safe with us'}
          </h1>
          <p className="text-lg sm:text-xl font-light text-[#282A29]/50 leading-relaxed max-w-2xl mx-auto">
            {trust.heroSubtitle || 'When you use AI through Aimily, your data is automatically protected by multiple security layers that you would not have if using AI tools directly.'}
          </p>
        </div>
      </section>

      {/* The Problem — Why this matters */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8]">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#282A29]/30 mb-4">
            {trust.whyTitle || 'Why this matters'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-light text-[#282A29] mb-8 leading-snug max-w-2xl">
            {trust.whyHeadline || 'Your collection plans contain some of the most sensitive data in your business'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {['whyCard1', 'whyCard2', 'whyCard3'].map((key, i) => (
              <div key={i} className="bg-white p-6 border border-[#282A29]/[0.06]">
                <p className="text-sm font-light text-[#282A29]/70 leading-relaxed">
                  {trust[key] || ['Pricing strategies, margins, and cost structures that define your market position.',
                    'Design directions, moodboards, and creative concepts months before launch.',
                    'Go-to-market timelines, distribution channels, and competitive intelligence.'][i]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Aimily Protects You — 6 Layers */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#282A29]/30 mb-4">
            {trust.howTitle || 'How Aimily protects you'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-light text-[#282A29] mb-12 leading-snug max-w-2xl">
            {trust.howHeadline || 'Six layers of protection, active on every AI interaction'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHIELD_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <div key={i} className="flex gap-4 p-5 border border-[#282A29]/[0.06] hover:border-[#282A29]/[0.12] transition-colors">
                  <div className={`${layer.color} w-10 h-10 flex items-center justify-center shrink-0`}>
                    <Icon className="h-5 w-5 text-[#FAEFE0]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#282A29] mb-1">
                      {trust[layer.titleKey] || `Protection Layer ${i + 1}`}
                    </h3>
                    <p className="text-[13px] font-light text-[#282A29]/50 leading-relaxed">
                      {trust[layer.descKey] || 'Description'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table — Aimily vs Direct AI */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#282A29]">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 mb-4">
            {trust.compareTitle || 'The difference'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-light text-white mb-12 leading-snug max-w-2xl">
            {trust.compareHeadline || 'What happens when you use AI through Aimily vs. on your own'}
          </h2>

          <div className="border border-white/[0.1]">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-white/[0.1]">
              <div className="p-4 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                {trust.compareFeature || 'Protection'}
              </div>
              <div className="p-4 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/80 text-center border-l border-white/[0.1]">
                {trust.compareAimily || 'Via Aimily'}
              </div>
              <div className="p-4 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 text-center border-l border-white/[0.1]">
                {trust.compareDirect || 'Direct AI use'}
              </div>
            </div>

            {/* Rows */}
            {COMPARISON_ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i < COMPARISON_ROWS.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                <div className="p-4 text-[13px] font-light text-white/60">
                  {trust[row.featureKey] || `Feature ${i + 1}`}
                </div>
                <div className="p-4 text-center border-l border-white/[0.1]">
                  {row.aimily ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-white/10 rounded-full">
                      <span className="text-white text-sm">✓</span>
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </div>
                <div className="p-4 text-center border-l border-white/[0.1]">
                  {row.direct ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-white/10 rounded-full">
                      <span className="text-white text-sm">✓</span>
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers we work with */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#282A29]/30 mb-4">
            {trust.providersTitle || 'Our AI partners'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-light text-[#282A29] mb-4 leading-snug max-w-2xl">
            {trust.providersHeadline || 'We only work with providers that guarantee zero training on your data'}
          </h2>
          <p className="text-sm font-light text-[#282A29]/50 mb-10 max-w-2xl leading-relaxed">
            {trust.providersDesc || 'Every AI provider we partner with has signed a Data Processing Agreement (DPA) that contractually prohibits using your data for model training. Your creative strategies never leave the secure pipeline.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'Anthropic', detail: trust.providerAnthropicDetail || 'Zero training on API data. 7-day auto-deletion.' },
              { name: 'Google AI', detail: trust.providerGoogleDetail || 'Paid API excluded from training. EU data processing available.' },
              { name: 'Fal.ai', detail: trust.providerFalDetail || '24-hour data lifecycle. No training on enterprise data.' },
              { name: 'Perplexity', detail: trust.providerPerplexityDetail || 'Zero data retention. SOC 2 Type II certified.' },
            ].map((provider) => (
              <div key={provider.name} className="p-4 border border-[#282A29]/[0.06]">
                <p className="text-xs font-medium text-[#282A29] mb-1">{provider.name}</p>
                <p className="text-[11px] font-light text-[#282A29]/40 leading-relaxed">{provider.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8] text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-light text-[#282A29] mb-4">
            {trust.ctaTitle || 'Ready to design with confidence?'}
          </h2>
          <p className="text-sm font-light text-[#282A29]/50 mb-8 leading-relaxed">
            {trust.ctaDesc || 'Your next collection deserves the best AI tools with the strongest protection. Start your free trial today.'}
          </p>
          <Link href="/discover" className="inline-flex items-center gap-2 bg-[#282A29] text-[#FAEFE0] px-8 py-3.5 text-xs font-medium tracking-[0.15em] uppercase hover:bg-[#282A29]/90 transition-colors">
            {trust.ctaButton || 'Start free trial'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Footer note */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-gray-400">
            {trust.footerNote || 'Last updated: March 2026. For security inquiries, contact security@aimily.app'}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">{t.common.privacy}</Link>
            <Link href="/terms" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">{t.common.terms}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
