'use client';

import { useParams } from 'next/navigation';
import { ArrowRight, Rocket, Calendar, TrendingUp, Zap } from 'lucide-react';
import type { TimelineMilestone } from '@/types/timeline';

interface Props {
  collectionPlanId: string;
  milestones: TimelineMilestone[];
}

/* ── Card config for the 4 distribution cards ── */
const DISTRIBUTION_CARDS = [
  {
    id: 'gtm',
    title: 'Go-to-Market',
    titleEs: 'Lanzamiento al Mercado',
    description: 'Drops timeline, commercial actions, and SKU distribution across launch moments.',
    Icon: Rocket,
  },
  {
    id: 'content-calendar',
    title: 'Content Calendar',
    titleEs: 'Calendario Editorial',
    description: 'Schedule content across platforms, coordinate influencers and PR outreach.',
    Icon: Calendar,
  },
  {
    id: 'paid-growth',
    title: 'Paid & Growth',
    titleEs: 'Paid y Crecimiento',
    description: 'Paid media campaigns, budget allocation, audience targeting, and performance tracking.',
    Icon: TrendingUp,
  },
  {
    id: 'launch',
    title: 'Launch',
    titleEs: 'Lanzamiento',
    description: 'Pre-launch checklist, go-live tracker, launch day ops, and post-launch analytics.',
    Icon: Zap,
  },
] as const;

export function MarketingDistributionScreen({ collectionPlanId, milestones }: Props) {
  const { id } = useParams();

  return (
    <div className="px-8 md:px-12 lg:px-16 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          Marketing & Digital
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          Distribution & <span className="italic">Launch</span>
        </h2>
        <p className="text-base font-light text-carbon/50 mt-3 max-w-2xl leading-relaxed">
          Plan your go-to-market, schedule content, manage paid campaigns, and execute the launch.
        </p>
      </div>

      {/* 2×2 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DISTRIBUTION_CARDS.map((card) => {
          const Icon = card.Icon;
          return (
            <div
              key={card.id}
              className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300"
            >
              {/* Icon + Title */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
                </div>
                <div>
                  <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
                    {card.titleEs}
                  </p>
                  <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
                    {card.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
                {card.description}
              </p>

              {/* Placeholder */}
              <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
                <p className="text-xs text-carbon/20 tracking-wide">
                  Coming in Phase 6–9
                </p>
              </div>

              {/* CTA bar */}
              <div className="mt-6 flex items-center justify-center gap-2 bg-carbon/[0.04] text-carbon/30 py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em]">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
