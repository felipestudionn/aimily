/**
 * Tech-pack revision engine — Phase 3 of the PLM parity plan.
 *
 * The contract:
 *   - Every PATCH /api/tech-pack save calls `recordRevision()`.
 *   - At most one revision per SKU has `is_current=true` (enforced by
 *     the partial unique index in migration 035).
 *   - Stage transitions go through `transitionApproval()` which appends
 *     a chain entry and bumps the version number.
 *   - The diff helper is server-side so the 50KB JSON walk doesn't
 *     ship to the client on every history view.
 *
 * Why snapshots and not deltas:
 *   The fashion-PLM use case is "designer wants to see what the v2.1
 *   approved tech pack looked like 3 months ago, after sample feedback
 *   moved a hem and changed a Pantone". Replaying deltas would mean
 *   reconstructing state from a chain — expensive and brittle when the
 *   schema evolves. Snapshots are 5–50KB; storage is cheap; clarity wins.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

// ─── Types ────────────────────────────────────────────────────────

export type ApprovalStage =
  | 'draft'
  | 'design_review'
  | 'merch_review'
  | 'production_review'
  | 'approved'
  | 'rejected'
  | 'archived';

export const STAGE_ORDER: ApprovalStage[] = [
  'draft',
  'design_review',
  'merch_review',
  'production_review',
  'approved',
];

export interface ApprovalChainEntry {
  stage: ApprovalStage;
  reviewer_id: string;
  reviewer_name?: string | null;
  decided_at: string;          // ISO
  decision: 'approved' | 'rejected';
  notes?: string | null;
  signature_image_url?: string | null;
}

export interface TechPackSnapshot {
  header?: Record<string, unknown>;
  drawings?: Record<string, unknown>;
  measurements?: Record<string, unknown>;
  bom?: Record<string, unknown>;
  materials?: Record<string, unknown>;
  grading?: Record<string, unknown>;
  factory_notes?: Record<string, unknown>;
  /** Phase 6 — structured stitching/pressing/finishing/hand-feel. */
  construction_details?: Record<string, unknown>;
  cost_breakdown?: Record<string, unknown>;
  comments?: unknown[];
}

export interface RevisionRow {
  id: string;
  collection_plan_id: string;
  sku_id: string;
  parent_revision_id: string | null;
  version: string;
  is_current: boolean;
  header_snapshot: Record<string, unknown>;
  drawings_snapshot: Record<string, unknown>;
  measurements_snapshot: Record<string, unknown>;
  bom_snapshot: Record<string, unknown>;
  materials_snapshot: Record<string, unknown>;
  grading_snapshot: Record<string, unknown>;
  factory_notes_snapshot: Record<string, unknown>;
  construction_details_snapshot: Record<string, unknown>;
  cost_breakdown_snapshot: Record<string, unknown>;
  comments_snapshot: unknown[];
  approval_status: ApprovalStage;
  approval_chain: ApprovalChainEntry[];
  created_by: string | null;
  created_by_name: string | null;
  change_summary: string | null;
  created_at: string;
}

// ─── Version bumping ──────────────────────────────────────────────

/**
 * v1.0 → v1.1 on edits, v1.x → v2.0 when an approval lands.
 *
 * Major bumps signal "this snapshot was approved" — designers care about
 * which revision was sent to the factory, which was sample-reviewed,
 * which was the production gate. Minor bumps are routine working saves.
 */
export function nextVersion(prevVersion: string | null, isApprovalBump: boolean): string {
  if (!prevVersion) return 'v1.0';
  const m = /^v(\d+)\.(\d+)$/.exec(prevVersion);
  if (!m) return 'v1.0';
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (isApprovalBump) return `v${major + 1}.0`;
  return `v${major}.${minor + 1}`;
}

// ─── Recording ────────────────────────────────────────────────────

interface RecordRevisionInput {
  collectionPlanId: string;
  skuId: string;
  snapshot: TechPackSnapshot;
  createdBy: string;
  createdByName?: string | null;
  changeSummary?: string | null;
  /** When provided, lifts the current approval state into the new
   *  revision so the chain doesn't reset on every save. */
  carryApprovalFromCurrent?: boolean;
}

/**
 * Insert a new revision and atomically swap `is_current` so the new row
 * becomes the canonical view. The DB partial unique index guarantees
 * we never end up with two `is_current=true` rows even if two PATCH
 * requests race.
 */
export async function recordRevision(input: RecordRevisionInput): Promise<RevisionRow | null> {
  const {
    collectionPlanId,
    skuId,
    snapshot,
    createdBy,
    createdByName = null,
    changeSummary = null,
    carryApprovalFromCurrent = true,
  } = input;

  const { data: previous } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select('id, version, approval_status, approval_chain')
    .eq('sku_id', skuId)
    .eq('is_current', true)
    .maybeSingle();

  const version = nextVersion(previous?.version ?? null, false);
  const carryStatus =
    carryApprovalFromCurrent && previous?.approval_status === 'approved'
      ? // After approval, the next edit is a draft again — the prior
        // approval lives on the prior revision.
        'draft'
      : (previous?.approval_status as ApprovalStage | undefined) ?? 'draft';

  // Flip the old current row first so we never violate the unique index.
  if (previous?.id) {
    await supabaseAdmin
      .from('tech_pack_revisions')
      .update({ is_current: false })
      .eq('id', previous.id);
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('tech_pack_revisions')
    .insert({
      collection_plan_id: collectionPlanId,
      sku_id: skuId,
      parent_revision_id: previous?.id ?? null,
      version,
      is_current: true,
      header_snapshot: snapshot.header ?? {},
      drawings_snapshot: snapshot.drawings ?? {},
      measurements_snapshot: snapshot.measurements ?? {},
      bom_snapshot: snapshot.bom ?? {},
      materials_snapshot: snapshot.materials ?? {},
      grading_snapshot: snapshot.grading ?? {},
      factory_notes_snapshot: snapshot.factory_notes ?? {},
      construction_details_snapshot: snapshot.construction_details ?? {},
      cost_breakdown_snapshot: snapshot.cost_breakdown ?? {},
      comments_snapshot: snapshot.comments ?? [],
      approval_status: carryStatus,
      // The chain stays attached to the revision that earned it; new
      // revision starts fresh unless we explicitly carry forward.
      approval_chain: carryApprovalFromCurrent ? (previous?.approval_chain ?? []) : [],
      created_by: createdBy,
      created_by_name: createdByName,
      change_summary: changeSummary,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[Revisions] insert failed:', error);
    return null;
  }
  return inserted as RevisionRow;
}

// ─── Approval transitions ─────────────────────────────────────────

interface TransitionInput {
  revisionId: string;
  reviewerId: string;
  reviewerName?: string | null;
  decision: 'approved' | 'rejected';
  notes?: string | null;
  signatureImageUrl?: string | null;
}

/**
 * Move a revision through the approval pipeline. Designer submits draft
 * for review → next reviewer approves or rejects. Approval advances to
 * the next stage; rejection sends it back to draft and triggers a new
 * revision (caller's responsibility — this function only mutates state).
 *
 * Returns the updated row on success, null on validation failure.
 */
export async function transitionApproval(input: TransitionInput): Promise<RevisionRow | null> {
  const {
    revisionId,
    reviewerId,
    reviewerName = null,
    decision,
    notes = null,
    signatureImageUrl = null,
  } = input;

  const { data: rev } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select('*')
    .eq('id', revisionId)
    .maybeSingle();
  if (!rev) return null;

  const status = rev.approval_status as ApprovalStage;
  const chain = (rev.approval_chain as ApprovalChainEntry[]) ?? [];

  // Decide the next stage.
  let nextStage: ApprovalStage;
  if (decision === 'rejected') {
    nextStage = 'rejected';
  } else {
    const idx = STAGE_ORDER.indexOf(status);
    if (idx === -1 || idx >= STAGE_ORDER.length - 1) {
      // Already approved or in an unrecognised state — no-op.
      return rev as RevisionRow;
    }
    nextStage = STAGE_ORDER[idx + 1];
  }

  const entry: ApprovalChainEntry = {
    stage: nextStage,
    reviewer_id: reviewerId,
    reviewer_name: reviewerName,
    decided_at: new Date().toISOString(),
    decision,
    notes,
    signature_image_url: signatureImageUrl,
  };
  const newChain = [...chain, entry];

  // Bump version on landing 'approved' (major bump per nextVersion()).
  const newVersion =
    nextStage === 'approved' ? nextVersion(rev.version as string, true) : (rev.version as string);

  const { data: updated, error } = await supabaseAdmin
    .from('tech_pack_revisions')
    .update({
      approval_status: nextStage,
      approval_chain: newChain,
      version: newVersion,
    })
    .eq('id', revisionId)
    .select('*')
    .single();

  if (error) {
    console.error('[Revisions] transition failed:', error);
    return null;
  }
  return updated as RevisionRow;
}

/**
 * Submit the current draft for review. Same as transitionApproval but
 * permission-checked at the caller side: only the SKU owner /
 * `edit_design` seats can submit.
 */
export async function submitForReview(revisionId: string, submitterId: string, submitterName?: string | null): Promise<RevisionRow | null> {
  const { data: rev } = await supabaseAdmin
    .from('tech_pack_revisions')
    .select('*')
    .eq('id', revisionId)
    .maybeSingle();
  if (!rev) return null;
  if (rev.approval_status !== 'draft') return rev as RevisionRow;

  const entry: ApprovalChainEntry = {
    stage: 'design_review',
    reviewer_id: submitterId,
    reviewer_name: submitterName ?? null,
    decided_at: new Date().toISOString(),
    decision: 'approved',
    notes: 'Submitted for review',
  };
  const chain = [...((rev.approval_chain as ApprovalChainEntry[]) ?? []), entry];

  const { data: updated, error } = await supabaseAdmin
    .from('tech_pack_revisions')
    .update({ approval_status: 'design_review', approval_chain: chain })
    .eq('id', revisionId)
    .select('*')
    .single();
  if (error) {
    console.error('[Revisions] submit failed:', error);
    return null;
  }
  return updated as RevisionRow;
}

// ─── Diff ─────────────────────────────────────────────────────────

export interface SectionDiff {
  section: keyof TechPackSnapshot | 'cost_breakdown';
  changed: boolean;
  /** Field-level paths that differ. Best-effort, leaf-keys only. */
  changedPaths: string[];
}

const SECTION_KEYS: Array<keyof TechPackSnapshot> = [
  'header',
  'drawings',
  'measurements',
  'bom',
  'materials',
  'grading',
  'factory_notes',
  'construction_details',
  'cost_breakdown',
  'comments',
];

const SECTION_TO_COLUMN: Record<keyof TechPackSnapshot, keyof RevisionRow> = {
  header: 'header_snapshot',
  drawings: 'drawings_snapshot',
  measurements: 'measurements_snapshot',
  bom: 'bom_snapshot',
  materials: 'materials_snapshot',
  grading: 'grading_snapshot',
  factory_notes: 'factory_notes_snapshot',
  construction_details: 'construction_details_snapshot',
  cost_breakdown: 'cost_breakdown_snapshot',
  comments: 'comments_snapshot',
};

function flattenPaths(obj: unknown, prefix = ''): Record<string, unknown> {
  if (obj == null || typeof obj !== 'object') {
    return { [prefix || '$']: obj };
  }
  if (Array.isArray(obj)) {
    return obj.reduce<Record<string, unknown>>((acc, val, idx) => {
      Object.assign(acc, flattenPaths(val, `${prefix}[${idx}]`));
      return acc;
    }, {});
  }
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    Object.assign(acc, flattenPaths(v, path));
    return acc;
  }, {});
}

/**
 * Compute a section-level diff between two revisions. Returns one entry
 * per section with `changed: boolean` and a list of leaf paths that
 * differ. Used by the RevisionCompare UI to highlight what moved.
 */
export function diffRevisions(a: RevisionRow, b: RevisionRow): SectionDiff[] {
  return SECTION_KEYS.map((section) => {
    const colA = SECTION_TO_COLUMN[section];
    const colB = SECTION_TO_COLUMN[section];
    const valA = a[colA] as unknown;
    const valB = b[colB] as unknown;
    const aJson = JSON.stringify(valA ?? {});
    const bJson = JSON.stringify(valB ?? {});
    if (aJson === bJson) return { section, changed: false, changedPaths: [] };

    const flatA = flattenPaths(valA ?? {});
    const flatB = flattenPaths(valB ?? {});
    const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
    const changedPaths: string[] = [];
    allKeys.forEach((k) => {
      const av = flatA[k];
      const bv = flatB[k];
      if (JSON.stringify(av) !== JSON.stringify(bv)) changedPaths.push(k);
    });
    return { section, changed: true, changedPaths };
  });
}

// ─── Snapshot building ────────────────────────────────────────────

/**
 * Read the entire current tech pack state (data + comments + cost) and
 * shape it into the snapshot used by `recordRevision`. Centralises the
 * "what does a revision contain" question so the PATCH handler doesn't
 * have to know.
 */
export async function buildSnapshot(skuId: string): Promise<TechPackSnapshot> {
  const [{ data: row }, { data: comments }, { data: sku }] = await Promise.all([
    supabaseAdmin
      .from('tech_pack_data')
      .select('header, drawings, measurements, bom, grading, factory_notes, construction_details')
      .eq('sku_id', skuId)
      .maybeSingle(),
    supabaseAdmin
      .from('tech_pack_comments')
      .select('id, block, body, author_id, author_name, created_at')
      .eq('sku_id', skuId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('collection_skus')
      .select('cost_breakdown, material_zones')
      .eq('id', skuId)
      .maybeSingle(),
  ]);

  return {
    header: (row?.header ?? {}) as Record<string, unknown>,
    drawings: (row?.drawings ?? {}) as Record<string, unknown>,
    measurements: (row?.measurements ?? {}) as Record<string, unknown>,
    bom: (row?.bom ?? {}) as Record<string, unknown>,
    materials: (sku?.material_zones ?? {}) as Record<string, unknown>,
    grading: (row?.grading ?? {}) as Record<string, unknown>,
    factory_notes: (row?.factory_notes ?? {}) as Record<string, unknown>,
    construction_details: (row?.construction_details ?? {}) as Record<string, unknown>,
    cost_breakdown: (sku?.cost_breakdown ?? {}) as Record<string, unknown>,
    comments: comments ?? [],
  };
}
