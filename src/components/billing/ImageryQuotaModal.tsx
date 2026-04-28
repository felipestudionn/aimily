'use client';

import { useRouter } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Zap, ArrowRight, X } from 'lucide-react';

interface ImageryQuotaModalProps {
  open: boolean;
  onClose: () => void;
}

const NEXT_PLAN_HINT: Record<string, { name: string; imagery: number }> = {
  trial: { name: 'Starter', imagery: 200 },
  starter: { name: 'Professional', imagery: 1000 },
  professional: { name: 'Professional Max', imagery: 5000 },
  professional_max: { name: 'Enterprise', imagery: -1 },
};

const PACKS = [
  { id: 'pack_50' as const, imagery: 50, price: 29 },
  { id: 'pack_250' as const, imagery: 250, price: 119 },
  { id: 'pack_1000' as const, imagery: 1000, price: 399 },
];

export function ImageryQuotaModal({ open, onClose }: ImageryQuotaModalProps) {
  const router = useRouter();
  const { subscription, buyCreditPack } = useSubscription();

  if (!open) return null;

  const plan = subscription?.plan || 'trial';
  const next = NEXT_PLAN_HINT[plan];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-carbon/40 hover:text-carbon"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-carbon" />
          <h2 className="text-xl font-medium text-carbon tracking-tight">
            You&apos;ve used all your imagery this month
          </h2>
        </div>

        <p className="text-sm text-carbon/60 mb-6 leading-relaxed">
          Text generation, research and analysis keep working. To resume image generation,
          upgrade your plan or grab an Aimily Credits pack.
        </p>

        {/* Upgrade option (recommended) */}
        {next && plan !== 'enterprise' && (
          <div className="border-2 border-carbon rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-carbon/50 font-medium">
                Recommended
              </span>
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                Best value
              </span>
            </div>
            <h3 className="text-base font-medium text-carbon mb-1">
              Upgrade to {next.name}
            </h3>
            <p className="text-xs text-carbon/60 mb-3">
              {next.imagery === -1 ? 'Unlimited imagery' : `${next.imagery.toLocaleString()} imagery / month`} · activated instantly
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full py-2.5 px-4 bg-carbon text-white rounded-md text-sm font-medium hover:bg-carbon/90 transition-colors flex items-center justify-center gap-2"
            >
              View plans <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Aimily Credits pack option */}
        <div className="border border-carbon/15 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-carbon/50 font-medium">
              One-time top-up
            </span>
          </div>
          <h3 className="text-base font-medium text-carbon mb-1">Aimily Credits</h3>
          <p className="text-xs text-carbon/60 mb-3">
            For occasional spikes. Added to your balance, no subscription.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => buyCreditPack(pack.id)}
                className="border border-carbon/15 rounded-md p-3 hover:border-carbon hover:bg-carbon/5 transition-colors text-center"
              >
                <div className="text-lg font-medium text-carbon">+{pack.imagery}</div>
                <div className="text-xs text-carbon/60 mt-0.5">€{pack.price}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
