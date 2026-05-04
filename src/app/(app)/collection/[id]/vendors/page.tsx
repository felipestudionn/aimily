'use client';

/**
 * Phase 5/7 — Vendor invitations management.
 *
 * Lists token-link invitations for the collection's factories.
 * Create new + revoke + copy share link.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Plus, X, Trash2, Copy, Check, Globe } from 'lucide-react';

interface Invitation {
  id: string;
  vendor_email: string;
  vendor_name: string | null;
  sku_ids: string[];
  permissions: Record<string, boolean>;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
}

interface Sku {
  id: string;
  name: string;
}

export default function VendorsPage() {
  const params = useParams<{ id: string }>();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showToken, setShowToken] = useState<{ token: string; email: string } | null>(null);

  async function loadAll() {
    setLoading(true);
    const [invRes, skuRes] = await Promise.all([
      fetch(`/api/vendor-invitations?planId=${params.id}`).then((r) => r.json() as Promise<{ invitations: Invitation[] }>),
      fetch(`/api/skus?planId=${params.id}`).then((r) => r.json() as Promise<Sku[]>),
    ]);
    setInvitations(invRes.invitations ?? []);
    setSkus(Array.isArray(skuRes) ? skuRes : []);
    setLoading(false);
  }
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function revoke(id: string) {
    if (!window.confirm('Revoke this invitation? The vendor will lose access immediately.')) return;
    await fetch(`/api/vendor-invitations/${id}`, { method: 'DELETE' });
    loadAll();
  }

  return (
    <div className="min-h-screen bg-shade">
      <header className="bg-white border-b border-carbon/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Collection</p>
            <h1 className="text-[28px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">Vendor portal access</h1>
            <p className="text-[12px] text-carbon/55 mt-1">Token links you've shared with factories. Revoke anytime — no account needed on their side.</p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90"
          >
            <Plus className="h-4 w-4" /> Invite vendor
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-carbon/40" />}

        {!loading && invitations.length === 0 && (
          <div className="text-center py-20 text-carbon/55 text-[14px]">
            No vendors invited yet. Create a token link and email it to your factory.
          </div>
        )}

        <ul className="divide-y divide-carbon/[0.05] bg-white rounded-[14px] border border-carbon/[0.06]">
          {invitations.map((inv) => {
            const isRevoked = !!inv.revoked_at;
            const isExpired = new Date(inv.expires_at).getTime() < Date.now();
            const status = isRevoked ? 'revoked' : isExpired ? 'expired' : 'active';
            return (
              <li key={inv.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    status === 'active' ? 'bg-moss' : status === 'expired' ? 'bg-citronella' : 'bg-red-500'
                  }`}
                />
                <div className="flex-1 min-w-[180px]">
                  <p className="text-[14px] font-semibold text-carbon">{inv.vendor_name ?? inv.vendor_email}</p>
                  <p className="text-[11px] text-carbon/55">
                    {inv.vendor_email} · {inv.sku_ids.length === 0 ? 'all SKUs' : `${inv.sku_ids.length} SKUs`}
                  </p>
                </div>
                <div className="text-right text-[11px] text-carbon/55">
                  <p>Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  <p>{inv.use_count} uses</p>
                </div>
                {!isRevoked && !isExpired && (
                  <button
                    type="button"
                    onClick={() => revoke(inv.id)}
                    className="p-2 rounded-full text-carbon/40 hover:bg-red-50 hover:text-red-600"
                    aria-label="Revoke"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </main>

      {creating && (
        <CreateInvitation
          collectionPlanId={params.id}
          skus={skus}
          onClose={() => setCreating(false)}
          onCreated={(token, email) => {
            setCreating(false);
            setShowToken({ token, email });
            loadAll();
          }}
        />
      )}

      {showToken && (
        <TokenReveal token={showToken.token} email={showToken.email} onClose={() => setShowToken(null)} />
      )}
    </div>
  );
}

function CreateInvitation({
  collectionPlanId,
  skus,
  onClose,
  onCreated,
}: {
  collectionPlanId: string;
  skus: Sku[];
  onClose: () => void;
  onCreated: (token: string, email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [skuIds, setSkuIds] = useState<string[]>([]);
  const [ttl, setTtl] = useState('30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) {
      setError('Vendor email required');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/vendor-invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_plan_id: collectionPlanId,
        vendor_email: email.trim(),
        vendor_name: name.trim() || undefined,
        sku_ids: skuIds,
        ttl_days: Number(ttl) || 30,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Could not create');
      return;
    }
    const j = (await res.json()) as { token: string };
    onCreated(j.token, email.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/30 backdrop-blur-[2px] px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-shade rounded-[16px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-carbon/[0.06]">
          <h2 className="text-[20px] font-semibold text-carbon">Invite vendor</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-[10px] bg-red-50 text-red-700 text-[12px]">{error}</div>}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">Vendor email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="factory@example.com" className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">Vendor name (optional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Calzaturificio Molteni" className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">Access expires in</label>
            <select value={ttl} onChange={(e) => setTtl(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">
              SKUs they can see ({skuIds.length === 0 ? 'all' : skuIds.length})
            </label>
            <div className="max-h-40 overflow-y-auto bg-white border border-carbon/[0.08] rounded-[10px] p-2">
              {skus.length === 0 ? (
                <p className="text-[12px] text-carbon/45 px-2 py-1">No SKUs in this collection.</p>
              ) : skus.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1 text-[12px] cursor-pointer hover:bg-carbon/[0.03] rounded">
                  <input
                    type="checkbox"
                    checked={skuIds.includes(s.id)}
                    onChange={(e) => setSkuIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id))}
                  />
                  {s.name}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-carbon/45 mt-1">Leave empty to grant access to every SKU in the collection.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-carbon/[0.06] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-[12px] font-semibold text-carbon/60 hover:bg-carbon/[0.04]">Cancel</button>
          <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
            Create token link
          </button>
        </div>
      </div>
    </div>
  );
}

function TokenReveal({ token, email, onClose }: { token: string; email: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/vendor/${token}` : `/vendor/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/30 backdrop-blur-[2px] px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-shade rounded-[16px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-carbon/[0.06]">
          <h2 className="text-[20px] font-semibold text-carbon">Token created</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-[13px] text-carbon/65 leading-snug">
            Share this URL with <span className="font-semibold text-carbon">{email}</span>. They can open it in any browser — no login. We've also queued a notification email to that address.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2">
            <span className="text-[12px] text-carbon/65 truncate flex-1">{url}</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon text-white text-[11px] font-semibold"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-carbon/45">
            Save this URL — we don't show it again. You can revoke access anytime from the vendor list.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-carbon/[0.06] flex items-center justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-[12px] font-semibold bg-carbon text-white">Done</button>
        </div>
      </div>
    </div>
  );
}
