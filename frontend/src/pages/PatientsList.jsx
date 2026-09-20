import React, { useState, useEffect } from 'react';
import { patientService, followupService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  FileText,
  Plus,
  Search,
  Clock,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

export const PatientsList = () => {
  const { user } = useAuth();
  const isDoctor = (user?.role ? user.role.toLowerCase() : '') === 'doctor';
  const displayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Doctor');

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [followups, setFollowups] = useState([]);

  // New Patient Form
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    date_of_birth: '1985-06-15',
    gender: 'MALE',
    blood_group: 'O+',
    medical_history: 'Hypertension, Asthma',
    chronic_conditions: 'Type 2 Diabetes',
    location_lat: 22.7196,
    location_lng: 75.8577,
  });

  // Followup note form
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await patientService.getPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    try {
      const historyList = newPatient.medical_history
        .split(',')
        .map(h => h.trim())
        .filter(Boolean);

      const conditionsList = newPatient.chronic_conditions
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      await patientService.registerNewPatient({
        ...newPatient,
        medical_history: historyList,
        chronic_conditions: conditionsList,
      });

      setShowRegisterModal(false);
      loadPatients();
    } catch (err) {
      console.error('Failed to register patient:', err);
      alert('Error registering patient.');
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    try {
      const notes = await followupService.getFollowups(patient.id);
      setFollowups(Array.isArray(notes) ? notes : []);
    } catch (err) {
      setFollowups([]);
    }
  };

  const handleAddFollowup = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !newNote.trim()) return;
    try {
      await followupService.createFollowup(selectedPatient.id, {
        notes: newNote,
        follow_up_date: new Date().toISOString(),
      });
      setNewNote('');
      const updated = await followupService.getFollowups(selectedPatient.id);
      setFollowups(Array.isArray(updated) ? updated : []);
    } catch (err) {
      console.error('Error adding followup:', err);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.blood_group?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container">
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color={isDoctor ? "#2563EB" : "#06b6d4"} /> 
            {isDoctor ? "Doctor's Assigned Patients & Records" : "Patient Registry & Clinical Records"}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isDoctor 
              ? `Showing only patients assigned to or under the active clinical care of ${displayName}. Scoped record access is time-limited per DigiYatra visit consent.`
              : 'Manage registered patients, view medical profiles, and record clinical follow-up progress notes.'}
          </p>
        </div>
        {!isDoctor && (
          <button onClick={() => setShowRegisterModal(true)} className="btn btn-primary">
            <UserPlus size={18} /> Register Patient
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Search patient by name or blood group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
        </div>
      </div>

      {/* Grid Layout: Left List, Right Patient Detail Drawer */}
      <div className="grid grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Patient Cards */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading patient directory...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="glass-card" style={{ padding: '36px', textAlign: 'center' }}>
              <Users size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <h3>No Patients Found</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                {isDoctor 
                  ? 'No patients currently assigned to your clinic. Intake staff will route patients to your queue.' 
                  : "Click 'Register Patient' to create an entry."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPatients.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className={`glass-card glass-card-interactive ${selectedPatient?.id === p.id ? 'active' : ''}`}
                  style={{
                    padding: '20px',
                    borderColor: selectedPatient?.id === p.id ? '#2563EB' : 'var(--border-color)',
                    background: selectedPatient?.id === p.id ? '#EFF6FF' : 'var(--bg-card)'
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{p.full_name}</h3>
                      {p.medi_connect_id && (
                        <span style={{ background: '#F1F5F9', color: '#1E293B', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.74rem', padding: '1px 6px', borderRadius: '4px' }}>
                          {p.medi_connect_id}
                        </span>
                      )}
                    </div>
                    <span className="badge badge-info">{p.blood_group || 'O+'}</span>
                  </div>

                  <div className="flex items-center gap-4" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <span>Gender: <strong>{p.gender}</strong></span>
                    <span>DOB: <strong>{p.date_of_birth || 'N/A'}</strong></span>
                    <span>Email: <strong>{p.email || 'N/A'}</strong></span>
                  </div>

                  {/* If doctor: display time per record countdown */}
                  {isDoctor && (
                    <div style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.76rem',
                      color: '#15803D'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <Clock size={13} color="#16A34A" /> Time per Record: <strong>{p.consent_time_remaining || '24h Visit Window'}</strong>
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                        {p.active_consent_duration || '24h Visit'}
                      </span>
                    </div>
                  )}

                  {p.medical_history && p.medical_history.length > 0 && (
                    <div style={{ marginTop: '10px' }} className="flex gap-2">
                      {p.medical_history.map((h, i) => (
                        <span key={i} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', color: '#475569' }}>
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Patient Detail & Follow-ups */}
        <div>
          {selectedPatient ? (
            <div className="glass-card" style={{ padding: '28px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem' }}>{selectedPatient.full_name}</h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Patient ID: {selectedPatient.id}
                  </span>
                </div>
                <span className="badge badge-purple">{selectedPatient.gender}</span>
              </div>

              {/* If doctor: show Consent duration & time remaining card */}
              {isDoctor && (
                <div style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>
                      Time-Bound Record Access Window
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <Clock size={16} color="#16A34A" />
                      <strong style={{ fontSize: '0.98rem', color: '#14532D' }}>
                        {selectedPatient.consent_time_remaining || 'Active 24h Visit Window'}
                      </strong>
                    </div>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                    Zero-Trust Scoped
                  </span>
                </div>
              )}

              <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <div className="grid grid-cols-2" style={{ gap: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Blood Group</span>
                    <strong>{selectedPatient.blood_group || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Emergency Contact</span>
                    <strong>{selectedPatient.emergency_contact || 'None listed'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Medical History</span>
                    <strong>{selectedPatient.medical_history?.join(', ') || 'None recorded'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Chronic Conditions</span>
                    <strong>{selectedPatient.chronic_conditions?.join(', ') || 'None'}</strong>
                  </div>
                </div>
              </div>

              {/* Followup Notes List */}
              <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText color="#2563EB" size={18} /> Clinical Follow-up Progress Notes
              </h3>

              <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '20px' }} className="flex flex-col gap-2">
                {followups.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '10px' }}>
                    No doctor progress notes recorded yet for this patient.
                  </div>
                ) : (
                  followups.map((note, idx) => (
                    <div key={idx} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        <span>Note #{idx + 1}</span>
                        <span>{new Date(note.created_at || Date.now()).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{note.notes}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddFollowup}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <textarea
                    rows="2"
                    className="form-textarea"
                    placeholder="Enter doctor clinical follow-up progress notes..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                  <Plus size={16} /> Save Follow-up Progress Note
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a patient from the left directory to view full profile & record follow-up notes.
            </div>
          )}
        </div>
      </div>

      {/* Register Patient Modal */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', items: 'center', gap: '8px' }}>
              <UserPlus color="#06b6d4" /> Register New Patient
            </h2>

            <form onSubmit={handleRegisterPatient}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="John Smith"
                  value={newPatient.full_name}
                  onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={newPatient.date_of_birth}
                    onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-select"
                    value={newPatient.blood_group}
                    onChange={(e) => setNewPatient({ ...newPatient, blood_group: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Medical History (Comma Separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Hypertension, Asthma, Prior Surgery"
                  value={newPatient.medical_history}
                  onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })}
                />
              </div>

              <div className="flex gap-4" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setShowRegisterModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
