/* ═══════════════════════════════════════════════════════════════════
   /my-collections — Server Component entry.

   Resolves auth, subscription, and the full collection grid data
   server-side so the HTML reaches the browser already populated. The
   page used to render a blank shell → spinner → grid sequence (three
   separate paints) because everything was fetched client-side. SSR'ing
   the initial payload collapses that into a single paint.

   Gating handled here (so the client component never has to dance
   around null auth / null subscription):
     • No user                       → redirect('/')
     • User w/o onboardingCompletedAt → redirect('/welcome')

   The client component (`MyCollectionsClient`) receives initial data
   as props and keeps owning interactivity (delete, undo toast, Stripe
   return params). It does not refetch on mount — server is the source
   of truth for the first paint, and user actions update local state
   optimistically.
   ═══════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import { loadSubscriptionForUser } from '@/lib/billing/load-subscription';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadDerivedSetupData } from '@/lib/derive-setup-data';
import MyCollectionsClient, {
  type DerivedSnapshot,
  type TimelineData,
} from './MyCollectionsClient';

interface CollectionPlanRow {
  id: string;
  name: string;
  season?: string;
  created_at: string;
  updated_at: string;
}

export const dynamic = 'force-dynamic';

export default async function MyCollectionsPage() {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  // Onboarding gate — moved off the client useEffect (which used to
  // flash my-collections briefly before bouncing to /welcome).
  const subscription = await loadSubscriptionForUser(user.id, user.email).catch(
    (err) => {
      console.error('[my-collections] subscription SSR failed', err);
      return null;
    },
  );
  if (subscription && !subscription.onboardingCompletedAt) {
    redirect('/welcome');
  }

  // Collections + timelines in parallel. Collection ownership filter
  // happens via the user_id column (RLS-equivalent, since supabaseAdmin
  // bypasses RLS). soft-deleted rows excluded.
  const [{ data: collectionsData, error: collectionsError }, { data: timelinesData }] =
    await Promise.all([
      supabaseAdmin
        .from('collection_plans')
        .select('id, name, season, created_at, updated_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabaseAdmin
        .from('collection_timelines')
        .select('collection_plan_id, launch_date, milestones'),
    ]);

  if (collectionsError) {
    console.error('[my-collections] SSR collections fetch failed', collectionsError);
  }

  const collections = (collectionsData || []) as CollectionPlanRow[];
  const planIds = collections.map((c) => c.id);
  const timelines = ((timelinesData || []) as TimelineData[]).filter((tl) =>
    planIds.includes(tl.collection_plan_id),
  );

  // SKU counts + derived snapshots per plan. Parallel — a typical user
  // has 1-3 collections, so this stays well under the Fluid Compute
  // budget for an initial paint.
  const [skuCountEntries, derivedEntries] = await Promise.all([
    Promise.all(
      planIds.map(async (id): Promise<[string, number]> => {
        const { count } = await supabaseAdmin
          .from('collection_skus')
          .select('id', { count: 'exact', head: true })
          .eq('collection_plan_id', id);
        return [id, count ?? 0];
      }),
    ),
    Promise.all(
      planIds.map(async (id): Promise<[string, DerivedSnapshot]> => {
        try {
          const derived = await loadDerivedSetupData(id);
          return [
            id,
            {
              totalSalesTarget: derived.totalSalesTarget,
              productCategory: derived.productCategory,
              expectedSkus: derived.expectedSkus,
            },
          ];
        } catch (err) {
          console.error('[my-collections] derived load failed for', id, err);
          return [id, {}];
        }
      }),
    ),
  ]);

  const initialSkuCounts = Object.fromEntries(skuCountEntries);
  const initialDerived = Object.fromEntries(derivedEntries);

  return (
    <MyCollectionsClient
      initialCollections={collections}
      initialTimelines={timelines}
      initialSkuCounts={initialSkuCounts}
      initialDerived={initialDerived}
    />
  );
}
