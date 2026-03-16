'use client';

import { LayoutGrid } from 'lucide-react';

const GRID_PATTERN = `repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px)`;

interface ScreenshotPlaceholderProps {
  label?: string;
  className?: string;
  dark?: boolean;
}

export function ScreenshotPlaceholder({ label, className = '', dark = true }: ScreenshotPlaceholderProps) {
  return (
    <div className={`relative aspect-[4/3] ${dark ? 'bg-carbon border-gris/10' : 'bg-white/50 border-carbon/5'} border overflow-hidden group ${className}`}>
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: GRID_PATTERN }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
        <LayoutGrid className={`w-12 h-12 ${dark ? 'text-gris/10 group-hover:text-gris/20' : 'text-carbon/10 group-hover:text-carbon/20'} mb-4 transition-colors`} />
        {label && (
          <p className={`${dark ? 'text-gris/20' : 'text-carbon/20'} text-xs font-medium tracking-widest uppercase text-center`}>
            {label}
          </p>
        )}
      </div>
    </div>
  );
}
