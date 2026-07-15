// hms-backend/services/planService.js
import mongoose from 'mongoose';
import Clinic from '../models/Clinic.js';
import Subscription from '../models/Subscription.js';
import { 
  PLAN_CONFIGS, 
  getPlanConfig, 
  getAvailablePlans, 
  getPaidPlans,
  getPlanLimits,
  getPlanPrice,
  getPlanLabel,
  STRIPE_PLANS,
  getPlanKeyByPriceId,
  isFreePlan,
  isPaidPlan as isPaidPlanUtil
} from '../config/plans.js';

// Plan pricing configuration
const PLAN_PRICES = {
  // Clinic plans
  free: { monthly: 0, yearly: 0, label: 'Free' },
  lite: { monthly: 999, yearly: 9990, label: 'Lite' },
  plus: { monthly: 1499, yearly: 14990, label: 'Plus' },
  pro: { monthly: 1999, yearly: 19990, label: 'Pro' },
  // Hospital plans
  free: { monthly: 0, yearly: 0, label: 'Free' },
  standard: { monthly: 4999, yearly: 49990, label: 'Standard' },
  enterprise: { monthly: 6999, yearly: 69990, label: 'Enterprise' },
};

export const planService = {
  PLAN_PRICES,
  PLAN_CONFIGS,

  /**
   * Get clinic plan details
   */
  async getClinicPlan(clinicId) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const now = new Date();
    const clinicType = clinic.type || 'clinic';
    // If plan is null/undefined, treat as 'free'
    const planKey = clinic.plan || 'free';
    
    // Determine plan status
    let status = clinic.planStatus || 'free';
    let isExpired = false;
    let isGracePeriod = false;
    let daysRemaining = 0;

    // Only check expiration for paid plans
    if (planKey !== 'free' && clinic.planExpiresAt) {
      const expiresAt = new Date(clinic.planExpiresAt);
      isExpired = expiresAt < now;
      
      if (isExpired && clinic.planStatus === 'active') {
        // Enter grace period
        clinic.planStatus = 'grace_period';
        clinic.gracePeriodEndsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await clinic.save();
        status = 'grace_period';
      }
    }

    if (clinic.planStatus === 'grace_period' && clinic.gracePeriodEndsAt) {
      const graceEndsAt = new Date(clinic.gracePeriodEndsAt);
      isGracePeriod = graceEndsAt > now;
      daysRemaining = Math.ceil((graceEndsAt - now) / (1000 * 60 * 60 * 24));
      
      if (!isGracePeriod) {
        clinic.planStatus = 'expired';
        clinic.isDataLocked = true;
        await clinic.save();
        status = 'expired';
      }
    }

    if (clinic.planStatus === 'active' && clinic.planExpiresAt && planKey !== 'free') {
      const expiresAt = new Date(clinic.planExpiresAt);
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }

    const config = getPlanConfig(clinicType, planKey);
    const isFree = planKey === 'free' || !planKey;

    return {
      ...clinic.toObject(),
      planLabel: getPlanLabel(clinicType, planKey),
      planPrice: getPlanPrice(clinicType, planKey),
      isActive: clinic.planStatus === 'active',
      isFree: isFree || clinic.planStatus === 'free',
      isGracePeriod: clinic.planStatus === 'grace_period' && isGracePeriod,
      isExpired: clinic.planStatus === 'expired' || (clinic.planStatus === 'grace_period' && !isGracePeriod),
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      features: config.features || {},
      visibleSections: config.visibleSections || {},
      limits: config.limits || {},
      maxDoctors: config.maxDoctors,
      maxReceptionists: config.maxReceptionists,
      maxPharmacists: config.maxPharmacists,
      maxNurses: config.maxNurses,
      maxLabTechnicians: config.maxLabTechnicians,
      maxStaff: config.maxStaff,
    };
  },

  /**
   * Get available plans for a clinic type
   */
  getAvailablePlans(clinicType) {
    return getAvailablePlans(clinicType);
  },

  /**
   * Get paid plans only (excludes free)
   */
  getPaidPlans(clinicType) {
    return getPaidPlans(clinicType);
  },

  /**
   * Calculate prorated amount for plan upgrade
   */
  calculateProratedUpgrade(clinicType, currentPlan, newPlan, daysRemaining) {
    const currentPrice = getPlanPrice(clinicType, currentPlan);
    const newPrice = getPlanPrice(clinicType, newPlan);
    
    if (currentPlan === newPlan) return 0;
    if (currentPrice >= newPrice) return 0;

    // Calculate daily rate difference
    const dailyDiff = (newPrice - currentPrice) / 30;
    const proratedAmount = dailyDiff * daysRemaining;

    return Math.ceil(proratedAmount);
  },

  /**
   * Upgrade clinic plan with prorated billing
   */
  async upgradePlan(clinicId, newPlan, paymentMethod = 'card', paymentId = null) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const clinicType = clinic.type || 'clinic';
    const currentPlan = clinic.plan || 'free';
    
    if (currentPlan === newPlan) {
      throw new Error('Already on this plan');
    }

    // Check if plan upgrade is allowed
    const planOrder = clinicType === 'hospital' 
      ? ['free', 'standard', 'enterprise'] 
      : ['free', 'lite', 'plus', 'pro'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const newIndex = planOrder.indexOf(newPlan);
    
    if (newIndex < currentIndex) {
      throw new Error('Downgrade not supported. Please contact support.');
    }

    // Calculate prorated amount (only if upgrading from a paid plan)
    let proratedAmount = 0;
    let daysRemaining = 0;
    
    if (currentPlan !== 'free') {
      daysRemaining = await this.getRemainingDays(clinicId);
      proratedAmount = this.calculateProratedUpgrade(clinicType, currentPlan, newPlan, daysRemaining);
    } else {
      // From free plan - charge full price
      proratedAmount = getPlanPrice(clinicType, newPlan);
    }

    // Generate payment ID if not provided
    const finalPaymentId = paymentId || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Update clinic plan
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // If current plan is in grace period, reset from today
    const isGracePeriod = clinic.planStatus === 'grace_period';
    const startDate = isGracePeriod ? now : new Date(clinic.planActivatedAt || now);
    
    clinic.previousPlan = clinic.plan;
    clinic.plan = newPlan;
    clinic.planActivatedAt = now.toISOString().split('T')[0];
    clinic.planExpiresAt = expiresAt.toISOString().split('T')[0];
    clinic.planStatus = 'active';
    clinic.gracePeriodEndsAt = null;
    clinic.isDataLocked = false;
    await clinic.save();

    // Update subscription record
    let subscription = await Subscription.findOne({ clinicId });
    if (!subscription) {
      subscription = new Subscription({
        clinicId,
        stripeCustomerId: `cust_${Date.now()}`,
        plan: newPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
      });
    } else {
      subscription.plan = newPlan;
      subscription.status = 'active';
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = expiresAt;
      subscription.cancelAtPeriodEnd = false;
      subscription.canceledAt = null;
    }
    await subscription.save();

    return {
      success: true,
      clinic,
      subscription,
      upgrade: {
        fromPlan: currentPlan,
        toPlan: newPlan,
        proratedAmount,
        paymentId: finalPaymentId,
        paymentMethod,
        daysRemaining: await this.getRemainingDays(clinicId),
        nextBillingDate: expiresAt.toISOString().split('T')[0],
        paidAmount: proratedAmount > 0 ? proratedAmount : getPlanPrice(clinicType, newPlan),
      }
    };
  },

  /**
   * Get remaining days for a clinic
   */
  async getRemainingDays(clinicId) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return 0;
    
    // If free plan, return 0
    if (!clinic.plan || clinic.plan === 'free') return 0;

    const now = new Date();
    let targetDate = clinic.planExpiresAt ? new Date(clinic.planExpiresAt) : null;
    
    if (clinic.planStatus === 'grace_period' && clinic.gracePeriodEndsAt) {
      targetDate = new Date(clinic.gracePeriodEndsAt);
    }

    if (!targetDate) return 0;
    const diff = targetDate - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  /**
   * Check and handle plan expiration
   */
  async handleExpiredPlan(clinicId) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const now = new Date();
    const planKey = clinic.plan || 'free';
    
    // Free plans never expire
    if (planKey === 'free') {
      return { status: 'active', clinic, isFree: true };
    }

    const expiresAt = clinic.planExpiresAt ? new Date(clinic.planExpiresAt) : null;

    if (!expiresAt || expiresAt > now) {
      return { 
        status: 'active', 
        clinic,
        daysRemaining: expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0
      };
    }

    // Plan is expired - check grace period
    if (clinic.planStatus === 'grace_period') {
      const graceEndsAt = clinic.gracePeriodEndsAt ? new Date(clinic.gracePeriodEndsAt) : null;
      
      if (graceEndsAt && graceEndsAt > now) {
        const daysRemaining = Math.ceil((graceEndsAt - now) / (1000 * 60 * 60 * 24));
        return { 
          status: 'grace_period', 
          clinic, 
          daysRemaining,
          graceEndsAt: clinic.gracePeriodEndsAt 
        };
      }

      // Grace period ended - lock data
      clinic.planStatus = 'expired';
      clinic.isDataLocked = true;
      clinic.gracePeriodEndsAt = null;
      await clinic.save();

      // Update subscription
      await Subscription.findOneAndUpdate(
        { clinicId },
        { status: 'canceled' }
      );

      return { 
        status: 'expired', 
        clinic, 
        dataLocked: true,
        message: 'Plan expired. Please renew to access all features.'
      };
    }

    // First time expiration - enter grace period
    if (clinic.planStatus === 'active') {
      clinic.planStatus = 'grace_period';
      const graceEndsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      clinic.gracePeriodEndsAt = graceEndsAt.toISOString().split('T')[0];
      await clinic.save();

      return { 
        status: 'grace_period', 
        clinic, 
        daysRemaining: 10,
        graceEndsAt: clinic.gracePeriodEndsAt,
        message: 'Plan expired. You have 10 days grace period to renew.'
      };
    }

    return { status: 'expired', clinic };
  },

  /**
   * Renew expired plan
   */
  async renewPlan(clinicId, plan, paymentMethod = 'card') {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new Error('Clinic not found');

    const planKey = plan || clinic.plan || 'free';
    
    // If renewing to free plan, just reset
    if (planKey === 'free') {
      clinic.plan = 'free';
      clinic.planActivatedAt = null;
      clinic.planExpiresAt = null;
      clinic.planStatus = 'free';
      clinic.gracePeriodEndsAt = null;
      clinic.isDataLocked = false;
      await clinic.save();
      return {
        success: true,
        clinic,
        message: 'Reverted to free plan'
      };
    }

    if (!clinic.isDataLocked && clinic.planStatus !== 'grace_period' && clinic.planStatus !== 'expired') {
      throw new Error('Plan is still active. Use upgrade instead.');
    }

    const clinicType = clinic.type || 'clinic';
    const planPrice = getPlanPrice(clinicType, planKey);
    
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Generate payment ID
    const paymentId = `RENEW-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Unlock data and reactivate plan
    clinic.plan = planKey;
    clinic.planActivatedAt = now.toISOString().split('T')[0];
    clinic.planExpiresAt = expiresAt.toISOString().split('T')[0];
    clinic.planStatus = 'active';
    clinic.gracePeriodEndsAt = null;
    clinic.isDataLocked = false;
    await clinic.save();

    // Update subscription
    let subscription = await Subscription.findOne({ clinicId });
    if (!subscription) {
      subscription = new Subscription({
        clinicId,
        stripeCustomerId: `cust_${Date.now()}`,
        plan: planKey,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
      });
    } else {
      subscription.plan = planKey;
      subscription.status = 'active';
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = expiresAt;
      subscription.cancelAtPeriodEnd = false;
      subscription.canceledAt = null;
    }
    await subscription.save();

    return {
      success: true,
      clinic,
      subscription,
      payment: {
        paymentId,
        amount: planPrice,
        paymentMethod,
        paidAt: now,
      },
      renewedAt: now,
      nextBillingDate: expiresAt.toISOString().split('T')[0],
    };
  },

  /**
   * Check if clinic has access to a feature
   */
  hasFeature(clinic, feature) {
    const clinicType = clinic.type || 'clinic';
    const planKey = clinic.plan || 'free';
    const config = getPlanConfig(clinicType, planKey);
    return config.features?.[feature] === true;
  },

  /**
   * Check if clinic can add more resources
   */
  canAddResource(clinic, resourceType, currentCount) {
    const clinicType = clinic.type || 'clinic';
    const planKey = clinic.plan || 'free';
    const config = getPlanConfig(clinicType, planKey);
    const limits = config.limits || {};
    
    const limitMap = {
      patients: limits.patients,
      staff: limits.staff,
      doctors: limits.doctors,
      beds: limits.beds,
    };
    
    const limit = limitMap[resourceType];
    if (limit === undefined) return true;
    if (limit === -1) return true;
    
    return currentCount < limit;
  },

  /**
   * Get feature status for a clinic
   */
  getFeatureStatus(clinic) {
    const clinicType = clinic.type || 'clinic';
    const planKey = clinic.plan || 'free';
    const config = getPlanConfig(clinicType, planKey);
    
    return {
      features: config.features || {},
      visibleSections: config.visibleSections || {},
      limits: config.limits || {},
      maxStaff: config.maxStaff,
      maxDoctors: config.maxDoctors,
      maxReceptionists: config.maxReceptionists,
      maxPharmacists: config.maxPharmacists,
      maxNurses: config.maxNurses,
      maxLabTechnicians: config.maxLabTechnicians,
    };
  },

  /**
   * Get Stripe plan mapping
   */
  getStripePlans() {
    return STRIPE_PLANS;
  },

  /**
   * Get plan key from Stripe price ID
   */
  getPlanKeyFromPriceId(priceId) {
    return getPlanKeyByPriceId(priceId);
  },

  /**
   * Check if a clinic has a paid plan
   */
  isPaidPlan(clinic) {
    const planKey = clinic.plan || 'free';
    return planKey !== 'free';
  },

  /**
   * Check if a plan key is free
   */
  isFreePlan(planKey) {
    return isFreePlan(planKey);
  },

  /**
   * Get plan config for a clinic
   */
  getClinicPlanConfig(clinic) {
    const clinicType = clinic.type || 'clinic';
    const planKey = clinic.plan || 'free';
    return getPlanConfig(clinicType, planKey);
  }
};

export default planService;