// hms-backend/routes/telemedicine.js

import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import * as telemedicineController from '../controllers/telemedicineController.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── New: Get online doctors ──
router.get('/online-doctors', telemedicineController.getOnlineDoctors);

// ── Patient routes ──
router.post('/request', roleCheck('patient'), telemedicineController.requestTelemedicine);
router.get('/patient/:id', telemedicineController.getPatientTelemedicine);

// ── Doctor routes ──
router.get('/doctor/:id', roleCheck('doctor', 'admin'), telemedicineController.getDoctorTelemedicine);
router.patch('/:id/approve', roleCheck('doctor', 'admin'), telemedicineController.approveTelemedicine);
router.patch('/:id/reject', roleCheck('doctor', 'admin'), telemedicineController.rejectTelemedicine);
router.patch('/:id/start', roleCheck('doctor', 'admin'), telemedicineController.startTelemedicine);
router.patch('/:id/end', roleCheck('doctor', 'admin'), telemedicineController.endTelemedicine);

// ── Shared routes ──
router.get('/stats', telemedicineController.getTelemedicineStats);
router.get('/:id', telemedicineController.getTelemedicineById);
router.patch('/:id/cancel', telemedicineController.cancelTelemedicine);

export default router;