import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { Card, Btn, Modal, Input, Select, Badge, SectionHeader, Empty, Alert } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function OTManagement() {
  const { hasPerm, user } = useAuth();
  
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState(null);

  // Data for dropdowns
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);

  // Fetch surgeries
  const fetchSurgeries = async () => {
    setLoading(true);
    try {
      const res = await API.get('/surgeries', { params: { status: statusFilter } });
      setSurgeries(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load surgeries');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [patientsRes, staffRes] = await Promise.all([
        API.get('/patients'),
        API.get('/staff/doctors')
      ]);
      setPatients(patientsRes.data.patients || patientsRes.data);
      setStaff(staffRes.data.staff || staffRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSurgeries();
  }, [statusFilter]);

  useEffect(() => {
    if (showScheduleModal && patients.length === 0) {
      fetchDropdownData();
    }
  }, [showScheduleModal]);

  const doctors = staff.filter(s => s.role === 'doctor' || s.role === 'separate_doctor');
  
  const canManage = hasPerm('ot-management'); // True for admin, super_admin, doctor

  return (
    <div>
      <SectionHeader 
        title="Operation Theatre Management" 
        subtitle="Schedule and manage surgeries, pre-op checklists, and post-op recovery"
        action={
          canManage && (
            <Btn onClick={() => setShowScheduleModal(true)}>
              ➕ Schedule Surgery
            </Btn>
          )
        }
      />

      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In-Progress">In-Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </Select>
      </div>

      {loading ? (
        <p>Loading surgeries...</p>
      ) : surgeries.length === 0 ? (
        <Empty icon="🏥" title="No surgeries found" desc="Schedule a new surgery to get started." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {surgeries.map(surgery => (
            <Card 
              key={surgery._id} 
              onClick={() => setSelectedSurgery(surgery)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: 16 }}>{surgery.surgeryName}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Patient: {surgery.patientId?.name} | OT: {surgery.operationTheatreNum}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {new Date(surgery.startTime).toLocaleString()} - {new Date(surgery.endTime).toLocaleTimeString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ fontSize: 13 }}>
                  Surgeon: {surgery.surgeonId?.name || 'N/A'}
                </div>
                <StatusBadge status={surgery.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleSurgeryModal 
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            fetchSurgeries();
          }}
          patients={patients}
          setPatients={setPatients}
          doctors={doctors}
        />
      )}

      {/* Management Panel Modal */}
      {selectedSurgery && (
        <SurgeryManagementModal
          surgery={selectedSurgery}
          onClose={() => setSelectedSurgery(null)}
          onUpdate={(updated) => {
            setSelectedSurgery(updated);
            setSurgeries(surgeries.map(s => s._id === updated._id ? updated : s));
          }}
          doctors={doctors}
          canManage={canManage}
        />
      )}
    </div>
  );
}

// ── Status Badge Component ──
function StatusBadge({ status }) {
  const map = {
    'Scheduled': 'blue',
    'In-Progress': 'yellow',
    'Completed': 'green',
    'Cancelled': 'red'
  };
  return <Badge color={map[status] || 'gray'}>{status}</Badge>;
}

// ── Quick Patient Modal ──
function QuickPatientModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', age: '', gender: 'Male', bloodGroup: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.email) payload.email = `${payload.phone}@placeholder.com`;
      const res = await API.post('/patients', payload);
      const newPatient = res.data.patient || res.data;
      toast.success('Patient registered quickly');
      onSuccess(newPatient);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Quick Register Patient" onClose={onClose} width={500}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="Age" type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} style={{ flex: 1 }} />
          <Select label="Gender" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} style={{ flex: 1 }}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
        </div>
        <Select label="Blood Group (Optional)" value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})}>
          <option value="">Select</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </Select>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <Btn variant="secondary" onClick={onClose} type="button">Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? 'Saving...' : 'Register'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Schedule Surgery Modal ──
function ScheduleSurgeryModal({ onClose, onSuccess, patients, setPatients, doctors }) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    surgeryName: '',
    operationTheatreNum: '',
    startTime: '',
    endTime: '',
    surgeonId: '',
    anesthetistId: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await API.post('/surgeries', formData);
      toast.success('Surgery scheduled successfully');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule surgery');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Schedule Surgery" onClose={onClose} width={600}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {error && <Alert type="error">{error}</Alert>}
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Patient</label>
            <a href="#!" onClick={(e) => { e.preventDefault(); setShowQuickAdd(true); }} style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              ➕ New Patient
            </a>
          </div>
          <Select 
            value={formData.patientId} 
            onChange={e => setFormData({...formData, patientId: e.target.value})}
            required
            style={{ width: '100%' }}
          >
            <option value="">Select Patient</option>
            {patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}
          </Select>
        </div>

        {showQuickAdd && (
          <QuickPatientModal 
            onClose={() => setShowQuickAdd(false)}
            onSuccess={(newPatient) => {
              setPatients(prev => [...prev, newPatient]);
              setFormData(prev => ({ ...prev, patientId: newPatient._id }));
              setShowQuickAdd(false);
            }}
          />
        )}

        <Input 
          label="Surgery Name" 
          value={formData.surgeryName}
          onChange={e => setFormData({...formData, surgeryName: e.target.value})}
          required
        />

        <Input 
          label="Operation Theatre (e.g., OT-1)" 
          value={formData.operationTheatreNum}
          onChange={e => setFormData({...formData, operationTheatreNum: e.target.value})}
          required
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <Input 
            label="Start Time" 
            type="datetime-local"
            value={formData.startTime}
            onChange={e => setFormData({...formData, startTime: e.target.value})}
            required
            style={{ flex: 1 }}
          />
          <Input 
            label="End Time" 
            type="datetime-local"
            value={formData.endTime}
            onChange={e => setFormData({...formData, endTime: e.target.value})}
            required
            style={{ flex: 1 }}
          />
        </div>

        <Select 
          label="Surgeon" 
          value={formData.surgeonId} 
          onChange={e => setFormData({...formData, surgeonId: e.target.value})}
          required
        >
          <option value="">Select Surgeon</option>
          {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>

        <Select 
          label="Anesthetist (Optional)" 
          value={formData.anesthetistId} 
          onChange={e => setFormData({...formData, anesthetistId: e.target.value})}
        >
          <option value="">Select Anesthetist</option>
          {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <Btn variant="ghost" onClick={onClose} type="button">Cancel</Btn>
          <Btn disabled={saving} type="submit">{saving ? 'Saving...' : 'Schedule'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ── Surgery Management Modal ──
function SurgeryManagementModal({ surgery, onClose, onUpdate, doctors, canManage }) {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <Modal title={`Manage: ${surgery.surgeryName}`} onClose={onClose} width={700}>
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 15 }}>
        {['details', 'preop', 'consent', 'postop'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px',
              border: 'none',
              background: activeTab === tab ? 'var(--primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 300 }}>
        {activeTab === 'details' && <DetailsTab surgery={surgery} onUpdate={onUpdate} doctors={doctors} canManage={canManage} />}
        {activeTab === 'preop' && <PreOpTab surgery={surgery} onUpdate={onUpdate} />}
        {activeTab === 'consent' && <ConsentTab surgery={surgery} onUpdate={onUpdate} />}
        {activeTab === 'postop' && <PostOpTab surgery={surgery} onUpdate={onUpdate} />}
      </div>
    </Modal>
  );
}

// ── Tabs Components ──

function DetailsTab({ surgery, onUpdate, doctors, canManage }) {
  const [status, setStatus] = useState(surgery.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleStatusChange = async (newStatus) => {
    setError('');
    setSaving(true);
    try {
      const res = await API.put(`/surgeries/${surgery._id}`, { status: newStatus });
      onUpdate(res.data);
      setStatus(newStatus);
      toast.success('Status updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
      setStatus(surgery.status); // revert
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      {error && <Alert type="error">{error}</Alert>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13, color: 'var(--text-muted)' }}>Patient</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{surgery.patientId?.name}</p>
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13, color: 'var(--text-muted)' }}>Operation Theatre</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{surgery.operationTheatreNum}</p>
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13, color: 'var(--text-muted)' }}>Surgeon</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{surgery.surgeonId?.name || 'N/A'}</p>
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13, color: 'var(--text-muted)' }}>Anesthetist</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{surgery.anesthetistId?.name || 'None'}</p>
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13, color: 'var(--text-muted)' }}>Start Time</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{new Date(surgery.startTime).toLocaleString()}</p>
        </div>
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 13, color: 'var(--text-muted)' }}>End Time</p>
          <p style={{ margin: 0, fontWeight: 500 }}>{new Date(surgery.endTime).toLocaleString()}</p>
        </div>
      </div>

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Status Management</h4>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Select 
            value={status} 
            onChange={e => handleStatusChange(e.target.value)}
            disabled={!canManage || saving || surgery.status === 'Completed' || surgery.status === 'Cancelled'}
            style={{ width: 200 }}
          >
            <option value="Scheduled">Scheduled</option>
            <option value="In-Progress">In-Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
          {saving && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Updating...</span>}
        </div>
      </div>
    </div>
  );
}

function PreOpTab({ surgery, onUpdate }) {
  const [checklist, setChecklist] = useState(surgery.preOpChecklist || []);
  const [customItem, setCustomItem] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleItem = (index) => {
    const newChecklist = [...checklist];
    newChecklist[index].isCompleted = !newChecklist[index].isCompleted;
    setChecklist(newChecklist);
  };

  const addCustomItem = (e) => {
    e.preventDefault();
    if (!customItem.trim()) return;
    setChecklist([...checklist, { task: customItem, isCompleted: false }]);
    setCustomItem('');
  };

  const saveChecklist = async () => {
    setSaving(true);
    try {
      const res = await API.put(`/surgeries/${surgery._id}/preop`, { checklist });
      onUpdate(res.data);
      toast.success('Checklist updated');
    } catch (err) {
      toast.error('Failed to update checklist');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checklist.map((item, idx) => (
          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={item.isCompleted} 
              onChange={() => toggleItem(idx)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ textDecoration: item.isCompleted ? 'line-through' : 'none', color: item.isCompleted ? 'var(--text-muted)' : 'var(--text)' }}>
              {item.task}
            </span>
          </label>
        ))}
      </div>

      <form onSubmit={addCustomItem} style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <Input 
          placeholder="Add custom checklist item" 
          value={customItem} 
          onChange={e => setCustomItem(e.target.value)}
          style={{ flex: 1 }}
        />
        <Btn type="submit" variant="ghost">Add</Btn>
      </form>

      <div style={{ marginTop: 15, display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={saveChecklist} disabled={saving}>{saving ? 'Saving...' : 'Save Checklist'}</Btn>
      </div>
    </div>
  );
}

function ConsentTab({ surgery, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('consentForm', file);
    formData.append('documentName', docName || file.name);

    try {
      const res = await API.post(`/surgeries/${surgery._id}/consent`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUpdate(res.data);
      toast.success('Consent form uploaded');
      setFile(null);
      setDocName('');
      // Reset file input
      document.getElementById('consentFileInput').value = '';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h4 style={{ margin: '0 0 10px 0' }}>Uploaded Forms</h4>
        {surgery.consentForms && surgery.consentForms.length > 0 ? (
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {surgery.consentForms.map((form, idx) => (
              <li key={idx} style={{ marginBottom: 5 }}>
                <a href={`http://localhost:5000${form.fileUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  {form.documentName}
                </a>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>
                  ({new Date(form.uploadedAt).toLocaleDateString()})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No forms uploaded yet.</p>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 15 }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Upload New Form</h4>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input 
            label="Document Name (Optional)" 
            value={docName} 
            onChange={e => setDocName(e.target.value)}
            placeholder="e.g., General Consent"
          />
          <div>
            <input 
              id="consentFileInput"
              type="file" 
              accept=".pdf,image/jpeg,image/png"
              onChange={e => setFile(e.target.files[0])}
              required
            />
          </div>
          <div style={{ marginTop: 5 }}>
            <Btn type="submit" disabled={uploading || !file}>{uploading ? 'Uploading...' : 'Upload'}</Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

function PostOpTab({ surgery, onUpdate }) {
  const [notes, setNotes] = useState(surgery.postOpRecovery?.notes || '');
  const [condition, setCondition] = useState(surgery.postOpRecovery?.condition || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const [vital, setVital] = useState({ hr: '', bpSystolic: '', bpDiastolic: '', spo2: '' });
  const [addingVital, setAddingVital] = useState(false);

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await API.put(`/surgeries/${surgery._id}/postop`, { notes, condition });
      onUpdate(res.data);
      toast.success('Recovery notes updated');
    } catch (err) {
      toast.error('Failed to update notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const addVital = async (e) => {
    e.preventDefault();
    setAddingVital(true);
    try {
      const payload = {
        hr: Number(vital.hr),
        bpSystolic: Number(vital.bpSystolic),
        bpDiastolic: Number(vital.bpDiastolic),
        spo2: Number(vital.spo2)
      };
      const res = await API.put(`/surgeries/${surgery._id}/postop`, { vital: payload });
      onUpdate(res.data);
      toast.success('Vitals added');
      setVital({ hr: '', bpSystolic: '', bpDiastolic: '', spo2: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add vitals');
    } finally {
      setAddingVital(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Vitals Section */}
      <div>
        <h4 style={{ margin: '0 0 10px 0' }}>Vitals Tracker</h4>
        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 15, paddingRight: 5 }}>
          {surgery.postOpRecovery?.vitals?.length > 0 ? (
            surgery.postOpRecovery.vitals.map((v, idx) => (
              <div key={idx} style={{ padding: 10, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', marginBottom: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <strong>{new Date(v.timestamp).toLocaleTimeString()}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  <span>HR: {v.hr} bpm</span>
                  <span>BP: {v.bpSystolic}/{v.bpDiastolic}</span>
                  <span>SpO2: {v.spo2}%</span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No vitals recorded.</p>
          )}
        </div>

        <form onSubmit={addVital} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--surface2)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
          <Input label="HR (bpm)" type="number" required min="0" max="300" value={vital.hr} onChange={e => setVital({...vital, hr: e.target.value})} />
          <Input label="SpO2 (%)" type="number" required min="0" max="100" value={vital.spo2} onChange={e => setVital({...vital, spo2: e.target.value})} />
          <Input label="BP Systolic" type="number" required min="0" max="300" value={vital.bpSystolic} onChange={e => setVital({...vital, bpSystolic: e.target.value})} />
          <Input label="BP Diastolic" type="number" required min="0" max="200" value={vital.bpDiastolic} onChange={e => setVital({...vital, bpDiastolic: e.target.value})} />
          <div style={{ gridColumn: '1 / -1', marginTop: 5 }}>
            <Btn type="submit" size="sm" full disabled={addingVital}>{addingVital ? 'Adding...' : '+ Record Vitals'}</Btn>
          </div>
        </form>
      </div>

      {/* Notes Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <h4 style={{ margin: '0' }}>Recovery Notes</h4>
        <Input 
          label="Current Condition" 
          placeholder="e.g., Stable, Critical, Recovering" 
          value={condition}
          onChange={e => setCondition(e.target.value)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Detailed Notes</label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            rows={5}
            style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={saveNotes} disabled={savingNotes}>{savingNotes ? 'Saving...' : 'Save Notes'}</Btn>
        </div>
      </div>
    </div>
  );
}
