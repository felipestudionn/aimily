'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import Paywall from './Paywall';
import TrialBanner from './TrialBanner';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export default function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { isTrialExpired, trialDaysLeft, isAdmin, loading } = useSubscription();

  if (loading) return null;

  if (isAdmin) return <>{children}</>;

  if (isTrialExpired) return <Paywall />;

  return (
    <>
      {trialDaysLeft !== null && trialDaysLeft <= 5 && (
        <TrialBanner daysLeft={trialDaysLeft} />
      )}
      {children}
    </>
  );
}
