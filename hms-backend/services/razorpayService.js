// hms-backend/services/razorpayService.js
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

class RazorpayService {
  constructor() {
    this.instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
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
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  async getPayment(paymentId) {
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