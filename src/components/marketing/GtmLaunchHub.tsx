'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Rocket, Calendar, Megaphone, BarChart3 } from 'lucide-react';
import { GoToMarketCard } from './GoToMarketCard';
import { LaunchCard } from './LaunchCard';
import { ContentCalendarCard } from './ContentCalendarCard';
import { PaidGrowthCard } from './PaidGrowthCard';

/**
 * GTM & Launch Plan Hub
 *
 * Unifies 4 pre-launch marketing sub-sections that previously existed
 * in the codebase as isolated cards without a linked route. This is
 * the coordinating workspace BEFORE a drop goes live; Sales Dashboard
 * is the companion AFTER it goes live (they're sibling workspaces).
 *
 * 4-card gold standard hub (CollectionOverview pattern):
 *   01. GTM Strategy — positioning, press, timing, launch orchestration
 *   02. Launch Plan — drop-day mechanics, countdown, press kit
 *   03. Content Calendar — editorial schedule across channels
 *   04. Paid Growth — ads budget allocation, Meta/TikTok plan
 *
 * Clicking a card drills into the existing card component
 * (GoToMarketCard, LaunchCard, ContentCalendarCard, PaidGrowthCard)
 * with inline back navigation.
 */

interface GtmSection {
  id: string;
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const SECTIONS: GtmSection[] = [
  {
    id: 'gtm',
    number: '01',
    title: 'GTM Strategy',
    description:
      'Go-to-market positioning, target press, distribution channels, timing, and the overall launch narrative that ties brand DNA to commercial execution.',
    icon: Rocket,
  },
  {
    id: 'launch',
    number: '02',
    title: 'Launch Plan',
    description:
      'Drop-day mechanics: countdown, press kit, influencer seeding, launch-day content drops, email waves, and release orchestration across channels.',
    icon: Calendar,
  },
  {
    id: 'calendar',
    number: '03',
    title: 'Content Calendar',
    description:
      'Editorial schedule for pre-launch, launch week, and post-launch — with asset status, channel-specific copy, and publishing dates per piece.',
    icon: Megaphone,
  },
  {
    id: 'paid',
    number: '04',
    title: 'Paid Growth',
    description:
      'Meta, TikTok and Google paid media allocation: budget by channel, creative formats, audience targeting, and forecast CAC.',
    icon: BarChart3,
  },
];

interface Props {
  collectionPlanId: string;
}

export function GtmLaunchHub({ collectionPlanId }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (activeSection) {
    const section = SECTIONS.find((s) => s.id === activeSection);
    if (!section) return null;
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => setActiveSection(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium text-carbon/50 hover:text-carbon hover:bg-carbon/[0.04] transition-all"
          >
            <ArrowLeft className="h-3 w-3" />
            GTM &amp; Launch
          </button>
          <div className="text-center">
            <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1">
              GTM &amp; Launch Plan
            </div>
            <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight">
              {section.title}
            </h2>
          </div>
          <div className="w-[120px]" />
        </div>

        <div>
          {activeSection === 'gtm' && <GoToMarketCard collectionPlanId={collectionPlanId} />}
          {activeSection === 'launch' && <LaunchCard collectionPlanId={collectionPlanId} />}
          {activeSection === 'calendar' && <ContentCalendarCard collectionPlanId={collectionPlanId} />}
          {activeSection === 'paid' && <PaidGrowthCard collectionPlanId={collectionPlanId} />}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-5">
      {SECTIONS.map((section) => {
        const progress: number = 0;
        const isComplete = progress === 100;
        const isStarted = progress > 0;
        return (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
          >
            <div className="mb-10">
              <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                {section.number}.
              </span>
            </div>

            <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
              {section.title}
            </h3>

            <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
              {section.description}
            </p>

            <div className="flex-1" />

            <div className="flex justify-center mt-10">
              <div
                className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                  isComplete
                    ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
                    : 'bg-carbon text-white group-hover:bg-carbon/90'
                }`}
              >
                {isComplete ? 'Completed' : isStarted ? 'Continue' : 'Start'}
                {!isComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                {isComplete && <Check className="h-3.5 w-3.5" />}
              </div>
            </div>

            <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
