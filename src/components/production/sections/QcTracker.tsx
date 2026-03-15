'use client';

import { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ProductionOrder, QcIssue, OrderStatus } from '@/types/production';
import { QC_SEVERITY, ORDER_STATUSES } from '@/types/production';

interface Props {
  orders: ProductionOrder[];
  onUpdate: (id: string, updates: Partial<ProductionOrder>) => Promise<ProductionOrder | null>;
}

export function QcTracker({ orders, onUpdate }: Props) {
  const t = useTranslation();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [addingIssue, setAddingIssue] = useState<string | null>(null);

  // Issue form state
  const [issueSku, setIssueSku] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<QcIssue['severity']>('medium');
  const [issueDesc, setIssueDesc] = useState('');

  // Only orders that have reached QC stage or beyond
  const qcOrders = useMemo(() => {
    const qcStages: OrderStatus[] = ['in_production', 'qc', 'shipped', 'delivered'];
    return orders.filter((o) => qcStages.includes(o.status));
  }, [orders]);

  const totalIssues = qcOrders.reduce((sum, o) => sum + (o.qc_issues?.length || 0), 0);
  const unresolvedIssues = qcOrders.reduce(
    (sum, o) => sum + (o.qc_issues?.filter((i) => !i.resolved).length || 0),
    0
  );

  const handleAddIssue = async (orderId: string) => {
    if (!issueDesc) return;
    const order = qcOrders.find((o) => o.id === orderId);
    if (!order) return;

    const newIssue: QcIssue = {
      id: crypto.randomUUID(),
      sku_id: issueSku,
      sku_name: issueSku || 'General',
      severity: issueSeverity,
      description: issueDesc,
      resolved: false,
    };

    const updatedIssues = [...(order.qc_issues || []), newIssue];
    await onUpdate(orderId, { qc_issues: updatedIssues });

    setAddingIssue(null);
    setIssueSku('');
    setIssueSeverity('medium');
    setIssueDesc('');
  };

  const toggleIssueResolved = async (orderId: string, issueId: string) => {
    const order = qcOrders.find((o) => o.id === orderId);
    if (!order?.qc_issues) return;

    const updatedIssues = order.qc_issues.map((i) =>
      i.id === issueId ? { ...i, resolved: !i.resolved } : i
    );
    await onUpdate(orderId, { qc_issues: updatedIssues });
  };

  const removeIssue = async (orderId: string, issueId: string) => {
    const order = qcOrders.find((o) => o.id === orderId);
    if (!order?.qc_issues) return;

    const updatedIssues = order.qc_issues.filter((i) => i.id !== issueId);
    await onUpdate(orderId, { qc_issues: updatedIssues });
  };

  const getSeverityColor = (sev: QcIssue['severity']) =>
    QC_SEVERITY.find((s) => s.id === sev)?.color || '#94A3B8';

  const getStatusLabel = (status: OrderStatus) =>
    ORDER_STATUSES.find((s) => s.id === status)?.label || status;

  const getStatusColor = (status: OrderStatus) =>
    ORDER_STATUSES.find((s) => s.id === status)?.color || '#94A3B8';

  return (
    <div className="space-y-4">
      {/* QC Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{qcOrders.length}</div>
          <div className="text-xs text-gray-500">{t.productionSections.ordersInQcPipeline}</div>
        </div>
        <div className="bg-white border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{unresolvedIssues}</div>
          <div className="text-xs text-gray-500">{t.productionSections.openIssues}</div>
        </div>
        <div className="bg-white border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {totalIssues - unresolvedIssues}
          </div>
          <div className="text-xs text-gray-500">{t.productionSections.resolved}</div>
        </div>
      </div>

      {/* QC per Order */}
      {qcOrders.length === 0 ? (
        <div className="bg-white border border-gray-100 p-8 text-center">
          <ClipboardCheck className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{t.productionSections.noOrdersInQc}</p>
          <p className="text-xs text-gray-300 mt-1">{t.productionSections.ordersInQcHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {qcOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const issues = order.qc_issues || [];
            const openCount = issues.filter((i) => !i.resolved).length;

            return (
              <div key={order.id} className="bg-white border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        openCount > 0 ? 'bg-amber-50' : 'bg-green-50'
                      }`}
                    >
                      {openCount > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-texto/60" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="text-left">
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
                        <span className="text-xs text-gray-400">
                          {issues.length} {t.productionSections.issues} ({openCount} {t.productionSections.open})
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-50 p-4 space-y-3">
                    {/* Quality Notes */}
                    {order.quality_notes && (
                      <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                        {order.quality_notes}
                      </div>
                    )}

                    {/* Issues List */}
                    {issues.length > 0 ? (
                      <div className="space-y-2">
                        {issues.map((issue) => (
                          <div
                            key={issue.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              issue.resolved ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
                            }`}
                          >
                            <button
                              onClick={() => toggleIssueResolved(order.id, issue.id)}
                              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                issue.resolved ? 'bg-green-500 border-green-500' : 'border-gray-300'
                              }`}
                            >
                              {issue.resolved && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                  style={{
                                    backgroundColor: getSeverityColor(issue.severity) + '15',
                                    color: getSeverityColor(issue.severity),
                                  }}
                                >
                                  {issue.severity.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-400">{issue.sku_name}</span>
                              </div>
                              <p className={`text-sm ${issue.resolved ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                {issue.description}
                              </p>
                            </div>
                            <button
                              onClick={() => removeIssue(order.id, issue.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">{t.productionSections.noQcIssuesReported}</p>
                    )}

                    {/* Add Issue Form */}
                    {addingIssue === order.id ? (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={issueSku}
                            onChange={(e) => setIssueSku(e.target.value)}
                            placeholder={t.productionSections.skuNameOptional}
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                          <select
                            value={issueSeverity}
                            onChange={(e) => setIssueSeverity(e.target.value as QcIssue['severity'])}
                            className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                          >
                            {QC_SEVERITY.map((s) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={issueDesc}
                          onChange={(e) => setIssueDesc(e.target.value)}
                          placeholder={t.productionSections.describeIssue}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setAddingIssue(null)} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">
                            {t.productionSections.cancel}
                          </button>
                          <button
                            onClick={() => handleAddIssue(order.id)}
                            disabled={!issueDesc}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded font-medium hover:bg-blue-600 disabled:opacity-50"
                          >
                            {t.productionSections.addIssue}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingIssue(order.id)}
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                      >
                        <Plus className="h-3 w-3" /> {t.productionSections.reportIssue}
                      </button>
                    )}
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
