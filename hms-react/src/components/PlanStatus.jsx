// hms-react/src/components/PlanStatus.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PlanStatus = () => {
  const { user, updateUserData } = useAuth();
  const navigate = useNavigate();
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlanStatus();
  }, []);

  const fetchPlanStatus = async () => {
    try {
      const response = await API.get('/plans/clinic');
      if (response.data.success) {
        setPlanData(response.data.plan);
      }
    } catch (err) {
      console.error('Error fetching plan status:', err);
      setError(err.response?.data?.message || 'Failed to fetch plan status');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    try {
      setLoading(true);
      const response = await API.post('/plans/renew', {
        plan: planData?.plan
      });
      if (response.data.success) {
        await fetchPlanStatus();
        if (updateUserData) {
          updateUserData({
            activePlan: response.data.clinic.plan,
            planActivatedAt: response.data.clinic.planActivatedAt,
            planExpiresAt: response.data.clinic.planExpiresAt,
          });
        }
      }
    } catch (err) {
      console.error('Error renewing plan:', err);
      setError(err.response?.data?.message || 'Failed to renew plan');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/plans');
  };

  if (loading) {
    return <div className="plan-status-loading">Loading plan information...</div>;
  }

  if (error) {
    return <div className="plan-status-error">⚠️ {error}</div>;
  }

  if (!planData) {
    return <div className="plan-status-empty">No plan information available</div>;
  }

  const isActive = planData.planStatus === 'active';
  const isGracePeriod = planData.planStatus === 'grace_period';
  const isExpired = planData.planStatus === 'expired';
  const isFree = planData.plan === 'lite' || planData.plan === null;

  let statusColor = '#00a878';
  let statusLabel = 'Active';
  let statusAction = null;

  if (isExpired) {
    statusColor = '#dc3545';
    statusLabel = 'Expired';
    statusAction = { label: 'Renew Now', onClick: handleRenew };
  } else if (isGracePeriod) {
    statusColor = '#ffc107';
    statusLabel = `Grace Period (${planData.daysRemaining || 0} days left)`;
    statusAction = { label: 'Renew Now', onClick: handleRenew };
  } else if (isFree) {
    statusColor = '#6c757d';
    statusLabel = 'Free Plan';
    statusAction = { label: 'Upgrade', onClick: handleUpgrade };
  }

  return (
    <div className="plan-status-card" style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      border: `1px solid ${statusColor}30`,
      marginBottom: '16px',
    }}>
      <div className="plan-status-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0a3d62' }}>
            {planData.planLabel || 'No Plan'}
          </h3>
          <div style={{ fontSize: '13px', color: '#4a6278', marginTop: '4px' }}>
            {planData.type === 'hospital' ? 'Hospital' : 'Clinic'} Plan
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: `${statusColor}15`,
            color: statusColor,
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: statusColor,
            }} />
            {statusLabel}
          </span>
          {statusAction && (
            <button
              onClick={statusAction.onClick}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: statusColor,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.85'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              {statusAction.label}
            </button>
          )}
        </div>
      </div>

      <div className="plan-status-details" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e8edf2',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Plan
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0a3d62' }}>
            {planData.plan ? planData.plan.toUpperCase() : 'None'}
          </div>
        </div>
        {!isFree && (
          <div>
            <div style={{ fontSize: '11px', color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Price
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0a3d62' }}>
              ₹{planData.planPrice || 0}/month
            </div>
          </div>
        )}
        {planData.daysRemaining > 0 && (
          <div>
            <div style={{ fontSize: '11px', color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Days Remaining
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0a3d62' }}>
              {planData.daysRemaining} days
            </div>
          </div>
        )}
        {planData.planExpiresAt && (
          <div>
            <div style={{ fontSize: '11px', color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Expires On
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0a3d62' }}>
              {new Date(planData.planExpiresAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </div>
          </div>
        )}
        {planData.gracePeriodEndsAt && isGracePeriod && (
          <div>
            <div style={{ fontSize: '11px', color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Grace Period Ends
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#dc3545' }}>
              {new Date(planData.gracePeriodEndsAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </div>
          </div>
        )}
      </div>

      {planData.isDataLocked && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#fee2e2',
          color: '#991b1b',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          ⚠️ Your data is locked. Please renew your plan to regain access.
        </div>
      )}

      {!isFree && isActive && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#e8f9f5',
          color: '#0a7a5a',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          ✅ Your plan is active. Enjoy all features!
        </div>
      )}

      {isFree && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#f0f4f8',
          color: '#4a6278',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          💡 Upgrade to unlock more features and capabilities.
        </div>
      )}
    </div>
  );
};

export default PlanStatus;