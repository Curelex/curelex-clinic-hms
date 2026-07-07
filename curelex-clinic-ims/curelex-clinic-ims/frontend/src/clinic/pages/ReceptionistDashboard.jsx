// // src/pages/ReceptionistDashboard.jsx
// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   DashboardLayout, Card, Stat, Btn, Badge, Input, Select,
//   Textarea, Modal, Alert, SectionHeader, Empty, TokenBadge,
// } from '../components/UI';
// import { FileUploadSection } from '../components/FileUpload';
// import { today, currentTime } from '../utils/helpers';
// import { useApp } from '../context/AppContext';
// import { isSectionVisible } from '../utils/planConfig';
// import { AllPatients } from './AdminDashboard';

// const API        = import.meta.env.VITE_API_URL        || 'http://localhost:5000';
// const CLINIC_BASE = import.meta.env.VITE_CLINIC_API_URL || '/api/clinic';

// function getTodayIST() {
//   const now       = new Date();
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   const istDate   = new Date(now.getTime() + istOffset);
//   return istDate.toISOString().split('T')[0];
// }

// function getGreeting(name) {
//   const h     = new Date().getHours();
//   const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
//   return `${greet}, ${name} 👋`;
// }

// function daysUntil(dateStr) {
//   if (!dateStr) return null;
//   const now    = new Date(); now.setHours(0, 0, 0, 0);
//   const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
//   return Math.round((target - now) / (1000 * 60 * 60 * 24));
// }

// function followUpBadgeStyle(days) {
//   if (days < 0)   return { bg: 'rgba(231,76,60,0.10)',  border: 'rgba(231,76,60,0.3)',   color: '#c0392b', label: 'Overdue' };
//   if (days === 0) return { bg: 'rgba(231,76,60,0.10)',  border: 'rgba(231,76,60,0.3)',   color: '#c0392b', label: 'Today!' };
//   if (days <= 3)  return { bg: 'rgba(243,156,18,0.10)', border: 'rgba(243,156,18,0.3)',  color: '#d68910', label: `${days}d left` };
//   return               { bg: 'rgba(0,184,148,0.08)',  border: 'rgba(0,184,148,0.25)',  color: '#00a878', label: `${days}d left` };
// }

// function PaymentBadge({ method }) {
//   if (method === 'upi') {
//     return (
//       <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
//         📲 UPI
//       </span>
//     );
//   }
//   return (
//     <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
//       💵 Cash
//     </span>
//   );
// }

// // ── PDF Generator (same as PrescriptionModal) ─────────────────────────────────
// function generatePrescriptionHTML(prescription, clinicName) {
//   const {
//     patientName, patientAge, patientGender, patientPhone,
//     doctorName, doctorSpecialist, tokenNumber,
//     date, diagnosis, medicines, tests, notes, followUpDate,
//   } = prescription;

//   const medsHTML = (medicines || []).length === 0
//     ? '<tr><td colspan="5" style="text-align:center;color:#999;padding:12px">No medicines prescribed</td></tr>'
//     : (medicines || []).map((m, i) => `
//         <tr style="border-bottom:1px solid #eee">
//           <td style="padding:8px 10px;font-weight:600">${i + 1}</td>
//           <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${m.name || ''}</td>
//           <td style="padding:8px 10px">${m.dosage || '-'}</td>
//           <td style="padding:8px 10px">${m.frequency || '-'}</td>
//           <td style="padding:8px 10px">${m.duration || '-'}${m.instructions ? `<br><small style="color:#888">${m.instructions}</small>` : ''}</td>
//         </tr>`).join('');

//   const testsHTML = (tests || []).length === 0 ? '' : `
//     <div style="margin-top:20px">
//       <h3 style="font-size:14px;color:#3498db;border-bottom:2px solid #3498db;padding-bottom:6px;margin-bottom:10px">🔬 Investigations / Tests</h3>
//       <table style="width:100%;border-collapse:collapse;font-size:13px">
//         <thead><tr style="background:#f0f8ff">
//           <th style="padding:8px 10px;text-align:left;width:40px">#</th>
//           <th style="padding:8px 10px;text-align:left">Test Name</th>
//           <th style="padding:8px 10px;text-align:left">Instructions</th>
//         </tr></thead>
//         <tbody>${(tests || []).map((t, i) => `
//           <tr style="border-bottom:1px solid #eee">
//             <td style="padding:8px 10px">${i + 1}</td>
//             <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${t.name || ''}</td>
//             <td style="padding:8px 10px">${t.instructions || '-'}</td>
//           </tr>`).join('')}
//         </tbody>
//       </table>
//     </div>`;

//   return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescription - ${patientName}</title>
//   <style>
//     *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff}
//     @media print{body{padding:0}.no-print{display:none!important}@page{margin:15mm;size:A4}}
//     .page{max-width:780px;margin:0 auto;padding:24px}
//     .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #7c3aed;margin-bottom:18px}
//     .clinic-info h1{font-size:22px;color:#7c3aed;font-weight:800}.clinic-info p{font-size:12px;color:#888;margin-top:2px}
//     .rx-symbol{font-size:60px;color:#7c3aed;font-weight:900;line-height:1;opacity:.15}
//     .doctor-info{text-align:right}.doctor-info h2{font-size:16px;color:#0a3d62;font-weight:700}.doctor-info p{font-size:12px;color:#888}
//     .patient-bar{background:linear-gradient(135deg,#f8f5ff,#f0f8ff);border:1px solid #e8e0ff;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap}
//     .patient-field label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.5px;display:block}
//     .patient-field span{font-size:14px;font-weight:700;color:#0a3d62}
//     .section-title{font-size:14px;color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:6px;margin-bottom:10px;font-weight:700}
//     .diagnosis-box{background:#fafafa;border-left:4px solid #7c3aed;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:18px;font-size:14px;color:#0a3d62}
//     table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#f8f5ff}
//     th{padding:8px 10px;text-align:left;font-size:11px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
//     .notes-box{background:#fffbf0;border:1px solid #ffe082;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px}
//     .followup-box{background:#f0fff4;border:1px solid #a8e6cf;border-radius:8px;padding:12px 16px;margin-top:12px;font-size:13px;display:flex;align-items:center;gap:8px}
//     .footer{margin-top:40px;border-top:1px solid #eee;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#aaa}
//     .signature-line{border-top:1px solid #aaa;padding-top:4px;text-align:center;width:160px;font-size:11px;color:#555}
//     .token-badge{background:#7c3aed;color:#fff;border-radius:8px;padding:4px 12px;font-size:13px;font-weight:700}
//     .print-btn{position:fixed;top:20px;right:20px;background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.4);z-index:1000}
//   </style></head><body>
//   <button class="no-print print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
//   <div class="page">
//     <div class="header">
//       <div class="clinic-info"><h1>${clinicName || 'ClinicFlow'}</h1><p>Medical Prescription</p></div>
//       <div style="display:flex;align-items:center;gap:16px">
//         <div class="doctor-info"><h2>Dr. ${doctorName || ''}</h2><p>${doctorSpecialist || 'Doctor'}</p></div>
//         <div class="rx-symbol">Rx</div>
//       </div>
//     </div>
//     <div class="patient-bar">
//       <div class="patient-field"><label>Patient Name</label><span>${patientName || 'N/A'}</span></div>
//       ${patientAge ? `<div class="patient-field"><label>Age</label><span>${patientAge} yrs</span></div>` : ''}
//       ${patientGender ? `<div class="patient-field"><label>Gender</label><span style="text-transform:capitalize">${patientGender}</span></div>` : ''}
//       ${patientPhone ? `<div class="patient-field"><label>Phone</label><span>${patientPhone}</span></div>` : ''}
//       <div class="patient-field"><label>Date</label><span>${date || ''}</span></div>
//       <div class="patient-field"><label>Token</label><span class="token-badge">#${tokenNumber || ''}</span></div>
//     </div>
//     ${diagnosis ? `<div style="margin-bottom:18px"><div class="section-title">📋 Diagnosis / Chief Complaint</div><div class="diagnosis-box">${diagnosis}</div></div>` : ''}
//     <div style="margin-bottom:18px">
//       <div class="section-title">💊 Medicines Prescribed</div>
//       <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration / Instructions</th></tr></thead>
//       <tbody>${medsHTML}</tbody></table>
//     </div>
//     ${testsHTML}
//     ${notes ? `<div class="notes-box"><strong>📝 Advice / Notes:</strong><br><span style="margin-top:4px;display:block">${notes}</span></div>` : ''}
//     ${followUpDate ? `<div class="followup-box"><span style="font-size:18px">📅</span><div><strong>Follow-up Date:</strong> ${followUpDate}</div></div>` : ''}
//     <div class="footer">
//       <div><div>Generated by ClinicFlow · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div style="margin-top:2px">This prescription is computer generated.</div></div>
//       <div class="signature-line">Dr. ${doctorName || ''}<br>Signature</div>
//     </div>
//   </div></body></html>`;
// }

// // ── Rx PDF Button — fetches prescription and opens PDF ───────────────────────
// function RxPdfButton({ patientId, clinicName }) {
//   const [loading, setLoading] = useState(false);

//   async function handleClick() {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('clinic_token');
//       const res   = await fetch(`${CLINIC_BASE}/prescriptions/patient/${patientId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (!res.ok || !data.prescriptions?.length) {
//         alert('No prescription found for this patient.');
//         return;
//       }
//       const rx   = data.prescriptions[0];
//       const html = generatePrescriptionHTML(rx, clinicName || rx.clinicName || '');
//       const win  = window.open('', '_blank');
//       if (win) { win.document.write(html); win.document.close(); }
//     } catch (e) {
//       alert('Failed to load prescription: ' + e.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <button
//       onClick={handleClick}
//       disabled={loading}
//       title="View Prescription PDF"
//       style={{
//         background: loading ? 'rgba(124,58,237,0.05)' : 'rgba(124,58,237,0.10)',
//         border: '1px solid rgba(124,58,237,0.30)',
//         borderRadius: 7, padding: '4px 10px', cursor: loading ? 'not-allowed' : 'pointer',
//         fontSize: 12, color: '#7c3aed', fontWeight: 700, fontFamily: 'inherit',
//         display: 'flex', alignItems: 'center', gap: 4, opacity: loading ? 0.7 : 1,
//       }}
//     >
//       {loading ? '⏳' : '📋 Rx'}
//     </button>
//   );
// }

// function PhoneInput({ label, value, onChange, placeholder }) {
//   const isFull = value.length === 10;
//   function handleChange(e) {
//     const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
//     onChange(digits);
//   }
//   return (
//     <div>
//       <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
//       <div style={{ position: 'relative' }}>
//         <input
//           type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10}
//           value={value} onChange={handleChange}
//           placeholder={placeholder || '10-digit number'}
//           style={{
//             width: '100%', padding: '9px 40px 9px 12px',
//             border: `1.5px solid ${value.length > 0 && !isFull ? '#e74c3c' : isFull ? '#00a878' : 'var(--border)'}`,
//             borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none',
//             color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', transition: 'border-color .15s',
//           }}
//         />
//         <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: isFull ? '#00a878' : value.length > 0 ? '#e74c3c' : 'var(--text-light)' }}>
//           {value.length}/10
//         </span>
//       </div>
//       {value.length > 0 && !isFull && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>Enter exactly 10 digits ({10 - value.length} more needed)</div>}
//       {isFull && <div style={{ fontSize: 11, color: '#00a878', marginTop: 3 }}>✓ Valid number</div>}
//     </div>
//   );
// }

// function PastFileRow({ file, patientId }) {
//   const { downloadPatientFile } = useApp();
//   const [downloading, setDownloading] = useState(false);
//   async function handleDownload() {
//     setDownloading(true);
//     try {
//       const blob = await downloadPatientFile(patientId, String(file._id));
//       const url  = URL.createObjectURL(blob);
//       const a    = document.createElement('a');
//       a.href     = url; a.download = file.filename; a.click();
//       URL.revokeObjectURL(url);
//     } catch (e) { alert('Download failed: ' + e.message); }
//     finally { setDownloading(false); }
//   }
//   const isImage = file.mimeType?.startsWith('image/');
//   const isPdf   = file.mimeType === 'application/pdf';
//   return (
//     <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 5 }}>
//       <span style={{ fontSize: 18, flexShrink: 0 }}>{isPdf ? '📄' : isImage ? '🖼️' : '📎'}</span>
//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</div>
//         <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · {file.uploadedBy} · {new Date(file.uploadedAt).toLocaleDateString()}</div>
//       </div>
//       <button onClick={handleDownload} disabled={downloading}
//         style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #3498db', background: 'rgba(52,152,219,0.1)', color: '#3498db', fontSize: 11, fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: downloading ? 0.6 : 1 }}>
//         {downloading ? '⏳' : '⬇ Download'}
//       </button>
//     </div>
//   );
// }

// function PastFilesPreview({ phone }) {
//   const { getPatientHistory } = useApp();
//   const [history,  setHistory]  = useState(null);
//   const [loading,  setLoading]  = useState(false);
//   const [expanded, setExpanded] = useState(false);

//   async function load() {
//     if (expanded) { setExpanded(false); return; }
//     setLoading(true);
//     try {
//       const visits = await getPatientHistory(phone);
//       setHistory(visits || []);
//       setExpanded(true);
//     } catch (e) { setHistory([]); setExpanded(true); }
//     finally { setLoading(false); }
//   }

//   const visitsWithFiles = history ? history.filter((v) => v.files?.length > 0) : [];
//   const totalFiles      = visitsWithFiles.reduce((s, v) => s + v.files.length, 0);

//   return (
//     <div style={{ borderTop: '1px solid var(--border)' }}>
//       <button onClick={load} disabled={loading}
//         style={{ width: '100%', padding: '8px 16px', background: expanded ? 'rgba(52,152,219,0.08)' : 'rgba(52,152,219,0.04)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, color: '#3498db', fontWeight: 700, fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
//         {loading ? '⏳ Loading past files…' : expanded ? '📎 Hide Past Files' : '📎 View Past Uploaded Files'}
//         {!loading && expanded && totalFiles > 0 && <span style={{ background: '#3498db', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>{totalFiles}</span>}
//         {!loading && expanded && totalFiles === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 400 }}>(no files yet)</span>}
//       </button>
//       {expanded && history !== null && (
//         <div style={{ padding: '10px 16px 14px', background: 'rgba(52,152,219,0.03)' }}>
//           {visitsWithFiles.length === 0 ? (
//             <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
//               <span>📁</span> No files have been uploaded in any previous visits.
//             </div>
//           ) : (
//             <div style={{ display: 'grid', gap: 12 }}>
//               {visitsWithFiles.map((visit) => (
//                 <div key={String(visit._id)}>
//                   <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '5px 8px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 6 }}>
//                     <span style={{ color: '#7c3aed' }}>📅 {visit.date}</span>
//                     <span style={{ color: 'var(--text-muted)' }}>· Dr. {visit.doctorName}</span>
//                     <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)' }}>· {visit.symptoms?.substring(0, 50)}{visit.symptoms?.length > 50 ? '…' : ''}</span>
//                     <span style={{ marginLeft: 'auto', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 20, padding: '1px 7px', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>{visit.files.length} file{visit.files.length !== 1 ? 's' : ''}</span>
//                   </div>
//                   {visit.files.map((f) => (
//                     <PastFileRow key={String(f._id)} file={f} patientId={String(visit._id)} />
//                   ))}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// function PlanUpgradeNotice({ requiredPlan, currentPlan, onGoToPlans }) {
//   const colors = {
//     plus: { grad: 'linear-gradient(135deg,#0a3d62,#1565a8)', shadow: 'rgba(10,61,98,0.25)' },
//     pro:  { grad: 'linear-gradient(135deg,#6c3fc5,#8e5cf5)', shadow: 'rgba(108,63,197,0.25)' },
//   };
//   const c = colors[requiredPlan] ?? colors.plus;
//   return (
//     <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px', textAlign:'center' }}>
//       <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
//       <div style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:700, color:'#0a3d62', marginBottom:8 }}>
//         This feature requires {requiredPlan === 'pro' ? 'Clinic Pro' : 'Clinic Plus'}
//       </div>
//       <div style={{ fontSize:14, color:'#4a6278', maxWidth:380, lineHeight:1.65, marginBottom:28 }}>
//         Upgrade your plan to unlock this section and many more advanced features.
//       </div>
//       <button onClick={onGoToPlans} style={{ padding:'13px 28px', borderRadius:11, border:'none', background:c.grad, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:`0 5px 18px ${c.shadow}` }}>
//         🚀 Upgrade Plan
//       </button>
//     </div>
//   );
// }

// /* ══════════════════════════════════════════════════════════════
//    MAIN COMPONENT
//    ══════════════════════════════════════════════════════════════ */
// export default function ReceptionistDashboard({ onGoToPlans }) {
//   const {
//     session, logout, activePlan,
//     getPatients, getUsers,
//     updatePatientStatus, updateFollowUp, addPatient,
//     uploadPatientFile, getPatientFiles, downloadPatientFile, deletePatientFile,
//   } = useApp();

//   const [tab,        setTab]       = useState('register');
//   const [patients,   setPatients]  = useState([]);
//   const [doctors,    setDoctors]   = useState([]);
//   const [showToken,  setShowToken] = useState(null);
//   const [clinicName, setClinicName] = useState(session?.clinicName || '');

//   const reload = useCallback(async () => {
//     try {
//       const [pats, users] = await Promise.all([getPatients(), getUsers()]);
//       setPatients(pats);
//       setDoctors(users.filter((u) => u.role === 'doctor'));
//     } catch (e) { console.error('Receptionist reload error:', e); }
//   }, [getPatients, getUsers]);

//   useEffect(() => {
//     reload();
//     const id = setInterval(reload, 3000);
//     return () => clearInterval(id);
//   }, [reload]);

//   const todayStr     = getTodayIST();
//   const todayQueue   = patients.filter((p) => p.date === todayStr).sort((a, b) => a.token - b.token);
//   const waitingCount = todayQueue.filter((p) => p.status === 'waiting').length;
//   const receptionistName = session?.user?.name || 'Receptionist';

//   const TAB_TO_SECTION = {
//     register:  'allPatients',
//     queue:     'allPatients',
//     all:       'allPatients',
//     followups: 'followUps',
//   };

//   const allNavItems = [
//     { icon: '➕', label: 'Register Patient', tab: 'register',  section: 'allPatients' },
//     { icon: '📋', label: "Today's Queue",    tab: 'queue',     section: 'allPatients', badge: waitingCount || undefined },
//     { icon: '👥', label: 'All Patients',     tab: 'all',       section: 'allPatients' },
//     { icon: '📅', label: 'Follow-ups',       tab: 'followups', section: 'followUps' },
//   ];

//   const navItems = allNavItems
//     .filter(item => isSectionVisible(activePlan ?? 'lite', item.section))
//     .map(item => ({
//       icon:    item.icon,
//       label:   item.label,
//       active:  tab === item.tab,
//       onClick: () => setTab(item.tab),
//       badge:   item.badge,
//     }));

//   useEffect(() => {
//     const currentSection = TAB_TO_SECTION[tab];
//     if (currentSection && !isSectionVisible(activePlan ?? 'lite', currentSection)) {
//       setTab('register');
//     }
//   }, [activePlan, tab]);

//   async function handleUpdateStatus(patientId, status) {
//     try {
//       const updated = await updatePatientStatus(patientId, status);
//       setPatients((prev) => prev.map((p) => (p._id === patientId ? updated : p)));
//     } catch (e) { console.error(e); }
//   }

//   async function handleUpdateFollowUp(patientId, followUpDate, followUpNote) {
//     try {
//       const updated = await updateFollowUp(patientId, followUpDate, followUpNote);
//       setPatients((prev) => prev.map((p) => (p._id === patientId ? updated : p)));
//       return updated;
//     } catch (e) { throw e; }
//   }

//   async function handleRegister(patientData) {
//     const newPatient = await addPatient(patientData);
//     setPatients((prev) => [...prev, newPatient]);
//     setShowToken(newPatient);
//     setTab('queue');
//   }

//   function goToPlans() { onGoToPlans?.(); }

//   return (
//     <>
//       <style>{`
//         @media (max-width: 640px) {
//           .rp-register-grid { grid-template-columns: 1fr !important; }
//           .rp-age-gender { grid-template-columns: 1fr 1fr !important; }
//           .rp-phone-wa { grid-template-columns: 1fr !important; }
//           .rp-queue-header { flex-direction: column !important; align-items: flex-start !important; }
//           .rp-queue-badges { flex-wrap: wrap !important; gap: 6px !important; }
//           .rp-queue-card { flex-wrap: wrap !important; }
//         }
//       `}</style>

//       <DashboardLayout
//         title={<span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{getGreeting(receptionistName)}</span>}
//         subtitle={<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{clinicName}</span>}
//         navItems={navItems}
//         onLogout={logout}
//         clinicName={clinicName}
//         userRole="Receptionist"
//         accent="#0f766e"
//       >
//         {tab === 'register'  && <PatientRegister doctors={doctors} patients={patients} onRegistered={handleRegister} />}
//         {tab === 'queue'     && <TodayQueue todayQueue={todayQueue} doctors={doctors} onUpdateStatus={handleUpdateStatus} onUpdateFollowUp={handleUpdateFollowUp} onUploadFile={uploadPatientFile} onGetFiles={getPatientFiles} onDownloadFile={downloadPatientFile} onDeleteFile={deletePatientFile} clinicName={clinicName} />}
//         {tab === 'all'       && <AllPatients patients={patients} />}
//         {tab === 'followups' && (
//           isSectionVisible(activePlan ?? 'lite', 'followUps')
//             ? <FollowUpsTab patients={patients} onUpdateFollowUp={handleUpdateFollowUp} />
//             : <PlanUpgradeNotice requiredPlan="plus" currentPlan={activePlan} onGoToPlans={goToPlans} />
//         )}
//         {showToken && <TokenPopup patient={showToken} onClose={() => setShowToken(null)} />}
//       </DashboardLayout>
//     </>
//   );
// }

// function TokenPopup({ patient, onClose }) {
//   return (
//     <Modal title="🎉 Token Generated!" onClose={onClose} width={420}>
//       <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
//         <div style={{ width: 130, height: 130, borderRadius: 65, background: 'var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(15,76,129,0.3)' }}>
//           <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: 1 }}>TOKEN</div>
//           <div style={{ color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{patient.token}</div>
//         </div>
//         <h3 style={{ fontSize: 20, marginBottom: 4 }}>{patient.name}</h3>
//         <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>Dr. {patient.doctorName}</div>
//         <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 16 }}>{patient.date} · {patient.time}</div>
//         <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px', marginBottom: 20, fontSize: 14 }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
//             <span style={{ color: 'var(--text-muted)' }}>Payment Method</span>
//             <PaymentBadge method={patient.paymentMethod} />
//           </div>
//           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: patient.dues > 0 ? 8 : 0 }}>
//             <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
//             <span style={{ color: 'var(--success)', fontWeight: 600 }}>Rs. {patient.paid || 0}</span>
//           </div>
//           {patient.dues > 0 && (
//             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//               <span style={{ color: 'var(--text-muted)' }}>Dues Remaining</span>
//               <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Rs. {patient.dues}</span>
//             </div>
//           )}
//         </div>
//         <Btn full size="lg" onClick={onClose}>✓ Done — Register Next Patient</Btn>
//       </div>
//     </Modal>
//   );
// }

// function PatientSearchPanel({ patients, onSelectReturning, onSelectNew }) {
//   const [phone,   setPhone]   = useState('');
//   const [results, setResults] = useState(null);
//   function handlePhoneChange(val) { setPhone(val); setResults(null); }
//   function search() {
//     const q = phone.trim().replace(/\s+/g, '');
//     if (!q) return;
//     const found = patients.filter((p) => {
//       const pPhone = (p.phone    || '').replace(/\s+/g, '');
//       const pWa    = (p.whatsapp || '').replace(/\s+/g, '');
//       return pPhone.includes(q) || pWa.includes(q);
//     });
//     setResults(found);
//   }
//   const uniquePatients = results
//     ? Object.values(results.reduce((acc, p) => {
//         const key = `${(p.phone || '').replace(/\s+/g, '')}_${p.name?.toLowerCase()}`;
//         if (!acc[key] || new Date(p.date) > new Date(acc[key].date)) acc[key] = p;
//         return acc;
//       }, {}))
//     : [];
//   function getVisits(rep) {
//     return patients.filter((p) => {
//       const samePhone = (p.phone || '').replace(/\s+/g, '') === (rep.phone || '').replace(/\s+/g, '');
//       const sameName  = p.name?.toLowerCase() === rep.name?.toLowerCase();
//       return samePhone && sameName;
//     }).sort((a, b) => new Date(b.date) - new Date(a.date));
//   }
//   return (
//     <div style={{ marginBottom: 28 }}>
//       <div style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.07), rgba(79,70,229,0.05))', border: '1.5px solid rgba(15,118,110,0.2)', borderRadius: 16, padding: '20px 22px' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
//           <span style={{ fontSize: 22 }}>🔍</span>
//           <div>
//             <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Search Patient by Phone</div>
//             <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Check if this is a returning patient or new registration</div>
//           </div>
//         </div>
//         <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
//           <div style={{ flex: 1, minWidth: 200 }}>
//             <div style={{ position: 'relative' }}>
//               <input type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10} value={phone}
//                 onChange={(e) => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
//                 onKeyDown={(e) => e.key === 'Enter' && search()}
//                 placeholder="Enter 10-digit phone number…"
//                 style={{ width: '100%', padding: '10px 48px 10px 14px', border: `1.5px solid ${phone.length > 0 && phone.length < 10 ? '#e74c3c' : phone.length === 10 ? '#00a878' : 'var(--border)'}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', transition: 'border-color .15s' }} />
//               <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: phone.length === 10 ? '#00a878' : phone.length > 0 ? '#e74c3c' : 'var(--text-light)' }}>{phone.length}/10</span>
//             </div>
//             {phone.length > 0 && phone.length < 10 && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>Enter exactly 10 digits ({10 - phone.length} more needed)</div>}
//           </div>
//           <button onClick={search} disabled={!phone.trim() || phone.length !== 10}
//             style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: phone.length === 10 ? 'var(--primary)' : 'var(--border)', color: phone.length === 10 ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: phone.length === 10 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: '.15s' }}>Search</button>
//           <button onClick={() => onSelectNew(phone)}
//             style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: '.15s' }}>➕ New Patient</button>
//         </div>
//       </div>
//       {results !== null && (
//         <div style={{ marginTop: 16 }}>
//           {uniquePatients.length === 0 ? (
//             <div style={{ background: 'rgba(0,184,148,0.06)', border: '1.5px solid rgba(0,184,148,0.2)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 32 }}>👤</span>
//               <div style={{ flex: 1 }}>
//                 <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>No patient found with this number</div>
//                 <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>This appears to be a new patient.</div>
//               </div>
//               <Btn size="md" onClick={() => onSelectNew(phone)}>➕ Register as New Patient</Btn>
//             </div>
//           ) : (
//             <div>
//               <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{uniquePatients.length} patient{uniquePatients.length > 1 ? 's' : ''} found</div>
//               <div style={{ display: 'grid', gap: 10 }}>
//                 {uniquePatients.map((rep) => {
//                   const visits       = getVisits(rep);
//                   const lastVisit    = visits[0];
//                   const followUpDays = daysUntil(rep.followUpDate);
//                   const hasFollowUp  = !!rep.followUpDate;
//                   return (
//                     <div key={rep._id} style={{ border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
//                       <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
//                         <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{rep.name?.charAt(0).toUpperCase()}</div>
//                         <div style={{ flex: 1, minWidth: 0 }}>
//                           <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{rep.name}</div>
//                           <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
//                             {rep.age    && <span>Age {rep.age}</span>}
//                             {rep.gender && <span style={{ textTransform: 'capitalize' }}>{rep.gender}</span>}
//                             {rep.phone  && <span>📞 {rep.phone}</span>}
//                           </div>
//                           <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
//                             <span style={{ fontSize: 11, background: 'var(--surface2)', borderRadius: 20, padding: '2px 8px', color: 'var(--text-muted)' }}>{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
//                             <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last: {lastVisit?.date}</span>
//                             {hasFollowUp && followUpDays !== null && (
//                               <span style={{ fontSize: 11, fontWeight: 700, color: followUpBadgeStyle(followUpDays).color, background: followUpBadgeStyle(followUpDays).bg, border: `1px solid ${followUpBadgeStyle(followUpDays).border}`, borderRadius: 20, padding: '2px 8px' }}>📅 Follow-up: {rep.followUpDate} ({followUpBadgeStyle(followUpDays).label})</span>
//                             )}
//                           </div>
//                         </div>
//                         <button onClick={() => onSelectReturning(rep, visits)}
//                           style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: hasFollowUp ? '#7c3aed' : 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
//                           {hasFollowUp ? '📅 Follow-up Visit' : '🔄 Returning Patient'}
//                         </button>
//                       </div>
//                       {lastVisit && (
//                         <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
//                           <span>🩺 Last complaint: <strong style={{ color: 'var(--text)' }}>{lastVisit.symptoms?.substring(0, 60)}{lastVisit.symptoms?.length > 60 ? '…' : ''}</strong></span>
//                           <span>👨‍⚕️ Dr. {lastVisit.doctorName}</span>
//                         </div>
//                       )}
//                       {rep.phone && <PastFilesPreview phone={rep.phone} />}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// function ReturningPatientPanel({ patient, visits, doctors, patients, onRegistered, onBack }) {
//   const [showHistory, setShowHistory] = useState(false);
//   const init = { name: patient.name || '', age: patient.age || '', phone: (patient.phone || '').replace(/\D/g, '').slice(0, 10), whatsapp: (patient.whatsapp || '').replace(/\D/g, '').slice(0, 10), gender: patient.gender || 'male', symptoms: '', doctorId: String(patient.doctorId || ''), totalFee: '', paid: '', notes: '', paymentMethod: 'cash' };
//   const [form, setForm] = useState(init);
//   const [err,  setErr]  = useState('');
//   const [busy, setBusy] = useState(false);
//   const f    = (k, v) => setForm((p) => ({ ...p, [k]: v }));
//   const dues = Math.max(0, (parseFloat(form.totalFee) || 0) - (parseFloat(form.paid) || 0));
//   async function register() {
//     if (!form.name.trim())                            { setErr('Patient name is required.'); return; }
//     if (!form.doctorId)                               { setErr('Please select a doctor.'); return; }
//     if (!form.symptoms.trim())                        { setErr('Please describe the symptoms.'); return; }
//     if (form.phone    && form.phone.length    !== 10) { setErr('Phone number must be exactly 10 digits.'); return; }
//     if (form.whatsapp && form.whatsapp.length !== 10) { setErr('WhatsApp number must be exactly 10 digits.'); return; }
//     setBusy(true); setErr('');
//     try { await onRegistered({ name: form.name.trim(), age: form.age, phone: form.phone, whatsapp: form.whatsapp, gender: form.gender, symptoms: form.symptoms.trim(), notes: form.notes, doctorId: form.doctorId, totalFee: parseFloat(form.totalFee) || 0, paid: parseFloat(form.paid) || 0, paymentMethod: form.paymentMethod, isReturnVisit: true }); setForm(init); }
//     catch (e) { setErr(e.message); }
//     finally { setBusy(false); }
//   }
//   const hasFollowUp  = !!patient.followUpDate;
//   const followUpDays = daysUntil(patient.followUpDate);
//   return (
//     <div>
//       <div style={{ background: hasFollowUp ? 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(79,70,229,0.06))' : 'linear-gradient(135deg, rgba(15,118,110,0.09), rgba(0,184,148,0.05))', border: `1.5px solid ${hasFollowUp ? 'rgba(124,58,237,0.25)' : 'rgba(15,118,110,0.2)'}`, borderRadius: 14, padding: '18px 20px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
//         <div style={{ width: 52, height: 52, borderRadius: 26, background: hasFollowUp ? '#7c3aed' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{patient.name?.charAt(0).toUpperCase()}</div>
//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
//             <span style={{ fontWeight: 800, fontSize: 18 }}>{patient.name}</span>
//             {hasFollowUp ? <span style={{ fontSize: 11, fontWeight: 700, background: followUpBadgeStyle(followUpDays).bg, color: followUpBadgeStyle(followUpDays).color, border: `1px solid ${followUpBadgeStyle(followUpDays).border}`, borderRadius: 20, padding: '2px 10px' }}>📅 Follow-up: {followUpBadgeStyle(followUpDays).label}</span>
//               : <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(0,184,148,0.1)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px' }}>🔄 Returning Patient</span>}
//           </div>
//           <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
//             {patient.age && <span>Age {patient.age}</span>}{patient.gender && <span style={{ textTransform: 'capitalize' }}>{patient.gender}</span>}{patient.phone && <span>📞 {patient.phone}</span>}<span>{visits.length} previous visit{visits.length !== 1 ? 's' : ''}</span>
//           </div>
//         </div>
//         <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
//           <button onClick={() => setShowHistory((v) => !v)} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{showHistory ? '🙈 Hide History' : '📋 View History'}</button>
//           <button onClick={onBack} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
//         </div>
//       </div>
//       {showHistory && (
//         <div style={{ marginBottom: 22, border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
//           <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>📋 Visit History ({visits.length} visits)</div>
//           {visits.map((v, i) => (
//             <div key={v._id} style={{ padding: '12px 16px', borderBottom: i < visits.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12, flexWrap: 'wrap', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
//               <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{v.token}</div>
//               <div style={{ flex: 1 }}>
//                 <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{v.date} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· Dr. {v.doctorName}</span></div>
//                 <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.symptoms}</div>
//               </div>
//               <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
//                 <div style={{ fontWeight: 600, color: v.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>{v.status === 'done' ? '✓ Completed' : v.status}</div>
//                 {v.paid > 0 && <div>Rs. {v.paid} paid</div>}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//       <SectionHeader title="Register New Visit" subtitle="Patient info is pre-filled — just update symptoms and select a doctor" />
//       <div className="rp-register-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
//         <Card>
//           <h3 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>👤 Patient Information</h3>
//           <div style={{ display: 'grid', gap: 14 }}>
//             <Input label="Full Name *" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. Muhammad Ahmed" />
//             <div className="rp-age-gender" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//               <Input label="Age" type="number" value={form.age} onChange={(e) => f('age', e.target.value)} placeholder="25" />
//               <Select label="Gender" value={form.gender} onChange={(e) => f('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
//             </div>
//             <div className="rp-phone-wa" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//               <PhoneInput label="Phone" value={form.phone} onChange={(v) => f('phone', v)} />
//               <PhoneInput label="WhatsApp" value={form.whatsapp} onChange={(v) => f('whatsapp', v)} />
//             </div>
//             <Textarea label="Symptoms / Complaint *" value={form.symptoms} onChange={(e) => f('symptoms', e.target.value)} placeholder="What brings the patient today?" rows={3} />
//             <Textarea label="Additional Notes" value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Any other information…" rows={2} />
//           </div>
//         </Card>
//         <div style={{ display: 'grid', gap: 16 }}>
//           <DoctorSelector doctors={doctors} patients={patients} form={form} f={f} />
//           <PaymentCard form={form} f={f} dues={dues} />
//           {err && <Alert type="error">{err}</Alert>}
//           <Btn full size="lg" onClick={register} disabled={busy}>{busy ? 'Registering…' : '🎫 Generate Token & Register'}</Btn>
//         </div>
//       </div>
//     </div>
//   );
// }

// function DoctorSelector({ doctors, patients, form, f }) {
//   return (
//     <Card>
//       <h3 style={{ fontSize: 16, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>👨‍⚕️ Select Doctor</h3>
//       {doctors.length === 0 ? (
//         <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: 13 }}>No doctors registered yet.</div>
//       ) : (
//         <div style={{ display: 'grid', gap: 10 }}>
//           {doctors.map((doc) => {
//             const todayStr2 = getTodayIST();
//             const todayCount = patients.filter((p) => String(p.doctorId) === String(doc._id) && p.date === todayStr2).length;
//             const isSelected = form.doctorId === String(doc._id);
//             const limit = doc.dailyTokenLimit ?? 0;
//             const limitReached = limit > 0 && todayCount >= limit;
//             return (
//               <div key={doc._id} onClick={() => { if (!limitReached) { f('doctorId', String(doc._id)); f('doctorName', doc.name); if (doc.fee) f('totalFee', String(doc.fee)); } }}
//                 style={{ border: `2px solid ${isSelected ? 'var(--primary)' : limitReached ? '#e74c3c' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', cursor: limitReached ? 'not-allowed' : 'pointer', background: isSelected ? 'var(--primary-light)' : limitReached ? 'rgba(231,76,60,0.04)' : 'var(--surface)', opacity: limitReached ? 0.7 : 1, transition: '.15s' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
//                   <div>
//                     <div style={{ fontWeight: 600, fontSize: 14 }}>{doc.name}</div>
//                     <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{doc.specialist}{doc.fee ? ` · Rs. ${doc.fee}` : ''}</div>
//                     {limitReached && <div style={{ fontSize: 11, color: '#e74c3c', fontWeight: 700, marginTop: 2 }}>🚫 Daily limit reached ({todayCount}/{limit})</div>}
//                   </div>
//                   <div style={{ textAlign: 'center', background: isSelected ? 'var(--primary)' : 'var(--surface2)', borderRadius: 8, padding: '4px 10px', flexShrink: 0 }}>
//                     <div style={{ fontSize: 18, fontWeight: 800, color: isSelected ? '#fff' : 'var(--primary)' }}>#{todayCount + 1}</div>
//                     <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{limit > 0 ? `${todayCount}/${limit}` : 'Next Token'}</div>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </Card>
//   );
// }

// function PaymentCard({ form, f, dues }) {
//   return (
//     <Card>
//       <h3 style={{ fontSize: 16, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>💰 Payment Details</h3>
//       <div style={{ display: 'grid', gap: 14 }}>
//         <div>
//           <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Payment Method</div>
//           <div style={{ display: 'flex', gap: 8 }}>
//             {[{ value: 'cash', label: '💵 Cash', color: '#00a878', bg: 'rgba(0,184,148,0.10)', border: 'rgba(0,184,148,0.40)' }, { value: 'upi', label: '📲 UPI', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.40)' }].map((opt) => {
//               const selected = form.paymentMethod === opt.value;
//               return <button key={opt.value} type="button" onClick={() => f('paymentMethod', opt.value)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', border: `2px solid ${selected ? opt.border : 'var(--border)'}`, background: selected ? opt.bg : 'var(--surface)', color: selected ? opt.color : 'var(--text-muted)', fontWeight: selected ? 700 : 500, fontSize: 14, fontFamily: 'inherit', transition: '.15s' }}>{opt.label}</button>;
//             })}
//           </div>
//         </div>
//         <Input label="Total Fee (Rs.)" type="number" value={form.totalFee} onChange={(e) => f('totalFee', e.target.value)} placeholder="0" />
//         <Input label="Amount Paid Now (Rs.)" type="number" value={form.paid} onChange={(e) => f('paid', e.target.value)} placeholder="0" />
//         <div style={{ background: dues > 0 ? 'var(--danger-light)' : 'var(--success-light)', borderRadius: 10, padding: '12px 14px' }}>
//           <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dues / Remaining</div>
//           <div style={{ fontSize: 24, fontWeight: 700, color: dues > 0 ? 'var(--danger)' : 'var(--success)' }}>Rs. {dues.toLocaleString()}</div>
//         </div>
//       </div>
//     </Card>
//   );
// }

// function PatientRegister({ doctors, patients, onRegistered }) {
//   const [mode,             setMode]             = useState('search');
//   const [prefillPhone,     setPrefillPhone]     = useState('');
//   const [returningPatient, setReturningPatient] = useState(null);
//   const [returningVisits,  setReturningVisits]  = useState([]);
//   function handleSelectNew(phone = '')            { setPrefillPhone(phone); setMode('new'); }
//   function handleSelectReturning(patient, visits) { setReturningPatient(patient); setReturningVisits(visits); setMode('returning'); }
//   function handleBack()                           { setMode('search'); setReturningPatient(null); setReturningVisits([]); }
//   if (mode === 'returning' && returningPatient) {
//     return <ReturningPatientPanel patient={returningPatient} visits={returningVisits} doctors={doctors} patients={patients} onRegistered={onRegistered} onBack={handleBack} />;
//   }
//   return (
//     <div>
//       <SectionHeader title="Register Patient" subtitle="Search first to check if the patient is returning or new" />
//       <PatientSearchPanel patients={patients} onSelectReturning={handleSelectReturning} onSelectNew={handleSelectNew} />
//       {mode === 'new' && <NewPatientForm doctors={doctors} patients={patients} prefillPhone={prefillPhone} onRegistered={onRegistered} onBack={() => setMode('search')} />}
//     </div>
//   );
// }

// function NewPatientForm({ doctors, patients, prefillPhone, onRegistered, onBack }) {
//   const init = { name: '', age: '', phone: (prefillPhone || '').replace(/\D/g, '').slice(0, 10), whatsapp: (prefillPhone || '').replace(/\D/g, '').slice(0, 10), gender: 'male', symptoms: '', doctorId: '', doctorName: '', totalFee: '', paid: '', notes: '', paymentMethod: 'cash' };
//   const [form, setForm] = useState(init);
//   const [err, setErr] = useState('');
//   const [busy, setBusy] = useState(false);
//   const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
//   const dues = Math.max(0, (parseFloat(form.totalFee) || 0) - (parseFloat(form.paid) || 0));
//   async function register() {
//     if (!form.name.trim()) { setErr('Patient name is required.'); return; }
//     if (!form.doctorId) { setErr('Please select a doctor.'); return; }
//     if (!form.symptoms.trim()) { setErr('Please describe the symptoms.'); return; }
//     if (form.phone && form.phone.length !== 10) { setErr('Phone number must be exactly 10 digits.'); return; }
//     if (form.whatsapp && form.whatsapp.length !== 10) { setErr('WhatsApp number must be exactly 10 digits.'); return; }
//     setBusy(true); setErr('');
//     try {
//       const selectedDoctor = doctors.find(doc => String(doc._id) === String(form.doctorId));
//       const doctorName = selectedDoctor?.name || '';
//       if (!doctorName) { setErr('Doctor not found. Please select a valid doctor.'); return; }
//       await onRegistered({ name: form.name.trim(), age: form.age, phone: form.phone, whatsapp: form.whatsapp, gender: form.gender, symptoms: form.symptoms.trim(), notes: form.notes, doctorId: form.doctorId, doctorName, totalFee: parseFloat(form.totalFee) || 0, paid: parseFloat(form.paid) || 0, paymentMethod: form.paymentMethod });
//       setForm(init);
//     } catch (e) { setErr(e.message || 'Registration failed. Please try again.'); }
//     finally { setBusy(false); }
//   }
//   return (
//     <div>
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '12px 16px', background: 'rgba(0,184,148,0.07)', border: '1.5px solid rgba(0,184,148,0.2)', borderRadius: 12, flexWrap: 'wrap', gap: 10 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
//           <span style={{ fontSize: 20 }}>👤</span>
//           <div><div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>New Patient Registration</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fill in the patient's information below</div></div>
//         </div>
//         <button onClick={onBack} style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Search</button>
//       </div>
//       <div className="rp-register-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
//         <Card>
//           <h3 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>👤 Patient Information</h3>
//           <div style={{ display: 'grid', gap: 14 }}>
//             <Input label="Full Name *" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. Muhammad Ahmed" />
//             <div className="rp-age-gender" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//               <Input label="Age" type="number" value={form.age} onChange={(e) => f('age', e.target.value)} placeholder="25" />
//               <Select label="Gender" value={form.gender} onChange={(e) => f('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
//             </div>
//             <div className="rp-phone-wa" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//               <PhoneInput label="Phone" value={form.phone} onChange={(v) => f('phone', v)} />
//               <PhoneInput label="WhatsApp" value={form.whatsapp} onChange={(v) => f('whatsapp', v)} />
//             </div>
//             <Textarea label="Symptoms / Complaint *" value={form.symptoms} onChange={(e) => f('symptoms', e.target.value)} placeholder="Describe patient's symptoms..." rows={3} />
//             <Textarea label="Additional Notes" value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Any other information..." rows={2} />
//           </div>
//         </Card>
//         <div style={{ display: 'grid', gap: 16 }}>
//           <DoctorSelector doctors={doctors} patients={patients} form={form} f={f} />
//           <PaymentCard form={form} f={f} dues={dues} />
//           {err && <Alert type="error">{err}</Alert>}
//           <Btn full size="lg" onClick={register} disabled={busy}>{busy ? 'Registering…' : '🎫 Generate Token & Register'}</Btn>
//         </div>
//       </div>
//     </div>
//   );
// }

// const STATUS_ORDER = { waiting: 0, called: 1, done: 2 };
// function sortQueue(patients) { return [...patients].sort((a, b) => { const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; return d !== 0 ? d : a.token - b.token; }); }

// // ✅ clinicName passed down to QueueCard → RxPdfButton
// function TodayQueue({ todayQueue, doctors, onUpdateStatus, onUpdateFollowUp, onUploadFile, onGetFiles, onDownloadFile, onDeleteFile, clinicName }) {
//   const sorted  = sortQueue(todayQueue);
//   const waiting = sorted.filter((p) => p.status === 'waiting');
//   const called  = sorted.filter((p) => p.status === 'called');
//   const done    = sorted.filter((p) => p.status === 'done');
//   return (
//     <div>
//       <div className="rp-queue-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
//         <div><h2 style={{ fontSize: 22, marginBottom: 4 }}>Today's Queue</h2><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Auto-refreshes every 3 seconds</p></div>
//         <div className="rp-queue-badges" style={{ display: 'flex', gap: 10 }}>
//           <Badge color="blue">⏳ {waiting.length} Waiting</Badge>
//           <Badge color="yellow">📢 {called.length} Called</Badge>
//           <Badge color="green">✓ {done.length} Done</Badge>
//         </div>
//       </div>
//       {doctors.map((doc) => {
//         const docQ   = sortQueue(sorted.filter((p) => String(p.doctorId) === String(doc._id)));
//         if (docQ.length === 0) return null;
//         const activeQ = docQ.filter((p) => p.status !== 'done');
//         const doneQ   = docQ.filter((p) => p.status === 'done');
//         return (
//           <div key={doc._id} style={{ marginBottom: 24 }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 16px', background: 'var(--primary-light)', borderRadius: 10, flexWrap: 'wrap' }}>
//               <span style={{ fontSize: 18 }}>👨‍⚕️</span><span style={{ fontWeight: 700, fontSize: 15 }}>{doc.name}</span><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>— {doc.specialist}</span><Badge color="blue">{docQ.length} patients</Badge>
//             </div>
//             <div style={{ display: 'grid', gap: 8 }}>
//               {activeQ.map((p) => <QueueCard key={p._id} patient={p} onUpdateStatus={onUpdateStatus} onUpdateFollowUp={onUpdateFollowUp} onUploadFile={onUploadFile} onGetFiles={onGetFiles} onDownloadFile={onDownloadFile} onDeleteFile={onDeleteFile} clinicName={clinicName} />)}
//               {activeQ.length > 0 && doneQ.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /><span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Completed</span><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>}
//               {doneQ.map((p) => <QueueCard key={p._id} patient={p} onUpdateStatus={onUpdateStatus} onUpdateFollowUp={onUpdateFollowUp} onUploadFile={onUploadFile} onGetFiles={onGetFiles} onDownloadFile={onDownloadFile} onDeleteFile={onDeleteFile} clinicName={clinicName} />)}
//             </div>
//           </div>
//         );
//       })}
//       {sorted.length === 0 && <Empty icon="🪑" title="Queue is empty" desc="No patients registered today. Go to 'Register Patient' to add one." />}
//     </div>
//   );
// }

// function QueueCard({ patient: p, onUpdateStatus, onUpdateFollowUp, onUploadFile, onGetFiles, onDownloadFile, onDeleteFile, clinicName }) {
//   const pid = p._id || p.id;
//   const [showFollowUp, setShowFollowUp] = useState(false);
//   const [showFiles,    setShowFiles]    = useState(false);
//   const [files,        setFiles]        = useState([]);
//   const [loadingFiles, setLoadingFiles] = useState(false);
//   const statusBg = { waiting: 'var(--surface)', called: '#fffbeb', done: 'var(--surface2)' };
//   const days = daysUntil(p.followUpDate);
//   useEffect(() => { if (showFiles && files.length === 0 && !loadingFiles) loadFiles(); }, [showFiles]);
//   async function loadFiles() {
//     setLoadingFiles(true);
//     try { const result = await onGetFiles(pid); setFiles(Array.isArray(result) ? result : (result?.files || [])); }
//     catch (err) { setFiles([]); }
//     finally { setLoadingFiles(false); }
//   }
//   async function handleUploadFile(patientId, file) { await onUploadFile(patientId, file); const result = await onGetFiles(pid); setFiles(Array.isArray(result) ? result : (result?.files || [])); }
//   async function handleDeleteFile(patientId, fileId) { await onDeleteFile(patientId, fileId); const result = await onGetFiles(pid); setFiles(Array.isArray(result) ? result : (result?.files || [])); }
//   async function handleDownloadFile(patientId, fileId) { if (!fileId || fileId === patientId) throw new Error('Invalid file ID'); return onDownloadFile(patientId, fileId); }

//   return (
//     <div style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
//       <div style={{ background: statusBg[p.status], padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
//         <TokenBadge token={p.token} size="md" status={p.status} />
//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ fontWeight: 600, fontSize: 15, textDecoration: p.status === 'done' ? 'line-through' : 'none', color: p.status === 'done' ? 'var(--text-muted)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
//           <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.symptoms?.substring(0, 50)}{p.symptoms?.length > 50 ? '…' : ''}</div>
//           <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
//             <span>🕐 {p.time}</span><PaymentBadge method={p.paymentMethod} />
//             {p.phone  && <span style={{ color: 'var(--text-muted)' }}>📞 {p.phone}</span>}
//             {p.dues > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ Due: Rs.{p.dues}</span>}
//             {p.isReturnVisit && <span style={{ fontSize: 10, background: 'rgba(0,184,148,0.1)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>🔄 Return</span>}
//             {p.followUpDate && days !== null && <span style={{ color: followUpBadgeStyle(days).color, fontWeight: 600 }}>📅 {p.followUpDate} ({followUpBadgeStyle(days).label})</span>}
//           </div>
//         </div>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
//           {p.dues > 0 && <Badge color="red">Due: Rs.{p.dues}</Badge>}
//           <Badge color={p.status === 'called' ? 'yellow' : p.status === 'done' ? 'gray' : 'blue'}>{p.status === 'waiting' ? '⏳ Waiting' : p.status === 'called' ? '📢 Called' : '✓ Done'}</Badge>
//           {p.status === 'waiting' && <Btn size="sm" variant="warning" onClick={() => onUpdateStatus(pid, 'called')}>Call</Btn>}
//           {p.status === 'called'  && <Btn size="sm" variant="accent"  onClick={() => onUpdateStatus(pid, 'done')}>Done</Btn>}
//           {/* ✅ NEW: Rx PDF button — shows for ALL patients (done or not) */}
//           <RxPdfButton patientId={pid} clinicName={clinicName} />
//           <button onClick={() => setShowFollowUp((v) => !v)} title="Set follow-up date" style={{ background: p.followUpDate ? 'rgba(124,58,237,0.10)' : 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: '#7c3aed' }}>📅</button>
//           <button onClick={() => setShowFiles((v) => !v)} title="Manage patient files" style={{ background: showFiles ? 'rgba(52,152,219,0.15)' : 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: showFiles ? '#3498db' : 'var(--text-light)' }}>📎 {files.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>({files.length})</span>}</button>
//         </div>
//       </div>
//       {showFollowUp && <FollowUpInlineEditor patient={p} onSave={async (date, note) => { await onUpdateFollowUp(pid, date, note); setShowFollowUp(false); }} onCancel={() => setShowFollowUp(false)} />}
//       {showFiles && (
//         <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'rgba(52,152,219,0.02)' }}>
//           {loadingFiles ? <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>⏳ Loading files…</div>
//             : <FileUploadSection patientId={pid} files={files} onUpload={handleUploadFile} onDelete={handleDeleteFile} onDownload={handleDownloadFile} disabled={loadingFiles} />}
//         </div>
//       )}
//     </div>
//   );
// }

// function FollowUpInlineEditor({ patient: p, onSave, onCancel }) {
//   const [date, setDate] = useState(p.followUpDate || '');
//   const [note, setNote] = useState(p.followUpNote || '');
//   const [busy, setBusy] = useState(false);
//   const [err,  setErr]  = useState('');
//   async function save() { setBusy(true); setErr(''); try { await onSave(date, note); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
//   return (
//     <div style={{ padding: '12px 16px 14px', background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(124,58,237,0.12)' }}>
//       <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>📅 Set Follow-up Date</div>
//       <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
//         <div>
//           <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Date</div>
//           <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={getTodayIST()} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #c5d5e8', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0a3d62', fontWeight: 600 }} />
//         </div>
//         <div style={{ flex: 1, minWidth: 160 }}>
//           <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Note (optional)</div>
//           <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Check blood pressure" style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #c5d5e8', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
//         </div>
//         <button onClick={save} disabled={busy || !date} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy || !date ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !date ? 0.6 : 1 }}>{busy ? '…' : '✓ Save'}</button>
//         {p.followUpDate && <button onClick={() => onSave('', '')} disabled={busy} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑 Clear</button>}
//         <button onClick={onCancel} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
//       </div>
//       {err && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>{err}</div>}
//     </div>
//   );
// }

// function FollowUpsTab({ patients, onUpdateFollowUp }) {
//   const [editingId, setEditingId] = useState(null);
//   const upcoming = patients.filter((p) => p.followUpDate).map((p) => ({ ...p, _days: daysUntil(p.followUpDate) })).sort((a, b) => a._days - b._days);
//   const urgent = upcoming.filter((p) => p._days <= 3);
//   const rest   = upcoming.filter((p) => p._days > 3);
//   function renderRow(p) {
//     const style = followUpBadgeStyle(p._days); const pid = p._id || p.id;
//     return (
//       <div key={pid}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--border)', background: p._days <= 3 ? style.bg : '#fff', flexWrap: 'wrap' }}>
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
//             <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dr. {p.doctorName} · {p.symptoms?.substring(0, 40)}</div>
//             {p.followUpNote && <div style={{ fontSize: 11.5, color: '#7c3aed', marginTop: 2 }}>📝 {p.followUpNote}</div>}
//             {p.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📞 {p.phone}</div>}
//           </div>
//           <div style={{ textAlign: 'right', flexShrink: 0 }}>
//             <div style={{ fontSize: 13, fontWeight: 700, color: style.color }}>{p.followUpDate}</div>
//             <div style={{ fontSize: 11, color: style.color, fontWeight: 600, marginTop: 1 }}>{style.label}</div>
//           </div>
//           <button onClick={() => setEditingId(editingId === pid ? null : pid)} style={{ background: 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: '#7c3aed' }}>✏️</button>
//         </div>
//         {editingId === pid && <FollowUpInlineEditor patient={p} onSave={async (date, note) => { await onUpdateFollowUp(pid, date, note); setEditingId(null); }} onCancel={() => setEditingId(null)} />}
//       </div>
//     );
//   }
//   return (
//     <div>
//       <SectionHeader title="Follow-up Dates" subtitle="All patients with scheduled follow-ups" />
//       {upcoming.length === 0 ? (
//         <div style={{ background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
//           <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
//           <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No follow-up dates set yet</div>
//           <div style={{ fontSize: 13 }}>Use the 📅 button on any patient in Today's Queue to set a follow-up date.</div>
//         </div>
//       ) : (
//         <div style={{ border: '1.5px solid rgba(124,58,237,0.2)', borderRadius: 14, overflow: 'hidden' }}>
//           <div style={{ padding: '12px 16px', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>📅</span><span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>All Follow-up Appointments</span></div>
//             <div style={{ display: 'flex', gap: 8 }}>
//               {urgent.length > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>🔴 {urgent.length} urgent</span>}
//               <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{upcoming.length} total</span>
//             </div>
//           </div>
//           {urgent.length > 0 && <><div style={{ padding: '7px 14px', background: 'rgba(231,76,60,0.07)', borderBottom: '1px solid rgba(231,76,60,0.15)', fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 0.4 }}>⚠️ Needs attention soon</div>{urgent.map(renderRow)}</>}
//           {rest.length > 0 && <><div style={{ padding: '7px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>📆 Upcoming</div>{rest.map(renderRow)}</>}
//         </div>
//       )}
//     </div>
//   );
// }









import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DashboardLayout, Card, Stat, Btn, Badge, Input, Select,
  Textarea, Modal, Alert, SectionHeader, Empty, TokenBadge,
} from '../components/UI';
import { FileUploadSection } from '../components/FileUpload';
import { today, currentTime } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import { isSectionVisible } from '../utils/planConfig';
import { AllPatients } from './AdminDashboard';

const API        = import.meta.env.VITE_API_URL        || 'http://localhost:5000';
const CLINIC_BASE = import.meta.env.VITE_CLINIC_API_URL || '/api/clinic';

function getTodayIST() {
  const now       = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate   = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

function getGreeting(name) {
  const h     = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${greet}, ${name} 👋`;
}

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

function PaymentBadge({ method }) {
  if (method === 'upi') {
    return (
      <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
        📲 UPI
      </span>
    );
  }
  return (
    <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
      💵 Cash
    </span>
  );
}

// ── PDF Generator (same as PrescriptionModal) ─────────────────────────────────
function generatePrescriptionHTML(prescription, clinicName) {
  const {
    patientName, patientAge, patientGender, patientPhone,
    doctorName, doctorSpecialist, tokenNumber,
    date, diagnosis, medicines, tests, notes, followUpDate,
  } = prescription;

  const medsHTML = (medicines || []).length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#999;padding:12px">No medicines prescribed</td></tr>'
    : (medicines || []).map((m, i) => `
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:8px 10px;font-weight:600">${i + 1}</td>
          <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${m.name || ''}</td>
          <td style="padding:8px 10px">${m.dosage || '-'}</td>
          <td style="padding:8px 10px">${m.frequency || '-'}</td>
          <td style="padding:8px 10px">${m.duration || '-'}${m.instructions ? `<br><small style="color:#888">${m.instructions}</small>` : ''}</td>
        </tr>`).join('');

  const testsHTML = (tests || []).length === 0 ? '' : `
    <div style="margin-top:20px">
      <h3 style="font-size:14px;color:#3498db;border-bottom:2px solid #3498db;padding-bottom:6px;margin-bottom:10px">🔬 Investigations / Tests</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f0f8ff">
          <th style="padding:8px 10px;text-align:left;width:40px">#</th>
          <th style="padding:8px 10px;text-align:left">Test Name</th>
          <th style="padding:8px 10px;text-align:left">Instructions</th>
        </tr></thead>
        <tbody>${(tests || []).map((t, i) => `
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:8px 10px">${i + 1}</td>
            <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${t.name || ''}</td>
            <td style="padding:8px 10px">${t.instructions || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescription - ${patientName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff}
    @media print{body{padding:0}.no-print{display:none!important}@page{margin:15mm;size:A4}}
    .page{max-width:780px;margin:0 auto;padding:24px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #7c3aed;margin-bottom:18px}
    .clinic-info h1{font-size:22px;color:#7c3aed;font-weight:800}.clinic-info p{font-size:12px;color:#888;margin-top:2px}
    .rx-symbol{font-size:60px;color:#7c3aed;font-weight:900;line-height:1;opacity:.15}
    .doctor-info{text-align:right}.doctor-info h2{font-size:16px;color:#0a3d62;font-weight:700}.doctor-info p{font-size:12px;color:#888}
    .patient-bar{background:linear-gradient(135deg,#f8f5ff,#f0f8ff);border:1px solid #e8e0ff;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap}
    .patient-field label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.5px;display:block}
    .patient-field span{font-size:14px;font-weight:700;color:#0a3d62}
    .section-title{font-size:14px;color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:6px;margin-bottom:10px;font-weight:700}
    .diagnosis-box{background:#fafafa;border-left:4px solid #7c3aed;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:18px;font-size:14px;color:#0a3d62}
    table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#f8f5ff}
    th{padding:8px 10px;text-align:left;font-size:11px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .notes-box{background:#fffbf0;border:1px solid #ffe082;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px}
    .followup-box{background:#f0fff4;border:1px solid #a8e6cf;border-radius:8px;padding:12px 16px;margin-top:12px;font-size:13px;display:flex;align-items:center;gap:8px}
    .footer{margin-top:40px;border-top:1px solid #eee;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#aaa}
    .signature-line{border-top:1px solid #aaa;padding-top:4px;text-align:center;width:160px;font-size:11px;color:#555}
    .token-badge{background:#7c3aed;color:#fff;border-radius:8px;padding:4px 12px;font-size:13px;font-weight:700}
    .print-btn{position:fixed;top:20px;right:20px;background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.4);z-index:1000}
  </style></head><body>
  <button class="no-print print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
  <div class="page">
    <div class="header">
      <div class="clinic-info"><h1>${clinicName || 'ClinicFlow'}</h1><p>Medical Prescription</p></div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="doctor-info"><h2>Dr. ${doctorName || ''}</h2><p>${doctorSpecialist || 'Doctor'}</p></div>
        <div class="rx-symbol">Rx</div>
      </div>
    </div>
    <div class="patient-bar">
      <div class="patient-field"><label>Patient Name</label><span>${patientName || 'N/A'}</span></div>
      ${patientAge ? `<div class="patient-field"><label>Age</label><span>${patientAge} yrs</span></div>` : ''}
      ${patientGender ? `<div class="patient-field"><label>Gender</label><span style="text-transform:capitalize">${patientGender}</span></div>` : ''}
      ${patientPhone ? `<div class="patient-field"><label>Phone</label><span>${patientPhone}</span></div>` : ''}
      <div class="patient-field"><label>Date</label><span>${date || ''}</span></div>
      <div class="patient-field"><label>Token</label><span class="token-badge">#${tokenNumber || ''}</span></div>
    </div>
    ${diagnosis ? `<div style="margin-bottom:18px"><div class="section-title">📋 Diagnosis / Chief Complaint</div><div class="diagnosis-box">${diagnosis}</div></div>` : ''}
    <div style="margin-bottom:18px">
      <div class="section-title">💊 Medicines Prescribed</div>
      <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration / Instructions</th></tr></thead>
      <tbody>${medsHTML}</tbody></table>
    </div>
    ${testsHTML}
    ${notes ? `<div class="notes-box"><strong>📝 Advice / Notes:</strong><br><span style="margin-top:4px;display:block">${notes}</span></div>` : ''}
    ${followUpDate ? `<div class="followup-box"><span style="font-size:18px">📅</span><div><strong>Follow-up Date:</strong> ${followUpDate}</div></div>` : ''}
    <div class="footer">
      <div><div>Generated by ClinicFlow · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div style="margin-top:2px">This prescription is computer generated.</div></div>
      <div class="signature-line">Dr. ${doctorName || ''}<br>Signature</div>
    </div>
  </div></body></html>`;
}

// ── Rx PDF Button — fetches prescription and opens PDF ───────────────────────
function RxPdfButton({ patientId, clinicName }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const token = localStorage.getItem('clinic_token');
      const res   = await fetch(`${CLINIC_BASE}/prescriptions/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.prescriptions?.length) {
        alert('No prescription found for this patient.');
        return;
      }
      const rx   = data.prescriptions[0];
      const html = generatePrescriptionHTML(rx, clinicName || rx.clinicName || '');
      const win  = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (e) {
      alert('Failed to load prescription: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="View Prescription PDF"
      style={{
        background: loading ? 'rgba(124,58,237,0.05)' : 'rgba(124,58,237,0.10)',
        border: '1px solid rgba(124,58,237,0.30)',
        borderRadius: 7, padding: '4px 10px', cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 12, color: '#7c3aed', fontWeight: 700, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 4, opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? '⏳' : '📋 Rx'}
    </button>
  );
}

function PhoneInput({ label, value, onChange, placeholder,...rest }) {
  const isFull = value.length === 10;
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
  }
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10}
          value={value} onChange={handleChange}
          placeholder={placeholder || '10-digit number'} {...rest}
          style={{
            width: '100%', padding: '9px 40px 9px 12px',
            border: `1.5px solid ${value.length > 0 && !isFull ? '#e74c3c' : isFull ? '#00a878' : 'var(--border)'}`,
            borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none',
            color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', transition: 'border-color .15s',
          }}
        />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: isFull ? '#00a878' : value.length > 0 ? '#e74c3c' : 'var(--text-light)' }}>
          {value.length}/10
        </span>
      </div>
      {value.length > 0 && !isFull && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>Enter exactly 10 digits ({10 - value.length} more needed)</div>}
      {isFull && <div style={{ fontSize: 11, color: '#00a878', marginTop: 3 }}>✓ Valid number</div>}
    </div>
  );
}

function PastFileRow({ file, patientId }) {
  const { downloadPatientFile } = useApp();
  const [downloading, setDownloading] = useState(false);
  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await downloadPatientFile(patientId, String(file._id));
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url; a.download = file.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Download failed: ' + e.message); }
    finally { setDownloading(false); }
  }
  const isImage = file.mimeType?.startsWith('image/');
  const isPdf   = file.mimeType === 'application/pdf';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{isPdf ? '📄' : isImage ? '🖼️' : '📎'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.filename}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · {file.uploadedBy} · {new Date(file.uploadedAt).toLocaleDateString()}</div>
      </div>
      <button onClick={handleDownload} disabled={downloading}
        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #3498db', background: 'rgba(52,152,219,0.1)', color: '#3498db', fontSize: 11, fontWeight: 700, cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: downloading ? 0.6 : 1 }}>
        {downloading ? '⏳' : '⬇ Download'}
      </button>
    </div>
  );
}

function PastFilesPreview({ phone }) {
  const { getPatientHistory } = useApp();
  const [history,  setHistory]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    if (expanded) { setExpanded(false); return; }
    setLoading(true);
    try {
      const visits = await getPatientHistory(phone);
      setHistory(visits || []);
      setExpanded(true);
    } catch (e) { setHistory([]); setExpanded(true); }
    finally { setLoading(false); }
  }

  const visitsWithFiles = history ? history.filter((v) => v.files?.length > 0) : [];
  const totalFiles      = visitsWithFiles.reduce((s, v) => s + v.files.length, 0);

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button onClick={load} disabled={loading}
        style={{ width: '100%', padding: '8px 16px', background: expanded ? 'rgba(52,152,219,0.08)' : 'rgba(52,152,219,0.04)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, color: '#3498db', fontWeight: 700, fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
        {loading ? '⏳ Loading past files…' : expanded ? '📎 Hide Past Files' : '📎 View Past Uploaded Files'}
        {!loading && expanded && totalFiles > 0 && <span style={{ background: '#3498db', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>{totalFiles}</span>}
        {!loading && expanded && totalFiles === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 400 }}>(no files yet)</span>}
      </button>
      {expanded && history !== null && (
        <div style={{ padding: '10px 16px 14px', background: 'rgba(52,152,219,0.03)' }}>
          {visitsWithFiles.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📁</span> No files have been uploaded in any previous visits.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {visitsWithFiles.map((visit) => (
                <div key={String(visit._id)}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '5px 8px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 6 }}>
                    <span style={{ color: '#7c3aed' }}>📅 {visit.date}</span>
                    <span style={{ color: 'var(--text-muted)' }}>· Dr. {visit.doctorName}</span>
                    <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)' }}>· {visit.symptoms?.substring(0, 50)}{visit.symptoms?.length > 50 ? '…' : ''}</span>
                    <span style={{ marginLeft: 'auto', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 20, padding: '1px 7px', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>{visit.files.length} file{visit.files.length !== 1 ? 's' : ''}</span>
                  </div>
                  {visit.files.map((f) => (
                    <PastFileRow key={String(f._id)} file={f} patientId={String(visit._id)} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanUpgradeNotice({ requiredPlan, currentPlan, onGoToPlans }) {
  const colors = {
    plus: { grad: 'linear-gradient(135deg,#0a3d62,#1565a8)', shadow: 'rgba(10,61,98,0.25)' },
    pro:  { grad: 'linear-gradient(135deg,#6c3fc5,#8e5cf5)', shadow: 'rgba(108,63,197,0.25)' },
  };
  const c = colors[requiredPlan] ?? colors.plus;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px', textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
      <div style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:700, color:'#0a3d62', marginBottom:8 }}>
        This feature requires {requiredPlan === 'pro' ? 'Clinic Pro' : 'Clinic Plus'}
      </div>
      <div style={{ fontSize:14, color:'#4a6278', maxWidth:380, lineHeight:1.65, marginBottom:28 }}>
        Upgrade your plan to unlock this section and many more advanced features.
      </div>
      <button onClick={onGoToPlans} style={{ padding:'13px 28px', borderRadius:11, border:'none', background:c.grad, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:`0 5px 18px ${c.shadow}` }}>
        🚀 Upgrade Plan
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function ReceptionistDashboard({ onGoToPlans }) {
  const {
    session, logout, activePlan,
    getPatients, getUsers,
    updatePatientStatus, updateFollowUp, addPatient,
    uploadPatientFile, getPatientFiles, downloadPatientFile, deletePatientFile,
  } = useApp();

  // ✅ FIX: Read activePlan from localStorage as fallback in case
  // AppContext hasn't hydrated it yet on first render.
  const resolvedPlan = activePlan
    || localStorage.getItem('clinic_plan')
    || localStorage.getItem('activePlan')
    || 'lite';

  const [tab,        setTab]        = useState('register');
  const [patients,   setPatients]   = useState([]);
  const [doctors,    setDoctors]    = useState([]);
  const [showToken,  setShowToken]  = useState(null);
  const [clinicName, setClinicName] = useState(session?.clinicName || '');

  const reload = useCallback(async () => {
    try {
      const [pats, users] = await Promise.all([getPatients(), getUsers()]);
      setPatients(pats);
      setDoctors(users.filter((u) => u.role === 'doctor'));
    } catch (e) { console.error('Receptionist reload error:', e); }
  }, [getPatients, getUsers]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 3000);
    return () => clearInterval(id);
  }, [reload]);

  const todayStr     = getTodayIST();
  const todayQueue   = patients.filter((p) => p.date === todayStr).sort((a, b) => a.token - b.token);
  const waitingCount = todayQueue.filter((p) => p.status === 'waiting').length;
  const receptionistName = session?.user?.name || 'Receptionist';

  const TAB_TO_SECTION = {
    register:  'allPatients',
    queue:     'allPatients',
    all:       'allPatients',
    followups: 'followUps',
  };

  // ✅ FIX: Use resolvedPlan (not activePlan) everywhere below
  const allNavItems = [
    { icon: '➕', label: 'Register Patient', tab: 'register',  section: 'allPatients' },
    { icon: '📋', label: "Today's Queue",    tab: 'queue',     section: 'allPatients', badge: waitingCount || undefined },
    { icon: '👥', label: 'All Patients',     tab: 'all',       section: 'allPatients' },
    { icon: '📅', label: 'Follow-ups',       tab: 'followups', section: 'followUps' },
  ];

  const navItems = allNavItems
    .filter(item => isSectionVisible(resolvedPlan, item.section))
    .map(item => ({
      icon:    item.icon,
      label:   item.label,
      active:  tab === item.tab,
      onClick: () => setTab(item.tab),
      badge:   item.badge,
    }));

  // ✅ FIX: Reset to safe tab if current tab's section becomes hidden
  useEffect(() => {
    const currentSection = TAB_TO_SECTION[tab];
    if (currentSection && !isSectionVisible(resolvedPlan, currentSection)) {
      setTab('register');
    }
  }, [resolvedPlan, tab]);

  async function handleUpdateStatus(patientId, status) {
    try {
      const updated = await updatePatientStatus(patientId, status);
      setPatients((prev) => prev.map((p) => (p._id === patientId ? updated : p)));
    } catch (e) { console.error(e); }
  }

  async function handleUpdateFollowUp(patientId, followUpDate, followUpNote) {
    try {
      const updated = await updateFollowUp(patientId, followUpDate, followUpNote);
      setPatients((prev) => prev.map((p) => (p._id === patientId ? updated : p)));
      return updated;
    } catch (e) { throw e; }
  }

  async function handleRegister(patientData) {
    const newPatient = await addPatient(patientData);
    setPatients((prev) => [...prev, newPatient]);
    setShowToken(newPatient);
    setTab('queue');
  }

  function goToPlans() { onGoToPlans?.(); }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .rp-register-grid { grid-template-columns: 1fr !important; }
          .rp-age-gender { grid-template-columns: 1fr 1fr !important; }
          .rp-phone-wa { grid-template-columns: 1fr !important; }
          .rp-queue-header { flex-direction: column !important; align-items: flex-start !important; }
          .rp-queue-badges { flex-wrap: wrap !important; gap: 6px !important; }
          .rp-queue-card { flex-wrap: wrap !important; }
        }
      `}</style>

      <DashboardLayout
        title={<span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{getGreeting(receptionistName)}</span>}
        subtitle={<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{clinicName}</span>}
        navItems={navItems}
        onLogout={logout}
        clinicName={clinicName}
        userRole="Receptionist"
        accent="#0f766e"
      >
        {tab === 'register'  && <PatientRegister doctors={doctors} patients={patients} onRegistered={handleRegister} />}
        {tab === 'queue'     && <TodayQueue todayQueue={todayQueue} doctors={doctors} onUpdateStatus={handleUpdateStatus} onUpdateFollowUp={handleUpdateFollowUp} onUploadFile={uploadPatientFile} onGetFiles={getPatientFiles} onDownloadFile={downloadPatientFile} onDeleteFile={deletePatientFile} clinicName={clinicName} />}
        {tab === 'all'       && <AllPatients patients={patients} />}
        {tab === 'followups' && (
          isSectionVisible(resolvedPlan, 'followUps')
            ? <FollowUpsTab patients={patients} onUpdateFollowUp={handleUpdateFollowUp} />
            : <PlanUpgradeNotice requiredPlan="plus" currentPlan={resolvedPlan} onGoToPlans={goToPlans} />
        )}
        {showToken && <TokenPopup patient={showToken} onClose={() => setShowToken(null)} />}
      </DashboardLayout>
    </>
  );
}

function TokenPopup({ patient, onClose }) {
  return (
    <Modal title="🎉 Token Generated!" onClose={onClose} width={420}>
      <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
        <div style={{ width: 130, height: 130, borderRadius: 65, background: 'var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(15,76,129,0.3)' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: 1 }}>TOKEN</div>
          <div style={{ color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{patient.token}</div>
        </div>
        <h3 style={{ fontSize: 20, marginBottom: 4 }}>{patient.name}</h3>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>Dr. {patient.doctorName}</div>
        <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 16 }}>{patient.date} · {patient.time}</div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px', marginBottom: 20, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Payment Method</span>
            <PaymentBadge method={patient.paymentMethod} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: patient.dues > 0 ? 8 : 0 }}>
            <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Rs. {patient.paid || 0}</span>
          </div>
          {patient.dues > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Dues Remaining</span>
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Rs. {patient.dues}</span>
            </div>
          )}
        </div>
        <Btn full size="lg" onClick={onClose}>✓ Done — Register Next Patient</Btn>
      </div>
    </Modal>
  );
}

function PatientSearchPanel({ patients, onSelectReturning, onSelectNew }) {
  const [phone,   setPhone]   = useState('');
  const [results, setResults] = useState(null);
  function handlePhoneChange(val) { setPhone(val); setResults(null); }
  function search() {
    const q = phone.trim().replace(/\s+/g, '');
    if (!q) return;
    const found = patients.filter((p) => {
      const pPhone = (p.phone    || '').replace(/\s+/g, '');
      const pWa    = (p.whatsapp || '').replace(/\s+/g, '');
      return pPhone.includes(q) || pWa.includes(q);
    });
    setResults(found);
  }
  const uniquePatients = results
    ? Object.values(results.reduce((acc, p) => {
        const key = `${(p.phone || '').replace(/\s+/g, '')}_${p.name?.toLowerCase()}`;
        if (!acc[key] || new Date(p.date) > new Date(acc[key].date)) acc[key] = p;
        return acc;
      }, {}))
    : [];
  function getVisits(rep) {
    return patients.filter((p) => {
      const samePhone = (p.phone || '').replace(/\s+/g, '') === (rep.phone || '').replace(/\s+/g, '');
      const sameName  = p.name?.toLowerCase() === rep.name?.toLowerCase();
      return samePhone && sameName;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.07), rgba(79,70,229,0.05))', border: '1.5px solid rgba(15,118,110,0.2)', borderRadius: 16, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>🔍</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Search Patient by Phone</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Check if this is a returning patient or new registration</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative' }}>
              <input type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10} value={phone}
                onChange={(e) => handlePhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Enter 10-digit phone number…"
                style={{ width: '100%', padding: '10px 48px 10px 14px', border: `1.5px solid ${phone.length > 0 && phone.length < 10 ? '#e74c3c' : phone.length === 10 ? '#00a878' : 'var(--border)'}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', transition: 'border-color .15s' }} />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: phone.length === 10 ? '#00a878' : phone.length > 0 ? '#e74c3c' : 'var(--text-light)' }}>{phone.length}/10</span>
            </div>
            {phone.length > 0 && phone.length < 10 && <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 3 }}>Enter exactly 10 digits ({10 - phone.length} more needed)</div>}
          </div>
          <button onClick={search} disabled={!phone.trim() || phone.length !== 10}
            style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: phone.length === 10 ? 'var(--primary)' : 'var(--border)', color: phone.length === 10 ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: phone.length === 10 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: '.15s' }}>Search</button>
          <button onClick={() => onSelectNew(phone)}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: '.15s' }}>➕ New Patient</button>
        </div>
      </div>
      {results !== null && (
        <div style={{ marginTop: 16 }}>
          {uniquePatients.length === 0 ? (
            <div style={{ background: 'rgba(0,184,148,0.06)', border: '1.5px solid rgba(0,184,148,0.2)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 32 }}>👤</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>No patient found with this number</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>This appears to be a new patient.</div>
              </div>
              <Btn size="md" onClick={() => onSelectNew(phone)}>➕ Register as New Patient</Btn>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{uniquePatients.length} patient{uniquePatients.length > 1 ? 's' : ''} found</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {uniquePatients.map((rep) => {
                  const visits       = getVisits(rep);
                  const lastVisit    = visits[0];
                  const followUpDays = daysUntil(rep.followUpDate);
                  const hasFollowUp  = !!rep.followUpDate;
                  return (
                    <div key={rep._id} style={{ border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{rep.name?.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{rep.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {rep.age    && <span>Age {rep.age}</span>}
                            {rep.gender && <span style={{ textTransform: 'capitalize' }}>{rep.gender}</span>}
                            {rep.phone  && <span>📞 {rep.phone}</span>}
                          </div>
                          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, background: 'var(--surface2)', borderRadius: 20, padding: '2px 8px', color: 'var(--text-muted)' }}>{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last: {lastVisit?.date}</span>
                            {hasFollowUp && followUpDays !== null && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: followUpBadgeStyle(followUpDays).color, background: followUpBadgeStyle(followUpDays).bg, border: `1px solid ${followUpBadgeStyle(followUpDays).border}`, borderRadius: 20, padding: '2px 8px' }}>📅 Follow-up: {rep.followUpDate} ({followUpBadgeStyle(followUpDays).label})</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => onSelectReturning(rep, visits)}
                          style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: hasFollowUp ? '#7c3aed' : 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                          {hasFollowUp ? '📅 Follow-up Visit' : '🔄 Returning Patient'}
                        </button>
                      </div>
                      {lastVisit && (
                        <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <span>🩺 Last complaint: <strong style={{ color: 'var(--text)' }}>{lastVisit.symptoms?.substring(0, 60)}{lastVisit.symptoms?.length > 60 ? '…' : ''}</strong></span>
                          <span>👨‍⚕️ Dr. {lastVisit.doctorName}</span>
                        </div>
                      )}
                      {rep.phone && <PastFilesPreview phone={rep.phone} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReturningPatientPanel({ patient, visits, doctors, patients, onRegistered, onBack }) {
  const [showHistory, setShowHistory] = useState(false);
  const init = { name: patient.name || '', age: patient.age || '', phone: (patient.phone || '').replace(/\D/g, '').slice(0, 10), whatsapp: (patient.whatsapp || '').replace(/\D/g, '').slice(0, 10), gender: patient.gender || 'male', symptoms: '', doctorId: String(patient.doctorId || ''), totalFee: '', paid: '', notes: '', paymentMethod: 'cash' };
  const [form, setForm] = useState(init);
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const f    = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const dues = Math.max(0, (parseFloat(form.totalFee) || 0) - (parseFloat(form.paid) || 0));
  async function register() {
    if (!form.name.trim())                            { setErr('Patient name is required.'); return; }
    if (!form.doctorId)                               { setErr('Please select a doctor.'); return; }
    if (!form.symptoms.trim())                        { setErr('Please describe the symptoms.'); return; }
    if (form.phone    && form.phone.length    !== 10) { setErr('Phone number must be exactly 10 digits.'); return; }
    if (form.whatsapp && form.whatsapp.length !== 10) { setErr('WhatsApp number must be exactly 10 digits.'); return; }
    setBusy(true); setErr('');
    try { await onRegistered({ name: form.name.trim(), age: form.age, phone: form.phone, whatsapp: form.whatsapp, gender: form.gender, symptoms: form.symptoms.trim(), notes: form.notes, doctorId: form.doctorId, totalFee: parseFloat(form.totalFee) || 0, paid: parseFloat(form.paid) || 0, paymentMethod: form.paymentMethod, isReturnVisit: true }); setForm(init); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  const hasFollowUp  = !!patient.followUpDate;
  const followUpDays = daysUntil(patient.followUpDate);
  return (
    <div>
      <div style={{ background: hasFollowUp ? 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(79,70,229,0.06))' : 'linear-gradient(135deg, rgba(15,118,110,0.09), rgba(0,184,148,0.05))', border: `1.5px solid ${hasFollowUp ? 'rgba(124,58,237,0.25)' : 'rgba(15,118,110,0.2)'}`, borderRadius: 14, padding: '18px 20px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: hasFollowUp ? '#7c3aed' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>{patient.name?.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{patient.name}</span>
            {hasFollowUp ? <span style={{ fontSize: 11, fontWeight: 700, background: followUpBadgeStyle(followUpDays).bg, color: followUpBadgeStyle(followUpDays).color, border: `1px solid ${followUpBadgeStyle(followUpDays).border}`, borderRadius: 20, padding: '2px 10px' }}>📅 Follow-up: {followUpBadgeStyle(followUpDays).label}</span>
              : <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(0,184,148,0.1)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px' }}>🔄 Returning Patient</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {patient.age && <span>Age {patient.age}</span>}{patient.gender && <span style={{ textTransform: 'capitalize' }}>{patient.gender}</span>}{patient.phone && <span>📞 {patient.phone}</span>}<span>{visits.length} previous visit{visits.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowHistory((v) => !v)} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{showHistory ? '🙈 Hide History' : '📋 View History'}</button>
          <button onClick={onBack} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        </div>
      </div>
      {showHistory && (
        <div style={{ marginBottom: 22, border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>📋 Visit History ({visits.length} visits)</div>
          {visits.map((v, i) => (
            <div key={v._id} style={{ padding: '12px 16px', borderBottom: i < visits.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12, flexWrap: 'wrap', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{v.token}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{v.date} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· Dr. {v.doctorName}</span></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.symptoms}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                <div style={{ fontWeight: 600, color: v.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>{v.status === 'done' ? '✓ Completed' : v.status}</div>
                {v.paid > 0 && <div>Rs. {v.paid} paid</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <SectionHeader title="Register New Visit" subtitle="Patient info is pre-filled — just update symptoms and select a doctor" />
      <div className="rp-register-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card>
          <h3 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>👤 Patient Information</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <Input label="Full Name *" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. Muhammad Ahmed" />
            <div className="rp-age-gender" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Age" type="number" value={form.age} onChange={(e) => f('age', e.target.value)} placeholder="25" />
              <Select label="Gender" value={form.gender} onChange={(e) => f('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
            </div>
            <div className="rp-phone-wa" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PhoneInput label="Phone" value={form.phone} onChange={(v) => f('phone', v)} />
              <PhoneInput label="WhatsApp" value={form.whatsapp} onChange={(v) => f('whatsapp', v)} />
            </div>
            <Textarea label="Symptoms / Complaint *" value={form.symptoms} onChange={(e) => f('symptoms', e.target.value)} placeholder="What brings the patient today?" rows={3} />
            <Textarea label="Additional Notes" value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Any other information…" rows={2} />
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <DoctorSelector doctors={doctors} patients={patients} form={form} f={f} />
          <PaymentCard form={form} f={f} dues={dues} />
          {err && <Alert type="error">{err}</Alert>}
          <Btn full size="lg" onClick={register} disabled={busy}>{busy ? 'Registering…' : '🎫 Generate Token & Register'}</Btn>
        </div>
      </div>
    </div>
  );
}

function DoctorSelector({ doctors, patients, form, f,handleEnter  }) {
  return (
    <Card>
      <h3 style={{ fontSize: 16, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>👨‍⚕️ Select Doctor</h3>
      {doctors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: 13 }}>No doctors registered yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {doctors.map((doc) => {
            const todayStr2 = getTodayIST();
            const todayCount = patients.filter((p) => String(p.doctorId) === String(doc._id) && p.date === todayStr2).length;
            const isSelected = form.doctorId === String(doc._id);
            const limit = doc.dailyTokenLimit ?? 0;
            const limitReached = limit > 0 && todayCount >= limit;
            return (
              <div key={doc._id}  tabIndex={0}
              role="button"
              onKeyDown={handleEnter} onClick={() => { if (!limitReached) { f('doctorId', String(doc._id)); f('doctorName', doc.name); if (doc.fee) f('totalFee', String(doc.fee)); } }}
                style={{ border: `2px solid ${isSelected ? 'var(--primary)' : limitReached ? '#e74c3c' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', cursor: limitReached ? 'not-allowed' : 'pointer', background: isSelected ? 'var(--primary-light)' : limitReached ? 'rgba(231,76,60,0.04)' : 'var(--surface)', opacity: limitReached ? 0.7 : 1, transition: '.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{doc.specialist}{doc.fee ? ` · Rs. ${doc.fee}` : ''}</div>
                    {limitReached && <div style={{ fontSize: 11, color: '#e74c3c', fontWeight: 700, marginTop: 2 }}>🚫 Daily limit reached ({todayCount}/{limit})</div>}
                  </div>
                  <div style={{ textAlign: 'center', background: isSelected ? 'var(--primary)' : 'var(--surface2)', borderRadius: 8, padding: '4px 10px', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isSelected ? '#fff' : 'var(--primary)' }}>#{todayCount + 1}</div>
                    <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{limit > 0 ? `${todayCount}/${limit}` : 'Next Token'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function PaymentCard({ form, f, dues,handleEnter }) {
  return (
    <Card>
      <h3 style={{ fontSize: 16, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>💰 Payment Details</h3>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Payment Method</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ value: 'cash', label: '💵 Cash', color: '#00a878', bg: 'rgba(0,184,148,0.10)', border: 'rgba(0,184,148,0.40)' }, { value: 'upi', label: '📲 UPI', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.40)' }].map((opt) => {
              const selected = form.paymentMethod === opt.value;
              return <button key={opt.value}  onKeyDown={(e) => {
                // Move between payment methods
                if (e.key === "ArrowRight" && opt.value === "cash") {
                  document.getElementById("upi-payment-btn")?.focus();
                  f("paymentMethod", "upi");
                }
            
                if (e.key === "ArrowLeft" && opt.value === "upi") {
                  document.getElementById("cash-payment-btn")?.focus();
                  f("paymentMethod", "cash");
                }
            
                // Enter → Total Fee
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("total-fee-input")?.focus();
                }
              }}
              id={opt.value === "cash" ? "cash-payment-btn" : "upi-payment-btn"} 
              type="button" onClick={() => f('paymentMethod', opt.value)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', border: `2px solid ${selected ? opt.border : 'var(--border)'}`, background: selected ? opt.bg : 'var(--surface)', color: selected ? opt.color : 'var(--text-muted)', fontWeight: selected ? 700 : 500, fontSize: 14, fontFamily: 'inherit', transition: '.15s' }}>{opt.label}</button>;
            })}
          </div>
        </div>
        <Input
  id="total-fee-input"
  label="Total Fee (Rs.)"
  type="number"
  value={form.totalFee}
  onChange={(e) => f('totalFee', e.target.value)}
  placeholder="0"
  onKeyDown={handleEnter}
/>
        <Input label="Amount Paid Now (Rs.)" type="number" value={form.paid} onChange={(e) => f('paid', e.target.value)} onKeyDown={handleEnter} placeholder="0" />
        <div style={{ background: dues > 0 ? 'var(--danger-light)' : 'var(--success-light)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dues / Remaining</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: dues > 0 ? 'var(--danger)' : 'var(--success)' }}>Rs. {dues.toLocaleString()}</div>
        </div>
      </div>
    </Card>
  );
}

function PatientRegister({ doctors, patients, onRegistered }) {
  const [mode,             setMode]             = useState('search');
  const [prefillPhone,     setPrefillPhone]     = useState('');
  const [returningPatient, setReturningPatient] = useState(null);
  const [returningVisits,  setReturningVisits]  = useState([]);
  function handleSelectNew(phone = '')            { setPrefillPhone(phone); setMode('new'); }
  function handleSelectReturning(patient, visits) { setReturningPatient(patient); setReturningVisits(visits); setMode('returning'); }
  function handleBack()                           { setMode('search'); setReturningPatient(null); setReturningVisits([]); }
  if (mode === 'returning' && returningPatient) {
    return <ReturningPatientPanel patient={returningPatient} visits={returningVisits} doctors={doctors} patients={patients} onRegistered={onRegistered} onBack={handleBack} />;
  }
  return (
    <div>
      <SectionHeader title="Register Patient" subtitle="Search first to check if the patient is returning or new" />
      <PatientSearchPanel patients={patients} onSelectReturning={handleSelectReturning} onSelectNew={handleSelectNew} />
      {mode === 'new' && <NewPatientForm doctors={doctors} patients={patients} prefillPhone={prefillPhone} onRegistered={onRegistered} onBack={() => setMode('search')} />}
    </div>
  );
}

function NewPatientForm({ doctors, patients, prefillPhone, onRegistered, onBack }) {
  const formRef = useRef(null);

  const handleEnter = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const fields = Array.from(
      formRef.current.querySelectorAll(
        "input, select, textarea, button, [tabindex='0']"
      )
    ).filter(
      (el) => !el.disabled && el.offsetParent !== null
    );

    const index = fields.indexOf(e.target);

    if (index > -1 && fields[index + 1]) {
      fields[index + 1].focus();
    }
    else{
      register();
    }
  };
  const init = { name: '', age: '', phone: (prefillPhone || '').replace(/\D/g, '').slice(0, 10), whatsapp: (prefillPhone || '').replace(/\D/g, '').slice(0, 10), gender: 'male', symptoms: '', doctorId: '', doctorName: '', totalFee: '', paid: '', notes: '', paymentMethod: 'cash' };
  const [form, setForm] = useState(init);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const dues = Math.max(0, (parseFloat(form.totalFee) || 0) - (parseFloat(form.paid) || 0));
  async function register() {
    if (!form.name.trim()) { setErr('Patient name is required.'); return; }
    if (!form.doctorId) { setErr('Please select a doctor.'); return; }
    if (!form.symptoms.trim()) { setErr('Please describe the symptoms.'); return; }
    if (form.phone && form.phone.length !== 10) { setErr('Phone number must be exactly 10 digits.'); return; }
    if (form.whatsapp && form.whatsapp.length !== 10) { setErr('WhatsApp number must be exactly 10 digits.'); return; }
    setBusy(true); setErr('');
    try {
      const selectedDoctor = doctors.find(doc => String(doc._id) === String(form.doctorId));
      const doctorName = selectedDoctor?.name || '';
      if (!doctorName) { setErr('Doctor not found. Please select a valid doctor.'); return; }
      await onRegistered({ name: form.name.trim(), age: form.age, phone: form.phone, whatsapp: form.whatsapp, gender: form.gender, symptoms: form.symptoms.trim(), notes: form.notes, doctorId: form.doctorId, doctorName, totalFee: parseFloat(form.totalFee) || 0, paid: parseFloat(form.paid) || 0, paymentMethod: form.paymentMethod });
      setForm(init);
    } catch (e) { setErr(e.message || 'Registration failed. Please try again.'); }
    finally { setBusy(false); }
  }
  return (
    <div ref={formRef}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '12px 16px', background: 'rgba(0,184,148,0.07)', border: '1.5px solid rgba(0,184,148,0.2)', borderRadius: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>👤</span>
          <div><div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>New Patient Registration</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fill in the patient's information below</div></div>
        </div>
        <button onClick={onBack} style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Search</button>
      </div>
      <div className="rp-register-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card>
          <h3 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>👤 Patient Information</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <Input label="Full Name *" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. Muhammad Ahmed" onKeyDown={handleEnter}/>
            <div className="rp-age-gender" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Age" type="number" value={form.age} onChange={(e) => f('age', e.target.value)} placeholder="25" onKeyDown={handleEnter} />
              <Select label="Gender" value={form.gender} onChange={(e) => f('gender', e.target.value)} onKeyDown={handleEnter}><option value="male">Male</option><option value="female">Female</option><option value="other" >Other</option></Select>
            </div>
            <div className="rp-phone-wa" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PhoneInput label="Phone" value={form.phone} onChange={(v) => f('phone', v)} onKeyDown={handleEnter}/>
              <PhoneInput label="WhatsApp" value={form.whatsapp} onChange={(v) => f('whatsapp', v)} onKeyDown={handleEnter}/>
            </div>
            <Textarea label="Symptoms / Complaint *" value={form.symptoms} onChange={(e) => f('symptoms', e.target.value)} placeholder="Describe patient's symptoms..." rows={3} onKeyDown={handleEnter} />
            <Textarea label="Additional Notes" value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Any other information..." rows={2} onKeyDown={handleEnter}/>
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <DoctorSelector doctors={doctors} patients={patients} form={form} f={f} handleEnter={handleEnter}/>
          <PaymentCard form={form} f={f} dues={dues} handleEnter={handleEnter}/>
          {err && <Alert type="error">{err}</Alert>}
          <Btn full size="lg" onClick={register} disabled={busy} onKeyDown={handleEnter}>{busy ? 'Registering…' : '🎫 Generate Token & Register'}</Btn>
        </div>
      </div>
    </div>
  );
}

const STATUS_ORDER = { waiting: 0, called: 1, done: 2 };
function sortQueue(patients) { return [...patients].sort((a, b) => { const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; return d !== 0 ? d : a.token - b.token; }); }

function TodayQueue({ todayQueue, doctors, onUpdateStatus, onUpdateFollowUp, onUploadFile, onGetFiles, onDownloadFile, onDeleteFile, clinicName }) {
  const sorted  = sortQueue(todayQueue);
  const waiting = sorted.filter((p) => p.status === 'waiting');
  const called  = sorted.filter((p) => p.status === 'called');
  const done    = sorted.filter((p) => p.status === 'done');
  return (
    <div>
      <div className="rp-queue-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div><h2 style={{ fontSize: 22, marginBottom: 4 }}>Today's Queue</h2><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Auto-refreshes every 3 seconds</p></div>
        <div className="rp-queue-badges" style={{ display: 'flex', gap: 10 }}>
          <Badge color="blue">⏳ {waiting.length} Waiting</Badge>
          <Badge color="yellow">📢 {called.length} Called</Badge>
          <Badge color="green">✓ {done.length} Done</Badge>
        </div>
      </div>
      {doctors.map((doc) => {
        const docQ   = sortQueue(sorted.filter((p) => String(p.doctorId) === String(doc._id)));
        if (docQ.length === 0) return null;
        const activeQ = docQ.filter((p) => p.status !== 'done');
        const doneQ   = docQ.filter((p) => p.status === 'done');
        return (
          <div key={doc._id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 16px', background: 'var(--primary-light)', borderRadius: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18 }}>👨‍⚕️</span><span style={{ fontWeight: 700, fontSize: 15 }}>{doc.name}</span><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>— {doc.specialist}</span><Badge color="blue">{docQ.length} patients</Badge>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {activeQ.map((p) => <QueueCard key={p._id} patient={p} onUpdateStatus={onUpdateStatus} onUpdateFollowUp={onUpdateFollowUp} onUploadFile={onUploadFile} onGetFiles={onGetFiles} onDownloadFile={onDownloadFile} onDeleteFile={onDeleteFile} clinicName={clinicName} />)}
              {activeQ.length > 0 && doneQ.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /><span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Completed</span><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>}
              {doneQ.map((p) => <QueueCard key={p._id} patient={p} onUpdateStatus={onUpdateStatus} onUpdateFollowUp={onUpdateFollowUp} onUploadFile={onUploadFile} onGetFiles={onGetFiles} onDownloadFile={onDownloadFile} onDeleteFile={onDeleteFile} clinicName={clinicName} />)}
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && <Empty icon="🪑" title="Queue is empty" desc="No patients registered today. Go to 'Register Patient' to add one." />}
    </div>
  );
}

function QueueCard({ patient: p, onUpdateStatus, onUpdateFollowUp, onUploadFile, onGetFiles, onDownloadFile, onDeleteFile, clinicName }) {
  const pid = p._id || p.id;
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showFiles,    setShowFiles]    = useState(false);
  const [files,        setFiles]        = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const statusBg = { waiting: 'var(--surface)', called: '#fffbeb', done: 'var(--surface2)' };
  const days = daysUntil(p.followUpDate);
  useEffect(() => { if (showFiles && files.length === 0 && !loadingFiles) loadFiles(); }, [showFiles]);
  async function loadFiles() {
    setLoadingFiles(true);
    try { const result = await onGetFiles(pid); setFiles(Array.isArray(result) ? result : (result?.files || [])); }
    catch (err) { setFiles([]); }
    finally { setLoadingFiles(false); }
  }
  async function handleUploadFile(patientId, file) { await onUploadFile(patientId, file); const result = await onGetFiles(pid); setFiles(Array.isArray(result) ? result : (result?.files || [])); }
  async function handleDeleteFile(patientId, fileId) { await onDeleteFile(patientId, fileId); const result = await onGetFiles(pid); setFiles(Array.isArray(result) ? result : (result?.files || [])); }
  async function handleDownloadFile(patientId, fileId) { if (!fileId || fileId === patientId) throw new Error('Invalid file ID'); return onDownloadFile(patientId, fileId); }

  return (
    <div style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ background: statusBg[p.status], padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <TokenBadge token={p.token} size="md" status={p.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, textDecoration: p.status === 'done' ? 'line-through' : 'none', color: p.status === 'done' ? 'var(--text-muted)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.symptoms?.substring(0, 50)}{p.symptoms?.length > 50 ? '…' : ''}</div>
          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>🕐 {p.time}</span><PaymentBadge method={p.paymentMethod} />
            {p.phone  && <span style={{ color: 'var(--text-muted)' }}>📞 {p.phone}</span>}
            {p.dues > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ Due: Rs.{p.dues}</span>}
            {p.isReturnVisit && <span style={{ fontSize: 10, background: 'rgba(0,184,148,0.1)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>🔄 Return</span>}
            {p.followUpDate && days !== null && <span style={{ color: followUpBadgeStyle(days).color, fontWeight: 600 }}>📅 {p.followUpDate} ({followUpBadgeStyle(days).label})</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          {p.dues > 0 && <Badge color="red">Due: Rs.{p.dues}</Badge>}
          <Badge color={p.status === 'called' ? 'yellow' : p.status === 'done' ? 'gray' : 'blue'}>{p.status === 'waiting' ? '⏳ Waiting' : p.status === 'called' ? '📢 Called' : '✓ Done'}</Badge>
          {p.status === 'waiting' && <Btn size="sm" variant="warning" onClick={() => onUpdateStatus(pid, 'called')}>Call</Btn>}
          {p.status === 'called'  && <Btn size="sm" variant="accent"  onClick={() => onUpdateStatus(pid, 'done')}>Done</Btn>}
          <RxPdfButton patientId={pid} clinicName={clinicName} />
          <button onClick={() => setShowFollowUp((v) => !v)} title="Set follow-up date" style={{ background: p.followUpDate ? 'rgba(124,58,237,0.10)' : 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: '#7c3aed' }}>📅</button>
          <button onClick={() => setShowFiles((v) => !v)} title="Manage patient files" style={{ background: showFiles ? 'rgba(52,152,219,0.15)' : 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: showFiles ? '#3498db' : 'var(--text-light)' }}>📎 {files.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>({files.length})</span>}</button>
        </div>
      </div>
      {showFollowUp && <FollowUpInlineEditor patient={p} onSave={async (date, note) => { await onUpdateFollowUp(pid, date, note); setShowFollowUp(false); }} onCancel={() => setShowFollowUp(false)} />}
      {showFiles && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'rgba(52,152,219,0.02)' }}>
          {loadingFiles ? <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>⏳ Loading files…</div>
            : <FileUploadSection patientId={pid} files={files} onUpload={handleUploadFile} onDelete={handleDeleteFile} onDownload={handleDownloadFile} disabled={loadingFiles} />}
        </div>
      )}
    </div>
  );
}

function FollowUpInlineEditor({ patient: p, onSave, onCancel }) {
  const [date, setDate] = useState(p.followUpDate || '');
  const [note, setNote] = useState(p.followUpNote || '');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const editorRef = useRef(null);
  function handleEnter(e) {
    if (e.key !== "Enter") return;
  
    e.preventDefault();
  
    const fields = Array.from(
      editorRef.current.querySelectorAll(
        "input, textarea, button"
      )
    ).filter(
      el => !el.disabled && el.offsetParent !== null
    );
  
    const index = fields.indexOf(e.target);
  
    if (index > -1 && fields[index + 1]) {
      fields[index + 1].focus();
    } else {
      save();
    }
  }
  async function save() { setBusy(true); setErr(''); try { await onSave(date, note); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  return (
    <div ref={editorRef} style={{ padding: '12px 16px 14px', background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(124,58,237,0.12)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>📅 Set Follow-up Date</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Date</div>
          <input onKeyDown={handleEnter} type="date" value={date} onChange={(e) => setDate(e.target.value)} min={getTodayIST()} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #c5d5e8', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0a3d62', fontWeight: 600 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Note (optional)</div>
          <input onKeyDown={handleEnter} type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Check blood pressure" style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #c5d5e8', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={save} disabled={busy || !date} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy || !date ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !date ? 0.6 : 1 }}>{busy ? '…' : '✓ Save'}</button>
        {p.followUpDate && <button onClick={() => onSave('', '')} disabled={busy} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑 Clear</button>}
        <button onClick={onCancel} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
      </div>
      {err && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function FollowUpsTab({ patients, onUpdateFollowUp }) {
  const [editingId, setEditingId] = useState(null);
  const upcoming = patients.filter((p) => p.followUpDate).map((p) => ({ ...p, _days: daysUntil(p.followUpDate) })).sort((a, b) => a._days - b._days);
  const urgent = upcoming.filter((p) => p._days <= 3);
  const rest   = upcoming.filter((p) => p._days > 3);
  function renderRow(p) {
    const style = followUpBadgeStyle(p._days); const pid = p._id || p.id;
    return (
      <div key={pid}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--border)', background: p._days <= 3 ? style.bg : '#fff', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dr. {p.doctorName} · {p.symptoms?.substring(0, 40)}</div>
            {p.followUpNote && <div style={{ fontSize: 11.5, color: '#7c3aed', marginTop: 2 }}>📝 {p.followUpNote}</div>}
            {p.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📞 {p.phone}</div>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: style.color }}>{p.followUpDate}</div>
            <div style={{ fontSize: 11, color: style.color, fontWeight: 600, marginTop: 1 }}>{style.label}</div>
          </div>
          <button onClick={() => setEditingId(editingId === pid ? null : pid)} style={{ background: 'none', border: '1px solid #c5d5e8', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: '#7c3aed' }}>✏️</button>
        </div>
        {editingId === pid && <FollowUpInlineEditor patient={p} onSave={async (date, note) => { await onUpdateFollowUp(pid, date, note); setEditingId(null); }} onCancel={() => setEditingId(null)} />}
      </div>
    );
  }
  return (
    <div>
      <SectionHeader title="Follow-up Dates" subtitle="All patients with scheduled follow-ups" />
      {upcoming.length === 0 ? (
        <div style={{ background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No follow-up dates set yet</div>
          <div style={{ fontSize: 13 }}>Use the 📅 button on any patient in Today's Queue to set a follow-up date.</div>
        </div>
      ) : (
        <div style={{ border: '1.5px solid rgba(124,58,237,0.2)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>📅</span><span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>All Follow-up Appointments</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              {urgent.length > 0 && <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>🔴 {urgent.length} urgent</span>}
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{upcoming.length} total</span>
            </div>
          </div>
          {urgent.length > 0 && <><div style={{ padding: '7px 14px', background: 'rgba(231,76,60,0.07)', borderBottom: '1px solid rgba(231,76,60,0.15)', fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 0.4 }}>⚠️ Needs attention soon</div>{urgent.map(renderRow)}</>}
          {rest.length > 0 && <><div style={{ padding: '7px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>📆 Upcoming</div>{rest.map(renderRow)}</>}
        </div>
      )}
    </div>
  );
}