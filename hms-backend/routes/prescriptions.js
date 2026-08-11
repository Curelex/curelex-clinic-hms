// hms-backend/routes/prescriptions.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import * as prescriptionController from '../controllers/prescriptionController.js';
import * as medicineController from '../controllers/medicineController.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

router.get('/stats', prescriptionController.getPrescriptionStats);

// Get prescriptions by clinic - must come BEFORE /:id and /doctor/:id
router.get('/clinic', prescriptionController.getClinicPrescriptions);

// Search medicines - must come BEFORE /:id
router.get('/medicines/search', medicineController.searchMedicines);

// ── Dynamic routes (with :id parameter) go AFTER specific routes ──

// Get prescriptions by patient
router.get('/patient/:id', prescriptionController.getPrescriptionsByPatient);

// Get prescriptions by patient (paginated)
router.get('/patient/:id/paginated', prescriptionController.getPatientPrescriptionsPaginated);

// Get prescriptions by doctor
router.get('/doctor/:id', prescriptionController.getPrescriptionsByDoctor);

// Get prescription for print
router.get('/:id/print', prescriptionController.getPrescriptionForPrint);

// Get single prescription - must come LAST
router.get('/:id', prescriptionController.getPrescriptionById);

// ── POST/PUT/DELETE routes ──

// Create prescription
router.post('/', roleCheck('doctor', 'admin'), prescriptionController.createPrescription);

// Update prescription
router.put('/:id', roleCheck('doctor', 'admin'), prescriptionController.updatePrescription);

// Update prescription status
router.patch('/:id/status', roleCheck('doctor', 'admin', 'pharmacist'), prescriptionController.updatePrescriptionStatus);

// Delete prescription
router.delete('/:id', roleCheck('doctor', 'admin'), prescriptionController.deletePrescription);

export default router;