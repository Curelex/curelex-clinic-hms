import ICUBed from '../models/ICUBed.js';
import Clinic from '../models/Clinic.js';
import { isFeatureAvailable } from '../config/planConfig.js';

export const icuAccessCheck = async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId || req.query.clinicId || req.body.clinicId;
    
    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID required' });
    }
    
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    
    // Check if clinic has ICU feature (Enterprise plan only)
    const planKey = clinic.plan || 'free';
    const hasICU = isFeatureAvailable('hospital', planKey, 'ipd');
    
    if (!hasICU) {
      return res.status(403).json({ 
        success: false, 
        message: 'ICU management is not available in your current plan. Please upgrade to Enterprise plan.',
        plan: planKey,
      });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const icuAdminCheck = async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};