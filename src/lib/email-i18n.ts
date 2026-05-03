/**
 * Email i18n resolver — server-side counterpart to src/i18n/index.ts.
 *
 * Returns the `emails` section of the dictionary for the requested locale,
 * with English as the fallback. Used by transactional-emails.ts so every
 * email respects the user's chosen language (auth/callback resolves it
 * from `user.user_metadata.language`; the trial-emails cron does the same).
 *
 * Why a dedicated module instead of importing useTranslation():
 *   - useTranslation() is a React hook tied to LanguageContext, which is
 *     client-only. Email senders run from API routes / cron, server-side,
 *     where there's no React tree.
 *   - Dictionaries are static objects, perfectly safe to import from the
 *     server. The `emails` slice is what we expose.
 */
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { fr } from '@/i18n/fr';
import { it } from '@/i18n/it';
import { de } from '@/i18n/de';
import { pt } from '@/i18n/pt';
import { nl } from '@/i18n/nl';
import { sv } from '@/i18n/sv';
import { no } from '@/i18n/no';

export type EmailLocale = 'en' | 'es' | 'fr' | 'it' | 'de' | 'pt' | 'nl' | 'sv' | 'no';

const dicts = { en, es, fr, it, de, pt, nl, sv, no } as const;

const SUPPORTED: readonly string[] = Object.keys(dicts);

function isLocale(v: unknown): v is EmailLocale {
  return typeof v === 'string' && SUPPORTED.includes(v);
}

/** Returns the `emails` section of the dict for the locale, EN if unknown. */
export function getEmailDict(locale: string | null | undefined) {
  const lang: EmailLocale = isLocale(locale) ? locale : 'en';
  return dicts[lang].emails;
}

/** Type alias for the emails dict shape (always EN as the canonical type). */
export type EmailDict = typeof en.emails;
