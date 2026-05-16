/**
 * Strategy i18n resolver — server-side counterpart to src/i18n/index.ts.
 *
 * Returns the `strategy` slice of the dictionary for the requested locale,
 * with English as the fallback. Used by server components under /strategy/*
 * (run detail, decision pack, etc.) where useTranslation() can't be called.
 *
 * Mirrors the pattern in src/lib/email-i18n.ts. Dictionaries are static
 * objects, safe to import from any server context.
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
import type { User } from '@supabase/supabase-js';

export type StrategyLocale = 'en' | 'es' | 'fr' | 'it' | 'de' | 'pt' | 'nl' | 'sv' | 'no';

const dicts = { en, es, fr, it, de, pt, nl, sv, no } as const;

const SUPPORTED: readonly string[] = Object.keys(dicts);

function isLocale(v: unknown): v is StrategyLocale {
  return typeof v === 'string' && SUPPORTED.includes(v);
}

/** Returns the full dict for the locale, EN if unknown. */
export function getStrategyDict(locale: string | null | undefined) {
  const lang: StrategyLocale = isLocale(locale) ? locale : 'en';
  return dicts[lang];
}

/** Resolve the locale from a Supabase user (user_metadata.language). */
export function getUserLocale(user: User | null | undefined): StrategyLocale {
  const raw = user?.user_metadata?.language;
  return isLocale(raw) ? raw : 'en';
}

/** Convenience: full strategy dict given a Supabase user. */
export function getStrategyDictForUser(user: User | null | undefined) {
  return getStrategyDict(getUserLocale(user));
}
