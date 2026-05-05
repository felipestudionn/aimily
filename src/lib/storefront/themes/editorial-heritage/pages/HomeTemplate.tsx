import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import type { PageTemplateProps } from '../../../types';

export default function HomeTemplate({ data }: PageTemplateProps) {
  const { brand, collection, skus, lookbook } = data;

  // Top 6 SKUs for the home grid (price-anchor heroes)
  const heroSkus = skus.slice(0, 6);

  // Hero image preference: lookbook hero → first editorial sku → first lookbook image
  const heroImage =
    lookbook.hero ?? skus[0]?.images.editorial[0] ?? lookbook.images[0]?.url ?? null;

  return (
    <>
      <Header brand={brand} hostBase={data.meta.subdomain} current="home" />

      {/* HERO */}
      <section
        style={{
          position: 'relative',
          height: '100vh',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'var(--s-bg)',
        }}
      >
        {heroImage && (
          <img
            src={heroImage}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: heroImage
              ? 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)'
              : 'transparent',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '0 2rem',
            maxWidth: '900px',
            color: heroImage ? '#FFFFFF' : 'var(--s-fg)',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              opacity: 0.75,
              marginBottom: '1.5rem',
              fontFamily: 'var(--s-body-font)',
              fontWeight: 500,
            }}
          >
            {collection.season} · {collection.name}
          </p>
          <h1
            style={{
              fontFamily: 'var(--s-display-font)',
              fontWeight: 'var(--s-display-weight)' as unknown as number,
              fontSize: 'clamp(48px, 8vw, 96px)',
              letterSpacing: 'var(--s-display-tracking)',
              lineHeight: 0.95,
              margin: 0,
              textTransform: 'var(--s-display-case)' as unknown as 'none',
            }}
          >
            {brand.tagline}
          </h1>
          <a
            href="/shop"
            style={{
              display: 'inline-flex',
              marginTop: '3rem',
              padding: '0.75rem 2rem',
              borderRadius: 'var(--s-radius-button)',
              background: heroImage ? 'var(--s-bg)' : 'var(--s-fg)',
              color: heroImage ? 'var(--s-fg)' : 'var(--s-bg)',
              textDecoration: 'none',
              fontSize: '13px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600,
              fontFamily: 'var(--s-body-font)',
            }}
          >
            Shop the collection
          </a>
        </div>
      </section>

      {/* EDITORIAL STAT */}
      <section
        style={{
          padding: 'var(--s-spacing-section) 2rem',
          background: 'var(--s-bg)',
          color: 'var(--s-fg)',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--s-fg-muted)',
              marginBottom: '2rem',
              fontFamily: 'var(--s-body-font)',
              fontWeight: 500,
            }}
          >
            The collection
          </p>
          <p
            style={{
              fontFamily: 'var(--s-display-font)',
              fontWeight: 'var(--s-display-weight)' as unknown as number,
              fontSize: 'clamp(28px, 4vw, 48px)',
              lineHeight: 1.3,
              letterSpacing: 'var(--s-display-tracking)',
              maxWidth: '20em',
              margin: '0 auto',
            }}
          >
            {collection.narrative}
          </p>
        </div>
      </section>

      {/* PRODUCT GRID */}
      <section
        style={{
          padding: '0 2rem var(--s-spacing-section)',
          background: 'var(--s-bg)',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 'var(--s-grid-gap)',
            }}
          >
            {heroSkus.map((sku) => (
              <ProductCard key={sku.id} sku={sku} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <a
              href="/shop"
              style={{
                fontSize: '12px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--s-fg)',
                textDecoration: 'underline',
                textUnderlineOffset: '6px',
                fontFamily: 'var(--s-body-font)',
                fontWeight: 500,
              }}
            >
              See the entire collection
            </a>
          </div>
        </div>
      </section>

      {/* LOOKBOOK STRIP */}
      {lookbook.images.length > 0 && (
        <section
          style={{
            padding: 'var(--s-spacing-section) 0',
            background: 'var(--s-bg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'var(--s-fg-muted)',
                marginBottom: '2rem',
                fontFamily: 'var(--s-body-font)',
                fontWeight: 500,
              }}
            >
              Editorial
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              overflowX: 'auto',
              padding: '0 2rem 1rem',
              scrollSnapType: 'x mandatory',
            }}
          >
            {lookbook.images.slice(0, 6).map((img, idx) => (
              <div
                key={idx}
                style={{
                  flex: '0 0 auto',
                  width: 'min(60vw, 480px)',
                  aspectRatio: '4/5',
                  scrollSnapAlign: 'start',
                  background: 'var(--s-bg-elev)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={img.url}
                  alt={img.caption ?? ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer brand={brand} />
    </>
  );
}
