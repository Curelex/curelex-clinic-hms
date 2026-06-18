// backend/routes/patientPortal.js
const express = require('express');
const router = express.Router();
const { auth, clinic } = require('../middleware/auth');
const Patient = require('../models/Patient');

// Get patient dashboard stats
router.get('/:id/dashboard', auth, clinic, async (req, res) => {
  try {
    const patientId = req.params.id;
    const clinicId = req.clinicId;

    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({
      success: true,
      data: {
        totalAppointments: 0,
        upcomingAppointments: 0,
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

// Get patient profile
router.get('/:id/profile', auth, clinic, async (req, res) => {
  try {
    const patientId = req.params.id;
    const clinicId = req.clinicId;

    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;