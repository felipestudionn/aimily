/**
 * /strategy/[tenantSlug]/runs/[runId]/pdf-view
 *
 * Felipe's PDF-overlay UI: render the original RNK PDF + a list of SKU
 * verdict chips that the buyer can click to inspect / accept / override.
 *
 * Server component does auth + tenant lookup; the client component
 * fetches the verdict + PDF signed URL from /api/strategy/runs/[runId]/skus
 * (single endpoint already wired) and handles the PDF.js render + drawer.
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { PdfOverlayViewer } from './PdfOverlayViewer';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string; runId: string }>;
}

export default async function PdfViewPage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug, runId } = await params;
  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  return (
    <main className="min-h-screen bg-shade">
      <header className="bg-white border-b border-carbon/[0.06] px-6 py-4 flex items-center justify-between">
        <Link
          href={`/strategy/${tenant.slug}/runs/${runId}`}
          className="text-[12px] text-carbon/50 hover:text-carbon transition-colors uppercase tracking-[0.08em]"
        >
          ← {tenant.display_name}
        </Link>
        <h1 className="text-[14px] font-medium text-carbon">PDF · per-SKU verdicts</h1>
        <div className="text-[11px] text-carbon/40 uppercase tracking-[0.08em]">run · {runId.slice(0, 8)}</div>
      </header>
      <PdfOverlayViewer runId={runId} tenantSlug={tenant.slug} />
    </main>
  );
}
