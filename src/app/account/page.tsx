'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navbar } from '@/components/layout/navbar';
import {
  User, Mail, Shield, CreditCard, Download, Trash2,
  Loader2, CheckCircle, AlertTriangle, Key,
} from 'lucide-react';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial (14 days)',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export default function AccountPage() {
  const { user, updatePassword, signOut } = useAuth();
  const { subscription, openPortal, aiUsagePercent, loading: subLoading } = useSubscription();

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
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setPasswordError('Password must contain at least 1 number');
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
      alert('Failed to export data. Please try again.');
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
      alert('Failed to delete account. Please try again.');
      setDeleteLoading(false);
    }
  };

  const isOAuthUser = user?.app_metadata?.provider === 'google';

  return (
    <>
      <Navbar />
      <main className="bg-[#fff6dc] min-h-screen pt-28 pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-light text-carbon tracking-tight">Account</h1>
            <p className="text-sm text-gris mt-1">Manage your profile, subscription, and data.</p>
          </div>

          {/* Profile Section */}
          <section className="bg-white border border-gris/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-carbon" />
              <h2 className="text-lg font-medium text-carbon">Profile</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gris" />
                <span className="text-gris">Email:</span>
                <span className="text-carbon font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-gris" />
                <span className="text-gris">Auth method:</span>
                <span className="text-carbon font-medium">
                  {isOAuthUser ? 'Google' : 'Email + password'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gris ml-7">Member since:</span>
                <span className="text-carbon font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Change Password — only for email users */}
          {!isOAuthUser && (
            <section className="bg-white border border-gris/20 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-carbon" />
                <h2 className="text-lg font-medium text-carbon">Change Password</h2>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min. 8 chars, 1 number)"
                  className="w-full px-4 py-3 border border-gris/30 text-sm text-carbon placeholder:text-gris/40 focus:outline-none focus:border-carbon/50"
                  minLength={8}
                  required
                />
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Password updated
                  </p>
                )}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide hover:bg-carbon/90 transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                    </span>
                  ) : 'Update Password'}
                </button>
              </form>
            </section>
          )}

          {/* Subscription Section */}
          <section className="bg-white border border-gris/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-carbon" />
              <h2 className="text-lg font-medium text-carbon">Subscription</h2>
            </div>
            {subLoading ? (
              <div className="flex items-center gap-2 text-sm text-gris">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gris">Current plan:</span>
                  <span className="text-carbon font-medium">
                    {PLAN_LABELS[subscription?.plan || 'trial']}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gris">Status:</span>
                  <span className={`font-medium ${subscription?.cancelAtPeriodEnd ? 'text-amber-600' : 'text-green-600'}`}>
                    {subscription?.cancelAtPeriodEnd ? 'Cancels at period end' : subscription?.status || 'Active'}
                  </span>
                </div>
                {subscription?.currentPeriodEnd && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gris">Next billing:</span>
                    <span className="text-carbon font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gris">AI usage this month:</span>
                  <span className="text-carbon font-medium">
                    {subscription?.usage?.aiGenerations || 0} / {subscription?.limits?.aiGenerations === -1 ? 'Unlimited' : subscription?.limits?.aiGenerations}
                    {aiUsagePercent > 0 && ` (${aiUsagePercent}%)`}
                  </span>
                </div>
                <button
                  onClick={openPortal}
                  className="px-6 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide hover:bg-carbon/90 transition-colors"
                >
                  Manage Subscription
                </button>
              </div>
            )}
          </section>

          {/* Data Export — GDPR Right of Access */}
          <section className="bg-white border border-gris/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-carbon" />
              <h2 className="text-lg font-medium text-carbon">Export Your Data</h2>
            </div>
            <p className="text-sm text-gris">
              Download all your data (collections, SKUs, timelines, settings) as a JSON file.
            </p>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="px-6 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide hover:bg-carbon/90 transition-colors disabled:opacity-50"
            >
              {exportLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Exporting...
                </span>
              ) : 'Download My Data'}
            </button>
          </section>

          {/* Delete Account — GDPR Right to Erasure */}
          <section className="bg-white border border-red-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-medium text-red-600">Delete Account</h2>
            </div>
            <p className="text-sm text-gris">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {deleteStep === 0 && (
              <button
                onClick={() => setDeleteStep(1)}
                className="px-6 py-2.5 border border-red-300 text-red-600 text-sm font-medium tracking-wide hover:bg-red-50 transition-colors"
              >
                Delete My Account
              </button>
            )}

            {deleteStep === 1 && (
              <div className="p-4 bg-red-50 border border-red-200 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Are you sure?</p>
                    <p className="mt-1">This will permanently delete:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      <li>All your collections and SKUs</li>
                      <li>All timelines and calendar data</li>
                      <li>Your subscription (will be cancelled)</li>
                      <li>Your account and login credentials</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium tracking-wide hover:bg-red-700 transition-colors"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setDeleteStep(0)}
                    className="px-6 py-2.5 border border-gris/30 text-carbon text-sm font-medium tracking-wide hover:bg-gris/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div className="p-4 bg-red-50 border border-red-200 space-y-3">
                <p className="text-sm text-red-800 font-medium">
                  Last chance — click below to permanently delete your account.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium tracking-wide hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                      </span>
                    ) : 'Permanently Delete My Account'}
                  </button>
                  <button
                    onClick={() => setDeleteStep(0)}
                    disabled={deleteLoading}
                    className="px-6 py-2.5 border border-gris/30 text-carbon text-sm font-medium tracking-wide hover:bg-gris/10 transition-colors disabled:opacity-50"
                  >
                    Cancel
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
