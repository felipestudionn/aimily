'use client';

/**
 * <PantonePicker>
 *
 * Drop-in replacement for free-text Pantone code inputs across the app.
 * Backed by the curated PANTONE_CATALOG (TCX-focused, ~80 fashion
 * staples + Colors of the Year). Supports two complementary flows:
 *
 *   1) Designer types or pastes a Pantone code → autocomplete from
 *      catalog with hex preview chip.
 *   2) Designer has a hex they like → "What's the closest Pantone?"
 *      panel opens, sorted by ΔE2000 perceptual distance.
 *
 * Used by:
 *   - <ColorwayCard> in SketchPhase Colorways sub-step
 *     (sku_colorways.pantone_primary / pantone_secondary)
 *   - <TechPackSheet> Material Swatches section
 *     (tech_pack_data.materials.zones[].pantone)
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import {
  PANTONE_CATALOG,
  PANTONE_BY_CODE,
  PANTONE_FAMILIES,
  PANTONE_FAMILY_LABELS,
  closestPantone,
  searchPantone,
  hexToRgb,
  type PantoneColor,
  type PantoneFamily,
} from '@/lib/pantone-library';

interface PantonePickerProps {
  /** Current Pantone code, e.g. "18-1664 TCX" or empty string. */
  value: string;
  /** Called when the user picks a Pantone code from the catalog. */
  onChange: (code: string, picked: PantoneColor | null) => void;
  /** Optional: sync hex when a Pantone is picked (writes to sku_colorways.hex_*). */
  onHexChange?: (hex: string) => void;
  /** Optional: target hex for closest-Pantone matching. */
  targetHex?: string;
  size?: 'compact' | 'default';
  placeholder?: string;
  /** Optional override of the input className for context-specific styling. */
  inputClassName?: string;
}

export function PantonePicker({
  value,
  onChange,
  onHexChange,
  targetHex,
  size = 'default',
  placeholder = 'Code or name (e.g. 18-1664 TCX)',
  inputClassName,
}: PantonePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFamily, setActiveFamily] = useState<PantoneFamily | 'all' | 'closest'>('all');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentColor = value ? PANTONE_BY_CODE[value] : undefined;

  const list = useMemo(() => {
    if (activeFamily === 'closest' && targetHex) {
      return closestPantone(targetHex, 12).map((m) => m as PantoneColor);
    }
    if (query.trim()) return searchPantone(query, 60);
    if (activeFamily === 'all') return PANTONE_CATALOG;
    return PANTONE_CATALOG.filter((c) => c.family === activeFamily);
  }, [query, activeFamily, targetHex]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleSelect = useCallback(
    (c: PantoneColor) => {
      onChange(c.code, c);
      onHexChange?.(c.hex);
      setQuery('');
      setOpen(false);
    },
    [onChange, onHexChange],
  );

  const handleClear = useCallback(() => {
    onChange('', null);
    setQuery('');
    inputRef.current?.focus();
  }, [onChange]);

  const isCompact = size === 'compact';
  const inputClasses = inputClassName
    ?? (isCompact
      ? 'text-[11px] text-carbon/70 placeholder:text-carbon/30 bg-transparent border-b border-carbon/[0.06] focus:outline-none focus:border-carbon/[0.2] py-1 w-full pl-7 pr-7'
      : 'text-[13px] text-carbon placeholder:text-carbon/30 bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:outline-none focus:border-carbon/20 px-3 py-2.5 w-full pl-10 pr-9 transition-colors');

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        {/* Hex chip preview on the left of the input */}
        <div
          className={`absolute left-1.5 top-1/2 -translate-y-1/2 ${isCompact ? 'w-4 h-4' : 'w-5 h-5'} rounded border border-carbon/[0.1] pointer-events-none`}
          style={{ backgroundColor: currentColor?.hex || (open ? 'transparent' : '#f0eee9') }}
        />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : value}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={inputClasses}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !open && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:text-[#A0463C]/60 text-carbon/30"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-carbon/30 transition-transform pointer-events-none ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-[12px] border border-carbon/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden min-w-[320px]">
          {/* Family tabs */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-carbon/[0.06] overflow-x-auto">
            <FamilyChip label="All" active={activeFamily === 'all'} onClick={() => setActiveFamily('all')} />
            {targetHex && (
              <FamilyChip
                label="Closest match"
                active={activeFamily === 'closest'}
                onClick={() => setActiveFamily('closest')}
                emphasised
              />
            )}
            {PANTONE_FAMILIES.map((f) => (
              <FamilyChip
                key={f}
                label={PANTONE_FAMILY_LABELS[f]}
                active={activeFamily === f}
                onClick={() => setActiveFamily(f)}
              />
            ))}
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-carbon/[0.06] flex items-center gap-2">
            <Search className="h-3 w-3 text-carbon/30 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code or name…"
              className="flex-1 text-[11px] text-carbon placeholder:text-carbon/30 bg-transparent focus:outline-none"
            />
            <span className="text-[9px] text-carbon/30 shrink-0">{list.length}</span>
          </div>

          {/* Color list — grid of swatches */}
          <div className="max-h-[280px] overflow-y-auto p-2">
            {list.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-carbon/40">
                No Pantone matches{query ? ` for "${query}"` : ''}.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {list.map((c) => (
                  <ColorChip
                    key={c.id}
                    color={c}
                    onClick={() => handleSelect(c)}
                    isCurrent={c.code === value}
                    delta={'delta' in c ? (c as PantoneColor & { delta?: number }).delta : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-carbon/[0.06] bg-carbon/[0.01]">
            <p className="text-[9px] text-carbon/30">
              Pantone TCX codes are industry references. Factories should always receive a physical chip or LAB target for color contracts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function FamilyChip({
  label, active, onClick, emphasised,
}: { label: string; active: boolean; onClick: () => void; emphasised?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-medium tracking-[-0.005em] transition-colors ${
        active
          ? 'bg-carbon text-white'
          : emphasised
            ? 'bg-[#c77000]/[0.08] text-[#c77000] hover:bg-[#c77000]/15'
            : 'text-carbon/40 hover:bg-carbon/[0.04] hover:text-carbon/70'
      }`}
    >
      {label}
    </button>
  );
}

function ColorChip({
  color, onClick, isCurrent, delta,
}: { color: PantoneColor; onClick: () => void; isCurrent: boolean; delta?: number }) {
  const rgb = hexToRgb(color.hex);
  const isLight = rgb ? (rgb.r + rgb.g + rgb.b) / 3 > 200 : false;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col rounded-[8px] overflow-hidden border transition-all text-left ${
        isCurrent
          ? 'border-carbon shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
          : 'border-carbon/[0.06] hover:border-carbon/20'
      }`}
    >
      <div
        className="h-12 w-full relative"
        style={{ backgroundColor: color.hex }}
      >
        {isCurrent && (
          <Check
            className={`absolute top-1.5 right-1.5 h-3 w-3 ${isLight ? 'text-carbon' : 'text-white'}`}
            strokeWidth={3}
          />
        )}
        {delta != null && (
          <span className={`absolute bottom-1 left-1.5 text-[8px] font-mono ${isLight ? 'text-carbon/70' : 'text-white/85'}`}>
            ΔE {delta.toFixed(1)}
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 bg-white">
        <p className="text-[9px] text-carbon/40 font-mono leading-tight">{color.code}</p>
        <p className="text-[10px] text-carbon font-medium tracking-[-0.01em] truncate leading-tight">
          {color.name}
        </p>
      </div>
    </button>
  );
}
