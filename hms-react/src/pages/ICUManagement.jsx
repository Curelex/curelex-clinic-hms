// hms-react/src/pages/ICUManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, Btn, Modal, Input, Select, Badge, SectionHeader, Empty, Alert } from '../components/UI';
import toast from 'react-hot-toast';

const ICU_BED_TYPES = ['General ICU', 'Cardiac ICU', 'Pediatric ICU', 'Neuro ICU', 'Surgical ICU', 'Medical ICU'];
const ICU_BED_STATUS = ['Available', 'Occupied', 'Maintenance', 'Reserved', 'Cleaning'];
const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe', 'Critical'];
const VENTILATOR_MODES = ['SIMV', 'PSV', 'CPAP', 'PRVC', 'BiPAP', 'HFNC', 'Other'];

export default function ICUManagement() {
  const { hasPerm, user, getEffectiveClinicId } = useAuth();
  const navigate = useNavigate();
  const clinicId = getEffectiveClinicId() || 'default';

  const [activeTab, setActiveTab] = useState('beds');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Beds ──
  const [beds, setBeds] = useState([]);
  const [showBedModal, setShowBedModal] = useState(false);
  const [editingBed, setEditingBed] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomLoading, setRoomLoading] = useState(false);
  const [bedForm, setBedForm] = useState({
    bedNumber: '',
    roomNumber: '',
    bedType: 'General ICU',
    status: 'Available',
    baseDailyRate: 4000,
    ventilatorRate: 1500,
    monitoringRate: 500,
  });

  // ── Admissions ──
  const [admissions, setAdmissions] = useState([]);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [admitForm, setAdmitForm] = useState({
    patientId: '',
    bedId: '',
    reasonForICU: '',
    diagnosis: '',
    severity: 'Moderate',
    attendingDoctor: '',
    assignedReceptionist: '',
    notes: '',
  });

  // ── Vitals ──
  const [vitals, setVitals] = useState([]);
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitalForm, setVitalForm] = useState({
    heartRate: '',
    systolicBP: '',
    diastolicBP: '',
    spo2: '',
    temperature: '',
    respiratoryRate: '',
    gcsEye: '',
    gcsVerbal: '',
    gcsMotor: '',
    rassScore: '',
    painScore: '',
    urineOutput: '',
    notes: '',
  });

  // ── Ventilator ──
  const [ventilatorLogs, setVentilatorLogs] = useState([]);
  const [showVentilatorModal, setShowVentilatorModal] = useState(false);
  const [ventilatorForm, setVentilatorForm] = useState({
    patientId: '',
    bedId: '',
    mode: 'SIMV',
    fio2: 40,
    peep: 5,
    tidalVolume: 500,
    rate: 14,
    pressureSupport: 8,
    notes: '',
  });

  // ── Stats ──
  const [stats, setStats] = useState(null);

  // ── Dropdown data ──
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [receptionists, setReceptionists] = useState([]);

  const canManage = hasPerm('admin') || hasPerm('super_admin');

  // ── Fetch Functions ──

  const fetchBeds = useCallback(async () => {
    try {
      const res = await API.get(`/icu/beds?clinicId=${clinicId}`);
      setBeds(res.data.beds || []);
    } catch (err) {
      console.error('Failed to fetch beds:', err);
      setError('Failed to load ICU beds');
    }
  }, [clinicId]);

  const fetchAdmissions = useCallback(async () => {
    try {
      const res = await API.get(`/icu/admissions/active?clinicId=${clinicId}`);
      setAdmissions(res.data.admissions || []);
    } catch (err) {
      console.error('Failed to fetch admissions:', err);
    }
  }, [clinicId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get(`/icu/stats?clinicId=${clinicId}`);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [clinicId]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [patientsRes, staffRes] = await Promise.all([
        API.get(`/patients?limit=100&clinicId=${clinicId}`),
        API.get(`/staff?clinicId=${clinicId}`)
      ]);
      setPatients(patientsRes.data.patients || []);
      const allStaff = staffRes.data || [];
      setStaff(allStaff);
      setReceptionists(allStaff.filter(s => s.role === 'receptionist'));
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err);
    }
  }, [clinicId]);

  // ── Fetch available rooms ──
  const fetchAvailableRooms = useCallback(async () => {
    setRoomLoading(true);
    try {
      const res = await API.get(`/icu/rooms?clinicId=${clinicId}`);
      console.log('📡 Available rooms:', res.data);
      setAvailableRooms(res.data.rooms || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      toast.error('Failed to load available rooms');
    } finally {
      setRoomLoading(false);
    }
  }, [clinicId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchBeds(),
      fetchAdmissions(),
      fetchStats(),
      fetchDropdownData()
    ]);
    setLoading(false);
  }, [fetchBeds, fetchAdmissions, fetchStats, fetchDropdownData]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Bed CRUD ──

  const openBedModal = () => {
    resetBedForm();
    setEditingBed(null);
    fetchAvailableRooms();
    setShowBedModal(true);
  };

  const handleCreateBed = async () => {
    // Validate room selection
    if (!bedForm.roomNumber) {
      toast.error('Please select a room number');
      return;
    }

    try {
      await API.post('/icu/beds', { ...bedForm, clinicId });
      toast.success('ICU Bed created successfully');
      setShowBedModal(false);
      resetBedForm();
      fetchBeds();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create bed');
    }
  };

  const handleUpdateBed = async () => {
    try {
      await API.put(`/icu/beds/${editingBed._id}`, { ...bedForm, clinicId });
      toast.success('Bed updated successfully');
      setShowBedModal(false);
      resetBedForm();
      fetchBeds();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bed');
    }
  };

  const handleDeleteBed = async (bedId) => {
    if (!window.confirm('Are you sure you want to delete this bed?')) return;
    try {
      await API.delete(`/icu/beds/${bedId}?clinicId=${clinicId}`);
      toast.success('Bed deleted');
      fetchBeds();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete bed');
    }
  };

  const handleUpdateBedStatus = async (bedId, status) => {
    try {
      await API.patch(`/icu/beds/${bedId}/status`, { status, clinicId });
      toast.success(`Bed status updated to ${status}`);
      fetchBeds();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Admission ──

  const handleAdmitPatient = async () => {
    try {
      const payload = { ...admitForm, clinicId };
      await API.post('/icu/admit', payload);
      toast.success('Patient admitted to ICU successfully');
      setShowAdmitModal(false);
      resetAdmitForm();
      fetchAdmissions();
      fetchBeds();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to admit patient');
    }
  };

  const handleDischarge = async (admissionId) => {
    if (!window.confirm('Are you sure you want to discharge this patient from ICU?')) return;
    try {
      const res = await API.post(`/icu/discharge/${admissionId}?clinicId=${clinicId}`);
      toast.success('Patient discharged from ICU');
      if (res.data.charges) {
        toast.success(`Total ICU Charges: ₹${res.data.charges.total.toLocaleString()}`);
      }
      fetchAdmissions();
      fetchBeds();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discharge patient');
    }
  };

  // ── Vitals ──

  const handleLogVitals = async () => {
    try {
      const payload = {
        ...vitalForm,
        patientId: selectedPatient?.patient?._id || selectedPatient?.patient,
        bedId: selectedPatient?.icuBedId?._id || selectedPatient?.icuBedId,
        clinicId,
      };
      await API.post('/icu/vitals', payload);
      toast.success('Vitals logged successfully');
      setShowVitalModal(false);
      resetVitalForm();
      fetchAdmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log vitals');
    }
  };

  // ── Ventilator ──

  const handleStartVentilator = async () => {
    try {
      const payload = { ...ventilatorForm, clinicId };
      await API.post('/icu/ventilator/start', payload);
      toast.success('Ventilator started successfully');
      setShowVentilatorModal(false);
      resetVentilatorForm();
      fetchAdmissions();
      fetchBeds();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start ventilator');
    }
  };

  const handleStopVentilator = async (admission) => {
    if (!window.confirm('Are you sure you want to stop the ventilator?')) return;
    
    try {
      const patientId = admission.patient?._id || admission.patient;
      
      console.log('🔍 Stopping ventilator for patient:', patientId);
      
      const res = await API.get(`/icu/ventilator/patient/${patientId}?clinicId=${clinicId}`);
      console.log('📡 Ventilator logs response:', res.data);
      
      const logs = res.data.logs || [];
      const activeLog = logs.find(log => log.isActive === true);
      
      if (!activeLog) {
        toast.error('No active ventilator found for this patient');
        return;
      }
      
      console.log('✅ Found active ventilator log:', activeLog._id);
      
      await API.post(`/icu/ventilator/stop/${activeLog._id}?clinicId=${clinicId}`);
      
      toast.success('Ventilator stopped successfully');
      
      await Promise.all([
        fetchAdmissions(),
        fetchBeds(),
        fetchStats()
      ]);
      
    } catch (err) {
      console.error('Failed to stop ventilator:', err);
      const errorMsg = err.response?.data?.message || 'Failed to stop ventilator';
      toast.error(errorMsg);
    }
  };

  // ── Reset Functions ──

  const resetBedForm = () => {
    setBedForm({
      bedNumber: '',
      roomNumber: '',
      bedType: 'General ICU',
      status: 'Available',
      baseDailyRate: 4000,
      ventilatorRate: 1500,
      monitoringRate: 500,
    });
    setEditingBed(null);
  };

  const resetAdmitForm = () => {
    setAdmitForm({
      patientId: '',
      bedId: '',
      reasonForICU: '',
      diagnosis: '',
      severity: 'Moderate',
      attendingDoctor: '',
      assignedReceptionist: '',
      notes: '',
    });
  };

  const resetVitalForm = () => {
    setVitalForm({
      heartRate: '',
      systolicBP: '',
      diastolicBP: '',
      spo2: '',
      temperature: '',
      respiratoryRate: '',
      gcsEye: '',
      gcsVerbal: '',
      gcsMotor: '',
      rassScore: '',
      painScore: '',
      urineOutput: '',
      notes: '',
    });
  };

  const resetVentilatorForm = () => {
    setVentilatorForm({
      patientId: '',
      bedId: '',
      mode: 'SIMV',
      fio2: 40,
      peep: 5,
      tidalVolume: 500,
      rate: 14,
      pressureSupport: 8,
      notes: '',
    });
  };

  // ── Helpers ──

  const getStatusColor = (status) => {
    const map = {
      Available: '#16a34a',
      Occupied: '#dc2626',
      Maintenance: '#f59e0b',
      Reserved: '#3b82f6',
      Cleaning: '#8b5cf6',
    };
    return map[status] || '#64748b';
  };

  const getSeverityColor = (severity) => {
    const map = {
      Mild: '#16a34a',
      Moderate: '#f59e0b',
      Severe: '#f97316',
      Critical: '#dc2626',
    };
    return map[severity] || '#64748b';
  };

  const doctors = staff.filter(s => s.role === 'doctor' || s.role === 'separate_doctor');

  // ── Render ──

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
          <div style={{ color: '#64748b' }}>Loading ICU Management...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>🏥 ICU Management</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage ICU beds, patient admissions, vitals monitoring, and ventilator tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canManage && (
            <Btn onClick={openBedModal}>
              ➕ Add Bed
            </Btn>
          )}
          <Btn onClick={() => { resetAdmitForm(); setShowAdmitModal(true); }}>
            🏥 Admit Patient
          </Btn>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Beds" value={stats.totalBeds || 0} icon="🛏️" color="#dbeafe" />
          <StatCard label="Available" value={stats.availableBeds || 0} icon="🟢" color="#d1fae5" />
          <StatCard label="Occupied" value={stats.occupiedBeds || 0} icon="🔴" color="#fee2e2" />
          <StatCard label="Occupancy Rate" value={`${stats.occupancyRate || 0}%`} icon="📊" color="#fef3c7" />
          <StatCard label="Active Ventilators" value={stats.activeVentilators || 0} icon="💨" color="#ede9fe" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {[
          { key: 'beds', label: '🛏️ Beds' },
          { key: 'admissions', label: '🏥 Active Admissions' },
          { key: 'vitals', label: '📊 Vitals' },
          { key: 'ventilator', label: '💨 Ventilators' },
          { key: 'equipment', label: '🔧 Equipment' }, 
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === tab.key ? '#0f4c81' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#64748b',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'beds' && (
        <BedTab
          beds={beds}
          onEdit={(bed) => { setEditingBed(bed); setBedForm(bed); fetchAvailableRooms(); setShowBedModal(true); }}
          onDelete={handleDeleteBed}
          onStatusChange={handleUpdateBedStatus}
          canManage={canManage}
        />
      )}

      {activeTab === 'admissions' && (
        <AdmissionsTab
          admissions={admissions}
          onDischarge={handleDischarge}
          onLogVitals={(admission) => { setSelectedPatient(admission); setShowVitalModal(true); }}
          onStartVentilator={(admission) => { 
            setVentilatorForm({ ...ventilatorForm, patientId: admission.patient?._id, bedId: admission.icuBedId?._id });
            setShowVentilatorModal(true);
          }}
          onStopVentilator={handleStopVentilator}
          canManage={canManage}
        />
      )}

      {activeTab === 'vitals' && (
        <VitalsTab
          admissions={admissions}
          onSelectPatient={(admission) => { setSelectedPatient(admission); setShowVitalModal(true); }}
        />
      )}

      {activeTab === 'ventilator' && (
        <VentilatorTab
          admissions={admissions}
          onStartVentilator={(admission) => {
            setVentilatorForm({ ...ventilatorForm, patientId: admission.patient?._id, bedId: admission.icuBedId?._id });
            setShowVentilatorModal(true);
          }}
          onStopVentilator={handleStopVentilator}
          canManage={canManage}
        />
      )}

      {activeTab === 'equipment' && (
  <EquipmentTab
    beds={beds}
    onRefresh={fetchAll}
    canManage={canManage}
    clinicId={clinicId}
  />
)}

      {/* ── Bed Modal with Room Dropdown ── */}
      {showBedModal && (
        <Modal title={editingBed ? 'Edit ICU Bed' : 'Add ICU Bed'} onClose={() => { setShowBedModal(false); resetBedForm(); }} width={550}>
          <form onSubmit={(e) => { e.preventDefault(); editingBed ? handleUpdateBed() : handleCreateBed(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Bed Number *"
                value={bedForm.bedNumber}
                onChange={e => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                required
                placeholder="e.g., ICU-001"
              />
              
              {/* ── Room Selection Dropdown ── */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: '#4a6278', display: 'block', marginBottom: 4 }}>
                  Room Number *
                </label>
                <select
                  value={bedForm.roomNumber}
                  onChange={e => setBedForm({ ...bedForm, roomNumber: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #d0dce8',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    color: bedForm.roomNumber ? '#0a3d62' : '#8fa8bc',
                    background: '#fff',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  disabled={roomLoading}
                >
                  <option value="">{roomLoading ? 'Loading rooms...' : 'Select Room'}</option>
                  {availableRooms.length === 0 && !roomLoading && (
                    <option value="" disabled>No rooms available</option>
                  )}
                  {availableRooms.map(room => (
                    <option 
                      key={room.roomNumber} 
                      value={room.roomNumber}
                      style={{ 
                        color: room.isAvailable ? '#0a3d62' : '#94a3b8',
                        fontStyle: room.isAvailable ? 'normal' : 'italic'
                      }}
                    >
                      {room.roomNumber} {!room.isAvailable && '🔴 (Occupied)'}
                      {room.dailyRate && ` - ₹${room.dailyRate}/day`}
                    </option>
                  ))}
                </select>
                {roomLoading && (
                  <div style={{ fontSize: 11, color: '#1565a8', marginTop: 4 }}>⏳ Loading rooms...</div>
                )}
                {availableRooms.length > 0 && !roomLoading && (
                  <div style={{ fontSize: 11, color: '#8fa8bc', marginTop: 4 }}>
                    {availableRooms.filter(r => r.isAvailable).length} rooms available
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Select
                label="Bed Type"
                value={bedForm.bedType}
                onChange={e => setBedForm({ ...bedForm, bedType: e.target.value })}
              >
                {ICU_BED_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </Select>
              <Select
                label="Status"
                value={bedForm.status}
                onChange={e => setBedForm({ ...bedForm, status: e.target.value })}
              >
                {ICU_BED_STATUS.map(status => <option key={status} value={status}>{status}</option>)}
              </Select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
              <Input
                label="Base Daily Rate (₹)"
                type="number"
                value={bedForm.baseDailyRate}
                onChange={e => setBedForm({ ...bedForm, baseDailyRate: Number(e.target.value) })}
              />
              <Input
                label="Ventilator Rate (₹)"
                type="number"
                value={bedForm.ventilatorRate}
                onChange={e => setBedForm({ ...bedForm, ventilatorRate: Number(e.target.value) })}
              />
              <Input
                label="Monitoring Rate (₹)"
                type="number"
                value={bedForm.monitoringRate}
                onChange={e => setBedForm({ ...bedForm, monitoringRate: Number(e.target.value) })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Btn variant="ghost" onClick={() => { setShowBedModal(false); resetBedForm(); }}>Cancel</Btn>
              <Btn type="submit">{editingBed ? 'Update' : 'Create'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Admit Modal ── */}
      {showAdmitModal && (
        <Modal title="Admit Patient to ICU" onClose={() => { setShowAdmitModal(false); resetAdmitForm(); }} width={600}>
          <form onSubmit={(e) => { e.preventDefault(); handleAdmitPatient(); }}>
            <Select
              label="Patient *"
              value={admitForm.patientId}
              onChange={e => setAdmitForm({ ...admitForm, patientId: e.target.value })}
              required
            >
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}
            </Select>
            
            <Select
              label="ICU Bed *"
              value={admitForm.bedId}
              onChange={e => setAdmitForm({ ...admitForm, bedId: e.target.value })}
              required
            >
              <option value="">Select Bed</option>
              {beds.filter(b => b.status === 'Available').map(b => (
                <option key={b._id} value={b._id}>
                  {b.bedNumber} - {b.roomNumber} ({b.bedType})
                </option>
              ))}
            </Select>
            
            <Input
              label="Reason for ICU *"
              value={admitForm.reasonForICU}
              onChange={e => setAdmitForm({ ...admitForm, reasonForICU: e.target.value })}
              required
              placeholder="e.g., Severe pneumonia, Respiratory failure"
            />
            <Input
              label="Diagnosis"
              value={admitForm.diagnosis}
              onChange={e => setAdmitForm({ ...admitForm, diagnosis: e.target.value })}
              placeholder="e.g., COVID-19 with ARDS"
            />
            <Select
              label="Severity"
              value={admitForm.severity}
              onChange={e => setAdmitForm({ ...admitForm, severity: e.target.value })}
            >
              {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select
              label="Attending Doctor"
              value={admitForm.attendingDoctor}
              onChange={e => setAdmitForm({ ...admitForm, attendingDoctor: e.target.value })}
            >
              <option value="">Select Doctor</option>
              {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </Select>
            <Select
              label="Assigned Receptionist (Nurse Duties)"
              value={admitForm.assignedReceptionist}
              onChange={e => setAdmitForm({ ...admitForm, assignedReceptionist: e.target.value })}
            >
              <option value="">Select Receptionist</option>
              {receptionists.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </Select>
            <Input
              label="Notes"
              value={admitForm.notes}
              onChange={e => setAdmitForm({ ...admitForm, notes: e.target.value })}
              placeholder="Additional notes..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Btn variant="ghost" onClick={() => { setShowAdmitModal(false); resetAdmitForm(); }}>Cancel</Btn>
              <Btn type="submit">Admit Patient</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Vital Modal ── */}
      {showVitalModal && (
        <Modal title="Log Patient Vitals" onClose={() => { setShowVitalModal(false); resetVitalForm(); }} width={600}>
          <form onSubmit={(e) => { e.preventDefault(); handleLogVitals(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Heart Rate (bpm)" type="number" value={vitalForm.heartRate} onChange={e => setVitalForm({ ...vitalForm, heartRate: e.target.value })} />
              <Input label="SpO2 (%)" type="number" value={vitalForm.spo2} onChange={e => setVitalForm({ ...vitalForm, spo2: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Systolic BP" type="number" value={vitalForm.systolicBP} onChange={e => setVitalForm({ ...vitalForm, systolicBP: e.target.value })} />
              <Input label="Diastolic BP" type="number" value={vitalForm.diastolicBP} onChange={e => setVitalForm({ ...vitalForm, diastolicBP: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Temperature (°C)" type="number" step="0.1" value={vitalForm.temperature} onChange={e => setVitalForm({ ...vitalForm, temperature: e.target.value })} />
              <Input label="Respiratory Rate" type="number" value={vitalForm.respiratoryRate} onChange={e => setVitalForm({ ...vitalForm, respiratoryRate: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="GCS Eye (1-4)" type="number" min="1" max="4" value={vitalForm.gcsEye} onChange={e => setVitalForm({ ...vitalForm, gcsEye: e.target.value })} />
              <Input label="GCS Verbal (1-5)" type="number" min="1" max="5" value={vitalForm.gcsVerbal} onChange={e => setVitalForm({ ...vitalForm, gcsVerbal: e.target.value })} />
              <Input label="GCS Motor (1-6)" type="number" min="1" max="6" value={vitalForm.gcsMotor} onChange={e => setVitalForm({ ...vitalForm, gcsMotor: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="RASS Score (-5 to 4)" type="number" min="-5" max="4" value={vitalForm.rassScore} onChange={e => setVitalForm({ ...vitalForm, rassScore: e.target.value })} />
              <Input label="Pain Score (0-10)" type="number" min="0" max="10" value={vitalForm.painScore} onChange={e => setVitalForm({ ...vitalForm, painScore: e.target.value })} />
            </div>
            <Input label="Urine Output (ml)" type="number" value={vitalForm.urineOutput} onChange={e => setVitalForm({ ...vitalForm, urineOutput: e.target.value })} />
            <Input label="Notes" value={vitalForm.notes} onChange={e => setVitalForm({ ...vitalForm, notes: e.target.value })} placeholder="Additional notes..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Btn variant="ghost" onClick={() => { setShowVitalModal(false); resetVitalForm(); }}>Cancel</Btn>
              <Btn type="submit">Log Vitals</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Ventilator Modal ── */}
      {showVentilatorModal && (
        <Modal title="Start Ventilator" onClose={() => { setShowVentilatorModal(false); resetVentilatorForm(); }} width={550}>
          <form onSubmit={(e) => { e.preventDefault(); handleStartVentilator(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="Mode *" value={ventilatorForm.mode} onChange={e => setVentilatorForm({ ...ventilatorForm, mode: e.target.value })} required>
                {VENTILATOR_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
              <Input label="FiO2 (%)" type="number" min="21" max="100" value={ventilatorForm.fio2} onChange={e => setVentilatorForm({ ...ventilatorForm, fio2: Number(e.target.value) })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="PEEP (cmH2O)" type="number" min="0" max="30" value={ventilatorForm.peep} onChange={e => setVentilatorForm({ ...ventilatorForm, peep: Number(e.target.value) })} />
              <Input label="Tidal Volume (ml)" type="number" value={ventilatorForm.tidalVolume} onChange={e => setVentilatorForm({ ...ventilatorForm, tidalVolume: Number(e.target.value) })} />
              <Input label="Rate (breaths/min)" type="number" value={ventilatorForm.rate} onChange={e => setVentilatorForm({ ...ventilatorForm, rate: Number(e.target.value) })} />
            </div>
            <Input label="Pressure Support (cmH2O)" type="number" value={ventilatorForm.pressureSupport} onChange={e => setVentilatorForm({ ...ventilatorForm, pressureSupport: Number(e.target.value) })} />
            <Input label="Notes" value={ventilatorForm.notes} onChange={e => setVentilatorForm({ ...ventilatorForm, notes: e.target.value })} placeholder="Additional notes..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Btn variant="ghost" onClick={() => { setShowVentilatorModal(false); resetVentilatorForm(); }}>Cancel</Btn>
              <Btn type="submit">Start Ventilator</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Stat Card Component ──
function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card" style={{ 
      background: '#fff', 
      borderRadius: 12, 
      padding: '16px 18px', 
      border: '1px solid #e8edf2',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div className="stat-icon" style={{ 
        background: color, 
        borderRadius: 10, 
        width: 40, 
        height: 40, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: 18 
      }}>
        <span>{icon}</span>
      </div>
      <div>
        <div className="stat-label" style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</div>
        <div className="stat-value" style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      </div>
    </div>
  );
}

// ── Bed Tab ──
function BedTab({ beds, onEdit, onDelete, onStatusChange, canManage }) {
  const [expandedBeds, setExpandedBeds] = useState({});

  const toggleExpand = (bedId) => {
    setExpandedBeds(prev => ({ ...prev, [bedId]: !prev[bedId] }));
  };

  // Get status color for badge
  const getStatusColor = (status) => {
    const map = {
      Available: '#16a34a',
      Occupied: '#dc2626',
      Maintenance: '#f59e0b',
      Reserved: '#3b82f6',
      Cleaning: '#8b5cf6',
    };
    return map[status] || '#64748b';
  };

  // Get equipment icon
  const getEquipmentIcon = (type) => {
    const map = {
      'Ventilator': '💨',
      'Monitor': '📺',
      'Infusion Pump': '💉',
      'Dialysis': '🩸',
      'Defibrillator': '⚡',
      'Other': '🔧',
    };
    return map[type] || '🔧';
  };

  if (beds.length === 0) {
    return (
      <Empty 
        icon="🛏️" 
        title="No ICU Beds" 
        desc="Create your first ICU bed to get started." 
      />
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
      {beds.map(bed => {
        const isExpanded = expandedBeds[bed._id];
        const hasEquipment = bed.equipment && bed.equipment.length > 0;
        const hasPatient = bed.patientId !== null;

        return (
          <Card key={bed._id} style={{ 
            border: `2px solid ${getStatusColor(bed.status)}30`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Status Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: getStatusColor(bed.status),
            }} />

            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              paddingTop: 8,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {bed.bedNumber}
                </h3>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {bed.bedType}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  🏠 Room: {bed.roomNumber}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <Badge color={getStatusColor(bed.status)}>
                  {bed.status}
                </Badge>
                {bed.ventilatorInUse && (
                  <Badge color="#8b5cf6">💨 Ventilator</Badge>
                )}
              </div>
            </div>

            {/* Patient Info (if occupied) */}
            {hasPatient && (
              <div style={{ 
                marginTop: 10, 
                padding: '8px 12px', 
                background: '#f1f5f9', 
                borderRadius: 6,
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  👤 {bed.patientId?.name || 'Unknown Patient'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {bed.patientId?.patientId || 'ID: N/A'}
                </div>
                {bed.assignedDoctor && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Doctor: Dr. {bed.assignedDoctor?.name || 'N/A'}
                  </div>
                )}
                {bed.assignedReceptionist && (
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Receptionist: {bed.assignedReceptionist?.name || 'N/A'}
                  </div>
                )}
              </div>
            )}

            {/* Rates */}
            <div style={{ 
              marginTop: 10, 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: 6, 
              fontSize: 12, 
              color: '#64748b',
              background: '#f8fafc',
              padding: '8px 10px',
              borderRadius: 6,
            }}>
              <span>💰 ₹{bed.baseDailyRate || 0}/day</span>
              <span>💨 ₹{bed.ventilatorRate || 0}/day</span>
              <span>📊 ₹{bed.monitoringRate || 0}/day</span>
            </div>

            {/* Quick Status */}
            <div style={{ 
              marginTop: 8, 
              display: 'flex', 
              gap: 12, 
              fontSize: 11, 
              color: '#94a3b8',
              flexWrap: 'wrap',
            }}>
              <span>🕒 {bed.admissionDate ? `Admitted: ${new Date(bed.admissionDate).toLocaleDateString()}` : 'Not admitted'}</span>
              {bed.lastVitalTime && (
                <span>📊 Last vitals: {new Date(bed.lastVitalTime).toLocaleTimeString()}</span>
              )}
            </div>

            {/* Equipment Section */}
            <div style={{ marginTop: 10 }}>
              <div 
                onClick={() => toggleExpand(bed._id)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '4px 0',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>🔧</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                    Equipment {hasEquipment ? `(${bed.equipment.length})` : '(None)'}
                  </span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
                {hasEquipment && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {bed.equipment.slice(0, 3).map((equip, idx) => (
                      <span key={idx} style={{ fontSize: 10, color: '#64748b' }}>
                        {getEquipmentIcon(equip.type)} {equip.name}
                      </span>
                    ))}
                    {bed.equipment.length > 3 && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        +{bed.equipment.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Equipment List */}
              {isExpanded && (
                <div style={{ 
                  marginTop: 8, 
                  padding: '8px 10px', 
                  background: '#f8fafc', 
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  maxHeight: 150,
                  overflowY: 'auto',
                }}>
                  {hasEquipment ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {bed.equipment.map((equip, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          padding: '4px 8px',
                          background: '#fff',
                          borderRadius: 4,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                        }}>
                          <span>{getEquipmentIcon(equip.type)}</span>
                          <span style={{ fontWeight: 500 }}>{equip.name}</span>
                          {equip.serialNumber && (
                            <span style={{ color: '#64748b', fontSize: 11 }}>
                              SN: {equip.serialNumber}
                            </span>
                          )}
                          <span style={{ 
                            fontSize: 10, 
                            color: equip.isActive ? '#16a34a' : '#dc2626',
                            marginLeft: 'auto',
                          }}>
                            {equip.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>
                            {new Date(equip.assignedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>
                      No equipment assigned to this bed
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Actions */}
            {canManage && (
              <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <select
                  value={bed.status}
                  onChange={e => onStatusChange(bed._id, e.target.value)}
                  style={{ 
                    padding: '5px 10px', 
                    borderRadius: 6, 
                    border: '1px solid #d1d5db', 
                    fontSize: 12, 
                    flex: 1,
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {['Available', 'Occupied', 'Maintenance', 'Reserved', 'Cleaning'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button 
                  onClick={() => onEdit(bed)} 
                  style={{ 
                    padding: '5px 12px', 
                    background: '#dbeafe', 
                    color: '#1e40af', 
                    border: 'none', 
                    borderRadius: 6, 
                    cursor: 'pointer', 
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => {
                    if (bed.status === 'Occupied') {
                      if (!window.confirm('This bed is occupied. Are you sure you want to delete it?')) return;
                    }
                    onDelete(bed._id);
                  }} 
                  style={{ 
                    padding: '5px 12px', 
                    background: '#fee2e2', 
                    color: '#dc2626', 
                    border: 'none', 
                    borderRadius: 6, 
                    cursor: 'pointer', 
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  🗑️
                </button>
              </div>
            )}

            {/* Occupied Warning */}
            {bed.status === 'Occupied' && !hasPatient && (
              <div style={{ 
                marginTop: 8, 
                padding: '6px 12px', 
                background: '#fef3c7', 
                borderRadius: 6, 
                fontSize: 12, 
                color: '#92400e',
              }}>
                ⚠️ Bed is marked as Occupied but no patient assigned
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}


function AdmissionsTab({ admissions, onDischarge, onLogVitals, onStartVentilator, onStopVentilator, canManage }) {
  const [expandedVitals, setExpandedVitals] = useState({});
  
  // ── Toggle vitals expansion ──
  const toggleVitals = (admissionId) => {
    setExpandedVitals(prev => ({ ...prev, [admissionId]: !prev[admissionId] }));
  };

  if (admissions.length === 0) {
    return <Empty icon="🏥" title="No Active Admissions" desc="No patients currently admitted to ICU." />;
  }
  console.log("ad", admissions);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {admissions.map(admission => (
        <Card key={admission._id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>👤 {admission.patient?.name}</h3>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {admission.patient?.patientId} · {admission.icuBedId?.bedNumber} ({admission.icuBedId?.bedType})
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                <Badge color={getSeverityColor(admission.severity)}>{admission.severity}</Badge>
                {admission.ventilatorUsed ? (
                  <Badge color="#8b5cf6" style={{ marginLeft: 6 }}>💨 Ventilator Active</Badge>
                ) : (
                  <Badge color="#94a3b8" style={{ marginLeft: 6 }}>💨 No Ventilator</Badge>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Admitted: {new Date(admission.icuAdmissionDate || admission.admissionDate).toLocaleDateString()} · {admission.reasonForICU}
              </div>
              {admission.doctor && (
                <div style={{ fontSize: 12, color: '#64748b' }}>Doctor: Dr. {admission.doctor?.name}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {canManage && (
                <>
                  <button
                    onClick={() => onLogVitals(admission)}
                    style={{ padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >
                    📊 Log Vitals
                  </button>
                  {!admission.ventilatorUsed ? (
                    <button
                      onClick={() => onStartVentilator(admission)}
                      style={{ padding: '6px 12px', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                    >
                      💨 Start Vent
                    </button>
                  ) : (
                    <button 
                      onClick={() => onStopVentilator(admission)}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                    >
                      ⏹️ Stop Vent
                    </button>
                  )}
                  <button
                    onClick={() => onDischarge(admission._id)}
                    style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >
                    📤 Discharge
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* ── Vitals Section ── */}
          <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div 
              onClick={() => toggleVitals(admission._id)}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>📊</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  Vitals {expandedVitals[admission._id] ? '▼' : '▶'}
                </span>
                {admission.latestVitals && (
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Latest: {new Date(admission.latestVitals.createdAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {admission.latestVitals && (
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
                  <span>HR: <strong style={{ color: '#1e293b' }}>{admission.latestVitals.heartRate || '-'}</strong></span>
                  <span>BP: <strong style={{ color: '#1e293b' }}>{admission.latestVitals.systolicBP}/{admission.latestVitals.diastolicBP || '-'}</strong></span>
                  <span>SpO2: <strong style={{ color: '#1e293b' }}>{admission.latestVitals.spo2 || '-'}%</strong></span>
                </div>
              )}
            </div>
            
            {expandedVitals[admission._id] && (
              <div style={{ marginTop: 10 }}>
                <VitalsList patientId={admission.patient?._id} clinicId={admission.clinicId} />
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Vitals List Component ──
function VitalsList({ patientId, clinicId }) {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVitals = async () => {
      try {
        const res = await API.get(`/icu/vitals/patient/${patientId}?clinicId=${clinicId}&limit=20`);
        setVitals(res.data.vitals || []);
      } catch (err) {
        console.error('Failed to fetch vitals:', err);
        setError('Failed to load vitals');
      } finally {
        setLoading(false);
      }
    };
    fetchVitals();
  }, [patientId, clinicId]);

  if (loading) {
    return <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0' }}>Loading vitals...</div>;
  }

  if (error) {
    return <div style={{ fontSize: 12, color: '#dc2626', padding: '8px 0' }}>{error}</div>;
  }

  if (vitals.length === 0) {
    return <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>No vitals recorded yet</div>;
  }

  return (
    <div style={{ 
      maxHeight: 300, 
      overflowY: 'auto',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
            {['Time', 'HR', 'BP', 'SpO2', 'Temp', 'RR', 'GCS', 'RASS', 'Pain', 'By'].map(h => (
              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vitals.map((v, idx) => (
            <tr key={v._id || idx} style={{ borderBottom: idx < vitals.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <td style={{ padding: '6px 8px', color: '#64748b', fontSize: 11 }}>
                {new Date(v.createdAt).toLocaleTimeString()}
              </td>
              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{v.heartRate || '-'}</td>
              <td style={{ padding: '6px 8px' }}>{v.systolicBP}/{v.diastolicBP || '-'}</td>
              <td style={{ padding: '6px 8px' }}>{v.spo2 || '-'}%</td>
              <td style={{ padding: '6px 8px' }}>{v.temperature || '-'}°C</td>
              <td style={{ padding: '6px 8px' }}>{v.respiratoryRate || '-'}</td>
              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{v.gcsTotal || '-'}</td>
              <td style={{ padding: '6px 8px' }}>{v.rassScore || '-'}</td>
              <td style={{ padding: '6px 8px' }}>{v.painScore || '-'}</td>
              <td style={{ padding: '6px 8px', color: '#64748b', fontSize: 11 }}>{v.loggedByName || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Vitals Tab ──
function VitalsTab({ admissions, onSelectPatient }) {
  return (
    <div>
      <Card>
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: 0 }}>📊 Patient Vitals</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Select a patient to log or view vitals</p>
        </div>
        <div style={{ padding: 16 }}>
          {admissions.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center' }}>No active ICU patients</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {admissions.map(admission => (
                <button
                  key={admission._id}
                  onClick={() => onSelectPatient(admission)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0f4c81'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ fontWeight: 600 }}>{admission.patient?.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{admission.patient?.patientId}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Bed: {admission.icuBedId?.bedNumber}</div>
                  <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 4 }}>Click to log vitals →</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Ventilator Tab ──
function VentilatorTab({ admissions, onStartVentilator, onStopVentilator, canManage }) {
  const activeVentilatorPatients = admissions.filter(a => a.ventilatorUsed === true);

  return (
    <div>
      {activeVentilatorPatients.length === 0 ? (
        <Empty icon="💨" title="No Active Ventilators" desc="No patients currently on ventilator support." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeVentilatorPatients.map(admission => (
            <Card key={admission._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>👤 {admission.patient?.name}</h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {admission.patient?.patientId} · Bed: {admission.icuBedId?.bedNumber}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    💨 Ventilator started: {admission.ventilatorStartDate ? new Date(admission.ventilatorStartDate).toLocaleString() : 'N/A'}
                  </div>
                  <Badge color="#8b5cf6">Active</Badge>
                </div>
                {canManage && (
                  <button
                    onClick={() => onStopVentilator(admission)}
                    style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    ⏹️ Stop Ventilator
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──
function getStatusColor(status) {
  const map = {
    Available: '#16a34a',
    Occupied: '#dc2626',
    Maintenance: '#f59e0b',
    Reserved: '#3b82f6',
    Cleaning: '#8b5cf6',
  };
  return map[status] || '#64748b';
}

function getSeverityColor(severity) {
  const map = {
    Mild: '#16a34a',
    Moderate: '#f59e0b',
    Severe: '#f97316',
    Critical: '#dc2626',
  };
  return map[severity] || '#64748b';
}


// ── Equipment Tab Component ──
function EquipmentTab({ beds, onRefresh, canManage, clinicId }) {
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch available equipment
  const fetchAvailableEquipment = async () => {
    try {
      const res = await API.get(`/icu/equipment/available?clinicId=${clinicId}`);
      setAvailableEquipment(res.data.equipment || []);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
      toast.error('Failed to load equipment');
    }
  };

  // Assign equipment to bed
  const handleAssignEquipment = async () => {
    if (!selectedBed || !selectedEquipment) {
      toast.error('Please select bed and equipment');
      return;
    }

    setLoading(true);
    try {
      await API.post('/icu/equipment/assign', {
        bedId: selectedBed,
        inventoryId: selectedEquipment,
        clinicId,
      });
      toast.success('Equipment assigned successfully');
      setShowAssignModal(false);
      onRefresh();
      fetchAvailableEquipment();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign equipment');
    } finally {
      setLoading(false);
    }
  };

  // Remove equipment from bed
  const handleRemoveEquipment = async (bedId, equipmentId) => {
    if (!window.confirm('Remove this equipment from the bed?')) return;
    try {
      await API.delete(`/icu/equipment/remove/${bedId}/${equipmentId}?clinicId=${clinicId}`);
      toast.success('Equipment removed');
      onRefresh();
      fetchAvailableEquipment();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove equipment');
    }
  };

  // Get beds with equipment
  const bedsWithEquipment = beds.filter(b => b.equipment && b.equipment.length > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🔧 ICU Equipment</h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Manage equipment assigned to ICU beds
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              fetchAvailableEquipment();
              setShowAssignModal(true);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#0f4c81',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ➕ Assign Equipment
          </button>
        )}
      </div>

      {/* Available Equipment Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Available Equipment', value: availableEquipment.length, icon: '🔧', color: '#dbeafe' },
          { label: 'Assigned Equipment', value: bedsWithEquipment.reduce((sum, b) => sum + b.equipment.length, 0), icon: '📦', color: '#ede9fe' },
          { label: 'Beds with Equipment', value: bedsWithEquipment.length, icon: '🛏️', color: '#d1fae5' },
        ].map((stat) => (
          <div key={stat.label} style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: '14px 16px', 
            border: '1px solid #e8edf2',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{ 
              background: stat.color, 
              borderRadius: 10, 
              width: 40, 
              height: 40, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 18 
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Beds with Equipment */}
      {bedsWithEquipment.length === 0 ? (
        <Empty icon="🔧" title="No Equipment Assigned" desc="No equipment has been assigned to ICU beds yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bedsWithEquipment.map(bed => (
            <Card key={bed._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    {bed.bedNumber} - {bed.roomNumber}
                  </h4>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {bed.bedType} · {bed.patientId ? `👤 ${bed.patientId.name}` : 'No patient'}
                  </div>
                </div>
                <Badge color={bed.ventilatorInUse ? '#8b5cf6' : '#94a3b8'}>
                  {bed.ventilatorInUse ? '💨 Ventilator Active' : 'No Ventilator'}
                </Badge>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                  Assigned Equipment ({bed.equipment.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {bed.equipment.map((equip, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                    }}>
                      <span>{equip.type === 'Ventilator' ? '💨' : '🔧'}</span>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{equip.name}</span>
                      {equip.serialNumber && (
                        <span style={{ fontSize: 11, color: '#64748b' }}>SN: {equip.serialNumber}</span>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleRemoveEquipment(bed._id, equip._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: '0 4px',
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Equipment Modal */}
      {showAssignModal && (
        <Modal title="Assign Equipment to Bed" onClose={() => setShowAssignModal(false)} width={500}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Select
              label="ICU Bed *"
              value={selectedBed}
              onChange={e => setSelectedBed(e.target.value)}
              required
            >
              <option value="">Select Bed</option>
              {beds.filter(b => b.status === 'Occupied' || b.status === 'Available').map(b => (
                <option key={b._id} value={b._id}>
                  {b.bedNumber} - {b.roomNumber} ({b.status})
                </option>
              ))}
            </Select>

            <Select
              label="Equipment *"
              value={selectedEquipment}
              onChange={e => setSelectedEquipment(e.target.value)}
              required
            >
              <option value="">Select Equipment</option>
              {availableEquipment.map(e => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.quantity} available) - {e.equipmentDetails?.type || 'General'}
                </option>
              ))}
            </Select>

            {availableEquipment.length === 0 && (
              <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                ⚠️ No equipment available in inventory. Please add equipment first.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setShowAssignModal(false)}>Cancel</Btn>
              <Btn 
                onClick={handleAssignEquipment} 
                disabled={loading || !selectedBed || !selectedEquipment || availableEquipment.length === 0}
              >
                {loading ? 'Assigning...' : 'Assign Equipment'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}