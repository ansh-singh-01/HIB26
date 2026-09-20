import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ChevronDown, PhoneCall } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

export const ApolloNavbar = ({ currentPage = 'landing' }) => {
  const { t } = useLanguage();

  return (
    <div className="apollo-nav-wrapper">
      <header className="apollo-nav">
        <Link to="/" className="apollo-brand">
          <div className="apollo-logo-icon">
            <Activity className="apollo-logo-mark" size={22} />
          </div>
          <div className="apollo-brand-text">
            <span className="apollo-brand-name">
              Re<span>medi</span>
            </span>
            <span className="apollo-brand-tagline">{t('nav.brand_tagline')}</span>
          </div>
        </Link>

        {currentPage === 'landing' && (
          <ul className="apollo-nav-links">
            <li className="apollo-nav-item">
              <a href="/#product-sandbox" className="apollo-nav-link">
                {t('nav.platform')} <ChevronDown size={14} />
              </a>
            </li>
            <li className="apollo-nav-item">
              <a href="/#features" className="apollo-nav-link">
                {t('nav.solutions')}
              </a>
            </li>
            <li className="apollo-nav-item">
              <a href="/#faq" className="apollo-nav-link">
                {t('nav.faq')}
              </a>
            </li>
            <li className="apollo-nav-item">
              <Link to="/assistant" className="apollo-nav-link" style={{ color: '#059669', fontWeight: 600 }}>
                AI Assistant
              </Link>
            </li>
          </ul>
        )}

        <div className="apollo-nav-actions">
          {/* Bilingual Language Switcher */}
          <LanguageToggle />

          {currentPage === 'login' ? (
            <>
              <span className="apollo-nav-hint">
                {t('nav.new_to_mediconnect')}
              </span>
              <Link to="/register" className="apollo-btn-primary">
                {t('nav.sign_up')} <ArrowRight size={16} />
              </Link>
            </>
          ) : currentPage === 'register' ? (
            <>
              <span className="apollo-nav-hint">
                {t('nav.already_registered')}
              </span>
              <Link to="/login" className="apollo-btn-primary">
                {t('nav.sign_in')} <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="apollo-btn-ghost">
                {t('nav.sign_in')}
              </Link>
              <Link to="/register" className="apollo-btn-primary">
                {t('nav.sign_up')} <ArrowRight size={16} />
              </Link>
            </>
          )}

          <a
            href="tel:108"
            id="apollo-sos-call-btn"
            className="apollo-btn-sos"
            aria-label="Direct Emergency Ambulance Call 108"
            title="Emergency Ambulance: Directly open dial pad with 108"
            onClick={() => {
              window.location.href = 'tel:108';
            }}
          >
            <span className="apollo-sos-pulse-ring" aria-hidden="true"></span>
            <PhoneCall size={15} className="apollo-sos-icon" />
            <span className="apollo-sos-text">SOS 108</span>
          </a>
        </div>
      </header>
    </div>
  );
};
