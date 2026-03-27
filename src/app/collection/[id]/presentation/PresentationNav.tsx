'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Maximize2 } from 'lucide-react';

export function PresentationNav({ collectionId, totalSkus }: { collectionId: string; totalSkus: number }) {
  const [lang, setLang] = useState<'es' | 'en'>('es');

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
        {/* Language toggle */}
        <div className="flex border border-crema/[0.08] overflow-hidden">
          <button
            onClick={() => setLang('es')}
            className={`px-3 py-1 text-[10px] tracking-[0.1em] uppercase font-medium transition-colors ${
              lang === 'es' ? 'bg-crema/15 text-crema' : 'text-crema/30 hover:text-crema/50'
            }`}
          >
            ES
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-[10px] tracking-[0.1em] uppercase font-medium transition-colors ${
              lang === 'en' ? 'bg-crema/15 text-crema' : 'text-crema/30 hover:text-crema/50'
            }`}
          >
            EN
          </button>
        </div>

        <span className="text-[10px] tracking-[0.2em] uppercase text-crema/30">
          {totalSkus} SKUs
        </span>

        {/* Fullscreen */}
        <button
          onClick={() => document.documentElement.requestFullscreen?.()}
          className="p-1.5 text-crema/30 hover:text-crema/60 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

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
