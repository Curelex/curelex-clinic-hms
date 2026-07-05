import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage            from './pages/LandingPage';
import SuperAdminDashboard    from './pages/SuperAdminDashboard';
import AdminDashboard         from './pages/AdminDashboard';
import ReceptionistDashboard  from './pages/ReceptionistDashboard';
import DoctorDashboard        from './pages/DoctorDashboard';
import PharmacistDashboard    from './pages/PharmacistDashboard';
import PlanSelection          from './pages/PlanSelection';
import QueueTracker           from './pages/QueueTracker';

// ── Public route check — /clinic/track/:token doesn't need login ──
function isTrackingPage() {
  return window.location.pathname.startsWith('/clinic/track/');
}

function Router() {
  const { session } = useApp();
  const [choosingPlan, setChoosingPlan] = useState(false);

  // Public page — show tracking page regardless of login state
  if (isTrackingPage()) return <QueueTracker />;

  if (!session) return <LandingPage />;

  switch (session.type) {
    case 'superadmin':   return <SuperAdminDashboard />;
    case 'admin':
      if (choosingPlan) {
        return <PlanSelection onDone={() => setChoosingPlan(false)} />;
      }
      return <AdminDashboard onChoosePlan={() => setChoosingPlan(true)} />;
    case 'receptionist': return <ReceptionistDashboard />;
    case 'doctor':       return <DoctorDashboard />;
    case 'pharmacist':   return <PharmacistDashboard />;
    default:             return <LandingPage />;
  }
}

export default function ClinicApp() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}