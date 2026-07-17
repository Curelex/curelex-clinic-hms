import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import {
  createSurgery,
  getSurgeries,
  updateSurgery,
  updatePreOpChecklist,
  updatePostOpRecovery,
  uploadConsentForm
} from '../controllers/surgeryController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/surgeries');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/surgeries/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter 
});

const router = express.Router();

// Get all surgeries (with filters)
router.get('/', auth, getSurgeries);

// Create new surgery
// Need to be admin, doctor
router.post('/', auth, roleCheck('super_admin', 'admin', 'doctor'), createSurgery);

// Update surgery details (time, doctors, status)
router.put('/:id', auth, roleCheck('super_admin', 'admin', 'doctor'), updateSurgery);

// Update pre-op checklist
// Nurses can also update this
router.put('/:id/preop', auth, roleCheck('super_admin', 'admin', 'doctor', 'nurse'), updatePreOpChecklist);

// Update post-op recovery
router.put('/:id/postop', auth, roleCheck('super_admin', 'admin', 'doctor', 'nurse'), updatePostOpRecovery);

// Upload consent form
router.post('/:id/consent', auth, roleCheck('super_admin', 'admin', 'doctor', 'nurse'), upload.single('consentForm'), uploadConsentForm);

export default router;
