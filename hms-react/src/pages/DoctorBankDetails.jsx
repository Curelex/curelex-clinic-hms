// hms-react/src/pages/DoctorBankDetails.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function DoctorBankDetails() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    upiId: '',
  });

  // Load existing bank details
  useEffect(() => {
    if (user?.bankDetails) {
      setForm({
        accountHolderName: user.bankDetails.accountHolderName || '',
        accountNumber: user.bankDetails.accountNumber || '',
        bankName: user.bankDetails.bankName || '',
        ifscCode: user.bankDetails.ifscCode || '',
        upiId: user.bankDetails.upiId || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await API.put('/telemedicine/bank-details', form);
      if (data.success) {
        setSuccess('✅ Bank details updated successfully!');
        // Update user in localStorage
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.bankDetails = data.bankDetails;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update bank details');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a2236', margin: 0 }}>
          💳 Bank Details
        </h1>
        <p style={{ color: '#6b7a99', marginTop: 4 }}>
          Add your bank details to receive telemedicine payouts
        </p>
      </div>

      {success && (
        <div style={{
          background: '#dcfce7',
          color: '#166534',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16
        }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: 12,
        padding: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Account Holder Name *
          </label>
          <input
            type="text"
            name="accountHolderName"
            value={form.accountHolderName}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
            placeholder="Enter account holder name"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Account Number *
          </label>
          <input
            type="text"
            name="accountNumber"
            value={form.accountNumber}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
            placeholder="Enter account number"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Bank Name *
          </label>
          <input
            type="text"
            name="bankName"
            value={form.bankName}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
            placeholder="Enter bank name"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            IFSC Code *
          </label>
          <input
            type="text"
            name="ifscCode"
            value={form.ifscCode}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
            placeholder="Enter IFSC code"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            UPI ID (Optional)
          </label>
          <input
            type="text"
            name="upiId"
            value={form.upiId}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              boxSizing: 'border-box'
            }}
            placeholder="Enter UPI ID (e.g., doctor@upi)"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#94a3b8' : '#2d6be4',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Saving...' : 'Save Bank Details'}
        </button>
      </form>
    </div>
  );
}