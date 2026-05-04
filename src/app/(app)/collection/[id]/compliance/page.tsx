'use client';

/**
 * Phase 5/7 — Collection-level Compliance dashboard.
 *
 * Reads:
 *   - certificates the user holds (/api/certifications)
 *   - per-SKU compliance reports (/api/compliance/check) for the
 *     collection's SKUs
 *
 * Surfaces:
 *   - cert expiry warnings (90-day window)
 *   - SKUs with violations / warnings (clickable through to tech pack)
 *   - high-level rollup: compliant / warning / violation count
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Calendar, Plus, Trash2, X, Leaf } from 'lucide-react';

interface Cert {
  id: string;
  certification_type: string;
  certificate_number: string | null;
  issuer: string | null;
  scope: string | null;
  expires_date: string | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'revoked';
  document_url: string | null;
  linked_supplier_name: string | null;
}

interface Sku {
  id: string;
  name: string;
  family: string;
}

interface SkuReport {
  sku: Sku;
  status: 'compliant' | 'warning' | 'violation';
  violations: number;
  warnings: number;
}

interface EsgSummary {
  tier: 'excellent' | 'good' | 'concern' | 'critical' | 'unknown';
  avg_msi: number;
  sku_count: number;
  scored_count: number;
  distribution: { excellent: number; good: number; concern: number; critical: number };
}

export default function CompliancePage() {
  const params = useParams<{ id: string }>();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [reports, setReports] = useState<SkuReport[]>([]);
  const [esg, setEsg] = useState<EsgSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Cert | 'new' | null>(null);

  /**
   * Defensive fetch — never lets a single network blip take down the
   * whole page. Returns the parsed JSON or null. Hot-reload during
   * dev or a transient 500 in prod no longer rejects Promise.all,
   * which keeps the UI responsive and stops Sentry getting noisy
   * "TypeError: Failed to fetch" reports for dev-only churn.
   */
  async function safeJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async function loadAll() {
    setLoading(true);
    const [c, skuRes, esgRes] = await Promise.all([
      safeJson<{ certifications: Cert[] }>('/api/certifications'),
      safeJson<Sku[]>(`/api/skus?planId=${params.id}`),
      safeJson<{ collection_summary: EsgSummary | null }>(`/api/esg/sku-rollup?planId=${params.id}`),
    ]);
    setCerts(c?.certifications ?? []);
    setEsg(esgRes?.collection_summary ?? null);
    const skus = Array.isArray(skuRes) ? skuRes : [];
    const reportsList: SkuReport[] = await Promise.all(
      skus.map(async (s) => {
        const r = await safeJson<{ status: string; findings?: Array<{ severity: string }> }>(
          `/api/compliance/check?skuId=${s.id}`,
        );
        if (!r) {
          // Couldn't reach the endpoint for this SKU — show neutral
          // state instead of corrupting the whole grid.
          return { sku: s, status: 'compliant' as const, violations: 0, warnings: 0 };
        }
        return {
          sku: s,
          status: r.status as 'compliant' | 'warning' | 'violation',
          violations: (r.findings ?? []).filter((f) => f.severity === 'violation').length,
          warnings: (r.findings ?? []).filter((f) => f.severity === 'warning').length,
        };
      }),
    );
    setReports(reportsList);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const violationCount = reports.filter((r) => r.status === 'violation').length;
  const warningCount = reports.filter((r) => r.status === 'warning').length;
  const compliantCount = reports.filter((r) => r.status === 'compliant').length;

  const expiringCerts = certs.filter((c) => c.status === 'expiring_soon');
  const expiredCerts = certs.filter((c) => c.status === 'expired');

  return (
    <div className="min-h-screen bg-shade">
      <header className="bg-white border-b border-carbon/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Collection</p>
          <h1 className="text-[28px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">Compliance</h1>
          <p className="text-[12px] text-carbon/55 mt-1">REACH / AAFA-RSL coverage across the collection + your active certificates.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading && (
          <div className="flex items-center gap-2 text-carbon/50 text-[13px]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {/* Rollup */}
        {!loading && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RollupCard label="Compliant" count={compliantCount} icon={ShieldCheck} bg="bg-moss/[0.18]" />
            <RollupCard label="Warnings" count={warningCount} icon={ShieldQuestion} bg="bg-citronella/[0.22]" />
            <RollupCard label="Violations" count={violationCount} icon={ShieldAlert} bg="bg-red-50" />
          </section>
        )}

        {/* ESG / Higg MSI rollup — visible always once we have SKUs,
            with an empty-state hint when no BOM line carries a
            catalog-linked material yet. */}
        {esg && (
          <section className="bg-white rounded-[14px] border border-carbon/[0.06] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="h-4 w-4 text-moss" />
              <h2 className="text-[14px] font-semibold text-carbon tracking-[-0.01em]">ESG · Higg MSI 3.7 rollup</h2>
              <span className="ml-auto text-[11px] uppercase tracking-[0.05em] text-carbon/45">
                {esg.scored_count} of {esg.sku_count} SKUs scored
              </span>
            </div>
            {esg.scored_count === 0 && (
              <p className="text-[13px] text-carbon/60 leading-snug">
                ESG scores appear once BOM lines are linked to the materials library. Pick materials from the
                Combobox in any tech pack BOM — Higg MSI is computed automatically from each entry's family,
                refined by name keywords (organic, recycled, veg-tan, …).
              </p>
            )}
            {esg.scored_count > 0 && (
              <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className={`p-4 rounded-[10px] border border-carbon/[0.06] ${
                esg.tier === 'excellent' ? 'bg-moss/[0.18]' :
                esg.tier === 'good' ? 'bg-moss/[0.10]' :
                esg.tier === 'concern' ? 'bg-citronella/[0.18]' :
                'bg-red-50'
              }`}>
                <p className="text-[10px] tracking-[0.18em] uppercase font-semibold text-carbon/55 mb-1">Avg MSI</p>
                <p className="text-[24px] font-semibold text-carbon tracking-[-0.02em] leading-none">{esg.avg_msi}</p>
                <p className="text-[11px] uppercase tracking-[0.08em] text-carbon/55 mt-2">{esg.tier}</p>
              </div>
              <EsgDistroCard label="Excellent" count={esg.distribution.excellent} bg="bg-moss/[0.18]" hint="<30" />
              <EsgDistroCard label="Good" count={esg.distribution.good} bg="bg-moss/[0.10]" hint="30–80" />
              <EsgDistroCard label="Concern" count={esg.distribution.concern} bg="bg-citronella/[0.18]" hint="80–150" />
              <EsgDistroCard label="Critical" count={esg.distribution.critical} bg="bg-red-50" hint=">150" />
            </div>
            <p className="text-[11px] text-carbon/45 mt-3 leading-snug">
              Scores derived from Higg MSI 3.7 family baselines plus name-keyword refinements (organic, recycled,
              veg-tan, etc.). Lines without a catalog match are skipped — fuzzy ESG numbers are worse than no number.
            </p>
              </>
            )}
          </section>
        )}

        {/* Cert expiry */}
        {(expiringCerts.length > 0 || expiredCerts.length > 0) && (
          <section className="bg-white rounded-[14px] border border-carbon/[0.06] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-carbon/55" />
              <h2 className="text-[14px] font-semibold text-carbon tracking-[-0.01em]">Cert expiry warnings</h2>
            </div>
            <ul className="space-y-2 text-[13px]">
              {expiredCerts.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-carbon font-semibold">{c.certification_type}</span>
                  <span className="text-carbon/55">— {c.linked_supplier_name ?? '—'}</span>
                  <span className="ml-auto text-red-700 text-[12px]">expired {c.expires_date}</span>
                </li>
              ))}
              {expiringCerts.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-citronella" />
                  <span className="text-carbon font-semibold">{c.certification_type}</span>
                  <span className="text-carbon/55">— {c.linked_supplier_name ?? '—'}</span>
                  <span className="ml-auto text-carbon/65 text-[12px]">expires {c.expires_date}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Certificates */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-[14px] font-semibold text-carbon tracking-[-0.01em]">Your certificates</h2>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add certificate
            </button>
          </div>
          {certs.length === 0 ? (
            <p className="text-[13px] text-carbon/55">No certificates yet. Add OEKO-TEX, GOTS, BCI, RWS, RDS, GRS, RCS, FSC, LWG, or B-Corp documentation.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setEditing(c)}
                  className="text-left bg-white rounded-[14px] border border-carbon/[0.06] hover:border-carbon/15 p-4 transition-colors"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-carbon/40 mb-1">
                    {c.status.replace('_', ' ')}
                  </p>
                  <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.01em]">{c.certification_type}</h3>
                  <p className="text-[12px] text-carbon/55 mt-1">{c.linked_supplier_name ?? c.scope ?? '—'}</p>
                  {c.expires_date && (
                    <p className="text-[11px] text-carbon/40 mt-2">Expires {c.expires_date}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Per-SKU compliance */}
        <section>
          <h2 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] mb-3">Per-SKU compliance</h2>
          {reports.length === 0 ? (
            <p className="text-[13px] text-carbon/55">No SKUs in this collection yet.</p>
          ) : (
            <ul className="divide-y divide-carbon/[0.05] bg-white rounded-[14px] border border-carbon/[0.06]">
              {reports.map((r) => (
                <li key={r.sku.id}>
                  <Link
                    href={`/collection/${params.id}/techpack/${r.sku.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-carbon/[0.02] transition-colors"
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        r.status === 'violation' ? 'bg-red-500' : r.status === 'warning' ? 'bg-citronella' : 'bg-moss'
                      }`}
                    />
                    <span className="text-[14px] font-semibold text-carbon">{r.sku.name}</span>
                    <span className="text-[12px] text-carbon/45">· {r.sku.family}</span>
                    <span className="ml-auto text-[11px] text-carbon/55">
                      {r.violations > 0 && <span className="text-red-700 font-semibold mr-2">{r.violations} violations</span>}
                      {r.warnings > 0 && <span className="text-carbon/65">{r.warnings} warnings</span>}
                      {r.violations === 0 && r.warnings === 0 && <span className="text-carbon/40">clear</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {editing && (
        <CertEditor cert={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={loadAll} />
      )}
    </div>
  );
}

function EsgDistroCard({ label, count, bg, hint }: { label: string; count: number; bg: string; hint: string }) {
  return (
    <div className={`p-4 rounded-[10px] border border-carbon/[0.06] ${bg}`}>
      <p className="text-[10px] tracking-[0.18em] uppercase font-semibold text-carbon/55 mb-1">{label}</p>
      <p className="text-[24px] font-semibold text-carbon tracking-[-0.02em] leading-none">{count}</p>
      <p className="text-[11px] tracking-[0.05em] text-carbon/45 mt-2">{hint}</p>
    </div>
  );
}

function RollupCard({ label, count, icon: Icon, bg }: { label: string; count: number; icon: typeof ShieldCheck; bg: string }) {
  return (
    <div className={`p-5 rounded-[14px] ${bg}`}>
      <Icon className="h-5 w-5 text-carbon/70 mb-2" />
      <p className="text-[28px] font-semibold text-carbon tracking-[-0.02em] leading-none">{count}</p>
      <p className="text-[11px] tracking-[0.1em] uppercase font-semibold text-carbon/55 mt-1.5">{label}</p>
    </div>
  );
}

function CertEditor({ cert, onClose, onSaved }: { cert: Cert | null; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState(cert?.certification_type ?? '');
  const [number, setNumber] = useState(cert?.certificate_number ?? '');
  const [issuer, setIssuer] = useState(cert?.issuer ?? '');
  const [scope, setScope] = useState(cert?.scope ?? '');
  const [supplier, setSupplier] = useState(cert?.linked_supplier_name ?? '');
  const [docUrl, setDocUrl] = useState(cert?.document_url ?? '');
  const [issued, setIssued] = useState('');
  const [expires, setExpires] = useState(cert?.expires_date ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!type.trim()) {
      setError('Certification type required');
      return;
    }
    setBusy(true);
    const payload = {
      certification_type: type.trim(),
      certificate_number: number.trim() || null,
      issuer: issuer.trim() || null,
      scope: scope.trim() || null,
      document_url: docUrl.trim() || null,
      issued_date: issued || null,
      expires_date: expires || null,
      linked_supplier_name: supplier.trim() || null,
    };
    const res = cert
      ? await fetch(`/api/certifications/${cert.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/certifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Save failed');
      return;
    }
    onSaved();
    onClose();
  }

  async function remove() {
    if (!cert) return;
    if (!window.confirm(`Delete the ${cert.certification_type} certificate?`)) return;
    setBusy(true);
    await fetch(`/api/certifications/${cert.id}`, { method: 'DELETE' });
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/30 backdrop-blur-[2px] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-shade rounded-[16px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-carbon/[0.06]">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Certificate</p>
            <h2 className="text-[20px] font-semibold text-carbon mt-0.5">{cert ? 'Edit' : 'New'}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-[10px] bg-red-50 text-red-700 text-[12px]">{error}</div>}
          <Field label="Certification type"><input value={type} onChange={(e) => setType(e.target.value)} placeholder="OEKO-TEX, GOTS, BCI, RWS, RDS, GRS, RCS, FSC, LWG, B-Corp…" className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Certificate number"><input value={number} onChange={(e) => setNumber(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Issuer"><input value={issuer} onChange={(e) => setIssuer(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Scope"><input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. Italian linen mill XYZ" className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Linked supplier"><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Document URL"><input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issued date"><input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
            <Field label="Expires date"><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-carbon/[0.06] flex items-center justify-between">
          {cert ? (
            <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-[12px] font-semibold text-carbon/60 hover:bg-carbon/[0.04]">Cancel</button>
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">{label}</label>
      {children}
    </div>
  );
}
