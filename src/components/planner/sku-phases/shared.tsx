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
      <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-carbon/40 mb-1.5">{label}</p>
      {editable && onChange ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-medium text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/30 focus:outline-none w-full text-[15px] pb-1 transition-colors"
        />
      ) : (
        <p className={`font-medium text-carbon tracking-[-0.01em] ${secondary ? 'text-[14px]' : 'text-[15px]'}`}>{value}</p>
      )}
    </div>
  );
}

/* ── Size Run Editor ── */
/* ── Size distribution curves (industry standard) ── */
const FOOTWEAR_CURVES: Record<string, Record<string, number>> = {
  women: { '35': 0.04, '36': 0.08, '37': 0.16, '38': 0.22, '39': 0.22, '40': 0.16, '41': 0.08, '42': 0.04 },
  men:   { '39': 0.04, '40': 0.08, '41': 0.14, '42': 0.22, '43': 0.22, '44': 0.16, '45': 0.10, '46': 0.04 },
};
const APPAREL_CURVES: Record<string, Record<string, number>> = {
  women: { 'XXS': 0.05, 'XS': 0.10, 'S': 0.20, 'M': 0.25, 'L': 0.20, 'XL': 0.15, 'XXL': 0.05 },
  men:   { 'XS': 0.05, 'S': 0.10, 'M': 0.25, 'L': 0.25, 'XL': 0.20, 'XXL': 0.10, '3XL': 0.05 },
};

function autoFillSizeRun(category: string, gender: string, units: number): Record<string, number> {
  const isFootwear = category === 'CALZADO' || category === 'FOOTWEAR';
  const curves = isFootwear ? FOOTWEAR_CURVES : APPAREL_CURVES;
  const curve = curves[gender] || curves['women'];
  const result: Record<string, number> = {};
  let remaining = units;
  const entries = Object.entries(curve);
  entries.forEach(([size, pct], i) => {
    if (i === entries.length - 1) {
      result[size] = remaining;
    } else {
      const qty = Math.round(units * pct);
      result[size] = qty;
      remaining -= qty;
    }
  });
  return result;
}

export function SizeRunEditor({
  category, sizeRun, buyUnits, onUpdate, gender: initialGender,
}: {
  category: string;
  sizeRun: Record<string, number>;
  buyUnits: number;
  onUpdate: (sizeRun: Record<string, number>) => void;
  gender?: string;
}) {
  const [gender, setGender] = useState(initialGender || 'unisex');
  const [unisexSplit, setUnisexSplit] = useState(50); // % women

  const isFootwear = category === 'CALZADO' || category === 'FOOTWEAR';
  const sizes = gender === 'men'
    ? (isFootwear ? ['39','40','41','42','43','44','45','46'] : ['XS','S','M','L','XL','XXL','3XL'])
    : gender === 'women'
      ? (isFootwear ? ['35','36','37','38','39','40','41','42'] : ['XXS','XS','S','M','L','XL','XXL'])
      : (isFootwear ? ['35','36','37','38','39','40','41','42','43','44','45','46'] : ['XXS','XS','S','M','L','XL','XXL','3XL']);

  const total = Object.values(sizeRun).reduce((a, b) => a + b, 0);

  const handleAutoFill = () => {
    if (buyUnits <= 0) return;
    if (gender === 'unisex') {
      const womenUnits = Math.round(buyUnits * (unisexSplit / 100));
      const menUnits = buyUnits - womenUnits;
      const wRun = autoFillSizeRun(category, 'women', womenUnits);
      const mRun = autoFillSizeRun(category, 'men', menUnits);
      const merged: Record<string, number> = {};
      for (const [s, v] of Object.entries(wRun)) merged[s] = (merged[s] || 0) + v;
      for (const [s, v] of Object.entries(mRun)) merged[s] = (merged[s] || 0) + v;
      onUpdate(merged);
    } else {
      onUpdate(autoFillSizeRun(category, gender, buyUnits));
    }
  };

  return (
    <div className="space-y-3">
      {/* Gender selector */}
      <div className="flex items-center gap-3">
        <div className="flex border border-carbon/[0.06] overflow-hidden">
          {['women', 'men', 'unisex'].map(g => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase transition-colors ${
                gender === g ? 'bg-carbon text-crema' : 'bg-white text-carbon/35 hover:text-carbon/60'
              }`}
            >
              {g === 'women' ? 'Women' : g === 'men' ? 'Men' : 'Unisex'}
            </button>
          ))}
        </div>
        {buyUnits > 0 && (
          <button
            onClick={handleAutoFill}
            className="px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema transition-colors"
          >
            Auto-fill ({buyUnits} units)
          </button>
        )}
      </div>

      {/* Unisex split slider */}
      {gender === 'unisex' && (
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-carbon/30 uppercase tracking-wider w-16">Women {unisexSplit}%</span>
          <input
            type="range" min={20} max={80} value={unisexSplit}
            onChange={(e) => setUnisexSplit(Number(e.target.value))}
            className="flex-1 h-1 accent-carbon"
          />
          <span className="text-[9px] text-carbon/30 uppercase tracking-wider w-12">Men {100 - unisexSplit}%</span>
        </div>
      )}

      {/* Size inputs */}
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
          <span className="text-warning">Plan: {buyUnits} units</span>
        )}
        {buyUnits > 0 && total === buyUnits && (
          <span className="text-success">Matches plan</span>
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
              value && star <= value ? 'fill-warning text-warning' : 'text-carbon/15'
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
    review: { bg: 'bg-warning/10', text: 'text-warning' },
    issues_found: { bg: 'bg-warning/10', text: 'text-warning' },
    issues: { bg: 'bg-warning/10', text: 'text-warning' },
    approved: { bg: 'bg-success/10', text: 'text-success' },
    rejected: { bg: 'bg-carbon/10', text: 'text-carbon/50' },
    proposed: { bg: 'bg-carbon/[0.06]', text: 'text-carbon/40' },
    sampled: { bg: 'bg-warning/10', text: 'text-warning' },
    production: { bg: 'bg-success/10', text: 'text-success' },
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
    medium: 'bg-warning/10 text-warning',
    high: 'bg-error/10 text-error',
    critical: 'bg-error/20 text-error',
  };
  return (
    <span className={`px-2 py-0.5 text-[8px] font-semibold tracking-[0.05em] uppercase rounded ${config[severity] || config.low}`}>
      {severity}
    </span>
  );
}
