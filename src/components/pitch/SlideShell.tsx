/* ═══════════════════════════════════════════════════════════════════
   SlideShell — common wrapper for every slide.

   Enforces consistent paddings + max-width + entrance animation so the
   deck feels cohesive. Slides themselves only worry about content.
   ═══════════════════════════════════════════════════════════════════ */

import { cn } from '@/lib/utils';

interface SlideShellProps {
  children: React.ReactNode;
  className?: string;
  /** Numbered eyebrow shown top-center (e.g. "ACTO I · EL PROBLEMA"). */
  eyebrow?: string;
  /** Optional bottom-right accent color block — used for thematic slides. */
  accentColor?: 'sea-foam' | 'moss' | 'clay' | 'citronella' | 'midnight';
}

export function SlideShell({ children, className, eyebrow, accentColor }: SlideShellProps) {
  const accentMap = {
    'sea-foam': 'bg-sea-foam',
    moss: 'bg-moss',
    clay: 'bg-clay',
    citronella: 'bg-citronella',
    midnight: 'bg-midnight',
  } as const;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {eyebrow && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="text-[10px] tracking-[0.18em] uppercase text-carbon/30 font-medium">
            {eyebrow}
          </div>
        </div>
      )}

      <div
        className={cn(
          'h-full w-full px-12 md:px-24 lg:px-32 py-20 md:py-24 flex flex-col',
          'animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out',
          className,
        )}
      >
        {children}
      </div>

      {accentColor && (
        <div
          className={cn(
            'absolute bottom-0 right-0 h-2 w-40 rounded-tl-full opacity-60',
            accentMap[accentColor],
          )}
        />
      )}
    </div>
  );
}
