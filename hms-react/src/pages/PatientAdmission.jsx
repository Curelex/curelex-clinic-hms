// hms-react/src/pages/PatientAdmission.jsx
// Read-only, transparent view of the patient's hospital admission (IPD).
// Mirrors the staff-side IPD.jsx detail panel field-for-field and uses the
// identical days/roomRent/medicinesTotal/grandTotal math (computed on the
// backend in patientPortal.js) so nothing can ever differ from what staff
// sees — full transparency, no possibility of mismatched billing.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import '../css/PatientDashboard.css';
import PatientSidebar from '../components/PatientSidebar';

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

const typeColors = {
  Doctor:  { bg: '#eff6ff', border: '#bfdbfe', badge: '#1e40af', badgeBg: '#dbeafe' },
  Nurse:   { bg: '#f0fdf4', border: '#bbf7d0', badge: '#065f46', badgeBg: '#d1fae5' },
  General: { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', badgeBg: '#f1f5f9' },
};

export default function PatientAdmission() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const [admitted, setAdmitted]   = useState(false);
  const [admission, setAdmission] = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      if (data.success) {
        setAdmitted(data.admitted);
        setAdmission(data.admission);
      }
    } catch (err) {
      console.error('Failed to load admission:', err);
    }
  }, [patientId]);

  const loadHistory = useCallback(async () => {
    if (!patientId) return;
    try {
      const { data } = await API.get(`/patient-portal/${patientId}/admissions/history`);
      if (data.success) setHistory(data.admissions || []);
    } catch (err) {
      console.error('Failed to load admission history:', err);
    }
  }, [patientId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadAdmission(), loadHistory()]);
      setLoading(false);
    })();

    // Auto-refresh every 20s so room/medicine updates from the clinic
    // appear live, without the patient needing to reload the page.
    const iv = setInterval(loadAdmission, 20000);
    return () => clearInterval(iv);
  }, [loadAdmission, loadHistory]);

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); navigate(path); };

  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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
      {/* TOPBAR */}
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

        {/* SIDEBAR */}
        <PatientSidebar
          activeItem="admissions"
          onClose={() => setSidebarOpen(false)}
          admission={admission}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />

        {/* MAIN CONTENT */}
        <div className="pd-main">
          <main className="pd-body">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
                🏥 Hospital Admission
              </h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                Live view of your room, treatment and charges — updates automatically as the clinic adds entries.
              </p>
            </div>

            {/* ── Not currently admitted ──────────────────────────── */}
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
              </div>
            )}

            {/* ── Currently admitted — live detail ────────────────── */}
            {admitted && admission && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: '#d1fae5', color: '#065f46',
                    }}>
                      ● Admitted
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '4px 28px', fontSize: 12, marginTop: 12 }}>
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
                  </div>
                </div>

                {/* Cost summary strip */}
                <div style={{
                  marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap',
                  background: '#f8fafc', borderRadius: 10, padding: '12px 16px',
                }}>
                  {[
                    ['Medicines total', `₹${admission.medicinesTotal.toLocaleString()}`],
                    [`Room rent (${admission.days}d × ₹${(admission.roomRatePerDay || 0).toLocaleString()})`, `₹${admission.roomRent.toLocaleString()}`],
                    ['Running total', `₹${admission.grandTotal.toLocaleString()}`],
                  ].map(([l, v], i) => (
                    <div key={l} style={{ flex: 1, minWidth: 130 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{l}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: i === 2 ? '#0f4c81' : '#1e293b' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                  💡 This total updates automatically and matches exactly what the hospital sees — no surprises at discharge.
                </div>
              </div>
            )}

            {/* ── Medicine Log (read-only) ─────────────────────────── */}
            {admitted && admission && (
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
            )}

            {/* ── Follow-up / Doctor & Nurse notes (read-only) ─────── */}
            {admitted && admission && (
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
            )}

            {/* ── Past admissions history ──────────────────────────── */}
            {history.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
                <h3 style={{ fontSize: 15, margin: '0 0 14px', color: '#1e293b' }}>📁 Past Admissions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map((adm) => (
                    <div key={adm._id} style={{ border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{adm.roomType} {adm.roomNumber ? `· #${adm.roomNumber}` : ''}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {fmt(adm.admissionDate)} → {fmt(adm.dischargeDate)} · {adm.days} day{adm.days !== 1 ? 's' : ''}
                            {adm.doctor?.name ? ` · Dr. ${adm.doctor.name}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Total paid</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f4c81' }}>₹{adm.grandTotal.toLocaleString()}</div>
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
    </div>
  );
}