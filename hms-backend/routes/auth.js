import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import SsoToken from '../ims/src/models/SsoToken.js';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import Patient from '../models/Patient.js';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import { getClinicFilter } from '../middleware/clinicFilter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// // ── SSO Token Schema ──────────────────────────────────────────────────────
// const ssoTokenSchema = new mongoose.Schema({
//   token:     { type: String, required: true },
//   email:     { type: String, required: true },
//   userId:    { type: String, required: true },
//   role:      { type: String, default: 'staff' },
//   clinicId:  { type: String, required: true },
//   expiresAt: { type: Date,   required: true },
// }, { timestamps: false });

// const SsoToken = mongoose.models.SsoToken || mongoose.model('SsoToken', ssoTokenSchema);

router.post('/register-super-admin', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // ── Security: Require a matching secret key ──
    if (!secretKey || secretKey !== process.env.SUPER_ADMIN_SECRET_KEY) {
      return res.status(403).json({ message: 'Unauthorized. Invalid secret key.' });
    }

    // ── Block if a super_admin already exists ──
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return res.status(400).json({ message: 'A super admin already exists. Use the login endpoint.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'super_admin',
      clinicId: null,
      permissions: [
        'dashboard', 'patients', 'ipd', 'billing', 'billing-requests',
        'prescriptions', 'pharmacy', 'lab', 'inventory',
        'room-settings', 'staff', 'telemedicine', 'tokens', 'emergency', 'tasks', 'super'
      ],
      isActive: true,
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json({
      success: true,
      message: 'Super Admin created successfully',
      token,
      user: userOut
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ── Register (Staff/Clinic Admin) ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, clinicName, clinicId, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Admin registration: must provide clinicName to create a new clinic
    if (role === 'admin' || !role) {
      if (!clinicName) {
        return res.status(400).json({ message: 'Clinic name is required for admin registration' });
      }

      const existingClinic = await Clinic.findOne({ email });
      if (existingClinic) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      const clinic = await Clinic.create({ name: clinicName, email, phone });

      const user = await User.create({
        name, email, password,
        role: 'admin',
        clinicId: clinic._id,
        department, phone,
        permissions: [
          'dashboard', 'patients', 'ipd', 'billing',
          'prescriptions', 'pharmacy', 'lab', 'inventory',
          'room-settings', 'staff', 'telemedicine'
        ],
      });

      const token = jwt.sign(
        { id: user._id, role: user.role, clinicId: clinic._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password: _, ...userOut } = user.toObject();
      return res.status(201).json({ token, user: userOut });
    }

    // Non-admin staff registration: must provide clinicId to join an existing clinic
    if (!clinicId) {
      return res.status(400).json({ message: 'clinicId is required to join an existing clinic' });
    }

    const targetClinic = await Clinic.findById(clinicId);
    if (!targetClinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    const existingUser = await User.findOne({ email, clinicId });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists in this clinic' });
    }

    const ROLE_PERMISSIONS_MAP = {
      doctor:         ['dashboard', 'patients', 'ipd', 'lab', 'prescriptions', 'telemedicine'],
      nurse:          ['dashboard', 'patients', 'ipd'],
      receptionist:   ['dashboard', 'patients', 'billing', 'tokens'],
      pharmacist:     ['dashboard', 'pharmacy', 'inventory'],
      lab_technician: ['dashboard', 'patients', 'lab'],
    };

    const user = await User.create({
      name, email, password, role,
      clinicId, department, phone,
      permissions: ROLE_PERMISSIONS_MAP[role] || ['dashboard'],
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    return res.status(201).json({ token, user: userOut });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register-patient', async (req, res) => {
  try {
    const { 
      name, email, password, phone,
      dob, age, gender, bloodGroup, address, city, state, pincode,
      emergencyContact, emergencyName, emergencyRelation,
      allergies, chronicConditions, currentMedications, medicalHistory, notes,
      assignedDoctor, clinicId, generateToken = true
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ message: 'A patient with this email already exists' });
    }

    // ── Find or create clinic ──
    let targetClinicId = clinicId || req.body.clinicId;

    if (!targetClinicId && assignedDoctor) {
      const doctorUser = await User.findById(assignedDoctor);
      if (doctorUser && doctorUser.clinicId) {
        targetClinicId = doctorUser.clinicId;
      }
    }

    if (!targetClinicId) {
      let clinic = await Clinic.findOne();
      if (!clinic) {
        clinic = await Clinic.create({ 
          name: 'Default Clinic', 
          email: 'admin@defaultclinic.com', 
          phone: phone || '',
        });
      }
      targetClinicId = clinic._id;
    }

    // ── STEP 1: Create User with role: 'patient' ──
    const user = await User.create({
      name,
      email,
      password,
      role: 'patient',
      clinicId: targetClinicId,
      phone: phone || '',
      permissions: ['patient-dashboard'],
      isActive: true,
    });

    // ── STEP 2: Create Patient record ──
    const patientData = {
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || phone,
      clinicId: targetClinicId,
      status: 'Active',
      registrationDate: new Date(),
      registeredBy: req.user?.id || null,
    };

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

    const patient = await Patient.create(patientData);

    // ── STEP 3: Generate token if requested ──
    let tokenData = null;
    if (generateToken && assignedDoctor) {
      try {
        const Token = mongoose.model('Token');
        const date = new Date().toISOString().split('T')[0];
        
        const last = await Token.findOne({ 
          clinicId: targetClinicId, 
          doctor: assignedDoctor, 
          date 
        }).sort({ tokenNumber: -1 }).select('tokenNumber');

        const tokenNumber = last ? last.tokenNumber + 1 : 1;

        tokenData = await Token.create({
          clinicId: targetClinicId,
          tokenNumber,
          date,
          doctor: assignedDoctor,
          patient: patient._id,
          patientName: patient.name,
          phone: patient.phone,
          email: patient.email,
          generatedBy: req.user?.id || user._id,
          source: 'staff',
          status: 'Waiting',
          consultationType: 'in-person',
        });

        await tokenData.populate('doctor', 'name department');
      } catch (tokenErr) {
        console.error('Failed to generate token:', tokenErr);
        // Don't fail the registration if token generation fails
      }
    }

    const { password: _, ...userOut } = user.toObject();
    const finalClinic = await Clinic.findById(targetClinicId);

    res.status(201).json({ 
      success: true, 
      message: 'Patient registered successfully with login credentials', 
      user: userOut,
      patient: patient,
      clinic: { id: targetClinicId, name: finalClinic ? finalClinic.name : 'Clinic' },
      token: tokenData || undefined
    });

  } catch (err) {
    console.error('Patient registration error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ── UNIFIED LOGIN (Handles both staff and patients) ──────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = null;
    let patient = null;

    // ── STEP 1: Try to find user in User table ──────────────────────────
    user = await User.findOne({ email });

    // ── STEP 2: If user exists, verify password ─────────────────────────
    if (user) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // If user is patient, get patient data
      if (user.role === 'patient') {
        patient = await Patient.findOne({ userId: user._id });
      }
    } else {
      // ── STEP 3: Check if patient exists in Patient table ──────────────
      patient = await Patient.findOne({ email });
      
      if (!patient) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // ── STEP 4: Check if patient already has a User account ────────────
      if (patient.userId) {
        user = await User.findById(patient.userId);
        if (user) {
          const isMatch = await user.matchPassword(password);
          if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
          }
        }
      } else {
        // ── STEP 5: Create User for patient ──────────────────────────────
        // Check if email is used by a staff account
        const staffUser = await User.findOne({ email, role: { $ne: 'patient' } });
        if (staffUser) {
          return res.status(400).json({ 
            message: 'This email is registered as a staff account' 
          });
        }

        user = await User.create({
          name: patient.name,
          email: patient.email,
          password: password,
          role: 'patient',
          clinicId: patient.clinicId,
          phone: patient.phone || '',
          permissions: ['patient-dashboard'],
          isActive: true,
        });

        patient.userId = user._id;
        await patient.save();
      }
    }

    // ── STEP 6: Validate user ────────────────────────────────────────────
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    // ── STEP 7: Generate token ──────────────────────────────────────────
    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: user.clinicId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    
    // Get patient data if not already fetched
    if (user.role === 'patient' && !patient) {
      patient = await Patient.findOne({ userId: user._id });
    }
    
    res.json({ 
      token, 
      user: userOut,
      patient: patient || undefined,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get Profile ───────────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    let patientData = null;
    if (user.role === 'patient') {
      patientData = await Patient.findOne({ userId: user._id });
    }
    
    res.json({ user, patient: patientData });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── List Staff (admin only) ───────────────────────────────────────────────
router.get('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    // For super_admin, if they have a clinic selected via header, filter by it
    let filter = { role: { $ne: 'patient' } };
    
    if (req.user?.role === 'super_admin') {
      const clinicId = req.headers['x-clinic-id'] || req.query.clinicId;
      if (clinicId && mongoose.Types.ObjectId.isValid(clinicId)) {
        filter.clinicId = new mongoose.Types.ObjectId(clinicId);
      } else if (clinicId) {
        // Invalid clinicId - return empty
        return res.json([]);
      }
    } else {
      // For non-super_admin, use their JWT clinicId
      if (req.user?.clinicId) {
        filter.clinicId = req.user.clinicId;
      } else {
        // No clinicId - return empty
        return res.json([]);
      }
    }
    
    const staff = await User.find(filter, '-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Super Admin: List all users across all clinics ──
router.get('/all-users', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const filter = { role: { $ne: 'super_admin' } };
    if (req.query.clinicId) {
      filter.clinicId = req.query.clinicId;
    }
    const users = await User.find(filter, '-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Create Staff (admin only) ─────────────────────────────────────────────
router.post('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, phone, permissions, consultationFee, clinicId } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // ── Resolve clinicId ──
    let targetClinicId;
    if (req.user.role === 'super_admin') {
      // Super admin must provide clinicId in the body
      if (!clinicId || !mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({ 
          message: 'Valid clinicId is required for super_admin to create staff' 
        });
      }
      targetClinicId = new mongoose.Types.ObjectId(clinicId);
    } else {
      // Regular admin uses their own clinicId
      if (!req.user.clinicId) {
        return res.status(400).json({ 
          message: 'No clinic assigned to this admin account' 
        });
      }
      targetClinicId = req.user.clinicId;
    }

    // Check if user already exists in this clinic
    const exists = await User.findOne({ email, clinicId: targetClinicId });
    if (exists) {
      return res.status(400).json({ 
        message: 'Email already registered in this clinic' 
      });
    }

    const userData = {
      name,
      email,
      password,
      role,
      department: department || '',
      phone: phone || '',
      clinicId: targetClinicId,
      permissions: permissions || ['dashboard'],
      isActive: true,
    };

    if (role === 'doctor' && consultationFee !== undefined && consultationFee !== '') {
      userData.consultationFee = Number(consultationFee);
    }

    const user = await User.create(userData);

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Update Staff (admin only) ─────────────────────────────────────────────
router.put('/users/:id', auth, async (req, res) => {
  try {
    const { password, ...fields } = req.body;
    delete fields.password;

    // ── Resolve clinicId ──
    let targetClinicId;
    if (req.user.role === 'super_admin') {
      const clinicId = req.body.clinicId || req.query.clinicId || req.headers['x-clinic-id'];
      if (!clinicId || !mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({ 
          message: 'Valid clinicId is required for super_admin to update staff' 
        });
      }
      targetClinicId = new mongoose.Types.ObjectId(clinicId);
    } else {
      if (!req.user.clinicId) {
        return res.status(400).json({ 
          message: 'No clinic assigned to this admin account' 
        });
      }
      targetClinicId = req.user.clinicId;
    }

    // Find the user with clinicId scoping
    const user = await User.findOne({ _id: req.params.id, clinicId: targetClinicId });
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found in this clinic' });
    }

    // Check email conflict within the same clinic
    if (fields.email && fields.email !== user.email) {
      const conflict = await User.findOne({ 
        email: fields.email, 
        clinicId: targetClinicId 
      });
      if (conflict) {
        return res.status(400).json({ message: 'Email already in use in this clinic' });
      }
    }

    if (fields.consultationFee !== undefined && fields.consultationFee !== '') {
      fields.consultationFee = Number(fields.consultationFee);
    }

    Object.assign(user, fields);
    if (password) user.password = password;

    await user.save();
    const { password: _, ...userOut } = user.toObject();
    res.json(userOut);
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Delete Staff (admin only) ─────────────────────────────────────────────
router.delete('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    // ── Resolve clinicId ──
    let targetClinicId;
    if (req.user.role === 'super_admin') {
      const clinicId = req.body.clinicId || req.query.clinicId || req.headers['x-clinic-id'];
      if (!clinicId || !mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({ 
          message: 'Valid clinicId is required for super_admin to delete staff' 
        });
      }
      targetClinicId = new mongoose.Types.ObjectId(clinicId);
    } else {
      if (!req.user.clinicId) {
        return res.status(400).json({ 
          message: 'No clinic assigned to this admin account' 
        });
      }
      targetClinicId = req.user.clinicId;
    }

    const user = await User.findOneAndDelete({ 
      _id: req.params.id, 
      clinicId: targetClinicId 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found in this clinic' });
    }
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Generate SSO Token for IMS ────────────────────────────────────────────
router.post('/sso-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await SsoToken.create({
      token,
      email: user.email,
      userId: String(user._id),
      role: user.role,
      clinicId: user.clinicId ? String(user.clinicId) : 'super_admin',
      expiresAt,
    });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Change Password ───────────────────────────────────────────────────────
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/available-doctors', auth, async (req, res) => {
  try {
    const doctors = await User.find(
      { role: 'doctor', isActive: true },
      'name department consultationFee phone email avatar'
    ).sort({ name: 1 });
    res.json({ success: true, doctors });
  } catch (err) {
    console.error('Error fetching available doctors:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: List all clinics ─────────────────────────────────────────
router.get('/clinics', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const clinics = await Clinic.find().sort({ createdAt: -1 });
    res.json({ success: true, clinics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: Create a clinic ──────────────────────────────────────────
router.post('/clinics', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
    const existing = await Clinic.findOne({ email });
    if (existing) return res.status(400).json({ message: 'A clinic with this email already exists' });
    const clinic = await Clinic.create({ name, email, phone });
    res.status(201).json({ success: true, clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: Update a clinic ──────────────────────────────────────────
router.put('/clinics/:id', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
    res.json({ success: true, clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: List all users across all clinics ────────────────────────
// Optional ?clinicId= query param to filter by a specific clinic
router.get('/all-users', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const filter = { role: { $ne: 'patient' } };
    if (req.query.clinicId) filter.clinicId = req.query.clinicId;
    const users = await User.find(filter, '-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Super Admin: Toggle any user's active status ──────────────────────────
router.patch('/users/:id/toggle-active', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sso-exchange', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'SSO token required' });

    // Atomic findOneAndDelete — expired or already-used tokens return null
    const record = await SsoToken.findOneAndDelete({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(401).json({ message: 'Invalid or expired SSO token' });
    }

    // Find existing user by email
    let user = await User.findOne({ email: record.email });

    if (!user) {
      // First-time IMS access — auto-provision an HMS account
      const role     = record.role === 'admin' ? 'admin' : 'receptionist';
      const clinicId = record.clinicId !== 'super_admin' ? record.clinicId : null;
      user = await User.create({
        name:        record.email.split('@')[0],
        email:       record.email,
        password:    crypto.randomBytes(16).toString('hex'),
        role,
        clinicId,
        permissions: ['dashboard'],
        isActive:    true,
      });
    }

    // Patch missing clinicId onto existing user
    if (record.clinicId && record.clinicId !== 'super_admin' && !user.clinicId) {
      user.clinicId = record.clinicId;
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, clinicId: user.clinicId || null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    res.json({ token: jwtToken, user: userOut });

  } catch (err) {
    console.error('SSO exchange error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;