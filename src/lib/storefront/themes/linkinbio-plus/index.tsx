/* linkinbio-plus · single screen, mobile-first, bio-link aesthetic with products */
import type { ThemeModule, ThemeManifest, ThemeTokens, PageTemplate, PageTemplateProps } from '../../types';
import { BuyButton } from '@/components/ecom/shared/BuyButton';

const manifest: ThemeManifest = {
  id: 'linkinbio-plus',
  name: 'Linkinbio Plus',
  description: 'One mobile screen. Logo, tagline, links, products inline. Linktree but for fashion.',
  anchorBrandsInternal: [],
  pages: ['home'],
  fonts: [
    { family: 'Inter', weights: [400, 500, 700], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#FAFAF7',
  '--s-bg-elev':    '#FFFFFF',
  '--s-fg':         '#0F0F0E',
  '--s-fg-muted':   'rgba(15,15,14,0.55)',
  '--s-line':       'rgba(15,15,14,0.10)',
  '--s-accent':     '#0F0F0E',
  '--s-display-font':     '"Inter", system-ui, sans-serif',
  '--s-display-weight':   '700',
  '--s-display-tracking': '-0.03em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, sans-serif',
  '--s-body-weight':      '400',
  '--s-radius-card':   '20px',
  '--s-radius-image':  '14px',
  '--s-radius-button': '999px',
  '--s-spacing-section':        '0',
  '--s-spacing-section-mobile': '0',
  '--s-grid-gap':               '0.5rem',
  '--s-image-ratio-pdp':        '1/1',
  '--s-image-ratio-plp':        '1/1',
  '--s-image-ratio-hero':       '1/1',
};

const HomeTemplate: PageTemplate = ({ data }: PageTemplateProps) => {
  const { brand, skus, collection } = data;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: 'var(--s-bg)' }}>
      <div style={{ width: '100%', maxWidth: '480px', padding: '3rem 1.5rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* HEADER */}
        <header style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '999px', background: 'var(--s-fg)', color: 'var(--s-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--s-display-font)', fontWeight: 700, fontSize: '32px', marginBottom: '1.25rem' }}>
            {brand.name.charAt(0)}
          </div>
          <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', margin: 0, color: 'var(--s-fg)' }}>
            {brand.name}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--s-fg-muted)', margin: '0.5rem 0 0', lineHeight: 1.5 }}>
            {brand.tagline}
          </p>
        </header>

        {/* SOCIAL ROW */}
        {(brand.contact.instagram || brand.contact.email) && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
            {brand.contact.instagram && (
              <a href={`https://instagram.com/${brand.contact.instagram}`} target="_blank" rel="noreferrer noopener" style={{ fontSize: '12px', color: 'var(--s-fg-muted)', textDecoration: 'none', padding: '0.5rem 1rem', border: '1px solid var(--s-line)', borderRadius: '999px' }}>
                @{brand.contact.instagram}
              </a>
            )}
            {brand.contact.email && (
              <a href={`mailto:${brand.contact.email}`} style={{ fontSize: '12px', color: 'var(--s-fg-muted)', textDecoration: 'none', padding: '0.5rem 1rem', border: '1px solid var(--s-line)', borderRadius: '999px' }}>
                Email
              </a>
            )}
          </div>
        )}

        {/* SECTION LABEL */}
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', textAlign: 'center', margin: '0.5rem 0' }}>
          {collection.season} · Shop
        </p>

        {/* PRODUCT CARDS */}
        {skus.map((sku) => {
          const heroImage = sku.images.ecommerce[0] ?? sku.images.editorial[0];
          return (
            <a key={sku.id} href={`/shop/${sku.id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--s-bg-elev)', borderRadius: 'var(--s-radius-card)', border: '1px solid var(--s-line)', textDecoration: 'none', color: 'var(--s-fg)' }}>
              <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', background: 'var(--s-bg)' }}>
                {heroImage && <img src={heroImage} alt={sku.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sku.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--s-fg-muted)', margin: '2px 0 0' }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: sku.currency || 'EUR', maximumFractionDigits: 0 }).format(sku.price)}
                </p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <BuyButton sku={sku} payment={data.payment} variant="compact" />
              </div>
            </a>
          );
        })}

        <p style={{ fontSize: '11px', color: 'var(--s-fg-muted)', textAlign: 'center', marginTop: '1rem' }}>
          Made with <a href="https://www.aimily.app" target="_blank" rel="noreferrer noopener" style={{ color: 'inherit' }}>aimily</a>
        </p>
      </div>
    </main>
  );
};

const theme: ThemeModule = {
  manifest, tokens,
  pages: { home: HomeTemplate },
};

export default theme;
