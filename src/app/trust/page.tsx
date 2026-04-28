'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { EyeOff, Lock, Fingerprint, Server, FileCheck, Eye, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { AuthModal } from '@/components/auth/AuthModal';
import { SiteFooter } from '@/components/layout/SiteFooter';

const SHIELD_LAYERS = [
  { icon: EyeOff, titleKey: 'trustShield1Title', descKey: 'trustShield1Desc' },
  { icon: Lock, titleKey: 'trustShield2Title', descKey: 'trustShield2Desc' },
  { icon: Fingerprint, titleKey: 'trustShield3Title', descKey: 'trustShield3Desc' },
  { icon: Server, titleKey: 'trustShield4Title', descKey: 'trustShield4Desc' },
  { icon: FileCheck, titleKey: 'trustShield5Title', descKey: 'trustShield5Desc' },
  { icon: Eye, titleKey: 'trustShield6Title', descKey: 'trustShield6Desc' },
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
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const t = useTranslation();
  const trust = (t as Record<string, Record<string, string>>).trust || {};

  if (user) { router.push('/my-collections'); return null; }

  return (
    <div className="bg-carbon">
      {/* ── Hero ── */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Image src="/images/aimily-logo-white.png" alt="aimily" width={200} height={50} className="object-contain h-8 w-auto brightness-[0.95] sepia-[0.15]" priority />
            </Link>
          </div>

          <p className="text-[12px] font-semibold tracking-[0.3em] uppercase text-crema/60 mb-6">
            {trust.whyTitle || 'Why this matters'}
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-crema tracking-tight leading-[1.08] mb-8">
            {trust.heroTitle || 'Your creative strategy is safe with us'}
          </h1>

          <p className="text-lg sm:text-xl font-light text-gris/60 leading-relaxed max-w-2xl mx-auto mb-12">
            {trust.heroSubtitle || 'When you use AI through Aimily, your data is automatically protected by multiple security layers that you would not have if using AI tools directly.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {['whyCard1', 'whyCard2', 'whyCard3'].map((key, i) => (
              <div key={i} className="border border-gris/15 px-5 py-3 max-w-xs">
                <p className="text-[14px] text-crema/75 leading-relaxed">
                  {trust[key] || ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6 Layers ── */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[12px] font-semibold tracking-[0.3em] uppercase text-crema/65 mb-4">
            {trust.howTitle || 'How Aimily protects you'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-light text-crema tracking-tight leading-[1.1] mb-16 max-w-xl">
            {trust.howHeadline || 'Six layers of protection, active on every AI interaction'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gris/[0.06]">
            {SHIELD_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <div key={i} className="bg-carbon p-8 flex gap-5 group hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 border border-crema/15 flex items-center justify-center shrink-0 group-hover:border-crema/30 transition-colors">
                    <Icon className="h-[18px] w-[18px] text-crema/50 group-hover:text-crema/80 transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium text-crema/80 mb-1.5 tracking-wide">
                      {trust[layer.titleKey] || ''}
                    </h3>
                    <p className="text-[14px] text-gris/75 leading-relaxed">
                      {trust[layer.descKey] || ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison: "Con Aimily" vs "Sin Aimily" ── */}
      <section className="py-20 sm:py-28 px-6 bg-crema">
        <div className="max-w-4xl mx-auto">
          <p className="text-[12px] font-semibold tracking-[0.3em] uppercase text-carbon/55 mb-4">
            {trust.compareTitle || 'The difference'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-light text-carbon tracking-tight leading-[1.1] mb-14 max-w-xl">
            {trust.compareHeadline || 'What happens when you use AI through Aimily vs. on your own'}
          </h2>

          <div className="border border-carbon/[0.08]">
            {/* Header */}
            <div className="grid grid-cols-12 border-b border-carbon/[0.08]">
              <div className="col-span-6 p-4 text-[12px] font-semibold tracking-[0.15em] uppercase text-carbon/60">
                {trust.compareFeature || 'Protection'}
              </div>
              <div className="col-span-3 p-4 text-[12px] font-semibold tracking-[0.15em] uppercase text-carbon text-center border-l border-carbon/[0.08]">
                {trust.compareAimily || 'Via Aimily'}
              </div>
              <div className="col-span-3 p-4 text-[12px] font-semibold tracking-[0.15em] uppercase text-carbon/55 text-center border-l border-carbon/[0.08]">
                {trust.compareDirect || 'Direct AI use'}
              </div>
            </div>

            {COMPARISON_ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-12 ${i < COMPARISON_ROWS.length - 1 ? 'border-b border-carbon/[0.05]' : ''}`}>
                <div className="col-span-6 p-4 text-[13px] font-light text-carbon/60">
                  {trust[row.featureKey] || ''}
                </div>
                <div className="col-span-3 p-4 text-center border-l border-carbon/[0.08] flex items-center justify-center">
                  {row.aimily ? (
                    <div className="w-5 h-5 bg-carbon flex items-center justify-center"><Check className="h-3 w-3 text-crema" /></div>
                  ) : (
                    <span className="text-carbon/15">—</span>
                  )}
                </div>
                <div className="col-span-3 p-4 text-center border-l border-carbon/[0.08] flex items-center justify-center">
                  {row.direct ? (
                    <div className="w-5 h-5 bg-carbon/10 flex items-center justify-center"><Check className="h-3 w-3 text-carbon/40" /></div>
                  ) : (
                    <span className="text-carbon/15">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Partners ── */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[12px] font-semibold tracking-[0.3em] uppercase text-crema/65 mb-4">
            {trust.providersTitle || 'Our AI partners'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-light text-crema tracking-tight leading-[1.15] mb-4 max-w-xl">
            {trust.providersHeadline || 'We only work with providers that guarantee zero training on your data'}
          </h2>
          <p className="text-[13px] font-light text-gris/55 mb-12 max-w-xl leading-relaxed">
            {trust.providersDesc || ''}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gris/[0.06]">
            {[
              { name: 'Anthropic', detailKey: 'providerAnthropicDetail' },
              { name: 'Google AI', detailKey: 'providerGoogleDetail' },
              { name: 'Fal.ai', detailKey: 'providerFalDetail' },
              { name: 'Perplexity', detailKey: 'providerPerplexityDetail' },
            ].map((provider) => (
              <div key={provider.name} className="bg-carbon p-5">
                <p className="text-[14px] font-medium text-crema/85 mb-1">{provider.name}</p>
                <p className="text-[13px] text-gris/65 leading-relaxed">{trust[provider.detailKey] || ''}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-28 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light text-crema tracking-tight leading-[1.1] mb-4">
            {trust.ctaTitle || 'Ready to design with confidence?'}
          </h2>
          <p className="text-[14px] font-light text-gris/55 mb-10 leading-relaxed max-w-lg mx-auto">
            {trust.ctaDesc || 'Your next collection deserves the best AI tools with the strongest protection.'}
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
          >
            {trust.ctaButton || 'Start free trial'}
            <ArrowRight className="inline-block ml-2 h-4 w-4" />
          </button>
        </div>
      </section>

      <SiteFooter variant="dark" />

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => router.push('/my-collections')} defaultMode="signup" />
    </div>
  );
}
