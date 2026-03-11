'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
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

interface Feature {
  text: string;
  textEs: string;
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}

const FEATURES: Feature[] = [
  { text: 'Users', textEs: 'Usuarios', starter: '1', professional: '10', enterprise: 'Unlimited' },
  { text: 'Active collections', textEs: 'Colecciones activas', starter: '2', professional: 'Unlimited', enterprise: 'Unlimited' },
  { text: 'AI generations/month', textEs: 'Generaciones AI/mes', starter: '100', professional: '500', enterprise: 'Unlimited' },
  { text: 'SketchFlow (AI sketches)', textEs: 'SketchFlow (bocetos AI)', starter: true, professional: true, enterprise: true },
  { text: 'AI Model Generator', textEs: 'Generador de modelos AI', starter: true, professional: true, enterprise: true },
  { text: 'AI Video', textEs: 'Video AI', starter: true, professional: true, enterprise: true },
  { text: 'Trend Analytics', textEs: 'Analisis de tendencias', starter: true, professional: true, enterprise: true },
  { text: 'Trend alerts', textEs: 'Alertas de tendencias', starter: false, professional: true, enterprise: true },
  { text: 'Timeline / Gantt + export', textEs: 'Timeline / Gantt + exportar', starter: true, professional: true, enterprise: true },
  { text: 'Tech Packs + PDF export', textEs: 'Tech Packs + exportar PDF', starter: true, professional: true, enterprise: true },
  { text: 'Go-to-Market planning', textEs: 'Planificacion go-to-market', starter: true, professional: true, enterprise: true },
  { text: 'Creative Space', textEs: 'Creative Space', starter: true, professional: true, enterprise: true },
  { text: 'Lookbook Builder', textEs: 'Lookbook Builder', starter: true, professional: true, enterprise: true },
  { text: 'Real-time collaboration', textEs: 'Colaboracion en tiempo real', starter: false, professional: true, enterprise: true },
  { text: 'Roles & permissions', textEs: 'Roles y permisos', starter: false, professional: true, enterprise: true },
  { text: 'Multi-brand', textEs: 'Multi-marca', starter: false, professional: true, enterprise: true },
  { text: 'SSO', textEs: 'SSO', starter: false, professional: false, enterprise: true },
  { text: 'API access', textEs: 'Acceso API', starter: false, professional: false, enterprise: true },
  { text: 'Support', textEs: 'Soporte', starter: 'Email', professional: 'Priority', enterprise: 'Dedicated' },
  { text: 'Onboarding', textEs: 'Onboarding', starter: 'Self-serve', professional: '1 session', enterprise: '3 sessions' },
];

const PLANS = [
  {
    id: 'starter' as PlanId,
    name: 'Starter',
    icon: Rocket,
    price: 199,
    priceAnnual: 159,
    description: 'For founders & solo designers',
    descriptionEs: 'Para fundadores y disenadores independientes',
    tagline: '1 person, 1 brand',
    taglineEs: '1 persona, 1 marca',
  },
  {
    id: 'professional' as PlanId,
    name: 'Professional',
    icon: Building2,
    price: 599,
    priceAnnual: 479,
    description: 'For teams & growing brands',
    descriptionEs: 'Para equipos y marcas en crecimiento',
    tagline: '1 team, multiple brands',
    taglineEs: '1 equipo, varias marcas',
    popular: true,
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    icon: Crown,
    price: null, // custom
    priceAnnual: null,
    description: 'For established brands & departments',
    descriptionEs: 'Para marcas establecidas y departamentos',
    tagline: 'Multiple teams, full control',
    taglineEs: 'Multiples equipos, control total',
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
          <h1 className="text-4xl font-bold text-[#282A29] mb-3">
            {lang === 'es' ? 'Planes y Precios' : 'Plans & Pricing'}
          </h1>
          <p className="text-lg text-[#282A29]/60 mb-2">
            {lang === 'es'
              ? 'Todo lo que necesitas para gestionar tus colecciones con AI'
              : 'Everything you need to manage your collections with AI'}
          </p>
        </div>

        {/* Trial banner */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-[#282A29] text-white rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {lang === 'es' ? '14 dias de prueba gratis' : '14-day free trial'}
              </p>
              <p className="text-white/70 text-xs">
                {lang === 'es'
                  ? 'Acceso completo a todas las funcionalidades. Sin tarjeta de credito.'
                  : 'Full access to all features. No credit card required.'}
              </p>
            </div>
          </div>
        </div>

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
              {lang === 'es' ? 'Ahorra ~20%' : 'Save ~20%'}
            </span>
          )}
        </div>

        {/* Language toggle */}
        <div className="text-center mb-10">
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="text-xs text-[#282A29]/40 hover:text-[#282A29]/60 transition-colors"
          >
            {lang === 'en' ? 'Ver en Espanol' : 'View in English'}
          </button>
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
                    {lang === 'es' ? plan.descriptionEs : plan.description}
                  </p>
                  <p className="text-xs text-[#282A29]/40 mt-0.5 italic">
                    {lang === 'es' ? plan.taglineEs : plan.tagline}
                  </p>
                </div>

                <div className="mb-6">
                  {price !== null ? (
                    <>
                      <span className="text-4xl font-bold text-[#282A29]">
                        {price}€
                      </span>
                      <span className="text-[#282A29]/50 text-sm">
                        /{lang === 'es' ? 'mes' : 'mo'}
                      </span>
                      {annual && (
                        <div className="text-xs text-[#282A29]/40 mt-1">
                          {price * 12}€/{lang === 'es' ? 'ano' : 'year'}{' '}
                          <span className="line-through text-[#282A29]/30">
                            {plan.price! * 12}€
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-[#282A29]">Custom</span>
                      <div className="text-xs text-[#282A29]/40 mt-1">
                        {lang === 'es' ? 'Desde 1.500€/mes' : 'From €1,500/mo'}
                      </div>
                    </>
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
                  ) : plan.id === 'enterprise' ? (
                    <>
                      {lang === 'es' ? 'Contactar' : 'Contact sales'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      {lang === 'es' ? 'Empezar prueba gratis' : 'Start free trial'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Quick feature highlights */}
                <ul className="mt-6 space-y-2.5">
                  {FEATURES.slice(0, 8).map((feature, i) => {
                    const value = feature[plan.id];
                    const included = value !== false;

                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {included ? (
                          <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-[#282A29]/20 mt-0.5 shrink-0" />
                        )}
                        <span className={included ? 'text-[#282A29]' : 'text-[#282A29]/30'}>
                          {typeof value === 'string'
                            ? `${lang === 'es' ? feature.textEs : feature.text}: ${value}`
                            : (lang === 'es' ? feature.textEs : feature.text)}
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
        <div className="bg-white rounded-2xl border border-[#282A29]/10 overflow-hidden mb-16">
          <div className="px-6 py-4 border-b border-[#282A29]/10">
            <h2 className="text-lg font-bold text-[#282A29]">
              {lang === 'es' ? 'Comparativa completa' : 'Full comparison'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#282A29]/10">
                  <th className="text-left text-sm font-medium text-[#282A29]/50 px-6 py-3 w-1/3">
                    {lang === 'es' ? 'Funcionalidad' : 'Feature'}
                  </th>
                  <th className="text-center text-sm font-bold text-[#282A29] px-4 py-3">Starter</th>
                  <th className="text-center text-sm font-bold text-[#282A29] px-4 py-3 bg-[#282A29]/5">Professional</th>
                  <th className="text-center text-sm font-bold text-[#282A29] px-4 py-3">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-[#282A29]/[0.02]'}>
                    <td className="text-sm text-[#282A29] px-6 py-2.5">
                      {lang === 'es' ? feature.textEs : feature.text}
                    </td>
                    {(['starter', 'professional', 'enterprise'] as PlanId[]).map((planId) => {
                      const value = feature[planId];
                      return (
                        <td
                          key={planId}
                          className={`text-center text-sm px-4 py-2.5 ${
                            planId === 'professional' ? 'bg-[#282A29]/5' : ''
                          }`}
                        >
                          {typeof value === 'string' ? (
                            <span className="text-[#282A29] font-medium">{value}</span>
                          ) : value ? (
                            <Check className="w-4 h-4 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-[#282A29]/20 mx-auto" />
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
          <h2 className="text-2xl font-bold text-[#282A29] text-center mb-8">
            {lang === 'es'
              ? 'Reemplaza +5 herramientas por una sola plataforma'
              : 'Replace 5+ tools with one platform'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { tool: lang === 'es' ? 'PLM / gestion de colecciones' : 'PLM / collection management', cost: '€597/mo', icon: Shield },
              { tool: lang === 'es' ? 'Generacion de bocetos AI' : 'AI sketch generation', cost: '€560/mo', icon: Sparkles },
              { tool: lang === 'es' ? 'Fotografias de modelo AI' : 'AI model photography', cost: '€500/mo', icon: Sparkles },
              { tool: lang === 'es' ? 'Video AI' : 'AI video', cost: '€330/mo', icon: Sparkles },
              { tool: lang === 'es' ? 'Analisis de tendencias' : 'Trend analytics', cost: '€1,500/mo', icon: Sparkles },
              { tool: lang === 'es' ? 'Timeline y planificacion' : 'Timeline & planning', cost: '€57/mo', icon: Clock },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-[#282A29]">{item.tool}</span>
                </div>
                <span className="text-sm text-[#282A29]/40 line-through">{item.cost}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <p className="text-[#282A29]/50 text-sm">
              {lang === 'es'
                ? 'Total con herramientas separadas: ~€3.544/mes'
                : 'Total with separate tools: ~€3,544/mo'}
            </p>
            <p className="text-[#282A29] font-bold text-lg mt-1">
              {lang === 'es'
                ? 'aimily desde 159€/mes — ahorra un 95%'
                : 'aimily from €159/mo — save 95%'}
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="text-center">
          <p className="text-[#282A29]/50 text-sm">
            {lang === 'es'
              ? 'Todos los planes incluyen todas las herramientas AI. La diferencia es escala y colaboracion.'
              : 'All plans include every AI tool. The difference is scale and collaboration.'}
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
