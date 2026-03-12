'use client';

import { useState } from 'react';
import {
  Plus,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { SampleReview, ReviewIssue } from '@/types/prototyping';

interface ProtoTrackerProps {
  skus: SKU[];
  reviews: SampleReview[];
  onAddReview: (review: Partial<SampleReview>) => Promise<SampleReview | null>;
  onUpdateReview: (id: string, updates: Partial<SampleReview>) => Promise<SampleReview | null>;
  onDeleteReview: (id: string) => Promise<boolean>;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', labelEs: 'Pendiente', icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
  issues_found: { label: 'Issues Found', labelEs: 'Con problemas', icon: AlertTriangle, color: 'text-texto/60', bg: 'bg-amber-50' },
  approved: { label: 'Approved', labelEs: 'Aprobado', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  rejected: { label: 'Rejected', labelEs: 'Rechazado', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export function ProtoTracker({ skus, reviews, onAddReview, onUpdateReview, onDeleteReview }: ProtoTrackerProps) {
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [addingIssue, setAddingIssue] = useState<string | null>(null);
  const [newIssue, setNewIssue] = useState({ area: '', severity: 'medium' as ReviewIssue['severity'], description: '' });

  const getSkuReview = (skuId: string) =>
    reviews.find((r) => r.sku_id === skuId && r.review_type === 'white_proto');

  const handleCreateReview = async (sku: SKU) => {
    await onAddReview({
      sku_id: sku.id,
      review_type: 'white_proto',
      milestone_id: 'dd-9',
      status: 'pending',
      photos: [],
      issues: [],
    });
  };

  const handleStatusChange = async (reviewId: string, status: SampleReview['status']) => {
    await onUpdateReview(reviewId, { status });
  };

  const handleAddIssue = async (review: SampleReview) => {
    if (!newIssue.area || !newIssue.description) return;
    const issue: ReviewIssue = {
      id: crypto.randomUUID(),
      ...newIssue,
    };
    await onUpdateReview(review.id, {
      issues: [...(review.issues || []), issue],
      status: 'issues_found',
    });
    setNewIssue({ area: '', severity: 'medium', description: '' });
    setAddingIssue(null);
  };

  const handleToggleIssueResolved = async (review: SampleReview, issueId: string) => {
    const updatedIssues = (review.issues || []).map((i) =>
      i.id === issueId ? { ...i, resolved: !i.resolved } : i
    );
    await onUpdateReview(review.id, { issues: updatedIssues });
  };

  const handleRemoveIssue = async (review: SampleReview, issueId: string) => {
    const updatedIssues = (review.issues || []).filter((i) => i.id !== issueId);
    await onUpdateReview(review.id, {
      issues: updatedIssues,
      status: updatedIssues.length === 0 ? 'pending' : 'issues_found',
    });
  };

  const handleRatingChange = async (reviewId: string, rating: number) => {
    await onUpdateReview(reviewId, { overall_rating: rating });
  };

  const handleNotesChange = async (reviewId: string, field: string, value: string) => {
    await onUpdateReview(reviewId, { [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">White Proto Tracker</h3>
          <p className="text-sm text-gray-500">Track and review white prototypes per SKU</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-green-50 text-green-600">
            {reviews.filter((r) => r.review_type === 'white_proto' && r.status === 'approved').length} approved
          </span>
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600">
            {reviews.filter((r) => r.review_type === 'white_proto' && r.status === 'issues_found').length} with issues
          </span>
        </div>
      </div>

      {skus.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No SKUs found. Add products in the Product tab first.
        </div>
      )}

      {skus.map((sku) => {
        const review = getSkuReview(sku.id);
        const isExpanded = expandedSku === sku.id;
        const statusConf = review ? STATUS_CONFIG[review.status] : null;
        const StatusIcon = statusConf?.icon || Clock;
        const unresolvedIssues = review?.issues?.filter((i) => !i.resolved).length || 0;

        return (
          <div key={sku.id} className="bg-white border border-gray-100 overflow-hidden">
            {/* SKU Header */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedSku(isExpanded ? null : sku.id)}
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg">
                🔧
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{sku.name}</p>
                <p className="text-xs text-gray-400">{sku.category} · {sku.family}</p>
              </div>

              {review ? (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConf?.bg} ${statusConf?.color}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusConf?.label}
                  {unresolvedIssues > 0 && (
                    <span className="ml-1 bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px]">
                      {unresolvedIssues}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateReview(sku);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium hover:bg-purple-100 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Start Review
                </button>
              )}

              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>

            {/* Expanded Review Panel */}
            {isExpanded && review && (
              <div className="border-t border-gray-100 p-5 space-y-5">
                {/* Status & Rating Row */}
                <div className="flex items-center gap-6">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Status</label>
                    <select
                      value={review.status}
                      onChange={(e) => handleStatusChange(review.id, e.target.value as SampleReview['status'])}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="issues_found">Issues Found</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => handleRatingChange(review.id, n)}
                          className="transition-colors"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              (review.overall_rating || 0) >= n
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <button
                      onClick={() => onDeleteReview(review.id)}
                      className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Photo Upload Placeholder */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Proto Photos</label>
                  <div className="flex gap-3">
                    {(review.photos || []).map((photo, i) => (
                      <div key={i} className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden">
                        <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-purple-300 hover:text-purple-400 transition-colors">
                      <Camera className="h-5 w-5" />
                      <span className="text-[10px] mt-1">Add</span>
                    </button>
                  </div>
                </div>

                {/* Notes Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'fit_notes', label: 'Fit Notes', labelEs: 'Notas de calce' },
                    { key: 'construction_notes', label: 'Construction', labelEs: 'Construcción' },
                    { key: 'material_notes', label: 'Material', labelEs: 'Material' },
                    { key: 'rectification_notes', label: 'Rectification', labelEs: 'Rectificación' },
                  ].map(({ key, label, labelEs }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 mb-1 block">
                        {label} <span className="text-gray-300">/ {labelEs}</span>
                      </label>
                      <textarea
                        value={(review as unknown as Record<string, unknown>)[key] as string || ''}
                        onChange={(e) => handleNotesChange(review.id, key, e.target.value)}
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
                        placeholder={`${label}...`}
                      />
                    </div>
                  ))}
                </div>

                {/* Issues */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-gray-500">
                      Issues ({unresolvedIssues} unresolved)
                    </label>
                    <button
                      onClick={() => setAddingIssue(addingIssue === review.id ? null : review.id)}
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Issue
                    </button>
                  </div>

                  {addingIssue === review.id && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={newIssue.area}
                          onChange={(e) => setNewIssue({ ...newIssue, area: e.target.value })}
                          placeholder="Area (e.g. toe box, heel, stitching)"
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                        />
                        <select
                          value={newIssue.severity}
                          onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value as ReviewIssue['severity'] })}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <textarea
                        value={newIssue.description}
                        onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                        placeholder="Describe the issue..."
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setAddingIssue(null)}
                          className="text-xs text-gray-500 px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddIssue(review)}
                          disabled={!newIssue.area || !newIssue.description}
                          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-purple-700 transition-colors"
                        >
                          Add Issue
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(review.issues || []).map((issue) => (
                      <div
                        key={issue.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          issue.resolved
                            ? 'bg-gray-50 border-gray-100 opacity-60'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleIssueResolved(review, issue.id)}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            issue.resolved
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-purple-400'
                          }`}
                        >
                          {issue.resolved && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-gray-900">{issue.area}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[issue.severity]}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{issue.description}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveIssue(review, issue.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!review.issues || review.issues.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-4">No issues logged yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
