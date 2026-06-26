// hms-react/src/pages/PatientDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import ClinicSearch from '../components/ClinicSearch';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';

export default function PatientDashboard() {
  const { user, patient, logout, isPatient, isDoctorOnline } = useAuth();
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    prescriptionsCount: 0,
    doctorsConsulted: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [admission, setAdmission] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  // ── Location (auto-detected via browser GPS) ──
  const [locationLabel, setLocationLabel] = useState('Home');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    detectLocation();
  }, []);

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationLabel('Home');
      setLocationError('not-supported');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          const addr = data?.address || {};
          const place =
            addr.suburb ||
            addr.neighbourhood ||
            addr.city_district ||
            addr.town ||
            addr.village ||
            addr.city ||
            addr.county ||
            data?.display_name?.split(',')[0] ||
            'Current Location';
          setLocationLabel(place);
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
          setLocationLabel('Current Location');
          setLocationError('geocode-failed');
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        console.log('Geolocation permission denied or unavailable:', err);
        setLocationLabel('Home');
        setLocationError('permission-denied');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }

  useEffect(() => {
    if (!user) {
      navigate('/patient-login');
      return;
    }
    if (!isPatient()) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const patientId = patient?._id || patient?.id || user?.id || user?._id;

      if (!patientId) {
        console.error('No patient ID found');
        setLoading(false);
        return;
      }

      const statsRes = await API.get(`/patient-portal/${patientId}/dashboard`);
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      const apptRes = await API.get(`/patient-portal/${patientId}/appointments`);
      if (apptRes.data.success) {
        setAppointments(apptRes.data.appointments || []);
      }

      try {
        const rxRes = await API.get(`/prescriptions/patient/${patientId}`);
        if (rxRes.data.success) {
          setPrescriptions(rxRes.data.prescriptions || []);
          setStats(prev => ({
            ...prev,
            prescriptionsCount: rxRes.data.prescriptions?.length || 0
          }));
        }
      } catch (rxErr) {
        console.log('Prescriptions not available yet');
      }

      try {
        const admRes = await API.get(`/patient-portal/${patientId}/admission`);
        if (admRes.data.success && admRes.data.admitted) {
          setAdmission(admRes.data.admission);
        } else {
          setAdmission(null);
        }
      } catch {
        console.log('Admission status not available');
      }

      try {
        const docRes = await API.get('/auth/available-doctors');
        if (docRes.data.success) {
          setDoctors(docRes.data.doctors || []);
        }
      } catch {
        console.log('Doctors not available');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setLoading(false);
  }

  const handleLogout = () => {
    logout();
    navigate('/patient-login');
  };

  const goTo = (path) => {
    setSidebarOpen(false);
    setUserDropdown(false);
    navigate(path);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || '';
  const patientId = patient?._id || patient?.id || user?.id || user?._id;

  const initials = patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const upcomingAppointments = appointments.filter(
    a => new Date(a.appointmentTime) > new Date()
  );

  const statusColors = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    active: { bg: '#dbeafe', color: '#1e40af', label: 'Active' },
    dispensed: { bg: '#fef3c7', color: '#92400e', label: 'Dispensed' },
    completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      {/* TOPBAR */}
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <Link to="/patient-dashboard" className="pd-topbar__title">
            My Health
          </Link>
        </div>
        <div className="pd-topbar__right">
          <div
            className="pd-topbar__location"
            onClick={detectLocation}
            style={{ cursor: 'pointer' }}
            title={
              locationError === 'permission-denied'
                ? 'Location access denied — click to try again'
                : 'Click to refresh your location'
            }
          >
            <i className={`fas ${locationLoading ? 'fa-spinner fa-spin' : 'fa-map-marker-alt'}`}></i>
            {locationLoading ? 'Locating…' : locationLabel}
            <i className="fas fa-chevron-down" style={{ fontSize: 10 }}></i>
          </div>

          <ClinicSearch patientId={patientId} patientName={patientName} />

          <div className="pd-user-menu">
            <div className="pd-user-menu__trigger" onClick={() => setUserDropdown(!userDropdown)}>
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">{patientName}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10, color: 'var(--text-secondary)' }}></i>
            </div>
            {userDropdown && (
              <>
                <div className="pd-user-dropdown-overlay" onClick={() => setUserDropdown(false)} />
                <div className="pd-user-dropdown">
                  <div className="pd-user-dropdown__info">
                    <strong>{patientName}</strong>
                    <span>{patientEmail}</span>
                  </div>
                  <div className="pd-user-dropdown__divider" />
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-profile')}>
                    <i className="fas fa-user-circle"></i> Profile
                  </button>
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-appointments')}>
                    <i className="fas fa-calendar-check"></i> Appointments
                  </button>
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-admission')}>
                    <i className="fas fa-procedures"></i> Hospital Admission
                  </button>
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-telemedicine')}>
                    <i className="fas fa-video"></i> Telemedicine
                  </button>
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-prescriptions')}>
                    <i className="fas fa-prescription-bottle-alt"></i> Prescriptions
                  </button>
                  <button className="pd-user-dropdown__item" onClick={() => goTo('/patient-documents')}>
                    <i className="fas fa-folder-open"></i> My Documents
                  </button>
                  <div className="pd-user-dropdown__divider" />
                  <button className="pd-user-dropdown__item pd-user-dropdown__item--danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* SIDEBAR */}
        <PatientSidebar
          activeItem="dashboard"
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        {/* MAIN CONTENT */}
        <div className="pd-main">
          <main className="pd-body">
            {/* Welcome Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: '16px',
              padding: '24px 28px',
              marginBottom: '24px',
              border: '1px solid #bfdbfe',
            }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1e3a8a' }}>
                Welcome back, {patientName}! 👋
              </h2>
              <p style={{ margin: '4px 0 0', color: '#3b82f6', fontSize: '14px' }}>
                Here's a summary of your health journey
              </p>
            </div>

            {/* ── Currently Admitted banner ── */}
            {admission && (
              <div
                onClick={() => navigate('/patient-admission')}
                style={{
                  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                  border: '1px solid #6ee7b7',
                  borderRadius: 16,
                  padding: '18px 22px',
                  marginBottom: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', background: '#16a34a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', flexShrink: 0,
                  }}>
                    🏥
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#065f46' }}>
                      You're currently admitted — {admission.roomType} {admission.roomNumber ? `#${admission.roomNumber}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                      Day {admission.days} · ₹{admission.roomRatePerDay}/day · Running total ₹{admission.grandTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#fff', background: '#16a34a',
                  padding: '8px 16px', borderRadius: 8, whiteSpace: 'nowrap',
                }}>
                  View Live Details →
                </span>
              </div>
            )}

            {/* Quick Stats */}
            <div className="pd-stats">
              {[
                { icon: 'fa-calendar-check', label: 'Upcoming', value: stats.upcomingAppointments, color: '#2d6be4' },
                { icon: 'fa-prescription-bottle', label: 'Prescriptions', value: stats.prescriptionsCount, color: '#00b386' },
                { icon: 'fa-file-medical', label: 'Total Appointments', value: stats.totalAppointments, color: '#f59e0b' },
                { icon: 'fa-user-md', label: 'Doctors Consulted', value: stats.doctorsConsulted, color: '#7c3aed' },
              ].map(s => (
                <div className="pd-stat-card" key={s.label}>
                  <div className="pd-stat-card__icon" style={{ background: s.color + '18', color: s.color }}>
                    <i className={`fas ${s.icon}`}></i>
                  </div>
                  <div>
                    <div className="pd-stat-card__num">{s.value}</div>
                    <div className="pd-stat-card__label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Grid */}
<div className="pd-grid">

  {/* ── Upcoming Appointments ── */}
  <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
          <i className="fas fa-calendar-alt"></i>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2236' }}>Upcoming appointments</span>
      </div>
      {upcomingAppointments.length > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '2px 8px' }}>
          {upcomingAppointments.length} scheduled
        </span>
      )}
    </div>

    <div style={{ flex: 1 }}>
      {upcomingAppointments.length === 0 ? (
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
          <i className="fas fa-calendar-times" style={{ fontSize: 24 }}></i>
          <span style={{ fontSize: 13 }}>No upcoming appointments</span>
        </div>
      ) : (
        upcomingAppointments.slice(0, 3).map((apt, i) => {
          // Appointment model: date (Date), time (String e.g. "10:30 AM"), doctor (ref→User), reason, status
          const d = new Date(apt.date);
          const isLast = i === Math.min(upcomingAppointments.length, 3) - 1;
          const statusStyle = {
            Scheduled:  { bg: '#dbeafe', color: '#1e40af' },
            Completed:  { bg: '#d1fae5', color: '#065f46' },
            Cancelled:  { bg: '#fee2e2', color: '#991b1b' },
            'No-Show':  { bg: '#fef3c7', color: '#92400e' },
          }[apt.status] || { bg: '#f1f5f9', color: '#475569' };

          return (
            <div key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: isLast ? 'none' : '0.5px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => navigate('/patient-appointments')}
            >
              {/* date block — from apt.date */}
              <div style={{ flexShrink: 0, width: 40, height: 44, borderRadius: 10, border: '0.5px solid #bfdbfe', background: '#eff6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#2d6be4', lineHeight: 1 }}>{d.getDate()}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#2d6be4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {d.toLocaleString('en-US', { month: 'short' })}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* doctor comes from apt.doctor (populated User), fallback to doctorId for backward compat */}
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2236', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : apt.doctorId?.name ? `Dr. ${apt.doctorId.name}` : 'Doctor'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="fas fa-clock" style={{ fontSize: 10 }}></i>
                  {/* apt.time is stored as a plain string e.g. "10:30 AM" */}
                  {apt.time || formatTime(apt.date)}
                  {apt.reason && (
                    <>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }}></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{apt.reason}</span>
                    </>
                  )}
                </div>
              </div>

              {/* apt.status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-Show' */}
              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, borderRadius: 6, padding: '3px 8px' }}>
                {apt.status}
              </span>
            </div>
          );
        })
      )}
    </div>

    <div style={{ padding: '14px 20px', borderTop: '0.5px solid #e5e7eb' }}>
      <button
        onClick={() => navigate('/patient-appointments')}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #2d6be4, #1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <i className="fas fa-calendar-plus"></i> Book appointment
      </button>
    </div>
  </div>

  {/* ── Recent Prescriptions ── */}
  <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#d1fae5', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
          <i className="fas fa-prescription-bottle-alt"></i>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2236' }}>Recent prescriptions</span>
      </div>
      {prescriptions.length > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 8px' }}>
          {prescriptions.length} total
        </span>
      )}
    </div>

    <div style={{ flex: 1 }}>
      {prescriptions.length === 0 ? (
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
          <i className="fas fa-file-prescription" style={{ fontSize: 24 }}></i>
          <span style={{ fontSize: 13 }}>No prescriptions yet</span>
        </div>
      ) : (
        prescriptions.slice(0, 3).map((rx, i) => {
          // Prescription model: doctorName (denorm String), doctorId (ref), medicines[], diagnosis, chiefComplaint, status, createdAt
          const isLast = i === Math.min(prescriptions.length, 3) - 1;
          const rxStatus = {
            active:    { bg: '#dbeafe', color: '#1e40af', label: 'Active' },
            completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
            draft:     { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
            cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
            dispensed: { bg: '#fef3c7', color: '#92400e', label: 'Dispensed' },
          }[rx.status] || { bg: '#f1f5f9', color: '#475569', label: rx.status };

          // diagnosis preferred; fall back to chiefComplaint
          const summary = rx.diagnosis || rx.chiefComplaint || '';

          return (
            <div key={i}
              onClick={() => navigate('/patient-prescriptions')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: isLast ? 'none' : '0.5px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', border: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#94a3b8', flexShrink: 0 }}>
                <i className="fas fa-stethoscope"></i>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* doctorName is the denormalized field on the Prescription model */}
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2236' }}>
                  {rx.doctorName || rx.doctorId?.name || 'Doctor'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                  {/* medicines is an array of subdocs with .name, .dosage, .frequency */}
                  <span>{rx.medicines?.length || 0} medicine{rx.medicines?.length !== 1 ? 's' : ''}</span>
                  {summary && (
                    <>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block', flexShrink: 0 }}></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {summary.length > 28 ? summary.substring(0, 28) + '…' : summary}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                {/* createdAt comes from Mongoose timestamps: true */}
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(rx.createdAt)}</span>
                {/* status enum: 'draft' | 'active' | 'dispensed' | 'completed' | 'cancelled' */}
                <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 7px', background: rxStatus.bg, color: rxStatus.color }}>
                  {rxStatus.label}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>

    <div style={{ padding: '14px 20px', borderTop: '0.5px solid #e5e7eb' }}>
      <button
        onClick={() => navigate('/patient-prescriptions')}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', border: '0.5px solid #d1d5db', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <i className="fas fa-eye"></i> View all prescriptions
      </button>
    </div>
  </div>

</div>

            {/* ── Available Doctors ── */}
            <div style={{ marginTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1a2236' }}>Available Doctors</h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    <span style={{ color: '#374151', fontWeight: 500 }}>
                      {doctors.filter(d => isDoctorOnline ? isDoctorOnline(d._id) : false).length} online
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}></span>
                    <span style={{ color: '#6b7a99', fontWeight: 500 }}>
                      {doctors.filter(d => !(isDoctorOnline ? isDoctorOnline(d._id) : false)).length} offline / pending
                    </span>
                  </span>
                </div>
              </div>

              {doctors.length === 0 ? (
                <div className="pd-card">
                  <div className="pd-card__body">
                    <div className="pd-empty"><i className="fas fa-user-md"></i> No doctors available right now</div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '16px',
                }}>
                  {doctors.map((doc) => {
                    const online = isDoctorOnline ? isDoctorOnline(doc._id) : false;
                    const avatarLetter = (doc.name || 'D')[0].toUpperCase();
                    return (
                      <div
                        key={doc._id}
                        style={{
                          background: '#fff',
                          borderRadius: '16px',
                          padding: '20px',
                          border: online ? '2px solid #2d6be4' : '1.5px solid #e5e7eb',
                          boxShadow: online ? '0 4px 20px rgba(45,107,228,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
                          position: 'relative',
                          opacity: online ? 1 : 0.65,
                          transition: 'all 0.2s',
                        }}
                      >
                        {/* Online indicator dot */}
                        <span style={{
                          position: 'absolute', top: 16, right: 16,
                          width: 12, height: 12, borderRadius: '50%',
                          background: online ? '#22c55e' : '#cbd5e1',
                          border: '2px solid #fff',
                          boxShadow: online ? '0 0 0 2px #bbf7d0' : 'none',
                          display: 'inline-block',
                        }} />

                        {/* Doctor avatar + name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                          {doc.avatar ? (
                            <img
                              src={doc.avatar}
                              alt={doc.name}
                              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
                            />
                          ) : (
                            <div style={{
                              width: 56, height: 56, borderRadius: '50%',
                              background: online ? '#dbeafe' : '#f1f5f9',
                              color: online ? '#2d6be4' : '#94a3b8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '22px', fontWeight: 700, flexShrink: 0,
                            }}>
                              {avatarLetter}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: online ? '#1a2236' : '#94a3b8' }}>
                              Dr. {doc.name}
                            </div>
                            {doc.department && (
                              <div style={{ fontSize: '13px', color: '#6b7a99', marginTop: 2 }}>
                                {doc.department}
                              </div>
                            )}
                          </div>
                        </div>

                        {online ? (
                          <>
                            {/* Badges */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: '#f0f9ff', color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                              }}>
                                ✓ Verified
                              </span>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: '#f0fdf4', color: '#15803d',
                                border: '1px solid #bbf7d0',
                                borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                              }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                                Online Now
                              </span>
                            </div>

                            {/* Wait time */}
                            <div style={{ fontSize: '13px', color: '#6b7a99', marginBottom: '14px' }}>
                              <i className="fas fa-clock" style={{ marginRight: 5 }}></i> ~5 min wait
                            </div>

                            {/* Fee + CTA */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 2 }}>Consultation fee</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a2236' }}>
                                  ₹{doc.consultationFee || 299}
                                </div>
                              </div>
                              <button
                                onClick={() => navigate('/patient-telemedicine', { state: { preSelectDoctor: doc._id } })}
                                style={{
                                  background: 'linear-gradient(135deg, #2d6be4, #1e40af)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '10px 18px',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 7,
                                  boxShadow: '0 4px 12px rgba(45,107,228,0.3)',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                              >
                                <i className="fas fa-video" style={{ fontSize: 13 }}></i> Consult Now
                              </button>
                            </div>
                          </>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }}></span>
                              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Offline</span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                              Currently unavailable for consultations
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── CONSULT TOP DOCTORS SECTION ── */}

            <div style={{
              marginTop: '40px',
              padding: '32px 28px',
              background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '16px',
              }}>
                <div>
                  <h2 style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.5px',
                  }}>
                    Consult top doctors online for any health concern
                  </h2>
                  <p style={{
                    margin: '6px 0 0',
                    fontSize: '14px',
                    color: '#64748b',
                  }}>
                    Private online consultations with verified doctors in all specialists
                  </p>
                </div>
                <button
                  onClick={() => navigate('/patient-telemedicine')}
                  style={{
                    padding: '10px 24px',
                    background: 'white',
                    border: '1.5px solid #2d6be4',
                    borderRadius: '10px',
                    color: '#2d6be4',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#2d6be4';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#2d6be4';
                  }}
                >
                  View All Specialities →
                </button>
              </div>

              {/* Grid */}
              <div style={{
                display: isMobile ? 'flex' : 'grid',
                gridTemplateColumns: isMobile ? undefined : 'repeat(6, 1fr)',
                gap: '12px',
                overflowX: isMobile ? 'auto' : 'visible',
                paddingBottom: '8px',
                scrollbarWidth: 'thin',
              }}>
                {[
                  { label: 'Period doubts or Pregnancy', icon: 'fa-venus', color: '#ec4899' },
                  { label: 'Acne, pimple or skin issues', icon: 'fa-face-meh', color: '#f59e0b' },
                  { label: 'Performance issues in bed', icon: 'fa-heart-pulse', color: '#ef4444' },
                  { label: 'Cold, cough or fever', icon: 'fa-head-side-cough', color: '#3b82f6' },
                  { label: 'Child not feeling well', icon: 'fa-baby', color: '#22c55e' },
                  { label: 'Depression or anxiety', icon: 'fa-brain', color: '#8b5cf6' },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      flex: isMobile ? '0 0 160px' : undefined,
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px 16px 20px',
                      textAlign: 'center',
                      border: '1.5px solid #e2e8f0',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = item.color;
                      e.currentTarget.style.boxShadow = `0 8px 24px ${item.color}22`;
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'none';
                    }}
                    onClick={() => navigate('/patient-telemedicine')}
                  >
                    <div style={{
                      width: '64px',
                      height: '64px',
                      margin: '0 auto 14px',
                      borderRadius: '50%',
                      background: item.color + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      color: item.color,
                    }}>
                      <i className={`fas ${item.icon}`}></i>
                    </div>
                    <p style={{
                      margin: '0 0 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      lineHeight: '1.4',
                    }}>
                      {item.label}
                    </p>
                    <button
                      style={{
                        padding: '6px 16px',
                        background: 'transparent',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        letterSpacing: '0.5px',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = item.color;
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.borderColor = item.color;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#475569';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      CONSULT NOW
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              marginTop: '28px',
              display: isMobile ? 'flex' : 'grid',
              gridTemplateColumns: isMobile ? undefined : 'repeat(6, 1fr)',
              gap: '12px',
              overflowX: isMobile ? 'auto' : 'visible',
              paddingBottom: '8px',
            }}>
              {[
                { icon: 'fa-video', label: 'Video Consultation', color: '#2d6be4', action: () => navigate('/patient-telemedicine') },
                { icon: 'fa-user-md', label: 'Find Doctors', color: '#00b386', action: () => alert('Find doctors coming soon!') },
                { icon: 'fa-flask', label: 'Lab Tests', color: '#f59e0b', action: () => alert('Lab tests coming soon!') },
                { icon: 'fa-prescription-bottle-alt', label: 'View Prescriptions', color: '#7c3aed', action: () => navigate('/patient-prescriptions') },
                { icon: 'fa-folder-open', label: 'My Documents', color: '#0f4c81', action: () => navigate('/patient-documents') },
                { icon: 'fa-comment-dots', label: 'Feedback', color: '#7c3aed', action: () => alert('Feedback coming soon!') },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    flex: isMobile ? '0 0 160px' : undefined,
                    minWidth: isMobile ? '160px' : 'auto',
                    background: 'white',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.boxShadow = `0 4px 16px ${item.color}22`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: item.color + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: item.color,
                  }}>
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a2236' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}