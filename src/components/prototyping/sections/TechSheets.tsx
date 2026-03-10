'use client';

import { FileText, Download, CheckCircle2, Clock } from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { SampleReview } from '@/types/prototyping';

interface TechSheetsProps {
  skus: SKU[];
  reviews: SampleReview[];
}

export function TechSheets({ skus, reviews }: TechSheetsProps) {
  const getSkuReview = (skuId: string) =>
    reviews.find((r) => r.sku_id === skuId && r.review_type === 'white_proto');

  const completedCount = skus.filter((sku) => {
    const review = getSkuReview(sku.id);
    return review?.status === 'approved';
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Technical Sheets</h3>
          <p className="text-sm text-gray-500">
            Tech packs compiled from SKU data, sketches & proto reviews
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600">
          {completedCount}/{skus.length} ready
        </span>
      </div>

      {skus.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No SKUs found. Add products in the Product tab first.
        </div>
      )}

      <div className="space-y-3">
        {skus.map((sku) => {
          const review = getSkuReview(sku.id);
          const isApproved = review?.status === 'approved';

          return (
            <div
              key={sku.id}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isApproved ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <FileText className={`h-5 w-5 ${isApproved ? 'text-green-500' : 'text-gray-300'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{sku.name}</p>
                <p className="text-xs text-gray-400">{sku.category} · {sku.family}</p>
              </div>

              <div className="flex items-center gap-3">
                {isApproved ? (
                  <>
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Proto Approved
                    </span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors">
                      <Download className="h-3.5 w-3.5" />
                      Tech Pack PDF
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    {review ? 'Proto review in progress' : 'Awaiting proto review'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {skus.length > 0 && (
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-sm text-purple-700">
            Tech packs auto-compile from SketchFlow sketches, SKU data, and proto review notes.
          </p>
          <p className="text-xs text-purple-500 mt-1">
            Approve all white protos to unlock bulk PDF download.
          </p>
        </div>
      )}
    </div>
  );
}
