/* ═══════════════════════════════════════════════════════════════════
   Storefront route group · home page

   Resolves the request host to a published storefront (subdomain or
   custom domain). 404 if not found.

   In Sprint 2 this will swap the placeholder body for:
     <theme.pages.HomeTemplate data={await loadStorefrontData(...)} />

   Plan: .planning/ecom/05-SPRINTS.md (Sprint 2 day 4-5)
   ═══════════════════════════════════════════════════════════════════ */

import { notFound } from 'next/navigation';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';

interface Props {
  params: Promise<{ host: string }>;
}

export default async function StorefrontHome({ params }: Props) {
  const { host } = await params;
  const storefront = await loadStorefrontByHost(host);

  if (!storefront) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#F5F2EC',
        color: '#1A1815',
        padding: '2rem',
      }}
    >
      <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '2rem' }}>
        aimily ecom · {storefront.theme_id}
      </p>
      <h1 style={{ fontSize: '48px', fontWeight: 300, letterSpacing: '-0.03em', margin: 0, textAlign: 'center' }}>
        {host}
      </h1>
      <p style={{ fontSize: '13px', opacity: 0.5, marginTop: '1.5rem', maxWidth: '560px', textAlign: 'center', lineHeight: 1.6 }}>
        Theme &middot; <strong>{storefront.theme_id}</strong> &nbsp;|&nbsp;
        Payment &middot; <strong>{storefront.payment_provider}</strong> &nbsp;|&nbsp;
        Published &middot; <strong>{storefront.published_at?.slice(0, 10)}</strong>
      </p>
      <p style={{ fontSize: '12px', opacity: 0.35, marginTop: '2rem', maxWidth: '480px', textAlign: 'center', lineHeight: 1.6 }}>
        Sprint 1 wired. Theme renderer + brand DNA + product catalog ship in Sprint 2.
      </p>
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { host } = await params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) return { title: 'Not found' };
  return {
    title: storefront.seo_title ?? host,
    description: storefront.seo_description ?? undefined,
  };
}
