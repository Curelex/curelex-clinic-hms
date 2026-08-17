// hms-react/src/components/TokenQueue.jsx
import React, { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, Btn, Badge, Modal, Input, Select, Alert } from './UI';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Pending: { bg: '#f3f4f6', color: '#6b7280', label: '⏳ Pending' },
  Waiting: { bg: '#fef3c7', color: '#92400e', label: '🟡 Waiting' },
  Called: { bg: '#dbeafe', color: '#1e40af', label: '📞 Called' },
  Done: { bg: '#d1fae5', color: '#065f46', label: '✅ Done' },
  Skipped: { bg: '#fee2e2', color: '#b91c1c', label: '⏭️ Skipped' },
};

export default function TokenQueue({ clinicId, activePlan, onRefresh }) {
  const { user, getEffectiveClinicId } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [showReceipt, setShowReceipt] = useState(null);
  const [activeTokenError, setActiveTokenError] = useState(null);
  const [patients, setPatients] = useState([]);

  // ── Token Generation Modal ──
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showReturningForm, setShowReturningForm] = useState(false);
  const [selectedReturningPatient, setSelectedReturningPatient] = useState(null);
  const [selectedReturningVisits, setSelectedReturningVisits] = useState([]);

  const [genForm, setGenForm] = useState({
    patientId: '',
    doctorId: '',
    patientName: '',
    phone: '',
    age: '',
    gender: 'Male',
    symptoms: '',
    consultationType: 'in-person',
    email: '',
    address: '',
    bloodGroup: '',
    dob: '',
    allergies: '',
    notes: '',
    paymentMethod: 'cash',
    totalFee: '',
    paid: '',
  });

  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);

  const effectiveClinicId = getEffectiveClinicId() || clinicId;

  // ── Fetch tokens ──
  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const [tokensRes, summaryRes, doctorsRes, patientsRes] = await Promise.all([
        API.get(`/tokens/today?clinicId=${effectiveClinicId}`),
        API.get(`/tokens/summary?clinicId=${effectiveClinicId}`),
        API.get('/auth/clinic-doctors'),
        API.get(`/patients?limit=200&clinicId=${effectiveClinicId}`),
      ]);

      setTokens(tokensRes.data.tokens || []);
      setSummary(summaryRes.data.summary || []);
      setDoctors(doctorsRes.data.doctors);
      setPatients(patientsRes.data.patients || []);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
      toast.error('Failed to load token queue');
    }
    setLoading(false);
  }, [effectiveClinicId]);

  useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  // ── Update token status ──
  const updateStatus = async (tokenId, status) => {
    try {
      await API.patch(`/tokens/${tokenId}/status`, { status, clinicId: effectiveClinicId });
      toast.success(`Token status updated to ${status}`);
      fetchTokens();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Phone search (like hospital) ──
  const handlePhoneSearch = (val) => {
    setPatientSearch(val);
    setSelectedReturningPatient(null);
    setShowReturningForm(false);
    clearTimeout(searchTimer);

    if (!val.trim()) {
      setPatientResults([]);
      return;
    }

    // If exactly 10 digits, search immediately
    const digits = val.replace(/\D/g, '');
    if (digits.length === 10) {
      searchPatients(digits);
      return;
    }

    setIsSearching(true);
    setSearchTimer(setTimeout(async () => {
      await searchPatients(val);
    }, 400));
  };

  const searchPatients = async (query) => {
    try {

      const { data } = await API.get(`/patients?search=${encodeURIComponent(query)}&limit=8&global=true`);
      console.log(data);
      setPatientResults(data.patients || []);
    } catch (err) {
      console.error('Patient search error:', err);
      setPatientResults([]);
    }
    setIsSearching(false);
  };

  const selectPatient = (patient) => {
    console.log('✅ Patient selected:', patient);
    setSelectedReturningPatient(patient);

    // Get visit history
    const visits = patients
      .filter(p => p.phone === patient.phone && p.name?.toLowerCase() === patient.name?.toLowerCase())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setSelectedReturningVisits(visits);

    setGenForm(prev => ({
      ...prev,
      patientId: patient._id,
      patientName: patient.name,
      phone: patient.phone || '',
      age: patient.age || '',
      gender: patient.gender || 'Male',
      email: patient.email || '',
      address: patient.address || '',
      bloodGroup: patient.bloodGroup || '',
      dob: patient.dob ? patient.dob.split('T')[0] : '',
      allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies || '',
    }));
    setPatientSearch(patient.name);
    setPatientResults([]);
    setGenError('');
    setShowReturningForm(true);
  };

  const clearPatientSelection = () => {
    setSelectedReturningPatient(null);
    setSelectedReturningVisits([]);
    setShowReturningForm(false);
    setGenForm(prev => ({
      ...prev,
      patientId: '',
      patientName: '',
      phone: '',
      age: '',
      email: '',
      address: '',
      bloodGroup: '',
      dob: '',
      allergies: '',
    }));
    setPatientSearch('');
    setPatientResults([]);
  };

  // ── Get patient visits ──
  const getPatientVisits = (patient) => {
    return patients
      .filter(p => p.phone === patient.phone && p.name?.toLowerCase() === patient.name?.toLowerCase())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // ── Register new patient (inline form) ──
  const handleRegisterPatient = async () => {
    if (!genForm.patientName.trim()) {
      setGenError('Patient name is required');
      return;
    }
    if (!genForm.phone || genForm.phone.length < 10) {
      setGenError('Valid 10-digit phone number is required');
      return;
    }
    if (!genForm.doctorId) {
      setGenError('Please select a doctor');
      return;
    }

    setRegisterBusy(true);
    setGenError('');

    try {
      const { data } = await API.post('/patients', {
        name: genForm.patientName,
        phone: genForm.phone,
        age: genForm.age ? parseInt(genForm.age) : 0,
        gender: genForm.gender,
        email: genForm.email || '',
        address: genForm.address || '',
        bloodGroup: genForm.bloodGroup || '',
        dob: genForm.dob || '',
        allergies: genForm.allergies ? genForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        assignedDoctor: genForm.doctorId,
        clinicId: effectiveClinicId,
        status: 'Active',
      });

      if (data.patient) {
        const patient = data.patient;
        setSelectedReturningPatient(patient);
        setSelectedReturningVisits([]);
        setGenForm(prev => ({
          ...prev,
          patientId: patient._id,
        }));
        setPatientSearch(patient.name);
        setShowReturningForm(true);
        toast.success('Patient registered successfully!');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to register patient';
      setGenError(errorMsg);
    }
    setRegisterBusy(false);
  };

  // ── Generate token ──
  const handleGenerateToken = async () => {
    if (!genForm.patientId) {
      setGenError('Please select a patient');
      return;
    }
    if (!genForm.doctorId) {
      setGenError('Please select a doctor');
      return;
    }

    setGenLoading(true);
    setGenError('');
    setActiveTokenError(null);

    try {
      const payload = {
        clinicId: effectiveClinicId,
        patientId: genForm.patientId,
        doctorId: genForm.doctorId,
        patientName: genForm.patientName,
        phone: genForm.phone,
        age: genForm.age ? parseInt(genForm.age) : undefined,
        gender: genForm.gender,
        symptoms: genForm.symptoms,
        consultationType: genForm.consultationType,
      };

      console.log('📤 Generating token:', payload);

      const { data } = await API.post('/tokens/generate', payload);

      if (data.success) {
        setShowReceipt(data.token);
        setShowGenerateModal(false);
        toast.success(`Token #${data.token.tokenNumber} generated!`);
        fetchTokens();
        resetForm();
      }
    } catch (err) {
      console.error('❌ Token generation error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to generate token';

      if (err.response?.data?.activeToken) {
        setActiveTokenError({
          message: errorMsg,
          activeToken: err.response.data.activeToken,
        });
      }
      setGenError(errorMsg);
    }
    setGenLoading(false);
  };

  const resetForm = () => {
    setGenForm({
      patientId: '',
      doctorId: '',
      patientName: '',
      phone: '',
      age: '',
      gender: 'Male',
      symptoms: '',
      consultationType: 'in-person',
      email: '',
      address: '',
      bloodGroup: '',
      dob: '',
      allergies: '',
      notes: '',
      paymentMethod: 'cash',
      totalFee: '',
      paid: '',
    });
    setPatientSearch('');
    setPatientResults([]);
    setGenError('');
    setActiveTokenError(null);
    setSelectedReturningPatient(null);
    setSelectedReturningVisits([]);
    setShowReturningForm(false);
  };

  // ── Calculate dues ──
  const dues = Math.max(0, (parseFloat(genForm.totalFee) || 0) - (parseFloat(genForm.paid) || 0));

  // ── Filter tokens ──
  const filtered = tokens.filter(t => {
    const doctorMatch = !filterDoctor || t.doctor?._id === filterDoctor;
    const statusMatch = !filterStatus || t.status === filterStatus;
    return doctorMatch && statusMatch;
  });

  // ── Stats ──
  const pendingCount = tokens.filter(t => t.status === 'Pending').length;
  const waitingCount = tokens.filter(t => t.status === 'Waiting').length;
  const calledCount = tokens.filter(t => t.status === 'Called').length;
  const doneCount = tokens.filter(t => t.status === 'Done').length;

  const canUpdate = user?.role === 'admin' || user?.role === 'receptionist' || user?.role === 'doctor';

  return (
    <div>
      {/* ── Header with Stats ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a2236' }}>🎫 Token Queue</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Manage patient tokens and queue
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn onClick={() => { resetForm(); setShowGenerateModal(true); }}>
            ➕ Generate Token
          </Btn>
          <Btn variant="ghost" onClick={fetchTokens}>🔄 Refresh</Btn>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Pending" value={pendingCount} color="#7c3aed" />
        <StatCard label="Waiting" value={waitingCount} color="#f59e0b" />
        <StatCard label="Called" value={calledCount} color="#3b82f6" />
        <StatCard label="Done" value={doneCount} color="#10b981" />
      </div>

      {/* ── Pending Portal Requests Banner ── */}
      {pendingCount > 0 && (
        <Alert type="info" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>
              🔔 <strong>{pendingCount}</strong> new appointment request{pendingCount > 1 ? 's' : ''} from patient portal
            </span>
            <Btn size="sm" onClick={() => setFilterStatus('Pending')}>View Pending</Btn>
          </div>
        </Alert>
      )}

      {/* ── Active Token Error Banner ── */}
      {activeTokenError && (
        <Alert type="error" style={{ marginBottom: 16 }}>
          <div>
            <strong>⚠️ {activeTokenError.message}</strong>
            {activeTokenError.activeToken && (
              <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 6, fontSize: 13 }}>
                Token #{activeTokenError.activeToken.tokenNumber} · Dr. {activeTokenError.activeToken.doctorName} · Status: {activeTokenError.activeToken.status}
              </div>
            )}
            <Btn size="sm" variant="ghost" onClick={() => setActiveTokenError(null)} style={{ marginTop: 8 }}>
              Dismiss
            </Btn>
          </div>
        </Alert>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <select
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          style={filterStyle}
        >
          <option value="">All Doctors</option>
          {doctors.map(d => (
            <option key={d._id} value={d._id}>Dr. {d.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={filterStyle}
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        {filterStatus && (
          <Btn size="sm" variant="ghost" onClick={() => setFilterStatus('')}>✕ Clear</Btn>
        )}
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
          {filtered.length} token{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Token Table ── */}
      <Card noPad>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
            <div>No tokens found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Token</th>
                  <th style={thStyle}>Patient</th>
                  <th style={thStyle}>Doctor</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Status</th>
                  {canUpdate && <th style={thStyle}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const sc = STATUS_COLORS[t.status] || STATUS_COLORS.Waiting;
                  const isPortal = t.source === 'patient';

                  return (
                    <tr key={t._id} style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: t.status === 'Pending' ? '#faf5ff' : 'transparent',
                    }}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 40, height: 40, borderRadius: '50%',
                          background: isPortal ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'linear-gradient(135deg, #0f4c81, #38bdf8)',
                          color: '#fff', fontWeight: 800, fontSize: 16,
                        }}>
                          {t.tokenNumber}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>
                          {t.patientName || t.patient?.name || 'Walk-in'}
                          {isPortal && (
                            <span style={{
                              marginLeft: 6, fontSize: 10, fontWeight: 700,
                              padding: '2px 7px', borderRadius: 20,
                              background: 'rgba(124,58,237,0.10)', color: '#7c3aed',
                              border: '1px solid rgba(124,58,237,0.25)',
                            }}>
                              Portal
                            </span>
                          )}
                        </div>
                        {t.patient?.patientId && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.patient.patientId}</div>
                        )}
                        {t.symptoms && (
                          <div style={{ fontSize: 11, color: '#64748b', maxWidth: 180 }} title={t.symptoms}>
                            {t.symptoms.length > 40 ? t.symptoms.slice(0, 40) + '…' : t.symptoms}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        Dr. {t.doctor?.name || '—'}
                        {t.doctor?.department && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.doctor.department}</div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>
                        {t.consultationType || 'in-person'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>
                        {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: sc.bg, color: sc.color,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      {canUpdate && (
                        <td style={tdStyle}>
                          <TokenActions
                            token={t}
                            onUpdate={updateStatus}
                            onRefresh={fetchTokens}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Doctor Summary ── */}
      {summary.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
            📊 Doctor Queue Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {summary.map(s => (
              <Card key={s.doctorId} style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Dr. {s.doctorName}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{s.department || 'General'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge color="yellow">{s.waiting} Waiting</Badge>
                  <Badge color="blue">{s.called} Called</Badge>
                  <Badge color="green">{s.done} Done</Badge>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Latest: #{s.lastToken}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Generate Token Modal ── */}
      {showGenerateModal && (
        <Modal
          title={selectedReturningPatient ? 'Returning Patient — Generate Token' : 'Generate Token'}
          onClose={() => { setShowGenerateModal(false); resetForm(); }}
          width={580}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* ── Phone Search ── */}
            <div>
              <label style={labelStyle}>📱 Search Patient by Phone</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number..."
                  value={patientSearch}
                  onChange={e => handlePhoneSearch(e.target.value)}
                  style={inputStyle}
                />
                {isSearching && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8' }}>
                    Searching...
                  </span>
                )}
                {patientResults.length > 0 && !selectedReturningPatient && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    maxHeight: 200, overflowY: 'auto', zIndex: 10,
                  }}>
                    {patientResults.map(p => (
                      <div
                        key={p._id}
                        onClick={() => selectPatient(p)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            📞 {p.phone} · 🆔 {p.patientId}
                            {p.age && ` · ${p.age}y`}
                            {p.gender && ` · ${p.gender}`}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 11,
                          color: '#0f4c81',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: '#eff6ff',
                        }}>
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Returning Patient Info ── */}
            {selectedReturningPatient && showReturningForm && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                      👤 {selectedReturningPatient.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      📞 {selectedReturningPatient.phone} · 🆔 {selectedReturningPatient.patientId}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {selectedReturningPatient.age && `${selectedReturningPatient.age}y · `}
                      {selectedReturningPatient.gender || ''}
                      {selectedReturningPatient.bloodGroup && ` · Blood: ${selectedReturningPatient.bloodGroup}`}
                    </div>
                    {selectedReturningVisits.length > 0 && (
                      <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>
                        ✅ {selectedReturningVisits.length} previous visit{selectedReturningVisits.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearPatientSelection}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, padding: '4px' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* ── Register New Patient (Inline Form) ── */}
            {!selectedReturningPatient && (
              <div style={{
                border: '1.5px solid #e2e8f0',
                borderRadius: 10,
                padding: 16,
                background: '#f8fafc',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>➕</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                    Register New Patient
                  </span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    (Not found in search? Fill details below)
                  </span>
                </div>

                {/* Patient Registration Form - 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Full Name *</label>
                    <input
                      type="text"
                      value={genForm.patientName}
                      onChange={e => setGenForm({ ...genForm, patientName: e.target.value })}
                      placeholder="Enter patient name"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Phone Number *</label>
                    <input
                      type="tel"
                      value={genForm.phone}
                      onChange={e => setGenForm({ ...genForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit number"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Age</label>
                    <input
                      type="number"
                      min="0"
                      value={genForm.age}
                      onChange={e => setGenForm({ ...genForm, age: e.target.value })}
                      placeholder="Age"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Gender</label>
                    <select
                      value={genForm.gender}
                      onChange={e => setGenForm({ ...genForm, gender: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Email (optional)</label>
                    <input
                      type="email"
                      value={genForm.email}
                      onChange={e => setGenForm({ ...genForm, email: e.target.value })}
                      placeholder="Email address"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Blood Group</label>
                    <select
                      value={genForm.bloodGroup}
                      onChange={e => setGenForm({ ...genForm, bloodGroup: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Address</label>
                    <input
                      type="text"
                      value={genForm.address}
                      onChange={e => setGenForm({ ...genForm, address: e.target.value })}
                      placeholder="Street, city, state"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Allergies (comma separated)</label>
                    <input
                      type="text"
                      value={genForm.allergies}
                      onChange={e => setGenForm({ ...genForm, allergies: e.target.value })}
                      placeholder="e.g. Penicillin, Aspirin"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <Btn
                  onClick={handleRegisterPatient}
                  disabled={registerBusy || !genForm.patientName || !genForm.phone || genForm.phone.length < 10}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    opacity: (registerBusy || !genForm.patientName || !genForm.phone || genForm.phone.length < 10) ? 0.6 : 1,
                  }}
                >
                  {registerBusy ? 'Registering...' : '📝 Register Patient'}
                </Btn>
              </div>
            )}

            {/* ── Doctor Selection ── */}
            <div>
              <label style={labelStyle}>Select Doctor *</label>
              <select
                value={genForm.doctorId}
                onChange={e => {
                  console.log('🩺 Doctor selected:', e.target.value);
                  setGenForm({ ...genForm, doctorId: e.target.value });
                }}
                style={inputStyle}
              >
                <option value="">Select Doctor</option>
                {doctors.map(d => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.name} {d.department ? `(${d.department})` : ''}
                    {d.consultationFee > 0 && ` — ₹${Number(d.consultationFee).toLocaleString('en-IN')}`}
                  </option>
                ))}
              </select>
              {genForm.doctorId && (
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>
                  ✅ Doctor selected: {doctors.find(d => d._id === genForm.doctorId)?.name}
                  {doctors.find(d => d._id === genForm.doctorId)?.consultationFee > 0 &&
                    ` · Fee: ₹${Number(doctors.find(d => d._id === genForm.doctorId)?.consultationFee).toLocaleString('en-IN')}`
                  }
                </div>
              )}
            </div>

            {/* ── Symptoms ── */}
            <div>
              <label style={labelStyle}>Symptoms / Complaint</label>
              <input
                type="text"
                value={genForm.symptoms}
                onChange={e => setGenForm({ ...genForm, symptoms: e.target.value })}
                placeholder="e.g. Fever, cough, headache..."
                style={inputStyle}
              />
            </div>

            {/* ── Consultation Type & Payment ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Consultation Type</label>
                <select
                  value={genForm.consultationType}
                  onChange={e => setGenForm({ ...genForm, consultationType: e.target.value })}
                  style={inputStyle}
                >
                  <option value="in-person">🏥 In-Person</option>
                  <option value="online">💻 Online</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Payment Method</label>
                <select
                  value={genForm.paymentMethod}
                  onChange={e => setGenForm({ ...genForm, paymentMethod: e.target.value })}
                  style={inputStyle}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="upi">📲 UPI</option>
                  <option value="card">💳 Card</option>
                </select>
              </div>
            </div>

            {/* ── Fee & Payment ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>Total Fee (₹)</label>
                <input
                  type="number"
                  value={genForm.totalFee}
                  onChange={e => setGenForm({ ...genForm, totalFee: e.target.value })}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>Amount Paid (₹)</label>
                <input
                  type="number"
                  value={genForm.paid}
                  onChange={e => setGenForm({ ...genForm, paid: e.target.value })}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              <div style={{
                padding: '8px 12px',
                background: dues > 0 ? '#fef2f2' : '#f0fdf4',
                borderRadius: 8,
                border: `1px solid ${dues > 0 ? '#fca5a5' : '#bbf7d0'}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Dues</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: dues > 0 ? '#dc2626' : '#16a34a' }}>
                  ₹{dues.toLocaleString()}
                </div>
              </div>
            </div>

            {/* ── Notes ── */}
            <div>
              <label style={labelStyle}>Additional Notes</label>
              <input
                type="text"
                value={genForm.notes}
                onChange={e => setGenForm({ ...genForm, notes: e.target.value })}
                placeholder="Any additional notes..."
                style={inputStyle}
              />
            </div>

            {/* ── Errors ── */}
            {genError && (
              <div style={{ padding: 10, background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                ⚠️ {genError}
              </div>
            )}

            {/* ── Debug: Form State ── */}
            <div style={{
              fontSize: 11,
              color: '#64748b',
              background: '#f8fafc',
              padding: 8,
              borderRadius: 6,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <span>Patient: <strong style={{ color: genForm.patientId ? '#16a34a' : '#dc2626' }}>
                {genForm.patientId ? '✅ Selected' : '❌ Not selected'}
              </strong></span>
              <span>Doctor: <strong style={{ color: genForm.doctorId ? '#16a34a' : '#dc2626' }}>
                {genForm.doctorId ? '✅ Selected' : '❌ Not selected'}
              </strong></span>
              <span>Ready: <strong style={{ color: (genForm.patientId && genForm.doctorId) ? '#16a34a' : '#dc2626' }}>
                {(genForm.patientId && genForm.doctorId) ? '✅ Yes' : '❌ No'}
              </strong></span>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => { setShowGenerateModal(false); resetForm(); }}>
                Cancel
              </Btn>
              <Btn
                onClick={handleGenerateToken}
                disabled={genLoading || !genForm.patientId || !genForm.doctorId}
                style={{
                  opacity: (genLoading || !genForm.patientId || !genForm.doctorId) ? 0.6 : 1,
                }}
              >
                {genLoading ? 'Generating...' : '🎫 Generate Token'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Token Receipt Modal ── */}
      {showReceipt && (
        <Modal title="Token Generated!" onClose={() => setShowReceipt(null)} width={380}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0f4c81, #38bdf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <span style={{ color: '#fff', fontSize: 40, fontWeight: 800 }}>
                #{showReceipt.tokenNumber}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              {showReceipt.patientName || 'Patient'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Dr. {showReceipt.doctor?.name}
            </div>
            <div style={{
              padding: 12, background: '#f8fafc', borderRadius: 8,
              fontSize: 13, color: '#475569', marginBottom: 16,
            }}>
              📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              <br />
              🕐 {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <Btn onClick={() => setShowReceipt(null)} style={{ width: '100%' }}>
              Done
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 16px',
      border: '1px solid #e2e8f0', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
    </div>
  );
}

// ── Token Actions ──
function TokenActions({ token, onUpdate, onRefresh }) {
  const [busy, setBusy] = useState(false);

  const act = async (status) => {
    setBusy(true);
    try {
      await onUpdate(token._id, status);
    } finally {
      setBusy(false);
    }
  };

  if (token.status === 'Pending') {
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Btn size="sm" variant="primary" onClick={() => act('Waiting')} disabled={busy}>
          ✅ Accept
        </Btn>
        <Btn size="sm" variant="danger" onClick={() => act('Skipped')} disabled={busy}>
          ✕ Reject
        </Btn>
      </div>
    );
  }

  if (token.status === 'Waiting') {
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Btn size="sm" variant="primary" onClick={() => act('Called')} disabled={busy}>
          📢 Call
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => act('Skipped')} disabled={busy}>
          Skip
        </Btn>
      </div>
    );
  }

  if (token.status === 'Called') {
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Btn size="sm" variant="success" onClick={() => act('Done')} disabled={busy}>
          ✅ Complete
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => act('Waiting')} disabled={busy}>
          ↩ Back
        </Btn>
      </div>
    );
  }

  return null;
}

// ── Styles ──
const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const tdStyle = {
  padding: '10px 14px',
  fontSize: 13,
  verticalAlign: 'middle',
};

const filterStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1.5px solid #e2e8f0',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  color: '#1e293b',
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4,
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #e2e8f0',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};