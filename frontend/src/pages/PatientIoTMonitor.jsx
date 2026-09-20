import React, { useState, useEffect } from 'react';
import { iotService } from '../services/api';
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  Radio,
  Zap,
  Navigation,
  Building2,
  PhoneCall,
  Sparkles
} from 'lucide-react';

export const PatientIoTMonitor = () => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState('ONLINE');
  const [vitals, setVitals] = useState({
    heart_rate: 72,
    spo2: 98,
    blood_pressure_sys: 120,
    blood_pressure_dia: 80,
    body_temp_c: 36.8,
  });

  const [loading, setLoading] = useState(false);
  const [telemetryResponse, setTelemetryResponse] = useState(null);

  // Send telemetry stream to backend
  const pushTelemetry = async (overrideVitals = null) => {
    const currentVitals = overrideVitals || vitals;
    setLoading(true);
    try {
      const res = await iotService.sendTelemetry({
        wearable_device_id: 'SMART-WATCH-PRO-99',
        heart_rate: currentVitals.heart_rate,
        spo2: currentVitals.spo2,
        blood_pressure_sys: currentVitals.blood_pressure_sys,
        blood_pressure_dia: currentVitals.blood_pressure_dia,
        body_temp_c: currentVitals.body_temp_c,
        location_lat: 22.7196,
        location_lng: 75.8577,
      });
      setTelemetryResponse(res);
    } catch (err) {
      console.error('Error sending IoT telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial telemetry push
    pushTelemetry();
  }, []);

  const handleSimulateNormal = () => {
    const normal = {
      heart_rate: 74,
      spo2: 98,
      blood_pressure_sys: 118,
      blood_pressure_dia: 78,
      body_temp_c: 36.9,
    };
    setVitals(normal);
    pushTelemetry(normal);
  };

  return (
    <div className="container">
      {/* Header Banner */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', items: 'center', gap: '10px' }}>
            <Radio color="#06b6d4" /> IoT Wearable Telemetry
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Continuous real-time biosensor telemetry stream. Vital signs are monitored and evaluated by the clinical triage engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-info flex items-center gap-1">
            <Radio size={14} className="animate-pulse" /> Sensor ID: #IOT-PRO-9942
          </span>
          <span className="badge badge-low">
            Status: {deviceStatus}
          </span>
        </div>
      </div>

      {/* Live Stream Status Bar */}
      <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio size={18} color="#2563EB" className="animate-pulse" />
          <div>
            <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)', display: 'block' }}>
              Wearable Biosensor Stream: Connected & Transmitting
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Continuous vital sign telemetry evaluated automatically by clinical triage engine
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSimulateNormal} className="btn btn-secondary btn-sm">
            <CheckCircle2 size={16} color="#10b981" /> Sync Resting Vitals
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Left Telemetry HUD Card */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#2563EB" size={20} /> Live Sensor Pulse HUD
          </h2>

          <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '24px' }}>
            {/* Heart Rate Meter */}
            <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '20px', borderRadius: '14px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#BE123C', fontWeight: '600' }}>Heart Rate</span>
                <Heart size={20} color="#E11D48" className="animate-pulse" />
              </div>
              <span style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {vitals.heart_rate} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>BPM</span>
              </span>
            </div>

            {/* Oxygen Saturation Meter */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '20px', borderRadius: '14px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#1D4ED8', fontWeight: '600' }}>Oxygen Saturation</span>
                <Wind size={20} color="#2563EB" />
              </div>
              <span style={{ fontSize: '2.4rem', fontWeight: '800', color: vitals.spo2 < 90 ? '#DC2626' : '#2563EB' }}>
                {vitals.spo2}% <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>SpO2</span>
              </span>
            </div>

            {/* Blood Pressure Meter */}
            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '20px', borderRadius: '14px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6D28D9', fontWeight: '600' }}>Blood Pressure</span>
                <Activity size={20} color="#7C3AED" />
              </div>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: vitals.blood_pressure_sys < 90 ? '#DC2626' : 'var(--text-main)' }}>
                {intOr(vitals.blood_pressure_sys)}/{intOr(vitals.blood_pressure_dia)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>mmHg</span>
              </span>
            </div>

            {/* Body Temperature */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '20px', borderRadius: '14px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#B45309', fontWeight: '600' }}>Body Temp</span>
                <Thermometer size={20} color="#D97706" />
              </div>
              <span style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {vitals.body_temp_c}°C
              </span>
            </div>
          </div>

          <button onClick={() => pushTelemetry()} disabled={loading} className="btn btn-outline" style={{ width: '100%' }}>
            <Zap size={16} /> Sync Latest Telemetry Signal
          </button>
        </div>

        {/* Right Output Emergency Dispatch Response */}
        <div>
          {telemetryResponse ? (
            <div className="glass-card" style={{
              padding: '28px',
              borderLeft: telemetryResponse.emergency_triggered ? '4px solid #e11d48' : '4px solid #10b981'
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Backend Telemetry Processor Status
                </span>
                {telemetryResponse.emergency_triggered ? (
                  <span className="badge badge-critical flex items-center gap-1">
                    <ShieldAlert size={14} /> EMERGENCY SOS DISPATCHED
                  </span>
                ) : (
                  <span className="badge badge-low flex items-center gap-1">
                    <CheckCircle2 size={14} /> VITALS NOMINAL
                  </span>
                )}
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>AI Triage Score</span>
                  <span className="badge badge-info">NEWS2 Score: {telemetryResponse.news_score}</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Risk Classification: <strong style={{ color: telemetryResponse.emergency_triggered ? '#DC2626' : '#059669' }}>{telemetryResponse.risk_level}</strong>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  {telemetryResponse.ai_reasoning}
                </p>
              </div>

              {/* Matched Nearest Emergency Hospital */}
              {telemetryResponse.matched_facility && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#2563EB', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '10px', letterSpacing: '0.04em' }}>
                    Auto-Matched Emergency Trauma Hospital
                  </span>
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '16px', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 color="#2563EB" size={20} /> {telemetryResponse.matched_facility.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      {telemetryResponse.matched_facility.address} | Available ICU Beds: <strong style={{ color: '#059669' }}>{telemetryResponse.matched_facility.available_icu_beds}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Turn-by-turn Navigation */}
              {telemetryResponse.navigation && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.92rem', color: '#2563EB', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Navigation size={16} /> GPS Turn-by-Turn Transit Directions (ETA: {telemetryResponse.navigation.estimated_travel_minutes} mins)
                  </h4>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6' }}>
                    {telemetryResponse.navigation.turn_by_turn.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {telemetryResponse.emergency_triggered && (
                <a
                  href={`tel:${telemetryResponse.navigation?.emergency_hotline || '108'}`}
                  className="btn btn-danger btn-lg"
                  style={{ width: '100%', textDecoration: 'none' }}
                >
                  <PhoneCall size={20} /> One-Touch SOS Emergency Call Hotline (108 / 112)
                </a>

              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading IoT telemetry telemetry response...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const intOr = (val) => Math.round(val || 0);
