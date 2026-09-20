import React, { useState, useEffect } from 'react';
import { digiYatraService } from '../services/api';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  Eye, 
  AlertCircle,
  PlusCircle,
  FileText
} from 'lucide-react';
import '../styles/DashboardApollo.css';

export const ConsentPrivacy = () => {
  const [consents, setConsents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Simulator state
  const [simFacility, setSimFacility] = useState('Indore City General Hospital');
  const [simDuration, setSimDuration] = useState('visit');
  const [simScopes, setSimScopes] = useState({
    basic_profile: true,
    allergies: true,
    medications: true,
    medical_history: true,
    vitals: true,
    tests: true,
  });

  const loadData = async () => {
    try {
      const [cData, aData] = await Promise.all([
        digiYatraService.getConsents().catch(() => []),
        digiYatraService.getConsentHistory().catch(() => []),
      ]);
      setConsents(cData || []);
      setAuditLogs(aData || []);
    } catch (err) {
      console.error('Error loading consent & privacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevoke = async (consentId) => {
    setActionLoading(true);
    try {
      await digiYatraService.revokeConsent(consentId);
      setSuccessMsg('Facility access has been revoked immediately. Records are no longer shared.');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to revoke consent:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantConsent = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const activeScopes = Object.keys(simScopes).filter(k => simScopes[k]);
      await digiYatraService.createConsent({
        facility_name: simFacility,
        department: 'Emergency & Outpatient Care',
        requested_by_role: 'doctor',
        scopes: activeScopes,
        duration: simDuration,
      });
      setSuccessMsg(`Access successfully granted to ${simFacility} for ${simDuration === 'visit' ? 'this visit' : simDuration}.`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to grant consent:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const activeConsents = consents.filter(c => c.status === 'active');
  const pastConsents = consents.filter(c => c.status !== 'active');

  return (
    <div className="apollo-dashboard-wrapper">
      <div className="apollo-dashboard-container" style={{ maxWidth: '1080px' }}>
        
        {/* Title Header */}
        <div style={{ marginBottom: '28px' }}>
          <div className="apollo-dash-badge-strip" style={{ marginBottom: '10px' }}>
            <span className="apollo-dash-status-pill">
              <span className="apollo-dash-status-dot" />
              Patient-Controlled Zero-Trust
            </span>
            <span className="apollo-dash-ai-pill">
              <Lock size={13} />
              ABDM & DigiYatra Consent Protocol
            </span>
          </div>
          <h1 className="apollo-dash-title" style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
            Consent & Data Privacy
          </h1>
          <p className="apollo-dash-subtitle">
            Hospitals and clinics only receive the specific health context you approve. You have complete authority to grant, customize, and revoke access at any second.
          </p>
        </div>

        {successMsg && (
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
            <span>{successMsg}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'start' }}>
          
          {/* Left: Active & Past Grants */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#059669" /> Active Hospital Grants ({activeConsents.length})
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Time-bound authorization</span>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B' }}>
                Checking active consents...
              </div>
            ) : activeConsents.length === 0 ? (
              <div className="journey-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
                <Lock size={32} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  No Active Grants
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748B' }}>
                  Your digital health passport is locked. No healthcare facility currently holds active access to your records.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {activeConsents.map(c => (
                  <div key={c.id} className="consent-card-item">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
                            {c.facility_name}
                          </span>
                          <span className="apollo-role-tag active">
                            Active
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={13} /> {c.department || 'Outpatient & Triage'} • Granted {formatDate(c.granted_at)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRevoke(c.id)}
                        disabled={actionLoading}
                        style={{
                          background: '#FFF1F2',
                          color: '#E11D48',
                          border: '1px solid #FECDD3',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <ShieldAlert size={14} /> Revoke Access
                      </button>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                        Shared Information Scopes:
                      </span>
                      <div className="consent-scopes-grid">
                        {(c.scopes || []).map(scope => (
                          <div key={scope} className="consent-scope-pill">
                            <CheckCircle2 size={13} color="#059669" />
                            <span>{scope.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                      <span>Access Duration: <strong>{c.duration === 'visit' ? 'This Hospital Visit' : c.duration}</strong></span>
                      <span>Expires: {c.expires_at ? formatDate(c.expires_at) : 'Auto on Discharge'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Revoked / Past Grants */}
            {pastConsents.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B', marginBottom: '12px' }}>
                  Revoked / Expired Grants ({pastConsents.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pastConsents.slice(0, 3).map(c => (
                    <div key={c.id} style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                    }}>
                      <div>
                        <strong>{c.facility_name}</strong>
                        <span style={{ color: '#94A3B8', marginLeft: '8px' }}>
                          Revoked on {formatDate(c.revoked_at || c.expires_at)}
                        </span>
                      </div>
                      <span className="apollo-role-tag" style={{ background: '#F1F5F9', color: '#64748B' }}>
                        Revoked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Hospital Access Request Simulator */}
          <div>
            <div className="terminal-context-card" style={{ padding: '24px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <PlusCircle size={20} color="#2563EB" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                  Simulate Access Request
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '18px', lineHeight: '1.5' }}>
                Test the DigiYatra consent approval flow. When you arrive at a hospital or clinic, you can approve access with tailored scopes:
              </p>

              <form onSubmit={handleGrantConsent}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Requesting Healthcare Center</label>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.84rem' }}
                    value={simFacility}
                    onChange={(e) => setSimFacility(e.target.value)}
                  >
                    <option value="Indore City General Hospital">Indore City General Hospital</option>
                    <option value="Maharaja Yashwantrao Hospital (MYH Indore)">Maharaja Yashwantrao Hospital (MYH Indore)</option>
                    <option value="CHC Vijay Nagar Health Centre">CHC Vijay Nagar Health Centre</option>
                    <option value="Bombay Hospital Indore">Bombay Hospital Indore</option>
                    <option value="Indore Diagnostics & Imaging Centre">Indore Diagnostics & Imaging Centre</option>
                    <option value="Apollo Pharmacy Indore">Apollo Pharmacy Indore</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Access Duration</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { id: 'visit', label: 'This Visit' },
                      { id: '24h', label: '24 Hours' },
                      { id: '7d', label: '7 Days' },
                    ].map(d => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => setSimDuration(d.id)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: simDuration === d.id ? '1px solid #2563EB' : '1px solid #E2E8F0',
                          background: simDuration === d.id ? '#EFF6FF' : '#FFFFFF',
                          color: simDuration === d.id ? '#1D4ED8' : '#64748B',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Permitted Information</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {[
                      { key: 'basic_profile', label: 'Basic Profile & Blood' },
                      { key: 'allergies', label: 'Allergies & Reactions' },
                      { key: 'medications', label: 'Active Medications' },
                      { key: 'medical_history', label: 'Medical History' },
                      { key: 'vitals', label: 'Wearable Vitals' },
                      { key: 'tests', label: 'Diagnostic Tests' },
                    ].map(s => (
                      <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={simScopes[s.key]}
                          onChange={(e) => setSimScopes({ ...simScopes, [s.key]: e.target.checked })}
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="apollo-dash-btn-primary"
                    style={{ flex: 1, padding: '9px 12px', fontSize: '0.84rem', justifyContent: 'center' }}
                  >
                    <CheckCircle2 size={15} /> Allow Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuccessMsg('Access request rejected. Facility notified.')}
                    className="apollo-dash-btn-secondary"
                    style={{ padding: '9px 12px', fontSize: '0.84rem' }}
                  >
                    Deny
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>

        {/* Bottom: Zero-Trust Audit History */}
        <div style={{ marginTop: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="#6366F1" /> Zero-Trust Access History & Audit Log
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Tamper-evident checkpoint logs</span>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '12px 18px' }}>Timestamp</th>
                  <th style={{ padding: '12px 18px' }}>Facility / Provider</th>
                  <th style={{ padding: '12px 18px' }}>Staff Role</th>
                  <th style={{ padding: '12px 18px' }}>Action Performed</th>
                  <th style={{ padding: '12px 18px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                      No access events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {formatDate(log.timestamp)}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {log.facility_name}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className="apollo-role-tag">
                          {log.staff_role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 500, color: '#059669' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#475569' }}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
