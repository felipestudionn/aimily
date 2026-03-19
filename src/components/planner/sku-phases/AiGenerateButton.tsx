'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AiGenerateButtonProps {
  label: string;
  type: 'sketch-suggest' | 'color-suggest' | 'materials-suggest' | 'catalog-description';
  input: Record<string, string>;
  onResult: (data: unknown) => void;
  language?: string;
}

export function AiGenerateButton({ label, type, input, onResult, language = 'en' }: AiGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/design-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, input, language }),
      });
      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      onResult(data.result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 border border-carbon/[0.1] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 hover:text-carbon/70 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {label}
      </button>
      {error && <p className="text-[10px] text-[#A0463C]/60 mt-1">{error}</p>}
    </div>
  );
}
