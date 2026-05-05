import type { StorefrontBrand } from '../../../types';

interface Props {
  brand: StorefrontBrand;
  hostBase: string;            // e.g. "slaiz" — used to build relative routes
  current?: 'home' | 'shop' | 'lookbook' | 'about' | 'contact';
}

export function Header({ brand, current }: Props) {
  const navItems = [
    { id: 'shop' as const,     label: 'Shop',     href: '/shop' },
    { id: 'lookbook' as const, label: 'Lookbook', href: '/lookbook' },
    { id: 'about' as const,    label: 'About',    href: '/about' },
    { id: 'contact' as const,  label: 'Contact',  href: '/contact' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'saturate(160%) blur(8px)',
        background: 'color-mix(in oklab, var(--s-bg) 78%, transparent)',
        borderBottom: '1px solid var(--s-line)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1.25rem 2rem',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '2rem',
        }}
      >
        {/* Left nav (Shop · Lookbook) */}
        <nav style={{ display: 'flex', gap: '2rem', justifyContent: 'flex-start' }}>
          {navItems.slice(0, 2).map((item) => (
            <a
              key={item.id}
              href={item.href}
              style={{
                fontSize: '12px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: current === item.id ? 'var(--s-fg)' : 'var(--s-fg-muted)',
                textDecoration: 'none',
                fontFamily: 'var(--s-body-font)',
                fontWeight: 500,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Centered brand wordmark */}
        <a
          href="/"
          style={{
            fontFamily: 'var(--s-display-font)',
            fontWeight: 'var(--s-display-weight)' as unknown as number,
            fontSize: 'clamp(20px, 2vw, 28px)',
            letterSpacing: 'var(--s-display-tracking)',
            color: 'var(--s-fg)',
            textDecoration: 'none',
            textTransform: 'var(--s-display-case)' as unknown as 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {brand.logo.url ? (
            // Plain img to avoid Next/Image domain config in MVP
            <img
              src={brand.logo.url}
              alt={brand.logo.alt}
              style={{ height: '32px', width: 'auto', display: 'block' }}
            />
          ) : (
            brand.name
          )}
        </a>

        {/* Right nav (About · Contact) */}
        <nav style={{ display: 'flex', gap: '2rem', justifyContent: 'flex-end' }}>
          {navItems.slice(2).map((item) => (
            <a
              key={item.id}
              href={item.href}
              style={{
                fontSize: '12px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: current === item.id ? 'var(--s-fg)' : 'var(--s-fg-muted)',
                textDecoration: 'none',
                fontFamily: 'var(--s-body-font)',
                fontWeight: 500,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
