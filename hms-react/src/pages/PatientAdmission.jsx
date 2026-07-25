// hms-react/src/pages/PatientAdmission.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const typeColors = {
  Doctor: { bg: '#eff6ff', border: '#bfdbfe', badge: '#1e40af', badgeBg: '#dbeafe' },
  Nurse: { bg: '#f0fdf4', border: '#bbf7d0', badge: '#065f46', badgeBg: '#d1fae5' },
  General: { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', badgeBg: '#f1f5f9' },
};

export default function PatientAdmission() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const [admitted, setAdmitted] = useState(false);
  const [admission, setAdmission] = useState(null);
  const [history, setHistory] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [ventilatorLogs, setVentilatorLogs] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paying, setPaying] = useState(false);

  // ── State for active token error ──
  const [activeTokenError, setActiveTokenError] = useState(null);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const patientId = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email;

  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
  }, [user]);

  const loadAdmission = useCallback(async () => {
    if (!patientId) return;
    try {
      const { data } = await API.get(`/patient-portal/${patientId}/admission`);
      console.log('📡 Admission data:', data);
      if (data.success) {
        setAdmitted(data.admitted);
        setAdmission(data.admission);
        setVitals(data.admission?.vitalsHistory || []);
        setVentilatorLogs(data.admission?.ventilatorLogs || []);
      }
    } catch (err) {
      console.error('Failed to load admission:', err);
      // Check if it's an active token error
      if (err.response?.data?.activeToken) {
        setActiveTokenError({
          message: err.response.data.message,
          activeToken: err.response.data.activeToken
        });
      }
    }
  }, [patientId]);

  const loadHistory = useCallback(async () => {
    if (!patientId) return;
    try {
      const { data } = await API.get(`/patient-portal/${patientId}/admissions/history`);
      console.log('📡 History data:', data);
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load admission history:', err);
    }
  }, [patientId]);

  const loadBills = useCallback(async () => {
    if (!patientId) return;
    try {
      const { data } = await API.get(`/patient-portal/${patientId}/bills`);
      console.log('📡 Bills data:', data);
      if (data.success) {
        setBills(data.bills || []);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    }
  }, [patientId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadAdmission(), loadHistory(), loadBills()]);
      setLoading(false);
    })();

    const iv = setInterval(() => {
      loadAdmission();
      loadBills();
    }, 20000);
    return () => clearInterval(iv);
  }, [loadAdmission, loadHistory, loadBills]);

  const handlePayBill = async (billId) => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setPaying(true);
    setActiveTokenError(null);
    
    try {
      const { data } = await API.post(`/patient-portal/${patientId}/bills/${billId}/pay`, {
        amount: Number(paymentAmount),
        paymentMethod,
      });
      
      if (data.success) {
        toast.success(`Payment of ₹${Number(paymentAmount).toLocaleString()} successful!`);
        setShowBillModal(false);
        setPaymentAmount('');
        await loadBills();
        await loadAdmission();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Payment failed';
      
      // Check if it's an active token error
      if (err.response?.data?.activeToken) {
        setActiveTokenError({
          message: errorMsg,
          activeToken: err.response.data.activeToken
        });
        toast.error('Cannot process payment: Patient has an active token');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setPaying(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); setUserDropdown(false); navigate(path); };

  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const pendingBills = bills.filter(b => b.paymentStatus === 'Pending' || b.paymentStatus === 'Partial');
  const totalPending = pendingBills.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading admission details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          {!isMobile && (
            <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
              <i className="fas fa-bars"></i>
            </button>
          )}
          <Link to="/patient-dashboard" className="pd-topbar__title">My Health</Link>
        </div>
        <div className="pd-topbar__right">
          <div className="pd-user-menu">
            <div className="pd-user-menu__trigger" onClick={() => setUserDropdown(!userDropdown)}>
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">{patientName}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10, color: 'var(--text-secondary)' }} />
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
                  {[
                    { icon: 'fa-user-circle', label: 'Profile', path: '/patient-profile' },
                    { icon: 'fa-calendar-check', label: 'Appointments', path: '/patient-appointments' },
                    { icon: 'fa-procedures', label: 'Hospital Admission', path: '/patient-admission' },
                    { icon: 'fa-video', label: 'Telemedicine', path: '/patient-telemedicine' },
                    { icon: 'fa-prescription-bottle-alt', label: 'Prescriptions', path: '/patient-prescriptions' },
                    { icon: 'fa-folder-open', label: 'My Documents', path: '/patient-documents' },
                  ].map(item => (
                    <button key={item.path} className="pd-user-dropdown__item" onClick={() => goTo(item.path)}>
                      <i className={`fas ${item.icon}`} /> {item.label}
                    </button>
                  ))}
                  <div className="pd-user-dropdown__divider" />
                  <button className="pd-user-dropdown__item pd-user-dropdown__item--danger" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt" /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <PatientSidebar
          activeItem="admission"
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        <div className="pd-main">
          <main className="pd-body">
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
                    🏥 Hospital Admission
                  </h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                    Live view of your room, treatment and charges — updates automatically as the clinic adds entries.
                  </p>
                </div>
                {pendingBills.length > 0 && (
                  <div style={{ 
                    padding: '8px 16px', 
                    background: '#fee2e2', 
                    borderRadius: 8,
                    border: '1px solid #fca5a5',
                  }}>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>
                      💰 Pending: ₹{totalPending.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Active Token Error Banner ── */}
            {activeTokenError && (
              <div style={{ 
                marginBottom: 16, 
                padding: 16, 
                background: '#fef2f2', 
                borderRadius: 12, 
                border: '1px solid #fca5a5',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>
                      Active Token Found
                    </div>
                    <div style={{ fontSize: 13, color: '#991b1b', marginTop: 4 }}>
                      {activeTokenError.message}
                    </div>
                    {activeTokenError.activeToken && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: 12, 
                        background: '#fff', 
                        borderRadius: 8,
                        fontSize: 13,
                      }}>
                        <div>
                          <strong>Token #:</strong> {activeTokenError.activeToken.tokenNumber}
                        </div>
                        <div>
                          <strong>Doctor:</strong> {activeTokenError.activeToken.doctorName || 'Unknown'}
                        </div>
                        <div>
                          <strong>Status:</strong> {activeTokenError.activeToken.status}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setActiveTokenError(null)}
                      style={{
                        marginTop: 8,
                        padding: '4px 16px',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Not currently admitted ── */}
            {!admitted && (
              <div style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
                padding: '48px 24px', textAlign: 'center', color: '#94a3b8',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>
                  You are not currently admitted
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  If you're admitted to a hospital, your room and treatment details will appear here.
                </div>
                {history.filter(a => a.status === 'Discharged').length > 0 && (
                  <div style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>
                    You have {history.filter(a => a.status === 'Discharged').length} past admission{history.filter(a => a.status === 'Discharged').length !== 1 ? 's' : ''}.
                    Scroll down to view your history.
                  </div>
                )}
              </div>
            )}

            {/* ── Currently admitted ── */}
            {admitted && admission && (
              <>
                {/* Admission Details */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: '#d1fae5', color: '#065f46',
                      }}>
                        ● Currently Admitted
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px 20px', fontSize: 12, marginTop: 12 }}>
                        <span style={{ color: '#64748b' }}>Admission ID</span>
                        <span style={{ color: '#64748b' }}>Room</span>
                        <span style={{ color: '#64748b' }}>Doctor</span>
                        <strong>{admission.admissionId}</strong>
                        <strong>{admission.roomType} {admission.roomNumber ? `· #${admission.roomNumber}` : ''}</strong>
                        <strong>{admission.doctor?.name ? `Dr. ${admission.doctor.name}` : '—'}</strong>
                        <span style={{ color: '#64748b' }}>Admitted</span>
                        <span style={{ color: '#64748b' }}>Rate/day</span>
                        <span style={{ color: '#64748b' }}>Days</span>
                        <strong>{fmt(admission.admissionDate)}</strong>
                        <strong>₹{(admission.roomRatePerDay || 0).toLocaleString()}</strong>
                        <strong>{admission.days} day{admission.days !== 1 ? 's' : ''}</strong>
                      </div>
                      {admission.isICU && (
                        <div style={{ marginTop: 8 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                            background: '#ede9fe', color: '#6d28d9',
                          }}>
                            🏥 ICU Patient
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cost summary */}
                  <div style={{
                    marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap',
                    background: '#f8fafc', borderRadius: 10, padding: '12px 16px',
                  }}>
                    {[
                      ['Medicines total', `₹${admission.medicinesTotal?.toLocaleString() || 0}`],
                      [`Room (${admission.days}d × ₹${(admission.roomRatePerDay || 0).toLocaleString()})`, `₹${admission.roomRent?.toLocaleString() || 0}`],
                      ['Running total', `₹${admission.grandTotal?.toLocaleString() || 0}`],
                    ].map(([l, v], i) => (
                      <div key={l} style={{ flex: 1, minWidth: isMobile ? 'calc(50% - 8px)' : 130, minHeight: 0 }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{l}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: i === 2 ? '#0f4c81' : '#1e293b', marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── ICU Vitals Monitoring ── */}
                {admission.isICU && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>
                      📊 ICU Vitals Monitoring
                    </h3>
                    
                    {/* Latest Vitals */}
                    {admission.latestVitals && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: 10,
                        marginBottom: 16,
                        background: '#f0fdf4',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '1px solid #bbf7d0',
                      }}>
                        {[
                          { label: 'HR', value: admission.latestVitals.heartRate, unit: 'bpm' },
                          { label: 'BP', value: admission.latestVitals.systolicBP ? `${admission.latestVitals.systolicBP}/${admission.latestVitals.diastolicBP}` : '-', unit: '' },
                          { label: 'SpO2', value: admission.latestVitals.spo2, unit: '%' },
                          { label: 'Temp', value: admission.latestVitals.temperature, unit: '°C' },
                          { label: 'GCS', value: admission.latestVitals.gcsTotal, unit: '' },
                          { label: 'RASS', value: admission.latestVitals.rassScore, unit: '' },
                        ].map((item) => (
                          <div key={item.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{item.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f4c81' }}>
                              {item.value || '-'} <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Vitals History Table */}
                    {vitals.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['Time', 'HR', 'BP', 'SpO2', 'Temp', 'RR', 'GCS', 'RASS', 'Pain', 'By'].map(h => (
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {vitals.slice(0, 10).map((v, idx) => (
                              <tr key={v._id || idx} style={{ borderBottom: idx < vitals.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 11 }}>
                                  {fmtTime(v.createdAt)}
                                </td>
                                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{v.heartRate || '-'}</td>
                                <td style={{ padding: '6px 10px' }}>{v.systolicBP}/{v.diastolicBP || '-'}</td>
                                <td style={{ padding: '6px 10px' }}>{v.spo2 || '-'}%</td>
                                <td style={{ padding: '6px 10px' }}>{v.temperature || '-'}°C</td>
                                <td style={{ padding: '6px 10px' }}>{v.respiratoryRate || '-'}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 600 }}>{v.gcsTotal || '-'}</td>
                                <td style={{ padding: '6px 10px' }}>{v.rassScore || '-'}</td>
                                <td style={{ padding: '6px 10px' }}>{v.painScore || '-'}</td>
                                <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 11 }}>{v.loggedByName || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {vitals.length > 10 && (
                          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                            + {vitals.length - 10} more records
                          </div>
                        )}
                      </div>
                    )}
                    {vitals.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                        No vitals recorded yet
                      </div>
                    )}
                  </div>
                )}

                {/* ── Ventilator Logs ── */}
                {admission.isICU && ventilatorLogs.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>
                      💨 Ventilator Logs
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['Start', 'End', 'Mode', 'FiO2', 'PEEP', 'TV', 'Rate', 'Hours', 'Charge'].map(h => (
                              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ventilatorLogs.map((v, idx) => (
                            <tr key={v._id || idx} style={{ borderBottom: idx < ventilatorLogs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 11 }}>{fmtTime(v.startTime)}</td>
                              <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 11 }}>{v.endTime ? fmtTime(v.endTime) : 'Active'}</td>
                              <td style={{ padding: '6px 10px' }}>{v.mode}</td>
                              <td style={{ padding: '6px 10px' }}>{v.fio2}%</td>
                              <td style={{ padding: '6px 10px' }}>{v.peep}</td>
                              <td style={{ padding: '6px 10px' }}>{v.tidalVolume}</td>
                              <td style={{ padding: '6px 10px' }}>{v.rate}</td>
                              <td style={{ padding: '6px 10px' }}>{v.totalHours}h</td>
                              <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f4c81' }}>₹{v.totalCharge}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Medicine Log ── */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>💊 Medicines Given</h3>
                  {admission.medicineLog?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                      No medicines recorded yet
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['Medicine', 'Dosage', 'Qty', 'Unit Price', 'Total', 'Given by', 'Date'].map(h => (
                              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {admission.medicineLog.map((m, i) => (
                            <tr key={m._id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.medicineName}</td>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{m.dosage || '—'}</td>
                              <td style={{ padding: '8px 10px' }}>{m.quantity}</td>
                              <td style={{ padding: '8px 10px' }}>₹{(m.unitPrice || 0).toLocaleString()}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 600 }}>₹{(m.total || 0).toLocaleString()}</td>
                              <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 12 }}>{m.givenByName || '—'}</td>
                              <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 11 }}>{fmtTime(m.givenAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Follow-up Notes ── */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>📋 Doctor &amp; Nurse Notes</h3>
                  {admission.followupLog?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                      No notes added yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[...admission.followupLog].reverse().map((log, i) => {
                        const tc = typeColors[log.type] || typeColors.General;
                        return (
                          <div key={i} style={{ background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: tc.badgeBg, color: tc.badge }}>
                                  {log.type}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{log.writtenByName || '—'}</span>
                              </div>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtTime(log.writtenAt)}</span>
                            </div>
                            <p style={{ fontSize: 13, color: '#334155', margin: '0 0 8px', lineHeight: 1.6 }}>{log.note}</p>
                            {log.vitals && Object.values(log.vitals).some(Boolean) && (
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {[
                                  ['🩸 BP', log.vitals.bp],
                                  ['🌡️ Temp', log.vitals.temp],
                                  ['❤️ Pulse', log.vitals.pulse],
                                  ['💨 SpO2', log.vitals.spo2],
                                ].filter(([, v]) => v).map(([l, v]) => (
                                  <span key={l} style={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', color: '#475569' }}>
                                    {l}: <strong>{v}</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Billing Section ── */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>
                💳 Billing & Payments
              </h3>
              
              {bills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                  No bills available
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Bill ID', 'Total', 'Paid', 'Balance', 'Status', 'Date', 'Action'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => {
                        const balance = bill.totalAmount - bill.paidAmount;
                        const statusColor = bill.paymentStatus === 'Paid' ? '#16a34a' : 
                                           bill.paymentStatus === 'Partial' ? '#f59e0b' : '#dc2626';
                        const statusBg = bill.paymentStatus === 'Paid' ? '#dcfce7' : 
                                        bill.paymentStatus === 'Partial' ? '#fef3c7' : '#fee2e2';
                        
                        return (
                          <tr key={bill._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f4c81' }}>{bill.billId}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>₹{bill.totalAmount.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', color: '#16a34a' }}>₹{bill.paidAmount.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                              ₹{balance.toLocaleString()}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                background: statusBg, color: statusColor,
                              }}>
                                {bill.paymentStatus}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 12 }}>{fmt(bill.createdAt)}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {bill.paymentStatus !== 'Paid' && (
                                <button
                                  onClick={() => { setSelectedBill(bill); setPaymentAmount(balance); setShowBillModal(true); }}
                                  style={{
                                    padding: '4px 12px', borderRadius: 6, border: 'none',
                                    background: '#0f4c81', color: '#fff',
                                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                  }}
                                >
                                  Pay
                                </button>
                              )}
                              {bill.paymentStatus === 'Paid' && (
                                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✅ Paid</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── OT Charges Section ── */}
            {patientId && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>
                  🏥 Operation Theatre Charges
                </h3>
                <OTChargesSection patientId={patientId} />
              </div>
            )}

            {/* ── Past Admissions History ── */}
            {history.filter(a => a.status === 'Discharged' || a.status === 'Transferred').length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
                <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>
                  📁 Past Admissions ({history.filter(a => a.status === 'Discharged' || a.status === 'Transferred').length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history
                    .filter(a => a.status === 'Discharged' || a.status === 'Transferred')
                    .map((adm) => (
                      <div key={adm._id} style={{ 
                        border: '1px solid #f1f5f9', 
                        borderRadius: 10, 
                        padding: '12px 14px',
                        background: '#fafafa'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>
                                {adm.roomType} {adm.roomNumber ? `· #${adm.roomNumber}` : ''}
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                padding: '2px 8px', borderRadius: 20,
                                background: '#fee2e2', color: '#dc2626',
                              }}>
                                Discharged
                              </span>
                              {adm.isICU && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  padding: '2px 8px', borderRadius: 20,
                                  background: '#ede9fe', color: '#6d28d9',
                                }}>
                                  ICU
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                              {fmt(adm.admissionDate)} → {fmt(adm.dischargeDate)} · {adm.days} day{adm.days !== 1 ? 's' : ''}
                              {adm.doctor?.name ? ` · Dr. ${adm.doctor.name}` : ''}
                            </div>
                            {adm.notes && (
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                                Note: {adm.notes}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Total Charges</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f4c81' }}>
                              ₹{adm.grandTotal?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                              {adm.admissionId}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {showBillModal && selectedBill && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={(e) => { if (e.target === e.currentTarget) { setShowBillModal(false); } }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28,
            maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative',
          }}>
            <button
              onClick={() => setShowBillModal(false)}
              style={{
                position: 'absolute', top: 12, right: 16,
                background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              ×
            </button>
            
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>💳 Pay Bill</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Bill: {selectedBill.billId}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Total</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>₹{selectedBill.totalAmount.toLocaleString()}</div>
              </div>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Paid</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>₹{selectedBill.paidAmount.toLocaleString()}</div>
              </div>
              <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 8, gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Balance Due</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>₹{(selectedBill.totalAmount - selectedBill.paidAmount).toLocaleString()}</div>
              </div>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Amount to Pay (₹)
              </label>
              <input
                type="number"
                min="0"
                max={selectedBill.totalAmount - selectedBill.paidAmount}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: 8, border: '1.5px solid #d0dce8',
                  fontSize: 16, fontWeight: 600,
                  fontFamily: 'inherit',
                }}
                placeholder="Enter amount"
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px',
                  borderRadius: 8, border: '1.5px solid #d0dce8',
                  fontSize: 14, fontFamily: 'inherit',
                }}
              >
                <option value="UPI">📱 UPI</option>
                <option value="Card">💳 Card</option>
                <option value="Cash">💵 Cash</option>
                <option value="Insurance">🏥 Insurance</option>
                <option value="Wallet">📱 Wallet</option>
              </select>
            </div>
            
            <button
              onClick={() => handlePayBill(selectedBill._id)}
              disabled={paying || !paymentAmount || Number(paymentAmount) <= 0}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 8, border: 'none',
                background: (paying || !paymentAmount || Number(paymentAmount) <= 0) ? '#94a3b8' : '#0f4c81',
                color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: (paying || !paymentAmount || Number(paymentAmount) <= 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {paying ? 'Processing...' : `Pay ₹${Number(paymentAmount || 0).toLocaleString()}`}
            </button>
            
            <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              🔒 Secure payment · You will receive a confirmation receipt
            </div>
          </div>
        </div>
      )}

      <BottomNav activeItem="admission" />
    </div>
  );
}

// ── OT Charges Component ──
function OTChargesSection({ patientId }) {
  const [otCharges, setOtCharges] = useState({ otItems: [], totalOTCharges: 0, bills: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOTCharges = async () => {
      try {
        const res = await API.get(`/patient-portal/${patientId}/ot-charges`);
        if (res.data.success) {
          setOtCharges({
            otItems: res.data.otItems || [],
            totalOTCharges: res.data.totalOTCharges || 0,
            bills: res.data.bills || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch OT charges:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOTCharges();
  }, [patientId]);

  if (loading) {
    return <div style={{ fontSize: 13, color: '#64748b', padding: '12px 0' }}>Loading OT charges...</div>;
  }

  if (otCharges.otItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: 13 }}>
        No OT charges recorded yet
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 12,
        padding: '12px 16px',
        background: '#f0fdf4',
        borderRadius: 8,
        border: '1px solid #bbf7d0',
      }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>🏥 Total OT Charges</span>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
            ({otCharges.bills} bill{otCharges.bills > 1 ? 's' : ''})
          </span>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#0f4c81' }}>
          ₹{otCharges.totalOTCharges.toLocaleString()}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Description', 'Amount', 'Bill', 'Date'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {otCharges.otItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: idx < otCharges.otItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '6px 10px' }}>{item.description}</td>
                <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f4c81' }}>₹{item.total.toLocaleString()}</td>
                <td style={{ padding: '6px 10px', color: '#64748b' }}>{item.billId}</td>
                <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 11 }}>
                  {new Date(item.billDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}