/* /strategy/[tenantSlug]/briefs/new — create Bucket B creative brief */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BriefClient } from './BriefClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function NewBriefPage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug } = await params;
  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  const { data: taxonomies } = await supabaseAdmin
    .from('strategy_taxonomies')
    .select('taxonomy_kind, mapping')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true);

  const archetypes =
    (taxonomies?.find((t: any) => t.taxonomy_kind === 'archetype')?.mapping as any)
      ?.archetypes || [];
  const colorMap =
    (taxonomies?.find((t: any) => t.taxonomy_kind === 'color')?.mapping as any)
      ?.code_to_name || {};
  const colorNames = Array.from(new Set(Object.values(colorMap))) as string[];

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/strategy/${tenant.slug}`}
          className="text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em] mb-3 inline-block"
        >
          ← {tenant.display_name}
        </Link>
        <h1 className="text-[36px] md:text-[42px] font-medium text-carbon tracking-[-0.03em] leading-[1.1] mb-3">
          New creative brief · Bucket B
        </h1>
        <p className="text-[14px] text-carbon/50 leading-[1.6] mb-10 max-w-xl">
          Optional. Color story, archetype focus, family pivot. Modulates
          the recommendation; never overrides Bucket A constraints. Without
          a brief, the engine outputs a pure data-driven scenario.
        </p>
        <BriefClient
          tenantSlug={tenant.slug}
          tenantId={tenant.id}
          availableColors={colorNames}
          availableArchetypes={archetypes}
        />
      </div>
    </main>
  );
}
