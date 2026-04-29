'use client';

/* ═══════════════════════════════════════════════════════════════════════
   OverviewLanding — the morph destination.

   Lightweight component that renders the same visual shape as the real
   /collection/[id] page (sidebar on the left + title + 4 block cards),
   but without the heavy WorkspaceShell tree (no providers, no
   ViewPort, no WizardSidebar with its 50 sub-blocks). This keeps the
   destination's bounding rects measurable instantly so Framer Motion
   can morph the four bands from <TimelinePreview> straight into the
   four cards here without a flash.

   When the user clicks any card, we navigate to the real page where
   the full WorkspaceShell takes over.
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight, Bell } from 'lucide-react';
import { PHASES, PHASE_ORDER } from '@/lib/timeline-template';
import type { CollectionPlan } from '@/types/planner';
import type { TimelinePhase } from '@/types/timeline';
import { useTranslation } from '@/i18n';

interface OverviewLandingProps {
  plan: CollectionPlan;
  season: string;
  language: string;
}

const BLOCK_TITLES_EN: Record<TimelinePhase, string> = {
  creative: 'Creative Direction & Brand',
  planning: 'Merchandising & Planning',
  development: 'Design & Development',
  go_to_market: 'Marketing & Sales',
};

const BLOCK_TITLES_ES: Record<TimelinePhase, string> = {
  creative: 'Dirección Creativa y Marca',
  planning: 'Merchandising y Planificación',
  development: 'Diseño y Desarrollo',
  go_to_market: 'Marketing y Ventas',
};

const BLOCK_DESCRIPTIONS_EN: Record<TimelinePhase, string> = {
  creative: 'Vision, research, and brand identity for your collection.',
  planning: 'Buying strategy, assortment, channels, and budget.',
  development: 'Sketch, tech pack, prototype, produce, and select your collection.',
  go_to_market: 'Launch plan, content, communications, and commercial performance.',
};

const BLOCK_DESCRIPTIONS_ES: Record<TimelinePhase, string> = {
  creative: 'Visión, investigación e identidad de marca para tu colección.',
  planning: 'Estrategia de compra, surtido, canales y presupuesto.',
  development: 'Boceto, ficha técnica, prototipo, producción y selección final.',
  go_to_market: 'Plan de lanzamiento, contenido, comunicaciones y rendimiento.',
};

const PHASE_BLOCK_NUMBER: Record<TimelinePhase, string> = {
  creative: '01',
  planning: '02',
  development: '03',
  go_to_market: '04',
};

const PHASE_ROUTE: Record<TimelinePhase, string> = {
  creative: 'creative',
  planning: 'merchandising',
  development: 'product',
  go_to_market: 'marketing/creation',
};

export function OverviewLanding({ plan, season, language }: OverviewLandingProps) {
  const router = useRouter();
  const t = useTranslation();
  const [titleDraft, setTitleDraft] = useState(plan.name);
  const [savingTitle, setSavingTitle] = useState(false);

  const isEs = language === 'es';
  const titles = isEs ? BLOCK_TITLES_ES : BLOCK_TITLES_EN;
  const descriptions = isEs ? BLOCK_DESCRIPTIONS_ES : BLOCK_DESCRIPTIONS_EN;
  const isUntitled = /^Sin título|^Untitled/i.test(plan.name);

  const startCta = (t.collections as Record<string, string>)?.start || 'Start';

  const commitTitle = useCallback(async () => {
    const next = titleDraft.trim();
    if (next.length === 0 || next === plan.name) {
      setTitleDraft(plan.name);
      return;
    }
    setSavingTitle(true);
    try {
      await fetch(`/api/collection-plans/${plan.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
    } catch {
      setTitleDraft(plan.name);
    } finally {
      setSavingTitle(false);
    }
  }, [titleDraft, plan.name, plan.id]);

  const handleCardClick = useCallback(
    (phase: TimelinePhase) => {
      const route = PHASE_ROUTE[phase];
      router.push(`/collection/${plan.id}/${route}`);
    },
    [router, plan.id],
  );

  return (
    <div className="min-h-screen bg-shade flex">
      {/* ── Sidebar — slides in from the left ── */}
      <motion.aside
        initial={{ x: -380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
        className="hidden lg:flex w-[300px] flex-shrink-0 flex-col bg-[#EBEAE6] border-r border-carbon/[0.06] py-6 px-5 sticky top-0 h-screen"
      >
        <div className="flex items-center gap-2 mb-8">
          <span className="text-[18px] font-semibold text-carbon tracking-[-0.02em]">aimily</span>
        </div>

        <nav className="flex flex-col gap-1 mb-8">
          <button className="flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium bg-white text-carbon shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            Trabajo
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium text-carbon/40">
            Calendario
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium text-carbon/40">
            Presentación
          </button>
        </nav>

        <div className="rounded-[14px] bg-carbon text-white px-4 py-3 mb-6">
          <span className="text-[13px] font-medium tracking-[-0.01em]">{plan.name}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {PHASE_ORDER.map((phaseId) => {
            const phase = PHASES[phaseId];
            return (
              <div key={phaseId}>
                <div className="flex items-center justify-between px-3 py-2 text-[13px] font-medium text-carbon">
                  <span>{isEs ? phase.nameEs : phase.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.aside>

      {/* ── Main canvas ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="flex items-center justify-end gap-3 px-6 md:px-10 lg:px-14 py-5"
        >
          <button
            aria-label="Notifications"
            className="w-9 h-9 rounded-full bg-white border border-carbon/[0.06] flex items-center justify-center text-carbon/55 hover:text-carbon transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-carbon text-white flex items-center justify-center text-[12px] font-semibold">
            F
          </div>
        </motion.header>

        <main className="flex-1 px-6 md:px-10 lg:px-16 pb-20">
          {/* Title — inline-editable when name still starts with "Sin título" */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-center mb-12 mt-6"
          >
            {isUntitled ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') {
                    setTitleDraft(plan.name);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                maxLength={120}
                autoFocus
                disabled={savingTitle}
                aria-label="Collection name"
                className="text-center w-full max-w-[820px] mx-auto bg-transparent border-0 border-b border-carbon/[0.10] focus:border-carbon/40 outline-none text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15] placeholder:text-carbon/30 transition-colors py-1"
              />
            ) : (
              <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
                {titleDraft}
              </h1>
            )}
          </motion.div>

          {/* The 4 cards — these share `layoutId` with the bands in TimelinePreview */}
          <div className="max-w-[1300px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PHASE_ORDER.map((phaseId, idx) => {
                const blockNumber = PHASE_BLOCK_NUMBER[phaseId];
                return (
                  <motion.button
                    key={phaseId}
                    layoutId={`block-${phaseId}`}
                    transition={{
                      type: 'spring',
                      stiffness: 220,
                      damping: 32,
                      mass: 0.9,
                    }}
                    onClick={() => handleCardClick(phaseId)}
                    className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] text-left overflow-hidden hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300"
                    style={{ backgroundColor: '#FFFFFF' }}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.7 + idx * 0.05 }}
                      className="mb-10"
                    >
                      <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                        {blockNumber}.
                      </span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.75 + idx * 0.05 }}
                      className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5"
                    >
                      {titles[phaseId]}
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.8 + idx * 0.05 }}
                      className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]"
                    >
                      {descriptions[phaseId]}
                    </motion.p>

                    <div className="flex-1" />

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.85 + idx * 0.05 }}
                      className="flex justify-center mt-10"
                    >
                      <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                        {startCta}
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.9 + idx * 0.05 }}
                      className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden"
                    >
                      <div className="h-full rounded-full bg-carbon/30" style={{ width: '0%' }} />
                    </motion.div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
