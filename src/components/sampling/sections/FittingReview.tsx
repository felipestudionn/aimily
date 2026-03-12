'use client';

import { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Trash2,
  Ruler,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { SampleReview, MeasurementRow } from '@/types/prototyping';

interface FittingReviewProps {
  skus: SKU[];
  reviews: SampleReview[];
  onAddReview: (review: Partial<SampleReview>) => Promise<SampleReview | null>;
  onUpdateReview: (id: string, updates: Partial<SampleReview>) => Promise<SampleReview | null>;
  onDeleteReview: (id: string) => Promise<boolean>;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
  issues_found: { label: 'Issues', icon: AlertTriangle, color: 'text-texto/60', bg: 'bg-amber-50' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

const DEFAULT_MEASUREMENTS: MeasurementRow[] = [
  { point: 'Length (outsole)', spec: '', actual: '', tolerance: '±2mm', pass: null },
  { point: 'Width (ball)', spec: '', actual: '', tolerance: '±1.5mm', pass: null },
  { point: 'Heel height', spec: '', actual: '', tolerance: '±1mm', pass: null },
  { point: 'Shaft height', spec: '', actual: '', tolerance: '±3mm', pass: null },
  { point: 'Opening circumference', spec: '', actual: '', tolerance: '±3mm', pass: null },
];

export function FittingReview({
  skus,
  reviews,
  onAddReview,
  onUpdateReview,
  onDeleteReview,
}: FittingReviewProps) {
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, MeasurementRow[]>>({});

  const getSkuReviews = (skuId: string) =>
    reviews.filter((r) => r.sku_id === skuId && r.review_type === 'fitting_sample');

  const handleCreateReview = async (skuId: string) => {
    await onAddReview({
      sku_id: skuId,
      review_type: 'fitting_sample',
      milestone_id: 'dd-13',
      status: 'pending',
      photos: [],
      issues: [],
    });
  };

  const getMeasurements = (reviewId: string): MeasurementRow[] => {
    return measurements[reviewId] || DEFAULT_MEASUREMENTS;
  };

  const updateMeasurement = (
    reviewId: string,
    index: number,
    field: keyof MeasurementRow,
    value: string | boolean | null
  ) => {
    const rows = [...getMeasurements(reviewId)];
    rows[index] = { ...rows[index], [field]: value };
    setMeasurements({ ...measurements, [reviewId]: rows });

    // Check if all measurements pass
    const allChecked = rows.every((r) => r.pass !== null);
    const allPass = rows.every((r) => r.pass === true);
    if (allChecked) {
      onUpdateReview(reviewId, { measurements_ok: allPass });
    }
  };

  const approvedCount = reviews.filter(
    (r) => r.review_type === 'fitting_sample' && r.status === 'approved'
  ).length;
  const totalReviews = reviews.filter((r) => r.review_type === 'fitting_sample').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Fitting Sample Review</h3>
          <p className="text-sm text-gray-500">
            Fit testing, measurements & construction feedback
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-green-50 text-green-600">
            {approvedCount}/{totalReviews} approved
          </span>
        </div>
      </div>

      {skus.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No SKUs found. Add products in the Product tab first.
        </div>
      )}

      {skus.map((sku) => {
        const skuReviews = getSkuReviews(sku.id);
        const isExpanded = expandedSku === sku.id;

        return (
          <div key={sku.id} className="bg-white border border-gray-100 overflow-hidden">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedSku(isExpanded ? null : sku.id)}
            >
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                <Ruler className="h-5 w-5 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{sku.name}</p>
                <p className="text-xs text-gray-400">
                  {skuReviews.length} fitting review{skuReviews.length !== 1 ? 's' : ''}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                {skuReviews.map((review) => {
                  const conf = STATUS_CONFIG[review.status];
                  const StatusIcon = conf.icon;
                  const rows = getMeasurements(review.id);

                  return (
                    <div key={review.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${conf.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {conf.label}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                onClick={() => onUpdateReview(review.id, { overall_rating: n })}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    (review.overall_rating || 0) >= n
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-gray-200'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <select
                            value={review.status}
                            onChange={(e) =>
                              onUpdateReview(review.id, {
                                status: e.target.value as SampleReview['status'],
                              })
                            }
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="issues_found">Issues Found</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <button
                            onClick={() => onDeleteReview(review.id)}
                            className="text-gray-300 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Measurement Table */}
                      <div>
                        <label className="text-[10px] text-gray-400 mb-2 block font-medium uppercase tracking-wide">
                          Measurement Validation
                        </label>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 text-gray-500">
                                <th className="text-left px-3 py-2 font-medium">Point</th>
                                <th className="text-left px-3 py-2 font-medium">Spec</th>
                                <th className="text-left px-3 py-2 font-medium">Actual</th>
                                <th className="text-left px-3 py-2 font-medium">Tolerance</th>
                                <th className="text-center px-3 py-2 font-medium">Pass</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                  <td className="px-3 py-2 text-gray-700">{row.point}</td>
                                  <td className="px-3 py-1.5">
                                    <input
                                      value={row.spec}
                                      onChange={(e) =>
                                        updateMeasurement(review.id, i, 'spec', e.target.value)
                                      }
                                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                                      placeholder="—"
                                    />
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <input
                                      value={row.actual}
                                      onChange={(e) =>
                                        updateMeasurement(review.id, i, 'actual', e.target.value)
                                      }
                                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                                      placeholder="—"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-gray-400">{row.tolerance}</td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      onClick={() =>
                                        updateMeasurement(
                                          review.id,
                                          i,
                                          'pass',
                                          row.pass === true ? false : row.pass === false ? null : true
                                        )
                                      }
                                      className={`w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition-colors ${
                                        row.pass === true
                                          ? 'bg-green-500 border-green-500 text-white'
                                          : row.pass === false
                                          ? 'bg-red-500 border-red-500 text-white'
                                          : 'border-gray-200 text-transparent'
                                      }`}
                                    >
                                      {row.pass === true ? '✓' : row.pass === false ? '✗' : '·'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block">Fit Notes</label>
                          <textarea
                            value={review.fit_notes || ''}
                            onChange={(e) =>
                              onUpdateReview(review.id, { fit_notes: e.target.value })
                            }
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                            placeholder="Fit comfort, sizing accuracy..."
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block">Construction Notes</label>
                          <textarea
                            value={review.construction_notes || ''}
                            onChange={(e) =>
                              onUpdateReview(review.id, {
                                construction_notes: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                            placeholder="Stitching, sole attachment..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => handleCreateReview(sku.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 text-xs font-medium hover:border-pink-300 hover:text-pink-500 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Fitting Review
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
