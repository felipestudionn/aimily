import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import type { PageTemplateProps } from '../../../types';

export default function LookbookTemplate({ data }: PageTemplateProps) {
  const { brand, lookbook, collection } = data;

  return (
    <>
      <Header brand={brand} hostBase={data.meta.subdomain} current="lookbook" />

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
          {collection.season} · Lookbook
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
      </section>

      {/* Hero image */}
      {lookbook.hero && (
        <section style={{ background: 'var(--s-bg)' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--s-bg-elev)' }}>
              <img
                src={lookbook.hero}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Editorial gallery (alternating layouts for cadence) */}
      <section style={{ padding: 'var(--s-spacing-section) 2rem', background: 'var(--s-bg)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            {lookbook.images.length === 0 ? (
              <p
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '4rem 0',
                  color: 'var(--s-fg-muted)',
                  fontFamily: 'var(--s-display-font)',
                  fontSize: '24px',
                  fontWeight: 'var(--s-display-weight)' as unknown as number,
                }}
              >
                The lookbook is in production.
              </p>
            ) : (
              lookbook.images.map((img, idx) => {
                const isWide = idx % 5 === 0;
                return (
                  <figure
                    key={idx}
                    style={{
                      gridColumn: isWide ? 'span 2' : 'auto',
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: isWide ? '16/9' : '4/5',
                        overflow: 'hidden',
                        background: 'var(--s-bg-elev)',
                      }}
                    >
                      {img.skuId ? (
                        <a href={`/shop/${img.skuId}`}>
                          <img
                            src={img.url}
                            alt={img.caption ?? ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </a>
                      ) : (
                        <img
                          src={img.url}
                          alt={img.caption ?? ''}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                    </div>
                    {img.caption && (
                      <figcaption
                        style={{
                          fontSize: '12px',
                          color: 'var(--s-fg-muted)',
                          fontFamily: 'var(--s-body-font)',
                          fontStyle: 'italic',
                        }}
                      >
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              })
            )}
          </div>
        </div>
      </section>

      <Footer brand={brand} />
    </>
  );
}
