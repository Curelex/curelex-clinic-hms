// hms-react/src/components/PrintDischargeForm.jsx
import React from 'react';

export default function PrintDischargeForm({ admission, onClose }) {
  if (!admission) return null;

  const p = admission.patient || {};
  const doc = admission.doctor || {};
  const medHist = admission.medicalHistory || {};

  const handlePrint = () => {
    window.print();
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '____ / ____ / ________');
  const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '____________');

  // Compute total medicines cost if any
  const medTotal = admission.medicineLog?.reduce((s, m) => s + (m.total || 0), 0) || 0;
  
  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-discharge-form, #printable-discharge-form * { visibility: visible; }
          #printable-discharge-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 900,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Header */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            background: '#1e293b',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            🖨️ Patient Discharge Form — Printable View
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '6px 16px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Print Discharge Form
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#475569',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Form Sheet Container */}
        <div style={{ overflowY: 'auto', padding: 24, background: '#f8fafc', flex: 1 }}>
          <div
            id="printable-discharge-form"
            style={{
              background: '#ffffff',
              padding: '28px 36px',
              border: '2px solid #0f172a',
              color: '#000',
              fontFamily: "'Inter', sans-serif, Arial",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {/* Form Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 0.5, color: '#0f172a' }}>
                CURELEX HOSPITAL MANAGEMENT SYSTEM (HMS)
              </h2>
              <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline' }}>
                DISCHARGE SUMMARY
              </h3>
            </div>

            {/* Meta Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '8px 12px', border: '1px solid #000', marginBottom: 14, background: '#f8fafc' }}>
              <div><strong>Admission No.:</strong> {admission.admissionId || '________________'}</div>
              <div><strong>UHID (Patient ID):</strong> {p.patientId || '________________'}</div>
              <div><strong>Admit Date:</strong> {fmtDate(admission.admissionDate)}</div>
              <div><strong>Discharge Date:</strong> {fmtDate(admission.dischargeDate || new Date())}</div>
            </div>

            {/* 1. PATIENT INFORMATION */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                1. PATIENT DETAILS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div><strong>Patient Name:</strong> {p.name || '________________'}</div>
                <div><strong>Age / Gender:</strong> {p.age ? `${p.age}y` : '___'} / {p.gender || '___'}</div>
                <div><strong>Blood Group:</strong> {p.bloodGroup || '__________'}</div>
                <div><strong>Consulting Doctor:</strong> Dr. {doc.name || '________________'}</div>
                <div><strong>Department:</strong> {admission.department || 'General Medicine'}</div>
                <div><strong>Room Type:</strong> {admission.roomType || '________________'}</div>
              </div>
            </div>

            {/* 2. DISCHARGE DETAILS */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                2. DISCHARGE DETAILS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                <div><strong>Discharge Type:</strong> {admission.dischargeType || 'Regular'}</div>
                <div><strong>Patient Condition at Discharge:</strong> {admission.patientCondition || 'Stable'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Reason for Discharge:</strong> {admission.dischargeReason || admission.reason || '________________________________________________'}</div>
              </div>
            </div>
            
            {/* 3. DIAGNOSIS & HISTORY */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                3. DIAGNOSIS & MEDICAL HISTORY
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Chief Complaint:</strong> {admission.chiefComplaint || '________________________________________________'}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Provisional Diagnosis:</strong> {admission.clinicalAssessment?.provisionalDiagnosis || '________________________________________________'}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Existing Conditions:</strong> {medHist.conditions?.join(', ') || 'None'}
              </div>
              <div>
                <strong>Allergies:</strong> {medHist.allergies?.join(', ') || 'None'} {medHist.allergyDetails ? `(${medHist.allergyDetails})` : ''}
              </div>
            </div>

            {/* 4. FOLLOW-UP & INSTRUCTIONS */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                4. FOLLOW-UP INSTRUCTIONS
              </div>
              <div style={{ minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                {admission.followUpInstructions || 'No specific follow-up instructions provided.'}
              </div>
              {admission.dischargeNotes && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #ccc' }}>
                  <strong>Additional Notes:</strong><br/>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{admission.dischargeNotes}</span>
                </div>
              )}
            </div>
            
            {/* 5. MEDICATION LOG SUMMARY */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                5. MEDICATIONS DURING STAY
              </div>
              {admission.medicineLog && admission.medicineLog.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, border: '1px solid #000' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                      <th style={{ border: '1px solid #000', padding: 4, textAlign: 'left' }}>Medicine</th>
                      <th style={{ border: '1px solid #000', padding: 4, textAlign: 'left' }}>Dosage</th>
                      <th style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>Qty</th>
                      <th style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admission.medicineLog.map((m, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{m.medicineName}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{m.dosage || '-'}</td>
                        <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>{m.quantity}</td>
                        <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>₹{(m.total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>Total Medicine Cost:</td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>₹{medTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div>No medications recorded during stay.</div>
              )}
            </div>

            {/* 6. BILLING & SETTLEMENT */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                6. BILLING & SETTLEMENT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div><strong>Total Days Admitted:</strong> {admission.daysAdmitted || 0}</div>
                <div><strong>Room Rent Total:</strong> ₹{(admission.roomRent || 0).toLocaleString()}</div>
                <div><strong>Bill Settlement Status:</strong> {admission.billSettlement || 'Pending'}</div>
              </div>
            </div>

            {/* SIGNATURES */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40, paddingTop: 10 }}>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: 4, paddingBottom: 2 }}>
                  {p.name || '___________________________'}
                </div>
                <div><strong>Patient / Guardian Signature</strong></div>
              </div>

              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: 4, paddingBottom: 2 }}>
                  Dr. {doc.name || '___________________________'}
                </div>
                <div><strong>Consulting Doctor</strong></div>
              </div>
              
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderBottom: '1px solid #000', marginBottom: 4, paddingBottom: 2 }}>
                  ___________________________
                </div>
                <div><strong>Authorized Signatory</strong></div>
                <div style={{ fontSize: 10, color: '#475569' }}>CURELEX HMS Official Seal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
