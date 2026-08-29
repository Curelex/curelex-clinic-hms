// hms-backend/services/razorpayService.js
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const isMockMode = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_key_id';

class RazorpayService {
  constructor() {
    if (!isMockMode) {
      this.instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    if (isMockMode) {
      console.log('[Razorpay MOCK MODE] Returning fake order - no real API keys configured yet');
      return {
        success: true,
        orderId: 'order_mock_' + Date.now(),
        amount: Math.round(amount * 100),
        currency,
        receipt,
        status: 'created',
        mock: true,
      };
    }

    try {
      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt,
        notes,
        payment_capture: 1,
      };
      const order = await this.instance.orders.create(options);
      return { success: true, orderId: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt, status: order.status };
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      return { success: false, error: error.message };
    }
  }

  verifyPayment({ orderId, paymentId, signature }) {
    if (isMockMode) {
      console.log('[Razorpay MOCK MODE] Skipping signature verification');
      return true;
    }
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  async getPayment(paymentId) {
    if (isMockMode) {
      return { success: true, payment: { id: paymentId, status: 'captured', mock: true } };
    }
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return { success: true, payment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

const razorpayService = new RazorpayService();
export default razorpayService;
