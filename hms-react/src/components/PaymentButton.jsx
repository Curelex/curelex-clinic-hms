// src/components/PaymentButton.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { loadRazorpayScript, openRazorpayCheckout } from '../utils/razorpay';

export const PaymentButton = ({
  type, // 'telemedicine', 'billing', 'plan'
  id,
  amount,
  description,
  onSuccess,
  onError,
  onClose,
  buttonText = 'Pay Now',
  variant = 'primary',
  disabled = false,
  className = '',
}) => {
  const { user, patient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint;
      let payload = {};

      switch (type) {
        case 'telemedicine':
          endpoint = `/telemedicine/${id}/create-order`;
          break;
        case 'billing':
          endpoint = `/billing/${id}/create-order`;
          break;
        case 'plan':
          endpoint = '/plans/create-order';
          payload = { plan: id };
          break;
        default:
          throw new Error('Invalid payment type');
      }

      const { data } = await API.post(endpoint, payload);

      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      openRazorpayCheckout({
        keyId: data.keyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'CURELEX',
        description: description || `Payment for ${type}`,
        prefill: {
          name: patient?.name || user?.name || '',
          email: patient?.email || user?.email || '',
          contact: patient?.phone || user?.phone || '',
        },
        onSuccess: async (response) => {
          try {
            const verifyResult = await API.post('/payments/verify', {
              orderId: response.razorpayOrderId,
              paymentId: response.razorpayPaymentId,
              signature: response.razorpaySignature,
              type,
            });
            if (onSuccess) onSuccess(verifyResult.data, response);
          } catch (err) {
            if (onError) onError(err);
          }
        },
        onError: (err) => {
          if (onError) onError(err);
        },
        onClose: () => {
          if (onClose) onClose();
        },
      });
    } catch (err) {
      setError(err.message || 'Payment initiation failed');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = disabled || loading;

  const getButtonStyles = () => {
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 600,
      borderRadius: '8px',
      border: 'none',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.6 : 1,
      transition: 'all 0.2s',
      fontFamily: 'inherit',
      minWidth: '120px',
    };

    const variants = {
      primary: { background: '#0f4c81', color: '#fff' },
      success: { background: '#16a34a', color: '#fff' },
      danger: { background: '#dc2626', color: '#fff' },
      warning: { background: '#f59e0b', color: '#fff' },
      outline: { background: 'transparent', color: '#0f4c81', border: '1.5px solid #0f4c81' },
      ghost: { background: '#f1f5f9', color: '#475569' },
    };

    return { ...base, ...variants[variant] };
  };

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={isDisabled}
        className={className}
        style={getButtonStyles()}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Processing...
          </>
        ) : (
          <>💳 {buttonText}</>
        )}
      </button>
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: '#fee2e2',
          borderRadius: '6px',
          color: '#991b1b',
          fontSize: '13px',
        }}>
          ⚠️ {error}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentButton;