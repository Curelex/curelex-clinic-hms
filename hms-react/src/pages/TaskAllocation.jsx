import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import taskService from '../services/taskService';
import TaskCard from '../components/TaskCard';

const QUICK_DEADLINES = [
  { label: '1 Day', days: 1 },
  { label: '2 Days', days: 2 },
  { label: '3 Days', days: 3 },
  { label: '5 Days', days: 5 },
  { label: '7 Days', days: 7 },
];

const STATUSES = ['Received', 'In Process', 'Completed'];

export default function TaskAllocation() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('myTasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'Medium', deadline: '',
    assignedTo: '', assignedRole: '', files: [], recurrence: 'none',
    isOngoing: false, slaHours: '0',
  });

  const [filters, setFilters] = useState({ search: '', priority: '', status: '', dateFrom: '', dateTo: '', ongoing: '' });
  const [expandedRow, setExpandedRow] = useState(null);
  const [activeQuickDeadline, setActiveQuickDeadline] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  const dragTaskRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'myTasks') {
        ({ data } = await taskService.getAssignedTasks());
      } else if (activeTab === 'assignedByMe') {
        ({ data } = await taskService.getCreatedTasks());
      } else if (activeTab === 'allTasks') {
        ({ data } = await taskService.getAllTasks(filters));
      } else if (activeTab === 'history') {
        ({ data } = await taskService.getHistoryTasks(filters));
      } else {
        setLoading(false);
        return;
      }
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters.search, filters.priority, filters.ongoing]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await taskService.getTaskStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (isAdmin) fetchStats(); }, [isAdmin, fetchStats]);

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleDragStart = (task) => {
    dragTaskRef.current = task;
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDropTarget(status);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDropTarget(null);
    const task = dragTaskRef.current;
    if (!task || task.status === newStatus) return;
    dragTaskRef.current = null;
    const formData = new FormData();
    formData.append('status', newStatus);
    try {
      await taskService.updateTaskStatus(task._id, formData);
      fetchTasks();
      if (isAdmin) fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Batch Operations ──────────────────────────────────────────
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(tasks.filter(t => t.status !== 'Completed').map(t => t._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchUpdate = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    try {
      await taskService.batchUpdateStatus(selectedIds, bulkStatus);
      setSelectedIds([]);
      setBulkStatus('');
      fetchTasks();
      if (isAdmin) fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Task creation ─────────────────────────────────────────────
  const handleCreateTask = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    for (const key in formData) {
      if (key === 'files') {
        for (let i = 0; i < formData.files.length; i++) fd.append('files', formData.files[i]);
      } else {
        fd.append(key, formData[key]);
      }
    }
    await taskService.createTask(fd);
    setActiveTab('assignedByMe');
    setFormData({ title: '', description: '', priority: 'Medium', deadline: '', assignedTo: '', assignedRole: '', files: [], recurrence: 'none', isOngoing: false, slaHours: '0' });
    fetchTasks();
    if (isAdmin) fetchStats();
  };

  const setQuickDeadline = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFormData({ ...formData, deadline: d.toISOString().split('T')[0] });
    setActiveQuickDeadline(days);
  };

  const handleDateChange = (e) => {
    setFormData({ ...formData, deadline: e.target.value });
    setActiveQuickDeadline(null);
  };

  // ── Formatting ────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ── Export / Print ────────────────────────────────────────────
  const exportToCSV = () => {
    const headers = ['Title', 'Description', 'Priority', 'Status', 'Assigned To', 'Assigned By', 'Created Date', 'Deadline', 'Completed On', 'Completion Note', 'SLA Breached', 'Recurrence'];
    const rows = tasks.map(t => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.priority || '',
      t.status || '',
      t.assignedTo?.name || t.assignedRole || '',
      t.createdBy?.name || '',
      formatDateTime(t.createdAt),
      formatDate(t.deadline),
      t.status === 'Completed' ? formatDateTime(t.updatedAt) : '',
      `"${(t.completionNote || '').replace(/"/g, '""')}"`,
      t.slaBreached ? 'Yes' : 'No',
      t.recurrence || 'none',
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'task_report.csv');
    document.body.appendChild(link);
    link.click();
  };

  const handlePrint = () => {
    setShowPrintModal(true);
    setTimeout(() => {
      window.print();
      setShowPrintModal(false);
    }, 500);
  };

  const isTaskOverdue = (t) => t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date();

  const filteredHistoryTasks = tasks.filter(t => {
    if (filters.status) {
      if (filters.status === 'overdue' && !isTaskOverdue(t)) return false;
      if (filters.status === 'completed' && t.status !== 'Completed') return false;
      if (filters.status === 'in-process' && t.status !== 'In Process') return false;
      if (filters.status === 'received' && t.status !== 'Received') return false;
    }
    if (filters.dateFrom && new Date(t.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(t.createdAt) > end) return false;
    }
    return true;
  });

  // ── Derived stats ─────────────────────────────────────────────
  const localStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Received').length,
    inProgress: tasks.filter(t => t.status === 'In Process').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    overdue: tasks.filter(t => isTaskOverdue(t)).length,
    slaBreached: tasks.filter(t => t.slaBreached).length,
  };

  const statCards = stats ? [
    { label: 'Total Tasks', value: stats.total, icon: '📋', bg: '#dbeafe', color: '#1e40af', sub: `${stats.completionRate}% completion` },
    { label: 'Pending', value: stats.pending, icon: '📥', bg: '#dbeafe', color: '#1e40af', sub: `${stats.overdue} overdue` },
    { label: 'In Progress', value: stats.inProgress, icon: '🔄', bg: '#fef3c7', color: '#92400e', sub: `${stats.slaBreached} SLA breaches` },
    { label: 'Completed', value: stats.completed, icon: '✅', bg: '#d1fae5', color: '#065f46', sub: `Avg ${stats.avgResolutionHours}h resolution` },
  ] : [
    { label: 'Total Tasks', value: localStats.total, icon: '📋', bg: '#dbeafe', color: '#1e40af' },
    { label: 'Pending', value: localStats.pending, icon: '📥', bg: '#dbeafe', color: '#1e40af' },
    { label: 'In Progress', value: localStats.inProgress, icon: '🔄', bg: '#fef3c7', color: '#92400e' },
    { label: 'Completed', value: localStats.completed, icon: '✅', bg: '#d1fae5', color: '#065f46' },
  ];

  const tabs = [
    { key: 'myTasks', label: 'My Tasks', icon: '📋' },
    ...(isAdmin ? [{ key: 'allTasks', label: 'All Tasks', icon: '📋' }] : []),
    ...(isAdmin ? [{ key: 'assignedByMe', label: 'Assigned By Me', icon: '✏️' }] : []),
    ...(isAdmin ? [{ key: 'addTask', label: '+ Add New Task', icon: '➕' }] : []),
    { key: 'history', label: 'History', icon: '📜' },
  ];

  const inputSx = {
    padding: '10px 14px', fontSize: 13,
    border: '1.5px solid var(--border)', borderRadius: 8,
    width: '100%', fontFamily: 'inherit', color: 'var(--text)',
    background: 'var(--surface)', transition: 'all 0.2s',
    outline: 'none', boxSizing: 'border-box'
  };

  const inputFocusSx = {
    borderColor: 'var(--primary-light)',
    boxShadow: '0 0 0 3px rgba(26,111,181,0.1)'
  };

  const thSx = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11,
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
    color: 'var(--text-muted)', background: 'var(--surface2)',
    borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap'
  };

  const tdSx = {
    padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle'
  };

  const statusBadgeClass = (status, isOverdue, isSlaBreached) => {
    if (isSlaBreached) return 'badge-danger';
    if (isOverdue) return 'badge-danger';
    if (status === 'Completed') return 'badge-success';
    if (status === 'In Process') return 'badge-warning';
    if (status === 'Received') return 'badge-info';
    return 'badge-gray';
  };

  // ── Drop zone column component ────────────────────────────────
  const DropZoneColumn = ({ status, label, color, tasks, isLoading }) => (
    <div
      onDragOver={(e) => handleDragOver(e, status)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, status)}
      style={{
        flex: 1, minWidth: 280,
        background: dropTarget === status ? 'rgba(26,111,181,0.06)' : 'transparent',
        borderRadius: 12,
        border: dropTarget === status ? '2px dashed var(--primary)' : '2px dashed transparent',
        transition: 'all 0.2s',
        padding: 12,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, padding: '0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block',
          }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
        </div>
        <span style={{
          background: 'var(--surface2)', padding: '2px 10px', borderRadius: 20,
          fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
        }}>{tasks.length}</span>
      </div>
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center', borderRadius: 8,
          border: '1px dashed var(--border)', background: 'var(--surface2)',
          fontSize: 12, color: 'var(--text-muted)',
        }}>
          Drop tasks here
        </div>
      ) : (
        tasks.map(task => (
          <div key={task._id} draggable onDragStart={() => handleDragStart(task)}
            style={{ cursor: 'grab', opacity: dragTaskRef.current?._id === task._id ? 0.4 : 1 }}
          >
            <TaskCard task={task} onUpdate={() => { fetchTasks(); if (isAdmin) fetchStats(); }} compact />
          </div>
        ))
      )}
    </div>
  );

  // ── Print-friendly view ───────────────────────────────────────
  if (showPrintModal) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>Task Report</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Title</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Priority</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Created</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Deadline</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t._id}>
                <td style={{ padding: 6, border: '1px solid #ddd' }}>{t.title}</td>
                <td style={{ padding: 6, border: '1px solid #ddd' }}>{t.priority}</td>
                <td style={{ padding: 6, border: '1px solid #ddd' }}>{t.status}</td>
                <td style={{ padding: 6, border: '1px solid #ddd' }}>{formatDateTime(t.createdAt)}</td>
                <td style={{ padding: 6, border: '1px solid #ddd' }}>{formatDate(t.deadline)}</td>
                <td style={{ padding: 6, border: '1px solid #ddd' }}>{t.assignedTo?.name || t.assignedRole || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Task Allocation</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Assign, track, and manage staff tasks across departments
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isAdmin && (
            <button className="btn btn-outline btn-sm" onClick={handlePrint} style={{ borderRadius: 24, padding: '9px 18px', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Report
            </button>
          )}
        </div>
      </div>

      {/* ── Enhanced Stats Dashboard ──────────────────────────────── */}
      <div className="task-stats-grid" style={{ marginBottom: 28 }}>
        {statCards.map(stat => (
          <div key={stat.label} className="stat-card" style={{ gap: 14, padding: '18px 20px' }}>
            <div className="stat-icon" style={{ background: stat.bg, width: 44, height: 44, borderRadius: 10, fontSize: 20 }}>
              {stat.icon}
            </div>
            <div>
              <div className="stat-label" style={{ fontSize: 11, minHeight: 'unset', marginBottom: 2 }}>
                {stat.label}
              </div>
              <div className="stat-value" style={{ fontSize: 24, color: stat.color }}>
                {stat.value}
              </div>
              {stat.sub && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {stat.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedIds([]); }}
            style={{
              padding: '9px 18px', borderRadius: 24, border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit', transition: 'all 0.2s', lineHeight: 1.4,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: activeTab === tab.key ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === tab.key ? '#fff' : 'var(--text)',
              boxShadow: activeTab === tab.key
                ? '0 2px 8px rgba(15,76,129,0.25)'
                : '0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.04)',
              border: activeTab === tab.key ? 'none' : '1px solid var(--border)'
            }}
          >
            {tab.label}
          </button>
        ))}
        {activeTab === 'history' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={exportToCSV} style={{ borderRadius: 24, padding: '9px 18px', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
            <button className="btn btn-outline btn-sm" onClick={handlePrint} style={{ borderRadius: 24, padding: '9px 18px', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>
          </div>
        )}
      </div>

      {/* ── Create Task Form ────────────────────────────────────── */}
      {activeTab === 'addTask' && (
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius)',
          boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
          border: '1px solid var(--border)', marginBottom: 24, overflow: 'hidden'
        }}>
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16
            }}>➕</span>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Create New Task</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Fill in the details to assign a new task to staff
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTask} style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Title *</label>
                <div style={{ position: 'relative' }}>
                  <input style={inputSx} maxLength={100}
                    onFocus={e => Object.assign(e.target.style, inputFocusSx)}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                    placeholder="Enter task title" value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                  <span style={{
                    position: 'absolute', right: 8, bottom: 8,
                    fontSize: 10, color: formData.title.length >= 90 ? '#ef4444' : 'var(--text-muted)',
                    fontWeight: 600
                  }}>{formData.title.length}/100</span>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Priority *</label>
                <select style={inputSx}
                  onFocus={e => Object.assign(e.target.style, inputFocusSx)}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })} required>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Description *</label>
              <textarea style={{ ...inputSx, resize: 'vertical', minHeight: 90 }}
                onFocus={e => Object.assign(e.target.style, inputFocusSx)}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                placeholder="Enter detailed task description" rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Assigned Role *</label>
                <select style={inputSx}
                  onFocus={e => Object.assign(e.target.style, inputFocusSx)}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  value={formData.assignedRole}
                  onChange={e => setFormData({ ...formData, assignedRole: e.target.value })} required>
                  <option value="">Select Role</option>
                  <option value="nurse">Nursing Staff</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Deadline *</label>
                <input type="date" style={inputSx}
                  onFocus={e => Object.assign(e.target.style, inputFocusSx)}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  value={formData.deadline} onChange={handleDateChange} required />
              </div>
            </div>

            {/* ── Recurrence / SLA Fields ──────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Recurrence</label>
                <select style={inputSx}
                  value={formData.recurrence}
                  onChange={e => setFormData({ ...formData, recurrence: e.target.value, isOngoing: e.target.value !== 'none' })}>
                  <option value="none">None (one-time)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">SLA (hours)</label>
                <input type="number" min="0" style={inputSx}
                  placeholder="0 = no SLA"
                  value={formData.slaHours}
                  onChange={e => setFormData({ ...formData, slaHours: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox"
                    checked={formData.isOngoing}
                    onChange={e => setFormData({ ...formData, isOngoing: e.target.checked })}
                    style={{ width: 16, height: 16 }} />
                  Ongoing Task
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Quick Set Deadline</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_DEADLINES.map(qd => {
                  const isActive = activeQuickDeadline === qd.days && formData.deadline;
                  return (
                    <button key={qd.days} type="button" onClick={() => setQuickDeadline(qd.days)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                        fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                        background: isActive ? 'var(--primary)' : 'var(--surface)',
                        color: isActive ? '#fff' : 'var(--text)',
                        border: isActive ? 'none' : '1px solid var(--border)',
                        boxShadow: isActive ? '0 2px 6px rgba(15,76,129,0.2)' : 'none'
                      }}
                      onMouseEnter={e => { if (!isActive) { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; } }}
                      onMouseLeave={e => { if (!isActive) { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text)'; } }}>
                      {qd.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Attachment (optional)</label>
              <div style={{
                border: '1.5px dashed var(--border)', borderRadius: 8,
                padding: '12px 14px', background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                <input type="file" multiple
                  style={{ border: 'none', padding: 0, fontSize: 13, fontFamily: 'inherit', flex: 1, background: 'transparent' }}
                  onChange={e => setFormData({ ...formData, files: e.target.files })} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Max 5 files, 10 MB each. Accepted: PDF, DOCX, JPG, PNG
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Submit Task
              </button>
              <button type="button" className="btn btn-ghost" style={{ padding: '10px 24px' }} onClick={() => setActiveTab('myTasks')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── History Tab ─────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            padding: 16, marginBottom: 20, border: '1px solid var(--border)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <div className="search-wrap" style={{ flex: '1 1 200px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input className="search-input" placeholder="Search by title..."
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <select className="form-control" value={filters.priority}
                onChange={e => setFilters({ ...filters, priority: e.target.value })} style={{ width: 140 }}>
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <select className="form-control" value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })} style={{ width: 140 }}>
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="received">Received</option>
                <option value="in-process">In Progress</option>
                <option value="overdue">Overdue</option>
              </select>
              <input type="date" className="form-control" value={filters.dateFrom}
                onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} style={{ width: 140 }} title="From date" />
              <input type="date" className="form-control" value={filters.dateTo}
                onChange={e => setFilters({ ...filters, dateTo: e.target.value })} style={{ width: 140 }} title="To date" />
            </div>
          </div>

          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
            overflowX: 'auto'
          }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
            ) : filteredHistoryTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '64px 24px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 56, height: 56, margin: '0 auto 16px', opacity: 0.2, display: 'block' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
                </svg>
                <p style={{ fontSize: 14, fontWeight: 500 }}>No tasks found</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={thSx}>Task Title</th>
                      <th style={thSx}>Assigned To</th>
                      <th style={thSx}>Assigned By</th>
                      <th style={thSx}>Created</th>
                      <th style={thSx}>Deadline</th>
                      <th style={thSx}>Completed</th>
                      <th style={thSx}>Status</th>
                      <th style={thSx}>SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryTasks.map(task => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <React.Fragment key={task._id}>
                          <tr onClick={() => setExpandedRow(expandedRow === task._id ? null : task._id)}
                            style={{ cursor: 'pointer', background: overdue ? '#fef2f2' : 'transparent' }}
                            onMouseEnter={e => { e.currentTarget.style.background = overdue ? '#fee2e2' : 'var(--surface2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = overdue ? '#fef2f2' : 'transparent'; }}>
                            <td style={tdSx}>
                              <strong style={{ color: 'var(--primary)', fontSize: 13 }}>{task.title}</strong>
                              {task.isOngoing && <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: 9 }}>Ongoing</span>}
                            </td>
                            <td style={tdSx}>{task.assignedTo?.name || <span className="text-muted">{task.assignedRole?.replace(/_/g, ' ') || '—'}</span>}</td>
                            <td style={tdSx}>{task.createdBy?.name || '—'}</td>
                            <td style={tdSx} className="text-small text-muted">{formatDateTime(task.createdAt)}</td>
                            <td style={tdSx} className="text-small">{formatDate(task.deadline)}</td>
                            <td style={tdSx} className="text-small text-muted">{task.status === 'Completed' ? formatDateTime(task.updatedAt) : '—'}</td>
                            <td style={tdSx}>
                              <span className={`badge ${statusBadgeClass(task.status, overdue, task.slaBreached)}`}>
                                {task.slaBreached ? 'SLA Breach' : overdue ? 'Overdue' : task.status}
                              </span>
                            </td>
                            <td style={tdSx}>
                              {task.slaHours > 0 ? (
                                <span style={{ fontSize: 11, color: task.slaBreached ? '#dc2626' : 'var(--text-muted)' }}>
                                  {task.slaHours}h {task.slaBreached ? '⚠️' : ''}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                          {expandedRow === task._id && (
                            <tr>
                              <td colSpan={8} style={{ padding: '0 14px 14px', background: 'var(--surface2)' }}>
                                <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                                  {task.description && (
                                    <div style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</div>
                                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{task.description}</p>
                                    </div>
                                  )}
                                  {task.completionNote && (
                                    <div style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Completion Note</div>
                                      <p style={{ fontSize: 13, color: 'var(--text)', fontStyle: 'italic', margin: 0 }}>"{task.completionNote}"</p>
                                    </div>
                                  )}
                                  {(task.taskFiles?.length > 0 || task.completionFiles?.length > 0) && (
                                    <div>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Files</div>
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {[...(task.taskFiles || []), ...(task.completionFiles || [])].filter(Boolean).map((f, i) => {
                                          const name = f.split('/').pop() || f.split('\\').pop() || `file-${i + 1}`;
                                          return (
                                            <a key={i} href={`/${f.replace(/^.*?uploads\//, 'uploads/')}`} target="_blank" rel="noopener noreferrer"
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, background: '#f1f5f9', color: 'var(--primary)', fontSize: 11, fontWeight: 500, textDecoration: 'none', border: '1px solid var(--border)' }}>
                                              📎 {name}
                                            </a>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── All Tasks Tab (Kanban / Drag & Drop) ────────────────── */}
      {activeTab === 'allTasks' && (
        <div>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            padding: 12, marginBottom: 20, border: '1px solid var(--border)',
            display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div className="search-wrap" style={{ flex: '1 1 200px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input className="search-input" placeholder="Search tasks..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })} />
            </div>
            <select className="form-control" value={filters.priority}
              onChange={e => setFilters({ ...filters, priority: e.target.value })} style={{ width: 130 }}>
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <input type="checkbox" checked={filters.ongoing === 'true'}
                onChange={e => setFilters({ ...filters, ongoing: e.target.checked ? 'true' : '' })}
                style={{ width: 14, height: 14 }} />
              Ongoing only
            </label>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Drag tasks between columns to update status
            </span>
          </div>

          <div style={{
            display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12,
          }}>
            {STATUSES.map(status => {
              const label = status === 'In Process' ? 'In Progress' : status;
              const color = status === 'Received' ? '#3b82f6' : status === 'In Process' ? '#f97316' : '#22c55e';
              const columnTasks = tasks.filter(t => t.status === status);
              return (
                <DropZoneColumn key={status} status={status} label={label} color={color} tasks={columnTasks} isLoading={loading} />
              );
            })}
          </div>
        </div>
      )}

      {/* ── My Tasks / Assigned By Me Tabs (list view + batch ops) ── */}
      {(activeTab === 'myTasks' || activeTab === 'assignedByMe') && (
        <div>
          {/* Batch operations bar (admin only) */}
          {activeTab === 'assignedByMe' && selectedIds.length > 0 && (
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius)',
              padding: '12px 18px', marginBottom: 16,
              border: '1px solid var(--primary)',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {selectedIds.length} task{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
              <select className="form-control" value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                style={{ width: 160 }}>
                <option value="">Bulk action...</option>
                <option value="In Process">Mark In Progress</option>
                <option value="Completed">Mark Completed</option>
              </select>
              <button className="btn btn-primary btn-sm" disabled={!bulkStatus} onClick={handleBatchUpdate}>
                Apply
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds([])}>
                Clear selection
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
          ) : tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '64px 24px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 56, height: 56, margin: '0 auto 16px', opacity: 0.2, display: 'block' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 500 }}>No tasks found</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {activeTab === 'myTasks' ? 'You have no tasks assigned' : 'No tasks assigned by you yet'}
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                </span>
                {activeTab === 'assignedByMe' && (
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" onChange={handleSelectAll}
                      checked={selectedIds.length === tasks.filter(t => t.status !== 'Completed').length && tasks.filter(t => t.status !== 'Completed').length > 0}
                      style={{ width: 14, height: 14 }} />
                    Select all non-completed
                  </label>
                )}
              </div>
              {tasks.map(task => (
                <div key={task._id} draggable={activeTab === 'myTasks'}
                  onDragStart={() => activeTab === 'myTasks' && handleDragStart(task)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {activeTab === 'assignedByMe' && (
                    <input type="checkbox" checked={selectedIds.includes(task._id)}
                      onChange={() => handleSelectOne(task._id)}
                      style={{ marginTop: 22, width: 16, height: 16 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <TaskCard task={task} onUpdate={() => { fetchTasks(); if (isAdmin) fetchStats(); }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
