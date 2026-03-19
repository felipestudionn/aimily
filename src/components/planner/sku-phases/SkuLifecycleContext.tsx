'use client';

import { createContext, useContext } from 'react';
import type { SkuColorway } from '@/types/design';
import type { SampleReview } from '@/types/prototyping';
import type { ProductionOrder } from '@/types/production';

export interface DesignWorkspaceData {
  formSpecs: Record<string, { lastType: string; lastCode: string; factoryLink: string; notes: string }>;
  designFiles: Record<string, { name: string; url: string; status: 'draft' | 'review' | 'approved' | 'rejected' }[]>;
  patterns: Record<string, { name: string; url: string; fileType: string; gradingNotes: string }[]>;
}

export const EMPTY_DESIGN_DATA: DesignWorkspaceData = {
  formSpecs: {},
  designFiles: {},
  patterns: {},
};

export interface SkuLifecycleContextValue {
  // Colorways
  colorways: SkuColorway[];
  addColorway: (c: Omit<SkuColorway, 'id' | 'created_at'>) => Promise<SkuColorway | null>;
  updateColorway: (id: string, updates: Partial<SkuColorway>) => Promise<SkuColorway | null>;
  deleteColorway: (id: string) => Promise<boolean>;
  // Sample reviews (all types)
  reviews: SampleReview[];
  addReview: (r: Partial<SampleReview>) => Promise<SampleReview | null>;
  updateReview: (id: string, u: Partial<SampleReview>) => Promise<SampleReview | null>;
  deleteReview: (id: string) => Promise<boolean>;
  // Design workspace data (forms, iterations, patterns)
  designData: DesignWorkspaceData;
  saveDesignData: (data: DesignWorkspaceData) => void;
  // Production orders
  orders: ProductionOrder[];
  // Collection context
  collectionPlanId: string;
}

const SkuLifecycleContext = createContext<SkuLifecycleContextValue | null>(null);

export function SkuLifecycleProvider({
  value,
  children,
}: {
  value: SkuLifecycleContextValue;
  children: React.ReactNode;
}) {
  return (
    <SkuLifecycleContext.Provider value={value}>
      {children}
    </SkuLifecycleContext.Provider>
  );
}

export function useSkuLifecycle(): SkuLifecycleContextValue {
  const ctx = useContext(SkuLifecycleContext);
  if (!ctx) throw new Error('useSkuLifecycle must be used within SkuLifecycleProvider');
  return ctx;
}
