/* Cross-theme ProductCard. Aspect ratio comes from --s-image-ratio-plp. */
import type { StorefrontSku } from '../types';

interface Props {
  sku: StorefrontSku;
  /** card style — minimal hides everything except image+name; editorial keeps price below */
  style?: 'editorial' | 'minimal' | 'centered';
}

export function ProductCard({ sku, style = 'editorial' }: Props) {
  const heroImage = sku.images.ecommerce[0] ?? sku.images.editorial[0] ?? sku.images.stillLife[0];
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: sku.currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(sku.price);

  const align = style === 'centered' ? 'center' : 'flex-start';

  return (
    <a
      href={`/shop/${sku.id}`}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textDecoration: 'none', color: 'var(--s-fg)' }}
    >
      <div style={{ aspectRatio: 'var(--s-image-ratio-plp)', background: 'var(--s-bg-elev)', overflow: 'hidden', borderRadius: 'var(--s-radius-image)' }}>
        {heroImage ? (
          <img src={heroImage} alt={sku.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--s-fg-muted)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {sku.name}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: align, textAlign: align as 'center' | 'left' }}>
        <h3 style={{ fontFamily: 'var(--s-display-font)', fontWeight: 'var(--s-display-weight)' as unknown as number, fontSize: '18px', letterSpacing: 'var(--s-display-tracking)', margin: 0, lineHeight: 1.2 }}>
          {sku.name}
        </h3>
        {style !== 'minimal' && (
          <p style={{ fontSize: '13px', color: 'var(--s-fg-muted)', margin: 0, fontFamily: 'var(--s-body-font)' }}>
            {formattedPrice}
          </p>
        )}
      </div>
    </a>
  );
}
