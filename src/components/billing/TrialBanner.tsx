'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';

interface TrialBannerProps {
  daysLeft: number;
}

export default function TrialBanner({ daysLeft }: TrialBannerProps) {
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
        ? 'Your trial expires today!'
        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial`}
      {' — '}
      <Link href="/pricing" className={`underline font-semibold ${
        isUrgent ? 'text-white hover:text-red-100' : 'text-amber-900 hover:text-amber-800'
      }`}>
        Choose a plan
      </Link>
    </div>
  );
}
