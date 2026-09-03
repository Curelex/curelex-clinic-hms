// hms-react/src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import curelexLogo from "../../assets/logo.png";
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginType = location.state?.loginType;

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
          <img
            src={curelexLogo}
            alt="Curelex"
            style={{
              height: 60,
              objectFit: "contain",
              marginBottom: 10,
            }}
          />
          <h1>Curelex HMS</h1>
          <p>Curelex Hospital Management System</p>
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
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: '45px' }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  lineHeight: 1
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

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

        {(loginType === 'hospital' || loginType === 'doctor') && (
          <div
            style={{
              textAlign: 'center',
              marginTop: 18,
              fontSize: 13,
              color: '#64748b'
            }}
          >
            Don't have an account?{' '}

            <Link
              to="/Register"
              state={{
                accountType: loginType === 'hospital' ? 'admin' : 'doctor'
              }}
              style={{
                color: '#0f4c81',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              {loginType === 'hospital'
                ? 'Register Hospital'
                : 'Register as Solo Doctor'}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}