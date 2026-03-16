'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlideNavigationProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onDotClick: (index: number) => void;
  showSkip?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

export function SlideNavigation({
  current,
  total,
  onPrev,
  onNext,
  onDotClick,
  showSkip,
  onSkip,
  skipLabel = 'Skip',
}: SlideNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-5xl mx-auto px-6 pb-8 flex items-center justify-between">
        {/* Prev arrow */}
        <button
          onClick={onPrev}
          disabled={current === 0}
          className="pointer-events-auto p-2 text-gris/30 hover:text-crema disabled:opacity-0 transition-all hidden md:block"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Dots + counter */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => onDotClick(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === current
                    ? 'bg-crema scale-125'
                    : 'bg-gris/20 hover:bg-gris/40'
                }`}
              />
            ))}
          </div>
          <span className="text-gris/30 text-[10px] font-medium tracking-[0.15em] uppercase ml-2">
            {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>

        {/* Next arrow */}
        <button
          onClick={onNext}
          disabled={current === total - 1}
          className="pointer-events-auto p-2 text-gris/30 hover:text-crema disabled:opacity-0 transition-all hidden md:block"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Skip button (onboarding mode) */}
      {showSkip && onSkip && (
        <button
          onClick={onSkip}
          className="pointer-events-auto fixed top-6 right-6 text-gris/40 hover:text-crema text-xs font-medium tracking-[0.15em] uppercase transition-colors"
        >
          {skipLabel}
        </button>
      )}
    </div>
  );
}
