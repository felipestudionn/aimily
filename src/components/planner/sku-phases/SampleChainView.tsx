'use client';

/**
 * Phase 4 — Sample Tracking Chain.
 *
 * Horizontal timeline of the 4 review stages (white_proto → color_sample
 * → fitting_sample → production_sample) plus a 5th BULK marker. Each
 * stage shows status, photo count, lead-time vs promise, and an AI
 * comparison hint when the vision endpoint has been run.
 *
 * Click a stage → opens the SampleStageDrawer with the full review
 * form (photos upload, status, fit/construction/material/color notes,
 * issues table, factory dates, AI compare button).
 *
 * This component is the canonical source-of-truth for sample tracking
 * — proto_iterations remains as a "quick notes" legacy field but the
 * Phase 4 review chain is what the production gate runs against.
 */

import { useEffect, useMemo, useState } from 'react';
import { Camera, Check, ChevronRight, Loader2, Sparkles, X, Plus, AlertTriangle } from 'lucide-react';

type ReviewType = 'white_proto' | 'color_sample' | 'fitting_sample' | 'production_sample';
type ReviewStatus = 'pending' | 'issues_found' | 'approved' | 'rejected';
type AiRec = 'approve' | 'minor_revisions' | 'major_revisions' | 'reject' | null;

interface SampleReview {
  id: string;
  collection_plan_id: string;
  sku_id: string | null;
  review_type: ReviewType;
  status: ReviewStatus | null;
  overall_rating: number | null;
  fit_notes: string | null;
  construction_notes: string | null;
  material_notes: string | null;
  color_notes: string | null;
  measurements_ok: boolean | null;
  photos: string[] | null;
  issues: Array<{ area?: string; severity?: string; description?: string }> | null;
  rectification_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  factory_promised_date: string | null;
  factory_received_date: string | null;
  delay_days: number | null;
  ai_comparison: { summary?: string; deviations?: Array<{ area: string; severity: string; description: string }> } | null;
  ai_recommendation: AiRec;
  ai_compared_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  skuId: string;
  collectionPlanId: string;
}

// Display order from concept to bulk.
const STAGES: { type: ReviewType; label: string }[] = [
  { type: 'white_proto', label: 'White Proto' },
  { type: 'color_sample', label: 'Color Sample' },
  { type: 'fitting_sample', label: 'Fitting Sample' },
  { type: 'production_sample', label: 'Production Sample' },
];

const STATUS_DOT: Record<ReviewStatus, string> = {
  pending: 'bg-carbon/30',
  issues_found: 'bg-citronella',
  approved: 'bg-moss',
  rejected: 'bg-red-500',
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Pending',
  issues_found: 'Issues found',
  approved: 'Approved',
  rejected: 'Rejected',
};

const AI_PILL: Record<NonNullable<AiRec>, { bg: string; label: string }> = {
  approve: { bg: 'bg-moss/[0.18] text-carbon/80', label: 'AI: approve' },
  minor_revisions: { bg: 'bg-citronella/[0.18] text-carbon/80', label: 'AI: minor' },
  major_revisions: { bg: 'bg-orange-100 text-orange-800', label: 'AI: major' },
  reject: { bg: 'bg-red-50 text-red-700', label: 'AI: reject' },
};

export function SampleChainView({ skuId, collectionPlanId }: Props) {
  const [reviews, setReviews] = useState<SampleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStage, setOpenStage] = useState<ReviewType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/sample-reviews?planId=${collectionPlanId}&skuId=${skuId}`);
      if (cancelled) return;
      if (res.ok) {
        const data = (await res.json()) as SampleReview[];
        setReviews(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [skuId, collectionPlanId, refreshKey]);

  const byType = useMemo(() => {
    const m = new Map<ReviewType, SampleReview>();
    for (const r of reviews) {
      const prev = m.get(r.review_type);
      // Most recent wins (so multiple iterations of the same type roll up).
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) m.set(r.review_type, r);
    }
    return m;
  }, [reviews]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.01em]">Sample Chain</h3>
          <p className="text-[12px] text-carbon/50 mt-0.5">
            White proto → Color → Fitting → Production sample → Bulk. Click any stage to review.
          </p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-carbon/40" />}
      </div>

      {/* Timeline */}
      <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map((stage, idx) => {
          const review = byType.get(stage.type);
          const status: ReviewStatus = (review?.status as ReviewStatus) ?? 'pending';
          const photos = review?.photos?.length ?? 0;
          const aiRec = review?.ai_recommendation ?? null;
          const delay = review?.delay_days ?? null;
          return (
            <li key={stage.type}>
              <button
                type="button"
                onClick={() => setOpenStage(stage.type)}
                className="w-full text-left p-4 rounded-[14px] bg-white border border-carbon/[0.06] hover:border-carbon/15 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all flex flex-col gap-2 min-h-[120px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-carbon/35 font-semibold">
                    Step {idx + 1}
                  </span>
                  {review && (
                    <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
                  )}
                </div>
                <p className="text-[14px] font-semibold text-carbon tracking-[-0.01em]">{stage.label}</p>
                <div className="flex items-center gap-2 flex-wrap mt-auto">
                  <span className="text-[11px] text-carbon/55">
                    {review ? STATUS_LABEL[status] : 'Not started'}
                  </span>
                  {photos > 0 && (
                    <span className="text-[11px] text-carbon/45 inline-flex items-center gap-1">
                      <Camera className="h-3 w-3" /> {photos}
                    </span>
                  )}
                  {delay != null && delay > 0 && (
                    <span className="text-[11px] inline-flex items-center gap-1 text-orange-700">
                      <AlertTriangle className="h-3 w-3" /> {delay}d late
                    </span>
                  )}
                  {aiRec && (
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.04em] px-2 py-0.5 rounded-full ${AI_PILL[aiRec].bg}`}>
                      {AI_PILL[aiRec].label}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
        <li>
          <div className="w-full text-left p-4 rounded-[14px] bg-carbon/[0.02] border border-dashed border-carbon/15 flex flex-col gap-2 min-h-[120px]">
            <span className="text-[10px] tracking-[0.2em] uppercase text-carbon/35 font-semibold">Step 5</span>
            <p className="text-[14px] font-semibold text-carbon/55 tracking-[-0.01em]">Bulk</p>
            <p className="text-[11px] text-carbon/40 mt-auto">
              Triggered automatically once Production Sample is approved.
            </p>
          </div>
        </li>
      </ol>

      {openStage && (
        <SampleStageDrawer
          skuId={skuId}
          collectionPlanId={collectionPlanId}
          reviewType={openStage}
          existing={byType.get(openStage) ?? null}
          onClose={() => setOpenStage(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────

interface DrawerProps {
  skuId: string;
  collectionPlanId: string;
  reviewType: ReviewType;
  existing: SampleReview | null;
  onClose: () => void;
  onSaved: () => void;
}

function SampleStageDrawer({ skuId, collectionPlanId, reviewType, existing, onClose, onSaved }: DrawerProps) {
  const [status, setStatus] = useState<ReviewStatus>((existing?.status as ReviewStatus) ?? 'pending');
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [photoUrl, setPhotoUrl] = useState('');
  const [fitNotes, setFitNotes] = useState(existing?.fit_notes ?? '');
  const [constructionNotes, setConstructionNotes] = useState(existing?.construction_notes ?? '');
  const [materialNotes, setMaterialNotes] = useState(existing?.material_notes ?? '');
  const [colorNotes, setColorNotes] = useState(existing?.color_notes ?? '');
  const [measurementsOk, setMeasurementsOk] = useState<boolean | null>(existing?.measurements_ok ?? null);
  const [promised, setPromised] = useState(existing?.factory_promised_date ?? '');
  const [received, setReceived] = useState(existing?.factory_received_date ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<AiRec>(existing?.ai_recommendation ?? null);
  const [aiSummary, setAiSummary] = useState<string | null>(existing?.ai_comparison?.summary ?? null);
  const [aiDeviations, setAiDeviations] = useState(existing?.ai_comparison?.deviations ?? []);

  function addPhoto() {
    if (!photoUrl.trim()) return;
    setPhotos((p) => [...p, photoUrl.trim()]);
    setPhotoUrl('');
  }

  function removePhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }

  async function save() {
    setBusy('save');
    setError(null);
    const payload = {
      collection_plan_id: collectionPlanId,
      sku_id: skuId,
      review_type: reviewType,
      status,
      photos,
      fit_notes: fitNotes || null,
      construction_notes: constructionNotes || null,
      material_notes: materialNotes || null,
      color_notes: colorNotes || null,
      measurements_ok: measurementsOk,
      factory_promised_date: promised || null,
      factory_received_date: received || null,
    };
    let res: Response;
    if (existing) {
      res = await fetch(`/api/sample-reviews/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('/api/sample-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Could not save review');
      return;
    }
    onSaved();
    onClose();
  }

  async function runAiCompare() {
    if (!existing) {
      setError('Save the review with at least one photo first, then run the AI comparison.');
      return;
    }
    if (photos.length === 0) {
      setError('Upload at least one sample photo before running AI comparison.');
      return;
    }
    setBusy('ai');
    setError(null);
    const res = await fetch('/api/ai/sample-review/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleReviewId: existing.id }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'AI comparison failed');
      return;
    }
    const data = (await res.json()) as {
      approval_recommendation: AiRec;
      summary: string;
      deviations: Array<{ area: string; severity: string; description: string }>;
      suggested_status: ReviewStatus;
    };
    setAiRec(data.approval_recommendation);
    setAiSummary(data.summary);
    setAiDeviations(data.deviations);
    setStatus(data.suggested_status);
    onSaved();
  }

  const stageLabel = STAGES.find((s) => s.type === reviewType)?.label ?? reviewType;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-carbon/30 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:w-[520px] h-full bg-shade overflow-y-auto shadow-[-12px_0_40px_rgba(0,0,0,0.08)]">
        <div className="sticky top-0 z-10 bg-shade/95 backdrop-blur px-6 pt-5 pb-4 border-b border-carbon/[0.06] flex items-start justify-between">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Sample review</p>
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">{stageLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && <div className="px-3 py-2 rounded-[10px] bg-red-50 text-red-700 text-[12px]">{error}</div>}

          {/* Status */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['pending', 'issues_found', 'approved', 'rejected'] as ReviewStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                    status === s ? 'bg-carbon text-white' : 'bg-white border border-carbon/[0.08] text-carbon/65 hover:border-carbon/20'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[s]}`} />
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Lead time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">Promised</label>
              <input
                type="date"
                value={promised ?? ''}
                onChange={(e) => setPromised(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">Received</label>
              <input
                type="date"
                value={received ?? ''}
                onChange={(e) => setReceived(e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none"
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">Sample Photos</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {photos.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-[10px] overflow-hidden bg-carbon/[0.04]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste a photo URL"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none"
              />
              <button
                type="button"
                onClick={addPhoto}
                className="px-3 py-2 rounded-[10px] bg-carbon/[0.04] text-carbon/70 text-[12px] font-semibold hover:bg-carbon/[0.06]"
              >
                <Plus className="h-3.5 w-3.5 inline -mt-0.5" /> Add
              </button>
            </div>
          </div>

          {/* AI Comparison */}
          <div className="p-4 bg-white rounded-[14px] border border-carbon/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-carbon tracking-[-0.01em]">AI Photo Comparison</h4>
              <button
                type="button"
                onClick={runAiCompare}
                disabled={busy === 'ai' || !existing || photos.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-citronella/[0.25] text-carbon/85 text-[11px] font-semibold disabled:opacity-50"
              >
                {busy === 'ai' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Run comparison
              </button>
            </div>
            {!aiSummary && (
              <p className="text-[12px] text-carbon/45">
                Save the review with photos, then run the AI to detect deviations vs the sketch + 3D render.
              </p>
            )}
            {aiSummary && (
              <>
                <p className="text-[12px] text-carbon/65 mb-2 leading-snug">{aiSummary}</p>
                {aiRec && (
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-[0.04em] px-2 py-0.5 rounded-full mb-2 ${AI_PILL[aiRec].bg}`}>
                    {AI_PILL[aiRec].label}
                  </span>
                )}
                {aiDeviations.length > 0 && (
                  <ul className="space-y-1 text-[12px]">
                    {aiDeviations.map((d, i) => (
                      <li key={i} className="text-carbon/65 leading-snug">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                            d.severity === 'critical' ? 'bg-red-500' : d.severity === 'major' ? 'bg-orange-500' : 'bg-citronella'
                          }`}
                        />
                        <span className="font-medium text-carbon">{d.area}</span>: {d.description}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            {[
              { label: 'Fit notes', value: fitNotes, set: setFitNotes },
              { label: 'Construction notes', value: constructionNotes, set: setConstructionNotes },
              { label: 'Material notes', value: materialNotes, set: setMaterialNotes },
              { label: 'Color notes', value: colorNotes, set: setColorNotes },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">{f.label}</label>
                <textarea
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none resize-none"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[13px] text-carbon/70">
            <span>Measurements OK?</span>
            <button
              type="button"
              onClick={() => setMeasurementsOk(true)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold ${
                measurementsOk === true ? 'bg-moss text-white' : 'bg-white border border-carbon/[0.1] text-carbon/65'
              }`}
            >
              <Check className="h-3 w-3" /> Yes
            </button>
            <button
              type="button"
              onClick={() => setMeasurementsOk(false)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold ${
                measurementsOk === false ? 'bg-red-500 text-white' : 'bg-white border border-carbon/[0.1] text-carbon/65'
              }`}
            >
              <X className="h-3 w-3" /> No
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-[12px] font-semibold text-carbon/60 hover:bg-carbon/[0.04]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy === 'save'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-60"
            >
              {busy === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
