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
   Block data
   ────────────────────────────────────────────── */
const BLOCKS = [
  {
    step: '01',
    label: 'CREATIVE VISION',
    icon: Palette,
    headline: 'Start with a vision,',
    headlineItalic: 'not a spreadsheet',
    headlineEs: 'Empieza con una vision,',
    headlineItalicEs: 'no con una hoja de calculo',
    description:
      'Capture your creative direction with AI-powered moodboards, trend analysis, and color palette generation. Turn abstract inspiration into a structured creative brief.',
    descriptionEs:
      'Captura tu direccion creativa con moodboards generados por IA, analisis de tendencias y generacion de paletas de color. Transforma la inspiracion abstracta en un brief creativo estructurado.',
    features: [
      { icon: TrendingUp, text: 'Trend Analysis & Forecasting', textEs: 'Analisis y Prediccion de Tendencias' },
      { icon: Sparkles, text: 'AI Moodboard Generation', textEs: 'Generacion de Moodboards con IA' },
      { icon: Palette, text: 'Color Palette Intelligence', textEs: 'Inteligencia de Paletas de Color' },
      { icon: BookOpen, text: 'Creative Brief Builder', textEs: 'Constructor de Brief Creativo' },
    ],
    screenshotPlaceholder: 'Creative Block — Moodboard & Trend Analysis',
  },
  {
    step: '02',
    label: 'MERCHANDISING INTELLIGENCE',
    icon: DollarSign,
    headline: 'From gut feeling',
    headlineItalic: 'to business model',
    headlineEs: 'De la intuicion',
    headlineItalicEs: 'al modelo de negocio',
    description:
      'Transform creative vision into commercial reality. Define product families, set pricing strategies, plan distribution channels, and build budgets — all powered by market intelligence.',
    descriptionEs:
      'Transforma la vision creativa en realidad comercial. Define familias de producto, establece estrategias de precios, planifica canales de distribucion y construye presupuestos — todo impulsado por inteligencia de mercado.',
    features: [
      { icon: Layers, text: 'Product Family Architecture', textEs: 'Arquitectura de Familias de Producto' },
      { icon: DollarSign, text: 'Pricing Strategy Engine', textEs: 'Motor de Estrategia de Precios' },
      { icon: ShoppingBag, text: 'Channel Distribution Planning', textEs: 'Planificacion de Distribucion por Canal' },
      { icon: BarChart3, text: 'Budget & Margin Builder', textEs: 'Constructor de Presupuesto y Margen' },
    ],
    screenshotPlaceholder: 'Merchandising Block — Pricing & Channel Strategy',
  },
  {
    step: '03',
    label: 'DESIGN & DEVELOPMENT',
    icon: PenTool,
    headline: 'Your collection,',
    headlineItalic: 'pixel to pattern',
    headlineEs: 'Tu coleccion,',
    headlineItalicEs: 'del pixel al patron',
    description:
      'From AI-generated sketches to production-ready tech packs. Manage prototypes, curate your final selection, and build a complete product catalog — all in one connected workflow.',
    descriptionEs:
      'De bocetos generados por IA a fichas tecnicas listas para produccion. Gestiona prototipos, cura tu seleccion final y construye un catalogo completo — todo en un flujo de trabajo conectado.',
    features: [
      { icon: Scissors, text: 'AI Sketch Generation', textEs: 'Generacion de Bocetos con IA' },
      { icon: Layers, text: 'Prototype Management', textEs: 'Gestion de Prototipos' },
      { icon: Target, text: 'Collection Curation & Selection', textEs: 'Curacion y Seleccion de Coleccion' },
      { icon: BookOpen, text: 'Production-Ready Catalogs', textEs: 'Catalogos Listos para Produccion' },
    ],
    screenshotPlaceholder: 'Design Block — Sketch to Catalog Pipeline',
  },
  {
    step: '04',
    label: 'MARKETING & LAUNCH',
    icon: Megaphone,
    headline: 'Launch day?',
    headlineItalic: 'Already planned',
    headlineEs: 'Dia de lanzamiento?',
    headlineItalicEs: 'Ya esta planificado',
    description:
      'Plan your go-to-market strategy, create campaign content, schedule your content calendar, and execute your launch — from brand story to paid media, everything in sync.',
    descriptionEs:
      'Planifica tu estrategia go-to-market, crea contenido de campana, programa tu calendario de contenido y ejecuta tu lanzamiento — desde la historia de marca hasta medios pagados, todo sincronizado.',
    features: [
      { icon: BookOpen, text: 'Content Strategy & Calendar', textEs: 'Estrategia y Calendario de Contenido' },
      { icon: Video, text: 'Campaign Video Briefs', textEs: 'Briefs de Video de Campana' },
      { icon: Globe, text: 'Go-To-Market Planning', textEs: 'Planificacion Go-To-Market' },
      { icon: Rocket, text: 'Launch Execution Dashboard', textEs: 'Dashboard de Ejecucion de Lanzamiento' },
    ],
    screenshotPlaceholder: 'Marketing Block — Campaign Creation & Launch',
  },
];

const STATS = [
  { value: 4, suffix: '', label: 'Integrated blocks', labelEs: 'Bloques integrados' },
  { value: 45, suffix: '', label: 'Automated milestones', labelEs: 'Hitos automatizados' },
  { value: 1, suffix: '', label: 'Connected timeline', labelEs: 'Timeline conectado' },
  { value: 360, suffix: '°', label: 'Collection visibility', labelEs: 'Visibilidad de coleccion' },
];

/* ──────────────────────────────────────────────
   Page component
   ────────────────────────────────────────────── */
export default function MeetAimilyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const en = lang === 'en';

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
              Discover
            </Link>
            <Link
              href="/meet-aimily"
              className="text-crema text-xs font-medium tracking-widest uppercase"
            >
              Meet Aimily
            </Link>
            <Link
              href="/contact"
              className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Language toggle */}
          <button
            onClick={() => setLang(en ? 'es' : 'en')}
            className="text-gris/40 text-[10px] font-medium tracking-widest uppercase hover:text-crema transition-colors"
          >
            {en ? 'ES' : 'EN'}
          </button>
          {user ? (
            <Link
              href="/my-collections"
              className="text-crema text-xs font-medium tracking-widest uppercase hover:text-crema/70 transition-colors"
            >
              {en ? 'My Collections' : 'Mis Colecciones'}
            </Link>
          ) : (
            <>
              <button
                onClick={() => setAuthOpen(true)}
                className="hidden md:block text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-5 py-2 text-[11px] tracking-[0.15em]"
              >
                {en ? 'GET STARTED' : 'EMPEZAR'}
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
            MEET AIMILY
          </p>
          <h1 className="text-crema text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-6 animate-fade-in-up animate-delay-100">
            {en ? (
              <>
                Your AI-powered fashion{' '}
                <span className="italic">collection assistant</span>
              </>
            ) : (
              <>
                Tu asistente de colecciones{' '}
                <span className="italic">de moda con IA</span>
              </>
            )}
          </h1>
          <p className="text-gris text-lg md:text-xl font-light tracking-wide leading-relaxed max-w-2xl mx-auto mb-12 animate-fade-in-up animate-delay-200">
            {en
              ? 'From a spark of inspiration to a sold-out launch. One platform. Every step.'
              : 'De una chispa de inspiracion a un lanzamiento agotado. Una plataforma. Cada paso.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
            {user ? (
              <Link
                href="/my-collections"
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                {en ? 'MY COLLECTIONS' : 'MIS COLECCIONES'}
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
              >
                {en ? 'START FREE TRIAL' : 'PRUEBA GRATIS'}
              </button>
            )}
            <Link
              href="/pricing"
              className="btn-secondary px-10 py-4 text-sm tracking-[0.15em] border-gris/30 text-gris hover:bg-white/5"
            >
              {en ? 'SEE PRICING' : 'VER PRECIOS'}
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
            {STATS.map((stat, i) => (
              <Reveal key={i} className="bg-carbon p-8 md:p-10 text-center" delay={i * 100}>
                <p className="text-crema text-3xl md:text-4xl font-light mb-2">
                  <Counter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-gris/50 text-[10px] md:text-xs font-medium tracking-[0.2em] uppercase">
                  {en ? stat.label : stat.labelEs}
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
              {en ? 'The complete lifecycle' : 'El ciclo completo'}
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-8">
              {en ? (
                <>
                  From <span className="italic">idea</span> to{' '}
                  <span className="italic">market</span>, connected
                </>
              ) : (
                <>
                  De la <span className="italic">idea</span> al{' '}
                  <span className="italic">mercado</span>, conectado
                </>
              )}
            </h2>
            <p className="text-gris text-base md:text-lg font-light leading-relaxed">
              {en
                ? 'Four integrated blocks guide your collection from creative vision to market launch. Every decision in one block informs the next. Nothing falls through the cracks.'
                : 'Cuatro bloques integrados guian tu coleccion desde la vision creativa hasta el lanzamiento al mercado. Cada decision en un bloque informa al siguiente. Nada se pierde por el camino.'}
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
                      {en ? block.headline : block.headlineEs}{' '}
                      <span className="italic">
                        {en ? block.headlineItalic : block.headlineItalicEs}
                      </span>
                    </h2>
                    <p className="text-gris text-base font-light leading-relaxed mb-8">
                      {en ? block.description : block.descriptionEs}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {block.features.map((feat, fi) => (
                        <div
                          key={fi}
                          className="flex items-center gap-3 text-gris/60 group"
                        >
                          <feat.icon className="w-4 h-4 text-gris/30 group-hover:text-crema/60 transition-colors shrink-0" />
                          <span className="text-sm font-light">
                            {en ? feat.text : feat.textEs}
                          </span>
                        </div>
                      ))}
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
                          {block.screenshotPlaceholder}
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
                  {en ? 'THE ORCHESTRATOR' : 'EL ORQUESTADOR'}
                </p>
              </div>
              <h2 className="text-carbon text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15] mb-6">
                {en ? (
                  <>
                    Every deadline. Every team.{' '}
                    <span className="italic">One timeline.</span>
                  </>
                ) : (
                  <>
                    Cada deadline. Cada equipo.{' '}
                    <span className="italic">Un solo timeline.</span>
                  </>
                )}
              </h2>
              <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto">
                {en
                  ? 'A visual Gantt timeline that connects all four blocks. 45 milestones with cross-block dependencies. Drag, resize, export. Your entire collection journey in one view.'
                  : 'Un timeline Gantt visual que conecta los cuatro bloques. 45 hitos con dependencias entre bloques. Arrastra, redimensiona, exporta. Todo el recorrido de tu coleccion en una vista.'}
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
                  Gantt Timeline — 45 Milestones Across 4 Blocks
                </p>
              </div>
            </div>
          </Reveal>

          {/* Milestone highlights */}
          <Reveal delay={300}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-texto/10 mt-px">
              {[
                {
                  label: en ? 'Creative' : 'Creativo',
                  count: '12 milestones',
                  color: 'text-carbon',
                },
                {
                  label: 'Merchandising',
                  count: '10 milestones',
                  color: 'text-carbon',
                },
                {
                  label: en ? 'Design & Dev' : 'Diseno & Dev',
                  count: '13 milestones',
                  color: 'text-carbon',
                },
                {
                  label: 'Marketing',
                  count: '10 milestones',
                  color: 'text-carbon',
                },
              ].map((item, i) => (
                <div key={i} className="bg-crema p-6 text-center">
                  <p className={`text-sm font-medium tracking-wide ${item.color}`}>
                    {item.label}
                  </p>
                  <p className="text-texto/40 text-xs mt-1">{item.count}</p>
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
                {en ? 'The transformation' : 'La transformacion'}
              </p>
              <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
                {en ? (
                  <>
                    Your expertise,{' '}
                    <span className="italic">amplified</span>
                  </>
                ) : (
                  <>
                    Tu experiencia,{' '}
                    <span className="italic">amplificada</span>
                  </>
                )}
              </h2>
            </div>
          </Reveal>
          <div className="space-y-0">
            {(en
              ? [
                  { before: 'Weeks of trend research', after: 'AI analysis in minutes' },
                  { before: 'Pricing by guesswork', after: 'Data-driven margins' },
                  { before: 'Sketches on paper', after: 'AI-generated concepts' },
                  { before: 'Launch chaos', after: 'Orchestrated go-to-market' },
                  { before: 'Scattered across 10 tools', after: 'One connected platform' },
                ]
              : [
                  { before: 'Semanas de investigacion', after: 'Analisis IA en minutos' },
                  { before: 'Precios a ojo', after: 'Margenes basados en datos' },
                  { before: 'Bocetos en papel', after: 'Conceptos generados por IA' },
                  { before: 'Caos de lanzamiento', after: 'Go-to-market orquestado' },
                  { before: 'Disperso en 10 herramientas', after: 'Una plataforma conectada' },
                ]
            ).map((row, i, arr) => (
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
              {en ? "That's all you need." : 'Eso es todo lo que necesitas.'}
            </h2>
            <p className="text-gris text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto mb-10">
              {en
                ? 'Join designers, brands, and studios managing their collections with Aimily. 14-day free trial — no credit card required.'
                : 'Unete a disenadores, marcas y estudios que gestionan sus colecciones con Aimily. Prueba gratuita de 14 dias — sin tarjeta de credito.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  href="/my-collections"
                  className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
                >
                  {en ? 'MY COLLECTIONS' : 'MIS COLECCIONES'}
                </Link>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
                >
                  {en ? 'START FREE TRIAL' : 'PRUEBA GRATIS'}
                </button>
              )}
              <Link
                href="/pricing"
                className="btn-secondary px-10 py-4 text-sm tracking-[0.15em] border-gris/30 text-gris hover:bg-white/5"
              >
                {en ? 'SEE PRICING' : 'VER PRECIOS'}
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
              Discover
            </Link>
            <Link
              href="/meet-aimily"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              Meet Aimily
            </Link>
            <Link
              href="/terms"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/cookies"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
              Cookies
            </Link>
            <Link
              href="/contact"
              className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors"
            >
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
