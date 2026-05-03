'use client';

/**
 * Phase 3 — Revision History Drawer.
 *
 * Right-side drawer that lists every saved revision (newest first), the
 * approval chain entries, and the actions available for the current
 * revision (Submit / Approve / Reject) gated to the user's permission.
 *
 * Selecting two revisions enables side-by-side diff via the
 * /api/tech-pack/revisions/diff endpoint — server returns the changed
 * sections + leaf paths, this component renders a compact list (no
 * full-snapshot rendering yet — Phase 3 focus is "what changed", the
 * full visual diff lands in Phase 3b).
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, FileDiff, Loader2, Send, X } from 'lucide-react';

type ApprovalStage =
  | 'draft'
  | 'design_review'
  | 'merch_review'
  | 'production_review'
  | 'approved'
  | 'rejected'
  | 'archived';

interface ApprovalChainEntry {
  stage: ApprovalStage;
  reviewer_id: string;
  reviewer_name?: string | null;
  decided_at: string;
  decision: 'approved' | 'rejected';
  notes?: string | null;
}

interface RevisionListItem {
  id: string;
  version: string;
  is_current: boolean;
  approval_status: ApprovalStage;
  approval_chain: ApprovalChainEntry[];
  change_summary: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface SectionDiff {
  section: string;
  changed: boolean;
  changedPaths: string[];
}

interface DiffResponse {
  from: { id: string; version: string; created_at: string };
  to: { id: string; version: string; created_at: string };
  sections: SectionDiff[];
}

interface Props {
  skuId: string;
  onClose: () => void;
  onChange?: () => void;
}

const STATUS_LABEL: Record<ApprovalStage, string> = {
  draft: 'Draft',
  design_review: 'Design Review',
  merch_review: 'Merch Review',
  production_review: 'Production Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

const STATUS_DOT: Record<ApprovalStage, string> = {
  draft: 'bg-carbon/30',
  design_review: 'bg-citronella',
  merch_review: 'bg-citronella',
  production_review: 'bg-citronella',
  approved: 'bg-moss',
  rejected: 'bg-red-500',
  archived: 'bg-carbon/20',
};

export function RevisionHistoryDrawer({ skuId, onClose, onChange }: Props) {
  const [revisions, setRevisions] = useState<RevisionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [diff, setDiff] = useState<DiffResponse | null>(null);

  const current = useMemo(() => revisions.find((r) => r.is_current) ?? null, [revisions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/tech-pack/revisions?skuId=${skuId}`);
      if (cancelled) return;
      if (!res.ok) {
        setError('Could not load revisions');
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { revisions: RevisionListItem[] };
      setRevisions(json.revisions);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [skuId]);

  async function reload() {
    const res = await fetch(`/api/tech-pack/revisions?skuId=${skuId}`);
    if (res.ok) {
      const json = (await res.json()) as { revisions: RevisionListItem[] };
      setRevisions(json.revisions);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length === 2) return [prev[1], id];
      return [...prev, id];
    });
    setDiff(null);
  }

  async function runDiff() {
    if (selected.length !== 2) return;
    setBusy('diff');
    const [from, to] = selected;
    const res = await fetch(`/api/tech-pack/revisions/diff?from=${from}&to=${to}`);
    setBusy(null);
    if (!res.ok) {
      setError('Could not compute diff');
      return;
    }
    setDiff((await res.json()) as DiffResponse);
  }

  async function submitForReview() {
    if (!current) return;
    setBusy('submit');
    const res = await fetch(`/api/tech-pack/revisions/${current.id}/submit`, { method: 'POST' });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Could not submit');
      return;
    }
    await reload();
    onChange?.();
  }

  async function decide(decision: 'approved' | 'rejected') {
    if (!current) return;
    const notes =
      decision === 'rejected'
        ? window.prompt('Reason for rejection (will be visible to designer):') ?? ''
        : window.prompt('Optional approval notes:') ?? '';
    setBusy(decision);
    const res = await fetch(`/api/tech-pack/revisions/${current.id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Could not record decision');
      return;
    }
    await reload();
    onChange?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-carbon/30 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:w-[480px] h-full bg-shade overflow-y-auto shadow-[-12px_0_40px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-shade/95 backdrop-blur px-6 pt-5 pb-4 border-b border-carbon/[0.06] flex items-start justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Revision history</p>
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">
              {current?.version ?? '—'}{' '}
              <span className="text-carbon/40 font-medium">· {current ? STATUS_LABEL[current.approval_status] : '—'}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Action row — gated on the current revision's stage */}
        {current && (
          <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2">
            {current.approval_status === 'draft' && (
              <button
                type="button"
                onClick={submitForReview}
                disabled={busy === 'submit'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-60"
              >
                {busy === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit for review
              </button>
            )}
            {(current.approval_status === 'design_review' ||
              current.approval_status === 'merch_review' ||
              current.approval_status === 'production_review') && (
              <>
                <button
                  type="button"
                  onClick={() => decide('approved')}
                  disabled={busy === 'approved'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-moss text-white text-[12px] font-semibold disabled:opacity-60"
                >
                  {busy === 'approved' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide('rejected')}
                  disabled={busy === 'rejected'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-carbon/[0.15] text-carbon/80 text-[12px] font-semibold disabled:opacity-60"
                >
                  {busy === 'rejected' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Reject
                </button>
              </>
            )}
            {current.approval_status === 'approved' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-moss/[0.18] text-[12px] font-semibold text-carbon/80">
                <Check className="h-3.5 w-3.5" />
                Production-ready
              </span>
            )}
            {selected.length === 2 && (
              <button
                type="button"
                onClick={runDiff}
                disabled={busy === 'diff'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon/[0.04] text-carbon/80 text-[12px] font-semibold disabled:opacity-60 ml-auto"
              >
                {busy === 'diff' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDiff className="h-3.5 w-3.5" />}
                Compare {selected.length}/2
              </button>
            )}
          </div>
        )}

        {error && <div className="mx-6 mt-2 px-3 py-2 rounded-[10px] bg-red-50 text-red-700 text-[12px]">{error}</div>}

        {/* Diff panel */}
        {diff && (
          <div className="mx-6 mt-3 p-4 bg-white rounded-[14px] border border-carbon/[0.06]">
            <p className="text-[11px] tracking-[0.18em] uppercase font-semibold text-carbon/45 mb-2">
              Diff · {diff.from.version} → {diff.to.version}
            </p>
            <ul className="space-y-2">
              {diff.sections.map((s) => (
                <li key={s.section} className="text-[13px] leading-snug">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.changed ? 'bg-citronella' : 'bg-carbon/15'}`} />
                  <span className={s.changed ? 'text-carbon font-medium' : 'text-carbon/40'}>{s.section}</span>
                  {s.changed && s.changedPaths.length > 0 && (
                    <span className="block ml-4 mt-1 text-carbon/55 text-[12px] font-mono">
                      {s.changedPaths.slice(0, 6).join(' · ')}
                      {s.changedPaths.length > 6 && ` +${s.changedPaths.length - 6} more`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Revision list */}
        <div className="px-6 py-4 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-carbon/50 text-[13px]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading revisions…
            </div>
          )}
          {!loading && revisions.length === 0 && (
            <p className="text-carbon/45 text-[13px]">No revisions yet. They'll appear here on every save.</p>
          )}
          {!loading &&
            revisions.map((rev) => {
              const isSel = selected.includes(rev.id);
              return (
                <button
                  key={rev.id}
                  type="button"
                  onClick={() => toggleSelect(rev.id)}
                  className={`w-full text-left p-3 rounded-[12px] border transition-colors ${
                    isSel
                      ? 'bg-citronella/[0.10] border-citronella/40'
                      : 'bg-white border-carbon/[0.06] hover:border-carbon/15'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[rev.approval_status]}`} />
                    <span className="text-[14px] font-semibold text-carbon">{rev.version}</span>
                    {rev.is_current && (
                      <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-carbon/55 bg-carbon/[0.04] px-2 py-0.5 rounded-full">
                        current
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-carbon/45">
                      {new Date(rev.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[12px] text-carbon/55 mt-1">
                    {rev.change_summary ?? 'No summary'} ·{' '}
                    <span className="text-carbon/40">{rev.created_by_name ?? 'Unknown'}</span>
                  </p>
                  <p className="text-[11px] tracking-[0.05em] uppercase text-carbon/45 mt-1.5">
                    {STATUS_LABEL[rev.approval_status]}
                  </p>
                  {rev.approval_chain.length > 0 && (
                    <ul className="mt-2 ml-1 space-y-1 border-l border-carbon/[0.08] pl-3">
                      {rev.approval_chain.slice(-3).map((entry, i) => (
                        <li key={i} className="text-[11px] text-carbon/55 leading-snug">
                          <Clock className="inline h-2.5 w-2.5 mr-1 -mt-0.5" />
                          <span className="font-semibold text-carbon/65">{STATUS_LABEL[entry.stage]}</span>{' '}
                          {entry.decision === 'rejected' ? '✗ ' : '✓ '}
                          {entry.reviewer_name ?? 'reviewer'}
                          {entry.notes && <span className="text-carbon/45"> · {entry.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
