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

const router = express.Router();

// All routes require authentication
router.use(auth);

// Create orders
router.post('/telemedicine/:id/order', roleCheck('patient'), createTelemedicineOrder);
router.post('/bill/:billId/order', roleCheck('patient'), createBillOrder);
router.post('/plan/order', createPlanOrder);

// Verify payment
router.post('/verify', verifyPayment);

// Get status
router.get('/status/:orderId', getPaymentStatus);

// Get history
router.get('/history', getPaymentHistory);

export default router;