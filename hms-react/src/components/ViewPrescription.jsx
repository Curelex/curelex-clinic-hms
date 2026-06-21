// hms-react/src/components/ViewPrescription.jsx
import React, { useState } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ViewPrescription({ prescription, onClose, onStatusUpdate }) {
  const { user, isPatient, isDoctor, isAdmin } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState(prescription?.status || 'active');

  // ✅ Check if user can update status (NOT patient)
  const canUpdateStatus = isDoctor() || isAdmin() || user?.role?.toLowerCase() === 'pharmacist';
  const isPatientUser = isPatient();

  const handleStatusUpdate = async () => {
    // ✅ Prevent patients from updating
    if (isPatientUser) {
      setError('Patients are not allowed to update prescription status.');
      return;
    }

    if (newStatus === prescription.status) {
      onClose();
      return;
    }
    setUpdating(true);
    setError('');
    try {
      await API.patch(`/prescriptions/${prescription._id}/status`, { status: newStatus });
      onStatusUpdate?.();
      onClose();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.message || 'Failed to update status. Please try again.');
    }
    setUpdating(false);
  };

  if (!prescription) return null;

  const statusColors = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    active: { bg: '#dbeafe', color: '#1e40af', label: 'Active' },
    dispensed: { bg: '#fef3c7', color: '#92400e', label: 'Dispensed' },
    completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  };

  const sc = statusColors[prescription.status] || statusColors.draft;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
        fontFamily: 'inherit',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              📋 Prescription Details
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              #{prescription._id?.slice(-8)} · {prescription.patientName || 'Patient'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: '#94a3b8', padding: 4,
          }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '10px 14px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              fontSize: '13px',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: sc.bg, color: sc.color,
            }}>
              {sc.label}
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Created: {new Date(prescription.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
            {prescription.validUntil && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Valid until: {new Date(prescription.validUntil).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </span>
            )}
          </div>

          {/* Doctor & Patient Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Doctor</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {prescription.doctorId?.name || prescription.doctorName || '—'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {prescription.doctorId?.specialization || prescription.doctorSpecialization || ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Patient</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {prescription.patientId?.name || prescription.patientName || '—'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {prescription.patientId?.patientId || ''} · {prescription.patientId?.phone || prescription.patientPhone || ''}
              </div>
            </div>
          </div>

          {/* Created By Info */}
          {prescription.createdBy && (
            <div style={{ marginBottom: 16, fontSize: 12, color: '#94a3b8' }}>
              <i className="fas fa-user-pen" style={{ marginRight: 6 }}></i>
              Created by: <strong>{prescription.createdBy?.name || 'Unknown'}</strong>
              {prescription.createdByRole && ` (${prescription.createdByRole})`}
            </div>
          )}

          {/* Chief Complaint & Diagnosis */}
          {prescription.chiefComplaint && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Chief Complaint</div>
              <div style={{ fontSize: 14, color: '#1e293b' }}>{prescription.chiefComplaint}</div>
            </div>
          )}
          {prescription.diagnosis && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Diagnosis</div>
              <div style={{
                fontSize: 14, color: '#1e293b', background: '#f0f9ff',
                padding: '8px 12px', borderRadius: 8, border: '1px solid #bae6fd'
              }}>
                {prescription.diagnosis}
              </div>
            </div>
          )}

          {/* Medicines */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>💊 Medicines ({prescription.medicines?.length || 0})</div>
            {prescription.medicines?.map((med, index) => (
              <div key={index} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: '#f8fafc',
                borderRadius: 8, marginBottom: 6, border: '1px solid #e2e8f0',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{med.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {med.dosage} · {med.frequency} · {med.duration}
                    {med.strength && ` · ${med.strength}`}
                  </div>
                  {med.instructions && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      📝 {med.instructions}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                  background: '#dbeafe', color: '#1e40af',
                }}>
                  {med.quantity || 1}x
                </span>
              </div>
            ))}
          </div>

          {/* Tests */}
          {prescription.tests?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>🧪 Tests</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {prescription.tests.map((test, index) => (
                  <span key={index} style={{
                    padding: '4px 12px', background: '#f0f9ff',
                    borderRadius: 20, fontSize: 12, fontWeight: 500,
                    border: '1px solid #bae6fd', color: '#0369a1',
                  }}>
                    {test.name} {test.type && `· ${test.type}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {prescription.notes && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>📝 Notes</div>
              <div style={{ fontSize: 13, color: '#64748b', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                {prescription.notes}
              </div>
            </div>
          )}

          {/* Follow-up */}
          {prescription.followUpDate && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>📅 Follow-up</div>
              <div style={{ fontSize: 13, color: '#1e293b' }}>
                {new Date(prescription.followUpDate).toLocaleDateString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                })}
                {prescription.followUpInstructions && (
                  <span style={{ color: '#64748b', marginLeft: 8 }}>
                    — {prescription.followUpInstructions}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ✅ Status Update - ONLY for staff (doctors, admins, pharmacists) */}
          {canUpdateStatus ? (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                >
                  {Object.entries(statusColors).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: updating ? '#94a3b8' : '#0f4c81',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: updating ? 'default' : 'pointer',
                  }}
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          ) : (
            /* ✅ Show message for patients */
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: '#f0f9ff',
              borderRadius: 8,
              border: '1px solid #bae6fd',
              fontSize: 13,
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <i className="fas fa-info-circle"></i>
              <span>
                Your prescription is currently <strong>{sc.label}</strong>. 
                Please contact your doctor or pharmacist for any updates.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}