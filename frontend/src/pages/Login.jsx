import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ApolloNavbar } from '../components/ApolloNavbar';
import '../styles/LandingPage.css';

export const Login = () => {
  const { t, isHindi } = useLanguage();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.message) {
      setInfoMessage(location.state.message);
    }
  }, [location.state]);

  const formatError = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || 'Invalid credentials. Please try again.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (typeof detail === 'object') return JSON.stringify(detail);
    return String(detail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    const loginIdentifier = email.trim().toLowerCase() === 'admin' ? 'admin@healthgrid.in' : email.trim();
    try {
      await login(loginIdentifier, password);
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      navigate('/');
    } catch (err) {
      console.error('Demo login failed:', err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="apollo-auth-page">
      <ApolloNavbar currentPage="login" />

      <div className="apollo-auth-content">
        <div className="apollo-auth-card">

        <div className="apollo-auth-header">
          <div className="apollo-auth-logo">
            <Activity className="apollo-logo-mark" size={26} />
          </div>
          <h2 className="apollo-auth-title">
            {t('auth.welcome_back')} <span className="kindsight-italic-spark">{t('auth.welcome_back_highlight')}</span>
          </h2>
          <p className="apollo-auth-subtitle">
            {t('auth.welcome_subtitle')}
          </p>
        </div>



        {/* Quick Demo Logins Pill Box */}
        <div className="apollo-auth-demo-banner">
          <div className="apollo-auth-demo-header">
            <span className="apollo-auth-demo-label">{isHindi ? 'त्वरित डेमो लॉगिन' : 'Instant Demo Fill'}</span>
            <span style={{ fontSize: '0.75rem', color: '#666c5a' }}>
              {isHindi ? 'स्वतः भरने के लिए क्लिक करें' : 'Click to auto-populate'}
            </span>
          </div>
          <div className="apollo-auth-demo-buttons">
            <button
              type="button"
              className="apollo-auth-demo-pill"
              onClick={() => handleDemoFill('patient15@healthgrid.in', 'Password123!')}
            >
              {isHindi ? 'मरीज' : 'Patient'}
            </button>
            <button
              type="button"
              className="apollo-auth-demo-pill"
              onClick={() => handleDemoFill('doctor1@healthgrid.in', 'Password123!')}
            >
              {isHindi ? 'डॉक्टर' : 'Doctor'}
            </button>
            <button
              type="button"
              className="apollo-auth-demo-pill"
              onClick={() => handleDemoFill('admin@healthgrid.in', 'Password123!')}
            >
              {isHindi ? 'एडमिन' : 'Admin'}
            </button>
          </div>
        </div>

        {infoMessage && (
          <div className="apollo-auth-error" style={{ background: '#eff6e8', borderColor: '#cce3be', color: '#355e3b' }}>
            <CheckCircle2 size={18} color="#355e3b" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="apollo-auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="apollo-auth-form">
          <div className="apollo-auth-field">
            <label className="apollo-auth-label">{t('auth.email_label')}</label>
            <div className="apollo-auth-input-wrapper">
              <input
                type="text"
                required
                className="apollo-auth-input"
                placeholder={t('auth.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={18} className="apollo-auth-input-icon" />
            </div>
          </div>

          <div className="apollo-auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="apollo-auth-label">{t('auth.password_label')}</label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('For demo purposes, please click any of the Instant Demo Fill buttons above.'); }} style={{ fontSize: '0.78rem', color: 'var(--color-terracotta-cta)', textDecoration: 'none' }}>
                {t('auth.forgot_password')}
              </a>
            </div>
            <div className="apollo-auth-input-wrapper">
              <input
                type="password"
                required
                className="apollo-auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={18} className="apollo-auth-input-icon" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="apollo-auth-submit-btn"
          >
            {loading ? t('auth.signing_in') : t('nav.sign_in')}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="apollo-auth-footer">
          {isHindi ? 'खाता नहीं है?' : "Don't have an account?"}{' '}
          <Link to="/register" className="apollo-auth-link">
            {t('nav.sign_up')}
          </Link>
        </div>

        <div className="apollo-auth-trust-strip">
          <span><ShieldCheck size={13} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} /> {isHindi ? 'ABDM सत्यापित' : 'ABDM Verified'}</span>
          <span>•</span>
          <span>{isHindi ? '256-बिट सुरक्षित एन्क्रिप्शन' : '256-bit Encryption'}</span>
        </div>
      </div>
    </div>
  </div>
  );
};

