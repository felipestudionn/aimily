'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, ClipboardCheck, FileText, Plus, Trash2, Check } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU } from '@/hooks/useSkus';
import type { SampleReview, ReviewIssue } from '@/types/prototyping';
import { useSkuLifecycle } from './SkuLifecycleContext';
import { PhaseAccordion } from './PhaseAccordion';
import { StarRating, SeverityBadge } from './shared';

interface PrototypingPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'sketch_url') => void;
  uploading: string | null;
}

export function PrototypingPhase({ sku, onUpdate, onImageUpload, uploading }: PrototypingPhaseProps) {
  const t = useTranslation();
  const { reviews, addReview, updateReview, deleteReview, collectionPlanId } = useSkuLifecycle();

  const protoReviews = reviews.filter(r => r.sku_id === sku.id && r.review_type === 'white_proto');
  const latestReview = protoReviews[protoReviews.length - 1];

  return (
    <div className="space-y-4">
      {/* ── Sketch Reference ── */}
      <PhaseAccordion title={t.skuPhases?.sketchReference || 'Sketch Reference'} icon={ImageIcon}>
        <div className="flex gap-4">
          {sku.sketch_url ? (
            <div className="w-48 border border-carbon/[0.06] overflow-hidden">
              <img src={sku.sketch_url} alt="Sketch" className="w-full object-contain bg-white" />
            </div>
          ) : sku.reference_image_url ? (
            <div className="w-48 border border-carbon/[0.06] overflow-hidden">
              <img src={sku.reference_image_url} alt="Reference" className="w-full object-contain bg-white" />
            </div>
          ) : (
            <div className="w-48 border border-carbon/[0.06] bg-white aspect-[3/4] flex items-center justify-center">
              <p className="text-xs text-carbon/20">{t.skuPhases?.noSketch || 'No sketch'}</p>
            </div>
          )}
          <div className="flex-1 text-xs text-carbon/30">
            <p>{sku.name} · {sku.family} · {sku.category}</p>
            {sku.notes && <p className="mt-2 text-carbon/40 italic line-clamp-3">{sku.notes}</p>}
          </div>
        </div>
      </PhaseAccordion>

      {/* ── Proto Reviews ── */}
      <PhaseAccordion
        title={t.skuPhases?.protoReview || 'Proto Reviews'}
        icon={ClipboardCheck}
        badge={protoReviews.length > 0 ? `${protoReviews.filter(r => r.status === 'approved').length}/${protoReviews.length}` : undefined}
        defaultOpen
      >
        <div className="space-y-4">
          {protoReviews.map((review) => (
            <ProtoReviewCard key={review.id} review={review} onUpdate={updateReview} onDelete={deleteReview} t={t} />
          ))}

          {/* Add review */}
          <button
            onClick={async () => {
              await addReview({
                collection_plan_id: collectionPlanId,
                sku_id: sku.id,
                review_type: 'white_proto',
                status: 'pending',
                overall_rating: null,
                fit_notes: null,
                construction_notes: null,
                material_notes: null,
                color_notes: null,
                measurements_ok: null,
                photos: [],
                issues: [],
                rectification_notes: null,
                reviewed_by: null,
                reviewed_at: null,
              });
            }}
            className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center"
          >
            <Plus className="h-3 w-3" /> {t.skuPhases?.startReview || 'Start Review'}
          </button>
        </div>
      </PhaseAccordion>

      {/* ── Tech Pack Status ── */}
      <PhaseAccordion title={t.skuPhases?.techPackStatus || 'Tech Pack'} icon={FileText}>
        {latestReview?.status === 'approved' ? (
          <div className="flex items-center gap-3 p-4 bg-[#2d6a4f]/5 border border-[#2d6a4f]/10">
            <Check className="h-5 w-5 text-[#2d6a4f]" />
            <div>
              <p className="text-[11px] font-medium text-carbon">{t.skuPhases?.techPackReady || 'Proto approved — tech pack available'}</p>
              <p className="text-[10px] text-carbon/35 mt-0.5">{t.skuPhases?.techPackDesc || 'Auto-compiled from sketch, SKU data, and proto review notes.'}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-carbon/[0.02] border border-carbon/[0.06]">
            <p className="text-[11px] text-carbon/35">{t.skuPhases?.techPackPending || 'Tech pack will be available when a proto review is approved.'}</p>
          </div>
        )}
      </PhaseAccordion>
    </div>
  );
}

/* ── Proto Review Card ── */
function ProtoReviewCard({ review, onUpdate, onDelete, t }: {
  review: SampleReview;
  onUpdate: (id: string, u: Partial<SampleReview>) => Promise<SampleReview | null>;
  onDelete: (id: string) => Promise<boolean>;
  t: ReturnType<typeof useTranslation>;
}) {
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newDesc, setNewDesc] = useState('');

  const issues = review.issues || [];
  const unresolvedCount = issues.filter(i => !i.resolved).length;

  const addIssue = () => {
    if (!newArea || !newDesc) return;
    const issue: ReviewIssue = {
      id: crypto.randomUUID(),
      area: newArea,
      severity: newSeverity,
      description: newDesc,
      resolved: false,
    };
    onUpdate(review.id, { issues: [...issues, issue] });
    setNewArea(''); setNewDesc(''); setShowAddIssue(false);
  };

  const toggleResolved = (issueId: string) => {
    const updated = issues.map(i => i.id === issueId ? { ...i, resolved: !i.resolved } : i);
    onUpdate(review.id, { issues: updated });
  };

  const removeIssue = (issueId: string) => {
    onUpdate(review.id, { issues: issues.filter(i => i.id !== issueId) });
  };

  return (
    <div className="border border-carbon/[0.06] bg-white p-5 space-y-4">
      {/* Header: status + rating + delete */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={review.status}
          onChange={(e) => onUpdate(review.id, { status: e.target.value as SampleReview['status'] })}
          className="text-[10px] font-medium tracking-[0.06em] uppercase bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none"
        >
          <option value="pending">Pending</option>
          <option value="issues_found">Issues Found</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <StarRating value={review.overall_rating} onChange={(v) => onUpdate(review.id, { overall_rating: v })} />
        {unresolvedCount > 0 && (
          <span className="text-[10px] text-[#c77000]">{unresolvedCount} {t.skuPhases?.openIssues || 'open issues'}</span>
        )}
        <button onClick={() => onDelete(review.id)} className="ml-auto text-carbon/20 hover:text-[#A0463C]/60 text-[10px] tracking-[0.1em] uppercase">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* 4 note fields */}
      <div className="grid grid-cols-2 gap-3">
        {(['fit_notes', 'construction_notes', 'material_notes', 'rectification_notes'] as const).map((field) => (
          <div key={field}>
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">
              {field === 'fit_notes' ? (t.skuPhases?.fitNotes || 'Fit') :
               field === 'construction_notes' ? (t.skuPhases?.constructionNotes || 'Construction') :
               field === 'material_notes' ? (t.skuPhases?.materialNotes || 'Material') :
               (t.skuPhases?.rectificationNotes || 'Rectification')}
            </p>
            <textarea
              value={(review[field] as string) || ''}
              onChange={(e) => onUpdate(review.id, { [field]: e.target.value })}
              className="w-full h-14 p-2 text-[12px] font-light text-carbon bg-carbon/[0.02] border border-carbon/[0.06] resize-none focus:outline-none focus:border-carbon/[0.15]"
            />
          </div>
        ))}
      </div>

      {/* Issues */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.issues || 'Issues'} ({issues.length})</p>
          <button onClick={() => setShowAddIssue(!showAddIssue)} className="text-[9px] text-carbon/40 hover:text-carbon/60 uppercase tracking-wider">
            <Plus className="h-3 w-3 inline" /> {t.skuPhases?.addIssue || 'Add'}
          </button>
        </div>

        {issues.map((issue) => (
          <div key={issue.id} className={`flex items-start gap-2 p-2 border border-carbon/[0.04] ${issue.resolved ? 'opacity-40' : ''}`}>
            <input type="checkbox" checked={issue.resolved} onChange={() => toggleResolved(issue.id)} className="mt-1 shrink-0" />
            <SeverityBadge severity={issue.severity} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-carbon/60">{issue.area}</p>
              <p className={`text-[11px] text-carbon/40 ${issue.resolved ? 'line-through' : ''}`}>{issue.description}</p>
            </div>
            <button onClick={() => removeIssue(issue.id)} className="text-carbon/15 hover:text-[#A0463C]/50 shrink-0">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {showAddIssue && (
          <div className="p-3 border border-dashed border-carbon/[0.1] bg-carbon/[0.02] space-y-2">
            <div className="flex gap-2">
              <input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder={t.skuPhases?.issueArea || 'Area (e.g. Heel stiffness)'}
                className="flex-1 text-[11px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none pb-1" />
              <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as typeof newSeverity)}
                className="text-[10px] bg-transparent border border-carbon/[0.08] px-2 py-1 focus:outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t.skuPhases?.issueDescription || 'Description...'}
              className="w-full h-12 p-2 text-[11px] text-carbon bg-transparent border border-carbon/[0.06] resize-none focus:outline-none focus:border-carbon/[0.15]" />
            <div className="flex gap-2">
              <button onClick={addIssue} className="px-3 py-1.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.1em] uppercase">{t.skuPhases?.addIssue || 'Add'}</button>
              <button onClick={() => setShowAddIssue(false)} className="px-3 py-1.5 text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase">{t.skuPhases?.cancel || 'Cancel'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
