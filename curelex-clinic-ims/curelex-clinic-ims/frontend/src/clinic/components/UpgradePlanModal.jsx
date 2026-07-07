// src/components/UpgradePlanModal.jsx
//
// Props:
//   open         – boolean
//   onClose      – () => void
//   role         – 'doctors' | 'receptionists' | 'pharmacists'
//   currentPlan  – 'lite' | 'plus'   (pro should never trigger this modal)
//   limit        – number  (the plan's max for that role; never -1 here)
//   onUpgrade    – () => void  (navigate to plan selection)

import React from 'react';

const ROLE_LABELS = {
  doctors:       { singular: 'Doctor',       plural: 'Doctors',       icon: '👨‍⚕️' },
  receptionists: { singular: 'Receptionist', plural: 'Receptionists', icon: '🧑‍💼' },
  pharmacists:   { singular: 'Pharmacist',   plural: 'Pharmacists',   icon: '💊'  },
};

const UPGRADE_PERKS = {
  // shown when currentPlan === 'lite' → upgrade to Plus
  lite: {
    targetPlan: 'Clinic Plus',
    price: '₹1,499/mo',
    color: '#1565a8',
    grad: 'linear-gradient(135deg,#0a3d62,#1565a8)',
    shadow: 'rgba(10,61,98,0.30)',
    perks: [
      'Up to 3 Doctors',
      '2 Receptionist Logins',
      'Pharmacy & Billing',
      'Daily Revenue Reports',
      'Follow-Up Reminders',
    ],
  },
  // shown when currentPlan === 'plus' → upgrade to Pro
  plus: {
    targetPlan: 'Clinic Pro',
    price: '₹1,999/mo',
    color: '#6c3fc5',
    grad: 'linear-gradient(135deg,#6c3fc5,#8e5cf5)',
    shadow: 'rgba(108,63,197,0.32)',
    perks: [
      'Unlimited Doctors & Staff',
      'Advanced EMR & Lab Reports',
      'Analytics Dashboard',
      'Role-Based Access Control',
      'Doctor Performance Insights',
    ],
  },
};

export default function UpgradePlanModal({
  open, onClose, role, currentPlan, limit, onUpgrade,
}) {
  if (!open) return null;

  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.doctors;

  // FIX: pro plan has no upgrade path — guard gracefully
  const upgrade = UPGRADE_PERKS[currentPlan];
  if (!upgrade) {
    // currentPlan === 'pro' or unknown — shouldn't happen, close silently
    console.warn(`UpgradePlanModal: no upgrade path for plan "${currentPlan}"`);
    onClose?.();
    return null;
  }

  // FIX: limit could theoretically be -1 (unlimited) — display safely
  const limitDisplay = limit === -1 ? 'unlimited' : limit;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,30,50,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn   { 0%{transform:scale(0.4);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        .upg-btn:hover { opacity:0.87!important; transform:translateY(-1px)!important; }
        .upg-perk { display:flex;align-items:center;gap:10px;font-size:13.5px;margin-bottom:9px; }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420,
          overflow: 'hidden', boxShadow: '0 32px 80px rgba(10,30,50,0.28)',
          animation: 'slideUp 0.38s cubic-bezier(.22,.68,0,1.2)',
        }}
      >
        {/* ── Coloured header ── */}
        <div style={{ background: upgrade.grad, padding: '28px 28px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, animation: 'popIn 0.5s ease both', marginBottom: 10 }}>🔒</div>
          <div style={{ color: '#fff', fontFamily: 'Georgia,serif', fontSize: 21, fontWeight: 700, marginBottom: 6 }}>
            {roleInfo.icon} {roleInfo.plural} Limit Reached
          </div>
          <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13.5, lineHeight: 1.55 }}>
            Your current plan allows a maximum of{' '}
            <strong style={{ color: '#fff' }}>{limitDisplay} {limitDisplay === 1 ? roleInfo.singular : roleInfo.plural}</strong>.
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 28px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4a6278', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>
            Upgrade to {upgrade.targetPlan} to unlock:
          </div>

          {upgrade.perks.map((perk, i) => (
            <div key={i} className="upg-perk">
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: upgrade.grad, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
              }}>✓</span>
              <span style={{ color: '#0a3d62' }}>{perk}</span>
            </div>
          ))}

          <div style={{
            background: `${upgrade.color}12`,
            border: `1.5px solid ${upgrade.color}25`,
            borderRadius: 12, padding: '12px 16px', marginTop: 8, marginBottom: 22,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 700, color: upgrade.color, fontSize: 15 }}>{upgrade.targetPlan}</div>
              <div style={{ fontSize: 12, color: '#4a6278', marginTop: 2 }}>Monthly · Cancel anytime</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 20, color: upgrade.color }}>{upgrade.price}</div>
          </div>

          <button
            className="upg-btn"
            onClick={onUpgrade}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 11, border: 'none',
              background: upgrade.grad, color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 5px 18px ${upgrade.shadow}`,
              transition: 'opacity 0.18s, transform 0.18s', marginBottom: 10,
            }}
          >
            🚀 Upgrade to {upgrade.targetPlan}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '11px 20px', borderRadius: 11,
              border: '1.5px solid #d0dce8', background: 'transparent',
              color: '#4a6278', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f4f8fc'}
            onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}