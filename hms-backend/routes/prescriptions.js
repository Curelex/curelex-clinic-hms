// hms-backend/routes/prescriptions.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import * as prescriptionController from '../controllers/prescriptionController.js';
// ✅ Import medicine controller for search
import * as medicineController from '../controllers/medicineController.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── Prescription Routes ──

// Get stats
router.get('/stats', prescriptionController.getPrescriptionStats);

// ✅ Search medicines (uses medicine controller)
router.get('/medicines/search', medicineController.searchMedicines);

// Create prescription
router.post('/', roleCheck('doctor', 'admin'), prescriptionController.createPrescription);

// Get prescriptions by patient
router.get('/patient/:id', prescriptionController.getPrescriptionsByPatient);

// Get prescriptions by patient (paginated)
router.get('/patient/:id/paginated', prescriptionController.getPatientPrescriptionsPaginated);

// Get prescriptions by doctor
router.get('/doctor/:id', prescriptionController.getPrescriptionsByDoctor);

// Get single prescription
router.get('/:id', prescriptionController.getPrescriptionById);

// Get prescription for print
router.get('/:id/print', prescriptionController.getPrescriptionForPrint);

// Update prescription
router.put('/:id', roleCheck('doctor', 'admin'), prescriptionController.updatePrescription);

// Update prescription status
router.patch('/:id/status', roleCheck('doctor', 'admin', 'pharmacist'), prescriptionController.updatePrescriptionStatus);

// Delete prescription
router.delete('/:id', roleCheck('doctor', 'admin'), prescriptionController.deletePrescription);

export default router;