import React, { useState } from 'react';
import { iotService } from '../services/api';
import { 
  Heart, 
  MapPin, 
  PhoneCall, 
  Stethoscope, 
  FileText, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert,
  Building2,
  Navigation
} from 'lucide-react';

export const PatientCarePath = () => {
  const [symptomText, setSymptomText] = useState('');
  const [symptomListInput, setSymptomListInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [carePathResult, setCarePathResult] = useState(null);

  const handleReportSymptoms = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const symptoms = symptomListInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await iotService.reportSymptoms({
        chief_complaint: symptomText,
        symptoms: symptoms,
      });
      setCarePathResult(res);
    } catch (err) {
      console.error('Failed to report symptoms:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '960px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', items: 'center', gap: '10px' }}>
          <Heart color="#f43f5e" /> Patient Personal Health Portal & Care Path
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          View your suggested clinical care path, report self-symptoms, and access turn-by-turn GPS emergency routing.
        </p>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '24px', alignItems: 'start' }}>
        {/* Left Symptom Self-Logger */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '18px', display: 'flex', items: 'center', gap: '8px' }}>
            <Stethoscope color="#06b6d4" size={20} /> Log Symptoms & Feel Unwell
          </h2>

          <form onSubmit={handleReportSymptoms}>
            <div className="form-group">
              <label className="form-label">How are you feeling right now?</label>
              <textarea
                required
                rows="3"
                className="form-textarea"
                placeholder="e.g. Experiencing mild shortness of breath and dizziness after walking..."
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Key Symptoms (Comma Separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="shortness of breath, dizziness, fatigue"
                value={symptomListInput}
                onChange={(e) => setSymptomListInput(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              <Send size={16} /> {loading ? 'Analyzing Care Path...' : 'Submit & Get Suggested Care Path'}
            </button>
          </form>
        </div>

        {/* Right Care Path Navigator */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '18px', display: 'flex', items: 'center', gap: '8px' }}>
            <Sparkles color="#10b981" size={20} /> Suggested Care Path & Navigation
          </h2>

          {carePathResult ? (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Assessed Risk Level</span>
                <span className={`badge ${carePathResult.risk_level === 'HIGH' ? 'badge-high' : 'badge-low'}`}>
                  {carePathResult.risk_level}
                </span>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#2563EB', marginBottom: '6px' }}>Clinical Assessment Summary:</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  {carePathResult.reasoning}
                </p>
              </div>

              {carePathResult.suggested_care_path && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#059669', marginBottom: '8px' }}>Recommended Care Actions:</h4>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                    {carePathResult.suggested_care_path.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <div className="flex items-center gap-3" style={{ marginBottom: '12px' }}>
                <Building2 color="#2563EB" size={22} />
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>Assigned Nearest Facility</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Indore City General Hospital (2.4 km away)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Navigation color="#059669" size={20} />
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Transit ETA: <strong>6 minutes</strong></span>
                </div>
              </div>
            </div>
          )}

          <a href="tel:108" className="btn btn-danger" style={{ width: '100%', textDecoration: 'none' }}>
            <PhoneCall size={18} /> Immediate Emergency SOS Hotline (108 / 112)
          </a>

        </div>
      </div>
    </div>
  );
};
