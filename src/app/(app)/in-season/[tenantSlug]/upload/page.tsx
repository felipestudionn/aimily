/* ═══════════════════════════════════════════════════════════════════════════
   /strategy/[tenantSlug]/upload — source upload UX.

   Server-rendered shell; client-rendered form. Posts to
   /api/in-season/sources/upload then auto-fires /parse to begin extraction.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { getStrategyDictForUser } from '@/lib/strategy/server-i18n';
import { UploadSourceClient } from './UploadSourceClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function UploadSourcePage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug } = await params;
  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  const dict = getStrategyDictForUser(user);

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/in-season/${tenant.slug}`}
          className="text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em] mb-3 inline-block"
        >
          ← {tenant.display_name}
        </Link>
        <h1 className="text-[36px] md:text-[42px] font-medium text-carbon tracking-[-0.03em] leading-[1.1] mb-3">
          {dict.inSeason.surfaces.uploadTitle}
        </h1>
        <p className="text-[14px] text-carbon/50 leading-[1.6] mb-10 max-w-xl">
          {dict.inSeason.surfaces.uploadDescription}
        </p>

        <UploadSourceClient tenantSlug={tenant.slug} tenantId={tenant.id} />
      </div>
    </main>
  );
}
