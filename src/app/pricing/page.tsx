'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Building2,
  Crown,
  ArrowRight,
} from 'lucide-react';

type PlanId = 'free' | 'pro' | 'business' | 'enterprise';

const PLANS = [
  {
    id: 'free' as PlanId,
    name: 'Free',
    icon: Sparkles,
    price: 0,
    priceAnnual: 0,
    description: 'Para explorar la plataforma',
    descriptionEn: 'Explore the platform',
    features: [
      { text: '1 collection', textEs: '1 coleccion', included: true },
      { text: '10 AI generations/month', textEs: '10 generaciones AI/mes', included: true },
      { text: '1 user', textEs: '1 usuario', included: true },
      { text: 'Basic timeline', textEs: 'Timeline basico', included: true },
      { text: 'Excel export', textEs: 'Exportar a Excel', included: false },
      { text: 'Trend analytics', textEs: 'Analisis de tendencias', included: false },
      { text: 'Go-to-market planning', textEs: 'Planificacion go-to-market', included: false },
    ],
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    icon: Zap,
    price: 49,
    priceAnnual: 39,
    description: 'Para disenadores independientes',
    descriptionEn: 'For independent designers',
    popular: true,
    features: [
      { text: 'Unlimited collections', textEs: 'Colecciones ilimitadas', included: true },
      { text: '100 AI generations/month', textEs: '100 generaciones AI/mes', included: true },
      { text: 'Up to 3 users', textEs: 'Hasta 3 usuarios', included: true },
      { text: 'Full Gantt timeline + export', textEs: 'Gantt completo + exportar', included: true },
      { text: 'Excel export', textEs: 'Exportar a Excel', included: true },
      { text: 'Trend analytics', textEs: 'Analisis de tendencias', included: true },
      { text: 'Go-to-market planning', textEs: 'Planificacion go-to-market', included: false },
    ],
  },
  {
    id: 'business' as PlanId,
    name: 'Business',
    icon: Building2,
    price: 299,
    priceAnnual: 199,
    description: 'Para marcas con equipo',
    descriptionEn: 'For brands with a team',
    features: [
      { text: 'Unlimited collections', textEs: 'Colecciones ilimitadas', included: true },
      { text: '500 AI generations/month', textEs: '500 generaciones AI/mes', included: true },
      { text: 'Up to 10 users', textEs: 'Hasta 10 usuarios', included: true },
      { text: 'Full Gantt timeline + export', textEs: 'Gantt completo + exportar', included: true },
      { text: 'Excel export', textEs: 'Exportar a Excel', included: true },
      { text: 'Advanced trend analytics', textEs: 'Tendencias avanzadas', included: true },
      { text: 'Go-to-market planning', textEs: 'Planificacion go-to-market', included: true },
    ],
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    icon: Crown,
    price: 499,
    priceAnnual: 399,
    description: 'Para marcas en crecimiento',
    descriptionEn: 'For growing brands',
    features: [
      { text: 'Unlimited collections', textEs: 'Colecciones ilimitadas', included: true },
      { text: 'Unlimited AI generations', textEs: 'Generaciones AI ilimitadas', included: true },
      { text: 'Unlimited users', textEs: 'Usuarios ilimitados', included: true },
      { text: 'Full Gantt timeline + export', textEs: 'Gantt completo + exportar', included: true },
      { text: 'Excel export', textEs: 'Exportar a Excel', included: true },
      { text: 'Advanced trend analytics', textEs: 'Tendencias avanzadas', included: true },
      { text: 'Go-to-market planning', textEs: 'Planificacion go-to-market', included: true },
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { subscription, checkoutPlan, isPaid, openPortal } = useSubscription();
  const router = useRouter();
  const [annual, setAnnual] = useState(true);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [showAuth, setShowAuth] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    if (planId === 'free') {
      router.push('/my-collections');
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#282A29] mb-3">
            {lang === 'es' ? 'Planes y Precios' : 'Plans & Pricing'}
          </h1>
          <p className="text-lg text-[#282A29]/60 mb-8">
            {lang === 'es'
              ? 'Elige el plan que mejor se adapte a tu marca'
              : 'Choose the plan that fits your brand'}
          </p>

          {/* Toggle annual/monthly */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className={`text-sm ${!annual ? 'text-[#282A29] font-medium' : 'text-[#282A29]/50'}`}>
              {lang === 'es' ? 'Mensual' : 'Monthly'}
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                annual ? 'bg-[#282A29]' : 'bg-[#282A29]/30'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                  annual ? 'translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`text-sm ${annual ? 'text-[#282A29] font-medium' : 'text-[#282A29]/50'}`}>
              {lang === 'es' ? 'Anual' : 'Annual'}
            </span>
            {annual && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {lang === 'es' ? 'Ahorra ~25%' : 'Save ~25%'}
              </span>
            )}
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="text-xs text-[#282A29]/40 hover:text-[#282A29]/60 transition-colors"
          >
            {lang === 'en' ? 'Ver en Espanol' : 'View in English'}
          </button>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const price = annual ? plan.priceAnnual : plan.price;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl p-6 border-2 transition-all hover:shadow-lg ${
                  plan.popular
                    ? 'border-[#282A29] shadow-md'
                    : 'border-[#282A29]/10'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#282A29] text-white text-xs px-3 py-1 rounded-full font-medium">
                    {lang === 'es' ? 'Mas popular' : 'Most popular'}
                  </div>
                )}

                <div className="mb-4">
                  <plan.icon className="w-8 h-8 text-[#282A29] mb-3" />
                  <h3 className="text-xl font-bold text-[#282A29]">{plan.name}</h3>
                  <p className="text-sm text-[#282A29]/50 mt-1">
                    {lang === 'es' ? plan.description : plan.descriptionEn}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-[#282A29]">
                    {price}€
                  </span>
                  {price > 0 && (
                    <span className="text-[#282A29]/50 text-sm">
                      /{lang === 'es' ? 'mes' : 'mo'}
                    </span>
                  )}
                  {price === 0 && (
                    <span className="text-[#282A29]/50 text-sm ml-1">
                      {lang === 'es' ? 'para siempre' : 'forever'}
                    </span>
                  )}
                  {annual && price > 0 && (
                    <div className="text-xs text-[#282A29]/40 mt-1">
                      {price * 12}€/{lang === 'es' ? 'ano' : 'year'}{' '}
                      <span className="line-through text-[#282A29]/30">
                        {plan.price * 12}€
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                      : plan.popular
                        ? 'bg-[#282A29] text-white hover:bg-[#282A29]/90'
                        : 'bg-[#282A29]/5 text-[#282A29] hover:bg-[#282A29]/10'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isCurrent ? (
                    <>{lang === 'es' ? 'Plan actual' : 'Current plan'}</>
                  ) : (
                    <>
                      {plan.id === 'free'
                        ? (lang === 'es' ? 'Empezar gratis' : 'Start free')
                        : (lang === 'es' ? 'Elegir plan' : 'Choose plan')}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-[#282A29]/20 mt-0.5 shrink-0" />
                      )}
                      <span className={feature.included ? 'text-[#282A29]' : 'text-[#282A29]/30'}>
                        {lang === 'es' ? feature.textEs : feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* FAQ / Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-[#282A29]/50 text-sm">
            {lang === 'es'
              ? 'Todos los planes incluyen SketchFlow, AI Studio, y Gantt Timeline.'
              : 'All plans include SketchFlow, AI Studio, and Gantt Timeline.'}
            <br />
            <span className="text-[#282A29]/30 text-xs">
              {lang === 'es'
                ? 'Precios sin IVA. Impuestos calculados en el checkout.'
                : 'Prices excl. VAT. Tax calculated at checkout.'}
            </span>
          </p>
          {isPaid && (
            <button
              onClick={() => openPortal()}
              className="mt-4 text-sm text-[#282A29]/50 hover:text-[#282A29] underline transition-colors"
            >
              {lang === 'es' ? 'Gestionar suscripcion' : 'Manage subscription'}
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
