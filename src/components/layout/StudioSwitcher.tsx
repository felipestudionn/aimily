'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Layers } from 'lucide-react';

interface UserProducts {
  has360: boolean;
  hasStudio: boolean;
  active360Id?: string;
  activeStudioId?: string;
  isAdmin?: boolean;
}

/**
 * Top-bar product switcher — renders when the user has BOTH products
 * OR is an admin (admins see the switcher regardless of project state).
 *
 * Rule from business plan §5.6 ("solo ves lo tuyo"):
 *   Regular user with only one product → render nothing.
 *   Regular user with both → render two pills.
 *   Admin user → always render so they can dogfood both products.
 *
 * Mounted in app/(app)/layout.tsx so it appears on every authenticated
 * route. Style: subtle floating top-right strip; never invades content.
 */
export function StudioSwitcher() {
  const pathname = usePathname();
  const [products, setProducts] = useState<UserProducts | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/products')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!products) return null;
  const shouldRender = products.isAdmin || (products.has360 && products.hasStudio);
  if (!shouldRender) return null;

  const currentlyStudio = pathname?.startsWith('/studio') || pathname?.startsWith('/(app)/studio');
  const studioHref = products.activeStudioId ? `/studio/${products.activeStudioId}` : '/studio';
  // Admin without a 360 collection still gets a meaningful link
  const collectionHref = products.active360Id
    ? `/collection/${products.active360Id}`
    : products.has360
      ? '/my-collections'
      : '/my-collections';

  return (
    <div className="fixed top-4 right-4 z-50 inline-flex items-center gap-1 rounded-full bg-white border border-carbon/[0.08] shadow-sm p-1 backdrop-blur">
      <Link
        href={collectionHref}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
          !currentlyStudio ? 'bg-carbon text-white' : 'text-carbon/50 hover:text-carbon'
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        Aimily
      </Link>
      <Link
        href={studioHref}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
          currentlyStudio ? 'bg-carbon text-white' : 'text-carbon/50 hover:text-carbon'
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Studio
      </Link>
    </div>
  );
}
