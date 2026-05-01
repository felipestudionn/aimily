/**
 * Workspace → CIS Mapper
 *
 * Inverts what `load-full-context.ts` reads from `collection_workspace_data`
 * so that every save through `useWorkspaceData` also persists structured
 * decisions into `collection_decisions` (the CIS).
 *
 * Why this exists:
 *   Until now, the Creative block (vibe / consumer / brand-dna / moodboard /
 *   _synthesis / deep-dive / live-signals / global-trends / competitors)
 *   was saved exclusively to `collection_workspace_data` via the debounced
 *   `useWorkspaceData` hook. The CIS only got populated when the user
 *   reached downstream APIs (brand-profiles, brand-voice-config,
 *   content-pillars, drops, stories, lock-selection, presentation/promote,
 *   etc.). Any collection that stayed in the Creative block had a
 *   poor / empty CIS — `compilePromptContext()` (which has no fallback)
 *   then rendered empty placeholders for `editorial_prompt`,
 *   `still_life_prompt`, `copy_prompt`, `seo_prompt`.
 *
 * This mapper closes the gap: every Creative save now writes through
 * to the CIS using the same domain.subdomain.key contract that
 * `compilePromptContext()` and `loadFullContext()` expect.
 *
 * Read counterpart: src/lib/ai/load-full-context.ts
 * CIS schema reference: AZUR SS27 collection (29 decisions, full coverage)
 */

import type { RecordDecisionParams } from '@/lib/collection-intelligence';

type WorkspaceType = 'creative' | 'merchandising' | 'design';

interface BlockEntry {
  mode?: string;
  confirmed?: boolean;
  data?: Record<string, unknown>;
}

interface CreativeWorkspaceShape {
  blockData?: Record<string, BlockEntry>;
  activeStep?: string;
}

interface ConsumerProposal {
  title?: string;
  desc?: string;
  status?: string;
}

interface TrendResult {
  title?: string;
  brands?: string;
  desc?: string;
  selected?: boolean;
}

interface MapperContext {
  collectionPlanId: string;
  userId?: string;
}

function s(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Map Creative workspace blockData → CIS decisions.
 * Returns one decision per CIS key that has non-empty data.
 * Decisions with the same (domain, subdomain, key) as an existing one
 * are deduped/versioned by `recordDecision()` itself.
 */
function mapCreativeWorkspace(
  ctx: MapperContext,
  workspaceData: CreativeWorkspaceShape,
): RecordDecisionParams[] {
  const decisions: RecordDecisionParams[] = [];
  const bd = workspaceData.blockData || {};
  const base = {
    collectionPlanId: ctx.collectionPlanId,
    sourcePhase: 'creative',
    sourceComponent: 'CreativePage',
    userId: ctx.userId,
    confidence: 'draft' as const,
    source: 'user_input' as const,
  };

  /* ── BRAND DNA → identity + color + voice.tone ── */
  const brandDna = (bd['brand-dna']?.data || {}) as {
    brandName?: string; colors?: string[]; tone?: string;
    typography?: string; style?: string;
  };
  const brandName = s(brandDna.brandName);
  if (brandName) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'identity', key: 'brand_name',
      value: brandName,
      tags: ['affects_content', 'affects_seo', 'affects_sales'],
    });
  }
  const colors = arr<string>(brandDna.colors).filter(c => s(c).length > 0);
  if (colors.length) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'color', key: 'primary_palette',
      value: colors,
      tags: ['affects_photography', 'affects_web', 'affects_content'],
    });
  }
  const tone = s(brandDna.tone);
  if (tone) {
    decisions.push({
      ...base,
      domain: 'marketing', subdomain: 'voice', key: 'tone',
      value: tone,
      sourcePhase: 'marketing',
      tags: ['affects_content'],
    });
  }
  const style = s(brandDna.style);
  if (style) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'identity', key: 'visual_direction',
      value: style,
      tags: ['affects_photography', 'affects_web', 'affects_content'],
    });
    /* Mirror style into the marketing voice personality slot too. The
       Brand DNA UI only exposes one free-text field for
       brand essence today, so the same string drives both visual
       direction and the {{brand_voice_personality}} placeholder used
       by marketing prompts. When a dedicated personality field ships
       in the UI it can override this without losing the visual link. */
    decisions.push({
      ...base,
      domain: 'marketing', subdomain: 'voice', key: 'personality',
      value: style,
      sourcePhase: 'marketing',
      tags: ['affects_content', 'affects_seo'],
    });
  }
  const typography = s(brandDna.typography);
  if (typography) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'identity', key: 'typography',
      value: typography,
      tags: ['affects_web', 'affects_content'],
    });
  }

  /* ── CONSUMER → target ── */
  const consumerProposals = arr<ConsumerProposal>(bd.consumer?.data?.proposals);
  const liked = consumerProposals.filter(p => p.status === 'liked');
  if (liked.length) {
    const personaName = s(liked[0].title);
    if (personaName) {
      decisions.push({
        ...base,
        domain: 'creative', subdomain: 'target', key: 'persona_name',
        value: personaName,
        tags: ['affects_content', 'affects_pricing', 'affects_channels'],
      });
    }
    /* Demographics + psychographics + lifestyle — same source content
       (the proposal description), but each placeholder serves a different
       prompt downstream. We split with semantic-friendly framing. */
    const allDescs = liked.map(p => `${s(p.title)}: ${s(p.desc)}`).filter(x => x.length > 2);
    if (allDescs.length) {
      decisions.push({
        ...base,
        domain: 'creative', subdomain: 'target', key: 'demographics',
        value: allDescs.join('\n\n'),
        tags: ['affects_content', 'affects_pricing', 'affects_channels', 'affects_seo'],
      });
      decisions.push({
        ...base,
        domain: 'creative', subdomain: 'target', key: 'psychographics',
        value: allDescs.join('\n\n'),
        tags: ['affects_content', 'affects_seo'],
      });
      decisions.push({
        ...base,
        domain: 'creative', subdomain: 'target', key: 'lifestyle',
        value: allDescs.join('\n\n'),
        tags: ['affects_content', 'affects_photography', 'affects_seo'],
      });
    }
  }

  /* ── VIBE → identity.collection_vibe ── */
  const vibeData = (bd.vibe?.data || {}) as {
    vibeTitle?: string; vibe?: string; keywords?: string;
  };
  const vibeNarrative = s(vibeData.vibe);
  const vibeTitle = s(vibeData.vibeTitle);
  const vibeKeywords = s(vibeData.keywords);
  const vibeFull = [
    vibeTitle,
    vibeNarrative,
    vibeKeywords ? `Keywords: ${vibeKeywords}` : '',
  ].filter(Boolean).join('\n');
  if (vibeFull) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'identity', key: 'collection_vibe',
      value: vibeFull,
      tags: ['affects_content', 'affects_photography', 'affects_seo'],
    });
  }

  /* ── MOODBOARD → inspiration.moodboard_analysis ──
     Stored as a STRING so downstream consumers (compilePromptContext
     aliasing it as `moodboard_summary`, prompt-context.ts casting it
     to string) render it correctly. Keywords are appended in a stable
     order to keep idempotency; sorting alphabetically prevents version
     spam when the user merely re-orders chips in the UI. */
  const moodboardData = (bd.moodboard?.data || {}) as {
    analysis?: string; keywords?: string[];
  };
  const moodboardAnalysis = s(moodboardData.analysis);
  const moodboardKeywords = arr<string>(moodboardData.keywords)
    .map(k => s(k))
    .filter(Boolean)
    .sort();
  if (moodboardAnalysis || moodboardKeywords.length) {
    const moodboardText = [
      moodboardAnalysis,
      moodboardKeywords.length ? `Keywords: ${moodboardKeywords.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'inspiration', key: 'moodboard_analysis',
      value: moodboardText,
      tags: ['affects_photography', 'affects_content', 'affects_seo'],
    });
  }

  /* ── SYNTHESIS → identity.creative_synthesis ── */
  const synthesisData = (bd._synthesis?.data || {}) as {
    summary?: string; keyDecisions?: string;
  };
  const synthesisSummary = s(synthesisData.summary);
  const synthesisKey = s(synthesisData.keyDecisions);
  if (synthesisSummary || synthesisKey) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'identity', key: 'creative_synthesis',
      value: { summary: synthesisSummary, keyDecisions: synthesisKey },
      tags: ['affects_content', 'affects_photography'],
    });
  }

  /* ── TRENDS (global-trends + deep-dive + live-signals) → inspiration.trends_selected ── */
  const trendItems: string[] = [];
  const referenceBrands = new Set<string>();
  for (const blockId of ['global-trends', 'deep-dive', 'live-signals']) {
    const results = arr<TrendResult>(bd[blockId]?.data?.results);
    for (const r of results) {
      if (!r.selected) continue;
      const title = s(r.title);
      const desc = s(r.desc);
      const brands = s(r.brands);
      if (title) trendItems.push(`${title}${brands ? ` (${brands})` : ''}: ${desc}`);
      if (brands) {
        brands.split(/,|;|\//).map(b => s(b)).filter(Boolean).forEach(b => referenceBrands.add(b));
      }
    }
  }
  if (trendItems.length) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'inspiration', key: 'trends_selected',
      value: trendItems,
      tags: ['affects_content', 'affects_photography', 'affects_seo'],
    });
  }
  if (referenceBrands.size) {
    /* Sort to keep JSON.stringify stable across runs even when the user
       reorders trends in the UI — recordDecision dedupes by exact JSON
       equality, so unstable order would mint a new version on every save. */
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'inspiration', key: 'reference_brands',
      value: Array.from(referenceBrands).sort(),
      tags: ['affects_content', 'affects_pricing'],
    });
  }

  /* ── COMPETITORS → inspiration.competitors ──
     Sorted for the same idempotency reason as reference_brands. */
  const competitorResults = arr<TrendResult>(bd.competitors?.data?.results);
  const competitorTitles = competitorResults
    .filter(r => r.selected)
    .map(r => s(r.title))
    .filter(Boolean)
    .sort();
  if (competitorTitles.length) {
    decisions.push({
      ...base,
      domain: 'creative', subdomain: 'inspiration', key: 'competitors',
      value: competitorTitles,
      tags: ['affects_pricing', 'affects_content'],
    });
  }

  return decisions;
}

/**
 * Public entry. Maps any workspace's data shape to CIS decisions.
 * Currently implements the Creative workspace (where the gap was).
 * Merchandising and Design workspaces have their own dedicated
 * write-back APIs (drops, scenarios, brand-profiles, etc.) that
 * already call `recordDecisions()` correctly.
 */
export function mapWorkspaceToCIS(
  ctx: MapperContext,
  workspace: WorkspaceType,
  data: unknown,
): RecordDecisionParams[] {
  if (!data || typeof data !== 'object') return [];

  if (workspace === 'creative') {
    return mapCreativeWorkspace(ctx, data as CreativeWorkspaceShape);
  }

  /* Merchandising and Design workspaces don't need write-through here
     — their decisions flow through dedicated APIs already.
     Documented to make the no-op deliberate. */
  return [];
}
