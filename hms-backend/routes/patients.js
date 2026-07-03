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
 * clinicId is OPTIONAL everywhere now — a patient can belong to
 * multiple clinics (clinicIds is an array on the Patient model), and
 * a request that doesn't specify a clinic should operate globally
 * rather than being blocked or silently scoped to nothing.
 *
 * - Normal staff: use their JWT clinicId if present (may be null).
 * - super_admin: JWT has no clinicId, so fall back in order:
 *     1. x-clinic-id request header
 *     2. req.body.clinicId
 *     3. req.query.clinicId
 * - If nothing resolves, returns null, meaning "no clinic filter".
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

/**
 * Builds the clinic portion of a Mongo query.
 * Because clinicIds is an array field, `{ clinicIds: clinicId }` already
 * matches "array contains this id" — no $in / $elemMatch needed.
 * When clinicId is null, returns {} (no filter → search all clinics).
 */
function clinicFilter(clinicId) {
  return clinicId ? { clinicIds: clinicId } : {};
}

const router = express.Router();

// ── Get all patients (clinic-scoped if a clinic is resolved, else global) ──
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = { ...clinicFilter(clinicId) };

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

    const patient = await Patient.findOne({
      _id: req.params.id,
      ...clinicFilter(clinicId),
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

    const patient = await Patient.findOne({
      patientId: String(req.params.patientId).trim(),
      ...clinicFilter(clinicId),
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
    // clinicId is optional here now. If resolved, the patient is
    // attached to that clinic. If not, the patient is created as a
    // "global" patient with no clinic yet — clinics can be added to
    // clinicIds later (e.g. via a dedicated "attach to clinic" action).
    const clinicId = resolveClinicId(req);

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

    // Check if patient already exists.
    // If a clinic is resolved, scope the duplicate-check to that clinic
    // (the same person can be a distinct registration in another clinic).
    // If no clinic is resolved, check globally by email/phone.
    const existingPatient = await Patient.findOne({
      $or: [{ email }, { phone }],
      ...clinicFilter(clinicId),
    });

    if (existingPatient) {
      return res.status(400).json({
        message: clinicId
          ? 'Patient with this email or phone already exists in this clinic'
          : 'Patient with this email or phone already exists'
      });
    }

    let user = null;

    // ── If createLogin is true, create User account ──────────────────────
    if (createLogin && password) {
      const existingUserQuery = clinicId ? { email, clinicId } : { email };
      const existingUser = await User.findOne(existingUserQuery);
      if (existingUser) {
        return res.status(400).json({
          message: clinicId
            ? 'A user with this email already exists in this clinic'
            : 'A user with this email already exists'
        });
      }

      user = await User.create({
        name,
        email,
        password,
        role: 'patient',
        clinicId: clinicId || undefined,
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
      // clinicIds stays empty if no clinic was resolved — patient can be
      // attached to one or more clinics later.
      clinicIds: clinicId ? [clinicId] : [],
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

// ── Attach an existing patient to another clinic ───────────────────────────
// Lets a patient belong to more than one clinic without duplicating the
// record. Requires a clinic to be resolved (you have to attach to *some*
// clinic), but the patient lookup itself is global (not clinic-scoped),
// since the patient may not yet belong to the resolved clinic.
router.post('/:id/attach-clinic', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ message: 'No clinic selected to attach' });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const alreadyAttached = patient.clinicIds.some(
      (id) => String(id) === String(clinicId)
    );
    if (!alreadyAttached) {
      patient.clinicIds.push(clinicId);
      await patient.save();
    }

    await patient.populate('assignedDoctor', 'name department');
    await patient.populate('registeredBy', 'name');

    res.json({ success: true, patient });
  } catch (err) {
    console.error('Attach clinic error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Update patient ─────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);

    const body = { ...req.body };
    // Remove fields that shouldn't be updated directly
    delete body._id;
    delete body.clinicId;
    delete body.clinicIds;
    delete body.patientId;
    delete body.userId;
    delete body.createdAt;
    delete body.updatedAt;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, ...clinicFilter(clinicId) },
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

    const patient = await Patient.findOne({ _id: req.params.id, ...clinicFilter(clinicId) });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // If patient has a user account, delete it too
    if (patient.userId) {
      await User.findByIdAndDelete(patient.userId);
    }

    await Patient.findOneAndDelete({ _id: req.params.id, ...clinicFilter(clinicId) });
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

    const patient = await Patient.findOne({
      userId: req.params.userId,
      ...clinicFilter(clinicId),
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
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = {
      assignedDoctor: req.params.doctorId,
      ...clinicFilter(clinicId),
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
    const filter = clinicFilter(clinicId);

    const [total, active, inactive, discharged, deceased] = await Promise.all([
      Patient.countDocuments({ ...filter }),
      Patient.countDocuments({ ...filter, status: 'Active' }),
      Patient.countDocuments({ ...filter, status: 'Inactive' }),
      Patient.countDocuments({ ...filter, status: 'Discharged' }),
      Patient.countDocuments({ ...filter, status: 'Deceased' }),
    ]);

    const byGender = await Patient.aggregate([
      ...(clinicId ? [{ $match: { clinicIds: clinicId } }] : []),
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    const genderMap = {};
    byGender.forEach(g => { genderMap[g._id] = g.count; });

    // Patients registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await Patient.countDocuments({
      ...filter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Patients with assigned doctors
    const withAssignedDoctor = await Patient.countDocuments({
      ...filter,
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
    const query = clinicFilter(clinicId);
    const all = await Patient.find(query).limit(10).lean();
    res.json({
      count: all.length,
      patients: all.map(p => ({
        name: p.name,
        clinicIds: (p.clinicIds || []).map(String),
        patientId: p.patientId
      })),
      userClinicId: req.user.clinicId ? String(req.user.clinicId) : null,
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;