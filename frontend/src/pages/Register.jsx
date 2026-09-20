import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, User, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { ApolloNavbar } from '../components/ApolloNavbar';
import '../styles/LandingPage.css';


export const Register = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: initialEmail,
    password: '',
    full_name: '',
    role: 'patient',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialEmail) {
      setFormData((prev) => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formatError = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || 'Failed to create account. Please try again.';
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
    setLoading(true);
    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth — Sign up with Google
  const handleGoogleSignup = () => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
    const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;
    window.location.href = authUrl;
  };

  // Apple OAuth — Sign up with Apple
  const handleAppleSignup = () => {
    const CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || 'YOUR_APPLE_SERVICE_ID';
    const REDIRECT_URI = `${window.location.origin}/auth/apple/callback`;
    const authUrl = `https://appleid.apple.com/auth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code%20id_token&scope=name%20email&response_mode=form_post`;
    window.location.href = authUrl;
  };

  return (
    <div className="apollo-auth-page">
      <ApolloNavbar currentPage="register" />

      <div className="apollo-auth-content">
        <div className="apollo-auth-card register-card">
          <div className="apollo-auth-header">

          <div className="apollo-auth-logo">
            <Activity className="apollo-logo-mark" size={26} />
          </div>
          <h2 className="apollo-auth-title">Create your account</h2>
          <p className="apollo-auth-subtitle">
            Join the intelligent clinical triage and hospital resource routing grid
          </p>
        </div>


        {error && (
          <div className="apollo-auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="apollo-auth-form">
          <div className="apollo-auth-field">
            <label className="apollo-auth-label">Full Name</label>
            <div className="apollo-auth-input-wrapper">
              <input
                type="text"
                name="full_name"
                required
                className="apollo-auth-input"
                placeholder="Dr. Sarah Jenkins"
                value={formData.full_name}
                onChange={handleChange}
              />
              <User size={18} className="apollo-auth-input-icon" />
            </div>
          </div>

          <div className="apollo-auth-field">
            <label className="apollo-auth-label">Email Address</label>
            <div className="apollo-auth-input-wrapper">
              <input
                type="email"
                name="email"
                required
                className="apollo-auth-input"
                placeholder="sarah.jenkins@generalhospital.org"
                value={formData.email}
                onChange={handleChange}
              />
              <Mail size={18} className="apollo-auth-input-icon" />
            </div>
          </div>

          <div className="apollo-auth-field">
            <label className="apollo-auth-label">Role in Health Grid</label>
            <div className="apollo-auth-input-wrapper">
              <select
                name="role"
                className="apollo-auth-select"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="patient">Patient Account</option>
                <option value="doctor">Doctor / Attending Physician</option>
                <option value="nurse">Triage Nurse Specialist</option>
                <option value="paramedic">Paramedic / EMS Dispatcher</option>
                <option value="facility_manager">Hospital Bed / Capacity Manager</option>
                <option value="admin">Grid System Administrator</option>
              </select>
              <ShieldCheck size={18} className="apollo-auth-input-icon" />
            </div>
          </div>

          <div className="apollo-auth-field">
            <label className="apollo-auth-label">Password</label>
            <div className="apollo-auth-input-wrapper">
              <input
                type="password"
                name="password"
                required
                className="apollo-auth-input"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
              />
              <Lock size={18} className="apollo-auth-input-icon" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="apollo-auth-submit-btn"
          >
            {loading ? 'Creating Account...' : 'Complete Free Registration'}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="apollo-auth-footer">
          Already registered?
          <Link to="/login" className="apollo-auth-link">
            Sign in to your account
          </Link>
        </div>

        <div className="apollo-auth-trust-strip">
          <span><ShieldCheck size={13} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} /> HIPAA Verified</span>
          <span>•</span>
          <span>256-bit AES</span>
          <span>•</span>
          <span>SOC2 Compliant</span>
        </div>
      </div>
    </div>
  </div>
  );
};

