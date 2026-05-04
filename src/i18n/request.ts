import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // Marketing pages keep using the existing LanguageContext + i18n/index.ts
    // strings during Wave 0. next-intl messages start empty and get populated
    // when MDX-driven content lands in Wave 1 (see SEO-GEO-STRATEGY §4).
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
