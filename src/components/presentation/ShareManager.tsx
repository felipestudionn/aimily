'use client';

/* ═══════════════════════════════════════════════════════════════════
   ShareManager — owner-only list + revoke of active shares.

   Lives inside the Share dropdown on the Presentation top bar.
   GET /api/presentation/share?collectionId=X returns the list;
   DELETE /api/presentation/share?token=X revokes one.

   Each row shows: token suffix · views · last viewed · expiry ·
   Copy + Revoke. Expired rows are dimmed with a chip so the owner
   can prune them; non-expired rows are fully styled.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import { Copy, Check, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ShareRow {
  token: string;
  theme_id: string;
  expires_at: string | null;
  views_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

interface Props {
  collectionId: string;
  /** Bumped externally after a new share is created so the manager
      picks it up without user action. */
  refreshKey?: number;
}

function fmtDate(iso: string | null, never: string): string {
  if (!iso) return never;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return never;
  }
}

export function ShareManager({ collectionId, refreshKey }: Props) {
  const tr = useTranslation().presentation;
  const [shares, setShares] = useState<ShareRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [confirmToken, setConfirmToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/presentation/share?collectionId=${collectionId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setShares((j.shares || []) as ShareRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const revoke = async (token: string) => {
    setRevokingToken(token);
    try {
      await fetch(`/api/presentation/share?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
      setShares(prev => prev?.filter(s => s.token !== token) ?? null);
      setConfirmToken(null);
    } finally {
      setRevokingToken(null);
    }
  };

  const copy = async (token: string) => {
    const url = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 1200);
    } catch { /* no-op */ }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-carbon/50 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> …
      </div>
    );
  }

  if (error) {
    return <div className="text-[12px] text-error py-2">{error}</div>;
  }

  if (!shares || shares.length === 0) {
    return <div className="text-[12px] text-carbon/50 py-2">{tr.managerEmpty}</div>;
  }

  const now = Date.now();

  return (
    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
      {shares.map(s => {
        const expired = s.expires_at && new Date(s.expires_at).getTime() < now;
        const confirming = confirmToken === s.token;
        const revoking = revokingToken === s.token;
        return (
          <div
            key={s.token}
            className={`rounded-[10px] border border-carbon/[0.06] bg-carbon/[0.02] px-3 py-2.5 transition-opacity ${expired ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-mono text-[11px] text-carbon/80 truncate">
                /p/{s.token.slice(0, 10)}…
              </span>
              {expired && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-carbon/[0.06] text-[9px] font-semibold text-carbon/60 tracking-wide uppercase shrink-0">
                  {tr.managerExpired}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px] text-carbon/45">
              <span>
                {s.views_count} {tr.managerViewCount} · {tr.managerLastViewed} {fmtDate(s.last_viewed_at, tr.managerNever)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copy(s.token)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-carbon/[0.05] text-carbon/70 hover:bg-carbon/[0.1] transition-colors"
                  title={tr.managerCopy}
                >
                  {copiedToken === s.token ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={2} />}
                </button>
                {confirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => revoke(s.token)}
                      disabled={revoking}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-60"
                    >
                      {revoking && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />}
                      {tr.managerRevoke}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmToken(null)}
                      className="text-[10px] text-carbon/50 hover:text-carbon/80 px-1"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmToken(s.token)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-carbon/[0.05] text-carbon/60 hover:bg-error/[0.1] hover:text-error transition-colors"
                    title={tr.managerRevoke}
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
