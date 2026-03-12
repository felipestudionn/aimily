'use client';

import { ArrowRight, Film, PenTool } from 'lucide-react';
import type { TimelineMilestone } from '@/types/timeline';
import { StoriesCard } from './StoriesCard';
import { ProductVisualsCard } from './ProductVisualsCard';

interface Props {
  collectionPlanId: string;
  milestones: TimelineMilestone[];
}

/* ── Card config for the 2 remaining placeholder cards ── */
const PLACEHOLDER_CARDS = [
  {
    id: 'campaign',
    title: 'Campaign & Video',
    titleEs: 'Campaña y Video',
    description: 'Lookbook layouts, editorial shoots, and video content for each story.',
    Icon: Film,
  },
  {
    id: 'content-strategy',
    title: 'Content Strategy',
    titleEs: 'Estrategia de Contenido',
    description: 'Brand voice, content pillars, product copy, social templates, and SEO.',
    Icon: PenTool,
  },
] as const;

export function MarketingCreationScreen({ collectionPlanId, milestones }: Props) {
  return (
    <div className="px-8 md:px-12 lg:px-16 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3">
          Marketing & Digital
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          Content <span className="italic">Creation</span>
        </h2>
        <p className="text-base font-light text-carbon/50 mt-3 max-w-2xl leading-relaxed">
          Build your marketing assets — stories, visuals, campaigns, and content strategy.
        </p>
      </div>

      {/* 2×2 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Stories — live card */}
        <StoriesCard collectionPlanId={collectionPlanId} />

        {/* Product Visuals — live card */}
        <ProductVisualsCard collectionPlanId={collectionPlanId} />

        {/* Remaining placeholders */}
        {PLACEHOLDER_CARDS.map((card) => {
          const Icon = card.Icon;
          return (
            <div
              key={card.id}
              className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300"
            >
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
              <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
                {card.description}
              </p>
              <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
                <p className="text-xs text-carbon/20 tracking-wide">
                  Coming in Phase 4–5
                </p>
              </div>
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
