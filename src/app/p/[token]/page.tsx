/* ═══════════════════════════════════════════════════════════════════
   /p/[token] — public read-only shared deck

   Server component: validates the token, fetches the collection's
   presentation data, hands off to the client SharedDeck component.

   - Uses supabaseAdmin so anon viewers can read through the share
     (RLS locks the owner-only policies on the table).
   - Increments views_count + stamps last_viewed_at as a fire-and-
     forget side effect.
   - Expired shares → 404 so viewers can't tell the link ever existed.
   ═══════════════════════════════════════════════════════════════════ */

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadPresentationData } from '@/lib/presentation/load-presentation-data';
import { SharedDeck } from '@/components/presentation/SharedDeck';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedDeckPage({ params }: PageProps) {
  const { token } = await params;

  const shareResult = await supabaseAdmin
    .from('presentation_shares')
    .select('collection_plan_id, theme_id, cover_subtitle, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (shareResult.error) {
    console.error('[/p/[token]] share lookup failed:', shareResult.error);
    notFound();
  }
  const share = shareResult.data;
  if (!share) {
    console.warn('[/p/[token]] no share for token', token);
    notFound();
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    console.warn('[/p/[token]] share expired');
    notFound();
  }

  const planResult = await supabaseAdmin
    .from('collection_plans')
    .select('name, season')
    .eq('id', share.collection_plan_id)
    .maybeSingle();
  if (planResult.error || !planResult.data) {
    console.error('[/p/[token]] plan lookup failed:', planResult.error);
    notFound();
  }
  const plan = planResult.data;

  let presentationData: Awaited<ReturnType<typeof loadPresentationData>>;
  try {
    presentationData = await loadPresentationData(share.collection_plan_id);
  } catch (e) {
    console.error('[/p/[token]] loadPresentationData failed:', e);
    notFound();
  }

  // Fire-and-forget: atomic view-count bump via SQL function. Never
  // blocks rendering; a failed increment shouldn't break the share.
  void (async () => {
    try {
      await supabaseAdmin.rpc('increment_share_views', { p_token: token });
    } catch {
      /* no-op */
    }
  })();

  const titles: Record<string, string> = {
    consumer: 'Consumer',
    moodboard: 'Moodboard',
    marketResearch: 'Market Research',
    brandIdentity: 'Brand Identity',
    creativeOverview: 'Creative Overview',
    buyingStrategy: 'Buying Strategy',
    assortmentPricing: 'Assortment & Pricing',
    distribution: 'Distribution',
    financialPlan: 'Financial Plan',
    collectionBuilder: 'Collection Builder',
    sketchColor: 'Sketch & Color',
    techPack: 'Tech Pack',
    prototyping: 'Prototyping',
    production: 'Production',
    finalSelection: 'Final Selection',
    gtmLaunchPlan: 'GTM & Launch Plan',
    contentStudio: 'Content Studio',
    communications: 'Communications',
    salesDashboard: 'Sales Dashboard',
    pointOfSale: 'Point of Sale',
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0A0A0A' }}>
      <SharedDeck
        meta={{
          collectionName: presentationData.cover.brandName ?? plan.name ?? 'Collection',
          brandName: presentationData.cover.brandName ?? plan.name ?? undefined,
          season: presentationData.cover.season ?? plan.season ?? undefined,
          launchDate: presentationData.cover.launchDate ?? null,
        }}
        collectionId={share.collection_plan_id}
        themeId={share.theme_id}
        coverSubtitle={share.cover_subtitle ?? 'A collection presentation'}
        titles={titles}
        data={presentationData}
      />
    </div>
  );
}
