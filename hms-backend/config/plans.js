// hms-backend/config/plans.js

export const PLAN_CONFIGS = {
  // ── CLINIC PLANS ──
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
        icu: false,
        ot: false,
      },
      limits: {
        patients: 100,
        staff: 5,
        doctors: 2,
        receptionists: 2,
        beds: 10,
      },
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
        lab: true,
        ipd: true,
        emergency: true,
        tasks: true,
        bedManagement: true,
        billing: true,
        prescriptions: true,
        icu: false,
        ot: false,
      },
      limits: {
        patients: 5000,
        staff: 50,
        doctors: 20,
        receptionists: 10,
        beds: 50,
      },
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
        icu: true,
        ot: true,
      },
      limits: {
        patients: -1,
        staff: -1,
        doctors: -1,
        receptionists: -1,
        beds: -1,
      },
      
    }
  }
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


export default {
  PLAN_CONFIGS,
  getPlanConfig,
  getAvailablePlans,
  getPaidPlans,
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
  
};