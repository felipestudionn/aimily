'use client';

/* ═══════════════════════════════════════════════════════════════════
   SkuOverridesEditor · per-SKU storefront overrides

   Lives inside EcomCard below the brand-level OverridesEditor.
   Lets the user override copy + payment per SKU:
     - description  → storefront_overrides path: sku.<id>.description
     - storyHook    → storefront_overrides path: sku.<id>.storyHook
     - buyButtonId  → storefronts.sku_payment_map[sku.id]
                      (Stripe Buy Button ID per SKU)
                      (Shopify product handle when shopify provider)

   Saves:
     storefront_overrides via /api/ecom/override (per page_id = sku-overrides)
     sku_payment_map      via PATCH /api/ecom/storefront/[id]

   Why this matters: the apply-overrides handler at
   src/lib/storefront/apply-overrides.ts:43-46 already supports
   sku.<id>.{name,description,storyHook}. This component finally
   gives the user a UI to set those values. Before this commit,
   per-SKU description was unreachable from the UI even though the
   storefront SSR path supported it.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { Loader2, Check, Tag, CreditCard } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useSkus } from '@/hooks/useSkus';
import type { Storefront } from '@/types/storefront';

interface Props {
  collectionPlanId: string;
  storefrontId: string | null;
}

interface OverrideRow {
  page_id: string;
  field_overrides: Record<string, string>;
}

type StorefrontPaymentMap = Record<string, { buyButtonId?: string; productHandle?: string }>;

export function SkuOverridesEditor({ collectionPlanId, storefrontId }: Props) {
  const t = useTranslation();
  const tSku = t.ecom.skuOverrides;

  const { skus, loading: skusLoading } = useSkus(collectionPlanId);

  const [overrides, setOverrides] = useState<Record<string, { description?: string; storyHook?: string }>>({});
  const [paymentMap, setPaymentMap] = useState<StorefrontPaymentMap>({});
  const [paymentProvider, setPaymentProvider] = useState<Storefront['payment_provider']>('lookbook_only');
  const [initialOverrides, setInitialOverrides] = useState<typeof overrides>({});
  const [initialPayment, setInitialPayment] = useState<StorefrontPaymentMap>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expandedSkuId, setExpandedSkuId] = useState<string | null>(null);

  // Load existing overrides + payment map
  useEffect(() => {
    if (!storefrontId) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const [ovRes, sfRes] = await Promise.all([
          fetch(`/api/ecom/override?storefrontId=${storefrontId}`),
          fetch(`/api/ecom/storefront/${storefrontId}`),
        ]);

        const ovData = ovRes.ok ? await ovRes.json() : { overrides: [] };
        const sfData = sfRes.ok ? await sfRes.json() : null;

        const map: typeof overrides = {};
        for (const row of (ovData.overrides ?? []) as OverrideRow[]) {
          // We use a single page_id 'sku-overrides' for all per-SKU overrides
          // to avoid one row per SKU. Keys inside field_overrides are
          // 'sku.<id>.description' and 'sku.<id>.storyHook'.
          for (const [path, value] of Object.entries(row.field_overrides ?? {})) {
            const m = path.match(/^sku\.([a-f0-9-]+)\.(description|storyHook)$/);
            if (m) {
              const [, skuId, field] = m;
              map[skuId] = map[skuId] ?? {};
              if (field === 'description' || field === 'storyHook') {
                map[skuId][field] = value;
              }
            }
          }
        }

        const pm = (sfData?.storefront?.sku_payment_map ?? {}) as StorefrontPaymentMap;
        const provider = (sfData?.storefront?.payment_provider ?? 'lookbook_only') as Storefront['payment_provider'];

        if (!cancelled) {
          setOverrides(map);
          setInitialOverrides(map);
          setPaymentMap(pm);
          setInitialPayment(pm);
          setPaymentProvider(provider);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [storefrontId]);

  const dirty =
    JSON.stringify(overrides) !== JSON.stringify(initialOverrides) ||
    JSON.stringify(paymentMap) !== JSON.stringify(initialPayment);

  const updateOverride = (skuId: string, field: 'description' | 'storyHook', value: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const cur = { ...(next[skuId] ?? {}) };
      if (value.trim()) {
        cur[field] = value;
      } else {
        delete cur[field];
      }
      if (Object.keys(cur).length === 0) {
        delete next[skuId];
      } else {
        next[skuId] = cur;
      }
      return next;
    });
  };

  const updatePayment = (skuId: string, value: string) => {
    setPaymentMap((prev) => {
      const next = { ...prev };
      const trimmed = value.trim();
      if (!trimmed) {
        delete next[skuId];
        return next;
      }
      const key = paymentProvider === 'shopify_buy' ? 'productHandle' : 'buyButtonId';
      next[skuId] = { ...(next[skuId] ?? {}), [key]: trimmed };
      return next;
    });
  };

  const save = async () => {
    if (!storefrontId || saving) return;
    setSaving(true); setError(null);
    try {
      // 1. Build flat field_overrides keyed by sku.<id>.<field>
      const fieldOverrides: Record<string, string> = {};
      for (const [skuId, fields] of Object.entries(overrides)) {
        if (fields.description) fieldOverrides[`sku.${skuId}.description`] = fields.description;
        if (fields.storyHook) fieldOverrides[`sku.${skuId}.storyHook`] = fields.storyHook;
      }

      const overridesPromise = fetch('/api/ecom/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontId, pageId: 'sku-overrides', fieldOverrides }),
      });

      // 2. Patch sku_payment_map
      const paymentPromise = fetch(`/api/ecom/storefront/${storefrontId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuPaymentMap: paymentMap }),
      });

      const [ovRes, payRes] = await Promise.all([overridesPromise, paymentPromise]);
      if (!ovRes.ok || !payRes.ok) throw new Error(tSku.saveFailed);

      setInitialOverrides(overrides);
      setInitialPayment(paymentMap);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : tSku.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!storefrontId) return null;
  if (skusLoading || !loaded) {
    return (
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2 text-[12px] text-carbon/45">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {tSku.loading}
        </div>
      </div>
    );
  }

  if (!skus || skus.length === 0) return null;

  const paymentLabel =
    paymentProvider === 'stripe_buy_button' ? tSku.buyButtonIdLabel
      : paymentProvider === 'shopify_buy' ? tSku.productHandleLabel
        : tSku.lookbookOnlyNote;

  return (
    <div className="bg-white rounded-[20px] p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-2">
        <Tag className="h-4 w-4 text-carbon/40" strokeWidth={1.75} />
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">{tSku.title}</p>
        <span className="text-[11px] text-carbon/35">{tSku.subtitle}</span>
      </div>
      <p className="text-[12px] text-carbon/55 mb-6">
        {tSku.description}
      </p>

      <div className="space-y-2">
        {skus.map((sku) => {
          const isOpen = expandedSkuId === sku.id;
          const cur = overrides[sku.id] ?? {};
          const pay = paymentMap[sku.id] ?? {};
          const payValue = paymentProvider === 'shopify_buy' ? (pay.productHandle ?? '') : (pay.buyButtonId ?? '');
          const filledCount =
            (cur.description ? 1 : 0) +
            (cur.storyHook ? 1 : 0) +
            (payValue ? 1 : 0);

          return (
            <div key={sku.id} className="rounded-[14px] border border-carbon/[0.06] overflow-hidden">
              <button
                onClick={() => setExpandedSkuId(isOpen ? null : sku.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-carbon/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] tabular-nums text-carbon/35 font-mono">{sku.id.slice(0, 8)}</span>
                  <span className="text-[13px] text-carbon font-medium truncate">{sku.name || sku.family || 'SKU'}</span>
                  {sku.pvp ? <span className="text-[11px] text-carbon/45">€{sku.pvp}</span> : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {filledCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5A7847]/10 text-[#5A7847] font-semibold">
                      {filledCount}/{paymentProvider === 'lookbook_only' ? 2 : 3}
                    </span>
                  )}
                  <span className="text-[11px] text-carbon/40">{isOpen ? '−' : '+'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 py-4 space-y-4 bg-carbon/[0.015] border-t border-carbon/[0.06]">
                  {/* Description override */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-carbon/55">
                      {tSku.descriptionLabel}
                    </label>
                    <textarea
                      value={cur.description ?? ''}
                      onChange={(e) => updateOverride(sku.id, 'description', e.target.value)}
                      placeholder={tSku.descriptionPlaceholder}
                      rows={3}
                      maxLength={600}
                      className="w-full mt-1.5 text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2 focus:border-carbon/25 focus:outline-none resize-y placeholder:text-carbon/30 leading-relaxed"
                    />
                    <p className="text-[11px] text-carbon/40 mt-1">{tSku.descriptionHint}</p>
                  </div>

                  {/* StoryHook override */}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-carbon/55">
                      {tSku.storyHookLabel}
                    </label>
                    <input
                      value={cur.storyHook ?? ''}
                      onChange={(e) => updateOverride(sku.id, 'storyHook', e.target.value)}
                      placeholder={tSku.storyHookPlaceholder}
                      maxLength={120}
                      className="w-full mt-1.5 text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2 focus:border-carbon/25 focus:outline-none placeholder:text-carbon/30"
                    />
                    <p className="text-[11px] text-carbon/40 mt-1">{tSku.storyHookHint}</p>
                  </div>

                  {/* Payment per SKU */}
                  {paymentProvider !== 'lookbook_only' && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CreditCard className="h-3 w-3 text-carbon/40" strokeWidth={1.75} />
                        <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-carbon/55">
                          {paymentLabel}
                        </label>
                      </div>
                      <input
                        value={payValue}
                        onChange={(e) => updatePayment(sku.id, e.target.value)}
                        placeholder={paymentProvider === 'shopify_buy' ? 'product-handle' : 'buy_btn_1Abc...'}
                        className="w-full text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2 focus:border-carbon/25 focus:outline-none placeholder:text-carbon/30 font-mono"
                      />
                      <p className="text-[11px] text-carbon/40 mt-1">
                        {paymentProvider === 'shopify_buy' ? tSku.productHandleHint : tSku.buyButtonIdHint}
                      </p>
                    </div>
                  )}
                  {paymentProvider === 'lookbook_only' && (
                    <p className="text-[11px] italic text-carbon/40">{tSku.lookbookOnlyNote}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-5 mt-5 border-t border-carbon/[0.06]">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-all ${
            dirty && !saving ? 'bg-carbon text-white hover:bg-carbon/90' : 'bg-carbon/[0.06] text-carbon/30 cursor-not-allowed'
          }`}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? tSku.saving : saved ? tSku.saved : dirty ? tSku.save : tSku.noChanges}
        </button>
        {saved && <Check className="h-4 w-4 text-[#5A7847]" strokeWidth={2.5} />}
        {error && <span className="text-[12px] text-[#A0463C]">{error}</span>}
      </div>
    </div>
  );
}
