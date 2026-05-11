'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import Paywall from './Paywall';
import TrialBanner from './TrialBanner';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export default function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { isTrialExpired, trialDaysLeft, isAdmin, loading } = useSubscription();

  // Render children optimistically during subscription load so the page
  // shell (Navbar + spinner) stays mounted instead of flashing to a blank
  // screen. TrialBanner + Paywall are gated behind `!loading` so they only
  // appear once we know the real subscription state. Children handle their
  // own loading state for the data they fetch.
  if (!loading && !isAdmin && isTrialExpired) return <Paywall />;

  return (
    <>
      {!loading && trialDaysLeft !== null && trialDaysLeft <= 5 && (
        <TrialBanner daysLeft={trialDaysLeft} />
      )}
      {children}
    </>
  );
}
