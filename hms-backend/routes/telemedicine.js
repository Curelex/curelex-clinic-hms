// hms-backend/routes/telemedicine.js

import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import * as telemedicineController from '../controllers/telemedicineController.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── Online doctors ──
router.get('/online-doctors', telemedicineController.getOnlineDoctors);

// ── Patient routes ──
router.post('/request', roleCheck('patient'), telemedicineController.requestTelemedicine);
router.get('/patient/:id', telemedicineController.getPatientTelemedicine);
router.post('/:id/pay', roleCheck('patient'), telemedicineController.processPayment);

// ── Doctor routes ──
router.get('/doctor/:id', roleCheck('doctor', 'admin'), telemedicineController.getDoctorTelemedicine);
router.patch('/:id/approve', roleCheck('doctor', 'admin'), telemedicineController.approveTelemedicine);
router.patch('/:id/reject', roleCheck('doctor', 'admin'), telemedicineController.rejectTelemedicine);
router.patch('/:id/start', roleCheck('doctor', 'admin'), telemedicineController.startTelemedicine);
router.patch('/:id/end', roleCheck('doctor', 'admin'), telemedicineController.endTelemedicine);
router.post('/:id/request-payout', roleCheck('doctor'), telemedicineController.requestPayout);
router.get('/earnings/:doctorId', telemedicineController.getDoctorEarnings);
router.put('/bank-details', roleCheck('doctor'), telemedicineController.updateBankDetails);
router.put('/consultation-fee', roleCheck('doctor'), telemedicineController.updateTelemedicineFee);

// ── Super Admin routes (payout management) ──
router.get('/pending-payouts', roleCheck('super_admin'), telemedicineController.getPendingPayouts);
router.patch('/:id/approve-payout', roleCheck('super_admin'), telemedicineController.approvePayout);

// ── Shared routes ──
router.get('/stats', telemedicineController.getTelemedicineStats);
router.get('/:id', telemedicineController.getTelemedicineById);
router.patch('/:id/cancel', telemedicineController.cancelTelemedicine);

export default router;