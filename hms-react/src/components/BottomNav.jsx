// hms-react/src/components/BottomNav.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { key: 'dashboard',     label: 'Home',    icon: 'fa-home' ,                   path: '/patient-dashboard' },
  { key: 'appointments',  label: 'Visits',  icon: 'fa-calendar-check',          path: '/patient-appointments' },
  { key: 'telemedicine',  label: 'Consult', icon: 'fa-video',                   path: '/patient-telemedicine' },
  { key: 'prescriptions', label: 'Rx',      icon: 'fa-pills',                   path: '/patient-prescriptions' },
  { key: 'documents',     label: 'Docs',    icon: 'fa-folder-open',             path: '/patient-documents' },
];

export default function BottomNav({ activeItem }) {
  const navigate = useNavigate();

  return (
    <nav className="pd-bottom-nav" aria-label="Mobile navigation">
      <div className="pd-bottom-nav__inner">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`pd-bottom-nav__item${activeItem === item.key ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={activeItem === item.key ? 'page' : undefined}
          >
            <i className={`fas ${item.icon}`} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
