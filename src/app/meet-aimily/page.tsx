'use client';

/* ═══════════════════════════════════════════════════════════════════
   /meet-aimily — DWP-themed launch landing
   Audience drops here from social campaign. Page must:
   1. Hook with the Emily→Aimily angle (Miranda's signature)
   2. Demonstrate product capabilities (real AZUR assets)
   3. Convert with a clear "Try free" CTA
   ═══════════════════════════════════════════════════════════════════ */

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Palette,
  Layers,
  Megaphone,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

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

/* ─────────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────────── */
export default function MeetAimilyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  const openAuth = () => {
    if (user) router.push('/my-collections');
    else setAuthOpen(true);
  };

  return (
    <div className="bg-carbon text-crema min-h-screen overflow-x-hidden">
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-carbon/80 backdrop-blur-md border-b border-crema/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={28}
              height={28}
              className="opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-[15px] font-medium text-crema tracking-[-0.01em]">aimily</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hidden md:block text-[13px] text-crema/60 hover:text-crema transition-colors">
              Pricing
            </Link>
            <button
              onClick={openAuth}
              className="px-5 py-2 rounded-full bg-crema text-carbon text-[13px] font-semibold hover:bg-crema/90 transition-colors"
            >
              Try free
            </button>
          </div>
        </div>
      </nav>

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
          <p className="mt-12 max-w-[640px] text-center text-[16px] md:text-[19px] text-crema/55 leading-[1.55] font-light tracking-[-0.01em]">
            From the spark of a moodboard to a sold-out launch — one platform handles every step of building a fashion collection.
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
            <span className="text-[10px] tracking-[0.3em] uppercase">See how it works</span>
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
              <div className="relative">
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
              <div className="relative">
                <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-4">
                  2026 · aimily
                </div>
                <p className="text-[18px] md:text-[22px] font-light leading-[1.5] tracking-[-0.01em] text-crema">
                  An AI assistant who never sleeps. Generates moodboards. Calculates margins. Drafts campaigns.
                  Builds a collection from spark to launch.
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

      {/* ═══════════════════════ FOUR BLOCKS ═══════════════════════ */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6">
              The platform · four blocks
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[900px] mb-20">
              From <span className="italic">a vision</span> to <span className="italic">a launch</span>,
              <br />
              connected.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                num: '01',
                label: 'Creative & Brand',
                title: 'Start with a vision, not a spreadsheet',
                desc: 'Capture creative direction with AI moodboards, brand DNA, consumer profiles, and trend analysis.',
                icon: Sparkles,
              },
              {
                num: '02',
                label: 'Merchandising',
                title: 'From gut feeling to business model',
                desc: 'Define product families, set pricing strategies, plan distribution channels, build budgets — all data-driven.',
                icon: Palette,
              },
              {
                num: '03',
                label: 'Design & Development',
                title: 'Pixel to pattern',
                desc: 'AI-generated sketches, color application, tech packs ready for the factory, prototypes, production tracking.',
                icon: Layers,
              },
              {
                num: '04',
                label: 'Marketing & Launch',
                title: 'Launch day? Already planned.',
                desc: 'Content studio, drop calendar, GTM plan, presentation deck export — sold-out before you cut the ribbon.',
                icon: Megaphone,
              },
            ].map((block, i) => (
              <Reveal key={block.num} delay={i * 100}>
                <div className="group relative bg-crema/[0.03] border border-crema/[0.08] rounded-[20px] p-10 md:p-12 hover:bg-crema/[0.05] transition-colors min-h-[320px]">
                  <div className="text-[64px] font-light text-crema/15 leading-none tracking-[-0.04em] mb-6">
                    {block.num}
                  </div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-3">
                    {block.label}
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-light tracking-[-0.02em] leading-[1.15] text-crema mb-4">
                    {block.title}
                  </h3>
                  <p className="text-[15px] text-crema/55 leading-[1.6] tracking-[-0.01em] max-w-[400px]">
                    {block.desc}
                  </p>
                  <block.icon className="absolute top-10 right-10 h-5 w-5 text-crema/30 group-hover:text-crema/60 transition-colors" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ DEMO 1 — Sketch generation ═══════════════════════ */}
      <section className="bg-crema text-carbon px-6 py-32 md:py-44 border-t border-carbon/[0.05]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-carbon/40 font-medium mb-6">
              Capability · Design 01
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1000px] mb-6">
              Describe a piece. <span className="italic">Get a sketch.</span>
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[640px] text-[16px] md:text-[18px] text-carbon/60 leading-[1.6] tracking-[-0.01em] mb-16">
              Type a description. aimily generates a technical fashion sketch — front, back, detail views — ready to send to a tech designer or convert into a colored render.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {[
              { src: '/meet-aimily/azur/sketch-solene.jpg', label: 'Solène · maxi linen dress' },
              { src: '/meet-aimily/azur/sketch-pauline.jpg', label: 'Pauline · linen trouser' },
              { src: '/meet-aimily/azur/sketch-amelie.jpg', label: 'Amélie · raffia espadrille' },
              { src: '/meet-aimily/azur/sketch-marina.jpg', label: 'Marina · raffia tote' },
            ].map((sketch, i) => (
              <Reveal key={sketch.src} delay={i * 100}>
                <div className="group">
                  <div className="aspect-square overflow-hidden rounded-[16px] bg-white border border-carbon/[0.06]">
                    <Image
                      src={sketch.src}
                      alt={sketch.label}
                      width={800}
                      height={800}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="mt-3 text-[11px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
                    {sketch.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={500}>
            <p className="mt-10 text-[12px] text-carbon/35 italic max-w-[640px] leading-[1.65]">
              Generated inside aimily for the AZUR · SS27 collection. Real outputs, not stock illustrations.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ DEMO 2 — Sketch → 3D Render ═══════════════════════ */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6">
              Capability · Design 02
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1000px] mb-6 text-crema">
              Sketch to <span className="italic">3D render</span> in 60 seconds.
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[640px] text-[16px] md:text-[18px] text-crema/55 leading-[1.6] tracking-[-0.01em] mb-16">
              Apply colorways, materials, finishes. aimily renders a photorealistic product image you can drop into a buyer presentation, a wholesale lookbook, or a Shopify page.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
        </div>
      </section>

      {/* ═══════════════════════ DEMO 3 — Editorial / on-model ═══════════════════════ */}
      <section className="bg-crema text-carbon px-6 py-32 md:py-44">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-carbon/40 font-medium mb-6">
              Capability · Marketing 01
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1000px] mb-6">
              Editorial campaigns,
              <br />
              <span className="italic">without a photoshoot.</span>
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[640px] text-[16px] md:text-[18px] text-carbon/60 leading-[1.6] tracking-[-0.01em] mb-16">
              Place a piece on a model in the location you want. Editorial photographs, lookbook stills, social campaign assets — generated with aimily's library of 28 brand-safe AI models.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                <div className="mt-4 text-[12px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
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
                <div className="mt-4 text-[12px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
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
                <div className="mt-4 text-[12px] tracking-[0.1em] uppercase text-carbon/45 font-medium">
                  Amélie · Product detail · terracotta floor
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ DEMO 4 — Moodboard ═══════════════════════ */}
      <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 font-medium mb-6">
              Capability · Creative 01
            </div>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="text-[40px] md:text-[72px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1100px] mb-6 text-crema">
              Brand DNA <span className="italic">→</span> moodboard
              <br />
              in 30 seconds.
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="max-w-[640px] text-[16px] md:text-[18px] text-crema/55 leading-[1.6] tracking-[-0.01em] mb-16">
              Describe your brand. aimily generates an editorial-grade moodboard, color palette, and visual references that align across every output downstream.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <Reveal className="col-span-2 md:col-span-2">
              <div className="group aspect-[4/3] overflow-hidden rounded-[16px] bg-crema/[0.03] border border-crema/[0.08]">
                <Image
                  src="/meet-aimily/azur/mood-1-mediterranean-wall.jpg"
                  alt="AZUR moodboard — Mediterranean wall"
                  width={1600}
                  height={1200}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </Reveal>
            <Reveal delay={120} className="col-span-2 md:col-span-1">
              <div className="group aspect-square overflow-hidden rounded-[16px] bg-crema/[0.03] border border-crema/[0.08]">
                <Image
                  src="/meet-aimily/azur/mood-2-fabric-detail.jpg"
                  alt="AZUR moodboard — fabric detail"
                  width={1200}
                  height={1200}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </Reveal>
            <Reveal delay={240} className="col-span-2 md:col-span-3">
              <div className="group aspect-[16/9] overflow-hidden rounded-[16px] bg-crema/[0.03] border border-crema/[0.08]">
                <Image
                  src="/meet-aimily/azur/mood-3-sea-tile.jpg"
                  alt="AZUR moodboard — sea tile"
                  width={1920}
                  height={1080}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </Reveal>
          </div>

          <Reveal delay={600}>
            <p className="mt-10 text-[12px] text-crema/35 italic max-w-[640px] leading-[1.65]">
              AZUR · SS27 brand world. From a single brief: "Mediterranean luxury for women who summer the same way every year."
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ ENTERPRISE ARTIFACTS ═══════════════════════ */}
      <section className="bg-crema text-carbon px-6 py-32 md:py-44">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-[11px] tracking-[0.3em] uppercase text-carbon/40 font-medium mb-6">
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
              {
                title: 'Tech Pack PDF',
                desc: 'A3 landscape, every measurement and BOM, pin-comments threaded by team. Ready for the factory inbox.',
                tag: 'A3 · annotated',
              },
              {
                title: 'Presentation Deck',
                desc: '21-slide collection deck. 10 themes. PDF export in 3 seconds. Public share link with view counter.',
                tag: '21 slides · 10 themes',
              },
              {
                title: 'Drop Calendar',
                desc: '45 milestones across 4 blocks. Cross-block dependencies. Excel export to share with team.',
                tag: 'Gantt · cross-team',
              },
              {
                title: 'Range Plan',
                desc: 'Full SKU grid with PVP/COGS/units/margin. Excel export. Pre-baked for ERP imports.',
                tag: 'XLS · ERP-ready',
              },
              {
                title: 'Wholesale Order Sheet',
                desc: 'Per-buyer line sheets, drop-by-drop allocations, status tracking from PO to delivery.',
                tag: 'Per buyer',
              },
              {
                title: 'Content Calendar',
                desc: 'Multi-channel campaign plan. Per-SKU 4-tier visual pipeline. Drop coordination built-in.',
                tag: 'Multi-channel',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div>
                  <div className="text-[28px] md:text-[34px] font-light tracking-[-0.02em] leading-[1.15] mb-4">
                    {item.title}
                  </div>
                  <p className="text-[14px] text-carbon/60 leading-[1.65] tracking-[-0.01em] mb-5 max-w-[360px]">
                    {item.desc}
                  </p>
                  <span className="inline-block text-[10px] tracking-[0.2em] uppercase text-carbon/45 font-medium border-t border-carbon/15 pt-3">
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
            <div className="mt-16 flex items-baseline gap-6 text-[12px] tracking-[0.15em] uppercase text-crema/40 font-medium">
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
            <h2 className="text-[40px] md:text-[64px] font-light tracking-[-0.03em] leading-[1.05] mb-16">
              <span className="italic">Free</span> for 14 days. Then choose your tier.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Starter', price: 159, suffix: '/mo · annual', desc: '1 user · 2 collections · 100 AI generations · all blocks' },
              { name: 'Professional', price: 269, suffix: '/mo · annual', desc: '10 users · unlimited collections · 500 AI · multi-brand', popular: true },
              { name: 'Business', price: 499, suffix: '/mo · annual', desc: 'unlimited users · unlimited AI · SSO · custom integrations' },
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
            <p className="mt-10 text-[12px] text-carbon/40 italic">
              No credit card required. Cancel any time. Monthly billing also available — €199 / €329 / €599.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="px-6 py-32 md:py-56 border-t border-crema/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
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

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />
    </div>
  );
}
