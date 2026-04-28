'use client';

/* ═══════════════════════════════════════════════════════════════════
   /meet-aimily — DWP-themed launch landing (v2 · 2026-04-28)

   Audience drops here from a meme/social campaign. Must convert by:
     1. Hooking with the Miranda angle ("the assistant Miranda would have hired")
     2. Showing aimily is the END-TO-END platform — from idea to sold-out —
        not just an "AI image generator for fashion"
     3. Walking through the FOUR BLOCKS (Creative · Merchandising · Design ·
        Marketing) using AZUR · SS27 as the connecting thread
     4. Closing with pricing + CTA
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { track, Events } from '@/lib/posthog';

/* ── Reveal wrapper — content is always rendered visible.
     Subtle fade-up applied via CSS animation triggered on mount.
     Avoids IntersectionObserver flakiness in headless captures.    */
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

/* ── Block heading — repeated section header (01..04) */
function BlockHeading({
  num,
  label,
  title,
  before,
  after,
  description,
  variant = 'dark',
}: {
  num: string;
  label: string;
  title: ReactNode;
  before: string;
  after: string;
  description: string;
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
          <span className={`text-[11px] tracking-[0.3em] uppercase font-medium ${isDark ? 'text-crema/45' : 'text-carbon/40'}`}>
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
        <p className={`max-w-[680px] text-[16px] md:text-[19px] leading-[1.6] tracking-[-0.01em] mb-12 ${isDark ? 'text-crema/55' : 'text-carbon/60'}`}>
          {description}
        </p>
      </Reveal>

      <Reveal delay={400}>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl border-t ${isDark ? 'border-crema/[0.08]' : 'border-carbon/[0.08]'} pt-8`}>
          <div>
            <div className={`text-[10px] tracking-[0.3em] uppercase font-medium mb-3 ${isDark ? 'text-crema/35' : 'text-carbon/35'}`}>
              Before aimily
            </div>
            <p className={`text-[15px] leading-[1.5] tracking-[-0.01em] italic font-light ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
              {before}
            </p>
          </div>
          <div>
            <div className={`text-[10px] tracking-[0.3em] uppercase font-medium mb-3 ${isDark ? 'text-crema/55' : 'text-carbon/65'}`}>
              With aimily
            </div>
            <p className={`text-[15px] leading-[1.5] tracking-[-0.01em] font-light ${isDark ? 'text-crema/85' : 'text-carbon/85'}`}>
              {after}
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────────── */
export default function MeetAimilyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    track(Events.LANDING_VIEWED, { page: 'meet-aimily' });
  }, []);

  const openAuth = () => {
    track(Events.CTA_CLICKED, { source: 'meet-aimily', authed: !!user });
    if (user) router.push('/my-collections');
    else {
      track(Events.AUTH_OPENED, { source: 'meet-aimily' });
      setAuthOpen(true);
    }
  };

  return (
    <div className="bg-carbon text-crema min-h-screen overflow-x-hidden">
      {/* GlobalNav (mounted in root layout) handles the top navigation. */}

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-24">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />

        <Reveal>
          <div className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase text-crema/45 font-medium mb-10 text-center">
            Meet aimily
          </div>
        </Reveal>

        <Reveal delay={200}>
          <h1 className="text-[44px] md:text-[88px] lg:text-[120px] font-light tracking-[-0.04em] leading-[0.92] text-center max-w-[1100px]">
            The AI assistant
            <br />
            <span className="italic font-extralight text-crema/85">Miranda would have hired.</span>
          </h1>
        </Reveal>

        <Reveal delay={500}>
          <p className="mt-12 max-w-[680px] text-center text-[16px] md:text-[19px] text-crema/55 leading-[1.55] font-light tracking-[-0.01em]">
            One platform takes a fashion idea from the spark of a moodboard to a sold-out launch.
            Brand DNA. Range plan. Tech packs. Campaigns. Every block, connected.
          </p>
        </Reveal>

        <Reveal delay={700}>
          <div className="mt-14 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={openAuth}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-crema text-carbon text-[14px] font-semibold tracking-[-0.01em] hover:bg-crema/90 transition-all"
            >
              Start your collection — free 14 days
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-[12px] text-crema/35 tracking-[-0.01em]">No credit card required</span>
          </div>
        </Reveal>

        <Reveal delay={1100}>
          <div className="mt-24 flex flex-col items-center gap-3 text-crema/35">
            <ChevronDown className="h-5 w-5 animate-bounce" />
            <span className="text-[10px] tracking-[0.3em] uppercase">See the journey</span>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════ SILOGISM (Emily → aimily) ═══════════════════════ */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6 text-center">
              The Devil Wears Prada · 2006 → 2026
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[36px] md:text-[64px] font-light tracking-[-0.03em] leading-[1.05] text-center max-w-[1000px] mx-auto mb-20">
              Emily did it <span className="italic">by hand</span>.
              <br />
              aimily does it <span className="italic">in seconds</span>.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start max-w-5xl mx-auto">
            <Reveal delay={300}>
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-crema/35 font-medium mb-4">
                  2006 · Emily
                </div>
                <p className="text-[18px] md:text-[22px] font-light leading-[1.5] tracking-[-0.01em] text-crema/75">
                  An assistant who never slept. Coordinated suppliers. Tracked samples. Managed Miranda's diary.
                  Held the office together with caffeine, gut feeling, and grace.
                </p>
                <p className="mt-5 text-[13px] text-crema/40 leading-[1.65] tracking-[-0.01em]">
                  Did everything in fashion — exhausted, exploited, limited.
                </p>
              </div>
            </Reveal>

            <Reveal delay={500}>
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-4">
                  2026 · aimily
                </div>
                <p className="text-[18px] md:text-[22px] font-light leading-[1.5] tracking-[-0.01em] text-crema">
                  An AI assistant who never sleeps. Generates moodboards. Builds range plans. Drafts campaigns.
                  Walks a collection from spark to launch — across every block of the business.
                </p>
                <p className="mt-5 text-[13px] text-crema/55 leading-[1.65] tracking-[-0.01em]">
                  Does it too — at scale, in seconds, never burned out.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={800}>
            <div className="mt-24 max-w-2xl mx-auto text-center text-[15px] text-crema/45 italic font-light leading-[1.7]">
              "Miranda needed Emily.
              <br />
              You need aimily."
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ THE PROBLEM ═══════════════════════ */}
      <section className="bg-crema text-carbon px-6 py-32 md:py-44">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-carbon/40 font-medium mb-6">
              The problem
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1000px] mb-12">
              Today, fashion runs on <span className="italic">14 spreadsheets</span>,
              <br className="hidden md:block" />
              one creative director, and a prayer.
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[680px] text-[16px] md:text-[19px] text-carbon/55 leading-[1.65] tracking-[-0.01em]">
              The brand brief lives in Notion. The range plan in Excel. The tech pack in PDF. The drop calendar in
              Google Calendar. The campaign in InDesign. Nothing talks to anything else. Information walks the building.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl">
            {[
              { count: '14', label: 'spreadsheets' },
              { count: '~200', label: 'emails per day' },
              { count: '6', label: 'apps to switch' },
              { count: '2 am', label: 'Tuesdays' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={300 + i * 100}>
                <div>
                  <div className="text-[40px] md:text-[60px] font-light tracking-[-0.03em] text-carbon leading-none mb-2">
                    {item.count}
                  </div>
                  <div className="text-[12px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
                    {item.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PULL THE THREAD — JOURNEY OVERVIEW ═══════════════════════ */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6 text-center">
              Pull the thread
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] text-center max-w-[1100px] mx-auto mb-8">
              From a <span className="italic">spark</span> in your head
              <br />
              to a <span className="italic">sold-out</span> drop.
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[700px] mx-auto text-[16px] md:text-[18px] text-crema/55 leading-[1.65] tracking-[-0.01em] text-center mb-24">
              Four blocks, one platform. A vision becomes a brand DNA card. The DNA becomes a range plan.
              The plan becomes tech packs. The packs become product photos. The photos become a launch.
              Each block reads from the one before — nothing gets retyped.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-crema/[0.08] rounded-[20px] overflow-hidden">
            {[
              {
                num: '01',
                label: 'Creative & Brand',
                title: 'Codify the vision',
                outputs: 'Brand DNA · Consumer profile · Moodboard · Trend signal',
                stat: '3 weeks → 1 hour',
              },
              {
                num: '02',
                label: 'Merchandising',
                title: 'Make it a business',
                outputs: 'Range plan · Pricing strategy · Channel split · Budget',
                stat: 'CFO-ready in 1 day',
              },
              {
                num: '03',
                label: 'Design & Development',
                title: 'Ship it to the factory',
                outputs: 'Sketches · Colorways · Tech packs · Production timeline',
                stat: '6 weeks → 6 days',
              },
              {
                num: '04',
                label: 'Marketing & Launch',
                title: 'Sell it before launch',
                outputs: 'Editorials · Drop calendar · GTM · Sales dashboard',
                stat: 'Sold-out before ribbon-cut',
              },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <div className="bg-carbon p-8 md:p-10 h-full flex flex-col">
                  <div className="text-[44px] font-light text-crema/20 leading-none tracking-[-0.04em] mb-6">
                    {step.num}
                  </div>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-crema/45 font-medium mb-3">
                    {step.label}
                  </div>
                  <h3 className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] leading-[1.2] text-crema mb-6">
                    {step.title}
                  </h3>
                  <p className="text-[12px] text-crema/55 leading-[1.6] tracking-[-0.005em] mb-6 flex-1">
                    {step.outputs}
                  </p>
                  <div className="text-[11px] tracking-[0.05em] text-crema/65 italic font-medium border-t border-crema/[0.08] pt-4">
                    {step.stat}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={600}>
            <p className="mt-16 text-center text-[12px] text-crema/35 italic max-w-[680px] mx-auto leading-[1.65]">
              Below: the same thread pulled all the way through, using <span className="text-crema/55 not-italic font-medium">AZUR · SS27</span>{' '}
              — a real Mediterranean resort collection, generated end-to-end inside aimily.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ BLOCK 01 — CREATIVE & BRAND ═══════════════════════ */}
      <section id="block-1" className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <BlockHeading
          num="01"
          label="Creative & Brand"
          title={<>Start with a <span className="italic">vision</span>, not a spreadsheet.</>}
          description="Type the brief. aimily extracts the brand DNA, builds the consumer profile, generates a curated moodboard, and pulls trend signals from live social data — so every downstream output speaks the same language."
          before="Three weeks of mood meetings. PDFs that nobody reads. A creative direction that lives in one designer's head."
          after="Vision codified in 60 minutes. Brand DNA, target consumer, color palette and references — all stored, all queryable, all reused by every other block."
        />

        {/* Outputs grid: Brand DNA card + Consumer + Moodboard demo (existing AZUR images) */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Brand DNA card */}
          <Reveal className="md:col-span-5">
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-4">
                Brand DNA · azur
              </div>
              <div className="text-[24px] md:text-[28px] font-light tracking-[-0.02em] leading-[1.15] mb-6 italic">
                Wear what the sea would wear.
              </div>
              <div className="space-y-3 text-[13px] leading-[1.65]">
                <div className="flex gap-3">
                  <span className="text-crema/40 w-24 shrink-0 uppercase tracking-[0.1em] text-[10px] mt-1">Heritage</span>
                  <span className="text-crema/75">Côte d'Azur — sun-bleached linen, raffia, terracotta tile</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-crema/40 w-24 shrink-0 uppercase tracking-[0.1em] text-[10px] mt-1">Voice</span>
                  <span className="text-crema/75">Quiet luxury · fluent French · "Côte du Sol"</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-crema/40 w-24 shrink-0 uppercase tracking-[0.1em] text-[10px] mt-1">Values</span>
                  <span className="text-crema/75">Heritage materials · slow craft · zero plastic</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-crema/40 w-24 shrink-0 uppercase tracking-[0.1em] text-[10px] mt-1">Refs</span>
                  <span className="text-crema/75">Jacquemus · Khaite · Hereu · La DoubleJ</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Consumer profile */}
          <Reveal delay={150} className="md:col-span-7">
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-4">
                Consumer profile · azur woman
              </div>
              <div className="text-[24px] md:text-[28px] font-light tracking-[-0.02em] leading-[1.15] mb-6 italic">
                She summers the same way every year.
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[13px] leading-[1.55]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-crema/40 mb-1">Demographics</div>
                  <div className="text-crema/75">Women 28–45 · €120–250k HHI · Paris, NYC, Madrid, Milan</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-crema/40 mb-1">Psychographics</div>
                  <div className="text-crema/75">Heritage-conscious · slow-shopper · post-trend</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-crema/40 mb-1">Where she shops</div>
                  <div className="text-crema/75">Net-a-Porter · Mytheresa · concept stores in resort towns</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-crema/40 mb-1">What she avoids</div>
                  <div className="text-crema/75">Logos · synthetics · anything that follows trends</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-crema/[0.08] text-[12px] text-crema/45 italic leading-[1.6]">
                Generated from the brief by aimily — used to lock pricing tier, channel mix, and campaign tone in the next blocks.
              </div>
            </div>
          </Reveal>

          {/* Moodboard demo — use existing AZUR mood images */}
          <Reveal delay={250} className="md:col-span-12">
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-6 md:p-8">
              <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6">
                Moodboard generated · 30 seconds · azur · ss27
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 group aspect-[4/3] overflow-hidden rounded-[12px] bg-crema/[0.03]">
                  <Image
                    src="/meet-aimily/azur/mood-1-mediterranean-wall.jpg"
                    alt="AZUR moodboard — Mediterranean wall"
                    width={1600}
                    height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="group aspect-square overflow-hidden rounded-[12px] bg-crema/[0.03]">
                  <Image
                    src="/meet-aimily/azur/mood-2-fabric-detail.jpg"
                    alt="AZUR moodboard — fabric detail"
                    width={1200}
                    height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="md:col-span-3 group aspect-[16/9] overflow-hidden rounded-[12px] bg-crema/[0.03]">
                  <Image
                    src="/meet-aimily/azur/mood-3-sea-tile.jpg"
                    alt="AZUR moodboard — sea tile"
                    width={1920}
                    height={1080}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-crema/[0.06] flex flex-wrap gap-3">
                <span className="text-[11px] tracking-[0.1em] uppercase text-crema/40">Palette extracted</span>
                {[
                  { hex: '#3B5F73', label: 'Sea Foam' },
                  { hex: '#E9DCC4', label: 'Linen' },
                  { hex: '#B85C3A', label: 'Terracotta' },
                  { hex: '#1F1B16', label: 'Carbon' },
                  { hex: '#D9C68A', label: 'Citronella' },
                ].map((c) => (
                  <span key={c.hex} className="inline-flex items-center gap-2 text-[11px] text-crema/65">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ BLOCK 02 — MERCHANDISING ═══════════════════════ */}
      <section id="block-2" className="bg-crema text-carbon px-6 py-32 md:py-44">
        <BlockHeading
          variant="light"
          num="02"
          label="Merchandising"
          title={<>From <span className="italic">gut feeling</span> to a business model.</>}
          description="The block your CFO actually cares about. aimily turns the brand DNA into a range plan: families, SKUs, pricing tiers, channel split, and budget — every line aware of margin, sell-through risk, and production capacity."
          before="An Excel that nobody trusts. Buyers ask for a line sheet, you scramble. The CFO asks for margin per family, you escape the meeting."
          after="A range plan that finance signs in a day. Pricing locked by family. Channel allocation based on consumer signal. Budget reconciled with production capacity."
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Range plan grid */}
          <Reveal className="md:col-span-12">
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-6 md:p-8 overflow-hidden">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-carbon/45 font-medium mb-2">
                    Range plan · azur · ss27
                  </div>
                  <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] italic">
                    24 SKUs across 4 families.
                  </div>
                </div>
                <div className="hidden md:flex items-baseline gap-6 text-[12px] text-carbon/55">
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.1em] text-carbon/40">Total Cost</span>
                    <span className="text-[18px] font-light text-carbon">€127,400</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.1em] text-carbon/40">Revenue forecast</span>
                    <span className="text-[18px] font-light text-carbon">€512,000</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.1em] text-carbon/40">Avg. margin</span>
                    <span className="text-[18px] font-light text-carbon">75%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  {
                    family: 'Skin Linens',
                    skus: 8,
                    pricing: '€140 – €380',
                    units: 1850,
                    sample: 'Solène · maxi linen dress',
                    color: '#E9DCC4',
                  },
                  {
                    family: 'Sculpted Knits',
                    skus: 6,
                    pricing: '€180 – €520',
                    units: 920,
                    sample: 'Pauline · merino crochet bra',
                    color: '#3B5F73',
                  },
                  {
                    family: 'Sun Footwear',
                    skus: 5,
                    pricing: '€220 – €450',
                    units: 1100,
                    sample: 'Amélie · raffia espadrille',
                    color: '#B85C3A',
                  },
                  {
                    family: 'Marea Objects',
                    skus: 5,
                    pricing: '€95 – €310',
                    units: 760,
                    sample: 'Marina · raffia tote',
                    color: '#1F1B16',
                  },
                ].map((f, i) => (
                  <Reveal key={f.family} delay={i * 80}>
                    <div className="border border-carbon/[0.08] rounded-[12px] p-5 bg-white hover:bg-carbon/[0.02] transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                        <span className="text-[11px] tracking-[0.1em] uppercase text-carbon/40 font-medium">{f.skus} SKUs</span>
                      </div>
                      <div className="text-[18px] font-medium tracking-[-0.02em] mb-3">{f.family}</div>
                      <div className="text-[13px] text-carbon/65 leading-[1.5] mb-1">{f.pricing}</div>
                      <div className="text-[11px] text-carbon/45">{f.units.toLocaleString('en-US')} units forecast</div>
                      <div className="mt-4 pt-3 border-t border-carbon/[0.06] text-[11px] text-carbon/50 italic">
                        e.g. {f.sample}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Channel split */}
          <Reveal delay={150} className="md:col-span-7">
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[10px] tracking-[0.3em] uppercase text-carbon/45 font-medium mb-4">
                Channel allocation
              </div>
              <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                Where the units go.
              </div>
              <div className="space-y-3">
                {[
                  { name: 'DTC · azur.com', pct: 45, color: '#1F1B16' },
                  { name: 'Wholesale · 6 stockists', pct: 30, color: '#3B5F73' },
                  { name: 'Concept stores · resort towns', pct: 18, color: '#B85C3A' },
                  { name: 'Pop-up · Cap Ferret', pct: 7, color: '#D9C68A' },
                ].map((ch) => (
                  <div key={ch.name}>
                    <div className="flex items-center justify-between text-[13px] mb-1.5">
                      <span className="text-carbon/75">{ch.name}</span>
                      <span className="text-carbon/55 font-medium">{ch.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-carbon/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, backgroundColor: ch.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-carbon/[0.06] text-[12px] text-carbon/45 italic leading-[1.6]">
                Driven by the consumer profile — DTC over wholesale because she shops direct, pop-up because she summers in coastal towns.
              </div>
            </div>
          </Reveal>

          {/* Budget */}
          <Reveal delay={250} className="md:col-span-5">
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10 h-full">
              <div className="text-[10px] tracking-[0.3em] uppercase text-carbon/45 font-medium mb-4">
                Budget · ss27 cycle
              </div>
              <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-8 italic">
                Reconciled to production.
              </div>
              <div className="space-y-4 text-[13px]">
                {[
                  { label: 'Materials & sampling', amount: '€42,300', share: 33 },
                  { label: 'Production (5 factories)', amount: '€68,800', share: 54 },
                  { label: 'Marketing & launch', amount: '€11,400', share: 9 },
                  { label: 'Logistics & 3PL', amount: '€4,900', share: 4 },
                ].map((b) => (
                  <div key={b.label}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-carbon/75">{b.label}</span>
                      <span className="text-carbon font-medium">{b.amount}</span>
                    </div>
                    <div className="text-[10px] text-carbon/40 uppercase tracking-[0.05em]">{b.share}% of cycle</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-carbon/[0.06] flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-[0.15em] text-carbon/55">Total invested</span>
                <span className="text-[24px] font-light tracking-[-0.02em]">€127,400</span>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={500}>
          <p className="mt-12 max-w-7xl mx-auto text-[12px] text-carbon/40 italic leading-[1.65]">
            Range plan, channel mix and budget all generated by aimily from the brand DNA above. Excel export ready for ERP.
          </p>
        </Reveal>
      </section>

      {/* ═══════════════════════ BLOCK 03 — DESIGN & DEVELOPMENT ═══════════════════════ */}
      <section id="block-3" className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <BlockHeading
          num="03"
          label="Design & Development"
          title={<>Pixel to <span className="italic">pattern</span>, ready for the factory.</>}
          description="The range plan becomes design briefs. aimily generates technical sketches, applies colorways, builds tech packs the patternmaker can read, and tracks production from sample to delivery — every step linked to the SKU above."
          before="Sketches the factory can't read. Tech packs that miss measurements. Three back-and-forth rounds before the first sample lands."
          after="Each SKU comes with a generated sketch, a colorway grid, a tech pack, a BOM and a pin-comment thread. First sample matches the brief."
        />

        {/* Sketch grid (existing AZUR sketches) */}
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-4">
              Sketch · auto-generated · 4 SKUs
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
                    <Image
                      src={sketch.src}
                      alt={sketch.label}
                      width={800}
                      height={800}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="mt-3 text-[11px] tracking-[0.1em] uppercase text-crema/50 font-medium">
                    {sketch.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* 3D renders */}
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-4">
              Sketch → 3D render · 60 seconds · colorway applied
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
                    <Image
                      src={render.src}
                      alt={render.label}
                      width={1200}
                      height={1200}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="mt-4 flex items-baseline gap-3">
                    <div className="text-[18px] font-light tracking-[-0.02em] text-crema italic">{render.label}</div>
                    <div className="text-[11px] tracking-[0.1em] uppercase text-crema/45">{render.sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Tech pack mockup */}
          <Reveal>
            <div className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-2">
                    Tech pack · solène · maxi linen dress
                  </div>
                  <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] italic">
                    A3 landscape · factory inbox ready.
                  </div>
                </div>
                <span className="text-[11px] tracking-[0.15em] uppercase text-crema/45 border border-crema/[0.12] rounded-full px-3 py-1.5">
                  PDF · annotated · 6 pages
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Measurements column */}
                <div className="bg-carbon/30 rounded-[12px] p-5 border border-crema/[0.06]">
                  <div className="text-[10px] uppercase tracking-[0.1em] text-crema/45 mb-3">Measurements (S)</div>
                  <div className="space-y-2 text-[12px]">
                    {[
                      ['Bust', '92 cm'],
                      ['Waist', '74 cm'],
                      ['Hip', '102 cm'],
                      ['Length', '138 cm'],
                      ['Shoulder', '40 cm'],
                      ['Sleeve drop', '8 cm'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-crema/55">{k}</span>
                        <span className="text-crema/85 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOM column */}
                <div className="bg-carbon/30 rounded-[12px] p-5 border border-crema/[0.06]">
                  <div className="text-[10px] uppercase tracking-[0.1em] text-crema/45 mb-3">Bill of materials</div>
                  <div className="space-y-2 text-[12px]">
                    {[
                      ['Main', 'Linen 230gsm · Solbiati'],
                      ['Lining', 'Cotton voile 80gsm'],
                      ['Trim', 'Mother-of-pearl button × 4'],
                      ['Thread', 'Aurifil 50wt · ecru'],
                      ['Label', 'Woven · azur logo'],
                      ['Care', '10×3 cm · 4 langs'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-crema/45 text-[10px] uppercase">{k}</div>
                        <div className="text-crema/85">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pin comments column */}
                <div className="bg-carbon/30 rounded-[12px] p-5 border border-crema/[0.06]">
                  <div className="text-[10px] uppercase tracking-[0.1em] text-crema/45 mb-3">Open pin comments</div>
                  <div className="space-y-3 text-[12px]">
                    {[
                      { tag: 'shoulder', user: 'Felipe', msg: 'drop seam to 8cm — confirmed with Solbiati', resolved: true },
                      { tag: 'hem', user: 'Patternmaker', msg: 'rolled hem 1.2cm or curled?', resolved: false },
                      { tag: 'lining', user: 'Felipe', msg: 'no lining on bodice — only skirt', resolved: true },
                    ].map((c, i) => (
                      <div key={i} className="border-l-2 pl-3 border-crema/[0.15]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full ${c.resolved ? 'bg-crema/[0.08] text-crema/55' : 'bg-amber-500/20 text-amber-300'}`}>
                            {c.resolved ? 'resolved' : 'open'}
                          </span>
                          <span className="text-crema/55 text-[10px]">{c.user} · {c.tag}</span>
                        </div>
                        <div className="text-crema/75 leading-[1.45]">{c.msg}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Production timeline strip */}
          <Reveal delay={300}>
            <div className="mt-8 bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
                <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium">
                  Production timeline · 5 factories
                </div>
                <span className="text-[11px] text-crema/45 italic">14 weeks · 24 SKUs · 4 drops</span>
              </div>
              <div className="grid grid-cols-7 gap-2 text-[10px] text-crema/45 mb-2 uppercase tracking-[0.05em]">
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
                    <div className="col-span-7 md:col-span-2 text-[11px] text-crema/65">{f.factory}</div>
                    <div className="col-span-7 md:col-span-5 relative h-6 bg-crema/[0.04] rounded-full overflow-hidden">
                      <div
                        className="absolute h-full rounded-full bg-crema/35 flex items-center px-3 text-[10px] text-carbon font-medium whitespace-nowrap"
                        style={{ left: `${(f.start / 7) * 100}%`, width: `${(f.length / 7) * 100}%` }}
                      >
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

      {/* ═══════════════════════ BLOCK 04 — MARKETING & LAUNCH ═══════════════════════ */}
      <section id="block-4" className="bg-crema text-carbon px-6 py-32 md:py-44">
        <BlockHeading
          variant="light"
          num="04"
          label="Marketing & Launch"
          title={<>Sold-out <span className="italic">before</span> the ribbon-cut.</>}
          description="The collection isn't done when it ships — it's done when it sells. aimily produces editorials without a photoshoot, schedules drops, plans content per channel, and tracks sales in a single dashboard. Marketing reads from the SKUs above — never from a brief PDF."
          before="Marketing scrambles two weeks before launch. Photographer cancels. Lookbook is rushed. Drop date slips. Pre-orders die in the pipe."
          after="The day a SKU is signed, its editorial is ready. Drop calendar locked across stockists. KPIs live before the launch email goes out."
        />

        {/* Editorial demos (existing AZUR images) */}
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[10px] tracking-[0.3em] uppercase text-carbon/45 font-medium mb-4">
              Editorial · on-model · no photoshoot
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            <Reveal delay={0}>
              <div className="md:col-span-2 group">
                <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-white">
                  <Image
                    src="/meet-aimily/azur/editorial-solene-beach.jpg"
                    alt="Solène on a Mediterranean beach"
                    width={1600}
                    height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="mt-3 text-[11px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
                  Solène · Editorial · Cap Ferret · golden hour
                </div>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="group">
                <div className="aspect-[3/4] overflow-hidden rounded-[16px] bg-white">
                  <Image
                    src="/meet-aimily/azur/editorial-azur-lifestyle.jpg"
                    alt="AZUR lifestyle"
                    width={900}
                    height={1200}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="mt-3 text-[11px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
                  Lifestyle · Mallorca alley
                </div>
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div className="md:col-span-3 group">
                <div className="aspect-[16/9] overflow-hidden rounded-[16px] bg-white">
                  <Image
                    src="/meet-aimily/azur/editorial-amelie-feet.jpg"
                    alt="Amélie on terracotta tile"
                    width={1920}
                    height={1080}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="mt-3 text-[11px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
                  Amélie · Product detail · terracotta floor
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {/* Drop calendar */}
            <Reveal>
              <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10">
                <div className="text-[10px] tracking-[0.3em] uppercase text-carbon/45 font-medium mb-4">
                  Drop calendar · azur · ss27
                </div>
                <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                  Three drops, locked across stockists.
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
                        <div className="text-[11px] text-carbon/45 mt-0.5">{d.date}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] text-carbon/75 leading-[1.5]">{d.focus}</div>
                        <div className="text-[10px] text-carbon/40 mt-1 uppercase tracking-[0.05em]">{d.skus} SKUs</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Sales dashboard */}
            <Reveal delay={150}>
              <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10">
                <div className="text-[10px] tracking-[0.3em] uppercase text-carbon/45 font-medium mb-4">
                  Sales dashboard · live (mock)
                </div>
                <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                  Did the launch work?
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { label: 'Day 1 revenue', value: '€84,200', delta: '+38% vs target' },
                    { label: 'Sell-through', value: '24%', delta: 'Day 1 of 14' },
                    { label: 'Top SKU', value: 'Solène', delta: '180 units · sold out' },
                    { label: 'Gross margin', value: '76%', delta: 'Above plan +1pp' },
                    { label: 'DTC vs WS', value: '52 / 48', delta: 'In line with plan' },
                    { label: 'Pop-up footfall', value: '1,420', delta: 'Cap Ferret · day 1' },
                  ].map((kpi) => (
                    <div key={kpi.label}>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40 mb-1">{kpi.label}</div>
                      <div className="text-[24px] font-light tracking-[-0.02em] leading-none">{kpi.value}</div>
                      <div className="text-[11px] text-carbon/55 mt-1">{kpi.delta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Content studio per-SKU */}
          <Reveal>
            <div className="bg-white border border-carbon/[0.08] rounded-[16px] p-8 md:p-10">
              <div className="text-[10px] tracking-[0.3em] uppercase text-carbon/45 font-medium mb-4">
                Content studio · per SKU · per channel
              </div>
              <div className="text-[20px] md:text-[24px] font-light tracking-[-0.02em] mb-6 italic">
                One SKU. Every visual format. One click.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                {[
                  { tier: 'E-commerce', desc: 'White background · 4 angles · 2000×2000' },
                  { tier: 'Still life', desc: 'Editorial flat · prop-styled · brand mood' },
                  { tier: 'Editorial', desc: 'On-model · location · 28 aimily models' },
                  { tier: 'Campaign', desc: 'Hero stories · 9:16 video clips · Kling 2.1' },
                ].map((t, i) => (
                  <div key={t.tier} className="bg-carbon/[0.03] rounded-[12px] p-4 border border-carbon/[0.06]">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-carbon/45 font-medium mb-2">
                      Tier 0{i + 1}
                    </div>
                    <div className="text-[14px] font-medium mb-2">{t.tier}</div>
                    <div className="text-[11px] text-carbon/55 leading-[1.5]">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ ENTERPRISE ARTIFACTS ═══════════════════════ */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6">
              Every artifact a fashion brand needs
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1100px] mb-20">
              <span className="italic">Production-ready.</span> Buyer-ready. Press-ready.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              { title: 'Tech Pack PDF', desc: 'A3 landscape, every measurement and BOM, pin-comments threaded by team. Ready for the factory inbox.', tag: 'A3 · annotated' },
              { title: 'Presentation Deck', desc: '21-slide collection deck. 10 themes. PDF export in 3 seconds. Public share link with view counter.', tag: '21 slides · 10 themes' },
              { title: 'Drop Calendar', desc: '45 milestones across 4 blocks. Cross-block dependencies. Excel export to share with team.', tag: 'Gantt · cross-team' },
              { title: 'Range Plan', desc: 'Full SKU grid with PVP/COGS/units/margin. Excel export. Pre-baked for ERP imports.', tag: 'XLS · ERP-ready' },
              { title: 'Wholesale Order Sheet', desc: 'Per-buyer line sheets, drop-by-drop allocations, status tracking from PO to delivery.', tag: 'Per buyer' },
              { title: 'Content Calendar', desc: 'Multi-channel campaign plan. Per-SKU 4-tier visual pipeline. Drop coordination built-in.', tag: 'Multi-channel' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div>
                  <div className="text-[28px] md:text-[34px] font-light tracking-[-0.02em] leading-[1.15] mb-4 text-crema">
                    {item.title}
                  </div>
                  <p className="text-[14px] text-crema/55 leading-[1.65] tracking-[-0.01em] mb-5 max-w-[360px]">
                    {item.desc}
                  </p>
                  <span className="inline-block text-[10px] tracking-[0.2em] uppercase text-crema/45 font-medium border-t border-crema/15 pt-3">
                    {item.tag}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ STUDIONN ORIGIN ═══════════════════════ */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6">
              Built by StudioNN — the fashion agency
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[36px] md:text-[58px] font-light tracking-[-0.03em] leading-[1.1] mb-12">
              We're not a startup that <span className="italic">heard about</span> fashion.
              <br />
              We're a <span className="italic">fashion agency</span> that built a SaaS.
            </h2>
          </Reveal>
          <Reveal delay={300}>
            <div className="space-y-8 text-[17px] md:text-[19px] font-light leading-[1.55] tracking-[-0.01em] text-crema/70 max-w-[760px]">
              <p>
                For three years, StudioNN consulted independent fashion brands across Europe — from emerging
                designers in Madrid and Barcelona to established houses in Milan and Paris. We watched every
                team coordinate their collections across 14 spreadsheets, three WhatsApp groups, and a Notion
                graveyard.
              </p>
              <p className="text-crema/85">
                aimily is the tool we built to fix it. For ourselves, then for everyone.
              </p>
              <p>
                Every workflow inside aimily comes from a real production cycle we ran. Every AI prompt was
                refined by a real designer. Every artifact format matches what factories actually accept and
                what buyers actually open.
              </p>
            </div>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-16 flex items-baseline gap-6 text-[12px] tracking-[0.15em] uppercase text-crema/40 font-medium flex-wrap">
              <span>StudioNN Agency S.L.</span>
              <span className="opacity-50">·</span>
              <span>Alicante, Spain</span>
              <span className="opacity-50">·</span>
              <span>Est. 2023</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <section className="bg-crema text-carbon px-6 py-32 md:py-44">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-carbon/40 font-medium mb-6">
              Pricing
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[64px] font-light tracking-[-0.03em] leading-[1.05] mb-6">
              <span className="italic">Free</span> for 14 days. Same models on every tier.
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[640px] text-[16px] md:text-[18px] text-carbon/55 leading-[1.6] tracking-[-0.01em] mb-16">
              Differentiation by quantity, never by quality. Top imagery models on every plan — Starter, Professional, Pro Max, Enterprise.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Starter', price: '159', suffix: '/mo · billed annually', desc: '1 user · unlimited collections · 200 imagery / month · all blocks' },
              { name: 'Professional', price: '479', suffix: '/mo · billed annually', desc: '5 users · 1,000 imagery / month · video Kling 2.1 · realtime collaboration', popular: true },
              { name: 'Professional Max', price: '1,199', suffix: '/mo · billed annually', desc: '25 users · 5,000 imagery / month · priority support · top-up packs' },
            ].map((tier) => (
              <Reveal key={tier.name}>
                <div className={`rounded-[20px] border p-10 md:p-12 min-h-[320px] flex flex-col ${tier.popular ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon border-carbon/[0.08]'}`}>
                  <div className={`text-[11px] tracking-[0.25em] uppercase font-medium mb-6 ${tier.popular ? 'text-crema/55' : 'text-carbon/40'}`}>
                    {tier.popular ? 'Most popular' : tier.name}
                  </div>
                  <div className="text-[20px] font-light tracking-[-0.02em] mb-2">{tier.name}</div>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-[44px] md:text-[56px] font-light tracking-[-0.03em] leading-none">€{tier.price}</span>
                    <span className={`text-[12px] ${tier.popular ? 'text-crema/55' : 'text-carbon/45'}`}>{tier.suffix}</span>
                  </div>
                  <p className={`text-[14px] leading-[1.6] tracking-[-0.01em] mb-8 ${tier.popular ? 'text-crema/65' : 'text-carbon/55'}`}>
                    {tier.desc}
                  </p>
                  <button
                    onClick={openAuth}
                    className={`mt-auto w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13px] font-semibold transition-colors ${tier.popular ? 'bg-crema text-carbon hover:bg-crema/90' : 'bg-carbon text-crema hover:bg-carbon/90'}`}
                  >
                    Start free trial
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={400}>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-[12px] text-carbon/50">
              <span>Enterprise tier (from €3,000/mo) on contact</span>
              <span>Aimily Credits packs from €29</span>
              <Link href="/pricing" className="underline hover:text-carbon transition-colors">All plans →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="px-6 py-32 md:py-56 border-t border-crema/[0.06] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
        <div className="max-w-5xl mx-auto text-center relative">
          <Reveal>
            <h2 className="text-[60px] md:text-[120px] lg:text-[160px] font-light tracking-[-0.04em] leading-[0.92] italic">
              That's all.
            </h2>
          </Reveal>
          <Reveal delay={300}>
            <p className="mt-12 max-w-[600px] mx-auto text-[16px] md:text-[19px] text-crema/55 leading-[1.55] font-light tracking-[-0.01em]">
              Start a collection in 90 seconds. Free 14 days. No credit card required.
            </p>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={openAuth}
                className="group inline-flex items-center gap-3 px-9 py-4 rounded-full bg-crema text-carbon text-[14px] font-semibold tracking-[-0.01em] hover:bg-crema/90 transition-all"
              >
                Try aimily free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/pricing"
                className="px-7 py-4 text-[13px] font-medium text-crema/60 hover:text-crema transition-colors tracking-[-0.01em]"
              >
                See all plans →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-crema/[0.06] px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[12px] text-crema/40 tracking-[-0.01em]">
          <div className="flex items-center gap-3">
            <Image src="/images/aimily-logo-white.png" alt="aimily" width={20} height={20} className="opacity-60" />
            <span>aimily — built by StudioNN Agency S.L., Alicante</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6">
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-crema transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-crema transition-colors">Terms</Link>
              <Link href="/cookies" className="hover:text-crema transition-colors">Cookies</Link>
            </div>
            <span className="opacity-50 hidden md:inline">·</span>
            <span className="italic text-center md:text-left">Not affiliated with The Devil Wears Prada or NBCUniversal.</span>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signup" />
    </div>
  );
}
