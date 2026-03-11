'use client';

import { useState, useCallback, ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface WizardStep {
  id: string;
  render: (onNext: () => void) => ReactNode;
  /** If true, step auto-advances (no Next button shown) */
  autoAdvance?: boolean;
  /** If true, the Next button is enabled */
  canAdvance?: boolean;
  /** If true, use wider layout (max-w-6xl) for content-heavy steps */
  wide?: boolean;
}

interface BlockWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
  /** Optional: render custom header (e.g. logo + cancel) */
  header?: ReactNode;
  /** Show thin progress bar */
  showProgress?: boolean;
}

export function BlockWizard({
  steps,
  onComplete,
  header,
  showProgress = true,
}: BlockWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length, onComplete]);

  const back = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const step = steps[currentStep];
  if (!step) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-white">
      {/* Header */}
      {header}

      {/* Progress bar — thin, top of content area */}
      {showProgress && (
        <div className="px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] tracking-[0.15em] uppercase text-texto/20">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <div className="h-[1px] bg-black/[0.06]">
              <div
                className="h-[1px] bg-texto/40 transition-all duration-700 ease-out"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content — centered vertically (or scrollable for wide steps) */}
      <div className={`flex-1 ${step.wide ? 'overflow-y-auto' : 'flex items-center justify-center'} px-8 py-12`}>
        <div className={`w-full ${step.wide ? 'max-w-6xl mx-auto' : 'max-w-2xl'}`} key={step.id}>
          {step.render(next)}
        </div>
      </div>

      {/* Footer nav — subtle, bottom */}
      {!step.autoAdvance && (
        <div className="border-t border-black/[0.04] bg-white py-5">
          <div className={`${step.wide ? 'max-w-6xl' : 'max-w-2xl'} mx-auto px-8 flex items-center justify-between`}>
            {currentStep > 0 ? (
              <button
                onClick={back}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.08em] uppercase text-texto/25 hover:text-texto/50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={next}
              disabled={step.canAdvance === false}
              className="inline-flex items-center gap-2 px-8 py-3 bg-carbon text-crema text-[11px] font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-15"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
