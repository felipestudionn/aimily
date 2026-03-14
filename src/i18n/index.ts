import { useLanguage } from '@/contexts/LanguageContext';
import { en } from './en';
import { es } from './es';

export type { Dictionary } from './en';

/**
 * Returns the full translation dictionary for the current language.
 *
 * Usage:
 *   const t = useTranslation();
 *   t.auth.welcomeBack  // → "Welcome Back" or "Bienvenido/a"
 */
export function useTranslation() {
  const { language } = useLanguage();
  return language === 'es' ? es : en;
}
