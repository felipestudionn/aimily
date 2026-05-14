import { createClient } from '@/lib/supabase/server';

/**
 * Detect which Aimily products a user has access to based on DB ownership.
 *
 *   has360    = the user has at least one collection_plan (Aimily 360)
 *   hasStudio = the user has at least one studio_project AND/OR a studio_purchase
 *
 * Driver of the post-login redirect logic (see business plan §5.6 — the rule
 * "solo ves lo tuyo"): if only one product, redirect straight into that
 * product's workspace. If both, show the top-bar switcher.
 *
 * A user is considered to "have Studio" the moment they create a project
 * — even before any pack purchase. This lets the lite-onboarding flow
 * route them correctly while they're still in the funnel.
 */
export type UserProducts = {
  has360: boolean;
  hasStudio: boolean;
  /** First active collection_plan id, if any (for direct redirect). */
  active360Id?: string;
  /** First active studio_project id, if any (for direct redirect). */
  activeStudioId?: string;
};

export async function getUserProducts(userId: string): Promise<UserProducts> {
  const supabase = await createClient();

  const [planResult, studioResult] = await Promise.all([
    supabase
      .from('collection_plans')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('studio_projects')
      .select('id')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  return {
    has360: !!planResult.data?.length,
    hasStudio: !!studioResult.data?.length,
    active360Id: planResult.data?.[0]?.id,
    activeStudioId: studioResult.data?.[0]?.id,
  };
}
