'use client';

import Link from 'next/link';

export function PresentationNav({ collectionId, totalSkus }: { collectionId: string; totalSkus: number }) {
  return (
    <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-carbon/95 backdrop-blur-sm border-b border-white/[0.06]">
      <Link
        href={`/collection/${collectionId}`}
        className="flex items-center gap-2 text-crema/60 hover:text-crema transition-colors text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to collection
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-[10px] tracking-[0.2em] uppercase text-crema/30">
          {totalSkus} SKUs &middot; 10 slides
        </span>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 text-[10px] tracking-[0.15em] uppercase font-medium bg-crema/10 text-crema/80 hover:bg-crema/20 hover:text-crema transition-colors border border-crema/10"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
