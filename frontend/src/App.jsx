import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { TriageRiskAssessment } from './pages/TriageRiskAssessment';
import { FacilityMatcher } from './pages/FacilityMatcher';
import { ReferralsTracker } from './pages/ReferralsTracker';
import { PatientsList } from './pages/PatientsList';
import { CapacityManager } from './pages/CapacityManager';
import { PatientIoTMonitor } from './pages/PatientIoTMonitor';
import { PatientCarePath } from './pages/PatientCarePath';
import { LandingPage } from './pages/LandingPage';
import { PatientJourney } from './pages/PatientJourney';
import { ConsentPrivacy } from './pages/ConsentPrivacy';
import { PatientHealthHub } from './pages/PatientHealthHub';
import { HospitalCheckInTerminal } from './pages/HospitalCheckInTerminal';
import { MedicalReports } from './pages/MedicalReports';
import { ClinicalAssistant } from './pages/ClinicalAssistant';
import { RemediChatWidget } from './components/RemediChatWidget';
import { useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
        Loading Smart Health Grid session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminStaffRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
        Loading Smart Health Grid session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const role = user.role ? user.role.toLowerCase() : '';
  if (role === 'patient') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AdminOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
        Loading Smart Health Grid session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const role = user.role ? user.role.toLowerCase() : '';
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const NonDoctorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
        Loading Smart Health Grid session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const role = user.role ? user.role.toLowerCase() : '';
  if (role === 'doctor') {
    return <Navigate to="/" replace />;
  }
  return children;
};

export const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthOrLanding =
    ['/landing', '/login', '/register'].includes(location.pathname) ||
    (!user && location.pathname === '/');

  const hideChatWidget = ['/login', '/register', '/assistant', '/chat'].some(
    (p) => location.pathname.startsWith(p)
  );

  return (
    <div>
      {!isAuthOrLanding && <Navbar />}
      <main style={!isAuthOrLanding && location.pathname !== '/' ? { paddingBottom: '60px' } : {}}>
        <Routes>

          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              user ? (
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              ) : (
                <LandingPage />
              )
            }
          />

          <Route
            path="/iot-monitor"
            element={
              <ProtectedRoute>
                <PatientIoTMonitor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-care-path"
            element={
              <ProtectedRoute>
                <PatientCarePath />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-health"
            element={
              <ProtectedRoute>
                <PatientHealthHub />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-journey"
            element={
              <ProtectedRoute>
                <PatientJourney />
              </ProtectedRoute>
            }
          />

          <Route
            path="/consent"
            element={
              <ProtectedRoute>
                <ConsentPrivacy />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkin"
            element={
              <AdminOnlyRoute>
                <HospitalCheckInTerminal />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <MedicalReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medical-reports"
            element={<Navigate to="/reports" replace />}
          />

          <Route
            path="/assistant"
            element={<ClinicalAssistant />}
          />
          <Route
            path="/chat"
            element={<Navigate to="/assistant" replace />}
          />

          <Route
            path="/triage"
            element={
              <ProtectedRoute>
                <TriageRiskAssessment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/facilities"
            element={
              <NonDoctorRoute>
                <FacilityMatcher />
              </NonDoctorRoute>
            }
          />

          <Route
            path="/referrals"
            element={
              <AdminStaffRoute>
                <ReferralsTracker />
              </AdminStaffRoute>
            }
          />

          <Route
            path="/patients"
            element={
              <AdminStaffRoute>
                <PatientsList />
              </AdminStaffRoute>
            }
          />

          <Route
            path="/capacity"
            element={
              <AdminOnlyRoute>
                <CapacityManager />
              </AdminOnlyRoute>
            }
          />

          <Route
            path="/queue"
            element={<Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {/* Floating chatbot popup — hidden on full assistant page & auth pages */}
      {!hideChatWidget && <RemediChatWidget />}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
