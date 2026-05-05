import type { StorefrontBrand } from '../../../types';

interface Props {
  brand: StorefrontBrand;
}

export function Footer({ brand }: Props) {
  return (
    <footer
      style={{
        background: 'var(--s-fg)',
        color: 'var(--s-bg)',
        padding: '6rem 2rem 3rem',
        marginTop: '6rem',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '5rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                opacity: 0.5,
                marginBottom: '1rem',
              }}
            >
              {brand.name}
            </p>
            <p
              style={{
                fontFamily: 'var(--s-display-font)',
                fontSize: '20px',
                fontWeight: 'var(--s-display-weight)' as unknown as number,
                lineHeight: 1.4,
                margin: 0,
                maxWidth: '24em',
              }}
            >
              {brand.tagline}
            </p>
          </div>

          <div>
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                opacity: 0.5,
                marginBottom: '1rem',
              }}
            >
              Shop
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[['Shop all', '/shop'], ['Lookbook', '/lookbook'], ['About', '/about'], ['Contact', '/contact']].map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    style={{
                      color: 'var(--s-bg)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      opacity: 0.75,
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                opacity: 0.5,
                marginBottom: '1rem',
              }}
            >
              Connect
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {brand.contact.email && (
                <li>
                  <a
                    href={`mailto:${brand.contact.email}`}
                    style={{ color: 'var(--s-bg)', textDecoration: 'none', fontSize: '14px', opacity: 0.75 }}
                  >
                    {brand.contact.email}
                  </a>
                </li>
              )}
              {brand.contact.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${brand.contact.instagram}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ color: 'var(--s-bg)', textDecoration: 'none', fontSize: '14px', opacity: 0.75 }}
                  >
                    @{brand.contact.instagram}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid color-mix(in oklab, var(--s-bg) 15%, transparent)',
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '11px',
            opacity: 0.45,
            letterSpacing: '0.05em',
          }}
        >
          <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
          <span>
            Made with <a href="https://www.aimily.app" target="_blank" rel="noreferrer noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>aimily</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
