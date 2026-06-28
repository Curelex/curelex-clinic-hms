// hms-react/src/pages/PatientAppointments.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';

// ── What the patient sees for each HMS queue status ──────────────────────
// "Pending"  = clinic hasn't accepted the portal request yet
// "Waiting"  = accepted, in the queue
// "Called"   = doctor is ready for them
// "Done"     = consultation complete
// "Skipped"  = rejected or skipped
const PATIENT_STATUS = {
  Pending: {
    label: 'Awaiting Confirmation',
    bg: '#ede9fe',
    text: '#5b21b6',
    dot: '#7c3aed',
  },
  Waiting: {
    label: 'Confirmed – In Queue',
    bg: '#dbeafe',
    text: '#1e40af',
    dot: '#2563eb',
  },
  Called: {
    label: 'Doctor is Ready',
    bg: '#dcfce7',
    text: '#166534',
    dot: '#16a34a',
  },
  Done: {
    label: 'Completed',
    bg: '#f0fdf4',
    text: '#065f46',
    dot: '#059669',
  },
  Skipped: {
    label: 'Not Seen / Cancelled',
    bg: '#fee2e2',
    text: '#991b1b',
    dot: '#dc2626',
  },
};

const PAYMENT_STATUS_COLORS = {
  paid:    { bg: '#dcfce7', text: '#166534' },
  pending: { bg: '#fef3c7', text: '#92400e' },
  failed:  { bg: '#fee2e2', text: '#991b1b' },
};

const STEP_DETAILS = 'details';
const STEP_PAYMENT = 'payment';

export default function PatientAppointments() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [clinics, setClinics]           = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [step, setStep]                 = useState(STEP_DETAILS);
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const [payMethod, setPayMethod]   = useState('card');
  const [paying, setPaying]         = useState(false);
  const [payError, setPayError]     = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv]       = useState('');
  const [upiId, setUpiId]           = useState('');

  const patientId   = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || '';
  const patientEmail = patient?.email || user?.email || '';

  const [form, setForm] = useState({
    name: patientName,
    age: patient?.age || '',
    gender: patient?.gender || '',
    symptoms: '',
    clinicId: '',
    doctorId: '',
    consultationType: 'in-person',
  });

  useEffect(() => {
    if (!user)       { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/');             return; }
    loadAppointments();
    loadClinics();
  }, [user]);

  async function loadAppointments() {
    setLoading(true);
    try {
      const res = await API.get(`/patient-portal/${patientId}/appointments`);
      if (res.data.success) setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
    setLoading(false);
  }

  async function loadClinics() {
    try {
      const res = await API.get('/clinics');
      if (res.data.success) setClinics(res.data.clinics || []);
    } catch (err) {
      console.error('Error loading clinics:', err);
    }
  }

  async function loadDoctors(clinicId) {
    if (!clinicId) { setDoctors([]); return; }
    setDoctorsLoading(true);
    try {
      const res = await API.get(`/patient-portal/doctors/${clinicId}`);
      if (res.data.success) setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Error loading doctors:', err);
      setDoctors([]);
    }
    setDoctorsLoading(false);
  }

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); navigate(path); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const handleFormChange = (field, value) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'clinicId') next.doctorId = '';
      return next;
    });
    setFormError('');
    if (field === 'clinicId') loadDoctors(value);
  };

  const resetPaymentFields = () => {
    setPayMethod('card'); setPayError('');
    setCardNumber(''); setCardExpiry(''); setCardCvv(''); setUpiId('');
    setPaying(false);
  };

  const openModal = () => {
    setForm({
      name: patientName,
      age: patient?.age || '',
      gender: patient?.gender || '',
      symptoms: '',
      clinicId: '',
      doctorId: '',
      consultationType: 'in-person',
    });
    setDoctors([]);
    setFormError('');
    setStep(STEP_DETAILS);
    resetPaymentFields();
    setShowModal(true);
  };

  const closeModal = () => { if (submitting || paying) return; setShowModal(false); };

  const selectedDoctor = doctors.find(d => d._id === form.doctorId);

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.symptoms || !form.clinicId || !form.doctorId) {
      setFormError('Please fill in all fields, including selecting a clinic and doctor.');
      return;
    }
    setFormError('');
    setStep(STEP_PAYMENT);
  };

  const handleConfirmPayment = async () => {
    setPayError('');
    if (payMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCvv) {
        setPayError('Please fill in all card details.');
        return;
      }
    } else if (payMethod === 'upi') {
      if (!upiId) { setPayError('Please enter your UPI ID.'); return; }
    }

    setPaying(true);
    try {
      const payRes = await API.post(`/patient-portal/payments/mock`, {
        doctorId: form.doctorId,
        amount: selectedDoctor?.consultationFee || 0,
        method: payMethod,
      });

      if (!payRes.data.success) {
        setPayError('Payment failed. Please try again.');
        setPaying(false);
        return;
      }

      const { paymentStatus, transactionId, paidAt } = payRes.data.payment;

      setSubmitting(true);
      const res = await API.post(`/patient-portal/${patientId}/appointments`, {
        name:             form.name,
        age:              form.age,
        gender:           form.gender,
        symptoms:         form.symptoms,
        clinicId:         form.clinicId,
        doctorId:         form.doctorId,
        consultationType: form.consultationType,
        paymentStatus,
        transactionId,
        paidAt,
        method: payMethod,
      });

      if (res.data.success) {
        setShowModal(false);
        loadAppointments();
      } else {
        setPayError(res.data.message || 'Could not create token after payment.');
      }
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment could not be completed. Please try again.');
    }
    setPaying(false);
    setSubmitting(false);
  };

  const initials = (patientName || 'U')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }} />
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
            <i className="fas fa-bars" />
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
        <div
          className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <PatientSidebar
          activeItem="appointments"
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        <div className="pd-main">
          <main className="pd-body">

            {/* ── Page header ── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
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
                <i className="fas fa-plus" /> Create New Token
              </button>
            </div>

            {/* ── Status legend ── */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '10px',
              marginBottom: '16px',
            }}>
              {Object.entries(PATIENT_STATUS).map(([, s]) => (
                <span key={s.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: s.text, background: s.bg,
                  border: `1px solid ${s.dot}33`,
                  borderRadius: 999, padding: '4px 10px', fontWeight: 600,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: s.dot, display: 'inline-block',
                  }} />
                  {s.label}
                </span>
              ))}
            </div>

            {/* ── Table ── */}
            <div className="pd-card">
              <div className="pd-card__body" style={{ padding: appointments.length ? 0 : '24px' }}>
                {appointments.length === 0 ? (
                  <div className="pd-empty">
                    <i className="fas fa-calendar-times" /> No appointments yet. Create a new token to get started.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', background: '#f8fafc' }}>
                          {['Token #', 'Date', 'Clinic', 'Doctor', 'Type', 'Symptoms', 'Fee', 'Payment', 'Status'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 700, fontSize: 12 }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((apt) => {
                          // ── Use patient-friendly status display ──────────
                          const ps = PATIENT_STATUS[apt.status] || PATIENT_STATUS.Pending;
                          const pc = PAYMENT_STATUS_COLORS[apt.paymentStatus] || PAYMENT_STATUS_COLORS.pending;

                          return (
                            <tr key={apt._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1a2236' }}>
                                #{apt.tokenNumber}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {formatDate(apt.createdAt)}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.clinicId?.name || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : 'Not yet assigned'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151', textTransform: 'capitalize' }}>
                                {apt.consultationType || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151', maxWidth: 200 }}>
                                {apt.symptoms
                                  ? apt.symptoms.length > 50
                                    ? apt.symptoms.slice(0, 50) + '…'
                                    : apt.symptoms
                                  : '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.consultationFee ? `₹${apt.consultationFee}` : '-'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  background: pc.bg, color: pc.text,
                                  padding: '4px 10px', borderRadius: 999,
                                  fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                                }}>
                                  {apt.paymentStatus === 'paid' ? '✓ Paid' : apt.paymentStatus || 'Pending'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {/* ── Patient-friendly status badge ── */}
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  background: ps.bg, color: ps.text,
                                  padding: '4px 10px', borderRadius: 999,
                                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                                }}>
                                  <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: ps.dot, display: 'inline-block', flexShrink: 0,
                                  }} />
                                  {ps.label}
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

      {/* ── CREATE TOKEN MODAL ─────────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '16px',
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px', width: '100%', maxWidth: '460px',
              padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >

            {/* ── Step 1: Details ── */}
            {step === STEP_DETAILS && (
              <>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a2236' }}>
                  Create New Token
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7a99' }}>
                  Choose a clinic and doctor, then pay the consultation fee to confirm your token.
                </p>

                <form onSubmit={handleDetailsSubmit}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Full Name *</label>
                    <input type="text" value={form.name}
                      onChange={e => handleFormChange('name', e.target.value)}
                      style={inputStyle} placeholder="Enter full name" />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Age *</label>
                      <input type="number" min="0" max="120" value={form.age}
                        onChange={e => handleFormChange('age', e.target.value)}
                        style={inputStyle} placeholder="Age" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Gender *</label>
                      <select value={form.gender}
                        onChange={e => handleFormChange('gender', e.target.value)}
                        style={inputStyle}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Symptoms *</label>
                    <textarea value={form.symptoms}
                      onChange={e => handleFormChange('symptoms', e.target.value)}
                      style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                      placeholder="Describe what's bothering you" />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Clinic *</label>
                    <select value={form.clinicId}
                      onChange={e => handleFormChange('clinicId', e.target.value)}
                      style={inputStyle}>
                      <option value="">Select a clinic</option>
                      {clinics.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    {clinics.length === 0 && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>
                        No clinics available. Please contact support.
                      </p>
                    )}
                  </div>

                  {form.clinicId && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Doctor *</label>
                      {doctorsLoading ? (
                        <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>
                          <i className="fas fa-spinner fa-spin" /> Loading doctors...
                        </p>
                      ) : (
                        <>
                          <select value={form.doctorId}
                            onChange={e => handleFormChange('doctorId', e.target.value)}
                            style={inputStyle}>
                            <option value="">Select a doctor</option>
                            {doctors.map(doc => (
                              <option key={doc._id} value={doc._id}>
                                Dr. {doc.name} — {doc.department || 'General'} — ₹{doc.consultationFee || 0}
                              </option>
                            ))}
                          </select>
                          {doctors.length === 0 && (
                            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>
                              No doctors available at this clinic yet.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {form.doctorId && (
                    <div style={{ marginBottom: 18 }}>
                      <label style={labelStyle}>Consultation Type *</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {['in-person', 'online'].map(type => (
                          <label key={type} style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 12px', borderRadius: 8,
                            border: `1px solid ${form.consultationType === type ? '#2d6be4' : '#d1d5db'}`,
                            background: form.consultationType === type ? '#eff6ff' : 'white',
                            cursor: 'pointer', fontSize: 13, color: '#374151',
                          }}>
                            <input type="radio" name="consultationType" value={type}
                              checked={form.consultationType === type}
                              onChange={e => handleFormChange('consultationType', e.target.value)} />
                            {type === 'in-person' ? 'In-Person' : 'Online'}
                          </label>
                        ))}
                      </div>
                      {selectedDoctor && (
                        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#374151' }}>
                          Consultation fee: <strong>₹{selectedDoctor.consultationFee || 0}</strong>{' '}
                          <span style={{ color: '#6b7a99' }}>(payable now to confirm your token)</span>
                        </p>
                      )}
                    </div>
                  )}

                  {formError && (
                    <div style={{
                      background: '#fee2e2', color: '#991b1b', padding: '10px 12px',
                      borderRadius: 8, fontSize: 13, marginBottom: 14,
                    }}>
                      {formError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={closeModal}
                      className="pd-btn pd-btn--outline" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className="pd-btn pd-btn--primary" style={{ flex: 1 }}>
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Step 2: Payment ── */}
            {step === STEP_PAYMENT && (
              <>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#1a2236' }}>
                  Confirm &amp; Pay
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7a99' }}>
                  This is a test payment screen. No real money will be charged.
                </p>

                <div style={{
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  borderRadius: 10, padding: 14, marginBottom: 18,
                }}>
                  {[
                    ['Doctor',         `Dr. ${selectedDoctor?.name}`],
                    ['Specialization', selectedDoctor?.department || 'General'],
                    ['Consultation',   form.consultationType],
                  ].map(([label, val]) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 13, marginBottom: 6,
                    }}>
                      <span style={{ color: '#6b7a99' }}>{label}</span>
                      <span style={{ color: '#1a2236', fontWeight: 600, textTransform: 'capitalize' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 15, fontWeight: 700, color: '#1a2236',
                    marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb',
                  }}>
                    <span>Amount to pay</span>
                    <span>₹{selectedDoctor?.consultationFee || 0}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[{ id: 'card', label: 'Card' }, { id: 'upi', label: 'UPI' }].map(m => (
                    <button key={m.id} type="button"
                      onClick={() => { setPayMethod(m.id); setPayError(''); }}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 13,
                        fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${payMethod === m.id ? '#2d6be4' : '#d1d5db'}`,
                        background: payMethod === m.id ? '#2d6be4' : 'white',
                        color: payMethod === m.id ? 'white' : '#374151',
                      }}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {payMethod === 'card' && (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Card Number</label>
                      <input type="text" value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        style={inputStyle} placeholder="4242 4242 4242 4242" maxLength={19} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Expiry</label>
                        <input type="text" value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          style={inputStyle} placeholder="MM/YY" maxLength={5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>CVV</label>
                        <input type="text" value={cardCvv}
                          onChange={e => setCardCvv(e.target.value)}
                          style={inputStyle} placeholder="123" maxLength={3} />
                      </div>
                    </div>
                  </>
                )}

                {payMethod === 'upi' && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>UPI ID</label>
                    <input type="text" value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      style={inputStyle} placeholder="yourname@upi" />
                  </div>
                )}

                {payError && (
                  <div style={{
                    background: '#fee2e2', color: '#991b1b', padding: '10px 12px',
                    borderRadius: 8, fontSize: 13, marginBottom: 14,
                  }}>
                    {payError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep(STEP_DETAILS)}
                    disabled={paying || submitting}
                    className="pd-btn pd-btn--outline" style={{ flex: 1 }}>
                    Back
                  </button>
                  <button type="button" onClick={handleConfirmPayment}
                    disabled={paying || submitting}
                    className="pd-btn pd-btn--primary" style={{ flex: 1 }}>
                    {paying || submitting ? 'Processing...' : `Pay ₹${selectedDoctor?.consultationFee || 0}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14,
  fontFamily: 'inherit', boxSizing: 'border-box',
};