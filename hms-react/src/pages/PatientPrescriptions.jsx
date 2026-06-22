// hms-react/src/pages/PatientPrescriptions.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import ViewPrescription from '../components/ViewPrescription';
import '../css/PatientDashboard.css';

export default function PatientPrescriptions() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewPrescription, setViewPrescription] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const patientId = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || '';

  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/prescriptions/patient/${patientId}`);
      if (data.success) {
        setPrescriptions(data.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); navigate(path); };

  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <Link to="/patient-dashboard" className="pd-topbar__title">My Health</Link>
        </div>
        <div className="pd-topbar__right">
          <div className="pd-user-menu">
            <div className="pd-user-menu__trigger">
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">{patientName}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`pd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="pd-sidebar__profile">
            <div className="pd-sidebar__avatar">{initials}</div>
            <div>
              <div className="pd-sidebar__name">{patientName}</div>
              <div className="pd-sidebar__phone">{patientEmail}</div>
            </div>
          </div>
          <nav className="pd-sidebar__nav">
            <div className="pd-nav-item" onClick={() => goTo('/patient-dashboard')}>
              <i className="fas fa-home"></i> Dashboard
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-appointments')}>
              <i className="fas fa-calendar-check"></i> My Appointments
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-admission')}>
              <i className="fas fa-procedures"></i> Hospital Admission
            </div>
            <div className="pd-nav-item active" onClick={() => setSidebarOpen(false)}>
              <i className="fas fa-prescription-bottle-alt"></i> Prescriptions
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-documents')}>
              <i className="fas fa-folder-open"></i> My Documents
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-profile')}>
              <i className="fas fa-user-circle"></i> Profile
            </div>
            <div className="pd-nav-divider" />
            <div className="pd-nav-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </div>
          </nav>
        </aside>

        <div className="pd-main">
          <main className="pd-body">
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a2236' }}>
                  💊 My Prescriptions
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: '14px' }}>
                  Your current and past prescriptions
                </p>
              </div>
            </div>

            <div className="pd-card">
              <div className="pd-card__body" style={{ padding: prescriptions.length ? 0 : '24px' }}>
                {prescriptions.length === 0 && (
                  <div className="pd-empty">
                    <i className="fas fa-file-prescription"></i> No prescriptions yet
                  </div>
                )}
                {prescriptions.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Doctor</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Diagnosis</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Medicines</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((rx) => {
                          const sc = statusColors[rx.status] || statusColors.draft;
                          return (
                            <tr key={rx._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {new Date(rx.createdAt).toLocaleDateString('en-US', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {rx.doctorId?.name || rx.doctorName || '—'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {rx.diagnosis || '—'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {rx.medicines?.length || 0} medicine{rx.medicines?.length !== 1 ? 's' : ''}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: sc.bg, color: sc.color,
                                }}>
                                  {sc.label}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => setViewPrescription(rx)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {viewPrescription && (
        <ViewPrescription
          prescription={viewPrescription}
          onClose={() => setViewPrescription(null)}
          onStatusUpdate={() => loadPrescriptions()}
        />
      )}
    </div>
  );
}