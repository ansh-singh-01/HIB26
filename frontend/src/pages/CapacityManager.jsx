import React, { useState, useEffect } from 'react';
import { facilityService } from '../services/api';
import { 
  Sliders, 
  Building2, 
  BedDouble, 
  HeartPulse, 
  Wind, 
  CheckCircle2, 
  AlertCircle,
  Save
} from 'lucide-react';

export const CapacityManager = () => {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [capacityForm, setCapacityForm] = useState({
    total_general_beds: 0,
    available_general_beds: 0,
    total_icu_beds: 0,
    available_icu_beds: 0,
    ventilator_count: 0,
  });

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await facilityService.getFacilities();
      const facList = Array.isArray(data) ? data : [];
      setFacilities(facList);
      if (facList.length > 0) {
        selectFacility(facList[0]);
      }
    } catch (err) {
      console.error('Failed to load facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectFacility = (fac) => {
    setSelectedFacilityId(fac.id);
    setCapacityForm({
      total_general_beds: fac.total_general_beds || 50,
      available_general_beds: fac.available_general_beds || 10,
      total_icu_beds: fac.total_icu_beds || 10,
      available_icu_beds: fac.available_icu_beds || 2,
      ventilator_count: fac.ventilator_count || 4,
    });
  };

  const handleFacilitySelectChange = (e) => {
    const id = e.target.value;
    const fac = facilities.find(f => f.id === id);
    if (fac) {
      selectFacility(fac);
    }
  };

  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    if (!selectedFacilityId) return;
    setSaving(true);
    setMessage('');
    try {
      await facilityService.updateCapacity(selectedFacilityId, capacityForm);
      setMessage('Hospital bed & ICU capacity successfully updated in real time!');
      loadFacilities();
    } catch (err) {
      console.error('Failed to update capacity:', err);
      setMessage('Error updating capacity. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedFac = facilities.find(f => f.id === selectedFacilityId);

  return (
    <div className="container" style={{ maxWidth: '840px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', items: 'center', gap: '10px' }}>
          <Sliders color="#06b6d4" /> Hospital Capacity Manager
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Real-time portal for hospital admins to update general bed, ICU bed, and ventilator availability.
        </p>
      </div>

      {message && (
        <div style={{
          background: message.includes('successfully') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: message.includes('successfully') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
          color: message.includes('successfully') ? '#34d399' : '#fb7185',
          padding: '14px 18px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={20} />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading facility capacity records...
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Select Healthcare Facility to Manage</label>
            <select
              className="form-select"
              value={selectedFacilityId}
              onChange={handleFacilitySelectChange}
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.type} TIER - {f.address || 'Smart Health Grid Hub'})
                </option>
              ))}
            </select>
          </div>

          {selectedFac && (
            <form onSubmit={handleUpdateCapacity}>
              <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', display: 'block', marginBottom: '16px', letterSpacing: '0.04em' }}>
                  General Ward Capacity
                </span>

                <div className="grid grid-cols-2" style={{ gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label flex items-center gap-1">
                      <BedDouble size={16} color="#2563EB" /> Total General Beds
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={capacityForm.total_general_beds}
                      onChange={(e) => setCapacityForm({ ...capacityForm, total_general_beds: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label flex items-center gap-1">
                      <BedDouble size={16} color="#059669" /> Available General Beds
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={capacityForm.available_general_beds}
                      onChange={(e) => setCapacityForm({ ...capacityForm, available_general_beds: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', display: 'block', marginBottom: '16px', letterSpacing: '0.04em' }}>
                  Intensive Care Unit (ICU) & Life Support
                </span>

                <div className="grid grid-cols-3" style={{ gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label flex items-center gap-1">
                      <HeartPulse size={16} color="#f43f5e" /> Total ICU Beds
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={capacityForm.total_icu_beds}
                      onChange={(e) => setCapacityForm({ ...capacityForm, total_icu_beds: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label flex items-center gap-1">
                      <HeartPulse size={16} color="#10b981" /> Available ICU Beds
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={capacityForm.available_icu_beds}
                      onChange={(e) => setCapacityForm({ ...capacityForm, available_icu_beds: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label flex items-center gap-1">
                      <Wind size={16} color="#38bdf8" /> Ventilators Count
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={capacityForm.ventilator_count}
                      onChange={(e) => setCapacityForm({ ...capacityForm, ventilator_count: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
              >
                <Save size={20} />
                <span>{saving ? 'Updating Capacity...' : 'Publish Live Capacity Update'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
