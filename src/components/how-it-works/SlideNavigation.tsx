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
    <>
      {/* Large side arrows — centered vertically */}
      <button
        onClick={onPrev}
        disabled={current === 0}
        className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-carbon/40 backdrop-blur-sm border border-gris/20 text-gris/50 hover:text-crema hover:bg-carbon/70 hover:border-gris/40 disabled:opacity-0 disabled:pointer-events-none transition-all"
      >
        <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
      </button>
      <button
        onClick={onNext}
        disabled={current === total - 1}
        className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-carbon/40 backdrop-blur-sm border border-gris/20 text-gris/50 hover:text-crema hover:bg-carbon/70 hover:border-gris/40 disabled:opacity-0 disabled:pointer-events-none transition-all"
      >
        <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
      </button>

      {/* Bottom bar: dots + counter */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center justify-center gap-4 pb-6 md:pb-8">
          {/* Progress bar */}
          <div className="pointer-events-auto flex items-center gap-3 bg-carbon/50 backdrop-blur-sm px-4 py-2.5 border border-gris/10">
            <div className="flex gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onDotClick(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === current
                      ? 'bg-crema w-6'
                      : i < current
                        ? 'bg-gris/40 hover:bg-gris/60'
                        : 'bg-gris/15 hover:bg-gris/30'
                  }`}
                />
              ))}
            </div>
            <span className="text-gris/40 text-[10px] font-medium tracking-[0.15em] uppercase ml-1">
              {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Skip button (onboarding mode) */}
      {showSkip && onSkip && (
        <button
          onClick={onSkip}
          className="fixed top-6 right-6 z-50 px-4 py-2 bg-carbon/40 backdrop-blur-sm border border-gris/20 text-gris/50 hover:text-crema text-xs font-medium tracking-[0.15em] uppercase transition-all hover:bg-carbon/70"
        >
          {skipLabel}
        </button>
      )}
    </>
  );
}
