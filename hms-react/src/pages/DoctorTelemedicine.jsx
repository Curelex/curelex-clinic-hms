// hms-react/src/pages/DoctorTelemedicine.jsx

import React, { useState, useEffect, useRef } from 'react';
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
  const { user, isConnected, doctorStatus, setDoctorOnline, emit, on, off } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [newRequestAlert, setNewRequestAlert] = useState(null);

  const doctorId = user?._id || user?.id;
  // Guard so we only emit "go online" once per connection, not on every re-render
  const wentOnlineRef = useRef(false);

  // ── Socket: Listen for new requests ──
  useEffect(() => {
    if (!isConnected) {
      // Reset guard when socket drops so we re-announce on reconnect
      wentOnlineRef.current = false;
      return;
    }

    const handleNewRequest = (data) => {
      setNewRequestAlert(data);
      loadRequests();
      loadStats();
      setTimeout(() => setNewRequestAlert(null), 10000);
    };

    const handleStatusUpdate = () => {
      loadRequests();
      loadStats();
    };

    on('telemedicine:new-request', handleNewRequest);
    on('telemedicine:status-update', handleStatusUpdate);

    // Set doctor online exactly once per connection.
    // We intentionally do NOT read doctorStatus here — doing so would add it
    // to the deps array and cause the infinite loop (status → effect → setOnline → status…)
    if (!wentOnlineRef.current) {
      wentOnlineRef.current = true;
      setDoctorOnline('online');
    }

    return () => {
      off('telemedicine:new-request', handleNewRequest);
      off('telemedicine:status-update', handleStatusUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]); // stable: on/off/setDoctorOnline never change identity

  // ── Load data ──
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

  // ── Toggle online/offline status ──
  const toggleOnlineStatus = () => {
    const newStatus = doctorStatus === 'online' ? 'offline' : 'online';
    console.log(`🔄 Toggling doctor status to: ${newStatus}`);
    setDoctorOnline(newStatus);
  };

  // ── Actions ──
  const handleAction = async (action, id, data = {}) => {
    setActionLoading(true);
    try {
      const response = await API.patch(`/telemedicine/${id}/${action}`, data);
      
      // Emit socket event for real-time update
      if (isConnected) {
        const request = requests.find(r => r._id === id);
        if (request) {
          emit('telemedicine:status-update', {
            requestId: id,
            patientId: request.patientId,
            doctorId: doctorId,
            status: action === 'approve' ? 'approved' : 
                    action === 'reject' ? 'rejected' :
                    action === 'start' ? 'ongoing' :
                    action === 'end' ? 'completed' : action,
            notes: data.doctorNotes || ''
          });

          if (action === 'start' && response.data.telemedicine?.meetingLink) {
            emit('telemedicine:meeting-started', {
              requestId: id,
              patientId: request.patientId,
              doctorId: doctorId,
              meetingLink: response.data.telemedicine.meetingLink
            });
          }

          if (action === 'end') {
            emit('telemedicine:meeting-ended', {
              requestId: id,
              patientId: request.patientId,
              doctorId: doctorId,
              duration: response.data.telemedicine?.durationMinutes || 0
            });
          }
        }
      }
      
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
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .alert-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      {/* Header with Status Toggle */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🩺 Telemedicine</h1>
          <p className="text-muted text-small">Manage virtual consultations with patients</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Online Status Toggle */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            padding: '6px 12px',
            borderRadius: 20,
            background: doctorStatus === 'online' ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${doctorStatus === 'online' ? '#86efac' : '#fca5a5'}`
          }}>
            <span style={{ 
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: doctorStatus === 'online' ? '#22c55e' : '#ef4444',
              animation: doctorStatus === 'online' ? 'pulse 2s infinite' : 'none'
            }}></span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {doctorStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
            </span>
            <button
              onClick={toggleOnlineStatus}
              className={`btn btn-sm ${doctorStatus === 'online' ? 'btn-danger' : 'btn-success'}`}
              style={{ fontSize: 11, padding: '2px 10px' }}
            >
              {doctorStatus === 'online' ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {isConnected ? '🔗 Connected' : '⚠️ Disconnected'}
          </span>
        </div>
      </div>

      {/* New Request Alert */}
      {newRequestAlert && (
        <div className="alert-slide-in" style={{
          background: newRequestAlert.urgency === 'emergency' ? '#fee2e2' : '#dbeafe',
          border: `2px solid ${newRequestAlert.urgency === 'emergency' ? '#ef4444' : '#3b82f6'}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>🔔 New Request:</strong> {newRequestAlert.patientName}
            {newRequestAlert.urgency === 'emergency' && (
              <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700 }}>
                🚨 EMERGENCY
              </span>
            )}
            {newRequestAlert.urgency === 'urgent' && (
              <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700 }}>
                ⚠️ URGENT
              </span>
            )}
          </div>
          <div>
            <button 
              className="btn btn-sm btn-primary" 
              onClick={() => {
                setFilter('requested');
                setNewRequestAlert(null);
              }}
            >
              View Request
            </button>
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={() => setNewRequestAlert(null)}
              style={{ marginLeft: 8 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

      {/* Modal - Keep existing modal code */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            {/* ... existing modal code ... */}
          </div>
        </div>
      )}
    </div>
  );
}