// hms-backend/routes/patientPortal.js
const express = require('express');
const router = express.Router();
const { patientAuth } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Token = require('../models/Token');

// ── Helpers ──────────────────────────────────────────────────────────────
function todayStr() {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

// ── GET /:id/dashboard ───────────────────────────────────────────────────
router.get('/:id/dashboard', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const clinicId = req.body.clinicId || patient.clinicId;
    const patientId = patient._id;

    const totalAppointments = await Token.countDocuments({ clinicId, patient: patientId });
    const upcomingAppointments = await Token.countDocuments({
      clinicId,
      patient: patientId,
      status: { $in: ['Waiting', 'Pending', 'Called'] },
    });

    res.json({
      success: true,
      data: {
        totalAppointments,
        upcomingAppointments,
        prescriptionsCount: 0,
        doctorsConsulted: 0,
        patientName: patient.name,
        patientEmail: patient.email,
        patientMobile: patient.mobile || patient.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/profile ─────────────────────────────────────────────────────
router.get('/:id/profile', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/appointments ────────────────────────────────────────────────
router.get('/:id/appointments', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const tokens = await Token.find({ clinicId: patient.clinicId, patient: patient._id })
      .populate('doctor', 'name department')
      .sort({ createdAt: -1 });

    res.json({ success: true, appointments: tokens });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /:id/appointments ───────────────────────────────────────────────
router.post('/:id/appointments', patientAuth, async (req, res) => {
  try {
    const { name, age, gender, symptoms } = req.body;

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (!name || !age || !gender || !symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Name, age, gender and symptoms are required',
      });
    }

    const clinicId = patient.clinicId;
    const date = todayStr();

    const last = await Token.findOne({ clinicId, date, source: 'patient' })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
    const tokenNumber = last ? last.tokenNumber + 1 : 1;

    const token = await Token.create({
      clinicId,
      tokenNumber,
      date,
      patient: patient._id,
      patientName: name,
      age: Number(age),
      gender,
      symptoms,
      source: 'patient',
      status: 'Pending',
    });

    res.status(201).json({ success: true, appointment: token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/prescriptions ───────────────────────────────────────────────
router.get('/:id/prescriptions', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Return empty array until Prescription model is implemented
    res.json({ success: true, prescriptions: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;