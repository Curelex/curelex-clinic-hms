// hms-backend/routes/feedback.js
import express from 'express';
import { submitFeedback, getPatientFeedback } from '../controllers/feedbackController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, submitFeedback);
router.get('/patient/:patientId', auth, getPatientFeedback);

export default router;
