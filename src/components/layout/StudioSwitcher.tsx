'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Camera, Layers, LineChart } from 'lucide-react';

interface UserProducts {
  has360: boolean;
  hasStudio: boolean;
  hasStrategy?: boolean;
  active360Id?: string;
  activeStudioId?: string;
  activeStrategyTenantSlug?: string | null;
  isAdmin?: boolean;
}

/**
 * Top-bar product switcher — renders when the user has ≥2 products OR is
 * an admin (admins see all switcher pills regardless of project state).
 *
 * Rule from business plan §5.6 ("solo ves lo tuyo"):
 *   Regular user with only one product → render nothing.
 *   Regular user with 2+ products → render the pills they have access to.
 *   Admin user → always render all 3 so they can dogfood every product.
 *
 * Three products: Aimily (Full 360) · Studio · Strategy.
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
  const accessCount =
    (products.has360 ? 1 : 0) +
    (products.hasStudio ? 1 : 0) +
    (products.hasStrategy ? 1 : 0);
  const shouldRender = products.isAdmin || accessCount >= 2;
  if (!shouldRender) return null;

  const currentlyStudio = pathname?.startsWith('/studio');
  // Felipe 2026-05-19 noche · Sprint A rename — detect both /in-season/ (canonical)
  // and /strategy/ (legacy, rewritten server-side). Both URLs serve the same
  // pages until the source files are physically moved in a future sprint.
  const currentlyStrategy = pathname?.startsWith('/strategy') || pathname?.startsWith('/in-season');
  const currentlyAimily = !currentlyStudio && !currentlyStrategy;

  const studioHref = products.activeStudioId ? `/studio/${products.activeStudioId}` : '/studio';
  const collectionHref = products.active360Id
    ? `/collection/${products.active360Id}`
    : '/my-collections';
  // Canonical href uses /in-season/ (server-side rewrite to /strategy/* keeps
  // legacy URLs working). New users see In-Season everywhere.
  const strategyHref = products.activeStrategyTenantSlug
    ? `/in-season/${products.activeStrategyTenantSlug}`
    : '/in-season';

  // Admins always see all 3 pills; non-admins only see the ones they have.
  const showAimily = products.isAdmin || products.has360;
  const showStudio = products.isAdmin || products.hasStudio;
  const showStrategy = products.isAdmin || products.hasStrategy;

  return (
    <div className="fixed top-4 right-4 z-50 inline-flex items-center gap-1 rounded-full bg-white border border-carbon/[0.08] shadow-sm p-1 backdrop-blur">
      {showAimily && (
        <Link
          href={collectionHref}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
            currentlyAimily ? 'bg-carbon text-white' : 'text-carbon/50 hover:text-carbon'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Aimily
        </Link>
      )}
      {showStudio && (
        <Link
          href={studioHref}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
            currentlyStudio ? 'bg-carbon text-white' : 'text-carbon/50 hover:text-carbon'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          Studio
        </Link>
      )}
      {showStrategy && (
        <Link
          href={strategyHref}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
            currentlyStrategy ? 'bg-carbon text-white' : 'text-carbon/50 hover:text-carbon'
          }`}
        >
          <LineChart className="h-3.5 w-3.5" />
          In-Season
        </Link>
      )}
    </div>
  );
}
