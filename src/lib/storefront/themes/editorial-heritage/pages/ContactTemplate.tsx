import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import type { PageTemplateProps } from '../../../types';

export default function ContactTemplate({ data }: PageTemplateProps) {
  const { brand } = data;
  const c = brand.contact;

  return (
    <>
      <Header brand={brand} hostBase={data.meta.subdomain} current="contact" />

      <section
        style={{
          padding: '8rem 2rem var(--s-spacing-section)',
          background: 'var(--s-bg)',
          color: 'var(--s-fg)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
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
            Contact
          </p>
          <h1
            style={{
              fontFamily: 'var(--s-display-font)',
              fontWeight: 'var(--s-display-weight)' as unknown as number,
              fontSize: 'clamp(36px, 5vw, 64px)',
              lineHeight: 1.05,
              letterSpacing: 'var(--s-display-tracking)',
              margin: 0,
            }}
          >
            Let&apos;s talk
          </h1>
          <p
            style={{
              marginTop: '2rem',
              fontSize: '16px',
              lineHeight: 1.7,
              color: 'var(--s-fg-muted)',
              fontFamily: 'var(--s-body-font)',
            }}
          >
            For wholesale, press, or anything else — reach out.
          </p>

          <div
            style={{
              marginTop: '4rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2rem',
              textAlign: 'left',
            }}
          >
            {c.email && (
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--s-fg-muted)',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--s-body-font)',
                    fontWeight: 500,
                  }}
                >
                  Email
                </p>
                <a
                  href={`mailto:${c.email}`}
                  style={{
                    fontFamily: 'var(--s-display-font)',
                    fontSize: '22px',
                    color: 'var(--s-fg)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                    fontWeight: 'var(--s-display-weight)' as unknown as number,
                  }}
                >
                  {c.email}
                </a>
              </div>
            )}

            {c.instagram && (
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--s-fg-muted)',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--s-body-font)',
                    fontWeight: 500,
                  }}
                >
                  Instagram
                </p>
                <a
                  href={`https://instagram.com/${c.instagram}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    fontFamily: 'var(--s-display-font)',
                    fontSize: '22px',
                    color: 'var(--s-fg)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                    fontWeight: 'var(--s-display-weight)' as unknown as number,
                  }}
                >
                  @{c.instagram}
                </a>
              </div>
            )}

            {c.address && (
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--s-fg-muted)',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--s-body-font)',
                    fontWeight: 500,
                  }}
                >
                  Address
                </p>
                <p
                  style={{
                    fontFamily: 'var(--s-display-font)',
                    fontSize: '18px',
                    color: 'var(--s-fg)',
                    lineHeight: 1.5,
                    margin: 0,
                    fontWeight: 'var(--s-display-weight)' as unknown as number,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {c.address}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer brand={brand} />
    </>
  );
}
