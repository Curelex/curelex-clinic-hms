import React, { useState, useEffect, useCallback } from 'react';
import {
  DashboardLayout, Card, Stat, Btn, Badge,
  SectionHeader, Empty, TokenBadge, Alert,
} from '../components/UI';
import { FileUploadSection } from '../components/FileUpload';
import { today } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import PrescriptionModal from '../components/PrescriptionModal'; // ✅ NEW

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── IST date helper ───────────────────────────────────────────────
function getTodayIST() {
  const now       = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate   = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Follow-up helpers ─────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now    = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function followUpBadgeStyle(days) {
  if (days < 0)   return { bg: 'rgba(231,76,60,0.10)',  border: 'rgba(231,76,60,0.3)',   color: '#c0392b', label: 'Overdue' };
  if (days === 0) return { bg: 'rgba(231,76,60,0.10)',  border: 'rgba(231,76,60,0.3)',   color: '#c0392b', label: 'Today!' };
  if (days <= 3)  return { bg: 'rgba(243,156,18,0.10)', border: 'rgba(243,156,18,0.3)',  color: '#d68910', label: `${days}d left` };
  return               { bg: 'rgba(0,184,148,0.08)',  border: 'rgba(0,184,148,0.25)',  color: '#00a878', label: `${days}d left` };
}

// ── Payment badge ─────────────────────────────────────────────────
function PaymentBadge({ method }) {
  if (method === 'upi') {
    return (
      <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        📲 UPI
      </span>
    );
  }
  return (
    <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      💵 Cash
    </span>
  );
}

// ── Past visit file row (read-only, doctor view) ──────────────────
function DoctorPastFileRow({ file, patientId, onDownload }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await onDownload(patientId, String(file._id));
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed: ' + e.message);
    } finally {
      setDownloading(false);
    }
  }

  const isImage = file.mimeType?.startsWith('image/');
  const isPdf   = file.mimeType === 'application/pdf';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{isPdf ? '📄' : isImage ? '🖼️' : '📎'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {(file.size / 1024).toFixed(1)} KB · {file.uploadedBy} · {new Date(file.uploadedAt).toLocaleDateString()}
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: downloading ? 0.6 : 1 }}
      >
        {downloading ? '⏳' : '⬇ View'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function DoctorDashboard() {
  const {
    session, logout,
    getMe,
    updateTokenLimit,
    getPatients,
    updatePatientStatus,
    updateFollowUp,
    uploadPatientFile,
    getPatientFiles,
    downloadPatientFile,
    deletePatientFile,
  } = useApp();

  const [tab,      setTab]     = useState('queue');
  const [docUser,  setDocUser] = useState(null);
  const [patients, setPatients] = useState([]);

  const reload = useCallback(async () => {
    try {
      const [me, pats] = await Promise.all([
        getMe(),
        getPatients({ date: getTodayIST() }),
      ]);
      setDocUser(me);
      setPatients(pats);
    } catch (e) {
      console.error('Doctor reload error:', e);
    }
  }, [getMe, getPatients]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, [reload]);

  const todayStr = getTodayIST();
  const myId     = docUser?._id;

  const myPatients = patients
    .filter((p) => p.date === todayStr && myId && String(p.doctorId) === String(myId))
    .sort((a, b) => a.token - b.token);

  const allMyPatients = patients;

  const waiting = myPatients.filter((p) => p.status === 'waiting');
  const called  = myPatients.filter((p) => p.status === 'called');
  const done    = myPatients.filter((p) => p.status === 'done');

  const currentPatient  = called[0] || waiting[0] || null;
  const dailyTokenLimit = docUser?.dailyTokenLimit ?? 0;
  const limitReached    = dailyTokenLimit > 0 && myPatients.length >= dailyTokenLimit;
  const greeting        = `${getGreeting()}, Dr. ${session?.user?.name || ''} · ${session?.user?.specialist || ''}`;
  const followUpCount   = allMyPatients.filter((p) => p.followUpDate).length;

  const navItems = [
    { icon: '🩺', label: 'My Queue',   active: tab === 'queue',     onClick: () => setTab('queue'),     badge: waiting.length || undefined },
    { icon: '📊', label: 'My Stats',   active: tab === 'stats',     onClick: () => setTab('stats') },
    { icon: '📅', label: 'Follow-ups', active: tab === 'followups', onClick: () => setTab('followups'), badge: followUpCount || undefined },
  ];

  async function handleUpdateStatus(patientId, status) {
    try {
      const updated = await updatePatientStatus(patientId, status);
      setPatients((prev) => prev.map((p) => (p._id === patientId ? updated : p)));
    } catch (e) { console.error('Status update error:', e); }
  }

  async function handleUpdateTokenLimit(doctorId, limit) {
    const updated = await updateTokenLimit(doctorId, limit);
    setDocUser((prev) => prev ? { ...prev, dailyTokenLimit: updated.dailyTokenLimit } : prev);
    return updated;
  }

  async function handleUpdateFollowUp(patientId, followUpDate, followUpNote) {
    try {
      const updated = await updateFollowUp(patientId, followUpDate, followUpNote);
      setPatients((prev) => prev.map((p) => (p._id === patientId ? updated : p)));
      return updated;
    } catch (e) { throw e; }
  }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .doctor-queue-header { flex-direction: column !important; align-items: flex-start !important; }
          .doctor-stat-grid { grid-template-columns: 1fr 1fr !important; }
          .doctor-current-inner { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .doctor-current-action { width: 100% !important; }
          .doctor-current-action button { width: 100% !important; }
          .doctor-token-row { flex-wrap: wrap !important; gap: 10px !important; }
          .doctor-token-row .token-actions { width: 100% !important; justify-content: flex-end !important; }
          .stats-table-wrap { font-size: 12px !important; }
          .stats-table-wrap th, .stats-table-wrap td { padding: 8px 10px !important; }
          .stats-stat-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 400px) {
          .doctor-stat-grid { grid-template-columns: 1fr !important; }
          .stats-stat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <DashboardLayout
        title={greeting}
        subtitle=""
        navItems={navItems}
        onLogout={logout}
        clinicName={session?.clinicName || ''}
        userRole="Doctor"
        accent="#7c3aed"
      >
        {limitReached && (
          <div style={{ background: 'rgba(231,76,60,0.10)', border: '1.5px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#c0392b', fontWeight: 700, fontSize: 14 }}>
            🚫 Daily token limit of <strong style={{ marginLeft: 4, marginRight: 4 }}>{dailyTokenLimit}</strong> reached. No more patients can be added for today.
          </div>
        )}

        {tab === 'queue' && (
          <QueueTab
            myPatients={myPatients}
            waiting={waiting}
            called={called}
            done={done}
            currentPatient={currentPatient}
            dailyTokenLimit={dailyTokenLimit}
            updateStatus={handleUpdateStatus}
            onUpdateFollowUp={handleUpdateFollowUp}
            onUploadFile={uploadPatientFile}
            onGetFiles={getPatientFiles}
            onDownloadFile={downloadPatientFile}
            onDeleteFile={deletePatientFile}
            docUser={docUser}           // ✅ NEW: pass docUser for prescription modal
            clinicName={session?.clinicName || ''}  // ✅ NEW
          />
        )}
        {tab === 'stats' && (
          <StatsTab
            myPatients={myPatients}
            waiting={waiting}
            called={called}
            done={done}
            docUser={docUser}
            myId={myId}
            onUpdateTokenLimit={handleUpdateTokenLimit}
          />
        )}
        {tab === 'followups' && (
          <FollowUpsTab
            allMyPatients={allMyPatients}
            onUpdateFollowUp={handleUpdateFollowUp}
          />
        )}
      </DashboardLayout>
    </>
  );
}

/* ── Queue Tab ────────────────────────────────────────────────── */
function QueueTab({ myPatients, waiting, called, done, currentPatient, dailyTokenLimit, updateStatus, onUpdateFollowUp, onUploadFile, onGetFiles, onDownloadFile, onDeleteFile, docUser, clinicName }) {
  const limit = dailyTokenLimit;
  return (
    <div>
      <div className="doctor-queue-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>My Patient Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Today · Auto-refreshes every 5 seconds</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {limit > 0 && (
            <span style={{
              background: myPatients.length >= limit ? 'rgba(231,76,60,0.10)' : 'rgba(21,101,168,0.08)',
              color: myPatients.length >= limit ? '#c0392b' : '#1565a8',
              border: `1px solid ${myPatients.length >= limit ? 'rgba(231,76,60,0.25)' : 'rgba(21,101,168,0.2)'}`,
              borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700,
            }}>
              🎫 {myPatients.length}/{limit} tokens
            </span>
          )}
          <Badge color="green">✓ {done.length} Done</Badge>
        </div>
      </div>

      <div className="doctor-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <Stat label="Total Today" value={limit > 0 ? `${myPatients.length}/${limit}` : myPatients.length} icon="🎫" color="#7c3aed" />
        <Stat label="Completed"   value={done.length} icon="✅" color="var(--success)" />
      </div>

      {currentPatient && <CurrentPatientCard patient={currentPatient} onUpdateStatus={updateStatus} />}

      {myPatients.length === 0 ? (
        <Empty icon="🩺" title="No patients in queue yet" desc="Patients will appear here as soon as the receptionist registers them." />
      ) : (
        <Card noPad>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 15 }}>All My Tokens Today</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{myPatients.length}{limit > 0 ? `/${limit}` : ''} patients</span>
          </div>
          <div>
            {myPatients.map((p, i) => (
              <TokenRow
                key={p._id || p.id}
                patient={p}
                isLast={i === myPatients.length - 1}
                onUpdateStatus={updateStatus}
                onUpdateFollowUp={onUpdateFollowUp}
                onUploadFile={onUploadFile}
                onGetFiles={onGetFiles}
                onDownloadFile={onDownloadFile}
                onDeleteFile={onDeleteFile}
                docUser={docUser}       // ✅ NEW
                clinicName={clinicName} // ✅ NEW
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Current Patient Spotlight ───────────────────────────────── */
function CurrentPatientCard({ patient: p, onUpdateStatus }) {
  const pid = p._id || p.id;
  return (
    <div style={{ marginBottom: 24, borderRadius: 'var(--radius)', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', padding: '1.5rem', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {p.status === 'called' ? '📢 Currently Attending' : '⏭ Next Patient'}
      </div>
      <div className="doctor-current-inner" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '12px 24px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 1 }}>TOKEN NO.</div>
          <div style={{ color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{p.token}</div>
        </div>
        <div style={{ flex: 1, color: '#fff', minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, wordBreak: 'break-word' }}>{p.name}</div>
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 4 }}>🩺 <em>{p.symptoms}</em></div>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>{p.gender === 'female' ? '♀' : '♂'} {p.age ? `${p.age} yrs ·` : ''} 🕐 {p.time}</div>
          <div style={{ display: 'inline-block', background: p.paymentMethod === 'upi' ? 'rgba(124,58,237,0.30)' : 'rgba(0,184,148,0.30)', border: `1px solid ${p.paymentMethod === 'upi' ? 'rgba(124,58,237,0.5)' : 'rgba(0,184,148,0.5)'}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600, color: '#fff' }}>
            {p.paymentMethod === 'upi' ? '📲 UPI' : '💵 Cash'}
          </div>
          {p.dues > 0 && (
            <div style={{ marginTop: 8, display: 'inline-block', background: 'rgba(255,80,80,0.25)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600, marginLeft: 6 }}>
              ⚠️ Dues: Rs. {p.dues}
            </div>
          )}
        </div>
        <div className="doctor-current-action" style={{ flexShrink: 0 }}>
          {p.status === 'waiting' && (
            <button onClick={() => onUpdateStatus(pid, 'called')} style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 10, color: '#fff', padding: '12px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', width: '100%' }}>
              📢 Call Patient
            </button>
          )}
          {p.status === 'called' && (
            <button onClick={() => onUpdateStatus(pid, 'done')} style={{ background: 'rgba(0,200,100,0.3)', border: '2px solid rgba(0,200,100,0.5)', borderRadius: 10, color: '#fff', padding: '12px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', width: '100%' }}>
              ✓ Mark as Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Token Row ────────────────────────────────────────────────── */
function TokenRow({ patient: p, isLast, onUpdateStatus, onUpdateFollowUp, onUploadFile, onGetFiles, onDownloadFile, onDeleteFile, docUser, clinicName }) {
  const pid = p._id || p.id;
  const [showFollowUp,    setShowFollowUp]    = useState(false);
  const [showFiles,       setShowFiles]       = useState(false);
  const [showRx,          setShowRx]          = useState(false);   // ✅ NEW: prescription modal
  const [rxExists,        setRxExists]        = useState(false);   // ✅ NEW: has prescription been saved?
  const [files,           setFiles]           = useState([]);
  const [loadingFiles,    setLoadingFiles]    = useState(false);
  const [pastVisits,      setPastVisits]      = useState([]);
  const bgMap = { waiting: 'var(--surface)', called: '#fefce8', done: 'var(--surface2)' };
  const days  = daysUntil(p.followUpDate);

  // ✅ NEW: listen for prescription saved event
  function handlePrescriptionSaved() {
    setRxExists(true);
  }

  // Load files when panel opens
  useEffect(() => {
    if (showFiles && files.length === 0 && !loadingFiles) loadFiles();
  }, [showFiles]);

  async function loadFiles() {
    setLoadingFiles(true);
    try {
      const result = await onGetFiles(pid);
      setFiles(Array.isArray(result) ? result : (result?.files || []));

      if (p.phone) {
        try {
          const token = localStorage.getItem('clinic_token');
          const BASE  = import.meta.env.VITE_CLINIC_API_URL
            ? `${import.meta.env.VITE_CLINIC_API_URL}`
            : '/api/clinic';
          const resp  = await fetch(`${BASE}/patients/history/${p.phone}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await resp.json();
          if (data.success) {
            const past = (data.visits || []).filter(
              (v) => String(v._id) !== String(pid) && v.files?.length > 0
            );
            setPastVisits(past);
          }
        } catch (e) {
          console.error('Failed to load past visit files:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleUploadFile(patientId, file) {
    await onUploadFile(patientId, file);
    const result = await onGetFiles(pid);
    setFiles(Array.isArray(result) ? result : (result?.files || []));
  }

  async function handleDeleteFile(patientId, fileId) {
    await onDeleteFile(patientId, fileId);
    const result = await onGetFiles(pid);
    setFiles(Array.isArray(result) ? result : (result?.files || []));
  }

  async function handleDownloadFile(patientId, fileId) {
    if (!fileId || fileId === patientId) throw new Error('Invalid file ID');
    return onDownloadFile(patientId, fileId);
  }

  const totalFileCount = files.length + pastVisits.reduce((s, v) => s + v.files.length, 0);
  const authToken = localStorage.getItem('clinic_token');

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      {/* ── Main row ── */}
      <div className="doctor-token-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: bgMap[p.status] }}>
        <TokenBadge token={p.token} size="md" status={p.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: p.status === 'done' ? 'var(--text-muted)' : 'var(--text)', textDecoration: p.status === 'done' ? 'line-through' : 'none', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.symptoms?.substring(0, 60)}{p.symptoms?.length > 60 ? '…' : ''}</div>
          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{p.gender === 'female' ? '♀' : '♂'} {p.age ? `${p.age} yrs · ` : ''}🕐 {p.time}</span>
            <PaymentBadge method={p.paymentMethod} />
            {p.dues > 0 && <span style={{ color: 'var(--danger)' }}>⚠️ Due Rs.{p.dues}</span>}
            {p.followUpDate && days !== null && (
              <span style={{ color: followUpBadgeStyle(days).color, fontWeight: 600 }}>
                📅 Follow-up: {p.followUpDate} ({followUpBadgeStyle(days).label})
              </span>
            )}
            {/* ✅ NEW: Rx saved indicator */}
            {rxExists && (
              <span style={{ fontSize: 11, background: 'rgba(0,184,148,0.1)', color: '#00a878', border: '1px solid rgba(0,184,148,0.3)', borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>
                ✅ Rx Saved
              </span>
            )}
          </div>
        </div>
        <div className="token-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Badge color={p.status === 'called' ? 'yellow' : p.status === 'done' ? 'gray' : 'blue'}>
            {p.status === 'waiting' ? '⏳ Waiting' : p.status === 'called' ? '📢 Called' : '✓ Done'}
          </Badge>
          {p.status === 'waiting' && <Btn size="sm" variant="outline"  onClick={() => onUpdateStatus(pid, 'called')}>Call</Btn>}
          {p.status === 'called'  && <Btn size="sm" variant="success"  onClick={() => onUpdateStatus(pid, 'done')}>Done</Btn>}

          {/* ✅ NEW: Prescription (Rx) button */}
          <button
            onClick={() => setShowRx((v) => !v)}
            title="Write prescription"
            style={{
              background: rxExists ? 'rgba(0,184,148,0.12)' : showRx ? 'rgba(124,58,237,0.15)' : 'none',
              border: `1px solid ${rxExists ? 'rgba(0,184,148,0.4)' : '#c5d5e8'}`,
              borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 13,
              color: rxExists ? '#00a878' : '#7c3aed', fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            📝 {rxExists ? 'Edit Rx' : 'Add Rx'}
          </button>

          <button
            onClick={() => setShowFollowUp((v) => !v)}
            title="Set follow-up date"
            style={{ background: p.followUpDate ? 'rgba(124,58,237,0.10)' : 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: '#7c3aed' }}
          >📅</button>
          <button
            onClick={() => setShowFiles((v) => !v)}
            title="Manage patient files"
            style={{ background: showFiles ? 'rgba(52,152,219,0.15)' : 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: showFiles ? '#3498db' : 'var(--text-light)' }}
          >
            📎 {totalFileCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700 }}>({totalFileCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* ✅ NEW: Prescription Modal */}
      {showRx && (
        <PrescriptionModal
          patient={p}
          doctorUser={docUser}
          clinicName={clinicName}
          token={authToken}
          onClose={() => setShowRx(false)}
          onSaved={handlePrescriptionSaved}
        />
      )}

      {/* ── Follow-up editor ── */}
      {showFollowUp && (
        <FollowUpInlineEditor
          patient={p}
          onSave={async (date, note) => { await onUpdateFollowUp(pid, date, note); setShowFollowUp(false); }}
          onCancel={() => setShowFollowUp(false)}
        />
      )}

      {/* ── Files panel ── */}
      {showFiles && (
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'rgba(52,152,219,0.02)' }}>
          {loadingFiles ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>⏳ Loading files…</div>
          ) : (
            <>
              <FileUploadSection
                patientId={pid}
                files={files}
                onUpload={handleUploadFile}
                onDelete={handleDeleteFile}
                onDownload={handleDownloadFile}
                disabled={loadingFiles}
              />

              {pastVisits.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    marginBottom: 10, paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span>📁 Files from Previous Visits</span>
                    <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>
                      {pastVisits.reduce((s, v) => s + v.files.length, 0)}
                    </span>
                  </div>
                  {pastVisits.map((visit) => (
                    <div key={String(visit._id)} style={{ marginBottom: 14 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, marginBottom: 6,
                        padding: '5px 8px',
                        background: 'rgba(124,58,237,0.06)',
                        border: '1px solid rgba(124,58,237,0.15)',
                        borderRadius: 6,
                        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                      }}>
                        <span style={{ color: '#7c3aed' }}>📅 {visit.date}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                          · {visit.symptoms?.substring(0, 50)}{visit.symptoms?.length > 50 ? '…' : ''}
                        </span>
                        <span style={{ marginLeft: 'auto', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>
                          {visit.files.length} file{visit.files.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {visit.files.map((f) => (
                        <DoctorPastFileRow
                          key={String(f._id)}
                          file={f}
                          patientId={String(visit._id)}
                          onDownload={onDownloadFile}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {!loadingFiles && pastVisits.length === 0 && p.phone && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📁</span> No files from previous visits.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Follow-up Inline Editor ─────────────────────────────────── */
function FollowUpInlineEditor({ patient: p, onSave, onCancel }) {
  const [date, setDate] = useState(p.followUpDate || '');
  const [note, setNote] = useState(p.followUpNote || '');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  async function save() {
    setBusy(true); setErr('');
    try { await onSave(date, note); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ padding: '12px 18px 14px 62px', background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(124,58,237,0.12)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>📅 Set Follow-up Date</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Date</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            min={getTodayIST()}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #c5d5e8', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0a3d62', fontWeight: 600 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Note (optional)</div>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Check blood pressure"
            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #c5d5e8', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={save} disabled={busy || !date}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy || !date ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !date ? 0.6 : 1 }}>
          {busy ? '…' : '✓ Save'}
        </button>
        {p.followUpDate && (
          <button onClick={() => onSave('', '')} disabled={busy}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            🗑 Clear
          </button>
        )}
        <button onClick={onCancel}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
      {err && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>{err}</div>}
    </div>
  );
}

/* ── Token Limit Editor ──────────────────────────────────────── */
function TokenLimitEditor({ docUser, myId, onUpdateTokenLimit }) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(String(docUser?.dailyTokenLimit ?? 0));
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const [saved,   setSaved]   = useState(false);

  useEffect(() => { setValue(String(docUser?.dailyTokenLimit ?? 0)); }, [docUser?.dailyTokenLimit]);

  const limit = docUser?.dailyTokenLimit ?? 0;

  async function save() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) { setErr('Enter a valid number (0 = unlimited)'); return; }
    setBusy(true); setErr('');
    try {
      await onUpdateTokenLimit(myId, parsed);
      setEditing(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ background: limit > 0 ? 'rgba(124,58,237,0.06)' : 'rgba(0,184,148,0.06)', border: `1.5px solid ${limit > 0 ? 'rgba(124,58,237,0.2)' : 'rgba(0,184,148,0.2)'}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>🎫 My Daily Token Limit</div>
      {!editing ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontSize: 28, fontWeight: 800, color: limit === 0 ? '#00a878' : '#7c3aed' }}>{limit === 0 ? '∞' : limit}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{limit === 0 ? 'Unlimited tokens per day' : 'tokens per day (max)'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 12, color: '#00a878', fontWeight: 700 }}>✓ Saved</span>}
            <button onClick={() => setEditing(true)} style={{ padding: '6px 16px', borderRadius: 8, border: '1.5px solid #7c3aed', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✏️ Edit Limit
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0 = unlimited"
              style={{ width: 120, padding: '8px 12px', borderRadius: 8, border: '2px solid #7c3aed', fontSize: 16, fontWeight: 700, color: '#7c3aed', fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={save} disabled={busy} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {busy ? 'Saving…' : '✓ Save'}
            </button>
            <button onClick={() => { setEditing(false); setErr(''); setValue(String(docUser?.dailyTokenLimit ?? 0)); }}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
          {err && <div style={{ fontSize: 12, color: '#e74c3c', fontWeight: 600 }}>{err}</div>}
          <div style={{ fontSize: 11.5, color: '#8fa8bc' }}>Set <strong>0</strong> for unlimited. Admin can also change this.</div>
        </div>
      )}
    </div>
  );
}

/* ── Stats Tab ────────────────────────────────────────────────── */
function StatsTab({ myPatients, waiting, called, done, docUser, myId, onUpdateTokenLimit }) {
  const totalRev  = myPatients.reduce((s, p) => s + (p.paid  || 0), 0);
  const totalDues = myPatients.reduce((s, p) => s + (p.dues  || 0), 0);
  const limit     = docUser?.dailyTokenLimit ?? 0;

  return (
    <div>
      <SectionHeader title="My Statistics" subtitle={`Today, ${today()}`} />

      <div style={{ marginBottom: 24 }}>
        <TokenLimitEditor docUser={docUser} myId={myId} onUpdateTokenLimit={onUpdateTokenLimit} />
        {limit > 0 && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e8eff6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: myPatients.length >= limit ? '#e74c3c' : '#7c3aed', width: `${Math.min((myPatients.length / limit) * 100, 100)}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: myPatients.length >= limit ? '#e74c3c' : '#7c3aed', whiteSpace: 'nowrap' }}>
              {myPatients.length}/{limit} used
            </span>
          </div>
        )}
      </div>

      <div className="stats-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Stat label="Total Patients Today"  value={myPatients.length} icon="👥" color="#7c3aed" />
        <Stat label="Completed"             value={done.length}       icon="✅" color="var(--success)" />
        <Stat label="Still Waiting"         value={waiting.length}    icon="⏳" color="var(--primary)" />
        <Stat label="Revenue Collected Rs." value={totalRev.toLocaleString()}  icon="💰" color="var(--success)" />
        <Stat label="Total Dues Rs."        value={totalDues.toLocaleString()} icon="⚠️" color="var(--danger)" />
      </div>

      {myPatients.length > 0 && (
        <Card noPad style={{ marginBottom: 24 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <h3 style={{ fontSize: 15 }}>Patient Breakdown</h3>
          </div>
          <div className="stats-table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Token','Name','Age','Symptoms','Fee Rs.','Paid Rs.','Dues Rs.','Payment','Follow-up','Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myPatients.map((p) => {
                  const days   = daysUntil(p.followUpDate);
                  const fStyle = p.followUpDate ? followUpBadgeStyle(days) : null;
                  return (
                    <tr key={p._id || p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px' }}><TokenBadge token={p.token} size="sm" status={p.status} /></td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{p.age || '-'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.symptoms}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{p.totalFee || 0}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--success)', fontWeight: 500 }}>{p.paid || 0}</td>
                      <td style={{ padding: '10px 14px', color: p.dues > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: p.dues > 0 ? 600 : 400 }}>{p.dues || 0}</td>
                      <td style={{ padding: '10px 14px' }}><PaymentBadge method={p.paymentMethod} /></td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {p.followUpDate
                          ? <span style={{ color: fStyle.color, fontWeight: 600, fontSize: 12 }}>📅 {p.followUpDate}<br /><span style={{ fontSize: 10 }}>{fStyle.label}</span></span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge color={p.status === 'called' ? 'yellow' : p.status === 'done' ? 'gray' : 'blue'}>{p.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Follow-ups Tab ───────────────────────────────────────────── */
function FollowUpsTab({ allMyPatients, onUpdateFollowUp }) {
  const [editingId, setEditingId] = useState(null);

  const upcoming = allMyPatients
    .filter((p) => p.followUpDate)
    .map((p) => ({ ...p, _days: daysUntil(p.followUpDate) }))
    .sort((a, b) => a._days - b._days);

  const urgent = upcoming.filter((p) => p._days <= 3);
  const rest   = upcoming.filter((p) => p._days > 3);

  function renderRow(p) {
    const style = followUpBadgeStyle(p._days);
    const pid   = p._id || p.id;
    return (
      <div key={pid}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--border)', background: p._days <= 3 ? style.bg : '#fff', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.symptoms?.substring(0, 50)}</div>
            {p.followUpNote && <div style={{ fontSize: 11.5, color: '#7c3aed', marginTop: 2 }}>📝 {p.followUpNote}</div>}
            {p.phone && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                📞 {p.phone}{p.whatsapp && p.whatsapp !== p.phone ? ` · 💬 ${p.whatsapp}` : ''}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: style.color }}>{p.followUpDate}</div>
            <div style={{ fontSize: 11, color: style.color, fontWeight: 600, marginTop: 1 }}>{style.label}</div>
          </div>
          <button
            onClick={() => setEditingId(editingId === pid ? null : pid)}
            style={{ background: 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: '#7c3aed' }}
          >✏️</button>
        </div>
        {editingId === pid && (
          <FollowUpInlineEditor
            patient={p}
            onSave={async (date, note) => { await onUpdateFollowUp(pid, date, note); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Follow-up Dates" subtitle="All your patients with scheduled follow-ups" />

      {upcoming.length === 0 ? (
        <div style={{ background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No follow-up dates set yet</div>
          <div style={{ fontSize: 13 }}>Use the 📅 button on any patient in My Queue to set a follow-up date.</div>
        </div>
      ) : (
        <div style={{ border: '1.5px solid rgba(124,58,237,0.2)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>All Follow-up Appointments</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {urgent.length > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  🔴 {urgent.length} urgent
                </span>
              )}
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                {upcoming.length} total
              </span>
            </div>
          </div>

          {urgent.length > 0 && (
            <>
              <div style={{ padding: '7px 14px', background: 'rgba(231,76,60,0.07)', borderBottom: '1px solid rgba(231,76,60,0.15)', fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                ⚠️ Needs attention soon (within 3 days)
              </div>
              {urgent.map(renderRow)}
            </>
          )}

          {rest.length > 0 && (
            <>
              <div style={{ padding: '7px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                📆 Upcoming
              </div>
              {rest.map(renderRow)}
            </>
          )}
        </div>
      )}
    </div>
  );
}