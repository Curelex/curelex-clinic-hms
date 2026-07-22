// hms-react/src/components/PrintAdmissionForm.jsx
import React from 'react';

export default function PrintAdmissionForm({ admission, onClose }) {
  if (!admission) return null;

  const p = admission.patient || {};
  const doc = admission.doctor || {};
  const cDetails = admission.contactDetails || {};
  const eContact = admission.emergencyContact || {};
  const medHist = admission.medicalHistory || {};
  const vitals = admission.vitals || {};
  const clinical = admission.clinicalAssessment || {};
  const docCheck = admission.documentChecklist || {};
  const consent = admission.consent || {};

  const handlePrint = () => {
    window.print();
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '____ / ____ / ________');
  const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '____________');

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
          #printable-admission-form, #printable-admission-form * { visibility: visible; }
          #printable-admission-form {
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
            🖨️ Patient Admission Form — Printable View
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
              Print Admission Form
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
            id="printable-admission-form"
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
                PATIENT ADMISSION FORM
              </h3>
            </div>

            {/* Admission Meta Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '8px 12px', border: '1px solid #000', marginBottom: 14, background: '#f8fafc' }}>
              <div><strong>Admission No.:</strong> {admission.admissionId || '________________'}</div>
              <div><strong>UHID (Patient ID):</strong> {p.patientId || '________________'}</div>
              <div><strong>Date:</strong> {fmtDate(admission.admissionDate)}</div>
              <div><strong>Time:</strong> {fmtTime(admission.admissionDate)}</div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>Admission Type:</strong>{' '}
              {['Emergency', 'OPD to IPD', 'Direct Admission', 'Day Care', 'ICU'].map((t) => (
                <span key={t} style={{ marginRight: 14 }}>
                  {admission.admissionType === t ? '☑' : '☐'} {t}
                </span>
              ))}
            </div>

            {/* 1. PATIENT INFORMATION */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                1. PATIENT INFORMATION
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div><strong>First Name:</strong> {p.firstName || p.name?.split(' ')[0] || '________________'}</div>
                <div><strong>Middle Name:</strong> {p.middleName || '________________'}</div>
                <div><strong>Last Name:</strong> {p.lastName || p.name?.split(' ').slice(1).join(' ') || '________________'}</div>
                <div><strong>Gender:</strong> {p.gender || '☐ Male ☐ Female ☐ Other'}</div>
                <div><strong>Date of Birth:</strong> {fmtDate(p.dob)}</div>
                <div><strong>Age:</strong> {p.age ? `${p.age} Years` : '______ Years'}</div>
                <div><strong>Blood Group:</strong> {p.bloodGroup || '__________'}</div>
                <div><strong>Marital Status:</strong> {p.maritalStatus || '☐ Single ☐ Married'}</div>
                <div><strong>Nationality:</strong> {p.nationality || 'Indian'}</div>
                <div><strong>Occupation:</strong> {p.occupation || '________________'}</div>
                <div><strong>Govt ID Type:</strong> {p.govtIdType || 'Aadhaar'}</div>
                <div><strong>ID Number:</strong> {p.govtIdNumber || '________________'}</div>
              </div>
            </div>

            {/* 2. CONTACT DETAILS */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                2. CONTACT DETAILS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
                <div><strong>Mobile Number:</strong> {p.phone || '________________'}</div>
                <div><strong>Alternate Mobile:</strong> {cDetails.alternatePhone || p.alternatePhone || '________________'}</div>
                <div><strong>Email Address:</strong> {cDetails.email || p.email || '________________'}</div>
              </div>
              <div>
                <strong>Residential Address:</strong> House/Flat No: {cDetails.houseNo || p.houseNo || '___'}, Street: {cDetails.street || p.street || '___'}, Landmark: {cDetails.landmark || p.landmark || '___'}, City: {cDetails.city || p.city || '___'}, District: {cDetails.district || p.district || '___'}, State: {cDetails.state || p.state || '___'}, Country: {cDetails.country || p.country || 'India'}, PIN Code: {cDetails.pincode || p.pincode || '___'}
              </div>
            </div>

            {/* 3. EMERGENCY CONTACT */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                3. EMERGENCY CONTACT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div><strong>Name:</strong> {eContact.name || p.emergencyName || '________________'}</div>
                <div><strong>Relationship:</strong> {eContact.relationship || p.emergencyRelation || '________________'}</div>
                <div><strong>Mobile Number:</strong> {eContact.phone || p.emergencyContact || '________________'}</div>
                <div><strong>Alternate Number:</strong> {eContact.alternatePhone || p.emergencyAltContact || '________________'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Address:</strong> {eContact.address || p.emergencyAddress || '________________'}</div>
              </div>
            </div>

            {/* 4. ADMISSION DETAILS */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                4. ADMISSION DETAILS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
                <div><strong>Department:</strong> {admission.department || 'General Medicine'}</div>
                <div><strong>Consulting Doctor:</strong> Dr. {doc.name || '________________'}</div>
                <div><strong>Referring Doctor/Hospital:</strong> {admission.referringDoctor || '________________'}</div>
                <div><strong>Ward / Room Type:</strong> {admission.roomType || 'General Ward'}</div>
                <div><strong>Room Number:</strong> {admission.roomNumber || '____'}</div>
                <div><strong>Bed Number:</strong> {admission.bedNumber || '____'}</div>
                <div><strong>Expected Length of Stay:</strong> {admission.expectedStay || '____ Days'}</div>
              </div>
              <div>
                <strong>Chief Complaint / Reason for Admission:</strong> {admission.chiefComplaint || '________________________________________________'}
              </div>
            </div>

            {/* 5. MEDICAL HISTORY */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                5. MEDICAL HISTORY
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Existing Medical Conditions:</strong>{' '}
                {['Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Kidney Disease', 'Liver Disease', 'Thyroid Disorder', 'Cancer', 'Tuberculosis', 'Epilepsy'].map((c) => (
                  <span key={c} style={{ marginRight: 10 }}>
                    {medHist.conditions?.includes(c) ? '☑' : '☐'} {c}
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                <div><strong>Previous Surgeries:</strong> {medHist.previousSurgeries || 'None'}</div>
                <div><strong>Allergies:</strong> {medHist.allergies?.join(', ') || 'None'} ({medHist.allergyDetails || ''})</div>
              </div>
              {medHist.currentMedications?.length > 0 && (
                <div>
                  <strong>Current Medications:</strong>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                        <th style={{ border: '1px solid #000', padding: 4, textAlign: 'left' }}>Medicine</th>
                        <th style={{ border: '1px solid #000', padding: 4, textAlign: 'left' }}>Dose</th>
                        <th style={{ border: '1px solid #000', padding: 4, textAlign: 'left' }}>Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medHist.currentMedications.map((m, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #000', padding: 4 }}>{m.medicine}</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>{m.dose}</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>{m.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 6. VITAL SIGNS */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                6. VITAL SIGNS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                <div><strong>Height:</strong> {vitals.height ? `${vitals.height} cm` : '______ cm'}</div>
                <div><strong>Weight:</strong> {vitals.weight ? `${vitals.weight} kg` : '______ kg'}</div>
                <div><strong>BMI:</strong> {vitals.bmi || '______'}</div>
                <div><strong>BP:</strong> {vitals.bp || '______ mmHg'}</div>
                <div><strong>Pulse:</strong> {vitals.pulse || '______ bpm'}</div>
                <div><strong>Temp:</strong> {vitals.temp ? `${vitals.temp} °F` : '______ °F'}</div>
                <div><strong>Resp Rate:</strong> {vitals.respRate || '______ /min'}</div>
                <div><strong>SpO₂:</strong> {vitals.spo2 ? `${vitals.spo2} %` : '______ %'}</div>
                <div><strong>Blood Sugar:</strong> {vitals.bloodSugar || '______ mg/dL'}</div>
                <div><strong>Pain Score:</strong> {vitals.painScore || '0'}/10</div>
              </div>
            </div>

            {/* 7. INITIAL CLINICAL ASSESSMENT & PAYMENT */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                7. INITIAL CLINICAL ASSESSMENT & PAYMENT MODE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                <div><strong>Present Illness:</strong> {clinical.presentIllness || '________________'}</div>
                <div><strong>Provisional Diagnosis:</strong> {clinical.provisionalDiagnosis || '________________'}</div>
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Doctor Notes:</strong> {clinical.doctorNotes || admission.notes || '________________'}
              </div>
              <div>
                <strong>Payment Mode:</strong>{' '}
                {['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Insurance'].map((m) => (
                  <span key={m} style={{ marginRight: 12 }}>
                    {admission.paymentMode === m ? '☑' : '☐'} {m}
                  </span>
                ))}
              </div>
            </div>

            {/* 10. DOCUMENT CHECKLIST */}
            <div style={{ border: '1px solid #000', padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                10. DOCUMENT CHECKLIST
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                <div>{docCheck.aadhaar ? '☑' : '☐'} Aadhaar Card</div>
                <div>{docCheck.prescriptions ? '☑' : '☐'} Prescriptions</div>
                <div>{docCheck.medicalReports ? '☑' : '☐'} Medical Reports</div>
                <div>{docCheck.labReports ? '☑' : '☐'} Lab Reports</div>
                <div>{docCheck.xray ? '☑' : '☐'} X-Ray</div>
                <div>{docCheck.ctScan ? '☑' : '☐'} CT Scan</div>
                <div>{docCheck.mri ? '☑' : '☐'} MRI</div>
                <div>{docCheck.ecg ? '☑' : '☐'} ECG</div>
              </div>
            </div>

            {/* 11. CONSENT DECLARATION & SIGNATURES */}
            <div style={{ border: '1px solid #000', padding: 10 }}>
              <div style={{ fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase' }}>
                11. CONSENT DECLARATION
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 10.5, lineHeight: 1.4 }}>
                I hereby declare that the information provided by me is true and complete to the best of my knowledge. I authorize the hospital, its doctors, nurses, and authorized staff to provide necessary medical treatment. I understand the hospital's policies regarding treatment, billing, privacy, and discharge procedures.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, paddingTop: 10 }}>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderBottom: '1px solid #000', marginBottom: 4, paddingBottom: 2 }}>
                    {consent.signedBy || p.name || '___________________________'}
                  </div>
                  <div><strong>Patient / Guardian Signature</strong></div>
                  <div style={{ fontSize: 10, color: '#475569' }}>Relationship: {consent.relationship || 'Self'}</div>
                </div>

                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderBottom: '1px solid #000', marginBottom: 4, paddingBottom: 2 }}>
                    Dr. {doc.name || '___________________________'}
                  </div>
                  <div><strong>Consulting Doctor / Authorized Officer</strong></div>
                  <div style={{ fontSize: 10, color: '#475569' }}>CURELEX HMS Official Seal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
