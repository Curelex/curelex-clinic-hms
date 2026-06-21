// hms-backend/routes/clinics.js
import express from 'express';
const router = express.Router();
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';

// ── GET /api/clinics - Fetch / search registered clinics ──────────────────
// Query: ?search=xyz  → case-insensitive partial match on clinic name
// If no search param is given, returns all clinics (existing behaviour kept).
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    const filter = {};
    if (search && search.trim() !== '') {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const clinics = await Clinic.find(filter, '_id name email phone address')
      .sort({ name: 1 })
      .limit(20); // cap results so the dropdown stays fast

    res.json({ success: true, clinics });
  } catch (err) {
    console.error('Error fetching clinics:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/clinics/:clinicId/doctors - Doctors for a specific clinic ────
// Returns active doctors with name, department (specialization) and fee.
router.get('/:clinicId/doctors', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const doctors = await User.find(
      { clinicId, role: 'doctor', isActive: true },
      'name department consultationFee avatar'
    ).sort({ name: 1 });

    res.json({ success: true, doctors });
  } catch (err) {
    console.error('Error fetching clinic doctors:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;