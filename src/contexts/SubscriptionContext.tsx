'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

type PlanId = 'free' | 'pro' | 'business' | 'enterprise';

interface PlanLimits {
  collections: number;
  aiGenerations: number;
  users: number;
  exportEnabled: boolean;
  trendsEnabled: boolean;
  goToMarketEnabled: boolean;
}

interface SubscriptionData {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
  usage: {
    aiGenerations: number;
    month: string;
  };
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  isPro: boolean;
  isBusiness: boolean;
  isEnterprise: boolean;
  isPaid: boolean;
  canUseAI: boolean;
  aiUsagePercent: number;
  refresh: () => Promise<void>;
  checkoutPlan: (plan: PlanId, annual?: boolean) => Promise<void>;
  openPortal: () => Promise<void>;
  trackAIUsage: () => Promise<boolean>;
}

const DEFAULT_LIMITS: PlanLimits = {
  collections: 1,
  aiGenerations: 10,
  users: 1,
  exportEnabled: false,
  trendsEnabled: false,
  goToMarketEnabled: false,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription({
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: DEFAULT_LIMITS,
        usage: { aiGenerations: 0, month: '' },
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        // No subscription yet — default to free
        setSubscription({
          plan: 'free',
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          limits: DEFAULT_LIMITS,
          usage: { aiGenerations: 0, month: '' },
        });
      }
    } catch {
      setSubscription({
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: DEFAULT_LIMITS,
        usage: { aiGenerations: 0, month: '' },
      });
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

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
  }, [user?.id, fetchSubscription]);

  const plan = subscription?.plan || 'free';
  const isPro = plan === 'pro' || plan === 'business' || plan === 'enterprise';
  const isBusiness = plan === 'business' || plan === 'enterprise';
  const isEnterprise = plan === 'enterprise';
  const isPaid = plan !== 'free';

  const limits = subscription?.limits || DEFAULT_LIMITS;
  const aiUsed = subscription?.usage?.aiGenerations || 0;
  const aiLimit = limits.aiGenerations;
  const canUseAI = aiLimit === -1 || aiUsed < aiLimit;
  const aiUsagePercent = aiLimit === -1 ? 0 : Math.round((aiUsed / aiLimit) * 100);

  const checkoutPlan = async (targetPlan: PlanId, annual?: boolean) => {
    if (!session?.access_token) return;

    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan: targetPlan, annual }),
    });

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const openPortal = async () => {
    if (!session?.access_token) return;

    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const trackAIUsage = async (): Promise<boolean> => {
    if (!session?.access_token) return false;

    const res = await fetch('/api/billing/usage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const data = await res.json();

    if (!data.allowed) {
      return false;
    }

    // Update local state
    if (subscription) {
      setSubscription({
        ...subscription,
        usage: {
          ...subscription.usage,
          aiGenerations: data.current,
        },
      });
    }

    return true;
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      isPro,
      isBusiness,
      isEnterprise,
      isPaid,
      canUseAI,
      aiUsagePercent,
      refresh: fetchSubscription,
      checkoutPlan,
      openPortal,
      trackAIUsage,
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
