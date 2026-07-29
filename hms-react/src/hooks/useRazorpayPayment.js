// hms-react/src/hooks/useRazorpayPayment.js
import { useState, useCallback } from 'react';
import API from '../utils/api';
import { loadRazorpayScript, openRazorpayCheckout, verifyPayment } from '../utils/razorpay';

export const useRazorpayPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  /**
   * Initialize a telemedicine payment
   */
  const initTelemedicinePayment = useCallback(async (telemedicineId, patient) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post(`/telemedicine/${telemedicineId}/create-order`);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      setPaymentData(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to initialize payment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initialize a bill payment
   */
  const initBillPayment = useCallback(async (billId) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post(`/billing/${billId}/create-order`);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      setPaymentData(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to initialize payment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initialize a plan subscription payment
   */
  const initPlanPayment = useCallback(async (plan) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/plans/create-order', { plan });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      setPaymentData(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to initialize payment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Open Razorpay checkout
   */
  const openCheckout = useCallback(async ({
    orderId,
    amount,
    currency = 'INR',
    name = 'CURELEX',
    description = 'Payment for healthcare services',
    prefill = {},
    onSuccess,
    onError: onErrorCallback,
    onClose,
  }) => {
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      // Get key ID from payment data or use env
      const keyId = paymentData?.keyId || process.env.REACT_APP_RAZORPAY_KEY_ID;

      if (!keyId) {
        throw new Error('Razorpay key ID is not configured');
      }

      const razorpay = openRazorpayCheckout({
        keyId,
        orderId,
        amount,
        currency,
        name,
        description,
        prefill,
        onSuccess: async (response) => {
          try {
            // Verify payment
            const verifyResult = await verifyPayment(
              API,
              response.razorpayOrderId,
              response.razorpayPaymentId,
              response.razorpaySignature,
              paymentData?.type || 'telemedicine'
            );
            
            if (onSuccess) {
              onSuccess(verifyResult, response);
            }
          } catch (err) {
            if (onErrorCallback) {
              onErrorCallback(err);
            }
          }
        },
        onError: (err) => {
          if (onErrorCallback) {
            onErrorCallback(err);
          }
        },
        onClose,
      });

      return razorpay;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [paymentData]);

  return {
    loading,
    error,
    paymentData,
    initTelemedicinePayment,
    initBillPayment,
    initPlanPayment,
    openCheckout,
    setError,
  };
};