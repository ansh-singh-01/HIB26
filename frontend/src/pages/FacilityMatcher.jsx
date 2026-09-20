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
  ShieldCheck,
  Locate,
  Compass,
  Radio,
  Clock
} from 'lucide-react';
import {
  getCurrentGPSCoordinates,
  haversineDistanceKm,
  getDrivingETA,
  getGoogleMapsNavUrl,
  INDORE_LANDMARK_PRESETS,
  INDORE_DEFAULT_LAT,
  INDORE_DEFAULT_LNG
} from '../utils/geo';

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

  // GPS User Location State
  const [userLocation, setUserLocation] = useState({
    lat: INDORE_DEFAULT_LAT,
    lng: INDORE_DEFAULT_LNG,
    name: 'Indore Central (Rajwada)',
    isLiveGPS: false,
    accuracy: null,
  });
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState('');
  const [sortByDistance, setSortByDistance] = useState(true);

  // New facility form
  const [newFacility, setNewFacility] = useState({
    name: '',
    type: 'PRIMARY',
    location_lat: INDORE_DEFAULT_LAT,
    location_lng: INDORE_DEFAULT_LNG,
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

  // Live GPS Geolocation Trigger
  const handleDetectLiveGPS = async () => {
    setGpsDetecting(true);
    setGpsStatusMessage('Acquiring high-accuracy GPS coordinates...');
    try {
      const coords = await getCurrentGPSCoordinates();
      setUserLocation({
        lat: coords.latitude,
        lng: coords.longitude,
        name: 'My Device Live GPS',
        isLiveGPS: true,
        accuracy: coords.accuracy,
      });
      setGpsStatusMessage(`GPS Locked! Accuracy ±${coords.accuracy}m`);
      setTimeout(() => setGpsStatusMessage(''), 5000);
    } catch (err) {
      console.warn('GPS Error:', err.message);
      setGpsStatusMessage(err.message);
      setTimeout(() => setGpsStatusMessage(''), 6000);
    } finally {
      setGpsDetecting(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setUserLocation({
      lat: preset.lat,
      lng: preset.lng,
      name: `${preset.name} (${preset.area})`,
      isLiveGPS: false,
      accuracy: null,
    });
    setGpsStatusMessage(`Location updated to ${preset.name}`);
    setTimeout(() => setGpsStatusMessage(''), 3000);
  };

  const handleAcquireFacilityGPS = async () => {
    try {
      const coords = await getCurrentGPSCoordinates();
      setNewFacility(prev => ({
        ...prev,
        location_lat: coords.latitude,
        location_lng: coords.longitude
      }));
    } catch (err) {
      alert('Could not acquire device GPS: ' + err.message);
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

  // Process facilities with distance calculations & sorting
  const processedFacilities = facilities
    .map(f => {
      const distanceKm = haversineDistanceKm(
        userLocation.lat,
        userLocation.lng,
        f.location_lat,
        f.location_lng
      );
      const drivingETA = getDrivingETA(distanceKm);
      return {
        ...f,
        distanceKm,
        drivingETA
      };
    })
    .filter(f => {
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

  if (sortByDistance) {
    processedFacilities.sort((a, b) => {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  const getLoadBadge = (availICU, totalICU) => {
    if (!totalICU) return <span className="badge badge-low">Normal Load</span>;
    const loadRatio = 1 - (availICU / totalICU);
    if (loadRatio > 0.85) return <span className="badge badge-critical">High Capacity Load</span>;
    if (loadRatio > 0.6) return <span className="badge badge-medium">Moderate Load</span>;
    return <span className="badge badge-low flex items-center gap-1"><CheckCircle2 size={12} /> Beds Available</span>;
  };

  return (
    <div className="container">
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 color="#059669" /> Healthcare Facilities & Hospital Network
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time multi-tier hospital capacity grid with live GPS routing and proximity matching.
          </p>
        </div>

        {!isPatient && (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={18} /> Register New Facility
          </button>
        )}
      </div>

      {/* Live GPS Proximity Bar */}
      <div className="glass-card" style={{
        padding: '16px 20px',
        marginBottom: '20px',
        background: userLocation.isLiveGPS ? 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)' : '#FFFFFF',
        border: userLocation.isLiveGPS ? '1px solid #6EE7B7' : '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: userLocation.isLiveGPS ? '#D1FAE5' : '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: userLocation.isLiveGPS ? '#059669' : '#2563EB'
            }}>
              <Compass size={22} className={gpsDetecting ? 'animate-spin' : ''} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Current GPS Origin: {userLocation.name}
                </strong>
                {userLocation.isLiveGPS ? (
                  <span className="badge badge-low flex items-center gap-1" style={{ fontSize: '0.72rem' }}>
                    <Radio size={12} className="animate-pulse" /> Live Device GPS
                  </span>
                ) : (
                  <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>Indore City Grid</span>
                )}
                {userLocation.accuracy && (
                  <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                    (±{userLocation.accuracy}m accuracy)
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Coordinates: {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°E • Driving ETAs & distances dynamically calculated
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDetectLiveGPS}
              disabled={gpsDetecting}
              className="btn btn-primary btn-sm flex items-center gap-1"
              style={{ padding: '8px 14px' }}
            >
              <Locate size={15} className={gpsDetecting ? 'animate-spin' : ''} />
              {gpsDetecting ? 'Acquiring GPS...' : 'Use My Live GPS'}
            </button>

            {/* Quick Landmark Preset Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Presets:</span>
              <select
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.8rem', minWidth: '180px' }}
                value={INDORE_LANDMARK_PRESETS.some(p => p.name.includes(userLocation.name)) ? userLocation.name : ''}
                onChange={(e) => {
                  const preset = INDORE_LANDMARK_PRESETS.find(p => p.name === e.target.value);
                  if (preset) handleSelectPreset(preset);
                }}
              >
                <option value="" disabled>Select Indore Landmark</option>
                {INDORE_LANDMARK_PRESETS.map((p, idx) => (
                  <option key={idx} value={p.name}>
                    {p.name} ({p.area})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSortByDistance(!sortByDistance)}
              className={sortByDistance ? "btn btn-secondary btn-sm" : "btn btn-outline btn-sm"}
              style={{ fontSize: '0.8rem' }}
            >
              {sortByDistance ? '✓ Sorted by Distance' : 'Sort by Distance'}
            </button>
          </div>
        </div>

        {gpsStatusMessage && (
          <div style={{
            marginTop: '10px',
            fontSize: '0.82rem',
            color: gpsStatusMessage.includes('Locked') || gpsStatusMessage.includes('updated') ? '#059669' : '#DC2626',
            fontWeight: 600
          }}>
            {gpsStatusMessage}
          </div>
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
                placeholder="e.g. PHC, CHC, Indore, MYH, Apollo..."
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
      ) : processedFacilities.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ marginBottom: '14px' }} />
          <h3>No Facilities Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search query or filter selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3" style={{ gap: '20px' }}>
          {processedFacilities.map((f) => {
            const fTypeStr = (f.type || '').toUpperCase();
            const badgeClass = (fTypeStr === 'TERTIARY' || fTypeStr === 'HOSPITAL') 
              ? 'badge-purple' 
              : (fTypeStr === 'SECONDARY' || fTypeStr === 'CHC') 
                ? 'badge-info' 
                : 'badge-low';

            const mapsNavUrl = getGoogleMapsNavUrl(
              userLocation.lat,
              userLocation.lng,
              f.location_lat,
              f.location_lng
            );

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

                  <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '10px' }}>
                    <MapPin size={14} color="#2563EB" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.address || 'Smart Health Grid Hub'}
                    </span>
                  </div>

                  {/* Dynamic GPS Distance & Transit ETA Badge */}
                  {f.distanceKm != null && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1D4ED8', fontWeight: 700 }}>
                        <MapPin size={13} />
                        <span>{f.distanceKm} km</span>
                      </div>
                      <span style={{ color: '#93C5FD' }}>•</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                        <Clock size={13} />
                        <span>~{f.drivingETA} mins driving ETA</span>
                      </div>
                    </div>
                  )}

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
                        <strong style={{ fontSize: '1.05rem', color: f.available_icu_beds > 0 ? '#059669' : '#DC2626' }}>
                          {f.available_icu_beds ?? 0}/{f.total_icu_beds ?? 0}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Ventilators</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
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
                      href={mapsNavUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apollo-dash-btn-primary"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem', justifyContent: 'center', textDecoration: 'none' }}
                    >
                      <Navigation size={13} /> GPS Live Route
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => navigate('/referrals', { state: { targetFacilityId: f.id, targetFacilityName: f.name } })}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <ArrowRightLeft size={15} /> Route Referral
                    </button>
                    <a
                      href={mapsNavUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                      title="Open GPS Directions in Google Maps"
                    >
                      <Navigation size={14} color="#2563EB" />
                    </a>
                  </div>
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
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

              {/* GPS Coordinates Section */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Compass size={15} color="#2563EB" /> GPS Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleAcquireFacilityGPS}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    <Locate size={12} /> Acquire Current GPS
                  </button>
                </div>
                <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Latitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={newFacility.location_lat}
                      onChange={(e) => setNewFacility({ ...newFacility, location_lat: parseFloat(e.target.value) || INDORE_DEFAULT_LAT })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Longitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={newFacility.location_lng}
                      onChange={(e) => setNewFacility({ ...newFacility, location_lng: parseFloat(e.target.value) || INDORE_DEFAULT_LNG })}
                    />
                  </div>
                </div>
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
