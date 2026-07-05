
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiRegister, apiLogin } from '../utils/api';
import curelexLogo from '../assets/image.png';
import {useNavigate} from "react-router-dom";

// // ── Mobile detection hook ─────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Validation helpers ────────────────────────────────────────────────────────
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidPhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
};

// ── India Post Pincode API ────────────────────────────────────────────────────
// Returns { state, district, subDistrict, city } or null
async function fetchPincodeData(pincode) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const json = await res.json();
    if (!json || json.length === 0) return null;

    const address = json[0].address;
    const state = address.state || '';
    const district = address.state_district || address.county || '';
    const city = address.city || address.town || address.village || address.suburb || '';
    const subDistrict = address.suburb || address.county || '';

    return {
      state,
      district,
      subDistrict,
      allSubDistricts: subDistrict ? [subDistrict] : [],
      cities: city ? [city] : [],
    };
  } catch (err) {
    console.error('Pincode fetch error:', err);
    return null;
  }
}
// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  brand:       '#0a3d62',
  brandMid:    '#1565a8',
  accent:      '#00b894',
  accentLight: '#00cec9',
  textDark:    '#0a3d62',
  textMuted:   '#4a6278',
  textLight:   '#8fa8bc',
  border:      '#d0dce8',
  white:       '#ffffff',
  errBg:       '#fef2f2',
  errBorder:   '#fecaca',
  errText:     '#c0392b',
};

const makeStyles = (mob) => ({
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(150deg, #e8f4fd 0%, #f0f8ff 35%, #e8f9f5 70%, #f5fffc 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: mob ? '12px 16px 20px' : '16px 20px',
    position: 'relative', overflowX: 'hidden', overflowY: 'auto',
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    WebkitFontSmoothing: 'antialiased',
  },
  wrap: { position: 'relative', zIndex: 2, width: '100%', maxWidth: mob ? '100%' : 480 },
  brand: { textAlign: 'center', marginBottom: mob ? 6 : 10, paddingTop: 0 },
  logoBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: mob ? 2 : 4 },
  logoIcon: {
    width: mob ? 250 : 270, height: mob ? 150 : 180,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0, background: 'transparent',
  },
  brandSub: { color: C.textMuted, fontSize: mob ? 11.5 : 12.5, fontWeight: 300, letterSpacing: 0.3, marginBottom: 0 },
  card: {
    background: C.white, borderRadius: mob ? 14 : 18,
    padding: mob ? '20px 18px 18px' : '28px 32px',
    boxShadow: '0 20px 60px rgba(10,61,98,0.12)',
    border: '1px solid rgba(10,61,98,0.08)',
    position: 'relative', overflow: 'hidden',
  },
  cardAccentBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    background: `linear-gradient(90deg, ${C.brand}, ${C.brandMid}, ${C.accent})`,
  },
  welcomeBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'linear-gradient(135deg, rgba(10,61,98,0.06), rgba(0,184,148,0.06))',
    border: '1px solid rgba(10,61,98,0.12)', borderRadius: 20,
    padding: '4px 12px', fontSize: mob ? 11 : 12, color: C.textMuted,
    fontWeight: 500, marginBottom: mob ? 8 : 10,
  },
  badgeDot: { width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'inline-block' },
  welcomeTitle: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: mob ? 20 : 24, color: C.textDark,
    marginBottom: mob ? 4 : 6, lineHeight: 1.2, fontWeight: 700,
  },
  welcomeDesc: { color: C.textMuted, fontSize: mob ? 12.5 : 13.5, marginBottom: mob ? 14 : 18, lineHeight: 1.5 },
  dividerOr: {
    display: 'flex', alignItems: 'center', gap: 12,
    color: C.textLight, fontSize: 12, margin: `${mob ? 8 : 10}px 0`,
  },
  dividerLine: { flex: 1, height: 1, background: C.border },
  btnBase: {
    width: '100%', padding: mob ? '13px 20px' : '12px 20px',
    borderRadius: 10, fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: 15, fontWeight: 500, cursor: 'pointer', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },
  btnPrimary: {
    background: `linear-gradient(135deg, ${C.brand}, ${C.brandMid})`,
    color: C.white, boxShadow: '0 4px 14px rgba(10,61,98,0.3)',
  },
  btnOutline: { background: 'transparent', color: C.textDark, border: `1.5px solid ${C.border}` },
  btnAccent: {
    background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
    color: C.white, boxShadow: '0 4px 14px rgba(0,184,148,0.3)',
  },
  btnGhost: {
    background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
    fontSize: 13, padding: '6px 0', display: 'inline-flex', alignItems: 'center', gap: 4,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  },
  secHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: mob ? 14 : 18, paddingBottom: mob ? 12 : 16,
    borderBottom: '1px solid #f0f4f8',
  },
  secTitle: { fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: mob ? 19 : 22, color: C.textDark, fontWeight: 700 },
  field: { marginBottom: mob ? 10 : 12 },
  fieldLabel: { display: 'block', fontSize: 11.5, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' },
  fieldInput: {
    width: '100%', padding: mob ? '13px 14px' : '12px 14px',
    border: `1.5px solid ${C.border}`, borderRadius: 8,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    fontSize: mob ? 16 : 14.5, color: C.textDark, background: C.white,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
    WebkitAppearance: 'none',
  },
  fieldRow: { display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: mob ? 0 : 12 },
  alertError: {
    padding: '11px 14px', borderRadius: 8, background: C.errBg,
    border: `1px solid ${C.errBorder}`, color: C.errText, fontSize: 13.5,
    display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, lineHeight: 1.4,
  },
  hintOk:  { fontSize: 11.5, color: '#00a878', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 },
  hintErr: { fontSize: 11.5, color: '#e74c3c', marginTop: 4 },
});

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IcoArrowRight({ color = 'white' }) {
  return <svg width="16" height="16" fill={color} viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>;
}
function IcoArrowLeft() {
  return <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>;
}
function IcoAlert() {
  return <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>;
}
function IcoSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
function IcoCheck() {
  return <svg width="14" height="14" fill="none" stroke="#00b894" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>;
}
function IcoLocation() {
  return <svg width="14" height="14" fill="#00b894" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
}

// ── Validated text input ──────────────────────────────────────────────────────
function FieldInput({ label, type = 'text', value, onChange, placeholder, inputMode, S, disabled, suffix, hint, hintType,...rest }) {
  const [focused, setFocused] = useState(false);
  const borderColor = hintType === 'err' ? '#e74c3c' : hintType === 'ok' ? '#00b894' : focused ? '#1565a8' : '#d0dce8';
  const shadow     = hintType === 'err'
    ? '0 0 0 3px rgba(231,76,60,0.1)'
    : hintType === 'ok'
    ? '0 0 0 3px rgba(0,184,148,0.12)'
    : focused
    ? '0 0 0 3px rgba(21,101,168,0.1)'
    : 'none';

  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} inputMode={inputMode} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled} {...rest}
          autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
          style={{
            ...S.fieldInput,
            borderColor,
            boxShadow: shadow,
            opacity: disabled ? 0.6 : 1,
            paddingRight: suffix ? 36 : undefined,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {suffix && (
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && hintType === 'ok'  && <div style={S.hintOk}><IcoCheck /> {hint}</div>}
      {hint && hintType === 'err' && <div style={S.hintErr}>{hint}</div>}
    </div>
  );
}

// ── Searchable dropdown ───────────────────────────────────────────────────────
function SearchDropdown({ label, value, onChange, options, placeholder, S, disabled }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(opt) { onChange(opt); setQuery(''); setOpen(false); }

  return (
    <div style={S.field} ref={ref}>
      <label style={S.fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => { if (!disabled) { setOpen(o => !o); setQuery(''); } }}
          style={{
            ...S.fieldInput,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderColor: open ? '#1565a8' : '#d0dce8',
            boxShadow: open ? '0 0 0 3px rgba(21,101,168,0.1)' : 'none',
            opacity: disabled ? 0.6 : 1,
            userSelect: 'none', padding: '12px 14px',
          }}
        >
          <span style={{ color: value ? C.textDark : '#b8c8d8', fontSize: 14.5 }}>
            {value || placeholder}
          </span>
          <svg width="14" height="14" fill="#8fa8bc" viewBox="0 0 24 24"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>

        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
            background: '#fff', border: '1.5px solid #d0dce8', borderRadius: 10,
            boxShadow: '0 10px 40px rgba(10,61,98,0.15)', marginTop: 4,
            maxHeight: 260, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f4f8' }}>
              <input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                style={{
                  width: '100%', padding: '8px 10px', border: '1.5px solid #d0dce8',
                  borderRadius: 7, fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'DM Sans', sans-serif", color: '#0a3d62',
                }}
                onFocus={e => e.target.style.borderColor = '#1565a8'}
                onBlur={e => e.target.style.borderColor = '#d0dce8'}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#8fa8bc', fontSize: 13 }}>No results found</div>
              ) : filtered.map(opt => (
                <div
                  key={opt} onClick={() => select(opt)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                    color: opt === value ? '#1565a8' : '#0a3d62',
                    fontWeight: opt === value ? 700 : 400,
                    background: opt === value ? 'rgba(21,101,168,0.07)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid #f7f9fc', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = '#f4f8fc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = opt === value ? 'rgba(21,101,168,0.07)' : 'transparent'; }}
                >
                  {opt}
                  {opt === value && <IcoCheck />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pincode field — uses India Post API ───────────────────────────────────────
function PincodeField({ value, onChange, onAutoFill, S, disabled,...rest }) {
  const [status, setStatus] = useState(null); // null | 'loading' | 'found' | 'not-found'

  async function handleChange(e) {
    const val = e.target.value
      .replace(/\D/g, '')
      .slice(0, 6);
  
    onChange(val);
    setStatus(null);
  
    if (val.length === 6) {
      
      setStatus('loading');
  
      const data = await fetchPincodeData(val);
  
      
  
      if (data) {
        onAutoFill(
          data.state,
          data.district,
          data.cities,
          data.allSubDistricts
        );
        setStatus('found');
      } else {
        setStatus('not-found');
      }
    }
  }

  const borderColor = status === 'found' ? '#00b894' : status === 'not-found' ? '#e74c3c' : undefined;

  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>Pincode</label>
      <div style={{ position: 'relative' }}>
        <input
          type="text" inputMode="numeric" value={value} onChange={handleChange}
          placeholder="6-digit pincode" disabled={disabled} maxLength={6}
          style={{
            ...S.fieldInput,
            borderColor: borderColor || '#d0dce8',
            boxShadow: status === 'found' ? '0 0 0 3px rgba(0,184,148,0.12)' : 'none',
            paddingRight: 36,
          }}
          onFocus={e => { if (!borderColor) e.target.style.borderColor = '#1565a8'; }}
          onBlur={e  => { if (!borderColor) e.target.style.borderColor = '#d0dce8'; }}
          {...rest}
        />
        <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', lineHeight:1 }}>
          {status === 'loading'   && <IcoSpinner />}
          {status === 'found'     && <IcoLocation />}
          {status === 'not-found' && <span style={{ fontSize:16 }}>❓</span>}
        </span>
      </div>
      {status === 'found' && (
        <div style={S.hintOk}><IcoCheck /> State, District &amp; City auto-filled!</div>
      )}
      {status === 'not-found' && (
        <div style={S.hintErr}>Pincode not found — please fill state &amp; district manually.</div>
      )}
    </div>
  );
}

// ── Phone field (exactly 10 digits) ──────────────────────────────────────────
function PhoneField({ label, value, onChange, S, disabled, placeholder,...rest }) {
  const digits  = value.replace(/\D/g, '');
  const touched = value.length > 0;
  const isOk    = digits.length === 10;
  const hint    = touched && !isOk ? `${digits.length}/10 digits — must be exactly 10 digits` : null;

  function handleChange(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(raw);
  }

  return (
    <FieldInput
      S={S} label={label} type="tel" inputMode="numeric"
      value={value} onChange={handleChange}
      placeholder={placeholder || '10-digit mobile number'} disabled={disabled} {...rest}
      hintType={touched ? (isOk ? 'ok' : 'err') : undefined}
      hint={isOk && touched ? '10 digits ✓' : hint}
    />
  );
}

// ── Email field with format validation ────────────────────────────────────────
function EmailField({ label, value, onChange, S, disabled, placeholder,...rest }) {
  const [touched, setTouched] = useState(false);
  const valid = isValidEmail(value);

  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="email" inputMode="email" value={value}
          onChange={e => { onChange(e); }}
          onBlur={() => setTouched(true)}
          placeholder={placeholder || 'admin@clinic.com'} disabled={disabled}
          {...rest}
          autoComplete="email"
          style={{
            ...S.fieldInput,
            borderColor: touched && value ? (valid ? '#00b894' : '#e74c3c') : '#d0dce8',
            boxShadow: touched && value
              ? valid
                ? '0 0 0 3px rgba(0,184,148,0.12)'
                : '0 0 0 3px rgba(231,76,60,0.1)'
              : 'none',
            opacity: disabled ? 0.6 : 1,
          }}
          onFocus={e => { if (!touched) e.target.style.borderColor = '#1565a8'; }}
        />
      </div>
      {touched && value && !valid && (
        <div style={S.hintErr}>Enter a valid email address (e.g. name@domain.com)</div>
      )}
      {touched && value && valid && (
        <div style={S.hintOk}><IcoCheck /> Valid email</div>
      )}
    </div>
  );
}

// ── Inline styles (CSS variables via JS) ─────────────────────────────────────
const lightVars = {
  '--brand': '#0a3d62',
  '--brand2': '#1565a8',
  '--teal': '#00b894',
  '--teal2': '#00cec9',
  '--bg': '#f0f7ff',
  '--surface': '#ffffff',
  '--surface2': '#f5faff',
  '--text': '#0a2540',
  '--muted': '#4a6278',
  '--light': '#8fa8bc',
  '--border': '#d0dce8',
};

const darkVars = {
  '--brand': '#0a3d62',
  '--brand2': '#1565a8',
  '--teal': '#00b894',
  '--teal2': '#00cec9',
  '--bg': '#060e1a',
  '--surface': '#0e1e2e',
  '--surface2': '#162030',
  '--text': '#e8f4fd',
  '--muted': '#7fa8c8',
  '--light': '#3d6080',
  '--border': '#1e3450',
};

const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { overflow-x: hidden; transition: background .3s, color .3s; }
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .hero-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .12; animation: drift 10s ease-in-out infinite alternate; pointer-events: none; }
  .blob1 { width: 600px; height: 600px; background: var(--brand2); top: -200px; right: -150px; }
  .blob2 { width: 500px; height: 500px; background: var(--teal); bottom: -150px; left: -100px; animation-delay: -5s; }
  .blob3 { width: 300px; height: 300px; background: #6c5ce7; top: 50%; left: 30%; animation-delay: -3s; }
  @keyframes drift { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(30px,20px) scale(1.1); } }

  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.5; transform:scale(.8); } }
  @keyframes floatup { 0% { transform: translateY(0); } 100% { transform: translateY(-12px); } }
  @keyframes floatbadge { 0% { transform: translateY(0); } 100% { transform: translateY(-8px); } }

  .hero-card-main { animation: floatup 4s ease-in-out infinite alternate; }
  .fb1 { animation: floatbadge 5s ease-in-out infinite alternate; }
  .fb2 { animation: floatbadge 6s ease-in-out infinite alternate; animation-delay: -3s; }
  .hero-badge-dot { animation: pulse 2s infinite; }

  .reveal { opacity: 0; transform: translateY(30px); transition: opacity .6s, transform .6s; }
  .reveal.visible { opacity: 1; transform: translateY(0); }

  .service-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, var(--brand), var(--teal)); opacity: 0; transition: opacity .3s; border-radius: 16px; }
  .service-card:hover::before { opacity: 1; }
  .service-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(10,61,98,.15); border-color: transparent; }
  .service-card:hover .sc-title { color: #fff !important; }
  .service-card:hover .sc-desc { color: rgba(255,255,255,.8) !important; }
  .service-card:hover .sc-arrow { color: #fff; transform: translateX(4px); }
  .service-card:hover .sc-icon { background: rgba(255,255,255,.2) !important; }
  .service-card:hover .sc-title,
.service-card:hover .sc-desc,
.service-card:hover .sc-icon {
  color: var(--surface) !important;
}

  .benefit-item:hover { border-color: var(--teal); box-shadow: 0 8px 24px rgba(0,184,148,.1); transform: translateX(4px); }
  .testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(10,61,98,.1); border-color: rgba(0,184,148,.3); }
  .why-card:hover { border-color: var(--brand2); box-shadow: 0 12px 36px rgba(10,61,98,.12); transform: translateY(-3px); }

  .faq-a { padding: 0 20px; max-height: 0; overflow: hidden; transition: all .3s; font-size: 14px; color: var(--muted); line-height: 1.7; background: var(--surface2); }
  .faq-a.open { max-height: 200px; padding: 14px 20px 16px; }
  .faq-icon { color: var(--light); transition: transform .3s; font-size: 18px; }
  .faq-icon.open { transform: rotate(45deg); }

  .toast { position: fixed; bottom: 30px; right: 30px; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 9999; box-shadow: 0 8px 30px rgba(0,0,0,.3); transform: translateY(20px); opacity: 0; transition: all .35s; pointer-events: none; max-width: 320px; display: flex; align-items: center; gap: 10px; }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast.success { background: #00b894; color: #fff; }
  .toast.error { background: #e74c3c; color: #fff; }
  .toast.default { background: #0a3d62; color: #fff; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(6,14,26,.6); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); opacity: 0; transition: opacity .25s; pointer-events: none; }
  .modal-overlay.open { opacity: 1; pointer-events: all; }
  .modal-overlay.open .modal { transform: scale(1) translateY(0); }

  .form-input:focus { border-color: var(--brand2) !important; box-shadow: 0 0 0 3px rgba(21,101,168,.1); background: var(--surface); outline: none; }
  .modal-input:focus { border-color: var(--brand2) !important; box-shadow: 0 0 0 3px rgba(21,101,168,.1); outline: none; }
  .newsletter-input:focus { border-color: var(--teal); outline: none; }

  .sc-arrow { transition: all .3s; display: block; }

  @media (max-width: 900px) {
    .hero-visual { display: none !important; }
    .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
    .about-grid { grid-template-columns: 1fr !important; }
    .contact-grid { grid-template-columns: 1fr !important; }
    .footer-top { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 600px) {
    .nav-links-desktop, .btn-ghost-nav, .btn-solid-nav { display: none !important; }
    .hamburger { display: flex !important; }
    .form-grid { grid-template-columns: 1fr !important; }
    .footer-top { grid-template-columns: 1fr !important; }
    .hero-stats { gap: 20px !important; }
    .hero-btns { flex-direction: column !important; align-items: flex-start !important; }
  }
`;

// ── Google Font Loader ────────────────────────────────────────────────────────
function GoogleFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
        rel="stylesheet"
      />
    </>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  return (
    <div className={`toast ${toast.visible ? 'show' : ''} ${toast.type || 'default'}`}>
      {toast.message}
    </div>
  );
}

// ── Role Button ───────────────────────────────────────────────────────────────
function RoleBtn({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 10,
        border: `1.5px solid ${selected ? 'var(--brand2)' : 'var(--border)'}`,
        borderRadius: 9,
        background: selected ? 'rgba(21,101,168,.07)' : 'var(--surface)',
        fontSize: 12.5,
        fontWeight: selected ? 600 : 500,
        color: selected ? 'var(--brand)' : 'var(--muted)',
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all .2s',
        textAlign: 'center',
      }}
    >
      {label}
    </button>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: '16px 20px', fontWeight: 600, fontSize: 14.5, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', background: 'var(--surface)', transition: 'background .2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
      >
        <span>{q}</span>
        <span className={`faq-icon ${open ? 'open' : ''}`}>+</span>
      </div>
      <div className={`faq-a ${open ? 'open' : ''}`}>{a}</div>
    </div>
  );
}

// ── Service Card ──────────────────────────────────────────────────────────────
function ServiceCard({ icon, title, desc, iconBg, delay = 0 }) {
  return (
    <div className="service-card reveal" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, transition: 'all .3s', position: 'relative', overflow: 'hidden', cursor: 'default', transitionDelay: `${delay}s` }}>
      <div className="sc-inner" style={{ position: 'relative', zIndex: 1 }}>
        <div className="sc-icon" style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16, background: iconBg, transition: 'background .3s' }}>{icon}</div>
        <div className="sc-title" style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8, transition: 'color .3s' }}>{title}</div>
        <div className="sc-desc" style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, transition: 'color .3s' }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactAlert, setContactAlert] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);
  const toastTimer = useRef(null);
  const { login } = useApp();
  const mob = useIsMobile();
  const S   = makeStyles(mob);
  const navigate = useNavigate();

  const [mode,    setMode]    = useState(null);
  const [role,    setRole]    = useState('superadmin');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

//   // Dynamic city options returned from the API
  const [apiCities, setApiCities] = useState([]);

  const [form, setForm] = useState({
    clinicName: '', ownerName: '', email: '',
    phone: '', whatsapp: '', address: '',
    pincode: '', city: '', district: '', state: '',
    subDistrict: '', password: '',
  });

  const f      = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const goBack = () => { setMode(null); setErr(''); };

  function handlePincodeAutoFill(
    state,
    district,
    cities,
    subDistricts
  ) {
    
  
    setApiCities(cities || []);
  
    setForm(p => ({
      ...p,
      state,
      district,
      city:
        cities?.length === 1
          ? cities[0]
          : '',
      subDistrict:
        subDistricts?.[0] || '',
    }));
  }

  // Register
  async function handleRegister() {
    setErr('');
  
    if (
      !form.clinicName ||
      !form.ownerName ||
      !form.email ||
      !form.password
    ) {
      setErr(
        'Please fill in all required fields.'
      );
      return;
    }
  
    if (!isValidEmail(form.email)) {
  setErr('Please enter a valid email address.');
  return;
}

// ADD THIS
if (form.password.length < 6) {
  setErr('Password must be at least 6 characters.');
  return;
}
if (!/[A-Z]/.test(form.password)) {
  setErr('Password must contain at least 1 uppercase letter.');
  return;
}
if (!/[0-9]/.test(form.password)) {
  setErr('Password must contain at least 1 digit.');
  return;
}
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password)) {
  setErr('Password must contain at least 1 special character.');
  return;
}
// END ADD

setLoading(true);
  
    try {
      const data =
        await apiRegister(form);
  
      
  
      login({
        token: data.token,
        accessToken:
          data.token,
        type:
          data.role?.toLowerCase(),
        role:
          data.role?.toLowerCase(),
        clinicId:
          data.clinicId,
        user:
          data.clinic ||
          data.user ||
          null,
      });
  
      setMode(null);
  
      navigate('/clinic');
  
    } catch (e) {
      setErr(
        e.message ||
        'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  //  Login 
 async function handleLogin() {
  setErr('');

  if (!form.email || !form.password) {
    setErr('Please enter your email and password.');
    return;
  }

  setLoading(true);

  try {
  

    const data = await apiLogin(
      role,
      form.email,
      form.password
    );

  

    login({
      token: data.token,
      type: data.role,
      role: data.role,
      clinicId: data.clinicId,
      user:
        data.clinic ||
        data.user ||
        null
    });

    

    navigate('/clinic');

    

  } catch (e) {
    console.error("LOGIN ERROR:", e);
    setErr(
      e.message ||
      'Login failed.'
    );
  } finally {
    setLoading(false);
  }
}

  const roles = [
        { key: 'superadmin',   label: '⭐  Super Admin'  },
        { key: 'admin',        label: '🔐  Clinic Admin'  },
        { key: 'receptionist', label: '📋  Receptionist'  },
        { key: 'doctor',       label: '👨‍⚕️  Doctor'        },
        { key: 'pharmacist',   label: '💊  Pharmacist'    },  
      ];

  // Apply CSS vars to root
  const themeVars = darkMode ? darkVars : lightVars;

  function showToast(message, type = '') {
    setToast({ visible: true, message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }

  async function submitContactForm() {
  const { name, email, phone, message } = contactForm;

  // ✅ Frontend validation (not res.status!)
  if (!name || !email || !phone || !message) {
    setContactAlert('error');
    return;
  }

  if (!isValidEmail(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  if (phone.length !== 10) {
    showToast('Phone number must be 10 digits.', 'error');
    return;
  }

  setContactAlert('');

  try {
    const response = await fetch(
  'https://www.curelex.in/api/clinic/contact',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, message }),
  }
);

    const data = await response.json();

    if (response.ok) {
      setContactSuccess(true);
      setContactForm({ name: '', email: '', phone: '', message: '' });
      showToast('Message sent successfully! ✉️', 'success');
    } else {
      showToast(data.message || 'Failed to send message.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Server error. Please try again.', 'error');
  }
}

  useEffect(() => {
    if (mode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [mode]);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);


  const services = [
    { icon: '🔁', title: 'Smart Queue Management', desc: 'AI-powered queue assignment that minimizes patient wait times and optimizes doctor schedules in real time.', iconBg: 'rgba(0,184,148,.1)', delay: 0 },
    { icon: '📅', title: 'Appointment Scheduling', desc: 'Online and offline appointment booking with automated reminders via SMS and WhatsApp.', iconBg: 'rgba(21,101,168,.1)', delay: 0.05 },
    { icon: '📝', title: 'Digital Prescription System', desc: 'Paperless prescriptions with drug interaction alerts, dosage templates, and patient history access.', iconBg: 'rgba(108,92,231,.1)', delay: 0.1 },
    { icon: '💊', title: 'Pharmacy Integration', desc: 'Seamless connectivity with your in-house or partner pharmacy for instant prescription fulfillment.', iconBg: 'rgba(253,203,110,.15)', delay: 0.15 },
    { icon: '📊', title: 'Patient Analytics', desc: 'Deep insights into patient flow, peak hours, revenue trends, and clinical performance metrics.', iconBg: 'rgba(0,206,201,.1)', delay: 0.2 },
    { icon: '👥', title: 'Staff Management', desc: 'Role-based access for doctors, receptionists, pharmacists, and admins with shift scheduling.', iconBg: 'rgba(231,76,60,.08)', delay: 0.25 },
    { icon: '🔔', title: 'Real-time Notifications', desc: 'WhatsApp, SMS, and in-app notifications keep patients and staff updated on queue status.', iconBg: 'rgba(0,184,148,.1)', delay: 0.3 },
    { icon: '🖥️', title: 'Role-based Dashboard', desc: 'Personalized dashboards for each role — designed for clarity, speed, and ease of use.', iconBg: 'rgba(21,101,168,.1)', delay: 0.35 },
  ];

  const testimonials = [
    { initials: 'DK', name: 'Dr. Kiran Mehta', role: 'Cardiologist · Pune', text: 'Curelex completely transformed how we manage patients. Our wait times dropped by 35% in the first month, and both patients and staff are happier.', avatarBg: 'linear-gradient(135deg,var(--brand),var(--brand2))' },
    { initials: 'RS', name: 'Rohit Soni', role: 'Clinic Owner · Mumbai', text: 'The pharmacy integration is seamless. Prescriptions go directly to our dispensary and patients collect without waiting. Outstanding product.', avatarBg: 'linear-gradient(135deg,var(--teal),var(--teal2))' },
    { initials: 'PA', name: 'Pooja Agarwal', role: 'Head Receptionist · Delhi', text: 'As a receptionist, the role-based dashboard is incredibly intuitive. Managing 80+ patients a day used to be chaos — now it\'s smooth and organized.', avatarBg: 'linear-gradient(135deg,#6c5ce7,#a29bfe)' },
  ];

  const whyCards = [
    { icon: '🔒', title: 'Secure Platform', desc: 'HIPAA-aligned data encryption and role-based access control protects every record.' },
    { icon: '⚡', title: 'Lightning Fast', desc: 'Sub-second load times with 99.9% uptime SLA guaranteed.' },
    { icon: '🎯', title: 'Easy to Use', desc: 'Zero learning curve — your staff is productive from day one.' },
    { icon: '🤖', title: 'AI-powered Queue', desc: 'Smart algorithms auto-optimize patient flow and reduce no-shows.' },
    { icon: '📡', title: 'Real-time Tracking', desc: 'Live queue status visible to patients via WhatsApp and app.' },
    { icon: '🏆', title: 'Trusted & Verified', desc: 'Used by 500+ clinics. Backed by healthcare experts and data science.' },
  ];

  const faqs = [
    { q: 'Is Curelex free to start?', a: 'Yes! You get a 14-day free trial with full access to all features. No credit card required.' },
    { q: 'Can multiple doctors use one account?', a: 'Absolutely. Each clinic can have unlimited staff members with role-based access control — doctors, receptionists, pharmacists, and admins all get personalized views.' },
    { q: 'Does it work on mobile?', a: 'Curelex is fully responsive and works on any device. We also have dedicated iOS and Android apps coming soon.' },
    { q: 'How secure is patient data?', a: 'All data is encrypted at rest and in transit using AES-256. We follow HIPAA-aligned practices and never share data with third parties.' },
  ];
  const formRef = useRef(null);
  const handleEnter = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const fields = Array.from(
      formRef.current.querySelectorAll(
        "input, select, textarea"
      )
    ).filter(
      (el) => !el.disabled && el.offsetParent !== null
    );

    const index = fields.indexOf(e.target);

    if (index > -1 && fields[index + 1]) {
      fields[index + 1].focus();
    }
  };
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: 'var(--bg)', color: 'var(--text)', ...Object.fromEntries(Object.entries(themeVars)) }}>
      <style>{globalCSS}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '0 clamp(16px,5vw,60px)', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: darkMode ? 'rgba(6,14,26,.85)' : 'rgba(240,247,255,.85)', backdropFilter: 'blur(18px)', borderBottom: '1px solid var(--border)', transition: 'all .3s' }}>
        <a href="#home" onClick={e => { e.preventDefault(); scrollToSection('home'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div
  style={{
    width: mob ? 160 : 220,
    height: mob ? 160 : 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  }}
>
  <img
    src={curelexLogo}
    alt="Curelex Logo"
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      display: 'block',
    }}
  />
</div>
        </a>

        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['home', 'about', 'services', 'contact'].map(s => (
            <button key={s} onClick={() => scrollToSection(s)} style={{ textDecoration: 'none', color: 'var(--muted)', fontSize: 14, fontWeight: 500, padding: '6px 14px', borderRadius: 8, transition: 'all .2s', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif', textTransform: 'capitalize'" }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setDarkMode(!darkMode)} title="Toggle dark mode" style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--muted)', padding: '7px 10px', borderRadius: 9, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="btn-ghost-nav" 
          onClick={() => {
            setMode('login');
            setErr('');
          }}
          style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', padding: '7px 18px', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
          <button className="btn-solid-nav" 
          onClick={() => {
            setMode('register');
            setErr('');
          }}
          style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand2))', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 14px rgba(10,61,98,.25)' }}>Sign Up</button>
          <button className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu" style={{ display: 'none', flexDirection: 'column', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <span style={{ width: 22, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block' }} />
            <span style={{ width: 22, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block' }} />
            <span style={{ width: 22, height: 2, background: 'var(--text)', borderRadius: 2, display: 'block' }} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{ display: 'flex', position: 'fixed', top: 68, left: 0, right: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 24px 20px', zIndex: 999, flexDirection: 'column', gap: 4, boxShadow: '0 20px 40px rgba(0,0,0,.1)' }}>
          {['home', 'about', 'services', 'contact'].map(s => (
            <button key={s} onClick={() => scrollToSection(s)} style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500, padding: '10px 14px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button onClick={() => { setMode('login'); setMobileMenuOpen(false); }} style={{ marginTop: 8, background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
          <button onClick={() => { setMode('register'); setMobileMenuOpen(false); }} style={{ marginTop: 6, background: 'linear-gradient(135deg,var(--brand),var(--brand2))', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign Up</button>
        </div>
      )}

      {/* ── HERO ── */}
      <section id="home" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px clamp(16px,6vw,80px) 60px', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-blob blob1" />
        <div className="hero-blob blob2" />
        <div className="hero-blob blob3" />
        <div className="hero-grid sec-inner" style={{ width: '100%', maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div className="reveal">
            <div style={{ 
  display: 'inline-flex', 
  alignItems: 'center', 
  gap: 8, 
  background: darkMode ? 'rgba(0,184,148,0.2)' : 'rgba(0,184,148,.1)', 
  border: darkMode ? '1px solid rgba(0,184,148,0.4)' : '1px solid rgba(0,184,148,.3)', 
  borderRadius: 20, 
  padding: '6px 16px', 
  fontSize: 13, 
  color: darkMode ? '#00cec9' : 'var(--teal)', 
  fontWeight: 600, 
  marginBottom: 20 
}}>
  <span className="hero-badge-dot" style={{ 
    width: 7, 
    height: 7, 
    borderRadius: '50%', 
    background: darkMode ? '#00cec9' : 'var(--teal)' 
  }} />
  Trusted by 500+ Clinics Across India
</div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(34px,5vw,56px)', fontWeight: 800, lineHeight: 1.1, color: 'var(--text)', marginBottom: 18, letterSpacing: -1.5 }}>
              Smart Patient Flow<br />for{' '}
              <span style={{ background: 'linear-gradient(135deg,var(--brand2),var(--teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Modern Clinics</span>
            </h1>
            <p style={{ fontSize: 'clamp(15px,2vw,17px)', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32, fontWeight: 300 }}>
              Streamline patient queues, reduce wait times, and deliver a seamless clinic experience — all from one powerful platform.
            </p>
            <div className="hero-btns" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 40 }}>
              <button onClick={() => setMode('register')} style={{ background: 'linear-gradient(135deg,var(--brand),var(--brand2))', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 6px 20px rgba(10,61,98,.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Get Started Free →
              </button>
              <button onClick={() => scrollToSection('services')} style={{ background: 'none', border: '2px solid var(--border)', color: 'var(--text)', padding: '13px 26px', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
                ▶ Book a Demo
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
  {['24/7 Support', 'Smart Queue System', 'Patient Management', 'Live Analytics'].map(pill => (
    <div key={pill} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 6, 
      background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(10,61,98,.06)', 
      border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(10,61,98,.1)', 
      borderRadius: 20, 
      padding: '6px 14px', 
      fontSize: 12.5, 
      fontWeight: 500, 
      color: darkMode ? '#ffffff' : 'var(--brand)' 
    }}>
      <span style={{ 
        width: 6, 
        height: 6, 
        borderRadius: '50%', 
        background: darkMode ? '#00cec9' : 'var(--teal)', 
        display: 'inline-block' 
      }} />
      {pill}
    </div>
  ))}
</div>
            <div className="hero-stats" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
  {[['500+', 'Clinics Active'], ['2M+', 'Patients Served'], ['40%', 'Wait Time Reduced']].map(([num, label]) => (
    <div key={label}>
      <div style={{ 
        fontFamily: "'Sora', sans-serif", 
        fontSize: 26, 
        fontWeight: 800, 
        color: darkMode ? '#ffffff' : 'var(--brand)', 
        lineHeight: 1 
      }}>{num}</div>
      <div style={{ 
        fontSize: 12, 
        color: darkMode ? 'rgba(255,255,255,0.7)' : 'var(--light)', 
        fontWeight: 500, 
        marginTop: 2 
      }}>{label}</div>
    </div>
  ))}
</div>
          </div>

          <div
  className="hero-visual reveal"
  style={{
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transitionDelay: '.2s',
  }}
>
  {/* Floating badge top */}
  <div
    className="floating-badge fb1"
    style={{
      position: 'absolute',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 10px 40px rgba(10,61,98,.12)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--text)',

      top: 0,
      left: '70%',
      transform: 'translateX(-50%)',
      zIndex: 5,
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: 'rgba(0,184,148,.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
      }}
    >
      ✅
    </div>

    <div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 12,
          color: 'var(--text)',
        }}
      >
        Queue Optimized
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
        }}
      >
        8 patients ahead
      </div>
    </div>
  </div>

  {/* Main card */}
  <div
    className="hero-card-main"
    style={{
      marginTop: 35,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: 24,
      boxShadow: '0 30px 80px rgba(10,61,98,.15)',
      width: '100%',
      maxWidth: 360,
      position: 'relative',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background:
            'linear-gradient(135deg,var(--brand),var(--teal))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        🏥
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--text)',
          }}
        >
          City Medical Centre
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          Live Queue · Today
        </div>
      </div>

      <div
        style={{
          background: 'rgba(0,184,148,.1)',
          color: 'var(--teal)',
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 20,
        }}
      >
        ● Live
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {[
        {
          num: '01',
          numBg:
            'linear-gradient(135deg,var(--brand2),var(--teal))',
          name: 'Rahul Sharma',
          wait: 'Consulting now',
          badge: 'In Progress',
          badgeBg: 'rgba(0,184,148,.12)',
          badgeColor: 'var(--teal)',
          opacity: 1,
        },
        {
          num: '02',
          numBg: 'linear-gradient(135deg,#e17055,#d63031)',
          name: 'Priya Patel',
          wait: '~5 min wait',
          badge: 'Waiting',
          badgeBg: 'rgba(253,203,110,.15)',
          badgeColor: '#e17055',
          opacity: 1,
        },
        {
          num: '03',
          numBg: 'linear-gradient(135deg,#6c5ce7,#a29bfe)',
          name: 'Ankit Verma',
          wait: '~12 min wait',
          badge: 'Waiting',
          badgeBg: 'rgba(253,203,110,.15)',
          badgeColor: '#e17055',
          opacity: 1,
        },
        {
          num: '✓',
          numBg: '#d0dce8',
          numColor: 'var(--muted)',
          name: 'Sneha Joshi',
          wait: 'Completed · 10:32 AM',
          badge: 'Done',
          badgeBg: 'rgba(108,92,231,.1)',
          badgeColor: '#6c5ce7',
          opacity: 0.6,
        },
      ].map(
        (
          {
            num,
            numBg,
            numColor,
            name,
            wait,
            badge,
            badgeBg,
            badgeColor,
            opacity,
          },
          i
        ) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--surface2)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              opacity,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: numBg,
                color: numColor || '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {num}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text)',
                }}
              >
                {name}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                }}
              >
                {wait}
              </div>
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                background: badgeBg,
                color: badgeColor,
              }}
            >
              {badge}
            </span>
          </div>
        )
      )}
    </div>
  </div>

  {/* Floating badge bottom */}
  <div
    className="floating-badge fb2"
    style={{
      position: 'absolute',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 10px 40px rgba(10,61,98,.12)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--text)',
      bottom: -10,
      left: -30,
      zIndex: 5,
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: 'rgba(21,101,168,.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
      }}
    >
      📊
    </div>

    <div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 12,
          color: 'var(--text)',
        }}
      >
        Today's Stats
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
        }}
      >
        32 patients · 98% on-time
      </div>
    </div>
  </div>
</div>
        </div>
      </section>


      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: '90px clamp(16px,6vw,80px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              <span style={{ width: 20, height: 2, background: 'var(--teal)', borderRadius: 2, display: 'inline-block' }} />What We Offer
            </div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.15, letterSpacing: -1, marginBottom: 12 }}>Everything Your Clinic Needs</h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>A complete suite of tools designed to modernize every aspect of your clinic operations.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {services.map(s => <ServiceCard key={s.title} {...s} />)}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: '90px clamp(16px,6vw,80px)', background: 'var(--surface2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              <span style={{ width: 20, height: 2, background: 'var(--teal)', borderRadius: 2, display: 'inline-block' }} />Testimonials
            </div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.15, letterSpacing: -1, marginBottom: 12 }}>Loved by Clinics Across India</h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>Real feedback from doctors, clinic owners, and healthcare professionals using Curelex daily.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
            {testimonials.map(({ initials, name, role, text, avatarBg }, i) => (
              <div key={name} className="testimonial-card reveal" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, transition: 'all .25s', transitionDelay: `${i * 0.1}s` }}>
                <div style={{ color: '#f39c12', fontSize: 13, marginBottom: 6, letterSpacing: 2 }}>★★★★★</div>
                <div style={{ fontSize: 32, color: 'var(--teal)', lineHeight: 1, marginBottom: 12, fontFamily: 'Georgia, serif' }}>"</div>
                <div style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>{text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{initials}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--light)' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section id="why" style={{ padding: '90px clamp(16px,6vw,80px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              <span style={{ width: 20, height: 2, background: 'var(--teal)', borderRadius: 2, display: 'inline-block' }} />Why Curelex
            </div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.15, letterSpacing: -1, marginBottom: 12 }}>Why 500+ Clinics Choose Us</h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>Built with security, speed, and simplicity at the core — so you can focus on patient care.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {whyCards.map(({ icon, title, desc }, i) => (
              <div key={title} className="why-card reveal" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, textAlign: 'center', transition: 'all .25s', transitionDelay: `${i * 0.05}s` }}>
                <div style={{ fontSize: 30, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--light)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: '90px clamp(16px,6vw,80px)', background: 'var(--surface2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'start' }}>
            <div className="reveal">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                <span style={{ width: 20, height: 2, background: 'var(--teal)', borderRadius: 2, display: 'inline-block' }} />Get In Touch
              </div>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.15, letterSpacing: -1, marginBottom: 12 }}>Ask Us Anything</h2>
              <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300 }}>Have a question about Curelex? Our team is ready to help you get started.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 32 }}>
                {[
                  { icon: '📧', label: 'Email', value: 'support@curelex.in' },
                  { icon: '📞', label: 'Phone', value: '+91 89578 09085' },
                  { icon: '📍', label: 'Address', value: 'IIIT Allahabad UP' },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(10,61,98,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--light)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
                      <div style={{ fontSize: 14.5, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 60 }}>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>FAQ</h3>
                {faqs.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
              </div>
            </div>

            <div className="reveal" style={{ transitionDelay: '.15s' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(10,61,98,.08)' }}>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Send a Message</div>

                {contactSuccess && (
  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,184,148,.1)', border: '1px solid rgba(0,184,148,.3)', color: 'var(--teal)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    ✅ Message sent! Our team will contact you shortly.
  </div>
)}
                {contactAlert === 'error' && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(231,76,60,.08)', border: '1px solid rgba(231,76,60,.25)', color: '#c0392b', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    ⚠️ Please fill all required fields.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
  {
    id: 'name',
    label: 'Full Name *',
    placeholder: 'Your full name',
    type: 'text',
    full: false,
  },
  {
    id: 'email',
    label: 'Email *',
    placeholder: 'you@email.com',
    type: 'email',
    full: false,
  },
  {
    id: 'phone',
    label: 'Phone Number *',
    placeholder: 'Enter phone number',
    type: 'tel',
    full: true,
  },
].map(({ id, label, placeholder, type, full }) => (
                    <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: full ? '1 / -1' : 'auto' }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>
                      <input
                        className="form-input"
                        type={type}
                        value={contactForm[id]}
                        onChange={e =>
                          setContactForm(p => ({
                            ...p,
                            [id]:
                              id === 'phone'
                                ? e.target.value
                                    .replace(/\D/g, '')
                                    .slice(0, 10)
                                : e.target.value
                          }))
                        }
                        placeholder={placeholder}
                        style={{ padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: 'var(--text)', background: 'var(--surface2)', outline: 'none', transition: 'all .2s', boxSizing: 'border-box', width: '100%' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Message *</label>
                    <textarea
                      className="form-input"
                      value={contactForm.message}
                      onChange={e => setContactForm(p => ({ ...p, message: e.target.value.slice(0, 500) }))}
                      rows={5}
                      placeholder="Describe your query in detail..."
                      style={{ padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: 'var(--text)', background: 'var(--surface2)', outline: 'none', transition: 'all .2s', resize: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--light)', textAlign: 'right' }}>{contactForm.message.length}/500 characters</div>
                  </div>
                </div>
                <button onClick={submitContactForm} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,var(--brand),var(--brand2))', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                  Send Message →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

       {/* ── ABOUT ── */}
<section id="about" style={{ padding: '90px clamp(16px,6vw,80px)', background: 'var(--surface2)' }}>
  <div style={{ maxWidth: 1200, margin: '0 auto' }}>

    {/* Section label */}
    <div className="reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        <span style={{ width: 20, height: 2, background: 'var(--teal)', borderRadius: 2, display: 'inline-block' }} />
        About Curelex
      </div>
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.15, letterSpacing: -1, marginBottom: 14 }}>
        Bridging the Rural‑Urban Healthcare Gap
      </h2>
      <p style={{ fontSize: 'clamp(14px,1.6vw,16px)', color: 'var(--muted)', maxWidth: 640, margin: '0 auto', lineHeight: 1.75, fontWeight: 300 }}>
        Curelex is a comprehensive healthcare management platform that streamlines clinic operations
        through intelligent patient management, EMR, queue management, diagnostics, pharmacy
        integration, and digital healthcare workflows — making expert care accessible, safe, and affordable.
      </p>
    </div>

    {/* ── Two images row ── */}
    <div className="reveal" style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 52,
    }}>


      
<div

  style={{
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 16px 50px rgba(10,61,98,0.13)',
    border: '1px solid var(--border)',
    aspectRatio: '16/9',
    maxHeight: '300px',
    
  }}
>
  <img
    src="/about_img_2.png" 
    alt="Team / Outreach"
    style={{
      width: '100%',
      height: '100%',
      display: 'block',
    }}
  />
</div>
    </div>

    {/* ── Features / benefits row ── */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: mob ? '1fr' : '1fr 1fr',
      gap: 28,
      alignItems: 'start',
    }}>

      {/* Left — feature list */}
      <div className="reveal">
        <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: mob ? 20 : 24, fontWeight: 800, color: 'var(--text)', marginBottom: 18, lineHeight: 1.2 }}>
          Built for the Future of Healthcare
        </h3>
        <p style={{ fontSize: mob ? 13.5 : 14.5, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 22, fontWeight: 300 }}>
          Curelex empowers doctors, receptionists, and administrators to deliver
          world-class patient experiences effortlessly — whether in a metro hospital
          or a remote village clinic.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: '🏥', bg: 'rgba(0,184,148,.1)',    title: 'Smart Clinic Management',         desc: 'End-to-end clinic operations including patient registration, appointments, billing, and staff coordination from a unified dashboard.' },
            { icon: '🏨', bg: 'rgba(255,118,117,.12)', title: 'Hospital Management System',       desc: 'Comprehensive hospital administration covering registration, billing, staff management, inventory, departments, and operational workflows.' },
            { icon: '🩺', bg: 'rgba(21,101,168,.1)',   title: 'OPD & IPD Management',             desc: 'Digitize outpatient and inpatient workflows with appointment scheduling, admissions, bed allocation, treatment tracking, and discharge management.' },
            { icon: '⏳', bg: 'rgba(253,203,110,.15)', title: 'Queue Management System',          desc: 'Reduce patient waiting times with real-time token generation, queue tracking, and automated patient notifications.' },
            { icon: '📋', bg: 'rgba(108,92,231,.1)',   title: 'Electronic Medical Records (EMR)', desc: 'Securely maintain patient histories, prescriptions, diagnoses, and treatment records for quick access and better continuity of care.' },
            { icon: '💊', bg: 'rgba(0,206,201,.1)',    title: 'Integrated Pharmacy & Diagnostics',desc: 'Manage prescriptions, lab investigations, diagnostic reports, and medicine dispensing through a single connected platform.' },
          ].map(({ icon, bg, title, desc }) => (
            <div key={title} className="benefit-item" style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: mob ? '12px 14px' : 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              transition: 'all .25s',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, background: bg }}>{icon}</div>
              <div>
                <h4 style={{ fontSize: mob ? 13 : 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{title}</h4>
                <p style={{ fontSize: mob ? 12 : 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — sticky metrics card */}
      <div className="reveal" style={{
        transitionDelay: '.15s',
        position: mob ? 'static' : 'sticky',
        top: 90,
        alignSelf: 'start',
      }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 18, padding: mob ? 18 : 24,
          boxShadow: '0 20px 60px rgba(10,61,98,.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--brand),var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Platform Performance</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>This month's metrics</div>
            </div>
          </div>

          {[
            { label: 'Patient Satisfaction', value: '98.2%', width: '98%',   color: 'linear-gradient(90deg,var(--teal),var(--teal2))'   },
            { label: 'Queue Efficiency',     value: '91%',   width: '91%',   color: 'linear-gradient(90deg,var(--brand),var(--brand2))' },
            { label: 'Rural Clinic Uptime',  value: '99.9%', width: '99.9%', color: 'linear-gradient(90deg,#6c5ce7,#a29bfe)'            },
          ].map(({ label, value, width, color }) => (
            <div key={label} style={{ background: 'var(--surface2)', borderRadius: 12, padding: mob ? 12 : 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: mob ? 12 : 13, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: mob ? 12 : 13, fontWeight: 700, color: 'var(--brand2)' }}>{value}</span>
              </div>
              <div style={{ height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width, height: '100%', background: color, borderRadius: 4 }} />
              </div>
            </div>
          ))}

          {/* Mission callout */}
          <div style={{
            marginTop: 16, padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(10,61,98,0.06), rgba(0,184,148,0.06))',
            border: '1px solid rgba(0,184,148,0.2)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', marginBottom: 5 }}>Our Mission</div>
            <p style={{ fontSize: mob ? 12 : 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              Making expert medical care <strong style={{ color: 'var(--text)' }}>accessible, safe, and affordable</strong> —
              bridging the rural‑urban healthcare gap through technology and compassion.
            </p>
          </div>

          {/* Partners badge */}
          <div style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 13px', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 20 }}>🤝</div>
            <div>
              <div style={{ fontSize: mob ? 12 : 13, fontWeight: 600, color: 'var(--text)' }}>Trusted Partners</div>
              <div style={{ fontSize: mob ? 11 : 12, color: 'var(--muted)' }}>IIIT Allahabad · United University · AIT Bangkok</div>
            </div>
          </div>
        </div>
      </div>
    </div>

   <div className="reveal" style={{ marginTop: 52 }}>
  {/* Header */}
  <div style={{ textAlign: 'center', marginBottom: 28 }}>
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--teal)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
      }}
    >
      <span
        style={{
          width: 20,
          height: 2,
          background: 'var(--teal)',
          borderRadius: 2,
        }}
      />
      The Founders
    </div>

    <h3
      style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: mob ? 20 : 26,
        fontWeight: 800,
        color: 'var(--text)',
        lineHeight: 1.2,
      }}
    >
      Visionaries Behind Curelex
    </h3>
  </div>

  {/* Cards Grid */}
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 20,
    }}
  >
    {[
      {
        img: 'Shreyansh Singh.jpeg',
        name: 'Shriyansh Singh',
        role: 'Founder, Director & CEO',
        bio: 'With a vision to integrate cutting-edge technology into healthcare, Shriyansh leads Curelex to build patient-centric solutions that reach the last mile of rural India.',
        gradient: 'linear-gradient(135deg, #0a3d62, #1565a8)',
      },
      {
        img: 'Aman Maurya.jpeg',
        name: 'Aman Maurya',
        role: 'Co-Founder, Director & COO',
        bio: 'Aman oversees seamless delivery of Curelex services. His expertise in healthcare management drives the daily operations and long-term growth of the platform.',
        gradient: 'linear-gradient(135deg, #00b894, #00cec9)',
      },
    ].map(({ img, name, role, bio, gradient }) => (
      <div
  style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 16px 50px rgba(10,61,98,0.10)',
    display: 'flex',
    flexDirection: mob ? 'column' : 'row',
    transition: 'transform 0.25s, box-shadow 0.25s',
  }}
>
  {/* Image */}
  <div
    style={{
      width: mob ? '100%' : 150,  
      flexShrink: 0,
      position: 'relative',
      height: mob ? 240 : 'auto',
      minHeight: 200,
      background: gradient,
      overflow: 'hidden',
    }}
  >
    <img
      src={img}
      alt={name}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center top',
        position: 'absolute',
        inset: 0,
        transform: 'scale(1.05)',
      }}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  </div>

  {/* Text */}
  <div
    style={{
      padding: mob ? '18px' : '22px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 10,
      flex: 1,
    }}
  >
    {/* role */}
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--teal)',
      }}
    >
      {role}
    </div>

    {/* name */}
    <div
      style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: mob ? 17 : 19,
        fontWeight: 800,
      }}
    >
      {name}
    </div>

    {/* bio */}
    <p
      style={{
        fontSize: 13,
        color: 'var(--muted)',
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {bio}
    </p>
  </div>
</div>
    ))}
  </div>
</div>
  </div>
</section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--brand)', color: 'rgba(255,255,255,.85)', padding: '50px clamp(16px,6vw,80px) 30px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
  className="footer-top"
  style={{
    display: 'grid',
    gridTemplateColumns: mob
      ? '1fr'
      : '2fr 1fr 1fr',
    gap: mob ? 30 : 50,
    paddingBottom: 40,
    borderBottom:
      '1px solid rgba(255,255,255,.12)',
  }}
>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
  style={{
    width: 225,
    height:45,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  }}
>
  <img
    src={curelexLogo}
    alt="Curelex"
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      transform: mob
  ? 'scale(2.4)'
  : 'scale(3)'
    }}
  />
</div>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, opacity: .7, margin: '12px 0 20px' }}>Intelligent patient flow management for modern clinics. Reducing wait times and improving healthcare outcomes since 2026.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {['𝕏', 'in', 'f', '▶'].map(icon => (
                  <button key={icon} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', border: 'none', color: '#fff' }}>{icon}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Quick Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Home', 'home'], ['About Us', 'about'], ['Services', 'services'], ['Testimonials', 'testimonials'], ['Contact', 'contact']].map(([label, id]) => (
                  <button key={id} onClick={() => scrollToSection(id)} style={{ color: 'rgba(255,255,255,.65)', fontSize: 13.5, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', padding: 0, transition: 'color .2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.65)'}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div>
  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Platform</div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[
      ['Sign Up Free', () => { setMode('register'); setErr(''); }],
      ['Sign In',      () => { setMode('login');    setErr(''); }],
      ['Book a Demo',  () => scrollToSection('contact')],
      ['API Docs',     null],
      ['Changelog',    null],
    ].map(([label, handler]) => (
      <button
        key={label}
        onClick={handler || undefined}
        style={{ color: 'rgba(255,255,255,.65)', fontSize: 13.5, background: 'none', border: 'none', cursor: handler ? 'pointer' : 'default', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', padding: 0, transition: 'color .2s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.65)'}
      >{label}</button>
    ))}
  </div>
</div>

          </div>

          <div style={{ paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, opacity: .6 }}>© 2026 Curelex. All rights reserved. Made with ❤️ in India.</div>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
                <a key={l} style={{ fontSize: 12.5, opacity: .6, cursor: 'pointer', textDecoration: 'none', color: 'rgba(255,255,255,.6)' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '.6'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
                >{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

{/* Register and login */}
{mode && (
   <div
   style={{
     position: 'fixed',
     inset: 0,
     background: 'rgba(0,0,0,0.6)',
     backdropFilter: 'blur(10px)',
     display: 'flex',
     justifyContent: 'center',
     alignItems:
       mode === 'login'
         ? 'center'
         : 'flex-start',
     zIndex: 99999,
     overflowY: 'auto',
     overflowX: 'hidden',
     paddingTop:
       mode === 'register'
         ? (mob ? '80px' : '40px')
         : '20px',
     paddingBottom: '30px',
     paddingLeft: mob ? '14px' : '24px',
     paddingRight: mob ? '14px' : '24px',
   }}
   onClick={() => setMode(null)}
 >
   <div
     onClick={(e) => e.stopPropagation()}
     style={{
       width: '100%',
       maxWidth: mode === 'login'
         ? 430
         : 500,
       margin: '0 auto',
       animation:
         'fadeInScale .25s ease',
     }}
   >

      
    {mode === 'register' && (
            <div
            ref={formRef}
    onKeyDown={handleEnter}
            style={{
              ...S.card,
              borderRadius: 24,
              boxShadow:
                darkMode
                  ? '0 25px 70px rgba(0,0,0,.45)'
                  : '0 25px 70px rgba(0,0,0,.18)',
              border:
                '1px solid var(--border)',
            }}
          >
            <div style={S.cardAccentBar} />
            <div style={S.secHeader}>
              <button style={S.btnGhost} onClick={goBack} disabled={loading}><IcoArrowLeft /> Back</button>
              <div style={S.secTitle}>Register Clinic</div>
            </div>

            <FieldInput S={S} label="Clinic Name *" value={form.clinicName} onChange={e => f('clinicName', e.target.value)} placeholder="e.g. City Medical Centre" disabled={loading} />
            <FieldInput S={S} label="Owner / Admin Name *" value={form.ownerName} onChange={e => f('ownerName', e.target.value)} placeholder="Full name" disabled={loading} />

            {/* Email + Phone side by side */}
            <div style={S.fieldRow}>
              <EmailField
                S={S} label="Email Address *"
                value={form.email}
                onChange={e => f('email', e.target.value)}
                placeholder="admin@clinic.com"
                disabled={loading}
            
              />
              <PhoneField
                S={S} label="Phone (10 digits)"
                value={form.phone}
                onChange={v => f('phone', v)}
                disabled={loading}
               
              />
            </div>

            {/* WhatsApp */}
            <div style={S.field}>
              <label style={S.fieldLabel}>WhatsApp Number (10 digits)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, lineHeight:1, pointerEvents:'none' }}>💬</span>
                <input
                  type="tel" inputMode="numeric"
                  value={form.whatsapp}
                  onChange={e => f('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit WhatsApp number" disabled={loading}
                  style={{
                    ...S.fieldInput, paddingLeft: 36,
                    borderColor: form.whatsapp
                      ? isValidPhone(form.whatsapp) ? '#00b894' : '#e74c3c'
                      : '#d0dce8',
                    boxShadow: form.whatsapp && isValidPhone(form.whatsapp)
                      ? '0 0 0 3px rgba(0,184,148,0.12)' : 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor='#1565a8'; e.target.style.boxShadow='0 0 0 3px rgba(21,101,168,0.1)'; }}
                  onBlur={e  => {
                    const d = form.whatsapp.replace(/\D/g, '');
                    e.target.style.borderColor = form.whatsapp ? (d.length === 10 ? '#00b894' : '#e74c3c') : '#d0dce8';
                    e.target.style.boxShadow   = form.whatsapp && d.length === 10 ? '0 0 0 3px rgba(0,184,148,0.12)' : 'none';
                  }}
                 
                />
              </div>
              {form.whatsapp && !isValidPhone(form.whatsapp) && (
                <div style={S.hintErr}>{form.whatsapp.replace(/\D/g,'').length}/10 digits — must be exactly 10 digits</div>
              )}
            </div>

            <FieldInput S={S} label="Address" value={form.address} onChange={e => f('address', e.target.value)} placeholder="Street / Area / Sector" disabled={loading} />

            {/* ── Pincode → India Post API auto-fill ── */}
            <PincodeField
              value={form.pincode}
              onChange={v => f('pincode', v)}
              onAutoFill={handlePincodeAutoFill}
              S={S}
              disabled={loading}
            />

            {/* ── State (auto-filled, editable as text) ── */}
            <FieldInput
              S={S} label="State / Province"
              value={form.state}
              onChange={e => f('state', e.target.value)}
              placeholder="Auto-filled from pincode"
              disabled={loading}
            />

            {/* ── District (auto-filled, editable as text) ── */}
            <FieldInput
              S={S} label="District"
              value={form.district}
              onChange={e => f('district', e.target.value)}
              placeholder="Auto-filled from pincode"
              disabled={loading}
            />

            {/* ── Sub-District (auto-filled, editable) ── */}
            <FieldInput
              S={S} label="Sub-District / Block"
              value={form.subDistrict}
              onChange={e => f('subDistrict', e.target.value)}
              placeholder="Auto-filled from pincode"
              disabled={loading}
            />

            {/* ── City — dropdown if API returned multiple options, else plain text ── */}
            {apiCities.length > 1 ? (
              <SearchDropdown
                label="City / Town / Post Office"
                value={form.city}
                onChange={v => f('city', v)}
                options={apiCities}
                placeholder="Select city / post office…"
                S={S}
                disabled={loading}
              />
            ) : (
              <FieldInput
                S={S} label="City / Town"
                value={form.city}
                onChange={e => f('city', e.target.value)}
                placeholder="Auto-filled or type manually"
                disabled={loading}
              />
            )}

            {/* Password */}
            <FieldInput 
  S={S} 
  label="Password *" 
  type="password" 
  value={form.password} 
  onChange={e => f('password', e.target.value)} 
  placeholder="Min 6 chars, 1 uppercase, 1 digit, 1 special" 
  disabled={loading} 
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRegister();
    }
  }}
/>

            {err && <div style={S.alertError}><IcoAlert /> <span>{err}</span></div>}

            <button style={{ ...S.btnBase, ...S.btnAccent }} onClick={handleRegister} disabled={loading}>
              {loading ? <><IcoSpinner /> Creating Account…</> : <>Create Clinic Account <IcoArrowRight /></>}
            </button>

            <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#8fa8bc' }}>
              By registering, you agree to our Terms of Service
            </div>
          </div>
        )}
  {mode === 'login' && (
            <div
            ref={formRef}
    onKeyDown={handleEnter}
            style={{
              ...S.card,
              borderRadius: 24,
              boxShadow:
                darkMode
                  ? '0 25px 70px rgba(0,0,0,.45)'
                  : '0 25px 70px rgba(0,0,0,.18)',
              border:
                '1px solid var(--border)',
            }}
          >
            <div style={S.cardAccentBar} />
            <div style={S.secHeader}>
              <button style={S.btnGhost} onClick={goBack} disabled={loading}><IcoArrowLeft /> Back</button>
              <div style={S.secTitle}>Sign In</div>
            </div>

            <div style={S.field}>
              <label style={S.fieldLabel}>Login As</label>
              <select value={role} onChange={e => { setRole(e.target.value); setErr(''); }} disabled={loading}
                style={{
                  ...S.fieldInput, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%234a6278' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 40,
                }}>
                {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>

            <EmailField
              S={S} label="Email Address"
              value={form.email}
              onChange={e => f('email', e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
            />
            <FieldInput S={S} label="Password" type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder="Your password" disabled={loading} onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  }}
/>

            {err && <div style={S.alertError}><IcoAlert /> <span>{err}</span></div>}

            <button style={{ ...S.btnBase, ...S.btnPrimary }} onClick={handleLogin} disabled={loading}>
              {loading ? <><IcoSpinner /> Signing In…</> : <>Sign In to Dashboard <IcoArrowRight /></>}
            </button>

            <div style={{ textAlign:'center', marginTop:14, fontSize:13 }}>
              <span style={{ color:'#8fa8bc' }}>New clinic?</span>{' '}
              <button style={{ ...S.btnGhost, color:'#1565a8', fontWeight:500, fontSize:13 }} onClick={() => { setMode('register'); setErr(''); }} disabled={loading}>
                Register here
              </button>
            </div>
          </div>
        )}

    </div>
  </div>
)}

      {/* ── TOAST ── */}
      <Toast toast={toast} />
    </div>
  );
}