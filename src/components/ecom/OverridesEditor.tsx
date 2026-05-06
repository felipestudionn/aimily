'use client';

/* ═══════════════════════════════════════════════════════════════════
   OverridesEditor · per-page copy edits for the storefront

   Lives inside EcomCard below SEO. Lets the user override the
   AI-generated brand copy with their own text per page (home/about/
   contact). Saves to storefront_overrides via /api/ecom/override and
   invalidates the cache so the live storefront updates instantly.

   MVP scope: home (hero.title, collection.narrative) + about
   (brand.manifesto) + contact (contact.email/instagram/address).
   Per-SKU overrides land in a follow-up sprint if needed.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Check, Pencil } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props { storefrontId: string | null; }

interface OverrideRow { page_id: string; field_overrides: Record<string, string>; }

interface FieldDef {
  pageId: 'home' | 'about' | 'contact';
  path: string;
  label: string;
  hint: string;
  multiline?: boolean;
  maxLength?: number;
}

export function OverridesEditor({ storefrontId }: Props) {
  const t = useTranslation();
  const tOv = t.ecom.overrides;

  const FIELDS = useMemo<FieldDef[]>(() => [
    { pageId: 'home',    path: 'hero.title',           label: tOv.fieldHeroTitleLabel,  hint: tOv.fieldHeroTitleHint,  multiline: true, maxLength: 140 },
    { pageId: 'home',    path: 'collection.narrative', label: tOv.fieldNarrativeLabel,  hint: tOv.fieldNarrativeHint,  multiline: true, maxLength: 600 },
    { pageId: 'about',   path: 'brand.manifesto',      label: tOv.fieldManifestoLabel,  hint: tOv.fieldManifestoHint,  multiline: true, maxLength: 1500 },
    { pageId: 'contact', path: 'contact.email',        label: tOv.fieldEmailLabel,      hint: tOv.fieldEmailHint,      maxLength: 80 },
    { pageId: 'contact', path: 'contact.instagram',    label: tOv.fieldInstagramLabel,  hint: tOv.fieldInstagramHint,  maxLength: 60 },
    { pageId: 'contact', path: 'contact.address',      label: tOv.fieldAddressLabel,    hint: tOv.fieldAddressHint,    multiline: true, maxLength: 200 },
  ], [tOv]);

  const pageLabels: Record<'home' | 'about' | 'contact', string> = {
    home: tOv.pageLabelHome,
    about: tOv.pageLabelAbout,
    contact: tOv.pageLabelContact,
  };

  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!storefrontId) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ecom/override?storefrontId=${storefrontId}`);
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const row of (data.overrides ?? []) as OverrideRow[]) {
          for (const [path, value] of Object.entries(row.field_overrides ?? {})) {
            // Map back to local key by combining pageId + path so we know which input to populate
            const field = FIELDS.find((f) => f.pageId === row.page_id && f.path === path);
            if (field) map[`${field.pageId}|${field.path}`] = value;
          }
        }
        if (!cancelled) {
          setValues(map);
          setInitial(map);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [storefrontId]);

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const save = async () => {
    if (!storefrontId || saving) return;
    setSaving(true); setError(null);
    try {
      // Group by pageId
      const byPage: Record<string, Record<string, string>> = {};
      for (const f of FIELDS) {
        const key = `${f.pageId}|${f.path}`;
        const v = values[key]?.trim();
        if (v) {
          byPage[f.pageId] = byPage[f.pageId] ?? {};
          byPage[f.pageId][f.path] = v;
        }
      }
      // Send one PATCH per page (the endpoint upserts page row)
      const pages = Array.from(new Set(FIELDS.map((f) => f.pageId)));
      for (const pageId of pages) {
        await fetch('/api/ecom/override', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storefrontId, pageId, fieldOverrides: byPage[pageId] ?? {} }),
        });
      }
      setInitial({ ...values });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(tOv.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!storefrontId) return null;

  return (
    <div className="bg-white rounded-[20px] p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-2">
        <Pencil className="h-4 w-4 text-carbon/40" strokeWidth={1.75} />
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">{tOv.title}</p>
        <span className="text-[11px] text-carbon/35">{tOv.subtitle}</span>
      </div>
      <p className="text-[12px] text-carbon/55 mb-6">
        {tOv.description}
      </p>

      {!loaded ? (
        <div className="flex items-center gap-2 text-[12px] text-carbon/45">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {tOv.loading}
        </div>
      ) : (
        <div className="space-y-5">
          {FIELDS.map((f) => {
            const key = `${f.pageId}|${f.path}`;
            const v = values[key] ?? '';
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase tracking-[0.15em] font-semibold text-carbon/55">
                    <span className="text-carbon/35 mr-2">{pageLabels[f.pageId]}</span>{f.label}
                  </label>
                  {f.maxLength && (
                    <span className={`text-[10px] tabular-nums ${v.length > f.maxLength ? 'text-[#A0463C]' : 'text-carbon/40'}`}>
                      {v.length}/{f.maxLength}
                    </span>
                  )}
                </div>
                {f.multiline ? (
                  <textarea
                    value={v}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    placeholder={tOv.placeholder}
                    rows={f.path === 'brand.manifesto' ? 6 : 3}
                    maxLength={f.maxLength}
                    className="w-full text-[13px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] px-4 py-3 focus:border-carbon/20 focus:outline-none resize-y placeholder:text-carbon/30 leading-relaxed"
                  />
                ) : (
                  <input
                    value={v}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    placeholder={tOv.placeholder}
                    maxLength={f.maxLength}
                    className="w-full text-[13px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] px-4 py-3 focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30"
                  />
                )}
                <p className="text-[11px] text-carbon/40 mt-1">{f.hint}</p>
              </div>
            );
          })}

          <div className="flex items-center gap-3 pt-3 border-t border-carbon/[0.06]">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-all ${
                dirty && !saving ? 'bg-carbon text-white hover:bg-carbon/90' : 'bg-carbon/[0.06] text-carbon/30 cursor-not-allowed'
              }`}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? tOv.saving : saved ? tOv.saved : dirty ? tOv.save : tOv.noChanges}
            </button>
            {saved && <Check className="h-4 w-4 text-[#5A7847]" strokeWidth={2.5} />}
            {error && <span className="text-[12px] text-[#A0463C]">{error}</span>}
            <p className="text-[11px] text-carbon/40 ml-auto italic">
              {tOv.liveUpdates}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
