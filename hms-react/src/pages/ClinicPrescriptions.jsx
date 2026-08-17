// hms-react/src/pages/ClinicPrescriptions.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import WritePrescription from '../components/WritePrescription';
import ViewPrescription from '../components/ViewPrescription';
import { getPlanConfig, isFeatureVisible } from '../utils/planConfig';

export default function ClinicPrescriptions({ clinicId, activePlan, onRefresh }) {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewPrescription, setViewPrescription] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchPatient, setSearchPatient] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [stats, setStats] = useState({});
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');

  // Add Medicine Modal States
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [addMedicineData, setAddMedicineData] = useState({ name: '' });
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [medicineSearchResults, setMedicineSearchResults] = useState([]);
  const [isSearchingMedicines, setIsSearchingMedicines] = useState(false);
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const [addMedicineError, setAddMedicineError] = useState('');

  const effectiveClinicId = clinicId || user?.clinicId;
  const doctorId = user?.id || user?._id;

  // Check if prescriptions feature is available in current plan
  const planKey = activePlan || 'free';
  const hasPrescriptions = isFeatureVisible('clinic', planKey, 'prescriptions');

  useEffect(() => {
    if (!effectiveClinicId) {
      console.log('No clinic ID found');
      return;
    }
    loadPrescriptions();
    loadPatients();
    loadDoctors();
    loadStats();
  }, [effectiveClinicId]);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      // Get all prescriptions for the clinic
      const { data } = await API.get(`/prescriptions/clinic?clinicId=${effectiveClinicId}`);
      if (data.success) {
        setPrescriptions(data.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      if (err.response?.status === 404) {
        setPrescriptions([]);
      }
    }
    setLoading(false);
  };

  const loadPatients = async () => {
    try {
      const { data } = await API.get(`/patients?clinicId=${effectiveClinicId}&limit=200`);
      setPatients(data.patients || []);
      setFilteredPatients(data.patients || []);
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data } = await API.get('/auth/clinic-doctors');
      const doctorsList = data.filter(u => u.role === 'doctor' || u.role === 'separate_doctor');
      setDoctors(doctorsList);
      if (doctorsList.length > 0) {
        setSelectedDoctor(doctorsList[0]._id);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await API.get(`/prescriptions/stats?clinicId=${effectiveClinicId}`);
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSearchPatient = (query) => {
    setSearchPatient(query);
    if (!query.trim()) {
      setFilteredPatients(patients);
      return;
    }
    const filtered = patients.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.patientId?.toLowerCase().includes(query.toLowerCase()) ||
      p.phone?.includes(query)
    );
    setFilteredPatients(filtered);
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setShowPatientSelector(false);
    setSearchPatient('');
    setShowWriteModal(true);
  };

  const openWritePrescription = () => {
    if (patients.length === 0) {
      alert('Please add patients first before writing a prescription.');
      return;
    }
    setShowPatientSelector(true);
  };

  // ── Medicine Search Handler ──
  const searchMedicines = async (query) => {
    if (!query || query.length < 2) {
      setMedicineSearchResults([]);
      return;
    }

    setIsSearchingMedicines(true);
    try {
      const { data } = await API.get(`/medicines/search?query=${query}&clinicId=${effectiveClinicId}`);
      if (data.success) {
        setMedicineSearchResults(data.medicines || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setMedicineSearchResults([]);
    } finally {
      setIsSearchingMedicines(false);
    }
  };

  // ── Handle Add New Medicine ──
  const handleAddNewMedicine = async (e) => {
    e.preventDefault();
    
    if (!addMedicineData.name.trim()) {
      setAddMedicineError('Medicine name is required');
      return;
    }

    setIsAddingMedicine(true);
    setAddMedicineError('');

    try {
      const { data } = await API.post('/medicines/doctor/add', {
        name: addMedicineData.name,
        composition: addMedicineData.composition || '',
        dosageForm: addMedicineData.dosageForm || 'Tablet',
        strength: addMedicineData.strength || '',
        unitPrice: parseFloat(addMedicineData.unitPrice) || 0,
        clinicId: effectiveClinicId,
        doctorId: selectedDoctor || doctorId,
      });

      if (data.success) {
        setShowAddMedicineModal(false);
        setAddMedicineData({ name: '' });
        setAddMedicineError('');
        alert('Medicine added successfully!');
        if (medicineSearchQuery) {
          await searchMedicines(medicineSearchQuery);
        }
      }
    } catch (error) {
      console.error('Error adding medicine:', error);
      setAddMedicineError(error.response?.data?.message || 'Failed to add medicine');
    } finally {
      setIsAddingMedicine(false);
    }
  };

  const statusColors = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    active: { bg: '#dbeafe', color: '#1e40af', label: 'Active' },
    dispensed: { bg: '#fef3c7', color: '#92400e', label: 'Dispensed' },
    completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  };

  if (!effectiveClinicId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#ef4444' }}>
          <i className="fas fa-exclamation-circle" style={{ fontSize: 48 }}></i>
          <p style={{ marginTop: '1rem' }}>No clinic selected. Please select a clinic first.</p>
        </div>
      </div>
    );
  }

  // If prescriptions not available in plan, show upgrade message
  if (!hasPrescriptions) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '50vh',
        textAlign: 'center',
        padding: '40px',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h2 style={{ color: '#1e293b', marginBottom: 8 }}>Prescriptions Not Available</h2>
        <p style={{ color: '#64748b', maxWidth: 400, marginBottom: 20 }}>
          Your current plan ({planKey}) does not include prescription management. 
          Upgrade to Plus or Pro to access this feature.
        </p>
        {planKey === 'lite' && (
          <button
            onClick={() => window.location.href = '/plans'}
            style={{
              padding: '10px 24px',
              background: '#0f4c81',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Upgrade Plan →
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Prescriptions</h1>
          <p className="text-muted text-small">Manage prescriptions for your clinic</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openWritePrescription}
        >
          + Write Prescription
        </button>
      </div>

      {/* Doctor Filter */}
      {doctors.length > 1 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Filter by Doctor:</label>
          <select
            value={selectedDoctor}
            onChange={(e) => {
              setSelectedDoctor(e.target.value);
              loadPrescriptions();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              background: '#fff',
            }}
          >
            {doctors.map(d => (
              <option key={d._id} value={d._id}>Dr. {d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total || 0, color: '#0f4c81' },
          { label: 'Active', value: stats.active || 0, color: '#3b82f6' },
          { label: 'Dispensed', value: stats.dispensed || 0, color: '#f59e0b' },
          { label: 'Completed', value: stats.completed || 0, color: '#10b981' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>
              <span>{s.value}</span>
            </div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Prescriptions List */}
      <div className="card">
        <div className="filter-bar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search by patient name..."
              value={searchPatient}
              onChange={(e) => handleSearchPatient(e.target.value)}
            />
          </div>
          <div className="text-muted text-small">
            {prescriptions.length} prescriptions
          </div>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : prescriptions.length === 0 ? (
          <div className="empty-state">
            <p>No prescriptions yet. Write your first prescription!</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Diagnosis</th>
                  <th>Medicines</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => {
                  const sc = statusColors[rx.status] || statusColors.draft;
                  return (
                    <tr key={rx._id}>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(rx.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td>
                        <strong>{rx.patientName || rx.patientId?.name}</strong>
                        <br />
                        <span className="text-muted text-small">
                          {rx.patientId?.patientId || rx.patientId?._id?.slice(-6) || ''}
                        </span>
                      </td>
                      <td>
                        {rx.doctorId?.name || rx.doctorName || '—'}
                      </td>
                      <td>{rx.diagnosis || '—'}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {rx.medicines?.length || 0} medicine{rx.medicines?.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: sc.bg, color: sc.color,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setViewPrescription(rx)}
                          >
                            View
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setSelectedPatient(rx.patientId || { _id: rx.patientId, name: rx.patientName });
                              setShowWriteModal(true);
                            }}
                          >
                            New
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Selector Modal */}
      {showPatientSelector && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            width: '100%', maxWidth: 500, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Select Patient</h3>
              <button onClick={() => setShowPatientSelector(false)} style={{
                background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
                color: '#94a3b8',
              }}>×</button>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchPatient}
                onChange={(e) => handleSearchPatient(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #d1d5db', fontSize: 14,
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ padding: '0 24px 16px', overflowY: 'auto', flex: 1 }}>
              {filteredPatients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                  {searchPatient ? 'No patients found' : 'Type to search patients'}
                </div>
              ) : (
                filteredPatients.map(p => (
                  <div
                    key={p._id}
                    onClick={() => selectPatient(p)}
                    style={{
                      padding: '12px 14px', cursor: 'pointer', borderRadius: 8,
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {p.patientId} · {p.phone}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      background: '#dbeafe', color: '#1e40af',
                    }}>Select</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Write Prescription Modal */}
      {showWriteModal && (
        <WritePrescription
          patient={selectedPatient || {}}
          doctorId={selectedDoctor || doctorId}
          token={null}
          onClose={() => {
            setShowWriteModal(false);
            setSelectedPatient(null);
          }}
          onSuccess={() => {
            loadPrescriptions();
            loadStats();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* View Prescription Modal */}
      {viewPrescription && (
        <ViewPrescription
          prescription={viewPrescription}
          onClose={() => setViewPrescription(null)}
          onStatusUpdate={() => {
            loadPrescriptions();
            loadStats();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* ── Add Medicine Modal ── */}
      {showAddMedicineModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            width: '100%', maxWidth: 500, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add New Medicine</h3>
              <button 
                onClick={() => {
                  setShowAddMedicineModal(false);
                  setAddMedicineError('');
                  setAddMedicineData({ name: '' });
                }} 
                style={{
                  background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
                  color: '#94a3b8', padding: '0 8px',
                }}
              >×</button>
            </div>

            <form onSubmit={handleAddNewMedicine} style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Medicine Name *
                </label>
                <input
                  type="text"
                  value={addMedicineData.name}
                  onChange={(e) => setAddMedicineData({...addMedicineData, name: e.target.value})}
                  placeholder="Enter medicine name"
                  required
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Composition
                </label>
                <input
                  type="text"
                  value={addMedicineData.composition || ''}
                  onChange={(e) => setAddMedicineData({...addMedicineData, composition: e.target.value})}
                  placeholder="e.g., Paracetamol 500mg + Caffeine 65mg"
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Dosage Form
                  </label>
                  <select
                    value={addMedicineData.dosageForm || 'Tablet'}
                    onChange={(e) => setAddMedicineData({...addMedicineData, dosageForm: e.target.value})}
                    style={{
                      width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                      borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  >
                    {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Powder', 'Suspension', 'Ointment'].map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Strength
                  </label>
                  <input
                    type="text"
                    value={addMedicineData.strength || ''}
                    onChange={(e) => setAddMedicineData({...addMedicineData, strength: e.target.value})}
                    placeholder="e.g., 500mg"
                    style={{
                      width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                      borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Unit Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addMedicineData.unitPrice || 0}
                  onChange={(e) => setAddMedicineData({...addMedicineData, unitPrice: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {addMedicineError && (
                <div style={{
                  color: '#ef4444', fontSize: 14, margin: '8px 0',
                  padding: '8px 12px', background: '#fef2f2', borderRadius: 6,
                }}>
                  {addMedicineError}
                </div>
              )}

              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 12,
                marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMedicineModal(false);
                    setAddMedicineError('');
                    setAddMedicineData({ name: '' });
                  }}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db',
                    background: 'transparent', cursor: 'pointer', fontSize: 14,
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMedicine}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: isAddingMedicine ? '#94a3b8' : '#2d6be4',
                    color: '#fff', cursor: isAddingMedicine ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontFamily: 'inherit',
                  }}
                >
                  {isAddingMedicine ? 'Adding...' : 'Add Medicine'}
                </button>
              </div>
            </form>

            <div style={{
              padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              color: '#64748b', fontSize: 13,
            }}>
              <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
              This medicine will be added to your clinic's medicine list for future use.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}