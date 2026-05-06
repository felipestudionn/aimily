/**
 * Milestone Sync Map — typed coverage of all 45 default milestones.
 *
 * Replaces the ad-hoc 14-of-45 string map that lived inside
 * /api/collection-timelines/sync-progress/route.ts. Each milestone
 * declares a typed predicate that decides whether the milestone is
 * `completed` or `in_progress` based on signals from real production
 * tables (collection_workspace_data, collection_skus, tech_pack_data,
 * tech_pack_revisions, sku_colorways, proto_iterations, sample_reviews,
 * production_orders, drops, content_pillars, content_calendar,
 * paid_campaigns, social_templates, email_templates_content, lookbook_pages,
 * launch_tasks, ai_generations, product_copy, storefronts, brand_voice_config,
 * collection_decisions).
 *
 * Framework rule §10 (added 2026-05-06): "Every default milestone must
 * have a sync entry. CI fails on coverage gaps."
 *
 * Adding a new milestone: add it to DEFAULT_MILESTONES in
 * timeline-template.ts AND add a SYNC_MAP entry here. The CI test in
 * tests/milestone-coverage.ts fails if either is missing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_MILESTONES } from './timeline-template';

/* ─── Types ──────────────────────────────────────────────────────── */

/** Status the timeline should hold the milestone in after evaluation. */
export type SyncStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Snapshot passed to every predicate. Loaded once per sync-progress
 * call from production tables. Each field is read-only.
 */
export interface SyncSnapshot {
  collectionPlanId: string;
  /** Plan launch_date ISO string. */
  launchDate: string | null;
  /** ISO `now` at evaluation time. Stable across all probes in one run. */
  now: string;

  /** Workspace data per workspace (creative · merchandising · design). */
  workspaceData: Record<string, Record<string, unknown> | undefined>;

  /** Counts of rows in tables, scoped to the collection. */
  counts: {
    skus: number;
    skusWithSketch: number;
    skusWithRender: number;
    colorways: number;
    techPackData: number;
    techPackRevsV1: number;
    techPackRevsV2OrLater: number;
    protoIterations: number;
    sampleReviews: number;
    productionOrders: number;
    productionOrdersClosed: number;
    drops: number;
    contentPillars: number;
    productCopy: number;
    emailTemplates: number;
    paidCampaigns: number;
    socialTemplates: number;
    contentCalendar: number;
    lookbookPages: number;
    launchTasks: number;
    aiGenerationsStillLife: number;
    aiGenerationsEditorial: number;
    aiGenerationsVideo: number;
    commercialActions: number;
    storefrontPublishedAt: string | null;
    brandVoiceConfigured: boolean;
    finalSelectionLockedAt: string | null;
    postLaunchAnalysis: boolean;
  };
}

/**
 * A milestone sync entry. Returns the status the timeline row should
 * hold in. Returning the current status is fine — the sync will skip
 * already-completed rows itself.
 */
export interface SyncEntry {
  id: string;
  /** Predicate that decides status from the snapshot. Pure function. */
  decide(s: SyncSnapshot): SyncStatus;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

const block = (workspace: string, blockName: string) =>
  (s: SyncSnapshot): boolean => {
    const ws = s.workspaceData[workspace] as { blockData?: Record<string, unknown> } | undefined;
    const bd = ws?.blockData?.[blockName] as Record<string, unknown> | undefined;
    if (!bd) return false;
    return Object.values(bd).some(
      v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
    );
  };

const card = (workspace: string, cardName: string) =>
  (s: SyncSnapshot): boolean => {
    const ws = s.workspaceData[workspace] as { cardData?: Record<string, unknown> } | undefined;
    const cd = ws?.cardData?.[cardName] as { confirmed?: boolean; data?: Record<string, unknown> } | undefined;
    if (!cd) return false;
    if (cd.confirmed === true) return true;
    if (cd.data && Object.keys(cd.data).length > 0) return false; // has data but unconfirmed → in_progress, not completed
    return false;
  };

const cardConfirmed = (workspace: string, cardName: string) =>
  (s: SyncSnapshot): boolean => {
    const ws = s.workspaceData[workspace] as { cardData?: Record<string, unknown> } | undefined;
    const cd = ws?.cardData?.[cardName] as { confirmed?: boolean } | undefined;
    return cd?.confirmed === true;
  };

const cardHasData = (workspace: string, cardName: string) =>
  (s: SyncSnapshot): boolean => {
    const ws = s.workspaceData[workspace] as { cardData?: Record<string, unknown> } | undefined;
    const cd = ws?.cardData?.[cardName] as { confirmed?: boolean; data?: Record<string, unknown> } | undefined;
    return !!cd?.data && Object.keys(cd.data).length > 0;
  };

const launchPlusDays = (s: SyncSnapshot, days: number): boolean => {
  if (!s.launchDate) return false;
  const target = new Date(s.launchDate);
  target.setUTCDate(target.getUTCDate() + days);
  return new Date(s.now).getTime() >= target.getTime();
};

const launchMinusWeeks = (s: SyncSnapshot, weeks: number): boolean => {
  if (!s.launchDate) return false;
  const target = new Date(s.launchDate);
  target.setUTCDate(target.getUTCDate() - weeks * 7);
  return new Date(s.now).getTime() >= target.getTime();
};

/* ─── Predicate factories ────────────────────────────────────────── */

/**
 * `completedIf` returns 'completed' when the predicate is true,
 * otherwise 'in_progress' if the optional inProgressIf is true,
 * otherwise 'pending'.
 */
function makeEntry(
  id: string,
  completedIf: (s: SyncSnapshot) => boolean,
  inProgressIf?: (s: SyncSnapshot) => boolean,
): SyncEntry {
  return {
    id,
    decide(s) {
      if (completedIf(s)) return 'completed';
      if (inProgressIf && inProgressIf(s)) return 'in_progress';
      return 'pending';
    },
  };
}

/* ─── The map ────────────────────────────────────────────────────── */

export const SYNC_MAP: Record<string, SyncEntry> = {
  /* ── Block 1 · Creative & Brand ─────────────────────────────── */
  'cr-1': makeEntry(
    'cr-1',
    s => {
      const has = block('creative', 'consumer')(s);
      const ws = s.workspaceData.creative as { blockData?: { consumer?: { confirmed?: boolean } } } | undefined;
      return has && ws?.blockData?.consumer?.confirmed === true;
    },
    block('creative', 'consumer'),
  ),
  'cr-2': makeEntry(
    'cr-2',
    s => {
      const has = block('creative', 'moodboard')(s);
      const ws = s.workspaceData.creative as { blockData?: { moodboard?: { confirmed?: boolean } } } | undefined;
      return has && ws?.blockData?.moodboard?.confirmed === true;
    },
    block('creative', 'moodboard'),
  ),
  'cr-3': makeEntry(
    'cr-3',
    block('creative', 'market-research'),
    block('creative', 'market-research'),
  ),
  'cr-4': makeEntry(
    'cr-4',
    s => block('creative', 'creative-overview')(s) || block('creative', 'synthesis')(s),
    s => block('creative', 'creative-overview')(s) || block('creative', 'synthesis')(s),
  ),
  'br-1': makeEntry('br-1', block('creative', 'brand-dna'), block('creative', 'brand-dna')),
  'br-2': makeEntry('br-2', block('creative', 'brand-dna'), block('creative', 'brand-dna')),
  'br-3': makeEntry('br-3', block('creative', 'vibe'), block('creative', 'vibe')),
  'br-4': makeEntry('br-4', block('creative', 'vibe'), block('creative', 'vibe')),

  /* ── Block 2 · Range Planning & Strategy ────────────────────── */
  'rp-1': makeEntry('rp-1', cardConfirmed('merchandising', 'scenarios'), cardHasData('merchandising', 'scenarios')),
  'rp-2': makeEntry('rp-2', cardConfirmed('merchandising', 'channels'), cardHasData('merchandising', 'channels')),
  'rp-3': makeEntry('rp-3', cardConfirmed('merchandising', 'budget'), cardHasData('merchandising', 'budget')),
  'rp-4': makeEntry(
    'rp-4',
    s => cardConfirmed('merchandising', 'pricing')(s) && cardConfirmed('merchandising', 'families')(s),
    s => cardHasData('merchandising', 'pricing')(s) || cardHasData('merchandising', 'families')(s),
  ),
  'rp-5': makeEntry('rp-5', s => s.counts.skus > 0),
  'rp-6': makeEntry(
    'rp-6',
    s => !!s.counts.finalSelectionLockedAt,
    s => s.counts.skus > 0,
  ),

  /* ── Block 3 · Design & Development ─────────────────────────── */
  'dd-1': makeEntry(
    'dd-1',
    s => s.counts.skus > 0 && s.counts.skusWithSketch >= s.counts.skus,
    s => s.counts.skusWithSketch > 0,
  ),
  'dd-2': makeEntry(
    'dd-2',
    s => s.counts.techPackData > 0 && s.counts.techPackData >= s.counts.skus,
    s => s.counts.techPackData > 0,
  ),
  'dd-3': makeEntry(
    'dd-3',
    s => s.counts.skus > 0 && s.counts.skusWithRender >= s.counts.skus,
    s => s.counts.skusWithRender > 0,
  ),
  'dd-4': makeEntry(
    'dd-4',
    // Round 2: every SKU has a render AND at least one v2+ tech pack revision
    s => s.counts.skus > 0
      && s.counts.skusWithRender >= s.counts.skus
      && s.counts.techPackRevsV2OrLater > 0,
    s => s.counts.skusWithRender > 0,
  ),
  'dd-5': makeEntry(
    'dd-5',
    s => s.counts.techPackData > 0,
    s => !!(s.workspaceData.design as { patterns?: unknown } | undefined)?.patterns,
  ),
  'dd-6': makeEntry(
    'dd-6',
    s => s.counts.colorways > 0 && s.counts.skus > 0 && s.counts.colorways >= s.counts.skus,
    s => s.counts.colorways > 0,
  ),
  'dd-19': makeEntry(
    'dd-19',
    s => s.counts.techPackRevsV1 > 0 || s.counts.techPackData > 0,
    s => s.counts.techPackData > 0,
  ),
  'dd-7': makeEntry(
    'dd-7',
    s => s.counts.protoIterations > 0,
    s => s.counts.protoIterations > 0,
  ),
  'dd-8': makeEntry(
    'dd-8',
    s => s.counts.protoIterations > 0,
    s => s.counts.protoIterations > 0,
  ),
  'dd-9': makeEntry(
    'dd-9',
    s => s.counts.sampleReviews > 0,
    s => s.counts.sampleReviews > 0,
  ),
  'dd-10': makeEntry(
    'dd-10',
    s => s.counts.techPackRevsV2OrLater > 0,
    s => s.counts.techPackRevsV1 > 0,
  ),
  'dd-11': makeEntry(
    'dd-11',
    s => s.counts.sampleReviews > 0,
    s => s.counts.sampleReviews > 0,
  ),
  'dd-12': makeEntry(
    'dd-12',
    s => s.counts.sampleReviews > 0,
    s => s.counts.sampleReviews > 0,
  ),
  'dd-13': makeEntry(
    'dd-13',
    s => s.counts.sampleReviews > 0 && !!s.counts.finalSelectionLockedAt,
    s => s.counts.sampleReviews > 0,
  ),
  'dd-14': makeEntry(
    'dd-14',
    s => !!s.counts.finalSelectionLockedAt,
    s => s.counts.sampleReviews > 0 || s.counts.protoIterations > 0,
  ),
  'dd-15': makeEntry(
    'dd-15',
    s => s.counts.productionOrders > 0,
    s => s.counts.productionOrders > 0,
  ),
  'dd-16': makeEntry(
    'dd-16',
    s => s.counts.productionOrders > 0 && s.counts.productionOrdersClosed > 0,
    s => s.counts.productionOrders > 0,
  ),
  'dd-17': makeEntry(
    'dd-17',
    s => s.counts.productionOrdersClosed > 0,
    s => s.counts.productionOrders > 0,
  ),
  'dd-18': makeEntry(
    'dd-18',
    s => s.counts.productionOrders > 0
      && s.counts.productionOrdersClosed >= s.counts.productionOrders,
    s => s.counts.productionOrdersClosed > 0,
  ),

  /* ── Block 4 · Marketing & Sales ────────────────────────────── */
  'gm-1': makeEntry(
    'gm-1',
    s => !!s.counts.storefrontPublishedAt,
    s => !!s.counts.storefrontPublishedAt || s.counts.productCopy > 0,
  ),
  'gm-2': makeEntry(
    'gm-2',
    s => !!s.counts.storefrontPublishedAt,
    s => s.counts.productCopy > 0,
  ),
  'gm-3': makeEntry(
    'gm-3',
    s => s.counts.skus > 0 && s.counts.aiGenerationsStillLife >= s.counts.skus,
    s => s.counts.aiGenerationsStillLife > 0,
  ),
  'gm-4': makeEntry(
    'gm-4',
    s => s.counts.skus > 0 && s.counts.productCopy >= s.counts.skus,
    s => s.counts.productCopy > 0,
  ),
  'gm-5': makeEntry(
    'gm-5',
    s => s.counts.lookbookPages > 0 || s.counts.aiGenerationsEditorial >= 3,
    s => s.counts.lookbookPages > 0 || s.counts.aiGenerationsEditorial > 0,
  ),
  'gm-6': makeEntry(
    'gm-6',
    s => s.counts.socialTemplates > 0,
    s => s.counts.socialTemplates > 0,
  ),
  'gm-7': makeEntry(
    'gm-7',
    s => s.counts.contentCalendar >= 4,
    s => s.counts.contentCalendar > 0,
  ),
  'gm-8': makeEntry(
    'gm-8',
    s => s.counts.commercialActions > 0,
    s => s.counts.commercialActions > 0,
  ),
  'gm-9': makeEntry(
    'gm-9',
    s => s.counts.emailTemplates >= 3,
    s => s.counts.emailTemplates > 0,
  ),
  'gm-10': makeEntry(
    'gm-10',
    s => s.counts.paidCampaigns > 0,
    s => s.counts.paidCampaigns > 0,
  ),
  'gm-11': makeEntry(
    'gm-11',
    s => s.counts.commercialActions > 0,
    s => s.counts.commercialActions > 0,
  ),
  'gm-12': makeEntry(
    'gm-12',
    s => launchMinusWeeks(s, 0) || s.counts.contentCalendar >= 4,
    s => s.counts.contentCalendar > 0 || launchMinusWeeks(s, 4),
  ),
  'gm-13': makeEntry(
    'gm-13',
    s => launchPlusDays(s, 0),
    s => launchMinusWeeks(s, 1),
  ),
  'gm-14': makeEntry(
    'gm-14',
    s => launchPlusDays(s, 7),
    s => launchPlusDays(s, 0),
  ),
  'gm-15': makeEntry(
    'gm-15',
    s => s.counts.postLaunchAnalysis,
    s => launchPlusDays(s, 7),
  ),
};

/* ─── Snapshot loader ────────────────────────────────────────────── */

/**
 * Load a complete snapshot of the production state for the collection.
 * Single-shot: every count + every workspace + the launch_date in one
 * Promise.all. Fed into the predicates to decide each milestone.
 */
export async function loadSyncSnapshot(
  client: SupabaseClient,
  planId: string,
): Promise<SyncSnapshot> {
  const now = new Date().toISOString();

  // Resolve sku ids first — needed for the per-sku-table joins below.
  const { data: skuRows } = await client
    .from('collection_skus')
    .select('id, sketch_url, render_url')
    .eq('collection_plan_id', planId);
  const skus = skuRows || [];
  const skuIds = skus.map((s: { id: string }) => s.id);
  const skusWithSketch = skus.filter((s: { sketch_url: string | null }) => !!s.sketch_url).length;
  const skusWithRender = skus.filter((s: { render_url: string | null }) => !!s.render_url).length;

  const [
    planRes,
    workspacesRes,
    colorwaysRes,
    techPackDataRes,
    techPackRevsRes,
    protosRes,
    sampleRevsRes,
    productionOrdersRes,
    dropsRes,
    contentPillarsRes,
    productCopyRes,
    emailRes,
    paidRes,
    socialRes,
    contentCalRes,
    lookbookRes,
    launchTasksRes,
    aiGensRes,
    commercialRes,
    storefrontRes,
    voiceRes,
    decisionsRes,
  ] = await Promise.all([
    client.from('collection_plans').select('launch_date, setup_data').eq('id', planId).maybeSingle(),
    client.from('collection_workspace_data').select('workspace, data').eq('collection_plan_id', planId),
    skuIds.length === 0
      ? Promise.resolve({ count: 0 })
      : client.from('sku_colorways').select('id', { count: 'exact', head: true }).in('sku_id', skuIds),
    skuIds.length === 0
      ? Promise.resolve({ count: 0 })
      : client.from('tech_pack_data').select('id', { count: 'exact', head: true }).in('sku_id', skuIds),
    client.from('tech_pack_revisions').select('id, version').eq('collection_plan_id', planId),
    skuIds.length === 0
      ? Promise.resolve({ count: 0 })
      : client.from('proto_iterations').select('id', { count: 'exact', head: true }).in('sku_id', skuIds),
    skuIds.length === 0
      ? Promise.resolve({ count: 0 })
      : client.from('sample_reviews').select('id', { count: 'exact', head: true }).in('sku_id', skuIds),
    client.from('production_orders').select('id, closed_at').eq('collection_plan_id', planId),
    client.from('drops').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('content_pillars').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('product_copy').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('email_templates_content').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('paid_campaigns').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('social_templates').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('content_calendar').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('lookbook_pages').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('launch_tasks').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('ai_generations').select('id, generation_type').eq('collection_plan_id', planId),
    client.from('commercial_actions').select('id', { count: 'exact', head: true }).eq('collection_plan_id', planId),
    client.from('storefronts').select('published_at').eq('collection_plan_id', planId).maybeSingle(),
    client.from('brand_voice_config').select('id').eq('collection_plan_id', planId).maybeSingle(),
    client
      .from('collection_decisions')
      .select('domain, subdomain, key, value')
      .eq('collection_plan_id', planId)
      .eq('is_current', true)
      .eq('domain', 'merchandising')
      .eq('subdomain', 'final_selection'),
  ]);

  // Derive workspace map keyed by workspace name.
  const workspaceData: Record<string, Record<string, unknown> | undefined> = {};
  for (const w of (workspacesRes.data as Array<{ workspace: string; data: Record<string, unknown> }> | null) || []) {
    workspaceData[w.workspace] = w.data;
  }

  // Production orders status counts.
  const productionOrders = (productionOrdersRes.data as Array<{ id: string; closed_at: string | null }> | null) || [];
  const productionOrdersClosed = productionOrders.filter(po => !!po.closed_at).length;

  // Tech pack revisions split by version label (best-effort: numeric or "v1"/"v2").
  const tpRevs = (techPackRevsRes.data as Array<{ id: string; version: string }> | null) || [];
  const isV1 = (v: string) => v === '1' || /^v?1$/i.test(v);
  const techPackRevsV1 = tpRevs.filter(r => isV1(r.version)).length;
  const techPackRevsV2OrLater = tpRevs.filter(r => !isV1(r.version)).length;

  // AI generations split by type.
  const aiGens = (aiGensRes.data as Array<{ id: string; generation_type: string }> | null) || [];
  const aiGenerationsStillLife = aiGens.filter(g => g.generation_type === 'still_life' || g.generation_type === 'product_render').length;
  const aiGenerationsEditorial = aiGens.filter(g => g.generation_type === 'editorial' || g.generation_type === 'tryon' || g.generation_type === 'lifestyle').length;
  const aiGenerationsVideo = aiGens.filter(g => g.generation_type === 'video').length;

  // Final selection lock signal — read from collection_decisions only
  // (the workspace path was retired in the merchandising redesign).
  const finalSelDecision = (decisionsRes.data as Array<{ key: string; value: unknown }> | null)?.find(
    d => d.key === 'locked_at',
  );
  const finalSelectionLockedAt =
    (finalSelDecision?.value as string | null | undefined) ?? null;

  // Post-launch analysis is the only narrow-scoped field still living
  // inside collection_plans.setup_data — see Sprint B.4 audit.
  const planSetup = (planRes.data?.setup_data as { post_launch_analysis?: unknown } | null) ?? {};
  const postLaunchAnalysis = !!planSetup.post_launch_analysis;

  return {
    collectionPlanId: planId,
    launchDate: planRes.data?.launch_date ?? null,
    now,
    workspaceData,
    counts: {
      skus: skus.length,
      skusWithSketch,
      skusWithRender,
      colorways: colorwaysRes.count ?? 0,
      techPackData: techPackDataRes.count ?? 0,
      techPackRevsV1,
      techPackRevsV2OrLater,
      protoIterations: protosRes.count ?? 0,
      sampleReviews: sampleRevsRes.count ?? 0,
      productionOrders: productionOrders.length,
      productionOrdersClosed,
      drops: dropsRes.count ?? 0,
      contentPillars: contentPillarsRes.count ?? 0,
      productCopy: productCopyRes.count ?? 0,
      emailTemplates: emailRes.count ?? 0,
      paidCampaigns: paidRes.count ?? 0,
      socialTemplates: socialRes.count ?? 0,
      contentCalendar: contentCalRes.count ?? 0,
      lookbookPages: lookbookRes.count ?? 0,
      launchTasks: launchTasksRes.count ?? 0,
      aiGenerationsStillLife,
      aiGenerationsEditorial,
      aiGenerationsVideo,
      commercialActions: commercialRes.count ?? 0,
      storefrontPublishedAt: storefrontRes.data?.published_at ?? null,
      brandVoiceConfigured: !!voiceRes.data?.id,
      finalSelectionLockedAt,
      postLaunchAnalysis,
    },
  };
}

/* ─── Coverage validator (used by the CI test) ───────────────────── */

/**
 * Returns the list of milestone IDs from DEFAULT_MILESTONES that have
 * no entry in SYNC_MAP. Empty array = full coverage.
 */
export function findCoverageGaps(): string[] {
  const ids = new Set(Object.keys(SYNC_MAP));
  return DEFAULT_MILESTONES.map(m => m.id).filter(id => !ids.has(id));
}
