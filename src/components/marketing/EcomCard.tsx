'use client';

import { useEffect, useState } from 'react';
import { EcomHub } from '@/components/ecom/EcomHub';
import { SeoResearchHub } from '@/components/ecom/SeoResearchHub';
import { OverridesEditor } from '@/components/ecom/OverridesEditor';
import { SkuOverridesEditor } from '@/components/ecom/SkuOverridesEditor';

/* ═══════════════════════════════════════════════════════════════════
   Ecom Card · sub-block 04.4 of Marketing & Sales

   Sprint 10 cleanup (2026-05-05): all wholesale logic moved to
   src/components/merchandising/WholesaleOrdersCard.tsx (Block 2 >
   Channels > Wholesale). This card is now pure DTC-storefront focused:

   - EcomHub        · publish flow (subdomain, theme picker, payment connect)
   - SeoResearchHub · keywords, on-page meta, competitors, audit
   - OverridesEditor· per-page copy edits (non-destructive overrides)

   Aimily NEVER touches money — only renders official widgets that
   open the user's own checkout (Stripe/Shopify).
   ═══════════════════════════════════════════════════════════════════ */

interface EcomCardProps { collectionPlanId: string; }

export function EcomCard({ collectionPlanId }: EcomCardProps) {
  const [storefrontId, setStorefrontId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ecom/storefront-by-collection/${collectionPlanId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.storefront) setStorefrontId(data.storefront.id);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [collectionPlanId]);

  return (
    <div className="space-y-5">
      <EcomHub collectionPlanId={collectionPlanId} />
      <SeoResearchHub collectionPlanId={collectionPlanId} storefrontId={storefrontId} />
      <OverridesEditor storefrontId={storefrontId} />
      <SkuOverridesEditor collectionPlanId={collectionPlanId} storefrontId={storefrontId} />
    </div>
  );
}
