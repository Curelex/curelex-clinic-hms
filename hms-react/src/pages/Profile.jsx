import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  const displayName =
    user?.name ||
    user?.fullName ||
    'Unknown User';

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">👤 My Profile</h1>
      </div>

      {/* Hero Card */}
      <div
        style={{
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #38bdf8 100%)',
          borderRadius: 24,
          padding: 32,
          color: 'white',
          marginBottom: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '3px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 700,
              boxShadow: '0 0 40px rgba(56,189,248,0.5)',
            }}
          >
            {avatarLetter}
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 36,
                fontWeight: 800,
              }}
            >
              {displayName}
            </h1>

            <p
              style={{
                marginTop: 8,
                opacity: 0.9,
                fontSize: 16,
              }}
            >
              {user?.email}
            </p>

            <div
              style={{
                display: 'inline-block',
                marginTop: 12,
                padding: '8px 16px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              🛡️ {user?.role || 'User'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: 20,
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 14, color: '#64748b' }}>
            Account Status
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 24,
              fontWeight: 700,
              color: '#22c55e',
            }}
          >
            Active
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: 20,
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 14, color: '#64748b' }}>
            Role
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {user?.role}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: 20,
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 14, color: '#64748b' }}>
            Clinic
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Connected
          </div>
        </div>
      </div>

      {/* Main Info Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 24,
            fontSize: 24,
          }}
        >
          Account Information
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr',
            rowGap: 22,
            columnGap: 20,
          }}
        >
          <div style={{ color: '#64748b', fontWeight: 600 }}>
            Full Name
          </div>
          <div style={{ fontWeight: 600 }}>
            {displayName}
          </div>

          <div style={{ color: '#64748b', fontWeight: 600 }}>
            Email
          </div>
          <div style={{ fontWeight: 600 }}>
            {user?.email}
          </div>

          <div style={{ color: '#64748b', fontWeight: 600 }}>
            Role
          </div>
          <div style={{ fontWeight: 600 }}>
            {user?.role}
          </div>

          <div style={{ color: '#64748b', fontWeight: 600 }}>
            Clinic ID
          </div>
          <div
            style={{
              fontWeight: 600,
              wordBreak: 'break-all',
            }}
          >
            {user?.clinicId}
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn btn-primary"
            style={{
              padding: '12px 22px',
              borderRadius: 12,
            }}
          >
            ✏️ Edit Profile
          </button>

          <button
            className="btn btn-secondary"
            style={{
              padding: '12px 22px',
              borderRadius: 12,
            }}
          >
            🔒 Change Password
          </button>
        </div>
      </div>
    </div>
  );
}