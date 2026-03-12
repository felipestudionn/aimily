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
  Palette,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { SkuColorway } from '@/types/design';
import type { SampleReview } from '@/types/prototyping';

interface ColorSampleReviewProps {
  skus: SKU[];
  colorways: SkuColorway[];
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

export function ColorSampleReview({
  skus,
  colorways,
  reviews,
  onAddReview,
  onUpdateReview,
  onDeleteReview,
}: ColorSampleReviewProps) {
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const getSkuColorways = (skuId: string) =>
    colorways.filter((c) => c.sku_id === skuId);

  // Reviews for color_sample are linked by sku_id; we use color_notes to store colorway-specific info
  const getColorReviews = (skuId: string) =>
    reviews.filter((r) => r.sku_id === skuId && r.review_type === 'color_sample');

  const handleCreateReview = async (skuId: string) => {
    await onAddReview({
      sku_id: skuId,
      review_type: 'color_sample',
      milestone_id: 'dd-11',
      status: 'pending',
      photos: [],
      issues: [],
    });
  };

  const approvedCount = reviews.filter(
    (r) => r.review_type === 'color_sample' && r.status === 'approved'
  ).length;
  const totalReviews = reviews.filter((r) => r.review_type === 'color_sample').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Color Sample Review</h3>
          <p className="text-sm text-gray-500">Review color samples per SKU against approved colorways</p>
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
        const skuColorways = getSkuColorways(sku.id);
        const skuReviews = getColorReviews(sku.id);
        const isExpanded = expandedSku === sku.id;

        return (
          <div key={sku.id} className="bg-white border border-gray-100 overflow-hidden">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedSku(isExpanded ? null : sku.id)}
            >
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                <Palette className="h-5 w-5 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{sku.name}</p>
                <p className="text-xs text-gray-400">
                  {skuColorways.length} colorways · {skuReviews.length} reviews
                </p>
              </div>

              {/* Colorway swatches preview */}
              <div className="flex -space-x-1">
                {skuColorways.slice(0, 5).map((cw) => (
                  <div
                    key={cw.id}
                    className="w-6 h-6 rounded-full border-2 border-white"
                    style={{ backgroundColor: cw.hex_primary }}
                    title={cw.name}
                  />
                ))}
              </div>

              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                {/* Colorways strip */}
                {skuColorways.length > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    {skuColorways.map((cw) => (
                      <div
                        key={cw.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: cw.hex_primary }}
                        />
                        <span className="text-xs font-medium text-gray-700">{cw.name}</span>
                        <span className="text-[10px] text-gray-400">{cw.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reviews for this SKU */}
                {skuReviews.map((review) => {
                  const conf = STATUS_CONFIG[review.status];
                  const StatusIcon = conf.icon;
                  return (
                    <div key={review.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${conf.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {conf.label}
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Rating */}
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

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block">Color Notes</label>
                          <textarea
                            value={review.color_notes || ''}
                            onChange={(e) =>
                              onUpdateReview(review.id, { color_notes: e.target.value })
                            }
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                            placeholder="Color accuracy, consistency..."
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block">Material Notes</label>
                          <textarea
                            value={review.material_notes || ''}
                            onChange={(e) =>
                              onUpdateReview(review.id, { material_notes: e.target.value })
                            }
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-pink-300"
                            placeholder="Material quality, texture..."
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
                  Add Color Sample Review
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
