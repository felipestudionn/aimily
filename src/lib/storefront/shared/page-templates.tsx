/* ═══════════════════════════════════════════════════════════════════
   Page template factories · cross-theme reusable layouts

   Each theme in batch B / batch C can compose its 6 pages from these
   factories with a visual variant string. Themes that need bespoke
   layouts (drop-lookbook single-page, linkinbio-plus mobile-first,
   avant-garde-concept asymmetric scroll) write their own.

   The factories are simple functions that return a PageTemplate component
   given a config object — keeps each theme's index.ts tiny.
   ═══════════════════════════════════════════════════════════════════ */

import { Header } from './Header';
import { Footer } from './Footer';
import { ProductCard } from './ProductCard';
import { BuyButton } from '@/components/ecom/shared/BuyButton';
import type { PageTemplate, PageTemplateProps } from '../types';

export type HeaderLayout = 'split' | 'stacked' | 'left';
export type FooterTone = 'dark' | 'light';
export type CardStyle = 'editorial' | 'minimal' | 'centered';

export interface ThemeVisualConfig {
  headerLayout: HeaderLayout;
  footerTone: FooterTone;
  cardStyle: CardStyle;
  /** Hero variant on Home: full-bleed image with overlay (default) | typographic only | gradient */
  heroVariant: 'image-overlay' | 'typographic' | 'split';
  /** Section spacing flavor */
  rhythm: 'editorial' | 'tight' | 'loose';
}

/* ── HOME ───────────────────────────────────────────────────────── */

export function createHomeTemplate(cfg: ThemeVisualConfig): PageTemplate {
  return function HomeTemplate({ data }: PageTemplateProps) {
    const { brand, collection, skus, lookbook } = data;
    const heroSkus = skus.slice(0, 6);
    const heroImage = lookbook.hero ?? skus[0]?.images.editorial[0] ?? lookbook.images[0]?.url ?? null;

    return (
      <>
        <Header brand={brand} layout={cfg.headerLayout} current="home" />

        {/* HERO */}
        <section style={{ position: 'relative', height: cfg.heroVariant === 'typographic' ? '70vh' : '100vh', minHeight: '540px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--s-bg)' }}>
          {cfg.heroVariant === 'image-overlay' && heroImage && (
            <>
              <img src={heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)' }} />
            </>
          )}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 2rem', maxWidth: '900px', color: cfg.heroVariant === 'image-overlay' && heroImage ? '#FFFFFF' : 'var(--s-fg)' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.75, marginBottom: '1.5rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
              {collection.season} · {collection.name}
            </p>
            <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(40px, 8vw, 96px)', letterSpacing: 'var(--s-display-tracking)', lineHeight: 0.95, margin: 0, textTransform: 'var(--s-display-case)' as unknown as 'none' }}>
              {brand.tagline}
            </h1>
            <a href="/shop" style={{ display: 'inline-flex', marginTop: '3rem', padding: '0.75rem 2rem', borderRadius: 'var(--s-radius-button)', background: cfg.heroVariant === 'image-overlay' && heroImage ? 'var(--s-bg)' : 'var(--s-fg)', color: cfg.heroVariant === 'image-overlay' && heroImage ? 'var(--s-fg)' : 'var(--s-bg)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--s-body-font)' }}>
              Shop the collection
            </a>
          </div>
        </section>

        {/* NARRATIVE */}
        <section style={{ padding: 'var(--s-spacing-section) 2rem', background: 'var(--s-bg)', color: 'var(--s-fg)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '2rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
              The collection
            </p>
            <p style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(26px, 4vw, 44px)', lineHeight: 1.3, letterSpacing: 'var(--s-display-tracking)', maxWidth: '22em', margin: '0 auto' }}>
              {collection.narrative}
            </p>
          </div>
        </section>

        {/* GRID */}
        <section style={{ padding: '0 2rem var(--s-spacing-section)', background: 'var(--s-bg)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--s-grid-gap)' }}>
              {heroSkus.map((sku) => <ProductCard key={sku.id} sku={sku} style={cfg.cardStyle} />)}
            </div>
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
              <a href="/shop" style={{ fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg)', textDecoration: 'underline', textUnderlineOffset: '6px', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
                See the entire collection
              </a>
            </div>
          </div>
        </section>

        {/* LOOKBOOK STRIP */}
        {lookbook.images.length > 0 && (
          <section style={{ padding: 'var(--s-spacing-section) 0', background: 'var(--s-bg)', overflow: 'hidden' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '2rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
                Editorial
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0 2rem 1rem', scrollSnapType: 'x mandatory' }}>
              {lookbook.images.slice(0, 6).map((img, idx) => (
                <div key={idx} style={{ flex: '0 0 auto', width: 'min(60vw, 480px)', aspectRatio: '4/5', scrollSnapAlign: 'start', background: 'var(--s-bg-elev)', overflow: 'hidden' }}>
                  <img src={img.url} alt={img.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          </section>
        )}

        <Footer brand={brand} tone={cfg.footerTone} />
      </>
    );
  };
}

/* ── PLP ────────────────────────────────────────────────────────── */

export function createPlpTemplate(cfg: ThemeVisualConfig): PageTemplate {
  return function PlpTemplate({ data }: PageTemplateProps) {
    const { brand, collection, skus } = data;
    const families = Array.from(new Set(skus.map((s) => s.family).filter(Boolean)));

    return (
      <>
        <Header brand={brand} layout={cfg.headerLayout} current="shop" />
        <section style={{ padding: '6rem 2rem 4rem', textAlign: 'center', background: 'var(--s-bg)' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '1rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
            {collection.season} · Shop
          </p>
          <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: 'var(--s-display-tracking)', margin: 0, color: 'var(--s-fg)' }}>
            {collection.name}
          </h1>
          {families.length > 0 && (
            <nav style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
              <span style={{ color: 'var(--s-fg)', borderBottom: '1px solid var(--s-fg)', paddingBottom: '4px' }}>All</span>
              {families.map((f) => <span key={f}>{f}</span>)}
            </nav>
          )}
        </section>
        <section style={{ padding: '0 2rem 6rem', background: 'var(--s-bg)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--s-grid-gap)' }}>
              {skus.map((sku) => <ProductCard key={sku.id} sku={sku} style={cfg.cardStyle} />)}
            </div>
            {skus.length === 0 && (
              <p style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--s-fg-muted)', fontFamily: 'var(--s-display-font)', fontSize: '24px', fontWeight: 'var(--s-display-weight)' as unknown as number }}>
                The collection is being prepared.
              </p>
            )}
          </div>
        </section>
        <Footer brand={brand} tone={cfg.footerTone} />
      </>
    );
  };
}

/* ── PDP ────────────────────────────────────────────────────────── */

export function createPdpTemplate(cfg: ThemeVisualConfig): PageTemplate {
  return function PdpTemplate({ data, skuId }: PageTemplateProps) {
    const { brand, skus } = data;
    const sku = skus.find((s) => s.id === skuId);

    if (!sku) {
      return (
        <>
          <Header brand={brand} layout={cfg.headerLayout} current="shop" />
          <section style={{ padding: '8rem 2rem', textAlign: 'center', background: 'var(--s-bg)' }}>
            <p style={{ fontFamily: 'var(--s-display-font)', fontSize: '32px', fontWeight: 'var(--s-display-weight)' as unknown as number, color: 'var(--s-fg)' }}>
              Product not found.
            </p>
            <a href="/shop" style={{ display: 'inline-block', marginTop: '2rem', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', fontFamily: 'var(--s-body-font)' }}>← Back to shop</a>
          </section>
          <Footer brand={brand} tone={cfg.footerTone} />
        </>
      );
    }

    const gallery = [...sku.images.editorial, ...sku.images.stillLife, ...sku.images.ecommerce].filter(Boolean);
    const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: sku.currency || 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(sku.price);
    const related = skus.filter((s) => s.id !== sku.id && s.family === sku.family).slice(0, 4);

    return (
      <>
        <Header brand={brand} layout={cfg.headerLayout} current="shop" />
        <section style={{ background: 'var(--s-bg)', padding: '4rem 2rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)', gap: '4rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-grid-gap)' }}>
              {gallery.length > 0 ? gallery.slice(0, 6).map((img, idx) => (
                <div key={idx} style={{ aspectRatio: 'var(--s-image-ratio-pdp)', background: 'var(--s-bg-elev)', overflow: 'hidden' }}>
                  <img src={img} alt={`${sku.name} — view ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )) : (
                <div style={{ aspectRatio: 'var(--s-image-ratio-pdp)', background: 'var(--s-bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--s-fg-muted)', fontSize: '14px' }}>
                  No imagery yet
                </div>
              )}
            </div>
            <div style={{ position: 'sticky', top: '6rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', fontFamily: 'var(--s-body-font)', fontWeight: 500, margin: 0 }}>
                {sku.family || sku.skuCode}
              </p>
              <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(36px, 4vw, 56px)', lineHeight: 1.05, letterSpacing: 'var(--s-display-tracking)', margin: 0, color: 'var(--s-fg)' }}>
                {sku.name}
              </h1>
              <p style={{ fontSize: '20px', color: 'var(--s-fg)', fontFamily: 'var(--s-body-font)', fontWeight: 400, margin: 0 }}>{formattedPrice}</p>
              {sku.description && (
                <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--s-fg)', fontFamily: 'var(--s-body-font)', margin: 0 }}>{sku.description}</p>
              )}
              {sku.variants.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', margin: 0 }}>Color</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {sku.variants.map((v) => (
                      <span key={v.color} style={{ padding: '0.5rem 1rem', border: '1px solid var(--s-line)', fontSize: '12px', color: 'var(--s-fg)', fontFamily: 'var(--s-body-font)' }}>{v.color}</span>
                    ))}
                  </div>
                  {sku.variants[0]?.sizes.length > 0 && (
                    <>
                      <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', margin: 0, marginTop: '0.5rem' }}>Size</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {sku.variants[0].sizes.map((size) => (
                          <span key={size} style={{ minWidth: '44px', padding: '0.5rem 0.75rem', textAlign: 'center', border: '1px solid var(--s-line)', fontSize: '12px', color: 'var(--s-fg)', fontFamily: 'var(--s-body-font)' }}>{size}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              <div style={{ marginTop: '1rem' }}>
                <BuyButton sku={sku} payment={data.payment} />
              </div>
            </div>
          </div>
        </section>
        {related.length > 0 && (
          <section style={{ padding: 'var(--s-spacing-section) 2rem', background: 'var(--s-bg)' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '2rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
                You may also like
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--s-grid-gap)' }}>
                {related.map((s) => <ProductCard key={s.id} sku={s} style={cfg.cardStyle} />)}
              </div>
            </div>
          </section>
        )}
        <Footer brand={brand} tone={cfg.footerTone} />
      </>
    );
  };
}

/* ── LOOKBOOK ───────────────────────────────────────────────────── */

export function createLookbookTemplate(cfg: ThemeVisualConfig): PageTemplate {
  return function LookbookTemplate({ data }: PageTemplateProps) {
    const { brand, lookbook, collection } = data;
    return (
      <>
        <Header brand={brand} layout={cfg.headerLayout} current="lookbook" />
        <section style={{ padding: '6rem 2rem 4rem', textAlign: 'center', background: 'var(--s-bg)' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '1rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
            {collection.season} · Lookbook
          </p>
          <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: 'var(--s-display-tracking)', margin: 0, color: 'var(--s-fg)' }}>
            {collection.name}
          </h1>
        </section>
        {lookbook.hero && (
          <section style={{ background: 'var(--s-bg)' }}>
            <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 2rem' }}>
              <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--s-bg-elev)' }}>
                <img src={lookbook.hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
          </section>
        )}
        <section style={{ padding: 'var(--s-spacing-section) 2rem', background: 'var(--s-bg)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              {lookbook.images.length === 0 ? (
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: 'var(--s-fg-muted)', fontFamily: 'var(--s-display-font)', fontSize: '24px', fontWeight: 'var(--s-display-weight)' as unknown as number }}>
                  The lookbook is in production.
                </p>
              ) : (
                lookbook.images.map((img, idx) => {
                  const isWide = idx % 5 === 0;
                  return (
                    <figure key={idx} style={{ gridColumn: isWide ? 'span 2' : 'auto', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ aspectRatio: isWide ? '16/9' : '4/5', overflow: 'hidden', background: 'var(--s-bg-elev)' }}>
                        {img.skuId ? (
                          <a href={`/shop/${img.skuId}`}>
                            <img src={img.url} alt={img.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          </a>
                        ) : (
                          <img src={img.url} alt={img.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        )}
                      </div>
                      {img.caption && (
                        <figcaption style={{ fontSize: '12px', color: 'var(--s-fg-muted)', fontFamily: 'var(--s-body-font)', fontStyle: 'italic' }}>
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
        <Footer brand={brand} tone={cfg.footerTone} />
      </>
    );
  };
}

/* ── ABOUT ──────────────────────────────────────────────────────── */

export function createAboutTemplate(cfg: ThemeVisualConfig): PageTemplate {
  return function AboutTemplate({ data }: PageTemplateProps) {
    const { brand } = data;
    return (
      <>
        <Header brand={brand} layout={cfg.headerLayout} current="about" />
        <section style={{ padding: '8rem 2rem var(--s-spacing-section)', background: 'var(--s-bg)', color: 'var(--s-fg)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '2rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>About</p>
            <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.05, letterSpacing: 'var(--s-display-tracking)', margin: '0 0 3rem' }}>
              {brand.tagline}
            </h1>
            <p style={{ fontSize: '17px', lineHeight: 1.7, fontFamily: 'var(--s-body-font)', color: 'var(--s-fg)', marginBottom: '3rem', whiteSpace: 'pre-wrap' }}>
              {brand.manifesto}
            </p>
            {brand.voice.values.length > 0 && (
              <div style={{ marginTop: '4rem', paddingTop: '4rem', borderTop: '1px solid var(--s-line)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem' }}>
                {brand.voice.values.slice(0, 5).map((value, idx) => (
                  <div key={idx}>
                    <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '0.5rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>
                      Value {String(idx + 1).padStart(2, '0')}
                    </p>
                    <p style={{ fontFamily: 'var(--s-display-font)', fontSize: '22px', lineHeight: 1.3, fontWeight: 'var(--s-display-weight)' as unknown as number, letterSpacing: 'var(--s-display-tracking)', margin: 0 }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {brand.voice.tone && (
              <p style={{ marginTop: '4rem', fontFamily: 'var(--s-display-font)', fontStyle: 'italic', fontSize: '20px', color: 'var(--s-fg-muted)', fontWeight: 'var(--s-display-weight)' as unknown as number, lineHeight: 1.5 }}>
                In a tone that is {brand.voice.tone}.
              </p>
            )}
          </div>
        </section>
        <Footer brand={brand} tone={cfg.footerTone} />
      </>
    );
  };
}

/* ── CONTACT ────────────────────────────────────────────────────── */

export function createContactTemplate(cfg: ThemeVisualConfig): PageTemplate {
  return function ContactTemplate({ data }: PageTemplateProps) {
    const { brand } = data;
    const c = brand.contact;
    return (
      <>
        <Header brand={brand} layout={cfg.headerLayout} current="contact" />
        <section style={{ padding: '8rem 2rem var(--s-spacing-section)', background: 'var(--s-bg)', color: 'var(--s-fg)', textAlign: 'center' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '1rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>Contact</p>
            <h1 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.05, letterSpacing: 'var(--s-display-tracking)', margin: 0 }}>
              Let&apos;s talk
            </h1>
            <p style={{ marginTop: '2rem', fontSize: '16px', lineHeight: 1.7, color: 'var(--s-fg-muted)', fontFamily: 'var(--s-body-font)' }}>
              For wholesale, press, or anything else — reach out.
            </p>
            <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', textAlign: 'left' }}>
              {c.email && (
                <div>
                  <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '0.5rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>Email</p>
                  <a href={`mailto:${c.email}`} style={{ fontFamily: 'var(--s-display-font)', fontSize: '22px', color: 'var(--s-fg)', textDecoration: 'underline', textUnderlineOffset: '4px', fontWeight: 'var(--s-display-weight)' as unknown as number }}>
                    {c.email}
                  </a>
                </div>
              )}
              {c.instagram && (
                <div>
                  <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '0.5rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>Instagram</p>
                  <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer noopener" style={{ fontFamily: 'var(--s-display-font)', fontSize: '22px', color: 'var(--s-fg)', textDecoration: 'underline', textUnderlineOffset: '4px', fontWeight: 'var(--s-display-weight)' as unknown as number }}>
                    @{c.instagram}
                  </a>
                </div>
              )}
              {c.address && (
                <div>
                  <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--s-fg-muted)', marginBottom: '0.5rem', fontFamily: 'var(--s-body-font)', fontWeight: 500 }}>Address</p>
                  <p style={{ fontFamily: 'var(--s-display-font)', fontSize: '18px', color: 'var(--s-fg)', lineHeight: 1.5, margin: 0, fontWeight: 'var(--s-display-weight)' as unknown as number, whiteSpace: 'pre-wrap' }}>
                    {c.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        <Footer brand={brand} tone={cfg.footerTone} />
      </>
    );
  };
}

/* ── ALL PAGES helper ───────────────────────────────────────────── */

export function createAllPages(cfg: ThemeVisualConfig) {
  return {
    home:     createHomeTemplate(cfg),
    plp:      createPlpTemplate(cfg),
    pdp:      createPdpTemplate(cfg),
    lookbook: createLookbookTemplate(cfg),
    about:    createAboutTemplate(cfg),
    contact:  createContactTemplate(cfg),
  };
}
