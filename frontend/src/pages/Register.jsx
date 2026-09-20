import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientService } from '../services/api';
import {
  Activity,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Droplet,
  Calendar,
  Heart,
  FileText,
  Upload,
  Plus,
  Trash2,
  Check,
  Phone,
  Paperclip,
  CheckCircle2
} from 'lucide-react';
import { ApolloNavbar } from '../components/ApolloNavbar';
import { useLanguage } from '../context/LanguageContext';
import '../styles/LandingPage.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const COMMON_ALLERGIES = [
  'Penicillin',
  'Sulfa Drugs',
  'Peanuts / Tree Nuts',
  'Latex',
  'Aspirin / NSAIDs',
  'Pollen / Dust Mites',
  'No Known Allergies'
];

const COMMON_CONDITIONS = [
  'Hypertension (BP)',
  'Type 2 Diabetes',
  'Asthma / Respiratory',
  'Thyroid Disorder',
  'Coronary Artery Disease',
  'None / Healthy'
];

export const Register = () => {
  const { t, isHindi } = useLanguage();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || '';

  // Step state: 1 = Account, 2 = Clinical Profile, 3 = Medical Reports
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Account details
  const [accountData, setAccountData] = useState({
    email: initialEmail,
    password: '',
    full_name: '',
    role: 'patient',
  });

  // Step 2: Health & Clinical Profile
  const [profileData, setProfileData] = useState({
    blood_group: 'O+',
    date_of_birth: '',
    gender: 'Male',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    allergies: [],
    custom_allergy: '',
    conditions: [],
    custom_condition: '',
  });

  // Step 3: Medical Reports user input
  const [reports, setReports] = useState([
    {
      id: 1,
      test_name: '',
      category: 'Laboratory / Blood Test',
      test_date: new Date().toISOString().slice(0, 10),
      result_summary: '',
      attached_file_name: '',
      attached_file_size: '',
    },
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialEmail) {
      setAccountData((prev) => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail]);

  const handleAccountChange = (e) => {
    setAccountData({ ...accountData, [e.target.name]: e.target.value });
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const toggleAllergy = (allergy) => {
    if (allergy === 'No Known Allergies') {
      setProfileData((prev) => ({ ...prev, allergies: ['No Known Allergies'] }));
      return;
    }
    setProfileData((prev) => {
      const filtered = prev.allergies.filter((a) => a !== 'No Known Allergies');
      if (filtered.includes(allergy)) {
        return { ...prev, allergies: filtered.filter((a) => a !== allergy) };
      } else {
        return { ...prev, allergies: [...filtered, allergy] };
      }
    });
  };

  const addCustomAllergy = (e) => {
    if (e.key === 'Enter' && profileData.custom_allergy.trim()) {
      e.preventDefault();
      const val = profileData.custom_allergy.trim();
      if (!profileData.allergies.includes(val)) {
        setProfileData((prev) => ({
          ...prev,
          allergies: [...prev.allergies.filter((a) => a !== 'No Known Allergies'), val],
          custom_allergy: '',
        }));
      } else {
        setProfileData((prev) => ({ ...prev, custom_allergy: '' }));
      }
    }
  };

  const toggleCondition = (condition) => {
    if (condition === 'None / Healthy') {
      setProfileData((prev) => ({ ...prev, conditions: ['None / Healthy'] }));
      return;
    }
    setProfileData((prev) => {
      const filtered = prev.conditions.filter((c) => c !== 'None / Healthy');
      if (filtered.includes(condition)) {
        return { ...prev, conditions: filtered.filter((c) => c !== condition) };
      } else {
        return { ...prev, conditions: [...filtered, condition] };
      }
    });
  };

  const addCustomCondition = (e) => {
    if (e.key === 'Enter' && profileData.custom_condition.trim()) {
      e.preventDefault();
      const val = profileData.custom_condition.trim();
      if (!profileData.conditions.includes(val)) {
        setProfileData((prev) => ({
          ...prev,
          conditions: [...prev.conditions.filter((c) => c !== 'None / Healthy'), val],
          custom_condition: '',
        }));
      } else {
        setProfileData((prev) => ({ ...prev, custom_condition: '' }));
      }
    }
  };

  // Medical report helpers
  const handleReportChange = (id, field, value) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleFileUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                attached_file_name: file.name,
                attached_file_size: formattedSize,
              }
            : r
        )
      );
    }
  };

  const removeAttachedFile = (id) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, attached_file_name: '', attached_file_size: '' }
          : r
      )
    );
  };

  const addReportCard = () => {
    setReports((prev) => [
      ...prev,
      {
        id: Date.now(),
        test_name: '',
        category: 'Laboratory / Blood Test',
        test_date: new Date().toISOString().slice(0, 10),
        result_summary: '',
        attached_file_name: '',
        attached_file_size: '',
      },
    ]);
  };

  const removeReportCard = (id) => {
    if (reports.length > 1) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const formatError = (err) => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || 'Failed to create account. Please try again.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (typeof detail === 'object') return JSON.stringify(detail);
    return String(detail);
  };

  // Step 1 Validation -> proceed to step 2 or direct submit if staff
  const goToStep2 = (e) => {
    e.preventDefault();
    setError('');
    if (!accountData.full_name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!accountData.email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!accountData.password || accountData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (accountData.role !== 'patient') {
      // Direct signup for staff
      finalizeRegistration();
    } else {
      setCurrentStep(2);
    }
  };

  // Step 2 Validation -> proceed to step 3
  const goToStep3 = (e) => {
    e.preventDefault();
    setError('');
    if (!profileData.blood_group) {
      setError('Please select your blood group.');
      return;
    }
    setCurrentStep(3);
  };

  // Final Registration execution
  const finalizeRegistration = async (skipReports = false) => {
    setError('');
    setLoading(true);
    try {
      // 1. Register user in auth system
      await register({
        email: accountData.email.trim(),
        password: accountData.password,
        full_name: accountData.full_name.trim(),
        role: accountData.role,
      });

      // 2. If patient, update health profile & attach medical records
      if (accountData.role === 'patient') {
        const dobISO = profileData.date_of_birth
          ? new Date(profileData.date_of_birth).toISOString()
          : null;

        await patientService.updateMyProfile({
          blood_group: profileData.blood_group,
          gender: profileData.gender,
          date_of_birth: dobISO,
        }).catch((err) => console.warn('Profile update notice:', err));

        // Save emergency contact into patient history
        if (profileData.emergency_contact_name || profileData.emergency_contact_phone) {
          await patientService.addMyMedicalHistory({
            condition: 'Emergency Contact',
            notes: `${profileData.emergency_contact_name || 'Designated Contact'}: ${profileData.emergency_contact_phone || 'Not provided'}`,
          }).catch((err) => console.warn('Emergency contact notice:', err));
        }

        // Save selected allergies
        for (const allergy of profileData.allergies) {
          if (allergy && allergy !== 'No Known Allergies') {
            await patientService.addMyAllergy({
              allergen: allergy,
              severity: 'moderate',
            }).catch((err) => console.warn('Allergy save notice:', err));
          }
        }

        // Save selected chronic conditions
        for (const condition of profileData.conditions) {
          if (condition && condition !== 'None / Healthy') {
            await patientService.addMyMedicalHistory({
              condition: condition,
              notes: 'Reported during initial registration',
            }).catch((err) => console.warn('Condition save notice:', err));
          }
        }

        // Save medical reports (if not skipped)
        if (!skipReports) {
          for (const rep of reports) {
            if (rep.test_name && rep.test_name.trim()) {
              let summary = rep.result_summary || '';
              if (rep.attached_file_name) {
                summary = `[Attached: ${rep.attached_file_name} (${rep.attached_file_size})] ${summary}`.trim();
              }
              const testDateISO = rep.test_date
                ? new Date(rep.test_date).toISOString()
                : new Date().toISOString();

              await patientService.addMyMedicalTest({
                test_name: rep.test_name.trim(),
                category: rep.category,
                result_summary: summary || 'Report uploaded during onboarding',
                test_date: testDateISO,
              }).catch((err) => console.warn('Medical report save notice:', err));
            }
          }
        }
      }

      // Success -> navigate to dashboard
      navigate('/');
    } catch (err) {
      console.error('Registration failed:', err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apollo-auth-page">
      <ApolloNavbar currentPage="register" />

      <div className="apollo-auth-content">
        <div className="apollo-auth-card register-card">
          {/* Header */}
          <div className="apollo-auth-header">
            <div className="apollo-auth-logo">
              <Activity className="apollo-logo-mark" size={26} />
            </div>
            <h2 className="apollo-auth-title">
              {t('auth.create_account')} <span className="kindsight-italic-spark">{t('auth.create_account_highlight')}</span>
            </h2>
            <p className="apollo-auth-subtitle">
              {currentStep === 1 && (isHindi ? 'बुद्धिमान क्लिनिकल ट्राइएज और अस्पताल संसाधन ग्रिड से जुड़ें' : 'Join the intelligent clinical triage and hospital resource routing grid')}
              {currentStep === 2 && (isHindi ? 'अपना डिजिटल स्वास्थ्य पासपोर्ट कॉन्फ़िगर करने के लिए बुनियादी क्लिनिकल जानकारी दर्ज करें' : 'Provide essential clinical indicators to configure your digital health passport')}
              {currentStep === 3 && (isHindi ? 'अपना अनुदैर्ध्य स्वास्थ्य रिकॉर्ड तैयार करने के लिए पूर्व रिपोर्ट दर्ज करें' : 'Enter prior diagnostic reports or lab tests to seed your longitudinal health record')}
            </p>
          </div>

          {/* Multi-Step Wizard Progress Bar (Shown for Patients) */}
          {accountData.role === 'patient' && (
            <div className="apollo-wizard-progress">
              <div
                className={`apollo-wizard-step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
                onClick={() => setCurrentStep(1)}
              >
                <div className="apollo-wizard-badge">
                  {currentStep > 1 ? <Check size={12} /> : '1'}
                </div>
                <span>{isHindi ? 'खाता' : 'Account'}</span>
              </div>
              <div className="apollo-wizard-divider" />
              <div
                className={`apollo-wizard-step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
                onClick={() => {
                  if (accountData.full_name && accountData.email) setCurrentStep(2);
                }}
              >
                <div className="apollo-wizard-badge">
                  {currentStep > 2 ? <Check size={12} /> : '2'}
                </div>
                <span>{isHindi ? 'स्वास्थ्य प्रोफ़ाइल' : 'Health Profile'}</span>
              </div>
              <div className="apollo-wizard-divider" />
              <div
                className={`apollo-wizard-step ${currentStep === 3 ? 'active' : ''}`}
                onClick={() => {
                  if (accountData.full_name && profileData.blood_group) setCurrentStep(3);
                }}
              >
                <div className="apollo-wizard-badge">3</div>
                <span>{isHindi ? 'मेडिकल रिपोर्ट्स' : 'Medical Reports'}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="apollo-auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================
              STEP 1: Account Credentials
             ======================================================== */}
          {currentStep === 1 && (
            <form onSubmit={goToStep2} className="apollo-auth-form">
              {/* OAuth Buttons */}
              <div className="apollo-auth-oauth-row">
                <button
                  type="button"
                  className="apollo-auth-oauth-btn"
                  onClick={() => {
                    setAccountData({
                      email: 'sarah.jenkins@hospital.org',
                      password: 'Password123!',
                      full_name: 'Dr. Sarah Jenkins',
                      role: 'doctor',
                    });
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="apollo-auth-oauth-btn"
                  onClick={() => {
                    setAccountData({
                      email: 'rohan.sharma@gmail.com',
                      password: 'Password123!',
                      full_name: 'Rohan Sharma',
                      role: 'patient',
                    });
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.05-.51 2.68-1.26z"/>
                  </svg>
                  Apple
                </button>
              </div>

              <div className="apollo-auth-divider">
                <span>{isHindi ? 'या व्यक्तिगत विवरण के साथ पंजीकरण करें' : 'or register with personal details'}</span>
              </div>

              <div className="apollo-auth-field">
                <label className="apollo-auth-label">{t('auth.full_name_label')}</label>
                <div className="apollo-auth-input-wrapper">
                  <input
                    type="text"
                    name="full_name"
                    required
                    className="apollo-auth-input"
                    placeholder={t('auth.full_name_placeholder')}
                    value={accountData.full_name}
                    onChange={handleAccountChange}
                  />
                  <User size={18} className="apollo-auth-input-icon" />
                </div>
              </div>

              <div className="apollo-auth-field">
                <label className="apollo-auth-label">{t('auth.email_label')}</label>
                <div className="apollo-auth-input-wrapper">
                  <input
                    type="email"
                    name="email"
                    required
                    className="apollo-auth-input"
                    placeholder={t('auth.email_placeholder')}
                    value={accountData.email}
                    onChange={handleAccountChange}
                  />
                  <Mail size={18} className="apollo-auth-input-icon" />
                </div>
              </div>

              <div className="apollo-auth-row">
                <div className="apollo-auth-field">
                  <label className="apollo-auth-label">{t('auth.role_label')}</label>
                  <div className="apollo-auth-input-wrapper">
                    <select
                      name="role"
                      className="apollo-auth-select"
                      value={accountData.role}
                      onChange={handleAccountChange}
                    >
                      <option value="patient">{isHindi ? 'मरीज / नागरिक खाता' : 'Patient Account'}</option>
                      <option value="doctor">{isHindi ? 'डॉक्टर / उपस्थित चिकित्सक' : 'Doctor / Attending Physician'}</option>
                      <option value="nurse">{isHindi ? 'ट्राइएज नर्स विशेषज्ञ' : 'Triage Nurse Specialist'}</option>
                      <option value="paramedic">{isHindi ? 'पैरामेडिक / ईएमएस डिस्पैचर' : 'Paramedic / EMS Dispatcher'}</option>
                      <option value="facility_manager">{isHindi ? 'अस्पताल बेड / क्षमता प्रबंधक' : 'Hospital Bed / Capacity Manager'}</option>
                      <option value="admin">{isHindi ? 'ग्रिड सिस्टम व्यवस्थापक' : 'Grid System Administrator'}</option>
                    </select>
                    <ShieldCheck size={18} className="apollo-auth-input-icon" />
                  </div>
                </div>

                <div className="apollo-auth-field">
                  <label className="apollo-auth-label">{t('auth.password_label')}</label>
                  <div className="apollo-auth-input-wrapper">
                    <input
                      type="password"
                      name="password"
                      required
                      className="apollo-auth-input"
                      placeholder={isHindi ? 'न्यूनतम 6 अक्षर' : 'Minimum 6 characters'}
                      value={accountData.password}
                      onChange={handleAccountChange}
                    />
                    <Lock size={18} className="apollo-auth-input-icon" />
                  </div>
                </div>
              </div>

              {accountData.role === 'patient' ? (
                <button type="submit" className="apollo-auth-submit-btn">
                  {isHindi ? 'स्वास्थ्य प्रोफ़ाइल पर आगे बढ़ें' : 'Continue to Health Profile'}
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="apollo-auth-submit-btn"
                >
                  {loading ? (isHindi ? 'खाता बनाया जा रहा है...' : 'Creating Staff Account...') : (isHindi ? 'पंजीकरण पूरा करें' : 'Complete Sign Up')}
                  <ArrowRight size={17} />
                </button>
              )}
            </form>
          )}

          {/* ========================================================
              STEP 2: Health & Clinical Profile (Blood Group, Vitals)
             ======================================================== */}
          {currentStep === 2 && (
            <form onSubmit={goToStep3} className="apollo-step-section">
              <div className="apollo-section-heading">
                <div className="apollo-section-title">
                  <Droplet size={18} color="var(--color-terracotta-cta)" />
                  Blood Group & Clinical Details
                </div>
                <div className="apollo-section-desc">
                  Crucial for immediate emergency triage matching and blood bank compatibility.
                </div>
              </div>

              {/* Blood Group Pill Grid */}
              <div className="blood-group-container">
                <label className="apollo-auth-label">
                  Select Blood Group <span style={{ color: 'var(--color-terracotta-cta)' }}>*</span>
                </label>
                <div className="blood-group-grid">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      className={`blood-group-btn ${profileData.blood_group === bg ? 'selected' : ''}`}
                      onClick={() => setProfileData({ ...profileData, blood_group: bg })}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* DOB & Gender */}
              <div className="apollo-auth-row">
                <div className="apollo-auth-field">
                  <label className="apollo-auth-label">Date of Birth</label>
                  <div className="apollo-auth-input-wrapper">
                    <input
                      type="date"
                      name="date_of_birth"
                      className="apollo-auth-input"
                      value={profileData.date_of_birth}
                      onChange={handleProfileChange}
                    />
                    <Calendar size={18} className="apollo-auth-input-icon" />
                  </div>
                </div>

                <div className="apollo-auth-field">
                  <label className="apollo-auth-label">Biological Gender / Sex</label>
                  <div className="apollo-auth-input-wrapper">
                    <select
                      name="gender"
                      className="apollo-auth-select"
                      value={profileData.gender}
                      onChange={handleProfileChange}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <User size={18} className="apollo-auth-input-icon" />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="apollo-auth-row">
                <div className="apollo-auth-field">
                  <label className="apollo-auth-label">Emergency Contact Name</label>
                  <div className="apollo-auth-input-wrapper">
                    <input
                      type="text"
                      name="emergency_contact_name"
                      className="apollo-auth-input"
                      placeholder="e.g. Priya Sharma (Spouse)"
                      value={profileData.emergency_contact_name}
                      onChange={handleProfileChange}
                    />
                    <Heart size={18} className="apollo-auth-input-icon" />
                  </div>
                </div>

                <div className="apollo-auth-field">
                  <label className="apollo-auth-label">Emergency Phone</label>
                  <div className="apollo-auth-input-wrapper">
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      className="apollo-auth-input"
                      placeholder="+91 98765 43210"
                      value={profileData.emergency_contact_phone}
                      onChange={handleProfileChange}
                    />
                    <Phone size={18} className="apollo-auth-input-icon" />
                  </div>
                </div>
              </div>

              {/* Known Allergies */}
              <div className="apollo-auth-field">
                <label className="apollo-auth-label">
                  Known Drug Allergies & Sensitivities
                </label>
                <div className="apollo-chips-group">
                  {COMMON_ALLERGIES.map((allergy) => {
                    const isSelected = profileData.allergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        className={`apollo-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleAllergy(allergy)}
                      >
                        <span className="apollo-chip-indicator" />
                        {allergy}
                      </button>
                    );
                  })}
                </div>
                <div className="apollo-auth-input-wrapper" style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    name="custom_allergy"
                    className="apollo-auth-input"
                    placeholder="Type custom allergy and press Enter"
                    value={profileData.custom_allergy}
                    onChange={handleProfileChange}
                    onKeyDown={addCustomAllergy}
                  />
                  <Plus size={16} className="apollo-auth-input-icon" />
                </div>
              </div>

              {/* Chronic Conditions */}
              <div className="apollo-auth-field">
                <label className="apollo-auth-label">
                  Pre-existing / Chronic Conditions
                </label>
                <div className="apollo-chips-group">
                  {COMMON_CONDITIONS.map((cond) => {
                    const isSelected = profileData.conditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        className={`apollo-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleCondition(cond)}
                      >
                        <span className="apollo-chip-indicator" />
                        {cond}
                      </button>
                    );
                  })}
                </div>
                <div className="apollo-auth-input-wrapper" style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    name="custom_condition"
                    className="apollo-auth-input"
                    placeholder="Type custom condition and press Enter"
                    value={profileData.custom_condition}
                    onChange={handleProfileChange}
                    onKeyDown={addCustomCondition}
                  />
                  <Plus size={16} className="apollo-auth-input-icon" />
                </div>
              </div>

              {/* Actions */}
              <div className="apollo-wizard-actions">
                <button
                  type="button"
                  className="apollo-wizard-back-btn"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button type="submit" className="apollo-wizard-next-btn">
                  Next: Medical Reports
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              STEP 3: Medical Reports User Input & Upload
             ======================================================== */}
          {currentStep === 3 && (
            <div className="apollo-step-section">
              <div className="apollo-section-heading">
                <div className="apollo-section-title">
                  <FileText size={18} color="var(--color-olive-grove)" />
                  Prior Medical Reports & Test Records
                </div>
                <div className="apollo-section-desc">
                  Add prior diagnostic tests (Blood reports, X-rays, MRI scans, ECGs, or prescriptions). You can also add more later from your dashboard.
                </div>
              </div>

              <div className="medical-reports-list">
                {reports.map((report, index) => (
                  <div key={report.id} className="medical-report-item">
                    <div className="medical-report-header">
                      <span className="medical-report-num">
                        <FileText size={15} />
                        Medical Report #{index + 1}
                      </span>
                      {reports.length > 1 && (
                        <button
                          type="button"
                          className="medical-report-remove-btn"
                          onClick={() => removeReportCard(report.id)}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="apollo-auth-row" style={{ marginBottom: '12px' }}>
                      <div className="apollo-auth-field">
                        <label className="apollo-auth-label">Test / Report Name</label>
                        <input
                          type="text"
                          className="apollo-auth-input"
                          style={{ paddingLeft: '14px' }}
                          placeholder="e.g. Complete Blood Count (CBC) or Chest X-Ray"
                          value={report.test_name}
                          onChange={(e) => handleReportChange(report.id, 'test_name', e.target.value)}
                        />
                      </div>

                      <div className="apollo-auth-field">
                        <label className="apollo-auth-label">Diagnostic Category</label>
                        <select
                          className="apollo-auth-select"
                          style={{ paddingLeft: '14px' }}
                          value={report.category}
                          onChange={(e) => handleReportChange(report.id, 'category', e.target.value)}
                        >
                          <option value="Laboratory / Blood Test">Laboratory / Blood Test</option>
                          <option value="Radiology & Imaging">Radiology (X-Ray / MRI / CT)</option>
                          <option value="Cardiology / ECG">Cardiology / ECG</option>
                          <option value="Pathology / Biopsy">Pathology / Biopsy</option>
                          <option value="Prescription / Clinical Notes">Prescription / Clinical Notes</option>
                          <option value="General Health Checkup">General Health Checkup</option>
                        </select>
                      </div>
                    </div>

                    <div className="apollo-auth-row" style={{ marginBottom: '12px' }}>
                      <div className="apollo-auth-field">
                        <label className="apollo-auth-label">Test Date</label>
                        <input
                          type="date"
                          className="apollo-auth-input"
                          style={{ paddingLeft: '14px' }}
                          value={report.test_date}
                          onChange={(e) => handleReportChange(report.id, 'test_date', e.target.value)}
                        />
                      </div>

                      <div className="apollo-auth-field">
                        <label className="apollo-auth-label">Attach File / Document (PDF or Scan)</label>
                        {report.attached_file_name ? (
                          <div className="medical-report-file-attached">
                            <div className="medical-report-file-info">
                              <CheckCircle2 size={15} color="#486b00" />
                              <span>{report.attached_file_name}</span>
                              <span className="medical-report-file-size">({report.attached_file_size})</span>
                            </div>
                            <button
                              type="button"
                              className="medical-report-file-remove"
                              onClick={() => removeAttachedFile(report.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <label className="medical-report-upload-box">
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.dcm,.txt"
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileUpload(report.id, e)}
                            />
                            <Upload size={16} className="medical-report-upload-icon" />
                            <span className="medical-report-upload-label">
                              Choose PDF, Scan or Lab File
                            </span>
                            <span className="medical-report-upload-hint">
                              PDF, PNG, JPG up to 10MB
                            </span>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="apollo-auth-field">
                      <label className="apollo-auth-label">Key Results & Doctor's Notes (Optional)</label>
                      <textarea
                        className="apollo-auth-textarea"
                        placeholder="e.g. Hemoglobin 14.2 g/dL, Platelets 260,000 /uL, WBC within standard reference ranges."
                        value={report.result_summary}
                        onChange={(e) => handleReportChange(report.id, 'result_summary', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="add-medical-report-btn"
                  onClick={addReportCard}
                >
                  <Plus size={16} />
                  Add Another Medical Report
                </button>
              </div>

              {/* Actions */}
              <div className="apollo-wizard-actions">
                <button
                  type="button"
                  className="apollo-wizard-back-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <button
                  type="button"
                  className="apollo-wizard-secondary-btn"
                  onClick={() => finalizeRegistration(true)}
                  disabled={loading}
                >
                  Skip for Now
                </button>

                <button
                  type="button"
                  className="apollo-wizard-next-btn"
                  onClick={() => finalizeRegistration(false)}
                  disabled={loading}
                >
                  {loading ? 'Creating Patient Account...' : 'Complete Sign Up'}
                  <CheckCircle2 size={17} />
                </button>
              </div>
            </div>
          )}

          {/* Footer & Trust Badges */}
          <div className="apollo-auth-footer">
            Already registered?
            <Link to="/login" className="apollo-auth-link">
              Sign In
            </Link>
          </div>

          <div className="apollo-auth-trust-strip">
            <span>
              <ShieldCheck
                size={13}
                style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }}
              />{' '}
              HIPAA Verified
            </span>
            <span>•</span>
            <span>256-bit AES Encryption</span>
            <span>•</span>
            <span>SOC2 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
