import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { referralService, patientService, facilityService } from '../services/api';
import { 
  ArrowRightLeft, 
  Plus, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Building2, 
  User, 
  FileText,
  AlertTriangle,
  Send
} from 'lucide-react';

export const ReferralsTracker = () => {
  const location = useLocation();
  const [referrals, setReferrals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [newReferral, setNewReferral] = useState({
    patient_id: '',
    from_facility_id: '',
    to_facility_id: location.state?.targetFacilityId || '',
    priority: 'EMERGENCY',
    reason: 'Specialized trauma ICU admission and ventilator management required.',
    notes: 'Patient stabilized in ambulance transit.',
  });

  // Status Change Modal State
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    loadData();
    if (location.state?.targetFacilityId) {
      setShowCreateModal(true);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [refData, patData, facData] = await Promise.all([
        referralService.getReferrals().catch(() => []),
        patientService.getPatients().catch(() => []),
        facilityService.getFacilities().catch(() => []),
      ]);
      setReferrals(Array.isArray(refData) ? refData : []);
      setPatients(Array.isArray(patData) ? patData : []);
      setFacilities(Array.isArray(facData) ? facData : []);
    } catch (err) {
      console.error('Failed to load referrals data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    try {
      await referralService.createReferral({
        ...newReferral,
        from_facility_id: newReferral.from_facility_id || facilities[0]?.id,
        to_facility_id: newReferral.to_facility_id || facilities[1]?.id || facilities[0]?.id
      });
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create referral:', err);
      alert(err.response?.data?.detail || 'Failed to dispatch referral request.');
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedReferral) return;
    try {
      const updated = await referralService.updateStatus(selectedReferral.id, newStatus, statusNotes);
      setSelectedReferral(null);
      setReferrals(prev => prev.map(r => (r.id === selectedReferral.id ? { ...r, ...updated, status: newStatus, notes: statusNotes } : r)));
      setStatusNotes('');
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update referral status.');
    }
  };

  const filteredReferrals = referrals.filter(r => 
    statusFilter === 'ALL' || r.status === statusFilter
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="badge badge-medium flex items-center gap-1"><Clock size={12} /> PENDING</span>;
      case 'ACCEPTED': return <span className="badge badge-info flex items-center gap-1"><CheckCircle2 size={12} /> ACCEPTED</span>;
      case 'IN_TRANSIT': return <span className="badge badge-critical flex items-center gap-1"><Truck size={12} /> IN TRANSIT</span>;
      case 'COMPLETED': return <span className="badge badge-low flex items-center gap-1"><CheckCircle2 size={12} /> COMPLETED</span>;
      case 'REJECTED': case 'CANCELLED': return <span className="badge badge-high flex items-center gap-1"><XCircle size={12} /> {status}</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="container">
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', items: 'center', gap: '10px' }}>
            <ArrowRightLeft color="#06b6d4" /> Inter-Facility Referral Lifecycle
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Route patient transfers between healthcare hubs, track ambulance transit status, and maintain handover audit trails.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={18} /> New Referral Request
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card" style={{ padding: '12px 20px', marginBottom: '24px', display: 'flex', gap: '10px', overflowX: 'auto' }}>
        {['ALL', 'PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Referrals Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading active referrals...
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Truck size={48} color="var(--text-muted)" style={{ marginBottom: '14px' }} />
          <h3>No Referral Records Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Create a new referral request to start tracking transfers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {filteredReferrals.map((r) => {
            const patient = patients.find(p => p.id === r.patient_id);
            const fromFac = facilities.find(f => f.id === r.from_facility_id);
            const toFac = facilities.find(f => f.id === r.to_facility_id);

            return (
              <div key={r.id} className="glass-card" style={{ padding: '24px', position: 'relative' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(r.status)}
                    <span className="badge badge-purple">{r.priority || 'EMERGENCY'}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Ref #{r.id.slice(0, 8)}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User color="#2563EB" size={18} /> {patient ? patient.full_name : `Patient ID: ${r.patient_id?.slice(0, 8)}`}
                </h3>

                {/* Facilities Route Banner */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Origin</span>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{fromFac ? fromFac.name : 'Origin Facility'}</strong>
                  </div>

                  <ArrowRightLeft size={18} color="#2563EB" />

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Destination Target</span>
                    <strong style={{ fontSize: '0.88rem', color: '#059669' }}>{toFac ? toFac.name : 'Target Facility'}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <strong>Transfer Reason:</strong> {r.reason || 'Clinical escalation'}
                </div>

                {r.notes && (
                  <div style={{
                    background: '#F8FAFC',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '18px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <strong>Handover Log:</strong> {r.notes}
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedReferral(r);
                    setNewStatus(r.status);
                    setStatusNotes(r.notes || '');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  Update Transfer Status & Notes
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating New Referral */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', items: 'center', gap: '8px' }}>
              <ArrowRightLeft color="#06b6d4" /> Dispatch Patient Referral Request
            </h2>

            <form onSubmit={handleCreateReferral}>
              <div className="form-group">
                <label className="form-label">Select Patient</label>
                <select
                  required
                  className="form-select"
                  value={newReferral.patient_id}
                  onChange={(e) => setNewReferral({ ...newReferral, patient_id: e.target.value })}
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.gender}, Blood: {p.blood_group || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Origin Facility</label>
                  <select
                    className="form-select"
                    value={newReferral.from_facility_id}
                    onChange={(e) => setNewReferral({ ...newReferral, from_facility_id: e.target.value })}
                  >
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Facility</label>
                  <select
                    className="form-select"
                    value={newReferral.to_facility_id}
                    onChange={(e) => setNewReferral({ ...newReferral, to_facility_id: e.target.value })}
                  >
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Transfer Urgency / Priority</label>
                <select
                  className="form-select"
                  value={newReferral.priority}
                  onChange={(e) => setNewReferral({ ...newReferral, priority: e.target.value })}
                >
                  <option value="EMERGENCY">EMERGENCY (Immediate Transfer)</option>
                  <option value="URGENT">URGENT (Within 2 Hours)</option>
                  <option value="ROUTINE">ROUTINE (Scheduled Transfer)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Reason for Transfer</label>
                <textarea
                  required
                  rows="3"
                  className="form-textarea"
                  value={newReferral.reason}
                  onChange={(e) => setNewReferral({ ...newReferral, reason: e.target.value })}
                />
              </div>

              <div className="flex gap-4" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Dispatch Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Updating Status */}
      {selectedReferral && (
        <div className="modal-overlay" onClick={() => setSelectedReferral(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>
              Update Status for Referral #{selectedReferral.id.slice(0, 8)}
            </h2>

            <form onSubmit={handleUpdateStatus}>
              <div className="form-group">
                <label className="form-label">New Status Stage</label>
                <select
                  className="form-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="IN_TRANSIT">IN_TRANSIT (Ambulance En Route)</option>
                  <option value="COMPLETED">COMPLETED (Handover Complete)</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status Update / Clinical Notes</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  placeholder="e.g. Ambulance unit 42 dispatched. ETA 15 mins."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-4" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setSelectedReferral(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
