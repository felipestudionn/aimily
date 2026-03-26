'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTranslation } from '@/i18n';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  Check,
  X,
  Rocket,
  Building2,
  Crown,
  ArrowRight,
  Clock,
  Shield,
  Sparkles,
} from 'lucide-react';

type PlanId = 'starter' | 'professional' | 'enterprise';

type FeatureKey = 'featUsers' | 'featActiveCollections' | 'featAIGenerations' | 'featSketchFlow' | 'featAIModelGenerator' | 'featAIVideo' | 'featTrendAnalytics' | 'featTrendAlerts' | 'featTimelineGantt' | 'featTechPacks' | 'featGTMPlanning' | 'featCreativeSpace' | 'featLookbookBuilder' | 'featRealtimeCollab' | 'featRolesPermissions' | 'featMultiBrand' | 'featSSO' | 'featAPIAccess' | 'featSupport' | 'featOnboarding';
type ValueKey = 'unlimited' | 'emailSupport' | 'prioritySupport' | 'dedicatedSupport' | 'selfServe' | 'oneSession' | 'threeSessions';

interface FeatureRow {
  labelKey: FeatureKey;
  starter: boolean | string | ValueKey;
  professional: boolean | string | ValueKey;
  enterprise: boolean | string | ValueKey;
}

const VALUE_KEYS: ValueKey[] = ['unlimited', 'emailSupport', 'prioritySupport', 'dedicatedSupport', 'selfServe', 'oneSession', 'threeSessions'];

const FEATURES: FeatureRow[] = [
  { labelKey: 'featUsers', starter: '1', professional: '10', enterprise: 'unlimited' },
  { labelKey: 'featActiveCollections', starter: '2', professional: 'unlimited', enterprise: 'unlimited' },
  { labelKey: 'featAIGenerations', starter: '100', professional: '500', enterprise: 'unlimited' },
  { labelKey: 'featSketchFlow', starter: true, professional: true, enterprise: true },
  { labelKey: 'featAIModelGenerator', starter: true, professional: true, enterprise: true },
  { labelKey: 'featAIVideo', starter: true, professional: true, enterprise: true },
  { labelKey: 'featTrendAnalytics', starter: true, professional: true, enterprise: true },
  { labelKey: 'featTrendAlerts', starter: false, professional: true, enterprise: true },
  { labelKey: 'featTimelineGantt', starter: true, professional: true, enterprise: true },
  { labelKey: 'featTechPacks', starter: true, professional: true, enterprise: true },
  { labelKey: 'featGTMPlanning', starter: true, professional: true, enterprise: true },
  { labelKey: 'featCreativeSpace', starter: true, professional: true, enterprise: true },
  { labelKey: 'featLookbookBuilder', starter: true, professional: true, enterprise: true },
  { labelKey: 'featRealtimeCollab', starter: false, professional: true, enterprise: true },
  { labelKey: 'featRolesPermissions', starter: false, professional: true, enterprise: true },
  { labelKey: 'featMultiBrand', starter: false, professional: true, enterprise: true },
  { labelKey: 'featSSO', starter: false, professional: false, enterprise: true },
  { labelKey: 'featAPIAccess', starter: false, professional: false, enterprise: true },
  { labelKey: 'featSupport', starter: 'emailSupport', professional: 'prioritySupport', enterprise: 'dedicatedSupport' },
  { labelKey: 'featOnboarding', starter: 'selfServe', professional: 'oneSession', enterprise: 'threeSessions' },
];

const PLANS = [
  {
    id: 'starter' as PlanId,
    nameKey: 'starter' as const,
    descKey: 'starterDesc' as const,
    taglineKey: 'starterTagline' as const,
    icon: Rocket,
    price: 199,
    priceAnnual: 159,
  },
  {
    id: 'professional' as PlanId,
    nameKey: 'professional' as const,
    descKey: 'professionalDesc' as const,
    taglineKey: 'professionalTagline' as const,
    icon: Building2,
    price: 599,
    priceAnnual: 479,
    popular: true,
  },
  {
    id: 'enterprise' as PlanId,
    nameKey: 'enterprise' as const,
    descKey: 'enterpriseDesc' as const,
    taglineKey: 'enterpriseTagline' as const,
    icon: Crown,
    price: null as number | null, // custom
    priceAnnual: null as number | null,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { subscription, checkoutPlan, isPaid, openPortal } = useSubscription();
  const router = useRouter();
  const t = useTranslation();
  const [annual, setAnnual] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  /** Resolve a feature cell value — translate ValueKeys, pass through numbers/booleans */
  const resolveValue = (val: boolean | string | ValueKey): boolean | string => {
    if (typeof val === 'boolean') return val;
    if (VALUE_KEYS.includes(val as ValueKey)) return t.pricingPage[val as ValueKey];
    return val; // plain number strings like '1', '10', '100', '500'
  };

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    if (!user) {
      setShowAuth(true);
      return;
    }

    if (planId === subscription?.plan) return;

    setLoadingPlan(planId);
    try {
      await checkoutPlan(planId, annual);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />

      <div className="pt-28 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-light text-carbon tracking-tight mb-3">
            {t.pricingPage.title}
          </h1>
          <p className="text-lg text-carbon/60 mb-2">
            {t.pricingPage.subtitle}
          </p>
        </div>

        {/* Trial banner */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-carbon text-white rounded-md px-6 py-4 flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-md shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {t.pricingPage.trialTitle}
              </p>
              <p className="text-white/70 text-xs">
                {t.pricingPage.trialSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle annual/monthly */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm ${!annual ? 'text-carbon font-medium' : 'text-carbon/50'}`}>
            {t.landing.monthly}
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              annual ? 'bg-carbon' : 'bg-carbon/30'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                annual ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span className={`text-sm ${annual ? 'text-carbon font-medium' : 'text-carbon/50'}`}>
            {t.landing.annual}
          </span>
          {annual && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {t.landing.savePercent}
            </span>
          )}
        </div>

        {/* Plans grid — 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => {
            const price = annual ? plan.priceAnnual : plan.price;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-md p-6 border transition-all hover:shadow-lg ${
                  plan.popular
                    ? 'border-carbon shadow-md'
                    : 'border-carbon/10'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-carbon text-white text-xs px-3 py-1 rounded-full font-medium">
                    {t.landing.mostPopular}
                  </div>
                )}

                <div className="mb-4">
                  <plan.icon className="w-8 h-8 text-carbon mb-3" />
                  <h3 className="text-xl font-light text-carbon tracking-tight">{t.landing[plan.nameKey]}</h3>
                  <p className="text-sm text-carbon/50 mt-1">
                    {t.landing[plan.descKey]}
                  </p>
                  <p className="text-xs text-carbon/40 mt-0.5 italic">
                    {t.landing[plan.taglineKey]}
                  </p>
                </div>

                <div className="mb-6">
                  {price !== null ? (
                    <>
                      <span className="text-4xl font-light text-carbon tracking-tight">
                        {price}€
                      </span>
                      <span className="text-carbon/50 text-sm">
                        {t.landing.perMonth}
                      </span>
                      {annual && (
                        <div className="text-xs text-carbon/40 mt-1">
                          {price * 12}€{t.landing.perYear}{' '}
                          <span className="line-through text-carbon/30">
                            {plan.price! * 12}€
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-light text-carbon tracking-tight">{t.landing.custom}</span>
                      <div className="text-xs text-carbon/40 mt-1">
                        {t.landing.customFrom}
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-2.5 px-4 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                      : plan.popular
                        ? 'bg-carbon text-white hover:bg-carbon/90'
                        : 'bg-carbon/5 text-carbon hover:bg-carbon/10'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isCurrent ? (
                    <>{t.pricingPage.currentPlan}</>
                  ) : plan.id === 'enterprise' ? (
                    <>
                      {t.landing.contactSales}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      {t.common.startFreeTrial}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Quick feature highlights */}
                <ul className="mt-6 space-y-2.5">
                  {FEATURES.slice(0, 8).map((feature, i) => {
                    const rawValue = feature[plan.id];
                    const resolved = resolveValue(rawValue);
                    const included = resolved !== false;

                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {included ? (
                          <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-carbon/20 mt-0.5 shrink-0" />
                        )}
                        <span className={included ? 'text-carbon' : 'text-carbon/30'}>
                          {typeof resolved === 'string'
                            ? `${t.pricingPage[feature.labelKey]}: ${resolved}`
                            : t.pricingPage[feature.labelKey]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Full feature comparison table */}
        <div className="bg-white rounded-md border border-carbon/10 overflow-hidden mb-16">
          <div className="px-6 py-4 border-b border-carbon/10">
            <h2 className="text-lg font-light text-carbon tracking-tight">
              {t.pricingPage.fullComparison}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-carbon/10">
                  <th className="text-left text-sm font-medium text-carbon/50 px-6 py-3 w-1/3">
                    {t.pricingPage.feature}
                  </th>
                  <th className="text-center text-sm font-medium text-carbon px-4 py-3">{t.landing.starter}</th>
                  <th className="text-center text-sm font-medium text-carbon px-4 py-3 bg-carbon/5">{t.landing.professional}</th>
                  <th className="text-center text-sm font-medium text-carbon px-4 py-3">{t.landing.enterprise}</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-carbon/[0.02]'}>
                    <td className="text-sm text-carbon px-6 py-2.5">
                      {t.pricingPage[feature.labelKey]}
                    </td>
                    {(['starter', 'professional', 'enterprise'] as PlanId[]).map((planId) => {
                      const resolved = resolveValue(feature[planId]);
                      return (
                        <td
                          key={planId}
                          className={`text-center text-sm px-4 py-2.5 ${
                            planId === 'professional' ? 'bg-carbon/5' : ''
                          }`}
                        >
                          {typeof resolved === 'string' ? (
                            <span className="text-carbon font-medium">{resolved}</span>
                          ) : resolved ? (
                            <Check className="w-4 h-4 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-carbon/20 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Value proposition */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-medium text-carbon text-center mb-8">
            {t.pricingPage.replaceTools}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { tool: t.pricingPage.toolPLM, cost: '€597/mo', icon: Shield },
              { tool: t.pricingPage.toolSketch, cost: '€560/mo', icon: Sparkles },
              { tool: t.pricingPage.toolPhoto, cost: '€500/mo', icon: Sparkles },
              { tool: t.pricingPage.toolVideo, cost: '€330/mo', icon: Sparkles },
              { tool: t.pricingPage.toolTrend, cost: '€1,500/mo', icon: Sparkles },
              { tool: t.pricingPage.toolTimeline, cost: '€57/mo', icon: Clock },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/60 rounded-md px-4 py-3">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-carbon">{item.tool}</span>
                </div>
                <span className="text-sm text-carbon/40 line-through">{item.cost}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <p className="text-carbon/50 text-sm">
              {t.pricingPage.totalSeparateTools}
            </p>
            <p className="text-carbon font-bold text-lg mt-1">
              {t.pricingPage.aimilyFromSave}
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="text-center">
          <p className="text-carbon/50 text-sm">
            {t.landing.allPlansNote}
            <br />
            <span className="text-carbon/30 text-xs">
              {t.landing.pricesExclVat}
            </span>
          </p>
          {isPaid && (
            <button
              onClick={() => openPortal()}
              className="mt-4 text-sm text-carbon/50 hover:text-carbon underline transition-colors"
            >
              {t.pricingPage.manageSubscription}
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
