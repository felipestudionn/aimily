'use client';

import React, { useRef, useEffect, useState } from 'react';

/* ── SegmentedPill ──
 * Unified toggle component used across the entire app for mode selection
 * (Free / Assisted / AI Proposal, or any 1-3 option set).
 *
 * Design: pill-shaped track with a sliding active indicator (bg-carbon).
 * Supports 1, 2, or 3 options. Optional description text beside the control.
 */

export interface SegmentedPillOption<T extends string = string> {
  id: T;
  label: string;
}

interface SegmentedPillProps<T extends string = string> {
  options: SegmentedPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  description?: string;
  size?: 'sm' | 'md';
}

export function SegmentedPill<T extends string = string>({
  options, value, onChange, description, size = 'sm',
}: SegmentedPillProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeIdx = options.findIndex((o) => o.id === value);

  /* Measure active button position for sliding indicator */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-seg-btn]');
    const btn = buttons[activeIdx >= 0 ? activeIdx : 0];
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [activeIdx, options.length]);

  const textClass = size === 'sm'
    ? 'text-[10px] tracking-[0.08em] px-4 py-1.5'
    : 'text-xs tracking-[0.08em] px-5 py-2';

  return (
    <div className="flex items-center gap-3">
      <div
        ref={containerRef}
        className="relative flex items-center bg-carbon/[0.04] border border-carbon/[0.06] rounded-full p-[3px]"
      >
        {/* Sliding indicator */}
        <div
          className="absolute top-[3px] h-[calc(100%-6px)] bg-carbon rounded-full transition-all duration-250 ease-out shadow-sm"
          style={{ left: indicator.left, width: indicator.width }}
        />

        {options.map((opt) => (
          <button
            key={opt.id}
            data-seg-btn
            onClick={() => onChange(opt.id)}
            className={`relative z-10 ${textClass} font-medium uppercase transition-colors duration-200 rounded-full whitespace-nowrap ${
              value === opt.id
                ? 'text-crema'
                : 'text-carbon/35 hover:text-carbon/55'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {description && (
        <span className="hidden sm:inline text-xs text-carbon/40 italic">{description}</span>
      )}
    </div>
  );
}
