/* SEO helpers · JSON-LD Product schema generators */
import type { StorefrontData, StorefrontSku } from './types';

export function buildProductJsonLd(sku: StorefrontSku, data: StorefrontData): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: sku.name,
    description: sku.description || `${sku.name} from ${data.brand.name}.`,
    image: [
      ...(sku.images.editorial ?? []),
      ...(sku.images.ecommerce ?? []),
      ...(sku.images.stillLife ?? []),
    ].slice(0, 4),
    sku: sku.skuCode,
    brand: { '@type': 'Brand', name: data.brand.name },
    offers: {
      '@type': 'Offer',
      url: `${data.meta.publicUrl}/shop/${sku.id}`,
      priceCurrency: sku.currency,
      price: sku.price,
      availability: 'https://schema.org/InStock',
    },
  };
  return JSON.stringify(schema);
}

export function buildOrganizationJsonLd(data: StorefrontData): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.brand.name,
    url: data.meta.publicUrl,
    description: data.brand.manifesto.slice(0, 200),
    sameAs: [
      data.brand.contact.instagram ? `https://instagram.com/${data.brand.contact.instagram}` : null,
    ].filter(Boolean),
  };
  return JSON.stringify(schema);
}
