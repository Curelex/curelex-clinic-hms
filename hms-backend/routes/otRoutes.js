import express from 'express';
import { auth, patientAuth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

import { getOTRooms, createOTRoom, updateOTRoom } from '../controllers/otRoomController.js';
import { getSurgeryRequests, createSurgeryRequest, updateSurgeryRequestStatus } from '../controllers/surgeryRequestController.js';
import { getBookings, createBooking, updateBookingStatus, getAssignments, updateAssignments } from '../controllers/otBookingController.js';
import { getPreOp, updatePreOp, getConsents, uploadConsent, getSafetyChecklist, updateSafetyChecklist } from '../controllers/otPreOpController.js';
import { getPostOp, addVital, updateStatus as updatePostOpStatus } from '../controllers/otPostOpController.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import otBillingService from '../services/otBillingService.js';
import OTBooking from '../models/ot/OTBooking.js';
import SurgeryRequest from '../models/ot/SurgeryRequest.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/ot_consents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/ot_consents/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

// ── OT Rooms ──
router.get('/rooms', auth, getOTRooms);
router.post('/rooms', auth, roleCheck('super_admin', 'admin'), createOTRoom);
router.put('/rooms/:id', auth, roleCheck('super_admin', 'admin'), updateOTRoom);

// ── Surgery Requests ──
router.get('/requests', auth, getSurgeryRequests);
router.post('/requests', auth, roleCheck('super_admin', 'admin', 'doctor'), createSurgeryRequest);
router.put('/requests/:id/status', auth, roleCheck('super_admin', 'admin', 'doctor'), updateSurgeryRequestStatus);

// ── OT Bookings ──
router.get('/bookings', auth, getBookings);
router.post('/bookings', auth, roleCheck('super_admin', 'admin', 'doctor'), createBooking);
router.put('/bookings/:id/status', auth, roleCheck('super_admin', 'admin', 'doctor', 'nurse'), updateBookingStatus);
router.get('/bookings/:id/assignments', auth, getAssignments);
router.put('/bookings/:id/assignments', auth, roleCheck('super_admin', 'admin', 'doctor', 'nurse'), updateAssignments);

// ── Phase 4: Pre-Op, Consent, Safety ──
router.get('/bookings/:id/preop', auth, getPreOp);
router.put('/bookings/:id/preop', auth, roleCheck('super_admin', 'admin', 'doctor', 'nurse'), updatePreOp);

router.get('/bookings/:id/consent', auth, getConsents);
router.post(
  '/bookings/:id/consent', 
  auth, 
  roleCheck('super_admin', 'admin', 'doctor', 'nurse'),
  upload.fields([{ name: 'patientSignature', maxCount: 1 }, { name: 'relativeSignature', maxCount: 1 }]), 
  uploadConsent
);

router.get('/bookings/:id/safety', auth, getSafetyChecklist);
router.put('/bookings/:id/safety/:stage', auth, roleCheck('super_admin', 'admin', 'doctor', 'receptionist'), updateSafetyChecklist);

// ── Phase 5: Post-Op Recovery ──
router.get('/bookings/:id/postop', auth, getPostOp);
router.put('/bookings/:id/postop/vitals', auth, roleCheck('super_admin', 'admin', 'doctor', 'receptionist'), addVital);
router.put('/bookings/:id/postop/status', auth, roleCheck('super_admin', 'admin', 'doctor', 'receptionist'), updatePostOpStatus);

// ── GET /bookings/:id/billing ──
router.get('/bookings/:id/billing', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicId } = req.user;

    const booking = await OTBooking.findOne({ _id: id, clinicId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Calculate charges
    const charges = await otBillingService.calculateOTCharges(id);

    // Find bill if exists
    const request = await SurgeryRequest.findById(booking.requestId);
    const bill = await Billing.findOne({ 
      patient: request?.patientId,
      'items.sourceRef': id,
      'items.category': 'OT'
    });

    res.json({
      ...charges,
      billId: bill?.billId || null,
      paymentStatus: bill?.paymentStatus || null,
      billDate: bill?.createdAt || null,
    });
  } catch (err) {
    console.error('Get OT billing error:', err);
    res.status(500).json({ message: 'Error fetching billing info' });
  }
});




export default router;
