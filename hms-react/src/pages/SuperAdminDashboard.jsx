// hms-react/src/pages/SuperAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

const TABS = ['Overview', 'Clinics', 'Staff', 'Users', 'Clinic Dashboard'];

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: color + '22', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2236' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}


function OverviewTab({ clinics, allUsers }) {
  const [patientCounts, setPatientCounts] = useState({});
  const [loadingPatients, setLoadingPatients] = useState(true);
  
  useEffect(() => {
    const fetchPatientCounts = async () => {
      try {
        const counts = {};
        for (const clinic of clinics) {
          // Get patients for this clinic
          const { data } = await API.get(`/patients?clinicId=${clinic._id}&limit=1`);
          counts[clinic._id] = data.total || 0;
        }
        setPatientCounts(counts);
      } catch (err) {
        console.error('Failed to fetch patient counts:', err);
      } finally {
        setLoadingPatients(false);
      }
    };
    
    if (clinics.length > 0) {
      fetchPatientCounts();
    } else {
      setLoadingPatients(false);
    }
  }, [clinics]);

  const totalStaff = allUsers.filter(u => u.role !== 'patient' && u.role !== 'super_admin').length;
  const totalPatients = Object.values(patientCounts).reduce((a, b) => a + b, 0);
  const totalDoctors = allUsers.filter(u => u.role === 'doctor').length;
  const totalAdmins = allUsers.filter(u => u.role === 'admin').length;
  const activeUsers = allUsers.filter(u => u.isActive).length;

  const byClinic = clinics.map(c => ({
    ...c,
    staffCount: allUsers.filter(u => String(u.clinicId) === String(c._id) && u.role !== 'patient' && u.role !== 'super_admin').length,
    doctorCount: allUsers.filter(u => String(u.clinicId) === String(c._id) && u.role === 'doctor').length,
    patientCount: patientCounts[c._id] || 0,
  }));

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Clinics"  value={clinics.length}  icon="🏥" color="#2d6be4" />
        <StatCard label="Total Patients" value={totalPatients}    icon="👤" color="#8b5cf6" />
        <StatCard label="Total Staff"    value={totalStaff}       icon="👥" color="#10b981" />
        <StatCard label="Doctors"        value={totalDoctors}     icon="🩺" color="#6366f1" />
        <StatCard label="Admins"         value={totalAdmins}      icon="🔑" color="#f59e0b" />
        <StatCard label="Active Users"   value={activeUsers}      icon="✅" color="#22c55e" />
        <StatCard label="Inactive Users" value={allUsers.length - activeUsers} icon="⛔" color="#ef4444" />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f3f6' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>Clinics Overview</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Clinic Name', 'Email', 'Phone', 'Patients', 'Staff', 'Doctors'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byClinic.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>{c.name}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.email}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {c.patientCount}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {c.staffCount}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {c.doctorCount}
                    </span>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No clinics yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Clinics Tab ──────────────────────────────────────────────────────────────
function ClinicsTab({ clinics, onRefresh }) {
  const [editClinic, setEditClinic] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);

  const openEdit = (c) => {
    setEditClinic(c);
    setForm({ name: c.name, email: c.email, phone: c.phone || '' });
    setError('');
    setShowEditForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setError('Name and email are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await API.put(`/auth/clinics/${editClinic._id}`, form);
      setShowEditForm(false);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update clinic');
    }
    setSaving(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>
          All Clinics ({clinics.length})
        </h3>
        <div style={{ fontSize: 12, color: '#6b7a99' }}>
          Clinics are created automatically when a clinic admin registers
        </div>
      </div>

      {/* ── Edit Clinic Form ── */}
      {showEditForm && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', color: '#1a2236' }}>Edit Clinic: {editClinic?.name}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { label: 'Clinic Name *', key: 'name', type: 'text' },
              { label: 'Email *', key: 'email', type: 'email' },
              { label: 'Phone', key: 'phone', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          {error && <div style={errorStyle}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setShowEditForm(false)} style={btnStyle('#94a3b8')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={btnStyle('#2d6be4')}>
              {saving ? 'Saving…' : 'Update Clinic'}
            </button>
          </div>
        </div>
      )}

      {/* ── Clinics Table ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Clinic', 'Email', 'Phone', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinics.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🏥</span> {c.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.email}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99', fontSize: 12 }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => openEdit(c)}
                      style={{ ...smallBtn, color: '#2d6be4', borderColor: '#2d6be4' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                    No clinics yet. A clinic will be created automatically when a clinic admin registers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Staff Tab (add staff to any clinic) ─────────────────────────────────────
function StaffTab({ clinics, allUsers, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'doctor', 
    department: '', 
    phone: '', 
    clinicId: '', 
    consultationFee: '',
    // ── New clinic creation fields ──
    newClinicName: '',
    newClinicPhone: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterClinic, setFilterClinic] = useState('');

  const staff = allUsers.filter(u => u.role !== 'patient' && u.role !== 'super_admin');
  const filtered = filterClinic ? staff.filter(u => String(u.clinicId) === filterClinic) : staff;

  const clinicName = (id) => clinics.find(c => String(c._id) === String(id))?.name || '—';

  const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'];

  // ── Department options ──────────────────────────────────────────────────────
  const DEPARTMENTS = [
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Gynecology',
    'Neurology',
    'Radiology',
    'Pathology',
    'Emergency',
    'Surgery',
    'Dermatology',
    'Psychiatry',
    'Ophthalmology',
    'ENT',
    'Urology',
    'Nephrology',
    'Gastroenterology',
    'Pulmonology',
    'Oncology',
    'Hematology',
    'Endocrinology',
    'Rheumatology',
    'Infectious Diseases',
    'Geriatrics',
    'Administration',
    'Pharmacy',
    'Nursing',
    'Reception',
    'Lab Services',
    'Physical Therapy',
    'Occupational Therapy',
    'Speech Therapy',
    'Nutrition',
    'Other'
  ];

  const handleSave = async () => {
    // ── Validation ──
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required');
      return;
    }

    // ── If role is admin, must provide clinic name ──
    if (form.role === 'admin') {
      if (!form.newClinicName) {
        setError('Clinic name is required to create a new clinic');
        return;
      }
    } else {
      // Non-admin roles must select an existing clinic
      if (!form.clinicId) {
        setError('Please select a clinic');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      let targetClinicId = form.clinicId;

      // ── If creating new clinic for admin ──
      if (form.role === 'admin') {
        // Create clinic with admin's email
        const clinicResponse = await API.post('/auth/clinics', {
          name: form.newClinicName,
          email: form.email,  // ✅ Use admin's email as clinic email
          phone: form.newClinicPhone || form.phone || '',
        });
        targetClinicId = clinicResponse.data.clinic._id;
      }

      // ── Create the staff user ──
      await API.post('/auth/users', {
        name: form.name,
        email: form.email.toLowerCase(),
        password: form.password,
        role: form.role,
        department: form.department,
        phone: form.phone,
        clinicId: targetClinicId,
        ...(form.role === 'doctor' && form.consultationFee ? { consultationFee: Number(form.consultationFee) } : {}),
        permissions: [],
      });

      // ── Reset form and refresh ──
      setShowForm(false);
      setForm({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'doctor', 
        department: '', 
        phone: '', 
        clinicId: '', 
        consultationFee: '',
        newClinicName: '',
        newClinicPhone: '',
      });
      onRefresh();
    } catch (err) {
      console.error('Create staff error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to create staff';
      if (errorMsg.includes('already registered') || errorMsg.includes('duplicate')) {
        setError(`Email "${form.email}" is already registered. Please use a different email.`);
      } else {
        setError(errorMsg);
      }
    }
    setSaving(false);
  };

  const handleToggle = async (id, current) => {
    if (!confirm(`${current ? 'Deactivate' : 'Activate'} this user?`)) return;
    try {
      await API.patch(`/auth/users/${id}/toggle-active`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle');
    }
  };

  // ── Reset clinic fields when role changes ──
  const handleRoleChange = (role) => {
    setForm(prev => ({
      ...prev,
      role: role,
      clinicId: '',
      newClinicName: '',
      newClinicPhone: '',
    }));
  };

  const isAdminRole = form.role === 'admin';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>All Staff ({filtered.length})</h3>
          <select
            value={filterClinic}
            onChange={e => setFilterClinic(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '4px 10px', fontSize: 12 }}
          >
            <option value="">All Clinics</option>
            {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={btnStyle('#2d6be4')}>+ Add Staff</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', color: '#1a2236' }}>Add Staff Member</h4>
          
          {/* ── Admin notice ── */}
          {isAdminRole && (
            <div style={{ 
              background: '#f0f9ff', 
              border: '1.5px solid #bae6fd', 
              borderRadius: 8, 
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>🏥</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>
                  Creating a Clinic Admin
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  A new clinic will be automatically created with the admin's email.
                  Each clinic can only have one admin.
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: 'Name *', key: 'name', type: 'text' },
              { label: 'Email *', key: 'email', type: 'email' },
              { label: 'Password *', key: 'password', type: 'password' },
              { label: 'Phone', key: 'phone', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Department</label>
              <select
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Role *</label>
              <select
                value={form.role}
                onChange={e => handleRoleChange(e.target.value)}
                style={inputStyle}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            {form.role === 'doctor' && (
              <div>
                <label style={labelStyle}>Consultation Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.consultationFee}
                  onChange={e => setForm(p => ({ ...p, consultationFee: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. 500"
                />
              </div>
            )}
          </div>

          {/* ── Clinic Section ── */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            {isAdminRole ? (
              // ── Create New Clinic (for Clinic Admin) ──
              <div style={{ 
                background: '#f0f9ff', 
                border: '1.5px solid #bae6fd', 
                borderRadius: 8, 
                padding: 16,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Clinic Name *</label>
                    <input
                      type="text"
                      value={form.newClinicName}
                      onChange={e => setForm(p => ({ ...p, newClinicName: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. City Health Clinic"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Clinic Phone</label>
                    <input
                      type="text"
                      value={form.newClinicPhone}
                      onChange={e => setForm(p => ({ ...p, newClinicPhone: e.target.value }))}
                      style={inputStyle}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                  💡 Clinic email will be <strong>{form.email || 'admin@clinic.com'}</strong> (same as admin's email)
                </div>
              </div>
            ) : (
              // ── Select Existing Clinic (for non-admin roles) ──
              <div>
                <label style={labelStyle}>Select Clinic *</label>
                <select
                  value={form.clinicId}
                  onChange={e => setForm(p => ({ ...p, clinicId: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— Select Clinic —</option>
                  {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setShowForm(false)} style={btnStyle('#94a3b8')}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={btnStyle('#2d6be4')}>
              {saving ? 'Saving…' : 'Add Staff'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name', 'Email', 'Role', 'Department', 'Clinic', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f1f3f6', opacity: u.isActive ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>{u.name}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ ...roleBadge(u.role) }}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>
                    {u.department || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{clinicName(u.clinicId)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: u.isActive ? '#d1fae5' : '#fee2e2',
                      color: u.isActive ? '#065f46' : '#991b1b',
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => handleToggle(u._id, u.isActive)}
                      style={{ ...smallBtn, color: u.isActive ? '#ef4444' : '#22c55e', borderColor: u.isActive ? '#ef4444' : '#22c55e' }}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No staff found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
// ── All Users Tab ────────────────────────────────────────────────────────────
function AllUsersTab({ clinics, allUsers, onRefresh }) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterClinic, setFilterClinic] = useState('');

  const clinicName = (id) => clinics.find(c => String(c._id) === String(id))?.name || '—';

  const filtered = allUsers.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !filterRole   || u.role === filterRole;
    const matchClinic = !filterClinic || String(u.clinicId) === filterClinic;
    return matchSearch && matchRole && matchClinic;
  });

  const handleToggle = async (id, current) => {
    if (!confirm(`${current ? 'Deactivate' : 'Activate'} this user?`)) return;
    try {
      await API.patch(`/auth/users/${id}/toggle-active`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle');
    }
  };

  const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <select value={filterClinic} onChange={e => setFilterClinic(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All Clinics</option>
          {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filtered.length} users</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name', 'Email', 'Role', 'Clinic', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f1f3f6', opacity: u.isActive ? 1 : 0.55 }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a2236' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#dbeafe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#1e40af', flexShrink: 0,
                      }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ ...roleBadge(u.role) }}>{u.role.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7a99', fontSize: 12 }}>{clinicName(u.clinicId)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: u.isActive ? '#d1fae5' : '#fee2e2',
                      color: u.isActive ? '#065f46' : '#991b1b',
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => handleToggle(u._id, u.isActive)}
                      style={{ ...smallBtn, color: u.isActive ? '#ef4444' : '#22c55e', borderColor: u.isActive ? '#ef4444' : '#22c55e' }}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #f1f3f6', textAlign: 'center' }}>
            Showing first 100 of {filtered.length} results. Use search/filter to narrow down.
          </div>
        )}
      </div>
    </>
  );
}

// ── Clinic Dashboard Tab ─────────────────────────────────────────────────────
function ClinicDashboardTab({ clinics }) {
  const { setSuperAdminClinic, superAdminClinicId } = useAuth();
  const [selectedClinicId, setSelectedClinicId] = useState(superAdminClinicId || (clinics[0]?._id ?? ''));
  const [stats, setStats]           = useState(null);
  const [roomConfigs, setRoomConfigs] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [totalPayoutAmount, setTotalPayoutAmount] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);

  const clinicId = selectedClinicId || (clinics[0]?._id ?? '');

  // On mount, make sure context is populated with the currently selected clinic
  useEffect(() => {
    if (clinicId && clinics.length > 0) {
      const name = clinics.find(c => c._id === clinicId)?.name || '';
      setSuperAdminClinic(clinicId, name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount — user explicitly picks after that

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([
      API.get(`/dashboard/stats?clinicId=${clinicId}`).catch(() => ({ data: null })),
      API.get(`/room-settings?clinicId=${clinicId}`).catch(() => ({ data: [] })),
      API.get('/telemedicine/pending-payouts').catch(() => ({ data: { pendingPayouts: [], totalAmount: 0 } })),
    ]).then(([statsRes, roomRes, payoutRes]) => {
      setStats(statsRes.data);
      setRoomConfigs(Array.isArray(roomRes.data) ? roomRes.data : []);
      setPendingPayouts(payoutRes.data?.pendingPayouts || []);
      setTotalPayoutAmount(payoutRes.data?.totalAmount || 0);
    }).finally(() => setLoading(false));
  }, [clinicId]);

  const handleApprovePayout = async (id) => {
    if (!confirm('Approve this payout request?')) return;
    setProcessingPayout(true);
    try {
      const { data } = await API.patch(`/telemedicine/${id}/approve-payout`, {
        payoutId: `PAY-${Date.now()}`,
        payoutMethod: 'bank_transfer',
        notes: 'Payout approved by super admin',
      });
      if (data.success) {
        alert('✅ Payout approved!');
        setPendingPayouts(prev => prev.filter(p => p._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve payout');
    }
    setProcessingPayout(false);
  };

  const totalRooms     = roomConfigs.reduce((s, r) => s + r.totalRooms, 0);
  const availableRooms = roomConfigs.reduce((s, r) => s + r.availableRooms, 0);
  const occupiedRooms  = totalRooms - availableRooms;
  const occupancyRate  = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartData  = stats?.monthlyRevenue?.map(m => ({
    name: monthNames[m._id.month - 1],
    revenue: m.total,
  })) || [];

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={labelStyle}>Viewing Clinic:</label>
          <select
            value={selectedClinicId}
            onChange={e => {
              const id = e.target.value;
              const name = clinics.find(c => c._id === id)?.name || '';
              setSelectedClinicId(id);
              setSuperAdminClinic(id, name);   // sets context so all dashboard pages use this clinic
            }}
            style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
          >
            {clinics.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/dashboard" style={btnStyle('#0f2942')}>⊞ Open Full Dashboard</a>
          <a href="/dashboard/telemedicine" style={btnStyle('#6366f1')}>📹 Telemedicine</a>
          <a href="/dashboard/prescriptions" style={btnStyle('#10b981')}>📋 Prescriptions</a>
          <a href="/dashboard/billing" style={btnStyle('#f59e0b')}>💳 Billing</a>
          <a href="/dashboard/patients" style={btnStyle('#ef4444')}>👤 Patients</a>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading clinic data…</div>
      ) : (
        <>
          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total Patients"  value={stats?.totalPatients  || 0} icon="👤" color="#2d6be4" />
            <StatCard label="Active Patients" value={stats?.activePatients || 0} icon="🟢" color="#10b981" />
            <StatCard label="Total Revenue"   value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="#22c55e" />
            <StatCard label="Pending Bills"   value={stats?.pendingBills   || 0} icon="📋" color="#ef4444" />
            <StatCard label="Available Rooms" value={availableRooms} icon="🛏️" color="#6366f1" />
            <StatCard label="Occupied Rooms"  value={occupiedRooms} icon="🏨" color="#f59e0b" />
          </div>

          {/* ── Revenue chart ── */}
          {chartData.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a2236' }}>
                📈 Monthly Revenue (Last 6 Months)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '0 4px' }}>
                  {chartData.slice(-6).map((d, i) => {
                    const max = Math.max(...chartData.map(x => x.revenue), 1);
                    const h = Math.round((d.revenue / max) * 130);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, color: '#6b7a99' }}>₹{(d.revenue / 1000).toFixed(0)}k</span>
                        <div style={{
                          width: '100%', height: h, background: '#0f2942',
                          borderRadius: '4px 4px 0 0', minHeight: 4,
                        }} />
                        <span style={{ fontSize: 10, color: '#6b7a99' }}>{d.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Room summary ── */}
          {roomConfigs.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f3f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2236' }}>🏨 Room Occupancy</h3>
                <span style={{ fontSize: 12, color: '#6b7a99' }}>{occupancyRate}% occupied · {availableRooms} of {totalRooms} free</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Room Type', 'Daily Rate', 'Available', 'Total', 'Occupancy'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roomConfigs.map(rc => {
                      const pct = rc.totalRooms > 0 ? (rc.availableRooms / rc.totalRooms) * 100 : 0;
                      const isFull = rc.availableRooms === 0;
                      return (
                        <tr key={rc.roomType} style={{ borderBottom: '1px solid #f1f3f6' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600 }}>{rc.roomType}</td>
                          <td style={{ padding: '10px 16px', color: '#0f4c81', fontWeight: 600 }}>₹{(rc.dailyRate || 0).toLocaleString()}/day</td>
                          <td style={{ padding: '10px 16px', fontWeight: 700, color: isFull ? '#dc2626' : '#16a34a' }}>
                            {rc.availableRooms}<span style={{ fontSize: 11, color: '#94a3b8' }}> / {rc.totalRooms}</span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>{rc.totalRooms}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: isFull ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: isFull ? '#dc2626' : '#475569' }}>{Math.round(pct)}% free</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Pending Payouts ── */}
          {pendingPayouts.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #f59e0b', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f3f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#92400e' }}>💰 Pending Payout Requests</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    {pendingPayouts.length} requests · Total: ₹{totalPayoutAmount}
                  </p>
                </div>
                <button
                  onClick={() => { if (confirm('Approve ALL pending payouts?')) pendingPayouts.forEach(p => handleApprovePayout(p._id)); }}
                  style={btnStyle('#f59e0b')}
                >
                  Approve All
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Doctor', 'Patient', 'Amount', 'Bank Details', 'Requested', 'Action'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7a99', fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayouts.map(req => (
                      <tr key={req._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: 600 }}>Dr. {req.doctorId?.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{req.doctorId?.email}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div>{req.patientName}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{req.patientEmail}</div>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0f4c81', fontSize: 15 }}>
                          ₹{req.doctorPayoutAmount}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12 }}>
                          {req.doctorId?.bankDetails ? (
                            <div>
                              <div>{req.doctorId.bankDetails.accountHolderName}</div>
                              <div style={{ color: '#64748b' }}>{req.doctorId.bankDetails.accountNumber} · {req.doctorId.bankDetails.bankName}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>IFSC: {req.doctorId.bankDetails.ifscCode}</div>
                            </div>
                          ) : <span style={{ color: '#ef4444', fontSize: 11 }}>⚠️ No bank details</span>}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>
                          {new Date(req.createdAt).toLocaleDateString()}<br />
                          <span style={{ fontSize: 10 }}>{new Date(req.createdAt).toLocaleTimeString()}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <button
                            onClick={() => handleApprovePayout(req._id)}
                            disabled={processingPayout}
                            style={{ ...btnStyle(processingPayout ? '#94a3b8' : '#10b981'), fontSize: 12, padding: '4px 12px' }}
                          >
                            {processingPayout ? '…' : '✅ Approve'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Quick navigation cards ── */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a2236' }}>🚀 Quick Access — All Modules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {[
                { label: 'Dashboard',     icon: '⊞', href: '/dashboard',                    color: '#0f2942' },
                { label: 'Patients',      icon: '👤', href: '/dashboard/patients',           color: '#2d6be4' },
                { label: 'IPD',           icon: '🏥', href: '/dashboard/ipd',               color: '#6366f1' },
                { label: 'Billing',       icon: '💳', href: '/dashboard/billing',           color: '#f59e0b' },
                { label: 'Lab Bills',     icon: '🧾', href: '/dashboard/billing-requests',  color: '#f59e0b' },
                { label: 'Pharmacy',      icon: '💊', href: '/dashboard/pharmacy',          color: '#10b981' },
                { label: 'Lab Tests',     icon: '🧪', href: '/dashboard/lab',              color: '#06b6d4' },
                { label: 'Token Queue',   icon: '🎫', href: '/dashboard/tokens',           color: '#8b5cf6' },
                { label: 'Emergency',     icon: '🚨', href: '/dashboard/emergency',        color: '#ef4444' },
                { label: 'Prescriptions', icon: '📋', href: '/dashboard/prescriptions',   color: '#10b981' },
                { label: 'Telemedicine',  icon: '📹', href: '/dashboard/telemedicine',    color: '#6366f1' },
                { label: 'Inventory',     icon: '📦', href: '/dashboard/inventory',       color: '#f59e0b' },
                { label: 'Staff Mgmt',    icon: '👥', href: '/dashboard/staff',           color: '#2d6be4' },
                { label: 'Tasks',         icon: '📋', href: '/dashboard/tasks',           color: '#64748b' },
                { label: 'Room Settings', icon: '🏨', href: '/dashboard/room-settings',  color: '#0f2942' },
                { label: 'Earnings',      icon: '💰', href: '/dashboard/doctor-earnings', color: '#22c55e' },
                { label: 'Bank Details',  icon: '🏦', href: '/dashboard/doctor-bank-details', color: '#0f4c81' },
                { label: 'Profile',       icon: '👤', href: '/dashboard/profile',         color: '#6366f1' },
              ].map(({ label, icon, href, color }) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 8,
                    border: `1.5px solid ${color}22`,
                    background: `${color}11`,
                    color: color, fontWeight: 600, fontSize: 13,
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const errorStyle = { background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 10 };
const btnStyle   = (bg) => ({
  padding: '8px 16px', borderRadius: 8, border: 'none', background: bg,
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
});
const smallBtn = {
  padding: '3px 10px', borderRadius: 6, background: 'transparent',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid',
};

const ROLE_COLORS = {
  admin:          { bg: '#fee2e2', color: '#991b1b' },
  doctor:         { bg: '#ede9fe', color: '#5b21b6' },
  nurse:          { bg: '#d1fae5', color: '#065f46' },
  receptionist:   { bg: '#fef3c7', color: '#92400e' },
  pharmacist:     { bg: '#dbeafe', color: '#1e40af' },
  lab_technician: { bg: '#fce7f3', color: '#9d174d' },
  patient:        { bg: '#f1f5f9', color: '#475569' },
};
const roleBadge = (role) => ({
  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
  ...(ROLE_COLORS[role] || { bg: '#f1f5f9', color: '#475569' }),
  display: 'inline-block',
});

// ── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [clinics, setClinics]     = useState([]);
  const [allUsers, setAllUsers]   = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'super_admin') { navigate('/dashboard'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        API.get('/auth/clinics'),
        API.get('/auth/all-users'),
      ]);
      setClinics(cRes.data.clinics || []);
      setAllUsers(uRes.data.users  || []);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔄</div>
          <p style={{ color: '#6b7a99', marginTop: 10 }}>Loading Super Admin Dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* ── Top bar ── */}
      <header style={{
        background: '#0f2942', color: '#fff',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🏥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>MediCare HMS</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Super Admin Console</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a
            href="/dashboard"
            style={{
              background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
              padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            ⊞ Staff Dashboard
          </a>
          <span style={{
            background: 'rgba(168,85,247,0.2)', color: '#c084fc',
            padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>
            ⚡ SUPER ADMIN
          </span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{user?.name}</span>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {/* ── Page title ── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a2236' }}>
            Super Admin Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: 14 }}>
            Full system control — manage all clinics, staff, and users
          </p>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #e5e7eb', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: activeTab === tab ? '#0f2942' : 'transparent',
                color:      activeTab === tab ? '#fff'    : '#6b7a99',
              }}
            >
              {tab === 'Overview'         && '⊞ '}
              {tab === 'Clinics'          && '🏥 '}
              {tab === 'Staff'            && '👥 '}
              {tab === 'Users'            && '👤 '}
              {tab === 'Clinic Dashboard' && '📊 '}
              {tab}
            </button>
          ))}
          <button
            onClick={loadData}
            style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 13 }}
            title="Refresh"
          >
            🔄
          </button>
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'Overview'          && <OverviewTab        clinics={clinics} allUsers={allUsers} />}
        {activeTab === 'Clinics'           && <ClinicsTab         clinics={clinics} onRefresh={loadData} />}
        {activeTab === 'Staff'             && <StaffTab           clinics={clinics} allUsers={allUsers} onRefresh={loadData} />}
        {activeTab === 'Users'             && <AllUsersTab        clinics={clinics} allUsers={allUsers} onRefresh={loadData} />}
        {activeTab === 'Clinic Dashboard'  && <ClinicDashboardTab clinics={clinics} />}
      </div>
    </div>
  );
}