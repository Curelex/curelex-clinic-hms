import React, { useEffect, useState, useCallback } from 'react';
import { useQueueSocket } from '../hooks/useQueueSocket';

// ── API base ──────────────────────────────────────────────────────────────────
const API = 'http://localhost:5000';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  brand:       '#0a3d62',
  brandMid:    '#1565a8',
  accent:      '#00b894',
  accentWarm:  '#fd9644',
  danger:      '#e74c3c',
  white:       '#ffffff',
  bg:          '#f0f7ff',
  cardBg:      '#ffffff',
  textDark:    '#0a3d62',
  textMuted:   '#5a7a94',
  textLight:   '#8fa8bc',
  border:      '#dde8f0',
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  waiting: { color: C.brandMid,   bg: '#e8f2ff', label: 'Waiting',    icon: '⏳' },
  called:  { color: C.accentWarm, bg: '#fff3e0', label: 'Your Turn!', icon: '🔔' },
  done:    { color: C.accent,     bg: '#e8fdf5', label: 'Done',       icon: '✅' },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(160deg, #dceeff 0%, #f0f7ff 50%, #e8fdf5 100%)`,
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    padding: '0 0 40px',
  },

  // ── Header bar ──
  header: {
    background: `linear-gradient(135deg, ${C.brand}, ${C.brandMid})`,
    padding: '20px 20px 24px',
    borderRadius: '0 0 24px 24px',
    boxShadow: '0 8px 24px rgba(10,61,98,0.2)',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerClinic: {
    fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 2,
  },
  headerDoctor: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)',
  },
  headerDate: {
    position: 'absolute', top: 16, right: 16,
    background: 'rgba(255,255,255,0.15)', borderRadius: 8,
    padding: '4px 10px', fontSize: 11, color: 'rgba(255,255,255,0.85)',
    fontWeight: 600,
  },

  // ── Body ──
  body: { padding: '0 16px' },

  // ── Card ──
  card: {
    background: C.cardBg, borderRadius: 18,
    padding: '22px 20px',
    boxShadow: '0 4px 20px rgba(10,61,98,0.08)',
    border: `1px solid ${C.border}`,
    marginBottom: 14,
  },

  // ── My token big display ──
  myTokenWrap: {
    textAlign: 'center', padding: '8px 0 4px',
  },
  myTokenLabel: {
    fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
    textTransform: 'uppercase', color: C.textMuted, marginBottom: 10,
  },
  myTokenCircle: (color) => ({
    width: 110, height: 110, borderRadius: '50%',
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 12px',
    boxShadow: `0 8px 28px ${color}44`,
  }),
  myTokenNum: {
    fontSize: 46, fontWeight: 900, color: C.white, lineHeight: 1,
  },
  myTokenSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500, marginTop: 2,
  },
  statusBadge: (cfg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: cfg.bg, color: cfg.color,
    borderRadius: 20, padding: '6px 14px',
    fontSize: 13, fontWeight: 700,
    border: `1.5px solid ${cfg.color}33`,
  }),

  // ── Now serving ──
  nowServingRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  nowServingLabel: {
    fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.textMuted,
  },
  nowServingNum: {
    fontSize: 38, fontWeight: 900, color: C.accent, lineHeight: 1,
  },
  nowServingName: {
    fontSize: 13, color: C.textMuted, marginTop: 2,
  },
  divider: {
    height: 1, background: C.border, margin: '14px 0',
  },

  // ── Stats row (2 boxes now) ──
  statsRow: {
    display: 'flex', gap: 10,
  },
  statBox: {
    flex: 1, textAlign: 'center',
    background: '#f4f8fd', borderRadius: 12, padding: '12px 8px',
    border: `1px solid ${C.border}`,
  },
  statNum: {
    fontSize: 24, fontWeight: 800, color: C.brand,
  },
  statLabel: {
    fontSize: 11, color: C.textMuted, fontWeight: 600, marginTop: 2,
  },

  // ── Progress bar ──
  progressWrap: { marginBottom: 6 },
  progressRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  progressLabel: { fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5 },
  progressValue: { fontSize: 12, fontWeight: 700, color: C.brand },
  progressTrack: {
    width: '100%', height: 10, background: '#e0eaf4',
    borderRadius: 99, overflow: 'hidden',
  },
  progressFill: (pct, color) => ({
    height: '100%', width: `${Math.min(pct, 100)}%`,
    background: `linear-gradient(90deg, ${color}, ${color}bb)`,
    borderRadius: 99, transition: 'width 0.6s ease',
  }),

  // ── Wait estimate ──
  waitBox: {
    background: 'linear-gradient(135deg, #fff8e1, #fffde7)',
    border: '1.5px solid #ffe082', borderRadius: 14,
    padding: '14px 18px',
    display: 'flex', alignItems: 'center', gap: 14,
    marginBottom: 14,
  },
  waitIcon: { fontSize: 28 },
  waitText: { flex: 1 },
  waitTitle: { fontSize: 12, fontWeight: 700, color: '#9e6c00', letterSpacing: 0.5, textTransform: 'uppercase' },
  waitMins: { fontSize: 22, fontWeight: 900, color: '#e65100' },

  // ── Alert banners ──
  alertBanner: (bg, color, border) => ({
    background: bg, border: `2px solid ${border}`,
    borderRadius: 14, padding: '16px 18px',
    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14,
    animation: 'pulse 2s ease-in-out infinite',
  }),
  alertIcon: { fontSize: 26, flexShrink: 0 },
  alertTitle: (color) => ({ fontSize: 15, fontWeight: 800, color }),
  alertDesc: { fontSize: 12.5, color: C.textMuted, marginTop: 3, lineHeight: 1.4 },

  // ── Connection indicator ──
  connDot: (ok) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: ok ? C.accent : C.danger,
    marginRight: 6, verticalAlign: 'middle',
    animation: ok ? 'none' : 'pulse 1s infinite',
  }),
  connText: {
    fontSize: 11, color: C.textMuted, textAlign: 'center', marginBottom: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  },

  // ── Loading / error ──
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '80vh', padding: 24, textAlign: 'center',
  },
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = C.brand }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
      style={{ animation: 'spin 0.9s linear infinite', marginBottom: 16 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── Format date — always uses today's real date ───────────────────────────────
function formatDate() {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Main QueueTracker component ───────────────────────────────────────────────
export default function QueueTracker() {
  // Extract sessionToken from URL path: /track/:sessionToken
  const sessionToken = window.location.pathname.split('/clinic/track/')[1]?.split('/')[0];

  const [initialData, setInitialData] = useState(null);
  const [fetchError,  setFetchError]  = useState(null);
  const [fetching,    setFetching]    = useState(true);

  // ── Fetch initial data from REST API ─────────────────────────────
  const fetchInitial = useCallback(async () => {
    if (!sessionToken) {
      setFetchError('Invalid tracking link.');
      setFetching(false);
      return;
    }
    try {
      const res  = await fetch(`${API}/api/clinic/queue/track/${sessionToken}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load queue data.');
      setInitialData(json);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  }, [sessionToken]);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  // ── Connect WebSocket after initial data is available ────────────
  const { queueData, connected, error: socketError } = useQueueSocket({
    sessionToken,
    clinicId: initialData?.clinicId,
    doctorId: initialData?.doctorId,
    date:     initialData?.date,
    myToken:  initialData?.myToken,
  });

  // Merge: WebSocket data overrides initial REST data when available
  const data = queueData
    ? { ...initialData, ...queueData }
    : initialData;

  // ── Render: Loading ───────────────────────────────────────────────
  if (fetching) {
    return (
      <div style={{ ...S.page, ...S.center }}>
        <style>{globalCSS}</style>
        <Spinner />
        <div style={{ color: C.textMuted, fontSize: 14 }}>Loading your queue status…</div>
      </div>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────
  if (fetchError || !data) {
    return (
      <div style={{ ...S.page, ...S.center }}>
        <style>{globalCSS}</style>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>
          Link Not Found
        </div>
        <div style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.6 }}>
          {fetchError || 'This tracking link has expired or is invalid.'}
          <br />Please contact the clinic for assistance.
        </div>
      </div>
    );
  }

  const statusCfg   = STATUS_CONFIG[data.myStatus] || STATUS_CONFIG.waiting;
  const isCalled    = data.myStatus === 'called';
  const isDone      = data.myStatus === 'done';
  const isNext      = !isCalled && !isDone && data.aheadCount === 0;
  const progressPct = data.totalPatients > 0
    ? ((data.doneCount || 0) / data.totalPatients) * 100
    : 0;

  return (
    <div style={S.page}>
      <style>{globalCSS}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        {/* Date always reflects today's real date */}
        <div style={S.headerDate}>{formatDate()}</div>
        <div style={{ marginBottom: 4, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
          🏥 Live Queue
        </div>
        {/* Clinic name comes from API data, not hardcoded */}
        <div style={S.headerClinic}>{data.clinicName}</div>
        <div style={S.headerDoctor}>👨‍⚕️ {data.doctorName}</div>
      </div>

      <div style={S.body}>

        {/* ── Connection status ── */}
        <div style={S.connText}>
          <span style={S.connDot(connected)} />
          {connected ? 'Live updates connected' : socketError || 'Connecting…'}
        </div>

        {/* ── Alert: Your turn! ── */}
        {isCalled && (
          <div style={S.alertBanner('#fff3e0', C.accentWarm, C.accentWarm)}>
            <span style={S.alertIcon}>🔔</span>
            <div>
              <div style={S.alertTitle(C.accentWarm)}>It's Your Turn!</div>
              <div style={S.alertDesc}>
                Please proceed to the doctor's room immediately. Don't keep the doctor waiting!
              </div>
            </div>
          </div>
        )}

        {/* ── Alert: Almost your turn ── */}
        {isNext && !isCalled && !isDone && (
          <div style={S.alertBanner('#e8f5e9', '#2e7d32', '#66bb6a')}>
            <span style={S.alertIcon}>🚶</span>
            <div>
              <div style={S.alertTitle('#2e7d32')}>You're Next!</div>
              <div style={S.alertDesc}>
                Please make your way to the clinic now. You'll be called very soon.
              </div>
            </div>
          </div>
        )}

        {/* ── Alert: Done ── */}
        {isDone && (
          <div style={S.alertBanner('#e8fdf5', C.accent, C.accent)}>
            <span style={S.alertIcon}>✅</span>
            <div>
              <div style={S.alertTitle(C.accent)}>Visit Complete</div>
              <div style={S.alertDesc}>
                Your consultation is done. Thank you for visiting {data.clinicName}!
              </div>
            </div>
          </div>
        )}

        {/* ── My Token Card ── */}
        <div style={S.card}>
          <div style={S.myTokenWrap}>
            <div style={S.myTokenLabel}>Your Token</div>
            <div style={S.myTokenCircle(statusCfg.color)}>
              <div style={S.myTokenNum}>{data.myToken}</div>
              <div style={S.myTokenSub}>TOKEN</div>
            </div>
            <div>
              <span style={S.statusBadge(statusCfg)}>
                {statusCfg.icon} {statusCfg.label}
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: C.textMuted }}>
              {data.patientName}
            </div>
          </div>
        </div>

        {/* ── Now Serving Card ── */}
        <div style={S.card}>
          <div style={S.nowServingRow}>
            <div>
              <div style={S.nowServingLabel}>Now Serving</div>
              <div style={S.nowServingNum}>
                {data.currentToken ?? '—'}
              </div>
              {data.currentPatient && (
                <div style={S.nowServingName}>{data.currentPatient}</div>
              )}
            </div>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e8fdf5, #b2f5e4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30,
            }}>
              🩺
            </div>
          </div>

          <div style={S.divider} />

          {/* Stats — only "Left" and "Total Today" (Done Today removed) */}
          <div style={S.statsRow}>
            <div style={S.statBox}>
              <div style={{ ...S.statNum, color: C.brandMid }}>{data.aheadCount ?? '—'}</div>
              <div style={S.statLabel}>Left</div>
            </div>
            <div style={S.statBox}>
              <div style={{ ...S.statNum, color: C.textMuted }}>{data.totalPatients ?? 0}</div>
              <div style={S.statLabel}>Total Today</div>
            </div>
          </div>
        </div>

        {/* ── Estimated Wait ── */}
        {!isCalled && !isDone && (
          <div style={S.waitBox}>
            <span style={S.waitIcon}>⏱️</span>
            <div style={S.waitText}>
              <div style={S.waitTitle}>Estimated Wait</div>
              <div style={S.waitMins}>
                {data.estWaitMins === 0
                  ? 'Any moment now!'
                  : `~${data.estWaitMins} min${data.estWaitMins !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        )}

        {/* ── Queue Progress Bar ── */}
        <div style={S.card}>
          <div style={S.progressWrap}>
            <div style={S.progressRow}>
              <span style={S.progressLabel}>Queue Progress</span>
              <span style={S.progressValue}>{Math.round(progressPct)}% done</span>
            </div>
            <div style={S.progressTrack}>
              <div style={S.progressFill(progressPct, C.accent)} />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
            {data.doneCount || 0} of {data.totalPatients || 0} patients seen today
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>💙</div>
          <div style={{ fontSize: 12, color: C.textLight }}>
            Powered by <strong style={{ color: C.brandMid }}>Curelex</strong>
          </div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
            Updates in real-time — no refresh needed
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Global CSS ────────────────────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0f7ff; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
`;