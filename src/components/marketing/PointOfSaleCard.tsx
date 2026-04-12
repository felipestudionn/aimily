'use client';

import { useState } from 'react';
import {
  ShoppingBag,
  ChevronLeft,
  Plus,
  Globe,
  Truck,
  ExternalLink,
  Loader2,
  Check,
} from 'lucide-react';
import { useWholesaleOrders, type WholesaleOrder } from '@/hooks/useWholesaleOrders';
import { useTranslation } from '@/i18n';

/* ── Props ── */

interface PointOfSaleCardProps {
  collectionPlanId: string;
}

/* ── Status colors ── */

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-carbon/[0.06] text-carbon/40',
  sent: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-green-50 text-green-700',
  in_production: 'bg-purple-50 text-purple-700',
  shipped: 'bg-orange-50 text-orange-700',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-50 text-red-500',
};

/* ── Component ── */

export function PointOfSaleCard({ collectionPlanId }: PointOfSaleCardProps) {
  const t = useTranslation();
  const { orders, loading, error, addOrder } = useWholesaleOrders(collectionPlanId);

  const [expanded, setExpanded] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({ buyer_name: '', buyer_company: '', buyer_email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalWholesaleValue = orders.reduce((sum, o) => sum + (o.total_value || 0), 0);
  const totalWholesaleUnits = orders.reduce((sum, o) => sum + (o.total_units || 0), 0);

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}M`;
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

  /* ── Collapsed ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.posLabel || 'DISTRIBUTION'}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.posTitle || 'Point of Sale'}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.posDesc || 'Connect your web store, track wholesale orders, and manage distribution channels.'}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {loading ? (
            <p className="text-xs text-carbon/30">{t.common?.loading || 'Loading...'}</p>
          ) : orders.length > 0 ? (
            <div className="flex items-center gap-4">
              <span className="text-2xl font-light text-carbon">{orders.length}</span>
              <span className="text-xs text-carbon/40">{t.marketingPage.wholesaleOrders || 'wholesale orders'}</span>
              {totalWholesaleValue > 0 && (
                <span className="text-xs text-carbon/30">{formatCurrency(totalWholesaleValue)}</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noChannelsYet || 'No channels configured yet'}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open || 'OPEN'}
        </div>
      </button>
    );
  }

  /* ── Expanded ── */
  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      <div className="sticky top-0 z-10 bg-crema/95 backdrop-blur border-b border-carbon/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => setExpanded(false)} className="flex items-center gap-2 text-sm font-light text-carbon/60 hover:text-carbon transition-colors">
            <ChevronLeft className="h-4 w-4" />
            {t.marketingPage.backToCreation || 'Back'}
          </button>
          <div className="text-center">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">{t.marketingPage.posLabel || 'DISTRIBUTION'}</p>
            <h2 className="text-lg font-light text-carbon tracking-tight">{t.marketingPage.posTitle || 'Point of Sale'}</h2>
          </div>
          <div className="w-32" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error banner */}
        {(errorMessage || error) && (
          <div className="bg-amber-50 border border-amber-200/60 text-amber-900 px-4 py-3 text-xs font-light flex items-center justify-between">
            <span>{errorMessage || error}</span>
            <button onClick={() => setErrorMessage(null)} className="text-amber-900/60 hover:text-amber-900 text-[10px] uppercase tracking-[0.1em]">×</button>
          </div>
        )}

        {/* ═══ WEB STORE ═══ */}
        <div className="bg-white border border-carbon/[0.06] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-4 w-4 text-carbon/30" />
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30">
              {t.marketingPage.webStore || 'Web Store'}
            </p>
          </div>
          <div className="bg-carbon/[0.02] border border-dashed border-carbon/[0.08] p-8 text-center">
            <Globe className="h-8 w-8 text-carbon/15 mx-auto mb-3" />
            <p className="text-sm font-light text-carbon/40 mb-2">
              {t.marketingPage.webStoreComingSoon || 'Connect your Shopify, WooCommerce, or create an aimily storefront'}
            </p>
            <p className="text-[10px] text-carbon/20">
              {t.marketingPage.webStorePhase2 || 'Coming in Phase 2 — post-launch'}
            </p>
          </div>
        </div>

        {/* ═══ WHOLESALE ORDERS ═══ */}
        <div className="bg-white border border-carbon/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-carbon/30" />
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30">
                {t.marketingPage.wholesaleOrdersTitle || 'Wholesale Orders'}
              </p>
              {orders.length > 0 && (
                <span className="text-[10px] text-carbon/25">
                  {orders.length} orders · {totalWholesaleUnits} units · {formatCurrency(totalWholesaleValue)}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAddOrder(!showAddOrder)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] border border-carbon/[0.06] text-carbon/50 hover:text-carbon hover:border-carbon/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              {t.marketingPage.addOrder || 'Add Order'}
            </button>
          </div>

          {/* Add order form */}
          {showAddOrder && (
            <div className="border border-carbon/[0.06] p-4 mb-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={newOrder.buyer_name}
                  onChange={(e) => setNewOrder({ ...newOrder, buyer_name: e.target.value })}
                  placeholder={t.marketingPage.buyerName || 'Buyer name *'}
                  className="text-xs font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
                />
                <input
                  value={newOrder.buyer_company}
                  onChange={(e) => setNewOrder({ ...newOrder, buyer_company: e.target.value })}
                  placeholder={t.marketingPage.buyerCompany || 'Company'}
                  className="text-xs font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
                />
                <input
                  value={newOrder.buyer_email}
                  onChange={(e) => setNewOrder({ ...newOrder, buyer_email: e.target.value })}
                  placeholder={t.marketingPage.buyerEmail || 'Email'}
                  className="text-xs font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
                />
              </div>
              <textarea
                value={newOrder.notes}
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                placeholder={t.marketingPage.orderNotes || 'Notes...'}
                className="w-full text-xs font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none resize-none h-16"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddOrder}
                  disabled={saving || !newOrder.buyer_name.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] bg-carbon text-crema disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {t.common?.save || 'Save'}
                </button>
                <button
                  onClick={() => setShowAddOrder(false)}
                  className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50"
                >
                  {t.common?.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Orders list */}
          {orders.length === 0 && !loading ? (
            <p className="text-xs text-carbon/20 italic text-center py-8">
              {t.marketingPage.noWholesaleOrders || 'No wholesale orders yet. Add your first buyer above.'}
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="border border-carbon/[0.06] p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-light text-carbon">{order.buyer_name}</h4>
                      {order.buyer_company && (
                        <span className="text-[10px] text-carbon/30">{order.buyer_company}</span>
                      )}
                      <span className={`text-[9px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 ${STATUS_COLORS[order.status] || ''}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-carbon/30">
                      <span>{order.total_units} units</span>
                      <span>{formatCurrency(order.total_value)}</span>
                      {order.delivery_date && <span>Delivery: {order.delivery_date}</span>}
                      {order.order_lines?.length > 0 && (
                        <span>{order.order_lines.length} line items</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
