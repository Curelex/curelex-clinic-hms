// hms-backend/routes/staff.js
// In server.js add: app.use('/api/staff', require('./routes/staff'));

import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

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
 * Resolves clinicId from (in priority order):
 *  1. req.body.clinicId   — POST/DELETE requests pass it in the body
 *  2. req.query.clinicId  — GET requests pass it as a query param
 *  3. req.user.clinicId   — set by the auth middleware from the JWT
 *  4. null                — if no clinic found, return null
 */
function resolveClinicId(req) {
  const id = (
    req.body?.clinicId ||
    req.query?.clinicId ||
    req.user?.clinicId ||
    null
  );
  
  // ── FIX: If no clinicId found, return null ──
  if (!id) return null;
  
  // ── FIX: Convert to ObjectId properly ──
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(String(id));
  }
  return null;
}

// ── GET all staff — admin only, scoped to clinic ──────────────────────────────
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    console.log('🔍 Staff API - clinicId:', clinicId);
    
    // ── FIX: If no clinicId, return empty array ──
    if (!clinicId) {
      console.log('⚠️ No clinicId found, returning empty staff list');
      return res.json([]);
    }
    
    const staff = await User.find({ clinicId }, '-password').sort({ createdAt: -1 });
    console.log('🔍 Staff found:', staff.length);
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST create staff — admin only ────────────────────────────────────────────
router.post('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    // ── If no clinicId, return error ──
    if (!clinicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Clinic ID is required. Please select a clinic first.' 
      });
    }
    
    const { name, email, password, role, phone, department, consultationFee, permissions } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, password and role are required' 
      });
    }

    // Scope duplicate check to this clinic — two clinics may share an email
    const exists = await User.findOne({ email, clinicId });
    if (exists) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered in this clinic' 
      });
    }

    const userData = {
      clinicId,
      name,
      email,
      password,
      role,
      phone: phone || '',
      department: department || '',
      permissions: permissions || ['dashboard'],
      isActive: true,
    };

    // Add consultation fee for doctors
    if (role === 'doctor' && consultationFee !== undefined) {
      userData.consultationFee = Number(consultationFee) || 0;
    }

    const user = new User(userData);
    await user.save();

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE staff — admin only, scoped to clinic ───────────────────────────────
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    // ── If no clinicId, return error ──
    if (!clinicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Clinic ID is required. Please select a clinic first.' 
      });
    }
    
    // findOneAndDelete with clinicId guard prevents Clinic A admin
    // from accidentally deleting a user that belongs to Clinic B
    const deleted = await User.findOneAndDelete({ _id: req.params.id, clinicId });
    if (!deleted) {
      return res.status(404).json({ 
        success: false,
        message: 'Staff member not found in this clinic' 
      });
    }
    res.json({ 
      success: true,
      message: 'Staff member removed' 
    });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;