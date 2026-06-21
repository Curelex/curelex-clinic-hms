// hms-react/src/components/ClinicSearch.jsx
import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';

/**
 * Search-as-you-type clinic finder.
 * Flow: type clinic name → dropdown of matching clinics → click a clinic
 *       → shows its doctors with specialization + consultation fee
 *       → "Generate Token" opens a booking form (symptoms, age, gender,
 *         consultation type) → submit creates a token (status "Pending"
 *         until staff accepts it) → receipt modal confirms the booking.
 *
 * Props:
 *  - patientId:   the logged-in patient's id (sent when generating a token)
 *  - patientName: the logged-in patient's display name
 */
export default function ClinicSearch({ patientId, patientName }) {
  const [query, setQuery] = useState('');
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);

  const [selectedClinic, setSelectedClinic] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [open, setOpen] = useState(false);

  // Booking form modal state
  const [bookingDoctor, setBookingDoctor] = useState(null); // doctor currently being booked
  const [form, setForm] = useState({
    age: '',
    gender: 'Male',
    symptoms: '',
    consultationType: 'in-person',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Receipt modal state
  const [receipt, setReceipt] = useState(null); // holds the created token once generated

  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Close dropdown when clicking outside ────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Debounced clinic search as the user types ───────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setClinics([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingClinics(true);
      try {
        const { data } = await API.get(`/clinics?search=${encodeURIComponent(query.trim())}`);
        if (data.success) setClinics(data.clinics || []);
      } catch (err) {
        console.error('Clinic search failed:', err);
        setClinics([]);
      }
      setLoadingClinics(false);
    }, 350); // debounce delay

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── Select a clinic → load its doctors ──────────────────────────────────
  const selectClinic = async (clinic) => {
    setSelectedClinic(clinic);
    setDoctors([]);
    setLoadingDoctors(true);
    try {
      const { data } = await API.get(`/clinics/${clinic._id}/doctors`);
      if (data.success) setDoctors(data.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
    setLoadingDoctors(false);
  };

  const backToSearch = () => {
    setSelectedClinic(null);
    setDoctors([]);
  };

  // ── Open booking form for a doctor ───────────────────────────────────────
  const openBookingForm = (doctor) => {
    setBookingDoctor(doctor);
    setForm({ age: '', gender: 'Male', symptoms: '', consultationType: 'in-person' });
    setFormError('');
  };

  const closeBookingForm = () => {
    setBookingDoctor(null);
    setFormError('');
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // ── Submit booking form → generate token ─────────────────────────────────
  const handleSubmitBooking = async () => {
    if (!form.symptoms.trim()) {
      setFormError('Please briefly describe your symptoms or reason for visit');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const { data } = await API.post('/tokens/generate', {
        clinicId: selectedClinic._id,
        doctorId: bookingDoctor._id,
        patientId,
        patientName,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender,
        symptoms: form.symptoms.trim(),
        consultationType: form.consultationType,
      });
      setReceipt(data);
      setBookingDoctor(null);
      setOpen(false);
      setSelectedClinic(null);
      setQuery('');
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not generate token. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Search input ──────────────────────────────────────────────── */}
      <div className="pd-topbar__search" style={{ position: 'relative' }}>
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search doctors, clinics..."
          value={selectedClinic ? selectedClinic.name : query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedClinic(null);
            setOpen(true);
          }}
        />
      </div>

      {/* ── Dropdown panel ────────────────────────────────────────────── */}
      {open && (query.trim() || selectedClinic) && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: 380,
            maxHeight: 440,
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            zIndex: 4000,
          }}
        >
          {/* ── Doctor list view (clinic selected) ───────────────────── */}
          {selectedClinic ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 14px',
                  borderBottom: '1px solid #f1f5f9',
                  position: 'sticky',
                  top: 0,
                  background: '#fff',
                }}
              >
                <button
                  onClick={backToSearch}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#2d6be4',
                    padding: 4,
                  }}
                  title="Back to search"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2236' }}>
                  {selectedClinic.name}
                </div>
              </div>

              {loadingDoctors && (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Loading doctors...
                </div>
              )}

              {!loadingDoctors && doctors.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No doctors available at this clinic right now.
                </div>
              )}

              {!loadingDoctors &&
                doctors.map((doc) => (
                  <div
                    key={doc._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2d6be4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {doc.name?.charAt(0)?.toUpperCase() || 'D'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: '#1a2236',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Dr. {doc.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {doc.department || 'General'} · ₹{doc.consultationFee || 0}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openBookingForm(doc)}
                      style={{
                        border: 'none',
                        background: '#2d6be4',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '7px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Generate Token
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            // ── Clinic search results view ─────────────────────────────
            <div>
              {loadingClinics && (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Searching clinics...
                </div>
              )}

              {!loadingClinics && query.trim() && clinics.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No clinics found for "{query}"
                </div>
              )}

              {!loadingClinics &&
                clinics.map((clinic) => (
                  <div
                    key={clinic._id}
                    onClick={() => selectClinic(clinic)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: '#eff6ff',
                        color: '#2d6be4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-hospital"></i>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2236' }}>
                        {clinic.name}
                      </div>
                      {clinic.address && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {clinic.address}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Booking form modal ────────────────────────────────────────── */}
      {bookingDoctor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000,
          }}
          onClick={closeBookingForm}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              width: 420,
              maxWidth: '92vw',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
                  Book Token — Dr. {bookingDoctor.name}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  {bookingDoctor.department || 'General'} · ₹{bookingDoctor.consultationFee || 0} consultation fee
                </p>
              </div>
              <button
                onClick={closeBookingForm}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
                  type="number"
                  placeholder="Age"
                  value={form.age}
                  onChange={(e) => updateForm('age', e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <select
                  value={form.gender}
                  onChange={(e) => updateForm('gender', e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <textarea
                rows={3}
                placeholder="Symptoms / Reason for visit *"
                value={form.symptoms}
                onChange={(e) => updateForm('symptoms', e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                  Consultation Type
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => updateForm('consultationType', 'in-person')}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      borderRadius: 10,
                      border: form.consultationType === 'in-person' ? '1.5px solid #2d6be4' : '1.5px solid #e2e8f0',
                      background: form.consultationType === 'in-person' ? '#eff6ff' : '#fff',
                      color: form.consultationType === 'in-person' ? '#2d6be4' : '#64748b',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    🏥 In-Person
                  </button>
                  <button
                    onClick={() => updateForm('consultationType', 'online')}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      borderRadius: 10,
                      border: form.consultationType === 'online' ? '1.5px solid #2d6be4' : '1.5px solid #e2e8f0',
                      background: form.consultationType === 'online' ? '#eff6ff' : '#fff',
                      color: form.consultationType === 'online' ? '#2d6be4' : '#64748b',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    💻 Online
                  </button>
                </div>
              </div>

              {formError && (
                <div style={{ padding: 10, background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 12 }}>
                  ⚠️ {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={closeBookingForm}
                  style={{
                    flex: 1,
                    padding: 11,
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitBooking}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: 11,
                    borderRadius: 10,
                    border: 'none',
                    background: submitting ? '#93c5fd' : '#2d6be4',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submitting ? 'default' : 'pointer',
                  }}
                >
                  {submitting ? 'Booking...' : '🎫 Confirm & Generate Token'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt modal ─────────────────────────────────────────────── */}
      {receipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000,
          }}
          onClick={() => setReceipt(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: 380, maxWidth: '92vw', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f4c81, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
              }}
            >
              <div style={{ color: '#fff', fontSize: 38, fontWeight: 800 }}>{receipt.tokenNumber}</div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, color: '#1e293b' }}>
              Token Request Sent!
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
              Dr. {receipt.doctor?.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              {receipt.doctor?.department || 'General'}
            </div>
            <div
              style={{
                background: '#fef3c7',
                color: '#92400e',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              ⏳ Pending confirmation from the clinic
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
              📅 {new Date().toLocaleDateString('en-IN')} · 🕐{' '}
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={() => setReceipt(null)}
              style={{
                width: '100%',
                padding: 11,
                borderRadius: 10,
                border: 'none',
                background: '#2d6be4',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}