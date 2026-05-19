'use client';

/**
 * Shared wrapper for buy-strategy axis cards (BuyStrategyBlock editor phase).
 * Mirrors the EditorAxisCard primitive inside Block 2's ScenariosContent.tsx
 * but lives in src/components/strategy/ so we don't drift the Block 2
 * canonical component. "+ Más" pill fires the deepen endpoint for one axis.
 */

import { Loader2, Plus } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
  title: string;
  description?: string;
  axis: string;
  onDeepen?: (axis: string) => void;
  deepening?: string | null;
  className?: string;
  children: React.ReactNode;
}

export function EditorAxisCard({ title, description, axis, onDeepen, deepening, className, children }: Props) {
  const t = useTranslation();
  const isLoading = deepening === axis;
  return (
    <div className={`bg-white rounded-[20px] p-8 ring-1 ring-carbon/[0.06] ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-tight">
            {title}
          </h4>
          {description && (
            <p className="text-[12px] text-carbon/50 mt-1">{description}</p>
          )}
        </div>
        {onDeepen && (
          <button
            type="button"
            onClick={() => onDeepen(axis)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/60 hover:bg-carbon/[0.04] disabled:opacity-50 transition-colors shrink-0"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {t.inSeason.axis.more}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
