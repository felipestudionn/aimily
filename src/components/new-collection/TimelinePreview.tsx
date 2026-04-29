'use client';

/* ═══════════════════════════════════════════════════════════════════════
   TimelinePreview — the first wow moment.

   4 horizontal bands tinted with the accent palette (sea-foam · moss ·
   midnight · citronella) that visualise the 40-week journey from today
   to the user's launch date. Used inside `/new-collection`.

   When the user picks a different launch date, the bands reflow with a
   spring animation. When the user clicks "Empezar", these same four
   `motion.div`s share `layoutId` with the four block cards in the
   Collection Overview, so they physically morph from horizontal bands
   into the 4-up grid that is the actual tool.
   ═══════════════════════════════════════════════════════════════════════ */

import { motion } from 'motion/react';
import { PHASES, PHASE_ORDER } from '@/lib/timeline-template';
import type { TimelinePhase } from '@/types/timeline';

interface TimelinePreviewProps {
  launchDate: string; // ISO yyyy-mm-dd
  language: 'en' | 'es' | 'fr' | 'it' | 'de' | 'pt' | 'nl' | 'sv' | 'no';
  /** When false (during morph), each band renders as a card-shaped block instead of a flat bar. */
  asCards?: boolean;
}

// Phase weights: how much of the 40-week cycle each phase visually
// occupies on the band. Approximates the real overlap-aware milestone
// distribution while keeping the visual readable.
const PHASE_WEIGHTS: Record<TimelinePhase, number> = {
  creative: 22,
  planning: 18,
  development: 38,
  go_to_market: 22,
};

const TOTAL_WEIGHT = Object.values(PHASE_WEIGHTS).reduce((a, b) => a + b, 0);

// Block numbering matches the Collection Overview (01-04).
const PHASE_BLOCK_NUMBER: Record<TimelinePhase, string> = {
  creative: '01',
  planning: '02',
  development: '03',
  go_to_market: '04',
};

// Text contrast: pale accents need carbon, dark accents need crema.
const PHASE_TEXT_ON_ACCENT: Record<TimelinePhase, string> = {
  creative: 'text-carbon',      // sea-foam (pale)
  planning: 'text-white',       // moss (dark)
  development: 'text-white',    // midnight (dark)
  go_to_market: 'text-carbon',  // citronella (pale)
};

function formatLaunchLabel(iso: string, language: string) {
  const d = new Date(iso);
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}

function weeksUntil(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
}

export function TimelinePreview({ launchDate, language, asCards = false }: TimelinePreviewProps) {
  const totalWeeks = weeksUntil(launchDate);
  const launchLabel = formatLaunchLabel(launchDate, language);
  const todayLabel = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="w-full max-w-[1100px] mx-auto">
      {/* Bands container: changes layout from row (timeline) to grid (cards) */}
      <div
        className={
          asCards
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'
            : 'flex w-full gap-1 h-[120px]'
        }
      >
        {PHASE_ORDER.map((phaseId) => {
          const phase = PHASES[phaseId];
          const weight = PHASE_WEIGHTS[phaseId];
          const widthPct = (weight / TOTAL_WEIGHT) * 100;
          const phaseName = language === 'es' ? phase.nameEs : phase.name;
          const blockNumber = PHASE_BLOCK_NUMBER[phaseId];
          const textColor = PHASE_TEXT_ON_ACCENT[phaseId];

          return (
            <motion.div
              key={phaseId}
              layoutId={`block-${phaseId}`}
              layout
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 32,
                mass: 0.9,
              }}
              style={{
                backgroundColor: phase.color,
                ...(asCards ? {} : { flexBasis: `${widthPct}%`, flexGrow: 0, flexShrink: 0 }),
              }}
              className={
                asCards
                  ? `relative ${textColor} rounded-[20px] p-8 md:p-10 min-h-[280px] flex flex-col justify-between overflow-hidden`
                  : `relative ${textColor} rounded-[12px] flex flex-col justify-end px-4 pb-4 pt-3 overflow-hidden`
              }
            >
              {/* Block number — ghost watermark in card mode, small chip in band mode */}
              <motion.span
                layout="position"
                className={
                  asCards
                    ? 'absolute top-6 left-8 text-[64px] font-bold opacity-[0.12] leading-none tracking-[-0.04em]'
                    : 'text-[10px] font-medium tracking-[0.18em] uppercase opacity-60 leading-none'
                }
              >
                {asCards ? `${blockNumber}.` : blockNumber}
              </motion.span>

              {/* Phase name */}
              <motion.span
                layout="position"
                className={
                  asCards
                    ? 'text-[20px] md:text-[22px] font-semibold tracking-[-0.02em] leading-[1.15] mt-auto'
                    : 'text-[12px] font-semibold tracking-[-0.01em] leading-tight'
                }
              >
                {phaseName}
              </motion.span>
            </motion.div>
          );
        })}
      </div>

      {/* Time anchors: today ─── launch (only in band mode) */}
      {!asCards && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 flex items-center justify-between text-[11px] tracking-[0.16em] uppercase text-carbon/40"
        >
          <span>{todayLabel}</span>
          <span className="text-carbon/55">
            {totalWeeks} {language === 'es' ? 'semanas' : 'weeks'}
          </span>
          <span>{launchLabel}</span>
        </motion.div>
      )}
    </div>
  );
}
