import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Hospital, 
  Radio, 
  Stethoscope, 
  ShieldCheck, 
  Heart, 
  Building2, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Award, 
  ExternalLink,
  PhoneCall,
  Zap,
  Users,
  BarChart3,
  Layers,
  FileText
} from 'lucide-react';
import { ApolloNavbar } from '../components/ApolloNavbar';
import '../styles/LandingPage.css';


export const LandingPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Tab 1: Interactive Triage State
  const [selectedSymptoms, setSelectedSymptoms] = useState(['chest_pain', 'shortness_of_breath']);
  const [spo2, setSpo2] = useState(88);
  const [heartRate, setHeartRate] = useState(115);

  // Tab 2: Facility Matcher State
  const [selectedFacility, setSelectedFacility] = useState(1);
  const [matched, setMatched] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const toggleSymptom = (symId) => {
    if (selectedSymptoms.includes(symId)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symId));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symId]);
    }
  };

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      navigate(`/register?email=${encodeURIComponent(email)}`);
    } else {
      navigate('/register');
    }
  };

  // Dynamic Triage Calculation
  const isEmergency = spo2 < 90 || (selectedSymptoms.includes('chest_pain') && selectedSymptoms.includes('shortness_of_breath')) || heartRate > 120;
  const isUrgent = !isEmergency && (selectedSymptoms.length >= 2 || spo2 < 95 || heartRate > 100);
  const urgencyLevel = isEmergency ? 'emergency' : isUrgent ? 'urgent' : 'routine';
  const riskScore = isEmergency ? Math.min(98, 85 + (100 - spo2)) : isUrgent ? 68 : 28;


  const facilities = [
    {
      id: 1,
      name: 'Metro Trauma & Medical Center',
      type: 'Level 1 Trauma • 2.4 km away',
      icuBeds: 6,
      totalIcu: 24,
      genBeds: 34,
      totalGen: 120,
      eta: '8 mins',
      recommended: true
    },
    {
      id: 2,
      name: 'St. Jude Regional Healthcare',
      type: 'Tertiary Hospital • 4.8 km away',
      icuBeds: 2,
      totalIcu: 18,
      genBeds: 18,
      totalGen: 90,
      eta: '14 mins',
      recommended: false
    },
    {
      id: 3,
      name: 'Highland Specialty Clinic',
      type: 'Urgent Care Center • 7.1 km away',
      icuBeds: 0,
      totalIcu: 8,
      genBeds: 22,
      totalGen: 45,
      eta: '22 mins',
      recommended: false
    }
  ];

  const faqs = [
    {
      q: 'How does MediConnect ensure patient safety with AI triage?',
      a: 'MediConnect employs a dual-layer safety architecture. Critical physiologic rule thresholds (such as SpO2 < 90%, extreme tachycardia, or acute chest trauma) immediately trigger hard-coded clinical emergency overrides. Secondary non-critical assessments utilize fine-tuned clinical LLMs (Gemini 1.5) with transparent rationale explanations.'
    },
    {
      q: 'Does MediConnect integrate with our hospital existing EHR system?',
      a: 'Yes. MediConnect natively supports HL7 FHIR standards, Epic Systems, Cerner/Oracle Health, and custom REST/WebSocket feeds. Data bidirectional synchronization ensures referrals and vitals automatically link with patient master indexes.'
    },
    {
      q: 'How does the dynamic hospital bed routing work in real time?',
      a: 'Hospitals broadcast live capacity updates for ICU, general wards, ventilators, and emergency bays via our lightweight API or automated dispatch HUD. When an incoming triage assessment matches acuity criteria, the algorithm scores facilities based on real-time transit distance, bed availability, and specialty capability.'
    },
    {
      q: 'What wearable devices and IoT telemetry sensors are supported?',
      a: 'We support Bluetooth LE (BLE), cellular IoT monitors, smartwatch health telemetry, and standard clinical bedside monitors via MQTT and WebSockets. Telemetry feeds track SpO2, heart rate, non-invasive blood pressure, and core body temperature.'
    },
    {
      q: 'Is MediConnect HIPAA and SOC2 Type II compliant?',
      a: 'Absolutely. All patient identifiable data is encrypted at rest using AES-256 and in transit via TLS 1.3. We enforce strict role-based access controls (RBAC) across Patients, Triage Nurses, Doctors, and Hospital Admins, complete with immutable audit logs.'
    },
    {
      q: 'Can regional health authorities deploy MediConnect across multiple independent clinics?',
      a: 'Yes. MediConnect is designed from the ground up for multi-facility health grids, permitting independent hospitals, rural satellite clinics, and emergency ambulance fleets to federate on a single coordinated grid.'
    }
  ];

  return (
    <div className="apollo-landing">
      {/* ===================================================================
          0. Promotional Announcement Strip (Kindsight Style)
          =================================================================== */}
      <div className="kindsight-top-strip">
        <span className="kindsight-strip-badge">2026 Grid Release</span>
        <span>Regional AI triage telemetry & real-time bed coordination is now operational.</span>
      </div>

      {/* ===================================================================
          1. Sticky Navigation Bar (Kindsight Editorial Style)
          =================================================================== */}
      <ApolloNavbar currentPage="landing" />


      {/* ===================================================================
          2. Hero Section (Deep Olive Grove at Dusk)
          =================================================================== */}
      <section className="apollo-hero">
        <div className="apollo-container">
          <div className="apollo-hero-pill">
            <span className="apollo-pulse-dot"></span>
            <span>AI CLINICAL TRIAGE & RESOURCE ROUTING</span>
          </div>

          <h1 className="apollo-hero-title">
            Healthcare intelligence that accelerates <span className="highlight">triage</span> & bed allocation
          </h1>

          <p className="apollo-hero-subtitle">
            Turn hours of emergency bottlenecks into seconds. Connect real-time patient telemetry with predictive AI triage, verified clinical safety overrides, and dynamic hospital bed routing.
          </p>

          <form onSubmit={handleHeroSubmit} className="apollo-hero-actions">
            <div className="apollo-input-group">
              <input
                type="email"
                placeholder="Enter your clinical or hospital email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="apollo-hero-input"
                required
              />
              <button type="submit" className="apollo-hero-submit">
                Sign Up <ArrowRight size={16} />
              </button>
            </div>

            <div className="apollo-oauth-group">
              <Link to="/login" className="apollo-oauth-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </Link>
              <Link to="/login" className="apollo-oauth-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.68-1.26z"/>
                </svg>
                Sign in with Apple
              </Link>
            </div>

            <div className="apollo-trust-checks">
              <span><CheckCircle2 size={15} color="#e1f079" /> Free for research clinics</span>
              <span><CheckCircle2 size={15} color="#e1f079" /> No credit card required</span>
              <span><CheckCircle2 size={15} color="#e1f079" /> 99.4% triage accuracy</span>
            </div>
          </form>

          {/* Overlapping Hero Product Mockup with Kindsight Score Circle & Alert Badge */}
          <div className="kindsight-hero-mockup-wrap">
            <div className="kindsight-hero-mockup">
              <div className="kindsight-score-circle-box">
                <div className="kindsight-score-circle">
                  <svg width="110" height="110">
                    <circle cx="55" cy="55" r="42" stroke="#e5e1d6" strokeWidth="8" fill="none" />
                    <circle cx="55" cy="55" r="42" stroke="#e1f079" strokeWidth="8" fill="none"
                      strokeDasharray="263.8" strokeDashoffset="26" strokeLinecap="round" />
                  </svg>
                  <span className="kindsight-score-number">98%</span>
                </div>
                <span className="kindsight-score-label">Clinical Triage Precision</span>
              </div>

              <div className="kindsight-alert-card">
                <div className="kindsight-alert-header">
                  <span className="kindsight-alert-tag">DISPATCH ALERT</span>
                  <span className="kindsight-alert-dot"></span>
                </div>
                <div className="kindsight-alert-title">Metro Trauma Center</div>
                <div className="kindsight-alert-detail">6 ICU Beds Reserved • 8m transit ETA</div>
              </div>

              <div className="kindsight-mini-telemetry">
                <div className="kindsight-telemetry-row">
                  <span>Heart Rate:</span>
                  <span className="kindsight-telemetry-val">74 BPM</span>
                </div>
                <div className="kindsight-telemetry-row">
                  <span>SpO2 Sensor:</span>
                  <span className="kindsight-telemetry-val" style={{ color: '#355e3b' }}>98.6%</span>
                </div>
                <div className="kindsight-telemetry-row">
                  <span>Override:</span>
                  <span className="kindsight-telemetry-val" style={{ color: '#de7653' }}>Priority 1 Alert</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          Logo Trust Bar (Kindsight Monochromatic Style)
          =================================================================== */}
      <section className="kindsight-trust-bar">
        <div className="apollo-container">
          <h3 className="kindsight-trust-title">Driving these missions forward</h3>
          <div className="kindsight-logos-row">
            <div className="kindsight-logo-item"><Hospital size={20} /> Johns Hopkins Medicine</div>
            <div className="kindsight-logo-item"><Building2 size={20} /> Mayo Clinic Network</div>
            <div className="kindsight-logo-item"><Activity size={20} /> Apollo Health City</div>
            <div className="kindsight-logo-item"><ShieldCheck size={20} /> NHS Emergency Grid</div>
            <div className="kindsight-logo-item"><Stethoscope size={20} /> Stanford Clinical AI</div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. The Signature 4-Tab Product Sandbox (Apollo Showpiece)
          =================================================================== */}
      <section id="product-sandbox" className="apollo-sandbox-section">
        <div className="apollo-container">
          <div className="apollo-sandbox-card">
            {/* Tabs Header */}
            <div className="apollo-sandbox-tabs">
              <button
                className={`apollo-tab-btn ${activeTab === 0 ? 'active' : ''}`}
                onClick={() => setActiveTab(0)}
              >
                <div className="apollo-tab-kicker">
                  <Stethoscope size={13} /> 01 / CLINICAL TRIAGE
                </div>
                <div className="apollo-tab-title">AI Symptoms & Risk Engine</div>
              </button>

              <button
                className={`apollo-tab-btn ${activeTab === 1 ? 'active' : ''}`}
                onClick={() => setActiveTab(1)}
              >
                <div className="apollo-tab-kicker">
                  <Hospital size={13} /> 02 / BED ROUTING
                </div>
                <div className="apollo-tab-title">Hospital Resource Grid</div>
              </button>

              <button
                className={`apollo-tab-btn ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                <div className="apollo-tab-kicker">
                  <Radio size={13} /> 03 / IOT VITALS
                </div>
                <div className="apollo-tab-title">Live Telemetry Monitor</div>
              </button>

              <button
                className={`apollo-tab-btn ${activeTab === 3 ? 'active' : ''}`}
                onClick={() => setActiveTab(3)}
              >
                <div className="apollo-tab-kicker">
                  <Layers size={13} /> 04 / CARE PATHWAY
                </div>
                <div className="apollo-tab-title">Doctor & SOAP Notes</div>
              </button>
            </div>

            {/* Sandbox Body Content */}
            <div className="apollo-sandbox-body">
              {/* TAB 1: AI Clinical Triage Sandbox */}
              {activeTab === 0 && (
                <div className="apollo-triage-demo">
                  <div className="apollo-triage-left">
                    <div className="apollo-panel-header">
                      <h4 className="apollo-panel-title">Interactive Symptom & Vital Input</h4>
                      <span className="apollo-status-pill">
                        <Sparkles size={13} /> Live Rule Engine + Gemini AI
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
                      Click symptoms to observe real-time AI risk evaluation and emergency overrides:
                    </p>

                    <div className="apollo-symptom-cloud">
                      {[
                        { id: 'chest_pain', label: 'Severe Chest Pressure' },
                        { id: 'shortness_of_breath', label: 'Shortness of Breath' },
                        { id: 'high_fever', label: 'High Fever (39.5°C)' },
                        { id: 'dizziness', label: 'Sudden Dizziness' },
                        { id: 'headache', label: 'Persistent Migraine' },
                        { id: 'fatigue', label: 'Chronic Fatigue' },
                        { id: 'cough', label: 'Dry Cough' },
                      ].map((sym) => (
                        <button
                          key={sym.id}
                          className={`apollo-symptom-tag ${selectedSymptoms.includes(sym.id) ? 'active' : ''}`}
                          onClick={() => toggleSymptom(sym.id)}
                        >
                          {selectedSymptoms.includes(sym.id) && <CheckCircle2 size={14} />}
                          {sym.label}
                        </button>
                      ))}
                    </div>

                    <div className="apollo-vitals-sliders">
                      <div className="apollo-slider-row">
                        <div className="apollo-slider-label">
                          <span>Blood Oxygen Saturation (SpO2)</span>
                          <span style={{ color: spo2 < 90 ? '#DC2626' : '#10B981', fontFamily: 'var(--font-mono)' }}>
                            {spo2}% {spo2 < 90 && '(CRITICAL)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="80"
                          max="100"
                          value={spo2}
                          onChange={(e) => setSpo2(Number(e.target.value))}
                          className="apollo-range-slider"
                        />
                      </div>

                      <div className="apollo-slider-row">
                        <div className="apollo-slider-label">
                          <span>Heart Rate (Pulse)</span>
                          <span style={{ color: heartRate > 120 ? '#DC2626' : '#0F172A', fontFamily: 'var(--font-mono)' }}>
                            {heartRate} BPM
                          </span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="160"
                          value={heartRate}
                          onChange={(e) => setHeartRate(Number(e.target.value))}
                          className="apollo-range-slider"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Real-time Triage Output */}
                  <div className="apollo-triage-result">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>
                        Automated Triage Output
                      </span>
                      <span className={`apollo-urgency-badge apollo-urgency-${urgencyLevel}`}>
                        {urgencyLevel}
                      </span>
                    </div>

                    <div className="apollo-risk-score-display">
                      <span className="apollo-risk-number" style={{ color: isEmergency ? '#DC2626' : isUrgent ? '#D97706' : '#15803D' }}>
                        {riskScore}
                      </span>
                      <span className="apollo-risk-scale">/ 100 Risk Acuity</span>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.86rem' }}>
                      <strong style={{ display: 'block', color: '#0F172A', marginBottom: '4px' }}>
                        Model Used: {isEmergency ? 'Hard Safety Rule Engine (Priority 1)' : 'Gemini 1.5 Clinical Diagnostics'}
                      </strong>
                      <p style={{ color: '#475569', margin: 0 }}>
                        {isEmergency
                          ? 'Triggered immediate emergency protocol due to critical physiologic threshold breach (SpO2 < 90% or acute cardiac markers).'
                          : isUrgent
                          ? 'Moderate physiologic elevation detected. High probability of acute respiratory or circulatory stress requiring urgent hospital evaluation.'
                          : 'Vitals stable. Standard outpatient observation or telehealth consultation recommended.'}
                      </p>
                    </div>

                    <ul className="apollo-action-checklist">
                      <li>
                        <CheckCircle2 size={16} color="#10B981" />
                        <span>Automated ambulance dispatch route generated</span>
                      </li>
                      <li>
                        <CheckCircle2 size={16} color="#10B981" />
                        <span>Instant telemetry synced to incoming trauma center</span>
                      </li>
                      <li>
                        <CheckCircle2 size={16} color="#10B981" />
                        <span>ICU bedside reservation hold placed</span>
                      </li>
                    </ul>

                    <Link to="/register" className="apollo-btn-primary" style={{ justifyContent: 'center', marginTop: 'auto' }}>
                      Deploy Triage Engine to Your Hospital <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB 2: Facility & Bed Routing Demo */}
              {activeTab === 1 && (
                <div>
                  <div className="apollo-panel-header" style={{ marginBottom: '20px' }}>
                    <div>
                      <h4 className="apollo-panel-title">Real-Time Facility Matching & Bed Allocation</h4>
                      <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
                        Simulating live hospital bed telemetry across regional emergency zones:
                      </p>
                    </div>
                    {matched && (
                      <span className="apollo-status-pill" style={{ background: '#DCFCE7', color: '#15803D', padding: '6px 14px', borderRadius: '8px' }}>
                        ✓ Patient Bed Reserved Successfully
                      </span>
                    )}
                  </div>

                  <div className="apollo-facility-grid">
                    {facilities.map((fac) => (
                      <div
                        key={fac.id}
                        className={`apollo-facility-card ${fac.recommended ? 'recommended' : ''}`}
                        onClick={() => setSelectedFacility(fac.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {fac.recommended && (
                          <span className="apollo-recommended-badge">AI Top Match</span>
                        )}

                        <div className="apollo-facility-header">
                          <h4>{fac.name}</h4>
                          <div className="apollo-facility-meta">
                            <span>{fac.type}</span>
                            <span>•</span>
                            <span style={{ color: '#0F172A', fontWeight: 600 }}>{fac.eta} transit</span>
                          </div>
                        </div>

                        <div className="apollo-bed-bar">
                          <div className="apollo-bed-bar-label">
                            <span style={{ color: '#475569' }}>ICU Beds Available</span>
                            <span style={{ color: fac.icuBeds > 3 ? '#10B981' : fac.icuBeds > 0 ? '#F59E0B' : '#EF4444' }}>
                              {fac.icuBeds} / {fac.totalIcu}
                            </span>
                          </div>
                          <div className="apollo-progress-track">
                            <div
                              className={`apollo-progress-fill ${fac.icuBeds > 3 ? 'green' : fac.icuBeds > 0 ? 'amber' : 'red'}`}
                              style={{ width: `${(fac.icuBeds / fac.totalIcu) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="apollo-bed-bar">
                          <div className="apollo-bed-bar-label">
                            <span style={{ color: '#475569' }}>General Ward Capacity</span>
                            <span style={{ color: '#0F172A' }}>
                              {fac.genBeds} / {fac.totalGen}
                            </span>
                          </div>
                          <div className="apollo-progress-track">
                            <div
                              className="apollo-progress-fill green"
                              style={{ width: `${(fac.genBeds / fac.totalGen) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <button
                          className={`apollo-btn-${fac.id === selectedFacility ? 'accent' : 'ghost'}`}
                          style={{ width: '100%', marginTop: '8px', padding: '9px 12px', fontSize: '0.88rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFacility(fac.id);
                            setMatched(true);
                            setTimeout(() => setMatched(false), 3000);
                          }}
                        >
                          {fac.id === selectedFacility ? (matched ? '✓ Bed Reserved' : 'Confirm Bed Placement') : 'Select Facility'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: IoT Telemetry HUD */}
              {activeTab === 2 && (
                <div className="apollo-iot-hud">
                  <div className="apollo-iot-telemetry-box">
                    <div className="apollo-iot-telemetry-header">
                      <div>
                        <div className="apollo-telemetry-badge">
                          <Radio size={13} /> LIVE WEARABLE FEED • DEVICE #MC-8821
                        </div>
                        <h4 style={{ color: '#FFFFFF', margin: '4px 0 0', fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
                          Streaming Continuous Biometrics
                        </h4>
                      </div>
                      <span className="apollo-status-pill" style={{ color: '#CEFF00', borderColor: 'rgba(206, 255, 0, 0.4)' }}>
                        Connected (50ms latency)
                      </span>
                    </div>

                    <div className="apollo-ecg-wave">
                      <svg width="100%" height="80" viewBox="0 0 500 80" preserveAspectRatio="none">
                        <path d="M0,40 L100,40 L115,20 L130,65 L145,5 L160,50 L175,40 L280,40 L295,18 L310,68 L325,4 L340,55 L355,40 L500,40" />
                      </svg>
                    </div>

                    <div className="apollo-iot-metrics-strip">
                      <div className="apollo-iot-metric-card">
                        <div className="apollo-iot-metric-name">Heart Rate</div>
                        <div className="apollo-iot-metric-val">
                          74 <span className="apollo-iot-metric-unit">BPM</span>
                        </div>
                      </div>
                      <div className="apollo-iot-metric-card">
                        <div className="apollo-iot-metric-name">Oxygen (SpO2)</div>
                        <div className="apollo-iot-metric-val">
                          98.6 <span className="apollo-iot-metric-unit">%</span>
                        </div>
                      </div>
                      <div className="apollo-iot-metric-card">
                        <div className="apollo-iot-metric-name">Blood Pressure</div>
                        <div className="apollo-iot-metric-val">
                          118/78 <span className="apollo-iot-metric-unit">mmHg</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="apollo-iot-log">
                    <h5 style={{ fontFamily: 'var(--font-display)', fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                      Real-Time Event Stream
                    </h5>
                    <div className="apollo-log-item">
                      <span className="apollo-log-time">12:04:12</span>
                      <span style={{ color: '#10B981', fontWeight: 600 }}>Normal</span>
                      <span>Heart rate nominal at 74 BPM</span>
                    </div>
                    <div className="apollo-log-item">
                      <span className="apollo-log-time">12:03:55</span>
                      <span style={{ color: '#2563EB', fontWeight: 600 }}>Sync</span>
                      <span>Wearable BLE telemetry synced to cloud grid</span>
                    </div>
                    <div className="apollo-log-item">
                      <span className="apollo-log-time">12:02:40</span>
                      <span style={{ color: '#F59E0B', fontWeight: 600 }}>Check</span>
                      <span>Blood pressure calibration verified</span>
                    </div>
                    <div className="apollo-log-item">
                      <span className="apollo-log-time">12:00:01</span>
                      <span style={{ color: '#10B981', fontWeight: 600 }}>Init</span>
                      <span>Patient monitoring session started</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Doctor Care Pathway & SOAP Notes */}
              {activeTab === 3 && (
                <div className="apollo-care-flow">
                  <div className="apollo-timeline">
                    <h5 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                      Automated Care Journey & Referral Pipeline
                    </h5>

                    <div className="apollo-timeline-step">
                      <div className="apollo-step-indicator done">✓</div>
                      <div className="apollo-step-content">
                        <h5>1. Ingestion & Pre-Triage</h5>
                        <p>Patient vitals and self-reported symptoms captured via mobile app or emergency intake terminal.</p>
                      </div>
                    </div>

                    <div className="apollo-timeline-step">
                      <div className="apollo-step-indicator done">✓</div>
                      <div className="apollo-step-content">
                        <h5>2. AI Clinical Acuity Score</h5>
                        <p>Rule engine verified SpO2 thresholds and routed priority referral to Cardiology ER.</p>
                      </div>
                    </div>

                    <div className="apollo-timeline-step">
                      <div className="apollo-step-indicator">3</div>
                      <div className="apollo-step-content">
                        <h5>3. Bed Match & Transfer Coordination</h5>
                        <p>Reserved ICU Bed #4 at Metro Trauma Center with 8-minute ambulance ETA.</p>
                      </div>
                    </div>
                  </div>

                  <div className="apollo-soap-note-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>
                        AI Generated SOAP Clinical Note
                      </span>
                      <span className="apollo-status-pill">
                        <Sparkles size={12} /> Auto-Drafted
                      </span>
                    </div>

                    <div className="apollo-soap-item">
                      <span className="apollo-soap-title">S - Subjective</span>
                      <div className="apollo-soap-text">
                        Patient presents with sudden-onset substernal chest discomfort radiating to left shoulder. Onset 45 mins prior to intake.
                      </div>
                    </div>

                    <div className="apollo-soap-item">
                      <span className="apollo-soap-title">O - Objective</span>
                      <div className="apollo-soap-text">
                        BP: 125/80 mmHg | HR: 90 BPM | SpO2: 97% on room air. Normal respiratory effort.
                      </div>
                    </div>

                    <div className="apollo-soap-item">
                      <span className="apollo-soap-title">A / P - Assessment & Plan</span>
                      <div className="apollo-soap-text">
                        Atypical chest pain; Rule out Acute Coronary Syndrome. Immediate 12-lead ECG, troponin panel, cardiology bed placement.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          Bento Grid Features Section
          =================================================================== */}
      <section id="features" className="apollo-bento-section">
        <div className="apollo-container">
          <div className="apollo-section-header">
            <span className="apollo-kicker">Unified Clinical Infrastructure</span>
            <h2 className="apollo-section-title">
              Everything required to orchestrate care from symptom to <span className="kindsight-italic-spark">discharge</span>
            </h2>
            <p className="apollo-section-desc">
              Replace disjointed clipboards, manual hospital phone calls, and siloed triage tools with one real-time clinical platform.
            </p>
          </div>

          <div className="apollo-bento-grid">
            {/* Card 1 (Large 8 cols) */}
            <div className="apollo-bento-card col-8">
              <div className="apollo-bento-icon">
                <Sparkles size={24} />
              </div>
              <div>
                <h3>Multimodal Clinical AI + Rule-Engine Safety Net</h3>
                <p>
                  Combines Google Gemini 1.5 multimodal reasoning with deterministic physiologic rule overrides. Severe symptoms and hypoxia trigger automatic emergency protocols with sub-second response times, providing doctors with complete explainability logs.
                </p>
              </div>
              <div style={{ background: '#FAF8F5', border: '1px solid #E5E0D8', borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span className="apollo-status-pill" style={{ background: '#0F172A', color: '#CEFF00', padding: '6px 12px', borderRadius: '6px' }}>
                  Safety Rating A+
                </span>
                <span style={{ fontSize: '0.86rem', color: '#475569' }}>
                  Compliant with clinical triage guideline protocols (ESI & Manchester Triage System).
                </span>
              </div>
            </div>

            {/* Card 2 (4 cols) */}
            <div className="apollo-bento-card col-4">
              <div className="apollo-bento-icon">
                <Hospital size={24} />
              </div>
              <div>
                <h3>Live Hospital Bed & ICU Telemetry</h3>
                <p>
                  Zero guesswork for emergency responders. Access live ward availability, specialized trauma capability, and automated bed reservation holds.
                </p>
              </div>
              <Link to="/register" style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.92rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Explore Resource Grid <ArrowRight size={15} />
              </Link>
            </div>

            {/* Card 3 (6 cols) */}
            <div className="apollo-bento-card col-6">
              <div className="apollo-bento-icon">
                <Radio size={24} />
              </div>
              <div>
                <h3>Continuous Wearable & IoT Streaming</h3>
                <p>
                  Stream real-time vitals directly from patient wearables, bedside monitors, and home pulse oximeters. Detect silent hypoxia and arrhythmias before decompensation occurs.
                </p>
              </div>
            </div>

            {/* Card 4 (6 cols) */}
            <div className="apollo-bento-card col-6">
              <div className="apollo-bento-icon">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3>Enterprise HIPAA & FHIR Compliance</h3>
                <p>
                  End-to-end 256-bit AES encryption, multi-tenant role-based access control, automated audit trails, and seamless compatibility with Epic, Cerner, and HL7 FHIR servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          FAQ Accordion Section
          =================================================================== */}
      <section id="faq" className="apollo-faq-section">
        <div className="apollo-container">
          <div className="apollo-section-header">
            <span className="apollo-kicker">Frequently Asked Questions</span>
            <h2 className="apollo-section-title">Everything you need to <span className="kindsight-italic-spark">know</span></h2>
          </div>

          <div className="apollo-faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="apollo-faq-item">
                <button
                  className="apollo-faq-trigger"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openFaq === idx && (
                  <div className="apollo-faq-answer">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ===================================================================
          11. Mega-Footer (Apollo.io Style)
          =================================================================== */}
      <footer className="apollo-footer">
        <div className="apollo-container">
          <div className="apollo-footer-grid">
            <div className="apollo-footer-brand">
              <div className="apollo-brand">
                <div className="apollo-logo-icon">
                  <Activity className="apollo-logo-mark" size={20} />
                </div>
                <div className="apollo-brand-text">
                  <span className="apollo-brand-name">
                    Medi<span>Connect</span>
                  </span>
                  <span className="apollo-brand-tagline">AI Health Grid</span>
                </div>
              </div>
              <p>
                The AI clinical triage & resource routing platform connecting patients, healthcare telemetry, and regional hospital networks.
              </p>
            </div>

            <div className="apollo-footer-col">
              <h5>Platform</h5>
              <ul>
                <li><a href="#product-sandbox">Clinical Triage Engine</a></li>
                <li><a href="#product-sandbox">Hospital Resource Grid</a></li>
                <li><a href="#product-sandbox">IoT Vitals Telemetry</a></li>
                <li><a href="#product-sandbox">Care Pathway Pipeline</a></li>
                <li><Link to="/capacity">Capacity Manager</Link></li>
              </ul>
            </div>

            <div className="apollo-footer-col">
              <h5>Solutions</h5>
              <ul>
                <li><Link to="/triage">Emergency Triage</Link></li>
                <li><Link to="/facilities">Bed Matching</Link></li>
                <li><Link to="/iot-monitor">Remote Patient Monitoring</Link></li>
                <li><Link to="/referrals">Inter-Hospital Referrals</Link></li>
                <li><Link to="/my-care-path">Patient Portal</Link></li>
              </ul>
            </div>

            <div className="apollo-footer-col">
              <h5>Compliance</h5>
              <ul>
                <li><a href="#features">HIPAA Compliance</a></li>
                <li><a href="#features">HL7 FHIR v4.0</a></li>
                <li><a href="#features">SOC2 Type II</a></li>
                <li><a href="#features">Audit Trails</a></li>
                <li><a href="#features">Clinical Safety Logs</a></li>
              </ul>
            </div>

            <div className="apollo-footer-col">
              <h5>Access</h5>
              <ul>
                <li><Link to="/login">Clinician Sign In</Link></li>
                <li><Link to="/register">Register Facility</Link></li>
                <li><Link to="/">Live Dashboard</Link></li>
                <li><a href="https://github.com/svedant1207/Mediconnect" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a></li>
              </ul>
            </div>
          </div>

          <div className="apollo-footer-bottom">
            <div>
              © 2026 MediConnect AI Inc. All rights reserved.
            </div>
            <div className="apollo-status-pill">
              <span className="apollo-pulse-dot"></span>
              All Health Grid Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
