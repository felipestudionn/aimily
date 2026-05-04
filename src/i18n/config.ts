/* ═══════════════════════════════════════════════════════════════════
   i18n config — locales, defaultLocale, OG mapping.

   The 9 locales mirror the existing LanguageContext (which keeps
   running for the authenticated app). New marketing pages live under
   `[locale]/` and use next-intl. See clients/aimily-marketing/docs/
   SEO-GEO-STRATEGY.md §3.
   ═══════════════════════════════════════════════════════════════════ */

export const locales = ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl', 'no', 'sv'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  pt: 'Português',
  nl: 'Nederlands',
  no: 'Norsk',
  sv: 'Svenska',
};

// hreflang → OG locale (en_US shape Facebook expects)
export const localeToOgLocale: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  de: 'de_DE',
  pt: 'pt_PT',
  nl: 'nl_NL',
  no: 'nb_NO',
  sv: 'sv_SE',
};

// hreflang regional codes for sitemap alternates
export const localeToHreflang: Record<Locale, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  it: 'it',
  de: 'de',
  pt: 'pt',
  nl: 'nl',
  no: 'no',
  sv: 'sv',
};
