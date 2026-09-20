import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { facilityService } from '../services/api';
import { 
  Building2, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  HeartPulse, 
  Wind, 
  BedDouble, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Navigation,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const FacilityMatcher = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPatient = (user?.role ? user.role.toLowerCase() : '') === 'patient';

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New facility form
  const [newFacility, setNewFacility] = useState({
    name: '',
    type: 'PRIMARY',
    location_lat: 22.7196,
    location_lng: 75.8577,
    address: '',
    phone: '',
    total_general_beds: 50,
    available_general_beds: 20,
    total_icu_beds: 10,
    available_icu_beds: 4,
    ventilator_count: 5,
    specialties: ['General Medicine', 'Emergency Services'],
  });

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await facilityService.getFacilities();
      setFacilities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    try {
      await facilityService.createFacility(newFacility);
      setShowCreateModal(false);
      loadFacilities();
    } catch (err) {
      console.error('Failed to create facility:', err);
      alert('Failed to register hospital facility.');
    }
  };

  const filteredFacilities = facilities.filter(f => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
                          f.name?.toLowerCase().includes(q) ||
                          f.address?.toLowerCase().includes(q) ||
                          (f.specialties && f.specialties.some(s => s.toLowerCase().includes(q)));

    const fType = (f.type || '').toUpperCase();
    const matchesTier = selectedTier === 'ALL' || 
                        fType === selectedTier ||
                        (selectedTier === 'PRIMARY' && (fType === 'PRIMARY' || fType === 'PHC')) ||
                        (selectedTier === 'SECONDARY' && (fType === 'SECONDARY' || fType === 'CHC')) ||
                        (selectedTier === 'TERTIARY' && (fType === 'TERTIARY' || fType === 'HOSPITAL'));

    const matchesSpecialty = selectedSpecialty === 'ALL' || 
                             (f.specialties && f.specialties.some(s => s.toLowerCase().includes(selectedSpecialty.toLowerCase())));

    return matchesSearch && matchesTier && matchesSpecialty;
  });

  const getLoadBadge = (availICU, totalICU) => {
    if (!totalICU) return <span className="badge badge-low">Normal Load</span>;
    const loadRatio = 1 - (availICU / totalICU);
    if (loadRatio > 0.85) return <span className="badge badge-critical">High Capacity Load</span>;
    if (loadRatio > 0.6) return <span className="badge badge-medium">Moderate Load</span>;
    return <span className="badge badge-low flex items-center gap-1"><CheckCircle2 size={12} /> Beds Available</span>;
  };

  return (
    <div className="container">
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 color="#059669" /> Healthcare Facilities & Hospital Network
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Showing {filteredFacilities.length} of {facilities.length} verified Primary Health Centres, CHCs, and Hospitals from India Ministry of Health & Kaggle dataset.
          </p>
        </div>
        {!isPatient && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={18} /> Register New Facility
          </button>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="grid grid-cols-3" style={{ gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search Facility Name, State or Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="e.g. PHC, CHC, Indore, Madhya Pradesh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Filter by Facility Tier</label>
            <select className="form-select" value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)}>
              <option value="ALL">All Tiers (PHC, CHC, Hospitals)</option>
              <option value="PRIMARY">Primary Health Centres (PHC)</option>
              <option value="SECONDARY">Community Health Centres (CHC)</option>
              <option value="TERTIARY">Tertiary & Multi-Specialty Hospitals</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Filter by Specialty</label>
            <select className="form-select" value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
              <option value="ALL">All Medical Specialties</option>
              <option value="Emergency Services">Emergency Services</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Cardiology">Cardiology / Cardiac Care</option>
              <option value="Trauma Surgery">Trauma & Orthopedics</option>
              <option value="Maternity">Maternity & Child Health</option>
              <option value="Intensive Care">Intensive Care (ICU)</option>
              <option value="Pediatrics">Pediatrics</option>
            </select>
          </div>
        </div>
      </div>

      {/* Facilities Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading Smart Health Grid Facilities...
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ marginBottom: '14px' }} />
          <h3>No Facilities Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search query or filter selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3">
          {filteredFacilities.map((f) => {
            const fTypeStr = (f.type || '').toUpperCase();
            const badgeClass = (fTypeStr === 'TERTIARY' || fTypeStr === 'HOSPITAL') 
              ? 'badge-purple' 
              : (fTypeStr === 'SECONDARY' || fTypeStr === 'CHC') 
                ? 'badge-info' 
                : 'badge-low';

            return (
              <div key={f.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                    <span className={`badge ${badgeClass}`}>
                      {fTypeStr}
                    </span>
                    {getLoadBadge(f.available_icu_beds, f.total_icu_beds)}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', lineHeight: '1.3' }}>{f.name}</h3>

                  <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
                    <MapPin size={14} color="#2563EB" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.address || 'Smart Health Grid Hub'}
                    </span>
                  </div>

                  {/* Capacity Stats Pills */}
                  <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                    <div className="grid grid-cols-3" style={{ textAlign: 'center', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Gen Beds</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          {f.available_general_beds ?? 0}/{f.total_general_beds ?? 0}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>ICU Beds</span>
                        <strong style={{ fontSize: '1.05rem', color: '#059669' }}>
                          {f.available_icu_beds ?? 0}/{f.total_icu_beds ?? 0}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Ventilators</span>
                        <strong style={{ fontSize: '1.05rem', color: '#2563EB' }}>
                          {f.ventilator_count ?? 0}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Specialties Tags */}
                  {f.specialties && f.specialties.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                        Specialty Capabilities:
                      </span>
                      <div className="flex" style={{ flexWrap: 'wrap', gap: '5px' }}>
                        {f.specialties.map((spec, i) => (
                          <span key={i} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', color: '#475569' }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isPatient ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${f.location_lat},${f.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apollo-dash-btn-primary"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem', justifyContent: 'center', textDecoration: 'none' }}
                    >
                      <Navigation size={13} /> GPS Route
                    </a>
                    <button
                      onClick={() => navigate('/checkin', { state: { targetFacility: f.name } })}
                      className="apollo-dash-btn-secondary"
                      style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                    >
                      Check-In
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/referrals', { state: { targetFacilityId: f.id, targetFacilityName: f.name } })}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: '12px' }}
                  >
                    <ArrowRightLeft size={15} /> Route Patient Referral Here
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating New Facility */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', items: 'center', gap: '8px' }}>
              <Building2 color="#06b6d4" /> Register New Healthcare Facility
            </h2>

            <form onSubmit={handleCreateFacility}>
              <div className="form-group">
                <label className="form-label">Facility Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Indore Emergency Care Hospital"
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2" style={{ gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Facility Tier</label>
                  <select
                    className="form-select"
                    value={newFacility.type}
                    onChange={(e) => setNewFacility({ ...newFacility, type: e.target.value })}
                  >
                    <option value="PRIMARY">PRIMARY Clinic / PHC</option>
                    <option value="SECONDARY">SECONDARY Hospital / CHC</option>
                    <option value="TERTIARY">TERTIARY Medical Center</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 731 2550199"
                    value={newFacility.phone}
                    onChange={(e) => setNewFacility({ ...newFacility, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Residency Area, AB Road, Indore, MP 452001"
                  value={newFacility.address}
                  onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                />
              </div>


              <div className="grid grid-cols-3" style={{ gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Total Gen Beds</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newFacility.total_general_beds}
                    onChange={(e) => setNewFacility({ ...newFacility, total_general_beds: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Available Gen Beds</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newFacility.available_general_beds}
                    onChange={(e) => setNewFacility({ ...newFacility, available_general_beds: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Available ICU Beds</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newFacility.available_icu_beds}
                    onChange={(e) => setNewFacility({ ...newFacility, available_icu_beds: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex gap-4" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
