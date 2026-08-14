// hms-react/src/components/ClinicTimingsModal.jsx
import React, { useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Empty timings - NO defaults ──
const emptyTimings = {
  monday: { open: '', close: '', isOpen: false },
  tuesday: { open: '', close: '', isOpen: false },
  wednesday: { open: '', close: '', isOpen: false },
  thursday: { open: '', close: '', isOpen: false },
  friday: { open: '', close: '', isOpen: false },
  saturday: { open: '', close: '', isOpen: false },
  sunday: { open: '', close: '', isOpen: false },
};

export default function ClinicTimingsModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTimings = null,
  clinicType = 'clinic',
  clinicName = ''
}) {
  // Use initialTimings if available, otherwise use empty timings
  const [timings, setTimings] = useState(() => {
    if (initialTimings) {
      // If timings exist but some days are missing, fill with empty
      const filled = { ...emptyTimings };
      DAYS.forEach(day => {
        if (initialTimings[day]) {
          filled[day] = {
            open: initialTimings[day].open || '',
            close: initialTimings[day].close || '',
            isOpen: initialTimings[day].isOpen || false,
          };
        }
      });
      return filled;
    }
    return { ...emptyTimings };
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Apply a preset to all days
  const applyPreset = (preset) => {
    const newTimings = { ...timings };
    DAYS.forEach(day => {
      if (preset === 'closed') {
        newTimings[day] = { ...newTimings[day], isOpen: false, open: '', close: '' };
      } else if (preset === 'weekdays') {
        const isWeekend = day === 'saturday' || day === 'sunday';
        newTimings[day] = { 
          isOpen: !isWeekend,
          open: isWeekend ? '' : '09:00',
          close: isWeekend ? '' : '18:00',
        };
      } else if (preset === 'weekends') {
        const isWeekend = day === 'saturday' || day === 'sunday';
        newTimings[day] = { 
          isOpen: isWeekend,
          open: isWeekend ? '09:00' : '',
          close: isWeekend ? '14:00' : '',
        };
      } else if (preset === 'all') {
        newTimings[day] = { ...newTimings[day], isOpen: true, open: '09:00', close: '18:00' };
      } else if (preset === 'custom') {
        // Clear all - user sets manually
        newTimings[day] = { isOpen: false, open: '', close: '' };
      }
    });
    setTimings(newTimings);
  };

  const toggleDay = (day) => {
    setTimings(prev => ({
      ...prev,
      [day]: { ...prev[day], isOpen: !prev[day].isOpen }
    }));
  };

  const updateTime = (day, field, value) => {
    setTimings(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    // ── Validate: Check if all open days have both open and close times ──
    let hasError = false;
    let errorMessage = '';
    
    DAYS.forEach(day => {
      const dayData = timings[day];
      if (dayData.isOpen) {
        if (!dayData.open || !dayData.close) {
          hasError = true;
          errorMessage = `Please set both opening and closing time for ${DAY_LABELS[DAYS.indexOf(day)]}.`;
        }
        if (dayData.open && dayData.close && dayData.open >= dayData.close) {
          hasError = true;
          errorMessage = `Opening time must be before closing time for ${DAY_LABELS[DAYS.indexOf(day)]}.`;
        }
      }
    });

    // Check if at least one day is open
    const hasOpenDay = DAYS.some(day => timings[day].isOpen);
    if (!hasOpenDay) {
      setError('Please set at least one day as open.');
      return;
    }

    if (hasError) {
      setError(errorMessage);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await API.put('/clinics/timings', { openingHours: timings });
      if (response.data.success) {
        toast.success(`${clinicType === 'hospital' ? 'Hospital' : 'Clinic'} timings saved successfully!`);
        onSave(timings);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save timings');
      toast.error('Failed to save timings');
    }
    setLoading(false);
  };

  // Check if any day has times set
  const hasAnyTimes = DAYS.some(day => 
    timings[day].open && timings[day].close
  );

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        maxWidth: '750px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #0f2942, #1a4a7a)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                ⏰ Set Operating Hours
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                {clinicName || 'Your'} {clinicType === 'hospital' ? 'Hospital' : 'Clinic'}
              </p>
            </div>
            {!initialTimings && (
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(251, 191, 36, 0.2)',
                color: '#fbbf24',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                Required
              </span>
            )}
          </div>
          <div style={{
            marginTop: '10px',
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#93c5fd',
          }}>
            💡 Patients can only book tokens during your operating hours. 
            {!hasAnyTimes && ' Please set the schedule below.'}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Presets */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>
              Quick Set (Click to apply to all days)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Mon-Fri (9-6)', value: 'weekdays' },
                { label: 'All Days (9-6)', value: 'all' },
                { label: 'Weekends Only', value: 'weekends' },
                { label: 'Closed All', value: 'closed' },
                { label: 'Clear All (Set Manually)', value: 'custom' },
              ].map(preset => (
                <button
                  key={preset.value}
                  onClick={() => applyPreset(preset.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1.5px solid #e2e8f0',
                    background: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#2d6be4';
                    e.currentTarget.style.color = '#2d6be4';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day by day */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DAYS.map((day, index) => {
              const dayData = timings[day];
              
              const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
              const isComplete = dayData.isOpen && dayData.open && dayData.close;

              return (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: dayData.isOpen ? (isToday ? '#f0fdf4' : '#fff') : '#f8fafc',
                    border: `1.5px solid ${dayData.isOpen ? (isToday ? '#bbf7d0' : '#e2e8f0') : '#e2e8f0'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => toggleDay(day)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      background: dayData.isOpen ? '#2d6be4' : '#cbd5e1',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      left: dayData.isOpen ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>

                  {/* Day label */}
                  <div style={{ width: '90px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: dayData.isOpen ? 700 : 400,
                      color: dayData.isOpen ? '#1a2236' : '#94a3b8',
                    }}>
                      {DAY_LABELS[index]}
                    </span>
                    {isToday && (
                      <span style={{
                        marginLeft: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#16a34a',
                        background: '#dcfce7',
                        padding: '1px 6px',
                        borderRadius: '10px',
                      }}>
                        Today
                      </span>
                    )}
                    {dayData.isOpen && !isComplete && (
                      <span style={{
                        marginLeft: '6px',
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#dc2626',
                      }}>
                        ⚠️ Set times
                      </span>
                    )}
                  </div>

                  {/* Time inputs */}
                  {dayData.isOpen ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <input
                        type="time"
                        value={dayData.open}
                        onChange={(e) => updateTime(day, 'open', e.target.value)}
                        placeholder="Open"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1.5px solid ${dayData.open ? '#16a34a' : '#e2e8f0'}`,
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          background: dayData.open ? '#f0fdf4' : '#fff',
                          color: '#1a2236',
                          width: '110px',
                        }}
                      />
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
                      <input
                        type="time"
                        value={dayData.close}
                        onChange={(e) => updateTime(day, 'close', e.target.value)}
                        placeholder="Close"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1.5px solid ${dayData.close ? '#16a34a' : '#e2e8f0'}`,
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          background: dayData.close ? '#f0fdf4' : '#fff',
                          color: '#1a2236',
                          width: '110px',
                        }}
                      />
                      {isComplete && (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                          ✅ {dayData.open} - {dayData.close}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Closed</span>
                  )}

                  {/* Status indicator */}
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isComplete ? '#16a34a' : dayData.isOpen ? '#f59e0b' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}>
                    {isComplete ? '🟢 Set' : dayData.isOpen ? '⏳ Incomplete' : '🔴 Closed'}
                  </span>
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: '#fee2e2',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Validation Summary */}
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <strong>Open days:</strong> {DAYS.filter(d => timings[d].isOpen).length}
              </span>
              <span>
                <strong>Complete:</strong> {DAYS.filter(d => timings[d].isOpen && timings[d].open && timings[d].close).length}
              </span>
              <span style={{ color: '#dc2626' }}>
                <strong>Incomplete:</strong> {DAYS.filter(d => timings[d].isOpen && (!timings[d].open || !timings[d].close)).length}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          background: '#f8fafc',
        }}>
          {initialTimings && (
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2d6be4, #1e40af)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Saving...
              </>
            ) : (
              '💾 Save Timings'
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}