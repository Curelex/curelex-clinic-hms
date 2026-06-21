// hms-react/src/components/WritePrescription.jsx - Fix search
import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Powder', 'Suspension', 'Ointment'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'SOS', 'As needed'];
const DURATIONS = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '1 month', '2 months', '3 months'];

export default function WritePrescription({ patient, doctorId, token, appointment, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [form, setForm] = useState({
    diagnosis: '',
    chiefComplaint: '',
    notes: '',
    followUpDate: '',
    followUpInstructions: '',
    tests: [],
  });
  const [testInput, setTestInput] = useState('');
  const [testType, setTestType] = useState('Pathology');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const searchTimeout = useRef(null);

  // ✅ FIX: Medicine search with proper error handling and loading state
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        
        const { data } = await API.get(`/medicines/search?query=${encodeURIComponent(searchQuery)}`);
        
        if (data.success) {
          setSearchResults(data.medicines || []);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  const addMedicine = (medicine) => {
    if (selectedMedicines.find(m => m.medicineId === medicine._id)) {
      setError(`${medicine.name} already added`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    setSelectedMedicines([
      ...selectedMedicines,
      {
        medicineId: medicine._id,
        name: medicine.name,
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration: '5 days',
        strength: medicine.strength || '',
        instructions: '',
        quantity: 1,
      }
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMedicine = (index) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
  };

  const updateMedicineField = (index, field, value) => {
    const updated = [...selectedMedicines];
    updated[index][field] = value;
    setSelectedMedicines(updated);
  };

  const addTest = () => {
    if (!testInput.trim()) return;
    setForm({
      ...form,
      tests: [...form.tests, { name: testInput.trim(), type: testType, instructions: '' }]
    });
    setTestInput('');
  };

  const removeTest = (index) => {
    const updated = [...form.tests];
    updated.splice(index, 1);
    setForm({ ...form, tests: updated });
  };

  const updateTestField = (index, field, value) => {
    const updated = [...form.tests];
    updated[index][field] = value;
    setForm({ ...form, tests: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (selectedMedicines.length === 0) {
      setError('Please add at least one medicine');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        patientId: patient._id || patient,
        doctorId: doctorId || user.id,
        appointmentId: appointment?._id || null,
        tokenId: token?._id || null,
        medicines: selectedMedicines,
        diagnosis: form.diagnosis,
        chiefComplaint: form.chiefComplaint,
        notes: form.notes,
        followUpDate: form.followUpDate || null,
        followUpInstructions: form.followUpInstructions,
        tests: form.tests,
        // ✅ Add created by info
        createdBy: user.id,
        createdByRole: user.role,
      };

      const { data } = await API.post('/prescriptions', payload);
      if (data.success) {
        setSuccess('Prescription created successfully!');
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create prescription');
    }
    setLoading(false);
  };

  // Get patient name safely
  const patientName = patient?.name || patient?.patientName || 'Patient';
  const patientId = patient?.patientId || patient?._id || '';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto',
        fontFamily: 'inherit',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              ✍️ Write Prescription
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              {patientName} · {patientId}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: '#94a3b8', padding: 4,
          }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626', padding: '10px 14px',
              borderRadius: 8, marginBottom: 16, fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{
              background: '#d1fae5', color: '#065f46', padding: '10px 14px',
              borderRadius: 8, marginBottom: 16, fontSize: 13,
            }}>
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Chief Complaint *</label>
              <textarea
                rows={2}
                value={form.chiefComplaint}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                style={inputStyle}
                placeholder="e.g. Severe headache for 3 days, fever, cough..."
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Diagnosis *</label>
              <input
                type="text"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                style={inputStyle}
                placeholder="e.g. Acute Sinusitis, Upper Respiratory Infection..."
                required
              />
            </div>

            {/* Medicine Search */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Search Medicines</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={inputStyle}
                  placeholder="Type medicine name to search..."
                />
                {searching && (
                  <div style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 14, color: '#94a3b8',
                  }}>
                    <i className="fas fa-spinner fa-spin"></i>
                  </div>
                )}
                {searchResults.length > 0 && searchQuery.length >= 2 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    maxHeight: 200, overflowY: 'auto', zIndex: 10,
                  }}>
                    {searchResults.map((med) => (
  <div
    key={med._id}
    onClick={() => addMedicine(med)}
    style={{
      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
  >
    <div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>
        {med.name}
        {med.availableQuantity !== undefined && (
          <span style={{
            marginLeft: 8,
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 10,
            background: med.availableQuantity > 0 ? '#d1fae5' : '#fee2e2',
            color: med.availableQuantity > 0 ? '#065f46' : '#991b1b',
          }}>
            {med.availableQuantity > 0 ? `Stock: ${med.availableQuantity}` : 'Out of Stock'}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        {med.dosageForm || 'Tablet'} {med.strength ? `· ${med.strength}` : ''}
        {med.doctorId ? ' · My Medicine' : ' · Global'}
        {med.unitPrice && ` · ₹${med.unitPrice}`}
      </div>
    </div>
    <button style={{
      background: '#0f4c81', color: '#fff', border: 'none',
      borderRadius: 6, padding: '4px 12px', fontSize: 12,
      cursor: 'pointer',
    }}>Add</button>
  </div>
))}
                  </div>
                )}
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 8, padding: '12px 16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    zIndex: 10, fontSize: 13, color: '#94a3b8',
                  }}>
                    No medicines found. Try a different search term.
                  </div>
                )}
              </div>
            </div>

            {/* Selected Medicines */}
            {selectedMedicines.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Selected Medicines ({selectedMedicines.length})</label>
                {selectedMedicines.map((med, index) => (
                  <div key={index} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: 10, padding: '12px 14px', marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{med.name}</div>
                      <button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                      >×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => updateMedicineField(index, 'dosage', e.target.value)}
                          style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                          placeholder="e.g. 500mg"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Frequency</label>
                        <select
                          value={med.frequency}
                          onChange={(e) => updateMedicineField(index, 'frequency', e.target.value)}
                          style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                        >
                          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Duration</label>
                        <select
                          value={med.duration}
                          onChange={(e) => updateMedicineField(index, 'duration', e.target.value)}
                          style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                        >
                          {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <label style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Instructions (optional)</label>
                      <input
                        type="text"
                        value={med.instructions || ''}
                        onChange={(e) => updateMedicineField(index, 'instructions', e.target.value)}
                        style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                        placeholder="e.g. Take with food, avoid alcohol..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tests */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Order Tests (optional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Test name..."
                />
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  style={{ ...inputStyle, width: 140 }}
                >
                  <option value="Pathology">Pathology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Other">Other</option>
                </select>
                <button
                  type="button"
                  onClick={addTest}
                  style={{
                    background: '#0f4c81', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '0 16px', cursor: 'pointer',
                  }}
                >Add</button>
              </div>
              {form.tests.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {form.tests.map((test, index) => (
                    <div key={index} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', background: '#f8fafc',
                      borderRadius: 6, marginBottom: 4,
                    }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{test.name}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>· {test.type}</span>
                      <button
                        type="button"
                        onClick={() => removeTest(index)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={inputStyle}
                placeholder="Additional notes..."
              />
            </div>

            {/* Follow-up */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Follow-up Date</label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Follow-up Instructions</label>
                <input
                  type="text"
                  value={form.followUpInstructions}
                  onChange={(e) => setForm({ ...form, followUpInstructions: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Bring blood test results..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                  background: loading ? '#94a3b8' : '#0f4c81',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                }}
              >
                {loading ? 'Creating...' : '📝 Create Prescription'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14,
  fontFamily: 'inherit', boxSizing: 'border-box',
};