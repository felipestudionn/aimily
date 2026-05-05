/* ═══════════════════════════════════════════════════════════════════
   Storefront route group · home page (hello-world stub for Sprint 1)

   In Sprint 2 this will:
     1. Resolve the host to a `storefronts` row (subdomain or custom_domain)
     2. Load the theme via theme-registry
     3. Load StorefrontData via loadStorefrontData(collectionPlanId)
     4. Render <theme.pages.HomeTemplate data={data} />

   For Sprint 1 day 2 it just confirms the multi-tenant routing works.

   Plan: .planning/ecom/05-SPRINTS.md (Sprint 2 day 4-5)
   ═══════════════════════════════════════════════════════════════════ */

interface Props {
  params: Promise<{ host: string }>;
}

export default async function StorefrontHome({ params }: Props) {
  const { host } = await params;

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
        aimily ecom · storefront preview
      </p>
      <h1 style={{ fontSize: '48px', fontWeight: 300, letterSpacing: '-0.03em', margin: 0, textAlign: 'center' }}>
        {host}
      </h1>
      <p style={{ fontSize: '14px', opacity: 0.5, marginTop: '1.5rem', maxWidth: '480px', textAlign: 'center', lineHeight: 1.6 }}>
        Multi-tenant routing wired. Theme, brand DNA, and product catalog ship in Sprint 2.
      </p>
    </main>
  );
}
