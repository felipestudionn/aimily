'use client';

/**
 * SetupWorkspace — client shell for /strategy/[tenantSlug]/setup
 *
 * SegmentedPill switches between the two sub-blocks (Creative input ·
 * Buy strategy). The two child components own their own state machines;
 * this shell only routes the active block and surfaces gating banners.
 *
 * Mirrors Block 1 + Block 2's workspace pattern: header inside the page,
 * SegmentedPill centered below, content fills the rest.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { BuyStrategyArchetype } from '@/lib/strategy/sales-archetypes';
import { CreativeBlock } from './CreativeBlock';
import { BuyStrategyBlock } from './BuyStrategyBlock';

type BlockKey = 'creative' | 'buy-strategy';

interface Tenant {
  id: string;
  slug: string;
  display_name: string;
}

interface Brief {
  id: string;
  name: string;
  description: string | null;
  color_story: string[] | null;
  archetypes_focus: string[] | null;
  family_pivot: Record<string, number> | null;
  creative_narrative: string | null;
}

interface Constraint {
  id: string;
  name: string;
  chosen_archetype_id: 'A' | 'B' | 'C' | 'D' | null;
  action_mix: Record<string, number> | null;
  buy_waves: unknown[] | null;
  target_adjacent_families: string[] | null;
  target_total_skus: number | null;
  target_buy_budget: number | null;
  target_avg_margin: number | null;
}

interface Gating {
  total_sources: number;
  processed_sources: number;
  has_completed_run: boolean;
}

interface Props {
  tenant: Tenant;
  initialBlock: BlockKey;
  archetypes: BuyStrategyArchetype[];
  gating: Gating;
  existingBrief: Brief | null;
  existingConstraint: Constraint | null;
  topFamilyCodes: string[];
}

export function SetupWorkspace({
  tenant,
  initialBlock,
  archetypes,
  gating,
  existingBrief,
  existingConstraint,
  topFamilyCodes,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [block, setBlock] = useState<BlockKey>(initialBlock);

  const handleBlockChange = (next: BlockKey) => {
    setBlock(next);
    // Keep URL in sync so deep-link + refresh land on the same sub-block.
    const newParams = new URLSearchParams(searchParams?.toString() ?? '');
    newParams.set('block', next);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* SegmentedPill — centered */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-carbon/[0.04] rounded-full">
          {([
            { key: 'creative' as const, label: 'Creative input' },
            { key: 'buy-strategy' as const, label: 'Buy strategy' },
          ]).map((opt) => {
            const active = block === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleBlockChange(opt.key)}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-carbon text-white'
                    : 'text-carbon/55 hover:text-carbon'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gating banners */}
      {gating.processed_sources === 0 && gating.total_sources === 0 && (
        <div className="mx-auto max-w-2xl bg-carbon/[0.04] border border-carbon/[0.06] rounded-[14px] p-5">
          <p className="text-[14px] text-carbon font-medium mb-1">
            Upload sales data first
          </p>
          <p className="text-[13px] text-carbon/55 mb-3">
            Strategy reads from processed sources to ground recommendations.
            Upload at least one historical sales feed to begin.
          </p>
          <a
            href={`/strategy/${tenant.slug}/upload`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-carbon hover:underline"
          >
            Upload now →
          </a>
        </div>
      )}
      {gating.processed_sources === 0 && gating.total_sources > 0 && (
        <div className="mx-auto max-w-2xl bg-amber-50 border border-amber-200 rounded-[14px] p-5">
          <p className="text-[14px] text-amber-900 font-medium mb-1">
            Sources still processing
          </p>
          <p className="text-[13px] text-amber-800">
            {gating.total_sources} source{gating.total_sources === 1 ? '' : 's'} ingested.
            Refresh in ~30s to see them processed and unlock both blocks.
          </p>
        </div>
      )}
      {block === 'buy-strategy' && gating.processed_sources > 0 && !gating.has_completed_run && (
        <div className="mx-auto max-w-2xl bg-amber-50 border border-amber-200 rounded-[14px] p-5">
          <p className="text-[14px] text-amber-900 font-medium mb-1">
            Run a baseline analysis first
          </p>
          <p className="text-[13px] text-amber-800 mb-3">
            Buy strategy needs at least one completed run to populate last-season actuals
            and top winners. Run a quick exploratory analysis with default constraints first.
          </p>
          <a
            href={`/strategy/${tenant.slug}/runs/new`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-900 hover:underline"
          >
            Start exploratory run →
          </a>
        </div>
      )}

      {/* Sub-block content */}
      {block === 'creative' && (
        <CreativeBlock
          tenant={tenant}
          existingBrief={existingBrief}
          gatingBlocked={gating.processed_sources === 0}
          onSaved={() => handleBlockChange('buy-strategy')}
        />
      )}
      {block === 'buy-strategy' && (
        <BuyStrategyBlock
          tenant={tenant}
          archetypes={archetypes}
          existingConstraint={existingConstraint}
          existingBriefId={existingBrief?.id ?? null}
          topFamilyCodes={topFamilyCodes}
          gatingBlocked={!gating.has_completed_run}
        />
      )}
    </div>
  );
}
