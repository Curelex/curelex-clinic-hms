// src/utils/paymentConfig.js

export const PAYMENT_MODE = {
  mode: import.meta.env.VITE_PAYMENT_MODE || 'test',
};
console.log(PAYMENT_MODE);
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