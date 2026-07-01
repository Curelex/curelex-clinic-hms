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

    console.log('🔍 GET CLINICS QUERY:', { search, filter });
    const allClinics = await Clinic.find({});
    console.log('🔍 ALL CLINICS IN DB:', allClinics);

    const clinics = await Clinic.find(filter, '_id name email phone address')
      .sort({ name: 1 })
      .limit(20); // cap results so the dropdown stays fast

    console.log('🔍 SEARCH RESULTS:', clinics);
    res.json({ success: true, clinics });
  } catch (err) {
    console.error('Error fetching clinics:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// ── GET /api/clinics/search-all - Unified search across clinics + doctors ──
// Query: ?q=dermatology  → matches clinic name OR doctor name/department
// Returns a single mixed list, each item tagged with `type: 'clinic' | 'doctor'`
router.get('/search-all', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, results: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const [clinics, doctors] = await Promise.all([
      Clinic.find({ name: regex }, '_id name address').limit(8),
      User.find(
        { role: 'doctor', isActive: true, $or: [{ name: regex }, { department: regex }] },
        'name department consultationFee telemedicineFee avatar clinicId'
      )
        .populate('clinicId', 'name address')
        .limit(8),
    ]);

    const results = [
      ...clinics.map((c) => ({
        type: 'clinic',
        _id: c._id,
        name: c.name,
        address: c.address,
      })),
      ...doctors.map((d) => ({
        type: 'doctor',
        _id: d._id,
        name: d.name,
        department: d.department,
        consultationFee: d.consultationFee,
        telemedicineFee: d.telemedicineFee || 0,
        avatar: d.avatar,
        clinic: d.clinicId
          ? { _id: d.clinicId._id, name: d.clinicId.name, address: d.clinicId.address }
          : null,
      })),
    ];

    res.json({ success: true, results });
  } catch (err) {
    console.error('Error in unified search:', err);
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
      'name department consultationFee telemedicineFee avatar'
    ).sort({ name: 1 });

    res.json({ success: true, doctors });
  } catch (err) {
    console.error('Error fetching clinic doctors:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;