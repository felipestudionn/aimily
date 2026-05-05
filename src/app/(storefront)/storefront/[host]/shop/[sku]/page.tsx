/* Storefront route group · PDP */
import { notFound } from 'next/navigation';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';
import { loadStorefrontData, StorefrontDataMissingError } from '@/lib/storefront/load-storefront-data';
import { loadAndApplyOverrides } from '@/lib/storefront/apply-overrides';
import { loadTheme } from '@/lib/storefront/theme-registry';
import { JsonLd } from '@/components/ecom/shared/JsonLd';
import { buildProductJsonLd } from '@/lib/storefront/seo';

interface Props { params: Promise<{ host: string; sku: string }>; }

export default async function PdpPage({ params }: Props) {
  const { host, sku } = await params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) notFound();

  let data;
  try {
    data = await loadStorefrontData(storefront);
  } catch (e) {
    if (e instanceof StorefrontDataMissingError) notFound();
    throw e;
  }
  data = await loadAndApplyOverrides(storefront.id, data);

  const product = data.skus.find((s) => s.id === sku);
  const theme = await loadTheme(storefront.theme_id);
  const Pdp = theme.pages.pdp;
  if (!Pdp) notFound();

  return (
    <>
      {product && <JsonLd data={buildProductJsonLd(product, data)} />}
      <Pdp data={data} skuId={sku} />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { host, sku } = await params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) return { title: 'Not found' };
  try {
    const data = await loadStorefrontData(storefront);
    const product = data.skus.find((s) => s.id === sku);
    if (!product) return { title: 'Product not found' };
    const title = `${product.name} · ${data.brand.name}`;
    const description = (product.description || data.brand.tagline).slice(0, 160);
    const heroImage = product.images.editorial[0] ?? product.images.ecommerce[0] ?? `${data.meta.publicUrl}/og.png`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${data.meta.publicUrl}/shop/${product.id}`,
        siteName: data.brand.name,
        images: [{ url: heroImage, width: 1200, height: 1500 }],
        type: 'website',
      },
      twitter: { card: 'summary_large_image', title, description, images: [heroImage] },
    };
  } catch {
    return { title: storefront.subdomain };
  }
}
