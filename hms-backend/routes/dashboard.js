// hms-backend/routes/dashboard.js - Complete rewrite with proper stats

import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
import express from 'express';
const router = express.Router();
import { auth } from '../middleware/auth.js';
import { getClinicFilter } from '../middleware/clinicFilter.js';

import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';
import Pharmacy from '../models/Pharmacy.js';
import Lab from '../models/Lab.js';
import Inventory from '../models/Inventory.js';
import Admission from '../models/Admission.js';
import Appointment from '../models/Appointment.js';
import Token from '../models/Token.js';
import mongoose from 'mongoose';

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
 *  1. req.query.clinicId  — GET requests pass it as a query param
 *  2. req.user.clinicId   — set by the auth middleware from the JWT
 *  3. null                — if no clinic found, return null
 */
function resolveClinicId(req) {
  const id = req.query?.clinicId || req.user?.clinicId || null;
  return toObjectId(id);
}

router.get('/stats', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const role = req.user.role;
    const userId = req.user.id;

    // ── If no clinicId, return empty stats ──
    if (!clinicId) {
      return res.json({
        totalPatients: 0,
        activePatients: 0,
        admittedPatients: 0,
        todayAppointments: 0,
        pendingAppointments: 0,
        totalRevenue: 0,
        pendingBills: 0,
        lowStockItems: 0,
        pendingLabs: 0,
        monthlyRevenue: [],
        recentAppointments: [],
        recentAdmissions: [],
        myPatients: 0,
        myAdmittedPatients: 0,
        pendingLabsDoctor: 0,
        activePatientsNurse: 0,
        totalMeds: 0,
        outOfStock: 0,
        pendingOrders: 0,
        lowStockMeds: [],
        completedLabs: 0,
        urgentLabs: 0,
        totalLabs: 0,
        pendingLabList: []
      });
    }

    const patientClinicFilter = { clinicIds: clinicId };
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); 
    tomorrow.setDate(today.getDate() + 1);

    // ── Common stats for all roles ──
    const todayAppointments = await Token.countDocuments({ 
      clinicId, 
      date: today.toISOString().split('T')[0]
    });
    
    const pendingAppointments = await Token.countDocuments({ 
      clinicId, 
      status: { $in: ['Pending', 'Waiting'] } 
    });
    
    const recentAppointments = await Token.find({ 
      clinicId, 
      date: today.toISOString().split('T')[0] 
    })
      .populate('patient', 'name')
      .populate('doctor', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const admittedPatients = await Admission.countDocuments({ 
      clinicId, 
      status: 'Admitted' 
    });

    /* ──────────────────────────────────────────────────────
       ADMIN — full stats
    ────────────────────────────────────────────────────── */
    if (role === 'admin' || role === 'super_admin') {
      const sixMonthsAgo = new Date(); 
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const [
        totalPatients, 
        activePatients, 
        totalRevenue,
        pendingBills, 
        lowStockItems, 
        pendingLabs, 
        monthlyRevenue,
      ] = await Promise.all([
        Patient.countDocuments(patientClinicFilter),
        Patient.countDocuments({ ...patientClinicFilter, status: 'Active' }),
        Billing.aggregate([
          { $match: { clinicId, paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Billing.countDocuments({ clinicId, paymentStatus: { $in: ['Pending', 'Partial'] } }),
        Inventory.countDocuments({ clinicId, quantity: { $lt: 10 } }),
        Lab.countDocuments({ clinicId, status: { $in: ['Ordered', 'Sample Collected', 'Processing'] } }),
        Billing.aggregate([
          {
            $match: {
              clinicId,
              paymentStatus: 'Paid',
              createdAt: { $gte: sixMonthsAgo }
            }
          },
          {
            $group: {
              _id: {
                month: { $month: '$createdAt' },
                year: { $year: '$createdAt' }
              },
              total: { $sum: '$totalAmount' }
            }
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1
            }
          }
        ])
      ]);

      const recentAdmissions = await Admission.find({ clinicId, status: 'Admitted' })
        .populate('patient', 'name patientId')
        .populate('doctor', 'name')
        .sort({ admissionDate: -1 })
        .limit(5);

      return res.json({
        totalPatients: totalPatients || 0,
        activePatients: activePatients || 0,
        admittedPatients: admittedPatients || 0,
        todayAppointments: todayAppointments || 0,
        pendingAppointments: pendingAppointments || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingBills: pendingBills || 0,
        lowStockItems: lowStockItems || 0,
        pendingLabs: pendingLabs || 0,
        monthlyRevenue: monthlyRevenue || [],
        recentAppointments: recentAppointments || [],
        recentAdmissions: recentAdmissions || [],
      });
    }

    /* ──────────────────────────────────────────────────────
       DOCTOR — my patients + my appointments + labs + IPD
    ────────────────────────────────────────────────────── */
    if (role === 'doctor' || role === 'separate_doctor') {
      const myPatients = await Token.distinct('patient', { clinicId, doctor: userId });
      const pendingLabs = await Lab.countDocuments({
        clinicId,
        status: { $in: ['Ordered', 'Sample Collected', 'Processing'] },
      });
      const myAdmittedPatients = await Admission.countDocuments({ clinicId, doctor: userId, status: 'Admitted' });

      return res.json({
        myPatients: myPatients.length || 0,
        admittedPatients: myAdmittedPatients || 0,
        todayAppointments: todayAppointments || 0,
        pendingAppointments: pendingAppointments || 0,
        pendingLabs: pendingLabs || 0,
        recentAppointments: recentAppointments.filter(a => String(a.doctor?._id) === String(userId)) || [],
      });
    }

    /* ──────────────────────────────────────────────────────
       NURSE — active patients + admitted + today schedule + pending labs
    ────────────────────────────────────────────────────── */
    if (role === 'nurse') {
      const activePatients = await Patient.countDocuments({ ...patientClinicFilter, status: 'Active' });
      const pendingLabs = await Lab.countDocuments({
        clinicId,
        status: { $in: ['Ordered', 'Sample Collected', 'Processing'] },
      });

      return res.json({
        activePatients: activePatients || 0,
        admittedPatients: admittedPatients || 0,
        todayAppointments: todayAppointments || 0,
        pendingLabs: pendingLabs || 0,
        recentAppointments: recentAppointments || [],
      });
    }

    /* ──────────────────────────────────────────────────────
       RECEPTIONIST — today appts + pending bills + admitted
    ────────────────────────────────────────────────────── */
    if (role === 'receptionist') {
      const [totalPatients, pendingBills] = await Promise.all([
        Patient.countDocuments(patientClinicFilter),
        Billing.countDocuments({ clinicId, paymentStatus: { $in: ['Pending', 'Partial'] } }),
      ]);

      const recentAdmissions = await Admission.find({ clinicId, status: 'Admitted' })
        .populate('patient', 'name patientId')
        .populate('doctor', 'name')
        .sort({ admissionDate: -1 })
        .limit(5);

      return res.json({
        todayAppointments: todayAppointments || 0,
        pendingAppointments: pendingAppointments || 0,
        pendingBills: pendingBills || 0,
        totalPatients: totalPatients || 0,
        admittedPatients: admittedPatients || 0,
        recentAppointments: recentAppointments || [],
        recentAdmissions: recentAdmissions || [],
      });
    }

    /* ──────────────────────────────────────────────────────
       PHARMACIST — stock levels + pending orders
    ────────────────────────────────────────────────────── */
    if (role === 'pharmacist') {
      const [lowStockItems, outOfStock, pendingOrders, totalMeds, lowStockMeds] = await Promise.all([
        Inventory.countDocuments({ clinicId, quantity: { $gt: 0, $lt: 10 } }),
        Inventory.countDocuments({ clinicId, quantity: 0 }),
        Pharmacy.countDocuments({ clinicId, status: 'Pending' }),
        Inventory.countDocuments({ clinicId }),
        Inventory.find({ clinicId, quantity: { $lt: 10 } }).sort({ quantity: 1 }).limit(8),
      ]);

      return res.json({ 
        lowStockItems: lowStockItems || 0, 
        outOfStock: outOfStock || 0, 
        pendingOrders: pendingOrders || 0, 
        totalMeds: totalMeds || 0, 
        lowStockMeds: lowStockMeds || [] 
      });
    }

    /* ──────────────────────────────────────────────────────
       LAB TECH — pending/completed/urgent tests
    ────────────────────────────────────────────────────── */
    if (role === 'lab_technician') {
      const [pendingLabs, completedLabs, urgentLabs, totalLabs, pendingLabList] = await Promise.all([
        Lab.countDocuments({ clinicId, status: 'Ordered' }),
        Lab.countDocuments({ clinicId, status: 'Completed', updatedAt: { $gte: today } }),
        Lab.countDocuments({ clinicId, status: { $ne: 'Completed' }, priority: { $in: ['Urgent', 'STAT'] } }),
        Lab.countDocuments({ clinicId }),
        Lab.find({ clinicId, status: 'Ordered' })
          .populate('patient', 'name')
          .sort({ priority: -1, createdAt: 1 })
          .limit(8),
      ]);

      return res.json({ 
        pendingLabs: pendingLabs || 0, 
        completedLabs: completedLabs || 0, 
        urgentLabs: urgentLabs || 0, 
        totalLabs: totalLabs || 0, 
        pendingLabList: pendingLabList || [] 
      });
    }

    /* ── Fallback ── */
    return res.json({ 
      todayAppointments: todayAppointments || 0, 
      pendingAppointments: pendingAppointments || 0, 
      recentAppointments: recentAppointments || [] 
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;