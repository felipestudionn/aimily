'use client';

/**
 * Phase 3 — Tech Pack approval pill.
 *
 * Replaces the hardcoded "v1.0" chip in TechPackSheet's header. Reads
 * the current revision (the row with is_current=true) and renders:
 *
 *   draft               →  "v1.3 · Draft"           (carbon/[0.04])
 *   design_review       →  "v1.3 · In Design Review" (citronella/15)
 *   merch_review        →  "v1.3 · In Merch Review"
 *   production_review   →  "v1.3 · In Prod Review"
 *   approved            →  "v2.0 · Approved"        (moss/12)
 *   rejected            →  "v1.3 · Rejected"        (red/12)
 *
 * Click → opens RevisionHistoryDrawer with the timeline and approval
 * actions (submit, approve, reject) gated on the user's permission.
 */

import { useEffect, useState } from 'react';
import { Check, ChevronRight, Clock, X } from 'lucide-react';
import { RevisionHistoryDrawer } from './RevisionHistoryDrawer';

type ApprovalStage =
  | 'draft'
  | 'design_review'
  | 'merch_review'
  | 'production_review'
  | 'approved'
  | 'rejected'
  | 'archived';

interface CurrentRevision {
  id: string;
  version: string;
  approval_status: ApprovalStage;
}

interface RevisionPillProps {
  skuId: string;
  fallback?: string;
  /** Bump this when the parent saves to force a refetch. */
  refreshKey?: number;
}

const STAGE_LABEL: Record<ApprovalStage, string> = {
  draft: 'Draft',
  design_review: 'In Design Review',
  merch_review: 'In Merch Review',
  production_review: 'In Prod Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

const STAGE_STYLES: Record<ApprovalStage, { bg: string; text: string; icon: typeof Clock }> = {
  draft: { bg: 'bg-carbon/[0.04]', text: 'text-carbon/70', icon: Clock },
  design_review: { bg: 'bg-citronella/[0.18]', text: 'text-carbon/75', icon: Clock },
  merch_review: { bg: 'bg-citronella/[0.18]', text: 'text-carbon/75', icon: Clock },
  production_review: { bg: 'bg-citronella/[0.18]', text: 'text-carbon/75', icon: Clock },
  approved: { bg: 'bg-moss/[0.18]', text: 'text-carbon/80', icon: Check },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', icon: X },
  archived: { bg: 'bg-carbon/[0.04]', text: 'text-carbon/40', icon: Clock },
};

export function RevisionPill({ skuId, fallback = 'v1.0', refreshKey = 0 }: RevisionPillProps) {
  const [current, setCurrent] = useState<CurrentRevision | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/tech-pack/revisions?skuId=${skuId}`);
      if (!res.ok) return;
      const json = (await res.json()) as { revisions: Array<CurrentRevision & { is_current: boolean }> };
      const cur = json.revisions.find((r) => r.is_current) ?? json.revisions[0] ?? null;
      if (!cancelled) setCurrent(cur);
    })();
    return () => {
      cancelled = true;
    };
  }, [skuId, refreshKey]);

  const status: ApprovalStage = current?.approval_status ?? 'draft';
  const version = current?.version ?? fallback;
  const style = STAGE_STYLES[status];
  const Icon = style.icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${style.bg} ${style.text} text-[11px] font-semibold tracking-[0.05em] uppercase transition-colors hover:brightness-95`}
        title="Open revision history"
      >
        <Icon className="h-3 w-3" strokeWidth={2.4} />
        <span>{version}</span>
        <span className="opacity-50">·</span>
        <span className="normal-case tracking-[-0.01em]">{STAGE_LABEL[status]}</span>
        <ChevronRight className="h-3 w-3 opacity-60" strokeWidth={2.4} />
      </button>
      {open && (
        <RevisionHistoryDrawer
          skuId={skuId}
          onClose={() => setOpen(false)}
          onChange={() => {
            // The drawer mutated the current revision — refetch on close.
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
