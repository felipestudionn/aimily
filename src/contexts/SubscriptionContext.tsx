'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';
import { track, Events } from '@/lib/posthog';

type PlanId = 'trial' | 'starter' | 'professional' | 'professional_max' | 'enterprise';

interface PlanLimits {
  collections: number;
  imageryGenerations: number;
  users: number;
  exportEnabled: boolean;
  aiVideoEnabled: boolean;
  apiAccessEnabled: boolean;
  ssoEnabled: boolean;
}

interface SubscriptionData {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  trialEndsAt: string | null;
  isAdmin: boolean;
  usage: {
    imagery: number;
    month: string;
  };
  packBalance: number;
  // Set when a self-service refund was processed via /api/billing/refund.
  // /account uses these to show "tu reembolso de €X está en camino" on
  // canceled subs, so the message survives reloads.
  refundedAt: string | null;
  refundAmountCents: number | null;
  refundCurrency: string | null;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  isStarter: boolean;
  isProfessional: boolean;
  isProfessionalMax: boolean;
  isEnterprise: boolean;
  isPaid: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  isAdmin: boolean;
  trialDaysLeft: number | null;
  canGenerateImagery: boolean;
  imageryUsagePercent: number;
  refresh: () => Promise<void>;
  checkoutPlan: (plan: PlanId, annual?: boolean) => Promise<void>;
  buyCreditPack: (pack: 'pack_50' | 'pack_250' | 'pack_1000') => Promise<void>;
  openPortal: () => Promise<void>;
}

// Trial defaults — full access for 14 days, same imagery limit as Starter
const TRIAL_DEFAULTS: SubscriptionData = {
  plan: 'trial',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  limits: {
    collections: -1,
    imageryGenerations: 200,
    users: 1,
    exportEnabled: true,
    aiVideoEnabled: false,
    apiAccessEnabled: false,
    ssoEnabled: false,
  },
  trialEndsAt: null,
  isAdmin: false,
  usage: { imagery: 0, month: '' },
  packBalance: 0,
  refundedAt: null,
  refundAmountCents: null,
  refundCurrency: null,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(TRIAL_DEFAULTS);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/billing/subscription');

      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        setSubscription(TRIAL_DEFAULTS);
      }
    } catch {
      setSubscription(TRIAL_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Listen for subscription changes in Supabase
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchSubscription();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchSubscription, supabase]);

  const plan = subscription?.plan || 'trial';
  const isAdmin = subscription?.isAdmin || false;
  const isStarter = plan === 'starter' || plan === 'professional' || plan === 'professional_max' || plan === 'enterprise';
  const isProfessional = plan === 'professional' || plan === 'professional_max' || plan === 'enterprise';
  const isProfessionalMax = plan === 'professional_max' || plan === 'enterprise';
  const isEnterprise = plan === 'enterprise';
  const isPaid = plan !== 'trial';
  const isTrial = plan === 'trial';

  const isTrialExpired = useMemo(() => {
    if (isAdmin) return false;
    return isTrial && !!subscription?.trialEndsAt && new Date(subscription.trialEndsAt) < new Date();
  }, [isTrial, subscription?.trialEndsAt, isAdmin]);

  const trialDaysLeft = useMemo(() => {
    if (!isTrial || !subscription?.trialEndsAt || isAdmin) return null;
    return Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [isTrial, subscription?.trialEndsAt, isAdmin]);

  const limits = subscription?.limits || TRIAL_DEFAULTS.limits;
  const imageryUsed = subscription?.usage?.imagery || 0;
  const imageryLimit = limits.imageryGenerations;
  const packBalance = subscription?.packBalance || 0;
  const canGenerateImagery = isAdmin || imageryLimit === -1 || imageryUsed < imageryLimit || packBalance > 0;
  const imageryUsagePercent = imageryLimit === -1 ? 0 : Math.round((imageryUsed / imageryLimit) * 100);

  const checkoutPlan = async (targetPlan: PlanId, annual?: boolean) => {
    if (!user) return;
    track(Events.CHECKOUT_OPENED, { plan: targetPlan, annual: !!annual });

    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: targetPlan, annual }),
    });

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const buyCreditPack = async (pack: 'pack_50' | 'pack_250' | 'pack_1000') => {
    if (!user) return;
    track(Events.CREDIT_PACK_OPENED, { pack });

    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack }),
    });

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const openPortal = async () => {
    if (!user) return;

    const res = await fetch('/api/billing/portal', {
      method: 'POST',
    });

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      isStarter,
      isProfessional,
      isProfessionalMax,
      isEnterprise,
      isPaid,
      isTrial,
      isTrialExpired,
      isAdmin,
      trialDaysLeft,
      canGenerateImagery,
      imageryUsagePercent,
      refresh: fetchSubscription,
      checkoutPlan,
      buyCreditPack,
      openPortal,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
