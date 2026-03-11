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

const CAPABILITIES = [
  {
    icon: TrendingUp,
    title: 'Trend Research & Product Strategy',
    titleEs: 'Investigacion de Tendencias y Estrategia de Producto',
    description: 'AI-powered trend analysis that identifies market opportunities, consumer signals, and optimal product direction for your collection.',
    descriptionEs: 'Analisis de tendencias con IA que identifica oportunidades de mercado, senales del consumidor y la direccion optima de producto.',
  },
  {
    icon: Palette,
    title: 'Brand Identity & Creative Direction',
    titleEs: 'Identidad de Marca y Direccion Creativa',
    description: 'Build a cohesive brand universe — from moodboards and color palettes to typography and visual language — all in one workspace.',
    descriptionEs: 'Construye un universo de marca coherente — desde moodboards y paletas de color hasta tipografia y lenguaje visual.',
  },
  {
    icon: Layers,
    title: 'Collection Merchandising & Planning',
    titleEs: 'Merchandising y Planificacion de Coleccion',
    description: 'Strategic SKU planning with size matrices, colorway management, pricing architecture, and margin optimization across your entire range.',
    descriptionEs: 'Planificacion estrategica de SKUs con matrices de tallas, gestion de colorways, arquitectura de precios y optimizacion de margenes.',
  },
  {
    icon: Camera,
    title: 'Studio & Content Production',
    titleEs: 'Estudio y Produccion de Contenido',
    description: 'AI-generated lookbooks, campaign shoots, and product photography — from concept to final asset, with virtual try-on technology.',
    descriptionEs: 'Lookbooks generados con IA, campanas fotograficas y fotografia de producto — del concepto al asset final, con tecnologia de prueba virtual.',
  },
  {
    icon: Globe,
    title: 'Go-to-Market & Digital Strategy',
    titleEs: 'Go-to-Market y Estrategia Digital',
    description: 'Content calendars, copywriting, PR outreach, and multi-channel launch planning — everything you need to bring your collection to market.',
    descriptionEs: 'Calendarios de contenido, copywriting, contacto con prensa y planificacion de lanzamiento multicanal.',
  },
  {
    icon: Factory,
    title: 'Production & Supply Chain',
    titleEs: 'Produccion y Cadena de Suministro',
    description: 'Order management, production tracking, and timeline coordination to ensure your collection delivers on time and on budget.',
    descriptionEs: 'Gestion de pedidos, seguimiento de produccion y coordinacion de timelines para entregar tu coleccion a tiempo y dentro del presupuesto.',
  },
];

const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Create your collection',
    description: 'Define your vision, season, category, and launch date. Our wizard guides you through every decision.',
  },
  {
    number: '02',
    title: 'Plan & design',
    description: 'Build your brand identity, plan your SKU range, design colorways, and create moodboards — all AI-assisted.',
  },
  {
    number: '03',
    title: 'Produce & shoot',
    description: 'Manage sampling, generate lookbooks with AI photography, and coordinate production orders.',
  },
  {
    number: '04',
    title: 'Launch & sell',
    description: 'Execute your go-to-market strategy with content calendars, PR outreach, and multi-channel distribution.',
  },
];

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

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
              Discover
            </Link>
            <Link href="/contact" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
              Contact
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <Link
              href="/my-collections"
              className="text-crema text-xs font-medium tracking-widest uppercase hover:text-crema/70 transition-colors"
            >
              My Collections
            </Link>
          ) : (
            <>
              <button
                onClick={() => setAuthOpen(true)}
                className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-5 py-2 text-[11px] tracking-[0.15em]"
              >
                GET STARTED
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
            The future of fashion collection management
          </p>
          <h1 className="text-crema text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-4 animate-fade-in-up animate-delay-100">
            From <span className="italic">concept</span> to <span className="italic">market</span>.
          </h1>
          <p className="text-crema/70 text-xl sm:text-2xl md:text-3xl font-light tracking-tight mb-8 animate-fade-in-up animate-delay-150">
            Built on <span className="italic">expertise</span> and powered by <span className="italic">AI</span>.
          </p>
          <p className="text-gris text-lg md:text-xl font-light tracking-wide leading-relaxed max-w-2xl mx-auto mb-12 animate-fade-in-up animate-delay-200">
            The all-in-one platform for fashion brands to plan, design, produce, and launch their collections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
            {user ? (
              <Link href="/new-collection" className="btn-primary px-10 py-4 text-sm tracking-[0.15em]">
                NEW COLLECTION
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                START FREE
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
                Why aimily
              </p>
              <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-8">
                The resources of a full team,{' '}
                <span className="italic">at your fingertips</span>
              </h2>
              <p className="text-gris text-base md:text-lg font-light leading-relaxed mb-6">
                You know the industry. You know your product. But not every project has the budget for a full team — trend research, creative direction, merchandising, photography, marketing. That&apos;s where aimily comes in.
              </p>
              <p className="text-gris text-base md:text-lg font-light leading-relaxed">
                aimily gives you access to world-class resources powered by AI — so you can deliver with the speed and quality of a large operation, on any budget. Your expertise drives the vision. aimily amplifies the execution.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-gris/10">
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <Sparkles className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">AI</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">Agents</p>
              </div>
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <Layers className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">11</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">Workspaces</p>
              </div>
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <Zap className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">24/7</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">Available</p>
              </div>
              <div className="bg-carbon p-8 flex flex-col items-center text-center">
                <BarChart3 className="h-6 w-6 text-crema/60 mb-4" />
                <p className="text-crema text-2xl font-light mb-1">360°</p>
                <p className="text-gris/60 text-xs tracking-widest uppercase">Visibility</p>
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
              Capabilities
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
              Everything your brand needs,{' '}
              <span className="italic">nothing it doesn&apos;t</span>
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
              Your advantage
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
              Your expertise,{' '}
              <span className="italic">multiplied</span>
            </h2>
          </div>
          <div className="space-y-0">
            {[
              { before: 'Weeks of trend research', after: 'Done in minutes' },
              { before: 'Outsourced photography', after: 'AI-generated lookbooks' },
              { before: 'Scattered across 10 tools', after: 'One intelligent workspace' },
              { before: 'Limited by team size', after: 'Unlimited by AI' },
            ].map((row, i) => (
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
              How it works
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
              Four steps to your{' '}
              <span className="italic">next collection</span>
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
            The evolution
          </p>
          <h2 className="text-carbon text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-8">
            Decades of expertise,{' '}
            <span className="italic">now in your hands</span>
          </h2>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mb-8">
            Built by fashion professionals with decades of experience at brands like Zara, Nike, and Karl Lagerfeld. We know every process, every bottleneck, every decision that makes or breaks a collection — because we&apos;ve lived them.
          </p>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto mb-8">
            We&apos;ve packaged all of that knowledge into AI-powered tools that work at your pace. Whether you&apos;re a solo designer, a brand manager, or a team of ten — aimily gives everyone the same resources and quality.
          </p>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto">
            Multiple team members can work on the same collection, each owning their block — research, design, merchandising, production. Everything stays connected, nothing gets lost.
          </p>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-32 px-6 border-t border-gris/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] italic mb-8">
            We want to be part of your next collection
          </h2>
          <p className="text-gris text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto mb-12">
            Join the brands already using aimily to plan, design, and launch their collections faster than ever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href="/new-collection" className="btn-primary px-10 py-4 text-sm tracking-[0.15em]">
                NEW COLLECTION
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                GET STARTED FREE
              </button>
            )}
            <Link
              href="/contact"
              className="btn-secondary px-10 py-4 text-sm tracking-[0.15em] border-gris/30 text-gris hover:bg-white/5"
            >
              CONTACT US
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
            <Link href="/terms" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              Privacy
            </Link>
            <Link href="/cookies" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              Cookies
            </Link>
            <Link href="/contact" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              Contact
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
