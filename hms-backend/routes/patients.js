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

/**
 * Safely converts any clinicId value to a mongoose ObjectId or null
 */
function toObjectId(id) {
  if (!id || id === 'default' || id === 'null' || id === 'undefined') return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(String(id));
  }
  return null;
}

/**
 * Resolves the effective clinicId for a request.
 * - Normal staff: always use their JWT clinicId.
 * - super_admin: JWT has no clinicId, so fall back in order:
 *     1. x-clinic-id request header
 *     2. req.body.clinicId
 *     3. req.query.clinicId
 */
function resolveClinicId(req) {
  if (req.user?.role === 'super_admin') {
    const id =
      req.headers['x-clinic-id'] ||
      req.body?.clinicId ||
      req.query?.clinicId ||
      null;
    return toObjectId(id);
  }
  return toObjectId(req.user?.clinicId);
}

const router = express.Router();

// ── Get all patients (Clinic Scoped) ──────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { search, status, page = 1, limit = 20 } = req.query;

    // ── If no clinicId, return empty array ──
    if (!clinicId) {
      return res.json({ patients: [], total: 0, page: 1, pages: 0 });
    }

    let query = { clinicId };
    
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
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
    console.error('Error fetching patients:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get single patient ──────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ message: 'No clinic selected' });
    }
    
    const patient = await Patient.findOne({ 
      _id: req.params.id, 
      clinicId 
    })
      .populate('assignedDoctor', 'name department')
      .populate('registeredBy', 'name');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get patient by patientId (custom ID) ──────────────────────────────────
router.get('/by-patient-id/:patientId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ message: 'No clinic selected' });
    }
    
    const patient = await Patient.findOne({ 
      patientId: req.params.patientId, 
      clinicId 
    })
      .populate('assignedDoctor', 'name department')
      .populate('registeredBy', 'name');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (err) {
    console.error('Error fetching patient by patientId:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Create patient ──────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ 
        message: 'No clinic selected. Please select a clinic before registering patients.' 
      });
    }
    
    const { 
      name, email, phone, dob, age, gender, bloodGroup,
      address, city, state, pincode,
      emergencyContact, emergencyName, emergencyRelation,
      allergies, chronicConditions, currentMedications, medicalHistory,
      assignedDoctor, notes,
      createLogin, password
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        message: 'Name, email and phone are required' 
      });
    }

    // Check if patient already exists in this clinic
    const existingPatient = await Patient.findOne({ 
      $or: [
        { email, clinicId },
        { phone, clinicId }
      ]
    });
    
    if (existingPatient) {
      return res.status(400).json({ 
        message: 'Patient with this email or phone already exists in this clinic' 
      });
    }

    let user = null;

    // ── If createLogin is true, create User account ──────────────────────
    if (createLogin && password) {
      const existingUser = await User.findOne({ email, clinicId });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'A user with this email already exists in this clinic' 
        });
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
    const patientData = {
      userId: user?._id || null,
      name,
      email,
      phone,
      clinicId: clinicId,
      status: 'Active',
      registrationDate: new Date(),
      registeredBy: req.user.id,
    };

    // Add optional fields if provided
    if (dob) patientData.dob = new Date(dob);
    if (age) patientData.age = Number(age);
    if (gender) patientData.gender = gender;
    if (bloodGroup) patientData.bloodGroup = bloodGroup;
    if (address) patientData.address = address;
    if (city) patientData.city = city;
    if (state) patientData.state = state;
    if (pincode) patientData.pincode = pincode;
    if (emergencyContact) patientData.emergencyContact = emergencyContact;
    if (emergencyName) patientData.emergencyName = emergencyName;
    if (emergencyRelation) patientData.emergencyRelation = emergencyRelation;
    if (allergies) patientData.allergies = allergies;
    if (chronicConditions) patientData.chronicConditions = chronicConditions;
    if (currentMedications) patientData.currentMedications = currentMedications;
    if (medicalHistory) patientData.medicalHistory = medicalHistory;
    if (notes) patientData.notes = notes;
    if (assignedDoctor) patientData.assignedDoctor = assignedDoctor;

    const patient = new Patient(patientData);
    await patient.save();
    
    await patient.populate('assignedDoctor', 'name department');
    await patient.populate('registeredBy', 'name');

    res.status(201).json({ 
      success: true, 
      message: createLogin && user ? 'Patient registered with login credentials' : 'Patient registered successfully',
      patient,
      user: user ? { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      } : null
    });
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Update patient ─────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ 
        message: 'No clinic selected.' 
      });
    }
    
    const body = { ...req.body };
    // Remove fields that shouldn't be updated directly
    delete body._id;
    delete body.clinicId;
    delete body.patientId;
    delete body.userId;
    delete body.createdAt;
    delete body.updatedAt;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      body,
      { new: true, runValidators: true }
    ).populate('assignedDoctor', 'name department')
     .populate('registeredBy', 'name');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Delete patient ─────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ 
        message: 'No clinic selected.' 
      });
    }
    
    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // If patient has a user account, delete it too
    if (patient.userId) {
      await User.findByIdAndDelete(patient.userId);
    }

    await Patient.findOneAndDelete({ _id: req.params.id, clinicId });
    res.json({ message: 'Patient and associated user account deleted' });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get patient by user ID ──────────────────────────────────────────────────
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ message: 'No clinic selected' });
    }
    
    const patient = await Patient.findOne({ 
      userId: req.params.userId, 
      clinicId 
    })
      .populate('assignedDoctor', 'name department')
      .populate('registeredBy', 'name');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (err) {
    console.error('Error fetching patient by user ID:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get patients by doctor ──────────────────────────────────────────────────
router.get('/doctor/:doctorId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.json({ patients: [], total: 0, page: 1, pages: 0 });
    }
    
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = { 
      assignedDoctor: req.params.doctorId, 
      clinicId 
    };
    
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
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
    console.error('Error fetching patients by doctor:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Get patient stats ──────────────────────────────────────────────────────
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.json({
        total: 0,
        active: 0,
        inactive: 0,
        discharged: 0,
        deceased: 0,
        byGender: {},
        recentRegistrations: 0,
        withAssignedDoctor: 0,
        registrationRate: 0
      });
    }

    const [total, active, inactive, discharged, deceased] = await Promise.all([
      Patient.countDocuments({ clinicId }),
      Patient.countDocuments({ clinicId, status: 'Active' }),
      Patient.countDocuments({ clinicId, status: 'Inactive' }),
      Patient.countDocuments({ clinicId, status: 'Discharged' }),
      Patient.countDocuments({ clinicId, status: 'Deceased' }),
    ]);

    const byGender = await Patient.aggregate([
      { $match: { clinicId } },
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    const genderMap = {};
    byGender.forEach(g => { genderMap[g._id] = g.count; });

    // Patients registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await Patient.countDocuments({
      clinicId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Patients with assigned doctors
    const withAssignedDoctor = await Patient.countDocuments({
      clinicId,
      assignedDoctor: { $ne: null }
    });

    res.json({
      total,
      active,
      inactive,
      discharged,
      deceased,
      byGender: genderMap,
      recentRegistrations,
      withAssignedDoctor,
      registrationRate: total > 0 ? (recentRegistrations / total) * 100 : 0
    });
  } catch (err) {
    console.error('Error fetching patient stats:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Debug endpoint (admin only) ────────────────────────────────────────────
router.get('/debug/all', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const query = clinicId ? { clinicId } : {};
    const all = await Patient.find(query).limit(10).lean();
    res.json({ 
      count: all.length,
      patients: all.map(p => ({ 
        name: p.name, 
        clinicId: String(p.clinicId),
        patientId: p.patientId
      })),
      userClinicId: String(req.user.clinicId),
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;