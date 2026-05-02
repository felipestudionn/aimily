'use client';

/**
 * NavigateButton — renders a "Take me there →" pill from the model's
 * navigateToWorkspace tool call. Validates the URL against the route
 * whitelist before allowing navigation. Substitutes [id] with the
 * active collection id if present in page context.
 */

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { isRouteAllowed, resolveRoute } from '@/lib/aimily-assistant/knowledge';

interface Props {
  url: string;
  label: string;
  activeCollectionId?: string | null;
  onNavigate?: () => void;
}

export function NavigateButton({ url, label, activeCollectionId, onNavigate }: Props) {
  const router = useRouter();

  /* Reject early if the model hallucinated a non-whitelisted route. */
  if (!isRouteAllowed(url)) {
    return (
      <span className="inline-flex items-center text-[11px] text-carbon/35 italic">
        link unavailable
      </span>
    );
  }

  const resolved = resolveRoute(url, activeCollectionId);
  if (!resolved) {
    return (
      <span className="inline-flex items-center text-[11px] text-carbon/35 italic">
        open a collection to use this link
      </span>
    );
  }

  const handleClick = () => {
    onNavigate?.();
    router.push(resolved);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        inline-flex items-center gap-1.5
        rounded-full bg-carbon text-white
        px-3 py-1.5
        text-[12px] font-medium tracking-[-0.01em]
        transition-all duration-150
        hover:bg-carbon/90
      "
    >
      {label}
      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
