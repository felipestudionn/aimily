'use client';

/* ═══════════════════════════════════════════════════════════════════
   SeoResearchHub · 4 SEO tools in one editorial hub
   - Keywords: per-collection list with intent + difficulty hints
   - On-page: meta_title/description/OG generator per page (home/PLP/PDP/lookbook/about)
   - Competitors: 5-7 ranking-brand snapshots with gaps for us
   - Audit: scrape published storefront + score (no auth needed once published)

   Lives inside the marketing 04.4 Ecom card as a second sub-section
   below EcomHub.
   ═══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Loader2, Search, FileText, Users, Activity, Check, AlertTriangle } from 'lucide-react';

interface Props {
  collectionPlanId: string;
  storefrontId?: string | null;
}

type Tab = 'keywords' | 'onpage' | 'competitors' | 'audit';

interface Keyword { term: string; intent: string; difficulty_hint: string; rationale: string; }
interface Competitor { name: string; url?: string; estimated_traffic_tier?: string; ranking_keywords_sample?: string[]; content_strengths?: string; gaps_for_us?: string; }
interface Onpage { meta_title: string; meta_description: string; og_title: string; og_description: string; h1: string; image_alt_pattern: string; }
interface AuditCheck { id: string; label: string; pass: boolean; }
interface AuditResult { url: string; score: number; passed: number; total: number; checks: AuditCheck[]; recommendations: string[]; }

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'keywords',    label: 'Keywords',    icon: Search },
  { id: 'onpage',      label: 'On-page',     icon: FileText },
  { id: 'competitors', label: 'Competitors', icon: Users },
  { id: 'audit',       label: 'Audit',       icon: Activity },
];

export function SeoResearchHub({ collectionPlanId, storefrontId }: Props) {
  const [tab, setTab] = useState<Tab>('keywords');

  return (
    <div className="bg-white rounded-[20px] p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <Search className="h-4 w-4 text-carbon/40" strokeWidth={1.75} />
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">SEO Research</p>
        <span className="text-[11px] text-carbon/35">keywords · meta · competitors · audit</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-carbon/[0.06]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium tracking-[-0.01em] transition-colors ${
                active
                  ? 'text-carbon border-b-2 border-carbon -mb-px'
                  : 'text-carbon/45 hover:text-carbon/80 border-b-2 border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'keywords'    && <KeywordsTab    collectionPlanId={collectionPlanId} />}
      {tab === 'onpage'      && <OnpageTab      collectionPlanId={collectionPlanId} />}
      {tab === 'competitors' && <CompetitorsTab collectionPlanId={collectionPlanId} />}
      {tab === 'audit'       && <AuditTab       storefrontId={storefrontId ?? null} />}
    </div>
  );
}

/* ── KEYWORDS ───────────────────────────────────────────────────── */
function KeywordsTab({ collectionPlanId }: { collectionPlanId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/seo-keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setKeywords(data.keywords ?? []);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[12px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-colors disabled:opacity-50">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {keywords.length > 0 ? 'Regenerate' : 'Generate keywords'}
        </button>
        {error && <span className="text-[12px] text-[#A0463C]">{error}</span>}
      </div>
      {keywords.length > 0 && (
        <div className="space-y-2">
          {keywords.map((k, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-[12px] bg-carbon/[0.02] hover:bg-carbon/[0.04] transition-colors">
              <span className={`text-[10px] uppercase tracking-[0.15em] font-semibold px-2 py-0.5 rounded-full ${
                k.intent === 'transactional' ? 'bg-[#5A7847]/10 text-[#5A7847]' :
                k.intent === 'informational' ? 'bg-[#3B6BC7]/10 text-[#3B6BC7]' :
                'bg-[#A8553B]/10 text-[#A8553B]'
              }`}>{k.intent}</span>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-carbon">{k.term}</p>
                <p className="text-[11.5px] text-carbon/55 mt-0.5">{k.rationale}</p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-carbon/40">{k.difficulty_hint}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ON-PAGE ────────────────────────────────────────────────────── */
function OnpageTab({ collectionPlanId }: { collectionPlanId: string }) {
  const [page, setPage] = useState<'home' | 'plp' | 'pdp' | 'lookbook' | 'about'>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Onpage | null>(null);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/seo-onpage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId, page }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setResult(data);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={page} onChange={(e) => setPage(e.target.value as typeof page)}
          className="text-[12px] text-carbon bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] px-3 py-2 focus:outline-none focus:border-carbon/25">
          <option value="home">Home</option>
          <option value="plp">Shop (PLP)</option>
          <option value="pdp">Product (PDP)</option>
          <option value="lookbook">Lookbook</option>
          <option value="about">About</option>
        </select>
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 disabled:opacity-50">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {result ? 'Regenerate' : 'Generate meta'}
        </button>
        {error && <span className="text-[12px] text-[#A0463C]">{error}</span>}
      </div>
      {result && (
        <div className="space-y-3">
          {([
            ['Meta title',       result.meta_title,       60],
            ['Meta description', result.meta_description, 160],
            ['OG title',         result.og_title,         70],
            ['OG description',   result.og_description,   200],
            ['H1 heading',       result.h1,               60],
            ['Image alt pattern', result.image_alt_pattern, 100],
          ] as const).map(([label, value, ideal]) => (
            <div key={label} className="px-4 py-3 rounded-[12px] bg-carbon/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-[0.15em] text-carbon/45 font-semibold">{label}</p>
                <span className={`text-[10px] tabular-nums ${value.length > ideal ? 'text-[#A0463C]' : 'text-carbon/40'}`}>
                  {value.length}/{ideal}
                </span>
              </div>
              <p className="text-[13px] text-carbon">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── COMPETITORS ────────────────────────────────────────────────── */
function CompetitorsTab({ collectionPlanId }: { collectionPlanId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/seo-competitors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setCompetitors(data.competitors ?? []);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 disabled:opacity-50">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {competitors.length > 0 ? 'Refresh competitors' : 'Find competitors'}
        </button>
        {error && <span className="text-[12px] text-[#A0463C]">{error}</span>}
      </div>
      {competitors.length > 0 && (
        <div className="space-y-3">
          {competitors.map((c, i) => (
            <div key={i} className="px-4 py-4 rounded-[14px] bg-carbon/[0.02]">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-[14px] font-semibold text-carbon">{c.name}</p>
                  {c.url && <a href={c.url.startsWith('http') ? c.url : `https://${c.url}`} target="_blank" rel="noreferrer" className="text-[11px] text-carbon/55 underline hover:text-carbon">{c.url}</a>}
                </div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-carbon/40">{c.estimated_traffic_tier}</span>
              </div>
              {c.ranking_keywords_sample && c.ranking_keywords_sample.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {c.ranking_keywords_sample.map((k, j) => (
                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-carbon/[0.05] text-carbon/65">{k}</span>
                  ))}
                </div>
              )}
              {c.content_strengths && <p className="text-[11.5px] text-carbon/55 mt-1"><strong>Strengths:</strong> {c.content_strengths}</p>}
              {c.gaps_for_us && <p className="text-[11.5px] text-[#5A7847] mt-1"><strong>Opportunity:</strong> {c.gaps_for_us}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── AUDIT ──────────────────────────────────────────────────────── */
function AuditTab({ storefrontId }: { storefrontId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  if (!storefrontId) {
    return (
      <p className="text-[13px] text-carbon/55 italic px-4 py-6 text-center">
        Publish your storefront first — the audit fetches your live site to score it.
      </p>
    );
  }

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/seo-audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setResult(data);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={run} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 disabled:opacity-50">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {result ? 'Re-run audit' : 'Run SEO audit'}
        </button>
        {error && <span className="text-[12px] text-[#A0463C]">{error}</span>}
      </div>
      {result && (
        <div>
          <div className="flex items-baseline gap-3 mb-5 px-4 py-4 rounded-[14px] bg-carbon/[0.02]">
            <span className="text-[44px] font-light tracking-[-0.03em] text-carbon">{result.score}</span>
            <span className="text-[11px] text-carbon/55 font-medium uppercase tracking-[0.12em]">/100</span>
            <span className="ml-auto text-[12px] text-carbon/55">{result.passed} of {result.total} checks passed</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.checks.map((c) => (
              <div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-[10px] ${
                c.pass ? 'bg-[#C5CAA8]/15 text-carbon' : 'bg-[#A0463C]/[0.06] text-carbon'
              }`}>
                {c.pass ? <Check className="h-3.5 w-3.5 text-[#5A7847]" /> : <AlertTriangle className="h-3.5 w-3.5 text-[#A0463C]" />}
                <span className="text-[12px]">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
