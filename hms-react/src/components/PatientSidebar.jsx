// hms-react/src/components/PatientSidebar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PatientSidebar({
  activeItem,
  sidebarOpen,
  onClose,
  admission,
  patientName,
  patientEmail,
  initials
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/patient-login');
  };

  const goTo = (path) => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }

    navigate(path);
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-home', path: '/patient-dashboard' },
    { key: 'appointments', label: 'My Appointments', icon: 'fa-calendar-check', path: '/patient-appointments' },
    { key: 'admission', label: 'Hospital Admission', icon: 'fa-procedures', path: '/patient-admission' },
    { key: 'telemedicine', label: 'Telemedicine', icon: 'fa-video', path: '/patient-telemedicine' },
    { key: 'prescriptions', label: 'Prescriptions', icon: 'fa-prescription-bottle-alt', path: '/patient-prescriptions' },
    { key: 'documents', label: 'My Documents', icon: 'fa-folder-open', path: '/patient-documents' },
    { key: 'profile', label: 'Profile', icon: 'fa-user-circle', path: '/patient-profile' },
  ];

  return (

    <aside
      className={`pd-sidebar ${sidebarOpen ? 'open' : ''}`}
    >
      <div className="pd-sidebar__profile">
        <div className="pd-sidebar__avatar">{initials || 'P'}</div>
        <div>
          <div className="pd-sidebar__name">{patientName || 'Patient'}</div>
          <div className="pd-sidebar__phone">{patientEmail || ''}</div>
        </div>
      </div>
      <nav className="pd-sidebar__nav">
        {navItems.map((item) => (
          <div
            key={item.key}
            className={`pd-nav-item ${activeItem === item.key ? 'active' : ''}`}
            onClick={() => goTo(item.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              ...(item.key === 'admission' && admission ? { position: 'relative' } : {})
            }}
          >
            <i className={`fas ${item.icon}`}></i> {item.label}
            {item.key === 'admission' && admission && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                background: '#16a34a',
                borderRadius: 20,
                padding: '2px 7px',
              }}>
                LIVE
              </span>
            )}
          </div>
        ))}
      </nav>
      <div className="pd-sidebar__footer">
        <button className="pd-logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </aside>
  );
}