'use client';

import { useRouter } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Zap, ArrowRight, Clock } from 'lucide-react';

interface UpgradePromptProps {
  feature?: string;
  featureEs?: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  const router = useRouter();
  const { subscription, aiUsagePercent, isTrial } = useSubscription();

  const plan = subscription?.plan || 'trial';
  const limit = subscription?.limits.aiGenerations || 100;
  const used = subscription?.usage.aiGenerations || 0;

  return (
    <div className="bg-gradient-to-r from-[#282A29] to-[#282A29]/80 rounded-2xl p-6 text-white">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          {isTrial ? <Clock className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base mb-1">
            {isTrial ? 'Choose a plan' : 'Upgrade your plan'}
          </h3>
          <p className="text-white/70 text-sm mb-3">
            {isTrial
              ? 'Your 14-day trial gives you full access. Choose a plan to continue after.'
              : feature
                ? `Unlock ${feature} and more with a higher plan.`
                : `You've used ${used}/${limit === -1 ? '∞' : limit} AI generations this month.`}
          </p>

          {/* Usage bar */}
          {limit !== -1 && !isTrial && (
            <div className="w-full bg-white/10 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all ${
                  aiUsagePercent >= 90 ? 'bg-red-400' : aiUsagePercent >= 70 ? 'bg-yellow-400' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(aiUsagePercent, 100)}%` }}
              />
            </div>
          )}

          <button
            onClick={() => router.push('/pricing')}
            className="inline-flex items-center gap-2 bg-white text-[#282A29] px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/90 transition-colors"
          >
            {isTrial ? 'View plans' : 'Upgrade'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline usage badge for navbars or headers
export function AIUsageBadge() {
  const { subscription, aiUsagePercent, canUseAI } = useSubscription();
  const limit = subscription?.limits.aiGenerations || 100;
  const used = subscription?.usage.aiGenerations || 0;

  if (limit === -1) return null; // Unlimited

  return (
    <div className={`text-xs px-2 py-1 rounded-full font-medium ${
      !canUseAI
        ? 'bg-red-100 text-red-700'
        : aiUsagePercent >= 70
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-green-100 text-green-700'
    }`}>
      <Zap className="w-3 h-3 inline mr-1" />
      {used}/{limit} AI
    </div>
  );
}
