import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ApolloNavbar } from '../components/ApolloNavbar';
import '../styles/LandingPage.css';

export const Login = () => {
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
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  // Google OAuth — uses Google Identity Services
  const handleGoogleLogin = () => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
    const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;
    window.location.href = authUrl;
  };

  // Apple OAuth — Sign In with Apple
  const handleAppleLogin = () => {
    const CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || 'YOUR_APPLE_SERVICE_ID';
    const REDIRECT_URI = `${window.location.origin}/auth/apple/callback`;
    const authUrl = `https://appleid.apple.com/auth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code%20id_token&scope=name%20email&response_mode=form_post`;
    window.location.href = authUrl;
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
          <h2 className="apollo-auth-title">Welcome back</h2>
          <p className="apollo-auth-subtitle">
            Sign in to access clinical triage, hospital resource routing, and IoT telemetry
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="apollo-auth-oauth-row">
          <button
            type="button"
            className="apollo-auth-oauth-btn apollo-oauth-google"
            onClick={handleGoogleLogin}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button
            type="button"
            className="apollo-auth-oauth-btn apollo-oauth-apple"
            onClick={handleAppleLogin}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.68-1.26z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <div className="apollo-auth-divider">
          <span>or continue with email</span>
        </div>

        {/* Quick Demo Logins Pill Box */}
        <div className="apollo-auth-demo-banner">
          <div className="apollo-auth-demo-header">
            <span className="apollo-auth-demo-label">Instant Demo Fill</span>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Click to auto-populate</span>
          </div>
          <div className="apollo-auth-demo-buttons">
            <button
              type="button"
              className="apollo-auth-demo-pill"
              onClick={() => handleDemoFill('patient15@healthgrid.in', 'Password123!')}
            >
              Patient
            </button>
            <button
              type="button"
              className="apollo-auth-demo-pill"
              onClick={() => handleDemoFill('doctor1@healthgrid.in', 'Password123!')}
            >
              Doctor
            </button>
            <button
              type="button"
              className="apollo-auth-demo-pill"
              onClick={() => handleDemoFill('admin@healthgrid.in', 'Password123!')}
            >
              Admin
            </button>
          </div>
        </div>

        {infoMessage && (
          <div className="apollo-auth-error" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#065F46' }}>
            <CheckCircle2 size={18} color="#10B981" />
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
            <label className="apollo-auth-label">Work or Patient Email</label>
            <div className="apollo-auth-input-wrapper">
              <input
                type="email"
                required
                className="apollo-auth-input"
                placeholder="doctor@smarthealth.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={18} className="apollo-auth-input-icon" />
            </div>
          </div>

          <div className="apollo-auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="apollo-auth-label">Password</label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('For demo purposes, please click any of the Instant Demo Fill buttons above.'); }} style={{ fontSize: '0.78rem', color: 'var(--apollo-blue)', textDecoration: 'none' }}>
                Forgot password?
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
            {loading ? 'Authenticating...' : 'Sign In to Health Grid'}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="apollo-auth-footer">
          Don't have an account?
          <Link to="/register" className="apollo-auth-link">
            Create an account free
          </Link>
        </div>

        <div className="apollo-auth-trust-strip">
          <span><ShieldCheck size={13} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} /> HIPAA Verified</span>
          <span>•</span>
          <span>256-bit Encryption</span>
        </div>
      </div>
    </div>
  </div>
  );
};

