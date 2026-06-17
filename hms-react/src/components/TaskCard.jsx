import React, { useState } from 'react';
import taskService from '../services/taskService';

const PRIORITY_COLORS = {
  Low: '#94a3b8',
  Medium: '#3b82f6',
  High: '#f97316',
  Urgent: '#ef4444'
};

export default function TaskCard({ task, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [showCompletionPanel, setShowCompletionPanel] = useState(false);
  const [completionNote, setCompletionNote] = useState('');

  const handleStatusUpdate = async (status, note = null) => {
    const formData = new FormData();
    formData.append('status', status);
    if (note) formData.append('completionNote', note);
    await taskService.updateTaskStatus(task._id, formData);
    onUpdate();
    setShowCompletionPanel(false);
  };

  return (
    <div className="card" style={{ padding: 15, marginBottom: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>{task.title}</h4>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: PRIORITY_COLORS[task.priority] + '20', color: PRIORITY_COLORS[task.priority] }}>
          {task.priority}
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        {expanded ? task.description : `${task.description.substring(0, 50)}...`}
      </p>
      <div style={{ fontSize: 12, color: '#475569' }}>Status: <strong>{task.status}</strong></div>
      
      <div style={{ marginTop: 10, display: 'flex', gap: 5 }}>
        {task.status === 'Received' && (
          <button onClick={() => handleStatusUpdate('In Process')}>Start Process</button>
        )}
        {(task.status === 'Received' || task.status === 'In Process') && (
          <button onClick={() => setShowCompletionPanel(true)}>Complete</button>
        )}
      </div>

      {showCompletionPanel && (
        <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 4 }}>
          <textarea placeholder="Completion Note" value={completionNote} onChange={e => setCompletionNote(e.target.value)} style={{ width: '100%', marginBottom: 5 }} />
          <button onClick={() => handleStatusUpdate('Completed', completionNote)}>Submit Completion</button>
        </div>
      )}
    </div>
  );
}
