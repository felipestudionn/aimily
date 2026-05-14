/**
 * Aimily Studio · Output budget checker
 *
 * Studio packs are CLOSED packs (Capsule 10 / Editorial 25 / Full Campaign 50)
 * — NOT credits. Each generation consumes 1 output from the oldest unexhausted
 * `studio_purchase` row for that project, atomically via the RPC.
 *
 * Call site: `/api/studio/generate` before any AI call.
 *   - If `consume_studio_output` returns a purchase_id, generation proceeds
 *     and the id is captured so a refund can be issued on failure.
 *   - If it returns NULL, the project pool is empty → return 402-style
 *     response telling the user to buy another pack.
 *
 * Refund path: on AI failure, call `refund_studio_output(purchaseId)` to
 * restore the consumed output. Pattern mirrors `refundImageryUnits` used
 * by the Aimily 360 endpoints.
 *
 * Reference: business-plan_aimily-studio-2026-05-14.md §0.0 decision #13
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface StudioOutputCheck {
  allowed: boolean;
  purchaseId?: string;
  /** Sum of outputs remaining across all active purchases in this project. */
  outputsRemaining: number;
}

/**
 * Atomically consume one output. Returns the purchase_id that was decremented
 * (for refund-on-failure) or `allowed=false` if no outputs available.
 */
export async function consumeStudioOutput(
  userId: string,
  studioProjectId: string
): Promise<StudioOutputCheck> {
  const supabase = await createClient();

  const { data: purchaseId, error } = await supabase.rpc('consume_studio_output', {
    p_user_id: userId,
    p_studio_project_id: studioProjectId,
  });

  if (error) {
    console.error('[Studio] consume_studio_output error:', error);
    return { allowed: false, outputsRemaining: 0 };
  }

  if (!purchaseId) {
    // Pool empty — count outputs remaining (will be 0) for the response
    return { allowed: false, outputsRemaining: 0 };
  }

  // Optional: total outputs left across all active purchases of this project
  const { data: aggRow } = await supabase
    .from('studio_purchases')
    .select('outputs_allocated, outputs_consumed')
    .eq('studio_project_id', studioProjectId);

  const remaining = aggRow
    ? aggRow.reduce(
        (acc, r) =>
          acc + Math.max(Number(r.outputs_allocated) - Number(r.outputs_consumed), 0),
        0
      )
    : 0;

  return {
    allowed: true,
    purchaseId: purchaseId as string,
    outputsRemaining: remaining,
  };
}

/**
 * Refund one output to a specific purchase. Called on AI failure path.
 */
export async function refundStudioOutput(userId: string, purchaseId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('refund_studio_output', {
    p_user_id: userId,
    p_purchase_id: purchaseId,
  });
  if (error) {
    console.error('[Studio] refund_studio_output error:', error);
  }
}

/**
 * Helper for endpoint to return a standardized 402 response when pool empty.
 */
export function studioPoolEmptyResponse(studioProjectId: string) {
  return NextResponse.json(
    {
      error: 'studio_pool_empty',
      message:
        'No outputs remaining in this project. Purchase another pack to continue.',
      studio_project_id: studioProjectId,
    },
    { status: 402 }
  );
}
