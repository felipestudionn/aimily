'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Language = 'en' | 'es' | 'fr' | 'it' | 'de';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'aimily_language';

function detectDefaultLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  // 1. Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'es' || stored === 'fr' || stored === 'it' || stored === 'de') return stored;

  // 2. Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('it')) return 'it';
  if (browserLang.startsWith('de')) return 'de';

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
    if (userLang === 'en' || userLang === 'es' || userLang === 'fr' || userLang === 'it' || userLang === 'de') {
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
