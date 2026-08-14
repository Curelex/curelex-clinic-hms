// hms-backend/routes/clinics.js
import express from 'express';
const router = express.Router();
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import { getClinicFilter } from '../middleware/clinicFilter.js';

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

    const clinics = await Clinic.find(filter, '_id name email phone address type')
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
        { role: { $in: ['doctor', 'separate_doctor'] }, isActive: true, $or: [{ name: regex }, { department: regex }] },
        'name department consultationFee telemedicineFee avatar clinicId'
      )
        .populate('clinicId', 'name address')
        .limit(8),
    ]);

    const clinicIds = clinics.map(c => c._id);
    const doctorIds = doctors.map(d => d._id);

    const [clinicFeedbacks, doctorFeedbacks] = await Promise.all([
      Feedback.find({ clinicId: { $in: clinicIds } }),
      Feedback.find({ doctorId: { $in: doctorIds } })
    ]);

    const getAvg = (feedbacks, key, idField, id) => {
      const related = feedbacks.filter(f => String(f[idField]) === String(id));
      if (!related.length) return { rating: 0, reviews: 0 };
      const sum = related.reduce((acc, curr) => acc + curr[key], 0);
      return { rating: Number((sum / related.length).toFixed(1)), reviews: related.length };
    };

    const results = [
      ...clinics.map((c) => {
        const stats = getAvg(clinicFeedbacks, 'clinicRating', 'clinicId', c._id);
        return {
          type: 'clinic',
          _id: c._id,
          name: c.name,
          address: c.address,
          rating: stats.rating,
          reviews: stats.reviews,
        };
      }),
      ...doctors.map((d) => {
        const stats = getAvg(doctorFeedbacks, 'doctorRating', 'doctorId', d._id);
        return {
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
          rating: stats.rating,
          reviews: stats.reviews,
        };
      }),
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
      { clinicId, role: { $in: ['doctor', 'separate_doctor'] }, isActive: true },
      'name department consultationFee telemedicineFee avatar'
    ).sort({ name: 1 });

    const doctorIds = doctors.map(d => d._id);
    const doctorFeedbacks = await Feedback.find({ doctorId: { $in: doctorIds } });

    const getAvg = (feedbacks, id) => {
      const related = feedbacks.filter(f => String(f.doctorId) === String(id));
      if (!related.length) return { rating: 0, reviews: 0 };
      const sum = related.reduce((acc, curr) => acc + curr.doctorRating, 0);
      return { rating: Number((sum / related.length).toFixed(1)), reviews: related.length };
    };

    const doctorsWithRatings = doctors.map(d => {
      const stats = getAvg(doctorFeedbacks, d._id);
      return {
        ...d.toObject(),
        rating: stats.rating,
        reviews: stats.reviews
      };
    });

    res.json({ success: true, doctors: doctorsWithRatings });
  } catch (err) {
    console.error('Error fetching clinic doctors:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// In your backend - ensure the clinic data includes plan information

// hms-backend/routes/clinics.js or auth.js

router.get('/me', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.status(400).json({ message: 'No clinic assigned to this account' });
    }
    const clinic = await Clinic.findById(req.user.clinicId);
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }
    
    // Return clinic with plan information
    res.json({
      ...clinic.toObject(),
      plan: clinic.plan || null,
      planActivatedAt: clinic.planActivatedAt || null,
      planExpiresAt: clinic.planExpiresAt || null,
    });
  } catch (err) {
    console.error('Error fetching clinic:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT /api/clinics/me — update own clinic (admin only) ───────────────────
router.put('/me', auth, roleCheck('admin'), async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.status(400).json({ message: 'No clinic assigned to this account' });
    }
    const ALLOWED = ['name', 'owner', 'phone', 'address', 'pincode', 'state', 'district', 'subDistrict', 'city', 'email'];
    const fields = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    if (fields.address !== undefined && !fields.address.trim()) {
      return res.status(400).json({ message: 'Address is required' });
    }
    const clinic = await Clinic.findByIdAndUpdate(req.user.clinicId, fields, { new: true });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
    res.json(clinic);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});



router.post('/activate-plan', auth, async (req, res) => {
  try {
    // Check if user is admin or super_admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Admin only.' });
    }

    const { plan } = req.body;

    // Validate plan
    if (!['lite', 'plus', 'pro'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan.' });
    }

    // Check if user has a clinic
    if (!req.user.clinicId) {
      return res.status(400).json({ message: 'No clinic associated with this account.' });
    }

    const now = new Date();
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 1);

    // Update clinic with plan
    const clinic = await Clinic.findByIdAndUpdate(
      req.user.clinicId,
      {
        plan: plan,
        planActivatedAt: now.toISOString().split('T')[0],
        planExpiresAt: exp.toISOString().split('T')[0],
      },
      { new: true }
    );

    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    // Return the updated clinic with plan info
    res.json({
      ...clinic.toObject(),
      plan: clinic.plan,
      planActivatedAt: clinic.planActivatedAt,
      planExpiresAt: clinic.planExpiresAt,
    });
  } catch (err) {
    console.error('Activate plan error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/clinics/timings ──
router.get('/timings', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId;
    if (!clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No clinic associated with this account' 
      });
    }

    const clinic = await Clinic.findById(clinicId).select('openingHours name type');
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }

    res.json({
      success: true,
      openingHours: clinic.openingHours,
      clinicName: clinic.name,
      clinicType: clinic.type,
    });
  } catch (err) {
    console.error('Get clinic timings error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to get clinic timings' 
    });
  }
});

// ── PUT /api/clinics/timings ──
router.put('/timings', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId;
    if (!clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No clinic associated with this account' 
      });
    }

    const { openingHours } = req.body;

    if (!openingHours) {
      return res.status(400).json({ 
        success: false, 
        message: 'Opening hours are required' 
      });
    }

    // Validate that all days are present
    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hasAllDays = requiredDays.every(day => openingHours[day]);
    
    if (!hasAllDays) {
      return res.status(400).json({ 
        success: false, 
        message: 'All 7 days must have opening hours defined' 
      });
    }

    const clinic = await Clinic.findByIdAndUpdate(
      clinicId,
      { openingHours },
      { new: true, runValidators: true }
    );

    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }

    res.json({
      success: true,
      message: 'Clinic timings updated successfully',
      clinic: {
        id: clinic._id,
        name: clinic.name,
        openingHours: clinic.openingHours,
      }
    });
  } catch (err) {
    console.error('Update clinic timings error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to update clinic timings' 
    });
  }
});



// ── GET /api/clinics/check-open ──
router.get('/check-open', auth, async (req, res) => {
  try {
    // Get clinicId from query param (for patients) or from user (for staff)
    const clinicId = req.query.clinicId || req.user?.clinicId;
    
    if (!clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Clinic ID is required' 
      });
    }

    const clinic = await Clinic.findById(clinicId).select('openingHours name');
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }

    const now = new Date();
    const isOpen = clinic.isOpenAt(now);
    const todayHours = clinic.getTodayHours();

    res.json({
      success: true,
      isOpen,
      todayHours,
      clinicName: clinic.name,
      currentTime: now.toISOString(),
    });
  } catch (err) {
    console.error('Check open error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to check clinic status' 
    });
  }
});

export default router;
