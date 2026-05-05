/* Storefront route group · PDP (Product Detail Page) */
import { notFound } from 'next/navigation';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';
import { loadStorefrontData, StorefrontDataMissingError } from '@/lib/storefront/load-storefront-data';
import { loadAndApplyOverrides } from '@/lib/storefront/apply-overrides';
import { loadTheme } from '@/lib/storefront/theme-registry';

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

  const theme = await loadTheme(storefront.theme_id);
  const Pdp = theme.pages.pdp;
  if (!Pdp) notFound();

  return <Pdp data={data} skuId={sku} />;
}

export async function generateMetadata({ params }: Props) {
  const { host, sku } = await params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) return { title: 'Not found' };
  try {
    const data = await loadStorefrontData(storefront);
    const product = data.skus.find((s) => s.id === sku);
    if (!product) return { title: 'Product not found' };
    return {
      title: `${product.name} · ${data.brand.name}`,
      description: product.description?.slice(0, 160),
    };
  } catch {
    return { title: storefront.subdomain };
  }
}
