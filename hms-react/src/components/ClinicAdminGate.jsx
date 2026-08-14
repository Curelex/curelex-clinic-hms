// components/ClinicAdminGate.jsx
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../pages/AdminDashboard';
import Dashboard from '../pages/Dashboard';

export default function ClinicAdminGate() {
  const { user } = useAuth();
  const isClinic = user?.clinic?.type === 'clinic';
  return isClinic ? <AdminDashboard /> : <Dashboard />;
}