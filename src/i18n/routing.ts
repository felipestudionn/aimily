import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // 'always' = every URL carries a /[locale] prefix. Cleaner SEO + zero
  // ambiguity for hreflang. Root paths (/) get redirected to /[locale].
  localePrefix: 'always',
  // Detect via Accept-Language header on first hit, then sticky cookie.
  localeDetection: true,
});
