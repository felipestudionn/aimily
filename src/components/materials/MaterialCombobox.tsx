'use client';

/**
 * <MaterialCombobox>
 *
 * Drop-in replacement for free-text material inputs across the app.
 * Backed by the deterministic Materials Library catalog (rama-1 to rama-8)
 * and the rule-based `rankMaterials()` engine — no LLM call.
 *
 * Pattern: aimily-native primitive (consistent with SegmentedPill,
 * ConfirmDialog). Cmd-K-style search, grouped by family, inline preview
 * (name · composition · supplier · weight), keyboard navigation. Falls
 * back to free text when the user types something not in the catalog
 * (rare path — flagged with a "Custom" pill).
 *
 * Used by:
 *   - SketchPhase.tsx Materials sub-step (per-zone material selection)
 *   - TechPackSheet.tsx Material Swatches section
 *   - TechPackSheet.tsx BOM rows (the `material` cell)
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X, Check, Sparkles } from 'lucide-react';
import {
  CATALOG,
  rankMaterials,
  type Material,
  type CategoryMaster,
  type Zone,
  type ProductSubtype,
  type PriceTier,
  type AestheticTag,
  type SeasonFit,
  type MaterialFilterContext,
} from '@/lib/materials-library';

interface MaterialComboboxProps {
  /** Current value displayed in the input. */
  value: string;
  /** Called when the user picks a material from the list or types free text. */
  onChange: (value: string, picked: Material | null) => void;
  /** Required — narrows catalog by ROPA / CALZADO / ACCESORIOS. */
  category: CategoryMaster;
  /** Optional zone filter (Body / Lining / Upper / etc.). */
  zone?: Zone;
  /** Optional product subtype (dress / sneaker / tote / etc.) — improves ranking. */
  subtype?: ProductSubtype;
  /** Optional CIS brand price tier — improves ranking. */
  brandPriceTier?: PriceTier;
  /** Optional CIS aesthetic tags — improves ranking. */
  brandAesthetic?: AestheticTag[];
  /** Optional season — improves ranking. */
  season?: SeasonFit;
  /** Optional vegan brand flag — hard filter. */
  veganBrand?: boolean;
  /** Visual size variant. */
  size?: 'compact' | 'default';
  /** Placeholder when value is empty. */
  placeholder?: string;
  /** Show only L1+L2 (browse) or include L3 (procurement). Default L1+L2. */
  includeSuppliers?: boolean;
}

export function MaterialCombobox({
  value,
  onChange,
  category,
  zone,
  subtype,
  brandPriceTier,
  brandAesthetic,
  season,
  veganBrand,
  size = 'default',
  placeholder = 'Choose or type a material…',
  includeSuppliers = false,
}: MaterialComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filterCtx: MaterialFilterContext = useMemo(
    () => ({
      category,
      zone,
      subtype,
      brandPriceTier,
      brandAesthetic,
      season,
      veganBrand,
      query,
      layers: includeSuppliers ? ['L1', 'L2', 'L3'] : ['L1', 'L2'],
    }),
    [category, zone, subtype, brandPriceTier, brandAesthetic, season, veganBrand, query, includeSuppliers],
  );

  const ranked = useMemo(() => rankMaterials(CATALOG, filterCtx, 30), [filterCtx]);

  // Group by family for the dropdown UI.
  const grouped = useMemo(() => {
    const groups: Record<string, Material[]> = {};
    for (const m of ranked) {
      const familyLabel = familyDisplayLabel(m.family);
      if (!groups[familyLabel]) groups[familyLabel] = [];
      groups[familyLabel].push(m);
    }
    return Object.entries(groups);
  }, [ranked]);

  // Flat list for keyboard nav (parallel to grouped, so indexes align).
  const flatList = useMemo(() => grouped.flatMap(([, arr]) => arr), [grouped]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset active index when list changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const handleSelect = useCallback(
    (m: Material) => {
      onChange(m.name, m);
      setQuery('');
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          setOpen(true);
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const m = flatList[activeIdx];
        if (m) handleSelect(m);
        else if (query.trim()) {
          // Free text fallback
          onChange(query.trim(), null);
          setQuery('');
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    },
    [open, flatList, activeIdx, handleSelect, query, onChange],
  );

  const handleClear = useCallback(() => {
    onChange('', null);
    setQuery('');
    inputRef.current?.focus();
  }, [onChange]);

  const isCompact = size === 'compact';
  const inputClasses = isCompact
    ? 'text-[11px] text-carbon/70 placeholder:text-carbon/30 bg-transparent border-b border-carbon/[0.06] focus:outline-none focus:border-carbon/[0.2] py-1 w-full pr-7'
    : 'text-[13px] text-carbon placeholder:text-carbon/30 bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:outline-none focus:border-carbon/20 px-3 py-2.5 w-full pr-9 transition-colors';

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
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
          onKeyDown={handleKeyDown}
          className={inputClasses}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {value && !open && (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto p-0.5 hover:text-[#A0463C]/60 text-carbon/30"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-carbon/30 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* ─── Dropdown ─── */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-[12px] border border-carbon/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Header — search hint + filter badges */}
          <div className="px-3 py-2 border-b border-carbon/[0.06] flex items-center gap-2">
            <Search className="h-3 w-3 text-carbon/30 shrink-0" />
            <span className="text-[10px] text-carbon/40 truncate">
              {ranked.length} match{ranked.length === 1 ? '' : 'es'}
              {zone ? ` · ${zone}` : ''}
              {subtype ? ` · ${subtype}` : ''}
              {brandPriceTier ? ` · ${brandPriceTier}` : ''}
              {veganBrand ? ' · vegan only' : ''}
            </span>
            {brandAesthetic && brandAesthetic.length > 0 && (
              <Sparkles className="h-3 w-3 text-carbon/30 shrink-0" />
            )}
          </div>

          {/* Results — scrollable */}
          <div className="max-h-[320px] overflow-y-auto">
            {grouped.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px] text-carbon/40">
                  No catalog match{query ? ` for "${query}"` : ''}.
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(query.trim(), null);
                      setQuery('');
                      setOpen(false);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium bg-carbon text-white hover:bg-carbon/90 transition-colors"
                  >
                    <Check className="h-2.5 w-2.5" />
                    Use "{query.trim()}" as custom
                  </button>
                )}
              </div>
            ) : (
              grouped.map(([family, items]) => (
                <div key={family} className="py-1">
                  <p className="text-[8px] tracking-[0.15em] uppercase text-carbon/30 px-3 py-1 sticky top-0 bg-white/95 backdrop-blur-sm">
                    {family}
                  </p>
                  {items.map((m) => {
                    const flatIdx = flatList.indexOf(m);
                    const isActive = flatIdx === activeIdx;
                    const isCurrent = m.name === value;
                    const subline = buildSubline(m);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onMouseEnter={() => setActiveIdx(flatIdx)}
                        onClick={() => handleSelect(m)}
                        className={`w-full px-3 py-2 flex items-start gap-2 text-left transition-colors ${
                          isActive ? 'bg-carbon/[0.04]' : 'hover:bg-carbon/[0.02]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-carbon font-medium truncate">{m.name}</span>
                            {m.layer === 'L3' && (
                              <span className="text-[8px] tracking-wider uppercase text-carbon/40 px-1 py-0.5 bg-carbon/[0.04] rounded">
                                Mill
                              </span>
                            )}
                            {!m.vegan && (
                              <span className="text-[8px] tracking-wider uppercase text-[#A0463C]/60 px-1 py-0.5 bg-[#A0463C]/[0.06] rounded">
                                Animal
                              </span>
                            )}
                            {m.citesStatus && (
                              <span className="text-[8px] tracking-wider uppercase text-[#c77000] px-1 py-0.5 bg-[#c77000]/10 rounded">
                                CITES {m.citesStatus}
                              </span>
                            )}
                          </div>
                          {subline && (
                            <p className="text-[10px] text-carbon/40 truncate mt-0.5">{subline}</p>
                          )}
                        </div>
                        {isCurrent && <Check className="h-3 w-3 text-carbon/60 shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-carbon/[0.06] bg-carbon/[0.01] flex items-center justify-between">
            <span className="text-[9px] text-carbon/30">↑↓ to navigate · Enter to select · Esc to close</span>
            {query.trim() && grouped.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim(), null);
                  setQuery('');
                  setOpen(false);
                }}
                className="text-[9px] text-carbon/40 hover:text-carbon/70"
              >
                Use "{query.trim()}" as custom
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function familyDisplayLabel(family: Material['family']): string {
  const labels: Record<Material['family'], string> = {
    'natural-cellulosic': 'Natural · Plant',
    'natural-animal': 'Natural · Animal',
    'regenerated-cellulosic': 'Regenerated · Cellulosic',
    'regenerated-protein': 'Regenerated · Protein',
    'bio-based': 'Bio-based',
    synthetic: 'Synthetic',
    'synthetic-recycled': 'Synthetic · Recycled',
    performance: 'Performance',
    'leather-animal': 'Leather · Animal',
    'leather-plant-alt': 'Leather · Plant alt',
    'leather-synthetic-pu': 'Leather · PU',
    'hardware-button': 'Hardware · Buttons',
    'hardware-zipper': 'Hardware · Zippers',
    'hardware-snap': 'Hardware · Snaps',
    'hardware-eyelet': 'Hardware · Eyelets',
    'hardware-buckle': 'Hardware · Buckles',
    'hardware-misc': 'Hardware · Misc',
    thread: 'Thread',
    lining: 'Lining',
    interfacing: 'Interfacing',
    wadding: 'Wadding',
    'sole-rubber': 'Sole · Rubber',
    'sole-foam': 'Sole · Foam',
    'sole-leather': 'Sole · Leather',
    'sole-textile': 'Sole · Textile',
    'accessory-chain': 'Chain',
    'accessory-cord': 'Cord',
    'accessory-decoration': 'Decoration',
  };
  return labels[family] || family;
}

function buildSubline(m: Material): string {
  const parts: string[] = [];
  if (m.composition && m.composition !== m.name) parts.push(m.composition);
  if (m.weightRange?.min != null && m.weightRange?.max != null && m.weightRange.unit) {
    parts.push(`${m.weightRange.min}-${m.weightRange.max} ${m.weightRange.unit}`);
  }
  if (m.supplier?.origin) parts.push(m.supplier.origin);
  return parts.join(' · ');
}
