// src/utils/razorpay.js
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const openRazorpayCheckout = ({
  keyId,
  orderId,
  amount,
  currency = 'INR',
  name = 'CURELEX',
  description = 'Payment for healthcare services',
  prefill = {},
  theme = { color: '#0f4c81' },
  onSuccess,
  onError,
  onClose,
}) => {
  const options = {
    key: keyId,
    amount,
    currency,
    name,
    description,
    order_id: orderId,
    prefill: {
      name: prefill.name || '',
      email: prefill.email || '',
      contact: prefill.contact || '',
    },
    theme,
    modal: {
      ondismiss: () => { if (onClose) onClose(); },
    },
    handler: function (response) {
      if (onSuccess) {
        onSuccess({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      }
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
  return razorpay;
};