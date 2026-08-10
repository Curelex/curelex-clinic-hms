// hms-backend/routes/telemedicine.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import * as telemedicineController from '../controllers/telemedicineController.js';
import { createTelemedicineOrder, verifyPayment, getPaymentStatus } from '../controllers/paymentController.js';
import { isPaymentLive, isPaymentTest } from '../services/paymentMode.js';

const router = express.Router();

router.use(auth);

// ── All existing routes ──
router.get('/online-doctors', telemedicineController.getOnlineDoctors);
router.post('/request', roleCheck('patient'), telemedicineController.requestTelemedicine);
router.get('/patient/:id', telemedicineController.getPatientTelemedicine);
router.post('/:id/pay', roleCheck('patient'), telemedicineController.processPayment);
router.get('/doctor/:id', roleCheck('doctor', 'separate_doctor', 'admin'), telemedicineController.getDoctorTelemedicine);
router.patch('/:id/approve', roleCheck('doctor', 'separate_doctor', 'admin'), telemedicineController.approveTelemedicine);
router.patch('/:id/reject', roleCheck('doctor', 'separate_doctor', 'admin'), telemedicineController.rejectTelemedicine);
router.patch('/:id/start', roleCheck('doctor', 'separate_doctor', 'admin'), telemedicineController.startTelemedicine);
router.patch('/:id/end', roleCheck('doctor', 'separate_doctor', 'admin'), telemedicineController.endTelemedicine);
router.post('/:id/request-payout', roleCheck('doctor', 'separate_doctor'), telemedicineController.requestPayout);
router.get('/earnings/:doctorId', telemedicineController.getDoctorEarnings);
router.put('/bank-details', roleCheck('doctor', 'separate_doctor'), telemedicineController.updateBankDetails);
router.put('/consultation-fee', roleCheck('doctor', 'separate_doctor'), telemedicineController.updateTelemedicineFee);
router.get('/pending-payouts', roleCheck('super_admin'), telemedicineController.getPendingPayouts);
router.patch('/:id/approve-payout', roleCheck('super_admin'), telemedicineController.approvePayout);
router.get('/stats', telemedicineController.getTelemedicineStats);
router.get('/:id', telemedicineController.getTelemedicineById);
router.patch('/:id/cancel', telemedicineController.cancelTelemedicine);

// ── Payment routes (conditionally registered) ──
if (isPaymentLive()) {
  router.post('/:id/create-order', roleCheck('patient'), createTelemedicineOrder);
  router.post('/verify-payment', roleCheck('patient'), verifyPayment);
  router.get('/payment-status/:orderId', roleCheck('patient'), getPaymentStatus);
  console.log('✅ Telemedicine payment routes: LIVE mode');
} else {
  console.log('🔧 Telemedicine payment routes: TEST mode (bypassed)');
}

export default router;