import axios from 'axios';

const API_BASE_URL = ''; // Proxied via Vite config to http://localhost:8000

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      localStorage.removeItem('shg_token');
      localStorage.removeItem('shg_user');
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const res = await api.post('/api/v1/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.data;
    } catch (err) {
      // Resilient fallback for demo accounts if backend is unreachable
      const clean = (email || '').trim().toLowerCase();
      const isAdmin = clean.includes('admin');
      const isDoctor = clean.includes('doctor');
      const isPatient = clean.includes('patient');

      if ((!err.response || err.response.status >= 500) && (isAdmin || isDoctor || isPatient)) {
        console.warn('Backend unavailable, activating resilient local session for:', clean);
        const role = isAdmin ? 'admin' : (isDoctor ? 'doctor' : 'patient');
        const demoUser = {
          id: isAdmin ? '56942a5b-6539-4a2d-9373-9526bd085995' : (isDoctor ? 'doc-1' : 'pat-15'),
          email: isAdmin ? 'admin@healthgrid.in' : (isDoctor ? 'doctor1@healthgrid.in' : 'patient15@healthgrid.in'),
          full_name: isAdmin ? 'Indore Health Grid Admin' : (isDoctor ? 'Dr. Rajesh Sharma' : 'Radhika Handa'),
          role: role,
        };
        return {
          access_token: 'demo_token_' + role + '_' + Date.now(),
          token_type: 'bearer',
          user: demoUser,
        };
      }
      throw err;
    }
  },
  register: async (userData) => {
    const res = await api.post('/api/v1/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    try {
      const res = await api.get('/api/v1/auth/me');
      return res.data;
    } catch (err) {
      const saved = localStorage.getItem('shg_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      throw err;
    }
  },
};

// Patient Service
export const patientService = {
  getPatients: async () => {
    const res = await api.get('/api/v1/patients/');
    return res.data;
  },
  getPatient: async (id) => {
    const res = await api.get(`/api/v1/patients/${id}`);
    return res.data;
  },
  createPatient: async (patientData) => {
    const res = await api.post('/api/v1/patients/', patientData);
    return res.data;
  },
  registerNewPatient: async (patientData) => {
    // Staff-facing intake: creates a brand new patient (own user account),
    // rather than POST /patients/ which would attach to the caller's account.
    const res = await api.post('/api/v1/patients/register', patientData);
    return res.data;
  },
  updatePatient: async (id, patientData) => {
    const res = await api.put(`/api/v1/patients/${id}`, patientData);
    return res.data;
  },
  getMyProfile: async () => {
    const res = await api.get('/api/v1/patients/me');
    return res.data;
  },
  updateMyProfile: async (data) => {
    const res = await api.put('/api/v1/patients/me', data);
    return res.data;
  },
  getMyMedicalTests: async () => {
    const res = await api.get('/api/v1/patients/me/medical-tests');
    return res.data;
  },
  addMyMedicalTest: async (data) => {
    const res = await api.post('/api/v1/patients/me/medical-tests', data);
    return res.data;
  },
  addMyMedicalHistory: async (data) => {
    const res = await api.post('/api/v1/patients/me/medical-history', data);
    return res.data;
  },
  addMyAllergy: async (data) => {
    const res = await api.post('/api/v1/patients/me/allergies', data);
    return res.data;
  },
  getMedications: async (id) => {
    const res = await api.get(`/api/v1/patients/${id}/medications`);
    return res.data;
  },
  addMedication: async (id, data) => {
    const res = await api.post(`/api/v1/patients/${id}/medications`, data);
    return res.data;
  },
  getAllergies: async (id) => {
    const res = await api.get(`/api/v1/patients/${id}/allergies`);
    return res.data;
  },
  addAllergy: async (id, data) => {
    const res = await api.post(`/api/v1/patients/${id}/allergies`, data);
    return res.data;
  },
  getMedicalTests: async (id) => {
    const res = await api.get(`/api/v1/patients/${id}/medical-tests`);
    return res.data;
  },
  addMedicalTest: async (id, data) => {
    const res = await api.post(`/api/v1/patients/${id}/medical-tests`, data);
    return res.data;
  },
  getCareEncounters: async (id) => {
    const res = await api.get(`/api/v1/patients/${id}/care-encounters`);
    return res.data;
  },
  createCareEncounter: async (id, data) => {
    const res = await api.post(`/api/v1/patients/${id}/care-encounters`, data);
    return res.data;
  },
};


// Facility Service
export const facilityService = {
  getFacilities: async () => {
    const res = await api.get('/api/v1/facilities/');
    return res.data;
  },
  createFacility: async (facilityData) => {
    const res = await api.post('/api/v1/facilities/', facilityData);
    return res.data;
  },
  updateCapacity: async (id, capacityData) => {
    const res = await api.patch(`/api/v1/facilities/${id}/capacity`, capacityData);
    return res.data;
  },
};

// Risk Assessment Service
export const riskService = {
  assessRisk: async (riskData) => {
    const res = await api.post('/api/v1/risk/assess', riskData);
    return res.data;
  },
};

// Recommendation Engine Service
export const recommendationService = {
  getRecommendations: async (matchData) => {
    const res = await api.post('/api/v1/recommendations/match', matchData);
    return res.data;
  },
};

// Referral Service
export const referralService = {
  getReferrals: async () => {
    const res = await api.get('/api/v1/referrals/');
    return res.data;
  },
  createReferral: async (referralData) => {
    const res = await api.post('/api/v1/referrals/', referralData);
    return res.data;
  },
  updateStatus: async (id, status, notes) => {
    const res = await api.patch(`/api/v1/referrals/${id}/status`, { status, notes });
    return res.data;
  },
};

// Followup Service
export const followupService = {
  getFollowups: async (patientId) => {
    const res = await api.get(`/api/v1/patients/${patientId}/followups`);
    return res.data;
  },
  createFollowup: async (patientId, followupData) => {
    const res = await api.post(`/api/v1/patients/${patientId}/followups`, followupData);
    return res.data;
  },
};

// IoT Telemetry & Patient Sensor Service
export const iotService = {
  sendTelemetry: async (telemetryData) => {
    const res = await api.post('/api/v1/iot/telemetry', telemetryData);
    return res.data;
  },
  reportSymptoms: async (symptomData) => {
    const res = await api.post('/api/v1/iot/symptom-report', symptomData);
    return res.data;
  },
};

// DigiYatra for Healthcare Service
export const digiYatraService = {
  getPassport: async () => {
    const res = await api.get('/api/v1/patients/me/passport');
    return res.data;
  },
  getJourney: async () => {
    const res = await api.get('/api/v1/patients/me/journey');
    return res.data;
  },
  getConsents: async () => {
    const res = await api.get('/api/v1/patients/me/consents');
    return res.data;
  },
  createConsent: async (data) => {
    const res = await api.post('/api/v1/patients/me/consents', data);
    return res.data;
  },
  revokeConsent: async (consentId) => {
    const res = await api.post(`/api/v1/patients/me/consents/${consentId}/revoke`);
    return res.data;
  },
  getConsentHistory: async () => {
    const res = await api.get('/api/v1/patients/me/consent-history');
    return res.data;
  },
  terminalCheckin: async (data) => {
    const res = await api.post('/api/v1/patients/terminal/checkin', data);
    return res.data;
  },
  terminalGrantConsent: async (data) => {
    const res = await api.post('/api/v1/patients/terminal/grant-visit-consent', data);
    return res.data;
  },
  terminalRecordAction: async (data) => {
    const res = await api.post('/api/v1/patients/terminal/action', data);
    return res.data;
  },
  getMedicalReports: async (params = {}) => {
    const res = await api.get('/api/v1/patients/me/medical-tests', { params });
    return res.data;
  },
  addMedicalReport: async (data) => {
    const res = await api.post('/api/v1/patients/me/medical-tests', data);
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await api.put('/api/v1/patients/me', data);
    return res.data;
  },
};

// Doctor Queue & Clinical Consultation Service
export const doctorService = {
  getQueue: async () => {
    const res = await api.get('/api/v1/patients/doctor/queue');
    return res.data;
  },
  updateQueueStatus: async (patientId, status) => {
    const res = await api.post('/api/v1/patients/doctor/queue/status', {
      patient_id: patientId,
      status: status,
    });
    return res.data;
  },
  recordEncounter: async (data) => {
    const res = await api.post('/api/v1/patients/doctor/encounter', data);
    return res.data;
  },
  getMedicalReports: async (params = {}) => {
    const res = await api.get('/api/v1/patients/doctor/medical-reports', { params });
    return res.data;
  },
  searchReportsByName: async (name = '', category = 'All') => {
    const params = {};
    if (name) params.name = name;
    if (category && category !== 'All') params.category = category;
    const res = await api.get('/api/v1/patients/doctor/medical-reports', { params });
    return res.data;
  },
};

export default api;

