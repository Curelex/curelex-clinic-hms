// hms-backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// ── Authentication middleware ────────────────────────────────────
const auth = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FIX: clinicId must always exist in token
    if (!decoded.clinicId) {
      return res.status(401).json({ message: 'Invalid token: missing clinicId' });
    }

    req.user = decoded; // { id, role, clinicId }
    req.userId = decoded.id;
    req.clinicId = decoded.clinicId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// ── Clinic middleware ────────────────────────────────────────────
const clinic = function (req, res, next) {
  // ClinicId is already in req.user from auth middleware
  const clinicId = req.header('X-Clinic-Id') || req.query.clinicId || req.body.clinicId || req.clinicId;
  
  if (!clinicId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Clinic ID is required' 
    });
  }

  req.clinicId = clinicId;
  next();
};

module.exports = { auth, clinic };