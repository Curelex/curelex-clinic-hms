//
// Usage examples:
//
//   import { requirePlan, enforceStaffLimit } from '../middleware/planGuard.js';
//
//   router.get('/revenue',     protect, requirePlan(['plus', 'pro']), getRevenue);
//   router.post('/users',      protect, enforceStaffLimit('doctors'), addStaff);
//
import Subscription from '../models/Subscription.js';
import { PLAN_CONFIG } from '../../src/utils/planConfig.js';   // ← shared config

// ─────────────────────────────────────────────────────────────────
// requirePlan([...allowedPlans])
// Returns 403 if the clinic's current plan is not in the list.
// ─────────────────────────────────────────────────────────────────
export function requirePlan(allowedPlans = []) {
  return async (req, res, next) => {
    try {
      const plan = await getActivePlan(req.clinic._id);

      if (!allowedPlans.includes(plan)) {
        return res.status(403).json({
          success:  false,
          message:  `This feature requires one of these plans: ${allowedPlans.join(', ')}.`,
          currentPlan: plan,
          upgradeNeeded: allowedPlans[0],
        });
      }

      req.clinicPlan = plan;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// enforceStaffLimit(role)
// role: 'doctors' | 'receptionists' | 'pharmacists'
// Reads plan limits from planConfig and blocks if over limit.
// Pass currentCount in req.body or let the middleware count from DB.
// ─────────────────────────────────────────────────────────────────
export function enforceStaffLimit(role) {
  return async (req, res, next) => {
    try {
      const plan    = await getActivePlan(req.clinic._id);
      const cfg     = PLAN_CONFIG[plan] ?? PLAN_CONFIG['lite'];

      const limitMap = {
        doctors:       cfg.maxDoctors,
        receptionists: cfg.maxReceptionists,
        pharmacists:   cfg.maxPharmacists,
      };

      const limit = limitMap[role];

      if (limit === -1) {
        // Unlimited on this plan
        req.clinicPlan = plan;
        return next();
      }

      // Count existing staff of this role from the clinic's User model
      const User        = (await import('../models/User.js')).default;
      const roleToCheck = role === 'doctors'       ? 'doctor'
                        : role === 'receptionists' ? 'receptionist'
                        : 'pharmacist';

      const currentCount = await User.countDocuments({
        clinicId: req.clinic._id,
        role:     roleToCheck,
      });

      if (currentCount >= limit) {
        const upgradeNeeded = plan === 'lite' ? 'Clinic Plus' : 'Clinic Pro';
        return res.status(403).json({
          success:       false,
          message:       `Your ${plan} plan allows up to ${limit} ${role}. Upgrade to add more.`,
          currentCount,
          limit,
          upgradeNeeded,
        });
      }

      req.clinicPlan = plan;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// Helper: resolve effective plan for a clinic
// Falls back to 'lite' if no subscription record found
// ─────────────────────────────────────────────────────────────────
async function getActivePlan(clinicId) {
  const sub = await Subscription.findOne({ clinicId });

  if (!sub || sub.status === 'canceled' || sub.status === 'free') {
    return 'lite';
  }

  // past_due: give a grace period — keep plan active
  if (['active', 'trialing', 'past_due'].includes(sub.status)) {
    return sub.plan ?? 'lite';
  }

  return 'lite';
}