'use client';

import { useOnboarding } from './useOnboarding';
import { HorizontalSlideshow } from '@/components/how-it-works/HorizontalSlideshow';
import { useTranslation } from '@/i18n';

export function OnboardingModal() {
  const { showOnboarding, dismiss } = useOnboarding();
  const t = useTranslation();

  if (!showOnboarding) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-carbon">
      <HorizontalSlideshow mode="onboarding" t={t.howItWorksPage} onSkip={dismiss} />
    </div>
  );
}
