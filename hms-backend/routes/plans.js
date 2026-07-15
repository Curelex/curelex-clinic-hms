// hms-backend/routes/plans.js
import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import planService from '../services/planService.js';
import Clinic from '../models/Clinic.js';
import Subscription from '../models/Subscription.js';

const router = express.Router();

/**
 * GET /api/plans/available
 * Get all available plans for a clinic type
 * Query: ?type=clinic|hospital
 * Query: ?paidOnly=true - returns only paid plans
 */
router.get('/available', auth, async (req, res) => {
  try {
    const clinicType = req.query.type || 'clinic';
    const paidOnly = req.query.paidOnly === 'true';
    
    let plans;
    if (paidOnly) {
      plans = planService.getPaidPlans(clinicType);
    } else {
      plans = planService.getAvailablePlans(clinicType);
    }
    
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/plans/clinic
 * Get current clinic plan details
 */
router.get('/clinic', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No clinic assigned to this account' 
      });
    }

    const planDetails = await planService.getClinicPlan(req.user.clinicId);
    res.json({ success: true, plan: planDetails });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/plans/clinic/:clinicId
 * Get clinic plan details (super admin only)
 */
router.get('/clinic/:clinicId', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const planDetails = await planService.getClinicPlan(req.params.clinicId);
    res.json({ success: true, plan: planDetails });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/plans/upgrade
 * Upgrade clinic plan with prorated billing
 */
router.post('/upgrade', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No clinic assigned to this account' 
      });
    }

    // Check admin permission
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admin can upgrade plans' 
      });
    }

    const { plan, paymentMethod } = req.body;

    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Plan is required' 
      });
    }

    const result = await planService.upgradePlan(
      req.user.clinicId, 
      plan, 
      paymentMethod || 'card'
    );

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/plans/renew
 * Renew an expired plan
 */
router.post('/renew', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No clinic assigned to this account' 
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admin can renew plans' 
      });
    }

    const { plan, paymentMethod } = req.body;
    const result = await planService.renewPlan(req.user.clinicId, plan, paymentMethod);

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/plans/check-expiry
 * Check and handle plan expiration
 */
router.post('/check-expiry', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No clinic assigned to this account' 
      });
    }

    const result = await planService.handleExpiredPlan(req.user.clinicId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/plans/check-feature/:feature
 * Check if clinic has access to a feature
 */
router.get('/check-feature/:feature', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.json({ success: true, hasAccess: false });
    }

    const clinic = await Clinic.findById(req.user.clinicId);
    if (!clinic) {
      return res.json({ success: true, hasAccess: false });
    }

    const hasAccess = planService.hasFeature(clinic, req.params.feature);
    res.json({ success: true, hasAccess });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/plans/check-limits/:resourceType
 * Check if clinic can add more resources
 */
router.get('/check-limits/:resourceType', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.json({ success: true, canAdd: false, current: 0, limit: 0 });
    }

    const clinic = await Clinic.findById(req.user.clinicId);
    if (!clinic) {
      return res.json({ success: true, canAdd: false, current: 0, limit: 0 });
    }

    // Get current count based on resource type
    let currentCount = 0;
    const { resourceType } = req.params;

    switch (resourceType) {
      case 'patients':
        const Patient = mongoose.model('Patient');
        currentCount = await Patient.countDocuments({ clinicIds: req.user.clinicId });
        break;
      case 'staff':
        const User = mongoose.model('User');
        currentCount = await User.countDocuments({ 
          clinicId: req.user.clinicId,
          role: { $nin: ['super_admin', 'patient'] }
        });
        break;
      case 'doctors':
        const UserDoctor = mongoose.model('User');
        currentCount = await UserDoctor.countDocuments({ 
          clinicId: req.user.clinicId,
          role: { $in: ['doctor', 'separate_doctor'] }
        });
        break;
      case 'beds':
        const Bed = mongoose.model('Bed') || { countDocuments: () => 0 };
        currentCount = await Bed.countDocuments({ clinicId: req.user.clinicId }) || 0;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid resource type' });
    }

    const canAdd = planService.canAddResource(clinic, resourceType, currentCount);
    const config = planService.getClinicPlanConfig(clinic);
    const limits = config.limits || {};
    const limitMap = {
      patients: limits.patients,
      staff: limits.staff,
      doctors: limits.doctors,
      beds: limits.beds || 0,
    };
    const limit = limitMap[resourceType] !== undefined ? limitMap[resourceType] : 0;

    res.json({ 
      success: true, 
      canAdd, 
      current: currentCount,
      limit: limit === -1 ? 'Unlimited' : limit,
      plan: clinic.plan || 'free',
      planLabel: planService.getPlanLabel(clinic.type || 'clinic', clinic.plan || 'free'),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/plans/feature-status
 * Get all feature status for current clinic
 */
router.get('/feature-status', auth, async (req, res) => {
  try {
    if (!req.user.clinicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No clinic assigned to this account' 
      });
    }

    const clinic = await Clinic.findById(req.user.clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    const status = planService.getFeatureStatus(clinic);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/plans/stripe-plans
 * Get Stripe plan mapping (for future use)
 */
router.get('/stripe-plans', auth, async (req, res) => {
  try {
    const stripePlans = planService.getStripePlans();
    res.json({ success: true, plans: stripePlans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;