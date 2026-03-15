import { useLanguage } from '@/contexts/LanguageContext';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { de } from './de';
import { pt } from './pt';
import { nl } from './nl';
import { sv } from './sv';
import { no } from './no';

export type { Dictionary } from './en';

const dictionaries = { en, es, fr, it, de, pt, nl, sv, no } as const;

/**
 * Returns the full translation dictionary for the current language.
 *
 * Usage:
 *   const t = useTranslation();
 *   t.auth.welcomeBack  // → localized string
 */
export function useTranslation() {
  const { language } = useLanguage();
  return dictionaries[language] ?? en;
}
