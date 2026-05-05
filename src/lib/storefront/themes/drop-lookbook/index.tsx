/* drop-lookbook · single page vertical scroll for a single drop campaign */
import type { ThemeModule, ThemeManifest, ThemeTokens, PageTemplate, PageTemplateProps } from '../../types';
import { Footer } from '../../shared/Footer';
import { BuyButton } from '@/components/ecom/shared/BuyButton';

const manifest: ThemeManifest = {
  id: 'drop-lookbook',
  name: 'Drop Lookbook',
  description: 'Single-page vertical scroll for one drop. No PLP, no PDP — everything inline.',
  anchorBrandsInternal: [],
  pages: ['home'],
  fonts: [
    { family: 'Cormorant Garamond', weights: [300], source: 'google', category: 'serif' },
    { family: 'Inter',              weights: [400, 600], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#0F0F0F',
  '--s-bg-elev':    '#1A1A1A',
  '--s-fg':         '#F5F5F5',
  '--s-fg-muted':   'rgba(245,245,245,0.55)',
  '--s-line':       'rgba(245,245,245,0.10)',
  '--s-accent':     '#E8B860',
  '--s-display-font':     '"Cormorant Garamond", serif',
  '--s-display-weight':   '300',
  '--s-display-tracking': '-0.03em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, sans-serif',
  '--s-body-weight':      '400',
  '--s-radius-card':   '0px',
  '--s-radius-image':  '0px',
  '--s-radius-button': '999px',
  '--s-spacing-section':        '0',
  '--s-spacing-section-mobile': '0',
  '--s-grid-gap':               '0',
  '--s-image-ratio-pdp':        '4/5',
  '--s-image-ratio-plp':        '4/5',
  '--s-image-ratio-hero':       '4/5',
};

const HomeTemplate: PageTemplate = ({ data }: PageTemplateProps) => {
  const { brand, collection, skus, lookbook } = data;

  return (
    <>
      {/* Sticky brand wordmark only — no nav */}
      <header style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'color-mix(in oklab, var(--s-bg) 60%, transparent)', backdropFilter: 'blur(10px)', padding: '0.5rem 1.5rem', borderRadius: '999px' }}>
        <span style={{ fontFamily: 'var(--s-display-font)', fontSize: '20px', color: 'var(--s-fg)' }}>{brand.name}</span>
      </header>

      {/* HERO */}
      <section style={{ position: 'relative', height: '100vh', minHeight: '600px', overflow: 'hidden' }}>
        {lookbook.hero && (
          <img src={lookbook.hero} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)' }} />
        <div style={{ position: 'absolute', bottom: '4rem', left: 0, right: 0, textAlign: 'center', color: 'var(--s-fg)', padding: '0 2rem' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.75, marginBottom: '1rem' }}>
            {collection.season} · The Drop
          </p>
          <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(48px, 10vw, 120px)', lineHeight: 0.95, letterSpacing: '-0.04em', margin: 0 }}>
            {brand.tagline}
          </h1>
        </div>
      </section>

      {/* NARRATIVE */}
      <section style={{ padding: '8rem 2rem', background: 'var(--s-bg)', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--s-display-font)', fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.3, color: 'var(--s-fg)', maxWidth: '20em', margin: '0 auto', fontWeight: 300 }}>
          {collection.narrative}
        </p>
      </section>

      {/* PRODUCT REEL — each SKU as full-width strip with image + inline buy */}
      {skus.map((sku, idx) => {
        const heroImage = sku.images.editorial[0] ?? sku.images.ecommerce[0];
        const align: 'left' | 'right' = idx % 2 === 0 ? 'left' : 'right';
        return (
          <section key={sku.id} id={`sku-${sku.id}`} style={{ background: idx % 2 === 0 ? 'var(--s-bg)' : 'var(--s-bg-elev)' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '6rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
              <div style={{ aspectRatio: '4/5', overflow: 'hidden', order: align === 'left' ? 0 : 1 }}>
                {heroImage && <img src={heroImage} alt={sku.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ order: align === 'left' ? 1 : 0 }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--s-fg-muted)' }}>{sku.family} · #{String(idx + 1).padStart(2, '0')}</p>
                <h2 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 300, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.05, margin: '1rem 0 1.5rem', color: 'var(--s-fg)' }}>{sku.name}</h2>
                <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--s-fg)', marginBottom: '2rem', maxWidth: '32em' }}>{sku.description}</p>
                <p style={{ fontSize: '20px', color: 'var(--s-fg)', marginBottom: '2rem' }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: sku.currency || 'EUR', maximumFractionDigits: 0 }).format(sku.price)}
                </p>
                <div style={{ maxWidth: '320px' }}>
                  <BuyButton sku={sku} payment={data.payment} />
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <Footer brand={brand} tone="dark" />
    </>
  );
};

const theme: ThemeModule = {
  manifest, tokens,
  pages: { home: HomeTemplate },  // single page only
};

export default theme;
