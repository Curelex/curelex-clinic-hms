// hms-react/src/pages/PatientLogin.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PatientLogin() {
  const [view, setView] = useState('login'); // 'login' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, loginWithGoogle, forgotPassword, loading } = useAuth();
  const navigate = useNavigate();

  // Google OAuth Simulation state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleError, setGoogleError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      if (result.user?.role === 'patient') {
        navigate('/patient-dashboard');
      } else {
        setError('This account is not registered as a patient. Please use staff login.');
      }
    } else {
      setError(result.message || 'Invalid credentials');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!resetEmail) {
      setError('Please enter your email address.');
      return;
    }
    const result = await forgotPassword(resetEmail);
    if (result.success) {
      setSuccess(`Password reset link generated. You can copy it below to test:`);
      // Expose resetLink in state to render in UI
      setForm(prev => ({ ...prev, tempResetLink: result.resetLink }));
    } else {
      setError(result.message || 'Failed to send reset link.');
    }
  };

  const handleGoogleSubmit = async (e) => {
    e.preventDefault();
    setGoogleError('');
    if (!googleEmail) {
      setGoogleError('Please enter an email address.');
      return;
    }
    // Simulate Google OAuth Payload
    const googleData = {
      email: googleEmail,
      name: googleName || googleEmail.split('@')[0],
      isPatient: true // Patient login page
    };

    const result = await loginWithGoogle(googleData, true);
    if (result.success) {
      setShowGoogleModal(false);
      navigate('/patient-dashboard');
    } else {
      setGoogleError(result.message || 'Google Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        
        {/* ── View: Regular Login ── */}
        {view === 'login' && (
          <>
            <div className="login-logo">
              <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
              <h1>Patient Login</h1>
              <p>Access your health records and appointments</p>
            </div>

            {error && <div className="error-msg" style={errorStyle}>{error}</div>}

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
              <div className="form-group" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                    style={{ border: 'none', background: 'none', color: '#0f4c81', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  className="form-control"
                  type="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  If you were registered by receptionist, use the same password to login
                </small>
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 10 }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 10px', color: '#94a3b8', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ padding: '0 10px' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={() => { setShowGoogleModal(true); setGoogleError(''); }}
              className="btn btn-outline"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '10px', fontSize: '13px', fontWeight: '600', border: '1.5px solid #cbd5e1',
                borderRadius: '8px', background: '#fff', color: '#334155', cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.63v3.02h3.87c2.26-2.08 3.58-5.14 3.58-8.5z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.11C3.18 21.88 7.39 24 12 24z"/>
                <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.62H1.21C.44 8.16 0 9.88 0 11.7s.44 3.54 1.21 5.08l4.11-3.11z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.39 0 3.18 2.12 1.21 5.62l4.11 3.11c.94-2.85 3.57-4.98 6.68-4.98z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/patient-register" style={{ color: '#0f4c81', fontWeight: 600, textDecoration: 'none' }}>
                Create Account
              </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
              <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>
                ← Back to Staff Login
              </Link>
            </div>
          </>
        )}

        {/* ── View: Forgot Password ── */}
        {view === 'forgot' && (
          <>
            <div className="login-logo">
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
              <h1>Forgot Password</h1>
              <p>Enter your email to generate a password reset link</p>
            </div>

            {error && <div className="error-msg" style={errorStyle}>{error}</div>}
            {success && (
              <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <strong>{success}</strong>
                {form.tempResetLink && (
                  <a
                    href={form.tempResetLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'block', color: '#2563eb', fontWeight: 'bold', marginTop: '6px', textDecoration: 'underline', wordBreak: 'break-all' }}
                  >
                    {form.tempResetLink}
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleForgotSubmit}>
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Email Address</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="Enter registered email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                style={{ border: 'none', background: 'none', color: '#0f4c81', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Google Sign In Modal Overlay (Simulation Mode) ── */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px', width: '380px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.63v3.02h3.87c2.26-2.08 3.58-5.14 3.58-8.5z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.11C3.18 21.88 7.39 24 12 24z"/>
                <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.62H1.21C.44 8.16 0 9.88 0 11.7s.44 3.54 1.21 5.08l4.11-3.11z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.39 0 3.18 2.12 1.21 5.62l4.11 3.11c.94-2.85 3.57-4.98 6.68-4.98z"/>
              </svg>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Sign in with Google</h3>
            </div>
            
            {googleError && <div className="error-msg" style={{ ...errorStyle, margin: '0 0 14px' }}>{googleError}</div>}

            <form onSubmit={handleGoogleSubmit} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12 }}>Google Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={e => setGoogleEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 12 }}>Display Name (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={googleName}
                  onChange={e => setGoogleName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setShowGoogleModal(false)} className="btn btn-outline" style={{ flex: 1, padding: 10 }}>Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: 10, justifyContent: 'center' }}>
                  {loading ? 'Connecting...' : 'Authorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const errorStyle = {
  background: '#fef2f2',
  color: '#dc2626',
  border: '1px solid #fca5a5',
  padding: '10px 14px',
  borderRadius: '8px',
  marginBottom: '16px',
  fontSize: '14px'
};