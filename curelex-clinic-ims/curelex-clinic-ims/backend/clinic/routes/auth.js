import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import SsoToken from '../../ims/src/models/SsoToken.js';
import env from '../config/env.js';

const router = express.Router();

function sign(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function protect(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// POST /api/clinic/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, owner, email, password, phone, whatsapp, address, city, district, state } = req.body;
    if (!name || !owner || !email || !password)
      return res.status(400).json({ message: 'Please fill all required fields.' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const exists = await Clinic.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ message: 'An account with this email already exists.' });

    const hashed = await bcrypt.hash(password, 10);
    const clinic = await Clinic.create({
      name, owner, email: email.toLowerCase(), password: hashed,
      phone, whatsapp, address, city, district, state,
    });

    const token = sign({ id: clinic._id, role: 'admin', clinicId: clinic._id });
    res.status(201).json({ token, role: 'admin', clinicId: clinic._id, clinic });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/clinic/auth/login
router.post('/login', async (req, res) => {
  try {
    const { role, email, password } = req.body;

    if (role === 'superadmin') {
      if (email === env.superAdminEmail && password === env.superAdminPassword) {
        const token = sign({ id: 'superadmin', role: 'superadmin', clinicId: null });
        return res.json({ token, role: 'superadmin', clinicId: null });
      }
      return res.status(401).json({ message: 'Invalid super admin credentials.' });
    }

    if (role === 'admin') {
      const clinic = await Clinic.findOne({ email: email.toLowerCase() });
      if (!clinic) return res.status(401).json({ message: 'Invalid admin credentials.' });
      const match = await bcrypt.compare(password, clinic.password);
      if (!match) return res.status(401).json({ message: 'Invalid admin credentials.' });
      const token = sign({ id: clinic._id, role: 'admin', clinicId: clinic._id });
      return res.json({ token, role: 'admin', clinicId: clinic._id, clinic });
    }

    if (['doctor', 'receptionist', 'pharmacist'].includes(role)) {
      const user = await User.findOne({ email: email.toLowerCase(), role });
      if (!user) return res.status(401).json({ message: `Invalid ${role} credentials.` });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: `Invalid ${role} credentials.` });

      // ✅ FIXED: added name and specialist to JWT so prescription PDF shows correctly
      const token = sign({
        id:         user._id,
        role,
        clinicId:   user.clinicId,
        name:       user.name       || '',
        specialist: user.specialist || '',
      });

      const responseData = { token, role, clinicId: user.clinicId, user };

      if (role === 'pharmacist') {
        const ssoRaw = crypto.randomBytes(32).toString('hex');
        await SsoToken.create({
          token:     ssoRaw,
          email:     email.toLowerCase(),
          clinicId:  String(user.clinicId),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        });
        responseData.ssoToken = ssoRaw;
      }

      return res.json(responseData);
    }

    res.status(400).json({ message: 'Unknown role.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/clinic/auth/refresh-sso
router.post('/refresh-sso', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'pharmacist') {
      return res.status(403).json({ message: 'Only pharmacists can refresh SSO' });
    }

    const ssoRaw = crypto.randomBytes(32).toString('hex');
    await SsoToken.create({
      token:     ssoRaw,
      email:     user.email,
      clinicId:  String(user.clinicId),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    res.json({ ssoToken: ssoRaw });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;