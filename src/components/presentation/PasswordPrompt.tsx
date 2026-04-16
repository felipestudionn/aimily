'use client';

import { useState, useTransition } from 'react';
import { Lock, Loader2 } from 'lucide-react';

interface Props {
  token: string;
}

export function PasswordPrompt({ token }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/presentation/share/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 404) setError('This link is no longer available.');
        else if (res.status === 401) setError('Wrong password.');
        else setError(j.error || `Unlock failed (HTTP ${res.status})`);
        return;
      }
      // Success — cookie set by the server. Reload the same URL so
      // the server component re-renders and hits the unlocked path.
      startTransition(() => {
        window.location.reload();
      });
    } finally {
      setSubmitting(false);
    }
  };

  const busy = pending || submitting;

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <form
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-[20px] bg-white p-10 text-center"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-carbon/[0.06] mb-6">
          <Lock className="w-5 h-5 text-carbon/60" strokeWidth={2} />
        </div>
        <h1 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-2">
          Password required
        </h1>
        <p className="text-[13px] text-carbon/55 leading-[1.55] mb-6">
          This presentation is private. Enter the password the sender shared with you.
        </p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 rounded-[12px] bg-carbon/[0.04] border border-carbon/[0.08] text-[14px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:border-carbon/30 transition-colors mb-3"
        />

        {error && (
          <p className="text-[12px] text-error mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-carbon/90 transition-colors"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />}
          Open presentation
        </button>
      </form>
    </div>
  );
}
