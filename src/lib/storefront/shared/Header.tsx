/* Cross-theme Header. Tokens (--s-*) drive its appearance — themes that
   want a custom layout can write their own components/Header.tsx. */
import type { StorefrontBrand } from '../types';

interface Props {
  brand: StorefrontBrand;
  current?: 'home' | 'shop' | 'lookbook' | 'about' | 'contact';
  /** Layout: split = nav-left / logo-center / nav-right (editorial); stacked = logo above nav (sport/tech). */
  layout?: 'split' | 'stacked' | 'left';
}

const navItems = [
  { id: 'shop'     as const, label: 'Shop',     href: '/shop' },
  { id: 'lookbook' as const, label: 'Lookbook', href: '/lookbook' },
  { id: 'about'    as const, label: 'About',    href: '/about' },
  { id: 'contact'  as const, label: 'Contact',  href: '/contact' },
];

export function Header({ brand, current, layout = 'split' }: Props) {
  const Logo = (
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
        <img src={brand.logo.url} alt={brand.logo.alt} style={{ height: '32px', width: 'auto', display: 'block' }} />
      ) : (
        brand.name
      )}
    </a>
  );

  const navLink = (item: typeof navItems[number]) => (
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
  );

  const containerStyle = {
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
    backdropFilter: 'saturate(160%) blur(8px)',
    background: 'color-mix(in oklab, var(--s-bg) 78%, transparent)',
    borderBottom: '1px solid var(--s-line)',
  };

  if (layout === 'stacked') {
    return (
      <header style={containerStyle}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {Logo}
          <nav style={{ display: 'flex', gap: '2rem' }}>
            {navItems.map(navLink)}
          </nav>
        </div>
      </header>
    );
  }

  if (layout === 'left') {
    return (
      <header style={containerStyle}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '3rem' }}>
          {Logo}
          <nav style={{ display: 'flex', gap: '2rem', marginLeft: 'auto' }}>
            {navItems.map(navLink)}
          </nav>
        </div>
      </header>
    );
  }

  // split (editorial default)
  return (
    <header style={containerStyle}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.25rem 2rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem' }}>
        <nav style={{ display: 'flex', gap: '2rem', justifyContent: 'flex-start' }}>
          {navItems.slice(0, 2).map(navLink)}
        </nav>
        {Logo}
        <nav style={{ display: 'flex', gap: '2rem', justifyContent: 'flex-end' }}>
          {navItems.slice(2).map(navLink)}
        </nav>
      </div>
    </header>
  );
}
