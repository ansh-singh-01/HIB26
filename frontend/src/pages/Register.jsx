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

        {/* OAuth Buttons */}
        <div className="apollo-auth-oauth-row">
          <button
            type="button"
            className="apollo-auth-oauth-btn"
            onClick={() => {
              setFormData({
                email: 'sarah.jenkins@hospital.org',
                password: 'Password123!',
                full_name: 'Dr. Sarah Jenkins',
                role: 'doctor',
              });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button
            type="button"
            className="apollo-auth-oauth-btn"
            onClick={() => {
              setFormData({
                email: 'marcus.admin@hospital.org',
                password: 'Password123!',
                full_name: 'Marcus Sterling',
                role: 'facility_manager',
              });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.68-1.26z"/>
            </svg>
            Apple
          </button>
        </div>

        <div className="apollo-auth-divider">
          <span>or register with work email</span>
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

