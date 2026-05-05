import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import type { PageTemplateProps } from '../../../types';

export default function AboutTemplate({ data }: PageTemplateProps) {
  const { brand } = data;

  return (
    <>
      <Header brand={brand} hostBase={data.meta.subdomain} current="about" />

      <section
        style={{
          padding: '8rem 2rem var(--s-spacing-section)',
          background: 'var(--s-bg)',
          color: 'var(--s-fg)',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
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
            About
          </p>
          <h1
            style={{
              fontFamily: 'var(--s-display-font)',
              fontWeight: 'var(--s-display-weight)' as unknown as number,
              fontSize: 'clamp(36px, 5vw, 64px)',
              lineHeight: 1.05,
              letterSpacing: 'var(--s-display-tracking)',
              margin: '0 0 3rem',
            }}
          >
            {brand.tagline}
          </h1>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.7,
              fontFamily: 'var(--s-body-font)',
              color: 'var(--s-fg)',
              marginBottom: '3rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            {brand.manifesto}
          </p>

          {brand.voice.values.length > 0 && (
            <div
              style={{
                marginTop: '4rem',
                paddingTop: '4rem',
                borderTop: '1px solid var(--s-line)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '2rem',
              }}
            >
              {brand.voice.values.slice(0, 5).map((value, idx) => (
                <div key={idx}>
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
                    Value {String(idx + 1).padStart(2, '0')}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--s-display-font)',
                      fontSize: '22px',
                      lineHeight: 1.3,
                      fontWeight: 'var(--s-display-weight)' as unknown as number,
                      letterSpacing: 'var(--s-display-tracking)',
                      margin: 0,
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {brand.voice.tone && (
            <p
              style={{
                marginTop: '4rem',
                fontFamily: 'var(--s-display-font)',
                fontStyle: 'italic',
                fontSize: '20px',
                color: 'var(--s-fg-muted)',
                fontWeight: 'var(--s-display-weight)' as unknown as number,
                lineHeight: 1.5,
              }}
            >
              In a tone that is {brand.voice.tone}.
            </p>
          )}
        </div>
      </section>

      <Footer brand={brand} />
    </>
  );
}
