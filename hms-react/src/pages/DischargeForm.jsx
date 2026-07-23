// hms-react/src/components/DischargeForm.jsx
import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function DischargeForm({ admission, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [billSummary, setBillSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [form, setForm] = useState({
    dischargeDate: new Date().toISOString().split('T')[0],
    dischargeTime: new Date().toTimeString().slice(0, 5),
    dischargeType: 'Regular',
    reason: '',
    followUpInstructions: '',
    patientCondition: 'Stable',
    satisfied: true,
    feedback: '',
    paymentStatus: 'Pending',
    paymentMethod: 'Cash',
    notes: '',
  });

  useEffect(() => {
    fetchBillSummary();
    fetchPatientBills();
  }, []);

  const fetchBillSummary = async () => {
    try {
      const res = await API.get(`/admissions/${admission._id}/bill-summary`);
      setBillSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch bill summary:', err);
    }
  };

  const fetchPatientBills = async () => {
    try {
      const res = await API.get(`/patient-portal/${admission.patient._id}/bills`);
      setBills(res.data.bills.filter(b => b.paymentStatus !== 'Paid'));
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    }
  };

  const handleBillPayment = async (billId) => {
    try {
      await API.patch(`/billing/${billId}/payment`, {
        paymentStatus: 'Paid',
        paymentMethod: form.paymentMethod || 'Cash',
      });
      toast.success('Bill marked as paid');
      fetchPatientBills();
      fetchBillSummary();
    } catch (err) {
      toast.error('Failed to update bill');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if there are pending bills
    if (bills.length > 0) {
      const confirmDischarge = window.confirm(
        `Patient has ${bills.length} pending bill(s). Do you want to proceed with discharge?`
      );
      if (!confirmDischarge) return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        dischargeDate: new Date(`${form.dischargeDate}T${form.dischargeTime}`).toISOString(),
        bills: bills.map(b => b._id),
        billSettlement: bills.length === 0 ? 'Fully Paid' : 'Pending',
      };

      await API.post(`/admissions/${admission._id}/discharge`, payload);
      toast.success('Patient discharged successfully');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discharge patient');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = bills.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-lg"
        style={{
          maxWidth: 700,
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h3 className="modal-title">🏥 Discharge Patient</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          <div
            className="modal-body"
            style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
          >
            {/* Patient Info */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {admission.patient?.name}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {admission.patient?.patientId} · {admission.roomType} · {admission.admissionId}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    Admitted: {new Date(admission.admissionDate).toLocaleDateString()} ·
                    {' '}Days: {admission.daysAdmitted || 0}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: '#d1fae5',
                  color: '#065f46',
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}>
                  Active
                </span>
              </div>
            </div>

            {/* Bill Summary */}
            <div style={{
              background: bills.length > 0 ? '#fef3c7' : '#f0fdf4',
              border: `1px solid ${bills.length > 0 ? '#fcd34d' : '#bbf7d0'}`,
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>💳 Bill Summary</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    {bills.length > 0 ? (
                      <span style={{ color: '#92400e' }}>
                        ⚠️ {bills.length} pending bill(s) · Total: ₹{totalPending.toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ color: '#166534' }}>✅ All bills settled</span>
                    )}
                  </div>
                </div>
                {bills.length > 0 && (
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 700,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}>
                    Action Required
                  </span>
                )}
              </div>
            </div>

            {/* Pending Bills List */}
            {bills.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Pending Bills</div>
                {bills.map(bill => (
                  <div key={bill._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    marginBottom: 6,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{bill.billId}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        ₹{bill.totalAmount.toLocaleString()} · Balance: ₹{(bill.totalAmount - bill.paidAmount).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBillPayment(bill._id)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#16a34a',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Mark Paid
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Discharge Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Discharge Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dischargeDate}
                  onChange={e => setForm({ ...form, dischargeDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Discharge Time *</label>
                <input
                  type="time"
                  className="form-control"
                  value={form.dischargeTime}
                  onChange={e => setForm({ ...form, dischargeTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Discharge Type</label>
              <select
                className="form-control"
                value={form.dischargeType}
                onChange={e => setForm({ ...form, dischargeType: e.target.value })}
              >
                <option value="Regular">Regular</option>
                <option value="Against Medical Advice">Against Medical Advice</option>
                <option value="Referred">Referred</option>
                <option value="Transfer">Transfer to Another Facility</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Patient's Condition at Discharge</label>
              <select
                className="form-control"
                value={form.patientCondition}
                onChange={e => setForm({ ...form, patientCondition: e.target.value })}
              >
                <option value="Stable">Stable</option>
                <option value="Improved">Improved</option>
                <option value="Not Improved">Not Improved</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Discharge</label>
              <input
                type="text"
                className="form-control"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Treatment completed, Patient requested..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Follow-up Instructions</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.followUpInstructions}
                onChange={e => setForm({ ...form, followUpInstructions: e.target.value })}
                placeholder="Medications, diet, rest, appointments..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional discharge notes..."
              />
            </div>

            {/* Satisfaction Survey */}
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: 12,
              marginTop: 8,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Patient Satisfaction Survey</div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.satisfied}
                    onChange={e => setForm({ ...form, satisfied: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  Patient expressed satisfaction with care
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Patient Feedback</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.feedback}
                  onChange={e => setForm({ ...form, feedback: e.target.value })}
                  placeholder="Any feedback from the patient or family..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ flexShrink: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
            >
              {loading ? 'Processing...' : 'Confirm Discharge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}