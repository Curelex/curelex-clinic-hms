// frontend/src/clinic/components/PrescriptionModal.jsx
// ── Complete prescription writing UI ──────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';

const BASE = import.meta.env.VITE_CLINIC_API_URL || '/api/clinic';

// ── Frequency options ─────────────────────────────────────────────────────────
const FREQ_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'At bedtime',
  'As needed (SOS)', 'Before meals', 'After meals', 'With meals',
  'Every other day', 'Weekly',
];

const DURATION_OPTIONS = [
  '1 day', '2 days', '3 days', '5 days', '7 days', '10 days',
  '14 days', '1 month', '2 months', '3 months', 'Ongoing / Long-term',
];

const DOSAGE_OPTIONS = [
  '½ tablet', '1 tablet', '2 tablets', '1 capsule', '2 capsules',
  '5 ml', '10 ml', '15 ml', '1 sachet', '2 drops', '4 drops',
  '1 injection', '1 puff', '2 puffs',
];

// ── Autocomplete input ────────────────────────────────────────────────────────
const AutocompleteInput = React.forwardRef(
  (
    {
      value,
      onChange,
      suggestions = [],
      placeholder,
      style = {},
      onKeyDown
    },
    ref
  ) => {
  const [open,     setOpen]     = useState(false);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) { setFiltered([]); setOpen(false); return; }
    const matches = suggestions
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 8);
    setFiltered(matches);
    setOpen(matches.length > 0);
  }, [value, suggestions]);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          const q = (value || '').trim().toLowerCase();
          if (q && filtered.length > 0) setOpen(true);
        }}

        placeholder={placeholder}
        style={{
          width: '100%', padding: '7px 10px',
          border: '1.5px solid #d0dce8', borderRadius: 8,
          fontSize: 13, fontFamily: 'inherit', outline: 'none',
          boxSizing: 'border-box', color: '#0a3d62',
          transition: 'border-color .15s',
        }}
        onKeyDown={(e) => {
    if (e.key === 'Escape') setOpen(false);

    onKeyDown?.(e);
  }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: '#fff', border: '1.5px solid #7c3aed',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 200, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map((s) => (
            <div
              key={s}
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                borderBottom: '1px solid #f0f4f8', color: '#0a3d62',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(124,58,237,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}
            >
              💊 {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
})

// ── Medicine row ──────────────────────────────────────────────────────────────
function MedicineRow({ med, idx, suggestions, onChange, onRemove ,handleEnterKey ,inputRef}) {
  const f = (k, v) => onChange(idx, { ...med, [k]: v });
  return (
    <div style={{
      background: 'rgba(124,58,237,0.04)',
      border: '1.5px solid rgba(124,58,237,0.15)',
      borderRadius: 10, padding: '12px 14px', marginBottom: 10,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>💊 Medicine #{idx + 1}</span>
        <button
          onClick={() => onRemove(idx)}
          style={{
            background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.25)',
            borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
            fontSize: 11, color: '#e74c3c', fontWeight: 700, fontFamily: 'inherit',
          }}
        >✕ Remove</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>
          Medicine Name *
        </label>
        <AutocompleteInput
          ref={inputRef}
          value={med.name}
          onChange={(v) => f('name', v)}
          suggestions={suggestions}
          placeholder="e.g. Paracetamol 500mg"
          onKeyDown={handleEnterKey}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>Dosage</label>
          <select
            value={med.dosage}
            onChange={(e) => f('dosage', e.target.value)}
            onKeyDown={handleEnterKey}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d0dce8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#0a3d62' }}
          >
            <option value="">Select dosage…</option>
            {DOSAGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>Frequency</label>
          <select
            value={med.frequency}
            onChange={(e) => f('frequency', e.target.value)}
            onKeyDown={handleEnterKey}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d0dce8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#0a3d62' }}
          >
            <option value="">Select frequency…</option>
            {FREQ_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>Duration</label>
          <select
            value={med.duration}
            onChange={(e) => f('duration', e.target.value)}
            onKeyDown={handleEnterKey}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d0dce8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#0a3d62' }}
          >
            <option value="">Select duration…</option>
            {DURATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>Special Instructions</label>
          <input
            type="text"
            value={med.instructions}
            onChange={(e) => f('instructions', e.target.value)}
            onKeyDown={handleEnterKey}
            placeholder="e.g. After meals, with water"
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d0dce8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#0a3d62' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Test row ──────────────────────────────────────────────────────────────────
function TestRow({ test, idx, suggestions, onChange, onRemove,handleEnterKey, inputRef}) {
  const f = (k, v) => onChange(idx, { ...test, [k]: v });
  return (
    <div style={{
      background: 'rgba(52,152,219,0.04)',
      border: '1.5px solid rgba(52,152,219,0.2)',
      borderRadius: 10, padding: '12px 14px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3498db' }}>🔬 Test #{idx + 1}</span>
        <button
          onClick={() => onRemove(idx)}
          style={{ background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.25)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#e74c3c', fontWeight: 700, fontFamily: 'inherit' }}
        >✕ Remove</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>Test Name *</label>
          <AutocompleteInput
          ref={inputRef}
            value={test.name}
            onChange={(v) => f('name', v)}
            suggestions={suggestions}
            placeholder="e.g. CBC, LFT, Urine R/E"
            onKeyDown={handleEnterKey}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>Instructions</label>
          <input
            type="text"
            value={test.instructions}
            onChange={(e) => f('instructions', e.target.value)}
            onKeyDown={handleEnterKey}
            placeholder="e.g. Fasting, Morning sample"
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #d0dce8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#0a3d62' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── PDF Generator ─────────────────────────────────────────────────────────────
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
        </tr>
      `).join('');

  const testsHTML = (tests || []).length === 0
    ? ''
    : `
      <div style="margin-top:20px">
        <h3 style="font-size:14px;color:#3498db;border-bottom:2px solid #3498db;padding-bottom:6px;margin-bottom:10px">🔬 Investigations / Tests</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f0f8ff">
              <th style="padding:8px 10px;text-align:left;width:40px">#</th>
              <th style="padding:8px 10px;text-align:left">Test Name</th>
              <th style="padding:8px 10px;text-align:left">Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${(tests || []).map((t, i) => `
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:8px 10px">${i + 1}</td>
                <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${t.name || ''}</td>
                <td style="padding:8px 10px">${t.instructions || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prescription - ${patientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #fff; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: A4; }
    }
    .page { max-width: 780px; margin: 0 auto; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #7c3aed; margin-bottom: 18px; }
    .clinic-info h1 { font-size: 22px; color: #7c3aed; font-weight: 800; }
    .clinic-info p { font-size: 12px; color: #888; margin-top: 2px; }
    .rx-symbol { font-size: 60px; color: #7c3aed; font-weight: 900; line-height: 1; opacity: 0.15; }
    .doctor-info { text-align: right; }
    .doctor-info h2 { font-size: 16px; color: #0a3d62; font-weight: 700; }
    .doctor-info p { font-size: 12px; color: #888; }
    .patient-bar { background: linear-gradient(135deg, #f8f5ff, #f0f8ff); border: 1px solid #e8e0ff; border-radius: 10px; padding: 14px 18px; margin-bottom: 18px; display: flex; gap: 24px; flex-wrap: wrap; }
    .patient-field label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
    .patient-field span { font-size: 14px; font-weight: 700; color: #0a3d62; }
    .section-title { font-size: 14px; color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 6px; margin-bottom: 10px; font-weight: 700; }
    .diagnosis-box { background: #fafafa; border-left: 4px solid #7c3aed; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 18px; font-size: 14px; color: #0a3d62; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #f8f5ff; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; color: #7c3aed; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .notes-box { background: #fffbf0; border: 1px solid #ffe082; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 13px; }
    .followup-box { background: #f0fff4; border: 1px solid #a8e6cf; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #aaa; }
    .signature-line { border-top: 1px solid #aaa; padding-top: 4px; text-align: center; width: 160px; font-size: 11px; color: #555; }
    .token-badge { background: #7c3aed; color: #fff; border-radius: 8px; padding: 4px 12px; font-size: 13px; font-weight: 700; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #7c3aed; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(124,58,237,0.4); z-index: 1000; }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
  <div class="page">
    <div class="header">
      <div class="clinic-info">
        <h1>${clinicName || 'ClinicFlow'}</h1>
        <p>Medical Prescription</p>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="doctor-info">
          <h2>Dr. ${doctorName || ''}</h2>
          <p>${doctorSpecialist || 'Doctor'}</p>
        </div>
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
      <table>
        <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration / Instructions</th></tr></thead>
        <tbody>${medsHTML}</tbody>
      </table>
    </div>
    ${testsHTML}
    ${notes ? `<div class="notes-box"><strong>📝 Advice / Notes:</strong><br><span style="margin-top:4px;display:block">${notes}</span></div>` : ''}
    ${followUpDate ? `<div class="followup-box"><span style="font-size:18px">📅</span><div><strong>Follow-up Date:</strong> ${followUpDate}</div></div>` : ''}
    <div class="footer">
      <div>
        <div>Generated by ClinicFlow · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        <div style="margin-top:2px">This prescription is computer generated.</div>
      </div>
      <div class="signature-line">Dr. ${doctorName || ''}<br>Signature</div>
    </div>
  </div>
</body>
</html>`;
}

// ── Main Modal Component ──────────────────────────────────────────────────────
export default function PrescriptionModal({ patient, doctorUser, clinicName, onClose, token: authToken, onSaved }) {
  const [medicines,    setMedicines]    = useState([]);
  const [tests,        setTests]        = useState([]);
  const [diagnosis,    setDiagnosis]    = useState('');
  const [notes,        setNotes]        = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [busy,         setBusy]         = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [savedRx,      setSavedRx]      = useState(null);
  const [error,        setError]        = useState('');

  const [medSuggestions,  setMedSuggestions]  = useState([]);
  const [testSuggestions, setTestSuggestions] = useState([]);
  const [loadingAC,       setLoadingAC]       = useState(false);

  // ✅ FIX: useRef guard prevents duplicate API calls even if React re-renders mid-save
  const savingRef = useRef(false);
  const saveBtnRef = useRef(null);
  const firstMedicineRef = useRef(null);
  const firstTestRef = useRef(null);

  const patientId = patient?._id || patient?.id;

  useEffect(() => {
    loadData();
  }, [patientId]);

  async function loadData() {
    setLoadingAC(true);
    try {
      const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

      const acRes = await fetch(`${BASE}/prescriptions/autocomplete`, { headers });
      if (acRes.ok) {
        const acData = await acRes.json();
        setMedSuggestions(acData.medicines || []);
        setTestSuggestions(acData.tests     || []);
      }

      const rxRes = await fetch(`${BASE}/prescriptions/patient/${patientId}`, { headers });
      if (rxRes.ok) {
        const rxData = await rxRes.json();
        if (rxData.prescriptions && rxData.prescriptions.length > 0) {
          const existing = rxData.prescriptions[0];
          setSavedRx(existing);
          setMedicines(existing.medicines    || []);
          setTests(existing.tests            || []);
          setDiagnosis(existing.diagnosis    || '');
          setNotes(existing.notes            || '');
          setFollowUpDate(existing.followUpDate || '');
          setSaved(true);
          onSaved?.();
        }
      }
    } catch (e) {
      console.error('Failed to load prescription data:', e);
    } finally {
      setLoadingAC(false);
    }
  }

  const addMedicine    = () => setMedicines((p) => [...p, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const removeMedicine = (i) => setMedicines((p) => p.filter((_, idx) => idx !== i));
  const updateMedicine = (i, med) => setMedicines((p) => p.map((m, idx) => idx === i ? med : m));

  const addTest = () => {
    setTests((p) => [...p, { name: '', instructions: '' }]);
  
    setTimeout(() => {
      firstTestRef.current?.focus();
    }, 100);
  };
  const removeTest = (i) => setTests((p) => p.filter((_, idx) => idx !== i));
  const updateTest = (i, t) => setTests((p) => p.map((m, idx) => idx === i ? t : m));

  async function handleSave() {
    // ✅ FIX: double-click / re-render guard using ref (more reliable than state alone)
    if (savingRef.current) return;

    const validMeds  = medicines.filter((m) => m.name?.trim());
    const validTests = tests.filter((t) => t.name?.trim());

    if (!diagnosis.trim() && validMeds.length === 0 && validTests.length === 0) {
      setError('Please add at least a diagnosis, a medicine, or a test.');
      return;
    }

    savingRef.current = true;  // ✅ lock immediately (before any await)
    setBusy(true);
    setError('');

    try {
      const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };
      const payload = { patientId, diagnosis, medicines: validMeds, tests: validTests, notes, followUpDate };

      let res;
      if (savedRx?._id) {
        res = await fetch(`${BASE}/prescriptions/${savedRx._id}`, {
          method: 'PUT', headers, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${BASE}/prescriptions`, {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save prescription');

      setSavedRx(data.prescription);
      setSaved(true);
      onSaved?.();

      const acRes = await fetch(`${BASE}/prescriptions/autocomplete`, { headers });
      if (acRes.ok) {
        const acData = await acRes.json();
        setMedSuggestions(acData.medicines || []);
        setTestSuggestions(acData.tests     || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      savingRef.current = false;  // ✅ unlock after done
    }
  }

  function handlePDF() {
    const rxData = savedRx || {
      patientName:      patient?.name       || '',
      patientAge:       patient?.age        || '',
      patientGender:    patient?.gender     || '',
      patientPhone:     patient?.phone      || '',
      doctorName:       doctorUser?.name    || '',
      doctorSpecialist: doctorUser?.specialist || '',
      tokenNumber:      patient?.token      || '',
      date:             patient?.date       || '',
      diagnosis, medicines, tests, notes, followUpDate,
    };
    const html = generatePrescriptionHTML(rxData, clinicName || '');
    const win  = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Prescription_${patient?.name || 'Patient'}_${patient?.date || ''}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  const today = (() => {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().split('T')[0];
  })();

  function handleEnterKey(e) {
    if (e.key !== "Enter") return;
    if (
      e.target.placeholder?.includes("Acute Pharyngitis")
    ) {
      e.preventDefault();
    
      if (medicines.length === 0) {
        addMedicine();
    
        setTimeout(() => {
          firstMedicineRef.current?.focus();
        }, 100);
      } else {
        firstMedicineRef.current?.focus();
      }
    
      return;
    }
    if (
      e.target.tagName === "TEXTAREA" &&
      e.key === "Enter"
    ) {
      e.preventDefault();
    } else {
      e.preventDefault();
    }
  
    const modal = e.currentTarget.closest('[data-rx-modal]');
  
    const focusable = Array.from(
      modal.querySelectorAll(
         'input, textarea, select, button:not([data-skip-enter])'
      )
    ).filter(
      el => !el.disabled && el.offsetParent !== null
    );
  
    const index = focusable.indexOf(e.target);
  
    if (index < focusable.length - 1) {
      focusable[index + 1].focus();
    } else {
      handleSave();
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 1000, backdropFilter: 'blur(3px)',
        }}
      />

      <div style={{
        position: 'fixed', inset: '0', zIndex: 1001,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '20px 16px', overflowY: 'auto',
      }}>
        <div data-rx-modal style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 720,
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
          position: 'relative',
        }}>

          {/* ── Modal Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                📝 Write Prescription
                {saved && (
                  <span style={{ fontSize: 11, background: 'rgba(0,200,100,0.3)', border: '1px solid rgba(0,200,100,0.5)', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>
                    ✓ Saved
                  </span>
                )}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>🏷 Token #{patient?.token}</span>
                <span>👤 {patient?.name}</span>
                {patient?.age && <span>· {patient.age} yrs</span>}
                {patient?.gender && <span style={{ textTransform: 'capitalize' }}>· {patient.gender}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit' }}
            >✕</button>
          </div>

          {loadingAC && (
            <div style={{ padding: '12px 24px', background: 'rgba(124,58,237,0.06)', fontSize: 12, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⏳</span> Loading suggestions…
            </div>
          )}

          {patient?.symptoms && (
            <div style={{ padding: '10px 24px', background: 'rgba(52,152,219,0.06)', borderBottom: '1px solid rgba(52,152,219,0.15)', fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: '#3498db' }}>🩺 Chief Complaint: </span>
              <span style={{ color: '#0a3d62' }}>{patient.symptoms}</span>
            </div>
          )}

          {/* ── Body ── */}
          <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#0a3d62', display: 'block', marginBottom: 6 }}>
                📋 Diagnosis / Assessment
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                onKeyDown={handleEnterKey}
                placeholder="e.g. Acute Pharyngitis, UTI, Hypertension…"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d0dce8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#0a3d62' }}
              />
            </div>

            {/* Medicines */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}>
                  💊 Medicines
                  <span style={{ fontSize: 11, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 20, padding: '1px 8px' }}>{medicines.length}</span>
                </div>
                <button onClick={addMedicine} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #7c3aed', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  + Add Medicine
                </button>
              </div>
              {medicines.length === 0 ? (
                <div onClick={addMedicine} style={{ border: '2px dashed rgba(124,58,237,0.25)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', color: '#7c3aed', fontSize: 13, background: 'rgba(124,58,237,0.02)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>💊</div>
                  Click to add a medicine
                </div>
              ) : (
                medicines.map((med, i) => (
                  <MedicineRow key={i} med={med} idx={i} suggestions={medSuggestions} onChange={updateMedicine} onRemove={removeMedicine} handleEnterKey={handleEnterKey} 
                  inputRef={i === 0 ? firstMedicineRef : null}/>
                ))
              )}
            </div>

            {/* Tests */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#3498db', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🔬 Investigations / Tests
                  <span style={{ fontSize: 11, background: 'rgba(52,152,219,0.1)', color: '#3498db', borderRadius: 20, padding: '1px 8px' }}>{tests.length}</span>
                </div>
                <button onClick={addTest} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #3498db', background: 'rgba(52,152,219,0.08)', color: '#3498db', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Add Test
                </button>
              </div>
              {tests.length === 0 ? (
                <div onClick={addTest} style={{ border: '2px dashed rgba(52,152,219,0.25)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', color: '#3498db', fontSize: 13, background: 'rgba(52,152,219,0.02)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🔬</div>
                  Click to add a test / investigation
                </div>
              ) : (
                tests.map((test, i) => (
                  <TestRow key={i} test={test} idx={i} suggestions={testSuggestions} onChange={updateTest} onRemove={removeTest} handleEnterKey={handleEnterKey} inputRef={i === 0 ? firstTestRef : null}/>
                ))
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#0a3d62', display: 'block', marginBottom: 6 }}>
                📝 Advice / General Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={handleEnterKey}
                placeholder="e.g. Drink plenty of water, Rest for 2 days, Avoid spicy food…"
                rows={2}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #d0dce8', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#0a3d62' }}
              />
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#0a3d62', display: 'block', marginBottom: 6 }}>
                📅 Follow-up Date (optional)
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                    return;
                  }
                }}
                min={today}
                style={{ padding: '8px 12px', border: '1.5px solid #d0dce8', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0a3d62', fontWeight: 600 }}
              />
              {followUpDate && (
                <button
                tabIndex={-1}
                  data-skip-enter
                  onClick={() => setFollowUpDate('')}
                  style={{ marginLeft: 8, padding: '7px 10px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: '#e74c3c', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >🗑 Clear</button>
              )}
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 8, color: '#c0392b', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* ── Footer Actions ── */}
          <div style={{
            padding: '16px 24px',
            background: '#f8f5ff',
            borderTop: '1px solid rgba(124,58,237,0.15)',
            display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap',
          }}>
            <button
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>

            {saved && (
              <button
                onClick={handlePDF}
                style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid #3498db', background: 'rgba(52,152,219,0.08)', color: '#3498db', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                🖨️ View / Print PDF
              </button>
            )}

            <button
            ref={saveBtnRef}
              onClick={handleSave}
              disabled={busy}
              style={{
                padding: '9px 24px', borderRadius: 9, border: 'none',
                background: busy ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: busy ? 0.8 : 1,
              }}
            >
              {busy ? '⏳ Saving…' : saved ? '💾 Update Prescription' : '💾 Save Prescription'}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}