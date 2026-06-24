// hms-react/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Billing from './pages/Billing';
import BillingRequests from './pages/BillingRequests';
import IMSApp from './ims/App';
import Lab from './pages/Lab';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import TokenPanel from './pages/TokenPanel';
import IPD from './pages/IPD';
import RoomSettings from './pages/RoomSettings';
import Emergency from './pages/Emergency';
import PatientDashboard from './pages/PatientDashboard';
import PatientLogin from './pages/PatientLogin';
import PatientRegister from './pages/PatientRegister';
import PatientAppointments from './pages/PatientAppointments';
import PatientAdmission from './pages/PatientAdmission';
import TaskAllocation from './pages/TaskAllocation';
import About from './pages/About';
import DoctorPrescriptions from './pages/DoctorPrescriptions';
import PatientPrescriptions from './pages/PatientPrescriptions';
import PatientDocuments from './pages/PatientDocuments'; // ── NEW ──
import DoctorTelemedicine from './pages/DoctorTelemedicine';
import PatientTelemedicine from './pages/PatientTelemedicine';
import DoctorEarnings from './pages/DoctorEarnings';
import DoctorBankDetails from './pages/DoctorBankDetails';

/* ── Auth guards ─────────────────────────────────────────────── */

// ✅ Redirects to login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// ✅ Redirects to home if already authenticated (for login/register pages)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" />;
};

// ✅ Patient route guard - only patients can access
const PatientRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/patient-login" />;
  if (user.role !== 'patient') return <Navigate to="/" />;
  return children;
};

// ✅ Staff route guard - redirects patients away from staff routes
const StaffRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'patient') return <Navigate to="/patient-dashboard" />;
  return children;
};

// ✅ Permission guard for specific permissions
const PermRoute = ({ permKey, children }) => {
  const { hasPerm } = useAuth();
  return hasPerm(permKey) ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public Routes ────────────────────────────────────── */}
          {/* Home page - accessible to everyone (NO PublicRoute wrapper) */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          {/* ── Staff Auth Routes ────────────────────────────────── */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* ── Patient Auth Routes ─────────────────────────────── */}
          <Route path="/patient-login" element={<PublicRoute><PatientLogin /></PublicRoute>} />
          <Route path="/patient-register" element={<PublicRoute><PatientRegister /></PublicRoute>} />

          {/* ── Staff Dashboard Routes ──────────────────────────── */}
          {/* These are nested under /dashboard to avoid conflict with home */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <StaffRoute>
                  <Layout />
                </StaffRoute>
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />


            <Route
              path="patients"
              element={<PermRoute permKey="patients"><Patients /></PermRoute>}
            />

            <Route
              path="billing"
              element={<PermRoute permKey="billing"><Billing /></PermRoute>}
            />

            <Route
              path="billing-requests"
              element={<PermRoute permKey="billing"><BillingRequests /></PermRoute>}
            />

            <Route
              path="ipd"
              element={<PermRoute permKey="ipd"><IPD /></PermRoute>}
            />

            <Route
              path="room-settings"
              element={<PermRoute permKey="room-settings"><RoomSettings /></PermRoute>}
            />

            <Route
              path="pharmacy/*"
              element={<PermRoute permKey="pharmacy"><IMSApp /></PermRoute>}
            />

            <Route
              path="lab"
              element={<PermRoute permKey="lab"><Lab /></PermRoute>}
            />

            <Route
              path="inventory"
              element={<PermRoute permKey="inventory"><Inventory /></PermRoute>}
            />

            <Route
              path="staff"
              element={<PermRoute permKey="staff"><Staff /></PermRoute>}
            />

            <Route
              path="tokens"
              element={<PermRoute permKey="patients"><TokenPanel /></PermRoute>}
            />

            <Route
              path="tasks"
              element={<PrivateRoute><TaskAllocation /></PrivateRoute>}
            />

            <Route
              path="emergency"
              element={<Emergency />}
            />

            <Route
              path="prescriptions"
              element={<PermRoute permKey="prescriptions"><DoctorPrescriptions /></PermRoute>}
            />
            <Route
              path="telemedicine"
              element={<PermRoute permKey="telemedicine"><DoctorTelemedicine /></PermRoute>}
            />
            <Route
              path="doctor-earnings"
              element={<PrivateRoute><DoctorEarnings /></PrivateRoute>}
            />
            <Route
              path="doctor-bank-details"
              element={<PrivateRoute><DoctorBankDetails /></PrivateRoute>}
            />
          </Route>

          {/* ── Patient Routes ───────────────────────────────────── */}
          <Route
            path="/patient-dashboard"
            element={
              <PatientRoute>
                <PatientDashboard />
              </PatientRoute>
            }
          />

          <Route
            path="/patient-profile"
            element={
              <PatientRoute>
                <Profile />
              </PatientRoute>
            }
          />

          <Route
            path="/patient-appointments"
            element={
              <PatientRoute>
                <PatientAppointments />
              </PatientRoute>
            }
          />

          <Route
            path="/patient-admission"
            element={
              <PatientRoute>
                <PatientAdmission />
              </PatientRoute>
            }
          />
          <Route
            path="/patient-prescriptions"
            element={
              <PatientRoute>
                <PatientPrescriptions />
              </PatientRoute>
            }
          />
          <Route
            path="/patient-telemedicine"
            element={
              <PatientRoute>
                <PatientTelemedicine />
              </PatientRoute>
            }
          />

          {/* ── NEW: Patient Documents ─────────────────────────── */}
          <Route
            path="/patient-documents"
            element={
              <PatientRoute>
                <PatientDocuments />
              </PatientRoute>
            }
          />

          {/* ── Catch all ────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;