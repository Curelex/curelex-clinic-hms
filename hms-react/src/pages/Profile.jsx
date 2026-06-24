import React, { useState } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PatientSidebar from '../components/PatientSidebar';

export default function Profile() {
  const { user, patient } = useAuth();

  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const patientName = patient?.name || user?.name || 'Patient';
  const patientEmail = patient?.email || user?.email || '';

  const initials = patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [showEditModal, setShowEditModal] = React.useState(false);

  const [showPasswordModal, setShowPasswordModal] = React.useState(false);

  const fileInputRef = React.useRef(null);

  const [previewImage, setPreviewImage] = React.useState(null);

  const [selectedAvatar, setSelectedAvatar] = React.useState(null);

  const handleRemoveAvatar = async () => {
    try {
      await API.put(`/auth/users/${user._id}`, {
        avatar: '',
      });

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to remove photo');
    }
  };

  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveProfile = async () => {
    try {
      let avatarData = user?.avatar || '';

      if (selectedAvatar) {
        avatarData = await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;

          reader.readAsDataURL(selectedAvatar);
        });
      }
      console.log("AVATAR DATA:", avatarData);
      const response = await API.put(
        `/patients/${patient._id}`,
        {
          name: editForm.name,
          phone: editForm.phone,
          dob: editForm.dob,
          gender: editForm.gender,
          bloodGroup: editForm.bloodGroup,
          avatar: avatarData,
        }
      );


      console.log('UPDATED USER:', response.data);

      setShowEditModal(false);

      window.location.reload();
    } catch (err) {
      console.error(err);
      console.log("ERROR RESPONSE:", err.response?.data);
      alert(err.response?.data?.message || 'Failed to update profile');

    }
  };

  const handleChangePassword = async () => {
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        alert('New passwords do not match');
        return;
      }

      await API.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      alert('Password updated successfully!');

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setShowPasswordModal(false);
    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
        'Failed to update password'
      );
    }
  };

  const isMobile = window.innerWidth <= 768;

  const [editForm, setEditForm] = React.useState({
    name: user?.name || '',
    phone: user?.phone || '',
    dob: patient?.dob || '',
    gender: patient?.gender || '',
    bloodGroup: patient?.bloodGroup || '',
  });

  const displayName =
    user?.name ||
    user?.fullName ||
    'Unknown User';

  const avatarLetter = displayName.charAt(0).toUpperCase();

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : 'N/A';

  return (
    <>
      {!sidebarOpen && (
        <div
          style={{
            padding: "12px 20px",
            marginBottom: "8px",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "#0f2d52",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            ☰ Menu
          </button>
        </div>
      )}

      {sidebarOpen && (
        <PatientSidebar
          activeItem="documents" // <-- page ke hisaab se change karna
          onClose={() => setSidebarOpen(false)}
          patientName={patientName}
          patientEmail={patientEmail}
          initials={initials}
        />
      )}

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            zIndex: 9998
          }}
        />
      )}



      <div>
        <div>
          {/* Header */}
          <div className="page-header">
            <h1 className="page-title">👤 My Profile</h1>
          </div>

          {/* Hero Section */}
          <div
            style={{
              background:
                'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #38bdf8 100%)',
              borderRadius: 24,
              padding: 32,
              color: '#fff',
              marginBottom: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              position: 'relative',
              overflow: 'hidden',
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
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.12)',
                    border: '3px solid rgba(255,255,255,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                    fontWeight: 700,
                    boxShadow: '0 0 40px rgba(56,189,248,0.45)',
                  }}
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%',
                      }}
                    />
                  ) : user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Profile"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%',
                      }}
                    />
                  ) : (
                    avatarLetter
                  )}
                </div>

                <button
                  style={{
                    position: 'absolute',
                    bottom: -5,
                    right: -5,
                    border: 'none',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    cursor: 'pointer',
                    background: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];

                  if (!file) return;

                  if (file.size > 2 * 1024 * 1024) {
                    alert('Image must be under 2 MB');
                    return;
                  }

                  setSelectedAvatar(file);

                  const imageUrl = URL.createObjectURL(file);
                  setPreviewImage(imageUrl);

                  try {
                    const avatarData = await new Promise((resolve, reject) => {
                      const reader = new FileReader();

                      reader.onloadend = () => resolve(reader.result);
                      reader.onerror = reject;

                      reader.readAsDataURL(file);
                    });

                    await API.put(`/auth/users/${user._id}`, {
                      avatar: avatarData,
                    });

                    window.location.reload();
                  } catch (err) {
                    console.error(err);

                    console.log("UPLOAD ERROR:", err.response?.data);
                    console.log("STATUS:", err.response?.status);

                    alert(
                      err.response?.data?.message ||
                      err.message ||
                      'Failed to upload image'
                    );
                  }
                }}
              />

              <button
                onClick={handleRemoveAvatar}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  color: '#fecaca',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                🗑️ Remove Photo
              </button>

              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 38,
                    fontWeight: 800,
                  }}
                >
                  {displayName}
                </h1>

                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    opacity: 0.95,
                    fontSize: 17,
                  }}
                >
                  {user?.email}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginTop: 16,
                  }}
                >
                  <span
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.15)',
                      fontWeight: 600,
                    }}
                  >
                    🛡️ {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                  </span>

                  <span
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      background: user?.isActive
                        ? 'rgba(34,197,94,0.2)'
                        : 'rgba(239,68,68,0.2)',
                      fontWeight: 600,
                    }}
                  >
                    {user?.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              }}
            >
              <div
                style={{
                  color: '#64748b',
                  fontSize: 14,
                }}
              >
                Account Status
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 28,
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
                padding: 24,
                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              }}
            >
              <div
                style={{
                  color: '#64748b',
                  fontSize: 14,
                }}
              >
                Member Since
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {memberSince}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 28,
              marginBottom: 24,
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 24,
              }}
            >
              👤 Personal Information
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  window.innerWidth <= 768
                    ? '1fr'
                    : '180px 1fr',
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
              <div
                style={{
                  fontWeight: 600,
                  wordBreak: 'break-word',
                }}
              >
                {user?.email}
              </div>

              <div style={{ color: '#64748b', fontWeight: 600 }}>
                Phone
              </div>

              <div style={{ fontWeight: 600 }}>
                {user?.phone || 'Not Provided'}
              </div>

              <div style={{ color: '#64748b', fontWeight: 600 }}>
                Date of Birth
              </div>

              <div style={{ fontWeight: 600 }}>
                {patient?.dob
                  ? new Date(patient.dob).toLocaleDateString('en-GB')
                  : 'Not Provided'}
              </div>

              <div style={{ color: '#64748b', fontWeight: 600 }}>
                Gender
              </div>

              <div style={{ fontWeight: 600 }}>
                {patient?.gender || 'Not Provided'}
              </div>

              <div style={{ color: '#64748b', fontWeight: 600 }}>
                Blood Group
              </div>

              <div style={{ fontWeight: 600 }}>
                {patient?.bloodGroup || 'Not Provided'}
              </div>

              <div style={{ color: '#64748b', fontWeight: 600 }}>
                Member Since
              </div>
              <div style={{ fontWeight: 600 }}>
                {memberSince}
              </div>
            </div>
          </div>



          {/* Actions */}
          <div
            style={{
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
              onClick={() => {
                setEditForm({
                  name: user?.name || '',
                  phone: user?.phone || '',
                });

                setShowEditModal(true);
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
              onClick={() => setShowPasswordModal(true)}
            >
              🔒 Change Password
            </button>
          </div>

          {showEditModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 700,
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  background: '#fff',
                  borderRadius: 20,
                  padding: 24,
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: 24 }}>
                  Edit Profile
                </h2>

                {/* Personal Information */}
                <div style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      fontSize: 16,
                      marginBottom: 16,
                      color: '#1e293b',
                    }}
                  >
                    Personal Information
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                      Full Name
                    </label>

                    <input
                      className="form-control"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                      Email Address
                    </label>

                    <input
                      className="form-control"
                      value={user?.email || ''}
                      disabled
                      style={{
                        background: '#f8fafc',
                        color: '#64748b',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                      Phone Number
                    </label>

                    <input
                      className="form-control"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>
                    Date of Birth
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    value={editForm.dob}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        dob: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>
                    Gender
                  </label>

                  <select
                    className="form-control"
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        gender: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>
                    Blood Group
                  </label>

                  <select
                    className="form-control"
                    value={editForm.bloodGroup}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        bloodGroup: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>



                {/* Account Information */}
                <div
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: 20,
                    marginBottom: 24,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 16,
                      marginBottom: 16,
                      color: '#1e293b',
                    }}
                  >
                    Account Information
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                      Role
                    </label>

                    <input
                      className="form-control"
                      value={
                        user?.role === 'admin'
                          ? 'Administrator'
                          : user?.role || ''
                      }
                      disabled
                      style={{
                        background: '#f8fafc',
                        color: '#64748b',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                      Account Status
                    </label>

                    <input
                      className="form-control"
                      value={user?.isActive ? 'Active' : 'Inactive'}
                      disabled
                      style={{
                        background: '#f8fafc',
                        color: '#64748b',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 6 }}>
                      Member Since
                    </label>

                    <input
                      className="form-control"
                      value={memberSince}
                      disabled
                      style={{
                        background: '#f8fafc',
                        color: '#64748b',
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                    marginTop: 24,
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPasswordModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 500,
                  background: '#fff',
                  borderRadius: 20,
                  padding: 24,
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  Change Password
                </h2>

                <div style={{ marginBottom: 16 }}>
                  <label>Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleChangePassword}
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}