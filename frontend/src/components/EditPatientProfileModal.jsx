import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { patientService, digiYatraService } from '../services/api';
import { 
  X, 
  User, 
  Droplet, 
  Calendar, 
  Heart, 
  Watch, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import '../styles/DashboardApollo.css';

export const EditPatientProfileModal = ({ isOpen, onClose, initialData, onSaved }) => {
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Female');
  const [wearableId, setWearableId] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFullName(initialData?.full_name || user?.full_name || '');
      setBloodGroup(initialData?.blood_group || 'O+');
      
      // Format DOB to YYYY-MM-DD
      if (initialData?.date_of_birth) {
        try {
          const d = new Date(initialData.date_of_birth);
          const iso = d.toISOString().split('T')[0];
          setDob(iso);
        } catch {
          setDob('');
        }
      } else {
        setDob('1997-07-11');
      }

      setGender(initialData?.gender || 'Female');
      setWearableId(initialData?.wearable_device_id || 'Wearable HUD Connected');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialData, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        full_name: fullName.trim(),
        blood_group: bloodGroup,
        date_of_birth: dob ? `${dob}T00:00:00Z` : null,
        gender: gender,
        wearable_device_id: wearableId.trim() || null,
      };

      const updatedProfile = await digiYatraService.updateProfile(payload);

      // Update AuthContext user state so navbar and welcome headers update immediately
      if (updateUser) {
        updateUser({ full_name: fullName.trim() });
      }

      // Broadcast event so all components on the page re-sync immediately
      window.dispatchEvent(
        new CustomEvent('patient_profile_updated', {
          detail: {
            ...initialData,
            ...updatedProfile,
            full_name: fullName.trim(),
            blood_group: bloodGroup,
            date_of_birth: dob ? `${dob}T00:00:00Z` : null,
            gender: gender,
            wearable_device_id: wearableId.trim(),
          },
        })
      );

      setSuccessMsg('Profile updated successfully across the Health Grid!');

      if (onSaved) {
        onSaved({
          ...initialData,
          ...updatedProfile,
          full_name: fullName.trim(),
          blood_group: bloodGroup,
          date_of_birth: dob ? `${dob}T00:00:00Z` : null,
          gender: gender,
          wearable_device_id: wearableId.trim(),
        });
      }

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating patient profile:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="apollo-profile-modal-backdrop" onClick={onClose}>
      <div 
        className="apollo-profile-modal-card" 
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="apollo-profile-modal-header">
          <div className="apollo-profile-modal-title">
            <ShieldCheck size={18} color="#2563EB" />
            <span>Edit Patient Profile Details</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="apollo-profile-close-btn"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="apollo-profile-modal-body">
          {/* Medi-Connect Identity Notice */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase' }}>
                Medi-Connect Health ID (Fixed)
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 800, color: '#1E40AF' }}>
                {initialData?.medi_connect_id || 'MC-69782'}
              </div>
            </div>
            <span className="apollo-role-tag patient" style={{ fontSize: '0.65rem' }}>
              VERIFIED CITIZEN
            </span>
          </div>

          {errorMsg && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="apollo-form-group">
            <label className="apollo-form-label">
              <User size={13} color="#2563EB" />
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Amaira Maharaj"
              className="apollo-form-input"
            />
          </div>

          {/* Blood Group & Gender */}
          <div className="apollo-form-row">
            <div className="apollo-form-group">
              <label className="apollo-form-label">
                <Droplet size={13} color="#DC2626" />
                <span>Blood Group *</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="apollo-form-select"
              >
                <option value="A+">A+ (Positive)</option>
                <option value="A-">A- (Negative)</option>
                <option value="B+">B+ (Positive)</option>
                <option value="B-">B- (Negative)</option>
                <option value="AB+">AB+ (Positive)</option>
                <option value="AB-">AB- (Negative)</option>
                <option value="O+">O+ (Positive)</option>
                <option value="O-">O- (Negative)</option>
              </select>
            </div>

            <div className="apollo-form-group">
              <label className="apollo-form-label">
                <User size={13} color="#64748B" />
                <span>Gender *</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="apollo-form-select"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Date of Birth & Wearable Sync */}
          <div className="apollo-form-row">
            <div className="apollo-form-group">
              <label className="apollo-form-label">
                <Calendar size={13} color="#059669" />
                <span>Date of Birth *</span>
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="apollo-form-input"
              />
            </div>

            <div className="apollo-form-group">
              <label className="apollo-form-label">
                <Watch size={13} color="#7C3AED" />
                <span>Wearable Device Sync</span>
              </label>
              <input
                type="text"
                value={wearableId}
                onChange={(e) => setWearableId(e.target.value)}
                placeholder="Device Name / ID"
                className="apollo-form-input"
              />
            </div>
          </div>

          <div style={{
            background: '#F8FAFC',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.74rem',
            color: '#64748B',
            lineHeight: '1.4',
            marginBottom: '20px',
            border: '1px solid #E2E8F0',
          }}>
            <strong>ABDM Data Integrity: </strong> Saving updates your sovereign Digital Health Passport across all verified hospital check-in terminals instantly.
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="apollo-dash-btn-secondary"
              style={{ padding: '9px 18px', fontSize: '0.84rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="apollo-dash-btn-primary"
              style={{ padding: '9px 22px', fontSize: '0.84rem' }}
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPatientProfileModal;
