'use client';

/**
 * SetupWorkspace — client shell for /strategy/[tenantSlug]/setup
 *
 * SegmentedPill switches between the two sub-blocks (Creative direction ·
 * Buy strategy). The two child components own their own state machines;
 * this shell only routes the active block and surfaces gating banners.
 *
 * Mirrors Block 1 + Block 2's workspace pattern: header inside the page,
 * SegmentedPill centered below, content fills the rest.
 */

import type { BuyStrategyArchetype } from '@/lib/strategy/sales-archetypes';
import { useTranslation } from '@/i18n';
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
  const t = useTranslation();

  // Block is fixed by the route query param when the user arrives from
  // the tenant hub's 4 Gold Standard cards. We deliberately do NOT expose
  // a SegmentedPill to switch between blocks here — each block is
  // independent per Felipe's rule. To switch blocks the user goes back
  // to the tenant hub.
  const block: BlockKey = initialBlock;

  const headline =
    block === 'creative'
      ? {
          title: t.strategy.setup.creative.title,
          description: t.strategy.setup.creative.description,
        }
      : {
          title: t.strategy.setup.buyStrategy.title,
          description: t.strategy.setup.buyStrategy.description,
        };

  return (
    <div className="space-y-8">
      {/* Back to tenant hub · the only nav out of a block */}
      <div className="max-w-7xl mx-auto">
        <a
          href={`/strategy/${tenant.slug}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em]"
          title={t.strategy.hub.back.replace('{name}', tenant.display_name)}
        >
          ← {tenant.display_name}
        </a>
      </div>

      {/* Contextual header */}
      <div className="text-center mb-2">
        <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05] mt-2">
          {headline.title}
        </h1>
        <p className="text-[14px] text-carbon/55 leading-relaxed italic mt-3 max-w-2xl mx-auto">
          {headline.description}
        </p>
      </div>

      {/* Gating banners */}
      {gating.processed_sources === 0 && gating.total_sources === 0 && (
        <div className="mx-auto max-w-2xl bg-carbon/[0.04] border border-carbon/[0.06] rounded-[14px] p-5">
          <p className="text-[14px] text-carbon font-medium mb-1">
            {t.strategy.setup.gating.uploadFirstTitle}
          </p>
          <p className="text-[13px] text-carbon/55 mb-3">
            {t.strategy.setup.gating.uploadFirstBody}
          </p>
          <a
            href={`/strategy/${tenant.slug}/upload`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-carbon hover:underline"
          >
            {t.strategy.setup.gating.uploadNow}
          </a>
        </div>
      )}
      {gating.processed_sources === 0 && gating.total_sources > 0 && (
        <div className="mx-auto max-w-2xl bg-amber-50 border border-amber-200 rounded-[14px] p-5">
          <p className="text-[14px] text-amber-900 font-medium mb-1">
            {t.strategy.setup.gating.processingTitle}
          </p>
          <p className="text-[13px] text-amber-800">
            {t.strategy.setup.gating.processingBody.replace('{count}', String(gating.total_sources))}
          </p>
        </div>
      )}
      {block === 'buy-strategy' && gating.processed_sources > 0 && !gating.has_completed_run && (
        <div className="mx-auto max-w-2xl bg-amber-50 border border-amber-200 rounded-[14px] p-5">
          <p className="text-[14px] text-amber-900 font-medium mb-1">
            {t.strategy.setup.gating.runBaselineTitle}
          </p>
          <p className="text-[13px] text-amber-800 mb-3">
            {t.strategy.setup.gating.runBaselineBody}
          </p>
          <a
            href={`/strategy/${tenant.slug}/runs/new`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-900 hover:underline"
          >
            {t.strategy.setup.gating.startRun}
          </a>
        </div>
      )}

      {/* Sub-block content · block is fixed by the URL query param */}
      {block === 'creative' && (
        <CreativeBlock
          tenant={tenant}
          existingBrief={existingBrief}
          gatingBlocked={gating.processed_sources === 0}
          onSaved={() => {
            // After saving creative direction, return to the tenant hub
            // so the user re-enters via the 4 Gold Standard cards.
            window.location.href = `/strategy/${tenant.slug}`;
          }}
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
