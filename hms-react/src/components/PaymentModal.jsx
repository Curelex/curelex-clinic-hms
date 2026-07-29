// hms-react/src/components/PaymentModal.jsx
import React, { useState } from 'react';
import PaymentButton from './PaymentButton';

export const PaymentModal = ({
  isOpen,
  onClose,
  type,
  id,
  amount,
  description,
  title = 'Payment',
  onSuccess,
  onError,
}) => {
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  if (!isOpen) return null;

  const handleSuccess = (result) => {
    setPaymentComplete(true);
    setPaymentResult(result);
    if (onSuccess) {
      onSuccess(result);
    }
  };

  const handleClose = () => {
    if (!paymentComplete) {
      onClose();
    }
  };

  const handleDone = () => {
    onClose();
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amt / 100);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {paymentComplete ? (
          // Success state
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <span style={{ fontSize: '40px' }}>✅</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
              Payment Successful!
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>
              Your payment has been processed successfully.
            </p>
            {paymentResult?.transaction && (
              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  textAlign: 'left',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Transaction ID</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    {paymentResult.transaction?.transactionId || paymentResult.telemedicine?.transactionId || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Amount</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    {formatCurrency(paymentResult.transaction?.amount || amount)}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={handleDone}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: '#0f4c81',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          // Payment form
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <span style={{ fontSize: '28px' }}>💳</span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                {title}
              </h3>
              <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>{description}</p>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: '#64748b' }}>Amount to Pay</span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b' }}>
                {formatCurrency(amount)}
              </span>
            </div>

            <PaymentButton
              type={type}
              id={id}
              amount={amount}
              description={description}
              buttonText={`Pay ${formatCurrency(amount)}`}
              buttonClassName=""
              onSuccess={handleSuccess}
              onError={onError}
              onClose={() => {}}
              variant="primary"
            />

            <button
              onClick={handleClose}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'transparent',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentModal;