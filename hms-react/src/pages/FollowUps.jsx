import React, { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Input, Select, SectionHeader, Empty } from '../components/UI';

export default function FollowUps() {
  const { user, getEffectiveClinicId } = useAuth();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const effectiveClinicId = getEffectiveClinicId();
      
      // Fetch patients with follow-ups
      const patientsResponse = await API.get('/patients', {
        params: { clinicId: effectiveClinicId }
      });
      
      // Fetch doctors using the dedicated clinic-doctors route
      const doctorsResponse = await API.get('/auth/clinic-doctors', {
        params: { clinicId: effectiveClinicId }
      });
      
      const patientsData = patientsResponse.data || [];
      const doctorsData = doctorsResponse.data?.doctors || [];
      
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
      setError(err.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [getEffectiveClinicId]);

  useEffect(() => { load(); }, [load]);

  async function handleUpdateFollowUp(patientId, followUpDate, followUpNote) {
    try {
      const payload = { followUpDate, followUpNote };
      const { data } = await API.put(`/patients/${patientId}/follow-up`, payload);
      setPatients(prev => prev.map(p => p._id === patientId ? data : p));
      return data;
    } catch (err) {
      console.error('Failed to update follow-up:', err);
      throw new Error(err.response?.data?.message || 'Failed to update follow-up');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#4a6278' }}>
        <div>Loading follow-ups…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: '#e74c3c', marginBottom: 12 }}>{error}</div>
        <button
          onClick={load}
          style={{ padding: '8px 20px', background: '#0a3d62', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AdminFollowUpsView
      patients={patients}
      doctors={doctors}
      onUpdateFollowUp={handleUpdateFollowUp}
    />
  );
}

// ── Shared view ──
function AdminFollowUpsView({ patients, doctors, onUpdateFollowUp }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Only show patients with follow-up dates
  const followUpPatients = patients.filter((p) => p.followUpDate);
  
  const filtered = followUpPatients.filter((p) => {
    const matchDoctor = doctorFilter === 'all' || String(p.doctorId) === doctorFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone && p.phone.includes(search));
    const matchDate =
      dateFilter === 'all' ? true :
        dateFilter === 'today' ? p.followUpDate === todayStr :
          dateFilter === 'upcoming' ? p.followUpDate >= todayStr :
            dateFilter === 'overdue' ? p.followUpDate < todayStr : true;
    return matchDoctor && matchSearch && matchDate;
  }).sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''));

  function startEdit(p) { 
    setEditingId(p._id); 
    setEditDate(p.followUpDate || ''); 
    setEditNote(p.followUpNote || ''); 
  }
  
  function cancelEdit() { 
    setEditingId(null); 
    setEditDate(''); 
    setEditNote(''); 
  }

  async function saveEdit(patientId) {
    setBusy(true);
    try { 
      await onUpdateFollowUp(patientId, editDate, editNote); 
      setEditingId(null); 
    } catch (e) { 
      alert(e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  async function clearFollowUp(patientId) {
    if (!window.confirm('Clear this follow-up?')) return;
    try { 
      await onUpdateFollowUp(patientId, null, ''); 
    } catch (e) { 
      alert(e.message); 
    }
  }

  function getFollowUpStatus(followUpDate) {
    if (!followUpDate) return null;
    if (followUpDate < todayStr) return { label: 'Overdue', bg: 'rgba(231,76,60,0.08)', text: '#e74c3c' };
    if (followUpDate === todayStr) return { label: 'Today', bg: 'rgba(0,184,148,0.10)', text: '#00a878' };
    return { label: 'Upcoming', bg: 'rgba(21,101,168,0.08)', text: '#1565a8' };
  }

  const todayCount = followUpPatients.filter((p) => p.followUpDate === todayStr).length;
  const upcomingCount = followUpPatients.filter((p) => p.followUpDate > todayStr).length;
  const overdueCount = followUpPatients.filter((p) => p.followUpDate < todayStr).length;

  return (
    <div>
      <SectionHeader title="Follow-ups" subtitle={`${followUpPatients.length} patients with scheduled follow-ups`} />
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Today', value: todayCount, icon: '📅', color: '#00a878', bg: 'rgba(0,184,148,0.08)', border: 'rgba(0,184,148,0.20)', filter: 'today' },
          { label: 'Upcoming', value: upcomingCount, icon: '🔮', color: '#1565a8', bg: 'rgba(21,101,168,0.07)', border: 'rgba(21,101,168,0.18)', filter: 'upcoming' },
          { label: 'Overdue', value: overdueCount, icon: '⚠️', color: '#e74c3c', bg: 'rgba(231,76,60,0.07)', border: 'rgba(231,76,60,0.18)', filter: 'overdue' },
          { label: 'All', value: followUpPatients.length, icon: '📋', color: '#4a6278', bg: 'rgba(74,98,120,0.06)', border: 'rgba(74,98,120,0.15)', filter: 'all' },
        ].map((s) => (
          <div 
            key={s.label} 
            onClick={() => setDateFilter(s.filter)}
            style={{ 
              background: dateFilter === s.filter ? s.bg : '#fff', 
              border: `1.5px solid ${dateFilter === s.filter ? s.border : 'var(--border, #e4eaf1)'}`, 
              borderRadius: 12, 
              padding: '14px 16px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12 
            }}
          >
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: dateFilter === s.filter ? s.color : 'var(--text, #1a2a3a)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search patient name or phone…" 
          style={{ flex: '1 1 200px', minWidth: 0 }} 
        />
        <Select 
          value={doctorFilter} 
          onChange={(e) => setDoctorFilter(e.target.value)} 
          style={{ flex: '0 0 180px' }}
        >
          <option value="all">All Doctors</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name} {d.consultationFee ? `(₹${d.consultationFee})` : ''}
            </option>
          ))}
        </Select>
      </div>
      
      {/* Table */}
      {filtered.length === 0 ? (
        <Empty icon="📅" title="No follow-ups found" desc="No follow-ups match your filters." />
      ) : (
        <Card noPad>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Patient', 'Phone', 'Doctor', 'Last Visit', 'Follow-up Date', 'Note', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const st = getFollowUpStatus(p.followUpDate);
                  const isEditing = editingId === p._id;
                  
                  // Find doctor name from doctors list or use p.doctorName
                  const doctorName = p.doctorName || doctors.find(d => String(d._id) === String(p.doctorId))?.name || '—';
                  
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'rgba(21,101,168,0.03)' : (i % 2 === 0 ? '#fff' : 'var(--surface2, #fafbfc)') }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {p.age && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Age {p.age}{p.gender ? ` · ${p.gender}` : ''}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{p.phone || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1565a8' }}>{doctorName}</div>
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12.5 }}>{p.date || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {isEditing
                          ? <input 
                              type="date" 
                              value={editDate} 
                              onChange={(e) => setEditDate(e.target.value)} 
                              style={{ padding: '4px 8px', borderRadius: 7, border: '1.5px solid #1565a8', fontSize: 13 }} 
                            />
                          : <span style={{ fontWeight: 700, color: st?.text }}>{p.followUpDate}</span>}
                      </td>
                      <td style={{ padding: '11px 14px', maxWidth: 160 }}>
                        {isEditing
                          ? <input 
                              type="text" 
                              value={editNote} 
                              onChange={(e) => setEditNote(e.target.value)} 
                              placeholder="Note" 
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 7, border: '1.5px solid #1565a8', fontSize: 13 }} 
                            />
                          : <span style={{ color: p.followUpNote ? 'var(--text)' : 'var(--text-muted)', fontStyle: p.followUpNote ? 'normal' : 'italic', fontSize: 12.5 }}>{p.followUpNote || 'No note'}</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {st && <span style={{ background: st.bg, color: st.text, border: `1px solid ${st.text}30`, borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>{st.label}</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button 
                              onClick={() => saveEdit(p._id)} 
                              disabled={busy} 
                              style={{ padding: '4px 12px', borderRadius: 7, border: 'none', background: '#00b894', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              {busy ? '…' : '✓ Save'}
                            </button>
                            <button 
                              onClick={cancelEdit} 
                              style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #d0dce8', background: '#fff', color: '#4a6278', fontSize: 12, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button 
                              onClick={() => startEdit(p)} 
                              style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(21,101,168,0.25)', background: 'rgba(21,101,168,0.06)', color: '#1565a8', fontSize: 12, cursor: 'pointer' }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => clearFollowUp(p._id)} 
                              style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(231,76,60,0.25)', background: 'rgba(231,76,60,0.06)', color: '#e74c3c', fontSize: 12, cursor: 'pointer' }}
                            >
                              🗑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}