import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import type { PageTemplateProps } from '../../../types';

export default function PlpTemplate({ data }: PageTemplateProps) {
  const { brand, collection, skus } = data;

  // Group by family for editorial cadence
  const families = Array.from(new Set(skus.map((s) => s.family).filter(Boolean)));

  return (
    <>
      <Header brand={brand} hostBase={data.meta.subdomain} current="shop" />

      {/* Section header */}
      <section style={{ padding: '6rem 2rem 4rem', textAlign: 'center', background: 'var(--s-bg)' }}>
        <p
          style={{
            fontSize: '11px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--s-fg-muted)',
            marginBottom: '1rem',
            fontFamily: 'var(--s-body-font)',
            fontWeight: 500,
          }}
        >
          {collection.season} · Shop
        </p>
        <h1
          style={{
            fontFamily: 'var(--s-display-font)',
            fontWeight: 'var(--s-display-weight)' as unknown as number,
            fontSize: 'clamp(40px, 6vw, 72px)',
            letterSpacing: 'var(--s-display-tracking)',
            margin: 0,
            color: 'var(--s-fg)',
          }}
        >
          {collection.name}
        </h1>
        {families.length > 0 && (
          <nav
            style={{
              marginTop: '2rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--s-fg-muted)',
              fontFamily: 'var(--s-body-font)',
              fontWeight: 500,
            }}
          >
            <span style={{ color: 'var(--s-fg)', borderBottom: '1px solid var(--s-fg)', paddingBottom: '4px' }}>All</span>
            {families.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </nav>
        )}
      </section>

      {/* Grid */}
      <section style={{ padding: '0 2rem 6rem', background: 'var(--s-bg)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 'var(--s-grid-gap)',
            }}
          >
            {skus.map((sku) => (
              <ProductCard key={sku.id} sku={sku} />
            ))}
          </div>
          {skus.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                padding: '4rem 0',
                color: 'var(--s-fg-muted)',
                fontFamily: 'var(--s-display-font)',
                fontSize: '24px',
                fontWeight: 'var(--s-display-weight)' as unknown as number,
              }}
            >
              The collection is being prepared.
            </p>
          )}
        </div>
      </section>

      <Footer brand={brand} />
    </>
  );
}
