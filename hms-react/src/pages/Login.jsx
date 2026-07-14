// hms-react/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // ── Redirect after login based on role ──────────────────────────────────
  const redirectByRole = (role) => {
    if (role === 'super_admin') navigate('/super-admin');
    else if (role === 'patient') navigate('/patient-dashboard');
    else if (role === 'separate_doctor') navigate('/solo-doctor-dashboard');
    else navigate('/dashboard');
  };

  // ── Standard login ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;

    if (!passwordRegex.test(form.password)) {
      setError(
        'Password must contain at least 6 characters, 1 uppercase letter, 1 lowercase letter and 1 special character.'
      );
      return;
    }

    const result = await login(form.email, form.password);

    if (result.success) {
      redirectByRole(result.user?.role);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏥</div>
          <h1>MediCare HMS</h1>
          <p>Hospital Management System</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-control"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />

            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              Password must contain at least 6 characters, 1 uppercase, 1 lowercase and 1 special character.
            </p>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>
            Create Account
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <Link to="/patient-login" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
            👤 Patient Login
          </Link>
        </div>
      </div>
    </div>
  );
}