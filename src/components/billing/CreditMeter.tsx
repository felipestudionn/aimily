'use client';

import { useState } from 'react';
import { Zap, X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Floating credits meter — top-right corner, sibling of StudioSwitcher.
 *
 * Felipe 2026-05-20 night · all three products (Aimily 360, Studio,
 * In-Season) share the same monthly credits bucket. This widget tells
 * the customer at a glance: how many credits I have left this month,
 * how much each action costs, and where to top up or upgrade.
 *
 * Hidden for admins (unlimited) and for users on free `trial` until they
 * pick a plan (they see TrialBanner instead, no need to double up).
 */

const COST_TABLE = [
  { action: 'sketch', es: '1 sketch · colorize · brand-ref', en: '1 sketch · colorize · brand-ref', credits: 1 },
  { action: 'still_life', es: '1 still life · try-on', en: '1 still life · try-on', credits: 3 },
  { action: 'editorial', es: '1 editorial (foto modelo)', en: '1 editorial (model photo)', credits: 5 },
  { action: 'in_season_run', es: '1 análisis In-Season', en: '1 In-Season analysis', credits: 10 },
  { action: 'video_kling', es: '1 vídeo Kling 2.1 Pro', en: '1 Kling 2.1 Pro video', credits: 30 },
];

export function CreditMeter() {
  const { subscription, isAdmin, isTrial, loading } = useSubscription();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  if (loading || !subscription) return null;
  if (isAdmin) return null;
  // Trial users see the TrialBanner — no need for credit meter until they pay.
  if (isTrial) return null;

  const limit = subscription.limits.imageryGenerations;
  const used = subscription.usage.imagery ?? 0;
  const packBalance = subscription.packBalance ?? 0;
  const planRemaining = Math.max(0, limit - used);
  const totalAvailable = planRemaining + packBalance;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isLow = totalAvailable < 20;

  const t = {
    creditsLeft: language === 'es' ? 'créditos' : 'credits',
    title: language === 'es' ? 'Tus Aimily Credits' : 'Your Aimily Credits',
    planLabel: language === 'es' ? 'Plan mensual' : 'Monthly plan',
    packLabel: language === 'es' ? 'Packs (top-ups)' : 'Top-up packs',
    costsTitle: language === 'es' ? 'Cuánto cuesta cada acción' : 'What each action costs',
    buyPack: language === 'es' ? 'Comprar más créditos' : 'Buy more credits',
    upgrade: language === 'es' ? 'Subir de plan' : 'Upgrade plan',
    close: language === 'es' ? 'Cerrar' : 'Close',
    of: language === 'es' ? 'de' : 'of',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed top-4 right-[260px] z-50 inline-flex items-center gap-1.5 rounded-full bg-white border shadow-sm px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-carbon/30 ${
          isLow ? 'border-rose-200 text-rose-700' : 'border-carbon/[0.08] text-carbon/70'
        }`}
        aria-label={t.title}
      >
        <Zap className={`h-3.5 w-3.5 ${isLow ? 'text-rose-500' : 'text-carbon/45'}`} />
        <span className="tabular-nums">{totalAvailable}</span>
        <span className="text-carbon/35">{t.creditsLeft}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-carbon/30 backdrop-blur-sm flex items-start justify-end px-4 py-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-[20px] shadow-2xl w-full max-w-[460px] p-6 mt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
                  {t.title}
                </h3>
                <p className="text-[12px] text-carbon/45 mt-0.5">
                  Plan · {subscription.plan === 'founder' ? 'Founder' : subscription.plan === 'team' ? 'Team' : subscription.plan === 'team_pro' ? 'Team Pro' : subscription.plan === 'enterprise' ? 'Enterprise' : 'Student'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-carbon/40 hover:text-carbon hover:bg-carbon/[0.04] transition-colors"
                aria-label={t.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-[14px] bg-carbon/[0.03] p-4 mb-5">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[32px] font-light tabular-nums tracking-tight">{totalAvailable}</span>
                <span className="text-[13px] text-carbon/55">{t.creditsLeft}</span>
              </div>
              <div className="h-1.5 rounded-full bg-carbon/[0.06] overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all ${isLow ? 'bg-rose-500' : 'bg-carbon'}`}
                  style={{ width: `${100 - pct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-carbon/40 uppercase tracking-[0.06em] text-[10px]">{t.planLabel}</div>
                  <div className="text-carbon tabular-nums">
                    {planRemaining}/{limit} {t.creditsLeft}
                  </div>
                </div>
                <div>
                  <div className="text-carbon/40 uppercase tracking-[0.06em] text-[10px]">{t.packLabel}</div>
                  <div className="text-carbon tabular-nums">+{packBalance}</div>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-carbon/40 mb-2 font-medium">
                {t.costsTitle}
              </div>
              <div className="space-y-1.5">
                {COST_TABLE.map((row) => (
                  <div key={row.action} className="flex items-center justify-between text-[12.5px] py-1">
                    <span className="text-carbon/70">{language === 'es' ? row.es : row.en}</span>
                    <span className="tabular-nums text-carbon font-medium">
                      {row.credits} {t.creditsLeft}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href="/account"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 transition-colors"
              >
                {t.buyPack}
              </a>
              <a
                href="/pricing"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full border border-carbon/[0.12] text-carbon/70 text-[12px] font-semibold hover:bg-carbon/[0.04] transition-colors"
              >
                {t.upgrade}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
