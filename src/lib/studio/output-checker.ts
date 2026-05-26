/**
 * Aimily Studio · Output budget checker
 *
 * After the 2026-05-26 credits unification (migration 077), Studio packs
 * no longer maintain a per-project pool. Capsule / Editorial / Full
 * Campaign one-time purchases land in the user's global `user_credits.balance`
 * just like Aimily Credit top-ups, and any generation (Studio or 360 or
 * In-Season) draws from the same balance.
 *
 * This module is a thin Studio-flavoured wrapper around the canonical
 * `consumeCredits` / `refundCredits` helpers in api-auth.ts. It exists
 * for two reasons:
 *   1. Studio-specific 402 response copy ("compra un pack" vs. the
 *      generic "limit_reached").
 *   2. A central place for any future Studio-only billing logic (style
 *      memory bonus credits, partner-pack revenue share, etc.).
 *
 * Reference: business-plan_aimily-studio-2026-05-14.md §0.0 decision #13
 * + 2026-05-26 unify-credits sprint.
 */

import { NextResponse } from 'next/server';
import { consumeCredits, refundCredits } from '@/lib/api-auth';
import type { CreditAction } from '@/lib/stripe';

export interface StudioOutputCheck {
  allowed: boolean;
  /** Credits taken from the user's monthly plan allowance. Pass to refund. */
  planConsumed: number;
  /** Credits taken from the user's pack balance. Pass to refund. */
  packConsumed: number;
  /** Pack balance after the consume — used by callers to show "X left". */
  packBalanceAfter: number;
  /** When allowed=false, why. */
  reason?: 'limit_reached' | 'trial_expired' | 'subscription_inactive';
}

/**
 * Consume credits for a Studio generation. The action defines the cost
 * (e.g. video_kling=30, editorial=5) via CREDIT_COSTS, no need to pass
 * a unit count.
 */
export async function consumeStudioOutput(
  userId: string,
  userEmail: string,
  action: CreditAction,
): Promise<StudioOutputCheck> {
  const usage = await consumeCredits(userId, userEmail, action);
  if (!usage.allowed) {
    return {
      allowed: false,
      planConsumed: 0,
      packConsumed: 0,
      packBalanceAfter: usage.packBalance ?? 0,
      reason: usage.reason as 'limit_reached' | 'trial_expired' | 'subscription_inactive',
    };
  }
  return {
    allowed: true,
    planConsumed: usage.planConsumed ?? 0,
    packConsumed: usage.packConsumed ?? 0,
    packBalanceAfter: usage.packBalance ?? 0,
  };
}

/**
 * Refund the credits taken by a previous `consumeStudioOutput` when the
 * downstream provider call (Kling, OpenAI, Freepik) fails. Pass the
 * `planConsumed` and `packConsumed` from that response.
 */
export async function refundStudioOutput(
  userId: string,
  planConsumed: number,
  packConsumed: number,
): Promise<void> {
  await refundCredits(userId, planConsumed, packConsumed);
}

/**
 * Standardised 402 response when the user is out of credits. Studio
 * surfaces a more specific copy ("compra un pack") than the global
 * `usageDeniedResponse` because the Studio user is often a Studio-only
 * subscriber who doesn't have access to the Founder / Team monthly plans.
 */
export function studioPoolEmptyResponse(_studioProjectId?: string) {
  return NextResponse.json(
    {
      error: 'credits_exhausted',
      message:
        'No tienes créditos disponibles. Compra un pack o sube tu plan mensual para seguir generando.',
    },
    { status: 402 },
  );
}
