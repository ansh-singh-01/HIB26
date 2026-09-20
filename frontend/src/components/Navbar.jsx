import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { digiYatraService } from '../services/api';
import { 
  Activity, 
  Building2, 
  ArrowRightLeft, 
  Users, 
  Sliders, 
  LogOut, 
  Heart,
  LayoutDashboard,
  ShieldCheck, 
  Clock, 
  Lock, 
  Scan, 
  FileText,
  ChevronDown,
  X,
  Copy,
  Check,
  ExternalLink,
  Droplet,
  Calendar,
  User,
  Sparkles,
  Edit3
} from 'lucide-react';
import { EditPatientProfileModal } from './EditPatientProfileModal';
import '../styles/DashboardApollo.css';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [passport, setPassport] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const isPatient = (user?.role ? user.role.toLowerCase() : '') === 'patient';
  const isDoctor = (user?.role ? user.role.toLowerCase() : '') === 'doctor';
  const isAdmin = (user?.role ? user.role.toLowerCase() : '') === 'admin';
  const userRole = user?.role ? user.role.toLowerCase() : 'user';

  useEffect(() => {
    if (user && isPatient) {
      digiYatraService.getPassport()
        .then((data) => setPassport(data))
        .catch((err) => console.warn('Could not load passport for navbar:', err));
    }

    const handleProfileUpdated = (e) => {
      if (e.detail) {
        setPassport((prev) => ({ ...prev, ...e.detail }));
      } else {
        digiYatraService.getPassport().then((data) => setPassport(data)).catch(() => null);
      }
    };

    window.addEventListener('patient_profile_updated', handleProfileUpdated);
    return () => window.removeEventListener('patient_profile_updated', handleProfileUpdated);
  }, [user, isPatient]);

  const handleLogout = () => {
    setShowProfileModal(false);
    logout();
    navigate('/login', { state: { message: 'You have been safely signed out.' } });
  };

  const handleCopyId = () => {
    const idToCopy = passport?.medi_connect_id || 'MC-75912';
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const patientNavItems = [
    { path: '/', label: 'Passport', icon: ShieldCheck },
    { path: '/reports', label: 'Medical Reports', icon: FileText },
    { path: '/facilities', label: 'Facilities', icon: Building2 },
    { path: '/my-journey', label: 'My Journey', icon: Clock },
    { path: '/consent', label: 'Consent & Privacy', icon: Lock },
    { path: '/my-health', label: 'My Health', icon: Heart },
  ];

  const doctorNavItems = [
    { path: '/', label: 'Consultation Queue', icon: Clock },
    { path: '/patients', label: 'My Patients', icon: Users },
    { path: '/reports', label: 'Medical Reports', icon: FileText },
    { path: '/referrals', label: 'Referrals', icon: ArrowRightLeft },
  ];

  const adminNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/checkin', label: 'Check-In Terminal', icon: Scan },
    { path: '/reports', label: 'Medical Reports', icon: FileText },
    { path: '/facilities', label: 'Facilities', icon: Building2 },
    { path: '/capacity', label: 'Capacity', icon: Sliders },
    { path: '/referrals', label: 'Referrals', icon: ArrowRightLeft },
    { path: '/patients', label: 'Patients', icon: Users },
  ];

  const navItems = isPatient ? patientNavItems : (isDoctor ? doctorNavItems : adminNavItems);

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not Specified';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <header className="apollo-app-navbar-wrapper">
        <div className="apollo-app-navbar">
          <div className="apollo-nav-left">
            <Link to="/" className="apollo-brand">
              <div className="apollo-logo-icon">
                <Activity className="apollo-logo-mark" size={20} />
              </div>
              <div className="apollo-brand-text">
                <span className="apollo-brand-name">
                  Medi<span>Connect</span>
                </span>
                <span className="apollo-brand-tagline">AI Health Grid</span>
              </div>
            </Link>

            {user && (
              <ul className="apollo-nav-links-pills">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`apollo-nav-pill-link ${isActive ? 'active' : ''}`}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="apollo-nav-right">
            {user ? (
              <>
                {/* Clickable User Chip with Chevron */}
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="apollo-user-chip-btn"
                  title="Click to view detailed patient profile & health credentials"
                  aria-label="Patient Profile and Identity"
                >
                  <div className="apollo-user-avatar-circle">
                    {getInitials(user.full_name || user.email)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                    <span className="apollo-user-name">
                      {user.full_name || user.email.split('@')[0]}
                    </span>
                    <span className={`apollo-role-tag ${userRole}`} style={{ fontSize: '0.62rem', padding: '1px 5px', marginTop: '2px' }}>
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown size={14} className="apollo-user-chip-chevron" />
                </button>

                <button
                  onClick={handleLogout}
                  className="apollo-logout-button"
                  title="Sign out safely"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to="/login" className="apollo-dash-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                  Sign In
                </Link>
                <Link to="/register" className="apollo-dash-btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Patient / User Details Modal */}
      {showProfileModal && (
        <div 
          className="apollo-profile-modal-backdrop" 
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="apollo-profile-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="apollo-profile-modal-header">
              <div className="apollo-profile-modal-title">
                <ShieldCheck size={18} color="#2563EB" />
                <span>{isPatient ? 'Patient Profile & Health Identity' : 'Healthcare Provider Account'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="apollo-profile-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="apollo-profile-modal-body">
              {/* Hero Banner */}
              <div className="apollo-profile-hero">
                <div className="apollo-profile-avatar-lg">
                  {getInitials(passport?.full_name || user.full_name || user.email)}
                </div>
                <div className="apollo-profile-hero-meta">
                  <div className="apollo-profile-hero-name">
                    {passport?.full_name || user.full_name || user.email.split('@')[0]}
                  </div>
                  <div className="apollo-profile-hero-email">
                    {user.email}
                  </div>
                  <span className={`apollo-role-tag ${userRole}`}>
                    {isPatient ? 'Verified DigiYatra Citizen' : user.role}
                  </span>
                </div>
              </div>

              {isPatient ? (
                <>
                  {/* Medi-Connect ID Banner */}
                  <div className="apollo-profile-mc-banner">
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Medi-Connect Health ID
                      </div>
                      <div className="apollo-profile-mc-id">
                        {passport?.medi_connect_id || 'MC-75912'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="apollo-dash-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      {copiedId ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                      <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                    </button>
                  </div>

                  {/* Demographics Grid */}
                  <div className="apollo-profile-demographics-grid">
                    <div className="apollo-profile-demo-box">
                      <div className="apollo-profile-demo-label">
                        <Droplet size={13} color="#DC2626" />
                        <span>Blood Group</span>
                      </div>
                      <div className="apollo-profile-demo-val" style={{ color: '#DC2626' }}>
                        {passport?.blood_group || 'B+'}
                      </div>
                    </div>

                    <div className="apollo-profile-demo-box">
                      <div className="apollo-profile-demo-label">
                        <Calendar size={13} color="#2563EB" />
                        <span>Date of Birth</span>
                      </div>
                      <div className="apollo-profile-demo-val">
                        {formatDate(passport?.date_of_birth) || '15 Jun 1994'}
                      </div>
                    </div>

                    <div className="apollo-profile-demo-box">
                      <div className="apollo-profile-demo-label">
                        <User size={13} color="#64748B" />
                        <span>Gender</span>
                      </div>
                      <div className="apollo-profile-demo-val">
                        {passport?.gender || 'Female'}
                      </div>
                    </div>

                    <div className="apollo-profile-demo-box">
                      <div className="apollo-profile-demo-label">
                        <Activity size={13} color="#059669" />
                        <span>Emergency Care</span>
                      </div>
                      <div className="apollo-profile-demo-val" style={{ color: '#059669', fontSize: '0.85rem' }}>
                        108 Health Grid
                      </div>
                    </div>
                  </div>

                  {/* Grid Stats Strip */}
                  <div className="apollo-profile-stats-strip">
                    <div>
                      <div className="apollo-profile-stat-count" style={{ color: '#2563EB' }}>
                        {passport?.connected_facilities_count || 2}
                      </div>
                      <div className="apollo-profile-stat-name">Connected Centers</div>
                    </div>
                    <div>
                      <div className="apollo-profile-stat-count" style={{ color: '#059669' }}>
                        {passport?.medical_records_count || 5}
                      </div>
                      <div className="apollo-profile-stat-name">Medical Records</div>
                    </div>
                    <div>
                      <div className="apollo-profile-stat-count" style={{ color: '#7C3AED' }}>
                        Active
                      </div>
                      <div className="apollo-profile-stat-name">Zero-Trust Consent</div>
                    </div>
                  </div>
                </>
              ) : isDoctor ? (
                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.5', marginBottom: '10px' }}>
                    <strong>Clinical Role: </strong> Medical Doctor & Attending Clinician. Authorized to review scoped patient records, monitor active consent time windows, and conduct consultations.
                  </div>
                  <Link
                    to="/"
                    onClick={() => setShowProfileModal(false)}
                    className="apollo-dash-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem' }}
                  >
                    <Clock size={16} /> Open Patient Consultation Queue
                  </Link>
                </div>
              ) : (
                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.5', marginBottom: '10px' }}>
                    <strong>Access Level: </strong> Administrator & Healthcare Network Manager. Authorized to conduct intake verification, manage facilities, and monitor hospital capacity.
                  </div>
                  <Link
                    to="/checkin"
                    onClick={() => setShowProfileModal(false)}
                    className="apollo-dash-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem' }}
                  >
                    <Scan size={16} /> Open Hospital Check-In Terminal
                  </Link>
                </div>
              )}

              {/* Quick Navigation Links */}
              <div className="apollo-profile-modal-actions">
                {isPatient && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileModal(false);
                        setShowEditModal(true);
                      }}
                      className="apollo-dash-btn-primary"
                      style={{ justifyContent: 'center', padding: '10px 16px', fontSize: '0.84rem', marginBottom: '4px' }}
                    >
                      <Edit3 size={15} />
                      <span>Edit Patient Profile Details</span>
                    </button>

                    <Link
                      to="/"
                      onClick={() => setShowProfileModal(false)}
                      className="apollo-dash-btn-secondary"
                      style={{ justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.84rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} color="#2563EB" />
                        <strong>View Digital Health Passport</strong>
                      </span>
                      <ExternalLink size={14} color="#94A3B8" />
                    </Link>

                    <Link
                      to="/reports"
                      onClick={() => setShowProfileModal(false)}
                      className="apollo-dash-btn-secondary"
                      style={{ justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.84rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#059669" />
                        <strong>Medical Reports & History</strong>
                      </span>
                      <ExternalLink size={14} color="#94A3B8" />
                    </Link>

                    <Link
                      to="/consent"
                      onClick={() => setShowProfileModal(false)}
                      className="apollo-dash-btn-secondary"
                      style={{ justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.84rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={16} color="#7C3AED" />
                        <strong>Consent & Privacy Controls</strong>
                      </span>
                      <ExternalLink size={14} color="#94A3B8" />
                    </Link>
                  </>
                )}

                {isDoctor && (
                  <>
                    <Link
                      to="/"
                      onClick={() => setShowProfileModal(false)}
                      className="apollo-dash-btn-secondary"
                      style={{ justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.84rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="#2563EB" />
                        <strong>Patient Consultation Queue</strong>
                      </span>
                      <ExternalLink size={14} color="#94A3B8" />
                    </Link>

                    <Link
                      to="/patients"
                      onClick={() => setShowProfileModal(false)}
                      className="apollo-dash-btn-secondary"
                      style={{ justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.84rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} color="#059669" />
                        <strong>My Assigned Patients</strong>
                      </span>
                      <ExternalLink size={14} color="#94A3B8" />
                    </Link>

                    <Link
                      to="/reports"
                      onClick={() => setShowProfileModal(false)}
                      className="apollo-dash-btn-secondary"
                      style={{ justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.84rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#7C3AED" />
                        <strong>Diagnostic Reports</strong>
                      </span>
                      <ExternalLink size={14} color="#94A3B8" />
                    </Link>

                    <Link
                      to="/referrals"
                      onClick={() => setShowProfileModal(false)}
                      className="apollo-dash-btn-secondary"
                      style={{ justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.84rem' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowRightLeft size={16} color="#D97706" />
                        <strong>Clinical Referrals</strong>
                      </span>
                      <ExternalLink size={14} color="#94A3B8" />
                    </Link>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="apollo-dash-btn-secondary"
                  style={{
                    justifyContent: 'center',
                    padding: '10px 16px',
                    fontSize: '0.84rem',
                    color: '#DC2626',
                    borderColor: '#FECACA',
                    marginTop: '6px',
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out of Account</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Profile Modal */}
      <EditPatientProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialData={passport}
        onSaved={(updated) => {
          setPassport((prev) => ({ ...prev, ...updated }));
        }}
      />
    </>
  );
};
export default Navbar;
