'use client';

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Star,
  Trophy,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { SampleReview } from '@/types/prototyping';

interface FinalApprovalProps {
  skus: SKU[];
  reviews: SampleReview[];
}

const STATUS_ICON = {
  pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
  issues_found: { icon: AlertTriangle, color: 'text-texto/60', bg: 'bg-amber-50' },
  approved: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

export function FinalApproval({ skus, reviews }: FinalApprovalProps) {
  const getLatestReview = (skuId: string, type: string) => {
    return reviews
      .filter((r) => r.sku_id === skuId && r.review_type === type)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  const allSkusApproved = skus.every((sku) => {
    const colorReview = getLatestReview(sku.id, 'color_sample');
    const fittingReview = getLatestReview(sku.id, 'fitting_sample');
    return colorReview?.status === 'approved' && fittingReview?.status === 'approved';
  });

  const approvedSkuCount = skus.filter((sku) => {
    const colorReview = getLatestReview(sku.id, 'color_sample');
    const fittingReview = getLatestReview(sku.id, 'fitting_sample');
    return colorReview?.status === 'approved' && fittingReview?.status === 'approved';
  }).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Collection Approval Overview</h3>
        <p className="text-sm text-gray-500">
          Summary of all sample reviews — both color and fitting must be approved
        </p>
      </div>

      {/* Summary Card */}
      <div
        className={`rounded-2xl p-6 text-center ${
          allSkusApproved && skus.length > 0
            ? 'bg-green-50 border border-green-200'
            : 'bg-white border border-gray-100'
        }`}
      >
        {allSkusApproved && skus.length > 0 ? (
          <>
            <Trophy className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-green-700">Collection Complete!</h3>
            <p className="text-sm text-green-600 mt-1">
              All {skus.length} SKUs have approved color and fitting samples
            </p>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-gray-900">
              {approvedSkuCount}/{skus.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">SKUs fully approved</p>
          </>
        )}
      </div>

      {/* Per-SKU Status Table */}
      {skus.length > 0 && (
        <div className="bg-white border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-center px-4 py-3 font-medium">Color Sample</th>
                <th className="text-center px-4 py-3 font-medium">Fitting Sample</th>
                <th className="text-center px-4 py-3 font-medium">Rating</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => {
                const colorReview = getLatestReview(sku.id, 'color_sample');
                const fittingReview = getLatestReview(sku.id, 'fitting_sample');
                const bothApproved =
                  colorReview?.status === 'approved' && fittingReview?.status === 'approved';
                const avgRating =
                  [colorReview?.overall_rating, fittingReview?.overall_rating]
                    .filter(Boolean)
                    .reduce((a, b) => (a || 0) + (b || 0), 0)! /
                  [colorReview?.overall_rating, fittingReview?.overall_rating].filter(Boolean).length || 0;

                const renderStatus = (review: SampleReview | undefined) => {
                  if (!review) {
                    return <span className="text-xs text-gray-300">No review</span>;
                  }
                  const conf = STATUS_ICON[review.status];
                  const Icon = conf.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 text-xs ${conf.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  );
                };

                return (
                  <tr key={sku.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{sku.name}</p>
                      <p className="text-xs text-gray-400">{sku.category}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{renderStatus(colorReview)}</td>
                    <td className="px-4 py-3 text-center">{renderStatus(fittingReview)}</td>
                    <td className="px-4 py-3 text-center">
                      {avgRating > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-texto/60">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {avgRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bothApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">In progress</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {skus.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No SKUs found. Add products in the Product tab first.
        </div>
      )}
    </div>
  );
}
