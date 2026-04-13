'use client';

/**
 * VisualIdentityCard — Color palette + typography for brand communication.
 *
 * Migrated from BrandWorkspace (2026-04-13). Visual Identity belongs
 * with Marketing & Sales because it defines how the brand communicates
 * visually across all content channels.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { ColorPalette } from '@/components/brand/sections/ColorPalette';
import { TypographySection } from '@/components/brand/sections/TypographySection';
import type { BrandColor, BrandTypography } from '@/types/brand';

interface VisualIdentityCardProps {
  collectionPlanId: string;
}

export function VisualIdentityCard({ collectionPlanId }: VisualIdentityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { profile, loading, debouncedUpdate } = useBrandProfile(collectionPlanId);

  return (
    <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 sm:p-8 space-y-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-carbon/40" />
          <div className="text-left">
            <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.01em]">Visual Identity</h3>
            <p className="text-[12px] text-carbon/40 mt-0.5">Color palette & typography for brand communication</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-carbon/30" />
          : <ChevronDown className="h-4 w-4 text-carbon/30" />
        }
      </button>

      {/* Content */}
      {expanded && profile && (
        <div className="space-y-6 pt-4 border-t border-carbon/[0.06]">
          <ColorPalette
            primaryColors={profile.primary_colors as BrandColor[] | null}
            secondaryColors={profile.secondary_colors as BrandColor[] | null}
            onUpdate={debouncedUpdate}
          />
          <TypographySection
            typography={profile.typography as BrandTypography | null}
            onUpdate={debouncedUpdate}
          />
        </div>
      )}

      {!expanded && profile && (
        <div className="flex items-center gap-3">
          {/* Color preview dots */}
          {(profile.primary_colors as BrandColor[] | null)?.slice(0, 5).map((c, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border border-carbon/[0.08]"
              style={{ backgroundColor: c.hex || '#ccc' }}
            />
          ))}
          {!(profile.primary_colors as BrandColor[] | null)?.length && (
            <p className="text-[12px] text-carbon/30">No colors defined yet</p>
          )}
        </div>
      )}
    </div>
  );
}
