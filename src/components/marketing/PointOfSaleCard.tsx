'use client';

import { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Globe,
  Truck,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { useWholesaleOrders, type WholesaleOrder } from '@/hooks/useWholesaleOrders';
import { useTranslation } from '@/i18n';

/* ═══════════════════════════════════════════════════════════
   Point of Sale — gold-standard hub for distribution channels.
   Web store integration is a placeholder; wholesale order CRUD
   is functional. Renders inline inside the sidebar-driven page
   shell — no internal modal.
   ═══════════════════════════════════════════════════════════ */

interface PointOfSaleCardProps {
  collectionPlanId: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-carbon/[0.06] text-carbon/55',
  sent: 'bg-[#B6C8C7]/35 text-carbon',
  confirmed: 'bg-[#C5CAA8]/45 text-carbon',
  in_production: 'bg-[#FFF4CE]/70 text-carbon',
  shipped: 'bg-[#D8BAA0]/40 text-carbon',
  delivered: 'bg-[#C5CAA8]/65 text-carbon',
  cancelled: 'bg-[#A0463C]/[0.08] text-[#A0463C]',
};

export function PointOfSaleCard({ collectionPlanId }: PointOfSaleCardProps) {
  const t = useTranslation();
  const m = (t as unknown as { marketingPage?: Record<string, string> }).marketingPage || {};
  const common = (t as unknown as { common?: Record<string, string> }).common || {};
  const { orders, loading, error, addOrder } = useWholesaleOrders(collectionPlanId);

  const [showAddOrder, setShowAddOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    buyer_name: '',
    buyer_company: '',
    buyer_email: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalWholesaleValue = orders.reduce((sum, o) => sum + (o.total_value || 0), 0);
  const totalWholesaleUnits = orders.reduce((sum, o) => sum + (o.total_units || 0), 0);

  const formatCurrency = (n: number) => {
    if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `€${(n / 1000).toFixed(0)}K`;
    return `€${n}`;
  };

  const handleAddOrder = async () => {
    if (!newOrder.buyer_name.trim()) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await addOrder({
        collection_plan_id: collectionPlanId,
        buyer_name: newOrder.buyer_name,
        buyer_company: newOrder.buyer_company || undefined,
        buyer_email: newOrder.buyer_email || undefined,
        notes: newOrder.notes || undefined,
      } as WholesaleOrder & { collection_plan_id: string });
      setNewOrder({ buyer_name: '', buyer_company: '', buyer_email: '', notes: '' });
      setShowAddOrder(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const surfacedError = errorMessage || error;

  return (
    <div className="space-y-5">
      {/* Error banner */}
      {surfacedError && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-[16px] bg-[#A0463C]/[0.04] border border-[#A0463C]/20">
          <span className="text-[12px] text-[#A0463C] font-medium">{surfacedError}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#A0463C]/60 hover:text-[#A0463C] transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══ Web Store ═══ */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <Globe className="h-4 w-4 text-carbon/35" strokeWidth={1.75} />
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">
            {m.webStore || 'Web store'}
          </p>
        </div>
        <div className="bg-carbon/[0.02] rounded-[16px] py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-carbon/[0.04] flex items-center justify-center mx-auto mb-4">
            <Globe className="h-5 w-5 text-carbon/30" strokeWidth={1.75} />
          </div>
          <p className="text-[14px] text-carbon/65 max-w-md mx-auto leading-relaxed mb-2">
            {m.webStoreComingSoon ||
              'Connect your Shopify, WooCommerce, or create an aimily storefront.'}
          </p>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-carbon/[0.04] text-[10px] font-semibold tracking-[0.08em] uppercase text-carbon/45">
            {m.webStorePhase2 || 'Coming in Phase 2 — post-launch'}
          </span>
        </div>
      </div>

      {/* ═══ Wholesale Orders ═══ */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Truck className="h-4 w-4 text-carbon/35" strokeWidth={1.75} />
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">
              {m.wholesaleOrdersTitle || 'Wholesale orders'}
            </p>
            {orders.length > 0 && (
              <span className="text-[11px] text-carbon/45 tracking-[-0.01em]">
                {orders.length}
                {' · '}
                {totalWholesaleUnits.toLocaleString()} units
                {' · '}
                {formatCurrency(totalWholesaleValue)}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddOrder(!showAddOrder)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold tracking-[-0.01em] bg-carbon text-white hover:bg-carbon/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            {m.addOrder || 'Add order'}
          </button>
        </div>

        {/* Add order form */}
        {showAddOrder && (
          <div className="rounded-[14px] bg-carbon/[0.02] p-5 mb-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={newOrder.buyer_name}
                onChange={(e) => setNewOrder({ ...newOrder, buyer_name: e.target.value })}
                placeholder={m.buyerName || 'Buyer name *'}
                className="text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2.5 focus:outline-none focus:border-carbon/25 transition-colors placeholder:text-carbon/30"
              />
              <input
                value={newOrder.buyer_company}
                onChange={(e) => setNewOrder({ ...newOrder, buyer_company: e.target.value })}
                placeholder={m.buyerCompany || 'Company'}
                className="text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2.5 focus:outline-none focus:border-carbon/25 transition-colors placeholder:text-carbon/30"
              />
              <input
                value={newOrder.buyer_email}
                onChange={(e) => setNewOrder({ ...newOrder, buyer_email: e.target.value })}
                placeholder={m.buyerEmail || 'Email'}
                className="text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2.5 focus:outline-none focus:border-carbon/25 transition-colors placeholder:text-carbon/30"
              />
            </div>
            <textarea
              value={newOrder.notes}
              onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
              placeholder={m.orderNotes || 'Notes…'}
              className="w-full text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2.5 focus:outline-none focus:border-carbon/25 transition-colors resize-none h-20 placeholder:text-carbon/30"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAddOrder}
                disabled={saving || !newOrder.buyer_name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-semibold tracking-[-0.01em] bg-carbon text-white hover:bg-carbon/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {common.save || 'Save'}
              </button>
              <button
                onClick={() => setShowAddOrder(false)}
                className="inline-flex items-center px-5 py-2 rounded-full text-[12px] font-semibold tracking-[-0.01em] border border-carbon/[0.12] text-carbon/65 hover:border-carbon/30 hover:text-carbon transition-colors"
              >
                {common.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Orders list */}
        {loading && orders.length === 0 ? (
          <p className="text-[12px] text-carbon/40 text-center py-8">
            {common.loading || 'Loading…'}
          </p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-carbon/[0.04] flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-carbon/30" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] text-carbon/45 max-w-sm leading-relaxed">
              {m.noWholesaleOrders ||
                'No wholesale orders yet. Add your first buyer above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-[14px] bg-carbon/[0.02] hover:bg-carbon/[0.04] transition-colors p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h4 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] truncate">
                      {order.buyer_name}
                    </h4>
                    {order.buyer_company && (
                      <span className="text-[11px] text-carbon/45">
                        {order.buyer_company}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-[0.08em] uppercase ${STATUS_STYLES[order.status] || 'bg-carbon/[0.06] text-carbon/55'}`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-carbon/45">
                    <span>{order.total_units} units</span>
                    <span>·</span>
                    <span>{formatCurrency(order.total_value)}</span>
                    {order.delivery_date && (
                      <>
                        <span>·</span>
                        <span>
                          {(m.deliveryLabel || 'Delivery')}: {order.delivery_date}
                        </span>
                      </>
                    )}
                    {order.order_lines?.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{order.order_lines.length} {m.lineItems || 'line items'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
