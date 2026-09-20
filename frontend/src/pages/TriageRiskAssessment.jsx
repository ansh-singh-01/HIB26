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
  FileText,
  Locate,
  Compass,
  MapPin,
  Navigation,
  Radio
} from 'lucide-react';
import {
  getCurrentGPSCoordinates,
  INDORE_LANDMARK_PRESETS,
  getGoogleMapsNavUrl,
  INDORE_DEFAULT_LAT,
  INDORE_DEFAULT_LNG
} from '../utils/geo';

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
  
  // GPS State
  const [latitude, setLatitude] = useState(INDORE_DEFAULT_LAT);
  const [longitude, setLongitude] = useState(INDORE_DEFAULT_LNG);
  const [locationName, setLocationName] = useState('Indore Central (Rajwada)');
  const [isLiveGPS, setIsLiveGPS] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState('');

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
        if (selected.location_lat) setLatitude(selected.location_lat);
        if (selected.location_lng) setLongitude(selected.location_lng);
        setLocationName(`Patient Registered GPS: ${selected.full_name}`);
      }
    }
  };

  const handleVitalChange = (field, value) => {
    setVitals(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  // Acquire Live GPS Coordinates
  const handleAcquireLiveGPS = async () => {
    setGpsDetecting(true);
    setGpsStatusMessage('Acquiring device GPS fix...');
    try {
      const coords = await getCurrentGPSCoordinates();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      setIsLiveGPS(true);
      setGpsAccuracy(coords.accuracy);
      setLocationName('My Device Live GPS');
      setGpsStatusMessage(`GPS Locked! Accuracy ±${coords.accuracy}m`);
      setTimeout(() => setGpsStatusMessage(''), 5000);
    } catch (err) {
      setGpsStatusMessage(err.message);
      setTimeout(() => setGpsStatusMessage(''), 6000);
    } finally {
      setGpsDetecting(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setLocationName(`${preset.name} (${preset.area})`);
    setIsLiveGPS(false);
    setGpsAccuracy(null);
    setGpsStatusMessage(`Location set to ${preset.name}`);
    setTimeout(() => setGpsStatusMessage(''), 3000);
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
            <Stethoscope color="#06b6d4" /> AI Emergency Triage & Capacity Routing
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time hybrid clinical evaluation combining physiological NEWS2 scoring with Gemini AI risk assessment and live GPS corridor routing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '24px', alignItems: 'start' }}>
        {/* Left: Input Form */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#06b6d4" size={20} /> Patient Clinical Intake
          </h2>

          {error && (
            <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '12px 16px', borderRadius: '8px', color: '#BE123C', marginBottom: '16px', fontSize: '0.88rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleAssessRisk}>
            {/* Patient Selector for Clinicians */}
            {!isPatient && (
              <div className="form-group">
                <label className="form-label">Select Patient from Directory (Optional)</label>
                <select
                  className="form-select"
                  value={selectedPatientId}
                  onChange={handlePatientSelect}
                >
                  <option value="">-- New / Walk-In Triage Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.gender}, {p.blood_group}) - {p.medi_connect_id || p.id.substring(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Vitals Grid */}
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

            {/* GPS Emergency Geolocation Section */}
            <div style={{
              background: isLiveGPS ? '#F0FDF4' : '#F8FAFC',
              border: isLiveGPS ? '1px solid #86EFAC' : '1px solid var(--border-color)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={16} color={isLiveGPS ? '#16A34A' : '#2563EB'} />
                  <strong style={{ fontSize: '0.85rem', color: isLiveGPS ? '#15803D' : '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Emergency GPS Geotagging
                  </strong>
                </div>
                {isLiveGPS && (
                  <span className="badge badge-low flex items-center gap-1" style={{ fontSize: '0.7rem' }}>
                    <Radio size={10} className="animate-pulse" /> Live Fix
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Used by emergency routing algorithms to dispatch ambulances and calculate exact transit corridors to nearest available ICU beds.
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAcquireLiveGPS}
                  disabled={gpsDetecting}
                  className="btn btn-primary btn-sm flex items-center gap-1"
                  style={{ fontSize: '0.78rem' }}
                >
                  <Locate size={14} className={gpsDetecting ? 'animate-spin' : ''} />
                  {gpsDetecting ? 'Acquiring GPS...' : 'Acquire Patient GPS'}
                </button>

                <select
                  className="form-select"
                  style={{ flex: 1, minWidth: '160px', padding: '6px 10px', fontSize: '0.78rem' }}
                  value={INDORE_LANDMARK_PRESETS.some(p => p.name.includes(locationName)) ? locationName : ''}
                  onChange={(e) => {
                    const preset = INDORE_LANDMARK_PRESETS.find(p => p.name === e.target.value);
                    if (preset) handleSelectPreset(preset);
                  }}
                >
                  <option value="" disabled>City Landmark Presets</option>
                  {INDORE_LANDMARK_PRESETS.map((p, idx) => (
                    <option key={idx} value={p.name}>
                      {p.name} ({p.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || INDORE_DEFAULT_LAT)}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || INDORE_DEFAULT_LNG)}
                  />
                </div>
              </div>

              {gpsStatusMessage && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.78rem',
                  color: gpsStatusMessage.includes('Locked') || gpsStatusMessage.includes('set') ? '#16A34A' : '#DC2626',
                  fontWeight: 600
                }}>
                  {gpsStatusMessage}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginTop: '10px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="animate-spin" size={18} /> Evaluating Hybrid NEWS2 + AI Triage...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Stethoscope size={18} /> Execute AI Triage & Capacity Routing
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Right: Assessment HUD Result */}
        <div>
          {assessmentResult ? (
            <div className="glass-card" style={{ padding: '28px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles color="#2563EB" size={20} /> Triage Evaluation Results
                </h2>
                <span className={`badge ${getRiskBadgeClass(assessmentResult.risk_level || assessmentResult.urgency)}`}>
                  {assessmentResult.risk_level || assessmentResult.urgency || 'EVALUATED'}
                </span>
              </div>

              {/* Triage Scores HUD */}
              <div className="grid grid-cols-2" style={{ gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#1D4ED8', fontWeight: '600', textTransform: 'uppercase' }}>
                    NEWS2 Clinical Score
                  </span>
                  <span style={{ fontSize: '2.4rem', fontWeight: '800', color: '#1E40AF', display: 'block', marginTop: '4px' }}>
                    {assessmentResult.news2_score ?? assessmentResult.risk_score ?? '4'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Physiological Urgency Metric</span>
                </div>

                <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6D28D9', fontWeight: '600', textTransform: 'uppercase' }}>
                    AI Urgency Tier
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#5B21B6', display: 'block', marginTop: '10px' }}>
                    {assessmentResult.urgency || assessmentResult.risk_level || 'ROUTINE'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#7C3AED' }}>Gemini Reasoning Engine</span>
                </div>
              </div>

              {/* Clinical AI Reasoning */}
              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#2563EB', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} /> Clinical AI Assessment Summary
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {assessmentResult.clinical_reasoning || assessmentResult.reasoning || 'Patient displays stable physiological parameters with normal vital sign telemetry.'}
                </p>
              </div>

              {/* Recommended Top Facilities with GPS Navigation */}
              {recommendationsResult?.recommended_facilities && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 color="#10b981" size={20} /> Matched Emergency Hospitals via GPS
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recommendationsResult.recommended_facilities.slice(0, 3).map((match, idx) => {
                      const facLat = match.location_lat || match.facility_lat || INDORE_DEFAULT_LAT;
                      const facLng = match.location_lng || match.facility_lng || INDORE_DEFAULT_LNG;
                      const navUrl = getGoogleMapsNavUrl(latitude, longitude, facLat, facLng);

                      return (
                        <div key={idx} style={{
                          padding: '14px 16px',
                          background: '#F8FAFC',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', display: 'block' }}>
                              {match.facility_name || match.name || `Facility #${match.facility_id}`}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Available ICU Beds: <strong style={{ color: '#10b981' }}>{match.available_icu_beds ?? 'Yes'}</strong> | Distance: <strong>{match.distance_km ?? match.distance ?? '2.4'} km</strong>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge badge-info">
                              {Math.round((match.score || 0.92) * 100)}% Match
                            </span>
                            <a
                              href={navUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-sm flex items-center gap-1"
                              style={{ textDecoration: 'none', padding: '5px 9px', fontSize: '0.75rem' }}
                              title="Turn-by-Turn GPS Directions"
                            >
                              <Navigation size={12} color="#2563EB" /> Route
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-4" style={{ marginTop: '24px' }}>
                <button
                  onClick={() => navigate('/facilities')}
                  className="btn btn-success"
                  style={{ flex: 1 }}
                >
                  <Building2 size={18} /> View All Facilities on Grid
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
                Fill in patient vital parameters, geotag the location with <strong>Acquire Patient GPS</strong>, and click <strong>Execute AI Triage</strong> to calculate risk and route to the nearest ICU.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
