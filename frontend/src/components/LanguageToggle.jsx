import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const LanguageToggle = ({ className = '', compact = false }) => {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  return (
    <div
      className={`mediconnect-lang-toggle-group ${compact ? 'compact' : ''} ${className}`}
      role="group"
      aria-label="Language selector"
      title="Switch Language / भाषा बदलें"
    >
      <button
        type="button"
        className="mediconnect-lang-globe-icon"
        onClick={toggleLanguage}
        aria-label="Toggle language"
        title="Toggle between English and Hindi"
      >
        <Globe size={15} />
      </button>

      <div className="mediconnect-lang-pills">
        <button
          type="button"
          className={`mediconnect-lang-btn ${language === 'en' ? 'active' : ''}`}
          onClick={() => setLanguage('en')}
          aria-pressed={language === 'en'}
          title="Switch to English"
        >
          EN
        </button>

        <span className="mediconnect-lang-divider">|</span>

        <button
          type="button"
          className={`mediconnect-lang-btn ${language === 'hi' ? 'active' : ''}`}
          onClick={() => setLanguage('hi')}
          aria-pressed={language === 'hi'}
          title="हिन्दी में बदलें"
        >
          हिन्दी
        </button>
      </div>
    </div>
  );
};
