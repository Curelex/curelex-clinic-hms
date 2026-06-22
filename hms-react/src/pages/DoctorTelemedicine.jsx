// hms-react/src/pages/DoctorTelemedicine.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const STATUS_COLORS = {
  requested: { bg: '#fef3c7', color: '#92400e', label: '⏳ Requested' },
  approved: { bg: '#dbeafe', color: '#1e40af', label: '✅ Approved' },
  scheduled: { bg: '#dbeafe', color: '#1e40af', label: '📅 Scheduled' },
  ready: { bg: '#d1fae5', color: '#065f46', label: '🟢 Ready' },
  ongoing: { bg: '#f97316', color: '#fff', label: '🔴 Ongoing' },
  completed: { bg: '#d1fae5', color: '#065f46', label: '✅ Completed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: '❌ Cancelled' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
};

export default function DoctorTelemedicine() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const doctorId = user?.id || user?._id;

  useEffect(() => {
    if (doctorId) {
      loadRequests();
      loadStats();
    }
  }, [doctorId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/telemedicine/doctor/${doctorId}`);
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const { data } = await API.get('/telemedicine/stats');
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleAction = async (action, id, data = {}) => {
    setActionLoading(true);
    try {
      await API.patch(`/telemedicine/${id}/${action}`, data);
      await loadRequests();
      await loadStats();
      setShowModal(false);
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
      alert(err.response?.data?.message || `Failed to ${action}`);
    }
    setActionLoading(false);
  };

  const openModal = (request, action) => {
    setSelectedRequest({ ...request, action });
    if (action === 'approve') {
      setScheduledTime(request.preferredTime || new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16));
    }
    setDoctorNotes('');
    setShowModal(true);
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  const getStatusCount = (status) => {
    return requests.filter(r => r.status === status).length;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading telemedicine requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🩺 Telemedicine</h1>
          <p className="text-muted text-small">Manage virtual consultations with patients</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total || 0, color: '#0f4c81' },
          { label: 'Requested', value: stats.requested || 0, color: '#f59e0b' },
          { label: 'Ongoing', value: stats.ongoing || 0, color: '#f97316' },
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

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => setFilter('all')}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12 }}
          >
            All ({requests.length})
          </button>
          {['requested', 'approved', 'ongoing', 'completed', 'cancelled'].map(status => (
            <button 
              key={status}
              onClick={() => setFilter(status)}
              className={`btn ${filter === status ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12 }}
            >
              {STATUS_COLORS[status]?.label || status} ({getStatusCount(status)})
            </button>
          ))}
          <button onClick={loadRequests} className="btn btn-outline" style={{ marginLeft: 'auto' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div>No telemedicine requests found</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Symptoms</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const sc = STATUS_COLORS[req.status] || STATUS_COLORS.requested;
                  return (
                    <tr key={req._id}>
                      <td>
                        <strong>{req.patientName}</strong>
                        <br />
                        <span className="text-muted text-small">{req.patientEmail}</span>
                      </td>
                      <td>
                        Dr. {req.doctorName}
                        <br />
                        <span className="text-muted text-small">{req.doctorSpecialization}</span>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        {req.symptoms || '—'}
                        {req.urgency === 'urgent' && (
                          <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700 }}>
                            Urgent
                          </span>
                        )}
                        {req.urgency === 'emergency' && (
                          <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700 }}>
                            🚨 Emergency
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                          background: req.urgency === 'emergency' ? '#fee2e2' : req.urgency === 'urgent' ? '#fef3c7' : '#f3f4f6',
                          color: req.urgency === 'emergency' ? '#991b1b' : req.urgency === 'urgent' ? '#92400e' : '#6b7280',
                        }}>
                          {req.urgency || 'normal'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: sc.bg, color: sc.color,
                        }}>
                          {sc.label}
                        </span>
                        {req.scheduledTime && req.status !== 'completed' && req.status !== 'cancelled' && (
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                            📅 {new Date(req.scheduledTime).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                          {req.status === 'requested' && (
                            <>
                              <button 
                                className="btn btn-sm btn-success"
                                onClick={() => openModal(req, 'approve')}
                              >
                                ✅ Approve
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => openModal(req, 'reject')}
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAction('start', req._id)}
                            >
                              🟢 Start Meeting
                            </button>
                          )}
                          {req.status === 'ongoing' && (
                            <>
                              <button 
                                className="btn btn-sm btn-success"
                                onClick={() => openModal(req, 'end')}
                              >
                                ⏹ End Meeting
                              </button>
                              {req.meetingLink && (
                                <a 
                                  href={req.meetingLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-primary"
                                >
                                  🔗 Join
                                </a>
                              )}
                            </>
                          )}
                          {(req.status === 'requested' || req.status === 'approved' || req.status === 'scheduled') && (
                            <button 
                              className="btn btn-sm btn-outline"
                              onClick={() => handleAction('cancel', req._id)}
                              style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            >
                              Cancel
                            </button>
                          )}
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowModal(true);
                            }}
                          >
                            View
                          </button>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {selectedRequest?.action === 'approve' && '✅ Approve Request'}
                {selectedRequest?.action === 'reject' && '❌ Reject Request'}
                {selectedRequest?.action === 'end' && '⏹ End Meeting'}
                {!selectedRequest?.action && '📋 Request Details'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {selectedRequest?.action === 'approve' && (
                <>
                  <p style={{ marginBottom: 16 }}>
                    Approve telemedicine request from <strong>{selectedRequest.patientName}</strong>
                  </p>
                  <div className="form-group">
                    <label className="form-label">Scheduled Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Add any notes for the patient..."
                    />
                  </div>
                </>
              )}

              {selectedRequest?.action === 'reject' && (
                <>
                  <p style={{ marginBottom: 16 }}>
                    Reject telemedicine request from <strong>{selectedRequest.patientName}</strong>
                  </p>
                  <div className="form-group">
                    <label className="form-label">Reason (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Reason for rejection..."
                    />
                  </div>
                </>
              )}

              {selectedRequest?.action === 'end' && (
                <>
                  <p style={{ marginBottom: 16 }}>
                    End meeting with <strong>{selectedRequest.patientName}</strong>
                  </p>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Add any notes from the consultation..."
                    />
                  </div>
                </>
              )}

              {!selectedRequest?.action && selectedRequest && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div className="text-muted text-small">Patient</div>
                      <div style={{ fontWeight: 600 }}>{selectedRequest.patientName}</div>
                    </div>
                    <div>
                      <div className="text-muted text-small">Doctor</div>
                      <div style={{ fontWeight: 600 }}>Dr. {selectedRequest.doctorName}</div>
                    </div>
                    <div>
                      <div className="text-muted text-small">Status</div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: STATUS_COLORS[selectedRequest.status]?.bg || '#f3f4f6',
                        color: STATUS_COLORS[selectedRequest.status]?.color || '#6b7280',
                      }}>
                        {STATUS_COLORS[selectedRequest.status]?.label || selectedRequest.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-muted text-small">Urgency</div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: selectedRequest.urgency === 'emergency' ? '#fee2e2' : selectedRequest.urgency === 'urgent' ? '#fef3c7' : '#f3f4f6',
                        color: selectedRequest.urgency === 'emergency' ? '#991b1b' : selectedRequest.urgency === 'urgent' ? '#92400e' : '#6b7280',
                      }}>
                        {selectedRequest.urgency || 'normal'}
                      </span>
                    </div>
                    <div>
                      <div className="text-muted text-small">Requested</div>
                      <div>{new Date(selectedRequest.createdAt).toLocaleString()}</div>
                    </div>
                    {selectedRequest.scheduledTime && (
                      <div>
                        <div className="text-muted text-small">Scheduled</div>
                        <div>{new Date(selectedRequest.scheduledTime).toLocaleString()}</div>
                      </div>
                    )}
                    {selectedRequest.meetingLink && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="text-muted text-small">Meeting Link</div>
                        <a href={selectedRequest.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0f4c81' }}>
                          {selectedRequest.meetingLink}
                        </a>
                      </div>
                    )}
                    {selectedRequest.symptoms && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="text-muted text-small">Symptoms</div>
                        <div>{selectedRequest.symptoms}</div>
                      </div>
                    )}
                    {selectedRequest.doctorNotes && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div className="text-muted text-small">Doctor Notes</div>
                        <div>{selectedRequest.doctorNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Close</button>
              {selectedRequest?.action && (
                <button 
                  className={`btn ${selectedRequest.action === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => handleAction(selectedRequest.action, selectedRequest._id, {
                    scheduledTime,
                    doctorNotes,
                  })}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 
                    selectedRequest.action === 'approve' ? '✅ Approve' :
                    selectedRequest.action === 'reject' ? '✕ Reject' :
                    selectedRequest.action === 'end' ? '⏹ End Meeting' : 'Confirm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}