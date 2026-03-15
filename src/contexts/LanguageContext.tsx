'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Language = 'en' | 'es' | 'fr' | 'it' | 'de' | 'pt' | 'nl' | 'sv' | 'no';

const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl', 'sv', 'no'];

function isLanguage(val: unknown): val is Language {
  return typeof val === 'string' && SUPPORTED_LANGUAGES.includes(val as Language);
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'aimily_language';

// Map browser language prefixes to our supported languages
const BROWSER_LANG_MAP: Record<string, Language> = {
  es: 'es', fr: 'fr', it: 'it', de: 'de',
  pt: 'pt', nl: 'nl', sv: 'sv', nb: 'no', nn: 'no', no: 'no',
};

function detectDefaultLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  // 1. Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) return stored;

  // 2. Check browser language
  const browserLang = navigator.language.toLowerCase();
  const prefix = browserLang.split('-')[0];
  if (BROWSER_LANG_MAP[prefix]) return BROWSER_LANG_MAP[prefix];

  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [initialized, setInitialized] = useState(false);
  const { user } = useAuth();

  // Initialize language on mount
  useEffect(() => {
    if (initialized) return;

    // Check user profile first
    const userLang = user?.user_metadata?.language;
    if (isLanguage(userLang)) {
      setLanguageState(userLang);
      localStorage.setItem(STORAGE_KEY, userLang);
    } else {
      setLanguageState(detectDefaultLanguage());
    }
    setInitialized(true);
  }, [user, initialized]);

  // Sync <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);

    // Persist to Supabase user_metadata if logged in
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { language: lang } });
      } catch {
        // Silent fail — localStorage is the primary source
      }
    }
  }, [user]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
