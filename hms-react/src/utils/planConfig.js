// hms-react/src/utils/planConfig.js - Clinic Plans Only

export const PLAN_CONFIGS = {
  // ── FREE PLAN (No plan) ──
  free: {
    label: 'Free Plan',
    price: 0,
    maxDoctors: 1,
    maxReceptionists: 1,
    maxPharmacists: 0,
    maxStaff: 2,
    features: {
      patients: true,
      billing: false,
      pharmacy: false,
      inventory: false,
      lab: false,
      ipd: false,
      staff: false,
      telemedicine: false,
      prescriptions: false,
      tokens: true,
      emergency: false,
      tasks: false,
      reports: false,
    },
    visibleSections: {
      overview: true,
      doctors: false,
      receptionists: false,
      allPatients: true,
      followUps: false,
      settings: true,
      pharmacists: false,
      revenue: false,
    },
    limits: {
      patients: 50,
      staff: 2,
      doctors: 1,
      receptionists: 1,
    }
  },
  // ── LITE PLAN ──
  lite: {
    label: 'Clinic Lite',
    price: 999,
    maxDoctors: 3,
    maxReceptionists: 2,
    maxPharmacists: 0,
    maxStaff: 5,
    features: {
      patients: true,
      billing: false,
      pharmacy: false,
      inventory: false,
      lab: false,
      ipd: false,
      staff: false,
      telemedicine: false,
      prescriptions: false,
      tokens: true,
      emergency: false,
      tasks: false,
      reports: false,
    },
    visibleSections: {
      overview: true,
      doctors: true,
      receptionists: true,
      allPatients: true,
      followUps: false,
      settings: true,
      pharmacists: false,
      revenue: false,
    },
    limits: {
      patients: 100,
      staff: 5,
      doctors: 3,
      receptionists: 2,
    }
  },
  // ── PLUS PLAN ──
  plus: {
    label: 'Clinic Plus',
    price: 1499,
    maxDoctors: -1, // Unlimited
    maxReceptionists: -1,
    maxPharmacists: 2,
    maxStaff: -1,
    features: {
      patients: true,
      billing: true,
      pharmacy: true,
      inventory: false,
      lab: false,
      ipd: false,
      staff: true,
      telemedicine: false,
      prescriptions: true,
      tokens: true,
      emergency: false,
      tasks: false,
      reports: true,
    },
    visibleSections: {
      overview: true,
      doctors: true,
      receptionists: true,
      allPatients: true,
      followUps: false,
      settings: true,
      pharmacists: true,
      revenue: true,
    },
    limits: {
      patients: 500,
      staff: 20,
      doctors: -1,
      receptionists: -1,
    }
  },
  // ── PRO PLAN ──
  pro: {
    label: 'Clinic Pro',
    price: 1999,
    maxDoctors: -1,
    maxReceptionists: -1,
    maxPharmacists: -1,
    maxStaff: -1,
    features: {
      patients: true,
      billing: true,
      pharmacy: true,
      inventory: true,
      lab: true,
      ipd: true,
      staff: true,
      telemedicine: true,
      prescriptions: true,
      tokens: true,
      emergency: true,
      tasks: true,
      reports: true,
    },
    visibleSections: {
      overview: true,
      doctors: true,
      receptionists: true,
      allPatients: true,
      followUps: true,
      settings: true,
      pharmacists: true,
      revenue: true,
    },
    limits: {
      patients: 2000,
      staff: 100,
      doctors: -1,
      receptionists: -1,
    }
  }
};

// ── Helper Functions ──

/**
 * Get plan configuration by plan key
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {object} Plan configuration
 */
export function getPlanConfig(planKey) {
  // If planKey is null, undefined, or 'free', return free plan
  if (!planKey || planKey === 'free') {
    return PLAN_CONFIGS.free;
  }
  return PLAN_CONFIGS[planKey] || PLAN_CONFIGS.free;
}

/**
 * Get all available plans
 * @returns {array} Array of plan objects with id
 */
export function getAvailablePlans() {
  return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
    id: key,
    ...config,
  }));
}

/**
 * Get only paid plans (excludes free)
 * @returns {array} Array of paid plan objects with id
 */
export function getPaidPlans() {
  return Object.entries(PLAN_CONFIGS)
    .filter(([key, config]) => key !== 'free' && config.price > 0)
    .map(([key, config]) => ({
      id: key,
      ...config,
    }));
}

/**
 * Check if a staff role can be added based on plan limits
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @param {string} roleType - 'doctors', 'receptionists', 'pharmacists', 'staff'
 * @param {number} currentCount - Current count of this role
 * @returns {object} { allowed, limit, upgradeNeeded, message }
 */
export function canAddStaff(planKey, roleType, currentCount) {
  const config = getPlanConfig(planKey);
  
  let maxCount = 0;
  switch (roleType) {
    case 'doctors':
      maxCount = config.maxDoctors;
      break;
    case 'receptionists':
      maxCount = config.maxReceptionists;
      break;
    case 'pharmacists':
      maxCount = config.maxPharmacists;
      break;
    case 'staff':
      maxCount = config.maxStaff;
      break;
    default:
      return { allowed: true, limit: -1, upgradeNeeded: null };
  }

  // Unlimited
  if (maxCount === -1) {
    return { allowed: true, limit: -1, upgradeNeeded: null };
  }

  const allowed = currentCount < maxCount;
  const upgradeNeeded = allowed ? null : getUpgradePath(planKey);
  
  return { 
    allowed, 
    limit: maxCount, 
    upgradeNeeded,
    message: allowed ? '' : `You've reached the limit of ${maxCount} ${roleType}. Upgrade to add more.`
  };
}

/**
 * Get the next plan in the upgrade path
 * @param {string} currentPlan - 'free', 'lite', 'plus', 'pro'
 * @returns {string|null} Next plan key or null if at highest plan
 */
function getUpgradePath(currentPlan) {
  const planOrder = ['free', 'lite', 'plus', 'pro'];
  const currentIndex = planOrder.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex >= planOrder.length - 1) {
    return null;
  }
  return planOrder[currentIndex + 1];
}

/**
 * Check if a section is visible in the current plan
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @param {string} sectionKey - 'overview', 'doctors', 'receptionists', etc.
 * @returns {boolean} True if section is visible
 */
export function isSectionVisible(planKey, sectionKey) {
  const config = getPlanConfig(planKey);
  return config.visibleSections?.[sectionKey] ?? false;
}

/**
 * Check if a feature is available in the current plan
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @param {string} featureKey - 'patients', 'billing', 'pharmacy', etc.
 * @returns {boolean} True if feature is available
 */
export function isFeatureVisible(planKey, featureKey) {
  const config = getPlanConfig(planKey);
  return config.features?.[featureKey] ?? false;
}

/**
 * Get plan limits for a specific plan
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {object} Limits object
 */
export function getPlanLimits(planKey) {
  const config = getPlanConfig(planKey);
  return config.limits || { patients: 0, staff: 0, doctors: 0, receptionists: 0 };
}

/**
 * Get plan price
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {number} Price in INR
 */
export function getPlanPrice(planKey) {
  if (!planKey || planKey === 'free') return 0;
  const config = getPlanConfig(planKey);
  return config.price || 0;
}

/**
 * Get plan label
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {string} Plan label
 */
export function getPlanLabel(planKey) {
  if (!planKey || planKey === 'free') return 'Free Plan';
  const config = getPlanConfig(planKey);
  return config.label || 'Free Plan';
}

/**
 * Get plan features
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {object} Features object
 */
export function getPlanFeatures(planKey) {
  const config = getPlanConfig(planKey);
  return config.features || {};
}

/**
 * Get visible sections for a plan
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {object} Visible sections object
 */
export function getPlanVisibleSections(planKey) {
  const config = getPlanConfig(planKey);
  return config.visibleSections || {};
}

/**
 * Check if a plan is free
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {boolean} True if plan is free
 */
export function isFreePlan(planKey) {
  return !planKey || planKey === 'free';
}

/**
 * Check if a plan is paid
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @returns {boolean} True if plan is paid
 */
export function isPaidPlan(planKey) {
  return planKey && planKey !== 'free';
}

/**
 * Get the next plan in upgrade path
 * @param {string} currentPlan - 'free', 'lite', 'plus', 'pro'
 * @returns {string|null} Next plan or null
 */
export const PLAN_UPGRADE_PATH = {
  free: 'lite',
  lite: 'plus',
  plus: 'pro',
  pro: null,
};

export function getNextPlan(currentPlan) {
  return PLAN_UPGRADE_PATH[currentPlan] || null;
}

/**
 * Get max count for a specific role type
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro'
 * @param {string} roleType - 'doctors', 'receptionists', 'pharmacists', 'staff'
 * @returns {number} Max count (-1 for unlimited)
 */
export function getMaxCount(planKey, roleType) {
  const config = getPlanConfig(planKey);
  switch (roleType) {
    case 'doctors':
      return config.maxDoctors;
    case 'receptionists':
      return config.maxReceptionists;
    case 'pharmacists':
      return config.maxPharmacists;
    case 'staff':
      return config.maxStaff;
    default:
      return 0;
  }
}

// ── Default export ──
export default {
  PLAN_CONFIGS,
  getPlanConfig,
  getAvailablePlans,
  getPaidPlans,
  canAddStaff,
  isSectionVisible,
  isFeatureVisible,
  getPlanLimits,
  getPlanPrice,
  getPlanLabel,
  getPlanFeatures,
  getPlanVisibleSections,
  isFreePlan,
  isPaidPlan,
  getNextPlan,
  getMaxCount,
  PLAN_UPGRADE_PATH,
};