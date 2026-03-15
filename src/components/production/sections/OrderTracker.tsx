'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  X,
  Trash2,
  Edit3,
  Search,
  Package,
  Factory,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ProductionOrder, OrderStatus, LineItem } from '@/types/production';
import { ORDER_STATUSES, CURRENCIES } from '@/types/production';
import type { SKU } from '@/hooks/useSkus';

interface Props {
  orders: ProductionOrder[];
  skus: SKU[];
  collectionId: string;
  onAdd: (order: Omit<ProductionOrder, 'id' | 'created_at' | 'updated_at'>) => Promise<ProductionOrder | null>;
  onUpdate: (id: string, updates: Partial<ProductionOrder>) => Promise<ProductionOrder | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function OrderTracker({ orders, skus, collectionId, onAdd, onUpdate, onDelete }: Props) {
  const t = useTranslation();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formOrderNumber, setFormOrderNumber] = useState('');
  const [formFactory, setFormFactory] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formStatus, setFormStatus] = useState<OrderStatus>('draft');
  const [formOrderDate, setFormOrderDate] = useState('');
  const [formEstDelivery, setFormEstDelivery] = useState('');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formNotes, setFormNotes] = useState('');
  const [formLineItems, setFormLineItems] = useState<LineItem[]>([]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.order_number?.toLowerCase().includes(q) ||
          o.factory_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, filterStatus, search]);

  const statusCounts = ORDER_STATUSES.map((s) => ({
    ...s,
    count: orders.filter((o) => o.status === s.id).length,
  }));

  const totalUnits = orders.reduce((sum, o) => sum + (o.total_units || 0), 0);
  const totalCost = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0);

  const resetForm = () => {
    setFormOrderNumber('');
    setFormFactory('');
    setFormContact('');
    setFormStatus('draft');
    setFormOrderDate('');
    setFormEstDelivery('');
    setFormCurrency('EUR');
    setFormNotes('');
    setFormLineItems([]);
    setEditingOrder(null);
  };

  const openEditForm = (o: ProductionOrder) => {
    setEditingOrder(o);
    setFormOrderNumber(o.order_number || '');
    setFormFactory(o.factory_name || '');
    setFormContact(o.factory_contact || '');
    setFormStatus(o.status);
    setFormOrderDate(o.order_date || '');
    setFormEstDelivery(o.estimated_delivery || '');
    setFormCurrency(o.currency || 'EUR');
    setFormNotes(o.quality_notes || '');
    setFormLineItems(o.line_items || []);
    setShowForm(true);
  };

  const addLineItem = () => {
    setFormLineItems((prev) => [
      ...prev,
      { sku_id: '', sku_name: '', colorway: '', size_run: {}, units: 0, unit_cost: 0 },
    ]);
  };

  const updateLineItem = (idx: number, updates: Partial<LineItem>) => {
    setFormLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...updates } : item))
    );
  };

  const removeLineItem = (idx: number) => {
    setFormLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectSku = (idx: number, skuId: string) => {
    const sku = skus.find((s) => s.id === skuId);
    if (sku) {
      updateLineItem(idx, {
        sku_id: sku.id,
        sku_name: sku.name,
        unit_cost: sku.cost,
        units: sku.buy_units || 0,
      });
    }
  };

  const computedTotalUnits = formLineItems.reduce((s, li) => s + li.units, 0);
  const computedTotalCost = formLineItems.reduce((s, li) => s + li.units * li.unit_cost, 0);

  const handleSave = async () => {
    if (!formFactory) return;
    setSaving(true);

    const payload = {
      collection_plan_id: collectionId,
      order_number: formOrderNumber || null,
      factory_name: formFactory,
      factory_contact: formContact || null,
      status: formStatus,
      order_date: formOrderDate || null,
      estimated_delivery: formEstDelivery || null,
      actual_delivery: editingOrder?.actual_delivery || null,
      total_units: computedTotalUnits || null,
      total_cost: computedTotalCost || null,
      currency: formCurrency,
      shipping_method: editingOrder?.shipping_method || null,
      tracking_number: editingOrder?.tracking_number || null,
      line_items: formLineItems.length > 0 ? formLineItems : null,
      qc_issues: editingOrder?.qc_issues || null,
      quality_notes: formNotes || null,
      documents: editingOrder?.documents || null,
    };

    if (editingOrder) {
      await onUpdate(editingOrder.id, payload);
    } else {
      await onAdd(payload);
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  const getStatusColor = (status: OrderStatus) =>
    ORDER_STATUSES.find((s) => s.id === status)?.color || '#94A3B8';

  const getStatusLabel = (status: OrderStatus) =>
    ORDER_STATUSES.find((s) => s.id === status)?.label || status;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
          <div className="text-xs text-gray-500">{t.productionSections.totalOrders}</div>
        </div>
        <div className="bg-white border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalUnits.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{t.productionSections.totalUnits}</div>
        </div>
        <div className="bg-white border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">{t.productionSections.totalCost}</div>
        </div>
        <div className="bg-white border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {orders.filter((o) => o.status === 'delivered').length}
          </div>
          <div className="text-xs text-gray-500">{t.productionSections.delivered}</div>
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {statusCounts.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
            className={`p-2 border text-center transition-colors ${
              filterStatus === s.id ? 'border-gray-300 bg-gray-50' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.productionSections.searchOrders}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          {t.productionSections.newOrder}
        </button>
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 p-8 text-center">
            <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">{t.productionSections.noProductionOrders}</p>
          </div>
        ) : (
          filtered.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div
                key={order.id}
                className="bg-white border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Order Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Factory className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {order.order_number || t.productionSections.noOrderNumber}
                        </h4>
                        <p className="text-xs text-gray-400">{order.factory_name || t.productionSections.noFactory}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => onUpdate(order.id, { status: e.target.value as OrderStatus })}
                        className="text-[11px] px-2 py-1 rounded-full font-medium border-0 cursor-pointer"
                        style={{
                          backgroundColor: getStatusColor(order.status) + '15',
                          color: getStatusColor(order.status),
                        }}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2 flex-wrap">
                    {order.order_date && <span>{t.productionSections.ordered}: {order.order_date}</span>}
                    {order.estimated_delivery && <span>{t.productionSections.eta}: {order.estimated_delivery}</span>}
                    {order.total_units && (
                      <span className="font-medium text-gray-700">{order.total_units.toLocaleString()} {t.productionSections.units}</span>
                    )}
                    {order.total_cost != null && order.total_cost > 0 && (
                      <span className="font-medium text-green-600">
                        {order.currency} {order.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {order.line_items?.length || 0} {t.productionSections.lineItems}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditForm(order)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onDelete(order.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Line Items */}
                {isExpanded && order.line_items && order.line_items.length > 0 && (
                  <div className="border-t border-gray-50 bg-gray-50/50 p-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left pb-2 font-medium">{t.productionSections.sku}</th>
                          <th className="text-left pb-2 font-medium">{t.productionSections.colorway}</th>
                          <th className="text-right pb-2 font-medium">{t.productionSections.units}</th>
                          <th className="text-right pb-2 font-medium">{t.productionSections.unitCost}</th>
                          <th className="text-right pb-2 font-medium">{t.productionSections.total}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.line_items.map((li, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="py-1.5 font-medium text-gray-700">{li.sku_name}</td>
                            <td className="py-1.5 text-gray-500">{li.colorway || '-'}</td>
                            <td className="py-1.5 text-right text-gray-700">{li.units.toLocaleString()}</td>
                            <td className="py-1.5 text-right text-gray-500">{li.unit_cost.toFixed(2)}</td>
                            <td className="py-1.5 text-right font-medium text-gray-700">
                              {(li.units * li.unit_cost).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editingOrder ? t.productionSections.editOrder : t.productionSections.newProductionOrder}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Order # + Factory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.orderNumber}</label>
                  <input type="text" value={formOrderNumber} onChange={(e) => setFormOrderNumber(e.target.value)}
                    placeholder="PO-2026-001" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.factory} *</label>
                  <input type="text" value={formFactory} onChange={(e) => setFormFactory(e.target.value)}
                    placeholder={t.productionSections.factoryPlaceholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              {/* Contact + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.contact}</label>
                  <input type="text" value={formContact} onChange={(e) => setFormContact(e.target.value)}
                    placeholder={t.productionSections.contactPlaceholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.status}</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.orderDate}</label>
                  <input type="date" value={formOrderDate} onChange={(e) => setFormOrderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.estDelivery}</label>
                  <input type="date" value={formEstDelivery} onChange={(e) => setFormEstDelivery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.currency}</label>
                  <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">{t.productionSections.lineItemsLabel}</label>
                  <button onClick={addLineItem} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                    <Plus className="h-3 w-3" /> {t.productionSections.addItem}
                  </button>
                </div>
                {formLineItems.length > 0 ? (
                  <div className="space-y-2">
                    {formLineItems.map((li, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                        <select
                          value={li.sku_id}
                          onChange={(e) => selectSku(idx, e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">{t.productionSections.selectSku}</option>
                          {skus.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <input type="text" value={li.colorway} onChange={(e) => updateLineItem(idx, { colorway: e.target.value })}
                          placeholder={t.productionSections.colorway} className="w-24 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="number" value={li.units || ''} onChange={(e) => updateLineItem(idx, { units: parseInt(e.target.value) || 0 })}
                          placeholder={t.productionSections.units} className="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <input type="number" value={li.unit_cost || ''} onChange={(e) => updateLineItem(idx, { unit_cost: parseFloat(e.target.value) || 0 })}
                          placeholder={t.productionSections.unitCost} step="0.01" className="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <button onClick={() => removeLineItem(idx)} className="p-1 text-gray-400 hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-end gap-4 text-xs text-gray-500 pt-1">
                      <span>{computedTotalUnits} {t.productionSections.units}</span>
                      <span className="font-medium text-gray-700">{formCurrency} {computedTotalCost.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">
                    {t.productionSections.noLineItemsYet}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.productionSections.notesLabel}</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                  rows={2} placeholder={t.productionSections.notesPlaceholder}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  {t.productionSections.cancel}
                </button>
                <button onClick={handleSave} disabled={!formFactory || saving}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                  {saving ? t.productionSections.saving : editingOrder ? t.productionSections.update : t.productionSections.createOrder}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
