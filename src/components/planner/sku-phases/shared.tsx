'use client';

import React, { useState } from 'react';
import { X, ImagePlus, Loader2, Camera, Star } from 'lucide-react';

/* ── Image Upload Area ── */
export function ImageUploadArea({
  imageUrl, uploading, placeholder, onUpload, onRemove, aspectClass = 'aspect-[4/3]',
}: {
  imageUrl?: string;
  uploading: boolean;
  placeholder: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  aspectClass?: string;
}) {
  return (
    <div className={`border border-carbon/[0.06] overflow-hidden bg-white ${aspectClass} relative`}>
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="" className="w-full h-full object-contain" />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-carbon/80 text-white flex items-center justify-center hover:bg-carbon transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-carbon/[0.02] transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          {uploading ? (
            <Loader2 className="h-6 w-6 text-carbon/20 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-carbon/15 mb-2" />
              <span className="text-[11px] text-carbon/25">{placeholder}</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}

/* ── Metric Cell ── */
export function MetricCell({ label, value, secondary, editable, onChange }: {
  label: string;
  value: string;
  secondary?: boolean;
  editable?: boolean;
  onChange?: (val: string) => void;
}) {
  return (
    <div>
      <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-0.5">{label}</p>
      {editable && onChange ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-light text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/20 focus:outline-none w-full text-base"
        />
      ) : (
        <p className={`font-light text-carbon ${secondary ? 'text-sm' : 'text-base'}`}>{value}</p>
      )}
    </div>
  );
}

/* ── Size Run Editor ── */
export function SizeRunEditor({
  category, sizeRun, buyUnits, onUpdate,
}: {
  category: string;
  sizeRun: Record<string, number>;
  buyUnits: number;
  onUpdate: (sizeRun: Record<string, number>) => void;
}) {
  const sizes = category === 'CALZADO'
    ? ['35','36','37','38','39','40','41','42','43','44','45']
    : category === 'ROPA'
      ? ['XXS','XS','S','M','L','XL','XXL']
      : ['ONE'];

  const total = Object.values(sizeRun).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sizes.map(size => (
          <div key={size} className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-carbon/30 uppercase tracking-wider">{size}</span>
            <input
              type="number"
              min={0}
              className="h-8 w-14 text-center text-xs border border-carbon/[0.08] bg-transparent text-carbon focus:outline-none focus:border-carbon/[0.2]"
              value={sizeRun[size] || ''}
              placeholder="0"
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                const newRun = { ...sizeRun, [size]: val };
                if (val === 0) delete newRun[size];
                onUpdate(newRun);
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-carbon/30">
        <span>Total: {total} units</span>
        {buyUnits > 0 && total !== buyUnits && (
          <span className="text-[#c77000]">Plan: {buyUnits} units</span>
        )}
      </div>
    </div>
  );
}

/* ── Star Rating ── */
export function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <Star
            className={`h-4 w-4 ${
              value && star <= value ? 'fill-[#c77000] text-[#c77000]' : 'text-carbon/15'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ── Status Badge ── */
export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-carbon/[0.06]', text: 'text-carbon/40' },
    draft: { bg: 'bg-carbon/[0.06]', text: 'text-carbon/40' },
    review: { bg: 'bg-[#c77000]/10', text: 'text-[#c77000]' },
    issues_found: { bg: 'bg-[#c77000]/10', text: 'text-[#c77000]' },
    issues: { bg: 'bg-[#c77000]/10', text: 'text-[#c77000]' },
    approved: { bg: 'bg-[#2d6a4f]/10', text: 'text-[#2d6a4f]' },
    rejected: { bg: 'bg-carbon/10', text: 'text-carbon/50' },
    proposed: { bg: 'bg-carbon/[0.06]', text: 'text-carbon/40' },
    sampled: { bg: 'bg-[#c77000]/10', text: 'text-[#c77000]' },
    production: { bg: 'bg-[#2d6a4f]/10', text: 'text-[#2d6a4f]' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`px-2 py-0.5 text-[9px] font-semibold tracking-[0.05em] uppercase rounded ${c.bg} ${c.text}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

/* ── Severity Badge ── */
export function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, string> = {
    low: 'bg-carbon/[0.06] text-carbon/40',
    medium: 'bg-[#c77000]/10 text-[#c77000]',
    high: 'bg-[#A0463C]/10 text-[#A0463C]',
    critical: 'bg-[#A0463C]/20 text-[#A0463C]',
  };
  return (
    <span className={`px-2 py-0.5 text-[8px] font-semibold tracking-[0.05em] uppercase rounded ${config[severity] || config.low}`}>
      {severity}
    </span>
  );
}
