'use client';

import { useState, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  X,
} from 'lucide-react';
import type { ProductionOrder, OrderStatus } from '@/types/production';
import { ORDER_STATUSES, SHIPPING_METHODS } from '@/types/production';

interface Props {
  orders: ProductionOrder[];
  onUpdate: (id: string, updates: Partial<ProductionOrder>) => Promise<ProductionOrder | null>;
}

export function LogisticsTracker({ orders, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formShipping, setFormShipping] = useState('');
  const [formTracking, setFormTracking] = useState('');
  const [formActualDelivery, setFormActualDelivery] = useState('');
  const [saving, setSaving] = useState(false);

  // Orders that are confirmed or beyond (ready for logistics planning)
  const logisticsOrders = useMemo(() => {
    const stages: OrderStatus[] = ['confirmed', 'in_production', 'qc', 'shipped', 'delivered'];
    return orders.filter((o) => stages.includes(o.status));
  }, [orders]);

  const shippedCount = logisticsOrders.filter((o) => o.status === 'shipped').length;
  const deliveredCount = logisticsOrders.filter((o) => o.status === 'delivered').length;
  const pendingCount = logisticsOrders.length - shippedCount - deliveredCount;

  const openEdit = (order: ProductionOrder) => {
    setEditingId(order.id);
    setFormShipping(order.shipping_method || '');
    setFormTracking(order.tracking_number || '');
    setFormActualDelivery(order.actual_delivery || '');
  };

  const handleSave = async (orderId: string) => {
    setSaving(true);
    await onUpdate(orderId, {
      shipping_method: formShipping || null,
      tracking_number: formTracking || null,
      actual_delivery: formActualDelivery || null,
    });
    setSaving(false);
    setEditingId(null);
  };

  const getDeliveryStatus = (order: ProductionOrder) => {
    if (order.status === 'delivered') return 'delivered';
    if (!order.estimated_delivery) return 'unknown';
    const eta = new Date(order.estimated_delivery);
    const today = new Date();
    const diff = Math.ceil((eta.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'soon';
    return 'on_track';
  };

  const getStatusColor = (status: OrderStatus) =>
    ORDER_STATUSES.find((s) => s.id === status)?.color || '#94A3B8';

  const getStatusLabel = (status: OrderStatus) =>
    ORDER_STATUSES.find((s) => s.id === status)?.label || status;

  return (
    <div className="space-y-4">
      {/* Logistics Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-xs text-gray-500">Pending Shipment</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Truck className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-cyan-600">{shippedCount}</div>
          <div className="text-xs text-gray-500">In Transit / En transito</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{deliveredCount}</div>
          <div className="text-xs text-gray-500">Delivered / Entregados</div>
        </div>
      </div>

      {/* Orders List */}
      {logisticsOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Truck className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No orders ready for logistics</p>
          <p className="text-xs text-gray-300 mt-1">Confirmed orders and beyond will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logisticsOrders.map((order) => {
            const deliveryStatus = getDeliveryStatus(order);
            const isEditing = editingId === order.id;

            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        order.status === 'delivered'
                          ? 'bg-green-50'
                          : order.status === 'shipped'
                          ? 'bg-cyan-50'
                          : 'bg-gray-50'
                      }`}
                    >
                      {order.status === 'delivered' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : order.status === 'shipped' ? (
                        <Truck className="h-4 w-4 text-cyan-500" />
                      ) : (
                        <Package className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {order.order_number || order.factory_name || 'Order'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: getStatusColor(order.status) + '15',
                            color: getStatusColor(order.status),
                          }}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                        {order.total_units && (
                          <span className="text-xs text-gray-400">{order.total_units.toLocaleString()} units</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isEditing && (
                    <button onClick={() => openEdit(order)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Logistics Info */}
                {isEditing ? (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Shipping Method</label>
                        <select
                          value={formShipping}
                          onChange={(e) => setFormShipping(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">Select...</option>
                          {SHIPPING_METHODS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Tracking #</label>
                        <input
                          type="text"
                          value={formTracking}
                          onChange={(e) => setFormTracking(e.target.value)}
                          placeholder="Tracking number"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Actual Delivery</label>
                        <input
                          type="date"
                          value={formActualDelivery}
                          onChange={(e) => setFormActualDelivery(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(order.id)}
                        disabled={saving}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded font-medium hover:bg-blue-600 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">{order.shipping_method || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500 font-mono">{order.tracking_number || 'No tracking'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">
                        ETA: {order.estimated_delivery || 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {deliveryStatus === 'delivered' ? (
                        <span className="text-green-600 font-medium">
                          Delivered {order.actual_delivery || ''}
                        </span>
                      ) : deliveryStatus === 'overdue' ? (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <AlertCircle className="h-3 w-3" /> Overdue
                        </span>
                      ) : deliveryStatus === 'soon' ? (
                        <span className="text-amber-600 font-medium">Arriving soon</span>
                      ) : (
                        <span className="text-gray-500">On track</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
