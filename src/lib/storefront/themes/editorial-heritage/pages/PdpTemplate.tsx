import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import { BuyButton } from '@/components/ecom/shared/BuyButton';
import type { PageTemplateProps } from '../../../types';

export default function PdpTemplate({ data, skuId }: PageTemplateProps) {
  const { brand, skus } = data;
  const sku = skus.find((s) => s.id === skuId);

  if (!sku) {
    return (
      <>
        <Header brand={brand} hostBase={data.meta.subdomain} current="shop" />
        <section style={{ padding: '8rem 2rem', textAlign: 'center', background: 'var(--s-bg)' }}>
          <p
            style={{
              fontFamily: 'var(--s-display-font)',
              fontSize: '32px',
              fontWeight: 'var(--s-display-weight)' as unknown as number,
              color: 'var(--s-fg)',
            }}
          >
            Product not found.
          </p>
          <a
            href="/shop"
            style={{
              display: 'inline-block',
              marginTop: '2rem',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--s-fg-muted)',
              fontFamily: 'var(--s-body-font)',
            }}
          >
            ← Back to shop
          </a>
        </section>
        <Footer brand={brand} />
      </>
    );
  }

  const gallery = [
    ...sku.images.editorial,
    ...sku.images.stillLife,
    ...sku.images.ecommerce,
  ].filter(Boolean);

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: sku.currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(sku.price);

  const related = skus.filter((s) => s.id !== sku.id && s.family === sku.family).slice(0, 4);

  return (
    <>
      <Header brand={brand} hostBase={data.meta.subdomain} current="shop" />

      <section style={{ background: 'var(--s-bg)', padding: '4rem 2rem' }}>
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)',
            gap: '4rem',
            alignItems: 'start',
          }}
        >
          {/* GALLERY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-grid-gap)' }}>
            {gallery.length > 0 ? (
              gallery.slice(0, 6).map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    aspectRatio: 'var(--s-image-ratio-pdp)',
                    background: 'var(--s-bg-elev)',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={img}
                    alt={`${sku.name} — view ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              ))
            ) : (
              <div
                style={{
                  aspectRatio: 'var(--s-image-ratio-pdp)',
                  background: 'var(--s-bg-elev)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--s-fg-muted)',
                  fontSize: '14px',
                }}
              >
                No imagery yet
              </div>
            )}
          </div>

          {/* INFO (sticky on desktop) */}
          <div
            style={{
              position: 'sticky',
              top: '6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'var(--s-fg-muted)',
                fontFamily: 'var(--s-body-font)',
                fontWeight: 500,
                margin: 0,
              }}
            >
              {sku.family || sku.skuCode}
            </p>
            <h1
              style={{
                fontFamily: 'var(--s-display-font)',
                fontWeight: 'var(--s-display-weight)' as unknown as number,
                fontSize: 'clamp(36px, 4vw, 56px)',
                lineHeight: 1.05,
                letterSpacing: 'var(--s-display-tracking)',
                margin: 0,
                color: 'var(--s-fg)',
              }}
            >
              {sku.name}
            </h1>
            <p
              style={{
                fontSize: '20px',
                color: 'var(--s-fg)',
                fontFamily: 'var(--s-body-font)',
                fontWeight: 400,
                margin: 0,
              }}
            >
              {formattedPrice}
            </p>

            {sku.description && (
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: 'var(--s-fg)',
                  fontFamily: 'var(--s-body-font)',
                  margin: 0,
                }}
              >
                {sku.description}
              </p>
            )}

            {/* Variants */}
            {sku.variants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--s-fg-muted)',
                    margin: 0,
                  }}
                >
                  Color
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {sku.variants.map((v) => (
                    <span
                      key={v.color}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid var(--s-line)',
                        fontSize: '12px',
                        color: 'var(--s-fg)',
                        fontFamily: 'var(--s-body-font)',
                        background: 'transparent',
                      }}
                    >
                      {v.color}
                    </span>
                  ))}
                </div>

                {sku.variants[0]?.sizes.length > 0 && (
                  <>
                    <p
                      style={{
                        fontSize: '11px',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--s-fg-muted)',
                        margin: 0,
                        marginTop: '0.5rem',
                      }}
                    >
                      Size
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {sku.variants[0].sizes.map((size) => (
                        <span
                          key={size}
                          style={{
                            minWidth: '44px',
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            border: '1px solid var(--s-line)',
                            fontSize: '12px',
                            color: 'var(--s-fg)',
                            fontFamily: 'var(--s-body-font)',
                            background: 'transparent',
                          }}
                        >
                          {size}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* BUY BUTTON · Stripe Buy Button or Shopify Buy SDK */}
            <div style={{ marginTop: '1rem' }}>
              <BuyButton sku={sku} payment={data.payment} />
            </div>

            {sku.storyHook && (
              <p
                style={{
                  marginTop: '1rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--s-line)',
                  fontFamily: 'var(--s-display-font)',
                  fontStyle: 'italic',
                  fontSize: '17px',
                  lineHeight: 1.5,
                  color: 'var(--s-fg-muted)',
                }}
              >
                &ldquo;{sku.storyHook}&rdquo;
              </p>
            )}
          </div>
        </div>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section style={{ padding: 'var(--s-spacing-section) 2rem', background: 'var(--s-bg)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
              You may also like
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--s-grid-gap)',
              }}
            >
              {related.map((s) => (
                <ProductCard key={s.id} sku={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer brand={brand} />
    </>
  );
}
