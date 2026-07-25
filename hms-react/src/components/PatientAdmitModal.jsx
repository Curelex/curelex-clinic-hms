// hms-react/src/components/PatientAdmitModal.jsx
import React, { useState, useEffect } from 'react';
import API from '../utils/api';

export default function PatientAdmitModal({
  isOpen,
  onClose,
  onSuccess,
  clinicId,
  roomConfigs = [],
  doctors = [],
}) {
  const [activeStep, setActiveStep] = useState(1);
  const [quickAdmit, setQuickAdmit] = useState(false);

  // Patient search state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [chosenPatient, setChosenPatient] = useState(null);
  const [searchTimer, setSearchTimer] = useState(null);
  const [saving, setSaving] = useState(false);

  // 11-Section Form State
  const [form, setForm] = useState({
    // Basic Admission Meta
    admissionType: 'Direct Admission',
    department: 'General Medicine',
    doctorId: '',
    referringDoctor: '',
    roomType: 'General Ward',
    roomNumber: '',
    bedNumber: '',
    expectedStay: '',
    chiefComplaint: '',

    // Patient Info (Demographics)
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dob: '',
    age: '',
    bloodGroup: '',
    maritalStatus: '',
    nationality: 'Indian',
    occupation: '',
    govtIdType: 'Aadhaar',
    govtIdNumber: '',
    photo: '',

    // Contact Details
    phone: '',
    alternatePhone: '',
    email: '',
    houseNo: '',
    street: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pincode: '',

    // Emergency Contact
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    emergencyAltPhone: '',
    emergencyAddress: '',

    // Medical History & Allergies
    medicalConditions: {
      Diabetes: false,
      Hypertension: false,
      HeartDisease: false,
      Asthma: false,
      KidneyDisease: false,
      LiverDisease: false,
      ThyroidDisorder: false,
      Cancer: false,
      Tuberculosis: false,
      Epilepsy: false,
    },
    otherConditions: '',
    previousSurgeries: '',
    allergies: {
      Medicines: false,
      Food: false,
      Latex: false,
      Other: false,
    },
    allergyDetails: '',
    currentMedications: [
      { medicine: '', dose: '', frequency: '' },
    ],

    // Vital Signs
    height: '',
    weight: '',
    bmi: '',
    bp: '',
    pulse: '',
    temp: '',
    respRate: '',
    spo2: '',
    bloodSugar: '',
    painScore: '0',

    // Initial Clinical Assessment
    presentIllness: '',
    provisionalDiagnosis: '',
    doctorNotes: '',

    // Payment Mode
    paymentMode: 'Cash',

    // Document Checklist
    documentChecklist: {
      aadhaar: false,
      prescriptions: false,
      medicalReports: false,
      labReports: false,
      xray: false,
      ctScan: false,
      mri: false,
      ecg: false,
      otherDetails: '',
    },

    // Consent
    consentAgreed: false,
    consentSignedBy: '',
    consentRelationship: '',
  });

  // Default roomType set when roomConfigs load
  useEffect(() => {
    if (roomConfigs.length > 0 && !form.roomType) {
      setForm(f => ({ ...f, roomType: roomConfigs[0].roomType }));
    }
  }, [roomConfigs]);

  // Handle patient search with debounce
  const handlePatientSearch = (val) => {
    setPatientSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    if (!val.trim()) {
      setPatientResults([]);
      return;
    }
    setSearchTimer(
      setTimeout(async () => {
        try {
          const { data } = await API.get(
            `/patients?search=${encodeURIComponent(val)}&limit=8&clinicId=${clinicId}`
          );
          setPatientResults(data.patients || []);
        } catch (err) {
          console.error('Patient search error:', err);
        }
      }, 300)
    );
  };

  // When patient selected, auto-fill all available details
  const selectPatient = (p) => {
    setChosenPatient(p);
    setPatientSearch(p.name || '');
    setPatientResults([]);

    const nameParts = (p.name || '').split(' ');
    const first = p.firstName || nameParts[0] || '';
    const last = p.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
    const middle = p.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '');

    setForm((f) => ({
      ...f,
      firstName: first,
      middleName: middle,
      lastName: last,
      phone: p.phone || f.phone,
      alternatePhone: p.alternatePhone || f.alternatePhone,
      email: p.email || f.email,
      gender: p.gender || f.gender,
      dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : f.dob,
      age: p.age ? String(p.age) : f.age,
      bloodGroup: p.bloodGroup || f.bloodGroup,
      maritalStatus: p.maritalStatus || f.maritalStatus,
      nationality: p.nationality || f.nationality,
      occupation: p.occupation || f.occupation,
      govtIdType: p.govtIdType || f.govtIdType,
      govtIdNumber: p.govtIdNumber || f.govtIdNumber,
      houseNo: p.houseNo || f.houseNo,
      street: p.street || f.street,
      landmark: p.landmark || f.landmark,
      city: p.city || f.city,
      district: p.district || f.district,
      state: p.state || f.state,
      country: p.country || f.country,
      pincode: p.pincode || f.pincode,
      emergencyName: p.emergencyName || f.emergencyName,
      emergencyRelation: p.emergencyRelation || f.emergencyRelation,
      emergencyPhone: p.emergencyContact || f.emergencyPhone,
      emergencyAltPhone: p.emergencyAltContact || f.emergencyAltPhone,
      emergencyAddress: p.emergencyAddress || f.emergencyAddress,
      doctorId: p.assignedDoctor?._id || p.assignedDoctor || f.doctorId,
      consentSignedBy: p.name || '',
    }));
  };

  const resetPatientSelection = () => {
    setChosenPatient(null);
    setPatientSearch('');
  };

  // Recalculate BMI automatically whenever height/weight change
  const handleHeightWeightChange = (field, val) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: val };
      const h = parseFloat(field === 'height' ? val : prev.height);
      const w = parseFloat(field === 'weight' ? val : prev.weight);
      if (h > 0 && w > 0) {
        const heightMeters = h / 100;
        const bmiVal = (w / (heightMeters * heightMeters)).toFixed(1);
        updated.bmi = bmiVal;
      } else {
        updated.bmi = '';
      }
      return updated;
    });
  };

  // Medication table helpers
  const handleMedChange = (index, key, val) => {
    const meds = [...form.currentMedications];
    meds[index][key] = val;
    setForm({ ...form, currentMedications: meds });
  };

  const addMedRow = () => {
    setForm({
      ...form,
      currentMedications: [
        ...form.currentMedications,
        { medicine: '', dose: '', frequency: '' },
      ],
    });
  };

  const removeMedRow = (index) => {
    if (form.currentMedications.length <= 1) return;
    const meds = form.currentMedications.filter((_, i) => i !== index);
    setForm({ ...form, currentMedications: meds });
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!chosenPatient) {
      alert('Please select a patient first.');
      return;
    }

    const selectedRoom = roomConfigs.find((r) => r.roomType === form.roomType);
    if (selectedRoom && selectedRoom.availableRooms <= 0) {
      alert(`No available rooms for ${form.roomType}`);
      return;
    }

    setSaving(true);
    try {
      // Build selected array lists
      const conditionsList = Object.keys(form.medicalConditions).filter(
        (k) => form.medicalConditions[k]
      );
      const allergiesList = Object.keys(form.allergies).filter(
        (k) => form.allergies[k]
      );

      const fullName = [form.firstName, form.middleName, form.lastName]
        .filter(Boolean)
        .join(' ');

      const payload = {
        clinicId,
        patientId: chosenPatient._id,
        doctorId: form.doctorId || undefined,
        roomType: form.roomType,
        roomNumber: form.roomNumber,
        notes: form.doctorNotes || form.chiefComplaint || '',
        admissionType: form.admissionType,
        department: form.department,
        referringDoctor: form.referringDoctor,
        bedNumber: form.bedNumber,
        expectedStay: form.expectedStay,
        chiefComplaint: form.chiefComplaint,
        contactDetails: {
          alternatePhone: form.alternatePhone,
          email: form.email,
          houseNo: form.houseNo,
          street: form.street,
          landmark: form.landmark,
          city: form.city,
          district: form.district,
          state: form.state,
          country: form.country,
          pincode: form.pincode,
        },
        emergencyContact: {
          name: form.emergencyName,
          relationship: form.emergencyRelation,
          phone: form.emergencyPhone,
          alternatePhone: form.emergencyAltPhone,
          address: form.emergencyAddress,
        },
        medicalHistory: {
          conditions: conditionsList,
          otherConditions: form.otherConditions,
          previousSurgeries: form.previousSurgeries,
          allergies: allergiesList,
          allergyDetails: form.allergyDetails,
          currentMedications: form.currentMedications.filter(
            (m) => m.medicine.trim()
          ),
        },
        vitals: {
          height: form.height,
          weight: form.weight,
          bmi: form.bmi,
          bp: form.bp,
          pulse: form.pulse,
          temp: form.temp,
          respRate: form.respRate,
          spo2: form.spo2,
          bloodSugar: form.bloodSugar,
          painScore: form.painScore,
        },
        clinicalAssessment: {
          presentIllness: form.presentIllness,
          provisionalDiagnosis: form.provisionalDiagnosis,
          doctorNotes: form.doctorNotes,
        },
        paymentMode: form.paymentMode,
        documentChecklist: form.documentChecklist,
        consent: {
          agreed: form.consentAgreed,
          signedBy: form.consentSignedBy,
          relationship: form.consentRelationship,
          timestamp: new Date(),
        },
        isQuickAdmit: quickAdmit,
        patientUpdates: {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          name: fullName || chosenPatient.name,
          dob: form.dob ? form.dob : null,
          age: form.age && !isNaN(Number(form.age)) ? Number(form.age) : null,
          gender: form.gender ? form.gender : null,
          bloodGroup: form.bloodGroup ? form.bloodGroup : null,
          maritalStatus: form.maritalStatus,
          nationality: form.nationality,
          occupation: form.occupation,
          govtIdType: form.govtIdType,
          govtIdNumber: form.govtIdNumber,
          alternatePhone: form.alternatePhone,
          houseNo: form.houseNo,
          street: form.street,
          landmark: form.landmark,
          city: form.city,
          district: form.district,
          state: form.state,
          pincode: form.pincode,
          country: form.country,
          emergencyName: form.emergencyName,
          emergencyRelation: form.emergencyRelation,
          emergencyContact: form.emergencyPhone,
          emergencyAltContact: form.emergencyAltPhone,
          emergencyAddress: form.emergencyAddress,
        },
      };

      const { data } = await API.post('/admissions', payload);
      alert(`Patient successfully admitted! Admission ID: ${data.admissionId || 'Created'}`);
      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Admission submit error:', err);
      alert(err.response?.data?.message || 'Failed to submit patient admission');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              🏥 CURELEX HMS — Patient Admission Form
            </h2>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Fill in patient intake details, ward allocation, medical history, and clinical assessment
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Quick Admit Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 20 }}>
              <input
                type="checkbox"
                checked={quickAdmit}
                onChange={(e) => setQuickAdmit(e.target.checked)}
                style={{ accentColor: '#38bdf8' }}
              />
              <span style={{ fontWeight: 600, color: quickAdmit ? '#38bdf8' : '#e2e8f0' }}>⚡ Quick Emergency Admit</span>
            </label>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 22,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stepper Nav Bar (Hidden if Quick Admit) */}
        {!quickAdmit && (
          <div
            style={{
              display: 'flex',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '8px 16px',
            }}
          >
            {[
              { id: 1, label: '1. Patient & Contact' },
              { id: 2, label: '2. Admission & Ward' },
              { id: 3, label: '3. Medical & Vitals' },
              { id: 4, label: '4. Clinical & Consent' },
            ].map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  border: 'none',
                  background: activeStep === step.id ? '#ffffff' : 'transparent',
                  color: activeStep === step.id ? '#2563eb' : '#64748b',
                  fontWeight: activeStep === step.id ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  borderBottom: activeStep === step.id ? '3px solid #2563eb' : '3px solid transparent',
                  transition: 'all 0.2s',
                  borderRadius: '6px 6px 0 0',
                }}
              >
                {step.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Form Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <form onSubmit={handleSubmit}>
            {/* Step 1: Patient Information & Contact Details */}
            {(quickAdmit || activeStep === 1) && (
              <div>
                {/* Search / Select Patient Header */}
                <div
                  style={{
                    background: '#f1f5f9',
                    padding: 16,
                    borderRadius: 10,
                    marginBottom: 20,
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <label style={{ fontWeight: 700, fontSize: 13, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Search & Select Patient *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search patient by name, phone or Patient ID (UHID)..."
                      value={patientSearch}
                      onChange={(e) => {
                        handlePatientSearch(e.target.value);
                        setChosenPatient(null);
                      }}
                      readOnly={!!chosenPatient}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        background: chosenPatient ? '#e2e8f0' : '#fff',
                      }}
                    />

                    {patientResults.length > 0 && !chosenPatient && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          maxHeight: 220,
                          overflowY: 'auto',
                        }}
                      >
                        {patientResults.map((p) => (
                          <div
                            key={p._id}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                            onClick={() => selectPatient(p)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              UHID: {p.patientId} · Phone: {p.phone} · Age: {p.age || '—'} · Gender: {p.gender || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {chosenPatient && (
                    <div
                      style={{
                        marginTop: 10,
                        background: '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        borderRadius: 8,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#0369a1', fontWeight: 600 }}>
                        ✓ Selected Patient: <strong>{chosenPatient.name}</strong> ({chosenPatient.patientId}) — Phone: {chosenPatient.phone}
                      </span>
                      <button
                        type="button"
                        onClick={resetPatientSelection}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {!quickAdmit && (
                  <>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                      1. Patient Personal Information
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>First Name</label>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Middle Name</label>
                        <input
                          type="text"
                          value={form.middleName}
                          onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Last Name</label>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Gender</label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Date of Birth</label>
                        <input
                          type="date"
                          value={form.dob}
                          onChange={(e) => {
                            const val = e.target.value;
                            let calcAge = form.age;
                            if (val) {
                              const birthDate = new Date(val);
                              const diff = new Date().getFullYear() - birthDate.getFullYear();
                              calcAge = String(diff >= 0 ? diff : 0);
                            }
                            setForm({ ...form, dob: val, age: calcAge });
                          }}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Age (Years)</label>
                        <input
                          type="number"
                          value={form.age}
                          onChange={(e) => setForm({ ...form, age: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Blood Group</label>
                        <select
                          value={form.bloodGroup}
                          onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        >
                          <option value="">Select Blood Group</option>
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

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Marital Status</label>
                        <select
                          value={form.maritalStatus}
                          onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        >
                          <option value="">Select Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Occupation</label>
                        <input
                          type="text"
                          value={form.occupation}
                          onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Govt ID Type</label>
                        <select
                          value={form.govtIdType}
                          onChange={(e) => setForm({ ...form, govtIdType: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        >
                          <option value="Aadhaar">Aadhaar Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving Licence">Driving Licence</option>
                          <option value="Voter ID">Voter ID</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Govt ID Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 1234 5678 9012"
                          value={form.govtIdNumber}
                          onChange={(e) => setForm({ ...form, govtIdNumber: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <h4 style={{ margin: '20px 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                      2. Contact & Address Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Mobile Number</label>
                        <input
                          type="text"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Alternate Mobile</label>
                        <input
                          type="text"
                          value={form.alternatePhone}
                          onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Email Address</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>House / Flat No.</label>
                        <input
                          type="text"
                          value={form.houseNo}
                          onChange={(e) => setForm({ ...form, houseNo: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Street / Road</label>
                        <input
                          type="text"
                          value={form.street}
                          onChange={(e) => setForm({ ...form, street: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Landmark</label>
                        <input
                          type="text"
                          value={form.landmark}
                          onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>City</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>District</label>
                        <input
                          type="text"
                          value={form.district}
                          onChange={(e) => setForm({ ...form, district: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>State</label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Country</label>
                        <input
                          type="text"
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>PIN Code</label>
                        <input
                          type="text"
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <h4 style={{ margin: '20px 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                      3. Emergency Contact Person
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Contact Person Name</label>
                        <input
                          type="text"
                          value={form.emergencyName}
                          onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Relationship</label>
                        <input
                          type="text"
                          placeholder="e.g. Spouse / Parent / Sibling"
                          value={form.emergencyRelation}
                          onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Mobile Number</label>
                        <input
                          type="text"
                          value={form.emergencyPhone}
                          onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Admission & Ward Details */}
            {(quickAdmit || activeStep === 2) && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                  4. Admission & Ward Allocation
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Admission Type *</label>
                    <select
                      value={form.admissionType}
                      onChange={(e) => setForm({ ...form, admissionType: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="Direct Admission">Direct Admission</option>
                      <option value="Emergency">Emergency</option>
                      <option value="OPD to IPD">OPD to IPD</option>
                      <option value="Day Care">Day Care</option>
                      <option value="ICU">ICU</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Department</label>
                    <select
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Surgery">Surgery</option>
                      <option value="Orthopaedics">Orthopaedics</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Paediatrics">Paediatrics</option>
                      <option value="Gynaecology">Gynaecology</option>
                      <option value="ICU">ICU</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Consulting Doctor</label>
                    <select
                      value={form.doctorId}
                      onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="">— Select Consulting Doctor —</option>
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>
                          Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Referring Doctor / Hospital</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Sharma / City Clinic"
                      value={form.referringDoctor}
                      onChange={(e) => setForm({ ...form, referringDoctor: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Room / Ward Type *</label>
                    <select
                      value={form.roomType}
                      onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      {roomConfigs.map((config) => (
                        <option
                          key={config.roomType}
                          value={config.roomType}
                          disabled={config.availableRooms <= 0}
                        >
                          {config.roomType} — ₹{config.dailyRate}/day ({config.availableRooms} available)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Room Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 204"
                      value={form.roomNumber}
                      onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Bed Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Bed B"
                      value={form.bedNumber}
                      onChange={(e) => setForm({ ...form, bedNumber: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Expected Length of Stay</label>
                    <input
                      type="text"
                      placeholder="e.g. 3 Days"
                      value={form.expectedStay}
                      onChange={(e) => setForm({ ...form, expectedStay: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Chief Complaint / Reason for Admission</label>
                  <textarea
                    rows={2}
                    placeholder="Enter main symptoms, chief complaints, or emergency reasons..."
                    value={form.chiefComplaint}
                    onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Medical History & Vitals */}
            {!quickAdmit && activeStep === 3 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                  5. Existing Medical History & Allergies
                </h4>

                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Existing Medical Conditions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  {Object.keys(form.medicalConditions).map((cond) => (
                    <label key={cond} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.medicalConditions[cond]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            medicalConditions: { ...form.medicalConditions, [cond]: e.target.checked },
                          })
                        }
                      />
                      {cond.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Other Medical Conditions / Surgeries</label>
                    <input
                      type="text"
                      placeholder="e.g. Previous Appendix Surgery (2020)"
                      value={form.previousSurgeries}
                      onChange={(e) => setForm({ ...form, previousSurgeries: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Allergies & Reactions</label>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                      {Object.keys(form.allergies).map((alg) => (
                        <label key={alg} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="checkbox"
                            checked={form.allergies[alg]}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                allergies: { ...form.allergies, [alg]: e.target.checked },
                              })
                            }
                          />
                          {alg}
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Specify allergy details e.g. Penicillin rash..."
                      value={form.allergyDetails}
                      onChange={(e) => setForm({ ...form, allergyDetails: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>

                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Current Medications
                </label>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Medicine Name</th>
                        <th style={{ padding: '6px 8px' }}>Dose</th>
                        <th style={{ padding: '6px 8px' }}>Frequency</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.currentMedications.map((med, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: 4 }}>
                            <input
                              type="text"
                              placeholder="e.g. Metformin"
                              value={med.medicine}
                              onChange={(e) => handleMedChange(idx, 'medicine', e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="text"
                              placeholder="e.g. 500 mg"
                              value={med.dose}
                              onChange={(e) => handleMedChange(idx, 'dose', e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                            />
                          </td>
                          <td style={{ padding: 4 }}>
                            <input
                              type="text"
                              placeholder="e.g. Twice Daily (BD)"
                              value={med.frequency}
                              onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                            />
                          </td>
                          <td style={{ padding: 4, textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeMedRow(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={addMedRow}
                    style={{
                      marginTop: 8,
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Medication Row
                  </button>
                </div>

                <h4 style={{ margin: '20px 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                  6. Initial Vital Signs Intake
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Height (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g. 170"
                      value={form.height}
                      onChange={(e) => handleHeightWeightChange('height', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Weight (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 70"
                      value={form.weight}
                      onChange={(e) => handleHeightWeightChange('weight', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>BMI (Auto)</label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto"
                      value={form.bmi}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700, color: '#0369a1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Blood Pressure</label>
                    <input
                      type="text"
                      placeholder="120/80 mmHg"
                      value={form.bp}
                      onChange={(e) => setForm({ ...form, bp: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Pulse Rate (bpm)</label>
                    <input
                      type="text"
                      placeholder="e.g. 72"
                      value={form.pulse}
                      onChange={(e) => setForm({ ...form, pulse: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Temperature (°F)</label>
                    <input
                      type="text"
                      placeholder="e.g. 98.6"
                      value={form.temp}
                      onChange={(e) => setForm({ ...form, temp: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Respiratory Rate</label>
                    <input
                      type="text"
                      placeholder="e.g. 18 /min"
                      value={form.respRate}
                      onChange={(e) => setForm({ ...form, respRate: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>SpO₂ (%)</label>
                    <input
                      type="text"
                      placeholder="e.g. 98"
                      value={form.spo2}
                      onChange={(e) => setForm({ ...form, spo2: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Blood Sugar (mg/dL)</label>
                    <input
                      type="text"
                      placeholder="e.g. 110"
                      value={form.bloodSugar}
                      onChange={(e) => setForm({ ...form, bloodSugar: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Pain Score (0-10)</label>
                    <select
                      value={form.painScore}
                      onChange={(e) => setForm({ ...form, painScore: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 0 ? '(No Pain)' : num === 10 ? '(Worst Pain)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Clinical Assessment, Payment Mode, Document Checklist & Consent */}
            {!quickAdmit && activeStep === 4 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                  7. Initial Clinical Assessment
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>History of Present Illness</label>
                    <textarea
                      rows={2}
                      placeholder="Onset, duration, severity of current illness..."
                      value={form.presentIllness}
                      onChange={(e) => setForm({ ...form, presentIllness: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Provisional Diagnosis</label>
                    <textarea
                      rows={2}
                      placeholder="Doctor's initial provisional diagnosis..."
                      value={form.provisionalDiagnosis}
                      onChange={(e) => setForm({ ...form, provisionalDiagnosis: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Doctor's Initial Notes & Instructions</label>
                    <input
                      type="text"
                      placeholder="Initial order/observations..."
                      value={form.doctorNotes}
                      onChange={(e) => setForm({ ...form, doctorNotes: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Payment Mode</label>
                    <select
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Insurance">Insurance / TPA</option>
                    </select>
                  </div>
                </div>

                <h4 style={{ margin: '20px 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                  10. Submitted Document Checklist
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { key: 'aadhaar', label: 'Aadhaar Card' },
                    { key: 'prescriptions', label: 'Previous Prescriptions' },
                    { key: 'medicalReports', label: 'Previous Reports' },
                    { key: 'labReports', label: 'Lab Reports' },
                    { key: 'xray', label: 'X-Ray' },
                    { key: 'ctScan', label: 'CT Scan' },
                    { key: 'mri', label: 'MRI' },
                    { key: 'ecg', label: 'ECG' },
                  ].map((doc) => (
                    <label key={doc.key} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.documentChecklist[doc.key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            documentChecklist: {
                              ...form.documentChecklist,
                              [doc.key]: e.target.checked,
                            },
                          })
                        }
                      />
                      {doc.label}
                    </label>
                  ))}
                </div>

                <h4 style={{ margin: '20px 0 12px', fontSize: 14, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
                  11. Consent Declaration
                </h4>

                <div
                  style={{
                    background: '#fffbe6',
                    border: '1px solid #ffe58f',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#722ed1',
                    marginBottom: 14,
                    lineHeight: 1.5,
                  }}
                >
                  I hereby declare that the information provided by me is true and complete to the best of my knowledge. I authorize CURELEX Hospital and its medical staff to provide necessary diagnostic tests, medical procedures, and treatment. I acknowledge understanding of hospital policies regarding billing and treatment consent.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.consentAgreed}
                      onChange={(e) => setForm({ ...form, consentAgreed: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                    />
                    I accept and confirm consent declaration
                  </label>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Signatory Name</label>
                    <input
                      type="text"
                      placeholder="Patient / Guardian Name"
                      value={form.consentSignedBy}
                      onChange={(e) => setForm({ ...form, consentSignedBy: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Relationship (if Guardian)</label>
                    <input
                      type="text"
                      placeholder="e.g. Self / Father"
                      value={form.consentRelationship}
                      onChange={(e) => setForm({ ...form, consentRelationship: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {!quickAdmit && activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((s) => s - 1)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ← Previous Step
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#64748b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            {!quickAdmit && activeStep < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (!chosenPatient) {
                    alert('Select a patient first to proceed.');
                    return;
                  }
                  setActiveStep((s) => s + 1);
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  padding: '8px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                }}
              >
                {saving ? 'Admitting Patient...' : '🏥 Confirm Patient Admission'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
