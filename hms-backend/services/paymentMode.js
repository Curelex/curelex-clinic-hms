// hms-backend/services/paymentMode.js

export const PAYMENT_MODE = {
  // Set to 'test' for bypassing payment, 'live' for real Razorpay
  mode: process.env.PAYMENT_MODE || 'test', // 'test' | 'live'
};

export const isPaymentLive = () => {
  return PAYMENT_MODE.mode === 'live';
};

export const isPaymentTest = () => {
  return PAYMENT_MODE.mode === 'test';
};

export default {
  PAYMENT_MODE,
  isPaymentLive,
  isPaymentTest,
};