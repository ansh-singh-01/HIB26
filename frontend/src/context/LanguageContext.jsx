import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../locales/translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'mediconnect_language';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'hi') {
        return saved;
      }
    } catch {
      // localStorage may not be available in private mode
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
    } catch (e) {
      console.warn('Could not save language preference:', e);
    }
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (lang === 'en' || lang === 'hi') {
      setLanguageState(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
  }, []);

  // Helper function to resolve dot-notated keys (e.g. 'nav.reports')
  const t = useCallback(
    (keyPath, fallback = '') => {
      if (!keyPath) return fallback;

      const resolveKey = (obj, path) => {
        return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
      };

      // Try current language
      const currentDict = translations[language] || translations.en;
      let val = resolveKey(currentDict, keyPath);

      // Fallback to English if missing in current language
      if (val === null || val === undefined) {
        val = resolveKey(translations.en, keyPath);
      }

      return val !== null && val !== undefined ? val : (fallback || keyPath);
    },
    [language]
  );

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isHindi: language === 'hi',
    isEnglish: language === 'en',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
