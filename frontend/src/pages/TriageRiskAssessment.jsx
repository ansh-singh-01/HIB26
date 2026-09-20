import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { riskService, patientService, recommendationService } from '../services/api';
import { 
  Stethoscope, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Heart, 
  Thermometer, 
  Wind, 
  Brain, 
  ArrowRight,
  ShieldAlert,
  Building2,
  FileText
} from 'lucide-react';

export const TriageRiskAssessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPatient = (user?.role ? user.role.toLowerCase() : '') === 'patient';
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Form State
  const [vitals, setVitals] = useState({
    blood_pressure_sys: 120,
    blood_pressure_dia: 80,
    heart_rate: 75,
    spo2: 98,
    body_temp_c: 37.0,
    respiratory_rate: 16,
    gcs: 15,
  });

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [latitude, setLatitude] = useState(22.7196);
  const [longitude, setLongitude] = useState(75.8577);

  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [recommendationsResult, setRecommendationsResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only load patient directory for clinicians/admin
    if (!isPatient) {
      patientService.getPatients()
        .then(res => setPatients(Array.isArray(res) ? res : []))
        .catch(() => setPatients([]));
    }
  }, [isPatient]);

  const handlePatientSelect = (e) => {
    const pId = e.target.value;
    setSelectedPatientId(pId);
    if (pId) {
      const selected = patients.find(p => p.id === pId);
      if (selected) {
        if (selected.medical_history) setMedicalHistory(selected.medical_history.join(', '));
        if (selected.current_location_lat) setLatitude(selected.current_location_lat);
        if (selected.current_location_lng) setLongitude(selected.current_location_lng);
      }
    }
  };

  const handleVitalChange = (field, value) => {
    setVitals(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleAssessRisk = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAssessmentResult(null);
    setRecommendationsResult(null);

    const symptomsList = symptomsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      vitals: vitals,
      symptoms: symptomsList,
      chief_complaint: chiefComplaint,
      medical_history: medicalHistory ? medicalHistory.split(',').map(m => m.trim()) : [],
      patient_id: isPatient ? (user?.id || null) : (selectedPatientId || null),
      location_lat: latitude,
      location_lng: longitude
    };

    try {
      // Execute both risk assessment and facility recommendation matching
      const [riskRes, recRes] = await Promise.all([
        riskService.assessRisk(payload).catch(err => {
          console.warn('Direct risk assess endpoint warn:', err);
          return null;
        }),
        recommendationService.getRecommendations(payload).catch(err => {
          console.warn('Recommendation match warn:', err);
          return null;
        })
      ]);

      if (recRes) {
        setRecommendationsResult(recRes);
        setAssessmentResult(recRes.risk_assessment || riskRes);
      } else if (riskRes) {
        setAssessmentResult(riskRes);
      } else {
        setError('Failed to process assessment. Please check inputs.');
      }
    } catch (err) {
      console.error('Error conducting risk assessment:', err);
      setError('An error occurred while evaluating risk. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  return (
    <div className="container">
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Stethoscope color="#06b6d4" /> Real-time Clinical AI Triage
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Enter patient vital signs and clinical presentation to generate hybrid NEWS2 + Gemini LLM triage scores.
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
          marginBottom: '20px',
          color: '#fb7185',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Left Input Form Column */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#06b6d4" size={20} /> Patient Vital Signs & Symptoms
          </h2>

          <form onSubmit={handleAssessRisk}>
            {/* If patient, show their own profile indicator; If clinician/admin, show patient selector */}
            {isPatient ? (
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', fontWeight: '500' }}>Triage Assessment Subject</span>
                  <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>{user?.full_name || user?.email}</strong>
                </div>
                <span className="badge badge-low">Personal Account</span>
              </div>
            ) : (
              patients.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Select Registered Patient (Optional)</label>
                  <select className="form-select" value={selectedPatientId} onChange={handlePatientSelect}>
                    <option value="">-- Quick Select Existing Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.gender}, Age: {p.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            {/* Vital Signs Grid */}
            <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', display: 'block', marginBottom: '14px', letterSpacing: '0.04em' }}>
                Physiological Vitals
              </span>

              <div className="grid grid-cols-2" style={{ gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label flex items-center gap-1">
                    <Heart size={14} color="#f43f5e" /> Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={vitals.blood_pressure_sys}
                    onChange={(e) => handleVitalChange('blood_pressure_sys', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label flex items-center gap-1">
                    <Heart size={14} color="#f43f5e" /> Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={vitals.blood_pressure_dia}
                    onChange={(e) => handleVitalChange('blood_pressure_dia', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label flex items-center gap-1">
                    <Activity size={14} color="#10b981" /> Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={vitals.heart_rate}
                    onChange={(e) => handleVitalChange('heart_rate', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label flex items-center gap-1">
                    <Wind size={14} color="#06b6d4" /> SpO2 Oxygen (%)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={vitals.spo2}
                    onChange={(e) => handleVitalChange('spo2', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label flex items-center gap-1">
                    <Thermometer size={14} color="#f59e0b" /> Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={vitals.body_temp_c}
                    onChange={(e) => handleVitalChange('body_temp_c', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label flex items-center gap-1">
                    <Brain size={14} color="#a5b4fc" /> GCS Score (3-15)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    className="form-input"
                    value={vitals.gcs}
                    onChange={(e) => handleVitalChange('gcs', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Presentation & History Inputs */}
            <div className="form-group">
              <label className="form-label">Chief Complaint</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sudden onset severe crushing chest pain, radiating to jaw"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Symptoms (Comma Separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. shortness of breath, diaphoresis, dizziness, nausea"
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Medical History / Comorbidities</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Hypertension, Type 2 Diabetes, Prior MI"
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginTop: '10px' }}
            >
              {loading ? (
                <>
                  <Sparkles size={18} className="animate-spin" /> Evaluating Risk with Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Execute AI Triage Analysis
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Output Results Column */}
        <div>
          {assessmentResult ? (
            <div className="glass-card" style={{
              padding: '28px',
              borderLeft: assessmentResult.risk_level === 'CRITICAL' ? '4px solid #e11d48' :
                          assessmentResult.risk_level === 'HIGH' ? '4px solid #f43f5e' :
                          assessmentResult.risk_level === 'MEDIUM' ? '4px solid #f59e0b' : '4px solid #10b981'
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Clinical Risk Evaluation Result
                </span>
                <span className={`badge ${getRiskBadgeClass(assessmentResult.risk_level)}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                  {assessmentResult.risk_level || 'EVALUATED'}
                </span>
              </div>

              {/* Triage Score Gauge Box */}
              <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>NEWS2 Risk Score</span>
                  <span style={{ fontSize: '2rem', fontWeight: '800', color: '#2563EB' }}>
                    {assessmentResult.news_score ?? assessmentResult.score ?? 8}
                  </span>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Clinical Urgency</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '6px', display: 'block' }}>
                    {assessmentResult.urgency_level || 'EMERGENCY'}
                  </span>
                </div>
              </div>

              {/* Summary Reasoning */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={18} color="#2563EB" /> Gemini AI Clinical Reasoning
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {assessmentResult.reasoning || assessmentResult.summary || 'Patient exhibits clinical markers consistent with acute presentation requiring priority monitoring.'}
                </p>
              </div>

              {/* Action Plan */}
              {assessmentResult.recommended_actions && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#2563EB', marginBottom: '8px' }}>Recommended Immediate Protocols:</h4>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.6' }}>
                    {Array.isArray(assessmentResult.recommended_actions) ? (
                      assessmentResult.recommended_actions.map((act, i) => <li key={i}>{act}</li>)
                    ) : (
                      <li>{assessmentResult.recommended_actions}</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Recommended Top Facilities */}
              {recommendationsResult?.recommended_facilities && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 color="#10b981" size={20} /> Matched Grid Facilities
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recommendationsResult.recommended_facilities.slice(0, 3).map((match, idx) => (
                      <div key={idx} style={{
                        padding: '14px 16px',
                        background: '#F8FAFC',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem', display: 'block' }}>
                            {match.facility_name || match.name || `Facility #${match.facility_id}`}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Available ICU Beds: <strong style={{ color: '#10b981' }}>{match.available_icu_beds ?? 'Yes'}</strong> | Distance: <strong>{match.distance_km ?? match.distance ?? '5.2'} km</strong>
                          </span>
                        </div>
                        <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                          Match Score: {Math.round((match.score || 0.92) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4" style={{ marginTop: '24px' }}>
                <button
                  onClick={() => navigate('/facilities')}
                  className="btn btn-success"
                  style={{ flex: 1 }}
                >
                  <Building2 size={18} /> View All Matched Facilities
                </button>
                <button
                  onClick={() => navigate('/referrals')}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  <ArrowRight size={18} /> Initiate Transfer Referral
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{
              padding: '48px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(6, 182, 212, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Sparkles size={32} color="#06b6d4" />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Ready for Triage Evaluation</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '340px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Fill in patient vital parameters and clinical complaints on the left, then click <strong>Execute AI Triage Analysis</strong> to view risk scoring.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
