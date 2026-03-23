'use client';

import { useTranslation } from '@/i18n';
import { HorizontalSlideshow } from '@/components/how-it-works/HorizontalSlideshow';

export default function HowItWorksPage() {
  const t = useTranslation();

  return (
    <div className="bg-carbon min-h-screen">
      {/* Slideshow */}
      <HorizontalSlideshow mode="page" t={t.howItWorksPage} />
    </div>
  );
}
