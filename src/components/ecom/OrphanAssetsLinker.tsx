'use client';

/* ═══════════════════════════════════════════════════════════════════
   OrphanAssetsLinker · self-heal UI for storefront-bound assets that
   lack metadata.sku_id

   Lists every editorial / lifestyle / still_life asset belonging to
   this collection that has no sku_id link. Per asset the user picks:
     - Assign to SKU       → sets metadata.sku_id (asset shows on PDP)
     - Mark as input ref   → reclassifies asset_type to 'callout'
                              (excluded from storefront PDP filter)
     - Delete              → soft-deletes the asset

   Why this exists: pre-2026-05-06 the upload endpoints didn't write
   metadata.sku_id and style references were saved as 'editorial'.
   Result: assets visible in Aimily but invisible on the public
   storefront PDP. This component closes the loop so the user can
   self-heal historic orphans without SQL access. The structural
   fixes in /api/storage/upload + ContentEvolutionStrip ensure new
   uploads can never become orphans by accident.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Check, AlertTriangle, Trash2, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useSkus } from '@/hooks/useSkus';

interface Props {
  collectionPlanId: string;
  storefrontId: string | null;
}

interface OrphanAsset {
  id: string;
  asset_type: string;
  name: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  created_at?: string;
}

type ActionState = 'idle' | 'pending' | 'done';

export function OrphanAssetsLinker({ collectionPlanId, storefrontId }: Props) {
  const t = useTranslation();
  const tOrphan = t.ecom.orphanLinker;

  const { skus } = useSkus(collectionPlanId);

  const [orphans, setOrphans] = useState<OrphanAsset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<Record<string, ActionState>>({});
  const [skuPicker, setSkuPicker] = useState<Record<string, string>>({});

  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/ecom/orphan-assets?collectionPlanId=${collectionPlanId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to load orphan assets');
        setOrphans([]);
        return;
      }
      const data = await res.json();
      setOrphans(data.orphans ?? []);
    } catch {
      setError(tOrphan.networkError);
      setOrphans([]);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, tOrphan.networkError]);

  useEffect(() => { refetch(); }, [refetch]);

  const apply = async (
    assetId: string,
    body: { skuId?: string; assetType?: string; delete?: boolean }
  ) => {
    setPendingAction((p) => ({ ...p, [assetId]: 'pending' }));
    setError(null);
    try {
      const res = await fetch(`/api/ecom/orphan-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? tOrphan.actionFailed);
      }
      // Optimistic remove from list
      setOrphans((cur) => (cur ?? []).filter((o) => o.id !== assetId));
      setPendingAction((p) => ({ ...p, [assetId]: 'done' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : tOrphan.actionFailed);
      setPendingAction((p) => ({ ...p, [assetId]: 'idle' }));
    }
  };

  // Storefront not yet published → component still useful (orphans are
  // collection-scoped), but if storefrontId is null we still render.
  if (!collectionPlanId) return null;

  // No orphans → keep the component invisible. Self-effacing UI.
  if (!loading && (orphans?.length ?? 0) === 0 && !error) return null;

  return (
    <div className="bg-white rounded-[20px] p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-2">
        <AlertTriangle className="h-4 w-4 text-[#A0463C]" strokeWidth={1.75} />
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">
          {tOrphan.title}
        </p>
        {orphans && orphans.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A0463C]/10 text-[#A0463C] font-semibold">
            {orphans.length}
          </span>
        )}
      </div>
      <p className="text-[12px] text-carbon/55 mb-5">
        {tOrphan.description}
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-[12px] text-carbon/45">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {tOrphan.loading}
        </div>
      )}

      {error && (
        <div className="text-[12px] text-[#A0463C] mb-3">{error}</div>
      )}

      {!loading && orphans && orphans.length > 0 && (
        <div className="space-y-2">
          {orphans.map((asset) => {
            const status = pendingAction[asset.id] ?? 'idle';
            const isPending = status === 'pending';
            const pickedSku = skuPicker[asset.id] ?? '';
            return (
              <div key={asset.id} className="flex items-center gap-4 px-3 py-3 rounded-[14px] border border-carbon/[0.06] bg-carbon/[0.015]">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-[10px] overflow-hidden bg-carbon/[0.04] flex-shrink-0">
                  {asset.url ? (
                    <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-carbon/25" />
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-carbon/45 font-semibold">
                      {asset.asset_type}
                    </span>
                    {asset.created_at && (
                      <span className="text-[10px] text-carbon/35">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-carbon truncate">{asset.name || asset.id}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* SKU picker + assign */}
                  <select
                    value={pickedSku}
                    onChange={(e) => setSkuPicker((p) => ({ ...p, [asset.id]: e.target.value }))}
                    disabled={isPending}
                    className="text-[11px] text-carbon bg-white rounded-[8px] border border-carbon/[0.08] px-2 py-1.5 focus:outline-none focus:border-carbon/25 max-w-[160px]"
                  >
                    <option value="">{tOrphan.skuPickerLabel}</option>
                    {(skus ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.name && s.name.length > 24 ? s.name.slice(0, 24) + '…' : s.name) || s.family || s.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => pickedSku && apply(asset.id, { skuId: pickedSku })}
                    disabled={!pickedSku || isPending}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-semibold tracking-[-0.01em] transition-colors ${
                      pickedSku && !isPending
                        ? 'bg-carbon text-white hover:bg-carbon/90'
                        : 'bg-carbon/[0.06] text-carbon/30 cursor-not-allowed'
                    }`}
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {tOrphan.assignAction}
                  </button>

                  {/* Reclassify → callout */}
                  <button
                    onClick={() => apply(asset.id, { assetType: 'callout' })}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10.5px] font-medium border border-carbon/[0.12] text-carbon/65 hover:bg-carbon/[0.04] transition-colors disabled:opacity-40"
                    title={tOrphan.markAsInputHint}
                  >
                    {tOrphan.markAsInputAction}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => apply(asset.id, { delete: true })}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[10.5px] text-carbon/50 hover:text-[#A0463C] hover:bg-[#A0463C]/[0.06] transition-colors disabled:opacity-40"
                    title={tOrphan.deleteAction}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {!loading && orphans && orphans.length > 0 && (
        <p className="text-[11px] text-carbon/40 italic mt-4">
          {tOrphan.footerHint}
        </p>
      )}
    </div>
  );
}
