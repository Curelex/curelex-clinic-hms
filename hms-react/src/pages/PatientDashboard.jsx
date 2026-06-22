// hms-react/src/pages/PatientDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import ClinicSearch from '../components/ClinicSearch';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';

export default function PatientDashboard() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    prescriptionsCount: 0,
    doctorsConsulted: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

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

  const patientName  = patient?.name  || user?.name  || 'Patient';
  const patientEmail = patient?.email || user?.email || '';
  const patientId    = patient?._id || patient?.id || user?.id || user?._id;

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
          <div className="pd-topbar__location">
            <i className="fas fa-map-marker-alt"></i>
            Home
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
          onClose={() => setSidebarOpen(false)}
          admission={admission}
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
                { icon: 'fa-calendar-check',      label: 'Upcoming',           value: stats.upcomingAppointments, color: '#2d6be4' },
                { icon: 'fa-prescription-bottle', label: 'Prescriptions',      value: stats.prescriptionsCount,   color: '#00b386' },
                { icon: 'fa-file-medical',        label: 'Total Appointments', value: stats.totalAppointments,    color: '#f59e0b' },
                { icon: 'fa-user-md',             label: 'Doctors Consulted',  value: stats.doctorsConsulted,     color: '#7c3aed' },
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
              {/* Upcoming Appointments */}
              <div className="pd-card">
                <div className="pd-card__head">
                  <div className="pd-card__head-icon"><i className="fas fa-calendar-alt"></i></div>
                  <h3>Upcoming Appointments</h3>
                </div>
                <div className="pd-card__body">
                  {upcomingAppointments.length === 0 && (
                    <div className="pd-empty">
                      <i className="fas fa-calendar-times"></i> No upcoming appointments
                    </div>
                  )}
                  {upcomingAppointments.slice(0, 3).map((apt, i) => {
                    const d = new Date(apt.appointmentTime);
                    return (
                      <div className="pd-appt-item" key={i}>
                        <div className="pd-appt-date">
                          <span className="day">{d.getDate()}</span>
                          <span className="month">{d.toLocaleString('en-US', { month: 'short' })}</span>
                        </div>
                        <div className="pd-appt-info">
                          <h4>{apt.doctorId?.name ? `Dr. ${apt.doctorId.name}` : 'Doctor'}</h4>
                          <p>{formatTime(apt.appointmentTime)}</p>
                          <span className="badge badge--green">✅ Confirmed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pd-card__footer">
                  <button
                    className="pd-btn pd-btn--primary pd-btn--full"
                    onClick={() => navigate('/patient-appointments')}
                  >
                    <i className="fas fa-calendar-plus"></i> Book New Appointment
                  </button>
                </div>
              </div>

              {/* Recent Prescriptions */}
              <div className="pd-card">
                <div className="pd-card__head">
                  <div className="pd-card__head-icon"><i className="fas fa-prescription-bottle-alt"></i></div>
                  <h3>Recent Prescriptions</h3>
                </div>
                <div className="pd-card__body">
                  {prescriptions.length === 0 && (
                    <div className="pd-empty"><i className="fas fa-file-prescription"></i> No prescriptions yet</div>
                  )}
                  {prescriptions.slice(0, 3).map((rx, i) => {
                    const sc = statusColors[rx.status] || statusColors.draft;
                    return (
                      <div className="pd-rx-item" key={i} style={{ cursor: 'pointer' }} onClick={() => navigate('/patient-prescriptions')}>
                        <div className="pd-rx-avatar"><i className="fas fa-user-md"></i></div>
                        <div className="pd-rx-info">
                          <h4>{rx.doctorId?.name || rx.doctorName || 'Doctor'}</h4>
                          <p>
                            {rx.medicines?.length || 0} medicine{rx.medicines?.length !== 1 ? 's' : ''}
                            {rx.diagnosis && ` · ${rx.diagnosis.substring(0, 30)}${rx.diagnosis.length > 30 ? '...' : ''}`}
                          </p>
                          <div style={{ marginTop: 4 }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                              background: sc.bg, color: sc.color,
                            }}>
                              {sc.label}
                            </span>
                          </div>
                        </div>
                        <span className="pd-rx-date">{formatDate(rx.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pd-card__footer">
                  <button
                    className="pd-btn pd-btn--outline pd-btn--full"
                    onClick={() => navigate('/patient-prescriptions')}
                  >
                    <i className="fas fa-eye"></i> View All Prescriptions
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              marginTop: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
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