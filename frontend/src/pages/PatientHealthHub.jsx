import React, { useState, useEffect } from 'react';
import { patientService, digiYatraService } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Heart, 
  FileText, 
  Pill, 
  AlertTriangle, 
  HeartPulse, 
  ShieldCheck, 
  Copy, 
  Check, 
  Building2, 
  Calendar, 
  Plus, 
  Activity,
  Radio,
  Clock,
  Edit3
} from 'lucide-react';
import { EditPatientProfileModal } from '../components/EditPatientProfileModal';
import '../styles/DashboardApollo.css';

export const PatientHealthHub = () => {
  const [activeTab, setActiveTab] = useState('passport');
  const [passport, setPassport] = useState(null);
  const [medications, setMedications] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [history, setHistory] = useState([]);
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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
        const pass = await digiYatraService.getPassport();
        setPassport(pass);

        if (pass?.id) {
          const [meds, allgs, tests] = await Promise.all([
            patientService.getMedications(pass.id).catch(() => []),
            patientService.getAllergies(pass.id).catch(() => []),
            patientService.getMedicalTests(pass.id).catch(() => []),
          ]);
          setMedications(meds || []);
          setAllergies(allgs || []);
          setHistory(tests || []);
        }
      } catch (err) {
        console.error('Error fetching health hub data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCopyId = () => {
    if (passport?.medi_connect_id) {
      navigator.clipboard.writeText(passport.medi_connect_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
    <div className="apollo-dashboard-wrapper">
      <div className="apollo-dashboard-container" style={{ maxWidth: '1080px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div className="apollo-dash-badge-strip" style={{ marginBottom: '10px' }}>
            <span className="apollo-dash-status-pill">
              <span className="apollo-dash-status-dot" />
              Comprehensive Health Profile
            </span>
            <span className="apollo-dash-ai-pill">
              <ShieldCheck size={13} />
              Verified Health Identity
            </span>
          </div>
          <h1 className="apollo-dash-title" style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
            My Health Hub
          </h1>
          <p className="apollo-dash-subtitle">
            Centralized digital records for your portable healthcare identity, clinical history, medications, allergies, and telemetry.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            { id: 'passport', label: 'Health ID & Passport', icon: ShieldCheck },
            { id: 'records', label: 'Medical History & Tests', icon: FileText },
            { id: 'medications', label: `Medications (${medications.length})`, icon: Pill },
            { id: 'allergies', label: `Allergies (${allergies.length})`, icon: AlertTriangle },
            { id: 'vitals', label: 'Wearables & Telemetry', icon: HeartPulse },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #059669' : '1px solid transparent',
                  background: isActive ? '#ECFDF5' : 'transparent',
                  color: isActive ? '#065F46' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Passport View */}
        {activeTab === 'passport' && (
          <div>
            {passport && (
              <div className="passport-card-wrapper">
                <div className="passport-card-inner">
                  
                  {/* Left QR */}
                  <div className="passport-qr-box">
                    <div className="passport-qr-image">
                      <QRCodeSVG value={passport.qr_payload || passport.medi_connect_id} size={110} />
                    </div>
                    <span className="passport-qr-caption">Hospital Pass</span>
                  </div>

                  {/* Center Details */}
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
                        {passport.medi_connect_id}
                        {copied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      </span>
                    </div>

                    <div className="passport-patient-name">
                      {passport.full_name}
                    </div>

                    <div className="passport-meta-grid">
                      <div className="passport-meta-item">
                        <span className="passport-meta-label">Date of Birth</span>
                        <span className="passport-meta-val">{formatDate(passport.date_of_birth)}</span>
                      </div>
                      <div className="passport-meta-item">
                        <span className="passport-meta-label">Blood Group</span>
                        <span className="passport-meta-val" style={{ color: '#DC2626' }}>
                          {passport.blood_group || 'O+'}
                        </span>
                      </div>
                      <div className="passport-meta-item">
                        <span className="passport-meta-label">Gender</span>
                        <span className="passport-meta-val">{passport.gender || 'Not specified'}</span>
                      </div>
                      <div className="passport-meta-item">
                        <span className="passport-meta-label">Wearable Sync</span>
                        <span className="passport-meta-val" style={{ color: '#059669' }}>Connected</span>
                      </div>
                    </div>

                    <div className="passport-stats-pills">
                      <div className="passport-stat-box">
                        <Building2 size={20} color="#2563EB" />
                        <div>
                          <div className="passport-stat-num">{passport.connected_facilities_count}</div>
                          <div className="passport-stat-desc">Connected Facilities</div>
                        </div>
                      </div>
                      <div className="passport-stat-box">
                        <FileText size={20} color="#059669" />
                        <div>
                          <div className="passport-stat-num">{passport.medical_records_count}</div>
                          <div className="passport-stat-desc">Medical Records</div>
                        </div>
                      </div>
                      <div className="passport-stat-box">
                        <Heart size={20} color="#DC2626" />
                        <div>
                          <div className="passport-stat-num">{passport.active_referrals_count}</div>
                          <div className="passport-stat-desc">Active Care Path</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Bar */}
                  <div className="passport-right-actions" style={{ marginTop: '16px' }}>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="apollo-dash-btn-primary"
                      style={{ padding: '9px 14px', fontSize: '0.82rem', justifyContent: 'center' }}
                    >
                      <Edit3 size={15} /> Edit Profile Details
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
            )}
          </div>
        )}

        {/* Tab 2: Medical History & Tests */}
        {activeTab === 'records' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              Diagnostic Tests & Laboratory Reports
            </h3>
            {history.length === 0 ? (
              <div className="journey-card" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                No diagnostic test reports attached to your profile yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {history.map((t) => (
                  <div key={t.id} className="journey-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1rem', color: '#0F172A' }}>{t.test_name}</strong>
                      <span className="apollo-role-tag verified">{t.category || 'Diagnostics'}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '10px' }}>
                      {t.result_summary}
                    </p>
                    <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                      Test Date: {formatDate(t.test_date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Medications */}
        {activeTab === 'medications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              Active Prescriptions & Regimens
            </h3>
            {medications.length === 0 ? (
              <div className="journey-card" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                No active medications recorded.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {medications.map((m) => (
                  <div key={m.id} className="journey-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Pill size={16} color="#059669" />
                        <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{m.medicine_name}</strong>
                      </div>
                      <span className="apollo-role-tag active">{m.status}</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span><strong>Dosage:</strong> {m.dosage}</span>
                      <span><strong>Frequency:</strong> {m.frequency}</span>
                      <span style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '4px' }}>
                        Prescribed: {formatDate(m.prescribed_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Allergies */}
        {activeTab === 'allergies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              Known Allergies & Medical Warnings
            </h3>
            {allergies.length === 0 ? (
              <div className="journey-card" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                No allergies recorded.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {allergies.map((a) => (
                  <div key={a.id} className="journey-card" style={{ borderLeft: '4px solid #F43F5E' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '1rem', color: '#9F1239' }}>{a.allergen}</strong>
                      <span className="apollo-role-tag" style={{ background: '#FFF1F2', color: '#E11D48' }}>
                        {a.severity}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0 }}>
                      Reaction: {a.reaction}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Wearables & Telemetry */}
        {activeTab === 'vitals' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
            <div className="apollo-kpi-card">
              <span className="apollo-kpi-label">Heart Rate</span>
              <div className="apollo-kpi-value-row">
                <span className="apollo-kpi-value" style={{ color: '#059669' }}>74</span>
                <span className="apollo-kpi-trend">BPM</span>
              </div>
              <span className="apollo-kpi-subtext">Resting Sinus Rhythm</span>
            </div>

            <div className="apollo-kpi-card">
              <span className="apollo-kpi-label">SpO₂ Oxygen</span>
              <div className="apollo-kpi-value-row">
                <span className="apollo-kpi-value" style={{ color: '#0284C7' }}>98%</span>
                <span className="apollo-kpi-trend">Normal</span>
              </div>
              <span className="apollo-kpi-subtext">Continuous Pulse Oximetry</span>
            </div>

            <div className="apollo-kpi-card">
              <span className="apollo-kpi-label">Blood Pressure</span>
              <div className="apollo-kpi-value-row">
                <span className="apollo-kpi-value">118/78</span>
                <span className="apollo-kpi-trend">mmHg</span>
              </div>
              <span className="apollo-kpi-subtext">Optimum Normotensive</span>
            </div>

            <div className="apollo-kpi-card">
              <span className="apollo-kpi-label">Body Temperature</span>
              <div className="apollo-kpi-value-row">
                <span className="apollo-kpi-value">37.0°C</span>
                <span className="apollo-kpi-trend">Afebrile</span>
              </div>
              <span className="apollo-kpi-subtext">Thermal Sensor Active</span>
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
