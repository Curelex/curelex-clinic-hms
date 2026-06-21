// hms-backend/routes/medicines.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import * as medicineController from '../controllers/medicineController.js';

const router = express.Router();

router.use(auth);

// ── Search - MUST come before /:id routes ──
router.get('/search', medicineController.searchMedicines);

// ── Get medicines for a specific doctor ──
router.get('/doctor/:doctorId', medicineController.getDoctorMedicines);

// ── Admin routes ──
router.post('/add', roleCheck('admin'), medicineController.addMedicine);
router.get('/all', roleCheck('admin'), medicineController.getMedicines);

// ── Doctor adds their own medicine ──
router.post('/doctor/add', roleCheck('doctor'), medicineController.addDoctorMedicine);

// ── Sync all medicines from inventory ──
router.post('/sync-all', roleCheck('admin'), medicineController.syncAllMedicinesFromInventory);

// ── Get/Update/Delete by ID ──
router.get('/:id', medicineController.getMedicineById);
router.put('/:id', medicineController.updateMedicine);
router.delete('/doctor/:id', roleCheck('doctor'), medicineController.deleteDoctorMedicine);

export default router;