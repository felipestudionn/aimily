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
    <div className="min-h-screen bg-crema flex flex-col">
      {/* Header */}
      {header}

      {/* Progress bar */}
      {showProgress && (
        <div className="fixed top-20 left-0 right-0 z-40">
          <div className="max-w-5xl mx-auto px-6">
            <div className="h-px bg-gris/20">
              <div
                className="h-px bg-carbon transition-all duration-700 ease-out"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pt-28 pb-32">
        <div className="w-full max-w-2xl" key={step.id}>
          {step.render(next)}
        </div>
      </div>

      {/* Footer nav */}
      {!step.autoAdvance && (
        <div className="fixed bottom-0 left-0 right-0 bg-crema pb-10 pt-6">
          <div className="max-w-2xl mx-auto px-6 flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                onClick={back}
                className="inline-flex items-center gap-2 text-sm text-texto/30 hover:text-texto transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={next}
              disabled={step.canAdvance === false}
              className="inline-flex items-center gap-2 px-8 py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-20"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
