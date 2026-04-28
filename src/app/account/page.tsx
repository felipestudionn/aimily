'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/layout/navbar';
import {
  User, Mail, Shield, CreditCard, Download, Trash2,
  Loader2, CheckCircle, AlertTriangle, Key, Globe,
} from 'lucide-react';

export default function AccountPage() {
  const { user, updatePassword, signOut } = useAuth();
  const { subscription, openPortal, imageryUsagePercent, loading: subLoading } = useSubscription();
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();

  const dateFmtLocale = language === 'es' ? 'es-ES' : 'en-US';

  const PLAN_LABELS: Record<string, string> = {
    trial: t.account.planTrial,
    starter: t.account.planStarter,
    professional: t.account.planProfessional,
    enterprise: t.account.planEnterprise,
  };

  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [exportLoading, setExportLoading] = useState(false);

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

  return (
    <>
      <Navbar />
      <main className="bg-crema min-h-screen pt-28 pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-light text-carbon tracking-tight">{t.account.title}</h1>
            <p className="text-sm text-gris mt-1">{t.account.manageDesc}</p>
          </div>

          {/* Profile Section */}
          <section className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-carbon" />
              <h2 className="text-lg font-medium text-carbon">{t.account.profile}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gris" />
                <span className="text-gris">{t.account.emailLabel}</span>
                <span className="text-carbon font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-gris" />
                <span className="text-gris">{t.account.authMethod}</span>
                <span className="text-carbon font-medium">
                  {isOAuthUser ? 'Google' : t.account.emailPassword}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gris ml-7">{t.account.memberSince}</span>
                <span className="text-carbon font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString(dateFmtLocale, {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Language Section */}
          <section className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-carbon" />
              <h2 className="text-lg font-medium text-carbon">{t.account.languageSection}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gris">{t.account.languageLabel}</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-white border border-carbon/[0.08] text-sm text-carbon px-3 py-2 focus:outline-none focus:border-carbon/50 cursor-pointer"
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
              <p className="text-xs text-gris/60 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                {t.account.languageWarning}
              </p>
            </div>
          </section>

          {/* Change Password — only for email users */}
          {!isOAuthUser && (
            <section className="bg-white border border-carbon/[0.06] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-carbon" />
                <h2 className="text-lg font-medium text-carbon">{t.account.changePassword}</h2>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.auth.newPasswordPlaceholder}
                  className="w-full px-4 py-3 border border-carbon/[0.08] text-sm text-carbon placeholder:text-carbon/20 focus:outline-none focus:border-carbon/50"
                  minLength={8}
                  required
                />
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> {t.auth.passwordUpdated}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide hover:bg-carbon/90 transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> {t.auth.updatingPassword}
                    </span>
                  ) : t.auth.updatePassword}
                </button>
              </form>
            </section>
          )}

          {/* Subscription Section */}
          <section className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-carbon" />
              <h2 className="text-lg font-medium text-carbon">{t.account.subscription}</h2>
            </div>
            {subLoading ? (
              <div className="flex items-center gap-2 text-sm text-gris">
                <Loader2 className="h-4 w-4 animate-spin" /> {t.common.loading}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gris">{t.account.currentPlan}</span>
                  <span className="text-carbon font-medium">
                    {PLAN_LABELS[subscription?.plan || 'trial']}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gris">{t.account.status}</span>
                  <span className={`font-medium ${subscription?.cancelAtPeriodEnd ? 'text-amber-600' : 'text-green-600'}`}>
                    {subscription?.cancelAtPeriodEnd ? t.account.cancelsAtPeriodEnd : subscription?.status || t.account.active}
                  </span>
                </div>
                {subscription?.currentPeriodEnd && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gris">{t.account.nextBilling}</span>
                    <span className="text-carbon font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString(dateFmtLocale, {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gris">{t.account.aiUsageMonth}</span>
                  <span className="text-carbon font-medium">
                    {subscription?.usage?.imagery || 0} / {subscription?.limits?.imageryGenerations === -1 ? t.account.unlimited : subscription?.limits?.imageryGenerations}
                    {imageryUsagePercent > 0 && ` (${imageryUsagePercent}%)`}
                    {subscription?.packBalance ? ` + ${subscription.packBalance} pack` : ''}
                  </span>
                </div>
                <button
                  onClick={openPortal}
                  className="px-6 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide hover:bg-carbon/90 transition-colors"
                >
                  {t.account.manageSubscription}
                </button>
              </div>
            )}
          </section>

          {/* Data Export — GDPR Right of Access */}
          <section className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-carbon" />
              <h2 className="text-lg font-medium text-carbon">{t.account.exportData}</h2>
            </div>
            <p className="text-sm text-gris">
              {t.account.exportDataDesc}
            </p>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="px-6 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide hover:bg-carbon/90 transition-colors disabled:opacity-50"
            >
              {exportLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t.account.exporting}
                </span>
              ) : t.account.downloadMyData}
            </button>
          </section>

          {/* Delete Account — GDPR Right to Erasure */}
          <section className="bg-white border border-red-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-medium text-red-600">{t.account.deleteAccount}</h2>
            </div>
            <p className="text-sm text-gris">
              {t.account.deleteAccountDesc}
            </p>

            {deleteStep === 0 && (
              <button
                onClick={() => setDeleteStep(1)}
                className="px-6 py-2.5 border border-red-300 text-red-600 text-sm font-medium tracking-wide hover:bg-red-50 transition-colors"
              >
                {t.account.deleteMyAccount}
              </button>
            )}

            {deleteStep === 1 && (
              <div className="p-4 bg-red-50 border border-red-200 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">{t.account.areYouSure}</p>
                    <p className="mt-1">{t.account.deleteWillRemove}</p>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      <li>{t.account.deleteItem1}</li>
                      <li>{t.account.deleteItem2}</li>
                      <li>{t.account.deleteItem3}</li>
                      <li>{t.account.deleteItem4}</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium tracking-wide hover:bg-red-700 transition-colors"
                  >
                    {t.account.yesDeleteEverything}
                  </button>
                  <button
                    onClick={() => setDeleteStep(0)}
                    className="px-6 py-2.5 border border-carbon/[0.08] text-carbon text-sm font-medium tracking-wide hover:bg-carbon/[0.04] transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div className="p-4 bg-red-50 border border-red-200 space-y-3">
                <p className="text-sm text-red-800 font-medium">
                  {t.account.lastChance}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium tracking-wide hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> {t.account.deleting}
                      </span>
                    ) : t.account.permanentlyDelete}
                  </button>
                  <button
                    onClick={() => setDeleteStep(0)}
                    disabled={deleteLoading}
                    className="px-6 py-2.5 border border-carbon/[0.08] text-carbon text-sm font-medium tracking-wide hover:bg-carbon/[0.04] transition-colors disabled:opacity-50"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
