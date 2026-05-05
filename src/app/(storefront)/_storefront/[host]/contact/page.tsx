/* Storefront route group · Contact */
import { notFound } from 'next/navigation';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';
import { loadStorefrontData, StorefrontDataMissingError } from '@/lib/storefront/load-storefront-data';
import { loadAndApplyOverrides } from '@/lib/storefront/apply-overrides';
import { loadTheme } from '@/lib/storefront/theme-registry';

interface Props { params: Promise<{ host: string }>; }

export default async function ContactPage({ params }: Props) {
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
  const Contact = theme.pages.contact;
  if (!Contact) notFound();

  return <Contact data={data} />;
}
