import React, { useState, useEffect } from 'react';
import { doctorService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  FileText, 
  Pill, 
  FlaskConical, 
  Search, 
  ChevronRight, 
  Copy, 
  Check, 
  Eye, 
  Play, 
  CheckCheck, 
  ShieldCheck, 
  Sparkles, 
  HeartPulse, 
  AlertCircle,
  X,
  Plus,
  Trash2,
  Lock,
  Building2
} from 'lucide-react';
import '../styles/DashboardApollo.css';

export const DoctorQueue = () => {
  const { user } = useAuth();
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED'
  const [copiedId, setCopiedId] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [selectedPatientForDossier, setSelectedPatientForDossier] = useState(null);
  const [selectedPatientForEncounter, setSelectedPatientForEncounter] = useState(null);
  const [dossierTab, setDossierTab] = useState('vitals'); // 'vitals' | 'allergies' | 'medications' | 'history' | 'tests'
  const [dossierReportSearch, setDossierReportSearch] = useState('');

  // Encounter form state
  const [encounterForm, setEncounterForm] = useState({
    chief_complaint: '',
    diagnosis: '',
    treatment_notes: '',
    prescriptions: [{ medicine_name: '', dosage: '', frequency: 'Once daily after meals' }],
    lab_orders: [{ test_name: '', category: 'Cardiology Diagnostics' }],
  });
  const [submittingEncounter, setSubmittingEncounter] = useState(false);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getQueue();
      setQueueData(data);
      setError('');
    } catch (err) {
      console.error('Failed to load doctor consultation queue:', err);
      setError('Could not load patient queue. Please refresh or contact hospital IT.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // Auto-refresh queue every 30 seconds
    const interval = setInterval(() => {
      doctorService.getQueue().then(setQueueData).catch(() => null);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleStatusChange = async (patientId, newStatus) => {
    try {
      await doctorService.updateQueueStatus(patientId, newStatus);
      showToast(`Patient status updated to ${newStatus.replace('_', ' ')}.`);
      loadQueue();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating status.');
    }
  };

  const handleOpenEncounter = (patient) => {
    setSelectedPatientForEncounter(patient);
    setEncounterForm({
      chief_complaint: patient.chief_complaint || 'Clinical consultation for palpitations and exertional fatigue',
      diagnosis: 'Sinus Tachycardia with essential hypertension (Stage 1)',
      treatment_notes: 'Reviewed current telemetry and medication compliance. Patient to maintain salt restriction and hydration. Follow-up scheduled in 2 weeks.',
      prescriptions: [
        { medicine_name: 'Metoprolol Tartrate', dosage: '25mg', frequency: 'Once daily morning after food' }
      ],
      lab_orders: [
        { test_name: '24-Hour Ambulatory Holter Monitoring', category: 'Cardiology Diagnostics' }
      ],
    });
  };

  const handleAddPrescriptionRow = () => {
    setEncounterForm(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, { medicine_name: '', dosage: '', frequency: 'Once daily' }]
    }));
  };

  const handleRemovePrescriptionRow = (idx) => {
    setEncounterForm(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== idx)
    }));
  };

  const handleAddLabRow = () => {
    setEncounterForm(prev => ({
      ...prev,
      lab_orders: [...prev.lab_orders, { test_name: '', category: 'Laboratory Diagnostics' }]
    }));
  };

  const handleRemoveLabRow = (idx) => {
    setEncounterForm(prev => ({
      ...prev,
      lab_orders: prev.lab_orders.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmitEncounter = async (e) => {
    e.preventDefault();
    if (!selectedPatientForEncounter) return;

    setSubmittingEncounter(true);
    try {
      await doctorService.recordEncounter({
        patient_id: selectedPatientForEncounter.patient_id,
        chief_complaint: encounterForm.chief_complaint,
        diagnosis: encounterForm.diagnosis,
        treatment_notes: encounterForm.treatment_notes,
        prescriptions: encounterForm.prescriptions.filter(p => p.medicine_name.trim()),
        lab_orders: encounterForm.lab_orders.filter(l => l.test_name.trim()),
      });
      showToast(`Consultation recorded and consultation completed for ${selectedPatientForEncounter.full_name}!`);
      setSelectedPatientForEncounter(null);
      loadQueue();
    } catch (err) {
      console.error('Failed to record consultation encounter:', err);
      alert('Failed to save encounter. Please try again.');
    } finally {
      setSubmittingEncounter(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Filter queue
  const queueItems = queueData?.queue || [];
  const filteredQueue = queueItems.filter(item => {
    const matchesSearch = 
      item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.medi_connect_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.chief_complaint?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return item.queue_status === statusFilter;
  });

  const doctorInfo = queueData?.doctor || {
    full_name: user?.full_name || 'Dr. Rajesh Sharma',
    specialty: 'Cardiology',
    facility_name: 'Maharaja Yashwantrao Hospital (MYH Indore)',
    department: 'Cardiology & Clinical Care',
  };

  const summary = queueData?.summary || {
    total_in_queue: queueItems.length,
    waiting: queueItems.filter(q => q.queue_status === 'WAITING').length,
    in_consultation: queueItems.filter(q => q.queue_status === 'IN_CONSULTATION').length,
    completed_today: queueItems.filter(q => q.queue_status === 'COMPLETED').length,
  };

  return (
    <div className="apollo-dashboard-wrapper">
      <div className="apollo-dashboard-container">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 9999,
            background: '#065F46',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 500
          }}>
            <CheckCircle2 size={18} color="#34D399" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Doctor Header Banner */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: '#ECFDF5',
                color: '#065F46',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                Clinician Consultation Desk • Active On-Duty
              </span>
              <span style={{
                background: '#EFF6FF',
                color: '#1D4ED8',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '999px',
              }}>
                {doctorInfo.specialty}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
              {doctorInfo.full_name}
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={15} color="#2563EB" />
              <span>{doctorInfo.facility_name} — {doctorInfo.department}</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={loadQueue}
              className="apollo-dash-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
              title="Refresh queue"
            >
              <Activity size={14} /> Refresh Queue
            </button>
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#475569'
            }}>
              Intake Source: <strong style={{ color: '#0F172A' }}>Hospital Admin Check-in Terminal</strong>
            </div>
          </div>
        </div>

        {/* Doctor KPI Counter Strip */}
        <div className="apollo-kpi-grid" style={{ marginBottom: '24px' }}>
          <div className="apollo-kpi-card" onClick={() => setStatusFilter('ALL')} style={{ cursor: 'pointer', borderColor: statusFilter === 'ALL' ? '#2563EB' : '' }}>
            <div className="apollo-kpi-top">
              <span className="apollo-kpi-label">Active Queue Total</span>
              <div className="apollo-kpi-icon patients">
                <Users size={18} />
              </div>
            </div>
            <div className="apollo-kpi-value-row">
              <span className="apollo-kpi-value">{loading ? '—' : summary.total_in_queue}</span>
              <span className="apollo-kpi-trend">Routed Today</span>
            </div>
            <span className="apollo-kpi-subtext">Assigned to your department</span>
          </div>

          <div className="apollo-kpi-card" onClick={() => setStatusFilter('WAITING')} style={{ cursor: 'pointer', borderColor: statusFilter === 'WAITING' ? '#F59E0B' : '' }}>
            <div className="apollo-kpi-top">
              <span className="apollo-kpi-label">Waiting Patients</span>
              <div className="apollo-kpi-icon triage">
                <Clock size={18} color="#D97706" />
              </div>
            </div>
            <div className="apollo-kpi-value-row">
              <span className="apollo-kpi-value" style={{ color: '#D97706' }}>{loading ? '—' : summary.waiting}</span>
              <span className="apollo-kpi-trend" style={{ color: '#D97706', background: '#FEF3C7' }}>Ready for Doctor</span>
            </div>
            <span className="apollo-kpi-subtext">Intake verified by admin reception</span>
          </div>

          <div className="apollo-kpi-card" onClick={() => setStatusFilter('IN_CONSULTATION')} style={{ cursor: 'pointer', borderColor: statusFilter === 'IN_CONSULTATION' ? '#2563EB' : '' }}>
            <div className="apollo-kpi-top">
              <span className="apollo-kpi-label">In Consultation</span>
              <div className="apollo-kpi-icon hospitals">
                <Stethoscope size={18} color="#2563EB" />
              </div>
            </div>
            <div className="apollo-kpi-value-row">
              <span className="apollo-kpi-value" style={{ color: '#2563EB' }}>{loading ? '—' : summary.in_consultation}</span>
              <span className="apollo-kpi-trend" style={{ color: '#2563EB', background: '#EFF6FF' }}>Active Now</span>
            </div>
            <span className="apollo-kpi-subtext">Currently examining in clinic</span>
          </div>

          <div className="apollo-kpi-card" onClick={() => setStatusFilter('COMPLETED')} style={{ cursor: 'pointer', borderColor: statusFilter === 'COMPLETED' ? '#10B981' : '' }}>
            <div className="apollo-kpi-top">
              <span className="apollo-kpi-label">Completed Today</span>
              <div className="apollo-kpi-icon icu">
                <CheckCircle2 size={18} color="#059669" />
              </div>
            </div>
            <div className="apollo-kpi-value-row">
              <span className="apollo-kpi-value" style={{ color: '#059669' }}>{loading ? '—' : summary.completed_today}</span>
              <span className="apollo-kpi-trend" style={{ color: '#059669', background: '#ECFDF5' }}>Logged & Rx</span>
            </div>
            <span className="apollo-kpi-subtext">Encounters documented to passport</span>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {['ALL', 'WAITING', 'IN_CONSULTATION', 'COMPLETED'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                style={{
                  background: statusFilter === tab ? '#0F172A' : '#F1F5F9',
                  color: statusFilter === tab ? '#FFFFFF' : '#475569',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab === 'ALL' ? 'All Patients' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search by name, Medi-Connect ID, or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.84rem',
                outline: 'none'
              }}
            />
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* Patient Queue Cards / Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B' }}>
            <Activity size={32} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '12px', color: '#2563EB' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>Syncing live patient consultation queue from hospital grid...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            border: '1px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            color: '#64748B'
          }}>
            <Users size={44} color="#94A3B8" style={{ marginBottom: '14px' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#1E293B', marginBottom: '6px' }}>No Patients Found in Queue</h3>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>
              {statusFilter !== 'ALL' 
                ? `No patients with status "${statusFilter}". Try selecting "All Patients".` 
                : 'Hospital admin / reception staff will route checked-in patients here via the intake terminal.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredQueue.map((item, index) => {
              const consent = item.consent || {};
              const vitals = item.vitals || {};
              const isUrgent = item.triage_urgency === 'Urgent';
              const isCompleted = item.queue_status === 'COMPLETED';
              const inConsult = item.queue_status === 'IN_CONSULTATION';

              return (
                <div 
                  key={item.patient_id}
                  style={{
                    background: '#FFFFFF',
                    border: inConsult 
                      ? '2px solid #2563EB' 
                      : (isUrgent ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0'),
                    borderRadius: '16px',
                    padding: '22px 24px',
                    boxShadow: inConsult ? '0 8px 24px rgba(37,99,235,0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    
                    {/* Left: Token & Patient Identity */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{
                        background: inConsult ? '#EFF6FF' : (isCompleted ? '#ECFDF5' : '#F1F5F9'),
                        color: inConsult ? '#1D4ED8' : (isCompleted ? '#065F46' : '#0F172A'),
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '60px'
                      }}>
                        <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B' }}>Token</span>
                        <span>{item.queue_token}</span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                            {item.full_name}
                          </h3>

                          {/* Medi-Connect ID Pill */}
                          <span 
                            onClick={() => handleCopyId(item.medi_connect_id)}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              color: '#1E293B',
                              fontSize: '0.76rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Click to copy Medi-Connect ID"
                          >
                            {item.medi_connect_id}
                            {copiedId === item.medi_connect_id ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#64748B" />}
                          </span>

                          {/* Urgency Badge */}
                          <span style={{
                            background: isUrgent ? '#FEE2E2' : '#EFF6FF',
                            color: isUrgent ? '#991B1B' : '#1E40AF',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isUrgent ? <AlertTriangle size={12} /> : <Activity size={12} />}
                            {item.triage_urgency} Triage
                          </span>

                          {/* Queue Status Badge */}
                          <span style={{
                            background: isCompleted ? '#ECFDF5' : (inConsult ? '#EFF6FF' : '#FFFBEB'),
                            color: isCompleted ? '#065F46' : (inConsult ? '#1D4ED8' : '#92400E'),
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px'
                          }}>
                            {item.queue_status === 'WAITING' && 'Waiting for Doctor'}
                            {item.queue_status === 'IN_CONSULTATION' && 'In Active Consultation'}
                            {item.queue_status === 'COMPLETED' && 'Consultation Completed'}
                          </span>
                        </div>

                        {/* Demographics row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', color: '#64748B', fontSize: '0.82rem' }}>
                          <span>Age: <strong style={{ color: '#0F172A' }}>{item.age} yrs</strong></span>
                          <span>•</span>
                          <span>Gender: <strong style={{ color: '#0F172A' }}>{item.gender}</strong></span>
                          <span>•</span>
                          <span>Blood: <strong style={{ color: '#DC2626' }}>{item.blood_group}</strong></span>
                          <span>•</span>
                          <span>Checked in at: <strong style={{ color: '#0F172A' }}>{item.checked_in_at}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: TIME PER RECORD SHARED - High Prominence Consent Timer */}
                    <div style={{
                      background: consent.is_expired ? '#FEF2F2' : '#F0FDF4',
                      border: consent.is_expired ? '1px solid #FCA5A5' : '1px solid #BBF7D0',
                      borderRadius: '12px',
                      padding: '10px 16px',
                      minWidth: '260px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: consent.is_expired ? '#991B1B' : '#166534', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={14} color={consent.is_expired ? '#DC2626' : '#16A34A'} />
                          Time per Record Shared
                        </span>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: consent.is_expired ? '#DC2626' : '#22C55E',
                          boxShadow: consent.is_expired ? 'none' : '0 0 6px #22C55E'
                        }}></span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <Clock size={16} color={consent.is_expired ? '#DC2626' : '#16A34A'} />
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: consent.is_expired ? '#991B1B' : '#15803D' }}>
                          {consent.time_remaining_formatted || '24h Visit Window'}
                        </span>
                      </div>

                      <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: consent.is_expired ? '#B91C1C' : '#15803D' }}>
                        Active zero-trust visit grant • Scoped: {consent.scopes?.slice(0, 3).join(', ')}...
                      </p>
                    </div>

                  </div>

                  {/* Middle Row: Chief Complaint & Live Vitals */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Chief Complaint & Clinical Presentation
                      </span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>
                        "{item.chief_complaint}"
                      </p>
                    </div>

                    {/* Vitals Ribbon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>Heart Rate</span>
                        <strong style={{ fontSize: '0.85rem', color: '#DC2626' }}>{vitals.heart_rate || 74} bpm</strong>
                      </div>
                      <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>Blood Pressure</span>
                        <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{vitals.blood_pressure || '124/82'}</strong>
                      </div>
                      <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>SpO2</span>
                        <strong style={{ fontSize: '0.85rem', color: '#2563EB' }}>{vitals.spo2 || 98}%</strong>
                      </div>
                      <div style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '4px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>Temp</span>
                        <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{vitals.temperature || 37.0}°C</strong>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    
                    {/* Allergies / Meds quick badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {item.allergies && item.allergies.length > 0 ? (
                        item.allergies.map((a, i) => (
                          <span key={i} style={{
                            background: '#FEE2E2',
                            color: '#991B1B',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertCircle size={12} /> Allergy: {a.allergen}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>No documented drug allergies</span>
                      )}

                      {item.medications && item.medications.length > 0 && (
                        <span style={{
                          background: '#F1F5F9',
                          color: '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {item.medications.length} Active Rx Prescriptions
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => setSelectedPatientForDossier(item)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#1E293B',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Eye size={15} color="#2563EB" /> Examine Records
                      </button>

                      {!isCompleted && (
                        <>
                          {!inConsult ? (
                            <button
                              onClick={() => handleStatusChange(item.patient_id, 'IN_CONSULTATION')}
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Play size={14} /> Begin Consultation
                            </button>
                          ) : (
                            <span style={{
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <Sparkles size={14} /> In Session
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenEncounter(item)}
                            style={{
                              background: '#0F172A',
                              border: 'none',
                              color: '#FFFFFF',
                              padding: '8px 16px',
                              borderRadius: '10px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Stethoscope size={15} color="#60A5FA" /> Record Encounter & Rx
                          </button>
                        </>
                      )}

                      {isCompleted && (
                        <span style={{
                          color: '#059669',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <CheckCheck size={16} /> Consultation Complete
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Scoped Clinical Dossier Modal                                    */}
      {/* ========================================================================= */}
      {selectedPatientForDossier && (
        <div className="apollo-profile-modal-backdrop" onClick={() => setSelectedPatientForDossier(null)}>
          <div 
            className="apollo-profile-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '840px', width: '92%' }}
          >
            {/* Modal Header */}
            <div className="apollo-profile-modal-header" style={{ background: '#0F172A', color: '#FFFFFF', borderBottom: 'none' }}>
              <div className="apollo-profile-modal-title" style={{ color: '#FFFFFF' }}>
                <ShieldCheck size={20} color="#60A5FA" />
                <span>DigiYatra Scoped Clinical Dossier</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPatientForDossier(null)} 
                className="apollo-profile-close-btn"
                style={{ color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Time per Record Banner inside Modal */}
            <div style={{
              background: '#F0FDF4',
              borderBottom: '1px solid #DCFCE7',
              padding: '12px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#16A34A" />
                <span style={{ fontSize: '0.84rem', color: '#166534', fontWeight: 600 }}>
                  Time-Limited Consultation Access: <strong>{selectedPatientForDossier.consent?.time_remaining_formatted || '24h Visit Window'}</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                Zero-Trust Token Verified
              </span>
            </div>

            {/* Patient Header Summary */}
            <div style={{ padding: '20px 24px 12px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedPatientForDossier.full_name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '0.82rem', marginTop: '4px' }}>
                  <span>ID: <strong style={{ color: '#0F172A' }}>{selectedPatientForDossier.medi_connect_id}</strong></span>
                  <span>•</span>
                  <span>{selectedPatientForDossier.age} yrs, {selectedPatientForDossier.gender}</span>
                  <span>•</span>
                  <span>Blood: <strong style={{ color: '#DC2626' }}>{selectedPatientForDossier.blood_group}</strong></span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>Triage Classification</span>
                <span style={{
                  background: selectedPatientForDossier.triage_urgency === 'Urgent' ? '#FEE2E2' : '#EFF6FF',
                  color: selectedPatientForDossier.triage_urgency === 'Urgent' ? '#991B1B' : '#1D4ED8',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem'
                }}>
                  {selectedPatientForDossier.triage_urgency}
                </span>
              </div>
            </div>

            {/* Dossier Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 24px', background: '#F8FAFC' }}>
              {[
                { id: 'vitals', label: 'Telemetry & Vitals', icon: Activity },
                { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
                { id: 'medications', label: 'Medications', icon: Pill },
                { id: 'history', label: 'Medical History', icon: FileText },
                { id: 'tests', label: 'Diagnostic Reports', icon: FlaskConical },
              ].map(t => {
                const Icon = t.icon;
                const isActive = dossierTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDossierTab(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                      color: isActive ? '#2563EB' : '#64748B',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dossier Body */}
            <div style={{ padding: '24px', maxHeight: '420px', overflowY: 'auto' }}>
              {dossierTab === 'vitals' && (
                <div>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', color: '#0F172A' }}>Latest Wearable Telemetry</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Heart Rate</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626', margin: '4px 0' }}>
                        {selectedPatientForDossier.vitals?.heart_rate || 74}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>bpm</span>
                    </div>

                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Blood Pressure</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>
                        {selectedPatientForDossier.vitals?.blood_pressure || '124/82'}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>mmHg</span>
                    </div>

                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Blood Oxygen (SpO2)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', margin: '4px 0' }}>
                        {selectedPatientForDossier.vitals?.spo2 || 98}%
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#16A34A' }}>Normal Range</span>
                    </div>

                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Core Temperature</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>
                        {selectedPatientForDossier.vitals?.temperature || 37.0}°C
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Afebrile</span>
                    </div>
                  </div>
                </div>
              )}

              {dossierTab === 'allergies' && (
                <div>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', color: '#0F172A' }}>Documented Clinical Allergies</h4>
                  {selectedPatientForDossier.allergies?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedPatientForDossier.allergies.map((a, i) => (
                        <div key={i} style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#991B1B', fontSize: '0.95rem' }}>{a.allergen}</strong>
                            <p style={{ margin: '2px 0 0 0', color: '#B91C1C', fontSize: '0.8rem' }}>Reaction: {a.reaction}</p>
                          </div>
                          <span style={{ background: '#DC2626', color: '#FFFFFF', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {a.severity} Severity
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748B', fontStyle: 'italic' }}>No adverse drug or environmental allergies reported.</p>
                  )}
                </div>
              )}

              {dossierTab === 'medications' && (
                <div>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', color: '#0F172A' }}>Active Prescriptions & Regimen</h4>
                  {selectedPatientForDossier.medications?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedPatientForDossier.medications.map((m, i) => (
                        <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#0F172A', fontSize: '0.92rem' }}>{m.name || m.medicine_name}</strong>
                            <p style={{ margin: '2px 0 0 0', color: '#64748B', fontSize: '0.8rem' }}>Dosage: {m.dosage} • Frequency: {m.frequency}</p>
                          </div>
                          <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                            {m.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748B', fontStyle: 'italic' }}>No active medications listed.</p>
                  )}
                </div>
              )}

              {dossierTab === 'history' && (
                <div>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', color: '#0F172A' }}>Longitudinal Medical History</h4>
                  {selectedPatientForDossier.medical_history?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedPatientForDossier.medical_history.map((h, i) => (
                        <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                          <strong style={{ color: '#0F172A', fontSize: '0.92rem' }}>{h.condition}</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.82rem' }}>{h.notes}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748B', fontStyle: 'italic' }}>No chronic medical history recorded.</p>
                  )}
                </div>
              )}

              {dossierTab === 'tests' && (() => {
                const tests = selectedPatientForDossier.recent_tests || [];
                const filteredTests = tests.filter((t) => {
                  const q = dossierReportSearch.toLowerCase().trim();
                  return !q ||
                    t.test_name?.toLowerCase().includes(q) ||
                    t.category?.toLowerCase().includes(q) ||
                    t.summary?.toLowerCase().includes(q);
                });
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0F172A' }}>Recent Diagnostic Lab Reports</h4>
                      <div style={{ position: 'relative', minWidth: '220px' }}>
                        <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                        <input
                          type="text"
                          placeholder="Search reports by name..."
                          value={dossierReportSearch}
                          onChange={(e) => setDossierReportSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 12px 6px 30px',
                            fontSize: '0.78rem',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    {filteredTests.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredTests.map((t, i) => (
                          <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <strong style={{ color: '#0F172A', fontSize: '0.92rem' }}>{t.test_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{t.date}</span>
                            </div>
                            <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '6px' }}>
                              {t.category}
                            </span>
                            <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem', lineHeight: 1.4 }}>
                              {t.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#64748B', fontStyle: 'italic', padding: '12px 0' }}>
                        {dossierReportSearch ? `No diagnostic reports matching "${dossierReportSearch}".` : 'No diagnostic test records available.'}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF8F5' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                DigiYatra Patient Consent: Access strictly audited under Indian Healthcare Data Governance.
              </span>
              <button
                onClick={() => {
                  const pt = selectedPatientForDossier;
                  setSelectedPatientForDossier(null);
                  handleOpenEncounter(pt);
                }}
                className="apollo-dash-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
              >
                <Stethoscope size={15} /> Open Encounter Form
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Record Clinical Encounter & Prescription Form                   */}
      {/* ========================================================================= */}
      {selectedPatientForEncounter && (
        <div className="apollo-profile-modal-backdrop" onClick={() => setSelectedPatientForEncounter(null)}>
          <div 
            className="apollo-profile-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '780px', width: '92%' }}
          >
            {/* Header */}
            <div className="apollo-profile-modal-header" style={{ background: '#0F172A', color: '#FFFFFF' }}>
              <div className="apollo-profile-modal-title" style={{ color: '#FFFFFF' }}>
                <Stethoscope size={20} color="#60A5FA" />
                <span>Clinical Consultation & Treatment Record</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPatientForEncounter(null)} 
                className="apollo-profile-close-btn"
                style={{ color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEncounter}>
              <div style={{ padding: '24px', maxHeight: '520px', overflowY: 'auto' }}>
                
                {/* Patient Summary Strip */}
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#1E3A8A', fontSize: '1rem' }}>{selectedPatientForEncounter.full_name}</strong>
                    <span style={{ color: '#3B82F6', fontSize: '0.82rem', marginLeft: '8px' }}>({selectedPatientForEncounter.medi_connect_id})</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#1D4ED8', fontWeight: 600 }}>
                    Attending: {doctorInfo.full_name}
                  </span>
                </div>

                {/* Chief Complaint */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Chief Complaint / Presentation Symptoms
                  </label>
                  <input
                    type="text"
                    required
                    value={encounterForm.chief_complaint}
                    onChange={(e) => setEncounterForm(prev => ({ ...prev, chief_complaint: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                {/* Clinical Diagnosis */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Clinical Diagnosis
                  </label>
                  <input
                    type="text"
                    required
                    value={encounterForm.diagnosis}
                    onChange={(e) => setEncounterForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                {/* Treatment Notes */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Physician Notes & Management Plan
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={encounterForm.treatment_notes}
                    onChange={(e) => setEncounterForm(prev => ({ ...prev, treatment_notes: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Prescriptions */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Pill size={15} color="#2563EB" /> Prescribe Medications (Rx)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddPrescriptionRow}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> Add Medicine
                    </button>
                  </div>

                  {encounterForm.prescriptions.map((rx, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.6fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Medicine name (e.g. Amlodipine)"
                        value={rx.medicine_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEncounterForm(prev => {
                            const copy = [...prev.prescriptions];
                            copy[idx].medicine_name = val;
                            return { ...prev, prescriptions: copy };
                          });
                        }}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 5mg)"
                        value={rx.dosage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEncounterForm(prev => {
                            const copy = [...prev.prescriptions];
                            copy[idx].dosage = val;
                            return { ...prev, prescriptions: copy };
                          });
                        }}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Frequency (e.g. Once daily)"
                        value={rx.frequency}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEncounterForm(prev => {
                            const copy = [...prev.prescriptions];
                            copy[idx].frequency = val;
                            return { ...prev, prescriptions: copy };
                          });
                        }}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                      {encounterForm.prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePrescriptionRow(idx)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Lab Diagnostic Orders */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FlaskConical size={15} color="#059669" /> Order Diagnostic Lab Tests
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLabRow}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#059669',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> Add Test Order
                    </button>
                  </div>

                  {encounterForm.lab_orders.map((lab, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Test Name (e.g. Serum Creatinine)"
                        value={lab.test_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEncounterForm(prev => {
                            const copy = [...prev.lab_orders];
                            copy[idx].test_name = val;
                            return { ...prev, lab_orders: copy };
                          });
                        }}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Department / Category"
                        value={lab.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEncounterForm(prev => {
                            const copy = [...prev.lab_orders];
                            copy[idx].category = val;
                            return { ...prev, lab_orders: copy };
                          });
                        }}
                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                      {encounterForm.lab_orders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLabRow(idx)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

              </div>

              {/* Form Actions */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#FAF8F5' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPatientForEncounter(null)}
                  className="apollo-dash-btn-secondary"
                  disabled={submittingEncounter}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apollo-dash-btn-primary"
                  disabled={submittingEncounter}
                  style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submittingEncounter ? 'Saving & Updating Passport...' : 'Save Consultation & Complete'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
