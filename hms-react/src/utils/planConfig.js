// hms-react/src/utils/planConfig.js

export const PLAN_CONFIGS = {
  // ── CLINIC PLANS ──
  clinic: {
    // ── FREE PLAN (No plan) ──
    free: {
      label: 'Free Plan',
      price: 0,
      maxDoctors: 1,
      maxReceptionists: 1,
      maxPharmacists: 0,
      maxNurses: 0,
      maxLabTechnicians: 0,
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
        inventory: false,
        lab: false,
        ipd: false,
        emergency: false,
        tasks: false,
      },
      limits: {
        patients: 50,
        staff: 2,
        doctors: 1,
      }
    },
    lite: {
      label: 'Clinic Lite',
      price: 999,
      maxDoctors: 3,
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
        inventory: false,
        lab: false,
        ipd: false,
        emergency: false,
        tasks: false,
      },
      limits: {
        patients: 100,
        staff: 5,
        doctors: 3,
      }
    },
    plus: {
      label: 'Clinic Plus',
      price: 1499,
      maxDoctors: -1,
      maxReceptionists: -1,
      maxPharmacists: 2,
      maxNurses: 0,
      maxLabTechnicians: 0,
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
        followUps: true,
        settings: true,
        pharmacists: true,
        revenue: true,
        inventory: false,
        lab: false,
        ipd: false,
        emergency: false,
        tasks: false,
      },
      limits: {
        patients: 500,
        staff: 20,
        doctors: -1,
      }
    },
    pro: {
      label: 'Clinic Pro',
      price: 1999,
      maxDoctors: -1,
      maxReceptionists: -1,
      maxPharmacists: -1,
      maxNurses: 0,
      maxLabTechnicians: 0,
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
        inventory: true,
        lab: true,
        ipd: true,
        emergency: true,
        tasks: true,
      },
      limits: {
        patients: 2000,
        staff: 100,
        doctors: -1,
      }
    }
  },

  // ── HOSPITAL PLANS ──
  hospital: {
    free: {
      label: 'Free Plan',
      price: 0,
      maxDoctors: 1,
      maxReceptionists: 1,
      maxPharmacists: 0,
      maxNurses: 0,
      maxLabTechnicians: 0,
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
        inventory: false,
        lab: false,
        ipd: false,
        emergency: false,
        tasks: false,
        bedManagement: false,
        operationTheatre: false,
        ambulance: false,
        bloodBank: false,
        aiAnalytics: false,
      },
      limits: {
        patients: 50,
        staff: 2,
        doctors: 1,
        beds: 5,
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
        inventory: true,
        lab: true,
        ipd: true,
        emergency: true,
        tasks: true,
        bedManagement: true,
        operationTheatre: false,
        ambulance: false,
        bloodBank: false,
        aiAnalytics: false,
      },
      limits: {
        patients: 5000,
        staff: 50,
        doctors: 20,
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
        inventory: true,
        lab: true,
        ipd: true,
        emergency: true,
        tasks: true,
        bedManagement: true,
        operationTheatre: true,
        ambulance: true,
        bloodBank: true,
        aiAnalytics: true,
      },
      limits: {
        patients: -1,
        staff: -1,
        doctors: -1,
        beds: -1,
      }
    }
  }
};

// ── Helper Functions ──
// hms-react/src/utils/planConfig.js - Updated getPlanConfig

export function getPlanConfig(planKey) {
  // Check clinic plans first
  const clinicPlans = PLAN_CONFIGS.clinic;
  if (clinicPlans[planKey]) {
    return clinicPlans[planKey];
  }
  
  // Check hospital plans
  const hospitalPlans = PLAN_CONFIGS.hospital;
  if (hospitalPlans[planKey]) {
    return hospitalPlans[planKey];
  }
  
  // Default to free plan
  return clinicPlans.free || clinicPlans.lite;
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

  // ── FIX: If maxCount is -1 (unlimited), always return allowed ──
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

// ── FIX: getUpgradePath function ──
function getUpgradePath(currentPlan) {
  const planOrder = ['free', 'lite', 'plus', 'pro'];
  const currentIndex = planOrder.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex >= planOrder.length - 1) {
    return null;
  }
  return planOrder[currentIndex + 1];
}

export function isFeatureVisible(clinicType, planKey, featureKey) {
  const config = getPlanConfig(clinicType, planKey);
  return config.features?.[featureKey] ?? false;
}

export function isSectionVisible(planKey, sectionKey) {
  // This function is called from AdminDashboard with just planKey and sectionKey
  // We need to determine clinicType from context or use clinic
  // For simplicity, we'll check both clinic and hospital configs
  const clinicConfig = getPlanConfig('clinic', planKey);
  const hospitalConfig = getPlanConfig('hospital', planKey);
  
  // Check if visible in either config
  const clinicVisible = clinicConfig.visibleSections?.[sectionKey] ?? false;
  const hospitalVisible = hospitalConfig.visibleSections?.[sectionKey] ?? false;
  
  // Return true if visible in either (most permissive)
  return clinicVisible || hospitalVisible;
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