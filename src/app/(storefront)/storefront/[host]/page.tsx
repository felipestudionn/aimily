/* Storefront route group · home page */
import { notFound } from 'next/navigation';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';
import { loadStorefrontData, StorefrontDataMissingError } from '@/lib/storefront/load-storefront-data';
import { loadAndApplyOverrides } from '@/lib/storefront/apply-overrides';
import { loadTheme } from '@/lib/storefront/theme-registry';
import { JsonLd } from '@/components/ecom/shared/JsonLd';
import { buildOrganizationJsonLd } from '@/lib/storefront/seo';

interface Props { params: Promise<{ host: string }>; }

export default async function StorefrontHome({ params }: Props) {
  const { host } = await params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) notFound();

  let data;
  try {
    data = await loadStorefrontData(storefront);
  } catch (e) {
    if (e instanceof StorefrontDataMissingError) {
      console.error('[storefront/home] data missing:', e.message);
      notFound();
    }
    throw e;
  }
  data = await loadAndApplyOverrides(storefront.id, data);

  const theme = await loadTheme(storefront.theme_id);
  const Home = theme.pages.home;
  if (!Home) notFound();

  return (
    <>
      <JsonLd data={buildOrganizationJsonLd(data)} />
      <Home data={data} />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { host } = await params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) return { title: 'Not found' };
  let data;
  try {
    data = await loadStorefrontData(storefront);
  } catch {
    return { title: storefront.subdomain };
  }
  const title = storefront.seo_title ?? `${data.brand.name} · ${data.collection.season} ${data.collection.name}`;
  const description = storefront.seo_description ?? data.brand.tagline;
  const ogUrl = `${data.meta.publicUrl}/og.png`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: data.meta.publicUrl,
      siteName: data.brand.name,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}
