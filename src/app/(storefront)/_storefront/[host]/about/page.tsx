/* Storefront route group · About */
import { notFound } from 'next/navigation';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';
import { loadStorefrontData, StorefrontDataMissingError } from '@/lib/storefront/load-storefront-data';
import { loadAndApplyOverrides } from '@/lib/storefront/apply-overrides';
import { loadTheme } from '@/lib/storefront/theme-registry';

interface Props { params: Promise<{ host: string }>; }

export default async function AboutPage({ params }: Props) {
  const { host } = await params;
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
  const About = theme.pages.about;
  if (!About) notFound();

  return <About data={data} />;
}
