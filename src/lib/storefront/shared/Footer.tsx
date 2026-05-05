/* Cross-theme Footer. Tokens drive appearance. Pass `tone` to flip color scheme. */
import type { StorefrontBrand } from '../types';

interface Props {
  brand: StorefrontBrand;
  tone?: 'dark' | 'light';
}

export function Footer({ brand, tone = 'dark' }: Props) {
  const bg = tone === 'dark' ? 'var(--s-fg)' : 'var(--s-bg-elev)';
  const fg = tone === 'dark' ? 'var(--s-bg)' : 'var(--s-fg)';
  const fgMuted = tone === 'dark' ? 'color-mix(in oklab, var(--s-bg) 60%, transparent)' : 'var(--s-fg-muted)';
  const lineColor = tone === 'dark'
    ? 'color-mix(in oklab, var(--s-bg) 15%, transparent)'
    : 'var(--s-line)';

  return (
    <footer style={{ background: bg, color: fg, padding: '6rem 2rem 3rem', marginTop: '6rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '5rem' }}>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: fgMuted, marginBottom: '1rem' }}>
              {brand.name}
            </p>
            <p style={{ fontFamily: 'var(--s-display-font)', fontSize: '20px', fontWeight: 'var(--s-display-weight)' as unknown as number, lineHeight: 1.4, margin: 0, maxWidth: '24em' }}>
              {brand.tagline}
            </p>
          </div>

          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: fgMuted, marginBottom: '1rem' }}>Shop</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[['Shop all', '/shop'], ['Lookbook', '/lookbook'], ['About', '/about'], ['Contact', '/contact']].map(([label, href]) => (
                <li key={href}>
                  <a href={href} style={{ color: fg, textDecoration: 'none', fontSize: '14px', opacity: 0.75 }}>{label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: fgMuted, marginBottom: '1rem' }}>Connect</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {brand.contact.email && (
                <li><a href={`mailto:${brand.contact.email}`} style={{ color: fg, textDecoration: 'none', fontSize: '14px', opacity: 0.75 }}>{brand.contact.email}</a></li>
              )}
              {brand.contact.instagram && (
                <li><a href={`https://instagram.com/${brand.contact.instagram}`} target="_blank" rel="noreferrer noopener" style={{ color: fg, textDecoration: 'none', fontSize: '14px', opacity: 0.75 }}>@{brand.contact.instagram}</a></li>
              )}
            </ul>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${lineColor}`, paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '11px', color: fgMuted, letterSpacing: '0.05em' }}>
          <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
          <span>Made with <a href="https://www.aimily.app" target="_blank" rel="noreferrer noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>aimily</a></span>
        </div>
      </div>
    </footer>
  );
}
