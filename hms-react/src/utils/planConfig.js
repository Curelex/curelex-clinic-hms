// hms-react/src/utils/planConfig.js - Fixed Version

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

// ── HOSPITAL PLANS ──
export const HOSPITAL_PLAN_CONFIGS = {
  free: {
    label: 'Free Plan',
    price: 0,
    maxDoctors: 2,
    maxReceptionists: 2,
    maxPharmacists: 0,
    maxNurses: 0,
    maxLabTechnicians: 0,
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
      multiDepartment: false,
      bedManagement: false,
      ambulance: false,
      bloodBank: false,
      aiAnalytics: false,
      customReports: false,
      icu: false,
      ot: false,
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
  lab: false,
  ipd: false,
  emergency: false,
  tasks: false,
  bedManagement: false,
  billing: false,
  prescriptions: false,
  telemedicine: false,   // ← add
  inventory: false,      // ← add
  staff: false,          // ← add
  tokens: true,          // ← add (tokens feature is true even on free)
  pharmacy: false,
  icu: false,
        ot: false,
    },
    limits: {
      patients: 100,
      staff: 5,
      doctors: 2,
      receptionists: 2,
      beds: 10,
    }
  },
  standard: {
    label: 'Standard Hospital Plan',
    price: 4999,
    maxDoctors: 20,
    maxReceptionists: 10,
    maxPharmacists: 5,
    maxNurses: 15,
    maxLabTechnicians: 5,
    maxStaff: 50,
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
      multiDepartment: true,
      bedManagement: true,
      ambulance: false,
      bloodBank: false,
      aiAnalytics: false,
      customReports: false,
      icu: false,
        ot: false,
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
  lab: false,
  ipd: true,
  emergency: true,
  tasks: true,
  bedManagement: true,
  billing: false,
  prescriptions: true,
  telemedicine: false,    // ← add
  inventory: true,       // ← add
  staff: true,           // ← add
  tokens: true,          // ← add
  pharmacy: false,
  icu: false,
        ot: false,
    },
    limits: {
      patients: 5000,
      staff: 50,
      doctors: 20,
      receptionists: 10,
      beds: 50,
    }
  },
  enterprise: {
    label: 'Enterprise Hospital Plan',
    price: 6999,
    maxDoctors: -1,
    maxReceptionists: -1,
    maxPharmacists: -1,
    maxNurses: -1,
    maxLabTechnicians: -1,
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
      multiDepartment: true,
      bedManagement: true,
      ambulance: true,
      bloodBank: true,
      aiAnalytics: true,
      customReports: true,
      icu: true,
        ot: true,
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
  lab: true,
  ipd: true,
  emergency: true,
  tasks: true,
  bedManagement: true,
  billing: true,
  prescriptions: true,
  ambulance: true,
  bloodBank: true,
  aiAnalytics: true,
  telemedicine: true,    // ← add
  inventory: true,       // ← add
  staff: true,           // ← add
  tokens: true,          // ← add
  pharmacy: true,        // ← add
icu: true,
        ot: true,
    },
    limits: {
      patients: -1,
      staff: -1,
      doctors: -1,
      receptionists: -1,
      beds: -1,
    }
  }
};

// ── Helper Functions ──

/**
 * Get plan configuration by plan key and clinic type
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - 'free', 'lite', 'plus', 'pro' (for clinic) or 'free', 'standard', 'enterprise' (for hospital)
 * @returns {object} Plan configuration
 */
export function getPlanConfig(clinicType, planKey) {
  // If planKey is null, undefined, or 'none', return free plan
  const effectivePlan = (!planKey || planKey === 'none') ? 'free' : planKey;
  
  if (clinicType === 'hospital') {
    const config = HOSPITAL_PLAN_CONFIGS[effectivePlan];
    return config || HOSPITAL_PLAN_CONFIGS.free;
  }
  
  // Default to clinic plans
  const config = PLAN_CONFIGS[effectivePlan];
  return config || PLAN_CONFIGS.free;
}

/**
 * Get all available plans for a clinic type
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @returns {array} Array of plan objects with id
 */
export function getAvailablePlans(clinicType) {
  if (clinicType === 'hospital') {
    return Object.entries(HOSPITAL_PLAN_CONFIGS).map(([key, config]) => ({
      id: key,
      ...config,
    }));
  }
  return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
    id: key,
    ...config,
  }));
}

/**
 * Get only paid plans (excludes free)
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @returns {array} Array of paid plan objects with id
 */
export function getPaidPlans(clinicType) {
  const plans = clinicType === 'hospital' ? HOSPITAL_PLAN_CONFIGS : PLAN_CONFIGS;
  return Object.entries(plans)
    .filter(([key, config]) => key !== 'free' && config.price > 0)
    .map(([key, config]) => ({
      id: key,
      ...config,
    }));
}

/**
 * Check if a staff role can be added based on plan limits
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @param {string} roleType - 'doctors', 'receptionists', 'pharmacists', 'staff'
 * @param {number} currentCount - Current count of this role
 * @returns {object} { allowed, limit, upgradeNeeded, message }
 */
export function canAddStaff(clinicType, planKey, roleType, currentCount) {
  const config = getPlanConfig(clinicType, planKey);
  
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
    case 'nurses':
      maxCount = config.maxNurses || 0;
      break;
    case 'labTechnicians':
      maxCount = config.maxLabTechnicians || 0;
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
  const upgradeNeeded = allowed ? null : getUpgradePath(clinicType, planKey);
  
  return { 
    allowed, 
    limit: maxCount, 
    upgradeNeeded,
    message: allowed ? '' : `You've reached the limit of ${maxCount} ${roleType}. Upgrade to add more.`
  };
}

/**
 * Get the next plan in the upgrade path
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} currentPlan - Current plan key
 * @returns {string|null} Next plan key or null if at highest plan
 */
function getUpgradePath(clinicType, currentPlan) {
  const planOrder = clinicType === 'hospital' 
    ? ['free', 'standard', 'enterprise'] 
    : ['free', 'lite', 'plus', 'pro'];
  const currentIndex = planOrder.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex >= planOrder.length - 1) {
    return null;
  }
  return planOrder[currentIndex + 1];
}

/**
 * Check if a section is visible in the current plan
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @param {string} sectionKey - Section key
 * @returns {boolean} True if section is visible
 */
export function isSectionVisible(clinicType, planKey, sectionKey) {
  const effectivePlan = (!planKey || planKey === 'none') ? 'free' : planKey;
  const config = getPlanConfig(clinicType, effectivePlan);
  const visible = config.visibleSections?.[sectionKey] ?? false;
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 isSectionVisible: clinicType=${clinicType}, plan=${effectivePlan}, section=${sectionKey}, visible=${visible}`);
  }
  
  return visible;
}

/**
 * Check if a feature is available in the current plan
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @param {string} featureKey - Feature key
 * @returns {boolean} True if feature is available
 */
export function isFeatureVisible(clinicType, planKey, featureKey) {
  const effectivePlan = (!planKey || planKey === 'none') ? 'free' : planKey;
  const config = getPlanConfig(clinicType, effectivePlan);
  return config.features?.[featureKey] ?? false;
}

/**
 * Get plan limits for a specific plan
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @returns {object} Limits object
 */
export function getPlanLimits(clinicType, planKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.limits || { patients: 0, staff: 0, doctors: 0, receptionists: 0 };
}

/**
 * Get plan price
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @returns {number} Price in INR
 */
export function getPlanPrice(clinicType, planKey) {
  if (!planKey || planKey === 'free' || planKey === 'none') return 0;
  const config = getPlanConfig(clinicType, planKey);
  return config.price || 0;
}

/**
 * Get plan label
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @returns {string} Plan label
 */
export function getPlanLabel(clinicType, planKey) {
  if (!planKey || planKey === 'free' || planKey === 'none') return 'Free Plan';
  const config = getPlanConfig(clinicType, planKey);
  return config.label || 'Free Plan';
}

/**
 * Get plan features
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @returns {object} Features object
 */
export function getPlanFeatures(clinicType, planKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.features || {};
}

/**
 * Get visible sections for a plan
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @returns {object} Visible sections object
 */
export function getPlanVisibleSections(clinicType, planKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.visibleSections || {};
}

/**
 * Check if a plan is free
 * @param {string} planKey - Plan key
 * @returns {boolean} True if plan is free
 */
export function isFreePlan(planKey) {
  return !planKey || planKey === 'free' || planKey === 'none';
}

/**
 * Check if a plan is paid
 * @param {string} planKey - Plan key
 * @returns {boolean} True if plan is paid
 */
export function isPaidPlan(planKey) {
  return planKey && planKey !== 'free' && planKey !== 'none';
}

/**
 * Get the next plan in upgrade path
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} currentPlan - Current plan key
 * @returns {string|null} Next plan or null
 */
export const PLAN_UPGRADE_PATH = {
  clinic: {
    free: 'lite',
    lite: 'plus',
    plus: 'pro',
    pro: null,
  },
  hospital: {
    free: 'standard',
    standard: 'enterprise',
    enterprise: null,
  },
};

export function getNextPlan(clinicType, currentPlan) {
  const paths = PLAN_UPGRADE_PATH[clinicType] || PLAN_UPGRADE_PATH.clinic;
  return paths[currentPlan] || null;
}

/**
 * Get max count for a specific role type
 * @param {string} clinicType - 'clinic' or 'hospital'
 * @param {string} planKey - Plan key
 * @param {string} roleType - 'doctors', 'receptionists', 'pharmacists', 'staff'
 * @returns {number} Max count (-1 for unlimited)
 */
export function getMaxCount(clinicType, planKey, roleType) {
  const config = getPlanConfig(clinicType, planKey);
  switch (roleType) {
    case 'doctors':
      return config.maxDoctors;
    case 'receptionists':
      return config.maxReceptionists;
    case 'pharmacists':
      return config.maxPharmacists;
    case 'nurses':
      return config.maxNurses || 0;
    case 'labTechnicians':
      return config.maxLabTechnicians || 0;
    case 'staff':
      return config.maxStaff;
    default:
      return 0;
  }
}

// ── Default export ──
export default {
  PLAN_CONFIGS,
  HOSPITAL_PLAN_CONFIGS,
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