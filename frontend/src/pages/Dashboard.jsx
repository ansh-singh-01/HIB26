import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientService, facilityService, referralService, digiYatraService } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Stethoscope, 
  Building2, 
  ArrowRightLeft, 
  Users, 
  HeartPulse, 
  ArrowRight,
  Sparkles,
  Radio,
  Heart,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
  FileText,
  Pill,
  MapPin,
  Copy,
  Check,
  QrCode,
  Share2,
  PhoneCall,
  Navigation,
  Lock,
  Scan,
  Edit3
} from 'lucide-react';
import { EditPatientProfileModal } from '../components/EditPatientProfileModal';
import { DoctorQueue } from './DoctorQueue';
import '../styles/DashboardApollo.css';

export const Dashboard = () => {
  const { user } = useAuth();
  const [passport, setPassport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Admin stats
  const [adminStats, setAdminStats] = useState({
    patientsCount: 0,
    facilitiesCount: 0,
    icuBedsAvailable: 0,
    activeReferrals: 0,
  });
  const [loading, setLoading] = useState(true);

  const isPatient = (user?.role ? user.role.toLowerCase() : '') === 'patient';
  const isDoctor = (user?.role ? user.role.toLowerCase() : '') === 'doctor';
  const displayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  const roleName = user?.role ? user.role.toUpperCase() : 'PATIENT';

  useEffect(() => {
    const handleProfileUpdated = (e) => {
      if (e.detail) {
        setPassport((prev) => ({ ...prev, ...e.detail }));
      } else {
        digiYatraService.getPassport().then(setPassport).catch(() => null);
      }
    };
    window.addEventListener('patient_profile_updated', handleProfileUpdated);
    return () => window.removeEventListener('patient_profile_updated', handleProfileUpdated);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isPatient) {
          const passData = await digiYatraService.getPassport().catch(() => null);
          setPassport(passData);
        } else {
          const [patients, facilities, referrals] = await Promise.all([
            patientService.getPatients().catch(() => []),
            facilityService.getFacilities().catch(() => []),
            referralService.getReferrals().catch(() => []),
          ]);

          const icuBeds = Array.isArray(facilities)
            ? facilities.reduce((sum, f) => sum + (f.available_icu_beds || 0), 0)
            : 0;

          const pendingOrTransit = Array.isArray(referrals)
            ? referrals.filter(r => r.status === 'PENDING' || r.status === 'IN_TRANSIT').length
            : 0;

          setAdminStats({
            patientsCount: Array.isArray(patients) ? patients.length : 0,
            facilitiesCount: Array.isArray(facilities) ? facilities.length : 0,
            icuBedsAvailable: icuBeds,
            activeReferrals: pendingOrTransit,
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isPatient]);

  const handleCopyId = () => {
    const idToCopy = passport?.medi_connect_id || 'MC-10023';
    navigator.clipboard.writeText(idToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareAccess = () => {
    const shareUrl = `${window.location.origin}/checkin?id=${passport?.medi_connect_id || 'MC-10023'}`;
    navigator.clipboard.writeText(shareUrl);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
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

  if (isDoctor) {
    return <DoctorQueue />;
  }

  return (
    <div className="apollo-dashboard-wrapper">
      <div className="apollo-dashboard-container">

        {/* 1. Header Welcome Banner */}
        <div className="apollo-dash-welcome">
          <div className="apollo-dash-welcome-left">
            <div className="apollo-dash-badge-strip">
              <span className="apollo-dash-status-pill">
                <span className="apollo-dash-status-dot" />
                {isPatient ? 'DigiYatra Digital Health Pass Active' : 'Healthcare Network Grid Active'}
              </span>
              <span className="apollo-dash-ai-pill">
                <ShieldCheck size={13} />
                Portable Healthcare Identity
              </span>
              <span className={`apollo-role-tag ${isPatient ? 'patient' : ''}`}>
                {roleName}
              </span>
            </div>

            <h1 className="apollo-dash-title">
              Hello, {displayName} 👋
            </h1>
            <p className="apollo-dash-subtitle">
              {isPatient 
                ? 'Your portable Medi-Connect Health Passport allows instant, paperless check-ins across hospitals, diagnostics, and pharmacies.'
                : 'National healthcare infrastructure orchestrator: patient intake verification, facility capacity, and intelligent triage routing.'}
            </p>
          </div>

          <div className="apollo-dash-welcome-right">
            {!isPatient ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/checkin" className="apollo-dash-btn-primary">
                  <Scan size={18} />
                  <span>Hospital Check-In Terminal</span>
                </Link>
                <Link to="/facilities" className="apollo-dash-btn-secondary">
                  <Building2 size={18} />
                  <span>Facilities Network</span>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/reports" className="apollo-dash-btn-primary">
                  <FileText size={18} />
                  <span>Medical Reports</span>
                </Link>
                <Link to="/facilities" className="apollo-dash-btn-secondary">
                  <Building2 size={18} />
                  <span>Find Healthcare</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PATIENT VIEW: DIGITAL HEALTH PASSPORT HOME                         */}
        {/* ------------------------------------------------------------------ */}
        {isPatient ? (
          <div>
            
            {/* Share link feedback toast */}
            {shareSuccess && (
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '12px 18px',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                <CheckCircle2 size={16} />
                <span>Hospital Check-In share link copied to clipboard! Share it with the hospital desk.</span>
              </div>
            )}

            {/* A. DIGITAL HEALTH PASSPORT CARD (Analogous to DigiYatra Airport Pass) */}
            <div className="passport-card-wrapper">
              <div className="passport-card-inner">
                
                {/* QR Code Container */}
                <div className="passport-qr-box">
                  <div className="passport-qr-image" onClick={() => setShowQrModal(true)} style={{ cursor: 'pointer' }} title="Click to view full screen QR">
                    <QRCodeSVG
                      value={passport?.qr_payload || passport?.medi_connect_id || 'MC-10023'}
                      size={110}
                    />
                  </div>
                  <span className="passport-qr-caption">Hospital Pass</span>
                </div>

                {/* Patient Health ID Details */}
                <div className="passport-details">
                  <div className="passport-badge-header">
                    <span className="passport-gov-tag">
                      <ShieldCheck size={12} /> Medi-Connect National Health Grid
                    </span>
                    <span
                      className="passport-id-chip"
                      onClick={handleCopyId}
                      title="Click to copy Medi-Connect ID"
                    >
                      {passport?.medi_connect_id || 'MC-10023'}
                      {copied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    </span>
                  </div>

                  <div className="passport-patient-name">
                    {passport?.full_name || displayName}
                  </div>

                  <div className="passport-meta-grid">
                    <div className="passport-meta-item">
                      <span className="passport-meta-label">Date of Birth</span>
                      <span className="passport-meta-val">{formatDate(passport?.date_of_birth)}</span>
                    </div>
                    <div className="passport-meta-item">
                      <span className="passport-meta-label">Blood Group</span>
                      <span className="passport-meta-val" style={{ color: '#DC2626' }}>
                        {passport?.blood_group || 'O+'}
                      </span>
                    </div>
                    <div className="passport-meta-item">
                      <span className="passport-meta-label">Gender</span>
                      <span className="passport-meta-val">{passport?.gender || 'Not specified'}</span>
                    </div>
                    <div className="passport-meta-item">
                      <span className="passport-meta-label">Wearable Sync</span>
                      <span className="passport-meta-val" style={{ color: '#059669' }}>Connected HUD</span>
                    </div>
                  </div>

                  <div className="passport-stats-pills">
                    <div className="passport-stat-box">
                      <Building2 size={20} color="#2563EB" />
                      <div>
                        <div className="passport-stat-num">{passport?.connected_facilities_count || 1}</div>
                        <div className="passport-stat-desc">Connected Facilities</div>
                      </div>
                    </div>
                    <div className="passport-stat-box">
                      <FileText size={20} color="#059669" />
                      <div>
                        <div className="passport-stat-num">{passport?.medical_records_count || 4}</div>
                        <div className="passport-stat-desc">Medical Records</div>
                      </div>
                    </div>
                    <div className="passport-stat-box">
                      <Heart size={20} color="#DC2626" />
                      <div>
                        <div className="passport-stat-num">{passport?.active_referrals_count || 0}</div>
                        <div className="passport-stat-desc">Active Referrals</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Bar */}
                <div className="passport-right-actions">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="apollo-dash-btn-secondary"
                    style={{ padding: '9px 14px', fontSize: '0.82rem', justifyContent: 'center' }}
                  >
                    <Edit3 size={15} /> Edit Profile
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="apollo-dash-btn-primary"
                    style={{ padding: '9px 14px', fontSize: '0.82rem', justifyContent: 'center' }}
                  >
                    <QrCode size={15} /> Show Full QR
                  </button>

                  <button
                    onClick={handleShareAccess}
                    className="apollo-dash-btn-secondary"
                    style={{ padding: '9px 14px', fontSize: '0.82rem', justifyContent: 'center' }}
                  >
                    <Share2 size={15} /> Share Access
                  </button>

                  <button
                    onClick={handleCopyId}
                    className="apollo-dash-btn-secondary"
                    style={{ padding: '9px 14px', fontSize: '0.82rem', justifyContent: 'center' }}
                  >
                    {copied ? <Check size={15} color="#059669" /> : <Copy size={15} />}
                    {copied ? 'Copied ID' : 'Copy ID'}
                  </button>
                </div>

              </div>
            </div>

            {/* B. YOUR CURRENT CARE CARD */}
            <div className={`current-care-banner ${passport?.current_care?.has_active_referral ? '' : 'normal'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: passport?.current_care?.has_active_referral ? '#EFF6FF' : '#ECFDF5',
                  color: passport?.current_care?.has_active_referral ? '#2563EB' : '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {passport?.current_care?.has_active_referral ? <Navigation size={22} /> : <CheckCircle2 size={22} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                      YOUR CURRENT CARE
                    </span>
                    {passport?.current_care?.has_active_referral && (
                      <span className="apollo-role-tag active">
                        Active Referral
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {passport?.current_care?.facility_name || 'No Active Referral'}
                  </h3>

                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    {passport?.current_care?.navigation_notes || 'All vitals within normal parameters. Routine preventive mode.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {passport?.current_care?.has_active_referral ? (
                  <Link to="/facilities" className="apollo-dash-btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                    <Navigation size={15} /> Get Directions
                  </Link>
                ) : (
                  <Link to="/facilities" className="apollo-dash-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                    <Building2 size={15} /> Find Nearest Center
                  </Link>
                )}

                <a href="tel:108" className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '0.82rem', textDecoration: 'none' }}>
                  <PhoneCall size={15} /> SOS 108
                </a>
              </div>
            </div>

            {/* C. DIGIYATRA FOUR CORE MODULES */}
            <div className="apollo-modules-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              {/* Tile 1: Find Healthcare */}
              <Link to="/facilities" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon triage">
                    <Building2 size={22} />
                  </div>
                  <span className="apollo-module-badge">59 Centers</span>
                </div>
                <h3 className="apollo-module-title">Find Healthcare</h3>
                <p className="apollo-module-desc">
                  Browse 59 verified Primary Health Centres, CHCs, and Hospitals with real-time bed capacity and GPS navigation.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    Locate Center <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Tile 2: My Journey */}
              <Link to="/my-journey" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon referrals">
                    <Clock size={22} />
                  </div>
                  <span className="apollo-module-badge">Timeline</span>
                </div>
                <h3 className="apollo-module-title">My Healthcare Journey</h3>
                <p className="apollo-module-desc">
                  Track your unified care timeline from symptom intake to diagnostic tests, hospital visits, and follow-ups.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    View Journey <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Tile 3: My Health Records */}
              <Link to="/my-health" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon patients">
                    <FileText size={22} />
                  </div>
                  <span className="apollo-module-badge">Health ID</span>
                </div>
                <h3 className="apollo-module-title">My Health Hub</h3>
                <p className="apollo-module-desc">
                  Centralized records: digital passport details, active prescriptions, allergies, and continuous wearable telemetry.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    Open Records <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Tile 4: Consent & Privacy */}
              <Link to="/consent" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon capacity">
                    <Lock size={22} />
                  </div>
                  <span className="apollo-module-badge">Zero-Trust</span>
                </div>
                <h3 className="apollo-module-title">Consent & Privacy</h3>
                <p className="apollo-module-desc">
                  Control which hospitals access your records. Review authorized scopes, grant permissions, or revoke with 1 click.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    Manage Privacy <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

            </div>

          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* ADMIN VIEW: HEALTHCARE NETWORK & INTAKE ORCHESTRATION               */
          /* ------------------------------------------------------------------ */
          <div>
            {/* Minimalist KPI Metric Strip */}
            <div className="apollo-kpi-grid">
              <div className="apollo-kpi-card">
                <div className="apollo-kpi-top">
                  <span className="apollo-kpi-label">Registered Patients</span>
                  <div className="apollo-kpi-icon patients">
                    <Users size={20} />
                  </div>
                </div>
                <div className="apollo-kpi-value-row">
                  <span className="apollo-kpi-value">{loading ? '—' : adminStats.patientsCount}</span>
                  <span className="apollo-kpi-trend"><CheckCircle2 size={13} /> Active</span>
                </div>
                <span className="apollo-kpi-subtext">Issued Medi-Connect Passports</span>
              </div>

              <div className="apollo-kpi-card">
                <div className="apollo-kpi-top">
                  <span className="apollo-kpi-label">Healthcare Network</span>
                  <div className="apollo-kpi-icon hospitals">
                    <Building2 size={20} />
                  </div>
                </div>
                <div className="apollo-kpi-value-row">
                  <span className="apollo-kpi-value">{loading ? '—' : adminStats.facilitiesCount}</span>
                  <span className="apollo-kpi-trend"><Activity size={13} /> Online</span>
                </div>
                <span className="apollo-kpi-subtext">59 Kaggle-synced PHCs, CHCs & Hospitals</span>
              </div>

              <div className="apollo-kpi-card">
                <div className="apollo-kpi-top">
                  <span className="apollo-kpi-label">Available ICU Beds</span>
                  <div className="apollo-kpi-icon icu">
                    <HeartPulse size={20} />
                  </div>
                </div>
                <div className="apollo-kpi-value-row">
                  <span className="apollo-kpi-value">{loading ? '—' : adminStats.icuBedsAvailable}</span>
                  <span className="apollo-kpi-trend">Ready</span>
                </div>
                <span className="apollo-kpi-subtext">Across connected facilities</span>
              </div>

              <div className="apollo-kpi-card">
                <div className="apollo-kpi-top">
                  <span className="apollo-kpi-label">Active Referrals</span>
                  <div className="apollo-kpi-icon referrals">
                    <ArrowRightLeft size={20} />
                  </div>
                </div>
                <div className="apollo-kpi-value-row">
                  <span className="apollo-kpi-value">{loading ? '—' : adminStats.activeReferrals}</span>
                  <span className="apollo-kpi-trend">In Transit</span>
                </div>
                <span className="apollo-kpi-subtext">Priority emergency transfers</span>
              </div>
            </div>

            {/* Admin Modules */}
            <div className="apollo-modules-grid">
              
              {/* Module: Hospital Check-in Terminal */}
              <Link to="/checkin" className="apollo-module-card" style={{ textDecoration: 'none', border: '2px solid #059669' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon triage">
                    <Scan size={22} />
                  </div>
                  <span className="apollo-module-badge" style={{ background: '#ECFDF5', color: '#065F46' }}>Check-In Station</span>
                </div>
                <h3 className="apollo-module-title">Hospital Check-In Terminal</h3>
                <p className="apollo-module-desc">
                  Scan patient Medi-Connect QR, evaluate consent, retrieve scoped context, and attach clinical encounters in real time.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link" style={{ color: '#059669' }}>
                    Launch Terminal <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Module: Facilities Network */}
              <Link to="/facilities" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon hospitals">
                    <Building2 size={22} />
                  </div>
                  <span className="apollo-module-badge">59 Centers</span>
                </div>
                <h3 className="apollo-module-title">Facilities Network</h3>
                <p className="apollo-module-desc">
                  Monitor capacity, bed occupancy, doctor rosters, and medicine inventory across all primary and tertiary hospitals.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    Explore Network <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Module: Capacity Manager */}
              <Link to="/capacity" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon capacity">
                    <Sliders size={22} />
                  </div>
                  <span className="apollo-module-badge">Telemetry</span>
                </div>
                <h3 className="apollo-module-title">Capacity Manager</h3>
                <p className="apollo-module-desc">
                  Real-time bed, ventilator, and oxygen management with rapid manual overrides.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    Update Capacity <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Module: Referrals Tracker */}
              <Link to="/referrals" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon referrals">
                    <ArrowRightLeft size={22} />
                  </div>
                  <span className="apollo-module-badge">Routing</span>
                </div>
                <h3 className="apollo-module-title">Referrals & Transfers</h3>
                <p className="apollo-module-desc">
                  Track patient transit between PHCs, CHCs, and tertiary hospitals with live ETA and clinical notes.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    Manage Referrals <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Module: Patients Directory */}
              <Link to="/patients" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon patients">
                    <Users size={22} />
                  </div>
                  <span className="apollo-module-badge">Directory</span>
                </div>
                <h3 className="apollo-module-title">Patients Directory</h3>
                <p className="apollo-module-desc">
                  Access patient longitudinal records, issued Medi-Connect IDs, chronic condition tags, and medical history.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    View Registry <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

              {/* Module: Medical Reports */}
              <Link to="/reports" className="apollo-module-card" style={{ textDecoration: 'none' }}>
                <div className="apollo-module-top">
                  <div className="apollo-module-icon patients">
                    <FileText size={22} />
                  </div>
                  <span className="apollo-module-badge">History Hub</span>
                </div>
                <h3 className="apollo-module-title">Medical Reports & History</h3>
                <p className="apollo-module-desc">
                  Interconnected repository of lab tests, pathology panels, imaging, and hospital summaries across the healthcare grid.
                </p>
                <div className="apollo-module-footer">
                  <span className="apollo-module-action-link">
                    Browse Reports <ArrowRight size={14} />
                  </span>
                </div>
              </Link>

            </div>
          </div>
        )}

        {/* QR Code Fullscreen Modal */}
        {showQrModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }} onClick={() => setShowQrModal(false)}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '36px',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'inline-flex', padding: '16px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <QRCodeSVG
                  value={passport?.qr_payload || passport?.medi_connect_id || 'MC-10023'}
                  size={220}
                />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                {passport?.full_name || displayName}
              </h3>
              <div style={{
                background: '#FEF3C7',
                color: '#92400E',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}>
                {passport?.medi_connect_id || 'MC-10023'}
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
                Show this QR Code at the registration desk, triage checkpoint, diagnostic lab, or pharmacy for instant digital check-in.
              </p>
              <button
                onClick={() => setShowQrModal(false)}
                className="apollo-dash-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Done
              </button>
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

      </div>
    </div>
  );
};
