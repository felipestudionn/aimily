'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, User, Sparkles, Image, Fingerprint, Globe, Microscope, Radio, Building2 } from 'lucide-react';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════════════
   Creative & Brand Block — 3-Step Flow
   Vision → Research → Synthesis
   ═══════════════════════════════════════════════════════════ */

interface MiniBlock {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
}

const STEPS = [
  {
    id: 'vision',
    name: 'Creative Vision',
    nameEs: 'Visión Creativa',
    description: 'Define your consumer, collection vibe, moodboard, and brand DNA',
    blocks: [
      { id: 'consumer', name: 'Consumer Definition', nameEs: 'Definición de Consumidor', description: 'Define your target consumer profiles with AI-assisted personas', icon: User, available: true },
      { id: 'vibe', name: 'Collection Vibe', nameEs: 'Vibe de la Colección', description: 'Set the spirit and creative direction of the collection', icon: Sparkles, available: true },
      { id: 'moodboard', name: 'Moodboard', nameEs: 'Moodboard', description: 'Upload photos or connect Pinterest for visual references', icon: Image, available: true },
      { id: 'brand-dna', name: 'Brand DNA', nameEs: 'Identidad de Marca', description: 'Extract or create your brand identity — logo, colors, typography, tone', icon: Fingerprint, available: true },
    ] as MiniBlock[],
  },
  {
    id: 'research',
    name: 'Market Research',
    nameEs: 'Investigación de Mercado',
    description: 'Explore trends, signals, and competitive landscape',
    blocks: [
      { id: 'global-trends', name: 'Global Trends', nameEs: 'Tendencias Globales', description: 'Macro-trends from runways for your season', icon: Globe, available: true },
      { id: 'deep-dive', name: 'Deep Dive', nameEs: 'Deep Dive', description: 'Micro-trends by product type, market, and season', icon: Microscope, available: true },
      { id: 'live-signals', name: 'Live Signals', nameEs: 'Señales en Vivo', description: 'Viral trends from social media right now', icon: Radio, available: true },
      { id: 'competitors', name: 'Competitors & References', nameEs: 'Competencia y Referencia', description: 'Analyze competitor brands and positioning', icon: Building2, available: true },
    ] as MiniBlock[],
  },
  {
    id: 'synthesis',
    name: 'Creative Synthesis',
    nameEs: 'Síntesis Creativa',
    description: 'Consolidated creative input — vision + selected trends ready for the next block',
    blocks: [] as MiniBlock[],
  },
];

const INPUT_MODES = [
  { id: 'free', label: 'Libre' },
  { id: 'assisted', label: 'Asistido' },
  { id: 'ai', label: 'Propuesta IA' },
];

export default function CreativeBrandPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const step = STEPS[activeStep];

  return (
    <div className="min-h-[80vh]">
      <div className="px-8 md:px-12 lg:px-16 py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push(`/collection/${id}`)}
            className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" /> Overview
          </button>
          <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            Creative & <span className="italic">Brand</span>
          </h2>
          <p className="text-sm text-carbon/40 mt-2 max-w-lg">
            Define your creative vision, research the market, and synthesize everything into a unified creative input.
          </p>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center gap-0 mb-10 border border-carbon/[0.06] w-fit">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(i)}
              className={`flex items-center gap-3 px-6 py-3 text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                activeStep === i
                  ? 'bg-carbon text-crema'
                  : 'bg-white text-carbon/40 hover:text-carbon/60'
              }`}
            >
              <span className={`w-5 h-5 flex items-center justify-center text-[10px] ${
                activeStep === i ? 'bg-white/20' : 'bg-carbon/[0.06]'
              }`}>
                {i + 1}
              </span>
              {s.name}
            </button>
          ))}
        </div>

        {/* Step Content */}
        {step.blocks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {step.blocks.map((block) => {
              const Icon = block.icon;
              return (
                <div
                  key={block.id}
                  className="group relative bg-white p-10 lg:p-12 hover:shadow-lg transition-all duration-300 overflow-hidden border border-carbon/[0.06] flex flex-col min-h-[320px] cursor-pointer"
                >
                  {/* Icon + Title */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center mb-4">
                        <Icon className="h-5 w-5 text-carbon/50" />
                      </div>
                      <h3 className="text-xl font-light text-carbon tracking-tight">
                        {block.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-carbon/40 font-light leading-relaxed flex-1">
                    {block.description}
                  </p>

                  {/* Input Mode Pills */}
                  <div className="mt-6 flex items-center gap-2">
                    {INPUT_MODES.map((mode) => (
                      <span
                        key={mode.id}
                        className="px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/30"
                      >
                        {mode.label}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
                    Start <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Synthesis Step — Consolidated View */
          <div className="bg-white border border-carbon/[0.06] p-12 lg:p-16 min-h-[400px] flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-carbon/[0.04] flex items-center justify-center mb-6">
              <Check className="h-6 w-6 text-carbon/30" />
            </div>
            <h3 className="text-2xl font-light text-carbon tracking-tight mb-3">
              Creative Synthesis
            </h3>
            <p className="text-sm text-carbon/40 font-light max-w-md leading-relaxed mb-8">
              Once you complete Vision and Research, this step consolidates everything into a unified Creative Input that feeds the next block.
            </p>
            <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/25">
              <span className="w-5 h-5 bg-carbon/[0.06] flex items-center justify-center text-[10px]">1</span>
              Vision
              <ArrowRight className="h-3 w-3 text-carbon/15" />
              <span className="w-5 h-5 bg-carbon/[0.06] flex items-center justify-center text-[10px]">2</span>
              Research
              <ArrowRight className="h-3 w-3 text-carbon/15" />
              <span className="w-5 h-5 bg-carbon text-crema flex items-center justify-center text-[10px]">3</span>
              Synthesis
            </div>
          </div>
        )}

        {/* Step Navigation Footer */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] uppercase transition-all border ${
              activeStep === 0
                ? 'border-carbon/[0.06] text-carbon/20 cursor-not-allowed'
                : 'border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30'
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <button
            onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}
            disabled={activeStep === STEPS.length - 1}
            className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] uppercase transition-all border ${
              activeStep === STEPS.length - 1
                ? 'border-carbon/[0.06] text-carbon/20 cursor-not-allowed'
                : 'border-carbon text-carbon hover:bg-carbon hover:text-crema'
            }`}
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
