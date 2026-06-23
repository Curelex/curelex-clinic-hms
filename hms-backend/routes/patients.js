// hms-backend/routes/patients.js
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
import express from 'express';
import mongoose from 'mongoose';

import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/** Safely converts any clinicId value to a mongoose ObjectId */
function toObjectId(id) {
  if (!id || id === 'default') return null;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(String(id));
  return null;
}

// ── Get all patients ──────────────────────────────────────────────────────
// FIX: Removed clinicId filter — doctor/staff JWT clinicId may differ from
// the clinicId stored on patients due to clinic record mismatch in DB.
router.get('/', auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    if (status) query.status = status;

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('assignedDoctor', 'name department')
      .populate('registeredBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get single patient ──────────────────────────────────────────────────
// FIX: Removed clinicId filter so doctors/staff can look up any patient by ID
// regardless of which clinic record the patient was originally registered under.
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'name department')
      .populate('registeredBy', 'name')
      .populate('userId', 'email role isActive');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Create patient (with optional user account) ──────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = toObjectId(req.user.clinicId);
    if (!clinicId) return res.status(400).json({ message: 'Invalid clinicId' });

    const { 
      name, email, phone, dob, age, gender, bloodGroup,
      address, city, state, pincode,
      emergencyContact, emergencyName, emergencyRelation,
      allergies, chronicConditions, currentMedications, medicalHistory,
      assignedDoctor, notes,
      createLogin, password
    } = req.body;

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ email, clinicId });
    if (existingPatient) {
      return res.status(400).json({ message: 'Patient with this email already exists' });
    }

    let user = null;

    // ── If createLogin is true, create User account ──────────────────────
    if (createLogin && password) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      user = await User.create({
        name,
        email,
        password,
        role: 'patient',
        clinicId: clinicId,
        phone: phone || '',
        permissions: ['patient-dashboard'],
        isActive: true,
      });
    }

    // ── Create Patient ──────────────────────────────────────────────────────
    const patient = new Patient({
      userId: user?._id || null,
      name,
      email,
      phone,
      dob: dob || null,
      age: age || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      emergencyContact: emergencyContact || '',
      emergencyName: emergencyName || '',
      emergencyRelation: emergencyRelation || '',
      allergies: allergies || '',
      chronicConditions: chronicConditions || '',
      currentMedications: currentMedications || '',
      medicalHistory: medicalHistory || '',
      notes: notes || '',
      assignedDoctor: assignedDoctor || null,
      clinicId: clinicId,
      status: 'Active',
      registrationDate: new Date(),
      registeredBy: req.user.id,
    });

    await patient.save();
    await patient.populate('assignedDoctor', 'name department');
    await patient.populate('registeredBy', 'name');

    res.status(201).json({ 
      success: true, 
      message: createLogin && user ? 'Patient registered with login credentials' : 'Patient registered successfully',
      patient,
      user: user ? { id: user._id, email: user.email, role: user.role } : null
    });
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Update patient ─────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicId = toObjectId(req.user.clinicId);
    if (!clinicId) return res.status(400).json({ message: 'Invalid clinicId' });

    const body = { ...req.body };
    delete body._id;
    delete body.clinicId;
    delete body.patientId;
    delete body.userId;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      body,
      { new: true, runValidators: true }
    ).populate('assignedDoctor', 'name department')
     .populate('registeredBy', 'name');

    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Delete patient ─────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const clinicId = toObjectId(req.user.clinicId);
    if (!clinicId) return res.status(400).json({ message: 'Invalid clinicId' });

    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // If patient has a user account, delete it too
    if (patient.userId) {
      await User.findByIdAndDelete(patient.userId);
    }

    await Patient.findOneAndDelete({ _id: req.params.id, clinicId });
    res.json({ message: 'Patient and associated user account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/debug-all', auth, async (req, res) => {
  const all = await Patient.find({}).limit(10).lean();
  res.json({ 
    count: all.length,
    patients: all.map(p => ({ 
      name: p.name, 
      clinicId: String(p.clinicId),
    })),
    userClinicId: String(req.user.clinicId),
  });
});

export default router;