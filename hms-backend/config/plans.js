// hms-backend/config/planConfig.js - Add Hospital Plans

export const PLAN_CONFIGS = {
  // ── CLINIC PLANS (Keep existing) ──
  clinic: {
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
      },
      stripePriceId: null,
    },
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
      },
      stripePriceId: process.env.STRIPE_PRICE_LITE || null,
    },
    plus: {
      label: 'Clinic Plus',
      price: 1499,
      maxDoctors: -1,
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
      },
      stripePriceId: process.env.STRIPE_PRICE_PLUS || null,
    },
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
      },
      stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    }
  },

  // ── HOSPITAL PLANS ──
  hospital: {
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
        operationTheatre: false,
        ambulance: false,
        bloodBank: false,
        aiAnalytics: false,
        customReports: false,
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
      },
      limits: {
        patients: 100,
        staff: 5,
        doctors: 2,
        receptionists: 2,
        beds: 10,
      },
      stripePriceId: null,
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
        operationTheatre: false,
        ambulance: false,
        bloodBank: false,
        aiAnalytics: false,
        customReports: false,
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
      },
      limits: {
        patients: 5000,
        staff: 50,
        doctors: 20,
        receptionists: 10,
        beds: 50,
      },
      stripePriceId: process.env.STRIPE_PRICE_HOSPITAL_STANDARD || null,
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
        operationTheatre: true,
        ambulance: true,
        bloodBank: true,
        aiAnalytics: true,
        customReports: true,
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
        operationTheatre: true,
        ambulance: true,
        bloodBank: true,
        aiAnalytics: true,
      },
      limits: {
        patients: -1,
        staff: -1,
        doctors: -1,
        receptionists: -1,
        beds: -1,
      },
      stripePriceId: process.env.STRIPE_PRICE_HOSPITAL_ENTERPRISE || null,
    }
  }
};

// ── Stripe Plan Mapping ──
export const STRIPE_PLANS = {
  // Clinic plans
  free: { name: 'Free Plan', priceId: null, amount: 0, currency: 'inr', interval: 'month' },
  lite: { name: 'Clinic Lite', priceId: process.env.STRIPE_PRICE_LITE || null, amount: 99900, currency: 'inr', interval: 'month' },
  plus: { name: 'Clinic Plus', priceId: process.env.STRIPE_PRICE_PLUS || null, amount: 149900, currency: 'inr', interval: 'month' },
  pro: { name: 'Clinic Pro', priceId: process.env.STRIPE_PRICE_PRO || null, amount: 199900, currency: 'inr', interval: 'month' },
  // Hospital plans
  standard: { name: 'Standard Hospital', priceId: process.env.STRIPE_PRICE_HOSPITAL_STANDARD || null, amount: 499900, currency: 'inr', interval: 'month' },
  enterprise: { name: 'Enterprise Hospital', priceId: process.env.STRIPE_PRICE_HOSPITAL_ENTERPRISE || null, amount: 699900, currency: 'inr', interval: 'month' },
};

// ── Helper Functions ──

export function getPlanConfig(clinicType, planKey) {
  const typeConfigs = PLAN_CONFIGS[clinicType] || PLAN_CONFIGS.clinic;
  if (!planKey || planKey === 'free') {
    return typeConfigs.free || typeConfigs.lite;
  }
  return typeConfigs[planKey] || typeConfigs.free || typeConfigs.lite;
}

export function getAvailablePlans(clinicType) {
  const typeConfigs = PLAN_CONFIGS[clinicType] || PLAN_CONFIGS.clinic;
  return Object.entries(typeConfigs).map(([key, config]) => ({
    id: key,
    ...config,
  }));
}

export function getPaidPlans(clinicType) {
  const typeConfigs = PLAN_CONFIGS[clinicType] || PLAN_CONFIGS.clinic;
  return Object.entries(typeConfigs)
    .filter(([key, config]) => key !== 'free' && config.price > 0)
    .map(([key, config]) => ({
      id: key,
      ...config,
    }));
}

export function getPlanByPriceId(priceId) {
  if (!priceId) return null;
  return Object.values(STRIPE_PLANS).find((p) => p.priceId === priceId) ?? null;
}

export function getPlanKeyByPriceId(priceId) {
  if (!priceId) return null;
  return Object.keys(STRIPE_PLANS).find(
    (key) => STRIPE_PLANS[key].priceId === priceId
  ) ?? null;
}

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

export function isSectionVisible(clinicType, planKey, sectionKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.visibleSections?.[sectionKey] ?? false;
}

export function isFeatureAvailable(clinicType, planKey, featureKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.features?.[featureKey] ?? false;
}

export function getPlanLimits(clinicType, planKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.limits || { patients: 0, staff: 0, doctors: 0 };
}

export function getPlanPrice(clinicType, planKey) {
  if (!planKey || planKey === 'free') return 0;
  const config = getPlanConfig(clinicType, planKey);
  return config.price || 0;
}

export function getPlanLabel(clinicType, planKey) {
  if (!planKey || planKey === 'free') return 'Free Plan';
  const config = getPlanConfig(clinicType, planKey);
  return config.label || 'Free Plan';
}

export function getPlanFeatures(clinicType, planKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.features || {};
}

export function getPlanVisibleSections(clinicType, planKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.visibleSections || {};
}

export function isFreePlan(clinicType, planKey) {
  return !planKey || planKey === 'free';
}

export function isPaidPlan(clinicType, planKey) {
  return planKey && planKey !== 'free';
}

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

export function getStripePlans() {
  return STRIPE_PLANS;
}

export default {
  PLAN_CONFIGS,
  STRIPE_PLANS,
  getPlanConfig,
  getAvailablePlans,
  getPaidPlans,
  getPlanByPriceId,
  getPlanKeyByPriceId,
  canAddStaff,
  isSectionVisible,
  isFeatureAvailable,
  getPlanLimits,
  getPlanPrice,
  getPlanLabel,
  getPlanFeatures,
  getPlanVisibleSections,
  isFreePlan,
  isPaidPlan,
  getNextPlan,
  getStripePlans,
};