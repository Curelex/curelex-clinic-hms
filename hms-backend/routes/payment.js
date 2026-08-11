// hms-backend/routes/payments.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import {
  createTelemedicineOrder,
  createBillOrder,
  createPlanOrder,
  verifyPayment,
  getPaymentStatus,
  getPaymentHistory,
} from '../controllers/paymentController.js';
import { isPaymentLive, isPaymentTest } from '../services/paymentMode.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── Payment routes (conditionally registered) ──
if (isPaymentLive()) {
  router.post('/telemedicine/:id/order', roleCheck('patient'), createTelemedicineOrder);
  router.post('/bill/:billId/order', roleCheck('patient'), createBillOrder);
  router.post('/plan/order', createPlanOrder);
  router.post('/verify', verifyPayment);
  router.get('/status/:orderId', getPaymentStatus);
  router.get('/history', getPaymentHistory);
  console.log('✅ Payment routes: LIVE mode');
} else {
  console.log('🔧 Payment routes: TEST mode (bypassed)');
  
  // ── Test mode: Return mock responses ──
  router.post('/telemedicine/:id/order', async (req, res) => {
    res.json({
      success: true,
      testMode: true,
      message: 'Test mode: Payment bypassed',
      orderId: `TEST_${Date.now()}`,
      amount: 1000,
      currency: 'INR',
    });
  });
  
  router.post('/bill/:billId/order', async (req, res) => {
    res.json({
      success: true,
      testMode: true,
      message: 'Test mode: Payment bypassed',
      orderId: `TEST_${Date.now()}`,
      amount: 1000,
      currency: 'INR',
    });
  });
  
  router.post('/plan/order', async (req, res) => {
    res.json({
      success: true,
      testMode: true,
      message: 'Test mode: Payment bypassed',
      orderId: `TEST_${Date.now()}`,
      amount: 1000,
      currency: 'INR',
    });
  });
  
  router.post('/verify', async (req, res) => {
    res.json({
      success: true,
      testMode: true,
      message: 'Test mode: Payment verified',
    });
  });
  
  router.get('/status/:orderId', async (req, res) => {
    res.json({
      success: true,
      testMode: true,
      status: 'paid',
      paidAt: new Date(),
    });
  });
  
  router.get('/history', async (req, res) => {
    res.json({
      success: true,
      testMode: true,
      transactions: [],
    });
  });
}

export default router;