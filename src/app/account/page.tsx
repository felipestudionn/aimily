'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/layout/navbar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { track } from '@/lib/posthog';

interface RefundEligibility {
  eligible: boolean;
  reason: string;
  daysRemaining?: number;
  amount?: number;
  currency?: string;
}

const SUPPORT_EMAIL = 'hello@aimily.app';

export default function AccountPage() {
  const { user, updatePassword, signOut } = useAuth();
  const { subscription, openPortal, imageryUsagePercent, refresh: refreshSubscription, loading: subLoading } = useSubscription();
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const dateFmtLocale = language === 'es' ? 'es-ES' : 'en-US';

  const PLAN_LABELS: Record<string, string> = {
    trial: t.account.planTrial,
    starter: t.account.planStarter,
    professional: t.account.planProfessional,
    professional_max: 'Professional Max',
    enterprise: t.account.planEnterprise,
  };

  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [exportLoading, setExportLoading] = useState(false);

  const [signOutLoading, setSignOutLoading] = useState(false);

  const [refundElig, setRefundElig] = useState<RefundEligibility | null>(null);
  const [refundStep, setRefundStep] = useState<0 | 1 | 2>(0); // 0=hidden, 1=confirm, 2=success
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundedAmount, setRefundedAmount] = useState<{ amount: number; currency: string } | null>(null);

  const [deleteStep, setDeleteStep] = useState(0); // 0=hidden, 1=confirm, 2=final
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError(t.auth.errPasswordMinChars);
      return;
    }
    if (!/\d/.test(newPassword)) {
      setPasswordError(t.auth.errPasswordNeedNumber);
      return;
    }

    setPasswordLoading(true);
    const { error } = await updatePassword(newPassword);
    setPasswordLoading(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aimily-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(t.account.exportFailed);
    } finally {
      setExportLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      track('sign_out');
      await signOut();
      router.push('/');
    } catch {
      setSignOutLoading(false);
    }
  };

  // Fetch refund eligibility once subscription is loaded.
  useEffect(() => {
    if (subLoading) return;
    if (!subscription || subscription.isAdmin || subscription.plan === 'trial') {
      setRefundElig(null);
      return;
    }
    fetch('/api/billing/refund-eligibility')
      .then(r => r.ok ? r.json() : null)
      .then((data) => setRefundElig(data))
      .catch(() => setRefundElig(null));
  }, [subLoading, subscription]);

  const handleRefund = async () => {
    setRefundLoading(true);
    setRefundError(null);
    try {
      track('refund_requested');
      const res = await fetch('/api/billing/refund', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRefundError(data.message || t.account.refundFailed);
        setRefundLoading(false);
        return;
      }
      // Refund processed + subscription canceled. Show success state in
      // place — no jarring page reload, no orphan toast on a stranger page.
      setRefundedAmount({ amount: data.refunded ?? 0, currency: data.currency ?? 'eur' });
      setRefundStep(2);
      setRefundElig(null);
      setRefundLoading(false);
      await refreshSubscription?.();
    } catch {
      setRefundError(t.account.refundFailed);
      setRefundLoading(false);
    }
  };

  const formatRefundAmount = (cents: number, currency: string) => {
    const amount = (cents / 100).toFixed(2);
    const symbol = currency.toLowerCase() === 'eur' ? '€' : currency.toUpperCase() + ' ';
    return `${symbol}${amount}`;
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) throw new Error('Delete failed');
      await signOut();
      window.location.href = '/?account_deleted=true';
    } catch {
      alert(t.account.deleteFailed);
      setDeleteLoading(false);
    }
  };

  const isOAuthUser = user?.app_metadata?.provider === 'google';
  const planKey = subscription?.plan || 'trial';
  const planLabel = PLAN_LABELS[planKey] || planKey;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(dateFmtLocale, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  // Billing CTA: depends on the user's billing state. Derived from BD
  // so it survives a full page reload (no in-memory state required).
  //   - admin            → no button + admin note (no Stripe customer)
  //   - trial            → "Ver planes" → /#pricing
  //   - canceled         → cancellation notice + "Ver planes" to resubscribe
  //   - active paid      → "Gestionar suscripción" → Stripe Portal
  const isCanceled = subscription?.status === 'canceled' || subscription?.status === 'unpaid';
  const billingState: 'admin' | 'no-subscription' | 'canceled' | 'has-subscription' =
    subscription?.isAdmin ? 'admin'
    : isCanceled ? 'canceled'
    : (planKey === 'trial') ? 'no-subscription'
    : 'has-subscription';

  return (
    <>
      <Navbar />
      <main className="bg-shade min-h-screen pt-28 pb-16 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <header className="text-center mb-12 md:mb-16">
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
              {t.account.title}
            </h1>
            <p className="mt-3 text-[14px] text-carbon/55 leading-[1.7] max-w-md mx-auto">
              {t.account.manageDesc}
            </p>
          </header>

          <div className="space-y-5">
            {/* SESIÓN — profile + sign out */}
            <section className="bg-white rounded-[20px] p-8 md:p-12">
              <h2 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-6">
                {t.account.profile}
              </h2>
              <dl className="space-y-3 text-[14px]">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-carbon/50">{t.account.emailLabel}</dt>
                  <dd className="text-carbon font-medium text-right break-all">{user?.email}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-carbon/50">{t.account.authMethod}</dt>
                  <dd className="text-carbon font-medium">{isOAuthUser ? 'Google' : t.account.emailPassword}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-carbon/50">{t.account.memberSince}</dt>
                  <dd className="text-carbon font-medium">{memberSince}</dd>
                </div>
              </dl>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04] transition-colors disabled:opacity-50"
                >
                  {signOutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {t.common.signOut}
                </button>
              </div>
            </section>

            {/* SUSCRIPCIÓN */}
            <section className="bg-white rounded-[20px] p-8 md:p-12">
              <h2 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-6">
                {t.account.subscription}
              </h2>
              {subLoading ? (
                <div className="flex items-center gap-2 text-[14px] text-carbon/55">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t.common.loading}
                </div>
              ) : (
                <>
                  <dl className="space-y-3 text-[14px]">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-carbon/50">{t.account.currentPlan}</dt>
                      <dd className="text-carbon font-medium">{planLabel}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-carbon/50">{t.account.status}</dt>
                      <dd className={`font-medium ${subscription?.cancelAtPeriodEnd ? 'text-[#9c7c4c]' : 'text-carbon'}`}>
                        {subscription?.cancelAtPeriodEnd ? t.account.cancelsAtPeriodEnd : (subscription?.status || t.account.active)}
                      </dd>
                    </div>
                    {subscription?.currentPeriodEnd && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-carbon/50">{t.account.nextBilling}</dt>
                        <dd className="text-carbon font-medium">
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString(dateFmtLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-carbon/50">{t.account.aiUsageMonth}</dt>
                      <dd className="text-carbon font-medium text-right">
                        {subscription?.usage?.imagery || 0} / {subscription?.limits?.imageryGenerations === -1 ? t.account.unlimited : subscription?.limits?.imageryGenerations}
                        {imageryUsagePercent > 0 && ` (${imageryUsagePercent}%)`}
                        {subscription?.packBalance ? ` + ${subscription.packBalance} pack` : ''}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {billingState === 'admin' ? (
                      <p className="text-[12px] text-carbon/45 leading-[1.6]">
                        {t.account.adminNote}
                      </p>
                    ) : billingState === 'canceled' ? (
                      <>
                        <p className="text-[13px] text-carbon/70 leading-[1.6] max-w-md">
                          {t.account.canceledNote}
                        </p>
                        <Link
                          href="/#pricing"
                          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors whitespace-nowrap"
                        >
                          {t.billing.seePlans}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="text-[12px] text-carbon/45 leading-[1.6] max-w-sm">
                          {t.account.refundNote}{' '}
                          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-carbon underline underline-offset-2 hover:text-carbon/70">
                            {SUPPORT_EMAIL}
                          </a>
                        </p>
                        {billingState === 'has-subscription' ? (
                          <button
                            onClick={openPortal}
                            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors whitespace-nowrap"
                          >
                            {t.account.manageSubscription}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <Link
                            href="/#pricing"
                            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors whitespace-nowrap"
                          >
                            {t.billing.seePlans}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </>
                    )}
                  </div>

                  {/* 7-day money-back self-service refund */}
                  {billingState === 'has-subscription' && refundElig?.eligible && refundStep === 0 && (
                    <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-[13px] text-carbon/70 leading-[1.6]">
                          {t.account.refundEligibleNote.replace('{days}', String(refundElig.daysRemaining ?? 7))}
                        </p>
                        <button
                          onClick={() => setRefundStep(1)}
                          className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-medium border border-[#A0463C]/30 text-[#A0463C] hover:bg-[#A0463C]/[0.05] transition-colors whitespace-nowrap"
                        >
                          {t.account.requestRefund}
                        </button>
                      </div>
                    </div>
                  )}

                  {refundStep === 1 && (
                    <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
                      <div className="rounded-[16px] bg-[#A0463C]/[0.04] border border-[#A0463C]/15 p-6 space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 text-[#A0463C] mt-0.5 flex-shrink-0" />
                          <div className="text-[14px] text-carbon leading-[1.7]">
                            <p className="font-semibold text-[#A0463C]">{t.account.refundConfirmTitle}</p>
                            <p className="mt-2 text-carbon/70">{t.account.refundConfirmBody}</p>
                          </div>
                        </div>
                        {refundError && (
                          <p className="text-[13px] text-[#A0463C] pl-7">{refundError}</p>
                        )}
                        <div className="flex flex-wrap gap-3 pt-1">
                          <button
                            onClick={handleRefund}
                            disabled={refundLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-[#A0463C] text-white hover:bg-[#A0463C]/90 transition-colors disabled:opacity-50"
                          >
                            {refundLoading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.account.processingRefund}
                              </>
                            ) : t.account.confirmRefund}
                          </button>
                          <button
                            onClick={() => { setRefundStep(0); setRefundError(null); }}
                            disabled={refundLoading}
                            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-medium border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04] transition-colors disabled:opacity-50"
                          >
                            {t.common.cancel}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {refundStep === 2 && refundedAmount && (
                    <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
                      <div className="rounded-[16px] bg-carbon/[0.03] border border-carbon/[0.08] p-6 space-y-3">
                        <p className="text-[14px] font-semibold text-carbon">
                          ✓ {t.account.refundSuccessTitle.replace('{amount}', formatRefundAmount(refundedAmount.amount, refundedAmount.currency))}
                        </p>
                        <p className="text-[13px] text-carbon/65 leading-[1.7]">
                          {t.account.refundSuccessBody}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* IDIOMA */}
            <section className="bg-white rounded-[20px] p-8 md:p-12">
              <h2 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-6">
                {t.account.languageSection}
              </h2>
              <div className="flex items-baseline justify-between gap-4 text-[14px]">
                <label htmlFor="lang-select" className="text-carbon/50">{t.account.languageLabel}</label>
                <select
                  id="lang-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-carbon/[0.03] border border-carbon/[0.06] rounded-[12px] text-[14px] text-carbon px-4 py-2.5 focus:outline-none focus:border-carbon/20 transition-colors cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="it">Italiano</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="nl">Nederlands</option>
                  <option value="sv">Svenska</option>
                  <option value="no">Norsk</option>
                </select>
              </div>
              <p className="mt-5 text-[12px] text-carbon/45 leading-[1.6] flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-carbon/35" />
                <span>{t.account.languageWarning}</span>
              </p>
            </section>

            {/* SEGURIDAD — only for email users */}
            {!isOAuthUser && (
              <section className="bg-white rounded-[20px] p-8 md:p-12">
                <h2 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-6">
                  {t.account.changePassword}
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t.auth.newPasswordPlaceholder}
                    className="w-full px-4 py-3 text-[14px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                    minLength={8}
                    required
                  />
                  {passwordError && (
                    <p className="text-[13px] text-[#A0463C]">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-[13px] text-carbon/70">✓ {t.auth.passwordUpdated}</p>
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-50"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.auth.updatingPassword}
                        </>
                      ) : t.auth.updatePassword}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* TUS DATOS — Export + Delete combined (GDPR) */}
            <section className="bg-white rounded-[20px] p-8 md:p-12">
              <h2 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
                {t.account.yourData}
              </h2>
              <p className="text-[14px] text-carbon/55 leading-[1.7] mb-8">
                {t.account.yourDataDesc}
              </p>

              {deleteStep === 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-50"
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.account.exporting}
                      </>
                    ) : t.account.downloadMyData}
                  </button>
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium border border-[#A0463C]/30 text-[#A0463C] hover:bg-[#A0463C]/[0.05] transition-colors"
                  >
                    {t.account.deleteMyAccount}
                  </button>
                </div>
              )}

              {deleteStep === 1 && (
                <div className="rounded-[16px] bg-[#A0463C]/[0.04] border border-[#A0463C]/15 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-[#A0463C] mt-0.5 flex-shrink-0" />
                    <div className="text-[14px] text-carbon leading-[1.7]">
                      <p className="font-semibold text-[#A0463C]">{t.account.areYouSure}</p>
                      <p className="mt-2 text-carbon/70">{t.account.deleteWillRemove}</p>
                      <ul className="list-disc ml-4 mt-2 space-y-1 text-carbon/70">
                        <li>{t.account.deleteItem1}</li>
                        <li>{t.account.deleteItem2}</li>
                        <li>{t.account.deleteItem3}</li>
                        <li>{t.account.deleteItem4}</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold bg-[#A0463C] text-white hover:bg-[#A0463C]/90 transition-colors"
                    >
                      {t.account.yesDeleteEverything}
                    </button>
                    <button
                      onClick={() => setDeleteStep(0)}
                      className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-medium border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04] transition-colors"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="rounded-[16px] bg-[#A0463C]/[0.04] border border-[#A0463C]/15 p-6 space-y-4">
                  <p className="text-[14px] text-[#A0463C] font-semibold leading-[1.6]">{t.account.lastChance}</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-[#A0463C] text-white hover:bg-[#A0463C]/90 transition-colors disabled:opacity-50"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.account.deleting}
                        </>
                      ) : t.account.permanentlyDelete}
                    </button>
                    <button
                      onClick={() => setDeleteStep(0)}
                      disabled={deleteLoading}
                      className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-medium border border-carbon/[0.15] text-carbon hover:bg-carbon/[0.04] transition-colors disabled:opacity-50"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <SiteFooter variant="light" />
    </>
  );
}
