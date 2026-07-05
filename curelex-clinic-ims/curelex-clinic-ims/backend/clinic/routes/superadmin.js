import express from 'express';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Contact from '../models/QueryContact.js';   // ← add this import
import auth from '../middleware/auth.js';

const router = express.Router();

function isSuperAdmin(req, res) {
  if (req.user.role !== 'superadmin') {
    res.status(403).json({ message: 'Super admin only.' });
    return false;
  }
  return true;
}

// ── GET /api/superadmin/clinics  — all clinics with stats ────────
router.get('/clinics', auth, async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const clinics = await Clinic.find().select('-password').lean();

    const enriched = await Promise.all(clinics.map(async (c) => {
      const doctors       = await User.find({ clinicId: c._id, role: 'doctor' }).select('-password');
      const receptionists = await User.find({ clinicId: c._id, role: 'receptionist' }).select('-password');
      const patients      = await Patient.find({ clinicId: c._id });
      return { ...c, doctors, receptionists, patients };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/superadmin/clinics/:id  — single clinic detail ──────
router.get('/clinics/:id', auth, async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const clinic = await Clinic.findById(req.params.id).select('-password').lean();
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    const doctors       = await User.find({ clinicId: clinic._id, role: 'doctor' }).select('-password');
    const receptionists = await User.find({ clinicId: clinic._id, role: 'receptionist' }).select('-password');
    const patients      = await Patient.find({ clinicId: clinic._id });

    res.json({ ...clinic, doctors, receptionists, patients });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/superadmin/clinics/:id ───────────────────────────
router.delete('/clinics/:id', auth, async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    await Clinic.findByIdAndDelete(req.params.id);
    await User.deleteMany({ clinicId: req.params.id });
    await Patient.deleteMany({ clinicId: req.params.id });
    res.json({ message: 'Clinic and all its data deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/superadmin/clinics/:id/plan ───────────────────────
router.patch('/clinics/:id/plan', auth, async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const { plan } = req.body;
    const now = new Date();
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 1);

    const clinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      {
        plan,
        planActivatedAt: now.toISOString().split('T')[0],
        planExpiresAt:   exp.toISOString().split('T')[0],
      },
      { new: true }
    ).select('-password');

    res.json(clinic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/superadmin/queries  — all contact form submissions ──
router.get('/queries', auth, async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const queries = await Contact.find().sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/superadmin/queries/:id  — update query status ────
router.patch('/queries/:id', auth, async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'read', 'resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const updated = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Query not found.' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;