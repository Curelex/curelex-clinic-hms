// src/components/Sidebar.jsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { isSectionVisible } from '../utils/planConfig';   // ✅ correct path

const NAV_ITEMS = [
  { key: 'overview',      label: 'Overview',      icon: '📊' },
  { key: 'doctors',       label: 'Doctors',        icon: '👨‍⚕️' },
  { key: 'receptionists', label: 'Receptionists',  icon: '🧑‍💼' },
  { key: 'allPatients',   label: 'All Patients',   icon: '👥' },
  { key: 'followUps',     label: 'Follow-ups',     icon: '📅' },
  { key: 'pharmacists',   label: 'Pharmacists',    icon: '💊' },
  { key: 'revenue',       label: 'Revenue',        icon: '💰' },
  { key: 'settings',      label: 'Settings',       icon: '⚙️' },
  { key: 'labReports',    label: 'Lab Reports',    icon: '🧪' },
  { key: 'analytics',     label: 'Analytics',      icon: '📈' },
];

const PLAN_NAMES = {
  lite: 'Clinic Lite',
  plus: 'Clinic Plus',
  pro:  'Clinic Pro',
};

export default function Sidebar({ activePage, onNavigate }) {
  const { session, activePlan } = useApp();

  // activePlan can be null before plan is chosen — default to 'lite' for safety
  const safePlan = activePlan ?? 'lite';

  return (
    <nav style={{
      width: 240, minHeight: '100vh',
      background: 'linear-gradient(180deg,#0a3d62 0%,#0d4f7c 100%)',
      padding: '20px 12px',
      fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
    }}>
      {/* Clinic badge */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)', marginBottom:12 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#1565a8,#00b894)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏥</div>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:14, lineHeight:1.2 }}>{session?.clinicName ?? 'My Clinic'}</div>
          <div style={{ color:'rgba(255,255,255,0.55)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>Administrator</div>
        </div>
      </div>

      {/* Active plan badge */}
      <div style={{ marginBottom:16, padding:'0 6px' }}>
        <div style={{ background:'rgba(0,184,148,0.15)', border:'1px solid rgba(0,184,148,0.3)', borderRadius:8, padding:'5px 10px', fontSize:11.5, color:'#00e0b8', fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
          ●&nbsp;{PLAN_NAMES[safePlan] ?? 'No Plan'}
        </div>
      </div>

      {/* Nav items — filtered by plan */}
      {NAV_ITEMS
        .filter(item => isSectionVisible(safePlan, item.key))
        .map(item => {
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                width:'100%', padding:'11px 14px', borderRadius:10, border:'none',
                background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                fontSize:14, fontWeight: isActive ? 700 : 500,
                cursor:'pointer', marginBottom:2,
                transition:'background 0.15s,color 0.15s',
                textAlign:'left',
              }}
              onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseOut={e  => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize:16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })
      }
    </nav>
  );
}