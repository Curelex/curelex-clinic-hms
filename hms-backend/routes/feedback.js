// hms-backend/routes/feedback.js
import express from 'express';
import { 
  submitFeedback, 
  getPatientFeedback, 
  getDoctorFeedback,
  getClinicFeedback,        // ← NEW
  getAllClinicRatings       // ← NEW
} from '../controllers/feedbackController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, submitFeedback);
router.get('/patient/:patientId', auth, getPatientFeedback);
router.get('/doctor/:doctorId', auth, getDoctorFeedback);

// ── NEW: Clinic feedback routes ──
router.get('/clinic/:clinicId', auth, getClinicFeedback);
router.get('/clinic/ratings/all', auth, getAllClinicRatings);

export default router;