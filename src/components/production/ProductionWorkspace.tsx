'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ClipboardList,
  ClipboardCheck,
  Truck,
  Package,
  Loader2,
} from 'lucide-react';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useSkus } from '@/hooks/useSkus';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TimelineMilestone } from '@/types/timeline';
import type { ProductionTab } from '@/types/production';

import { OrderTracker } from './sections/OrderTracker';
import { QcTracker } from './sections/QcTracker';
import { LogisticsTracker } from './sections/LogisticsTracker';
import { PackagingSection } from '@/components/brand/sections/PackagingSection';

const TAB_IDS: { id: ProductionTab; tKey: 'productionOrders' | 'qualityControl' | 'logistics' | 'packaging'; icon: React.ElementType }[] = [
  { id: 'orders', tKey: 'productionOrders', icon: ClipboardList },
  { id: 'qc', tKey: 'qualityControl', icon: ClipboardCheck },
  { id: 'logistics', tKey: 'logistics', icon: Truck },
  { id: 'packaging', tKey: 'packaging', icon: Package },
];

interface ProductionWorkspaceProps {
  milestones: TimelineMilestone[];
}

export function ProductionWorkspace({ milestones }: ProductionWorkspaceProps) {
  const { id } = useParams();
  const collectionId = id as string;
  const [activeTab, setActiveTab] = useState<ProductionTab>('orders');
  const t = useTranslation();
  const { language } = useLanguage();

  const {
    orders,
    loading: ordersLoading,
    addOrder,
    updateOrder,
    deleteOrder,
  } = useProductionOrders(collectionId);

  const { skus, loading: skusLoading } = useSkus(collectionId);
  const { profile: brandProfile, debouncedUpdate: brandUpdate } = useBrandProfile(collectionId);

  // Production workspace milestones (dd-15 to dd-18)
  const phaseMilestones = milestones.filter((m) => ['dd-15', 'dd-16', 'dd-17', 'dd-18'].includes(m.id));
  const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
  const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
  const pending = phaseMilestones.length - completed - inProgress;
  const progress =
    phaseMilestones.length > 0
      ? Math.round((completed / phaseMilestones.length) * 100)
      : 0;

  const loading = ordersLoading || skusLoading;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-carbon/30" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 space-y-10">
      {/* Phase Header */}
      <div>
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-4">
          {t.productionPage.headerLabel}
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
          {t.productionPage.title}
        </h1>
      </div>

      {/* Progress Card */}
      <div className="relative bg-white border border-carbon/[0.06] p-4 sm:p-6 md:p-8 overflow-hidden">
        <div className="absolute top-0 left-0 h-[2px] bg-carbon/[0.06] w-full">
          <div className="h-full bg-carbon transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl sm:text-4xl md:text-5xl font-light text-carbon tracking-tight">{progress}</span>
            <span className="text-lg font-light text-carbon/40 ml-1">%</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-[10px] sm:text-xs text-carbon/40">
            <span>{completed} {t.workspace.completed}</span>
            <span>{inProgress} {t.workspace.inProgress}</span>
            <span>{pending} {t.workspace.pending}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border border-carbon/[0.06]">
        {TAB_IDS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 text-[9px] sm:text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                isActive
                  ? 'bg-carbon text-crema'
                  : 'bg-white text-carbon/40 hover:text-carbon/60'
              }`}
            >
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {t.productionPage[tab.tKey]}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <OrderTracker
          orders={orders}
          skus={skus}
          collectionId={collectionId}
          onAdd={addOrder}
          onUpdate={updateOrder}
          onDelete={deleteOrder}
        />
      )}

      {activeTab === 'qc' && (
        <QcTracker orders={orders} onUpdate={updateOrder} />
      )}

      {activeTab === 'logistics' && (
        <LogisticsTracker orders={orders} onUpdate={updateOrder} />
      )}

      {activeTab === 'packaging' && brandProfile && (
        <PackagingSection
          notes={brandProfile.packaging_notes}
          onUpdate={brandUpdate}
        />
      )}

      {/* Milestones Checklist */}
      <div className="bg-white border border-carbon/[0.06] p-4 sm:p-6 md:p-8">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-6">{t.workspace.milestones}</p>
        <div className="space-y-4">
          {phaseMilestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 sm:gap-4">
              <div
                className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                  m.status === 'completed'
                    ? 'bg-carbon border-carbon'
                    : m.status === 'in-progress'
                    ? 'border-carbon'
                    : 'border-carbon/20'
                }`}
              >
                {m.status === 'completed' && (
                  <svg className="w-2.5 h-2.5 text-crema" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {m.status === 'in-progress' && (
                  <div className="w-1.5 h-1.5 bg-carbon" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-light ${m.status === 'completed' ? 'text-carbon/30 line-through' : 'text-carbon'}`}>
                  {language === 'es' ? m.nameEs || m.name : m.name}
                </p>
              </div>
              <span className="text-xs text-carbon/30">{m.responsible}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
