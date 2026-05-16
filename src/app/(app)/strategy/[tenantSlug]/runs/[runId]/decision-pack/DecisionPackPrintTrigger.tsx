'use client';

import { Printer } from 'lucide-react';

export function DecisionPackPrintTrigger() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90"
    >
      <Printer className="h-3.5 w-3.5" />
      Save as PDF
    </button>
  );
}
