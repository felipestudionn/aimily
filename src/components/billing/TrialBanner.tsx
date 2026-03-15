'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface TrialBannerProps {
  daysLeft: number;
}

export default function TrialBanner({ daysLeft }: TrialBannerProps) {
  const t = useTranslation();
  if (daysLeft > 5) return null;

  const isUrgent = daysLeft <= 2;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[60] px-4 py-2 text-center text-sm font-medium ${
      isUrgent
        ? 'bg-red-600 text-white'
        : 'bg-amber-400 text-amber-900'
    }`}>
      <Clock className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
      {daysLeft === 0
        ? t.billing.trialExpiresToday
        : `${daysLeft} ${daysLeft === 1 ? t.billing.dayLeft : t.billing.daysLeft}`}
      {' — '}
      <Link href="/pricing" className={`underline font-semibold ${
        isUrgent ? 'text-white hover:text-red-100' : 'text-amber-900 hover:text-amber-800'
      }`}>
        {t.billing.chooseAPlan}
      </Link>
    </div>
  );
}
