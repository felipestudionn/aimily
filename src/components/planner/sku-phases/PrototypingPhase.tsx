'use client';

import React, { useState } from 'react';
import { Camera, ArrowLeftRight, RefreshCw, Check, X, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU, ProtoIteration } from '@/hooks/useSkus';
import { ImageUploadArea } from './shared';

interface PrototypingPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: string) => void;
  uploading: string | null;
}

type ProtoStatus = 'waiting' | 'received' | 'reviewing' | 'approved' | 'rejected';

export function PrototypingPhase({ sku, onUpdate, onImageUpload, uploading }: PrototypingPhaseProps) {
  const t = useTranslation();
  const iterations = sku.proto_iterations || [];
  const [newNotes, setNewNotes] = useState('');

  const latestIteration = iterations[iterations.length - 1];
  const hasApproved = iterations.some(it => it.status === 'approved');

  /* ── Add new proto iteration ── */
  const addIteration = async () => {
    const newIter: ProtoIteration = {
      id: crypto.randomUUID(),
      images: [],
      notes: newNotes,
      status: 'pending',
      created_at: new Date().toISOString().split('T')[0],
    };
    await onUpdate({ proto_iterations: [...iterations, newIter] });
    setNewNotes('');
  };

  /* ── Update iteration status ── */
  const updateIterationStatus = async (iterId: string, status: ProtoIteration['status']) => {
    const updated = iterations.map(it => it.id === iterId ? { ...it, status } : it);
    await onUpdate({ proto_iterations: updated });
  };

  /* ── Update iteration notes ── */
  const updateIterationNotes = async (iterId: string, notes: string) => {
    const updated = iterations.map(it => it.id === iterId ? { ...it, notes } : it);
    await onUpdate({ proto_iterations: updated });
  };

  /* ── Add image to iteration ── */
  const addImageToIteration = async (iterId: string, imageUrl: string) => {
    const updated = iterations.map(it =>
      it.id === iterId ? { ...it, images: [...it.images, imageUrl] } : it
    );
    await onUpdate({ proto_iterations: updated });
  };

  /* ── Remove image from iteration ── */
  const removeImage = async (iterId: string, imgIdx: number) => {
    const updated = iterations.map(it =>
      it.id === iterId ? { ...it, images: it.images.filter((_, i) => i !== imgIdx) } : it
    );
    await onUpdate({ proto_iterations: updated });
  };

  return (
    <div className="space-y-5">
      {/* ── Header: design reference ── */}
      <div className="flex items-start gap-5">
        {/* Sketch / Reference for comparison */}
        <div className="w-36 shrink-0 space-y-2">
          <p className="text-[9px] text-carbon/30 uppercase tracking-wider">
            {t.skuPhases?.sketchReference || 'Design Reference'}
          </p>
          <div className="border border-carbon/[0.06] overflow-hidden aspect-[3/4] bg-white">
            {sku.sketch_url ? (
              <img src={sku.sketch_url} alt="Sketch" className="w-full h-full object-contain" />
            ) : sku.reference_image_url ? (
              <img src={sku.reference_image_url} alt="Reference" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-[10px] text-carbon/15">{t.skuPhases?.noSketch || 'No sketch'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status summary */}
        <div className="flex-1 pt-6">
          <p className="text-sm font-light text-carbon/60 leading-relaxed">
            {t.skuPhases?.protoDesc || 'Upload photos of each prototype you receive. Compare with the design reference and mark as approved or request corrections.'}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-light text-carbon">{iterations.length}</p>
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.iterations || 'iterations'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-light text-carbon">{iterations.filter(it => it.status === 'approved').length}</p>
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.protoApproved || 'approved'}</p>
            </div>
            {hasApproved && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d6a4f]/10 text-[#2d6a4f]">
                <Check className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">{t.skuPhases?.protoReady || 'Ready'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Proto Iterations ── */}
      <div className="space-y-4">
        {iterations.map((iter, idx) => (
          <IterationCard
            key={iter.id}
            iteration={iter}
            index={idx}
            sketchUrl={sku.sketch_url || sku.reference_image_url}
            onStatusChange={(status) => updateIterationStatus(iter.id, status)}
            onNotesChange={(notes) => updateIterationNotes(iter.id, notes)}
            onAddImage={async (file) => {
              // Convert to base64 for now
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result as string;
                addImageToIteration(iter.id, base64);
              };
              reader.readAsDataURL(file);
            }}
            onRemoveImage={(imgIdx) => removeImage(iter.id, imgIdx)}
            t={t}
          />
        ))}
      </div>

      {/* ── Request new proto ── */}
      <div className="border border-dashed border-carbon/[0.1] bg-white p-5 space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
          {iterations.length === 0
            ? (t.skuPhases?.firstProto || 'Register first prototype')
            : (t.skuPhases?.requestNewProto || 'Request new prototype iteration')}
        </p>
        <textarea
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder={t.skuPhases?.protoRequestNotes || 'Notes for this iteration (corrections requested, factory instructions...)'}
          className="w-full h-16 p-3 border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
        />
        <button
          onClick={addIteration}
          className="flex items-center gap-2 px-5 py-2.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors"
        >
          <Plus className="h-3 w-3" />
          {iterations.length === 0
            ? (t.skuPhases?.registerProto || 'Register Proto')
            : (t.skuPhases?.newIteration || 'New Iteration')}
        </button>
      </div>
    </div>
  );
}

/* ── Iteration Card ── */
function IterationCard({ iteration, index, sketchUrl, onStatusChange, onNotesChange, onAddImage, onRemoveImage, t }: {
  iteration: ProtoIteration;
  index: number;
  sketchUrl?: string;
  onStatusChange: (status: ProtoIteration['status']) => void;
  onNotesChange: (notes: string) => void;
  onAddImage: (file: File) => void;
  onRemoveImage: (imgIdx: number) => void;
  t: ReturnType<typeof useTranslation>;
}) {
  const [notes, setNotes] = useState(iteration.notes);

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-carbon/[0.06]', text: 'text-carbon/50', label: t.skuPhases?.statusWaiting || 'Waiting for proto' },
    issues: { bg: 'bg-[#c77000]/10', text: 'text-[#c77000]', label: t.skuPhases?.statusIssues || 'Issues found' },
    approved: { bg: 'bg-[#2d6a4f]/10', text: 'text-[#2d6a4f]', label: t.skuPhases?.statusApproved || 'Approved' },
    rejected: { bg: 'bg-[#A0463C]/10', text: 'text-[#A0463C]', label: t.skuPhases?.statusRejected || 'Rejected — new proto needed' },
  };
  const sc = statusConfig[iteration.status] || statusConfig.pending;

  return (
    <div className="border border-carbon/[0.06] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-carbon/[0.04]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-carbon/40">
            Proto {index + 1}
          </span>
          <span className="text-[10px] text-carbon/25">{iteration.created_at}</span>
        </div>
        {/* Status pills */}
        <div className="flex items-center bg-carbon/[0.04] rounded-full p-0.5">
          {(['pending', 'issues', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`px-3 py-1 text-[9px] font-medium tracking-[0.08em] uppercase transition-all rounded-full ${
                iteration.status === s
                  ? `${statusConfig[s].bg} ${statusConfig[s].text} shadow-sm`
                  : 'text-carbon/25 hover:text-carbon/40'
              }`}
            >
              {s === 'pending' ? (t.skuPhases?.waiting || 'Waiting') :
               s === 'issues' ? (t.skuPhases?.issues || 'Issues') :
               s === 'approved' ? (t.skuPhases?.approved || 'Approved') :
               (t.skuPhases?.rejected || 'Rejected')}
            </button>
          ))}
        </div>
      </div>

      {/* Content: photos + comparison */}
      <div className="p-5">
        <div className="flex gap-4">
          {/* Proto photos */}
          <div className="flex-1 space-y-3">
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.protoPhotos || 'Proto Photos'}</p>
            <div className="flex gap-2 flex-wrap">
              {iteration.images.map((img, imgIdx) => (
                <div key={imgIdx} className="relative w-24 h-24 border border-carbon/[0.06] overflow-hidden group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => onRemoveImage(imgIdx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-carbon/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {/* Add photo */}
              <label className="w-24 h-24 border border-dashed border-carbon/[0.1] flex flex-col items-center justify-center cursor-pointer hover:border-carbon/20 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAddImage(file);
                }} />
                <Camera className="h-4 w-4 text-carbon/15" />
                <span className="text-[8px] text-carbon/20 mt-1">{t.skuPhases?.addPhoto || 'Add photo'}</span>
              </label>
            </div>
          </div>

          {/* Comparison: sketch vs proto */}
          {sketchUrl && iteration.images.length > 0 && (
            <div className="w-48 shrink-0 space-y-2">
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" /> {t.skuPhases?.comparison || 'Compare'}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <div className="border border-carbon/[0.06] overflow-hidden aspect-square">
                  <img src={sketchUrl} alt="Sketch" className="w-full h-full object-contain bg-white" />
                </div>
                <div className="border border-carbon/[0.06] overflow-hidden aspect-square">
                  <img src={iteration.images[iteration.images.length - 1]} alt="Proto" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex justify-between text-[8px] text-carbon/20 uppercase tracking-wider">
                <span>{t.skuPhases?.design || 'Design'}</span>
                <span>Proto</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => { if (notes !== iteration.notes) onNotesChange(notes); }}
            placeholder={t.skuPhases?.protoNotes || 'Review notes, corrections needed, observations...'}
            className="w-full h-14 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
