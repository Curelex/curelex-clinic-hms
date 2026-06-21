// hms-backend/routes/tokens.js
// Add to server.js:  app.use('/api/tokens', require('./routes/tokens'));

import express from 'express';
import mongoose from 'mongoose';
const router  = express.Router();
import {auth}    from '../middleware/auth.js';
import Token   from '../models/Token.js';
import User    from '../models/User.js';
import Patient from '../models/Patient.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in local time (IST-safe). */
function todayStr() {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

/**
 * Resolves clinicId from (in priority order):
 *  1. req.body.clinicId   — POST/PUT requests pass it in the body
 *  2. req.query.clinicId  — GET/DELETE requests pass it as a query param
 *  3. req.user.clinicId   — set by the auth middleware from the JWT
 *  4. 'default'           — safe fallback
 */
function resolveClinicId(req) {
  return (
    req.body?.clinicId  ||
    req.query?.clinicId ||
    req.user?.clinicId  ||
    'default'
  );
}

/**
 * Creates a real Patient document from token-booking data.
 */
async function createPatientFromToken({ clinicId, doctorId, name, phone, email, age, gender, registeredBy }) {
  if (!mongoose.Types.ObjectId.isValid(clinicId)) {
    const err = new Error(
      'A valid clinicId (Clinic ObjectId) is required to register a patient record for this token'
    );
    err.status = 400;
    throw err;
  }

  const patient = await Patient.create({
    name:           name || 'Walk-in',
    phone,
    email,
    age:            age ?? null,
    gender:         gender || null,
    clinicId,
    assignedDoctor: doctorId || null,
    registeredBy:   registeredBy || null,
    status:         'Active',
  });

  return patient;
}

// ── POST /api/tokens/generate ────────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const {
      doctorId,
      patientId,
      patientName,
      phone,
      email,
      age,
      gender,
      symptoms,
      consultationType,
      paymentMethod,
    } = req.body;

    if (!doctorId) return res.status(400).json({ message: 'doctorId is required' });

    const date = todayStr();

    const doctor = await User.findById(doctorId).select('consultationFee name department');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    let patientDoc = null;

    if (patientId) {
      patientDoc = await Patient.findById(patientId);
      if (!patientDoc) return res.status(404).json({ message: 'Patient not found' });
    } else {
      if (!phone || !email) {
        return res.status(400).json({
          message: 'phone and email are required to register a new patient for this token',
        });
      }
      try {
        patientDoc = await createPatientFromToken({
          clinicId,
          doctorId,
          name:  patientName || 'Walk-in',
          phone,
          email,
          age,
          gender,
          registeredBy: req.user.id,
        });
      } catch (err) {
        return res.status(err.status || 500).json({ message: err.message });
      }
    }

    const last = await Token.findOne({ clinicId, doctor: doctorId, date })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');

    const tokenNumber = last ? last.tokenNumber + 1 : 1;

    const isPatientBooking = req.user?.role === 'patient';

    const token = await Token.create({
      clinicId,
      tokenNumber,
      date,
      doctor:      doctorId,
      patient:     patientDoc._id,
      patientName: patientDoc.name,
      phone:       patientDoc.phone,
      email:       patientDoc.email,
      generatedBy: req.user.id,

      source: isPatientBooking ? 'patient' : 'staff',
      status: isPatientBooking ? 'Pending' : 'Waiting',

      age:    age    || undefined,
      gender: gender  || undefined,
      symptoms: symptoms || undefined,

      consultationType: consultationType || 'in-person',
      consultationFee:  doctor.consultationFee || 0,

      paymentMethod: paymentMethod || null,
      paymentStatus: 'pending',
    });

    await token.populate([
      { path: 'doctor',      select: 'name department consultationFee' },
      { path: 'generatedBy', select: 'name role' },
      { path: 'patient',     select: 'name patientId' },
    ]);

    res.status(201).json(token);
  } catch (err) {
    console.error('Token generate error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/today ────────────────────────────────────────────────────
router.get('/today', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { doctorId } = req.query;
    const date  = todayStr();
    const query = { clinicId, date };
    if (doctorId) query.doctor = doctorId;

    const tokens = await Token.find(query)
      .populate('doctor',      'name department')
      .populate('patient',     'name patientId')
      .populate('generatedBy', 'name role')
      .sort({ tokenNumber: 1 });

    res.json({ date, tokens });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/summary ──────────────────────────────────────────────────
router.get('/summary', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const date     = todayStr();

    const summary = await Token.aggregate([
      { $match: { clinicId, date } },
      {
        $group: {
          _id:       '$doctor',
          total:     { $sum: 1 },
          waiting:   { $sum: { $cond: [{ $eq: ['$status', 'Waiting'] }, 1, 0] } },
          called:    { $sum: { $cond: [{ $eq: ['$status', 'Called']  }, 1, 0] } },
          done:      { $sum: { $cond: [{ $eq: ['$status', 'Done']    }, 1, 0] } },
          lastToken: { $max: '$tokenNumber' },
        },
      },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'doctor',
        },
      },
      { $unwind: '$doctor' },
      {
        $project: {
          _id:        0,
          doctorId:   '$_id',
          doctorName: '$doctor.name',
          department: '$doctor.department',
          total:    1,
          waiting:  1,
          called:   1,
          done:     1,
          lastToken: 1,
        },
      },
      { $sort: { doctorName: 1 } },
    ]);

    res.json({ date, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/tokens/:id/status ────────────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { status } = req.body;
    const valid = ['Waiting', 'Called', 'Done', 'Skipped', 'Pending'];
    if (!valid.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const update = { status };
    if (status === 'Called') update.calledAt = new Date();

    const token = await Token.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      update,
      { new: true }
    )
      .populate('doctor',      'name department')
      .populate('patient',     'name patientId')
      .populate('generatedBy', 'name role');

    if (!token) return res.status(404).json({ message: 'Token not found' });

    const needsPatientLink = status === 'Done' && !token.patient;

    res.json({ ...token.toObject(), needsPatientLink });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/tokens/:id/link-patient ──────────────────────────────────────
router.patch('/:id/link-patient', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { phone, email, name, age, gender } = req.body;

    if (!phone || !email) {
      return res.status(400).json({ message: 'phone and email are required' });
    }

    const token = await Token.findOne({ _id: req.params.id, clinicId });
    if (!token) return res.status(404).json({ message: 'Token not found' });

    if (token.patient) {
      return res.status(400).json({ message: 'This token is already linked to a patient' });
    }

    let patient;
    try {
      patient = await createPatientFromToken({
        clinicId,
        doctorId: token.doctor,
        name:     name || token.patientName || 'Walk-in',
        phone,
        email,
        age:      age ?? token.age,
        gender:   gender ?? token.gender,
        registeredBy: req.user.id,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ message: err.message });
    }

    token.patient     = patient._id;
    token.patientName = patient.name;
    token.phone        = phone;
    token.email        = email;
    await token.save();

    await token.populate([
      { path: 'doctor',  select: 'name department' },
      { path: 'patient', select: 'name patientId' },
    ]);

    res.json(token);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/mine ─────────────────────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can view their own tokens' });
    }

    const tokens = await Token.find({ generatedBy: req.user.id, source: 'patient' })
      .populate('doctor', 'name department consultationFee')
      .sort({ createdAt: -1 });

    res.json({ success: true, tokens });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ✅ NEW: POST /api/tokens/statuses ──────────────────────────────────────
router.post('/statuses', auth, async (req, res) => {
  try {
    const { patientIds } = req.body;
    const clinicId = resolveClinicId(req);
    
    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return res.json({ success: true, tokens: [] });
    }
    
    const validIds = patientIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      return res.json({ success: true, tokens: [] });
    }
    
    const tokens = await Token.aggregate([
      {
        $match: {
          clinicId: clinicId,
          patient: { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$patient',
          token: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$token' }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'doctor',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $unwind: {
          path: '$doctor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          patient: 1,
          patientName: 1,
          tokenNumber: 1,
          status: 1,
          consultationType: 1,
          consultationFee: 1,
          createdAt: 1,
          updatedAt: 1,
          'doctor._id': 1,
          'doctor.name': 1,
          'doctor.department': 1,
          'doctor.consultationFee': 1
        }
      }
    ]);
    
    res.json({ success: true, tokens });
  } catch (err) {
    console.error('Error fetching token statuses:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ✅ NEW: GET /api/tokens/patient/:patientId/latest ──────────────────────
router.get('/patient/:patientId/latest', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const clinicId = resolveClinicId(req);
    
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }
    
    const token = await Token.findOne({ 
      clinicId, 
      patient: patientId 
    })
      .sort({ createdAt: -1 })
      .populate('doctor', 'name department consultationFee')
      .populate('patient', 'name patientId');
    
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ✅ NEW: GET /api/tokens/patient/:patientId/all ──────────────────────────
router.get('/patient/:patientId/all', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const clinicId = resolveClinicId(req);
    
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }
    
    const tokens = await Token.find({ 
      clinicId, 
      patient: patientId 
    })
      .sort({ createdAt: -1 })
      .populate('doctor', 'name department consultationFee')
      .populate('patient', 'name patientId');
    
    res.json({ success: true, tokens });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ✅ NEW: GET /api/tokens/stats ──────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const date = todayStr();
    
    const [totalToday, pending, waiting, called, done, skipped] = await Promise.all([
      Token.countDocuments({ clinicId, date }),
      Token.countDocuments({ clinicId, date, status: 'Pending' }),
      Token.countDocuments({ clinicId, date, status: 'Waiting' }),
      Token.countDocuments({ clinicId, date, status: 'Called' }),
      Token.countDocuments({ clinicId, date, status: 'Done' }),
      Token.countDocuments({ clinicId, date, status: 'Skipped' }),
    ]);
    
    res.json({
      success: true,
      stats: {
        totalToday,
        pending,
        waiting,
        called,
        done,
        skipped,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;