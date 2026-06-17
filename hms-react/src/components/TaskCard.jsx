import React, { useState, useEffect } from 'react';
import taskService from '../services/taskService';

const PRIORITY_STYLES = {
  Low: { border: '#94a3b8', badge: 'badge-gray' },
  Medium: { border: '#3b82f6', badge: 'badge-info' },
  High: { border: '#f97316', badge: 'badge-warning' },
  Urgent: { border: '#ef4444', badge: 'badge-danger' }
};

function CountdownTimer({ deadline }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const calc = () => {
      const total = new Date(deadline) - new Date();
      if (total <= 0) return setRemaining({ expired: true });
      setRemaining({
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
        expired: false
      });
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!remaining) return null;
  if (remaining.expired) return <span style={{ color: '#dc2626', fontWeight: 700 }}>Overdue</span>;

  const parts = [];
  if (remaining.days > 0) parts.push(`${remaining.days}d`);
  if (remaining.hours > 0 || remaining.days > 0) parts.push(`${remaining.hours}h`);
  parts.push(`${remaining.minutes}m`);
  return <span>{parts.join(' ')} remaining</span>;
}

export default function TaskCard({ task, onUpdate, compact }) {
  const [expanded, setExpanded] = useState(false);
  const [showCompletionPanel, setShowCompletionPanel] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [completionFiles, setCompletionFiles] = useState([]);

  const isOverdue = task.status !== 'Completed' && task.deadline && new Date(task.deadline) < new Date();
  const displayStatus = task.slaBreached ? 'SLA Breach' : isOverdue ? 'Overdue' : task.status;
  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;

  const statusDisplayMeta = {
    'Received': { badge: 'badge-info', label: 'Received' },
    'In Process': { badge: 'badge-warning', label: 'In Progress' },
    'Completed': { badge: 'badge-success', label: 'Completed' },
    'Overdue': { badge: 'badge-danger', label: 'Overdue' },
    'SLA Breach': { badge: 'badge-danger', label: 'SLA Breach' },
  };
  const statusStyle = statusDisplayMeta[displayStatus] || statusDisplayMeta.Received;

  const handleStatusUpdate = async (status, note = null, files = []) => {
    const formData = new FormData();
    formData.append('status', status);
    if (note) formData.append('completionNote', note);
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    await taskService.updateTaskStatus(task._id, formData);
    onUpdate();
    setShowCompletionPanel(false);
    setCompletionFiles([]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isDeadlineClose = task.deadline && task.status !== 'Completed' && !isOverdue && (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24) <= 2;

  const taskFiles = task.taskFiles?.filter(Boolean) || [];
  const completionFileList = task.completionFiles?.filter(Boolean) || [];

  // ── Compact mode (for Kanban view) ────────────────────────────
  if (compact) {
    return (
      <div style={{
        background: 'var(--surface)', borderRadius: 10,
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${priorityStyle.border}`,
        marginBottom: 8, padding: '12px 14px',
        cursor: 'grab', userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span className={`badge ${priorityStyle.badge}`} style={{ fontSize: 9 }}>{task.priority}</span>
          <span className={`badge ${statusStyle.badge}`} style={{ fontSize: 9 }}>{statusStyle.label}</span>
          {task.slaBreached && <span className="badge badge-danger" style={{ fontSize: 9 }}>SLA</span>}
          {task.isOngoing && <span className="badge badge-warning" style={{ fontSize: 9 }}>↻</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {task.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {task.assignedTo?.name || task.assignedRole?.replace(/_/g, ' ') || 'Unassigned'}
        </div>
        {task.deadline && task.status !== 'Completed' && (
          <div style={{ fontSize: 10, color: isOverdue ? '#dc2626' : 'var(--text-muted)', marginTop: 4 }}>
            <CountdownTimer deadline={task.deadline} />
          </div>
        )}
        {task.slaHours > 0 && (
          <div style={{
            fontSize: 10, marginTop: 4,
            color: task.slaBreached ? '#dc2626' : 'var(--text-muted)',
            fontWeight: task.slaBreached ? 700 : 400,
          }}>
            SLA: {task.slaHours}h {task.slaBreached ? '⚠️ Breached' : ''}
          </div>
        )}
      </div>
    );
  }

  // ── Full mode ─────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${priorityStyle.border}`,
      marginBottom: 18, overflow: 'hidden'
    }}>
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <span className={`badge ${priorityStyle.badge}`} style={{ fontSize: 10 }}>{task.priority}</span>
              <span className={`badge ${statusStyle.badge}`} style={{ fontSize: 10 }}>{statusStyle.label}</span>
              {task.slaBreached && <span className="badge badge-danger" style={{ fontSize: 10 }}>SLA Breach</span>}
              {task.isOngoing && <span className="badge badge-warning" style={{ fontSize: 10 }}>Ongoing</span>}
              {task.recurrence && task.recurrence !== 'none' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 10, fontWeight: 600, padding: '2px 6px',
                  borderRadius: 5, background: '#f1f5f9', color: '#64748b'
                }}>
                  ↻ {task.recurrence}
                </span>
              )}
              {task.deadline && task.status !== 'Completed' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 6,
                  background: isOverdue ? '#fee2e2' : isDeadlineClose ? '#fef3c7' : '#f1f5f9',
                  color: isOverdue ? '#991b1b' : isDeadlineClose ? '#92400e' : '#475569'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <CountdownTimer deadline={task.deadline} />
                </span>
              )}
              {task.slaHours > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 10, fontWeight: 600, padding: '2px 6px',
                  borderRadius: 5,
                  background: task.slaBreached ? '#fee2e2' : '#f1f5f9',
                  color: task.slaBreached ? '#991b1b' : '#64748b'
                }}>
                  SLA: {task.slaHours}h{task.slaBreached ? ' ⚠️' : ''}
                </span>
              )}
              {task.status === 'Completed' && task.deadline && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 6, background: '#f1f5f9', color: '#475569'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Due {formatDate(task.deadline)}
                </span>
              )}
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{task.title}</h4>
          </div>
        </div>

        <div style={{
          marginTop: 14, display: 'flex', gap: 20, flexWrap: 'wrap',
          fontSize: 12, color: 'var(--text-muted)'
        }}>
          {task.createdBy?.name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              Assigned by: <strong style={{ color: 'var(--text)' }}>{task.createdBy.name}</strong>
            </span>
          )}
          {task.assignedTo?.name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Assigned to: <strong style={{ color: 'var(--text)' }}>{task.assignedTo.name}</strong>
            </span>
          )}
          {task.assignedRole && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              Role: <strong style={{ color: 'var(--text)' }}>{task.assignedRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
            </span>
          )}
        </div>

        {task.description && (
          <div style={{ marginTop: 14 }}>
            <div onClick={() => setExpanded(!expanded)}
              style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', lineHeight: 1.6, background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
              {expanded ? task.description : `${task.description.substring(0, 120)}${task.description.length > 120 ? '...' : ''}`}
              {task.description.length > 120 && (
                <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: 4, fontSize: 12 }}>
                  {expanded ? 'Show less' : 'Read more'}
                </span>
              )}
            </div>
          </div>
        )}

        {taskFiles.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Attached Files</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {taskFiles.map((f, i) => {
                const name = f.split('/').pop() || f.split('\\').pop() || `file-${i + 1}`;
                return (
                  <a key={i} href={f.startsWith('http') ? f : `/${f.replace(/^.*?uploads\//, 'uploads/')}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: '#f1f5f9', color: 'var(--primary)', fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '1px solid var(--border)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    {name}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {completionFileList.length > 0 && task.status === 'Completed' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Evidence Files</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {completionFileList.map((f, i) => {
                const name = f.split('/').pop() || f.split('\\').pop() || `evidence-${i + 1}`;
                return (
                  <a key={i} href={f.startsWith('http') ? f : `/${f.replace(/^.*?uploads\//, 'uploads/')}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, background: '#f0fdf4', color: '#065f46', fontSize: 11, fontWeight: 500, textDecoration: 'none', border: '1px solid #bbf7d0' }}>
                    📎 {name}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {!showCompletionPanel && task.status === 'Received' && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate('In Process')} style={{ gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Acknowledge & Start Process
            </button>
          </div>
        )}

        {!showCompletionPanel && task.status === 'In Process' && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-success btn-sm" onClick={() => setShowCompletionPanel(true)} style={{ gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Mark Complete
              </button>
            </div>
          </div>
        )}

        {task.status === 'Completed' && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '6px 12px', borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Completed{task.completionNote ? ' — with notes' : ''}
              {task.updatedAt && ` • ${formatDateTime(task.updatedAt)}`}
            </div>
            {task.completionNote && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "{task.completionNote}"
              </div>
            )}
          </div>
        )}

        {showCompletionPanel && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#065f46' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Complete Task
                </span>
              </div>
              <textarea className="form-control" placeholder="Add completion notes (optional)..." rows={3}
                value={completionNote} onChange={e => setCompletionNote(e.target.value)}
                style={{ marginBottom: 10, resize: 'vertical', fontSize: 13, borderColor: '#bbf7d0' }} />
              <div style={{ border: '1.5px dashed #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, background: '#fafdf5' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                  style={{ border: 'none', padding: 0, fontSize: 12, fontFamily: 'inherit', flex: 1, background: 'transparent' }}
                  onChange={e => setCompletionFiles([...e.target.files])} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate('Completed', completionNote, completionFiles)} style={{ gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Submit Completion
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowCompletionPanel(false); setCompletionFiles([]); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
