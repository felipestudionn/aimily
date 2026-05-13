'use client';

/* ═══════════════════════════════════════════════════════════════════
   OriginSelector — picks the production country for the SKU.

   Mounted at the top of the Materials sub-step (SketchPhase). The
   country choice cascades to:
     · Costing panel — factory rate · freight EUR/unit · duties %
     · Timeline      — production weeks + transit weeks
     · Suppliers     — surfaces factories on file in that region
   All three are immediately readable from the impact-preview pills so
   the user sees "what does picking Portugal vs China change?" in
   real time.

   Felipe (2026-05-13): "Como mínimo, se tiene que decir el tipo de
   origen; en función de eso, precio orientativo, tiempos de
   producción, manufactura, transporte." This component answers all
   four at once.

   Persistence:
     · Writes sku.production_origin to /api/skus/[id] via the parent's
       onUpdate callback.
     · Server PATCH handler in /api/skus/[id] mirrors the value to CIS
       under production.origin.country so downstream AI / dashboards
       read the same source of truth.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { Building2, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { PRODUCTION_HUBS, type ProductionHub } from '@/lib/costing/landed-cost';

interface OriginSelectorProps {
  collectionId: string;
  productionOrigin: string | undefined;
  onChange: (countryCode: string) => Promise<void>;
}

interface SupplierLite {
  id: string;
  name: string;
  region?: string;
  supplier_type?: string;
}

const REGION_LABEL: Record<ProductionHub['region'], string> = {
  EU: 'Europe',
  MED: 'Mediterranean',
  ASIA: 'Asia',
  AMERICAS: 'Americas',
};

export function OriginSelector({ collectionId, productionOrigin, onChange }: OriginSelectorProps) {
  const t = useTranslation();
  const tp = (t as unknown as { skuPhases?: Record<string, string> }).skuPhases || {};

  const [saving, setSaving] = useState(false);
  const [factories, setFactories] = useState<SupplierLite[]>([]);

  const selected = productionOrigin
    ? PRODUCTION_HUBS.find(h => h.code === productionOrigin)
    : undefined;

  /* Surface the user's own factories that match the chosen origin.
   * The suppliers directory is per-user (not per-collection) so the
   * count reads across every collection the user has worked on. */
  useEffect(() => {
    if (!selected) { setFactories([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/suppliers?region=${encodeURIComponent(selected.code)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const all: SupplierLite[] = json.suppliers || [];
        // Region is free-text in the DB — match liberally so 'IT', 'Italy',
        // 'italia', 'Italian leather mill' all count for IT.
        const re = new RegExp(`\\b${selected.code}\\b|${selected.label}`, 'i');
        setFactories(all.filter(s => (s.region || '').match(re)));
      } catch { /* non-blocking */ }
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const handleSelect = async (code: string) => {
    if (code === productionOrigin) return;
    setSaving(true);
    try {
      await onChange(code);
    } finally {
      setSaving(false);
    }
  };

  const grouped = PRODUCTION_HUBS.reduce<Record<ProductionHub['region'], ProductionHub[]>>(
    (acc, h) => { (acc[h.region] ||= []).push(h); return acc; },
    { EU: [], MED: [], ASIA: [], AMERICAS: [] },
  );

  return (
    <div className="bg-white rounded-[16px] border border-carbon/[0.06] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-carbon/45" strokeWidth={2} />
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-carbon/55">
              {tp.productionOrigin || 'Production origin'}
            </p>
            {saving && <Loader2 className="h-3 w-3 animate-spin text-carbon/30" />}
          </div>
          <p className="text-[11px] text-carbon/40 leading-relaxed max-w-[440px]">
            {tp.productionOriginHelp || 'Where will this SKU be made? The country drives realistic cost, lead-time and duties — the costing panel and timeline read from this choice.'}
          </p>
        </div>
        {selected && (
          <a
            href={`/collection/${collectionId}/suppliers`}
            className="inline-flex items-center gap-1 text-[10px] text-carbon/45 hover:text-carbon transition-colors"
          >
            {tp.viewSuppliers || 'View suppliers'}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {/* Country grid — grouped by region */}
      <div className="space-y-3">
        {(Object.keys(grouped) as ProductionHub['region'][]).map(region => (
          <div key={region} className="space-y-1.5">
            <p className="text-[9px] tracking-[0.15em] uppercase font-semibold text-carbon/30">
              {REGION_LABEL[region]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grouped[region].map(hub => {
                const isSel = hub.code === productionOrigin;
                return (
                  <button
                    key={hub.code}
                    type="button"
                    onClick={() => handleSelect(hub.code)}
                    title={hub.notes}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[-0.01em] transition-colors ${
                      isSel
                        ? 'bg-carbon text-white'
                        : 'bg-carbon/[0.04] text-carbon/70 hover:bg-carbon/[0.08]'
                    }`}
                  >
                    {hub.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Impact preview */}
      {selected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-carbon/[0.04]">
          <ImpactPill label={tp.factoryRate || 'Factory rate'} value={`€${selected.factoryRate}/h`} />
          <ImpactPill label={tp.freight || 'Freight (sea)'} value={`€${selected.freight.toFixed(1)}/unit`} />
          <ImpactPill label={tp.duties || 'EU duties'} value={`${selected.duties}%`} />
          <ImpactPill label={tp.leadTime || 'Lead time'} value={`${selected.leadTimeWeeks} wks`} />
        </div>
      )}

      {/* Factories on file for this origin */}
      {selected && (
        <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-carbon/[0.04]">
          <Building2 className="h-3 w-3 text-carbon/35" strokeWidth={2} />
          {factories.length > 0 ? (
            <>
              <span className="text-carbon/65 font-medium">
                {factories.length} {factories.length === 1
                  ? (tp.factoryOnFile || 'factory on file')
                  : (tp.factoriesOnFile || 'factories on file')}
                {' — '}
              </span>
              <span className="text-carbon/45 truncate">
                {factories.slice(0, 3).map(f => f.name).join(', ')}
                {factories.length > 3 && ` +${factories.length - 3}`}
              </span>
            </>
          ) : (
            <span className="text-carbon/35">
              {tp.noFactoriesHint || `No factories on file for ${selected.label}. The defaults above are industry midpoints.`}
            </span>
          )}
        </div>
      )}

      {!selected && (
        <p className="text-[11px] text-carbon/35 italic">
          {tp.originPickHint || 'Pick an origin to unlock realistic costing and lead-time defaults.'}
        </p>
      )}
    </div>
  );
}

function ImpactPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-carbon/[0.02] rounded-[10px] p-2.5">
      <p className="text-[9px] tracking-[0.12em] uppercase font-semibold text-carbon/35 mb-0.5">{label}</p>
      <p className="text-[13px] font-semibold tabular-nums text-carbon">{value}</p>
    </div>
  );
}
