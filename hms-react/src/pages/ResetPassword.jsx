// hms-react/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, loading } = useAuth();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing password reset parameters in URL.');
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const result = await resetPassword(email, token, password);
    if (result.success) {
      setSuccess('Your password has been successfully reset! You can now log in.');
      setTimeout(() => {
        navigate('/login');
      }, 4000);
    } else {
      setError(result.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
          <h1>Reset Password</h1>
          <p>Choose a secure new password for your account</p>
        </div>

        {error && (
          <div className="error-msg" style={{ 
            background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            background: '#dcfce7', color: '#15803d', border: '1px solid #86efac',
            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500
          }}>
            {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">New Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={!token || !email || loading}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={!token || !email || loading}
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!token || !email || loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
          <Link to="/login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
