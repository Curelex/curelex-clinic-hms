// hms-backend/middleware/planCheck.js
import mongoose from 'mongoose';
import planService from '../services/planService.js';
import Clinic from '../models/Clinic.js';

/**
 * Middleware to check if clinic has access to a feature
 * Usage: router.get('/protected', auth, planCheck('telemedicine'), handler)
 */
export const planCheck = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.user.clinicId) {
        return res.status(403).json({ 
          success: false, 
          message: 'No clinic assigned',
          code: 'NO_CLINIC'
        });
      }

      const clinic = await Clinic.findById(req.user.clinicId);
      if (!clinic) {
        return res.status(404).json({ 
          success: false, 
          message: 'Clinic not found',
          code: 'CLINIC_NOT_FOUND'
        });
      }

      // Check if clinic is in grace period or expired
      if (clinic.planStatus === 'expired' && clinic.isDataLocked) {
        const clinicType = clinic.type || 'clinic';
        const planLabel = planService.getPlanLabel(clinicType, clinic.plan || 'lite');
        return res.status(403).json({ 
          success: false, 
          message: `Your ${planLabel} plan has expired. Please renew to access this feature.`,
          code: 'PLAN_EXPIRED',
          plan: clinic.plan,
          planLabel,
        });
      }

      if (clinic.planStatus === 'grace_period') {
        const now = new Date();
        const graceEndsAt = new Date(clinic.gracePeriodEndsAt);
        if (graceEndsAt < now) {
          clinic.planStatus = 'expired';
          clinic.isDataLocked = true;
          await clinic.save();
          return res.status(403).json({ 
            success: false, 
            message: 'Grace period ended. Please renew your plan.',
            code: 'GRACE_PERIOD_ENDED'
          });
        }
      }

      // Check if clinic has the required feature
      const hasAccess = planService.hasFeature(clinic, feature);
      if (!hasAccess) {
        const clinicType = clinic.type || 'clinic';
        const planLabel = planService.getPlanLabel(clinicType, clinic.plan || 'lite');
        return res.status(403).json({ 
          success: false, 
          message: `This feature (${feature}) is not available in your current plan (${planLabel}). Please upgrade.`,
          code: 'FEATURE_NOT_AVAILABLE',
          plan: clinic.plan,
          planLabel,
          feature,
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
};

/**
 * Middleware to check resource limits
 * Usage: router.post('/staff', auth, checkResourceLimit('staff'), handler)
 */
export const checkResourceLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user.clinicId) {
        return res.status(403).json({ 
          success: false, 
          message: 'No clinic assigned',
          code: 'NO_CLINIC'
        });
      }

      const clinic = await Clinic.findById(req.user.clinicId);
      if (!clinic) {
        return res.status(404).json({ 
          success: false, 
          message: 'Clinic not found',
          code: 'CLINIC_NOT_FOUND'
        });
      }

      // Get current count
      let currentCount = 0;
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
        case 'receptionists':
          const UserReceptionist = mongoose.model('User');
          currentCount = await UserReceptionist.countDocuments({ 
            clinicId: req.user.clinicId,
            role: 'receptionist'
          });
          break;
        case 'pharmacists':
          const UserPharmacist = mongoose.model('User');
          currentCount = await UserPharmacist.countDocuments({ 
            clinicId: req.user.clinicId,
            role: 'pharmacist'
          });
          break;
        case 'nurses':
          const UserNurse = mongoose.model('User');
          currentCount = await UserNurse.countDocuments({ 
            clinicId: req.user.clinicId,
            role: 'nurse'
          });
          break;
        case 'labTechnicians':
          const UserLabTech = mongoose.model('User');
          currentCount = await UserLabTech.countDocuments({ 
            clinicId: req.user.clinicId,
            role: 'lab_technician'
          });
          break;
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid resource type',
            code: 'INVALID_RESOURCE_TYPE'
          });
      }

      const canAdd = planService.canAddResource(clinic, resourceType, currentCount);
      const config = planService.getClinicPlanConfig(clinic);
      const limits = config.limits || {};
      const limitMap = {
        patients: limits.patients,
        staff: limits.staff,
        doctors: limits.doctors,
        beds: limits.beds || 0,
        receptionists: config.maxReceptionists || 0,
        pharmacists: config.maxPharmacists || 0,
        nurses: config.maxNurses || 0,
        labTechnicians: config.maxLabTechnicians || 0,
      };
      const limit = limitMap[resourceType] !== undefined ? limitMap[resourceType] : 0;

      if (!canAdd) {
        const clinicType = clinic.type || 'clinic';
        const planLabel = planService.getPlanLabel(clinicType, clinic.plan || 'lite');
        return res.status(403).json({ 
          success: false, 
          message: `Cannot add more ${resourceType}. Your ${planLabel} plan allows ${limit === -1 ? 'unlimited' : limit} ${resourceType}. Please upgrade your plan.`,
          code: 'LIMIT_REACHED',
          current: currentCount,
          limit: limit === -1 ? 'Unlimited' : limit,
          plan: clinic.plan,
          planLabel,
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
};

/**
 * Middleware to check if clinic has an active paid plan
 * Usage: router.post('/premium', auth, requirePaidPlan, handler)
 */
export const requirePaidPlan = async (req, res, next) => {
  try {
    if (!req.user.clinicId) {
      return res.status(403).json({ 
        success: false, 
        message: 'No clinic assigned',
        code: 'NO_CLINIC'
      });
    }

    const clinic = await Clinic.findById(req.user.clinicId);
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found',
        code: 'CLINIC_NOT_FOUND'
      });
    }

    const isPaid = planService.isPaidPlan(clinic);
    if (!isPaid) {
      const clinicType = clinic.type || 'clinic';
      const planLabel = planService.getPlanLabel(clinicType, clinic.plan || 'lite');
      return res.status(403).json({ 
        success: false, 
        message: `This feature requires a paid plan. Your current plan is ${planLabel}. Please upgrade.`,
        code: 'PAID_PLAN_REQUIRED',
        plan: clinic.plan,
        planLabel,
      });
    }

    // Check if plan is active
    if (clinic.planStatus !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your plan is not active. Please renew to access this feature.',
        code: 'PLAN_NOT_ACTIVE',
        status: clinic.planStatus,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};