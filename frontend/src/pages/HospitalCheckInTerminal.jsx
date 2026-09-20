import React, { useState, useRef, useEffect } from 'react';
import { digiYatraService } from '../services/api';
import jsQR from 'jsqr';
import { 
  Building2, 
  ShieldCheck, 
  Scan, 
  UserCheck, 
  AlertTriangle, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  CheckCircle2, 
  HeartPulse, 
  FileText, 
  Clock,
  ArrowRight,
  Send,
  Camera,
  Upload,
  Keyboard,
  Sparkles,
  StopCircle,
  RefreshCw,
  QrCode,
  Check,
  Copy
} from 'lucide-react';
import '../styles/DashboardApollo.css';

export const HospitalCheckInTerminal = () => {
  const [checkinMode, setCheckinMode] = useState('qr'); // 'qr' | 'manual'
  const [mcId, setMcId] = useState('MC-69782');
  const [facilityName, setFacilityName] = useState('Maharaja Yashwantrao Hospital (MYH Indore)');
  const [staffRole, setStaffRole] = useState('Cardiologist');
  const [loading, setLoading] = useState(false);
  const [terminalResult, setTerminalResult] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Camera QR Scanner states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanPulse, setScanPulse] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Clinical action form states
  const [activeTab, setActiveTab] = useState('encounter');
  const [encounterData, setEncounterData] = useState({
    chief_complaint: 'Exertional dyspnea and intermittent palpitations',
    diagnosis: 'Supraventricular Ectopy, Essential Hypertension',
    treatment_notes: 'Reviewed 12-lead ECG. Continued Amlodipine 5mg. Scheduled 24hr ambulatory Holter monitor.',
  });
  const [testData, setTestData] = useState({
    test_name: 'Repeat 12-Lead Electrocardiogram (ECG)',
    category: 'Cardiology Diagnostics',
    result_summary: 'Normal sinus rhythm at 72 bpm. PR interval 160ms. QTc 410ms. No ST-T abnormalities.',
  });
  const [medData, setMedData] = useState({
    medicine_name: 'Metoprolol Tartrate',
    dosage: '25mg',
    frequency: 'Once daily morning after food',
  });

  // Extract valid Medi-Connect ID from any raw decoded string, JSON, or URL
  const extractMcId = (raw) => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (parsed.medi_connect_id) return parsed.medi_connect_id;
    } catch {}

    if (raw.includes('?id=')) {
      try {
        const u = new URL(raw, window.location.origin);
        const p = u.searchParams.get('id');
        if (p) return p;
      } catch {}
    }

    const match = raw.match(/MC-\d{4,6}/i);
    if (match) return match[0].toUpperCase();

    return raw.trim();
  };

  const handleCheckin = async (e, overrideId = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetId = (overrideId || mcId || '').trim();
    if (!targetId) return;

    setLoading(true);
    setActionSuccess('');
    try {
      const res = await digiYatraService.terminalCheckin({
        medi_connect_id: targetId,
        facility_name: facilityName,
        staff_role: staffRole,
      });
      setTerminalResult(res);
      setMcId(targetId);
    } catch (err) {
      console.error('Checkin failed:', err);
      setTerminalResult({
        verified: false,
        message: err.response?.data?.detail || 'Patient identity lookup failed. Invalid Medi-Connect ID.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecodedQr = (rawQrData) => {
    const extractedId = extractMcId(rawQrData);
    if (extractedId) {
      setMcId(extractedId);
      setScanPulse(true);
      setTimeout(() => setScanPulse(false), 800);
      handleCheckin(null, extractedId);
    } else {
      setCameraError('QR code scanned, but could not detect a valid Medi-Connect ID.');
    }
  };

  // Live Camera Scanner loop using jsQR
  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err) {
      console.warn('Camera access unavailable:', err);
      setCameraError('Camera access not available or permission denied. Please upload a QR image or enter ID manually.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const scanTick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        handleDecodedQr(code.data);
        stopCamera();
        return;
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanTick);
  };

  // Upload QR Image reader
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleDecodedQr(code.data);
        } else {
          setCameraError('No valid QR code detected in the selected image. Please try another image or enter ID manually.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleGrantVisitConsent = async () => {
    setLoading(true);
    try {
      const res = await digiYatraService.terminalGrantConsent({
        medi_connect_id: mcId.trim(),
        facility_name: facilityName,
        staff_role: staffRole,
      });
      setTerminalResult(res);
      setActionSuccess('Patient approved 24-hour hospital visit consent! Scoped medical context unlocked.');
    } catch (err) {
      console.error('Failed to grant visit consent:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAction = async (actionType) => {
    setLoading(true);
    try {
      let payload = {
        medi_connect_id: mcId.trim(),
        facility_name: facilityName,
        staff_role: staffRole,
        action_type: actionType,
      };

      if (actionType === 'encounter') {
        payload = { ...payload, ...encounterData };
      } else if (actionType === 'test') {
        payload = { ...payload, ...testData };
      } else if (actionType === 'medication') {
        payload = { ...payload, ...medData };
      }

      const res = await digiYatraService.terminalRecordAction(payload);
      setActionSuccess(res.message || 'Record successfully attached to patient digital health passport.');
    } catch (err) {
      console.error('Failed to record action:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apollo-dashboard-wrapper">
      <div className="apollo-dashboard-container" style={{ maxWidth: '1100px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div className="apollo-dash-badge-strip" style={{ marginBottom: '10px' }}>
            <span className="apollo-dash-status-pill">
              <span className="apollo-dash-status-dot" />
              Hospital Checkpoint Operational
            </span>
            <span className="apollo-dash-ai-pill">
              <Scan size={13} />
              DigiYatra Patient Intake Terminal
            </span>
          </div>
          <h1 className="apollo-dash-title" style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
            Hospital Check-In & Verification Terminal
          </h1>
          <p className="apollo-dash-subtitle">
            Seamless patient intake: scan the patient’s Digital Health Passport QR code or enter their Medi-Connect ID manually. Verify identity, evaluate zero-trust consent, and review authorized clinical context without manual paperwork.
          </p>
        </div>

        {actionSuccess && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '14px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}>
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Input Terminal Card with Dual QR Scan and Manual ID Enter */}
        <div className="terminal-search-box">
          
          {/* Facility & Staff Station Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: '16px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
          }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                <Building2 size={13} color="#2563EB" />
                Current Healthcare Facility
              </label>
              <select
                className="form-input"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.86rem', background: '#FFFFFF' }}
              >
                <option value="Maharaja Yashwantrao Hospital (MYH Indore)">Maharaja Yashwantrao Hospital (MYH Indore)</option>
                <option value="Indore City General Hospital">Indore City General Hospital</option>
                <option value="Community Health Centre (CHC) Sanwer">Community Health Centre (CHC) Sanwer</option>
                <option value="CHC Vijay Nagar Health Centre">CHC Vijay Nagar Health Centre</option>
                <option value="Apollo Health City Central Labs">Apollo Health City Central Labs</option>
                <option value="Thyrocare Central Diagnostics">Thyrocare Central Diagnostics</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                <Stethoscope size={13} color="#059669" />
                Staff Role
              </label>
              <select
                className="form-input"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.86rem', background: '#FFFFFF' }}
              >
                <option value="Cardiologist">Attending Cardiologist</option>
                <option value="General Physician">General Physician (OPD)</option>
                <option value="Triage Nurse">Emergency Triage Nurse</option>
                <option value="Lab Technician">Clinical Pathologist / Lab Tech</option>
                <option value="Pharmacist">Hospital Pharmacist</option>
              </select>
            </div>
          </div>

          {/* Mode Switcher Tabs: QR Scan vs Manual ID */}
          <div className="terminal-mode-switch">
            <button
              type="button"
              onClick={() => {
                setCheckinMode('qr');
                setCameraError('');
              }}
              className={`terminal-mode-btn ${checkinMode === 'qr' ? 'active' : ''}`}
            >
              <QrCode size={18} color={checkinMode === 'qr' ? '#2563EB' : '#64748B'} />
              <span>📷 Scan Patient QR Pass</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCheckinMode('manual');
                stopCamera();
                setCameraError('');
              }}
              className={`terminal-mode-btn ${checkinMode === 'manual' ? 'active' : ''}`}
            >
              <Keyboard size={18} color={checkinMode === 'manual' ? '#2563EB' : '#64748B'} />
              <span>⌨️ Enter ID Manually</span>
            </button>
          </div>

          {/* Mode 1: QR Code Scanner */}
          {checkinMode === 'qr' && (
            <div>
              <div className="qr-scanner-box">
                {/* Viewfinder Frame */}
                <div className="qr-video-viewport">
                  {/* Corner Brackets */}
                  <div className="qr-corner-bracket qr-corner-tl" />
                  <div className="qr-corner-bracket qr-corner-tr" />
                  <div className="qr-corner-bracket qr-corner-bl" />
                  <div className="qr-corner-bracket qr-corner-br" />

                  {/* Animated Laser Scan Line */}
                  {(isCameraActive || scanPulse) && (
                    <div className="qr-scanner-laser" />
                  )}

                  {isCameraActive ? (
                    <video
                      ref={videoRef}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '18px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                      }}>
                        <Scan size={36} color="#10B981" />
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#E2E8F0' }}>
                        Patient QR Viewfinder
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>
                        Point device camera or upload image
                      </div>
                    </div>
                  )}

                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {/* Camera / Action Controls */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '14px' }}>
                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="apollo-dash-btn-primary"
                      style={{ padding: '10px 20px', fontSize: '0.86rem', background: '#10B981' }}
                    >
                      <Camera size={16} />
                      <span>Start Live Camera Scanner</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="apollo-dash-btn-secondary"
                      style={{ padding: '10px 20px', fontSize: '0.86rem', background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}
                    >
                      <StopCircle size={16} />
                      <span>Stop Camera</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="apollo-dash-btn-secondary"
                    style={{ padding: '10px 18px', fontSize: '0.86rem', background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: '#475569' }}
                  >
                    <Upload size={16} />
                    <span>Upload QR Image</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                </div>

                {cameraError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #EF4444',
                    color: '#FCA5A5',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    textAlign: 'center',
                    maxWidth: '460px',
                    marginTop: '8px',
                  }}>
                    {cameraError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Manual ID Entry */}
          {checkinMode === 'manual' && (
            <div>
              <form onSubmit={handleCheckin}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'flex-end', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Keyboard size={14} color="#2563EB" />
                      <span>Enter Patient Medi-Connect ID Manually</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MC-69782 or MC-75912"
                      className="form-input"
                      value={mcId}
                      onChange={(e) => setMcId(e.target.value)}
                      style={{
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        fontFamily: 'monospace',
                        fontSize: '1.05rem',
                        height: '46px',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="apollo-dash-btn-primary"
                    style={{ height: '46px', padding: '0 26px', fontSize: '0.88rem' }}
                  >
                    <UserCheck size={18} />
                    <span>{loading ? 'Verifying...' : 'Verify Patient & Check In'}</span>
                  </button>
                </div>
              </form>

              {/* Quick Demo Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Registered Demo Patients:
                </span>
                {[
                  { label: 'Amaira Maharaj (MC-69782)', id: 'MC-69782' },
                  { label: 'Radhika Handa (MC-75912)', id: 'MC-75912' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setMcId(p.id);
                      handleCheckin(null, p.id);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '16px',
                      border: mcId === p.id ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      background: mcId === p.id ? '#EFF6FF' : '#F8FAFC',
                      color: mcId === p.id ? '#1E40AF' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Verification Result Display */}
        {terminalResult && (
          <div>
            {!terminalResult.verified ? (
              <div className="journey-card" style={{ borderLeft: '4px solid #EF4444', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', marginBottom: '8px' }}>
                  <AlertTriangle size={20} />
                  <strong style={{ fontSize: '1.05rem' }}>Identity Verification Failed</strong>
                </div>
                <p style={{ color: '#64748B', fontSize: '0.88rem' }}>{terminalResult.message}</p>
              </div>
            ) : terminalResult.consent_status === 'pending' ? (
              <div className="journey-card" style={{ borderLeft: '4px solid #F59E0B', padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserCheck size={24} color="#D97706" />
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                        PATIENT IDENTIFIED: {terminalResult.full_name} ({terminalResult.medi_connect_id})
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: '#B45309' }}>
                        Consent Required — Zero-Trust Policy Active
                      </span>
                    </div>
                  </div>
                  <span className="apollo-role-tag" style={{ background: '#FEF3C7', color: '#92400E' }}>
                    Consent Pending
                  </span>
                </div>

                <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '20px' }}>
                  The patient’s identity has been verified in the Medi-Connect National Registry. However, this hospital does not hold an active consent grant. To view medical context, the patient must approve access.
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleGrantVisitConsent}
                    disabled={loading}
                    className="apollo-dash-btn-primary"
                    style={{ padding: '10px 18px' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve Hospital Visit Consent (24h)</span>
                  </button>
                  <button
                    onClick={() => setTerminalResult(null)}
                    className="apollo-dash-btn-secondary"
                  >
                    Cancel Check-in
                  </button>
                </div>
              </div>
            ) : (
              /* Verified & Scoped Context Granted */
              <div className="terminal-context-card">
                
                {/* Verified Header Banner */}
                <div className="terminal-verified-badge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck size={26} color="#059669" />
                    <div>
                      <strong style={{ fontSize: '1.1rem', color: '#065F46', display: 'block' }}>
                        PATIENT VERIFIED — DIGIYATRA HEALTH PASS ACTIVE
                      </strong>
                      <span style={{ fontSize: '0.82rem', color: '#047857' }}>
                        Medi-Connect ID: <strong>{terminalResult.medi_connect_id}</strong> • Access Duration: <strong>{terminalResult.duration === 'visit' ? 'This Visit' : terminalResult.duration}</strong>
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.78rem', background: '#FFFFFF', padding: '4px 10px', borderRadius: '14px', border: '1px solid #A7F3D0', fontWeight: 600, color: '#065F46' }}>
                    Authorized Clinical Context
                  </span>
                </div>

                {/* Patient Scoped Context Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '24px' }}>
                  
                  {/* Demographics */}
                  {terminalResult.basic_profile && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                        Demographics & Profile
                      </span>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', marginTop: '6px', marginBottom: '8px' }}>
                        {terminalResult.basic_profile.name}
                      </h4>
                      <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span>DOB: {terminalResult.basic_profile.dob} ({terminalResult.basic_profile.gender})</span>
                        <span>Blood Group: <strong style={{ color: '#DC2626' }}>{terminalResult.basic_profile.blood_group}</strong></span>
                        <span>Wearable: {terminalResult.basic_profile.wearable_device_id}</span>
                      </div>
                    </div>
                  )}

                  {/* Vitals */}
                  {terminalResult.vitals && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                        Telemetry & Vitals
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>
                          {terminalResult.vitals.heart_rate}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>BPM</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span>SpO2: <strong>{terminalResult.vitals.spo2}%</strong></span>
                        <span>BP: <strong>{terminalResult.vitals.blood_pressure}</strong></span>
                        <span>Status: <strong style={{ color: '#059669' }}>{terminalResult.vitals.status}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Critical Allergies */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                      Known Allergies
                    </span>
                    <div style={{ marginTop: '8px' }}>
                      {terminalResult.allergies && terminalResult.allergies.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {terminalResult.allergies.map((allg, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#FEF2F2',
                                color: '#991B1B',
                                border: '1px solid #FECACA',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              {allg.allergen} ({allg.severity})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: '#059669' }}>No known allergies reported</span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Active Medications & Past Tests */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '28px' }}>
                  
                  {/* Medications */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Pill size={16} color="#2563EB" />
                      Active Prescriptions ({terminalResult.medications ? terminalResult.medications.length : 0})
                    </h4>
                    {terminalResult.medications && terminalResult.medications.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {terminalResult.medications.map((m, idx) => (
                          <div key={idx} style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                            <strong>{m.name}</strong> • {m.dosage} ({m.frequency})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#64748B' }}>No active prescriptions in record</span>
                    )}
                  </div>

                  {/* Medical Tests */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <FlaskConical size={16} color="#059669" />
                      Recent Lab & Diagnostic Reports
                    </h4>
                    {terminalResult.tests && terminalResult.tests.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {terminalResult.tests.map((t, idx) => (
                          <div key={idx} style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                            <strong>{t.name}</strong> ({t.category}): {t.summary}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#64748B' }}>No recent lab tests found</span>
                    )}
                  </div>

                </div>

                {/* Section 3: Clinical Actions (Log Encounter, Prescribe, Order Test) */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
                    Provider Actions — Record to Patient’s Longitudinal Health Journey
                  </h3>

                  {/* Action Tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('encounter')}
                      className={`terminal-mode-btn ${activeTab === 'encounter' ? 'active' : ''}`}
                      style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                    >
                      <Stethoscope size={15} />
                      <span>1. Record Clinical Encounter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('test')}
                      className={`terminal-mode-btn ${activeTab === 'test' ? 'active' : ''}`}
                      style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                    >
                      <FlaskConical size={15} />
                      <span>2. Order Diagnostic Test</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('medication')}
                      className={`terminal-mode-btn ${activeTab === 'medication' ? 'active' : ''}`}
                      style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                    >
                      <Pill size={15} />
                      <span>3. Prescribe Medication</span>
                    </button>
                  </div>

                  {/* Form 1: Clinical Encounter */}
                  {activeTab === 'encounter' && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                        <div>
                          <label className="form-label">Chief Complaint</label>
                          <input
                            type="text"
                            className="form-input"
                            value={encounterData.chief_complaint}
                            onChange={(e) => setEncounterData({ ...encounterData, chief_complaint: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label">Clinical Diagnosis</label>
                          <input
                            type="text"
                            className="form-input"
                            value={encounterData.diagnosis}
                            onChange={(e) => setEncounterData({ ...encounterData, diagnosis: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: '18px' }}>
                        <label className="form-label">Treatment Notes & Observations</label>
                        <textarea
                          rows={3}
                          className="form-input"
                          value={encounterData.treatment_notes}
                          onChange={(e) => setEncounterData({ ...encounterData, treatment_notes: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={() => handleRecordAction('encounter')}
                        disabled={loading}
                        className="apollo-dash-btn-primary"
                      >
                        <Send size={15} />
                        <span>Save Encounter to Care Journey</span>
                      </button>
                    </div>
                  )}

                  {/* Form 2: Diagnostic Test */}
                  {activeTab === 'test' && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '14px' }}>
                        <div>
                          <label className="form-label">Diagnostic Test Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={testData.test_name}
                            onChange={(e) => setTestData({ ...testData, test_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label">Category</label>
                          <input
                            type="text"
                            className="form-input"
                            value={testData.category}
                            onChange={(e) => setTestData({ ...testData, category: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: '18px' }}>
                        <label className="form-label">Findings Summary / Observations</label>
                        <textarea
                          rows={3}
                          className="form-input"
                          value={testData.result_summary}
                          onChange={(e) => setTestData({ ...testData, result_summary: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={() => handleRecordAction('test')}
                        disabled={loading}
                        className="apollo-dash-btn-primary"
                      >
                        <Send size={15} />
                        <span>Attach Test Report to Health ID</span>
                      </button>
                    </div>
                  )}

                  {/* Form 3: Medication */}
                  {activeTab === 'medication' && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                        <div>
                          <label className="form-label">Medicine Name & Formulation</label>
                          <input
                            type="text"
                            className="form-input"
                            value={medData.medicine_name}
                            onChange={(e) => setMedData({ ...medData, medicine_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label">Dosage</label>
                          <input
                            type="text"
                            className="form-input"
                            value={medData.dosage}
                            onChange={(e) => setMedData({ ...medData, dosage: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="form-label">Frequency</label>
                          <input
                            type="text"
                            className="form-input"
                            value={medData.frequency}
                            onChange={(e) => setMedData({ ...medData, frequency: e.target.value })}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRecordAction('medication')}
                        disabled={loading}
                        className="apollo-dash-btn-primary"
                      >
                        <Send size={15} />
                        <span>Dispense & Sync to Pharmacy Grid</span>
                      </button>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default HospitalCheckInTerminal;
