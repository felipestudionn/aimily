/* ═══════════════════════════════════════════════════════════════════
   /p/[token] — public read-only shared deck

   Server component. Three gates before the deck renders:
   1. Share exists.
   2. Share is not expired (→ ExpiredCard).
   3. If the share has a password, the viewer holds a valid unlock
      cookie (→ PasswordPrompt when missing/wrong).

   When all gates pass: fetch data, render <SharedDeck>, bump views.
   ═══════════════════════════════════════════════════════════════════ */

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadPresentationData } from '@/lib/presentation/load-presentation-data';
import { SharedDeck } from '@/components/presentation/SharedDeck';
import { ExpiredCard } from '@/components/presentation/ExpiredCard';
import { PasswordPrompt } from '@/components/presentation/PasswordPrompt';
import { cookieNameForToken, verifyUnlockCookie } from '@/lib/presentation/share-password';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedDeckPage({ params }: PageProps) {
  const { token } = await params;

  const shareResult = await supabaseAdmin
    .from('presentation_shares')
    .select('collection_plan_id, theme_id, cover_subtitle, expires_at, password_hash')
    .eq('token', token)
    .maybeSingle();
  if (shareResult.error) {
    console.error('[/p/[token]] share lookup failed:', shareResult.error);
    notFound();
  }
  const share = shareResult.data;
  if (!share) {
    notFound();
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0A0A0A' }}>
        <ExpiredCard expiredAt={share.expires_at} />
      </div>
    );
  }

  if (share.password_hash) {
    const jar = await cookies();
    const cookieVal = jar.get(cookieNameForToken(token))?.value;
    if (!verifyUnlockCookie(token, cookieVal)) {
      return (
        <div style={{ width: '100vw', height: '100vh', background: '#0A0A0A' }}>
          <PasswordPrompt token={token} />
        </div>
      );
    }
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

  // Fire-and-forget: atomic view-count bump via SQL function.
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
