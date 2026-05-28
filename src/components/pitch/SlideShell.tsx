/* ═══════════════════════════════════════════════════════════════════
   SlideShell — common wrapper for every slide.

   Enforces consistent paddings + max-width + entrance animation so the
   deck feels cohesive. Slides themselves only worry about content.

   Variants:
   - `light` (default): bg-shade, carbon text
   - `dark`: bg-carbon, crema text — for hero / dramatic slides
   ═══════════════════════════════════════════════════════════════════ */

import { cn } from '@/lib/utils';

interface SlideShellProps {
  children: React.ReactNode;
  className?: string;
  /** Numbered eyebrow shown top-center (e.g. "ACTO I · EL PROBLEMA"). */
  eyebrow?: string;
  /** Background variant — `dark` flips to bg-carbon + crema text. */
  variant?: 'light' | 'dark';
  /** Optional bottom-right accent color block — used for thematic slides. */
  accentColor?: 'sea-foam' | 'moss' | 'clay' | 'citronella' | 'midnight';
}

export function SlideShell({
  children,
  className,
  eyebrow,
  variant = 'light',
  accentColor,
}: SlideShellProps) {
  const isDark = variant === 'dark';

  const accentMap = {
    'sea-foam': 'bg-sea-foam',
    moss: 'bg-moss',
    clay: 'bg-clay',
    citronella: 'bg-citronella',
    midnight: 'bg-midnight',
  } as const;

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden',
        isDark ? 'bg-carbon text-crema' : 'bg-shade text-carbon',
      )}
    >
      {eyebrow && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div
            className={cn(
              'text-[10px] tracking-[0.22em] uppercase font-medium',
              isDark ? 'text-crema/45' : 'text-carbon/35',
            )}
          >
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
