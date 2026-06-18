// hms-react/src/pages/PatientAppointments.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import '../css/PatientDashboard.css';

const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', text: '#92400e' },
  Waiting: { bg: '#dbeafe', text: '#1e40af' },
  Called:  { bg: '#dcfce7', text: '#166534' },
  Done:    { bg: '#e5e7eb', text: '#374151' },
  Skipped: { bg: '#fee2e2', text: '#991b1b' },
};

export default function PatientAppointments() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [clinics, setClinics]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const patientId   = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || '';

  const [form, setForm] = useState({
    name: patientName,
    age: patient?.age || '',
    gender: patient?.gender || '',
    symptoms: '',
    clinicId: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/patient-login');
      return;
    }
    if (!isPatient()) {
      navigate('/');
      return;
    }
    loadAppointments();
    loadClinics();
  }, [user]);

  async function loadAppointments() {
    setLoading(true);
    try {
      const res = await API.get(`/patient-portal/${patientId}/appointments`);
      if (res.data.success) {
        setAppointments(res.data.appointments || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
    setLoading(false);
  }

  async function loadClinics() {
  try {
    const res = await API.get('/clinics');   // ← was wrong before, now matches /api/clinics
    if (res.data.success) {
      setClinics(res.data.clinics || []);
    }
  } catch (error) {
    console.error('Error loading clinics:', error);
  }
}

  const handleLogout = () => {
    logout();
    navigate('/patient-login');
  };

  const goTo = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const handleFormChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setFormError('');
  };

  const openModal = () => {
    setForm({
      name: patientName,
      age: patient?.age || '',
      gender: patient?.gender || '',
      symptoms: '',
      clinicId: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.symptoms || !form.clinicId) {
      setFormError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await API.post(`/patient-portal/${patientId}/appointments`, form);
      if (res.data.success) {
        setShowModal(false);
        loadAppointments();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not create token. Please try again.');
    }
    setSubmitting(false);
  };

  const initials = (patientName || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading your appointments...</p>
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

        {/* SIDEBAR */}
        <aside className={`pd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="pd-sidebar__profile">
            <div className="pd-sidebar__avatar">{initials}</div>
            <div>
              <div className="pd-sidebar__name">{patientName}</div>
              <div className="pd-sidebar__phone">{patient?.email || user?.email}</div>
            </div>
          </div>
          <nav className="pd-sidebar__nav">
            <div className="pd-nav-item" onClick={() => goTo('/patient-dashboard')}>
              <i className="fas fa-home"></i> Dashboard
            </div>
            <div className="pd-nav-item active" onClick={() => setSidebarOpen(false)}>
              <i className="fas fa-calendar-check"></i> My Appointments
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-prescriptions')}>
              <i className="fas fa-prescription-bottle-alt"></i> Prescriptions
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

        {/* MAIN CONTENT */}
        <div className="pd-main">
          <main className="pd-body">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a2236' }}>
                  My Appointments
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: '14px' }}>
                  Your appointment requests
                </p>
              </div>
              <button
                className="pd-btn pd-btn--primary"
                onClick={openModal}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-plus"></i> Create New Token
              </button>
            </div>

            <div className="pd-card">
              <div className="pd-card__body" style={{ padding: appointments.length ? 0 : '24px' }}>
                {appointments.length === 0 && (
                  <div className="pd-empty">
                    <i className="fas fa-calendar-times"></i> No appointments yet. Create a new token to get started.
                  </div>
                )}
                {appointments.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Token #</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Clinic</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Doctor</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Symptoms</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((apt) => {
                          const sc = STATUS_COLORS[apt.status] || STATUS_COLORS.Pending;
                          return (
                            <tr key={apt._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a2236' }}>
                                #{apt.tokenNumber}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {formatDate(apt.createdAt)}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.clinic?.name || apt.clinicId?.name || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : 'Not yet assigned'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151', maxWidth: '200px' }}>
                                {apt.symptoms || '-'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  background: sc.bg,
                                  color: sc.text,
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}>
                                  {apt.status}
                                </span>
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

      {/* CREATE NEW TOKEN MODAL */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '16px',
          }}
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px',
              padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a2236' }}>
              Create New Token
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7a99' }}>
              Request an appointment token. The clinic will assign you a doctor.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Full Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  style={inputStyle}
                  placeholder="Enter full name"
                />
              </div>

              {/* Age & Gender */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Age *</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={form.age}
                    onChange={e => handleFormChange('age', e.target.value)}
                    style={inputStyle}
                    placeholder="Age"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Gender *</label>
                  <select
                    value={form.gender}
                    onChange={e => handleFormChange('gender', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Symptoms */}
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Symptoms *</label>
                <textarea
                  value={form.symptoms}
                  onChange={e => handleFormChange('symptoms', e.target.value)}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe what's bothering you"
                />
              </div>

              {/* Clinic Dropdown */}
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Clinic *</label>
                <select
                  value={form.clinicId}
                  onChange={e => handleFormChange('clinicId', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select a clinic</option>
                  {clinics.map(clinic => (
                    <option key={clinic._id} value={clinic._id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
                {clinics.length === 0 && (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                    No clinics available. Please contact support.
                  </p>
                )}
              </div>

              {/* Error */}
              {formError && (
                <div style={{
                  background: '#fee2e2', color: '#991b1b', padding: '10px 12px',
                  borderRadius: '8px', fontSize: '13px', marginBottom: '14px',
                }}>
                  {formError}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="pd-btn pd-btn--outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="pd-btn pd-btn--primary"
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Creating...' : 'Create Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};