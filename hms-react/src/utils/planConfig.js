// src/utils/planConfig.js

export const PLAN_CONFIG = {
  lite: {
    key: 'lite',
    name: 'Clinic Lite',
    visibleSections: [
      'overview', 'doctors', 'receptionists', 'allPatients',
      'settings',        // ← was missing! Lite users need Settings
    ],
    maxDoctors: 3,
    maxReceptionists: 2,
    maxPharmacists: 0,
  },
  plus: {
    key: 'plus',
    name: 'Clinic Plus',
    visibleSections: [
      'overview', 'doctors', 'receptionists', 'allPatients',
      'followUps', 'pharmacists', 'revenue',
      'settings',        // ← was missing from Plus too!
    ],
    maxDoctors: -1,       // ← your PlanSelection says "Up to 3 Doctors" but config said 2
    maxReceptionists: -1,
    maxPharmacists: -1,
  },
  pro: {
    key: 'pro',
    name: 'Clinic Pro',
    visibleSections: [
      'overview', 'doctors', 'receptionists', 'allPatients',
      'followUps', 'pharmacists', 'revenue', 'settings',
      'labReports', 'analytics',
    ],
    maxDoctors: -1,
    maxReceptionists: -1,
    maxPharmacists: -1,
  },
};

export function getPlanConfig(planKey) {
  return PLAN_CONFIG[planKey] ?? PLAN_CONFIG['lite'];
}

export function isSectionVisible(planKey, sectionKey) {
  return getPlanConfig(planKey).visibleSections.includes(sectionKey);
}

export function canAddStaff(planKey, role, currentCount) {
  const validRoles = ['doctors', 'receptionists', 'pharmacists'];
  if (!validRoles.includes(role)) {
    throw new Error(`canAddStaff: unknown role "${role}". Valid roles: ${validRoles.join(', ')}`);
  }

  const cfg = getPlanConfig(planKey);
  const limitMap = {
    doctors:       cfg.maxDoctors,
    receptionists: cfg.maxReceptionists,
    pharmacists:   cfg.maxPharmacists,
  };

  const limit = limitMap[role];

  if (limit === -1) {
    return { allowed: true, limit: -1, upgradeNeeded: null };
  }

  if (currentCount < limit) {
    return { allowed: true, limit, upgradeNeeded: null };
  }

  const upgradeNeeded = planKey === 'lite' ? 'Clinic Plus' : 'Clinic Pro';
  return { allowed: false, limit, upgradeNeeded };
}