// hms-backend/routes/clinics.js
import express from 'express';
const router = express.Router();
import Clinic from '../models/Clinic.js';

// ── GET /api/clinics - Fetch all registered clinics ───────────────────────
router.get('/', async (req, res) => {
  try {
    const clinics = await Clinic.find({}, '_id name email phone').sort({ name: 1 });
    res.json({ success: true, clinics });
  } catch (err) {
    console.error('Error fetching clinics:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;