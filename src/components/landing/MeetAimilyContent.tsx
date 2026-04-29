'use client';

/* ═══════════════════════════════════════════════════════════════════
   MeetAimilyContent — narrative E2E body of the public landing.

   Every visible string is sourced from `useHomeTranslation()` so the
   whole content respects the global language switcher. EN and ES are
   defined explicitly in src/i18n/home.ts; the other 7 locales fall
   back to EN automatically.

   Proper nouns (place names, supplier names, fashion brands) and
   numeric data (prices, units, percentages, dates) stay literal.
   ═══════════════════════════════════════════════════════════════════ */

import { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useHomeTranslation } from '@/i18n/home';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}
function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  return (
    <div
      className={`animate-fade-in-up ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

function BlockHeading({
  num,
  label,
  title,
  before,
  after,
  description,
  beforeAimily,
  withAimily,
  variant = 'dark',
}: {
  num: string;
  label: string;
  title: ReactNode;
  before: string;
  after: string;
  description: string;
  beforeAimily: string;
  withAimily: string;
  variant?: 'dark' | 'light';
}) {
  const isDark = variant === 'dark';
  return (
    <div className="max-w-7xl mx-auto mb-16 md:mb-24">
      <Reveal>
        <div className="flex items-baseline gap-6 mb-8">
          <span className={`text-[88px] md:text-[120px] font-light tracking-[-0.04em] leading-none ${isDark ? 'text-crema/15' : 'text-carbon/15'}`}>
            {num}
          </span>
          <span className={`text-[12px] tracking-[0.3em] uppercase font-medium ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
            {label}
          </span>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <h2 className={`text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1100px] mb-10 ${isDark ? 'text-crema' : 'text-carbon'}`}>
          {title}
        </h2>
      </Reveal>

      <Reveal delay={250}>
        <p className={`max-w-[680px] text-[16px] md:text-[19px] leading-[1.6] tracking-[-0.01em] mb-12 ${isDark ? 'text-crema/65' : 'text-carbon/65'}`}>
          {description}
        </p>
      </Reveal>

      <Reveal delay={400}>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl border-t ${isDark ? 'border-crema/[0.08]' : 'border-carbon/[0.08]'} pt-8`}>
          <div>
            <div className={`text-[12px] tracking-[0.3em] uppercase font-medium mb-3 ${isDark ? 'text-crema/65' : 'text-carbon/65'}`}>
              {beforeAimily}
            </div>
            <p className={`text-[17px] leading-[1.5] tracking-[-0.01em] italic ${isDark ? 'text-crema/80' : 'text-carbon/80'}`}>
              {before}
            </p>
          </div>
          <div>
            <div className={`text-[12px] tracking-[0.3em] uppercase font-medium mb-3 ${isDark ? 'text-crema' : 'text-carbon'}`}>
              {withAimily}
            </div>
            <p className={`text-[17px] leading-[1.5] tracking-[-0.01em] ${isDark ? 'text-crema' : 'text-carbon'}`}>
              {after}
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

interface MeetAimilyContentProps {
  openAuth: () => void;
}

export function MeetAimilyContent({ openAuth }: MeetAimilyContentProps) {
  const h = useHomeTranslation();

  return (
    <>
      {/* Meet aimily hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-24 border-t border-crema/[0.06]">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />

        <Reveal>
          <div className="text-[12px] tracking-[0.4em] uppercase text-crema/55 font-medium mb-10 text-center">
            {h.meet.eyebrow}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <h1 className="text-[44px] md:text-[88px] lg:text-[120px] font-light tracking-[-0.04em] leading-[0.92] text-center max-w-[1100px]">
            {h.meet.titleLine1}
            <br />
            <span className="italic font-extralight text-crema/85">{h.meet.titleLine2Italic}</span>
          </h1>
        </Reveal>

        <Reveal delay={500}>
          <p className="mt-12 max-w-[680px] text-center text-[16px] md:text-[19px] text-crema/65 leading-[1.55] font-light tracking-[-0.01em]">
            {h.meet.subtitle}
          </p>
        </Reveal>

        <Reveal delay={700}>
          <div className="mt-14 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={openAuth}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-crema text-carbon text-[14px] font-semibold tracking-[-0.01em] hover:bg-crema/90 transition-all"
            >
              {h.meet.cta}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-[13px] text-crema/55 tracking-[-0.01em]">{h.meet.noCard}</span>
          </div>
        </Reveal>

        <Reveal delay={1100}>
          <div className="mt-24 flex flex-col items-center gap-3 text-crema/55">
            <ChevronDown className="h-5 w-5 animate-bounce" />
            <span className="text-[12px] tracking-[0.3em] uppercase">{h.meet.scrollCue}</span>
          </div>
        </Reveal>
      </section>

      {/* Silogism */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-6 text-center">
              {h.silogism.eyebrow}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[36px] md:text-[64px] font-light tracking-[-0.03em] leading-[1.05] text-center max-w-[1000px] mx-auto mb-20">
              {h.silogism.titleA}<span className="italic">{h.silogism.titleAItalic}</span>{h.silogism.titleAEnd}
              <br />
              {h.silogism.titleB}<span className="italic">{h.silogism.titleBItalic}</span>{h.silogism.titleBEnd}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start max-w-5xl mx-auto">
            <Reveal delay={300}>
              <div>
                <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-4">
                  {h.silogism.emilyDate}
                </div>
                <p className="text-[18px] md:text-[22px] font-light leading-[1.5] tracking-[-0.01em] text-crema/85">
                  {h.silogism.emilyText}
                </p>
                <p className="mt-5 text-[14px] text-crema/65 leading-[1.65] tracking-[-0.01em]">
                  {h.silogism.emilyCaption}
                </p>
              </div>
            </Reveal>

            <Reveal delay={500}>
              <div>
                <div className="text-[12px] tracking-[0.3em] uppercase text-crema font-medium mb-4">
                  {h.silogism.aimilyDate}
                </div>
                <p className="text-[22px] md:text-[28px] font-light leading-[1.4] tracking-[-0.015em] text-crema">
                  {h.silogism.aimilyText}
                </p>
                <p className="mt-6 text-[15px] text-crema/75 leading-[1.65] tracking-[-0.01em]">
                  {h.silogism.aimilyCaption}
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={800}>
            <div className="mt-24 max-w-2xl mx-auto text-center text-[16px] text-crema/65 italic font-light leading-[1.7]">
              {h.silogism.quoteLine1}
              <br />
              {h.silogism.quoteLine2}
            </div>
          </Reveal>
        </div>
      </section>

      {/* The problem */}
      <section className="bg-crema text-carbon px-6 py-32 md:py-44">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-6">
              {h.problem.eyebrow}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1000px] mb-12">
              {h.problem.titleStart}<span className="italic">{h.problem.titleItalic}</span>{h.problem.titleEnd}
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[680px] text-[16px] md:text-[19px] text-carbon/65 leading-[1.65] tracking-[-0.01em]">
              {h.problem.subtitle}
            </p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl">
            {[
              { count: '14', label: h.problem.statSpreadsheets },
              { count: '~200', label: h.problem.statEmails },
              { count: '6', label: h.problem.statApps },
              { count: '2 am', label: h.problem.statTuesdays },
            ].map((item, i) => (
              <Reveal key={item.label} delay={300 + i * 100}>
                <div>
                  <div className="text-[40px] md:text-[60px] font-light tracking-[-0.03em] text-carbon leading-none mb-2">
                    {item.count}
                  </div>
                  <div className="text-[12px] tracking-[0.1em] uppercase text-carbon/65 font-medium">
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pull the thread — journey overview */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-6 text-center">
              {h.thread.eyebrow}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] text-center max-w-[1100px] mx-auto mb-8">
              {h.thread.titleStart}<span className="italic">{h.thread.titleItalic1}</span>{h.thread.titleMid}<span className="italic">{h.thread.titleItalic2}</span>{h.thread.titleEnd}
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[700px] mx-auto text-[16px] md:text-[18px] text-crema/65 leading-[1.65] tracking-[-0.01em] text-center mb-24">
              {h.thread.subtitle}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-crema/[0.08] rounded-[20px] overflow-hidden">
            {[
              { num: '01', label: h.thread.step1Label, title: h.thread.step1Title, outputs: h.thread.step1Outputs, stat: h.thread.step1Stat },
              { num: '02', label: h.thread.step2Label, title: h.thread.step2Title, outputs: h.thread.step2Outputs, stat: h.thread.step2Stat },
              { num: '03', label: h.thread.step3Label, title: h.thread.step3Title, outputs: h.thread.step3Outputs, stat: h.thread.step3Stat },
              { num: '04', label: h.thread.step4Label, title: h.thread.step4Title, outputs: h.thread.step4Outputs, stat: h.thread.step4Stat },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <div className="bg-carbon p-8 md:p-10 h-full flex flex-col">
                  <div className="text-[44px] font-light text-crema/20 leading-none tracking-[-0.04em] mb-6">
                    {step.num}
                  </div>
                  <div className="text-[12px] tracking-[0.25em] uppercase text-crema/55 font-medium mb-3">
                    {step.label}
                  </div>
                  <h3 className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] leading-[1.2] text-crema mb-6">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-crema/65 leading-[1.6] tracking-[-0.005em] mb-6 flex-1">
                    {step.outputs}
                  </p>
                  <div className="text-[12px] tracking-[0.05em] text-crema/75 italic font-medium border-t border-crema/[0.08] pt-4">
                    {step.stat}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={600}>
            <p className="mt-16 text-center text-[14px] text-crema/55 italic max-w-[680px] mx-auto leading-[1.65]">
              {h.thread.captionStart}<span className="text-crema/85 not-italic font-medium">{h.thread.captionAzur}</span>{h.thread.captionEnd}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Block 01 — Creative & Brand */}
      <section id="block-1" className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <BlockHeading
          num="01"
          label={h.block1.label}
          title={<>{h.block1.titleStart}<span className="italic">{h.block1.titleItalic}</span>{h.block1.titleEnd}</>}
          description={h.block1.description}
          before={h.block1.before}
          after={h.block1.after}
          beforeAimily={h.blocks.beforeAimily}
          withAimily={h.blocks.withAimily}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5">
          <Reveal className="md:col-span-5">
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-4">
                {h.block1.brandDnaEyebrow}
              </div>
              <div className="text-[24px] md:text-[28px] font-light tracking-[-0.02em] leading-[1.15] mb-6 italic">
                {h.block1.brandDnaTitle}
              </div>
              <div className="space-y-3 text-[14px] leading-[1.65]">
                <div className="flex gap-3">
                  <span className="text-crema/55 w-24 shrink-0 uppercase tracking-[0.1em] text-[11px] mt-1">{h.block1.brandDnaHeritage}</span>
                  <span className="text-crema/85">{h.block1.brandDnaHeritageVal}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-crema/55 w-24 shrink-0 uppercase tracking-[0.1em] text-[11px] mt-1">{h.block1.brandDnaVoice}</span>
                  <span className="text-crema/85">{h.block1.brandDnaVoiceVal}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-crema/55 w-24 shrink-0 uppercase tracking-[0.1em] text-[11px] mt-1">{h.block1.brandDnaValues}</span>
                  <span className="text-crema/85">{h.block1.brandDnaValuesVal}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-crema/55 w-24 shrink-0 uppercase tracking-[0.1em] text-[11px] mt-1">{h.block1.brandDnaRefs}</span>
                  <span className="text-crema/85">{h.block1.brandDnaRefsVal}</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150} className="md:col-span-7">
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-4">
                {h.block1.consumerEyebrow}
              </div>
              <div className="text-[24px] md:text-[28px] font-light tracking-[-0.02em] leading-[1.15] mb-6 italic">
                {h.block1.consumerTitle}
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[14px] leading-[1.55]">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-crema/55 mb-1">{h.block1.consumerDemographics}</div>
                  <div className="text-crema/85">{h.block1.consumerDemographicsVal}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-crema/55 mb-1">{h.block1.consumerPsychographics}</div>
                  <div className="text-crema/85">{h.block1.consumerPsychographicsVal}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-crema/55 mb-1">{h.block1.consumerWhereShops}</div>
                  <div className="text-crema/85">{h.block1.consumerWhereShopsVal}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-crema/55 mb-1">{h.block1.consumerAvoids}</div>
                  <div className="text-crema/85">{h.block1.consumerAvoidsVal}</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-crema/[0.08] text-[13px] text-crema/55 italic leading-[1.6]">
                {h.block1.consumerCaption}
              </div>
            </div>
          </Reveal>

          <Reveal delay={250} className="md:col-span-12">
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-6 md:p-8">
              <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-6">
                {h.block1.moodboardEyebrow}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 group aspect-[4/3] overflow-hidden rounded-[12px] bg-crema/[0.03]">
                  <Image src="/meet-aimily/azur/mood-1-mediterranean-wall.jpg" alt="" width={1600} height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="group aspect-square overflow-hidden rounded-[12px] bg-crema/[0.03]">
                  <Image src="/meet-aimily/azur/mood-2-fabric-detail.jpg" alt="" width={1200} height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="md:col-span-3 group aspect-[16/9] overflow-hidden rounded-[12px] bg-crema/[0.03]">
                  <Image src="/meet-aimily/azur/mood-3-sea-tile.jpg" alt="" width={1920} height={1080}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-crema/[0.06] flex flex-wrap gap-3">
                <span className="text-[12px] tracking-[0.1em] uppercase text-crema/55">{h.block1.paletteExtracted}</span>
                {[
                  { hex: '#3B5F73', label: h.block1.paletteSeaFoam },
                  { hex: '#E9DCC4', label: h.block1.paletteLinen },
                  { hex: '#B85C3A', label: h.block1.paletteTerracotta },
                  { hex: '#1F1B16', label: h.block1.paletteCarbon },
                  { hex: '#D9C68A', label: h.block1.paletteCitronella },
                ].map((c) => (
                  <span key={c.hex} className="inline-flex items-center gap-2 text-[12px] text-crema/75">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Block 02 — Merchandising */}
      <section id="block-2" className="bg-crema text-carbon px-6 py-32 md:py-44">
        <BlockHeading
          variant="light"
          num="02"
          label={h.block2.label}
          title={<>{h.block2.titleStart}<span className="italic">{h.block2.titleItalic}</span>{h.block2.titleEnd}</>}
          description={h.block2.description}
          before={h.block2.before}
          after={h.block2.after}
          beforeAimily={h.blocks.beforeAimily}
          withAimily={h.blocks.withAimily}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5">
          <Reveal className="md:col-span-12">
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-6 md:p-8 overflow-hidden">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-2">
                    {h.block2.rangePlanEyebrow}
                  </div>
                  <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] italic">
                    {h.block2.rangePlanTitle}
                  </div>
                </div>
                <div className="hidden md:flex items-baseline gap-6 text-[13px] text-carbon/65">
                  <div>
                    <span className="block text-[11px] uppercase tracking-[0.1em] text-carbon/55">{h.block2.rangePlanTotalCost}</span>
                    <span className="text-[18px] font-light text-carbon">€127,400</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase tracking-[0.1em] text-carbon/55">{h.block2.rangePlanRevenue}</span>
                    <span className="text-[18px] font-light text-carbon">€512,000</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase tracking-[0.1em] text-carbon/55">{h.block2.rangePlanMargin}</span>
                    <span className="text-[18px] font-light text-carbon">75%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { family: h.block2.family1Name, skus: 8, pricing: '€140 – €380', units: 1850, sample: 'Solène · maxi linen dress', color: '#E9DCC4' },
                  { family: h.block2.family2Name, skus: 6, pricing: '€180 – €520', units: 920, sample: 'Pauline · merino crochet bra', color: '#3B5F73' },
                  { family: h.block2.family3Name, skus: 5, pricing: '€220 – €450', units: 1100, sample: 'Amélie · raffia espadrille', color: '#B85C3A' },
                  { family: h.block2.family4Name, skus: 5, pricing: '€95 – €310', units: 760, sample: 'Marina · raffia tote', color: '#1F1B16' },
                ].map((f, i) => (
                  <Reveal key={f.family} delay={i * 80}>
                    <div className="border border-carbon/[0.08] rounded-[12px] p-5 bg-white hover:bg-carbon/[0.02] transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                        <span className="text-[12px] tracking-[0.1em] uppercase text-carbon/55 font-medium">{f.skus} {h.block2.rangePlanSkus}</span>
                      </div>
                      <div className="text-[18px] font-medium tracking-[-0.02em] mb-3">{f.family}</div>
                      <div className="text-[14px] text-carbon/75 leading-[1.5] mb-1">{f.pricing}</div>
                      <div className="text-[12px] text-carbon/55">{f.units.toLocaleString('en-US')} {h.block2.rangePlanUnits}</div>
                      <div className="mt-4 pt-3 border-t border-carbon/[0.06] text-[12px] text-carbon/65 italic">
                        {h.block2.rangePlanEg} {f.sample}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150} className="md:col-span-7">
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
                {h.block2.channelEyebrow}
              </div>
              <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                {h.block2.channelTitle}
              </div>
              <div className="space-y-3">
                {[
                  { name: h.block2.channel1, pct: 45, color: '#1F1B16' },
                  { name: h.block2.channel2, pct: 30, color: '#3B5F73' },
                  { name: h.block2.channel3, pct: 18, color: '#B85C3A' },
                  { name: h.block2.channel4, pct: 7, color: '#D9C68A' },
                ].map((ch) => (
                  <div key={ch.name}>
                    <div className="flex items-center justify-between text-[14px] mb-1.5">
                      <span className="text-carbon/85">{ch.name}</span>
                      <span className="text-carbon/65 font-medium">{ch.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-carbon/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, backgroundColor: ch.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-carbon/[0.06] text-[13px] text-carbon/55 italic leading-[1.6]">
                {h.block2.channelCaption}
              </div>
            </div>
          </Reveal>

          <Reveal delay={250} className="md:col-span-5">
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
                {h.block2.budgetEyebrow}
              </div>
              <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-8 italic">
                {h.block2.budgetTitle}
              </div>
              <div className="space-y-4 text-[14px]">
                {[
                  { label: h.block2.budget1, amount: '€42,300', share: 33 },
                  { label: h.block2.budget2, amount: '€68,800', share: 54 },
                  { label: h.block2.budget3, amount: '€11,400', share: 9 },
                  { label: h.block2.budget4, amount: '€4,900', share: 4 },
                ].map((b) => (
                  <div key={b.label}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-carbon/85">{b.label}</span>
                      <span className="text-carbon font-medium">{b.amount}</span>
                    </div>
                    <div className="text-[11px] text-carbon/55 uppercase tracking-[0.05em]">{b.share}% {h.block2.budgetCycle}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-carbon/[0.06] flex items-baseline justify-between">
                <span className="text-[12px] uppercase tracking-[0.15em] text-carbon/65">{h.block2.budgetTotalLabel}</span>
                <span className="text-[24px] font-light tracking-[-0.02em]">€127,400</span>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={500}>
          <p className="mt-12 max-w-7xl mx-auto text-[13px] text-carbon/55 italic leading-[1.65]">
            {h.block2.captionFooter}
          </p>
        </Reveal>
      </section>

      {/* Block 03 — Design & Development */}
      <section id="block-3" className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <BlockHeading
          num="03"
          label={h.block3.label}
          title={<>{h.block3.titleStart}<span className="italic">{h.block3.titleItalic}</span>{h.block3.titleEnd}</>}
          description={h.block3.description}
          before={h.block3.before}
          after={h.block3.after}
          beforeAimily={h.blocks.beforeAimily}
          withAimily={h.blocks.withAimily}
        />

        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-4">
              {h.block3.sketchEyebrow}
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-12">
            {[
              { src: '/meet-aimily/azur/sketch-solene.jpg', label: 'Solène · maxi linen dress' },
              { src: '/meet-aimily/azur/sketch-pauline.jpg', label: 'Pauline · linen trouser' },
              { src: '/meet-aimily/azur/sketch-amelie.jpg', label: 'Amélie · raffia espadrille' },
              { src: '/meet-aimily/azur/sketch-marina.jpg', label: 'Marina · raffia tote' },
            ].map((sketch, i) => (
              <Reveal key={sketch.src} delay={i * 100}>
                <div className="group">
                  <div className="aspect-square overflow-hidden rounded-[16px] bg-white">
                    <Image src={sketch.src} alt={sketch.label} width={800} height={800}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="mt-3 text-[12px] tracking-[0.1em] uppercase text-crema/65 font-medium">
                    {sketch.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-4">
              {h.block3.renderEyebrow}
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {[
              { src: '/meet-aimily/azur/render-solene.jpg', label: 'Solène', sub: 'asymmetric maxi · azur', aspect: 'aspect-[3/4]' },
              { src: '/meet-aimily/azur/render-amelie.jpg', label: 'Amélie', sub: 'raffia espadrille · natural', aspect: 'aspect-square' },
              { src: '/meet-aimily/azur/render-marina.jpg', label: 'Marina', sub: 'raffia tote · charcoal', aspect: 'aspect-square' },
            ].map((render, i) => (
              <Reveal key={render.src} delay={i * 120}>
                <div className="group">
                  <div className={`${render.aspect} overflow-hidden rounded-[16px] bg-crema/[0.03] border border-crema/[0.08]`}>
                    <Image src={render.src} alt={render.label} width={1200} height={1200}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="mt-4 flex items-baseline gap-3">
                    <div className="text-[18px] font-light tracking-[-0.02em] text-crema italic">{render.label}</div>
                    <div className="text-[12px] tracking-[0.1em] uppercase text-crema/55">{render.sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
                <div>
                  <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-2">
                    {h.block3.techPackEyebrow}
                  </div>
                  <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] italic">
                    {h.block3.techPackTitle}
                  </div>
                </div>
                <span className="text-[12px] tracking-[0.15em] uppercase text-crema/65 border border-crema/[0.12] rounded-full px-3 py-1.5">
                  {h.block3.techPackBadge}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-carbon/30 rounded-[12px] p-5 border border-crema/[0.06]">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-crema/55 mb-3">{h.block3.measurements}</div>
                  <div className="space-y-2 text-[13px]">
                    {[['Bust','92 cm'],['Waist','74 cm'],['Hip','102 cm'],['Length','138 cm'],['Shoulder','40 cm'],['Sleeve drop','8 cm']].map(([k,v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-crema/65">{k}</span>
                        <span className="text-crema/85 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-carbon/30 rounded-[12px] p-5 border border-crema/[0.06]">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-crema/55 mb-3">{h.block3.bom}</div>
                  <div className="space-y-2 text-[13px]">
                    {[['Main','Linen 230gsm · Solbiati'],['Lining','Cotton voile 80gsm'],['Trim','Mother-of-pearl button × 4'],['Thread','Aurifil 50wt · ecru'],['Label','Woven · azur logo'],['Care','10×3 cm · 4 langs']].map(([k,v]) => (
                      <div key={k}>
                        <div className="text-crema/55 text-[11px] uppercase">{k}</div>
                        <div className="text-crema/85">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-carbon/30 rounded-[12px] p-5 border border-crema/[0.06]">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-crema/55 mb-3">{h.block3.pinComments}</div>
                  <div className="space-y-3 text-[13px]">
                    {[
                      { tag: 'shoulder', user: 'Felipe', msg: 'drop seam to 8cm — confirmed with Solbiati', resolved: true },
                      { tag: 'hem', user: 'Patternmaker', msg: 'rolled hem 1.2cm or curled?', resolved: false },
                      { tag: 'lining', user: 'Felipe', msg: 'no lining on bodice — only skirt', resolved: true },
                    ].map((c, i) => (
                      <div key={i} className="border-l-2 pl-3 border-crema/[0.15]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.resolved ? 'bg-crema/[0.08] text-crema/65' : 'bg-amber-500/20 text-amber-300'}`}>
                            {c.resolved ? h.block3.statusResolved : h.block3.statusOpen}
                          </span>
                          <span className="text-crema/65 text-[11px]">{c.user} · {c.tag}</span>
                        </div>
                        <div className="text-crema/85 leading-[1.45]">{c.msg}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-8 bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
                <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium">
                  {h.block3.timelineEyebrow}
                </div>
                <span className="text-[12px] text-crema/55 italic">{h.block3.timelineCaption}</span>
              </div>
              <div className="grid grid-cols-7 gap-2 text-[11px] text-crema/55 mb-2 uppercase tracking-[0.05em]">
                {['W1','W3','W5','W7','W9','W11','W13'].map((w) => <div key={w}>{w}</div>)}
              </div>
              <div className="space-y-2">
                {[
                  { factory: 'Tasificat · linen', start: 0, length: 5, label: 'Sampling → Production' },
                  { factory: 'L\'Atelier Provence · knit', start: 1, length: 6, label: 'Yarn drop → Knit run' },
                  { factory: 'Calzados Algarve · footwear', start: 2, length: 4, label: 'Last fit → Production' },
                  { factory: 'Casa Loayza · raffia', start: 1, length: 5, label: 'Weave → QC → Ship' },
                  { factory: 'Atlas Weaving · accessories', start: 3, length: 3, label: 'Loom → Finish' },
                ].map((f, i) => (
                  <div key={i} className="grid grid-cols-7 gap-2 items-center">
                    <div className="col-span-7 md:col-span-2 text-[12px] text-crema/75">{f.factory}</div>
                    <div className="col-span-7 md:col-span-5 relative h-6 bg-crema/[0.04] rounded-full overflow-hidden">
                      <div className="absolute h-full rounded-full bg-crema/35 flex items-center px-3 text-[11px] text-carbon font-medium whitespace-nowrap"
                        style={{ left: `${(f.start / 7) * 100}%`, width: `${(f.length / 7) * 100}%` }}>
                        {f.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Block 04 — Marketing & Launch */}
      <section id="block-4" className="bg-crema text-carbon px-6 py-32 md:py-44">
        <BlockHeading
          variant="light"
          num="04"
          label={h.block4.label}
          title={<>{h.block4.titleStart}<span className="italic">{h.block4.titleItalic}</span>{h.block4.titleEnd}</>}
          description={h.block4.description}
          before={h.block4.before}
          after={h.block4.after}
          beforeAimily={h.blocks.beforeAimily}
          withAimily={h.blocks.withAimily}
        />

        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
              {h.block4.editorialEyebrow}
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            <Reveal delay={0}>
              <div className="md:col-span-2 group">
                <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-white">
                  <Image src="/meet-aimily/azur/editorial-solene-beach.jpg" alt="Solène" width={1600} height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="mt-3 text-[12px] tracking-[0.1em] uppercase text-carbon/65 font-medium">
                  Solène · Editorial · Cap Ferret · golden hour
                </div>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="group">
                <div className="aspect-[3/4] overflow-hidden rounded-[16px] bg-white">
                  <Image src="/meet-aimily/azur/editorial-azur-lifestyle.jpg" alt="AZUR" width={900} height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="mt-3 text-[12px] tracking-[0.1em] uppercase text-carbon/65 font-medium">
                  Lifestyle · Mallorca alley
                </div>
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div className="md:col-span-3 group">
                <div className="aspect-[16/9] overflow-hidden rounded-[16px] bg-white">
                  <Image src="/meet-aimily/azur/editorial-amelie-feet.jpg" alt="Amélie" width={1920} height={1080}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="mt-3 text-[12px] tracking-[0.1em] uppercase text-carbon/65 font-medium">
                  Amélie · Product detail · terracotta floor
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            <Reveal>
              <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10">
                <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
                  {h.block4.dropEyebrow}
                </div>
                <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                  {h.block4.dropTitle}
                </div>
                <div className="space-y-5">
                  {[
                    { name: 'Pre-Tide', date: '15 Mar 2027', skus: 8, focus: 'Linen · early pre-orders · DTC only' },
                    { name: 'High Tide', date: '08 May 2027', skus: 12, focus: 'Full launch · all 6 stockists · pop-up opens' },
                    { name: 'Low Tide', date: '12 Jul 2027', skus: 4, focus: 'End-of-season · resort capsule · sell-through last' },
                  ].map((d) => (
                    <div key={d.name} className="flex items-baseline gap-5 pb-5 border-b border-carbon/[0.06] last:border-0">
                      <div className="w-20 shrink-0">
                        <div className="text-[16px] font-medium tracking-[-0.02em]">{d.name}</div>
                        <div className="text-[12px] text-carbon/55 mt-0.5">{d.date}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] text-carbon/85 leading-[1.5]">{d.focus}</div>
                        <div className="text-[11px] text-carbon/55 mt-1 uppercase tracking-[0.05em]">{d.skus} {h.block4.dropSkus}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10">
                <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
                  {h.block4.salesEyebrow}
                </div>
                <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                  {h.block4.salesTitle}
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { label: h.block4.salesKpi1, value: '€84,200', delta: '+38% vs target' },
                    { label: h.block4.salesKpi2, value: '24%', delta: 'Day 1 of 14' },
                    { label: h.block4.salesKpi3, value: 'Solène', delta: '180 units · sold out' },
                    { label: h.block4.salesKpi4, value: '76%', delta: 'Above plan +1pp' },
                    { label: h.block4.salesKpi5, value: '52 / 48', delta: 'In line with plan' },
                    { label: h.block4.salesKpi6, value: '1,420', delta: 'Cap Ferret · day 1' },
                  ].map((kpi) => (
                    <div key={kpi.label}>
                      <div className="text-[11px] uppercase tracking-[0.1em] text-carbon/55 mb-1">{kpi.label}</div>
                      <div className="text-[24px] font-light tracking-[-0.02em] leading-none">{kpi.value}</div>
                      <div className="text-[12px] text-carbon/65 mt-1">{kpi.delta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10">
              <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
                {h.block4.contentEyebrow}
              </div>
              <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                {h.block4.contentTitle}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
                {[
                  { tier: 'E-commerce', desc: 'White background · 4 angles · 2000×2000' },
                  { tier: 'Still life', desc: 'Editorial flat · prop-styled · brand mood' },
                  { tier: 'Editorial', desc: 'On-model · location · 28 aimily models' },
                  { tier: 'Campaign', desc: 'Hero stories · 9:16 video clips · Kling 2.1' },
                ].map((t, i) => (
                  <div key={t.tier} className="bg-carbon/[0.03] rounded-[12px] p-4 border border-carbon/[0.06]">
                    <div className="text-[11px] tracking-[0.15em] uppercase text-carbon/55 font-medium mb-2">
                      {h.block4.tier} 0{i + 1}
                    </div>
                    <div className="text-[14px] font-medium mb-2">{t.tier}</div>
                    <div className="text-[12px] text-carbon/65 leading-[1.5]">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Enterprise artifacts */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-6">
              {h.artifacts.eyebrow}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1100px] mb-20">
              <span className="italic">{h.artifacts.titleItalic}</span>{h.artifacts.titleEnd}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              { title: h.artifacts.techPackTitle, desc: h.artifacts.techPackDesc, tag: h.artifacts.techPackTag },
              { title: h.artifacts.deckTitle, desc: h.artifacts.deckDesc, tag: h.artifacts.deckTag },
              { title: h.artifacts.calendarTitle, desc: h.artifacts.calendarDesc, tag: h.artifacts.calendarTag },
              { title: h.artifacts.rangeTitle, desc: h.artifacts.rangeDesc, tag: h.artifacts.rangeTag },
              { title: h.artifacts.wholesaleTitle, desc: h.artifacts.wholesaleDesc, tag: h.artifacts.wholesaleTag },
              { title: h.artifacts.contentTitle, desc: h.artifacts.contentDesc, tag: h.artifacts.contentTag },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div>
                  <div className="text-[28px] md:text-[34px] font-light tracking-[-0.02em] leading-[1.15] mb-4 text-crema">
                    {item.title}
                  </div>
                  <p className="text-[15px] text-crema/65 leading-[1.65] tracking-[-0.01em] mb-5 max-w-[360px]">
                    {item.desc}
                  </p>
                  <span className="inline-block text-[11px] tracking-[0.2em] uppercase text-crema/65 font-medium border-t border-crema/15 pt-3">
                    {item.tag}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* StudioNN origin */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-6">
              {h.studionn.eyebrow}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[36px] md:text-[58px] font-light tracking-[-0.03em] leading-[1.1] mb-12">
              {h.studionn.titleStart}<span className="italic">{h.studionn.titleItalic1}</span>{h.studionn.titleMid}<span className="italic">{h.studionn.titleItalic2}</span>{h.studionn.titleEnd}
            </h2>
          </Reveal>
          <Reveal delay={300}>
            <div className="space-y-8 text-[17px] md:text-[19px] font-light leading-[1.55] tracking-[-0.01em] text-crema/75 max-w-[760px]">
              <p>{h.studionn.p1}</p>
              <p className="text-crema/85">{h.studionn.p2}</p>
              <p>{h.studionn.p3}</p>
            </div>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-16 flex items-baseline gap-6 text-[13px] tracking-[0.15em] uppercase text-crema/55 font-medium flex-wrap">
              <span>StudioNN Agency S.L.</span>
              <span className="opacity-50">·</span>
              <span>Alicante, Spain</span>
              <span className="opacity-50">·</span>
              <span>Est. 2023</span>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
