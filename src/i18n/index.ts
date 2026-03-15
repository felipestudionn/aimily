import { useLanguage } from '@/contexts/LanguageContext';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { de } from './de';

export type { Dictionary } from './en';

const dictionaries = { en, es, fr, it, de } as const;

/**
 * Returns the full translation dictionary for the current language.
 *
 * Usage:
 *   const t = useTranslation();
 *   t.auth.welcomeBack  // → "Welcome Back" / "Bienvenido/a" / "Bienvenue" / etc.
 */
export function useTranslation() {
  const { language } = useLanguage();
  return dictionaries[language] ?? en;
}
