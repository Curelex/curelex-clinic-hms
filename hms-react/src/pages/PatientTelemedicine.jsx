// hms-react/src/pages/PatientTelemedicine.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';

const STATUS_COLORS = {
  requested: { bg: '#fef3c7', color: '#92400e', label: '⏳ Requested' },
  approved: { bg: '#dbeafe', color: '#1e40af', label: '✅ Approved' },
  scheduled: { bg: '#dbeafe', color: '#1e40af', label: '📅 Scheduled' },
  ready: { bg: '#d1fae5', color: '#065f46', label: '🟢 Ready' },
  ongoing: { bg: '#f97316', color: '#fff', label: '🔴 Ongoing' },
  completed: { bg: '#d1fae5', color: '#065f46', label: '✅ Completed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: '❌ Cancelled' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
};

export default function PatientTelemedicine() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [form, setForm] = useState({
    doctorId: '',
    symptoms: '',
    preferredTime: '',
    urgency: 'normal',
  });
  const [doctors, setDoctors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const patientId = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || 'Patient';

  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
    loadRequests();
    loadDoctors();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/telemedicine/patient/${patientId}`);
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
    setLoading(false);
  };

  const loadDoctors = async () => {
    try {
      // ✅ Try the new available-doctors endpoint first
      const { data } = await API.get('/auth/available-doctors');
      if (data.success) {
        setDoctors(data.doctors || []);
        return;
      }
    } catch (err) {
      console.error('Failed to load doctors from /auth/available-doctors:', err);
      
      // ✅ Fallback: try to get doctors from clinic
      try {
        const clinicId = patient?.clinicId || user?.clinicId;
        if (clinicId) {
          const { data } = await API.get(`/patient-portal/doctors/${clinicId}`);
          if (data.success) {
            setDoctors(data.doctors || []);
            return;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
      }
      
      // ✅ Second fallback: try /users endpoint with different approach
      try {
        // Try to get doctors from the clinic users
        const clinicId = patient?.clinicId || user?.clinicId;
        if (clinicId) {
          const { data } = await API.get(`/clinics/${clinicId}/doctors`);
          if (data.success) {
            setDoctors(data.doctors || []);
          }
        }
      } catch (secondFallbackErr) {
        console.error('Second fallback failed:', secondFallbackErr);
        setDoctors([]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!form.doctorId) {
      setError('Please select a doctor');
      setSubmitting(false);
      return;
    }

    try {
      await API.post('/telemedicine/request', {
        patientId,
        doctorId: form.doctorId,
        symptoms: form.symptoms,
        preferredTime: form.preferredTime || null,
        urgency: form.urgency,
      });
      setShowRequestForm(false);
      setForm({ doctorId: '', symptoms: '', preferredTime: '', urgency: 'normal' });
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this request?')) return;
    try {
      await API.patch(`/telemedicine/${id}/cancel`);
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); navigate(path); };

  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading telemedicine...</p>
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
          <span className="pd-topbar__title">🩺 Telemedicine</span>
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

       <PatientSidebar
          activeItem="telemedicine"
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        <div className="pd-main">
          <main className="pd-body">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a2236' }}>
                  🩺 Telemedicine Consultations
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: '14px' }}>
                  Request and join virtual consultations with your doctor
                </p>
              </div>
              <button className="pd-btn pd-btn--primary" onClick={() => setShowRequestForm(true)}>
                <i className="fas fa-plus"></i> New Request
              </button>
            </div>

            {/* Request Form */}
            {showRequestForm && (
              <div className="pd-card" style={{ marginBottom: 20 }}>
                <div className="pd-card__head">
                  <h3>📝 New Telemedicine Request</h3>
                  <button onClick={() => setShowRequestForm(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>
                <div className="pd-card__body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="form-label">Select Doctor *</label>
                      {doctors.length === 0 ? (
                        <div style={{ padding: '10px', background: '#fef3c7', borderRadius: 8, color: '#92400e', fontSize: 13 }}>
                          <i className="fas fa-info-circle"></i> Loading doctors... Please wait.
                        </div>
                      ) : (
                        <select 
                          className="form-control" 
                          value={form.doctorId} 
                          onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                          required
                        >
                          <option value="">— Select Doctor —</option>
                          {doctors.map(doc => (
                            <option key={doc._id} value={doc._id}>
                              Dr. {doc.name} ({doc.department || 'General'})
                              {doc.consultationFee > 0 && ` - ₹${doc.consultationFee}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Symptoms / Reason</label>
                      <textarea 
                        className="form-control" 
                        rows={3}
                        value={form.symptoms} 
                        onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                        placeholder="Describe your symptoms or reason for consultation..."
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Preferred Time</label>
                        <input 
                          type="datetime-local" 
                          className="form-control" 
                          value={form.preferredTime} 
                          onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Urgency</label>
                        <select 
                          className="form-control" 
                          value={form.urgency} 
                          onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                        >
                          <option value="normal">Normal</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">🚨 Emergency</option>
                        </select>
                      </div>
                    </div>
                    {error && (
                      <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
                        ⚠️ {error}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowRequestForm(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Submitting...' : '📤 Send Request'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Requests List */}
            <div className="pd-card">
              <div className="pd-card__body" style={{ padding: requests.length ? 0 : '24px' }}>
                {requests.length === 0 && (
                  <div className="pd-empty">
                    <i className="fas fa-video"></i> No telemedicine requests yet
                  </div>
                )}
                {requests.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Doctor</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Symptoms</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req) => {
                          const sc = STATUS_COLORS[req.status] || STATUS_COLORS.requested;
                          const isActive = ['ongoing', 'ready'].includes(req.status);
                          const isPending = ['requested', 'approved', 'scheduled'].includes(req.status);
                          return (
                            <tr key={req._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600 }}>Dr. {req.doctorName}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>{req.doctorSpecialization}</div>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151', maxWidth: 200 }}>
                                {req.symptoms || '—'}
                                {req.urgency === 'urgent' && (
                                  <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700 }}>Urgent</span>
                                )}
                                {req.urgency === 'emergency' && (
                                  <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700 }}>🚨 Emergency</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: sc.bg, color: sc.color,
                                }}>
                                  {sc.label}
                                </span>
                                {req.scheduledTime && req.status !== 'completed' && req.status !== 'cancelled' && (
                                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                    📅 {new Date(req.scheduledTime).toLocaleString()}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                  {req.meetingLink && isActive && (
                                    <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                                      🔗 Join Meeting
                                    </a>
                                  )}
                                  {isPending && (
                                    <button className="btn btn-sm btn-danger" onClick={() => handleCancel(req._id)}>
                                      Cancel
                                    </button>
                                  )}
                                  {req.status === 'completed' && (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                      Duration: {req.durationMinutes || 0} min
                                    </span>
                                  )}
                                </div>
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
    </div>
  );
}