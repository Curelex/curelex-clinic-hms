import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/auth.js
import express from 'express';
const router = express.Router();
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import auth from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

// ── SSO Token Schema (ideally move to /models/SsoToken.js) ────────────────
const ssoTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true },
  email:     { type: String, required: true },
  userId:    { type: String, required: true },   // added for better traceability
  role:      { type: String, default: 'staff' },
  clinicId:  { type: String, required: true },
  expiresAt: { type: Date,   required: true },
}, { timestamps: false });

const SsoToken = mongoose.models.SsoToken || mongoose.model('SsoToken', ssoTokenSchema);
// Note: the guard above prevents model re-registration on hot-reload / test runs.

// ── Register ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, clinicName, phone } = req.body;

    if (!clinicName) {
      return res.status(400).json({ message: 'Clinic name is required' });
    }

    // Check for duplicate clinic email
    const existingClinic = await Clinic.findOne({ email });
    if (existingClinic) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Also check for duplicate user email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const clinic = await Clinic.create({ name: clinicName, email, phone });

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      clinicId: clinic._id,
      permissions: [
        'dashboard', 'patients', 'ipd', 'billing',
        'prescriptions', 'pharmacy', 'lab', 'inventory',
        'room-settings', 'staff',
      ],
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: clinic._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json({ token, user: userOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password });

    const users = await User.find({ email });
    if (!users.length) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let matchedUser = null;
    for (const u of users) {
      const ok = await u.matchPassword(password);
      if (ok) { matchedUser = u; break; }
    }

    if (!matchedUser) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!matchedUser.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    const token = jwt.sign(
      { id: matchedUser._id, role: matchedUser.role, clinicId: matchedUser.clinicId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = matchedUser.toObject();
    res.json({ token, user: userOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get Profile ───────────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── List Staff (admin only) ───────────────────────────────────────────────
router.get('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const staff = await User.find(
      { clinicId: req.user.clinicId },
      '-password'
    ).sort({ createdAt: -1 });

    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Create Staff (admin only) ─────────────────────────────────────────────
router.post('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, phone, permissions } = req.body;

    if (!password) return res.status(400).json({ message: 'Password is required' });

    const exists = await User.findOne({ email, clinicId: req.user.clinicId });
    if (exists) return res.status(400).json({ message: 'Email already registered in this clinic' });

    const user = await User.create({
      name, email, password, role,
      department, phone, permissions,
      clinicId: req.user.clinicId,
    });

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Update Staff (admin only) ─────────────────────────────────────────────
router.put('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { password, ...fields } = req.body;

    const user = await User.findOne({ _id: req.params.id, clinicId: req.user.clinicId });
    if (!user) return res.status(404).json({ message: 'Staff member not found' });

    if (fields.email && fields.email !== user.email) {
      const conflict = await User.findOne({ email: fields.email, clinicId: req.user.clinicId });
      if (conflict) return res.status(400).json({ message: 'Email already in use in this clinic' });
    }

    Object.assign(user, fields);
    if (password) user.password = password; // pre-save hook will hash it

    await user.save();
    const { password: _, ...userOut } = user.toObject();
    res.json(userOut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Delete Staff (admin only) ─────────────────────────────────────────────
router.delete('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, clinicId: req.user.clinicId });
    if (!user) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
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
    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute

    await SsoToken.create({
      token,
      email: user.email,
      userId: String(user._id),   // stored for traceability
      role: user.role,
      clinicId: String(user.clinicId),
      expiresAt,
    });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' }); // never leak err.message
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

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;