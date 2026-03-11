'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';

type PlanId = 'trial' | 'starter' | 'professional' | 'enterprise';

interface PlanLimits {
  collections: number;
  aiGenerations: number;
  users: number;
  exportEnabled: boolean;
  trendsEnabled: boolean;
  trendAlertsEnabled: boolean;
  goToMarketEnabled: boolean;
  aiModelsEnabled: boolean;
  aiVideoEnabled: boolean;
  collaborationEnabled: boolean;
  rolesEnabled: boolean;
  multiBrandEnabled: boolean;
  lookbookEnabled: boolean;
  techPackPdfEnabled: boolean;
  ssoEnabled: boolean;
  apiAccessEnabled: boolean;
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
  isStarter: boolean;
  isProfessional: boolean;
  isEnterprise: boolean;
  isPaid: boolean;
  isTrial: boolean;
  canUseAI: boolean;
  aiUsagePercent: number;
  refresh: () => Promise<void>;
  checkoutPlan: (plan: PlanId, annual?: boolean) => Promise<void>;
  openPortal: () => Promise<void>;
  trackAIUsage: () => Promise<boolean>;
}

// Trial defaults — full access for 14 days
const TRIAL_LIMITS: PlanLimits = {
  collections: -1,
  aiGenerations: 250,
  users: 10,
  exportEnabled: true,
  trendsEnabled: true,
  trendAlertsEnabled: true,
  goToMarketEnabled: true,
  aiModelsEnabled: true,
  aiVideoEnabled: true,
  collaborationEnabled: true,
  rolesEnabled: true,
  multiBrandEnabled: false,
  lookbookEnabled: true,
  techPackPdfEnabled: true,
  ssoEnabled: false,
  apiAccessEnabled: false,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription({
        plan: 'trial',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: TRIAL_LIMITS,
        usage: { aiGenerations: 0, month: '' },
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/billing/subscription');

      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        // No subscription yet — default to trial
        setSubscription({
          plan: 'trial',
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          limits: TRIAL_LIMITS,
          usage: { aiGenerations: 0, month: '' },
        });
      }
    } catch {
      setSubscription({
        plan: 'trial',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: TRIAL_LIMITS,
        usage: { aiGenerations: 0, month: '' },
      });
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
  }, [user?.id, fetchSubscription]);

  const plan = subscription?.plan || 'trial';
  const isStarter = plan === 'starter' || plan === 'professional' || plan === 'enterprise';
  const isProfessional = plan === 'professional' || plan === 'enterprise';
  const isEnterprise = plan === 'enterprise';
  const isPaid = plan !== 'trial';
  const isTrial = plan === 'trial';

  const limits = subscription?.limits || TRIAL_LIMITS;
  const aiUsed = subscription?.usage?.aiGenerations || 0;
  const aiLimit = limits.aiGenerations;
  const canUseAI = aiLimit === -1 || aiUsed < aiLimit;
  const aiUsagePercent = aiLimit === -1 ? 0 : Math.round((aiUsed / aiLimit) * 100);

  const checkoutPlan = async (targetPlan: PlanId, annual?: boolean) => {
    if (!user) return;

    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: targetPlan, annual }),
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

  const trackAIUsage = async (): Promise<boolean> => {
    if (!user) return false;

    const res = await fetch('/api/billing/usage', {
      method: 'POST',
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
      isStarter,
      isProfessional,
      isEnterprise,
      isPaid,
      isTrial,
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
